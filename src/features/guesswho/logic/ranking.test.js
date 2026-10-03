import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rankPlayers, endWord } from './ranking.js'

const P = (display_name, total_votes, lives, seat = 0) => ({ display_name, total_votes, lives, seat })

test('rankPlayers : votes puis vies, spectateurs exclus', () => {
  const r = rankPlayers([P('A', 2, 1), P('B', 5, 0), P('C', 2, 2), { ...P('S', 9, 2), seat: null }])
  assert.deepEqual(r.map((p) => p.display_name), ['B', 'C', 'A'])
})

test('endWord : nom du vainqueur en majuscules s\'il passe dans la police', () => {
  assert.equal(endWord([P('Feydi', 5, 1), P('Brams', 3, 2)]), 'FEYDI')
  assert.equal(endWord([P('Zoé', 5, 1)]), 'ZOÉ')
})

test('endWord : FIN si nom trop long, caractère inconnu ou personne', () => {
  assert.equal(endWord([P('Unnomtreslong', 5, 1)]), 'FIN')
  assert.equal(endWord([P('Jo?', 5, 1)]), 'FIN')
  assert.equal(endWord([P('Hélène', 5, 1)]), 'FIN') // « È » absent de la police
  assert.equal(endWord([]), 'FIN')
})
