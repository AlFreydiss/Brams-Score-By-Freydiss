import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addHighlight, bestHighlight, highlightsFromStats, mergeHighlights } from './highlights.js'

const takes = [{ user_id: 'a', audio_url: 'A' }, { user_id: 'b', audio_url: 'B' }]

test('addHighlight : garde la plus votée du tour, une seule fois par tour', () => {
  let h = addHighlight([], { round: 1, stage: 'vote', scores: { a: 1, b: 3 } }, takes, 'Kamehameha')
  assert.deepEqual(h, [{ round: 1, user_id: 'b', votes: 3, audio_url: 'B', clip: 'Kamehameha' }])
  h = addHighlight(h, { round: 1, stage: 'vote', scores: { a: 9 } }, takes, 'x')
  assert.equal(h.length, 1)
})

test('addHighlight : rien si personne n\'a de vote ou pas de résultat', () => {
  assert.deepEqual(addHighlight([], { round: 2, stage: 'auto', scores: { a: 0 } }, takes, 'x'), [])
  assert.deepEqual(addHighlight([], null, takes, 'x'), [])
})

test('bestHighlight : la plus votée de la partie (la plus récente en cas d\'égalité)', () => {
  const h = [{ round: 1, votes: 2 }, { round: 2, votes: 3 }, { round: 3, votes: 3 }]
  assert.equal(bestHighlight(h).round, 3)
  assert.equal(bestHighlight([]), null)
})

test('highlightsFromStats : une imitation par tour voté, titre du son', () => {
  const stats = { rounds: [
    { round: 1, clip: { title: 'Rasengan' }, best: { user_id: 'a', votes: 2, audio_url: 'A' } },
    { round: 2, clip: { title: 'Getsuga' }, best: null },
    { round: 3, clip: null, best: { user_id: 'b', votes: 0, audio_url: 'B' } },
  ] }
  assert.deepEqual(highlightsFromStats(stats), [{ round: 1, user_id: 'a', votes: 2, audio_url: 'A', clip: 'Rasengan' }])
  assert.deepEqual(highlightsFromStats(null), [])
})

test('mergeHighlights : le serveur fait foi par tour, le local comble les trous', () => {
  const local = [{ round: 1, votes: 1, user_id: 'x' }, { round: 3, votes: 2, user_id: 'y' }]
  const server = [{ round: 1, votes: 2, user_id: 'a' }, { round: 2, votes: 1, user_id: 'b' }]
  assert.deepEqual(mergeHighlights(local, server).map((h) => `${h.round}${h.user_id}`), ['1a', '2b', '3y'])
})
