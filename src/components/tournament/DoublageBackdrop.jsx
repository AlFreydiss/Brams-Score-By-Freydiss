import { useMemo } from 'react'

// Fond animé de la Guerre du Doublage : deux camps, deux couleurs, une ligne de
// faille au milieu. L'aura du côté qu'on écoute se réveille, l'autre s'endort —
// le fond dit donc en permanence quelle version parle, sans jamais révéler
// laquelle est la VF (le camp A/B est tiré au sort à chaque manche).
//
// Tout est en transform/opacity pour rester sur le GPU, et l'animation se coupe
// entièrement sous prefers-reduced-motion.

export const SIDE_A = { base: '#0e7490', glow: '#22d3ee', soft: 'rgba(34,211,238,' }
export const SIDE_B = { base: '#9d174d', glow: '#f472b6', soft: 'rgba(244,114,182,' }

const CSS = `
  @keyframes dbAuraA   { 0%,100%{transform:translate3d(-3%,-2%,0) scale(1)}    50%{transform:translate3d(4%,3%,0) scale(1.14)} }
  @keyframes dbAuraB   { 0%,100%{transform:translate3d(3%,3%,0) scale(1.1)}    50%{transform:translate3d(-4%,-2%,0) scale(0.97)} }
  @keyframes dbFault   { 0%,100%{opacity:.35; transform:scaleY(1)}             50%{opacity:.9;  transform:scaleY(1.06)} }
  @keyframes dbSweep   { 0%{transform:translateY(-120%)}                       100%{transform:translateY(120%)} }
  @keyframes dbEq      { 0%,100%{transform:scaleY(.16)}                        50%{transform:scaleY(1)} }
  @keyframes dbMote    { 0%{transform:translate3d(0,0,0); opacity:0} 12%{opacity:.7} 88%{opacity:.35} 100%{transform:translate3d(22px,-92vh,0); opacity:0} }
  @keyframes dbRing    { 0%{transform:translate(-50%,-50%) scale(.5); opacity:.55} 100%{transform:translate(-50%,-50%) scale(1.7); opacity:0} }

  .db-grain {
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  @media (prefers-reduced-motion: reduce){ [data-dbbg]{animation:none!important} }
`

export default function DoublageBackdrop({ side = 'A', revealed = null, started = false }) {
  // Positions figées au montage : un fond qui se réorganise à chaque rendu
  // scintille désagréablement.
  const motes = useMemo(() => Array.from({ length: 16 }, (_, i) => ({
    x: (i * 53.3 + 9) % 96,
    dur: 10 + (i * 0.83) % 8,
    del: (i * 1.27) % 10,
    size: i % 3 === 0 ? 3 : 2,
  })), [])

  const bars = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    dur: 0.85 + (i * 0.143) % 1.35,
    del: (i * 0.197) % 1.7,
    h: 12 + (i * 14.3) % 40,
  })), [])

  const activeA = side === 'A'
  // Après le vote, c'est le camp voté qui colore la scène.
  const verdict = revealed === 'vf' ? '#2563eb' : revealed === 'vostfr' ? '#dc2626' : null

  const aura = (cfg, on, anim, pos) => ({
    position: 'absolute', width: '86vmax', height: '86vmax', borderRadius: '50%',
    ...pos,
    background: `radial-gradient(circle, ${cfg.soft}${on ? '.46' : '.14'}) 0%, ${cfg.soft}${on ? '.18' : '.06'}) 42%, transparent 68%)`,
    filter: `blur(${on ? 34 : 46}px)`,
    animation: `${anim} ${on ? 13 : 19}s ease-in-out infinite`,
    transition: 'background .6s ease, filter .6s ease',
  })

  return (
    <div aria-hidden style={{
      position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
      overflow: 'hidden', background: '#050308',
    }}>
      <style>{CSS}</style>

      {/* Aura du camp A, ancrée à gauche */}
      <div data-dbbg style={aura(SIDE_A, activeA, 'dbAuraA', { left: '-30vmax', top: '-22vmax' })} />
      {/* Aura du camp B, ancrée à droite */}
      <div data-dbbg style={aura(SIDE_B, !activeA, 'dbAuraB', { right: '-30vmax', bottom: '-26vmax' })} />

      {/* Ligne de faille : la frontière entre les deux versions. */}
      <div data-dbbg style={{
        position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2,
        transform: 'translateX(-50%)',
        background: `linear-gradient(to bottom, transparent, ${SIDE_A.glow}66 22%, ${SIDE_B.glow}66 78%, transparent)`,
        boxShadow: `0 0 40px 8px ${activeA ? SIDE_A.soft : SIDE_B.soft}.34)`,
        animation: 'dbFault 6s ease-in-out infinite',
        transition: 'box-shadow .6s ease',
      }} />

      {/* Balayage lumineux qui traverse la faille, uniquement quand ça joue. */}
      {started && (
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 220, transform: 'translateX(-50%)', overflow: 'hidden' }}>
          <div data-dbbg style={{
            position: 'absolute', inset: '-20% 0',
            background: `linear-gradient(to bottom, transparent, ${activeA ? SIDE_A.soft : SIDE_B.soft}.16), transparent)`,
            animation: 'dbSweep 5.5s linear infinite',
          }} />
        </div>
      )}

      {/* Égaliseur au ras du sol, teinté par le camp actif. */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 120,
        display: 'flex', alignItems: 'flex-end', gap: 3, padding: '0 2vw',
        opacity: started ? 0.65 : 0.22, transition: 'opacity .6s ease',
      }}>
        {bars.map((b, i) => (
          <div key={i} data-dbbg style={{
            flex: 1, height: b.h, transformOrigin: 'bottom',
            background: `linear-gradient(to top, ${activeA ? SIDE_A.glow : SIDE_B.glow}, transparent)`,
            animation: `dbEq ${b.dur}s ease-in-out ${b.del}s infinite`,
            transition: 'background .6s ease',
          }} />
        ))}
      </div>

      {/* Poussières qui montent, pour que le fond ne soit jamais figé. */}
      {motes.map((m, i) => (
        <span key={i} data-dbbg style={{
          position: 'absolute', left: `${m.x}%`, bottom: -10,
          width: m.size, height: m.size, borderRadius: '50%',
          background: i % 2 ? SIDE_A.glow : SIDE_B.glow,
          opacity: 0, animation: `dbMote ${m.dur}s ${m.del}s linear infinite`,
        }} />
      ))}

      {/* Onde de verdict : la scène bascule vers la couleur du camp voté. */}
      {verdict && (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(circle at 50% 45%, ${verdict}33 0%, transparent 62%)`,
          }} />
          <div data-dbbg style={{
            position: 'absolute', left: '50%', top: '45%',
            width: 320, height: 320, borderRadius: '50%',
            border: `1px solid ${verdict}`,
            animation: 'dbRing 1.6s ease-out',
          }} />
        </>
      )}

      {/* Grain + vignette : donne de la matière et enfonce les bords. */}
      <div className="db-grain" style={{ position: 'absolute', inset: 0, opacity: 0.05, mixBlendMode: 'overlay' }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 42%, rgba(5,3,8,.82) 100%)',
      }} />
    </div>
  )
}
