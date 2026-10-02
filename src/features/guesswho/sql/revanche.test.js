// Migration 20261003 : revanche depuis l'écran de fin, avance par tous, journal.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { freshDb, call, setupRoom, expirePhase, seedClips } from './testDb.js'

const room = async (db, code = 'ABCD') => (await call(db, 'guesswho_room_state', code)).room
const players = async (db, code = 'ABCD') => (await call(db, 'guesswho_room_state', code)).players
const stale = (db, user, sec) =>
  db.query(`update guesswho_players set last_seen = now() - make_interval(secs => $2) where user_id = $1`, [user, sec])

// Salon de n joueurs arrivé à l'écran de fin (fin forcée).
async function atEnd(n = 4) {
  const db = await freshDb()
  await seedClips(db)
  const g = await setupRoom(db, n)
  await call(db, 'guesswho_start', g.code, g.players[0].token, {})
  await db.query(`update guesswho_rooms set phase = 'end', status = 'ended'`)
  return { db, g }
}

test('revanche : joueur en veille 60 s gardé', async () => {
  const { db, g } = await atEnd(3)
  await stale(db, 'u2', 60)
  const r = await call(db, 'guesswho_start', g.code, g.players[0].token, {})
  assert.equal(r.ok, true)
  assert.equal(r.players, 3)
  assert.ok((await players(db)).some((p) => p.user_id === 'u2'))
})

test('revanche : joueur prêt en veille 3 min gardé', async () => {
  const { db, g } = await atEnd(3)
  await call(db, 'guesswho_set_ready', g.code, g.players[2].token, true)
  await stale(db, 'u2', 180)
  const r = await call(db, 'guesswho_start', g.code, g.players[0].token, {})
  assert.equal(r.ok, true)
  assert.ok((await players(db)).some((p) => p.user_id === 'u2'))
})

test('revanche : absent > 90 s et pas prêt → retiré', async () => {
  const { db, g } = await atEnd(4)
  await stale(db, 'u3', 120)
  const r = await call(db, 'guesswho_start', g.code, g.players[0].token, {})
  assert.equal(r.ok, true)
  assert.equal(r.players, 3)
  assert.ok(!(await players(db)).some((p) => p.user_id === 'u3'))
})

test('revanche : moins de 3 présents → not_enough_players, personne supprimé', async () => {
  const { db, g } = await atEnd(3)
  await stale(db, 'u1', 120); await stale(db, 'u2', 120)
  const r = await call(db, 'guesswho_start', g.code, g.players[0].token, {})
  assert.equal(r.error, 'not_enough_players')
  assert.equal((await players(db)).length, 3)
})

test('revanche : hôte revenant de veille compté', async () => {
  const { db, g } = await atEnd(3)
  await stale(db, 'u0', 300)
  const r = await call(db, 'guesswho_start', g.code, g.players[0].token, {})
  assert.equal(r.ok, true)
})

test("salon d'attente : toujours 22 s", async () => {
  const db = await freshDb()
  await seedClips(db)
  const g = await setupRoom(db, 3)
  await stale(db, 'u2', 60)
  const r = await call(db, 'guesswho_start', g.code, g.players[0].token, {})
  assert.equal(r.error, 'not_enough_players')
})

test("arrivée à l'écran de fin : prêts remis à zéro", async () => {
  const db = await freshDb()
  await seedClips(db)
  const g = await setupRoom(db, 3)
  await call(db, 'guesswho_start', g.code, g.players[0].token, {})
  await db.query(`update guesswho_players set ready = true`)
  await db.query(`update guesswho_rooms set phase = 'gage'`)
  await expirePhase(db, g.code)
  await call(db, 'guesswho_advance', g.code, g.players[0].token, 'gage', (await room(db)).round)
  assert.equal((await room(db)).phase, 'end')
  assert.ok((await players(db)).every((p) => p.ready === false))
})

test('migration 20261003 recollée deux fois : sans erreur', async () => {
  const db = await freshDb()
  const { readFileSync } = await import('node:fs')
  await db.exec(readFileSync(new URL('../../../../supabase/migrations/20261003_guess_who_revanche.sql', import.meta.url), 'utf8'))
})

// ── Avance anticipée par n'importe quel joueur ──────────────────────────────
async function inRecord() {
  const db = await freshDb()
  await seedClips(db)
  const g = await setupRoom(db, 3)
  await call(db, 'guesswho_start', g.code, g.players[0].token, {})
  for (const p of g.players) await call(db, 'guesswho_submit_gage', g.code, p.token, `gage de ${p.user}`)
  for (const ph of ['gages', 'listen']) {
    await expirePhase(db, g.code)
    await call(db, 'guesswho_advance', g.code, g.players[0].token, ph, (await room(db)).round)
  }
  return { db, g }
}
const R2 = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/'

test('avance : un non-hôte avance quand tout le monde a fini', async () => {
  const { db, g } = await inRecord()
  const r0 = await room(db)
  for (let i = 0; i < 3; i++) await call(db, 'guesswho_submit_take', g.code, g.players[i].token, `${R2}${i}.webm`, 2, r0.round)
  const r = await call(db, 'guesswho_advance', g.code, g.players[2].token, 'record', r0.round)
  assert.equal(r.ok, true)
  assert.equal((await room(db)).phase, 'vote')
})

test('avance : un non-hôte reste refusé trop tôt', async () => {
  const { db, g } = await inRecord()
  const r0 = await room(db)
  const r = await call(db, 'guesswho_advance', g.code, g.players[2].token, 'record', r0.round)
  assert.equal(r.reason, 'too_early')
  assert.equal((await room(db)).phase, 'record')
})

test('avance : deux joueurs en même temps → une seule transition', async () => {
  const { db, g } = await inRecord()
  const r0 = await room(db)
  for (let i = 0; i < 3; i++) await call(db, 'guesswho_submit_take', g.code, g.players[i].token, `${R2}${i}.webm`, 2, r0.round)
  const a = await call(db, 'guesswho_advance', g.code, g.players[1].token, 'record', r0.round)
  const b = await call(db, 'guesswho_advance', g.code, g.players[2].token, 'record', r0.round)
  assert.equal(a.ok, true)
  assert.equal(b.reason, 'stale')
  assert.equal((await room(db)).phase, 'vote')
})
