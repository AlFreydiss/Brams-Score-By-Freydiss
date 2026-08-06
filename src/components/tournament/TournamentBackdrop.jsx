import { useMemo } from 'react'

// Fond « scène de concert » de la page tournoi : auras qui respirent, faisceaux
// de projecteurs balayés, sol néon en perspective, egaliseur au ras du sol,
// embers + étoiles, grain + vignette. Palette rose/violet du site, glow maîtrisé.
// Tout en transform/opacity (GPU) + prefers-reduced-motion respecté.

const BD_CSS = `
  @keyframes bdAuraL   { 0%,100%{transform:translate3d(-4%,-2%,0) scale(1)} 50%{transform:translate3d(3%,4%,0) scale(1.12)} }
  @keyframes bdAuraR   { 0%,100%{transform:translate3d(4%,3%,0) scale(1.08)} 50%{transform:translate3d(-3%,-3%,0) scale(0.98)} }
  @keyframes bdBeamA   { 0%,100%{transform:rotate(16deg); opacity:.34} 50%{transform:rotate(26deg); opacity:.6} }
  @keyframes bdBeamB   { 0%,100%{transform:rotate(-18deg); opacity:.30} 50%{transform:rotate(-28deg); opacity:.55} }
  @keyframes bdGrid    { from{background-position:0 0} to{background-position:0 84px} }
  @keyframes bdHorizon { 0%,100%{opacity:.5} 50%{opacity:.95} }
  @keyframes bdEq      { 0%,100%{transform:scaleY(.18)} 50%{transform:scaleY(1)} }
  @keyframes bdEmber   { 0%{transform:translate3d(0,0,0); opacity:0} 10%{opacity:.75} 85%{opacity:.4} 100%{transform:translate3d(26px,-94vh,0); opacity:0} }
  @keyframes bdTwinkle { 0%,100%{opacity:.06} 50%{opacity:.5} }
  @keyframes bdRing    { 0%{transform:translate(-50%,-50%) scale(.6); opacity:.5} 100%{transform:translate(-50%,-50%) scale(1.6); opacity:0} }

  .bd-grid {
    position:absolute; left:-42%; right:-42%; bottom:-20%; height:66%;
    background-image:
      linear-gradient(rgba(232,90,160,.36) 1.4px, transparent 1.4px),
      linear-gradient(90deg, rgba(150,90,255,.30) 1.4px, transparent 1.4px);
    background-size:84px 84px;
    transform:perspective(560px) rotateX(61deg); transform-origin:bottom center;
    -webkit-mask-image:linear-gradient(to top,#000 6%, transparent 80%);
    mask-image:linear-gradient(to top,#000 6%, transparent 80%);
    animation:bdGrid 7s linear infinite;
  }
  .bd-horizon {
    position:absolute; left:0; right:0; bottom:40%; height:2px;
    background:linear-gradient(90deg, transparent, rgba(232,90,160,.85) 32%, rgba(150,90,255,.85) 68%, transparent);
    box-shadow:0 0 28px 6px rgba(232,90,160,.30), 0 0 58px 14px rgba(150,90,255,.20);
    animation:bdHorizon 5s ease-in-out infinite;
  }
  .bd-grain {
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  @media (prefers-reduced-motion: reduce){ [data-bdfx]{animation:none!important} .bd-grid{animation:none!important} }
`

export default function TournamentBackdrop({ accentA = '#db2777', accentB = '#7c3aed' }) {
  const embers = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    x: (i * 51.7 + 11) % 96, dur: 9 + (i * 0.77) % 8, del: (i * 1.19) % 9,
    size: i % 3 === 0 ? 3 : 2, light: i % 4 === 0,
  })), [])
  const stars = useMemo(() => Array.from({ length: 46 }, (_, i) => ({
    x: (i * 37.3 + 13) % 98, y: (i * 41.9 + 9) % 62,
    size: i % 9 === 0 ? 2.4 : i % 4 === 0 ? 1.6 : 1,
    dur: 2.6 + (i * 0.31) % 4.4, del: (i * 0.23) % 7,
    pink: i % 11 === 0,
  })), [])
  const bars = useMemo(() => Array.from({ length: 44 }, (_, i) => ({
    dur: 0.9 + (i * 0.137) % 1.4, del: (i * 0.211) % 1.8,
    h: 14 + (i * 13.7) % 42,
  })), [])

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', background: '#050308' }}>
      <style>{BD_CSS}</style>

      {/* Base : nuit profonde, très léger dégradé violet */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #0d0614 0%, #080410 52%, #050308 100%)',
      }} />

      {/* Auras respirantes — deux orbes qui dérivent lentement */}
      <div data-bdfx style={{
        position: 'absolute', left: '-18%', top: '-24%', width: '68%', height: '70%',
        background: `radial-gradient(circle at 45% 45%, ${accentA}52 0%, ${accentA}14 42%, transparent 68%)`,
        filter: 'blur(46px)', animation: 'bdAuraL 13s ease-in-out infinite',
      }} />
      <div data-bdfx style={{
        position: 'absolute', right: '-20%', top: '-14%', width: '64%', height: '74%',
        background: `radial-gradient(circle at 55% 45%, ${accentB}4d 0%, ${accentB}12 44%, transparent 70%)`,
        filter: 'blur(52px)', animation: 'bdAuraR 16s ease-in-out infinite',
      }} />

      {/* Faisceaux de projecteurs depuis les coins hauts */}
      <div data-bdfx style={{
        position: 'absolute', top: '-12%', left: '6%', width: 190, height: '95%',
        transformOrigin: 'top center',
        background: `linear-gradient(180deg, ${accentA}30, ${accentA}0a 55%, transparent 82%)`,
        clipPath: 'polygon(42% 0, 58% 0, 100% 100%, 0 100%)',
        filter: 'blur(14px)', animation: 'bdBeamA 11s ease-in-out infinite',
      }} />
      <div data-bdfx style={{
        position: 'absolute', top: '-12%', right: '8%', width: 190, height: '95%',
        transformOrigin: 'top center',
        background: `linear-gradient(180deg, ${accentB}2c, ${accentB}0a 55%, transparent 82%)`,
        clipPath: 'polygon(42% 0, 58% 0, 100% 100%, 0 100%)',
        filter: 'blur(14px)', animation: 'bdBeamB 13s ease-in-out infinite',
      }} />

      {/* Étoiles (moitié haute) */}
      {stars.map((s, i) => (
        <div key={`s${i}`} data-bdfx style={{
          position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: '50%',
          background: s.pink ? 'rgba(249,168,212,.6)' : 'rgba(255,255,255,.42)',
          animation: `bdTwinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
        }} />
      ))}

      {/* Sol néon en perspective + horizon */}
      <div data-bdfx className="bd-grid" />
      <div data-bdfx className="bd-horizon" />

      {/* Égaliseur au ras du sol — identité musicale */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 64,
        display: 'flex', alignItems: 'flex-end', gap: 5, padding: '0 3vw',
        maskImage: 'linear-gradient(to top, #000 30%, transparent)',
        WebkitMaskImage: 'linear-gradient(to top, #000 30%, transparent)',
        opacity: 0.5,
      }}>
        {bars.map((b, i) => (
          <div key={`b${i}`} data-bdfx style={{
            flex: 1, height: b.h, borderRadius: '3px 3px 0 0', transformOrigin: 'bottom',
            background: `linear-gradient(180deg, ${i % 2 ? accentB : accentA}b3, ${i % 2 ? accentB : accentA}26)`,
            animation: `bdEq ${b.dur}s ${b.del}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      {/* Embers montants */}
      {embers.map((e, i) => (
        <div key={`e${i}`} data-bdfx style={{
          position: 'absolute', left: `${e.x}%`, bottom: -12, width: e.size, height: e.size, borderRadius: '50%',
          background: e.light ? 'rgba(249,168,212,.72)' : `${accentA}99`,
          boxShadow: `0 0 6px ${e.light ? 'rgba(249,168,212,.5)' : `${accentA}73`}`,
          animation: `bdEmber ${e.dur}s ${e.del}s linear infinite`,
        }} />
      ))}

      {/* Onde circulaire discrète au centre-scène */}
      <div data-bdfx style={{
        position: 'absolute', left: '50%', top: '58%', width: 460, height: 130,
        border: `1px solid ${accentA}38`, borderRadius: '50%',
        animation: 'bdRing 6s ease-out infinite',
      }} />
      <div data-bdfx style={{
        position: 'absolute', left: '50%', top: '58%', width: 460, height: 130,
        border: `1px solid ${accentB}30`, borderRadius: '50%',
        animation: 'bdRing 6s 3s ease-out infinite',
      }} />

      {/* Vignette + grain */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 96% 84% at 50% 36%, transparent 46%, rgba(0,0,0,.66) 100%)' }} />
      <div className="bd-grain" style={{ position: 'absolute', inset: 0, opacity: 0.07, mixBlendMode: 'overlay' }} />
    </div>
  )
}
