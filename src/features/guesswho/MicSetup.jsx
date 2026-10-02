// Guess Who — réglage du micro : choix de l'appareil + jauge de niveau en direct.
// Le micro par défaut du navigateur est souvent le mauvais (casque débranché,
// micro virtuel Discord/OBS…) : on laisse le joueur choisir et vérifier.
// Même micro partagé que l'enregistrement : tester ne coupe pas la prise suivante.
import { useEffect, useRef, useState } from 'react'
import { C, FONT_BODY, FONT_DISPLAY, Btn } from './manga.jsx'
import { acquireMic, audioCtx, getMicId, listMics, micError, releaseMic, setMicId, unlockAudio } from '../../lib/guessWhoAudio.js'
import { levelOf, micLabel } from './logic/mic.js'

const ERRORS = {
  mic_denied: "Micro bloqué. Sur iPhone : Réglages › Safari › Micro › Autoriser. Ailleurs : icône 🔒 à gauche de l'adresse. Puis réessaie.",
  no_mic: "Aucun micro trouvé. Branche un micro ou un casque, puis réessaie.",
  mic_busy: 'Ce micro est déjà utilisé par une autre appli (appel, Discord, OBS…). Choisis-en un autre ou ferme cette appli.',
  mic_timeout: "Le navigateur ne répond pas. Vérifie qu'une demande d'autorisation n'est pas cachée, puis réessaie.",
  no_support: "Le micro n'est pas accessible ici. Ouvre le site dans Safari ou Chrome.",
}

export default function MicSetup({ compact = false }) {
  const [devices, setDevices] = useState([])
  const [micId, setMic] = useState(getMicId())
  const [status, setStatus] = useState('idle') // idle | asking | live | error
  const [error, setError] = useState(null)
  const [heard, setHeard] = useState(false)
  const [silent, setSilent] = useState(false)
  const bar = useRef(null)
  const live = useRef({ held: false, source: null, raf: 0, timer: 0, n: 0 })

  // La jauge est mise à jour directement dans le DOM : pas de rendu React par image.
  const stop = () => {
    const l = live.current
    l.n++
    cancelAnimationFrame(l.raf)
    clearTimeout(l.timer)
    try { l.source?.disconnect() } catch { /* déjà coupé */ }
    if (l.held) releaseMic()
    live.current = { held: false, source: null, raf: 0, timer: 0, n: l.n }
  }
  useEffect(() => stop, [])

  const start = async (id = micId) => {
    unlockAudio() // dans le geste : sans ça la jauge reste à zéro sur iPhone
    stop()
    const my = live.current.n
    setStatus('asking'); setError(null); setHeard(false); setSilent(false)
    try {
      const stream = await acquireMic(id)
      if (live.current.n !== my) { releaseMic(); return }
      live.current.held = true
      const ctx = audioCtx()
      if (!ctx) { setStatus('live'); return } // sans Web Audio : pas de jauge
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)
      const buf = new Uint8Array(analyser.fftSize)
      let peak = 0
      let gotSound = false
      const tick = () => {
        analyser.getByteTimeDomainData(buf)
        const v = levelOf(buf)
        peak = Math.max(peak, v)
        if (bar.current) {
          bar.current.style.width = `${Math.min(100, v * 260)}%`
          if (v > 0.06) bar.current.style.background = C.cyan
        }
        if (v > 0.06 && !gotSound) { gotSound = true; setHeard(true) }
        live.current.raf = requestAnimationFrame(tick)
      }
      live.current.source = source
      live.current.raf = requestAnimationFrame(tick)
      live.current.timer = setTimeout(() => { if (peak < 0.06) setSilent(true) }, 4000)
      setDevices(await listMics())
      // micro réellement ouvert (peut différer si le choix précédent a disparu)
      const used = stream.getAudioTracks()[0]?.getSettings?.().deviceId || ''
      if (used && used !== id) { setMic(used); setMicId(used) }
      setStatus('live')
    } catch (e) {
      setError(ERRORS[micError(e)] || ERRORS.mic_denied)
      setStatus('error')
    }
  }

  const choose = (id) => {
    setMic(id)
    setMicId(id)
    start(id)
  }

  return (
    <div style={{ border: `3px solid ${C.ink}`, background: C.paper, padding: compact ? 12 : 16, display: 'grid', gap: 12, fontFamily: FONT_BODY, color: C.ink }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18 }}>🎤 Ton micro</span>
        {status !== 'live' && (
          <Btn variant="sea" onClick={() => start()} disabled={status === 'asking'} style={{ minHeight: 42 }}>
            {status === 'asking' ? 'Autorise le micro…' : 'Tester mon micro'}
          </Btn>
        )}
        {status === 'live' && (
          <Btn variant="ghost" onClick={() => { stop(); setStatus('idle') }} style={{ minHeight: 42 }}>Terminer le test</Btn>
        )}
      </div>

      {devices.length > 0 && (
        <label style={{ display: 'grid', gap: 6, fontWeight: 700, fontSize: 14 }}>
          Micro utilisé
          <select className="gw-focus" value={micId} onChange={(e) => choose(e.target.value)}
            style={{ minHeight: 44, border: `3px solid ${C.ink}`, background: C.paper, color: C.ink, fontFamily: FONT_BODY, fontWeight: 700, fontSize: 16, padding: '0 10px' }}>
            {!micId && <option value="">Micro par défaut</option>}
            {devices.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{micLabel(d, i)}</option>)}
          </select>
        </label>
      )}

      {status === 'live' && (
        <>
          <div aria-label="Niveau du micro" style={{ height: 18, border: `3px solid ${C.ink}`, background: C.paper, overflow: 'hidden' }}>
            <div ref={bar} style={{ width: 0, height: '100%', background: C.tone, transition: 'width 60ms linear' }} />
          </div>
          <p role="status" style={{ margin: 0, fontWeight: 800, fontSize: 14.5, color: heard ? C.ok : silent ? C.red : C.textMut }}>
            {heard ? 'Ton micro capte bien ✓' : silent ? "Aucun son capté : parle plus fort ou choisis un autre micro dans la liste." : 'Parle ou crie un coup pour tester…'}
          </p>
        </>
      )}
      {error && <p role="alert" style={{ margin: 0, fontWeight: 800, color: C.red }}>{error}</p>}
    </div>
  )
}
