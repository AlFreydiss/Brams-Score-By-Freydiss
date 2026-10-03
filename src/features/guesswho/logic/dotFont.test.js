import { test } from 'node:test'
import assert from 'node:assert/strict'
import { glyph, hasGlyph, DOT_COLS, DOT_ROWS } from './dotFont.js'

// Mêmes caractères que les codes de salon (src/lib/guessWhoRooms.js).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

test('dotFont : chaque caractère des codes de salon a une lettre 5×7 non vide', () => {
  for (const ch of ALPHABET) {
    assert.ok(hasGlyph(ch), ch)
    const g = glyph(ch)
    assert.equal(g.length, DOT_ROWS, ch)
    for (const row of g) assert.equal(row.length, DOT_COLS, ch)
    assert.ok(g.flat().some(Boolean), ch)
  }
})

test('dotFont : minuscules acceptées, inconnu = grille éteinte', () => {
  assert.deepEqual(glyph('a'), glyph('A'))
  assert.ok(!glyph('?').flat().some(Boolean))
})
