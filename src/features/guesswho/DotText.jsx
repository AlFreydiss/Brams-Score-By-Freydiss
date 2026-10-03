// Texte court en lettres de points 5×7 (même trame que le fond).
// `dot` = pas d'un point en px : la hauteur rendue vaut 7 × dot.
import { glyph, DOT_COLS, DOT_ROWS } from './logic/dotFont.js'

export default function DotText({ text, dot = 12, color, style }) {
  const chars = [...String(text)]
  const units = chars.length * DOT_COLS + (chars.length - 1)
  return (
    <svg viewBox={`-0.5 -0.5 ${units} ${DOT_ROWS}`} width={units * dot} height={DOT_ROWS * dot} aria-hidden
      style={{ display: 'block', maxWidth: '100%', height: 'auto', ...style }}>
      {chars.map((ch, i) => glyph(ch).flatMap((row, r) => row.map((on, c) => on && (
        <rect key={`${i}-${r}-${c}`} x={i * (DOT_COLS + 1) + c - 0.31} y={r - 0.31} width={0.62} height={0.62} fill={color} />
      ))))}
    </svg>
  )
}
