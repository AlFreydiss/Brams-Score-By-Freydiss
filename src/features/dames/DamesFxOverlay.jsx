// ─────────────────────────────────────────────────────────────────────────────
// DamesFxOverlay — couche d'effets premium 2D (DOM/WAAPI) au-dessus du canvas R3F.
// Purement additive et réversible : aucun lien avec la logique de coups ni le rendu
// Three.js. Trois moments sublimés :
//   • combo de rafle      → kicker « RAFLE » montant (au-dessus du ×N 3D) + haptique croissant
//   • promotion en Dame   → couronne qui s'élève + halo/étincelles or + libellé
//   • victoire            → confettis or sobres + projecteur du camp gagnant
// Pilotée par une API impérative (ref.combo / ref.promote) + la prop `winner`.
// Styles inline + el.animate (repo inline-only). Respecte prefers-reduced-motion.
// ─────────────────────────────────────────────────────────────────────────────
import { forwardRef, useImperativeHandle, useRef, useEffect, useState, useMemo } from 'react'

const PIRATA = "'Pirata One','OnePiece',cursive"
const reducedMotion = () => { try { return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches } catch (e) { return false } }
const vibrate = (pat) => { try { if (navigator.vibrate && !reducedMotion()) navigator.vibrate(pat) } catch (e) { /* */ } }

// petit générateur déterministe-léger d'éclats de confettis (positions/rotations figées au montage)
function makeConfetti(n, colors) {
  return Array.from({ length: n }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 1.6,
    dur: 2.6 + Math.random() * 2.4,
    size: 6 + Math.random() * 8,
    rot: Math.random() * 360,
    drift: (Math.random() - 0.5) * 120,
    col: colors[i % colors.length],
    round: Math.random() < 0.35,
  }))
}

const DamesFxOverlay = forwardRef(function DamesFxOverlay({ winner = null }, ref) {
  const comboRef = useRef(null)
  const comboLblRef = useRef(null)
  const promoRef = useRef(null)
  const promoCrownRef = useRef(null)
  const [confettiOn, setConfettiOn] = useState(false)

  useImperativeHandle(ref, () => ({
    // n = nombre de prises atteint dans la rafle en cours (≥2). Intensité monte avec n.
    // Le gros « ×N ! » est déjà rendu par la scène 3D ; ici on ajoute le kicker « RAFLE »
    // au-dessus + l'haptique croissant, sans dupliquer le compteur.
    combo(n) {
      if (typeof n !== 'number' || n < 2) return
      const el = comboRef.current
      vibrate(Math.min(60, 18 + n * 9))   // pulsation haptique croissante
      if (!el || !el.animate || reducedMotion()) return
      const lbl = comboLblRef.current
      if (lbl) lbl.textContent = n >= 4 ? 'RAFLE LÉGENDAIRE' : n >= 3 ? 'GRANDE RAFLE' : 'RAFLE'
      const big = Math.min(1.55, 1.1 + n * 0.12)
      el.animate(
        [
          { transform: 'translate(-50%,-50%) scale(.5) rotate(-6deg)', opacity: 0 },
          { transform: `translate(-50%,-50%) scale(${big}) rotate(2deg)`, opacity: 1, offset: 0.28 },
          { transform: 'translate(-50%,-50%) scale(1) rotate(0)', opacity: 1, offset: 0.62 },
          { transform: 'translate(-50%,-50%) scale(.94)', opacity: 0 },
        ],
        { duration: 980, easing: 'cubic-bezier(.18,1.5,.4,1)' },
      )
    },
    // un pion vient d'être couronné Dame. side = 'P' (Pirates) | 'M' (Marine).
    promote(side) {
      const accent = side === 'M' ? '#9fd0ff' : '#ffd56a'
      vibrate([0, 22, 40, 30])
      const el = promoRef.current
      if (!el || !el.animate || reducedMotion()) return
      el.style.setProperty('--accent', accent)
      el.animate(
        [
          { transform: 'translate(-50%,-50%) scale(.7)', opacity: 0 },
          { transform: 'translate(-50%,-50%) scale(1.04)', opacity: 1, offset: 0.22 },
          { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.7 },
          { transform: 'translate(-50%,-50%) scale(1.02)', opacity: 0 },
        ],
        { duration: 1500, easing: 'cubic-bezier(.2,1,.3,1)' },
      )
      const crown = promoCrownRef.current
      if (crown && crown.animate) crown.animate(
        [
          { transform: 'translateY(26px) scale(.4) rotate(-12deg)', opacity: 0 },
          { transform: 'translateY(-6px) scale(1.2) rotate(4deg)', opacity: 1, offset: 0.4 },
          { transform: 'translateY(0) scale(1) rotate(0)', opacity: 1, offset: 0.78 },
          { transform: 'translateY(-4px) scale(1)', opacity: 0 },
        ],
        { duration: 1500, easing: 'cubic-bezier(.16,1.2,.3,1)' },
      )
    },
  }), [])

  // victoire : confettis pendant ~6,5s (skip en reduced-motion)
  useEffect(() => {
    if (!winner) { setConfettiOn(false); return }
    if (reducedMotion()) return
    setConfettiOn(true)
    const t = setTimeout(() => setConfettiOn(false), 6500)
    return () => clearTimeout(t)
  }, [winner])

  const isP = winner === 'P'
  const confColors = useMemo(() => (
    winner === 'M' ? ['#ffd56a', '#9fd0ff', '#6fb4ff', '#ffe9a8', '#fff3c8']
      : ['#ffd56a', '#ffb060', '#ff7a3a', '#ffe9a8', '#fff3c8']
  ), [winner])
  const confetti = useMemo(() => (confettiOn ? makeConfetti(70, confColors) : []), [confettiOn, confColors])

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 9 }}>
      {/* projecteur du camp gagnant (apparaît avec la cinématique de victoire) */}
      {winner && (
        <div style={{
          position: 'absolute', inset: 0,
          background: isP
            ? 'radial-gradient(120% 80% at 50% 8%, rgba(255,120,60,.22), transparent 60%)'
            : 'radial-gradient(120% 80% at 50% 8%, rgba(90,160,255,.22), transparent 60%)',
          animation: reducedMotion() ? 'none' : 'damesGlowPulse 3.4s ease-in-out infinite',
        }} />
      )}

      {/* confettis or sobres */}
      {confetti.map((c, i) => (
        <span key={i} style={{
          position: 'absolute', top: -18, left: c.left + '%', width: c.size, height: c.round ? c.size : c.size * 0.42,
          background: c.col, borderRadius: c.round ? '50%' : 2, opacity: 0.92,
          boxShadow: '0 0 6px rgba(255,200,90,.5)',
          transform: `rotate(${c.rot}deg)`,
          animation: `damesConfettiFall ${c.dur}s linear ${c.delay}s infinite`,
          ['--drift']: c.drift + 'px',
        }} />
      ))}

      {/* kicker de combo (rafle) — posé au-dessus du « ×N ! » rendu par la scène 3D */}
      <div ref={comboRef} style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%) scale(.5)', opacity: 0,
        textAlign: 'center',
      }}>
        <div ref={comboLblRef} style={{ fontFamily: PIRATA, fontSize: 'clamp(18px,3.4vw,38px)', letterSpacing: '3px', color: '#ffe9a8', textShadow: '0 0 18px rgba(255,180,60,.85), 0 3px 10px rgba(0,0,0,.6)', whiteSpace: 'nowrap' }}>RAFLE</div>
      </div>

      {/* bandeau de promotion (couronnement) */}
      <div ref={promoRef} style={{
        position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%,-50%) scale(.7)', opacity: 0,
        textAlign: 'center', ['--accent']: '#ffd56a',
      }}>
        <div ref={promoCrownRef} style={{ fontSize: 'clamp(40px,8vw,86px)', filter: 'drop-shadow(0 0 22px var(--accent))', marginBottom: 2 }}>👑</div>
        <div style={{ fontFamily: PIRATA, fontSize: 'clamp(22px,4.2vw,46px)', letterSpacing: '2px', color: 'var(--accent)', textShadow: '0 0 24px var(--accent), 0 4px 14px rgba(0,0,0,.6)' }}>Dame couronnée</div>
      </div>

      {/* keyframes inline (repo inline-only — pas de Tailwind/CSS global ici) */}
      <style>{`
        @keyframes damesConfettiFall {
          0% { transform: translate(0,0) rotate(0deg); }
          100% { transform: translate(var(--drift), 115vh) rotate(540deg); }
        }
        @keyframes damesGlowPulse {
          0%,100% { opacity: .55; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
})

export default DamesFxOverlay
