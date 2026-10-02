// Migration 20261002b : synchro, filets de sécurité, arrivées tardives, récap.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { freshDb, call, setupRoom, expirePhase, seedClips } from './testDb.js'

const R2 = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/'
const room = async (db, code = 'ABCD') => (await call(db, 'guesswho_room_state', code)).room
const players = async (db, code = 'ABCD') => (await call(db, 'guesswho_room_state', code)).players
const take = (db, g, i, round = 1) => call(db, 'guesswho_submit_take', g.code, g.players[i].token, `${R2}${i}.webm`, 2, round)
const vote = (db, g, i, target) => call(db, 'guesswho_vote', g.code, g.players[i].token, target)
const stale = (db, user, sec = 60) =>
  db.query(`update guesswho_players set last_seen = now() - make_interval(secs => $2) where user_id = $1`, [user, sec])

async function next(db, g) {
  const r = await room(db, g.code)
  await expirePhase(db, g.code)
  return call(db, 'guesswho_advance', g.code, g.players[0].token, r.phase, r.round)
}

async function started(n = 3, settings = {}) {
  const db = await freshDb()
  await seedClips(db)
  const g = await setupRoom(db, n)
  await call(db, 'guesswho_start', g.code, g.players[0].token, settings)
  return { db, g }
}

async function toRecord(n = 3, settings = {}) {
  const { db, g } = await started(n, settings)
  for (const p of g.players) await call(db, 'guesswho_submit_gage', g.code, p.token, `gage de ${p.user}`)
  await next(db, g) // → listen
  await next(db, g) // → record
  return { db, g }
}

// Un tour complet où `loser` est le moins voté (les autres se votent entre eux).
async function playRound(db, g, loser) {
  const r = await room(db, g.code)
  const alive = (await players(db, g.code)).filter((p) => p.seat != null)
  for (let i = 0; i < g.players.length; i++) await take(db, g, i, r.round)
  await next(db, g) // → vote
  const others = alive.map((p) => p.user_id).filter((u) => u !== loser)
  for (let i = 0; i < g.players.length; i++) {
    const me = g.players[i].user
    const target = others.find((u) => u !== me)
    await vote(db, g, i, target)
  }
  await next(db, g) // → result (ou revote)
}

// ── Synchro ──────────────────────────────────────────────────────────────────

test('sync : salon + joueurs + progression + heure serveur, et compte comme présence', async () => {
  const db = await freshDb()
  const g = await setupRoom(db, 3)
  await stale(db, 'u1')
  const s = await call(db, 'guesswho_sync', g.code, g.players[1].token)
  assert.equal(s.room.code, 'ABCD')
  assert.equal(s.players.length, 3)
  assert.equal(s.progress.phase, 'lobby')
  assert.ok(Number.isFinite(new Date(s.now).getTime()))
  assert.equal(s.me.user_id, 'u1')
  assert.equal(s.players.find((p) => p.user_id === 'u1').connected, true)
  assert.ok(!JSON.stringify(s).includes('secret_token'))
})

test('sync : jeton inconnu signalé, spectateur sans jeton accepté', async () => {
  const db = await freshDb()
  const g = await setupRoom(db, 3)
  const bad = await call(db, 'guesswho_sync', g.code, '00000000-0000-0000-0000-000000000000')
  assert.equal(bad.me.error, 'unauthorized')
  const spec = await call(db, 'guesswho_sync', g.code, null)
  assert.equal(spec.me, null)
  assert.equal(spec.room.code, 'ABCD')
  assert.equal((await call(db, 'guesswho_sync', 'NOPE', null)).error, 'introuvable')
})

test("sync : filet de sécurité, la phase avance à échéance + 5 s même sans l'hôte", async () => {
  const { db, g } = await toRecord()
  await expirePhase(db, g.code, 2)
  await call(db, 'guesswho_sync', g.code, g.players[2].token)
  assert.equal((await room(db)).phase, 'record', 'pas avant + 5 s')
  await expirePhase(db, g.code, 6)
  await call(db, 'guesswho_sync', g.code, null)
  assert.equal((await room(db)).phase, 'record', 'un spectateur ne fait pas avancer')
  await call(db, 'guesswho_sync', g.code, g.players[2].token)
  const r = await room(db)
  assert.equal(r.phase, 'result', 'aucune imitation → résultat direct')
  assert.equal(r.last_result.stage, 'auto')
})

test("sync : reprise d'hôte automatique, joueur assis connecté le plus ancien", async () => {
  const { db, g } = await started(4)
  await stale(db, 'u0')
  await call(db, 'guesswho_sync', g.code, g.players[3].token)
  // u1, u2 inactifs depuis le lancement (< 22 s) : u1 est le plus ancien.
  const ps = await players(db)
  assert.equal(ps.filter((p) => p.is_host).length, 1)
  assert.equal(ps.find((p) => p.is_host).user_id, 'u1')
  assert.equal((await room(db)).host_user_id, 'u1')
  // l'hôte revient : il ne reprend pas la main
  await call(db, 'guesswho_sync', g.code, g.players[0].token)
  assert.equal((await players(db)).find((p) => p.is_host).user_id, 'u1')
})

test('promote_host : le premier candidat gagne, les autres sont refusés', async () => {
  const db = await freshDb()
  const g = await setupRoom(db, 3)
  await stale(db, 'u0')
  assert.equal((await call(db, 'guesswho_promote_host', g.code, g.players[2].token)).reason, 'not_candidate')
  assert.equal((await players(db)).find((p) => p.is_host).user_id, 'u1')
  assert.equal((await call(db, 'guesswho_promote_host', g.code, g.players[1].token)).reason, 'host_alive')
})

test('avance idempotente : deux appels pour la même phase, une seule transition', async () => {
  const { db, g } = await toRecord()
  const r = await room(db)
  await expirePhase(db, g.code, 10)
  const a = await call(db, 'guesswho_advance', g.code, g.players[1].token, 'record', r.round)
  const b = await call(db, 'guesswho_advance', g.code, g.players[2].token, 'record', r.round)
  assert.equal(a.ok, true)
  assert.equal(b.reason, 'stale')
  const lives = (await players(db)).map((p) => p.lives)
  assert.deepEqual(lives, [1, 1, 1], 'une seule vie perdue par joueur')
})

test('trop tôt : le serveur indique le temps restant', async () => {
  const { db, g } = await toRecord()
  const r = await call(db, 'guesswho_advance', g.code, g.players[1].token, 'record', 1)
  assert.equal(r.reason, 'too_early')
  assert.ok(r.wait_ms > 0)
})

// ── Arrivées, fantômes, entrées ──────────────────────────────────────────────

test('arrivée pendant les gages : place et vies pleines', async () => {
  const { db, g } = await started(3, { lives: 3 })
  const j = await call(db, 'guesswho_join', g.code, 'late', 'Retard', null, null)
  assert.equal(j.spectator, false)
  assert.equal(j.late, true)
  const p = (await players(db)).find((x) => x.user_id === 'late')
  assert.equal(p.seat, 3)
  assert.equal(p.lives, 3)
  assert.equal((await call(db, 'guesswho_submit_gage', g.code, j.secret_token, 'mon gage')).ok, true)
})

test("arrivée au début d'un tour : vies = la plus basse en jeu ; pendant l'enregistrement : spectateur", async () => {
  const { db, g } = await toRecord(3, { lives: 3 })
  await db.query(`update guesswho_players set lives = 1 where user_id = 'u2'`)
  await playRound(db, g, 'u0') // u0 : 3 → 2
  await next(db, g) // → listen tour 2
  assert.equal((await room(db)).phase, 'listen')
  const j = await call(db, 'guesswho_join', g.code, 'late', 'Retard', null, null)
  assert.equal(j.spectator, false)
  assert.equal((await players(db)).find((x) => x.user_id === 'late').lives, 1)
  await next(db, g) // → record
  const k = await call(db, 'guesswho_join', g.code, 'later', 'Encore', null, null)
  assert.equal(k.spectator, true)
  assert.equal(k.reason, 'started')
})

test("arrivée en cours : refusée si 8 joueurs assis", async () => {
  const { db, g } = await started(8)
  const j = await call(db, 'guesswho_join', g.code, 'u9', 'Neuf', null, null)
  assert.equal(j.reason, 'full')
})

test("salon d'attente : les fantômes (onglet fermé depuis 1 min) libèrent leur place", async () => {
  const db = await freshDb()
  const g = await setupRoom(db, 8)
  await stale(db, 'u7', 120)
  const j = await call(db, 'guesswho_join', g.code, 'u9', 'Neuf', null, null)
  assert.equal(j.spectator, false)
  const ids = (await players(db)).map((p) => p.user_id)
  assert.ok(!ids.includes('u7'))
  assert.equal(ids.length, 8)
  // le fantôme qui revient avec son ancien jeton est simplement un nouveau venu (salon plein)
  assert.equal((await call(db, 'guesswho_join', g.code, 'u7', 'Joueur 7', null, g.players[7].token)).reason, 'full')
})

test('entrées bornées : nom, avatar, code, durée', async () => {
  const db = await freshDb()
  assert.equal((await call(db, 'guesswho_create', 'ab', 'x', 'X', null)).error, 'bad_code')
  assert.equal((await call(db, 'guesswho_create', 'abcd', ' ', 'X', null)).error, 'bad_user')
  await call(db, 'guesswho_create', 'ABCD', 'u0', 'N'.repeat(500), 'javascript:alert(1)')
  await call(db, 'guesswho_join', 'ABCD', 'u1', '\u0007  ', 'http://evil.test/a.png', null)
  await call(db, 'guesswho_join', 'ABCD', 'u2', 'Ok', 'https://cdn.discordapp.com/a.png', null)
  const ps = await players(db)
  assert.equal(ps[0].display_name.length, 32)
  assert.equal(ps[0].avatar_url, null)
  assert.equal(ps[1].display_name, 'Invité')
  assert.equal(ps[1].avatar_url, null)
  assert.equal(ps[2].avatar_url, 'https://cdn.discordapp.com/a.png')
})

test('imitation : durée bornée, URL piégée refusée', async () => {
  const { db, g } = await toRecord()
  assert.equal((await call(db, 'guesswho_submit_take', g.code, g.players[0].token, `${R2}a b.webm`, 2, 1)).error, 'bad_url')
  assert.equal((await call(db, 'guesswho_submit_take', g.code, g.players[0].token, `${R2}a.webm`, 99999, 1)).ok, true)
  const { rows } = await db.query(`select duration from guesswho_takes where user_id = 'u0'`)
  assert.equal(rows[0].duration, 60)
})

// ── Règles ───────────────────────────────────────────────────────────────────

test('double élimination : deux joueurs à 0 vie → deux gages différents, puis fin', async () => {
  const { db, g } = await toRecord(4)
  await db.query(`update guesswho_players set lives = 1 where user_id in ('u2', 'u3')`)
  await take(db, g, 0); await take(db, g, 1)
  await next(db, g) // → vote (u2 et u3 sans imitation)
  await vote(db, g, 0, 'u1'); await vote(db, g, 1, 'u0')
  await next(db, g) // → result
  assert.deepEqual([...(await room(db)).last_result.losers].sort(), ['u2', 'u3'])
  await next(db, g) // → gage
  const r = await room(db)
  assert.equal(r.phase, 'gage')
  assert.deepEqual(r.gage_result.map((x) => x.user_id).sort(), ['u2', 'u3'])
  const gages = r.gage_result.map((x) => x.gage)
  assert.notEqual(gages[0], gages[1])
  for (const x of r.gage_result) assert.notEqual(x.gage, `gage de ${x.user_id}`)
  await next(db, g)
  assert.equal((await room(db)).phase, 'end')
})

test('égalité générale au vote → revote entre tous → personne ne revote → tous perdent', async () => {
  const { db, g } = await toRecord()
  for (const i of [0, 1, 2]) await take(db, g, i)
  await next(db, g)
  await vote(db, g, 0, 'u1'); await vote(db, g, 1, 'u2'); await vote(db, g, 2, 'u0')
  await next(db, g)
  const r = await room(db)
  assert.equal(r.phase, 'revote')
  assert.equal(r.tied.length, 3)
  assert.equal((await vote(db, g, 0, 'u0')).error, 'self')
  await next(db, g)
  assert.deepEqual((await players(db)).map((p) => p.lives), [1, 1, 1])
})

test("revote : on ne vote que pour un ex aequo ; vote modifiable jusqu'à la fin", async () => {
  const { db, g } = await toRecord(4)
  for (const i of [0, 1, 2, 3]) await take(db, g, i)
  await next(db, g)
  await vote(db, g, 0, 'u1'); await vote(db, g, 1, 'u0'); await vote(db, g, 2, 'u0'); await vote(db, g, 3, 'u1')
  await next(db, g) // revote u2 / u3
  assert.equal((await vote(db, g, 2, 'u0')).error, 'invalid_target')
  await vote(db, g, 0, 'u2'); await vote(db, g, 0, 'u3'); await vote(db, g, 1, 'u3')
  await next(db, g)
  assert.deepEqual((await room(db)).last_result.losers, ['u2'])
})

test('nombre de tours limité : verdict final au dernier tour sans éliminé', async () => {
  const { db, g } = await toRecord(3, { rounds: 3, lives: 3 })
  assert.equal((await room(db)).settings.rounds, 3)
  await playRound(db, g, 'u2'); await next(db, g); await next(db, g) // tour 1 : u2 3 → 2
  await playRound(db, g, 'u1'); await next(db, g); await next(db, g) // tour 2 : u1 3 → 2
  await playRound(db, g, 'u2') // tour 3 : u2 2 → 1
  assert.equal((await room(db)).round, 3)
  await next(db, g) // result → verdict final → gage
  const r = await room(db)
  assert.equal(r.phase, 'gage')
  assert.deepEqual(r.last_result.final, ['u2'])
  assert.deepEqual(r.gage_result.map((x) => x.user_id), ['u2'])
})

test('tours : 0 = illimité, sinon borné entre 3 et 30', async () => {
  for (const [asked, kept] of [[undefined, 0], [1, 3], [99, 30], [5, 5], ['x', 0]]) {
    const { db } = await started(3, asked === undefined ? {} : { rounds: asked })
    assert.equal((await room(db)).settings.rounds, kept, String(asked))
  }
})

test('chrono lent : durées × 1,5 et durée totale exposée', async () => {
  const { db, g } = await started(3, { speed: 'slow' })
  assert.equal((await room(db)).phase_secs, 45, 'gages jamais modifiés')
  await next(db, g)
  const r = await room(db)
  assert.equal(r.phase_secs, 30)
  const left = (new Date(r.phase_ends_at) - Date.now()) / 1000
  assert.ok(left > 27 && left <= 30.5)
})

test('sons par type : openings seulement', async () => {
  const db = await freshDb()
  await seedClips(db, 3)
  await db.query(`insert into guesswho_clips(id, title, anime, lang, kind, url, duration, enabled)
                  values ('op1', 'OP', 'T', 'ja', 'opening', 'https://x/op1', 3, true)`)
  const g = await setupRoom(db, 3)
  await call(db, 'guesswho_start', g.code, g.players[0].token, { sounds: 'opening' })
  await next(db, g)
  assert.equal((await room(db)).clip.id, 'op1')
})

test("sons : jamais deux fois tant qu'il en reste, même après « Rejouer », puis le plus ancien", async () => {
  const db = await freshDb()
  await seedClips(db, 3)
  const g = await setupRoom(db, 3)
  await call(db, 'guesswho_start', g.code, g.players[0].token)
  await next(db, g)
  const first = (await room(db)).clip.id
  await call(db, 'guesswho_skip_clip', g.code, g.players[0].token)
  const second = (await room(db)).clip.id
  assert.notEqual(second, first)
  // fin forcée puis revanche : le 3e son n'a jamais été joué
  await db.query(`update guesswho_rooms set phase = 'end', status = 'ended'`)
  await call(db, 'guesswho_start', g.code, g.players[0].token)
  await next(db, g)
  const third = (await room(db)).clip.id
  assert.ok(![first, second].includes(third))
  // tout est joué : on reprend le plus ancien
  await call(db, 'guesswho_skip_clip', g.code, g.players[0].token)
  assert.equal((await room(db)).clip.id, first)
})

// ── Récap ────────────────────────────────────────────────────────────────────

test('stats : meilleure imitation par tour, plus voté, victoires, sans perte', async () => {
  const { db, g } = await toRecord(3)
  for (const i of [0, 1, 2]) await take(db, g, i)
  await next(db, g)
  await vote(db, g, 0, 'u1'); await vote(db, g, 1, 'u0'); await vote(db, g, 2, 'u1')
  await next(db, g) // result : u1 2 votes, u0 1, u2 0 → u2 perd
  const s = await call(db, 'guesswho_stats', g.code)
  assert.equal(s.rounds.length, 1)
  assert.equal(s.rounds[0].best.user_id, 'u1')
  assert.equal(s.rounds[0].best.votes, 2)
  assert.equal(s.rounds[0].best.audio_url, `${R2}1.webm`)
  assert.equal(s.rounds[0].clip.title.startsWith('Son'), true)
  assert.equal(s.awards.best_take.user_id, 'u1')
  assert.equal(s.awards.best_take.round, 1)
  assert.equal(s.awards.most_voted, 'u1')
  assert.equal(s.awards.most_wins, 'u1')
  assert.ok(['u0', 'u1'].includes(s.awards.untouchable))
  const u2 = s.players.find((p) => p.user_id === 'u2')
  assert.equal(u2.lives_lost, 1)
  assert.equal(u2.takes, 1)
  // le tour en cours (non résolu) n'apparaît jamais
  await next(db, g) // → listen tour 2
  await next(db, g) // → record
  await take(db, g, 0, 2)
  assert.equal((await call(db, 'guesswho_stats', g.code)).rounds.length, 1)
})

test('stats : partie sans vote → aucun prix inventé', async () => {
  const { db, g } = await toRecord()
  await next(db, g) // auto, personne n'a imité
  const s = await call(db, 'guesswho_stats', g.code)
  assert.equal(s.rounds.length, 1)
  assert.equal(s.awards.best_take, null)
  assert.equal(s.awards.most_voted, null)
})

test('nouvelles fonctions internes interdites à anon', async () => {
  const db = await freshDb()
  await db.exec('set role anon')
  for (const q of [`select _gw_step(gen_random_uuid())`, `select _gw_auto_host(gen_random_uuid())`,
    `select _gw_final_verdict(gen_random_uuid())`, `select _gw_clean_name('x')`]) {
    await assert.rejects(db.query(q), q)
  }
  await db.query(`select guesswho_sync('ABCD', null)`)
  await db.exec('reset role')
})

test('migration recollée deux fois : sans erreur', async () => {
  const db = await freshDb()
  const { readFileSync } = await import('node:fs')
  await db.exec(readFileSync(new URL('../../../../supabase/migrations/20261002b_guess_who_robuste.sql', import.meta.url), 'utf8'))
})
