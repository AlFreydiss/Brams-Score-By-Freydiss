// Worker IA : la recherche (negamax profond) tourne hors du thread principal →
// l'UI 3D reste fluide pendant que l'IA réfléchit. Le moteur est DOM-free donc
// importable tel quel ici.
import { aiMove, bestHint } from './draughts-engine.js'

self.onmessage = (e) => {
  const { id, type, board, side, diff } = e.data || {}
  let mv = null
  try { mv = type === 'hint' ? bestHint(board, side) : aiMove(board, side, diff) }
  catch (err) { self.postMessage({ id, mv: null, error: String(err) }); return }
  self.postMessage({ id, mv })
}
