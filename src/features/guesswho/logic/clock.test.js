import { test } from 'node:test'
import assert from 'node:assert/strict'
import { remainingSec, shouldAdvance, isDone, votableTakes } from './clock.js'

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
