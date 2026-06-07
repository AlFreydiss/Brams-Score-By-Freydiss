// ── Fond décoratif « sakura » (style Undercover : couches + texture + pétales) ─
// Layer plein écran fixe, derrière le contenu (zIndex 0, pointerEvents none).
// Gradients rose/sakura + grille subtile + pétales roses qui tombent en douceur.
// Réutilisé sur les pages Tournoi et Blind Test. Respecte prefers-reduced-motion.
import { useMemo } from 'react'

// Pétale SVG rose (dégradé) encodé en data-URI → léger et net à toute taille.
const PETAL_URI = "data:image/svg+xml," + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='#ffd1e6'/><stop offset='1' stop-color='#ff7eb0'/>
    </linearGradient></defs>
    <path d='M16 2 C24 7 28 16 16 30 C4 16 8 7 16 2 Z' fill='url(#g)'/>
  </svg>`
)

const CSS = `
  @keyframes sakura-fall {
    0%   { transform: translate3d(0,-12vh,0) rotate(0deg);   opacity: 0; }
    8%   { opacity: .85; }
    92%  { opacity: .85; }
    100% { transform: translate3d(var(--drift,40px),112vh,0) rotate(540deg); opacity: 0; }
  }
  @keyframes sakura-breathe { 0%,100%{opacity:.5} 50%{opacity:.8} }
  @media (prefers-reduced-motion: reduce) { .sakura-petal { display: none !important; } }
`

export default function SakuraBackdrop({ count = 18, zIndex = 0, petalsZIndex = 40 }) {
  const petals = useMemo(() => Array.from({ length: count }, (_, i) => {
    const r = (n) => ((Math.sin(i * 99.7 + n * 12.9) + 1) / 2) // pseudo-aléatoire déterministe
    const size = 12 + Math.round(r(1) * 14)
    return {
      left: Math.round(r(2) * 100),
      size,
      dur: 11 + Math.round(r(3) * 12),
      delay: -Math.round(r(4) * 18),
      drift: (r(5) > .5 ? 1 : -1) * (30 + Math.round(r(6) * 70)),
      opacity: 0.45 + r(7) * 0.4,
    }
  }), [count])

  return (
    <>
      <style>{CSS}</style>

      {/* Couche d'ambiance (DERRIÈRE le contenu) : couleur + grille */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `
          radial-gradient(900px 540px at 14% -8%, rgba(255,126,176,0.16), transparent 62%),
          radial-gradient(780px 540px at 88% 10%, rgba(167,139,250,0.11), transparent 64%),
          radial-gradient(820px 700px at 50% 118%, rgba(255,170,203,0.09), transparent 66%),
          linear-gradient(180deg, #140913 0%, #190b16 58%, #120813 100%)` }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.5, animation: 'sakura-breathe 11s ease-in-out infinite',
          backgroundImage: 'linear-gradient(rgba(255,126,176,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,126,176,.06) 1px, transparent 1px)',
          backgroundSize: '54px 54px',
          maskImage: 'linear-gradient(180deg, transparent, black 16%, black 76%, transparent)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent, black 16%, black 76%, transparent)' }} />
      </div>

      {/* Pétales qui tombent (DEVANT le contenu, décoratifs, sans interaction) */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: petalsZIndex, pointerEvents: 'none', overflow: 'hidden' }}>
        {petals.map((p, i) => (
          <span key={i} className="sakura-petal" style={{
            position: 'absolute', top: 0, left: `${p.left}%`, width: p.size, height: p.size,
            backgroundImage: `url("${PETAL_URI}")`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat',
            opacity: p.opacity, filter: 'drop-shadow(0 2px 5px rgba(255,126,176,.3))',
            '--drift': `${p.drift}px`,
            animation: `sakura-fall ${p.dur}s linear ${p.delay}s infinite`,
          }} />
        ))}
      </div>
    </>
  )
}
