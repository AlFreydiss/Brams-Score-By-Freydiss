// ─────────────────────────────────────────────────────────────────────────────
// analysePartie.js — Analyse post-partie pour les ÉCHECS, pilotée par Stockfish.
// Pendant exact de dames/lib/analyse.js : MÊMES seuils, MÊME courbe de précision,
// MÊMES noms de classes — pour que les deux jeux « notent » de façon cohérente.
//
// Convention de score : centipions, du POINT DE VUE BLANC positif (comme lichess).
//   Stockfish renvoie le score DU CAMP AU TRAIT → on normalise vers blanc via
//   normaliserVersBlanc() (echecs/lib/analyse.js).
//
// Pour CHAQUE demi-coup (ply), `positions[i] = { fenBefore, move, trait }` :
//   • analyse fenBefore                → evalAvant (POV blanc) + bestMove (uci)
//   • analyse fenAfter (coup joué)     → evalApres (POV blanc)
//   • perte = (meilleur dispo) − (obtenu), DU POINT DE VUE DU CAMP AU TRAIT, ≥ 0.
//     On approxime « meilleur dispo » par −evalApres-du-meilleur si on connaît
//     l'éval du bestMove ; sinon on borne par evalAvant (le moteur ne perd jamais
//     de tempo à se conseiller lui-même). Pour rester à UNE seule passe par coup
//     (analyse lente : ~depth 14 séquentiel), on prend evalAvant comme référence
//     du « meilleur atteignable au trait » : la perte = combien le coup joué a
//     dégradé l'éval par rapport à la position de départ, du POV du camp au trait.
//
// Le bestMove de Stockfish sert à : (a) la flèche or sur le plateau de l'analyse,
// (b) détecter qu'un coup EST le meilleur (perte ≈ 0 + brillance éventuelle).
//
// Lent par nature → conçu pour STREAMER : onProgress(record) à chaque ply,
// honore un AbortSignal. Pilote `analyser` SÉQUENTIELLEMENT (await chaque appel).
// ─────────────────────────────────────────────────────────────────────────────
import { normaliserVersBlanc, formaterEval, uciVersCoup, evalVersRatio } from './analyse.js'

// ── Profondeur d'analyse par position (compromis vitesse / qualité) ──
// depth 14 ≈ qualité « club » solide ; séquentiel sur ~40-80 plies reste tenable
// car ça streame. L'appelant peut surcharger via { depth }.
export const ANALYSE_DEPTH = 14

const MATE = 100000

// ── SEUILS de classification (centipions de perte du camp au trait) ──────────
// COPIÉS de dames/lib/analyse.js pour ne PAS tirer le moteur draughts dans le
// bundle échecs. Un test (analysePartie.test.js) garde-fou contre toute dérive.
//   Excellent : perte ≤ 15      Bon : ≤ 50      Imprécision ?! : ≤ 120
//   Erreur ?  : ≤ 300           Gaffe ?? : > 300
export const SEUILS = { excellent: 15, bon: 50, imprecision: 120, erreur: 300 }

// Brillance : le coup joué EST le meilleur, il est tactique (capture / échec /
// promotion) ET il apporte un gain net d'éval d'au moins ~1 pion (POV au trait).
const BRILLANT_GAIN = 120

export const CLASSES = {
  brillant:    { id: 'brillant',    label: 'Brillant',    icon: '✨', symbole: '!!', color: '#37c8c3' },
  excellent:   { id: 'excellent',   label: 'Excellent',   icon: '◎',  symbole: '!',  color: '#6fcf7c' },
  bon:         { id: 'bon',         label: 'Bon',         icon: '✓',  symbole: '',   color: '#9fb8a6' },
  imprecision: { id: 'imprecision', label: 'Imprécision', icon: '?!', symbole: '?!', color: '#e7c46a' },
  erreur:      { id: 'erreur',      label: 'Erreur',      icon: '?',  symbole: '?',  color: '#e8965a' },
  gaffe:       { id: 'gaffe',       label: 'Gaffe',       icon: '??', symbole: '??', color: '#d9594d' },
}

// Borne un score de mat à ±MATE pour les comparaisons / le graphe.
function clampScore(s) {
  if (s == null || Number.isNaN(s)) return 0
  if (s > MATE) return MATE
  if (s < -MATE) return -MATE
  return s
}

// éval POV blanc (cp) → POV du camp `trait` ('w' garde le signe, 'b' l'inverse).
const versPOV = (whiteCp, trait) => (trait === 'w' ? whiteCp : -whiteCp)

// Un résultat Stockfish { scoreCp, mate } (POV au trait) → cp POV blanc unifié.
// Le mat est converti en gros score signé pour rester comparable aux cp.
function cpBlanc(resultat, trait) {
  if (!resultat) return 0
  const { cp, mate } = normaliserVersBlanc(resultat, trait)
  if (mate != null) return mate > 0 ? MATE : -MATE
  return clampScore(cp ?? 0)
}

// Classifie un ply depuis la perte (camp au trait) + contexte de brillance.
// MÊME logique que dames/classifierPly.
export function classifierPly(perte, { estMeilleur = false, gainBest = 0, tactique = false } = {}) {
  const p = Math.max(0, perte)
  if (estMeilleur && tactique && gainBest >= BRILLANT_GAIN) return CLASSES.brillant
  if (p <= SEUILS.excellent) return CLASSES.excellent
  if (p <= SEUILS.bon) return CLASSES.bon
  if (p <= SEUILS.imprecision) return CLASSES.imprecision
  if (p <= SEUILS.erreur) return CLASSES.erreur
  return CLASSES.gaffe
}

// ── Précision (accuracy) depuis l'ACPL (centipions) ──────────────────────────
// MÊME courbe que dames : 103.17·exp(-0.04354·(ACPL/100·10)) − 3.17, clampée [0,100].
// 0 cp → ~100% ; ~50 cp → ~83% ; ~100 cp → ~67% ; ~300 cp → ~28%.
export function precisionDepuisACPL(acpl) {
  if (acpl == null) return 100
  const v = 103.1668 * Math.exp(-0.04354 * (acpl / 100) * 10) - 3.1669
  return Math.max(0, Math.min(100, v))
}

// Un coup est-il « tactique » ? (capture, en passant, échec, promotion)
function estTactique(move) {
  if (!move) return false
  if (move.captured) return true
  if (move.promotion) return true
  if (move.flags && (move.flags.includes('e') || move.flags.includes('c'))) return true
  // san avec « + » (échec) ou « # » (mat) → tactique
  if (move.san && /[+#]/.test(move.san)) return true
  return false
}

function makeAgg() { return { plies: 0, totalLoss: 0, gaffes: 0, erreurs: 0, imprecisions: 0, brillants: 0 } }

// Récapitulatif final (précision par camp + tournants) depuis les records émis.
// camps : 'w' | 'b'.
export function resumerAnalyse(records) {
  const agg = { w: makeAgg(), b: makeAgg() }
  for (const rec of records) {
    const a = agg[rec.trait]; if (!a) continue
    a.plies++; a.totalLoss += rec.perte
    if (rec.classe.id === 'gaffe') a.gaffes++
    else if (rec.classe.id === 'erreur') a.erreurs++
    else if (rec.classe.id === 'imprecision') a.imprecisions++
    else if (rec.classe.id === 'brillant') a.brillants++
  }
  const camp = (s) => {
    const a = agg[s]
    const acpl = a.plies ? a.totalLoss / a.plies : 0
    return { ...a, acpl: Math.round(acpl), precision: Math.round(precisionDepuisACPL(acpl) * 10) / 10 }
  }
  // tournants : plies où l'éval (POV blanc) a basculé d'au moins ~2 pions sur une
  // erreur/gaffe — les vrais moments décisifs de la partie.
  const tournants = []
  for (const rec of records) {
    if (Math.abs(rec.delta) >= 200 && (rec.classe.id === 'gaffe' || rec.classe.id === 'erreur'))
      tournants.push({ ply: rec.ply, trait: rec.trait, delta: rec.delta, san: rec.san })
  }
  tournants.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  return { w: camp('w'), b: camp('b'), tournants: tournants.slice(0, 4) }
}

// Laisse respirer le thread principal entre deux plies (UI 60fps).
const souffle = () => new Promise((r) => setTimeout(r, 0))

// ─────────────────────────────────────────────────────────────────────────────
// Cœur : pilote `analyser` séquentiellement sur la liste de positions.
//   positions = [{ fenBefore, move /* verbose chess.js */, trait /* 'w'|'b' */ }]
//   opts = { analyser, depth=14, signal, onProgress }
//     analyser(fen, { depth }) → Promise<{ scoreCp, mate, bestMove, pv }>  (POV trait)
//
// Renvoie { records, resume }. Chaque record streamé via onProgress(rec, n, total) :
//   record = {
//     ply, trait, san, move,
//     fenBefore, fenAfter,   // fenAfter renseigné par l'appelant si dispo, sinon null
//     evalAvant,             // POV blanc (cp), avant le coup
//     evalApres,             // POV blanc (cp), après le coup joué
//     delta,                 // evalApres − evalAvant (POV blanc) — pour le graphe
//     bestUci, bestCoup,     // meilleur coup du moteur (uci + {from,to,promotion})
//     estMeilleur,           // le coup joué == bestMove ?
//     perte,                 // centipions perdus par le camp au trait (≥ 0)
//     classe,                // un objet de CLASSES
//     evalTexte,             // « +1.4 » etc. (POV blanc, après le coup)
//   }
// ─────────────────────────────────────────────────────────────────────────────
export async function analyserPartieEchecs(positions, { analyser, depth = ANALYSE_DEPTH, signal, onProgress } = {}) {
  const records = []
  if (typeof analyser !== 'function') return { records, resume: resumerAnalyse(records) }

  // 2 analyses par ply (fenBefore pour eval+bestMove, fenAfter pour le résultat),
  // toutes séquentielles : le worker `analyser` ne traite qu'une position à la fois.

  for (let i = 0; i < positions.length; i++) {
    if (signal?.aborted) break
    const { fenBefore, fenAfter = null, move, trait } = positions[i]

    // éval AVANT le coup + meilleur coup du moteur (flèche or sur le plateau).
    const r = await analyser(fenBefore, { depth })
    if (signal?.aborted) break
    const evalAvant = cpBlanc(r, trait)
    const bestUci = r?.bestMove || null

    // éval APRÈS le coup joué (position de l'adversaire au trait).
    const traitApres = trait === 'w' ? 'b' : 'w'
    let evalApres
    if (fenAfter) {
      const ra = await analyser(fenAfter, { depth })
      if (signal?.aborted) break
      evalApres = cpBlanc(ra, traitApres)
    } else {
      // pas de fenAfter fourni → on retombe sur evalAvant (delta 0). En pratique
      // l'appelant fournit TOUJOURS fenAfter (cf. EchecsAnalyse).
      evalApres = evalAvant
    }

    // perte (POV camp au trait) = ce qu'il avait (evalAvant) − ce qu'il a obtenu
    // (evalApres), tout deux ramenés à son camp. Un coup optimal ne dégrade pas
    // l'éval → perte ≈ 0. Bornée ≥ 0 (le moteur ne « gagne » pas contre lui-même).
    const avantPOV = versPOV(evalAvant, trait)
    const apresPOV = versPOV(evalApres, trait)
    const perte = Math.max(0, Math.round(avantPOV - apresPOV))

    const bestCoup = uciVersCoup(bestUci)
    // coup joué en uci pour comparer au bestMove (promotion incluse)
    const joueUci = move ? `${move.from}${move.to}${move.promotion || ''}` : null
    const estMeilleur = !!(bestUci && joueUci && bestUci === joueUci)
    const tactique = estTactique(move)
    // gainBest : de combien la position s'est AMÉLIORÉE pour le camp au trait quand
    // il a joué le meilleur coup (≈ apresPOV − avantPOV, positif si bon sacrifice).
    const gainBest = Math.round(apresPOV - avantPOV)
    const classe = classifierPly(perte, { estMeilleur, gainBest, tactique })

    const rec = {
      ply: i,
      trait,
      san: move?.san || joueUci || '',
      move: move || null,
      fenBefore,
      fenAfter,
      evalAvant,
      evalApres,
      delta: Math.round(evalApres - evalAvant),
      bestUci: bestUci || null,
      bestCoup,
      estMeilleur,
      perte,
      classe,
      evalTexte: formaterEval(normaliserVersBlanc(
        { scoreCp: versPOV(evalApres, traitApres), mate: null }, traitApres,
      )),
    }
    records.push(rec)
    onProgress?.(rec, records.length, positions.length)
    await souffle()
  }

  return { records, resume: resumerAnalyse(records) }
}

// Petit helper exposé pour l'UI : ratio d'avantage blanc 0..1 depuis un cp blanc.
export function ratioDepuisCpBlanc(cp) {
  return evalVersRatio({ cp, mate: null })
}
