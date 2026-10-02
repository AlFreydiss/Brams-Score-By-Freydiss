import { test } from 'node:test'
import assert from 'node:assert/strict'
import { T, contrast } from './theme.js'

test('contrast : noir/blanc = 21, identique = 1', () => {
  assert.equal(Math.round(contrast('#000000', '#FFFFFF')), 21)
  assert.equal(contrast('#777777', '#777777'), 1)
})

test('couples texte/fond lisibles (AA ≥ 4,5)', () => {
  for (const [fg, bg] of [[T.textHi, T.bg], [T.text, T.surface], [T.textMute, T.surface], [T.onAccent, T.accent], [T.accent, T.surface], [T.danger, T.surface], [T.ok, T.surface]]) {
    assert.ok(contrast(fg, bg) >= 4.5, `${fg} sur ${bg} = ${contrast(fg, bg).toFixed(2)}`)
  }
})
