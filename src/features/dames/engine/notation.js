// Notation internationale des dames : cases foncées numérotées 1–50 (haut→bas).
// (r,c) foncée → numéro = r*5 + (c>>1) + 1.
export const sq = (r, c) => r * 5 + (c >> 1) + 1
export function moveToNotation(move) {
  if (!move) return ''
  const a = sq(move.from[0], move.from[1]), b = sq(move.to[0], move.to[1])
  return (move.caps && move.caps.length) ? `${a}x${b}` : `${a}-${b}`
}
