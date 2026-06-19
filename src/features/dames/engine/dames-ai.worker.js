// Worker IA : la recherche (negamax profond) tourne hors du thread principal →
// l'UI 3D reste fluide pendant que l'IA réfléchit. Le moteur est DOM-free donc
// importable tel quel ici.
import { aiMove, bestHint, analysePosition } from './draughts-engine.js'

self.onmessage = (e) => {
  const { id, type, board, side, diff, depth } = e.data || {}
  if (type === 'analyse') {
    // Barre d'éval : score statique + recherche peu profonde, POV blanc (centipions).
    try { const r = analysePosition(board, side, depth || 6, 500); self.postMessage({ id, eval: r }) }
    catch (err) { self.postMessage({ id, eval: null, error: String(err) }) }
    return
  }
  let mv = null
  try { mv = type === 'hint' ? bestHint(board, side) : aiMove(board, side, diff) }
  catch (err) { self.postMessage({ id, mv: null, error: String(err) }); return }
  self.postMessage({ id, mv })
}
