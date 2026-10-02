import { test } from 'node:test'
import assert from 'node:assert/strict'
import { takeLimitMs, deadlineAction, backoffMs, retryableError, inAppBrowser, openInBrowserHint, recordTimeoutDetail } from './recordFlow.js'

test('takeLimitMs : son + 3 s, borné', () => {
  assert.equal(takeLimitMs(2.5), 5500)
  assert.equal(takeLimitMs(null), 8000)
  assert.equal(takeLimitMs(30), 15000)
  assert.equal(takeLimitMs(0.2), 4000)
})

test('deadlineAction : coupe, annule ou envoie à l\'approche de la fin', () => {
  assert.equal(deadlineAction({ remaining: 20, rec: 'recording' }), null)
  assert.equal(deadlineAction({ remaining: 3.9, rec: 'recording' }), 'stop')
  assert.equal(deadlineAction({ remaining: 3, rec: 'countdown' }), 'cancel')
  assert.equal(deadlineAction({ remaining: 3, rec: 'idle', takeId: 2, sentId: 1 }), 'send')
  assert.equal(deadlineAction({ remaining: 3, rec: 'idle', takeId: 2, sentId: 2 }), null)
  assert.equal(deadlineAction({ remaining: 3, rec: 'idle', takeId: 2, sending: true }), null)
  assert.equal(deadlineAction({ remaining: 3, rec: 'idle', takeId: null }), null)
  assert.equal(deadlineAction({ remaining: 3, rec: 'processing', takeId: 2 }), null)
  assert.equal(deadlineAction({ remaining: null, rec: 'recording' }), null)
})

test('backoffMs : croissant', () => {
  assert.deepEqual([0, 1, 2].map(backoffMs), [0, 400, 1200])
})

test('retryableError : le réseau oui, les refus serveur non', () => {
  assert.equal(retryableError('timeout'), true)
  assert.equal(retryableError('phase'), false)
  assert.equal(retryableError('too_big'), false)
})

test('inAppBrowser : repère les navigateurs intégrés', () => {
  assert.equal(inAppBrowser('Mozilla/5.0 (iPhone) Instagram 300.0'), true)
  assert.equal(inAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Version/18.0 Mobile Safari/604.1'), false)
})

test("openInBrowserHint : consigne selon l'appareil", () => {
  assert.match(openInBrowserHint('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Discord/240'), /Safari/)
  assert.match(openInBrowserHint('Mozilla/5.0 (Linux; Android 14) Discord/240'), /Chrome/)
  assert.match(openInBrowserHint('Mozilla/5.0 (Windows NT 10.0) Discord/240'), /navigateur/)
  assert.match(openInBrowserHint(''), /navigateur/)
})

test('recordTimeoutDetail : vérité serveur, pas de faux positif', () => {
  const me = { user_id: 'u1', lives: 2 }
  const base = { me, took: [], sentLocal: false, hadTake: false, canRecord: true, dev: false }
  assert.equal(recordTimeoutDetail(base), 'no_take')
  assert.equal(recordTimeoutDetail({ ...base, hadTake: true }), 'not_sent')
  // imitation reçue par le serveur (ex. envoyée avant un rechargement)
  assert.equal(recordTimeoutDetail({ ...base, took: ['u1'] }), null)
  assert.equal(recordTimeoutDetail({ ...base, sentLocal: true }), null)
  // navigateur sans micro, spectateur, éliminé, dev : rien
  assert.equal(recordTimeoutDetail({ ...base, canRecord: false }), null)
  assert.equal(recordTimeoutDetail({ ...base, me: null }), null)
  assert.equal(recordTimeoutDetail({ ...base, me: { user_id: 'u1', lives: 0 } }), null)
  assert.equal(recordTimeoutDetail({ ...base, dev: true }), null)
})
