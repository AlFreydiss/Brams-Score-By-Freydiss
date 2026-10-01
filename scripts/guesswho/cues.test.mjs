import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseVtt, findTechniqueCues, clipWindow, bestWindow, clipId } from './cues.mjs'

const VTT = `WEBVTT

1
00:00:05.000 --> 00:00:06.500
Tiens bon !

2
00:01:02.250 --> 00:01:04.000
<i>Extension du territoire !</i>

00:02:00.000 --> 00:02:01.000
KAMEHAMEHA !!
`

test('parseVtt : temps en secondes, balises retirées', () => {
  const cues = parseVtt(VTT)
  assert.equal(cues.length, 3)
  assert.deepEqual(cues[1], { start: 62.25, end: 64, text: 'Extension du territoire !' })
})

test('findTechniqueCues : insensible à la casse et aux accents, plafond par mot-clé', () => {
  const cues = parseVtt(VTT)
  const kw = [
    { label: 'Extension du territoire', patterns: [/extension du territoire/i] },
    { label: 'Kamehameha', patterns: [/kam[eé]ham[eé]ha/i] },
  ]
  const found = findTechniqueCues(cues, kw)
  assert.deepEqual(found.map((f) => f.label), ['Extension du territoire', 'Kamehameha'])
  const many = Array.from({ length: 5 }, (_, i) => ({ start: i, end: i + 1, text: 'Kaméhaméha' }))
  assert.equal(findTechniqueCues(many, kw, 3).length, 3)
})

test('clipWindow : marge avant/après, plafonnée', () => {
  assert.deepEqual(clipWindow({ start: 62.25, end: 64 }), { start: 61.95, duration: 2.65 })
  assert.deepEqual(clipWindow({ start: 10, end: 30 }), { start: 9.7, duration: 6 })
  assert.deepEqual(clipWindow({ start: 0.1, end: 1 }), { start: 0, duration: 1.6 })
})

test('bestWindow : trouve le passage le plus fort après minStart', () => {
  const rate = 10
  const s = new Float32Array(60 * rate).fill(0.05)
  for (let i = 30 * rate; i < 36 * rate; i++) s[i] = 0.9
  for (let i = 2 * rate; i < 8 * rate; i++) s[i] = 1 // ignoré : avant minStart
  assert.equal(bestWindow(s, rate, 6, 10), 30)
})

test('clipId : slug stable', () => {
  assert.equal(clipId(['jjk', 'S01E07', 'fr', 'Extension du territoire']), 'jjk-s01e07-fr-extension-du-territoire')
})
