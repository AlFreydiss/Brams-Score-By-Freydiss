// ── Studio de doublage — moteur ─────────────────────────────────────────────
// Micro, mesure du timing, mixage et rendu du fichier final. La page
// (DoublageStudioPage.jsx) ne fait que piloter ces fonctions : tout ce qui
// touche au Web Audio, au MediaRecorder et au canvas vit ici.
//
// Principe du rendu : on rejoue la scène dans un <video> caché, on la recopie
// image par image dans un canvas, et on mixe la voix enregistrée avec un fond
// d'ambiance dans un graphe Web Audio. Les deux flux partent ensemble dans un
// MediaRecorder → un .webm téléchargeable.

import { corsUrl } from './audioBoost.js'

// ── Capacités du navigateur ─────────────────────────────────────────────────
const HAS_REC = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined'

const AudioCtx = typeof window !== 'undefined'
  ? (window.AudioContext || window.webkitAudioContext)
  : null

export const CAN_RECORD = Boolean(
  HAS_REC && AudioCtx && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia
)

const AUDIO_MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
const VIDEO_MIMES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']

function pickMime(list) {
  if (!HAS_REC) return ''
  for (const m of list) {
    try { if (MediaRecorder.isTypeSupported(m)) return m } catch { /* implémentation partielle */ }
  }
  return ''
}

export const AUDIO_MIME = pickMime(AUDIO_MIMES)
export const VIDEO_MIME = pickMime(VIDEO_MIMES)

// captureStream sur le canvas est la brique indispensable au rendu vidéo :
// on la teste explicitement plutôt que de supposer.
export const CAN_EXPORT_VIDEO = Boolean(
  VIDEO_MIME && typeof HTMLCanvasElement !== 'undefined' &&
  typeof HTMLCanvasElement.prototype.captureStream === 'function'
)

// ── Source média ────────────────────────────────────────────────────────────
// Même règle que le lecteur du tournoi : le HLS ne se lit nativement que sur
// Safari, ailleurs il faut hls.js. Le paramètre `cors=1` évite la pollution de
// cache R2 (réponse mise en cache sans en-tête Origin → média muet).
export const isHls = url => /\.m3u8(\?|$)/i.test(url)

const NATIVE_HLS = typeof document !== 'undefined' &&
  Boolean(document.createElement('video').canPlayType('application/vnd.apple.mpegurl'))

export const needsHlsJs = url => isHls(url) && !NATIVE_HLS

// Branche l'URL sur l'élément et renvoie la fonction de détachement.
export function attachSource(video, url, startAt = 0) {
  if (!needsHlsJs(url)) {
    video.src = corsUrl(url)
    return () => { try { video.removeAttribute('src'); video.load() } catch { /* déjà démonté */ } }
  }

  let hls = null
  let cancelled = false

  import('hls.js').then(({ default: Hls }) => {
    if (cancelled || !video.isConnected || !Hls.isSupported()) return
    // startPosition : inutile de télécharger 13 minutes d'épisode pour un
    // extrait qui commence à 13 minutes.
    hls = new Hls({ enableWorker: true, maxBufferLength: 30, backBufferLength: 10, startPosition: startAt })
    hls.attachMedia(video)
    hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(url))
    hls.on(Hls.Events.ERROR, (_evt, data) => {
      if (!data?.fatal) return
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad()
      else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError()
    })
  }).catch(() => { /* chunk indisponible : l'appelant verra le délai expirer */ })

  return () => {
    cancelled = true
    if (hls) { try { hls.destroy() } catch { /* déjà détruit */ } }
  }
}

export function waitReady(video, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    if (video.readyState >= 2) { resolve(); return }
    const off = () => {
      clearTimeout(timer)
      video.removeEventListener('loadeddata', ok)
      video.removeEventListener('canplay', ok)
    }
    const ok = () => { off(); resolve() }
    const timer = setTimeout(() => { off(); reject(new Error("La scène n'a pas voulu charger.")) }, timeoutMs)
    video.addEventListener('loadeddata', ok)
    video.addEventListener('canplay', ok)
  })
}

// Un seek posé sur `loadedmetadata` peut être avalé sur un gros fichier : on
// réapplique la position tant qu'elle n'a pas pris.
export function seekTo(video, time, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs
    const tick = () => {
      if (video.readyState >= 1) {
        const d = video.duration
        // En HLS la durée vaut encore NaN au début : viser 0 ferait démarrer
        // l'extrait au tout début de l'épisode.
        const want = (Number.isFinite(d) && d > 0 && d <= time + 5) ? Math.max(0, d / 2) : time
        // readyState >= 2 : la position ne suffit pas, il faut aussi que
        // l'image du nouvel instant soit décodée — sinon le lecteur reste noir.
        if (Math.abs(video.currentTime - want) <= 1.2 && video.readyState >= 2) {
          clearInterval(id); resolve(); return
        }
        if (!video.seeking) { try { video.currentTime = want } catch { /* pas encore seekable */ } }
      }
      if (Date.now() > deadline) { clearInterval(id); reject(new Error("Impossible de se caler sur l'extrait.")) }
    }
    const id = setInterval(tick, 200)
    tick()
  })
}

// ── Micro ───────────────────────────────────────────────────────────────────
export function openMic(deviceId) {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      // Un doublage se juge sur la voix brute. L'annulation d'écho couperait
      // des syllabes dès que la scène joue dans les haut-parleurs.
      echoCancellation: false,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
  })
}

export async function listMics() {
  if (!navigator.mediaDevices?.enumerateDevices) return []
  try {
    const all = await navigator.mediaDevices.enumerateDevices()
    return all.filter(d => d.kind === 'audioinput')
  } catch { return [] }
}

// Mesure de niveau : sert au vu-mètre ET à la notation (elle dit QUAND on
// parle). L'analyseur n'est jamais relié à la sortie — sinon larsen immédiat.
export function createMeter(stream) {
  const ctx = new AudioCtx()
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0.15
  source.connect(analyser)
  const data = new Uint8Array(analyser.fftSize)

  return {
    read() {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sum += v * v
      }
      return Math.sqrt(sum / data.length)
    },
    close() {
      try { source.disconnect() } catch { /* déjà coupé */ }
      try { ctx.close() } catch { /* déjà fermé */ }
    },
  }
}

// ── Prise de son ────────────────────────────────────────────────────────────
// Une prise = le flux micro encodé + l'enveloppe de niveau échantillonnée en
// parallèle. `t` est en ms depuis le VRAI départ de l'enregistreur, ce qui
// permet de recaler la voix sur l'image au millimètre à l'export.
export function createTakeRecorder(stream, meter) {
  const rec = new MediaRecorder(stream, AUDIO_MIME ? { mimeType: AUDIO_MIME } : undefined)
  const chunks = []
  const levels = []
  let t0 = 0
  let raf = 0

  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data) }

  const api = {
    onLevel: null,   // (rms) → vu-mètre
    onStart: null,   // () → le parent lance la vidéo à ce moment précis

    start() {
      rec.onstart = () => {
        t0 = performance.now()
        const tick = () => {
          const rms = meter.read()
          levels.push({ t: performance.now() - t0, rms })
          api.onLevel?.(rms)
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        api.onStart?.()
      }
      rec.start(200)
    },

    stop() {
      return new Promise(resolve => {
        cancelAnimationFrame(raf)
        if (rec.state === 'inactive') { resolve(null); return }
        rec.onstop = () => resolve({
          blob: new Blob(chunks, { type: (AUDIO_MIME || 'audio/webm').split(';')[0] }),
          levels,
          duration: (performance.now() - t0) / 1000,
        })
        rec.stop()
      })
    },

    get state() { return rec.state },
    // Exposé en direct : la frise dessine l'enveloppe pendant la prise, pas
    // seulement une fois la prise terminée.
    get levels() { return levels },
  }

  return api
}

// ── Notation du timing ──────────────────────────────────────────────────────
// On ne juge pas le texte (aucune reconnaissance vocale ici) mais la synchro :
// est-ce qu'il sort du son pendant les répliques, et du silence entre elles ?
const TOLERANCE = 0.18   // s — une attaque légèrement en avance n'est pas une faute

function labelFor(score) {
  if (score >= 88) return 'Comédien de doublage'
  if (score >= 72) return 'Synchro propre'
  if (score >= 55) return 'Ça tient la route'
  if (score >= 35) return 'Décalé'
  return 'Hors timing'
}

export function scoreTake({ levels, cues, startAt, videoDelayMs = 0 }) {
  if (!levels?.length) return { score: 0, label: '—', lines: [], noise: 0, peak: 0, gate: 0 }

  const peak = levels.reduce((m, l) => Math.max(m, l.rms), 0)
  // Seuil relatif au micro utilisé, avec un plancher pour ne pas compter le
  // souffle d'un micro de bureau comme une réplique.
  const gate = Math.max(0.012, peak * 0.16)

  // Repasse de l'échelle « temps d'enregistrement » à l'échelle « temps de la
  // scène » : la vidéo a démarré videoDelayMs après l'enregistreur.
  const samples = levels.map(l => ({ t: startAt + (l.t - videoDelayMs) / 1000, on: l.rms >= gate }))

  const lines = (cues || []).map(c => {
    const win = samples.filter(s => s.t >= c.start - TOLERANCE && s.t <= c.end + TOLERANCE)
    const on = win.filter(s => s.on).length
    return { start: c.start, end: c.end, text: c.text, coverage: win.length ? on / win.length : 0 }
  })

  const weight = l => Math.max(0.25, l.end - l.start)
  const total = lines.reduce((n, l) => n + weight(l), 0)
  const covered = total ? lines.reduce((n, l) => n + l.coverage * weight(l), 0) / total : 0

  // Parler pendant les silences casse l'illusion autant qu'arriver en retard.
  const inLine = t => lines.some(l => t >= l.start - TOLERANCE && t <= l.end + TOLERANCE)
  const outside = samples.filter(s => !inLine(s.t))
  const noise = outside.length ? outside.filter(s => s.on).length / outside.length : 0

  const score = Math.max(0, Math.min(100, Math.round(covered * 100 - noise * 35)))
  return { score, label: labelFor(score), lines, noise, peak, gate }
}

// ── Export ──────────────────────────────────────────────────────────────────
export function encodeWav(buffer) {
  const chans = Math.min(2, buffer.numberOfChannels)
  const frames = buffer.length
  const size = 44 + frames * chans * 2
  const view = new DataView(new ArrayBuffer(size))
  const ascii = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)) }

  ascii(0, 'RIFF'); view.setUint32(4, size - 8, true); ascii(8, 'WAVE')
  ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, chans, true); view.setUint32(24, buffer.sampleRate, true)
  view.setUint32(28, buffer.sampleRate * chans * 2, true)
  view.setUint16(32, chans * 2, true); view.setUint16(34, 16, true)
  ascii(36, 'data'); view.setUint32(40, frames * chans * 2, true)

  const data = []
  for (let c = 0; c < chans; c++) data.push(buffer.getChannelData(c))
  let off = 44
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < chans; c++) {
      const v = Math.max(-1, Math.min(1, data[c][i]))
      view.setInt16(off, v < 0 ? v * 0x8000 : v * 0x7fff, true)
      off += 2
    }
  }
  return new Blob([view.buffer], { type: 'audio/wav' })
}

export async function voiceToWav(blob) {
  const ctx = new AudioCtx()
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer())
    return encodeWav(buf)
  } finally { try { ctx.close() } catch { /* déjà fermé */ } }
}

// ── Durée du WebM ───────────────────────────────────────────────────────────
// MediaRecorder écrit un flux « live » : le Segment est de taille inconnue et
// l'élément Duration n'est jamais posé. Résultat, le fichier téléchargé
// s'annonce en durée infinie — pas de barre de lecture, pas d'aperçu correct
// chez celui à qui on l'envoie. On réinjecte donc Duration dans Info.
// Au moindre doute sur la structure, on rend le fichier d'origine intact.
const ID_SEGMENT   = 0x18538067
const ID_INFO      = 0x1549a966
const ID_SEEKHEAD  = 0x114d9b74
const ID_SCALE     = 0x2ad7b1
const ID_DURATION  = 0x4489

function readId(view, off) {
  if (off >= view.byteLength) return null
  const first = view.getUint8(off)
  let length = 1
  let mask = 0x80
  while (length <= 4 && !(first & mask)) { mask >>= 1; length++ }
  if (length > 4 || off + length > view.byteLength) return null
  let id = 0
  for (let i = 0; i < length; i++) id = id * 256 + view.getUint8(off + i)
  return { id, length }
}

function readVint(view, off) {
  if (off >= view.byteLength) return null
  const first = view.getUint8(off)
  let length = 1
  let mask = 0x80
  while (length <= 8 && !(first & mask)) { mask >>= 1; length++ }
  if (length > 8 || off + length > view.byteLength) return null
  let value = first & (mask - 1)
  let unknown = value === mask - 1
  for (let i = 1; i < length; i++) {
    const b = view.getUint8(off + i)
    value = value * 256 + b
    if (b !== 0xff) unknown = false
  }
  return { value, length, unknown }
}

export async function withWebmDuration(blob, seconds) {
  if (!(seconds > 0) || !/webm/i.test(blob.type)) return blob
  try {
    const buf = await blob.arrayBuffer()
    const view = new DataView(buf)

    // Niveau racine : en-tête EBML, puis Segment.
    let off = 0
    let segment = null
    while (off < view.byteLength) {
      const id = readId(view, off)
      if (!id) return blob
      const size = readVint(view, off + id.length)
      if (!size) return blob
      const start = off + id.length + size.length
      if (id.id === ID_SEGMENT) {
        segment = { start, sizeOff: off + id.length, size }
        break
      }
      if (size.unknown) return blob
      off = start + size.value
    }
    if (!segment) return blob

    // Enfants du Segment. Un SeekHead contient des offsets absolus : insérer
    // des octets les fausserait, on préfère ne rien toucher.
    let p = segment.start
    let info = null
    while (p < view.byteLength) {
      const id = readId(view, p)
      if (!id) return blob
      const size = readVint(view, p + id.length)
      if (!size || size.unknown) return blob
      const start = p + id.length + size.length
      if (id.id === ID_SEEKHEAD) return blob
      if (id.id === ID_INFO) { info = { headerStart: p, start, end: start + size.value }; break }
      p = start + size.value
    }
    if (!info || info.end > view.byteLength) return blob

    // TimecodeScale donne l'unité de Duration ; une Duration déjà là = rien à faire.
    let scale = 1000000
    let q = info.start
    while (q < info.end) {
      const id = readId(view, q)
      if (!id) return blob
      const size = readVint(view, q + id.length)
      if (!size || size.unknown) return blob
      const start = q + id.length + size.length
      if (id.id === ID_DURATION) return blob
      if (id.id === ID_SCALE) {
        let v = 0
        for (let i = 0; i < size.value; i++) v = v * 256 + view.getUint8(start + i)
        if (v > 0) scale = v
      }
      q = start + size.value
    }

    // Duration : ID 0x4489, taille 8, flottant 64 bits en unités de TimecodeScale.
    const duration = new Uint8Array(11)
    duration[0] = 0x44
    duration[1] = 0x89
    duration[2] = 0x88
    new DataView(duration.buffer).setFloat64(3, (seconds * 1e9) / scale)

    const bytes = new Uint8Array(buf)
    const payload = bytes.subarray(info.start, info.end)
    const newSize = payload.length + duration.length

    // Taille sur 8 octets : toujours représentable, et la longueur du champ ne
    // dépend plus de la valeur.
    const sizeField = new Uint8Array(8)
    sizeField[0] = 0x01
    let rest = newSize
    for (let i = 7; i >= 1; i--) { sizeField[i] = rest & 0xff; rest = Math.floor(rest / 256) }

    const head = bytes.slice(0, info.headerStart)

    // Le Segment de MediaRecorder est de taille inconnue ; s'il est chiffré, il
    // faut y répercuter les octets ajoutés — possible seulement si le champ
    // fait déjà 8 octets, sinon on renonce.
    if (!segment.size.unknown) {
      if (segment.size.length !== 8) return blob
      const delta = 4 + 8 + newSize - (info.end - info.headerStart)
      let total = segment.size.value + delta
      for (let i = 7; i >= 1; i--) { head[segment.sizeOff + i] = total & 0xff; total = Math.floor(total / 256) }
      head[segment.sizeOff] = 0x01
    }

    return new Blob([
      head,
      new Uint8Array([0x15, 0x49, 0xa9, 0x66]),
      sizeField,
      payload,
      duration,
      bytes.subarray(info.end),
    ], { type: blob.type })
  } catch {
    return blob
  }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Révoquer trop tôt annule le téléchargement sur Firefox.
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export const slug = s => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'scene'

// Rendu final. Temps réel : un extrait de 30 s prend 30 s à écrire — il
// n'existe pas d'encodeur vidéo hors-ligne dans le navigateur.
export async function renderDub({
  videoUrl, startAt, endAt, voiceBlob,
  voiceGain = 1, ambience = 0.12, videoDelayMs = 0, syncMs = 0,
  onProgress, onStage,
}) {
  if (!CAN_EXPORT_VIDEO) throw new Error("Ce navigateur ne sait pas encoder de vidéo.")

  const audio = new AudioCtx()
  const video = document.createElement('video')
  video.crossOrigin = 'anonymous'
  video.playsInline = true
  video.preload = 'auto'
  video.style.cssText = 'position:fixed;left:-10000px;top:0;width:320px;height:180px;opacity:0;pointer-events:none'
  document.body.appendChild(video)

  const detach = attachSource(video, videoUrl, startAt)
  let raf = 0
  let capture = null

  try {
    onStage?.('Chargement de la scène…')
    await waitReady(video)
    await seekTo(video, startAt)
    if (audio.state === 'suspended') await audio.resume()

    onStage?.('Décodage de ta voix…')
    const voiceBuf = await audio.decodeAudioData(await voiceBlob.arrayBuffer())

    // Graphe : voix + ambiance → un seul flux. La sortie ne passe JAMAIS par
    // audio.destination, donc rien ne sort des haut-parleurs pendant le rendu.
    const dest = audio.createMediaStreamDestination()

    const voiceNode = audio.createBufferSource()
    voiceNode.buffer = voiceBuf
    const voiceLevel = audio.createGain()
    voiceLevel.gain.value = voiceGain
    voiceNode.connect(voiceLevel).connect(dest)

    const ambientLevel = audio.createGain()
    ambientLevel.gain.value = ambience
    audio.createMediaElementSource(video).connect(ambientLevel).connect(dest)
    video.muted = false
    video.volume = 1

    // Image : le <video> recopié dans un canvas, capturé à 30 i/s.
    const w = video.videoWidth || 1280
    const h = video.videoHeight || 720
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const g = canvas.getContext('2d', { alpha: false })
    g.drawImage(video, 0, 0, w, h)   // une première image avant la capture
    capture = canvas.captureStream(30)

    const stream = new MediaStream([
      ...capture.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ])
    const rec = new MediaRecorder(stream, {
      mimeType: VIDEO_MIME,
      videoBitsPerSecond: 5000000,
      audioBitsPerSecond: 160000,
    })
    const chunks = []
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data) }
    const closed = new Promise(resolve => { rec.onstop = resolve })

    // Recalage : la voix a démarré videoDelayMs AVANT l'image. `syncMs` est le
    // réglage manuel (positif = voix plus tard).
    const shift = (videoDelayMs - syncMs) / 1000
    const offset = Math.max(0, shift)   // on entre dans la voix plus loin
    const lead = Math.max(0, -shift)    // ou on la fait attendre

    onStage?.('Rendu en temps réel…')
    rec.start(250)
    const wallStart = performance.now()
    const t0 = audio.currentTime + 0.08
    voiceNode.start(t0 + lead, Math.min(offset, Math.max(0, voiceBuf.duration - 0.05)))
    await video.play()

    const paint = () => { g.drawImage(video, 0, 0, w, h); raf = requestAnimationFrame(paint) }
    raf = requestAnimationFrame(paint)

    const span = Math.max(0.5, endAt - startAt)
    await new Promise(resolve => {
      const id = setInterval(() => {
        onProgress?.(Math.max(0, Math.min(1, (video.currentTime - startAt) / span)))
        if (video.currentTime >= endAt || video.ended) { clearInterval(id); resolve() }
      }, 100)
    })

    cancelAnimationFrame(raf)
    try { voiceNode.stop() } catch { /* déjà fini */ }
    video.pause()
    const written = (performance.now() - wallStart) / 1000
    rec.stop()
    await closed
    onStage?.('Finalisation…')
    onProgress?.(1)

    const raw = new Blob(chunks, { type: (VIDEO_MIME || 'video/webm').split(';')[0] })
    return withWebmDuration(raw, written)
  } finally {
    cancelAnimationFrame(raf)
    if (capture) capture.getTracks().forEach(t => { try { t.stop() } catch { /* déjà arrêté */ } })
    try { detach() } catch { /* déjà détaché */ }
    try { video.remove() } catch { /* déjà retiré */ }
    try { await audio.close() } catch { /* déjà fermé */ }
  }
}
