// Tests classification / précision de l'analyse d'échecs —
//   `node --test src/features/echecs/lib/analysePartie.test.js`
// Garde-fou : les seuils et la courbe DOIVENT rester alignés sur ceux des dames
// (mêmes valeurs copiées) pour que les deux jeux notent de façon cohérente.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SEUILS, CLASSES, classifierPly, precisionDepuisACPL } from './analysePartie.js'

test('SEUILS = mêmes valeurs que les dames', () => {
  assert.deepEqual(SEUILS, { excellent: 15, bon: 50, imprecision: 120, erreur: 300 })
})

test('classifierPly : paliers de perte', () => {
  assert.equal(classifierPly(0).id, 'excellent')
  assert.equal(classifierPly(15).id, 'excellent')
  assert.equal(classifierPly(16).id, 'bon')
  assert.equal(classifierPly(50).id, 'bon')
  assert.equal(classifierPly(51).id, 'imprecision')
  assert.equal(classifierPly(120).id, 'imprecision')
  assert.equal(classifierPly(121).id, 'erreur')
  assert.equal(classifierPly(300).id, 'erreur')
  assert.equal(classifierPly(301).id, 'gaffe')
  assert.equal(classifierPly(5000).id, 'gaffe')
})

test('classifierPly : perte négative bornée à 0 → excellent', () => {
  assert.equal(classifierPly(-200).id, 'excellent')
})

test('classifierPly : brillant = meilleur + tactique + gros gain', () => {
  assert.equal(classifierPly(0, { estMeilleur: true, tactique: true, gainBest: 120 }).id, 'brillant')
  // pas tactique → pas brillant
  assert.equal(classifierPly(0, { estMeilleur: true, tactique: false, gainBest: 300 }).id, 'excellent')
  // gain insuffisant → pas brillant
  assert.equal(classifierPly(0, { estMeilleur: true, tactique: true, gainBest: 119 }).id, 'excellent')
})

test('precisionDepuisACPL : courbe lichess-like clampée [0,100]', () => {
  // valeurs exactes de la courbe 103.17·exp(-0.04354·ACPL/10) − 3.17 (= dames).
  assert.equal(Math.round(precisionDepuisACPL(0)), 100)
  assert.ok(Math.abs(precisionDepuisACPL(50) - 79.8) < 1, '50 cp ≈ 79.8%')
  assert.ok(Math.abs(precisionDepuisACPL(100) - 63.6) < 1, '100 cp ≈ 63.6%')
  assert.ok(Math.abs(precisionDepuisACPL(300) - 24.8) < 1, '300 cp ≈ 24.8%')
  assert.ok(precisionDepuisACPL(100000) >= 0, 'jamais négatif')
  assert.ok(precisionDepuisACPL(100000) <= 100, 'jamais > 100')
  assert.equal(precisionDepuisACPL(null), 100)
})

test('precisionDepuisACPL : alignée sur la courbe des dames (anti-dérive)', async () => {
  const dames = await import('../../dames/lib/analyse.js')
  for (const acpl of [0, 25, 50, 100, 200, 300, 500]) {
    assert.ok(
      Math.abs(precisionDepuisACPL(acpl) - dames.precisionDepuisACPL(acpl)) < 1e-9,
      `dérive à ${acpl} cp`,
    )
  }
})

test('CLASSES : six classes nommées comme les dames', () => {
  assert.deepEqual(
    Object.keys(CLASSES).sort(),
    ['bon', 'brillant', 'erreur', 'excellent', 'gaffe', 'imprecision'],
  )
  assert.equal(CLASSES.imprecision.symbole, '?!')
  assert.equal(CLASSES.erreur.symbole, '?')
  assert.equal(CLASSES.gaffe.symbole, '??')
})
