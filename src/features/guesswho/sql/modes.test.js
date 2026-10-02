import { test } from 'node:test'
import assert from 'node:assert/strict'
import { freshDb, call, setupRoom, expirePhase } from './testDb.js'

async function db() {
  const d = await freshDb()
  const add = (id, lang, kind) => d.query(
    `insert into guesswho_clips(id, title, anime, lang, kind, url, duration, enabled) values ($1, $1, 'T', $2, $3, 'https://x/' || $1, 3, true)`,
    [id, lang, kind])
  await add('fr1', 'fr', 'technique'); await add('ja1', 'ja', 'technique')
  await add('bleach-bankai-ichigo', 'ja', 'technique')
  return d
}
const room = async (d, code) => (await call(d, 'guesswho_room_state', code)).room
async function toListen(d, settings) {
  const g = await setupRoom(d, 3)
  const r = await call(d, 'guesswho_start', g.code, g.players[0].token, settings)
  await expirePhase(d, g.code)
  await call(d, 'guesswho_advance', g.code, g.players[0].token, 'gages', 0)
  return { g, r }
}

test('vies réglables de 1 à 5 (bornées)', async () => {
  const d = await db()
  await toListen(d, { lives: 3 })
  let st = await call(d, 'guesswho_room_state', 'ABCD')
  assert.deepEqual(st.players.map((p) => p.lives), [3, 3, 3])
  const d2 = await db()
  await toListen(d2, { lives: 9 })
  st = await call(d2, 'guesswho_room_state', 'ABCD')
  assert.deepEqual(st.players.map((p) => p.lives), [5, 5, 5])
})

test('sans réglage : 2 vies, comme avant', async () => {
  const d = await db()
  const g = await setupRoom(d, 3)
  await call(d, 'guesswho_start', g.code, g.players[0].token)
  const st = await call(d, 'guesswho_room_state', g.code)
  assert.deepEqual(st.players.map((p) => p.lives), [2, 2, 2])
})

test('filtre des sons : VF seulement, VO seulement, Bankai only', async () => {
  for (const [sounds, expected] of [['fr', /^fr1$/], ['ja', /^(ja1|bleach-bankai-ichigo)$/], ['bankai', /^bleach-bankai-/]]) {
    const d = await db()
    await toListen(d, { sounds })
    assert.match((await room(d, 'ABCD')).clip.id, expected, sounds)
  }
})

test('chrono rapide : phases raccourcies', async () => {
  const d = await db()
  await toListen(d, { speed: 'fast' })
  const r = await room(d, 'ABCD')
  const left = (new Date(r.phase_ends_at) - Date.now()) / 1000
  assert.ok(left > 8 && left <= 12.5, `écoute rapide ≈ 12 s, reçu ${left}`)
})
