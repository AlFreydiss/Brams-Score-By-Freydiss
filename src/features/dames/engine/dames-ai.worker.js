// Worker IA : la recherche (negamax profond) tourne hors du thread principal →
// l'UI 3D reste fluide pendant que l'IA réfléchit. Le moteur est DOM-free donc
// importable tel quel ici.
import { aiMove, bestHint, analysePosition } from './draughts-engine.js'

self.onmessage = (e) => {
  // `rules` (optionnel) = variante active ({size, priseObligatoire, priseMaximale,
  // dameVolante}). Absent → défaut 10×10 internationales (back-compat). On le passe
  // au moteur pour que l'IA obéisse à la variante choisie au drawer.
  const { id, type, board, side, diff, depth, rules } = e.data || {}
  if (type === 'analyse') {
    // Barre d'éval : score statique + recherche peu profonde, POV blanc (centipions).
    try { const r = analysePosition(board, side, depth || 6, 500, rules); self.postMessage({ id, eval: r }) }
    catch (err) { self.postMessage({ id, eval: null, error: String(err) }) }
    return
  }
  let mv = null
  try { mv = type === 'hint' ? bestHint(board, side, rules) : aiMove(board, side, diff, rules) }
  catch (err) { self.postMessage({ id, mv: null, error: String(err) }); return }
  self.postMessage({ id, mv })
}
