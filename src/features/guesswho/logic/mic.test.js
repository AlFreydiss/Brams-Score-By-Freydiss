import { test } from 'node:test'
import assert from 'node:assert/strict'
import { micConstraints, levelOf, micLabel } from './mic.js'

test('micConstraints : micro choisi en exact, sinon micro par défaut', () => {
  assert.deepEqual(micConstraints('abc').deviceId, { exact: 'abc' })
  assert.equal(micConstraints(null).deviceId, undefined)
  assert.equal(micConstraints('').deviceId, undefined)
  assert.equal(micConstraints('abc').echoCancellation, true)
})

test('levelOf : 0 pour du silence, proche de 1 pour un signal fort', () => {
  assert.equal(levelOf(new Uint8Array(64).fill(128)), 0)
  const loud = new Uint8Array(64).map((_, i) => (i % 2 ? 255 : 0))
  assert.ok(levelOf(loud) > 0.9)
})

test('micLabel : nom lisible même sans libellé', () => {
  assert.equal(micLabel({ label: 'Micro (Realtek)' }, 0), 'Micro (Realtek)')
  assert.equal(micLabel({ label: '' }, 1), 'Micro 2')
})
