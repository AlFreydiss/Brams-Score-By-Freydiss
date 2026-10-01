// ── Guess Who : micro + envoi de l'imitation ──────────────────────────────────
// Enregistrement MediaRecorder (format choisi selon le navigateur : opus/webm,
// mp4 sur iPhone). Envoi R2 via /api/r2-presign pour un membre connecté ;
// invité ou R2 en panne → data URL inline plafonnée (le serveur la plafonne aussi).
import { getAccessToken } from './supabaseRest.js'
import { baseMime, pickRecorderMime, blobToDataUrl } from '../features/guesswho/logic/audioData.js'
import { micConstraints } from '../features/guesswho/logic/mic.js'

const MIME = typeof MediaRecorder !== 'undefined' ? pickRecorderMime((m) => MediaRecorder.isTypeSupported(m)) : ''

export function canRecord() {
  return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
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
  if (e?.name === 'NotFoundError') return 'no_mic'
  if (e?.name === 'NotReadableError') return 'mic_busy'
  if (e?.name === 'TimeoutError') return 'mic_timeout'
  return 'mic_denied'
}

export async function startRecording(maxMs) {
  let stream
  try {
    stream = await openMic()
  } catch (e) {
    throw new Error(micError(e))
  }
  let rec
  try {
    rec = new MediaRecorder(stream, { ...(MIME ? { mimeType: MIME } : {}), audioBitsPerSecond: 32000 })
  } catch {
    stream.getTracks().forEach((t) => t.stop())
    throw new Error('mic_denied')
  }
  const chunks = []
  const t0 = performance.now()
  rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data) }
  const finished = new Promise((resolve) => {
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      resolve({ blob: new Blob(chunks, { type: rec.mimeType || MIME || 'audio/webm' }), duration: (performance.now() - t0) / 1000 })
    }
  })
  rec.start(250)
  const timer = setTimeout(() => { if (rec.state !== 'inactive') rec.stop() }, maxMs)
  return {
    finished,
    stop: () => { clearTimeout(timer); if (rec.state !== 'inactive') rec.stop(); return finished },
    cancel: () => { clearTimeout(timer); if (rec.state !== 'inactive') rec.stop() },
  }
}

async function tryR2(blob, code, token) {
  const type = baseMime(blob.type)
  const ext = type === 'audio/mp4' ? 'm4a' : 'webm'
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const filename = `guesswho-${String(code).toLowerCase()}-${crypto.randomUUID().slice(0, 12)}.${ext}`
      const presign = await fetch('/api/r2-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filename, contentType: type, size: blob.size }),
      })
      const info = await presign.json().catch(() => ({}))
      if (!presign.ok || !info.uploadUrl || !info.publicUrl) throw new Error('presign')
      const put = await fetch(info.uploadUrl, { method: 'PUT', headers: { 'Content-Type': type }, body: blob })
      if (!put.ok) throw new Error('put')
      return info.publicUrl
    } catch { /* nouvelle tentative, puis repli inline */ }
  }
  return null
}

export async function uploadTake(blob, code) {
  const token = await getAccessToken().catch(() => null)
  if (token) {
    const url = await tryR2(blob, code, token)
    if (url) return { url }
  }
  const inline = await blobToDataUrl(blob)
  return inline ? { url: inline } : { error: token ? 'upload_failed' : 'too_big' }
}
