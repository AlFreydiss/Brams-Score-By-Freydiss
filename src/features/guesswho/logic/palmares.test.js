import { test } from 'node:test'
import assert from 'node:assert/strict'
import { emptyPalmares, parsePalmares, recordGame, recordSolo, soloSummary } from './palmares.js'

test('parsePalmares tolère le vide et le corrompu', () => {
  assert.deepEqual(parsePalmares(null), emptyPalmares())
  assert.deepEqual(parsePalmares('{oups'), emptyPalmares())
  assert.equal(parsePalmares('{"games":3}').games, 3)
})

test('recordGame compte une seule fois par partie', () => {
  let p = recordGame(emptyPalmares(), { gameId: 'ABCD:1', rank: 1, votes: 7 })
  p = recordGame(p, { gameId: 'ABCD:1', rank: 1, votes: 7 })
  p = recordGame(p, { gameId: 'ABCD:2', rank: 4, votes: 2 })
  assert.deepEqual([p.games, p.wins, p.podiums, p.bestVotes], [2, 1, 1, 7])
})

test('recordSolo garde le meilleur score et signale le record', () => {
  let r = recordSolo(emptyPalmares(), 'gomu', 62)
  assert.equal(r.record, true)
  r = recordSolo(r.palmares, 'gomu', 40)
  assert.equal(r.record, false)
  assert.equal(r.palmares.solo.gomu, 62)
  r = recordSolo(r.palmares, 'bankai', 90)
  assert.deepEqual(soloSummary(r.palmares), { clips: 2, best: 90, mastered: 1 })
  assert.equal(r.palmares.soloPlays, 3)
})
