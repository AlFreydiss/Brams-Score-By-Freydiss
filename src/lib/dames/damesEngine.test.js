// Tests moteur dames — runner natif Node (node --test), zéro dépendance.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  RULESETS, getInitialBoard, getLegalMoves, applyMove, getOutcome,
  emptyBoard, materialCount,
} from './damesEngine.js'

const R = RULESETS.international
const place = (b, r, c, color, type = 'man') => { b[r][c] = { color, type } }
const maxCaps = (moves) => moves.reduce((m, x) => Math.max(m, x.captures.length), 0)

test('plateau initial : 20 pions chacun, aucune dame', () => {
  const b = getInitialBoard(R)
  const m = materialCount(b)
  assert.equal(m.red.man, 20)
  assert.equal(m.black.man, 20)
  assert.equal(m.red.king + m.black.king, 0)
})

test('capture simple AVANT (pion red monte)', () => {
  const b = emptyBoard(10)
  place(b, 5, 4, 'red'); place(b, 4, 3, 'black')
  const moves = getLegalMoves(b, 'red', R)
  assert.equal(moves.length, 1)
  assert.equal(moves[0].captures.length, 1)
  assert.deepEqual(moves[0].to, [3, 2])
  assert.deepEqual(moves[0].captures[0], [4, 3])
})

test('capture ARRIÈRE autorisée en internationales, interdite si flag off', () => {
  const b = emptyBoard(10)
  place(b, 5, 4, 'red'); place(b, 6, 3, 'black') // ennemi DERRIÈRE le pion red
  const intl = getLegalMoves(b, 'red', R)
  assert.ok(intl.some((m) => m.captures.length === 1 && m.to[0] === 7 && m.to[1] === 2))
  // Même position, règle sans capture arrière → aucune capture (juste déplacements simples)
  const noBack = getLegalMoves(b, 'red', { ...R, menCaptureBackward: false })
  assert.ok(noBack.every((m) => m.captures.length === 0))
})

test('rafle multiple (double capture enchaînée)', () => {
  const b = emptyBoard(10)
  place(b, 8, 5, 'red'); place(b, 7, 4, 'black'); place(b, 5, 2, 'black')
  const moves = getLegalMoves(b, 'red', R)
  assert.equal(maxCaps(moves), 2)
  assert.ok(moves.every((m) => m.captures.length === 2))
  assert.deepEqual(moves[0].to, [4, 1])
})

test('rafle MAXIMALE obligatoire : seule la plus longue est légale', () => {
  const b = emptyBoard(10)
  // Pion A : double capture (2)
  place(b, 8, 5, 'red'); place(b, 7, 4, 'black'); place(b, 5, 2, 'black')
  // Pion B : capture simple (1) ailleurs
  place(b, 5, 8, 'red'); place(b, 4, 7, 'black')
  const moves = getLegalMoves(b, 'red', R)
  assert.ok(moves.length >= 1)
  assert.ok(moves.every((m) => m.captures.length === 2)) // le 1-capture est éliminé
})

test('pièce déjà sautée non franchissable (rafle en carré = 4, pas de boucle infinie)', () => {
  const b = emptyBoard(10)
  place(b, 3, 4, 'red')
  place(b, 4, 3, 'black'); place(b, 6, 3, 'black'); place(b, 6, 5, 'black'); place(b, 4, 5, 'black')
  const moves = getLegalMoves(b, 'red', R)
  assert.equal(maxCaps(moves), 4) // capture les 4, revient au départ, s'arrête (pas 5+, pas d'∞)
})

test('dame volante : capture à distance + plusieurs cases d\'arrêt', () => {
  const b = emptyBoard(10)
  place(b, 7, 0, 'red', 'king'); place(b, 4, 3, 'black')
  const moves = getLegalMoves(b, 'red', R)
  assert.ok(moves.length >= 2)                              // plusieurs arrivées possibles
  assert.ok(moves.every((m) => m.captures.length === 1 && m.captures[0][0] === 4 && m.captures[0][1] === 3))
  const tos = new Set(moves.map((m) => m.to.join(',')))
  assert.ok(tos.has('3,4') && tos.has('2,5'))              // s'arrête où elle veut au-delà
})

test('rafle de dame : choix d\'arrêt qui permet d\'enchaîner (max forcé)', () => {
  const b = emptyBoard(10)
  place(b, 9, 0, 'red', 'king')
  place(b, 6, 3, 'black') // 1re prise sur la diagonale montante
  place(b, 2, 3, 'black') // 2e prise atteignable seulement en s'arrêtant en (4,5)
  const moves = getLegalMoves(b, 'red', R)
  assert.equal(maxCaps(moves), 2)
  assert.ok(moves.every((m) => m.captures.length === 2))
})

test('promotion à l\'ARRÊT sur la dernière rangée (déplacement simple)', () => {
  const b = emptyBoard(10)
  place(b, 1, 2, 'red')
  const moves = getLegalMoves(b, 'red', R)
  assert.ok(moves.some((m) => m.to[0] === 0 && m.promotion === true))
})

test('PAS de promotion si on ne fait que TRAVERSER la dernière rangée', () => {
  const b = emptyBoard(10)
  place(b, 2, 5, 'red')
  place(b, 1, 4, 'black') // saut vers (0,3) = rangée 0
  place(b, 1, 2, 'black') // puis re-saut vers (2,1) = on quitte la rangée 0
  const moves = getLegalMoves(b, 'red', R)
  assert.equal(maxCaps(moves), 2)
  const m = moves.find((x) => x.captures.length === 2)
  assert.deepEqual(m.to, [2, 1])
  assert.equal(m.promotion, false) // a traversé la rangée 0 sans s'y arrêter → pas dame
})

test('applyMove : immuable, retire les capturés, promeut', () => {
  const b = emptyBoard(10)
  place(b, 1, 2, 'red')
  const move = getLegalMoves(b, 'red', R).find((m) => m.to[0] === 0)
  const nb = applyMove(b, move)
  assert.equal(b[1][2].type, 'man')          // plateau d'origine intact
  assert.equal(nb[1][2], null)
  assert.equal(nb[move.to[0]][move.to[1]].type, 'king')
})

test('joueur BLOQUÉ = défaite', () => {
  const b = emptyBoard(10)
  place(b, 0, 1, 'red')   // pion red rangée 0 : aucun déplacement avant, aucune capture
  place(b, 5, 4, 'black') // black a des coups (sinon "plus de pièces")
  assert.equal(getLegalMoves(b, 'red', R).length, 0)
  assert.equal(getOutcome(b, 'red', R), 'black')
})

test('plus de pièces = défaite', () => {
  const b = emptyBoard(10)
  place(b, 5, 4, 'black')
  assert.equal(getOutcome(b, 'red', R), 'black') // red n'a aucune pièce
  const b2 = emptyBoard(10)
  place(b2, 5, 4, 'red')
  assert.equal(getOutcome(b2, 'black', R), 'red')
})

test('partie en cours → null', () => {
  const b = getInitialBoard(R)
  assert.equal(getOutcome(b, 'red', R), null)
})
