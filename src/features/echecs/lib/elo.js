// ── ELO côté affichage + rangs One Piece ─────────────────────────────────────
// Le calcul OFFICIEL est server-side (RPC finaliser_partie). Ici : prévision
// affichée avant la fin (« +8 / −8 ») et rang décoratif.

// Échelle de tiers NEUTRE PREMIUM : du graphite (débutant) au laiton lumineux
// (élite), une seule famille chaude — pas de RGB criard. Labels = tiers d'échecs.
export const RANGS = [
  { min: 0,    label: 'Bronze',   zone: 'Débutant',   couleur: '#9aa1ad', emoji: '♟' },
  { min: 1000, label: 'Argent',   zone: 'Confirmé',   couleur: '#b9c0cc', emoji: '♟' },
  { min: 1300, label: 'Or',       zone: 'Avancé',     couleur: '#c8a45c', emoji: '♞' },
  { min: 1600, label: 'Platine',  zone: 'Expert',     couleur: '#d6b878', emoji: '♝' },
  { min: 1900, label: 'Diamant',  zone: 'Maître',     couleur: '#e0c074', emoji: '♜' },
  { min: 2200, label: 'Maître',   zone: 'Élite',      couleur: '#ecd28c', emoji: '♛' },
  { min: 2500, label: 'Grand Maître', zone: 'Légende', couleur: '#f3e0a8', emoji: '♚' },
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
