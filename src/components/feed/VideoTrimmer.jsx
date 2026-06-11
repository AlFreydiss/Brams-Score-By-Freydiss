// ── Rognage vidéo client (stories + posts du Fil) ───────────────────────────
// Découpe un segment [début → fin] d'une vidéo locale SANS dépendance :
// lecture du segment + captureStream() + MediaRecorder (webm vp9/vp8, mp4 sur
// Safari). Contrainte assumée : le ré-encodage se fait en temps réel (rogner
// 30 s prend ~30 s) — une barre de progression l'explique à l'utilisateur.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Scissors } from 'lucide-react'
import { T } from '../social/socialStyles.js'

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function pickMime() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]
  for (const m of candidates) {
    try { if (window.MediaRecorder?.isTypeSupported?.(m)) return m } catch {}
  }
  return null
}

export default function VideoTrimmer({ file, onDone, onCancel }) {
  const videoRef = useRef(null)
  const recRef = useRef(null)
  const chunksRef = useRef([])
  const [src] = useState(() => URL.createObjectURL(file))
  const [duration, setDuration] = useState(0)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [recording, setRecording] = useState(false)
  const [progress, setProgress] = useState(0)
  const [err, setErr] = useState(null)

  useEffect(() => () => URL.revokeObjectURL(src), [src])

  const supported = typeof HTMLVideoElement !== 'undefined'
    && (HTMLVideoElement.prototype.captureStream || HTMLVideoElement.prototype.mozCaptureStream)
    && !!window.MediaRecorder

  function onMeta(e) {
    const d = e.currentTarget.duration
    if (isFinite(d) && d > 0) { setDuration(d); setEnd(d) }
  }

  // Aperçu : clique sur la timeline = seek ; lecture bornée au segment.
  function onTimeUpdate() {
    const v = videoRef.current
    if (!v) return
    if (recording) {
      setProgress(Math.min(1, (v.currentTime - start) / Math.max(0.1, end - start)))
      if (v.currentTime >= end) stopRecording()
    } else if (v.currentTime >= end && !v.paused) {
      v.pause()
      v.currentTime = start
    }
  }

  function stopRecording() {
    const v = videoRef.current
    try { v?.pause() } catch {}
    try { recRef.current?.state !== 'inactive' && recRef.current?.stop() } catch {}
  }

  async function doTrim() {
    const v = videoRef.current
    if (!v || recording) return
    if (end - start < 0.5) { setErr('Segment trop court (min 0,5 s)') ; return }
    const mime = pickMime()
    if (!supported || !mime) { setErr("Ton navigateur ne supporte pas le rognage local — la vidéo sera envoyée entière.") ; return }
    setErr(null)
    setRecording(true)
    setProgress(0)
    try {
      v.pause()
      v.currentTime = start
      await new Promise(res => { const fn = () => { v.removeEventListener('seeked', fn); res() }; v.addEventListener('seeked', fn) })
      const stream = (v.captureStream || v.mozCaptureStream).call(v)
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000, audioBitsPerSecond: 128_000 })
      recRef.current = rec
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data) }
      rec.onstop = () => {
        setRecording(false)
        const blob = new Blob(chunksRef.current, { type: mime.split(';')[0] })
        if (!blob.size) { setErr('Rognage vide — réessaie.') ; return }
        const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm'
        const base = (file.name || 'video').replace(/\.[a-z0-9]+$/i, '')
        onDone(new File([blob], `${base}-rogne.${ext}`, { type: mime.split(';')[0] }))
      }
      rec.start(250)
      // muted pour l'aperçu silencieux ; Chrome capture l'audio AVANT le gain de
      // sortie, donc la piste son reste présente dans l'enregistrement.
      v.muted = true
      await v.play()
    } catch (e) {
      setRecording(false)
      setErr(e?.message || 'Rognage impossible sur ce navigateur')
    }
  }

  const segDur = Math.max(0, end - start)

  return createPortal(
    <div onClick={() => !recording && onCancel()} style={{
      position: 'fixed', inset: 0, zIndex: 10080, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(640px, 96vw)', background: '#101218', border: `1px solid ${T.border}`,
        borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Scissors size={16} style={{ color: T.gold }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: T.text, flex: 1 }}>Rogner la vidéo</span>
          <button onClick={onCancel} disabled={recording} aria-label="Fermer" style={{
            background: 'none', border: 'none', color: T.textDim, cursor: recording ? 'default' : 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <video
          ref={videoRef} src={src} playsInline controls={!recording}
          onLoadedMetadata={onMeta} onTimeUpdate={onTimeUpdate}
          style={{ width: '100%', maxHeight: '46vh', borderRadius: 10, background: '#000' }}
        />

        {duration > 0 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: T.textDim }}>
                <span style={{ width: 52, fontWeight: 700 }}>Début</span>
                <input type="range" min={0} max={duration} step={0.1} value={start}
                  onChange={e => { const v = Math.min(Number(e.target.value), end - 0.5); setStart(Math.max(0, v)); if (videoRef.current) videoRef.current.currentTime = v }}
                  disabled={recording} style={{ flex: 1, accentColor: T.gold }} />
                <span style={{ width: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(start)}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: T.textDim }}>
                <span style={{ width: 52, fontWeight: 700 }}>Fin</span>
                <input type="range" min={0} max={duration} step={0.1} value={end}
                  onChange={e => { const v = Math.max(Number(e.target.value), start + 0.5); setEnd(Math.min(duration, v)); if (videoRef.current) videoRef.current.currentTime = v }}
                  disabled={recording} style={{ flex: 1, accentColor: T.gold }} />
                <span style={{ width: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(end)}</span>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: T.textFaint, flex: 1 }}>
                Segment : <strong style={{ color: T.gold }}>{fmt(segDur)}</strong>
                {recording ? ' — rognage en cours (durée réelle du segment)…' : ''}
              </span>
              {recording ? (
                <button onClick={stopRecording} style={{
                  padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  background: 'rgba(224,82,74,.12)', border: '1px solid rgba(224,82,74,.4)', color: T.red }}>
                  Arrêter ici
                </button>
              ) : (
                <button onClick={doTrim} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  background: 'linear-gradient(135deg,#ffd84d,#f0a500)', border: 'none', color: '#1a1200' }}>
                  <Scissors size={14} /> Rogner
                </button>
              )}
            </div>

            {recording && (
              <div style={{ height: 5, borderRadius: 4, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.round(progress * 100)}%`, height: '100%', background: T.gold, transition: 'width .25s linear' }} />
              </div>
            )}
          </>
        )}

        {err && <div style={{ fontSize: 12, color: T.red }}>{err}</div>}
      </div>
    </div>,
    document.body
  )
}
