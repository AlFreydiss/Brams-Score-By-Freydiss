// Guess Who — réglage du micro : choix de l'appareil + jauge de niveau en direct.
// Le micro par défaut du navigateur est souvent le mauvais (casque débranché,
// micro virtuel Discord/OBS…) : on laisse le joueur choisir et vérifier.
// Même micro partagé que l'enregistrement : tester ne coupe pas la prise suivante.
// Pendant le test, « M'entendre » renvoie le micro dans le casque (retour), tel
// qu'il partira dans la prise (réduction de bruit comprise).
import { useEffect, useRef, useState } from 'react'
import { Btn } from './manga.jsx'
import { T, F, LINE, RADIUS } from './theme.js'
import { acquireMic, audioCtx, currentMicDevice, getDenoise, getMicId, listMics, micDenoised, micError, releaseMic, setDenoiseLive, setMicId, unlockAudio } from '../../lib/guessWhoAudio.js'
import { levelOf, micLabel } from './logic/mic.js'

const ERRORS = {
  mic_denied: "Micro bloqué. Sur iPhone : Réglages › Safari › Micro › Autoriser. Ailleurs : icône 🔒 à gauche de l'adresse. Puis réessaie.",
  no_mic: "Aucun micro trouvé. Branche un micro ou un casque, puis réessaie.",
  mic_busy: 'Ce micro est déjà utilisé par une autre appli (appel, Discord, OBS…). Choisis-en un autre ou ferme cette appli.',
  mic_timeout: "Le navigateur ne répond pas. Vérifie qu'une demande d'autorisation n'est pas cachée, puis réessaie.",
  no_support: "Le micro n'est pas accessible ici. Ouvre le site dans Safari ou Chrome.",
}

export default function MicSetup({ compact = false, onError }) {
  const [devices, setDevices] = useState([])
  const [micId, setMic] = useState(getMicId())
  const [status, setStatus] = useState('idle') // idle | asking | live | error
  const [error, setError] = useState(null)
  const [heard, setHeard] = useState(false)
  const [silent, setSilent] = useState(false)
  const [denoise, setDenoiseOn] = useState(getDenoise)
  const [denoiseOk, setDenoiseOk] = useState(null) // null = pas encore testé
  const [monitor, setMonitor] = useState(false)     // retour dans le casque
  const [monVol, setMonVol] = useState(0.8)
  const bar = useRef(null)
  const live = useRef({ held: false, source: null, raf: 0, timer: 0, n: 0, mon: null })

  // La jauge est mise à jour directement dans le DOM : pas de rendu React par image.
  const stop = () => {
    const l = live.current
    l.n++
    cancelAnimationFrame(l.raf)
    clearTimeout(l.timer)
    try { l.mon?.disconnect() } catch { /* déjà coupé */ }
    try { l.source?.disconnect() } catch { /* déjà coupé */ }
    if (l.held) releaseMic()
    live.current = { held: false, source: null, raf: 0, timer: 0, n: l.n, mon: null }
  }
  useEffect(() => stop, [])

  // Casque / micro branché ou débranché pendant le réglage : la liste suit.
  useEffect(() => {
    const md = navigator.mediaDevices
    if (!md?.addEventListener) return
    const onChange = () => { listMics().then(setDevices).catch(() => {}) }
    md.addEventListener('devicechange', onChange)
    return () => md.removeEventListener('devicechange', onChange)
  }, [])

  // Retour casque : le micro (après réduction de bruit) envoyé vers la sortie.
  const plugMonitor = (on, vol = monVol) => {
    const l = live.current
    const ctx = audioCtx()
    if (!ctx || !l.source) return
    if (!l.mon) { l.mon = ctx.createGain(); l.mon.gain.value = 0; l.source.connect(l.mon); l.mon.connect(ctx.destination) }
    l.mon.gain.setTargetAtTime(on ? vol : 0, ctx.currentTime, 0.03)
  }
  const toggleMonitor = () => { const on = !monitor; setMonitor(on); plugMonitor(on) }
  const changeMonVol = (x) => { setMonVol(x); if (monitor) plugMonitor(true, x) }

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
          if (v > 0.06) bar.current.style.background = T.accent
        }
        if (v > 0.06 && !gotSound) { gotSound = true; setHeard(true) }
        live.current.raf = requestAnimationFrame(tick)
      }
      live.current.source = source
      if (monitor) plugMonitor(true)
      live.current.raf = requestAnimationFrame(tick)
      live.current.timer = setTimeout(() => { if (peak < 0.06) setSilent(true) }, 4000)
      setDenoiseOk(getDenoise() ? micDenoised() : null)
      setDevices(await listMics())
      // Micro réellement ouvert (repli si le choix a disparu). On lit l'appareil
      // brut : le flux débruité n'expose pas de deviceId. « default » et
      // « communications » sont des alias : on garde le choix du joueur.
      const used = currentMicDevice()
      const alias = id === 'default' || id === 'communications'
      if (used && used !== id && !alias) { setMic(used); setMicId(used) }
      setStatus('live')
    } catch (e) {
      onError?.(micError(e))
      setError(ERRORS[micError(e)] || ERRORS.mic_denied)
      setStatus('error')
    }
  }

  const toggleDenoise = async () => {
    const on = !denoise
    setDenoiseOn(on)
    unlockAudio()
    const wasLive = status === 'live'
    stop()
    await setDenoiseLive(on).catch(() => {})
    if (wasLive) start()
    else setDenoiseOk(null)
  }

  const choose = (id) => {
    setMic(id)
    setMicId(id)
    start(id)
  }

  return (
    <div style={{ border: LINE, borderRadius: RADIUS.md, background: T.deep, padding: compact ? 12 : 16, display: 'grid', gap: 12, fontFamily: F.ui, color: T.text }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: F.display, fontWeight: 500, fontSize: 18, color: T.textHi }}>Ton micro</span>
        {status !== 'live' && (
          <Btn variant="sea" onClick={() => start()} disabled={status === 'asking'} style={{ minHeight: 42 }}>
            {status === 'asking' ? 'Autorise le micro…' : 'Tester mon micro'}
          </Btn>
        )}
        {status === 'live' && (
          <Btn variant="ghost" onClick={() => { stop(); setStatus('idle'); setMonitor(false) }} style={{ minHeight: 42 }}>Terminer le test</Btn>
        )}
      </div>

      {devices.length > 0 && (
        <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13.5, color: T.textMute }}>
          Micro utilisé
          <select className="gw-focus" value={micId} onChange={(e) => choose(e.target.value)}
            style={{ minHeight: 44, border: LINE, borderRadius: RADIUS.sm, background: T.surface, color: T.textHi, fontFamily: F.ui, fontWeight: 500, fontSize: 16, padding: '0 10px' }}>
            {!micId && <option value="">Micro par défaut</option>}
            {devices.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{micLabel(d, i)}</option>)}
          </select>
        </label>
      )}

      {/* Réduction de bruit (RNNoise) : clavier, ventilo, télé… effacés, la voix reste. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" role="switch" aria-checked={denoise} aria-label="Réduction de bruit" className="gw-focus gw-btn" onClick={toggleDenoise}
          style={{
            flexShrink: 0, width: 46, height: 28, borderRadius: RADIUS.pill, border: LINE, cursor: 'pointer', padding: 3,
            background: denoise ? T.accent : T.surface, display: 'flex', justifyContent: denoise ? 'flex-end' : 'flex-start',
            transition: 'background 160ms ease', touchAction: 'manipulation',
          }}>
          <span aria-hidden style={{ width: 20, height: 20, borderRadius: '50%', background: denoise ? T.onAccent : T.textMute }} />
        </button>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontWeight: 600, fontSize: 14.5, color: T.textHi }}>Réduction de bruit</span>
          <span style={{ display: 'block', fontSize: 13, color: denoiseOk === false ? T.danger : T.textMute, marginTop: 2 }}>
            {!denoise ? 'Coupée : tout ce que capte le micro part dans la prise.'
              : denoiseOk === false ? "Pas disponible sur ce navigateur : le micro est utilisé tel quel."
              : 'Comme Krisp sur Discord : clavier, ventilo, télé effacés. Si tes cris sont coupés, désactive-la.'}
          </span>
        </span>
      </div>

      {status === 'live' && (
        <>
          <div aria-label="Niveau du micro" style={{ height: 6, borderRadius: RADIUS.pill, background: T.line, overflow: 'hidden' }}>
            <div ref={bar} style={{ width: 0, height: '100%', borderRadius: RADIUS.pill, background: T.textFaint, transition: 'width 60ms linear' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" role="switch" aria-checked={monitor} aria-label="M'entendre dans le casque" className="gw-focus gw-btn" onClick={toggleMonitor}
              style={{
                flexShrink: 0, width: 46, height: 28, borderRadius: RADIUS.pill, border: LINE, cursor: 'pointer', padding: 3,
                background: monitor ? T.accent : T.surface, display: 'flex', justifyContent: monitor ? 'flex-end' : 'flex-start',
                transition: 'background 160ms ease', touchAction: 'manipulation',
              }}>
              <span aria-hidden style={{ width: 20, height: 20, borderRadius: '50%', background: monitor ? T.onAccent : T.textMute }} />
            </button>
            <span style={{ minWidth: 0, flex: '1 1 200px' }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: 14.5, color: T.textHi }}>M'entendre dans le casque</span>
              <span style={{ display: 'block', fontSize: 13, color: T.textMute, marginTop: 2 }}>
                {monitor ? 'Tu t’entends comme les autres t’entendront. Avec un casque seulement, sinon ça siffle.' : 'Retour de ta voix pour régler le micro. Mets un casque avant.'}
              </span>
            </span>
            {monitor && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.textMute }}>
                Volume
                <input type="range" min="0" max="1.5" step="0.05" value={monVol} onChange={(e) => changeMonVol(+e.target.value)} style={{ width: 110, accentColor: T.accent }} />
              </label>
            )}
          </div>
          <p role="status" style={{ margin: 0, fontWeight: 600, fontSize: 14.5, color: heard ? T.ok : silent ? T.danger : T.textMute }}>
            {heard ? `Ton micro capte bien ✓${denoiseOk ? ' · bruit de fond filtré' : ''}` : silent ? "Aucun son capté : parle plus fort ou choisis un autre micro dans la liste." : 'Parle ou crie un coup pour tester…'}
          </p>
        </>
      )}
      {error && <p role="alert" style={{ margin: 0, fontWeight: 600, color: T.danger }}>{error}</p>}
    </div>
  )
}
