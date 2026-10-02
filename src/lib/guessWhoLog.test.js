import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeLogger } from './guessWhoLogCore.js'

const tokens = { ABCD: 'tok-abcd' }

test('logEvent : envoie code, jeton du salon, type, détail, appareil', async () => {
  const calls = []
  const log = makeLogger(async (fn, args) => { calls.push([fn, args]); return { ok: true } },
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Version/17.5 Safari/604.1', (c) => tokens[c] ?? null)
  await log('ABCD', 'mic_error', 'mic_busy')
  assert.deepEqual(calls, [['guesswho_log', { p_code: 'ABCD', p_token: 'tok-abcd', p_kind: 'mic_error', p_detail: 'mic_busy', p_device: 'iPhone · Safari 17' }]])
})

test('logEvent : sans jeton (spectateur, salon inconnu) → rien envoyé', async () => {
  const calls = []
  const log = makeLogger(async (fn, args) => { calls.push(args); return { ok: true } }, '', () => null)
  await log('WXYZ', 'offline', '12s')
  assert.equal(calls.length, 0)
})

test('logEvent : RPC qui échoue ou lève → silencieux', async () => {
  const log = makeLogger(async () => { throw new Error('réseau') }, '', () => 'tok')
  await assert.doesNotReject(log('ABCD', 'offline', '12s'))
  const log2 = makeLogger(async () => ({ ok: false, error: 'function guesswho_log does not exist' }), '', () => 'tok')
  await assert.doesNotReject(log2('ABCD', 'offline', '12s'))
})
