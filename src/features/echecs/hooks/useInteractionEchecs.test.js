import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deciderClic } from './useInteractionEchecs.js'

// partie factice minimale
const partieFactice = (trait, legaux) => ({
  trait,
  coupsLegaux: (sq) => legaux[sq] || [],
})

test('clic sur sa pièce → sélection', () => {
  const p = partieFactice('w', { e2: [{ from: 'e2', to: 'e4' }] })
  const r = deciderClic({ square: 'e2', pieceCouleur: 'w', selection: null, partie: p, peutJouer: () => true })
  assert.deepEqual(r, { type: 'select', square: 'e2' })
})

test('clic sur case légale depuis sélection → coup', () => {
  const p = partieFactice('w', { e2: [{ from: 'e2', to: 'e4' }] })
  const r = deciderClic({ square: 'e4', pieceCouleur: null, selection: 'e2', partie: p, peutJouer: () => true })
  assert.deepEqual(r, { type: 'move', from: 'e2', to: 'e4' })
})

test('clic ailleurs → désélection', () => {
  const p = partieFactice('w', { e2: [{ from: 'e2', to: 'e4' }] })
  const r = deciderClic({ square: 'h7', pieceCouleur: 'b', selection: 'e2', partie: p, peutJouer: () => true })
  assert.deepEqual(r, { type: 'deselect' })
})

test('clic sur pièce adverse sans sélection → rien', () => {
  const p = partieFactice('w', {})
  const r = deciderClic({ square: 'e7', pieceCouleur: 'b', selection: null, partie: p, peutJouer: () => true })
  assert.deepEqual(r, { type: 'deselect' })
})
