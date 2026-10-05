import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHARACTERS } from './data.js'
import { newGame, answer, reject, decide, QUESTIONS } from './engine.js'

const BY_ID = Object.fromEntries(QUESTIONS.map(q => [q.id, q]))

// Petit générateur déterministe : les parties simulées sont reproductibles.
function rng(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 }
}

// Joue une partie contre un joueur qui pense à `target`. `noise` = part des
// réponses données à l'envers (le joueur se trompe ou n'est pas d'accord avec
// la base).
function play(target, { noise = 0, seed = 1 } = {}) {
  const r = rng(seed)
  let s = newGame()
  let questions = 0, guesses = 0
  for (let turn = 0; turn < 60; turn++) {
    const d = decide(s, r)
    if (d.action === 'giveup') return { found: false, questions, guesses }
    if (d.action === 'guess') {
      guesses++
      if (d.char.id === target.id) return { found: true, questions, guesses }
      if (guesses >= 4) return { found: false, questions, guesses }
      s = reject(s, d.char.id)
      continue
    }
    questions++
    const v = BY_ID[d.question.id].value(target)
    let a = v >= 0.75 ? 'yes' : v <= 0.25 ? 'no' : (r() < 0.5 ? 'prob' : 'dunno')
    if (noise && r() < noise) a = a === 'yes' ? 'no' : a === 'no' ? 'yes' : a
    s = answer(s, d.question.id, a)
  }
  return { found: false, questions, guesses }
}

function summary(noise) {
  let found = 0, firstTry = 0, q = 0
  const misses = []
  CHARACTERS.forEach((c, i) => {
    const res = play(c, { noise, seed: 7 + i })
    if (res.found) { found++; q += res.questions; if (res.guesses === 1) firstTry++ }
    else misses.push(c.name)
  })
  return { found, firstTry, avgQ: q / Math.max(1, found), misses, total: CHARACTERS.length }
}

test('noms uniques dans la base', () => {
  const seen = new Set()
  for (const c of CHARACTERS) {
    assert.ok(!seen.has(c.name), 'doublon : ' + c.name)
    seen.add(c.name)
  }
})

test('joueur parfait : trouve tout le monde, vite', () => {
  const s = summary(0)
  console.log('parfait', s)
  assert.ok(s.found / s.total >= 0.97, 'trouvés ' + s.found + '/' + s.total + ' ratés : ' + s.misses.join(', '))
  assert.ok(s.avgQ <= 20, 'moyenne ' + s.avgQ.toFixed(1) + ' questions')
})

test('joueur qui se trompe 10 % du temps : le génie retombe sur ses pieds', () => {
  const s = summary(0.1)
  console.log('bruit 10 %', s)
  assert.ok(s.found / s.total >= 0.8, 'trouvés ' + s.found + '/' + s.total)
})
