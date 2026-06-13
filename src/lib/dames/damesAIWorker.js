// Web Worker IA dames — calcule le meilleur coup hors du thread principal,
// pour ne pas geler l'UI aux profondeurs élevées (Corsaire/Roi des Pirates).
// Instancié via : new Worker(new URL('./damesAIWorker.js', import.meta.url), { type: 'module' })
import { getBestMove } from './damesAI.js'

// Garde : `self` n'existe qu'en contexte Worker (pas en Node, ex. tests) → pas de crash à l'import.
if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = (e) => {
    const { board, color, depth, ruleset, randomChance } = e.data || {}
    try {
      const move = getBestMove(board, color, depth, ruleset, { randomChance })
      self.postMessage({ ok: true, move })
    } catch (err) {
      self.postMessage({ ok: false, error: String(err && err.message ? err.message : err) })
    }
  }
}
