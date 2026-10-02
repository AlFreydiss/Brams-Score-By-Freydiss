import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startErrorText } from './startError.js'

test('pas d\'erreur → null', () => {
  assert.equal(startErrorText({ ok: true }), null)
  assert.equal(startErrorText(null), null)
})

test('codes connus → message clair', () => {
  assert.match(startErrorText({ error: 'not_enough_players' }), /3 joueurs/)
  assert.match(startErrorText({ error: 'unauthorized' }), /hôte/)
})

test('erreur inconnue → texte brut gardé (diagnostic)', () => {
  assert.match(startErrorText({ error: 'column "settings" does not exist' }), /settings/)
})
