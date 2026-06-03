import { useMemo } from 'react'

// Posters d'animés qui vagabondent en fond (pseudo-3D via perspective + dérive CSS).
// Volontairement en <img> et PAS en WebGL : les covers sont sur des CDN externes
// sans header CORS → impossible de les charger comme textures three.js (Context Lost).
// Un <img> affiche une image cross-origin sans souci. Sobre : faible opacité, teinte bleue.
export default function AnimeDrift3D({ images = [] }) {
  const picks = useMemo(
    () => Array.from(new Set(images.filter(Boolean))).slice(0, 12),
    [images]
  )
  if (!picks.length) return null

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', perspective: '1200px' }} aria-hidden>
      <style>{`
        @keyframes ahFloatA { 0%,100% { transform: perspective(1200px) rotateY(22deg) rotateZ(-5deg) translate3d(0,0,-60px); } 50% { transform: perspective(1200px) rotateY(13deg) rotateZ(5deg) translate3d(28px,-36px,40px); } }
        @keyframes ahFloatB { 0%,100% { transform: perspective(1200px) rotateY(-24deg) rotateZ(6deg) translate3d(0,0,-50px); } 50% { transform: perspective(1200px) rotateY(-14deg) rotateZ(-4deg) translate3d(-32px,30px,50px); } }
        @media (prefers-reduced-motion: reduce) { .ah-drift { animation: none !important; } }
      `}</style>
      {picks.map((url, i) => {
        const r = (n) => (Math.sin((i + 1) * 999.7 + n * 37.3) * 0.5 + 0.5)
        const depth = r(6) // 0 (loin) → 1 (proche)
        const w = 104 + depth * 104
        return (
          <img
            key={url}
            className="ah-drift"
            src={url}
            alt=""
            loading="lazy"
            decoding="async"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
            style={{
              position: 'absolute',
              left: `${r(1) * 92}%`,
              top: `${r(2) * 86}%`,
              width: w,
              height: w * 1.45,
              objectFit: 'cover',
              borderRadius: 12,
              opacity: 0.16 + depth * 0.28,
              filter: `blur(${(1 - depth) * 1.4}px) saturate(0.95) brightness(0.92)`,
              boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
              transformStyle: 'preserve-3d',
              animation: `${i % 2 ? 'ahFloatB' : 'ahFloatA'} ${11 + r(4) * 9}s ease-in-out ${(-r(5) * 18).toFixed(1)}s infinite`,
              willChange: 'transform',
            }}
          />
        )
      })}
    </div>
  )
}
