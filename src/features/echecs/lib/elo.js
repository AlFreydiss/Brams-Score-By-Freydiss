// ── ELO côté affichage + rangs One Piece ─────────────────────────────────────
// Le calcul OFFICIEL est server-side (RPC finaliser_partie). Ici : prévision
// affichée avant la fin (« +8 / −8 ») et rang décoratif.

export const RANGS = [
  { min: 0,    label: 'Mousse',          zone: 'East Blue',     couleur: '#9aa4b2', emoji: '🧹' },
  { min: 1000, label: 'Pirate',          zone: 'Grand Line',    couleur: '#74b9ff', emoji: '🏴‍☠️' },
  { min: 1300, label: 'Super-Nova',      zone: 'Nouveau Monde', couleur: '#00cec9', emoji: '💫' },
  { min: 1600, label: 'Shichibukai',     zone: 'Nouveau Monde', couleur: '#9b59b6', emoji: '⚔️' },
  { min: 1900, label: 'Amiral',          zone: 'Marine',        couleur: '#e0524a', emoji: '🦅' },
  { min: 2200, label: 'Yonkou',          zone: 'Empereur',      couleur: '#ffd700', emoji: '👑' },
  { min: 2500, label: 'Roi des Pirates', zone: 'Légende',       couleur: '#ff9f43', emoji: '☠️' },
]

export function rangPourElo(elo) {
  let r = RANGS[0]
  for (const rang of RANGS) if ((elo ?? 0) >= rang.min) r = rang
  return r
}

// K-facteur identique au serveur (pour la prévision affichée)
export function kFacteur(parties, elo) {
  if ((parties ?? 0) < 30) return 40
  if ((elo ?? 0) < 2100) return 20
  return 10
}

// Prévision de variation : retourne { victoire, nulle, defaite } (arrondis)
export function previsionElo(monElo, sonElo, mesParties) {
  const E = 1 / (1 + Math.pow(10, ((sonElo ?? 1200) - (monElo ?? 1200)) / 400))
  const K = kFacteur(mesParties, monElo)
  return {
    victoire: Math.round(K * (1 - E)),
    nulle:    Math.round(K * (0.5 - E)),
    defaite:  Math.round(K * (0 - E)),
  }
}
