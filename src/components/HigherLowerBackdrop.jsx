import { useMemo } from 'react'

// Fond animé du jeu « Plus vieux / Plus récent ».
//
// Le jeu parle d'époques, donc le décor aussi : une frise de décennies qui
// défile lentement en profondeur, des aurores dans les deux couleurs des cartes,
// des faisceaux et des poussières. La teinte dominante suit la série en cours —
// froide au début, chaude quand la série s'allonge — pour qu'on sente monter la
// tension sans lire le compteur.
//
// Décoratif : pointer-events none, derrière le contenu, coupé sous
// prefers-reduced-motion.

const CSS = `
  @keyframes hlAuraA  { 0%,100%{transform:translate3d(-4%,-3%,0) scale(1)}   50%{transform:translate3d(5%,4%,0) scale(1.16)} }
  @keyframes hlAuraB  { 0%,100%{transform:translate3d(4%,4%,0) scale(1.12)}  50%{transform:translate3d(-5%,-3%,0) scale(.95)} }
  @keyframes hlRay    { 0%,100%{transform:rotate(12deg); opacity:.12}        50%{transform:rotate(21deg); opacity:.3} }
  @keyframes hlDrift  { from{background-position:0 0}                        to{background-position:-360px 0} }
  @keyframes hlMote   { 0%{transform:translate3d(0,0,0); opacity:0} 14%{opacity:.6} 86%{opacity:.3} 100%{transform:translate3d(-26px,-95vh,0); opacity:0} }
  @keyframes hlPulse  { 0%,100%{opacity:.35} 50%{opacity:.8} }

  .hl-grain {
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  @media (prefers-reduced-motion: reduce){ [data-hlbg]{animation:none!important} }
`

// La palette se réchauffe avec la série : rose froid, puis ambre, puis braise.
function paletteFor(streak) {
  if (streak >= 15) return { a: '#f97316', b: '#dc2626', soft: 'rgba(249,115,22,' }
  if (streak >= 7)  return { a: '#d4a017', b: '#9d174d', soft: 'rgba(212,160,23,' }
  return { a: '#9d174d', b: '#4c1d95', soft: 'rgba(157,23,77,' }
}

export default function HigherLowerBackdrop({ streak = 0, verdict = null }) {
  const motes = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    x: (i * 49.7 + 11) % 97,
    dur: 11 + (i * 0.91) % 9,
    del: (i * 1.33) % 11,
    size: i % 3 === 0 ? 3 : 2,
  })), [])

  const pal = paletteFor(streak)
  // Vert quand la réponse est bonne, rouge quand elle est fausse.
  const flash = verdict === true ? '#15803d' : verdict === false ? '#b91c1c' : null

  return (
    <div aria-hidden style={{
      position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
      overflow: 'hidden', background: '#050308',
    }}>
      <style>{CSS}</style>

      <div data-hlbg style={{
        position: 'absolute', left: '-28vmax', top: '-24vmax',
        width: '84vmax', height: '84vmax', borderRadius: '50%',
        background: `radial-gradient(circle, ${pal.a}3a 0%, ${pal.a}12 44%, transparent 68%)`,
        filter: 'blur(38px)', animation: 'hlAuraA 15s ease-in-out infinite',
        transition: 'background 1.2s ease',
      }} />
      <div data-hlbg style={{
        position: 'absolute', right: '-28vmax', bottom: '-26vmax',
        width: '84vmax', height: '84vmax', borderRadius: '50%',
        background: `radial-gradient(circle, ${pal.b}34 0%, ${pal.b}10 44%, transparent 68%)`,
        filter: 'blur(42px)', animation: 'hlAuraB 19s ease-in-out infinite',
        transition: 'background 1.2s ease',
      }} />

      {/* Faisceau unique, discret, pour casser la symétrie. */}
      <div data-hlbg style={{
        position: 'absolute', left: '26%', top: '-40%', width: 240, height: '150%',
        transformOrigin: 'top center', filter: 'blur(30px)',
        background: `linear-gradient(to bottom, ${pal.soft}.22), transparent 70%)`,
        animation: 'hlRay 17s ease-in-out infinite',
        transition: 'background 1.2s ease',
      }} />

      {/* Frise de décennies : des graduations qui défilent, comme une ligne du
          temps vue de très loin. C'est le sujet même du jeu. */}
      <div data-hlbg style={{
        position: 'absolute', left: 0, right: 0, bottom: '16%', height: 120,
        backgroundImage: `repeating-linear-gradient(90deg, ${pal.soft}.34) 0 2px, transparent 2px 120px)`,
        maskImage: 'linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)',
        opacity: 0.5, animation: 'hlDrift 26s linear infinite',
        transition: 'background-image 1.2s ease',
      }} />
      <div data-hlbg style={{
        position: 'absolute', left: 0, right: 0, bottom: '16%', height: 2,
        background: `linear-gradient(90deg, transparent, ${pal.a}aa 30%, ${pal.b}aa 70%, transparent)`,
        boxShadow: `0 0 26px 5px ${pal.soft}.24)`,
        animation: 'hlPulse 6s ease-in-out infinite',
      }} />

      {motes.map((m, i) => (
        <span key={i} data-hlbg style={{
          position: 'absolute', left: `${m.x}%`, bottom: -10,
          width: m.size, height: m.size, borderRadius: '50%',
          background: i % 2 ? pal.a : pal.b,
          opacity: 0, animation: `hlMote ${m.dur}s ${m.del}s linear infinite`,
        }} />
      ))}

      {/* Lavis de verdict au moment de la réponse. */}
      {flash && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 50% 62%, ${flash}30 0%, transparent 60%)`,
        }} />
      )}

      <div className="hl-grain" style={{ position: 'absolute', inset: 0, opacity: 0.05, mixBlendMode: 'overlay' }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5,3,8,.84) 100%)',
      }} />
    </div>
  )
}
