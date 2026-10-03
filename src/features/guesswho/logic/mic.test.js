import { test } from 'node:test'
import assert from 'node:assert/strict'
import { micConstraints, levelOf, micLabel, raceWithRelease } from './mic.js'

test('micConstraints : micro choisi en exact, sinon micro par défaut', () => {
  assert.deepEqual(micConstraints('abc').deviceId, { exact: 'abc' })
  assert.equal(micConstraints(null).deviceId, undefined)
  assert.equal(micConstraints('').deviceId, undefined)
  assert.equal(micConstraints('abc').echoCancellation, true)
  assert.equal(micConstraints('').autoGainControl, false)
  assert.equal(micConstraints('').noiseSuppression, false)
})

test('levelOf : 0 pour du silence, proche de 1 pour un signal fort', () => {
  assert.equal(levelOf(new Uint8Array(64).fill(128)), 0)
  const loud = new Uint8Array(64).map((_, i) => (i % 2 ? 255 : 0))
  assert.ok(levelOf(loud) > 0.9)
})

test('micLabel : nom lisible même sans libellé', () => {
  assert.equal(micLabel({ label: 'Micro (Realtek)' }, 0), 'Micro (Realtek)')
  assert.equal(micLabel({ label: '' }, 1), 'Micro 2')
})

// Micro autorisé APRÈS le délai : il faut le refermer, sinon il reste ouvert.
const stream = () => { const t = { stopped: false, stop() { this.stopped = true } }; return { t, getTracks: () => [t] } }

test('raceWithRelease : réponse à temps → flux rendu, rien de coupé', async () => {
  const s = stream()
  const out = await raceWithRelease(Promise.resolve(s), 50, (fn) => setTimeout(fn, 50))
  assert.equal(out, s)
  assert.equal(s.t.stopped, false)
})

test('raceWithRelease : réponse après le délai → TimeoutError, flux tardif refermé', async () => {
  const s = stream()
  let resolveLate
  const late = new Promise((r) => { resolveLate = r })
  let fire
  const p = raceWithRelease(late, 10000, (fn) => { fire = fn })
  fire() // le délai expire d'abord
  await assert.rejects(p, (e) => e.name === 'TimeoutError')
  resolveLate(s) // puis le joueur touche « Autoriser »
  await new Promise((r) => setTimeout(r, 0))
  assert.equal(s.t.stopped, true)
})
