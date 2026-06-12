// ── Niveaux Stockfish calibrés en ELO (rangs One Piece) ──────────────────────
// limitStrength → UCI_LimitStrength + UCI_Elo. Yonkou = pleine force.
// movetimeMs : budget de réflexion (allongé avec le niveau pour un rythme naturel).

export const NIVEAUX_IA = [
  { id: 'mousse',      label: 'Mousse',      sousTitre: 'Débutant tranquille',  limitStrength: true,  elo: 800,  movetimeMs: 400,  emoji: '🧹' },
  { id: 'pirate',      label: 'Pirate',      sousTitre: 'Joueur du dimanche',   limitStrength: true,  elo: 1200, movetimeMs: 600,  emoji: '🏴‍☠️' },
  { id: 'supernova',   label: 'Super-Nova',  sousTitre: 'Club solide',          limitStrength: true,  elo: 1600, movetimeMs: 800,  emoji: '💫' },
  { id: 'shichibukai', label: 'Shichibukai', sousTitre: 'Redoutable tacticien', limitStrength: true,  elo: 2000, movetimeMs: 1000, emoji: '⚔️' },
  { id: 'amiral',      label: 'Amiral',      sousTitre: 'Quasi maître',         limitStrength: true,  elo: 2400, movetimeMs: 1200, emoji: '🦅' },
  { id: 'yonkou',      label: 'Yonkou',      sousTitre: 'Pleine puissance',     limitStrength: false, skillLevel: 20, movetimeMs: 1500, emoji: '👑' },
]

export const NIVEAU_IA_DEFAUT = 'pirate'

export function niveauParId(id) {
  return NIVEAUX_IA.find(n => n.id === id) || NIVEAUX_IA[1]
}
