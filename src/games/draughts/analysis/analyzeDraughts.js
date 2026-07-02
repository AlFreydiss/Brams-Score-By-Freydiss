// ── analyzeDraughts.js : bilan de partie Dames (coûteux, à la demande) ────────
// Rejoue le journal moteur `mvLog` (initBoard + applyMove) et évalue chaque
// position via la recherche du moteur (analysePosition, negamax borné temps).
// Le delta d'éval du POINT DE VUE du camp qui joue classe chaque coup :
// excellent (= meilleur coup moteur / forcé) · bon · imprécision · gaffe.
//
// Échelle moteur : centipions POV Foncés (P positif) — 1 pion = 100, dame = 340,
// mat = ±100000 (clampé à ±1000 ici, comme l'analyse Échecs). Les seuils sont
// donc exprimés en centipions : perdre ~1,5 pion net = gaffe.
//
// ASYNC par chunks (await tick tous les 2 plies) → l'UI ne gèle jamais ;
// onProgress(pct 0..100) alimente la barre de progression du panneau.
// Lecture seule du moteur — aucun état de partie touché.
import {
  initBoard, applyMove, generateMoves, analysePosition, chooseAIMove,
  movesEqual, opp, P,
} from '../../../features/dames/engine/draughts-engine.js'
import { notationCoupDames } from '../coach/draughtsCoachContext.js'

// Seuils de verdict (perte d'éval en centipions, POV du joueur qui vient de jouer).
//   ≤ excellent → 'excellent' (le coup préserve l'éval : quasi meilleur coup)
//   < bon       → 'bon'
//   < gaffe     → 'imprecision' (≈ perdre plus de ⅔ de pion)
//   ≥ gaffe     → 'gaffe'       (≈ perdre 1,5 pion net — pièce pendue et suites)
export const SEUILS_CP = { excellent: 30, bon: 70, gaffe: 140 }

// Clamp des scores extrêmes (mat = ±100000 moteur) pour le graphe et les deltas.
const CLAMP_CP = 1000
const clampCp = (v) => Math.max(-CLAMP_CP, Math.min(CLAMP_CP, v | 0))

// Cède la main au navigateur (macrotask) → React peut peindre entre deux chunks.
const tick = () => new Promise((r) => setTimeout(r, 0))

function verdictDepuisPerte(perte) {
  if (perte <= SEUILS_CP.excellent) return 'excellent'
  if (perte < SEUILS_CP.bon) return 'bon'
  if (perte < SEUILS_CP.gaffe) return 'imprecision'
  return 'gaffe'
}

// analyserPartie(mvLog, rules, { profondeur, budgetMs, onProgress, signal })
//   mvLog      : journal des coups moteur ({from,to,path,caps,isCapture}) dans l'ordre.
//   rules      : règles moteur de la partie (rulesFromVariante) — mêmes que la revue.
//   profondeur : profondeur de recherche par position (défaut 5 — rapide/fiable).
//   budgetMs   : plafond temps par recherche (défaut 150 ms ; la TT finit bien avant).
//   onProgress : (pct 0..100) => void.
//   signal     : { annule: boolean } — coupe la boucle (démontage du panneau).
// → Promise<{ plies, compteurs, tournant } | null (annulé)>
//   plies[i] = { ply, side, mv, notation, evalAvant, evalApres, perte, verdict }
//   (evalAvant/evalApres en centipions POV Foncés, clampés ±1000)
export async function analyserPartie(mvLog, rules, opts = {}) {
  const { profondeur = 5, budgetMs = 150, onProgress, signal } = opts
  const log = Array.isArray(mvLog) ? mvLog : []
  const total = log.length
  const size = rules?.size || 10

  // Laisse React peindre l'état « analyse en cours » avant la 1re recherche sync.
  await tick()
  if (signal?.annule) return null

  let board = initBoard(rules)
  let trait = P   // les Foncés commencent (corrigé par le plateau si journal exotique)
  // Éval de la position courante (avant le prochain coup), POV Foncés.
  let evalCourante = clampCp(analysePosition(board, trait, profondeur, budgetMs, rules).score)
  onProgress?.(0)

  const plies = []
  for (let i = 0; i < total; i++) {
    const mv = log[i]
    if (!mv || !mv.from || !mv.to) break
    const piece = board[mv.from[0]]?.[mv.from[1]]
    const mover = piece ? piece.side : trait

    // Coup forcé (rafle maximale unique…) : aucun mérite ni reproche possible.
    const legaux = generateMoves(board, mover, rules)
    const force = legaux.length <= 1

    const apresBoard = applyMove(board, mv, rules).board
    const evalApres = clampCp(analysePosition(apresBoard, opp(mover), profondeur, budgetMs, rules).score)

    // Chute d'éval subie par le joueur qui vient de jouer (négatif = il a gagné
    // de l'éval → perte 0). evalCourante est une valeur minimax = valeur du
    // MEILLEUR jeu depuis la position → la perte mesure bien l'écart au meilleur coup.
    const pov = mover === P ? 1 : -1
    const perte = Math.max(0, pov * (evalCourante - evalApres))

    let verdict
    if (force) verdict = 'excellent'
    else {
      verdict = verdictDepuisPerte(perte)
      if (verdict !== 'excellent') {
        // Bruit de profondeur : si le coup joué EST le meilleur coup moteur,
        // la chute d'éval était inévitable → 'excellent' quand même.
        let best = null
        try { best = chooseAIMove(board, mover, profondeur, budgetMs, rules) } catch { /* moteur : on garde le verdict par perte */ }
        if (best && movesEqual(best, mv)) verdict = 'excellent'
      }
    }

    plies.push({
      ply: i, side: mover, mv,
      notation: notationCoupDames(mv, size),
      evalAvant: evalCourante, evalApres,
      perte: Math.round(perte), verdict,
    })

    board = apresBoard
    trait = opp(mover)
    evalCourante = evalApres
    onProgress?.(Math.round(((i + 1) / total) * 100))

    // Chunk : cède la main tous les 2 plies (2 à 4 recherches sync max entre deux ticks).
    if (i % 2 === 1) {
      await tick()
      if (signal?.annule) return null
    }
  }

  const compteurs = { gaffes: 0, imprecisions: 0, bons: 0, excellents: 0 }
  for (const p of plies) {
    if (p.verdict === 'gaffe') compteurs.gaffes++
    else if (p.verdict === 'imprecision') compteurs.imprecisions++
    else if (p.verdict === 'bon') compteurs.bons++
    else compteurs.excellents++
  }

  // Tournant = le coup le plus coûteux de la partie (au moins une imprécision).
  let tournant = null
  for (const p of plies) {
    if (p.perte < SEUILS_CP.bon) continue
    if (!tournant || p.perte > tournant.perte) tournant = p
  }

  onProgress?.(100)
  return { plies, compteurs, tournant }
}

export default analyserPartie
