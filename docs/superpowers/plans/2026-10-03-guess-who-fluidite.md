# Guess Who — fluidité : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revanche qui n'éjecte plus les joueurs en veille, alerte navigateur intégré dès le salon, avance anticipée par n'importe quel joueur, journal d'erreurs côté serveur.

**Architecture:** Une migration SQL additive (`20261003_guess_who_revanche.sql`) redéfinit `guesswho_start`, `_gw_step`, `guesswho_advance` et ajoute `guesswho_events` + `guesswho_log`. Côté client : deux fonctions pures testées (`logic/device.js`, `openInBrowserHint`), un module d'envoi fire-and-forget (`src/lib/guessWhoLog.js`) et des retouches de `EndScreen`, `Lobby`, `RecordPhase`, `MicSetup`, `useGuessWhoRoom`.

**Tech Stack:** Vite + React (inline styles uniquement), Supabase (RPC PL/pgSQL `security definer`), PGlite pour les tests SQL, `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-03-guess-who-fluidite-design.md`

## Global Constraints

- Brams = inline styles only ; réutiliser les composants de `manga.jsx` (`Btn`, `PhaseFrame`, `C`, `type`, `FONT_*`).
- Migration additive, recollable deux fois sans erreur ; le client marche sans elle (prêt masqué si `unsupported`, journal silencieux).
- Fenêtre de présence : 22 s au salon (inchangé), 90 s ou `ready = true` pour une revanche depuis `end`.
- `guesswho_log` : types `mic_error`, `upload_failed`, `start_refused`, `offline`, `record_timeout` ; `detail` ≤ 500, `device` ≤ 80, `room_code` ≤ 8, `user_id` ≤ 64 ; 20 événements / salon / minute ; purge > 30 jours.
- Journal : jamais d'audio, d'IP ni de pseudo.
- Textes UI en français, ton du jeu (tutoiement).

## Review Focus

1. Hôte lui-même en veille au moment de « Revanche » : il est toujours compté (sa présence est rafraîchie par l'appel) — couvert par le test « hôte revenant de veille ».
2. Joueur prêt puis parti (onglet fermé 5 min) : il reste dans la revanche et perd ses vies hors ligne, comportement accepté (il était prêt) — pas de test supplémentaire, noté.
3. Base sans la migration : `guesswho_log` absent → `logEvent` ne lève jamais et ne réessaie pas — test client `logEvent` avec RPC en échec.
4. `navigator.userAgent` vide ou inattendu : `deviceSummary` et `openInBrowserHint` renvoient une valeur par défaut — testés.
5. Double clic « Revanche » / deux joueurs qui avancent en même temps : idempotence serveur (`phase`, `stale`) — test de double avance.

---

## File Structure

| Fichier | Rôle |
|---|---|
| `supabase/migrations/20261003_guess_who_revanche.sql` (créer) | Revanche, avance sans hôte, journal |
| `src/features/guesswho/sql/testDb.js` (modifier) | Ajouter la migration à `MIGRATIONS` |
| `src/features/guesswho/sql/revanche.test.js` (créer) | Tests PGlite de la migration |
| `src/features/guesswho/logic/clock.js` + `.test.js` (modifier) | `shouldAdvance` : non-hôte avance si tout le monde a fini |
| `src/features/guesswho/logic/device.js` + `.test.js` (créer) | `deviceSummary(ua)` |
| `src/features/guesswho/logic/recordFlow.js` + `.test.js` (modifier) | `openInBrowserHint(ua)` |
| `src/lib/guessWhoLogCore.js` (créer) | `makeLogger(rpc, ua)` — cœur testable sans Supabase |
| `src/lib/guessWhoLog.js` (créer) | `logEvent(code, userId, kind, detail)` branché sur `sbRpc` |
| `src/features/guesswho/EndScreen.jsx` (modifier) | Prêt pour la revanche + compteur + log refus |
| `src/features/guesswho/Lobby.jsx` (modifier) | Bandeau navigateur intégré + log refus |
| `src/features/guesswho/RecordPhase.jsx` (modifier) | Logs micro / envoi / prise non envoyée |
| `src/features/guesswho/MicSetup.jsx` (modifier) | Log micro |
| `src/features/guesswho/useGuessWhoRoom.js` (modifier) | Log coupure réseau |
| `docs/sql/guess-who-events.sql` (créer) | Requêtes de lecture du journal |

---

### Task 1: Revanche côté serveur

**Files:**
- Create: `supabase/migrations/20261003_guess_who_revanche.sql`
- Modify: `src/features/guesswho/sql/testDb.js:9`
- Test: `src/features/guesswho/sql/revanche.test.js`

**Interfaces:**
- Consumes: `freshDb`, `call`, `setupRoom`, `expirePhase`, `seedClips` (testDb.js) ; `_gw_player`, `_gw_set_phase`, `_gw_begin_round`, `_gw_resolve`, `_gw_final_verdict`, `_gw_draw_gages` (migrations existantes).
- Produces: `guesswho_start(text, uuid, jsonb)` (même signature), `_gw_step(uuid)` (même signature).

- [ ] **Step 1: Ajouter la migration (vide) à la liste de test**

`src/features/guesswho/sql/testDb.js`, ligne 9 :

```js
export const MIGRATIONS = ['20261001_guess_who.sql', '20261002_guess_who_modes.sql', '20261002b_guess_who_robuste.sql', '20261003_guess_who_revanche.sql']
```

Créer `supabase/migrations/20261003_guess_who_revanche.sql` avec seulement l'en-tête :

```sql
-- Guess Who — revanche sans éjection, avance anticipée par tous, journal d'erreurs.
-- À coller dans l'éditeur SQL Supabase APRÈS 20261002b. Recollable sans risque.
```

- [ ] **Step 2: Écrire les tests qui échouent**

Créer `src/features/guesswho/sql/revanche.test.js` :

```js
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

test('salon d\'attente : toujours 22 s', async () => {
  const db = await freshDb()
  await seedClips(db)
  const g = await setupRoom(db, 3)
  await stale(db, 'u2', 60)
  const r = await call(db, 'guesswho_start', g.code, g.players[0].token, {})
  assert.equal(r.error, 'not_enough_players')
})

test('arrivée à l\'écran de fin : prêts remis à zéro', async () => {
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
```

- [ ] **Step 3: Lancer les tests, vérifier l'échec**

Run: `node --test src/features/guesswho/sql/revanche.test.js`
Expected: FAIL sur « joueur en veille 60 s gardé » (`not_enough_players`), « prêt en veille 3 min » et « prêts remis à zéro ».

- [ ] **Step 4: Écrire la revanche dans la migration**

Ajouter à `supabase/migrations/20261003_guess_who_revanche.sql` :

```sql
-- ── Revanche ─────────────────────────────────────────────────────────────────
-- Depuis l'écran de fin, un iPhone verrouillé sur le podium ne signale plus sa
-- présence : on compte « prêt » OU vu depuis 90 s, et on ne retire que les
-- absents non prêts. Le salon d'attente garde sa fenêtre de 22 s.
create or replace function guesswho_start(p_code text, p_token uuid, p_settings jsonb default '{}'::jsonb)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_pl guesswho_players; v_room guesswho_rooms; v_n int; v_lives int; v_rounds int; v_settings jsonb;
        s jsonb := coalesce(p_settings, '{}'::jsonb); v_win interval;
begin
  select * into v_pl from _gw_player(p_code, p_token);
  if v_pl.id is null or not v_pl.is_host then return jsonb_build_object('error', 'unauthorized'); end if;
  select * into v_room from guesswho_rooms where id = v_pl.room_id for update;
  if v_room.phase not in ('lobby', 'end') then return jsonb_build_object('error', 'phase'); end if;
  v_win := case when v_room.phase = 'end' then interval '90 seconds' else interval '22 seconds' end;
  update guesswho_players set last_seen = now() where id = v_pl.id;
  select count(*) into v_n from guesswho_players
    where room_id = v_room.id and (last_seen > now() - v_win or (v_room.phase = 'end' and ready));
  if v_n < 3 then return jsonb_build_object('error', 'not_enough_players'); end if;
  delete from guesswho_players
    where room_id = v_room.id and not is_host and last_seen <= now() - v_win
      and not (v_room.phase = 'end' and ready);
  if v_n > 8 then return jsonb_build_object('error', 'too_many_players'); end if;

  v_lives := case when jsonb_typeof(s->'lives') = 'number' then greatest(1, least(5, (s->>'lives')::numeric::int)) else 2 end;
  v_rounds := case when jsonb_typeof(s->'rounds') = 'number' then (s->>'rounds')::numeric::int else 0 end;
  v_rounds := case when v_rounds <= 0 then 0 else greatest(3, least(30, v_rounds)) end;
  v_settings := jsonb_build_object(
    'lives', v_lives,
    'speed', case when s->>'speed' in ('fast', 'slow') then s->>'speed' else 'normal' end,
    'sounds', case when s->>'sounds' in ('fr', 'ja', 'bankai', 'technique', 'opening', 'meme') then s->>'sounds' else 'all' end,
    'rounds', v_rounds);

  with o as (select id, row_number() over (order by joined_at) - 1 as rn
             from guesswho_players where room_id = v_room.id)
  update guesswho_players p set seat = o.rn, lives = v_lives, total_votes = 0, gage = null, ready = false
    from o where p.id = o.id;
  delete from guesswho_takes where room_id = v_room.id;
  delete from guesswho_votes where room_id = v_room.id;
  -- used_clips conservé : une revanche dans le même salon ne rejoue pas les mêmes sons.
  update guesswho_rooms set status = 'playing', round = 0, clip = null, history = '[]'::jsonb, gage_pool = null,
    tied = '{}', last_result = null, gage_result = null, settings = v_settings where id = v_room.id;
  perform _gw_set_phase(v_room.id, 'gages');
  return jsonb_build_object('ok', true, 'players', v_n, 'settings', v_settings);
end $$;

-- Arrivée à l'écran de fin : « prêts » remis à zéro (ceux du salon ne comptent pas).
create or replace function _gw_step(p_room uuid)
  returns void language plpgsql security definer set search_path = public as $$
declare r guesswho_rooms; v_max int;
begin
  select * into r from guesswho_rooms where id = p_room;
  if r.phase = 'gages' then
    perform _gw_begin_round(r.id);
  elsif r.phase = 'listen' then
    perform _gw_set_phase(r.id, 'record');
  elsif r.phase = 'record' then
    if (select count(*) from guesswho_takes where room_id = r.id and round = r.round) >= 2 then
      perform _gw_set_phase(r.id, 'vote');
    else
      perform _gw_resolve(r.id, 'auto');
    end if;
  elsif r.phase = 'vote' then
    perform _gw_resolve(r.id, 'vote');
  elsif r.phase = 'revote' then
    perform _gw_resolve(r.id, 'revote');
  elsif r.phase = 'result' then
    v_max := coalesce((r.settings->>'rounds')::int, 0);
    if v_max > 0 and r.round >= v_max
       and not exists (select 1 from guesswho_players where room_id = r.id and seat is not null and lives <= 0) then
      perform _gw_final_verdict(r.id);
    end if;
    if exists (select 1 from guesswho_players where room_id = r.id and seat is not null and lives <= 0) then
      perform _gw_draw_gages(r.id);
    else
      perform _gw_begin_round(r.id);
    end if;
  elsif r.phase = 'gage' then
    update guesswho_players set ready = false where room_id = r.id;
    update guesswho_rooms set status = 'ended', phase = 'end', phase_ends_at = null, phase_secs = null, updated_at = now()
      where id = r.id;
  end if;
end $$;

revoke execute on function _gw_step(uuid) from public, anon, authenticated;
grant execute on function guesswho_start(text, uuid, jsonb) to anon, authenticated;
```

- [ ] **Step 5: Relancer les tests**

Run: `node --test src/features/guesswho/sql/revanche.test.js src/features/guesswho/sql/robuste.test.js`
Expected: PASS (8 + 30 tests).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261003_guess_who_revanche.sql src/features/guesswho/sql/testDb.js src/features/guesswho/sql/revanche.test.js
git commit -m "feat(guess-who): revanche sans éjection des joueurs en veille (serveur)"
```

---

### Task 2: Avance anticipée par n'importe quel joueur

**Files:**
- Modify: `supabase/migrations/20261003_guess_who_revanche.sql` (ajout en fin)
- Modify: `src/features/guesswho/logic/clock.js:23-27`, `src/features/guesswho/logic/clock.test.js:11-18`
- Test: `src/features/guesswho/sql/revanche.test.js`

**Interfaces:**
- Consumes: `_gw_all_done(uuid)` (20261001), `_gw_step(uuid)` (Task 1).
- Produces: `guesswho_advance(text, uuid, text, int)` (même signature) ; `shouldAdvance({ endsAtMs, nowMs, isHost, done })` (même signature, comportement élargi).

- [ ] **Step 1: Tests qui échouent (serveur)**

Ajouter à `revanche.test.js` :

```js
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
```

- [ ] **Step 2: Vérifier l'échec**

Run: `node --test src/features/guesswho/sql/revanche.test.js`
Expected: FAIL sur « un non-hôte avance quand tout le monde a fini » (`too_early`).

- [ ] **Step 3: Implémenter côté serveur**

Ajouter à la migration :

```sql
-- ── Avance anticipée par n'importe quel joueur ───────────────────────────────
-- Tout le monde a fini : n'importe quel joueur peut avancer (l'hôte en veille ne
-- bloque plus la partie). À l'échéance : l'hôte, puis tout le monde à +5 s.
create or replace function guesswho_advance(p_code text, p_token uuid, p_expected_phase text, p_expected_round int)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_pl guesswho_players; r guesswho_rooms; v_due boolean; v_late boolean;
begin
  select * into v_pl from _gw_player(p_code, p_token);
  if v_pl.id is null then return jsonb_build_object('error', 'unauthorized'); end if;
  select * into r from guesswho_rooms where id = v_pl.room_id for update;
  if r.phase <> p_expected_phase or r.round <> p_expected_round then
    return jsonb_build_object('ok', false, 'reason', 'stale');
  end if;
  if r.phase in ('lobby', 'end') then return jsonb_build_object('error', 'phase'); end if;
  v_due  := r.phase_ends_at is not null and now() >= r.phase_ends_at;
  v_late := r.phase_ends_at is not null and now() >= r.phase_ends_at + interval '5 seconds';
  if not ((v_pl.is_host and v_due) or _gw_all_done(r.id) or v_late) then
    return jsonb_build_object('ok', false, 'reason', 'too_early',
      'wait_ms', greatest(0, round(extract(epoch from (r.phase_ends_at - now())) * 1000)));
  end if;
  perform _gw_step(r.id);
  return jsonb_build_object('ok', true, 'phase', (select phase from guesswho_rooms where id = r.id));
end $$;

grant execute on function guesswho_advance(text, uuid, text, int) to anon, authenticated;
```

- [ ] **Step 4: Test client qui échoue**

`src/features/guesswho/logic/clock.test.js`, remplacer le test `shouldAdvance` (lignes 11-18) :

```js
test('shouldAdvance : tout le monde a fini → tous ; échéance → hôte, autres après +6 s', () => {
  assert.equal(shouldAdvance({ endsAtMs: 10_000, nowMs: 9_000, isHost: true, done: false }), false)
  assert.equal(shouldAdvance({ endsAtMs: 10_000, nowMs: 9_000, isHost: true, done: true }), true)
  assert.equal(shouldAdvance({ endsAtMs: 10_000, nowMs: 10_000, isHost: true, done: false }), true)
  assert.equal(shouldAdvance({ endsAtMs: 10_000, nowMs: 9_000, isHost: false, done: true }), true)
  assert.equal(shouldAdvance({ endsAtMs: 10_000, nowMs: 15_000, isHost: false, done: false }), false)
  assert.equal(shouldAdvance({ endsAtMs: 10_000, nowMs: 16_000, isHost: false, done: false }), true)
  assert.equal(shouldAdvance({ endsAtMs: null, nowMs: 99_000, isHost: true, done: true }), false)
})
```

Run: `node --test src/features/guesswho/logic/clock.test.js`
Expected: FAIL (non-hôte avec `done: true` renvoie `false`).

- [ ] **Step 5: Implémenter côté client**

`src/features/guesswho/logic/clock.js:23-27` :

```js
export function shouldAdvance({ endsAtMs, nowMs, isHost, done }) {
  if (endsAtMs == null) return false
  if (done) return true // le serveur accepte n'importe quel joueur quand tout le monde a fini
  if (isHost) return nowMs >= endsAtMs
  return nowMs >= endsAtMs + 6000
}
```

Sans la migration, le serveur répond `too_early` et `advanceRetryMs` espace déjà les tentatives : rien d'autre à changer.

- [ ] **Step 6: Lancer les tests**

Run: `node --test src/features/guesswho/logic/clock.test.js src/features/guesswho/sql/revanche.test.js src/features/guesswho/sql/flow.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261003_guess_who_revanche.sql src/features/guesswho/sql/revanche.test.js src/features/guesswho/logic/clock.js src/features/guesswho/logic/clock.test.js
git commit -m "feat(guess-who): n'importe quel joueur avance quand tout le monde a fini"
```

---

### Task 3: Journal d'erreurs côté serveur

**Files:**
- Modify: `supabase/migrations/20261003_guess_who_revanche.sql` (ajout en fin)
- Create: `docs/sql/guess-who-events.sql`
- Test: `src/features/guesswho/sql/revanche.test.js`

**Interfaces:**
- Produces: table `guesswho_events(id, at, room_code, user_id, kind, detail, device)` ; `guesswho_log(p_code text, p_user text, p_kind text, p_detail text default null, p_device text default null) returns jsonb` → `{ok:true}` | `{error:'kind'}` | `{error:'rate'}`.

- [ ] **Step 1: Tests qui échouent**

Ajouter à `revanche.test.js` :

```js
const log = (db, kind, detail = 'x', code = 'ABCD') => call(db, 'guesswho_log', code, 'u0', kind, detail, 'iPhone · Safari 17')

test('journal : type connu enregistré, inconnu refusé', async () => {
  const db = await freshDb()
  assert.equal((await log(db, 'mic_error', 'mic_busy')).ok, true)
  assert.equal((await log(db, 'hack')).error, 'kind')
  const { rows } = await db.query(`select kind, detail, device, room_code from guesswho_events`)
  assert.deepEqual(rows, [{ kind: 'mic_error', detail: 'mic_busy', device: 'iPhone · Safari 17', room_code: 'ABCD' }])
})

test('journal : 20 par salon et par minute, détail tronqué à 500', async () => {
  const db = await freshDb()
  for (let i = 0; i < 20; i++) assert.equal((await log(db, 'offline', 'y'.repeat(900))).ok, true)
  assert.equal((await log(db, 'offline')).error, 'rate')
  assert.equal((await log(db, 'offline', 'z', 'WXYZ')).ok, true)
  const { rows } = await db.query(`select max(length(detail)) as n from guesswho_events`)
  assert.equal(rows[0].n, 500)
})

test('journal : purge au-delà de 30 jours', async () => {
  const db = await freshDb()
  await log(db, 'offline')
  await db.query(`update guesswho_events set at = now() - interval '31 days'`)
  await log(db, 'offline', 'neuf', 'WXYZ')
  const { rows } = await db.query(`select detail from guesswho_events`)
  assert.deepEqual(rows.map((r) => r.detail), ['neuf'])
})

test('journal : table illisible pour anon, fonction appelable', async () => {
  const db = await freshDb()
  const { rows } = await db.query(`select relrowsecurity from pg_class where relname = 'guesswho_events'`)
  assert.equal(rows[0].relrowsecurity, true)
  await db.exec('set role anon')
  await assert.rejects(db.query(`select * from guesswho_events`))
  await db.query(`select guesswho_log('ABCD', 'u0', 'offline', '9s', 'PC · Chrome 129')`)
  await db.exec('reset role')
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `node --test src/features/guesswho/sql/revanche.test.js`
Expected: FAIL (`function guesswho_log does not exist`).

- [ ] **Step 3: Implémenter**

Ajouter à la migration :

```sql
-- ── Journal d'erreurs ────────────────────────────────────────────────────────
-- Lu seulement par le staff dans Supabase (docs/sql/guess-who-events.sql).
-- Pas d'audio, pas d'IP, pas de pseudo.
create table if not exists guesswho_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  room_code text,
  user_id text,
  kind text not null,
  detail text,
  device text
);
create index if not exists guesswho_events_at_idx on guesswho_events (at);
create index if not exists guesswho_events_room_at_idx on guesswho_events (room_code, at);
alter table guesswho_events enable row level security; -- aucune policy : illisible côté site
revoke all on guesswho_events from anon, authenticated;

create or replace function guesswho_log(p_code text, p_user text, p_kind text, p_detail text default null, p_device text default null)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_code text := upper(left(coalesce(p_code, ''), 8));
begin
  if p_kind is null or p_kind not in ('mic_error', 'upload_failed', 'start_refused', 'offline', 'record_timeout') then
    return jsonb_build_object('error', 'kind');
  end if;
  if (select count(*) from guesswho_events where room_code = v_code and at > now() - interval '1 minute') >= 20 then
    return jsonb_build_object('error', 'rate');
  end if;
  delete from guesswho_events where at < now() - interval '30 days';
  insert into guesswho_events (room_code, user_id, kind, detail, device)
    values (v_code, left(p_user, 64), p_kind, left(p_detail, 500), left(p_device, 80));
  return jsonb_build_object('ok', true);
end $$;

grant execute on function guesswho_log(text, text, text, text, text) to anon, authenticated;
```

- [ ] **Step 4: Relancer**

Run: `node --test src/features/guesswho/sql/`
Expected: PASS (toutes les suites SQL, dont « recollée deux fois »).

- [ ] **Step 5: Requêtes de lecture**

Créer `docs/sql/guess-who-events.sql` :

```sql
-- Guess Who — lire le journal d'erreurs (éditeur SQL Supabase).

-- Erreurs par type et appareil, 7 derniers jours
select kind, device, count(*) as n, max(at) as dernier
from guesswho_events
where at > now() - interval '7 days'
group by kind, device
order by n desc;

-- Détail des erreurs micro, 7 derniers jours
select detail, device, count(*) as n
from guesswho_events
where kind = 'mic_error' and at > now() - interval '7 days'
group by detail, device
order by n desc;

-- Tous les événements d'un salon (remplacer ABCD)
select at, user_id, kind, detail, device
from guesswho_events
where room_code = 'ABCD'
order by at desc
limit 200;
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261003_guess_who_revanche.sql src/features/guesswho/sql/revanche.test.js docs/sql/guess-who-events.sql
git commit -m "feat(guess-who): journal d'erreurs côté serveur (guesswho_events, guesswho_log)"
```

---

### Task 4: Fonctions pures appareil et consigne navigateur

**Files:**
- Create: `src/features/guesswho/logic/device.js`, `src/features/guesswho/logic/device.test.js`
- Modify: `src/features/guesswho/logic/recordFlow.js` (après `inAppBrowser`), `src/features/guesswho/logic/recordFlow.test.js`

**Interfaces:**
- Produces: `deviceSummary(ua: string) → string` (≤ 80 car., ex. `iPhone · Safari 17`) ; `openInBrowserHint(ua: string) → string`.

- [ ] **Step 1: Tests qui échouent**

Créer `src/features/guesswho/logic/device.test.js` :

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deviceSummary } from './device.js'

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IPHONE_DISCORD = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Discord/240.0'
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'
const PC_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
const PC_EDGE = PC_CHROME + ' Edg/129.0.0.0'
const PC_FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0'

test('deviceSummary : appareil · navigateur version', () => {
  assert.equal(deviceSummary(IPHONE_SAFARI), 'iPhone · Safari 17')
  assert.equal(deviceSummary(IPHONE_DISCORD), 'iPhone · Discord')
  assert.equal(deviceSummary(ANDROID_CHROME), 'Android · Chrome 129')
  assert.equal(deviceSummary(PC_CHROME), 'PC · Chrome 129')
  assert.equal(deviceSummary(PC_EDGE), 'PC · Edge 129')
  assert.equal(deviceSummary(PC_FIREFOX), 'PC · Firefox 131')
})

test('deviceSummary : UA vide ou inconnu', () => {
  assert.equal(deviceSummary(''), 'Inconnu · Autre')
  assert.equal(deviceSummary(undefined), 'Inconnu · Autre')
  assert.ok(deviceSummary('x'.repeat(500)).length <= 80)
})
```

Ajouter à `recordFlow.test.js` (et importer `openInBrowserHint` dans la ligne d'import) :

```js
test('openInBrowserHint : consigne selon l\'appareil', () => {
  assert.match(openInBrowserHint('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Discord/240'), /Safari/)
  assert.match(openInBrowserHint('Mozilla/5.0 (Linux; Android 14) Discord/240'), /Chrome/)
  assert.match(openInBrowserHint('Mozilla/5.0 (Windows NT 10.0) Discord/240'), /navigateur/)
  assert.match(openInBrowserHint(''), /navigateur/)
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `node --test src/features/guesswho/logic/device.test.js src/features/guesswho/logic/recordFlow.test.js`
Expected: FAIL (modules / export manquants).

- [ ] **Step 3: Implémenter**

Créer `src/features/guesswho/logic/device.js` :

```js
// Résumé court de l'appareil pour le journal d'erreurs (jamais l'UA complet).
const APP = /(Discord|Instagram|FBAN|FBAV|Snapchat|TikTok|Twitter)/i

export function deviceSummary(ua) {
  const s = String(ua || '')
  const device = /iPhone|iPod/.test(s) ? 'iPhone' : /iPad/.test(s) ? 'iPad' : /Android/.test(s) ? 'Android'
    : /Windows|Macintosh|Linux|CrOS/.test(s) ? 'PC' : 'Inconnu'
  const app = s.match(APP)
  let browser = 'Autre'
  if (app) browser = /FBA[NV]/i.test(app[1]) ? 'Facebook' : app[1]
  else if (/Edg\/(\d+)/.test(s)) browser = `Edge ${s.match(/Edg\/(\d+)/)[1]}`
  else if (/Firefox\/(\d+)/.test(s)) browser = `Firefox ${s.match(/Firefox\/(\d+)/)[1]}`
  else if (/Chrome\/(\d+)/.test(s)) browser = `Chrome ${s.match(/Chrome\/(\d+)/)[1]}`
  else if (/Version\/(\d+).*Safari/.test(s)) browser = `Safari ${s.match(/Version\/(\d+)/)[1]}`
  return `${device} · ${browser}`.slice(0, 80)
}
```

Dans `src/features/guesswho/logic/recordFlow.js`, après `inAppBrowser` :

```js
// Consigne pour sortir du navigateur intégré (le micro y est souvent bloqué).
export function openInBrowserHint(ua) {
  const s = String(ua || '')
  if (/iPhone|iPad|iPod/.test(s)) return 'Touche ⋯ puis « Ouvrir dans Safari ».'
  if (/Android/.test(s)) return 'Touche ⋮ puis « Ouvrir dans Chrome ».'
  return 'Copie le lien et colle-le dans ton navigateur.'
}
```

- [ ] **Step 4: Relancer**

Run: `node --test src/features/guesswho/logic/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/guesswho/logic/device.js src/features/guesswho/logic/device.test.js src/features/guesswho/logic/recordFlow.js src/features/guesswho/logic/recordFlow.test.js
git commit -m "feat(guess-who): résumé d'appareil et consigne « ouvrir dans le navigateur »"
```

---

### Task 5: Envoi du journal côté client et points d'appel

**Files:**
- Create: `src/lib/guessWhoLogCore.js`, `src/lib/guessWhoLog.js`, `src/lib/guessWhoLog.test.js`
- Modify: `src/features/guesswho/Lobby.jsx` (fonction `start`), `src/features/guesswho/EndScreen.jsx` (fonction `replay`), `src/features/guesswho/RecordPhase.jsx` (`begin`, `send`, démontage), `src/features/guesswho/MicSetup.jsx:77-78`, `src/features/guesswho/useGuessWhoRoom.js` (après le state `offline`)
- Modify: `package.json` script `test` (ajouter `src/lib/guessWhoLog.test.js`)

**Interfaces:**
- Consumes: `deviceSummary` (Task 4) ; `guesswho_log` (Task 3) ; `sbRpc(fn, args, { timeout, tag })` (`src/lib/supabaseRest.js`).
- Produces: `logEvent(code: string, userId: string|null, kind: string, detail?: string) → void` (ne lève jamais, ne renvoie rien d'attendu) ; `makeLogger(rpc, ua) → logEvent` (pour les tests).

- [ ] **Step 1: Test qui échoue**

Créer `src/lib/guessWhoLog.test.js` :

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeLogger } from './guessWhoLogCore.js'

test('logEvent : envoie code, joueur, type, détail, appareil', async () => {
  const calls = []
  const log = makeLogger(async (fn, args) => { calls.push([fn, args]); return { ok: true } }, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Version/17.5 Safari/604.1')
  await log('abcd', 'u1', 'mic_error', 'mic_busy')
  assert.deepEqual(calls, [['guesswho_log', { p_code: 'abcd', p_user: 'u1', p_kind: 'mic_error', p_detail: 'mic_busy', p_device: 'iPhone · Safari 17' }]])
})

test('logEvent : RPC qui échoue ou lève → silencieux', async () => {
  const log = makeLogger(async () => { throw new Error('réseau') }, '')
  await assert.doesNotReject(log('ABCD', null, 'offline', '12s'))
  const log2 = makeLogger(async () => ({ ok: false, error: 'function guesswho_log does not exist' }), '')
  await assert.doesNotReject(log2('ABCD', null, 'offline', '12s'))
})
```

Le cœur testable est séparé de l'import Supabase (qui dépend de `import.meta.env`, absent sous `node --test`).

Run: `node --test src/lib/guessWhoLog.test.js`
Expected: FAIL (module manquant).

- [ ] **Step 2: Implémenter**

Créer `src/lib/guessWhoLogCore.js` :

```js
// Cœur du journal Guess Who (sans dépendance Supabase, testable sous node).
import { deviceSummary } from '../features/guesswho/logic/device.js'

export function makeLogger(rpc, ua) {
  const device = deviceSummary(ua)
  return async function logEvent(code, userId, kind, detail = '') {
    try {
      await rpc('guesswho_log', { p_code: String(code || ''), p_user: userId ? String(userId) : null, p_kind: kind, p_detail: String(detail || ''), p_device: device })
    } catch { /* le journal ne doit jamais gêner le jeu */ }
  }
}
```

Créer `src/lib/guessWhoLog.js` :

```js
// Journal d'erreurs Guess Who : envoi en tâche de fond, jamais bloquant.
// Appel : logEvent(code, userId, 'mic_error', 'mic_busy') — sans await.
import { sbRpc } from './supabaseRest.js'
import { makeLogger } from './guessWhoLogCore.js'

export const logEvent = makeLogger(
  (fn, args) => sbRpc(fn, args, { timeout: 4000, tag: 'guesswho-log' }),
  typeof navigator !== 'undefined' ? navigator.userAgent : '',
)
```

Ajouter `src/lib/guessWhoLog.test.js` au script `test` de `package.json` (après `src/lib/mediaMerge.test.js`).

Run: `node --test src/lib/guessWhoLog.test.js`
Expected: PASS.

- [ ] **Step 3: Points d'appel**

`Lobby.jsx` — import `import { logEvent } from '../../lib/guessWhoLog.js'`, puis dans `start` :

```js
  const start = async () => {
    setBusy(true); setMsg(null)
    const r = await g.act.start(cleanSettings(settings, options))
    setMsg(startErrorText(r))
    if (r?.error) logEvent(code, g.me?.user_id, 'start_refused', `lobby:${r.error}`)
    setBusy(false)
  }
```

`EndScreen.jsx` — même import, puis `replay` :

```js
  const replay = async () => {
    setBusy(true); setReplayErr(null)
    const r = await g.act.start(g.room?.settings)
    setReplayErr(startErrorText(r))
    if (r?.error) logEvent(g.room?.code, g.me?.user_id, 'start_refused', `revanche:${r.error}`)
    setBusy(false)
  }
```

`RecordPhase.jsx` — import, puis :

- dans `begin`, bloc `catch (e)` de `getStream` :

```js
    } catch (e) {
      logEvent(gRef.current.room?.code, gRef.current.me?.user_id, 'mic_error', micError(e))
      if (alive()) { setErr(MESSAGES[micError(e)] || MESSAGES.mic_denied); setRec('idle') }
      return
    }
```

- dans `begin`, bloc `catch` de `startRecorder` : ajouter en première ligne
  `logEvent(gRef.current.room?.code, gRef.current.me?.user_id, 'mic_error', 'rec_failed')`
- dans `send`, remplacer la dernière ligne :

```js
    if (r?.ok) { setSentId(t.id); setAutoSent(auto); buzz(20) }
    else {
      setErr(MESSAGES[r?.error] || MESSAGES.upload_failed)
      logEvent(gRef.current.room?.code, gRef.current.me?.user_id, 'upload_failed', String(r?.error || 'unknown'))
    }
```

- prise jamais envoyée : ajouter deux refs et compléter l'effet de démontage existant :

```js
  const takeRef = useRef(null)
  takeRef.current = take
  const sentRef = useRef(null)
  sentRef.current = sentId
```

```js
  useEffect(() => () => {
    const gg = gRef.current
    if (gg.me && gg.me.lives > 0 && sentRef.current == null) {
      logEvent(gg.room?.code, gg.me.user_id, 'record_timeout', takeRef.current ? 'not_sent' : 'no_take')
    }
    flow.current.n++
    recRef.current?.stop()
    if (held.current) { releaseMic(); held.current = false }
    pauseSound()
    previews.current.forEach((u) => URL.revokeObjectURL(u))
  }, [])
```

(placer les refs avant cet effet).

`MicSetup.jsx` (ligne 77-78) — `MicSetup` n'a pas `g` : ajouter une prop facultative `onError` et l'appeler :

```js
    } catch (e) {
      onError?.(micError(e))
      setError(ERRORS[micError(e)] || ERRORS.mic_denied)
```

signature : `export default function MicSetup({ onError } = {})`. Dans `Lobby.jsx` :
`<MicSetup onError={(c) => logEvent(code, g.me?.user_id, 'mic_error', `setup:${c}`)} />`
(et dans `RecordPhase.jsx`, là où `MicSetup` est rendu, la même prop avec `gRef.current`).

`useGuessWhoRoom.js` — import `import { logEvent } from '../../lib/guessWhoLog.js'`, après la déclaration de `offline` :

```js
  // Journal : durée de chaque coupure (> 8 s, seuil de `offline`).
  const offlineSince = useRef(null)
  useEffect(() => {
    if (offline) { offlineSince.current = Date.now() - OFFLINE_AFTER_MS; return }
    if (offlineSince.current == null) return
    const s = Math.round((Date.now() - offlineSince.current) / 1000)
    offlineSince.current = null
    logEvent(code, userId, 'offline', `${s}s`)
  }, [offline, code, userId])
```

(`userId` est défini plus haut dans le hook ; placer cet effet après sa déclaration.)

- [ ] **Step 4: Build et tests**

Run: `npx vite build` puis `npm test`
Expected: build OK, tous les tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/guessWhoLog.js src/lib/guessWhoLogCore.js src/lib/guessWhoLog.test.js package.json src/features/guesswho/Lobby.jsx src/features/guesswho/EndScreen.jsx src/features/guesswho/RecordPhase.jsx src/features/guesswho/MicSetup.jsx src/features/guesswho/useGuessWhoRoom.js
git commit -m "feat(guess-who): journal d'erreurs côté client (micro, envoi, lancement, coupures)"
```

---

### Task 6: Écran de fin — prêt pour la revanche

**Files:**
- Modify: `src/features/guesswho/EndScreen.jsx`

**Interfaces:**
- Consumes: `g.act.ready(on: boolean) → { ok } | { error: 'unsupported' | ... }`, `g.me.ready`, `g.players[].ready` (existants) ; `startErrorText` ; `Btn`, `C`, `FONT_BODY` (`manga.jsx`).

- [ ] **Step 1: État et action**

Dans `EndScreen`, après `const [replayErr, setReplayErr] = useState(null)` :

```js
  const [readyOff, setReadyOff] = useState(false) // base sans guesswho_set_ready
  const [readyBusy, setReadyBusy] = useState(false)
  const seated = g.players.filter((p) => p.seat != null)
  const showReady = !readyOff && !!g.me && g.me.seat != null && seated.some((p) => 'ready' in p)
  const readyCount = seated.filter((p) => p.ready).length
  const toggleReady = async () => {
    setReadyBusy(true)
    const r = await g.act.ready(!g.me.ready)
    setReadyBusy(false)
    if (r?.error === 'unsupported') setReadyOff(true)
    else if (r?.ok) play('select')
  }
```

- [ ] **Step 2: Rendu**

Remplacer le bloc d'actions (`{g.isHost ? <Btn onClick={replay} … : <span …>En attente de l'hôte…</span>}`) par :

```jsx
        {showReady && (
          <Btn variant={g.me.ready ? 'sea' : 'ghost'} onClick={toggleReady} disabled={readyBusy} aria-pressed={!!g.me.ready}
            style={{ flex: '1 1 200px', minHeight: 60, fontSize: 18 }}>
            {g.me.ready ? '✓ Prêt pour la revanche' : '✋ Prêt pour la revanche ?'}
          </Btn>
        )}
        {g.isHost
          ? <Btn onClick={replay} disabled={busy} style={{ flex: '1 1 220px', minHeight: 60, fontSize: 20 }}>
              {busy ? 'Relance…' : showReady ? `🔁 Revanche (${readyCount}/${seated.length} prêts)` : '🔁 Rejouer'}
            </Btn>
          : <span className="gw-anim" style={{ flex: '1 1 220px', alignSelf: 'center', fontFamily: FONT_BODY, fontWeight: 800, color: C.ink, animation: 'gw-blink 1.6s ease-in-out infinite' }}>
              {showReady ? `${readyCount}/${seated.length} prêts · l'hôte lance la revanche…` : "En attente de l'hôte pour rejouer…"}
            </span>}
```

Dans la liste `rest` (joueurs 4+), ajouter après `<AvatarName …/>` :
`{p.ready && <span style={{ fontFamily: FONT_BODY, fontWeight: 800, color: C.ok }}>✓ prêt</span>}`.
Sous le bloc d'actions, la liste de qui est prêt (couvre aussi les 3 du podium) :

```jsx
      {showReady && readyCount > 0 && (
        <div style={{ margin: '-6px 0 16px', fontFamily: FONT_BODY, fontWeight: 700, fontSize: 14, color: C.ink }}>
          ✓ Prêts : {seated.filter((p) => p.ready).map((p) => p.display_name || 'Invité').join(', ')}
        </div>
      )}
```

- [ ] **Step 3: Vérifier**

Run: `npx vite build`
Expected: OK. Puis vérification manuelle Task 8.

- [ ] **Step 4: Commit**

```bash
git add src/features/guesswho/EndScreen.jsx
git commit -m "feat(guess-who): « Prêt pour la revanche » et compteur sur l'écran de fin"
```

---

### Task 7: Salon — bandeau navigateur intégré

**Files:**
- Modify: `src/features/guesswho/Lobby.jsx`

**Interfaces:**
- Consumes: `inAppBrowser(ua)`, `openInBrowserHint(ua)` (`logic/recordFlow.js`) ; `copyText`, `link` (déjà dans `Lobby.jsx`) ; `C`, `type`, `Btn`.

- [ ] **Step 1: État**

Import : `import { inAppBrowser, openInBrowserHint } from './logic/recordFlow.js'`. Dans le composant :

```js
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const [inAppHidden, setInAppHidden] = useState(() => {
    try { return sessionStorage.getItem('gw_inapp_hidden') === '1' } catch { return false }
  })
  const showInApp = inAppBrowser(ua) && !inAppHidden
  const hideInApp = () => {
    setInAppHidden(true)
    try { sessionStorage.setItem('gw_inapp_hidden', '1') } catch { /* stockage indisponible */ }
  }
```

- [ ] **Step 2: Rendu**

Première chose dans `<PhaseFrame …>` :

```jsx
      {showInApp && (
        <div role="alert" style={{ border: `3px solid ${C.ink}`, background: C.yellow, color: C.ink, padding: '12px 14px', marginBottom: 16, display: 'grid', gap: 8 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18 }}>🎙️ Le micro ne marche pas ici</div>
          <div style={{ ...type.body, fontWeight: 700 }}>
            Tu es dans le navigateur de l'appli. Ouvre le salon dans ton navigateur. {openInBrowserHint(ua)}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn onClick={copy}>{copied ? 'Lien copié ✓' : 'Copier le lien'}</Btn>
            <Btn variant="ghost" onClick={hideInApp}>J'ai compris</Btn>
          </div>
        </div>
      )}
```

(`copy` et `copied` existent déjà dans `Lobby.jsx`.)

- [ ] **Step 3: Vérifier**

Run: `npx vite build`
Expected: OK. Vérification visuelle Task 8 (UA Discord simulé).

- [ ] **Step 4: Commit**

```bash
git add src/features/guesswho/Lobby.jsx
git commit -m "feat(guess-who): alerte « ouvre dans ton navigateur » dès le salon"
```

---

### Task 8: Vérification et livraison

**Files:** aucun nouveau.

- [ ] **Step 1: Tous les tests**

Run: `npm test`
Expected: PASS (aucun échec).

- [ ] **Step 2: Build**

Run: `npx vite build`
Expected: `✓ built`.

- [ ] **Step 3: Partie locale**

Lancer `npx vite --port 5199`. Avec Chromium headless (`~/AppData/Local/ms-playwright/chromium-*/chrome-win64/chrome.exe`) ou à la main, ouvrir `/guess-who` dans 3 profils (invités) :
- créer un salon, rejoindre à 3, lancer ;
- capture du salon avec l'UA Discord (`--user-agent="… Discord/240"`) : bandeau visible.

Note : sans base Supabase de test, la partie complète n'est vérifiable qu'en prod après la migration ; dire honnêtement ce qui a été vu.

- [ ] **Step 4: Livraison**

1. Copier `supabase/migrations/20261003_guess_who_revanche.sql` dans le presse-papier (`Get-Content -Raw -Encoding UTF8 … | Set-Clipboard`) pour l'éditeur SQL Supabase.
2. Après accord de Feydi : `git push origin HEAD:main`.
3. Test réel : 3 téléphones, une partie jusqu'à la fin, un téléphone verrouillé 60 s sur le podium, « Revanche » → personne n'est éjecté.
