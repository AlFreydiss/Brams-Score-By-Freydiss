// ── Écran de connexion "Embarque" — spirale d'étoiles minimale ──────────────
// Présentation : concept BramsLoginMinimal (spirale canvas pur rAF, typo fine
// Jost, or discret, pas de carte). La LOGIQUE AUTH est strictement celle de
// l'ancienne modale : signInWithDiscord / signIn / signUp via AuthContext,
// erreur OAuth relue depuis localStorage, mêmes états et messages.
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'

/* ---------- spirale d'étoiles (pur rAF, zéro dépendance) ---------- */
function SpiralAnimation() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let W = window.innerWidth, H = window.innerHeight
    let raf

    // Y_OFF = 0 : la spirale naît et s'étend depuis le CENTRE exact de l'écran.
    const CHANGE = 0.32, CAM_Z = -400, TRAVEL = 3400, Y_OFF = 0, ZOOM = 100
    const N_STARS = 4200, TRAIL = 80, DURATION = 15000

    // Backing store aux dimensions RÉELLES de l'écran (pas un carré max(W,H)
    // étiré en CSS — ça écrasait verticalement le rendu : cercles → ellipses).
    const setup = () => {
      W = window.innerWidth; H = window.innerHeight
      canvas.width = W * dpr; canvas.height = H * dpr
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    setup()

    // PRNG déterministe (même spirale à chaque visite)
    let seed = 1234
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
    const rrange = (a, b) => a + rnd() * (b - a)

    const ease = (p, g) => (p < 0.5 ? 0.5 * Math.pow(2 * p, g) : 1 - 0.5 * Math.pow(2 * (1 - p), g))
    const easeOutElastic = (x) => {
      const c4 = (2 * Math.PI) / 4.5
      if (x <= 0) return 0; if (x >= 1) return 1
      return Math.pow(2, -8 * x) * Math.sin((x * 8 - 0.75) * c4) + 1
    }
    const map = (v, a, b, c, d) => c + (d - c) * ((v - a) / (b - a))
    const clamp = (v, a, b) => Math.min(Math.max(v, a), b)
    const lerp = (a, b, t) => a * (1 - t) + b * t

    const spiralPath = (p) => {
      p = clamp(1.2 * p, 0, 1)
      p = ease(p, 1.8)
      const turns = 6
      const theta = 2 * Math.PI * turns * Math.sqrt(p)
      const r = 170 * Math.sqrt(p)
      return { x: r * Math.cos(theta), y: r * Math.sin(theta) + Y_OFF }
    }

    const stars = []
    for (let i = 0; i < N_STARS; i++) {
      const angle = rnd() * Math.PI * 2
      const distance = 30 * rnd() + 15
      const dir = rnd() > 0.5 ? 1 : -1
      const expansion = 1.2 + rnd() * 0.8
      const finalScale = 0.7 + rnd() * 0.6
      const spiralLocation = (1 - Math.pow(1 - rnd(), 3.0)) / 1.3
      let z = rrange(0.5 * CAM_Z, TRAVEL + CAM_Z)
      z = lerp(z, TRAVEL / 2, 0.3 * spiralLocation)
      stars.push({
        angle, distance, dir, expansion, finalScale, spiralLocation, z,
        dx: distance * Math.cos(angle), dy: distance * Math.sin(angle),
        swf: Math.pow(rnd(), 2.0),
      })
    }

    let time = 0

    const projectDot = (x3, y3, z3, sizeFactor) => {
      const t2 = clamp(map(time, CHANGE, 1, 0, 1), 0, 1)
      const camZ = CAM_Z + ease(Math.pow(t2, 1.2), 1.8) * TRAVEL
      if (z3 > camZ) {
        const depth = z3 - camZ
        const x = (ZOOM * x3) / depth
        const y = (ZOOM * y3) / depth
        const sw = (400 * sizeFactor) / depth
        ctx.lineWidth = sw
        ctx.beginPath()
        ctx.arc(x, y, Math.max(sw / 2, 0.5), 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const renderStar = (s, p) => {
      const sp = spiralPath(s.spiralLocation)
      const q = p - s.spiralLocation
      if (q <= 0) return
      const dp = clamp(4 * q, 0, 1)

      const linear = dp, elastic = easeOutElastic(dp), power = dp * dp
      let easing
      if (dp < 0.3) easing = lerp(linear, power, dp / 0.3)
      else if (dp < 0.7) easing = lerp(power, elastic, (dp - 0.3) / 0.4)
      else easing = elastic

      let sx, sy
      if (dp < 0.3) {
        sx = lerp(sp.x, sp.x + s.dx * 0.3, easing / 0.3)
        sy = lerp(sp.y, sp.y + s.dy * 0.3, easing / 0.3)
      } else if (dp < 0.7) {
        const mp = (dp - 0.3) / 0.4
        const curve = Math.sin(mp * Math.PI) * s.dir * 1.5
        const bx = sp.x + s.dx * 0.3, by = sp.y + s.dy * 0.3
        const tx = sp.x + s.dx * 0.7, ty = sp.y + s.dy * 0.7
        sx = lerp(bx, tx, mp) + (-s.dy * 0.4 * curve) * mp
        sy = lerp(by, ty, mp) + (s.dx * 0.4 * curve) * mp
      } else {
        const fp = (dp - 0.7) / 0.3
        const bx = sp.x + s.dx * 0.7, by = sp.y + s.dy * 0.7
        const td = s.distance * s.expansion * 1.5
        const sa = s.angle + 1.2 * s.dir * fp * Math.PI
        sx = lerp(bx, sp.x + td * Math.cos(sa), fp)
        sy = lerp(by, sp.y + td * Math.sin(sa), fp)
      }

      const vx = ((s.z - CAM_Z) * sx) / ZOOM
      const vy = ((s.z - CAM_Z) * sy) / ZOOM

      let mult = 1
      if (dp < 0.6) mult = 1 + dp * 0.2
      else { const t = (dp - 0.6) / 0.4; mult = 1.2 * (1 - t) + s.finalScale * t }

      projectDot(vx, vy, s.z, 8.5 * s.swf * mult)
    }

    const render = () => {
      ctx.fillStyle = 'black'
      ctx.fillRect(0, 0, W, H)
      ctx.save()
      ctx.translate(W / 2, H / 2)

      const t1 = clamp(map(time, 0, CHANGE + 0.25, 0, 1), 0, 1)
      const t2 = clamp(map(time, CHANGE, 1, 0, 1), 0, 1)
      ctx.rotate(-Math.PI * ease(t2, 2.7))

      for (let i = 0; i < TRAIL; i++) {
        const f = map(i, 0, TRAIL, 1.1, 0.1)
        const sw = (1.3 * (1 - t1) + 3.0 * Math.sin(Math.PI * t1)) * f
        ctx.fillStyle = 'white'
        const pos = spiralPath(t1 - 0.00015 * i)
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, Math.max(sw / 2, 0.1), 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.fillStyle = 'white'
      for (const s of stars) renderStar(s, t1)

      if (time > CHANGE) {
        const dy = (CAM_Z * Y_OFF) / ZOOM
        projectDot(0, dy, TRAVEL, 2.5)
      }

      ctx.restore()
    }

    if (reduced) { time = 0.22; render(); return }

    let t0 = performance.now()
    const loop = (now) => {
      time = ((now - t0) % DURATION) / DURATION
      render()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onResize = () => setup()
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
}

function DiscordIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

const TEXT_SHADOW = '0 0 40px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.8)'

export default function AuthModal({ onClose }) {
  const { signInWithDiscord, signIn, signUp } = useAuth()

  const [visible, setVisible] = useState(false)
  const [mode,    setMode]    = useState('main')  // 'main' | 'email'
  const [emode,   setEmode]   = useState('login') // 'login' | 'signup'
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1200) // laisse la spirale s'installer
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const storedError = localStorage.getItem('brams_auth_error')
    if (!storedError) return
    setError(storedError)
    localStorage.removeItem('brams_auth_error')
  }, [])

  // Esc ferme l'écran (équivalent du clic-dehors de l'ancienne modale).
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  async function handleDiscord() {
    if (loading) return
    setLoading(true); setError('')
    const { error } = await signInWithDiscord()
    if (error) { setError(error.message || 'Erreur Discord.'); setLoading(false) }
  }

  async function handleEmail(e) {
    e.preventDefault()
    if (loading) return
    setLoading(true); setError(''); setSuccess('')
    if (emode === 'login') {
      const { error } = await signIn(email, password)
      if (error) { setError(error.message || 'Identifiants incorrects.'); setLoading(false) }
      else { onClose() }
    } else {
      const { error } = await signUp(email, password, name)
      if (error) { setError(error.message || 'Erreur lors de l\'inscription.'); setLoading(false) }
      else {
        setSuccess('Inscription réussie ! Vérifie ton email pour confirmer ton compte.')
        setLoading(false)
      }
    }
  }

  const appear = (delay) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(14px)',
    transition: `opacity 1.4s cubic-bezier(.22,1,.36,1) ${delay}s, transform 1.4s cubic-bezier(.22,1,.36,1) ${delay}s`,
  })

  const inputStyle = {
    width: 280, maxWidth: '78vw', padding: '13px 16px', borderRadius: 0, textAlign: 'center',
    background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.18)',
    color: '#f3f1ea', fontSize: 14, outline: 'none', letterSpacing: '0.06em',
    fontFamily: "'Jost',sans-serif",
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: '#000', overflow: 'hidden', fontFamily: "'Jost',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Jost:wght@200;300;400;500&display=swap');
        .bl-in:focus { border-bottom-color: rgba(245,196,81,0.7) !important; }
        .bl-in::placeholder { color: rgba(255,255,255,0.25); letter-spacing: 0.12em; }
        .bl-discord { transition: letter-spacing .6s ease, border-color .6s ease, color .6s ease; }
        .bl-discord:hover { letter-spacing: 0.32em !important; border-color: rgba(245,196,81,0.65) !important; color: #ffdc84 !important; }
        .bl-link { transition: color .4s ease, letter-spacing .4s ease; }
        .bl-link:hover { color: rgba(255,255,255,0.85) !important; letter-spacing: 0.22em !important; }
        .bl-go { transition: letter-spacing .5s ease, color .5s ease; }
        .bl-go:hover { letter-spacing: 0.34em !important; color: #ffdc84 !important; }
        .bl-root button:focus-visible, .bl-root input:focus-visible { outline: 1px solid rgba(245,196,81,0.7); outline-offset: 4px; }
        @keyframes blBreathe { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .bl-root * { animation: none !important; transition: none !important; } }
      `}</style>

      {/* spirale */}
      <div aria-hidden style={{ position: 'absolute', inset: 0 }}><SpiralAnimation /></div>
      {/* assombrissement central renforcé : centre lisible, étoiles visibles autour */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(600px 480px at 50% 42%, rgba(0,0,0,0.82), rgba(0,0,0,0.3) 55%, transparent 80%)' }} />

      <div className="bl-root" style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0 }}>

        {/* Fermer — discret, cohérent avec la typo */}
        <button onClick={onClose} aria-label="Fermer" className="bl-link" style={{
          position: 'absolute', top: 22, right: 26, background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: 13, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', textShadow: TEXT_SHADOW,
        }}>✕ fermer</button>

        <div style={appear(0)}>
          <div style={{ fontSize: 11, letterSpacing: '0.55em', textTransform: 'uppercase', color: 'rgba(245,196,81,0.75)', textAlign: 'center', paddingLeft: '0.55em',
            textShadow: TEXT_SHADOW }}>
            Brams Community
          </div>
        </div>

        <div style={appear(0.15)}>
          <h1 style={{ margin: '18px 0 0', fontWeight: 200, fontSize: 'clamp(26px,3.4vw,40px)', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f3f1ea', textAlign: 'center', paddingLeft: '0.18em',
            textShadow: TEXT_SHADOW }}>
            Embarque
          </h1>
        </div>

        <div style={appear(0.3)}>
          <p style={{ margin: '14px 0 0', fontWeight: 300, fontSize: 13, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', textAlign: 'center',
            textShadow: TEXT_SHADOW }}>
            Connecte-toi pour accéder au Grand Line
          </p>
        </div>

        {mode === 'main' ? (
          <>
            <div style={{ ...appear(0.5), marginTop: 52 }}>
              <button
                className="bl-discord"
                onClick={handleDiscord}
                disabled={loading}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 12, cursor: loading ? 'wait' : 'pointer',
                  background: 'transparent', color: '#f3f1ea',
                  border: '1px solid rgba(255,255,255,0.28)', borderRadius: 999,
                  padding: '15px 38px', fontFamily: "'Jost',sans-serif",
                  fontWeight: 300, fontSize: 14, letterSpacing: '0.26em', textTransform: 'uppercase',
                  textShadow: TEXT_SHADOW,
                  animation: 'blBreathe 4s ease-in-out infinite',
                  opacity: loading ? 0.55 : undefined,
                }}
              >
                <DiscordIcon /> {loading ? 'Connexion…' : 'Se connecter avec Discord'}
              </button>
            </div>

            <div style={{ ...appear(0.7), marginTop: 26 }}>
              <button
                className="bl-link"
                onClick={() => { setMode('email'); setError(''); setSuccess('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Jost',sans-serif",
                  fontWeight: 300, fontSize: 11.5, letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.35)', textShadow: TEXT_SHADOW }}
              >
                ou par email
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleEmail} style={{ marginTop: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            {emode === 'signup' && (
              <input className="bl-in" style={inputStyle} type="text" placeholder="NOM D'AFFICHAGE" value={name} onChange={(e) => setName(e.target.value)} required />
            )}
            <input className="bl-in" style={inputStyle} type="email" placeholder="EMAIL" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="bl-in" style={inputStyle} type="password" placeholder="MOT DE PASSE" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button
              className="bl-go"
              type="submit"
              disabled={loading}
              style={{ marginTop: 16, background: 'none', border: 'none', cursor: loading ? 'wait' : 'pointer',
                fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: 14,
                letterSpacing: '0.28em', textTransform: 'uppercase', color: '#f3f1ea',
                textShadow: TEXT_SHADOW,
                animation: 'blBreathe 4s ease-in-out infinite', opacity: loading ? 0.55 : undefined }}
            >
              {loading
                ? (emode === 'login' ? 'Connexion…' : 'Inscription…')
                : (emode === 'login' ? 'Entrer →' : 'Créer mon compte →')}
            </button>
            <button
              className="bl-link"
              type="button"
              onClick={() => { setEmode(m => m === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
              style={{ marginTop: 2, background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: 11,
                letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(245,196,81,0.55)', textShadow: TEXT_SHADOW }}
            >
              {emode === 'login' ? 'créer un compte' : 'j\'ai déjà un compte'}
            </button>
            <button
              className="bl-link"
              type="button"
              onClick={() => { setMode('main'); setError(''); setSuccess('') }}
              style={{ marginTop: 4, background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'Jost',sans-serif", fontWeight: 300, fontSize: 11,
                letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', textShadow: TEXT_SHADOW }}
            >
              ← retour
            </button>
          </form>
        )}

        {/* Messages — sobres, même langage visuel */}
        {success && (
          <p role="status" style={{ margin: '22px 0 0', maxWidth: 420, textAlign: 'center', fontWeight: 300, fontSize: 12,
            letterSpacing: '0.1em', color: 'rgba(110,231,160,0.85)', textShadow: TEXT_SHADOW, lineHeight: 1.7 }}>
            {success}
          </p>
        )}
        {error && (
          <p role="alert" style={{ margin: '22px 0 0', maxWidth: 420, textAlign: 'center', fontWeight: 300, fontSize: 12,
            letterSpacing: '0.1em', color: 'rgba(255,138,122,0.9)', textShadow: TEXT_SHADOW, lineHeight: 1.7 }}>
            {error}
          </p>
        )}

      </div>
    </div>
  )
}
