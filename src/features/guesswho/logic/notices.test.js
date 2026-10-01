import { test } from 'node:test'
import assert from 'node:assert/strict'
import { takeNotice } from './notices.js'

test('takeNotice : imitation arrivée après la fin du chrono → message durable', () => {
  assert.match(takeNotice({ error: 'phase' }), /Trop tard/)
})

test('takeNotice : succès ou autre erreur → pas de message de salon', () => {
  assert.equal(takeNotice({ ok: true }), null)
  assert.equal(takeNotice({ error: 'bad_url' }), null)
  assert.equal(takeNotice(null), null)
})
