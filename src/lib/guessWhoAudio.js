// ── Guess Who : son du tour, micro, enregistrement, envoi ─────────────────────
// Pensé d'abord pour l'iPhone (Safari) :
// - un seul AudioContext et un seul lecteur <audio>, débloqués au premier geste
//   de la page : ensuite le son du tour peut démarrer tout seul ;
// - le micro reste ouvert pendant toute la phase d'enregistrement (pas de
//   nouvelle demande à chaque reprise) et est rendu dès qu'on la quitte : un
//   micro ouvert baisse/détourne le son de lecture sur iPhone, ce qui gâcherait
//   l'écoute des imitations au vote ;
// - prise MediaRecorder (webm/opus, mp4 sur iPhone), puis traitement : silences
//   coupés, volume égalisé, WAV lisible sur tous les téléphones.
// Envoi R2 via /api/r2-presign pour un membre connecté ; invité ou R2 en panne
// → data URL inline plafonnée (le serveur la plafonne aussi).
import { getAccessToken } from './supabaseRest.js'
import { baseMime, pickRecorderMime, blobToDataUrl } from '../features/guesswho/logic/audioData.js'
import { micConstraints } from '../features/guesswho/logic/mic.js'
import { encodeWav, mixToMono, peaksOf, processTake } from '../features/guesswho/logic/dsp.js'
import { backoffMs } from '../features/guesswho/logic/recordFlow.js'

const HAS_WINDOW = typeof window !== 'undefined'
const MIME = typeof MediaRecorder !== 'undefined' ? pickRecorderMime((m) => MediaRecorder.isTypeSupported(m)) : ''
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function canRecord() {
  return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

// Vibration courte (Android ; sans effet sur iPhone).
export function buzz(pattern) {
  try { navigator.vibrate?.(pattern) } catch { /* non supporté */ }
}

// ── Contexte audio partagé (onde du micro) ────────────────────────────────────
let ctx = null
export function audioCtx() {
  if (ctx || !HAS_WINDOW) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (AC) ctx = new AC()
  return ctx
}

// Décodage hors ligne (pas besoin de geste ni de sortie audio).
function decode(arrayBuffer) {
  const OAC = HAS_WINDOW && (window.OfflineAudioContext || window.webkitOfflineAudioContext)
  const c = OAC ? new OAC(1, 1, 44100) : audioCtx()
  if (!c) return Promise.reject(new Error('no_audio'))
  return new Promise((resolve, reject) => {
    // forme à rappels : seule acceptée par les vieux Safari
    const p = c.decodeAudioData(arrayBuffer, resolve, reject)
    p?.catch?.(reject)
  })
}
const channelsOf = (buf) => Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i))
function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])
}

// ── Lecteur unique ────────────────────────────────────────────────────────────
// Sur iPhone, un <audio> lancé une fois pendant un geste peut ensuite jouer
// n'importe quoi sans geste : on en garde un seul pour toute la partie.
const bus = { el: null, key: null, src: null, pending: null, errorKey: null, subs: new Set() }
let silentUrl = null
let elUnlocked = false

function emit() { bus.subs.forEach((cb) => cb()) }
function soundEl() {
  if (bus.el || !HAS_WINDOW) return bus.el
  const el = new Audio()
  el.preload = 'auto'
  ;['play', 'playing', 'pause', 'ended', 'loadedmetadata'].forEach((ev) => el.addEventListener(ev, emit))
  el.addEventListener('error', () => { if (bus.key) { bus.errorKey = bus.key; emit() } })
  bus.el = el
  return el
}
function silent() {
  if (!silentUrl) {
    const bytes = encodeWav(new Float32Array(2205), 22050)
    let bin = ''
    for (const b of bytes) bin += String.fromCharCode(b)
    silentUrl = 'data:audio/wav;base64,' + btoa(bin)
  }
  return silentUrl
}

export function onSound(cb) { bus.subs.add(cb); return () => bus.subs.delete(cb) }
export function soundState(key) {
  const el = bus.el
  const mine = !!key && bus.key === key
  return {
    playing: mine && !!el && !el.paused && !el.ended,
    blocked: !!bus.pending && bus.pending.key === key,
    error: !!key && bus.errorKey === key,
  }
}
// Avancement 0..1 (lu à chaque image par les ondes, sans rendu React).
export function soundProgress(key) {
  const el = bus.el
  if (!el || bus.key !== key) return 0
  return Number.isFinite(el.duration) && el.duration > 0 ? Math.min(1, el.currentTime / el.duration) : 0
}

// Lance un son. Renvoie 'playing', 'blocked' (lecture auto refusée : elle
// partira au prochain geste) ou 'error'.
export async function playSound(key, src, { loop = false, from } = {}) {
  const el = soundEl()
  if (!el || !src) return 'error'
  bus.pending = null
  if (bus.key !== key || bus.src !== src) {
    bus.key = key; bus.src = src; bus.errorKey = null
    el.src = src
  } else if (el.ended) {
    el.currentTime = 0
  }
  if (typeof from === 'number' && Number.isFinite(el.duration)) el.currentTime = from * el.duration
  el.loop = loop
  try {
    await el.play() // appelé sans await préalable : reste dans le geste
    elUnlocked = true
    emit()
    return 'playing'
  } catch (e) {
    if (e?.name === 'NotAllowedError') { bus.pending = { key, src, loop }; emit(); return 'blocked' }
    if (e?.name === 'AbortError') return 'playing' // remplacé par une autre lecture
    bus.errorKey = key; emit()
    return 'error'
  }
}
export function pauseSound(key) {
  const el = bus.el
  if (!el || (key && bus.key !== key && bus.pending?.key !== key)) return
  bus.pending = null
  el.pause()
  emit()
}
export function setSoundLoop(key, loop) {
  if (bus.el && bus.key === key) bus.el.loop = loop
  if (bus.pending?.key === key) bus.pending.loop = loop
}
export function seekSound(key, ratio) {
  const el = bus.el
  if (el && bus.key === key && Number.isFinite(el.duration)) el.currentTime = Math.max(0, Math.min(1, ratio)) * el.duration
}

// ── Déblocage au geste ────────────────────────────────────────────────────────
// Écoute permanente (iPhone peut re-suspendre l'audio après une interruption) ;
// à appeler aussi directement dans un clic, avant tout await.
let flushedAt = 0
// Vrai juste après qu'un geste a relancé un son bloqué : le clic qui suit sur
// le bouton ▶ ne doit pas le remettre en pause.
export function justUnblocked() { return performance.now() - flushedAt < 600 }
export function unlockAudio() {
  const c = audioCtx()
  if (c && c.state !== 'running') {
    c.resume?.().catch(() => {})
    try { // un buffer muet joué dans le geste réveille la sortie sur iPhone
      const s = c.createBufferSource()
      s.buffer = c.createBuffer(1, 1, 22050)
      s.connect(c.destination); s.start(0)
    } catch { /* rien */ }
  }
  const el = soundEl()
  if (!el) return
  if (bus.pending) {
    const p = bus.pending
    flushedAt = performance.now()
    playSound(p.key, p.src, { loop: p.loop })
  } else if (!elUnlocked && !bus.key) {
    el.src = silent()
    el.play().then(() => { elUnlocked = true; if (!bus.key) el.pause() }).catch(() => {})
  }
}
if (HAS_WINDOW) {
  ;['touchend', 'click', 'keydown'].forEach((ev) => document.addEventListener(ev, unlockAudio, { capture: true, passive: true }))
}

// ── Sons du tour : préchargés une fois (octets + onde) ────────────────────────
const TYPES = { mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', opus: 'audio/ogg', webm: 'audio/webm', wav: 'audio/wav' }
const clips = new Map()
const revoke = (job) => job.then((o) => { if (o?.src?.startsWith('blob:') && bus.src !== o.src) URL.revokeObjectURL(o.src) })

// → { src, peaks, duration, ok }. En cas d'échec (CORS, réseau), src = l'URL
// d'origine : le lecteur tente quand même en direct.
export function loadClip(url, { fresh = false } = {}) {
  if (!url) return Promise.resolve(null)
  if (!fresh && clips.has(url)) return clips.get(url)
  const job = (async () => {
    try {
      const res = await fetchT(url, { cache: fresh ? 'reload' : 'default' }, 12000)
      if (!res.ok) throw new Error('http')
      let blob = await res.blob()
      // Safari refuse parfois un blob sans type : on le déduit de l'extension.
      if (!blob.type.startsWith('audio/')) {
        const ext = (url.split('?')[0].split('.').pop() || '').toLowerCase()
        blob = new Blob([blob], { type: TYPES[ext] || 'audio/mpeg' })
      }
      const out = { src: URL.createObjectURL(blob), peaks: null, duration: null, ok: true }
      try {
        const buf = await withTimeout(decode(await blob.arrayBuffer()), 6000)
        out.peaks = peaksOf(mixToMono(channelsOf(buf)), 72)
        out.duration = buf.duration
      } catch { /* pas d'onde, le son reste lisible */ }
      return out
    } catch {
      if (clips.get(url) === job) clips.delete(url)
      return { src: url, peaks: null, duration: null, ok: false }
    }
  })()
  if (clips.has(url)) revoke(clips.get(url))
  clips.delete(url)
  clips.set(url, job)
  while (clips.size > 4) { // on garde les 4 derniers sons
    const [k, v] = clips.entries().next().value
    clips.delete(k)
    revoke(v)
  }
  return job
}

// ── Choix du micro (mémorisé sur l'appareil) ──────────────────────────────────
const MIC_KEY = 'gw_mic'
export function getMicId() {
  try { return localStorage.getItem(MIC_KEY) || '' } catch { return '' }
}
export function setMicId(id) {
  try { if (id) localStorage.setItem(MIC_KEY, id); else localStorage.removeItem(MIC_KEY) } catch {}
}

// Micros disponibles. Les noms ne sont fournis qu'après une autorisation micro.
export async function listMics() {
  if (!navigator.mediaDevices?.enumerateDevices) return []
  const all = await navigator.mediaDevices.enumerateDevices()
  return all.filter((d) => d.kind === 'audioinput')
}

// Ouvre le micro choisi (repli sur le micro par défaut s'il a disparu). Borné à
// 10 s : sans réponse du navigateur, le bouton ne doit pas rester sans effet.
export async function openMic(deviceId = getMicId()) {
  if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('no_support'), { name: 'NoSupportError' })
  const ask = (id) => Promise.race([
    navigator.mediaDevices.getUserMedia({ audio: micConstraints(id) }),
    new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('timeout'), { name: 'TimeoutError' })), 10000)),
  ])
  try {
    return await ask(deviceId)
  } catch (e) {
    if (deviceId && (e?.name === 'OverconstrainedError' || e?.name === 'NotFoundError' || e?.name === 'NotReadableError')) {
      setMicId('')
      return ask('')
    }
    throw e
  }
}

export function micError(e) {
  if (e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError') return 'no_mic'
  if (e?.name === 'NotReadableError' || e?.name === 'AbortError') return 'mic_busy' // appel en cours, autre appli
  if (e?.name === 'TimeoutError') return 'mic_timeout'
  if (e?.name === 'NoSupportError') return 'no_support'
  return 'mic_denied'
}

// ── Micro partagé (enregistrement + réglage) ──────────────────────────────────
// Compteur de détenteurs : le micro se ferme quand plus personne ne le tient.
const mic = { stream: null, holders: 0, opening: null, subs: new Set() }
const isLive = (s) => !!s && s.getAudioTracks().some((t) => t.readyState === 'live')
const deviceOf = (s) => s?.getAudioTracks()[0]?.getSettings?.().deviceId || ''
function emitMic() { mic.subs.forEach((cb) => cb(currentMic())) }
function closeMic() {
  const had = !!mic.stream
  mic.stream?.getTracks().forEach((t) => t.stop())
  mic.stream = null
  if (had) emitMic()
}

export function currentMic() { return isLive(mic.stream) ? mic.stream : null }
export function onMicChange(cb) { mic.subs.add(cb); return () => mic.subs.delete(cb) }

async function ensureMic(deviceId) {
  if (isLive(mic.stream) && (!deviceId || deviceId === deviceOf(mic.stream))) return mic.stream
  if (mic.opening) return mic.opening
  mic.opening = (async () => {
    closeMic()
    const s = await openMic(deviceId)
    if (!mic.holders) { s.getTracks().forEach((t) => t.stop()); throw Object.assign(new Error('released'), { name: 'AbortError' }) }
    // iPhone coupe le micro en arrière-plan / pendant un appel : on le rouvrira.
    s.getAudioTracks().forEach((t) => t.addEventListener('ended', () => { if (mic.stream === s) { mic.stream = null; emitMic() } }))
    mic.stream = s
    emitMic()
    return s
  })().finally(() => { mic.opening = null })
  return mic.opening
}

// Prend le micro (l'ouvre au besoin). À rendre avec releaseMic().
export async function acquireMic(deviceId = getMicId()) {
  mic.holders++
  try {
    return await ensureMic(deviceId)
  } catch (e) {
    releaseMic()
    throw e
  }
}
export function releaseMic() {
  mic.holders = Math.max(0, mic.holders - 1)
  if (!mic.holders) closeMic()
}
// Change d'appareil sans lâcher le micro (réglage).
export async function switchMic(deviceId) {
  closeMic()
  return ensureMic(deviceId)
}

// ── Enregistrement ────────────────────────────────────────────────────────────
// Sur un flux déjà ouvert : rien à redemander entre deux prises.
export function startRecorder(stream, maxMs) {
  let rec
  try {
    rec = new MediaRecorder(stream, { ...(MIME ? { mimeType: MIME } : {}), audioBitsPerSecond: 32000 })
  } catch {
    try { rec = new MediaRecorder(stream) } catch { throw new Error('rec_failed') }
  }
  const chunks = []
  let t0 = performance.now()
  rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data) }
  const finished = new Promise((resolve) => {
    rec.onstop = () => resolve({
      blob: new Blob(chunks, { type: rec.mimeType || MIME || 'audio/webm' }),
      duration: (performance.now() - t0) / 1000,
    })
  })
  rec.onerror = () => { if (rec.state !== 'inactive') rec.stop() }
  rec.onstart = () => { t0 = performance.now() }
  rec.start(250)
  let timer = 0
  const stop = () => { clearTimeout(timer); if (rec.state !== 'inactive') rec.stop(); return finished }
  timer = setTimeout(stop, maxMs)
  return { finished, stop, startedAt: () => t0 }
}

// Prise brute → prise prête : silences coupés, volume égalisé, WAV + onde.
// Si le décodage échoue (format exotique), on garde la prise brute telle quelle.
export async function finalizeTake({ blob, duration }) {
  try {
    const buf = await withTimeout(decode(await blob.arrayBuffer()), 5000)
    const p = processTake(channelsOf(buf), buf.sampleRate)
    return {
      raw: blob,
      wav: new Blob([encodeWav(p.samples, p.rate)], { type: 'audio/wav' }),
      duration: p.silent ? duration : p.duration,
      peaks: peaksOf(p.samples, 64),
      silent: p.silent,
    }
  } catch {
    return { raw: blob, wav: null, duration, peaks: null, silent: false }
  }
}

// ── Envoi ─────────────────────────────────────────────────────────────────────
// Tant que /api/r2-presign n'accepte pas audio/wav, on retombe sur la prise brute.
let wavRefused = false

async function fetchT(url, opts, ms) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try { return await fetch(url, { ...opts, signal: ctrl.signal }) } finally { clearTimeout(t) }
}

// → { url } | { refused: statut } (type ou session refusés : inutile d'insister) | {}
async function tryR2(blob, code, token) {
  const type = baseMime(blob.type)
  const ext = { 'audio/mp4': 'm4a', 'audio/wav': 'wav', 'audio/ogg': 'ogg' }[type] || 'webm'
  for (let attempt = 0; attempt < 3; attempt++) {
    await sleep(backoffMs(attempt))
    try {
      const filename = `guesswho-${String(code).toLowerCase()}-${crypto.randomUUID().slice(0, 12)}.${ext}`
      const presign = await fetchT('/api/r2-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filename, contentType: type, size: blob.size }),
      }, 10000)
      if ([400, 401, 403].includes(presign.status)) return { refused: presign.status }
      const info = await presign.json().catch(() => ({}))
      if (!presign.ok || !info.uploadUrl || !info.publicUrl) throw new Error('presign')
      const put = await fetchT(info.uploadUrl, { method: 'PUT', headers: { 'Content-Type': type }, body: blob }, 20000)
      if (!put.ok) throw new Error('put')
      return { url: info.publicUrl }
    } catch { /* nouvelle tentative, puis repli */ }
  }
  return {}
}

// Envoie une prise (de finalizeTake). → { url } ou { error }.
export async function uploadTake(take, code) {
  const token = await getAccessToken().catch(() => null)
  if (token) {
    if (take.wav && !wavRefused) {
      const r = await tryR2(take.wav, code, token)
      if (r.url) return { url: r.url }
      if (r.refused === 400) wavRefused = true
    }
    const r = wavRefused || !take.wav ? await tryR2(take.raw, code, token) : {}
    if (r.url) return { url: r.url }
  }
  // Inline : la prise brute (opus/aac), bien plus légère que le WAV (quota Supabase).
  const inline = await blobToDataUrl(take.raw)
  return inline ? { url: inline } : { error: token ? 'upload_failed' : 'too_big' }
}
