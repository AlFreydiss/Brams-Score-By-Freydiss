// ─────────────────────────────────────────────────────────────────────────────
// analyse.js — Analyse post-partie pour les Dames internationales (10×10).
// Pendant chess (echecs/lib/analyse.js), adapté au moteur draughts (negamax local).
//
// Convention de score : centipions, du POINT DE VUE BLANC = Pirates (P) positif.
//   1 pion ≈ 100 cp. C'est exactement ce que renvoie analysePosition() du moteur.
//
// Pour CHAQUE demi-coup (ply) on calcule :
//   • evalAvant   : éval de la position avant le coup (POV blanc)
//   • bestMv      : le meilleur coup du moteur dans cette position (chooseAIMove)
//   • evalBest    : éval après avoir joué bestMv     (POV blanc)
//   • evalJoue    : éval après le coup réellement joué (POV blanc)
//   • perte       : perte en centipions DU CAMP AU TRAIT (>= 0). 0 = coup parfait.
//   • classe      : classification du coup (voir SEUILS ci-dessous).
//
// La perte est mesurée du point de vue du joueur qui bouge : on compare ce qu'il
// pouvait obtenir au mieux (evalBest, ramené à son camp) vs ce qu'il a obtenu
// (evalJoue, ramené à son camp). Un coup ne peut jamais "gagner" du score par
// rapport au meilleur coup → perte bornée à >= 0.
//
// CPU-lourd → conçu pour streamer : `analyserPartie` est un async generator qui
// `yield` un record par ply (l'UI peint au fil de l'eau, sans freeze), et accepte
// un AbortSignal pour l'annulation. Un wrapper callback `analyserPartieCb` est
// fourni pour les appelants qui préfèrent onProgress.
// ─────────────────────────────────────────────────────────────────────────────
import { P, M, opp, applyMove, chooseAIMove, analysePosition, movesEqual } from '../engine/draughts-engine.js'

// ── Profondeur / budget d'analyse (plus fort que l'IA "amiral" = depth 9) ──
export const ANALYSE_DEPTH = 9
export const ANALYSE_BUDGET_MS = 600

const MATE = 100000

// ── SEUILS de classification (en centipions de perte du camp au trait) ──
// Rappel : 1 pion ≈ 100 cp. Les dames sont plus "tranchantes" que les échecs
// (une prise ratée coûte un pion entier), d'où des paliers un peu plus larges.
//   Brillant   : le coup est le meilleur ET sacrifie / trouve une rafle non triviale
//                (perte ≈ 0 mais gain net d'au moins ~1 pion sur l'éval avant).
//   Excellent  : perte ≤ 15  (≈ coup du moteur, à un cheveu près)
//   Bon        : perte ≤ 50
//   Imprécision: perte ≤ 120 (un peu plus d'un pion lâché) ............... ?!
//   Erreur     : perte ≤ 300 (jusqu'à ~3 pions) ......................... ?
//   Gaffe      : perte >  300 (catastrophe, souvent une pièce / la partie) ??
export const SEUILS = { excellent: 15, bon: 50, imprecision: 120, erreur: 300 }

// seuil de "brillance" : gain net d'éval (POV camp au trait) apporté par le meilleur
// coup quand celui-ci a été trouvé — un retournement d'au moins ~1 pion.
const BRILLANT_GAIN = 120

export const CLASSES = {
  brillant:    { id: 'brillant',    label: 'Brillant',   icon: '✨', symbole: '!!', color: '#37c8c3' },
  excellent:   { id: 'excellent',   label: 'Excellent',  icon: '◎',  symbole: '!',  color: '#6fcf7c' },
  bon:         { id: 'bon',         label: 'Bon',        icon: '✓',  symbole: '',   color: '#9fb8a6' },
  imprecision: { id: 'imprecision', label: 'Imprécision', icon: '?!', symbole: '?!', color: '#e7c46a' },
  erreur:      { id: 'erreur',      label: 'Erreur',     icon: '?',  symbole: '?',  color: '#e8965a' },
  gaffe:       { id: 'gaffe',       label: 'Gaffe',      icon: '??', symbole: '??', color: '#d9594d' },
}

// Borne un score de mat à ±MATE pour les comparaisons.
function clampScore(s) {
  if (s == null || Number.isNaN(s)) return 0
  if (s > MATE) return MATE
  if (s < -MATE) return -MATE
  return s
}

// éval POV blanc → POV du camp `side` (P garde le signe, M l'inverse).
const versPOV = (whiteScore, side) => (side === P ? whiteScore : -whiteScore)

// Classifie un ply à partir de la perte (camp au trait) + contexte de brillance.
// gainBest = de combien le meilleur coup améliore l'éval (POV camp au trait) ;
// estSacrifice = le coup joué (== meilleur) est une capture / un saut tactique.
export function classifierPly(perte, { estMeilleur = false, gainBest = 0, tactique = false } = {}) {
  const p = Math.max(0, perte)
  if (estMeilleur && tactique && gainBest >= BRILLANT_GAIN) return CLASSES.brillant
  if (p <= SEUILS.excellent) return CLASSES.excellent
  if (p <= SEUILS.bon) return CLASSES.bon
  if (p <= SEUILS.imprecision) return CLASSES.imprecision
  if (p <= SEUILS.erreur) return CLASSES.erreur
  return CLASSES.gaffe
}

// ── Précision (accuracy) à partir de la perte moyenne en centipions (ACPL) ──
// Courbe façon lichess : précision = 103.16 * exp(-0.04354 * (ACPL/100·100)) - 3.17,
// bornée [0,100]. On la nourrit en "centipions" (ACPL déjà en cp).
// 0 cp → ~100% ; ~50 cp → ~83% ; ~100 cp → ~67% ; ~300 cp → ~28%.
export function precisionDepuisACPL(acpl) {
  if (acpl == null) return 100
  const v = 103.1668 * Math.exp(-0.04354 * (acpl / 100) * 10) - 3.1669
  return Math.max(0, Math.min(100, v))
}

// Construit un record vide d'accumulation par camp.
function makeAgg() { return { plies: 0, totalLoss: 0, gaffes: 0, erreurs: 0, imprecisions: 0, brillants: 0 } }

// Récapitulatif final à partir des records de ply déjà émis.
export function resumerAnalyse(records) {
  const agg = { [P]: makeAgg(), [M]: makeAgg() }
  for (const rec of records) {
    const a = agg[rec.side]; if (!a) continue
    a.plies++; a.totalLoss += rec.perte
    if (rec.classe.id === 'gaffe') a.gaffes++
    else if (rec.classe.id === 'erreur') a.erreurs++
    else if (rec.classe.id === 'imprecision') a.imprecisions++
    else if (rec.classe.id === 'brillant') a.brillants++
  }
  const side = (s) => {
    const a = agg[s]
    const acpl = a.plies ? a.totalLoss / a.plies : 0
    return { ...a, acpl: Math.round(acpl), precision: Math.round(precisionDepuisACPL(acpl) * 10) / 10 }
  }
  // tournants : plies où l'éval (POV blanc) a basculé d'au moins ~2 pions.
  const tournants = []
  for (const rec of records) {
    if (Math.abs(rec.delta) >= 200 && (rec.classe.id === 'gaffe' || rec.classe.id === 'erreur'))
      tournants.push({ ply: rec.ply, side: rec.side, delta: rec.delta, mv: rec.mv })
  }
  tournants.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  return { P: side(P), M: side(M), tournants: tournants.slice(0, 4) }
}

// Passe `rules` au moteur seulement si la signature l'accepte (>=4 args utiles).
// Aujourd'hui le moteur ignore `rules` (international 10×10 par défaut) — on
// threade quand même la valeur pour le jour où chooseAIMove/analysePosition la prennent.
function callAnalyse(board, side, rules) {
  // analysePosition(board, side, depth, budgetMs[, rules])
  return analysePosition(board, side, ANALYSE_DEPTH, ANALYSE_BUDGET_MS, rules)
}
function callBest(board, side, rules) {
  // chooseAIMove(board, side, maxDepth, budgetMs[, rules])
  return chooseAIMove(board, side, ANALYSE_DEPTH, ANALYSE_BUDGET_MS, rules)
}

// Laisse respirer le thread principal entre deux plies (UI 60fps).
const souffle = () => new Promise(r => setTimeout(r, 0))

// ── Cœur : async generator. `positions` = [{ board, side, mv }] où board est la
// position AVANT que `side` ne joue `mv`. Yield un record par ply.
//   record = {
//     ply, side, mv,
//     evalAvant,        // POV blanc, avant le coup
//     evalApres,        // POV blanc, après le coup joué
//     delta,            // evalApres - evalAvant (POV blanc) — pour le graphe
//     best,             // meilleur coup du moteur (mv-like) | null
//     evalBest,         // POV blanc, après le meilleur coup
//     perte,            // centipions perdus par le camp au trait (>= 0)
//     classe,           // un objet de CLASSES
//   }
export async function* analyserPartieGen(positions, { rules, signal } = {}) {
  for (let i = 0; i < positions.length; i++) {
    if (signal?.aborted) return
    const { board, side, mv } = positions[i]

    const avant = callAnalyse(board, side, rules)
    const evalAvant = clampScore(avant.score)

    // meilleur coup du moteur dans cette position
    const best = callBest(board, side, rules)
    const boardBest = best ? applyMove(board, best).board : null
    const evalBest = boardBest != null
      ? clampScore(callAnalyse(boardBest, opp(side), rules).score)
      : evalAvant

    // position après le coup réellement joué
    const boardJoue = applyMove(board, mv).board
    const evalApres = clampScore(callAnalyse(boardJoue, opp(side), rules).score)

    // perte = (meilleur résultat possible) − (résultat obtenu), POV du camp au trait
    const bestPOV = versPOV(evalBest, side)
    const jouePOV = versPOV(evalApres, side)
    const perte = Math.max(0, Math.round(bestPOV - jouePOV))

    // contexte de brillance : le coup joué est-il le meilleur, et tactique (rafle) ?
    const estMeilleur = best ? movesEqual(mv, best) : false
    const tactique = !!(mv.caps && mv.caps.length)
    const gainBest = Math.round(bestPOV - versPOV(evalAvant, side))   // ce que le meilleur coup rapporte
    const classe = classifierPly(perte, { estMeilleur, gainBest, tactique })

    yield {
      ply: i,
      side, mv,
      evalAvant,
      evalApres,
      delta: Math.round(evalApres - evalAvant),
      best: best || null,
      evalBest,
      perte,
      classe,
    }
    await souffle()
  }
}

// Wrapper callback : appelle onProgress(record, index, total) au fil de l'eau,
// renvoie { records, resume } à la fin. Annulable via signal.
export async function analyserPartie(positions, { rules, signal, onProgress } = {}) {
  const records = []
  for await (const rec of analyserPartieGen(positions, { rules, signal })) {
    records.push(rec)
    onProgress?.(rec, records.length, positions.length)
  }
  return { records, resume: resumerAnalyse(records) }
}

// alias explicite
export const analyserPartieCb = analyserPartie
