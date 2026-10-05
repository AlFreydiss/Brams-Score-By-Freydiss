// Moteur du génie, façon Akinator : aucune IA, aucun réseau.
//
// Chaque personnage porte un poids (sa probabilité d'être celui auquel le
// joueur pense). Chaque réponse multiplie ce poids par la vraisemblance de la
// réponse sachant le trait du personnage — mise à jour bayésienne. Une réponse
// contraire ne met jamais un poids à zéro : le joueur peut se tromper, la base
// aussi, et le bon personnage doit pouvoir remonter.
//
// La question suivante est celle dont la réponse est la plus incertaine au vu
// des poids actuels (entropie maximale) : c'est elle qui, en moyenne, divise
// le plus les candidats. On devine dès qu'un personnage domine nettement.

import { CHARACTERS, SERIES, TRAITS, HAIR } from './data.js'

export const ANSWERS = ['yes', 'prob', 'dunno', 'probnot', 'no']

// P(réponse | le personnage n'a pas le trait), P(réponse | il l'a)
const LIKELIHOOD = {
  yes:     [0.05, 0.9],
  prob:    [0.22, 0.6],
  dunno:   [1, 1],
  probnot: [0.6, 0.22],
  no:      [0.9, 0.05],
}

// Toutes les questions possibles, chacune avec la fonction qui donne, pour un
// personnage, la probabilité que la vraie réponse soit « oui ».
export const QUESTIONS = (() => {
  const qs = []
  qs.push({ id: 'g:m', text: 'Votre personnage est-il un homme ?', value: c => (c.g === 'm' ? 1 : 0) })
  qs.push({ id: 'era', text: 'Sa série a-t-elle commencé avant 2005 ?', value: c => (SERIES[c.s].year < 2005 ? 1 : 0) })
  for (const [k, s] of Object.entries(SERIES)) {
    qs.push({ id: 's:' + k, text: `Votre personnage vient-il de ${s.name} ?`, value: c => (c.s === k ? 1 : 0), series: k })
  }
  for (const [k, text] of Object.entries(HAIR)) {
    qs.push({
      id: 'h:' + k, text,
      // Deux couleurs (Todoroki, Rengoku) : chacune est vraie « en partie ».
      value: c => (c.hair.includes(k) ? (c.hair.length > 1 ? 0.75 : 1) : 0),
    })
  }
  for (const [k, text] of Object.entries(TRAITS)) {
    qs.push({ id: 't:' + k, text, value: c => c.t[k] || 0 })
  }
  return qs
})()

const BY_ID = Object.fromEntries(QUESTIONS.map(q => [q.id, q]))

function lik(answer, v) {
  const [l0, l1] = LIKELIHOOD[answer] || LIKELIHOOD.dunno
  return (1 - v) * l0 + v * l1
}

function h2(p) {
  if (p <= 0 || p >= 1) return 0
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p))
}

export function newGame(chars = CHARACTERS) {
  return {
    chars,
    weights: chars.map(() => 1 / chars.length),
    asked: [],          // [{ id, answer }]
    rejected: new Set(),
  }
}

function normalize(w) {
  const sum = w.reduce((a, b) => a + b, 0)
  return sum > 0 ? w.map(x => x / sum) : w.map(() => 1 / w.length)
}

export function answer(state, qid, ans) {
  const q = BY_ID[qid]
  const weights = normalize(state.weights.map((w, i) => w * lik(ans, q.value(state.chars[i]))))
  return { ...state, weights, asked: [...state.asked, { id: qid, answer: ans }] }
}

export function reject(state, charId) {
  const rejected = new Set(state.rejected)
  rejected.add(charId)
  const weights = normalize(state.weights.map((w, i) => (state.chars[i].id === charId ? 0 : w)))
  return { ...state, weights, rejected }
}

export function ranking(state, n = 5) {
  return state.weights
    .map((w, i) => ({ c: state.chars[i], w }))
    .filter(x => !state.rejected.has(x.c.id))
    .sort((a, b) => b.w - a.w)
    .slice(0, n)
}

// Meilleure question : entropie de la réponse attendue. Un léger tirage parmi
// les quasi-ex-aequo évite que deux parties commencent toujours pareil.
export function nextQuestion(state, rand = Math.random) {
  const asked = new Set(state.asked.map(a => a.id))
  // Une série confirmée rend inutiles les questions sur les autres séries.
  const yesSeries = state.asked.find(a => a.id.startsWith('s:') && a.answer === 'yes')
  const scored = []
  for (const q of QUESTIONS) {
    if (asked.has(q.id)) continue
    if (yesSeries && q.series) continue
    let p = 0
    for (let i = 0; i < state.chars.length; i++) {
      const w = state.weights[i]
      if (w > 1e-6) p += w * q.value(state.chars[i])
    }
    const score = h2(p)
    if (score > 0.02) scored.push({ q, score })
  }
  if (!scored.length) return null
  scored.sort((a, b) => b.score - a.score)
  const best = scored[0].score
  const pool = scored.filter(x => x.score >= best * 0.96).slice(0, 3)
  return pool[Math.floor(rand() * pool.length)].q
}

// Faut-il deviner maintenant ? Le seuil baisse à mesure que les questions
// s'accumulent : au bout d'un moment, un bon favori vaut mieux qu'une
// question de plus.
export function shouldGuess(state) {
  const [top, second] = ranking(state, 2)
  if (!top) return false
  const n = state.asked.length
  if (top.w >= 0.82) return true
  if (n >= 12 && top.w >= 0.6 && top.w > 3 * (second?.w || 0)) return true
  if (n >= 20 && top.w >= 0.4) return true
  return n >= 28
}

export function questionText(qid) {
  return BY_ID[qid]?.text || ''
}

// Un coup complet : soit une question, soit une proposition.
export function decide(state, rand) {
  const top = ranking(state, 1)[0]
  if (!top) return { action: 'giveup' }
  const q = shouldGuess(state) ? null : nextQuestion(state, rand)
  if (!q) return { action: 'guess', char: top.c, confidence: top.w }
  return { action: 'question', question: q, confidence: top.w }
}
