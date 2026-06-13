// Tests rang/ELO dames — runner natif Node.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { eloToTier, formatPrime, expectedScore, kFactor, computeElo, START_ELO } from './damesRank.js'

test('eloToTier : bornes des paliers', () => {
  assert.equal(eloToTier(0).tier, 'mousse')
  assert.equal(eloToTier(699).tier, 'mousse')
  assert.equal(eloToTier(700).tier, 'pirate')
  assert.equal(eloToTier(START_ELO).tier, 'supernova') // 1000
  assert.equal(eloToTier(1300).tier, 'corsaire')
  assert.equal(eloToTier(1600).tier, 'commandant')
  assert.equal(eloToTier(1900).tier, 'empereur')
  assert.equal(eloToTier(2200).tier, 'roi')
  assert.equal(eloToTier(9999).tier, 'roi')
})

test('eloToTier : la prime augmente avec l\'ELO', () => {
  assert.ok(eloToTier(1100).prime > eloToTier(1000).prime)
  assert.ok(eloToTier(2500).prime > eloToTier(2200).prime)
  assert.ok(eloToTier(1000).prime >= 30_000_000) // entrée Supernova
})

test('eloToTier : progression vers le palier suivant', () => {
  assert.equal(eloToTier(1000).progress, 0)        // tout début de Supernova (1000→1300)
  assert.ok(eloToTier(1150).progress > 40 && eloToTier(1150).progress < 60)
  assert.equal(eloToTier(99999).progress, 100)     // dernier palier
})

test('formatPrime', () => {
  assert.equal(formatPrime(0), '฿0')
  assert.equal(formatPrime(65_500_000), '฿65.5M')
  assert.equal(formatPrime(1_500_000_000), '฿1.5 Md')
  assert.equal(formatPrime(4_000_000_000), '฿4 Md')
})

test('ELO : score attendu symétrique', () => {
  assert.equal(expectedScore(1000, 1000), 0.5)
  assert.ok(expectedScore(1200, 1000) > 0.5) // le plus fort est favori
})

test('ELO : K-factor (32 si <30 parties, sinon 20)', () => {
  assert.equal(kFactor(0), 32)
  assert.equal(kFactor(29), 32)
  assert.equal(kFactor(30), 20)
})

test('ELO : victoire à égalité = +16 (K32), défaite = -16', () => {
  assert.equal(computeElo(1000, 1000, 1, 0), 1016)
  assert.equal(computeElo(1000, 1000, 0, 0), 984)
  assert.equal(computeElo(1000, 1000, 0.5, 0), 1000) // nul à égalité = stable
})
