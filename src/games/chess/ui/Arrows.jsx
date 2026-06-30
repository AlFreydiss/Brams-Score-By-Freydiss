// ── Arrows : overlay SVG d'une flèche de coup (indice du coach) au-dessus du plateau.
// Pur, sans état. Mappe une case ('e2') vers son centre en pixels selon l'orientation.
// pointerEvents:none → ne bloque jamais l'interaction avec l'échiquier.

function centre(square, orientation, sq) {
  const file = square.charCodeAt(0) - 97          // a..h → 0..7
  const rank = parseInt(square[1], 10)            // 1..8
  const col = orientation === 'black' ? 7 - file : file
  const row = orientation === 'black' ? rank - 1 : 8 - rank
  return { x: (col + 0.5) * sq, y: (row + 0.5) * sq }
}

export default function Arrows({ cases, orientation = 'white', taille = 440, accent = '#81b64c' }) {
  if (!cases || cases.length < 2) return null
  const sq = taille / 8
  const a = centre(cases[0], orientation, sq)
  const b = centre(cases[1], orientation, sq)

  const dx = b.x - a.x, dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len, uy = dy / len

  const headLen = sq * 0.46
  const headW = sq * 0.42
  const lineW = sq * 0.19
  // départ légèrement décollé du centre de la case d'origine, arrivée au pied de la tête.
  const x0 = a.x + ux * sq * 0.20
  const y0 = a.y + uy * sq * 0.20
  const xTip = b.x, yTip = b.y
  const xBase = xTip - ux * headLen
  const yBase = yTip - uy * headLen
  // perpendiculaire pour la base du triangle
  const px = -uy, py = ux
  const h1x = xBase + px * (headW / 2), h1y = yBase + py * (headW / 2)
  const h2x = xBase - px * (headW / 2), h2y = yBase - py * (headW / 2)

  return (
    <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }} aria-hidden>
      <g style={{ opacity: 0.82 }}>
        <line x1={x0} y1={y0} x2={xBase} y2={yBase}
          stroke={accent} strokeWidth={lineW} strokeLinecap="round" />
        <polygon points={`${xTip},${yTip} ${h1x},${h1y} ${h2x},${h2y}`} fill={accent} />
      </g>
    </svg>
  )
}
