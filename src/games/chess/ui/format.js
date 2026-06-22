// Helpers d'affichage partagés (horloge mono, eval).
// Temps ms → 'm:ss' (ou 'm:ss.d' sous 10 s pour le dixième, façon chess.com).
export function formaterTemps(ms) {
  if (ms === Infinity || ms == null) return '∞'
  const total = Math.max(0, ms)
  const min = Math.floor(total / 60000)
  const sec = Math.floor((total % 60000) / 1000)
  if (total < 10000) {
    const dixieme = Math.floor((total % 1000) / 100)
    return `${min}:${String(sec).padStart(2, '0')}.${dixieme}`
  }
  return `${min}:${String(sec).padStart(2, '0')}`
}

// winPct exact demandé par le spec (sigmoïde lichess) à partir des centipions
// (point de vue blanc) → 0..100 %. cp plafonné implicitement par la sigmoïde.
export function winPct(cp) {
  if (cp == null) return 50
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
}

// Texte d'éval lisible : '+1.2' / '-0.8' / 'M3' / 'M-2' / '0.0'.
export function texteEval({ cp, mate }) {
  if (mate != null) {
    if (mate === 0) return '#'
    return mate > 0 ? `M${mate}` : `M${mate}`
  }
  if (cp == null) return '–'
  const v = cp / 100
  const signe = v > 0 ? '+' : ''
  return `${signe}${v.toFixed(Math.abs(v) >= 10 ? 0 : 1)}`
}
