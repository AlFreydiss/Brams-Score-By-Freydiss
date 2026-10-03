// Guess Who — transition de phase : le nom de la phase en lettres de points
// (même trame que le fond) balaie l'écran de gauche à droite puis s'efface.
// ~1,4 s, au-dessus de tout mais sans bloquer les clics ; rien si l'OS
// demande moins d'animations, rien pour la salle d'attente.
import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { T, F } from './theme.js'
import { glyph, DOT_COLS, DOT_ROWS } from './logic/dotFont.js'

const WORDS = {
  gages: 'GAGES', listen: 'ÉCOUTE', record: 'À TOI', vote: 'VOTE', revote: 'ÉGALITÉ',
  result: 'VERDICT', gage: 'GAGE', end: 'FIN',
}
const LIFE_MS = 1400
const COL_MS = 14 // décalage du balayage par colonne de points

export const flashWord = (phase) => WORDS[phase] || null

export default function PhaseFlash({ phase, round }) {
  const reduce = useReducedMotion()
  const word = flashWord(phase)
  const [alive, setAlive] = useState(true)
  useEffect(() => {
    setAlive(true)
    const t = setTimeout(() => setAlive(false), LIFE_MS)
    return () => clearTimeout(t)
  }, [phase, round])
  if (reduce || !word || !alive) return null
  const chars = [...word]
  const units = chars.length * DOT_COLS + (chars.length - 1)
  const sub = phase === 'listen' && round ? `Tour ${round}` : null
  return (
    <div key={`${phase}-${round}`} aria-hidden className="gw-anim gw-keep" style={{ '--gw-d': `${LIFE_MS}ms`,
      position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none', display: 'grid', placeItems: 'center', alignContent: 'center', gap: 18,
      background: 'radial-gradient(ellipse 70% 45% at 50% 50%, rgba(11,11,12,0.88), rgba(11,11,12,0.55) 70%, rgba(11,11,12,0) 100%)',
      animation: `gw-flash-life ${LIFE_MS}ms ease both`,
    }}>
      <svg viewBox={`-0.5 -0.5 ${units} ${DOT_ROWS}`} style={{ width: `min(84vw, ${units * 19}px)`, height: 'auto', display: 'block' }}>
        {chars.map((ch, i) => glyph(ch).flatMap((row, r) => row.map((on, c) => on && (
          <rect key={`${i}-${r}-${c}`} x={i * (DOT_COLS + 1) + c - 0.29} y={r - 0.29} width={0.58} height={0.58}
            fill={T.textHi} className="gw-anim gw-keep"
            style={{ '--gw-d': '.3s', animation: `gw-dot-in .3s cubic-bezier(.2,.8,.2,1) ${(i * (DOT_COLS + 1) + c) * COL_MS}ms both` }} />
        ))))}
      </svg>
      {sub && <div style={{ fontFamily: F.ui, fontWeight: 600, fontSize: 15, color: T.accentLit }}>{sub}</div>}
    </div>
  )
}
