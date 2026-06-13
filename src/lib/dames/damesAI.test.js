// Tests IA dames — runner natif Node.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getInitialBoard, getLegalMoves, applyMove, materialCount, emptyBoard, RULESETS } from './damesEngine.js'
import { getBestMove, evaluate } from './damesAI.js'

const R = RULESETS.international
const place = (b, r, c, color, type = 'man') => { b[r][c] = { color, type } }
const inLegal = (m, list) => list.some((x) => x.from[0] === m.from[0] && x.from[1] === m.from[1] && x.to[0] === m.to[0] && x.to[1] === m.to[1])

test('IA renvoie un coup LÉGAL sur le plateau de départ', () => {
  const b = getInitialBoard(R)
  const m = getBestMove(b, 'red', 2, R)
  assert.ok(m, 'un coup est renvoyé')
  assert.ok(inLegal(m, getLegalMoves(b, 'red', R)))
})

test('IA prend le coup GAGNANT (capture la dernière pièce adverse)', () => {
  const b = emptyBoard(10)
  place(b, 5, 4, 'red'); place(b, 4, 3, 'black') // seule pièce noire
  const m = getBestMove(b, 'red', 3, R)
  assert.equal(m.captures.length, 1)
  const after = applyMove(b, m)
  assert.equal(materialCount(after).black.man + materialCount(after).black.king, 0) // black éliminé → red gagne
})

test('IA ne propose jamais un coup illégal (random inclus)', () => {
  const b = getInitialBoard(R)
  const legal = getLegalMoves(b, 'red', R)
  for (let i = 0; i < 20; i++) {
    const m = getBestMove(b, 'red', 2, R, { randomChance: 1 }) // 100% aléatoire
    assert.ok(inLegal(m, legal))
  }
})

test('evaluate favorise plus de matériel', () => {
  const rich = emptyBoard(10); place(rich, 5, 4, 'red'); place(rich, 6, 5, 'red')
  const poor = emptyBoard(10); place(poor, 5, 4, 'red')
  assert.ok(evaluate(rich, 'red', R) > evaluate(poor, 'red', R))
  // du point de vue adverse, la position "rich" est défavorable
  assert.ok(evaluate(rich, 'black', R) < 0)
})
