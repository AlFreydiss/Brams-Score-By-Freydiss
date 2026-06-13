// ── Rang Dames — ELO classique + tiers/primes thémés One Piece ───────────────
// ELO sous le capot, affiché en "prime" (bounty ฿) avec des paliers One Piece.
// Pur JS, partagé client + (logique miroir) serveur. START_ELO = 1000.

export const START_ELO = 1000

/** Paliers : ELO -> tier + prime affichée (interpolée dans la tranche). */
export const TIERS = [
  { key: 'mousse',     label: 'Mousse',          emoji: '🪣',  color: '#9aa7b4', min: 0,    max: 699,      primeMin: 0,             primeMax: 5_000_000 },
  { key: 'pirate',     label: 'Pirate',          emoji: '☠️',  color: '#c4884f', min: 700,  max: 999,      primeMin: 5_000_000,     primeMax: 30_000_000 },
  { key: 'supernova',  label: 'Supernova',       emoji: '⭐',  color: '#e0524a', min: 1000, max: 1299,     primeMin: 30_000_000,    primeMax: 120_000_000 },
  { key: 'corsaire',   label: 'Corsaire',        emoji: '⚔️',  color: '#9b6cff', min: 1300, max: 1599,     primeMin: 120_000_000,   primeMax: 500_000_000 },
  { key: 'commandant', label: 'Commandant',      emoji: '🔥',  color: '#ff7a3d', min: 1600, max: 1899,     primeMin: 500_000_000,   primeMax: 1_500_000_000 },
  { key: 'empereur',   label: 'Empereur',        emoji: '👑',  color: '#ffd24a', min: 1900, max: 2199,     primeMin: 1_500_000_000, primeMax: 4_000_000_000 },
  { key: 'roi',        label: 'Roi des Pirates', emoji: '🏴‍☠️', color: '#ffe08a', min: 2200, max: Infinity, primeMin: 4_000_000_000, primeMax: 8_000_000_000 },
]

/** @returns {{tier,label,emoji,color,prime,elo,next,progress}} */
export function eloToTier(elo) {
  const e = Math.max(0, Math.round(Number(elo) || 0))
  const t = TIERS.find((x) => e <= x.max) || TIERS[TIERS.length - 1]
  const idx = TIERS.indexOf(t)
  const next = TIERS[idx + 1] || null
  let prime
  if (t.max === Infinity) {
    prime = t.primeMin + (e - t.min) * 1_000_000 // +1M par point ELO au sommet
  } else {
    const ratio = (e - t.min) / (t.max - t.min + 1)
    prime = t.primeMin + ratio * (t.primeMax - t.primeMin)
  }
  const progress = next ? Math.min(100, Math.max(0, ((e - t.min) / (next.min - t.min)) * 100)) : 100
  return { tier: t.key, label: t.label, emoji: t.emoji, color: t.color, prime: Math.round(prime), elo: e, next, progress }
}

/** Prime ฿ lisible : ฿65.5M, ฿1.5 Md, ฿4 Md… */
export function formatPrime(n) {
  const v = Math.max(0, Math.round(Number(n) || 0))
  const strip = (s) => s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
  if (v >= 1_000_000_000) return `฿${strip((v / 1_000_000_000).toFixed(2))} Md`
  if (v >= 1_000_000) return `฿${strip((v / 1_000_000).toFixed(1))}M`
  if (v >= 1_000) return `฿${Math.round(v / 1000)}k`
  return `฿${v}`
}

// ── ELO ───────────────────────────────────────────────────────────────────────
export function expectedScore(elo, eloAdv) {
  return 1 / (1 + Math.pow(10, (eloAdv - elo) / 400))
}
export function kFactor(gamesPlayed) {
  return (Number(gamesPlayed) || 0) < 30 ? 32 : 20
}
/** Nouveau ELO. score ∈ {1 (victoire), 0.5 (nul), 0 (défaite)}. */
export function computeElo(elo, eloAdv, score, gamesPlayed) {
  return Math.round(elo + kFactor(gamesPlayed) * (score - expectedScore(elo, eloAdv)))
}

/** Variation ELO des deux joueurs sur un résultat (pour l'affichage / preview). */
export function eloDelta(eloA, eloB, scoreA, gamesA, gamesB) {
  const newA = computeElo(eloA, eloB, scoreA, gamesA)
  const newB = computeElo(eloB, eloA, 1 - scoreA, gamesB)
  return { a: newA - eloA, b: newB - eloB, newA, newB }
}
