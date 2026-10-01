import { test } from 'node:test'
import assert from 'node:assert/strict'
import { freshDb, call, setupRoom } from './testDb.js'

async function inPhase(db, code, phase, round = 1) {
  await db.query(`update guesswho_rooms set phase = $2, round = $3, status = 'playing',
    phase_ends_at = now() + interval '30 seconds' where code = $1`, [code, phase, round])
}

test('lancer : hôte seulement, 3 joueurs minimum, vies remises à 2', async () => {
  const db = await freshDb()
  const two = await setupRoom(db, 2, 'TWOO')
  assert.equal((await call(db, 'guesswho_start', 'TWOO', two.players[0].token)).error, 'not_enough_players')
  const { code, players } = await setupRoom(db, 3)
  assert.equal((await call(db, 'guesswho_start', code, players[1].token)).error, 'unauthorized')
  await db.query(`update guesswho_players set lives = 0`)
  const r = await call(db, 'guesswho_start', code, players[0].token)
  assert.equal(r.ok, true)
  const st = await call(db, 'guesswho_room_state', code)
  assert.equal(st.room.phase, 'gages')
  assert.deepEqual(st.players.map((p) => p.lives), [2, 2, 2])
  assert.deepEqual(st.players.map((p) => p.seat), [0, 1, 2])
})

test('gage : coupé à 140 caractères, refusé vide ou hors phase', async () => {
  const db = await freshDb()
  const { code, players } = await setupRoom(db, 3)
  assert.equal((await call(db, 'guesswho_submit_gage', code, players[0].token, 'x')).error, 'unauthorized') // pas de siège avant le lancement
  await call(db, 'guesswho_start', code, players[0].token)
  assert.equal((await call(db, 'guesswho_submit_gage', code, players[1].token, '   ')).error, 'empty')
  assert.equal((await call(db, 'guesswho_submit_gage', code, players[1].token, 'a'.repeat(300))).ok, true)
  const { rows } = await db.query(`select length(gage) n from guesswho_players where user_id = 'u1'`)
  assert.equal(rows[0].n, 140)
  await inPhase(db, code, 'listen')
  assert.equal((await call(db, 'guesswho_submit_gage', code, players[2].token, 'trop tard')).error, 'phase')
})

test('imitation : bon tour seulement, remplace la précédente', async () => {
  const db = await freshDb()
  const { code, players } = await setupRoom(db, 3)
  await call(db, 'guesswho_start', code, players[0].token)
  await inPhase(db, code, 'record', 1)
  const t = players[1].token
  assert.equal((await call(db, 'guesswho_submit_take', code, t, 'https://r2.test/a.webm', 2.5, 1)).ok, true)
  assert.equal((await call(db, 'guesswho_submit_take', code, t, 'https://r2.test/b.webm', 3, 1)).ok, true)
  const { rows } = await db.query(`select audio_url from guesswho_takes`)
  assert.deepEqual(rows.map((r) => r.audio_url), ['https://r2.test/b.webm'])
})

test('imitation envoyée en retard : refus "phase" (Review Focus)', async () => {
  const db = await freshDb()
  const { code, players } = await setupRoom(db, 3)
  await call(db, 'guesswho_start', code, players[0].token)
  await inPhase(db, code, 'vote', 1)
  assert.equal((await call(db, 'guesswho_submit_take', code, players[1].token, 'https://r2.test/a.webm', 2, 1)).error, 'phase')
  await inPhase(db, code, 'record', 2)
  assert.equal((await call(db, 'guesswho_submit_take', code, players[1].token, 'https://r2.test/a.webm', 2, 1)).error, 'phase')
})

test('imitation : URL invalide ou data URL trop grosse refusées (Review Focus)', async () => {
  const db = await freshDb()
  const { code, players } = await setupRoom(db, 3)
  await call(db, 'guesswho_start', code, players[0].token)
  await inPhase(db, code, 'record', 1)
  const t = players[1].token
  assert.equal((await call(db, 'guesswho_submit_take', code, t, 'javascript:alert(1)', 2, 1)).error, 'bad_url')
  assert.equal((await call(db, 'guesswho_submit_take', code, t, 'data:audio/webm;base64,' + 'A'.repeat(200001), 2, 1)).error, 'too_big')
  assert.equal((await call(db, 'guesswho_submit_take', code, t, 'data:audio/webm;base64,AAAA', 2, 1)).ok, true)
})

test('vote : pas pour soi, cible avec imitation, modifiable', async () => {
  const db = await freshDb()
  const { code, players } = await setupRoom(db, 3)
  await call(db, 'guesswho_start', code, players[0].token)
  await inPhase(db, code, 'record', 1)
  await call(db, 'guesswho_submit_take', code, players[0].token, 'https://r2.test/0.webm', 2, 1)
  await call(db, 'guesswho_submit_take', code, players[1].token, 'https://r2.test/1.webm', 2, 1)
  await inPhase(db, code, 'vote', 1)
  assert.equal((await call(db, 'guesswho_vote', code, players[0].token, 'u0')).error, 'self')
  assert.equal((await call(db, 'guesswho_vote', code, players[0].token, 'u2')).error, 'invalid_target')
  assert.equal((await call(db, 'guesswho_vote', code, players[2].token, 'u0')).ok, true)
  assert.equal((await call(db, 'guesswho_vote', code, players[2].token, 'u1')).ok, true)
  const { rows } = await db.query(`select target from guesswho_votes where voter = 'u2'`)
  assert.deepEqual(rows.map((r) => r.target), ['u1'])
})

test('revote : seulement vers les ex aequo', async () => {
  const db = await freshDb()
  const { code, players } = await setupRoom(db, 3)
  await call(db, 'guesswho_start', code, players[0].token)
  await inPhase(db, code, 'record', 1)
  for (const p of players) await call(db, 'guesswho_submit_take', code, p.token, `https://r2.test/${p.user}.webm`, 2, 1)
  await inPhase(db, code, 'revote', 1)
  await db.query(`update guesswho_rooms set tied = array['u0','u1']`)
  assert.equal((await call(db, 'guesswho_vote', code, players[0].token, 'u2')).error, 'invalid_target')
  assert.equal((await call(db, 'guesswho_vote', code, players[2].token, 'u0')).ok, true)
})

test("imitations cachées pendant l'enregistrement, visibles au vote", async () => {
  const db = await freshDb()
  const { code, players } = await setupRoom(db, 3)
  await call(db, 'guesswho_start', code, players[0].token)
  await inPhase(db, code, 'record', 1)
  await call(db, 'guesswho_submit_take', code, players[1].token, 'https://r2.test/1.webm', 2, 1)
  assert.equal((await call(db, 'guesswho_takes', code, 1)).error, 'hidden')
  const prog = await call(db, 'guesswho_progress', code)
  assert.deepEqual(prog.took, ['u1'])
  await inPhase(db, code, 'vote', 1)
  const t = await call(db, 'guesswho_takes', code, 1)
  assert.equal(t.takes.length, 1)
  assert.equal(t.takes[0].user_id, 'u1')
})
