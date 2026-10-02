import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeLogger } from './guessWhoLogCore.js'

test('logEvent : envoie code, joueur, type, détail, appareil', async () => {
  const calls = []
  const log = makeLogger(async (fn, args) => { calls.push([fn, args]); return { ok: true } }, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Version/17.5 Safari/604.1')
  await log('abcd', 'u1', 'mic_error', 'mic_busy')
  assert.deepEqual(calls, [['guesswho_log', { p_code: 'abcd', p_user: 'u1', p_kind: 'mic_error', p_detail: 'mic_busy', p_device: 'iPhone · Safari 17' }]])
})

test('logEvent : RPC qui échoue ou lève → silencieux', async () => {
  const log = makeLogger(async () => { throw new Error('réseau') }, '')
  await assert.doesNotReject(log('ABCD', null, 'offline', '12s'))
  const log2 = makeLogger(async () => ({ ok: false, error: 'function guesswho_log does not exist' }), '')
  await assert.doesNotReject(log2('ABCD', null, 'offline', '12s'))
})
