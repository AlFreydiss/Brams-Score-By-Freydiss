# Brams Phone — Phase 1 (socle sécurisé + jouable) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre la partie Brams Phone réellement anti-triche (lecture/écriture des carnets verrouillée côté serveur) et robuste de bout en bout, sans toucher au polish visuel (phases 2-4).

**Architecture:** `gartic_players`/`gartic_pages` passent en RLS deny ; chaque joueur a un `secret_token` ; toute lecture/écriture de jeu passe par des RPC `SECURITY DEFINER` qui résolvent siège+round serveur. `gartic_rooms` reste SELECT-able pour piloter les transitions via `postgres_changes` ; un canal Realtime presence/broadcast gère la liveness lobby et les signaux basse latence.

**Tech Stack:** Vite + React (inline styles), Supabase Postgres (psycopg2 DDL via repo bot lié railway), REST-direct (`sbRpc`/`rest`) anti-hang, Supabase Realtime (presence/broadcast), node:test pour la logique pure.

**Réfs:** spec `docs/superpowers/specs/2026-06-14-brams-phone-phase1-design.md`. DDL appliqué via `railway run -- py -3 _apply_sql.py <abs path>` depuis le repo bot (`C:\Users\Feydi\Desktop\Brams-Score-By-Freydiss`, lié railway, DSN = `SUPABASE_URL`).

---

## File Structure

- **Create** `supabase/migrations/20260614_brams_phone_secure.sql` — secret_token + RLS deny + famille RPC sécurisée.
- **Create** `scripts/verify_gartic_rls.mjs` — harnais d'anti-triche (REST), sert de test de la couche sécurité.
- **Modify** `src/lib/garticRooms.js` — router tout via les RPC sécurisées + gestion du token + canal presence/broadcast.
- **Modify** `src/features/garticphone/useGarticRoom.js` — token, `submitted_seats`, presence-derived players, broadcast, reconnexion.
- **Unchanged** `src/features/garticphone/logic/rotation.js` (+ tests), `theme.js`, les composants d'écran (phases 2-4).

---

## Task 1: Backend sécurisé — migration (secret_token + RLS deny + RPC)

**Files:**
- Create: `scripts/verify_gartic_rls.mjs`
- Create: `supabase/migrations/20260614_brams_phone_secure.sql`
- Apply via: repo bot `C:\Users\Feydi\Desktop\Brams-Score-By-Freydiss\_apply_sql.py`

- [ ] **Step 1: Écrire le harnais anti-triche (test qui échoue)**

Create `scripts/verify_gartic_rls.mjs`:

```js
// Vérifie l'anti-triche serveur de Brams Phone (REST direct, anon key).
// Usage: node scripts/verify_gartic_rls.mjs  (lit .env.local)
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const URL_ = env.VITE_SUPABASE_URL, ANON = env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json', Accept: 'application/json' };
const rpc = (fn, body) => fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: 'POST', headers: H, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
const get = (q) => fetch(`${URL_}/rest/v1/${q}`, { headers: H }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };

const code = 'T' + Math.random().toString(36).slice(2, 5).toUpperCase();
const A = 'verif_host_' + Date.now(), B = 'verif_p2_' + Date.now();

const created = await rpc('gartic_create', { p_code: code, p_user: A, p_name: 'Host', p_avatar: null });
ok(created.json?.secret_token, 'gartic_create renvoie un secret_token');
const tokA = created.json?.secret_token;

const joined = await rpc('gartic_join', { p_code: code, p_user: B, p_name: 'P2', p_avatar: null });
ok(joined.json?.secret_token && joined.json.secret_token !== tokA, 'gartic_join renvoie un token distinct');
const tokB = joined.json?.secret_token;

const state = await rpc('gartic_room_state', { p_code: code });
const players = state.json?.players || [];
ok(players.length >= 2, 'room_state liste les joueurs');
ok(players.every((p) => !('secret_token' in p)), 'room_state ne fuite PAS secret_token');

const direct = await get(`gartic_pages?select=*&limit=1`);
ok(direct.status === 200 && Array.isArray(direct.json) && direct.json.length === 0, 'SELECT direct gartic_pages = vide (RLS deny)');

await rpc('gartic_start', { p_code: code, p_token: tokA, p_settings: { rounds: 2, phaseDurations: { writing: 60, drawing: 60, describing: 60 } } });
await rpc('gartic_submit', { p_code: code, p_token: tokA, p_content: 'phrase A' });
await rpc('gartic_submit', { p_code: code, p_token: tokB, p_content: 'phrase B' });

const allEarly = await rpc('gartic_all_pages', { p_code: code });
ok(allEarly.json?.error === 'not_reveal', 'gartic_all_pages refusé hors reveal');

const badTok = await rpc('gartic_submit', { p_code: code, p_token: '00000000-0000-0000-0000-000000000000', p_content: 'x' });
ok(badTok.json?.error === 'unauthorized', 'gartic_submit avec mauvais token = unauthorized');

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Lancer le harnais → doit échouer**

Run: `node scripts/verify_gartic_rls.mjs`
Expected: FAIL — `gartic_create` n'existe pas encore (PGRST202) → assertions à ✗.

- [ ] **Step 3: Écrire la migration**

Create `supabase/migrations/20260614_brams_phone_secure.sql`:

```sql
-- Brams Phone — anti-triche par token secret (Phase 1). Idempotent.
-- pages/players non lisibles direct ; tout via RPC SECURITY DEFINER.

-- 1. token secret par joueur
alter table gartic_players add column if not exists secret_token uuid not null default gen_random_uuid();

-- 2. RLS : rooms SELECT only (transitions postgres_changes), players/pages deny direct
drop policy if exists grm_all on gartic_rooms;
drop policy if exists gpl_all on gartic_players;
drop policy if exists gpg_all on gartic_pages;
drop policy if exists grm_select on gartic_rooms;
create policy grm_select on gartic_rooms for select to anon, authenticated using (true);
-- players/pages : 0 policy = deny total en direct (les RPC SECURITY DEFINER bypassent)

-- 3. anciennes RPC v1 (signatures non sécurisées) supprimées
drop function if exists gartic_start(uuid, jsonb);
drop function if exists gartic_advance(uuid);
drop function if exists gartic_my_book(uuid, text, int);

-- helper : résout (room, player) depuis code+token
create or replace function _gartic_player(p_code text, p_token uuid)
  returns table(room_id uuid, player_id uuid, seat int, is_host boolean, status text, current_round int, n int)
  language sql stable security definer set search_path = public as $$
  select r.id, pl.id, pl.seat, pl.is_host, r.status, r.current_round, (r.settings->>'n')::int
  from gartic_rooms r join gartic_players pl on pl.room_id = r.id
  where r.code = upper(p_code) and pl.secret_token = p_token
$$;

create or replace function gartic_create(p_code text, p_user text, p_name text, p_avatar text)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room gartic_rooms; v_tok uuid;
begin
  begin
    insert into gartic_rooms(code, host_user_id, status, settings)
      values (upper(p_code), p_user, 'lobby', '{}'::jsonb) returning * into v_room;
  exception when unique_violation then return jsonb_build_object('error','code_taken'); end;
  insert into gartic_players(room_id, user_id, display_name, avatar_url, is_host, connected, last_seen)
    values (v_room.id, p_user, p_name, p_avatar, true, true, now()) returning secret_token into v_tok;
  return jsonb_build_object('code', upper(p_code), 'secret_token', v_tok, 'room', to_jsonb(v_room));
end $$;

create or replace function gartic_join(p_code text, p_user text, p_name text, p_avatar text)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room gartic_rooms; v_pl gartic_players;
begin
  select * into v_room from gartic_rooms where code = upper(p_code);
  if v_room.id is null then return jsonb_build_object('error','introuvable'); end if;
  select * into v_pl from gartic_players where room_id = v_room.id and user_id = p_user;
  if v_pl.id is not null then
    update gartic_players set connected=true, last_seen=now(), display_name=p_name, avatar_url=p_avatar
      where id = v_pl.id returning * into v_pl;
    return jsonb_build_object('secret_token', v_pl.secret_token, 'seat', v_pl.seat, 'spectator', false, 'room', to_jsonb(v_room));
  end if;
  if v_room.status <> 'lobby' then return jsonb_build_object('spectator', true, 'room', to_jsonb(v_room)); end if;
  insert into gartic_players(room_id, user_id, display_name, avatar_url, connected, last_seen)
    values (v_room.id, p_user, p_name, p_avatar, true, now()) returning * into v_pl;
  return jsonb_build_object('secret_token', v_pl.secret_token, 'seat', v_pl.seat, 'spectator', false, 'room', to_jsonb(v_room));
end $$;

create or replace function gartic_room_state(p_code text)
  returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_room gartic_rooms;
begin
  select * into v_room from gartic_rooms where code = upper(p_code);
  if v_room.id is null then return jsonb_build_object('error','introuvable'); end if;
  return jsonb_build_object('room', to_jsonb(v_room), 'players', coalesce((
    select jsonb_agg(jsonb_build_object('user_id',pl.user_id,'display_name',pl.display_name,
      'avatar_url',pl.avatar_url,'seat',pl.seat,'is_host',pl.is_host,'is_ready',pl.is_ready,
      'connected',pl.connected,'last_seen',pl.last_seen) order by pl.joined_at)
    from gartic_players pl where pl.room_id = v_room.id), '[]'::jsonb));
end $$;

create or replace function gartic_prev_page(p_code text, p_token uuid)
  returns jsonb language plpgsql stable security definer set search_path = public as $$
declare g record; v_book int; v_pg record;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null then return jsonb_build_object('error','unauthorized'); end if;
  if g.current_round <= 0 or g.n is null then return jsonb_build_object('page', null); end if;
  v_book := ((g.seat - g.current_round) % g.n + g.n) % g.n;
  select type, content into v_pg from gartic_pages
    where room_id = g.room_id and book_id = v_book and page_index = g.current_round - 1;
  return jsonb_build_object('page', case when v_pg is null then null
    else jsonb_build_object('type', v_pg.type, 'content', v_pg.content) end);
end $$;

create or replace function gartic_submit(p_code text, p_token uuid, p_content text)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare g record; v_book int; v_type text;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null then return jsonb_build_object('error','unauthorized'); end if;
  if g.status not in ('writing','drawing','describing') or g.n is null then return jsonb_build_object('error','phase'); end if;
  v_book := ((g.seat - g.current_round) % g.n + g.n) % g.n;
  v_type := case when g.current_round = 0 then 'text' when g.current_round % 2 = 1 then 'drawing' else 'text' end;
  insert into gartic_pages(room_id, book_id, page_index, type, content, author_user_id)
    values (g.room_id, v_book, g.current_round, v_type, p_content, (select user_id from gartic_players where id = g.player_id))
    on conflict (room_id, book_id, page_index) do update set content = excluded.content, type = excluded.type;
  return jsonb_build_object('ok', true);
end $$;

create or replace function gartic_submitted_seats(p_code text)
  returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_room gartic_rooms; v_n int;
begin
  select * into v_room from gartic_rooms where code = upper(p_code);
  if v_room.id is null then return jsonb_build_object('seats','[]'::jsonb); end if;
  v_n := (v_room.settings->>'n')::int;
  if v_n is null or v_n = 0 then return jsonb_build_object('round', v_room.current_round, 'seats','[]'::jsonb); end if;
  return jsonb_build_object('round', v_room.current_round, 'seats', coalesce((
    select jsonb_agg(distinct ((book_id + v_room.current_round) % v_n))
    from gartic_pages where room_id = v_room.id and page_index = v_room.current_round), '[]'::jsonb));
end $$;

create or replace function gartic_start(p_code text, p_token uuid, p_settings jsonb)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare g record; v_n int;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null or not g.is_host then return jsonb_build_object('error','unauthorized'); end if;
  with ordered as (select id, row_number() over (order by joined_at) - 1 as rn
    from gartic_players where room_id = g.room_id)
  update gartic_players p set seat = o.rn from ordered o where p.id = o.id;
  select count(*) into v_n from gartic_players where room_id = g.room_id;
  update gartic_rooms set status='writing', current_round=0, current_phase='writing',
    settings = p_settings || jsonb_build_object('n', v_n),
    phase_ends_at = now() + (coalesce((p_settings->'phaseDurations'->>'writing')::int,60)||' seconds')::interval,
    updated_at = now() where id = g.room_id;
  return jsonb_build_object('ok', true, 'n', v_n);
end $$;

create or replace function gartic_advance(p_code text, p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare g record; r gartic_rooms; v_n int; nextr int; ph text; dur int; s int; bk int; v_type text;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null or not g.is_host then return jsonb_build_object('error','unauthorized'); end if;
  select * into r from gartic_rooms where id = g.room_id;
  v_n := (r.settings->>'n')::int;
  if v_n is null then return jsonb_build_object('error','not_started'); end if;
  v_type := case when r.current_round = 0 then 'text' when r.current_round % 2 = 1 then 'drawing' else 'text' end;
  for s in 0..v_n-1 loop
    bk := ((s - r.current_round) % v_n + v_n) % v_n;
    insert into gartic_pages(room_id, book_id, page_index, type, content, author_user_id)
      values (r.id, bk, r.current_round, v_type, case when v_type='drawing' then '' else '—' end, 'host')
      on conflict (room_id, book_id, page_index) do nothing;
  end loop;
  nextr := r.current_round + 1;
  if nextr >= v_n then
    update gartic_rooms set status='reveal', current_phase='reveal', phase_ends_at=null, updated_at=now() where id=r.id;
    return jsonb_build_object('ok', true, 'status','reveal');
  end if;
  ph := case when nextr % 2 = 1 then 'drawing' else 'describing' end;
  dur := coalesce((r.settings->'phaseDurations'->>ph)::int, 60);
  update gartic_rooms set status=ph, current_phase=ph, current_round=nextr,
    phase_ends_at = now() + (dur||' seconds')::interval, updated_at=now() where id=r.id;
  return jsonb_build_object('ok', true, 'status', ph, 'round', nextr);
end $$;

create or replace function gartic_set_ready(p_code text, p_token uuid, p_ready boolean)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare g record;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null then return jsonb_build_object('error','unauthorized'); end if;
  update gartic_players set is_ready = p_ready where id = g.player_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function gartic_touch(p_code text, p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare g record;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null then return jsonb_build_object('error','unauthorized'); end if;
  update gartic_players set connected = true, last_seen = now() where id = g.player_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function gartic_promote_host(p_code text, p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare g record; v_lowest uuid; v_alive boolean;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null then return jsonb_build_object('error','unauthorized'); end if;
  select exists(select 1 from gartic_players where room_id=g.room_id and is_host and connected
    and last_seen > now() - interval '22 seconds') into v_alive;
  if v_alive then return jsonb_build_object('ok', false, 'reason','host_alive'); end if;
  select id into v_lowest from gartic_players where room_id=g.room_id and connected
    and last_seen > now() - interval '22 seconds' and seat is not null order by seat asc limit 1;
  if v_lowest is null or v_lowest <> g.player_id then return jsonb_build_object('ok', false, 'reason','not_candidate'); end if;
  update gartic_players set is_host = false where room_id = g.room_id;
  update gartic_players set is_host = true where id = g.player_id;
  update gartic_rooms set host_user_id = (select user_id from gartic_players where id=g.player_id) where id=g.room_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function gartic_all_pages(p_code text)
  returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_room gartic_rooms; v_n int;
begin
  select * into v_room from gartic_rooms where code = upper(p_code);
  if v_room.id is null then return jsonb_build_object('error','introuvable'); end if;
  if v_room.status not in ('reveal','finished') then return jsonb_build_object('error','not_reveal'); end if;
  v_n := (v_room.settings->>'n')::int;
  return jsonb_build_object('pages', coalesce((
    select jsonb_agg(jsonb_build_object('book_id',pg.book_id,'page_index',pg.page_index,'type',pg.type,
      'content',pg.content,'author', jsonb_build_object('name',pl.display_name,'avatar',pl.avatar_url))
      order by pg.book_id, pg.page_index)
    from gartic_pages pg
    left join gartic_players pl on pl.room_id = pg.room_id and v_n is not null and pl.seat = ((pg.book_id + pg.page_index) % v_n)
    where pg.room_id = v_room.id), '[]'::jsonb));
end $$;

grant execute on function _gartic_player(text,uuid), gartic_create(text,text,text,text),
  gartic_join(text,text,text,text), gartic_room_state(text), gartic_prev_page(text,uuid),
  gartic_submit(text,uuid,text), gartic_submitted_seats(text), gartic_start(text,uuid,jsonb),
  gartic_advance(text,uuid), gartic_set_ready(text,uuid,boolean), gartic_touch(text,uuid),
  gartic_promote_host(text,uuid), gartic_all_pages(text), gartic_now() to anon, authenticated;
```

- [ ] **Step 4: Appliquer la migration**

Depuis le repo bot (lié railway). Si `_apply_sql.py` absent, le recréer (lecture fichier utf-8-sig, `psycopg2.connect(os.environ["SUPABASE_URL"])`, autocommit, `cur.execute(sql)`).

Run (PowerShell, cwd repo bot):
`railway run -- py -3 _apply_sql.py "C:\Users\Feydi\Desktop\brams-web-clone\supabase\migrations\20260614_brams_phone_secure.sql"`
Expected: `OK applied: ...`

- [ ] **Step 5: Relancer le harnais → doit passer**

Run: `node scripts/verify_gartic_rls.mjs`
Expected: `8 pass, 0 fail` (toutes les assertions ✓).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260614_brams_phone_secure.sql scripts/verify_gartic_rls.mjs
git commit -m "feat(brams-phone): anti-triche par token secret (RLS deny + RPC SECURITY DEFINER)"
```

---

## Task 2: garticRooms.js — router tout via les RPC sécurisées

**Files:**
- Modify: `src/lib/garticRooms.js`
- Test: `scripts/verify_gartic_rls.mjs` (régression), build Vite.

- [ ] **Step 1: Gestion du token + helpers RPC**

En tête de `garticRooms.js`, après `guestId()`, ajouter le store de token (mémoire + sessionStorage pour la reconnexion) :

```js
const _tokens = new Map(); // code -> secret_token
function tokenKey(code) { return 'bp_token_' + String(code).toUpperCase(); }
export function getToken(code) {
  const c = String(code).toUpperCase();
  if (_tokens.has(c)) return _tokens.get(c);
  try { const t = sessionStorage.getItem(tokenKey(c)); if (t) { _tokens.set(c, t); return t; } } catch {}
  return null;
}
function setToken(code, tok) {
  const c = String(code).toUpperCase();
  _tokens.set(c, tok);
  try { sessionStorage.setItem(tokenKey(c), tok); } catch {}
}
```

- [ ] **Step 2: Remplacer createRoom / joinRoom par les RPC**

Remplacer `createRoom` et `joinRoom` (et garder `genRoomCode`) :

```js
export async function createRoom({ userId, displayName, avatarUrl }) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = genRoomCode();
    const { data } = await rpc('gartic_create', { p_code: code, p_user: String(userId), p_name: displayName, p_avatar: avatarUrl });
    const out = Array.isArray(data) ? data[0] : data;
    if (out?.secret_token) { setToken(out.code, out.secret_token); return { code: out.code, room: out.room, error: null }; }
    if (out?.error && out.error !== 'code_taken') return { error: out.error };
  }
  return { error: 'code_collision' };
}

export async function joinRoom({ code, userId, displayName, avatarUrl }) {
  const { data } = await rpc('gartic_join', { p_code: String(code), p_user: String(userId), p_name: displayName, p_avatar: avatarUrl });
  const out = Array.isArray(data) ? data[0] : data;
  if (!out || out.error === 'introuvable') return { error: 'introuvable' };
  if (out.spectator) return { room: out.room, spectator: true, error: null };
  if (out.secret_token) setToken(code, out.secret_token);
  return { room: out.room, error: null };
}
```

> Note : `rpc()` (déjà défini) renvoie `{data,error}` ; les RPC `returns jsonb` arrivent en objet (Prefer representation peut renvoyer l'objet directement). Le `Array.isArray(data)?data[0]:data` couvre les deux.

- [ ] **Step 3: Remplacer fetchRoom/fetchPlayers, pages, présence par RPC**

Remplacer ces fonctions :

```js
export async function roomState(code) {
  const { data } = await rpc('gartic_room_state', { p_code: String(code) });
  const out = Array.isArray(data) ? data[0] : data;
  return out && !out.error ? out : null; // { room, players }
}
export async function fetchRoom(code)   { return (await roomState(code))?.room ?? null; }
export async function fetchPlayers(code){ return (await roomState(code))?.players ?? []; }

export async function submitPage(code, content) {
  const tok = getToken(code); if (!tok) return { error: 'no_token' };
  const { data } = await rpc('gartic_submit', { p_code: String(code), p_token: tok, p_content: content ?? '' });
  const out = Array.isArray(data) ? data[0] : data;
  return out?.ok ? { error: null } : { error: out?.error || 'fail' };
}
export async function fetchPrevPage(code) {
  const tok = getToken(code); if (!tok) return null;
  const { data } = await rpc('gartic_prev_page', { p_code: String(code), p_token: tok });
  const out = Array.isArray(data) ? data[0] : data;
  return out?.page ?? null; // { type, content } | null
}
export async function submittedSeats(code) {
  const { data } = await rpc('gartic_submitted_seats', { p_code: String(code) });
  const out = Array.isArray(data) ? data[0] : data;
  return { round: out?.round ?? 0, seats: new Set(Array.isArray(out?.seats) ? out.seats : []) };
}
export async function fetchAllPages(code) {
  const { data } = await rpc('gartic_all_pages', { p_code: String(code) });
  const out = Array.isArray(data) ? data[0] : data;
  return Array.isArray(out?.pages) ? out.pages : [];
}
export async function setReady(code, ready) {
  const tok = getToken(code); if (!tok) return;
  await rpc('gartic_set_ready', { p_code: String(code), p_token: tok, p_ready: ready });
}
export async function touchPlayer(code) {
  const tok = getToken(code); if (!tok) return;
  await rpc('gartic_touch', { p_code: String(code), p_token: tok });
}
export async function promoteSelfHost(code) {
  const tok = getToken(code); if (!tok) return { ok: false };
  const { data } = await rpc('gartic_promote_host', { p_code: String(code), p_token: tok });
  return (Array.isArray(data) ? data[0] : data) || { ok: false };
}
export const startGame = (code, settings) => rpc('gartic_start', { p_code: String(code), p_token: getToken(code), p_settings: settings });
export const advance    = (code) => rpc('gartic_advance', { p_code: String(code), p_token: getToken(code) });
```

Supprimer : `fillMissingPage`, `setConnected`, `myBook` (plus utilisés ; le fill est serveur, la déco se gère via presence + `last_seen`).

- [ ] **Step 4: subscribeRoom rooms-only**

Dans `subscribeRoom`, retirer les deux `.on('postgres_changes', ... gartic_players ...)` et `... gartic_pages ...` (RLS deny → aucun event) ; garder uniquement l'abo `gartic_rooms`. `subscribeRoom(roomId, onChange)` inchangé pour le reste.

- [ ] **Step 5: Vérifier la non-régression + build**

Run: `node scripts/verify_gartic_rls.mjs` → `8 pass, 0 fail`
Run: `npm run build` → `✓ built`

> `useGarticRoom` est encore branché sur les anciennes signatures → erreurs attendues réglées en Task 4. Si le build casse sur des imports supprimés, c'est normal : la Task 4 met à jour l'appelant. Pour garder un build vert entre les tâches, faire Task 2+4 dans la même session de build (cf. note d'exécution).

- [ ] **Step 6: Commit**

```bash
git add src/lib/garticRooms.js
git commit -m "refactor(brams-phone): couche data via RPC sécurisées + gestion token"
```

---

## Task 3: Canal Realtime — presence + broadcast

**Files:**
- Modify: `src/lib/garticRooms.js`

- [ ] **Step 1: Ajouter joinChannel (presence + broadcast)**

Ajouter à la fin de `garticRooms.js` :

```js
// Canal liveness + signaux basse latence. presence = qui est là (lobby) ;
// broadcast = player_submitted / phase_change / host_migrated (Phase 3 ajoutera reaction).
export function joinChannel(code, { userId, displayName, avatarUrl, onPresence, onBroadcast }) {
  if (!supabase) return { send: () => {}, leave: () => {} };
  const ch = supabase.channel(`room:${String(code).toUpperCase()}`, { config: { presence: { key: String(userId) } } });
  ch.on('presence', { event: 'sync' }, () => onPresence?.(ch.presenceState()));
  ch.on('broadcast', { event: '*' }, (p) => onBroadcast?.(p.event, p.payload));
  ch.subscribe((status) => {
    if (status === 'SUBSCRIBED') ch.track({ user_id: String(userId), display_name: displayName, avatar_url: avatarUrl, at: Date.now() });
  });
  return {
    send: (event, payload = {}) => { try { ch.send({ type: 'broadcast', event, payload }); } catch {} },
    leave: () => { try { supabase.removeChannel(ch); } catch {} },
  };
}
```

- [ ] **Step 2: Build**

Run: `npm run build` → `✓ built`

- [ ] **Step 3: Commit**

```bash
git add src/lib/garticRooms.js
git commit -m "feat(brams-phone): canal Realtime presence + broadcast"
```

---

## Task 4: useGarticRoom.js — token, submitted_seats, presence, broadcast, reconnexion

**Files:**
- Modify: `src/features/garticphone/useGarticRoom.js`

- [ ] **Step 1: Mettre à jour les imports + signatures**

Remplacer l'import depuis `garticRooms.js` par : `joinRoom, fetchRoom, fetchPlayers, roomState, fetchPrevPage, submitPage, submittedSeats, fetchAllPages, setReady as apiSetReady, touchPlayer, startGame, advance as apiAdvance, promoteSelfHost, serverNow, subscribeRoom, joinChannel, getToken`. Retirer `fetchAllPages`-comme-source-de-vérité-en-jeu, `fillMissingPage`, `setConnected`, `submitPage`-par-bookId.

- [ ] **Step 2: refresh via roomState + presence**

Remplacer `refresh` pour utiliser `roomState(code)` (room + players d'un coup) ; au reveal, charger les pages via `fetchAllPages(code)` :

```js
const refresh = useCallback(async () => {
  if (!code) return;
  if (refreshing.current) { refreshQueued.current = true; return; }
  refreshing.current = true;
  try {
    const st = await roomState(code);
    if (!st?.room) { setError('introuvable'); setRoom(null); return; }
    setRoom(st.room); setPlayers(st.players || []);
    if (['reveal','finished'].includes(st.room.status)) setPages(await fetchAllPages(code));
  } catch {} finally {
    refreshing.current = false;
    if (refreshQueued.current) { refreshQueued.current = false; return refresh(); }
  }
}, [code]);
```

- [ ] **Step 3: join + canal presence/broadcast + heartbeat**

Dans l'effet de montage : `joinRoom` (stocke le token via garticRooms), puis `subscribeRoom(room.id, refresh)` (transitions) + `joinChannel(code, {...})`. Sur broadcast `phase_change`/`player_submitted`/`host_migrated` → `refresh()`. Heartbeat : `touchPlayer(code)` (token) toutes les 10s. Presence sync → recalcule la liste des connectés (fusion avec `players`). Code :

```js
const chRef = useRef(null);
// ... dans init(), après le join réussi :
const r = res.room; roomIdForSub = r.id;
unsub = subscribeRoom(r.id, () => { if (!stop) refresh(); });
chRef.current = joinChannel(code, {
  userId, displayName, avatarUrl,
  onPresence: (state) => { if (!stop) setPresence(new Set(Object.keys(state))); },
  onBroadcast: (event) => { if (!stop) refresh(); },
});
await touchPlayer(code).catch(() => {});
// heartbeat
hb = setInterval(() => { if (!spectator) touchPlayer(code); }, 10000);
```

Ajouter `const [presence, setPresence] = useState(() => new Set());` et, au cleanup, `chRef.current?.leave()`.

- [ ] **Step 4: Actions (token implicite)**

```js
const start = useCallback(async (settings) => {
  setError('');
  const out = await startGame(code, settings);
  const j = Array.isArray(out?.data) ? out.data[0] : out?.data;
  if (j?.error) setError(j.error);
  chRef.current?.send('phase_change', { status: 'writing' });
  await refresh();
}, [code, refresh]);

const advance = useCallback(async () => {
  await apiAdvance(code);
  chRef.current?.send('phase_change', {});
  await refresh();
}, [code, refresh]);

const setReady = useCallback(async (b) => { await apiSetReady(code, b); }, [code]);

const submit = useCallback(async (content) => {
  const out = await submitPage(code, content);
  if (!out.error) {
    setMySubmitted(true);
    if (me?.seat != null) setSubmittedSeats((s) => new Set(s).add(me.seat));
    chRef.current?.send('player_submitted', { seat: me?.seat });
  }
  return out;
}, [code, me]);

const prevPage = useCallback(async () => fetchPrevPage(code), [code]);
const allPages = useCallback(async () => fetchAllPages(code), [code]);
```

> `myTask` reste calculé localement via `seatTask(me.seat, room.current_round, n)` (rotation pure) pour piloter l'UI ; le serveur recalcule de toute façon dans `gartic_submit`.

- [ ] **Step 5: Boucle hôte via submittedSeats (fill serveur)**

Remplacer le corps de la boucle hôte : plus de `fetchAllPages` ; on lit `submittedSeats(code)` et on appelle `apiAdvance` (qui comble serveur) :

```js
const loop = setInterval(async () => {
  if (stop || advancingRef.current) return;
  if (!['writing','drawing','describing'].includes(room.status)) return;
  const { round, seats } = await submittedSeats(code);
  if (round !== room.current_round) return;
  const decision = shouldAdvance({ status: room.status, phaseEndsAtMs, current_round: round }, players, seats, serverNowMs());
  if (!decision) return;
  advancingRef.current = true;
  try { await apiAdvance(code); chRef.current?.send('phase_change', {}); await refresh(); }
  finally { setTimeout(() => { advancingRef.current = false; }, 1500); }
}, 2000);
```

- [ ] **Step 6: Migration hôte via RPC**

Dans l'effet de migration : remplacer l'appel `promoteSelfHost(room.id, userId)` par `promoteSelfHost(code)` (le serveur valide candidat + staleness) ; sur succès `chRef.current?.send('host_migrated', {})` puis `refresh()`. Garder le déclencheur local (host mort >22s, plus petit siège connecté) comme pré-filtre.

- [ ] **Step 7: Build + tests pure**

Run: `npm run build` → `✓ built`
Run: `node --test src/features/garticphone/logic/` → tests rotation + hostLoop PASS.

- [ ] **Step 8: Commit**

```bash
git add src/features/garticphone/useGarticRoom.js
git commit -m "feat(brams-phone): hook sur RPC token + presence/broadcast + fill serveur"
```

---

## Task 5: Acceptation — partie 4 joueurs + anti-triche

**Files:**
- Use: `scripts/verify_gartic_rls.mjs`, webapp-testing (Playwright multi-contexte)

- [ ] **Step 1: Re-vérifier l'anti-triche serveur**

Run: `node scripts/verify_gartic_rls.mjs` → `8 pass, 0 fail`.

- [ ] **Step 2: Partie complète 4 joueurs (webapp-testing)**

Invoquer la skill `webapp-testing` : 4 contextes navigateur indépendants sur `/brams-phone`, 1 crée le salon, 3 rejoignent via code, lancer, jouer write→draw→describe jusqu'au reveal. Vérifier : tout le monde voit le lobby se peupler (presence), les phases avancent (timer + tous soumis), le reveal affiche les albums complets. Aucun blocage.

- [ ] **Step 3: Vérifier la rotation (personne ne dessine sa phrase)**

Dans la partie test, contrôler au reveal qu'aucun joueur n'a une page consécutive dans son propre carnet (rotation `(seat-round+N)%N`). Couvert par `rotation.test.js` (N=2..12) — relancer `node --test`.

- [ ] **Step 4: Déployer**

```bash
git push
vercel --prod --scope brams-score-by-freydiss-projects --yes
```
Vérifier `/brams-phone` en prod (lobby s'ouvre, création de salon OK).

- [ ] **Step 5: Commit (si ajustements de test)**

```bash
git add -A
git commit -m "test(brams-phone): acceptation 4 joueurs + anti-triche vérifiés"
```

---

## Notes d'exécution
- **Tasks 2 et 4 cassent temporairement le build entre elles** (l'appelant `useGarticRoom` suit les nouvelles signatures). Les exécuter d'affilée et ne valider le build vert qu'après Task 4. Les commits intermédiaires restent OK (code cohérent par fichier).
- DDL toujours via repo bot lié railway (`py -3`, pas `python`). Migration idempotente.
- Garder REST-direct (`sbRpc`/`rest`) pour les RPC ; le client supabase-js ne sert QUE le Realtime (subscribeRoom/joinChannel).
