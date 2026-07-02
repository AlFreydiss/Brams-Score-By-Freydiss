// ── draughtsCoachContext : transforme une position de dames + le meilleur coup
// moteur en message FR compact pour le coach IA (mode `coach`, game 'dames' de
// /api/chat). Même philosophie que le coach échecs : on donne au LLM des faits
// VÉRIFIÉS (matériel, prises obligatoires, coup moteur en notation 1-50) pour
// qu'il explique sans inventer de coup. Lecture seule du moteur.
import {
  generateMoves, chooseAIMove, evaluate, DEFAULT_RULES, P, M,
} from '../../../features/dames/engine/draughts-engine.js'

const CAMP = { [P]: 'Foncés', [M]: 'Clairs' }

// Numéro international d'une case foncée (1-50 en 10×10), taille paramétrable.
const squareNo = (r, c, size = 10) => Math.floor((r * size + c) / 2) + 1

// Coup moteur → notation internationale ("34-29" déplacement, "28x19" prise).
export function notationCoupDames(mv, size = 10) {
  if (!mv || !mv.from || !mv.to) return ''
  const a = squareNo(mv.from[0], mv.from[1], size)
  const b = squareNo(mv.to[0], mv.to[1], size)
  return (mv.caps && mv.caps.length) ? `${a}x${b}` : `${a}-${b}`
}

// Meilleur coup calculé EN DIRECT par le moteur (recherche sync, profondeur
// modérée ~8 bornée dans le temps — même réglage que le bouton Indice moteur).
export function meilleurCoupDames(board, trait, rules = DEFAULT_RULES) {
  try { return chooseAIMove(board, trait, 8, 650, rules) } catch { return null }
}

// Matériel restant : pions / dames par camp.
function materielDames(board) {
  const m = { [P]: { pions: 0, dames: 0 }, [M]: { pions: 0, dames: 0 } }
  for (const row of board) for (const p of row) {
    if (p && m[p.side]) m[p.side][p.king ? 'dames' : 'pions']++
  }
  return m
}

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`

// Éval statique moteur (centipions, POV Foncés) → phrase courte et honnête.
function evalPhrase(board, rules) {
  try {
    const cp = evaluate(board, rules)
    const pions = cp / 100
    if (Math.abs(pions) < 0.6) return 'position à peu près équilibrée'
    const camp = pions > 0 ? CAMP[P] : CAMP[M]
    return `environ +${Math.abs(pions).toFixed(1)} pion(s) pour les ${camp}`
  } catch { return null }
}

// Construit le message texte envoyé au mode `coach` (game 'dames') de /api/chat.
// args : { board, trait:'P'|'M', dernierCoup, meilleurCoup, question, rules? }
//  - board       : board[r][c] = {side:'P'|'M', king}|null (format moteur)
//  - dernierCoup : coup moteur ({from,to,caps}) OU chaîne déjà notée, optionnel
//  - meilleurCoup: coup moteur (issu de meilleurCoupDames), optionnel
//  - question    : texte libre du joueur (chat), optionnel
export function construireMessageCoachDames({ board, trait, dernierCoup, meilleurCoup, question, rules = DEFAULT_RULES }) {
  const size = rules?.size || 10
  const m = materielDames(board)
  const matTxt = `${CAMP[P]} ${pluriel(m[P].pions, 'pion')} + ${pluriel(m[P].dames, 'dame')} · `
    + `${CAMP[M]} ${pluriel(m[M].pions, 'pion')} + ${pluriel(m[M].dames, 'dame')}`

  // Prises au trait : nombre de rafles, taille (rafle maximale) et cases de départ.
  let prisesTxt = 'Aucune prise disponible pour le camp au trait.'
  try {
    const moves = generateMoves(board, trait, rules)
    const prises = moves.filter(mv => mv.isCapture)
    if (prises.length) {
      const maxCaps = Math.max(...prises.map(mv => mv.caps.length))
      const cases = [...new Set(prises.map(mv => squareNo(mv.from[0], mv.from[1], size)))].sort((a, b) => a - b)
      prisesTxt = (rules?.priseObligatoire !== false ? 'PRISE OBLIGATOIRE : ' : 'Prises possibles (non obligatoires) : ')
        + `${pluriel(prises.length, 'rafle')} (${pluriel(maxCaps, 'pièce')} capturée${maxCaps > 1 ? 's' : ''} au maximum) `
        + `depuis ${cases.length > 1 ? 'les cases' : 'la case'} ${cases.join(', ')}.`
    }
  } catch { /* plateau exotique : on n'affirme rien */ }

  const meilleurTxt = meilleurCoup
    ? `${notationCoupDames(meilleurCoup, size)}${meilleurCoup.caps?.length ? ` (rafle de ${pluriel(meilleurCoup.caps.length, 'pièce')})` : ''}`
    : null
  const dernierTxt = typeof dernierCoup === 'string'
    ? dernierCoup
    : (dernierCoup ? notationCoupDames(dernierCoup, size) : null)
  const evalTxt = evalPhrase(board, rules)

  const lignes = [
    `Position de dames internationales (damier ${size}×${size}, cases foncées numérotées 1-${(size * size) / 2}).`,
    `Trait aux ${CAMP[trait] || 'Foncés'}.`,
    `Matériel : ${matTxt}.`,
    prisesTxt,
    evalTxt ? `Évaluation moteur : ${evalTxt}.` : null,
    meilleurTxt ? `Meilleur coup moteur : ${meilleurTxt}.` : null,
    dernierTxt ? `Dernier coup joué : ${dernierTxt}.` : null,
    question
      ? `Question du joueur : « ${String(question).slice(0, 300)} ». Réponds précisément à CETTE question, en t'appuyant sur la position et le coup moteur ci-dessus. Si on te demande quel coup jouer, recommande le meilleur coup moteur et explique brièvement pourquoi.`
      : (dernierTxt
        ? `Explique d'abord si ${dernierTxt} était un bon coup, puis conseille la suite.`
        : `Explique la position et conseille le meilleur plan.`),
  ].filter(Boolean)

  return lignes.join('\n')
}
