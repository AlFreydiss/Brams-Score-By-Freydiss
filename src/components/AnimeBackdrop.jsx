import { useMemo, useId } from 'react'

// ── Fond animé thématique, réutilisable par toutes les pages d'anime. ──────────
// Deux couches qui « bougent » : des halos (aurora) qui ondulent dans la palette
// de l'anime, et un champ de motifs (emojis propres à la série) qui dérivent
// lentement vers le haut en oscillant. Purement décoratif : pointer-events none,
// derrière le contenu, et coupé si prefers-reduced-motion.
const FX = `
@keyframes abd-rise {
  0%   { transform: translateY(8vh) translateX(0) rotate(0deg); opacity: 0; }
  12%  { opacity: var(--abd-op, .08); }
  88%  { opacity: var(--abd-op, .08); }
  100% { transform: translateY(-92vh) translateX(var(--abd-x, 4vw)) rotate(var(--abd-r, 22deg)); opacity: 0; }
}
@keyframes abd-aurora-a { 0%,100% { transform: translate(-6%, -4%) scale(1); opacity:.7 } 50% { transform: translate(8%, 6%) scale(1.18); opacity:1 } }
@keyframes abd-aurora-b { 0%,100% { transform: translate(6%, 5%) scale(1.1); opacity:.55 } 50% { transform: translate(-7%, -6%) scale(.9); opacity:.85 } }
@media (prefers-reduced-motion: reduce) { .abd-glyph, .abd-aurora { animation: none !important } }
`

const rng = (seed) => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296 }

export default function AnimeBackdrop({ motifs = ['🌿'], color = '#6c5ce7', color2 = '#a29bfe', count = 16, glyphOpacity = 0.08 }) {
  const uid = useId().replace(/[:]/g, '')
  // Spécifications stables (générées une fois) : un seed dérivé de la couleur garde
  // un rendu cohérent et propre à chaque anime, sans recalcul à chaque re-render.
  const glyphs = useMemo(() => {
    const seed = [...color].reduce((a, c) => a + c.charCodeAt(0), motifs.length * 131)
    const r = rng(seed)
    return Array.from({ length: count }, (_, i) => {
      const dur = 20 + r() * 22
      return {
        char: motifs[Math.floor(r() * motifs.length)],
        left: Math.round(r() * 100),
        size: 16 + Math.round(r() * 34),
        dur,
        delay: -Math.round(r() * dur),
        x: `${(r() * 12 - 6).toFixed(1)}vw`,
        rot: `${Math.round(r() * 80 - 40)}deg`,
        op: (glyphOpacity * (0.6 + r() * 0.7)).toFixed(3),
      }
    })
  }, [motifs, color, count, glyphOpacity])

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <style>{FX}</style>
      <div className="abd-aurora" style={{ position: 'absolute', top: '-20%', left: '-10%', width: '70%', height: '80%', background: `radial-gradient(circle, ${color}, transparent 62%)`, filter: 'blur(60px)', opacity: .8, animation: `abd-aurora-a 24s ease-in-out infinite`, willChange: 'transform' }} />
      <div className="abd-aurora" style={{ position: 'absolute', bottom: '-25%', right: '-12%', width: '66%', height: '78%', background: `radial-gradient(circle, ${color2}, transparent 64%)`, filter: 'blur(70px)', opacity: .55, animation: `abd-aurora-b 30s ease-in-out infinite`, willChange: 'transform' }} />
      {glyphs.map((gl, i) => (
        <span key={`${uid}-${i}`} className="abd-glyph" style={{
          position: 'absolute', bottom: '-8vh', left: `${gl.left}%`, fontSize: gl.size,
          '--abd-x': gl.x, '--abd-r': gl.rot, '--abd-op': gl.op,
          color, textShadow: `0 0 18px ${color}`,
          animation: `abd-rise ${gl.dur}s linear ${gl.delay}s infinite`, willChange: 'transform, opacity',
        }}>{gl.char}</span>
      ))}
    </div>
  )
}

// Palette de motifs par anime (emoji = motif identitaire, léger et net).
export const ANIME_MOTIFS = {
  tpn:    ['🌿', '🍃', '🌱'],
  vivy:   ['🪶', '🎵', '♪', '✦'],
  violet: ['✉️', '🪶', '🌸', '✦'],
  onepiece: ['🏴‍☠️', '⚓', '🌊', '☠️'],
  mha:    ['⚡', '💥', '✨', '🦸'],
  kaiju:  ['👹', '💥', '⚔️', '💢'],
  dbs:    ['🔥', '⭐', '✦', '💥'],
}
