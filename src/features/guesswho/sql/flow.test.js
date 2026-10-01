import { test } from 'node:test'
import assert from 'node:assert/strict'
import { freshDb, call, setupRoom, expirePhase, seedClips } from './testDb.js'

const state = (db, code) => call(db, 'guesswho_room_state', code)
const room = async (db, code) => (await state(db, code)).room

// Avance comme l'hôte (échéance forcée).
async function next(db, g) {
  const r = await room(db, g.code)
  await expirePhase(db, g.code)
  return call(db, 'guesswho_advance', g.code, g.players[0].token, r.phase, r.round)
}

// Partie lancée, gages écrits, tour 1 en phase record.
async function toRecord(n = 3) {
  const db = await freshDb()
  await seedClips(db)
  const g = await setupRoom(db, n)
  await call(db, 'guesswho_start', g.code, g.players[0].token)
  for (const p of g.players) await call(db, 'guesswho_submit_gage', g.code, p.token, `gage de ${p.user}`)
  await next(db, g) // gages → listen
  await next(db, g) // listen → record
  return { db, g }
}
const take = (db, g, i) => call(db, 'guesswho_submit_take', g.code, g.players[i].token, `https://r2.test/${i}.webm`, 2, 1)
const vote = (db, g, i, target) => call(db, 'guesswho_vote', g.code, g.players[i].token, target)
const lives = async (db, g) => Object.fromEntries((await state(db, g.code)).players.map((p) => [p.user_id, p.lives]))

test('gages → listen : tour 1 avec un son', async () => {
  const db = await freshDb()
  await seedClips(db)
  const g = await setupRoom(db, 3)
  await call(db, 'guesswho_start', g.code, g.players[0].token)
  await next(db, g)
  const r = await room(db, g.code)
  assert.equal(r.phase, 'listen')
  assert.equal(r.round, 1)
  assert.match(r.clip.id, /^clip\d$/)
  assert.deepEqual(r.used_clips, [r.clip.id])
})

test('trop tôt, mauvais état attendu, puis tout le monde a fini → avance anticipée', async () => {
  const { db, g } = await toRecord()
  const r = await room(db, g.code)
  assert.equal((await call(db, 'guesswho_advance', g.code, g.players[0].token, 'record', r.round)).reason, 'too_early')
  assert.equal((await call(db, 'guesswho_advance', g.code, g.players[0].token, 'vote', r.round)).reason, 'stale')
  for (const i of [0, 1, 2]) await take(db, g, i)
  assert.equal((await call(db, 'guesswho_advance', g.code, g.players[0].token, 'record', r.round)).ok, true)
  assert.equal((await room(db, g.code)).phase, 'vote')
})

test('hôte parti : un autre joueur avance seulement après échéance + 5 s (Review Focus)', async () => {
  const { db, g } = await toRecord()
  const r = await room(db, g.code)
  await expirePhase(db, g.code, 2)
  assert.equal((await call(db, 'guesswho_advance', g.code, g.players[1].token, 'record', r.round)).reason, 'too_early')
  await expirePhase(db, g.code, 6)
  assert.equal((await call(db, 'guesswho_advance', g.code, g.players[1].token, 'record', r.round)).ok, true)
})

test('vote simple : le moins voté perd une vie, votes cumulés', async () => {
  const { db, g } = await toRecord()
  for (const i of [0, 1, 2]) await take(db, g, i)
  await next(db, g) // → vote
  await vote(db, g, 0, 'u1'); await vote(db, g, 1, 'u0'); await vote(db, g, 2, 'u1')
  await next(db, g) // → result
  const r = await room(db, g.code)
  assert.equal(r.phase, 'result')
  assert.deepEqual(r.last_result.losers, ['u2'])
  assert.deepEqual(await lives(db, g), { u0: 2, u1: 2, u2: 1 })
  const st = await state(db, g.code)
  assert.equal(st.players.find((p) => p.user_id === 'u1').total_votes, 2)
})

test('égalité → revote entre ex aequo → un seul perdant', async () => {
  const { db, g } = await toRecord(4)
  for (const i of [0, 1, 2, 3]) await take(db, g, i)
  await next(db, g)
  // u0:2, u1:2, u2:0, u3:0 → u2 et u3 à égalité
  await vote(db, g, 0, 'u1'); await vote(db, g, 1, 'u0'); await vote(db, g, 2, 'u0'); await vote(db, g, 3, 'u1')
  await next(db, g)
  let r = await room(db, g.code)
  assert.equal(r.phase, 'revote')
  assert.deepEqual([...r.tied].sort(), ['u2', 'u3'])
  await vote(db, g, 0, 'u2'); await vote(db, g, 1, 'u2'); await vote(db, g, 3, 'u2')
  await next(db, g)
  r = await room(db, g.code)
  assert.equal(r.last_result.stage, 'revote')
  assert.deepEqual(r.last_result.losers, ['u3'])
  assert.deepEqual(await lives(db, g), { u0: 2, u1: 2, u2: 2, u3: 1 })
})

test('égalité persistante au revote : tous les ex aequo perdent', async () => {
  const { db, g } = await toRecord(4)
  for (const i of [0, 1, 2, 3]) await take(db, g, i)
  await next(db, g)
  await vote(db, g, 0, 'u1'); await vote(db, g, 1, 'u0'); await vote(db, g, 2, 'u0'); await vote(db, g, 3, 'u1')
  await next(db, g)
  await vote(db, g, 0, 'u2'); await vote(db, g, 1, 'u3')
  await next(db, g)
  assert.deepEqual([...(await room(db, g.code)).last_result.losers].sort(), ['u2', 'u3'])
})

test('sans imitation = perd la vie, même avec des votes à 0 ailleurs', async () => {
  const { db, g } = await toRecord()
  await take(db, g, 0); await take(db, g, 1)
  await next(db, g)
  await vote(db, g, 0, 'u1'); await vote(db, g, 1, 'u0'); await vote(db, g, 2, 'u0')
  await next(db, g)
  const r = await room(db, g.code)
  assert.equal(r.last_result.stage, 'vote')
  assert.deepEqual(r.last_result.losers, ['u2'])
})

test('moins de 2 imitations : pas de vote, ceux sans imitation perdent', async () => {
  const { db, g } = await toRecord()
  await take(db, g, 1)
  await next(db, g)
  const r = await room(db, g.code)
  assert.equal(r.phase, 'result')
  assert.equal(r.last_result.stage, 'auto')
  assert.deepEqual([...r.last_result.losers].sort(), ['u0', 'u2'])
})

test('mort → gage tiré parmi les AUTRES joueurs → fin → rejouer', async () => {
  const { db, g } = await toRecord()
  await db.query(`update guesswho_players set lives = 1 where user_id = 'u2'`)
  for (const i of [0, 1, 2]) await take(db, g, i)
  await next(db, g)
  await vote(db, g, 0, 'u1'); await vote(db, g, 1, 'u0'); await vote(db, g, 2, 'u1')
  await next(db, g) // → result (u2 à 0 vie)
  await next(db, g) // → gage
  let r = await room(db, g.code)
  assert.equal(r.phase, 'gage')
  assert.equal(r.gage_result.length, 1)
  assert.equal(r.gage_result[0].user_id, 'u2')
  assert.notEqual(r.gage_result[0].gage, 'gage de u2')
  assert.match(r.gage_result[0].gage, /^gage de u[01]$/)
  await next(db, g) // → end
  r = await room(db, g.code)
  assert.equal(r.phase, 'end')
  assert.equal(r.status, 'ended')
  assert.equal((await call(db, 'guesswho_start', g.code, g.players[0].token)).ok, true)
  assert.deepEqual(await lives(db, g), { u0: 2, u1: 2, u2: 2 })
})

test('aucun gage écrit par les autres → gage de secours', async () => {
  const { db, g } = await toRecord()
  await db.query(`update guesswho_players set gage = null where user_id <> 'u2'`)
  await db.query(`update guesswho_players set lives = 1 where user_id = 'u2'`)
  await take(db, g, 0)
  await next(db, g) // auto : u1 et u2 perdent, u2 meurt
  await next(db, g) // → gage
  const r = await room(db, g.code)
  const mine = r.gage_result.find((x) => x.user_id === 'u2')
  assert.equal(mine.author, null)
  assert.ok(mine.gage.length > 5)
})

test('pas de vie perdue → nouveau tour avec un autre son', async () => {
  const { db, g } = await toRecord()
  const first = (await room(db, g.code)).clip.id
  for (const i of [0, 1, 2]) await take(db, g, i)
  await next(db, g)
  await vote(db, g, 0, 'u1'); await vote(db, g, 1, 'u0'); await vote(db, g, 2, 'u1')
  await next(db, g) // result
  await next(db, g) // → listen tour 2
  const r = await room(db, g.code)
  assert.equal(r.phase, 'listen')
  assert.equal(r.round, 2)
  assert.notEqual(r.clip.id, first)
})

test('changer de son : hôte, phase listen, même tour', async () => {
  const db = await freshDb()
  await seedClips(db)
  const g = await setupRoom(db, 3)
  await call(db, 'guesswho_start', g.code, g.players[0].token)
  await next(db, g)
  const before = await room(db, g.code)
  assert.equal((await call(db, 'guesswho_skip_clip', g.code, g.players[1].token)).error, 'unauthorized')
  assert.equal((await call(db, 'guesswho_skip_clip', g.code, g.players[0].token)).ok, true)
  const after = await room(db, g.code)
  assert.equal(after.round, before.round)
  assert.notEqual(after.clip.id, before.clip.id)
})

test('fonctions de résolution interdites à anon', async () => {
  const db = await freshDb()
  await db.exec('set role anon')
  await assert.rejects(db.query(`select _gw_resolve(gen_random_uuid(), 'vote')`))
  await db.exec('reset role')
})
