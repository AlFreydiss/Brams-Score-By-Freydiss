import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mixToMono, frameLevels, voicedBounds, normalizeGain, softClip, resample, processTake, encodeWav, peaksOf } from './dsp.js'

const RATE = 8000
// silence (bruit léger) – voix (sinus) – silence
function take({ lead = 1, voice = 1, tail = 1, amp = 0.3, noise = 0.002 } = {}) {
  const n = Math.round((lead + voice + tail) * RATE)
  const s = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / RATE
    s[i] = (i % 2 ? noise : -noise) + (t >= lead && t < lead + voice ? amp * Math.sin(2 * Math.PI * 220 * t) : 0)
  }
  return s
}

test('mixToMono : moyenne des canaux', () => {
  assert.deepEqual([...mixToMono([new Float32Array([1, 0]), new Float32Array([0, 1])])], [0.5, 0.5])
  assert.equal(mixToMono([]).length, 0)
})

test('frameLevels : une valeur par tranche de 20 ms', () => {
  assert.equal(frameLevels(new Float32Array(RATE), RATE).length, 50)
})

test('voicedBounds : coupe les silences en gardant une marge', () => {
  const b = voicedBounds(take(), RATE)
  assert.ok(b.start > 0.8 * RATE && b.start < 1 * RATE, `début ${b.start}`)
  assert.ok(b.end > 2 * RATE && b.end < 2.3 * RATE, `fin ${b.end}`)
})

test('voicedBounds : null pour une prise muette', () => {
  assert.equal(voicedBounds(take({ amp: 0 }), RATE), null)
  assert.equal(voicedBounds(new Float32Array(0), RATE), null)
})

test('normalizeGain : monte une voix faible, baisse une voix forte, borné', () => {
  const quiet = normalizeGain(take({ amp: 0.05, lead: 0, tail: 0 }), RATE)
  const loud = normalizeGain(take({ amp: 0.9, lead: 0, tail: 0 }), RATE)
  assert.ok(quiet > 3, `gain faible ${quiet}`)
  assert.ok(loud < 1, `gain fort ${loud}`)
  assert.ok(normalizeGain(take({ amp: 0.001, lead: 0, tail: 0, noise: 0 }), RATE) <= 10)
})

test('softClip : linéaire sous le genou, jamais au-delà de 1', () => {
  assert.equal(softClip(0.5), 0.5)
  assert.ok(softClip(5) < 1 && softClip(5) > 0.95)
  assert.ok(softClip(-5) > -1)
})

test('resample : longueur proportionnelle', () => {
  assert.equal(resample(new Float32Array(48000), 48000, 16000).length, 16000)
  assert.equal(resample(new Float32Array(100), 8000, 16000).length, 200)
})

test('processTake : prise coupée, normalisée, sans écrêtage', () => {
  const r = processTake([take({ amp: 0.05 })], RATE, { outRate: RATE })
  assert.equal(r.silent, false)
  assert.ok(r.duration > 1 && r.duration < 1.4, `durée ${r.duration}`)
  let peak = 0
  for (const v of r.samples) peak = Math.max(peak, Math.abs(v))
  assert.ok(peak > 0.15 && peak <= 1, `pic ${peak}`)
  assert.equal(processTake([take({ amp: 0 })], RATE, { outRate: RATE }).silent, true)
})

test('encodeWav : en-tête RIFF valide', () => {
  const w = encodeWav(new Float32Array([0, 1, -1]), 22050)
  assert.equal(w.length, 44 + 6)
  assert.equal(String.fromCharCode(...w.subarray(0, 4)), 'RIFF')
  assert.equal(String.fromCharCode(...w.subarray(8, 12)), 'WAVE')
  const v = new DataView(w.buffer)
  assert.equal(v.getUint32(24, true), 22050)
  assert.equal(v.getInt16(46, true), 32767)
  assert.equal(v.getInt16(48, true), -32768)
})

test('peaksOf : n barres entre 0 et 1', () => {
  const p = peaksOf(take(), 30)
  assert.equal(p.length, 30)
  assert.equal(Math.max(...p), 1)
  assert.ok(p[0] < 0.1)
  assert.deepEqual(peaksOf(null, 3), [0, 0, 0])
})
