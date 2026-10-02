import { test } from 'node:test'
import assert from 'node:assert/strict'
import { remainingSec, shouldAdvance, isDone, votableTakes, phaseTotal, advanceRetryMs, clockSample, addSample, bestOffset, backoffMs, pollMs, isNetworkError, isMissingFunction } from './clock.js'

test('remainingSec', () => {
  assert.equal(remainingSec(null, 0), null)
  assert.equal(remainingSec(new Date(10_000).toISOString(), 4_000), 6)
  assert.equal(remainingSec(new Date(10_000).toISOString(), 12_000), 0)
})

test('shouldAdvance : hôte à échéance ou si tout le monde a fini ; autres après +6 s', () => {
  assert.equal(shouldAdvance({ endsAtMs: 10_000, nowMs: 9_000, isHost: true, done: false }), false)
  assert.equal(shouldAdvance({ endsAtMs: 10_000, nowMs: 9_000, isHost: true, done: true }), true)
  assert.equal(shouldAdvance({ endsAtMs: 10_000, nowMs: 10_000, isHost: true, done: false }), true)
  assert.equal(shouldAdvance({ endsAtMs: 10_000, nowMs: 15_000, isHost: false, done: true }), false)
  assert.equal(shouldAdvance({ endsAtMs: 10_000, nowMs: 16_000, isHost: false, done: false }), true)
  assert.equal(shouldAdvance({ endsAtMs: null, nowMs: 99_000, isHost: true, done: true }), false)
})

test('isDone : seulement les joueurs connectés assis', () => {
  const players = [
    { user_id: 'a', seat: 0, lives: 2, connected: true },
    { user_id: 'b', seat: 1, lives: 2, connected: true },
    { user_id: 'c', seat: 2, lives: 2, connected: false },
    { user_id: 'x', seat: null, lives: 2, connected: true },
  ]
  assert.equal(isDone('record', players, { took: ['a', 'b'], voted: [], gaged: [] }), true)
  assert.equal(isDone('record', players, { took: ['a'], voted: [], gaged: [] }), false)
  assert.equal(isDone('vote', players, { took: [], voted: ['a', 'b'], gaged: [] }), true)
  assert.equal(isDone('gages', players, { took: [], voted: [], gaged: ['a'] }), false)
  assert.equal(isDone('listen', players, { took: ['a', 'b'], voted: [], gaged: [] }), false)
})

test('votableTakes : jamais soi, revote limité aux ex aequo', () => {
  const takes = [{ user_id: 'a' }, { user_id: 'b' }, { user_id: 'c' }]
  assert.deepEqual(votableTakes(takes, { me: 'a', phase: 'vote', tied: [] }).map((t) => t.user_id), ['b', 'c'])
  assert.deepEqual(votableTakes(takes, { me: 'c', phase: 'revote', tied: ['a', 'c'] }).map((t) => t.user_id), ['a'])
})

test('isDone : ignore une progression restée sur la phase précédente (vote → revote)', () => {
  const players = [{ user_id: 'a', seat: 0, lives: 2, connected: true }, { user_id: 'b', seat: 1, lives: 2, connected: true }]
  assert.equal(isDone('revote', players, { phase: 'vote', voted: ['a', 'b'] }), false)
  assert.equal(isDone('revote', players, { phase: 'revote', voted: ['a', 'b'] }), true)
})

test('phaseTotal : durée serveur, sinon recalcul avec la vitesse', () => {
  assert.equal(phaseTotal(null), null)
  assert.equal(phaseTotal({ phase: 'vote', phase_secs: 68 }), 68)
  assert.equal(phaseTotal({ phase: 'vote', settings: { speed: 'fast' } }), 27)
  assert.equal(phaseTotal({ phase: 'vote', settings: { speed: 'slow' } }), 68)
  assert.equal(phaseTotal({ phase: 'gages', settings: { speed: 'fast' } }), 45)
  assert.equal(phaseTotal({ phase: 'end' }), null)
})

test('advanceRetryMs : attend ce que dit le serveur, borné', () => {
  assert.equal(advanceRetryMs({ ok: false, reason: 'too_early', wait_ms: 200 }), 500)
  assert.equal(advanceRetryMs({ ok: false, reason: 'too_early', wait_ms: 1200 }), 1200)
  assert.equal(advanceRetryMs({ ok: false, reason: 'too_early', wait_ms: 60_000 }), 3000)
  assert.equal(advanceRetryMs({ ok: false, error: 'timeout' }), 2000)
  assert.equal(advanceRetryMs({ ok: true }), 1500)
})

test('horloge : décalage pris sur le plus court aller-retour', () => {
  const s1 = clockSample(1000, 3000, new Date(7000).toISOString()) // rtt 2000, offset 5000
  const s2 = clockSample(5000, 5100, new Date(10_100).toISOString()) // rtt 100, offset 5050
  assert.deepEqual(s1, { offset: 5000, rtt: 2000 })
  assert.equal(clockSample(0, 10, 'pas une date'), null)
  assert.equal(clockSample(10, 0, new Date(0).toISOString()), null)
  let samples = addSample([], s1)
  samples = addSample(samples, null)
  samples = addSample(samples, s2)
  assert.equal(samples.length, 2)
  assert.equal(bestOffset(samples), 5050)
  assert.equal(bestOffset([], 42), 42)
  assert.equal(addSample(Array(8).fill(s1), s2).length, 8)
})

test('backoffMs et pollMs', () => {
  assert.deepEqual([0, 1, 2, 3, 9].map((a) => backoffMs(a)), [1000, 2000, 4000, 8000, 8000])
  assert.equal(pollMs({ phase: 'vote', live: true, hidden: false }), 2000)
  assert.equal(pollMs({ phase: 'result', live: true, hidden: false }), 3500)
  assert.equal(pollMs({ phase: 'result', live: false, hidden: false }), 1500)
  assert.equal(pollMs({ phase: 'vote', live: true, hidden: true }), 6000)
})

test('erreurs : réseau à retenter, fonction absente = migration pas collée', () => {
  assert.equal(isNetworkError({ ok: false, error: 'timeout' }), true)
  assert.equal(isNetworkError({ ok: false, error: 'Load failed' }), true)
  assert.equal(isNetworkError({ ok: false, error: 'http_503' }), true)
  assert.equal(isNetworkError({ error: 'phase' }), false)
  assert.equal(isNetworkError(null), false)
  assert.equal(isMissingFunction({ ok: false, error: 'Could not find the function public.guesswho_sync(p_code, p_token) in the schema cache' }), true)
  assert.equal(isMissingFunction({ ok: false, error: 'timeout' }), false)
  assert.equal(isMissingFunction({ error: 'unauthorized' }), false)
})
