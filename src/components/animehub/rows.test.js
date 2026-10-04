import { test } from 'node:test'
import assert from 'node:assert/strict'
import { genreRows, films, bingeable, similarTo } from './rows.js'

const A = (id, genres, extra = {}) => ({ id, genres, ...extra })
const cat = [
  A('reze', ['Action', 'Romance', 'Drame'], { type: 'Film' }),
  A('jjk', ['Action', 'Surnaturel']),
  A('op', ['Action', 'Aventure']),
  A('kny', ['Action', 'Drame']),
  A('yn', ['Romance', 'Drame'], { type: 'Film' }),
  A('kaguya', ['Romance', 'Comédie']),
  A('lie', ['Romance', 'Drame']),
  A('violet', ['Drame']),
]

test('genreRows : une série ne passe que dans une rangée', () => {
  const rows = genreRows(cat, ['Action', 'Romance', 'Drame'], { min: 1 })
  const ids = rows.flatMap(r => r.list.map(a => a.id))
  assert.equal(ids.length, new Set(ids).size)
  assert.deepEqual(rows.find(r => r.genre === 'Action').list.map(a => a.id), ['reze', 'jjk', 'op', 'kny'])
  assert.deepEqual(rows.find(r => r.genre === 'Drame').list.map(a => a.id), ['violet'])
})

test('genreRows : plafond, minimum et exclusions', () => {
  const rows = genreRows(cat, ['Action', 'Romance', 'Drame'], { min: 2, cap: 2, skip: new Set(['reze']) })
  assert.deepEqual(rows.map(r => [r.genre, r.list.map(a => a.id)]), [
    ['Action', ['jjk', 'op']],
    ['Romance', ['yn', 'kaguya']],
    ['Drame', ['kny', 'lie']],
  ])
})

test('films et bingeable', () => {
  assert.deepEqual(films(cat).map(a => a.id), ['reze', 'yn'])
  const eps = { jjk: 39, op: 1100, kny: 63, kaguya: 12, lie: 22, violet: 13, reze: 1, yn: 1 }
  assert.deepEqual(bingeable(cat, id => eps[id] || 0).map(a => a.id), ['kaguya', 'violet', 'lie'])
})

test('similarTo : plus de genres communs d’abord, sans la série elle-même', () => {
  assert.deepEqual(similarTo(cat[3], cat, 3).map(a => a.id), ['reze', 'jjk', 'op'])
  assert.deepEqual(similarTo(null, cat), [])
})
