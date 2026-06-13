// ── IA Dames — minimax + élagage alpha-bêta, pur JS ──────────────────────────
// Pensé pour tourner dans un Web Worker (cf. damesAIWorker.js) afin de ne pas
// bloquer l'UI aux profondeurs élevées. S'appuie sur le moteur vérifié.
import { getLegalMoves, applyMove, getOutcome, DEFAULT_RULESET } from './damesEngine.js'

const VAL = { man: 100, king: 360 }
const WIN = 1_000_000

/** Difficultés thématisées One Piece. */
export const DIFFICULTIES = {
  mousse:   { id: 'mousse',   label: '🪣 Mousse',          depth: 2, randomChance: 0.25 },
  pirate:   { id: 'pirate',   label: '☠️ Pirate',          depth: 4, randomChance: 0 },
  corsaire: { id: 'corsaire', label: '⚔️ Corsaire',        depth: 6, randomChance: 0 },
  roi:      { id: 'roi',      label: '👑 Roi des Pirates', depth: 8, randomChance: 0 },
}

const other = (c) => (c === 'red' ? 'black' : 'red')

/** Évaluation statique du point de vue de `color` (positif = favorable à color). */
export function evaluate(board, color, ruleset = DEFAULT_RULESET) {
  const size = ruleset.size
  const mid = (size - 1) / 2
  let score = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const p = board[r][c]
      if (!p) continue
      let v = VAL[p.type]
      if (p.type === 'man') {
        // avancement vers la promotion
        const adv = p.color === 'red' ? size - 1 - r : r
        v += adv * 4
        // défense de la rangée arrière (bloque les promotions adverses)
        if ((p.color === 'red' && r === size - 1) || (p.color === 'black' && r === 0)) v += 14
      }
      // contrôle du centre (colonnes ET rangées centrales)
      v += (mid - Math.abs(c - mid)) * 2 + (mid - Math.abs(r - mid)) * 1
      score += p.color === color ? v : -v
    }
  }
  return score
}

function minimax(board, rootColor, toMove, depth, alpha, beta, ruleset) {
  const outcome = getOutcome(board, toMove, ruleset)
  if (outcome !== null) {
    if (outcome === 'draw') return 0
    return outcome === rootColor ? WIN + depth : -WIN - depth // gagner vite > gagner tard
  }
  if (depth === 0) return evaluate(board, rootColor, ruleset)
  const moves = getLegalMoves(board, toMove, ruleset)
  if (toMove === rootColor) {
    let best = -Infinity
    for (const m of moves) {
      best = Math.max(best, minimax(applyMove(board, m), rootColor, other(toMove), depth - 1, alpha, beta, ruleset))
      alpha = Math.max(alpha, best)
      if (alpha >= beta) break
    }
    return best
  }
  let best = Infinity
  for (const m of moves) {
    best = Math.min(best, minimax(applyMove(board, m), rootColor, other(toMove), depth - 1, alpha, beta, ruleset))
    beta = Math.min(beta, best)
    if (alpha >= beta) break
  }
  return best
}

/**
 * Meilleur coup pour `color`. Renvoie un Move (ou null si aucun coup).
 * @param {object} [opts] { randomChance } — proba de jouer un coup au hasard (difficulté facile)
 */
export function getBestMove(board, color, depth = 4, ruleset = DEFAULT_RULESET, opts = {}) {
  const moves = getLegalMoves(board, color, ruleset)
  if (!moves.length) return null
  if (moves.length === 1) return moves[0]
  const rnd = opts.randomChance || 0
  if (rnd > 0 && Math.random() < rnd) return moves[Math.floor(Math.random() * moves.length)]

  let best = -Infinity
  let bestMoves = []
  for (const m of moves) {
    const v = minimax(applyMove(board, m), color, other(color), depth - 1, -Infinity, Infinity, ruleset)
    if (v > best) { best = v; bestMoves = [m] }
    else if (v === best) bestMoves.push(m)
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)] // départage aléatoire
}
