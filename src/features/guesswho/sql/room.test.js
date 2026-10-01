import { test } from 'node:test'
import assert from 'node:assert/strict'
import { freshDb, call, setupRoom } from './testDb.js'

test('créer puis rejoindre : jetons distincts, hôte unique', async () => {
  const db = await freshDb()
  const { code, players } = await setupRoom(db, 3)
  assert.equal(new Set(players.map((p) => p.token)).size, 3)
  const st = await call(db, 'guesswho_room_state', code)
  assert.equal(st.players.length, 3)
  assert.equal(st.players.filter((p) => p.is_host).length, 1)
  assert.equal(st.room.phase, 'lobby')
})

test('code déjà pris', async () => {
  const db = await freshDb()
  await call(db, 'guesswho_create', 'ZZZZ', 'a', 'A', null)
  const r = await call(db, 'guesswho_create', 'ZZZZ', 'b', 'B', null)
  assert.equal(r.error, 'code_taken')
})

test("l'état public ne contient ni jeton ni texte de gage", async () => {
  const db = await freshDb()
  const { code } = await setupRoom(db, 3)
  await db.query(`update guesswho_players set gage = 'secret'`)
  const st = await call(db, 'guesswho_room_state', code)
  const json = JSON.stringify(st)
  assert.ok(!json.includes('secret_token'))
  assert.ok(!json.includes('"secret"'))
  assert.equal(st.players[0].has_gage, true)
})

test('salon plein à 8', async () => {
  const db = await freshDb()
  const { code } = await setupRoom(db, 8)
  const r = await call(db, 'guesswho_join', code, 'u9', 'Neuf', null, null)
  assert.equal(r.spectator, true)
  assert.equal(r.reason, 'full')
})

test('rechargement en pleine partie : le jeton rend sa place (Review Focus)', async () => {
  const db = await freshDb()
  const { code, players } = await setupRoom(db, 3)
  await db.query(`update guesswho_rooms set phase = 'record', status = 'playing'`)
  const back = await call(db, 'guesswho_join', code, 'u1', 'Joueur 1', null, players[1].token)
  assert.equal(back.spectator, false)
  assert.equal(back.secret_token, players[1].token)
  const stranger = await call(db, 'guesswho_join', code, 'u7', 'Nouveau', null, null)
  assert.equal(stranger.spectator, true)
  assert.equal(stranger.reason, 'started')
})

test('même user_id sans le bon jeton : pas de vol de place', async () => {
  const db = await freshDb()
  const { code } = await setupRoom(db, 3)
  const r = await call(db, 'guesswho_join', code, 'u1', 'Imposteur', null, null)
  assert.equal(r.spectator, true)
  assert.equal(r.reason, 'seat_taken')
})

test("reprise d'hôte seulement si l'hôte est absent", async () => {
  const db = await freshDb()
  const { code, players } = await setupRoom(db, 3)
  let r = await call(db, 'guesswho_promote_host', code, players[1].token)
  assert.equal(r.reason, 'host_alive')
  await db.query(`update guesswho_players set last_seen = now() - interval '1 minute' where user_id = 'u0'`)
  r = await call(db, 'guesswho_promote_host', code, players[1].token)
  assert.equal(r.ok, true)
  const st = await call(db, 'guesswho_room_state', code)
  assert.equal(st.players.find((p) => p.is_host).user_id, 'u1')
})

test('les fonctions internes sont interdites à anon', async () => {
  const db = await freshDb()
  await db.exec('set role anon')
  await assert.rejects(db.query(`select _gw_duration('vote')`))
  await db.exec('reset role')
})
