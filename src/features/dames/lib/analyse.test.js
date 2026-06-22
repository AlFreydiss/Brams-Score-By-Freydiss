// Tests classification + précision analyse dames — `node --test src/features/dames/lib/*.test.js`
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifierPly, precisionDepuisACPL, SEUILS, CLASSES, resumerAnalyse } from './analyse.js'
import { P, M } from '../engine/draughts-engine.js'

test('classifierPly : seuils de perte (centipions)', () => {
  assert.equal(classifierPly(0).id, 'excellent')
  assert.equal(classifierPly(SEUILS.excellent).id, 'excellent')
  assert.equal(classifierPly(SEUILS.excellent + 1).id, 'bon')
  assert.equal(classifierPly(SEUILS.bon).id, 'bon')
  assert.equal(classifierPly(SEUILS.bon + 1).id, 'imprecision')
  assert.equal(classifierPly(SEUILS.imprecision).id, 'imprecision')
  assert.equal(classifierPly(SEUILS.imprecision + 1).id, 'erreur')
  assert.equal(classifierPly(SEUILS.erreur).id, 'erreur')
  assert.equal(classifierPly(SEUILS.erreur + 1).id, 'gaffe')
  assert.equal(classifierPly(99999).id, 'gaffe')
})

test('classifierPly : perte négative bornée à 0 = excellent', () => {
  assert.equal(classifierPly(-50).id, 'excellent')
})

test('classifierPly : brillant = meilleur coup + tactique + gros gain', () => {
  assert.equal(classifierPly(0, { estMeilleur: true, tactique: true, gainBest: 200 }).id, 'brillant')
  // sans tactique → pas brillant, juste excellent
  assert.equal(classifierPly(0, { estMeilleur: true, tactique: false, gainBest: 200 }).id, 'excellent')
  // gain insuffisant → pas brillant
  assert.equal(classifierPly(0, { estMeilleur: true, tactique: true, gainBest: 50 }).id, 'excellent')
})

test('precisionDepuisACPL : monotone décroissante, bornée [0,100]', () => {
  const p0 = precisionDepuisACPL(0)
  const p50 = precisionDepuisACPL(50)
  const p100 = precisionDepuisACPL(100)
  const p300 = precisionDepuisACPL(300)
  assert.ok(p0 > 95, `acpl 0 → ${p0} doit être quasi 100`)
  assert.ok(p0 >= p50 && p50 >= p100 && p100 >= p300, 'précision décroît avec l\'ACPL')
  assert.ok(p300 >= 0 && p0 <= 100, 'bornée [0,100]')
})

test('resumerAnalyse : agrège pertes, compte gaffes, calcule précision par camp', () => {
  const records = [
    { ply: 0, side: P, mv: { from: [6, 1], to: [5, 2] }, delta: 5, perte: 0, classe: CLASSES.excellent },
    { ply: 1, side: M, mv: { from: [3, 2], to: [4, 3] }, delta: -250, perte: 400, classe: CLASSES.gaffe },
    { ply: 2, side: P, mv: { from: [5, 2], to: [4, 1] }, delta: 30, perte: 80, classe: CLASSES.imprecision },
  ]
  const r = resumerAnalyse(records)
  assert.equal(r[P].plies, 2)
  assert.equal(r[M].plies, 1)
  assert.equal(r[M].gaffes, 1)
  assert.equal(r[P].imprecisions, 1)
  // ACPL P = (0+80)/2 = 40 ; M = 400
  assert.equal(r[P].acpl, 40)
  assert.equal(r[M].acpl, 400)
  assert.ok(r[P].precision > r[M].precision, 'P plus précis que M')
  // tournant = la gaffe M avec delta -250
  assert.equal(r.tournants.length, 1)
  assert.equal(r.tournants[0].side, M)
})
