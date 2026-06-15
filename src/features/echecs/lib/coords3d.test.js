import { test } from 'node:test'
import assert from 'node:assert/strict'
import { squareVers3D, piecesDepuisFen } from './coords3d.js'

test('squareVers3D centre le plateau (white)', () => {
  assert.deepEqual(squareVers3D('e4', 'white'), [0.5, 0, 0.5])
  assert.deepEqual(squareVers3D('a1', 'white'), [-3.5, 0, 3.5])
  assert.deepEqual(squareVers3D('h8', 'white'), [3.5, 0, -3.5])
})

test('squareVers3D inverse pour black', () => {
  assert.deepEqual(squareVers3D('a1', 'black'), [3.5, 0, -3.5])
})

test('piecesDepuisFen position de départ = 32 pièces', () => {
  const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  const ps = piecesDepuisFen(start)
  assert.equal(ps.length, 32)
  assert.ok(ps.some(p => p.square === 'e1' && p.type === 'k' && p.couleur === 'w'))
  assert.ok(ps.some(p => p.square === 'e8' && p.type === 'k' && p.couleur === 'b'))
  assert.ok(ps.some(p => p.square === 'a2' && p.type === 'p' && p.couleur === 'w'))
})
