// ── analyzeGame.js : analyse post-partie (coûteuse, à la demande UNIQUEMENT) ──
// Rejoue la partie coup par coup et, pour chaque position, demande à Stockfish
// une éval courte (movetime). Le delta d'éval (du point de vue du camp qui vient
// de jouer) sert à classer chaque coup : excellent (!), imprécision (?), gaffe (??).
//
// On RÉUTILISE le worker d'analyse existant via `analyser(fen, { movetime })`
// du hook useStockfish (pas de 2e worker créé). On l'appelle en boucle séquentielle.
//
// Précision % : formule lichess-like dérivée de la perte moyenne de centipions.
// On convertit chaque éval en "win%" (sigmoïde), on mesure la chute de win% causée
// par chaque coup, et on agrège en une précision par camp.
import { Chess } from 'chess.js'

// Centipions (côté du camp au trait) → probabilité de gain 0..100 (sigmoïde lichess).
// Référence lichess : winPct = 50 + 50 * (2/(1+exp(-0.00368208*cp)) - 1).
function cpVersWin(cp) {
  if (cp == null) return 50
  const c = Math.max(-1000, Math.min(1000, cp))
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1)
}

// Normalise un résultat brut analyser() (score vu du camp au trait) → cp côté BLANC.
function cpCoteBlanc(res, traitAuTrait) {
  if (!res) return null
  if (res.mate != null) {
    // mat converti en très gros score (signe selon camp gagnant), borné.
    const v = res.mate > 0 ? 1000 : -1000
    return traitAuTrait === 'w' ? v : -v
  }
  if (res.scoreCp == null) return null
  return traitAuTrait === 'w' ? res.scoreCp : -res.scoreCp
}

// Seuils de classement (en perte de win% causée par le coup, point de vue du joueur).
const SEUIL = {
  blunder: 18,    // perte ≥ 18% de win → ?? (gaffe)
  imprecision: 9, // perte ≥ 9%  → ? (imprécision)
  excellent: 1.5, // perte ≤ 1.5% → ! (coup quasi parfait)
}

// Précision lichess-like depuis la perte moyenne de win% (0..100, plus haut = mieux).
// accuracy = 103.1668 * exp(-0.04354 * avgLossWin) - 3.1669, bornée [0,100].
function precisionDepuisPerte(avgLossWin) {
  const a = 103.1668 * Math.exp(-0.04354 * avgLossWin) - 3.1669
  return Math.max(0, Math.min(100, Math.round(a)))
}

// analyzeGame(historique, analyser, { movetime, onProgress, signal })
//   historique : moves verbeux chess.js ({ san, color, ... }) ou SAN strings.
//   analyser   : fonction du hook useStockfish (fen, { movetime }) → Promise<res>.
//   movetime   : ms par position (défaut 220 — compromis vitesse/qualité).
//   onProgress : (fait, total) => void — pour la barre de chargement.
//   signal     : { annule: boolean } — coupe la boucle si l'utilisateur ferme.
// → { coups: [...], blancs: {...}, noirs: {...} }
export async function analyzeGame(historique, analyser, opts = {}) {
  const { movetime = 220, onProgress, signal } = opts
  if (typeof analyser !== 'function') throw new Error('analyser requis')

  const sans = (historique || []).map(m => (typeof m === 'string' ? m : m?.san)).filter(Boolean)
  const total = sans.length
  const chess = new Chess()

  // Évals à chaque ply : evalAvant[i] = éval (cp côté blanc) AVANT le coup i.
  // On évalue la position initiale puis après chaque coup → total+1 évals.
  const evalsBlanc = []      // longueur total+1
  const traitParPosition = [] // 'w'/'b' au trait à chaque position évaluée

  // Position de départ
  {
    const trait = chess.turn()
    const res = await analyser(chess.fen(), { movetime })
    if (signal?.annule) return null
    evalsBlanc.push(cpCoteBlanc(res, trait))
    traitParPosition.push(trait)
    onProgress?.(0, total)
  }

  const coups = []
  for (let i = 0; i < total; i++) {
    let mv
    try { mv = chess.move(sans[i]) } catch { mv = null }
    if (!mv) break
    const trait = chess.turn() // camp au trait APRÈS le coup
    const res = await analyser(chess.fen(), { movetime })
    if (signal?.annule) return null
    const cpBlanc = cpCoteBlanc(res, trait)
    evalsBlanc.push(cpBlanc)
    traitParPosition.push(trait)

    // Perte de win% du POINT DE VUE du joueur qui vient de jouer (mv.color).
    const avant = evalsBlanc[i]      // avant son coup
    const apres = cpBlanc            // après son coup
    const joueur = mv.color          // 'w' | 'b'
    // win% du joueur avant/après (on convertit le cp côté blanc vers son camp)
    const winAvant = cpVersWin(joueur === 'w' ? avant : -avant)
    const winApres = cpVersWin(joueur === 'w' ? apres : -apres)
    const perte = Math.max(0, winAvant - winApres) // chute de SA proba de gain

    let glyphe = ''
    if (perte >= SEUIL.blunder) glyphe = '??'
    else if (perte >= SEUIL.imprecision) glyphe = '?'
    else if (perte <= SEUIL.excellent) glyphe = '!'

    coups.push({
      ply: i,
      san: mv.san,
      color: joueur,
      perte,                          // perte de win% (≥0)
      cpApres: apres,                 // éval (côté blanc) après le coup
      glyphe,                         // '' | '!' | '?' | '??'
    })
    onProgress?.(i + 1, total)
  }

  // Agrégats par camp
  const agg = (camp) => {
    const list = coups.filter(c => c.color === camp)
    const n = list.length
    const pertes = list.map(c => c.perte)
    const avgLoss = n ? pertes.reduce((s, p) => s + p, 0) / n : 0
    return {
      precision: n ? precisionDepuisPerte(avgLoss) : 100,
      coups: n,
      blunders: list.filter(c => c.glyphe === '??').length,
      imprecisions: list.filter(c => c.glyphe === '?').length,
      excellents: list.filter(c => c.glyphe === '!').length,
      perteMoyenne: Math.round(avgLoss * 10) / 10,
    }
  }

  return {
    coups,
    blancs: agg('w'),
    noirs: agg('b'),
  }
}

export default analyzeGame
