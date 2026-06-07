// ── Fond décoratif doré (style Undercover) ───────────────────────────────────
// Couches de lumière or + grille fine + poussière dorée qui monte + traînées
// lumineuses lentes. Sobre, stylé, AUCUN pétale. Réutilisé sur Blind Test, Le Fil…
// Layer fixe plein écran. base = derrière le contenu (zIndex), particules devant.
import { useMemo } from 'react'

const CSS = `
  @keyframes gbx-breathe { 0%,100%{opacity:.45} 50%{opacity:.8} }
  @keyframes gbx-dust { 0%{transform:translateY(0);opacity:0} 12%{opacity:.6} 88%{opacity:.6} 100%{transform:translateY(-106vh);opacity:0} }
  @keyframes gbx-sheen { 0%{transform:translateX(-30%) rotate(8deg);opacity:0} 50%{opacity:.5} 100%{transform:translateX(130%) rotate(8deg);opacity:0} }
  @media (prefers-reduced-motion: reduce){ .gbx-dust,.gbx-sheen{ display:none !important } }
`

export default function GoldBackdrop({ count = 20, zIndex = 0, particlesZIndex = 1 }) {
  const dust = useMemo(() => Array.from({ length: count }, (_, i) => {
    const r = (n) => ((Math.sin(i * 73.13 + n * 19.7) + 1) / 2)
    return {
      left: Math.round(r(1) * 100),
      size: 2 + Math.round(r(2) * 3),
      dur: 14 + Math.round(r(3) * 14),
      delay: -Math.round(r(4) * 22),
      opacity: 0.35 + r(5) * 0.45,
    }
  }), [count])

  return (
    <>
      <style>{CSS}</style>

      {/* Couches de couleur (or profond) */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `
          radial-gradient(900px 540px at 14% -8%, rgba(212,175,90,0.16), transparent 60%),
          radial-gradient(760px 520px at 88% 6%, rgba(255,205,110,0.10), transparent 62%),
          radial-gradient(820px 680px at 50% 118%, rgba(160,120,40,0.10), transparent 64%),
          linear-gradient(180deg, #0b0a07 0%, #0e0c08 56%, #0a0906 100%)` }} />
        {/* Grille fine dorée, masquée en fondu */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.5, animation: 'gbx-breathe 12s ease-in-out infinite',
          backgroundImage: 'linear-gradient(rgba(212,175,90,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,90,.05) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'linear-gradient(180deg, transparent, black 14%, black 78%, transparent)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent, black 14%, black 78%, transparent)' }} />
        {/* Traînée lumineuse oblique très lente (effet "stylé") */}
        <div style={{ position: 'absolute', top: '-20%', left: 0, width: '40%', height: '140%',
          background: 'linear-gradient(90deg, transparent, rgba(255,210,120,0.05), transparent)',
          filter: 'blur(40px)', animation: 'gbx-sheen 16s ease-in-out infinite' }} />
      </div>

      {/* Poussière dorée qui monte (devant le contenu, décorative) */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: particlesZIndex, pointerEvents: 'none', overflow: 'hidden' }}>
        {dust.map((d, i) => (
          <span key={i} className="gbx-dust" style={{
            position: 'absolute', bottom: '-12px', left: `${d.left}%`, width: d.size, height: d.size, borderRadius: '50%',
            background: 'rgba(226,190,110,.7)', boxShadow: '0 0 6px rgba(226,190,110,.5)', opacity: d.opacity,
            animation: `gbx-dust ${d.dur}s linear ${d.delay}s infinite`,
          }} />
        ))}
      </div>
    </>
  )
}
