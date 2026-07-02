// ─────────────────────────────────────────────────────────────────────────────
// tutorialPositions — constructeurs de positions pour le DIDACTICIEL Dames.
// Ne touche NI au moteur NI au format board online : produit seulement des plateaux
// 10×10 au format attendu par le moteur (board[r][c] = {side:'P'|'M',king}|null),
// que generateMoves / applyMove savent lire tels quels. Lecture seule du moteur.
// ─────────────────────────────────────────────────────────────────────────────
import { P, M } from '../../../features/dames/engine/draughts-engine.js'

const SIZE = 10

// Plateau 10×10 vide (toutes cases null).
export function emptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
}

// Place une pièce. `kind` : 'p'=pion foncé(P) · 'P'=dame foncée · 'c'=pion clair(M) · 'C'=dame claire.
const KIND = {
  p: { side: P, king: false }, P: { side: P, king: true },
  c: { side: M, king: false }, C: { side: M, king: true },
}

// Construit un plateau 10×10 à partir d'une liste de placements [r, c, kind].
export function makeBoard(pieces = []) {
  const b = emptyBoard()
  for (const [r, c, kind] of pieces) {
    const def = KIND[kind]
    if (def && r >= 0 && r < SIZE && c >= 0 && c < SIZE) b[r][c] = { ...def }
  }
  return b
}

// Numéro international (1–50) d'une case foncée → utile pour les consignes.
export const squareNo = (r, c) => Math.floor((r * SIZE + c) / 2) + 1
