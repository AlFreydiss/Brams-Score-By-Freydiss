import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { styleViolations } from './logic/styleRules.js'

test('styleViolations : détecte et ignore les commentaires', () => {
  assert.equal(styleViolations('border: `3px solid ${C.ink}`').length, 1)
  assert.equal(styleViolations('boxShadow: `4px 4px 0 ${C.ink}`').length, 1)
  assert.equal(styleViolations('// 3px solid dans un commentaire').length, 0)
  assert.equal(styleViolations('border: `1px solid ${T.line}`').length, 0)
})

// Fichiers repris : la liste s'allonge à chaque tâche, jusqu'à tous les .jsx (Task 9).
const DONE = ['manga.jsx']

test('fichiers repris : aucun style manga', () => {
  const dir = new URL('./', import.meta.url)
  for (const f of readdirSync(dir).filter((x) => DONE.includes(x))) {
    const v = styleViolations(readFileSync(new URL(f, dir), 'utf8'))
    assert.deepEqual(v, [], `${f}\n${v.join('\n')}`)
  }
})

test('styleViolations : anneau de focus et 1,5 px tolérés', () => {
  assert.equal(styleViolations('.gw-btn:focus-visible { outline: 2px solid ${T.accent}; }').length, 0)
  assert.equal(styleViolations('border: `1.5px solid ${T.line}`').length, 0)
})
