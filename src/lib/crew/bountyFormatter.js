/**
 * Format a bounty integer as a One Piece styled string.
 * @param {number|null|undefined} n
 * @returns {string}
 */
export function formatBounty(n) {
  if (n == null || n === '' || Number.isNaN(n)) return '??? Berry'
  const v = parseInt(n)
  if (v === 0) return '??? Berry'

  if (v >= 1_000_000_000) {
    const md = v / 1_000_000_000
    const str = md % 1 === 0 ? md.toFixed(0) : md.toFixed(2)
    return `${str} Md Berry`
  }
  if (v >= 1_000_000) {
    const m = Math.floor(v / 1_000_000)
    const rest = Math.floor((v % 1_000_000) / 1_000)
    if (rest === 0) return `${m} 000 000 Berry`
    return `${m} ${String(rest).padStart(3, '0')} 000 Berry`
  }
  if (v >= 1_000) {
    return `${v.toLocaleString('fr-FR')} Berry`
  }
  return `${v} Berry`
}

/**
 * @param {number|null} bounty
 * @returns {'yonkou'|'supernova'|'standard'|'rookie'|'unknown'}
 */
export function getBountyTier(bounty) {
  const v = parseInt(bounty)
  if (!v || Number.isNaN(v)) return 'unknown'
  if (v >= 1_000_000_000) return 'yonkou'
  if (v >= 500_000_000)   return 'supernova'
  if (v >= 100_000_000)   return 'standard'
  if (v >= 10_000_000)    return 'rookie'
  return 'unknown'
}
