import { test } from 'node:test'
import assert from 'node:assert/strict'
import { likeness, dtw, stretch, pitchTrack, verdictOf } from './likeness.js'

const RATE = 22050
// Signal de test : sinus glissant de f0 à f1, enveloppe en « syllabes ».
function voice({ dur = 1.6, f0 = 220, f1 = 330, syll = [[0.1, 0.5], [0.7, 1.4]], amp = 0.5, rate = RATE, lead = 0.2 } = {}) {
  const n = Math.round((dur + lead * 2) * rate)
  const out = new Float32Array(n)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / rate - lead
    const f = f0 + (f1 - f0) * Math.max(0, Math.min(1, t / dur))
    phase += (2 * Math.PI * f) / rate
    const on = syll.some(([a, b]) => t >= a && t < b)
    out[i] = on ? amp * Math.sin(phase) : 0
  }
  return { samples: out, rate }
}
function noise(dur = 1.6, rate = RATE, seed = 7) {
  const out = new Float32Array(Math.round(dur * rate))
  let s = seed
  for (let i = 0; i < out.length; i++) { s = (s * 16807) % 2147483647; out[i] = ((s / 2147483647) - 0.5) * (i % 9000 < 1500 ? 0.8 : 0.05) }
  return { samples: out, rate }
}

test('dtw : identique = 0, décalage pardonné', () => {
  const a = stretch([0, 0, 1, 1, 0, 0, 1, 0], 32)
  assert.equal(dtw(a, a), 0)
  const shifted = stretch([0, 1, 1, 0, 0, 1, 0, 0], 32)
  assert.ok(dtw(a, shifted) < 0.15)
})

test('pitchTrack retrouve la fréquence d’un sinus', () => {
  const track = pitchTrack(voice({ f0: 200, f1: 200, syll: [[0, 1.6]] }).samples, RATE).filter(Boolean)
  const mid = track[Math.floor(track.length / 2)]
  assert.ok(Math.abs(mid - 200) < 8, `trouvé ${mid}`)
})

test('la même prise donne un score très haut', () => {
  const r = likeness(voice(), voice())
  assert.ok(r.score >= 95, `score ${r.score}`)
})

test('une voix une octave plus grave avec le même dessin reste très proche', () => {
  const r = likeness(voice(), voice({ f0: 110, f1: 165, amp: 0.3 }))
  assert.ok(r.melody > 0.85, `mélodie ${r.melody}`)
  assert.ok(r.score >= 85, `score ${r.score}`)
})

test('un peu plus lent et décalé : encore bien noté', () => {
  const r = likeness(voice(), voice({ dur: 1.9, syll: [[0.15, 0.62], [0.85, 1.7]], lead: 0.45 }))
  assert.ok(r.score >= 70, `score ${r.score}`)
})

test('mélodie inversée et rythme différent : nettement moins bien', () => {
  const good = likeness(voice(), voice()).score
  const bad = likeness(voice(), voice({ f0: 330, f1: 180, syll: [[0, 0.25], [0.35, 0.45], [0.55, 0.6]], dur: 0.7 }))
  assert.ok(bad.score < good - 30, `${bad.score} vs ${good}`)
})

test('du bruit sans rapport : score bas ; silence : 0', () => {
  assert.ok(likeness(voice(), noise()).score < 55)
  const silent = likeness(voice(), { samples: new Float32Array(RATE), rate: RATE })
  assert.equal(silent.score, 0)
  assert.equal(silent.silent, true)
})

test('verdicts par palier', () => {
  assert.equal(verdictOf(90), 'Copie conforme')
  assert.equal(verdictOf(10), 'Pas encore ça')
})
