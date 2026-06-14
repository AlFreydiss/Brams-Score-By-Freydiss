# Brams Phone — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a real-time multiplayer Gartic Phone clone ("Brams Phone") inside brams.community — write → draw → describe → reveal, host-authoritative, with cheat-proof page access.

**Architecture:** Host-authoritative state machine. Dedicated `gartic_*` Supabase tables + anonymous auth (`auth.uid()`) for RLS. Data/realtime layer copies the proven `src/lib/undercoverRooms.js` pattern: **REST-direct CRUD** (anti-hang, via `supabaseRest.js`) + **`postgres_changes`** subscription for live state. Sensitive page reads/writes gated server-side by RLS policies that compute the book at a player's seat for the current round; host-only room transitions go through `SECURITY DEFINER` RPCs. Drawings are PNGs on R2 (presign upload, same flow as `TierListPage` custom images).

**Tech stack:** Vite + React (inline styles only), Supabase (Postgres + Realtime + anon auth), Cloudflare R2, Vercel. Fonts via `src/styles/typography.js` (Bricolage Grotesque + Inter). Pure rotation logic is unit-tested (Vitest).

---

## UPDATE 2026-06-14 (post-validation — "fais au mieux")

- **Anonymous sign-ins are DISABLED** in Supabase (`anonymous_provider_disabled`) and can't be toggled from here → the anon-auth + per-user RLS model is **deferred**. v1 follows the **Undercover model**: `user_id` text (Brams/Discord id, or a generated guest id in `localStorage`), REST-direct + anon key, **open RLS** (same trust level as the already-shipped `tournament_*`/Undercover/BlindTest rooms), host-authority by convention, page secrecy via an advisory read RPC. Hardening path = enable anon sign-ins later → swap in the per-user RLS policies drafted below.
- **Test runner = `node:test`** (no Vitest in the repo; dames tests run via `node --test`). Task 2 uses `node:test` + `node:assert/strict`.

## Key decisions (validate these first)

1. **Dedicated tables, not the Tournoi reuse.** Undercover reused `tournament_*` to skip migrations, but this spec mandates dedicated `gartic_rooms/players/pages` + real RLS. We follow the spec. We still copy undercover's *transport code* (REST-direct + `postgres_changes`).
2. **Realtime = `postgres_changes`, not broadcast/presence.** Undercover/Tournoi prove `postgres_changes` on the room tables is enough to drive every client and survives socket drops (auto-rebuild). "Connected/ready" comes from `gartic_players.connected` + `last_seen` heartbeat, not Realtime presence. Broadcast is optional later for sub-second timer smoothing; **not** in v1. (Spec lists presence/broadcast as ideal; this is the simpler, proven path — flag if you want presence instead.)
3. **RLS for page secrecy = policy with a helper, RPC fallback ready.** Primary: a `SECURITY DEFINER` SQL helper `gartic_seat(room uuid)` returns the caller's seat (from `auth.uid()`), and policies allow SELECT/INSERT on a page only when `book_id = (gartic_seat(room_id) - room.current_round + N) % N` (N read from the room's player count, stored as `settings->>'n'` at game start to keep the policy cheap and stable). At `status in ('reveal','finished')`, members read all pages. **Fallback** (spec-sanctioned): if the dynamic policy proves flaky, lock the tables (no direct SELECT) and serve the current page via RPC `gartic_current_page(room)`. Plan implements the RLS path; Task 5 has the fallback RPC ready to swap in.
4. **Host transitions via RPC, never client-trusted.** `gartic_advance(room)`, `gartic_start(room, settings)`, `gartic_migrate_host(room)` are `SECURITY DEFINER`, assert the caller is the room host (or, for migration, that the host is gone), and are the only way `status/current_round/current_phase/phase_ends_at` change. RLS forbids direct UPDATE of those columns by clients.
5. **Server clock authority.** `phase_ends_at` is set by the RPC using DB `now()`. Clients compute `remaining = phase_ends_at - serverNow`, where `serverNow` is calibrated once per room via an RPC `gartic_now()` (returns `now()`), offsetting local clock skew.
6. **No Supabase MCP / context7 connected this session.** Migrations are versioned `.sql` files under `supabase/migrations/`, applied to prod via the Postgres DSN (`railway run -- py -3 apply_migration.py`), the same path used for today's RLS fix. Anonymous auth must be enabled in the Supabase dashboard (manual one-time toggle — called out in Task 1).

---

## File structure

**Migrations / backend**
- `supabase/migrations/20260614_brams_phone.sql` — tables, indexes, RLS, helper fns, host RPCs.
- `scripts/apply_migration.py` — psycopg2 runner (reads `SUPABASE_URL` DSN from env; reuse today's pattern). Generic, reusable.

**Pure logic (unit-tested)**
- `src/features/garticphone/logic/rotation.js` — seat/book math, page typing, album reconstruction.
- `src/features/garticphone/logic/rotation.test.js` — Vitest, N = 1..12.

**Data / realtime / hook**
- `src/lib/garticRooms.js` — REST-direct CRUD + `subscribeRoom` (clone of `undercoverRooms.js`), RPC wrappers (`startGame`, `advance`, `migrateHost`, `gartic_now`).
- `src/lib/garticUpload.js` — `canvas.toBlob()` → presign → R2 PUT → public URL (reuse `TierListPage` presign flow).
- `src/features/garticphone/useGarticRoom.js` — React hook: subscribe, derive my-task, heartbeat, host loop (timer/all-submitted → `advance`), reconnection resync, host-migration trigger.

**UI (inline styles, `typography.js`, theme)**
- `src/features/garticphone/theme.js` — One Piece palette tokens (dark maritime + gold), reused across components.
- `src/features/garticphone/BramsPhonePage.jsx` — route entry; routes by room status to the phase component.
- `src/features/garticphone/Lobby.jsx`
- `src/features/garticphone/WritePhase.jsx`
- `src/features/garticphone/DrawCanvas.jsx` — the drawing engine (own file: it's heavy).
- `src/features/garticphone/DrawPhase.jsx` — wraps DrawCanvas + prompt + timer + submit.
- `src/features/garticphone/DescribePhase.jsx`
- `src/features/garticphone/Reveal.jsx` — cinematic album playback + shareable recap card.
- `src/features/garticphone/ui.jsx` — shared bits (Timer, PlayerChip, PhaseFrame).

**Wiring**
- `src/App.jsx` — add `/brams-phone` and `/brams-phone/:code` (URL-driven, `navigate()` pattern per existing routing).
- `api/brams-phone-webhook.js` — Phase-2 stub endpoint (anchor only).
- `docs/superpowers/plans/2026-06-14-brams-phone.md` — this file.
- `README` snippet appended (env vars, anchors).

---

## Rotation contract (the core — exact semantics)

Seats `0..N-1`. Book `b` (owned by seat `b`) is at seat `(b + r) % N` on round `r`. So the player at seat `s` works book `(s - r + N) % N` on round `r`.

- Round 0: everyone writes their own book, page 0 (`type:'text'`).
- Rounds `1..N-1`: alternate drawing/describing.
- `pageType(pageIndex)`: 0 → `'text'`; odd → `'drawing'`; even ≥2 → `'text'`.
- A book has exactly `N` pages (`page_index 0..N-1`). Each player touches each book exactly once; never your own except page 0; book returns to its author at reveal.
- `N=1`: solo test mode — one book, one page (page 0 text), straight to reveal.

```js
// src/features/garticphone/logic/rotation.js
export const bookForSeat = (seat, round, n) => ((seat - round) % n + n) % n;
export const seatForBook = (book, round, n) => (book + round) % n;
export const pageType = (pageIndex) =>
  pageIndex === 0 ? 'text' : pageIndex % 2 === 1 ? 'drawing' : 'text';
export const totalRounds = (n) => n; // N pages per book

// Per round: [{ seat, book, pageIndex, type }] for every seat.
export function assignmentsForRound(n, round) {
  return Array.from({ length: n }, (_, seat) => {
    const book = bookForSeat(seat, round, n);
    return { seat, book, pageIndex: round, type: pageType(round) };
  });
}

// What does THIS seat do this round (null if game over).
export function seatTask(seat, round, n) {
  if (round >= n) return null;
  return { book: bookForSeat(seat, round, n), pageIndex: round, type: pageType(round) };
}

// Reveal: group flat pages into albums ordered by page_index, titled by book author seat.
export function buildAlbums(pages, n) {
  const books = Array.from({ length: n }, (_, b) => ({ book: b, pages: [] }));
  for (const p of pages) books[p.book_id].pages.push(p);
  for (const bk of books) bk.pages.sort((a, b) => a.page_index - b.page_index);
  return books;
}
```

---

## Task 1: Migration — tables, anon auth, RLS, RPCs

**Files:**
- Create: `supabase/migrations/20260614_brams_phone.sql`
- Create: `scripts/apply_migration.py`
- Manual: enable **Anonymous sign-ins** in Supabase dashboard (Auth → Providers → Anonymous). Document in README.

- [ ] **Step 1: Write the migration SQL** (`supabase/migrations/20260614_brams_phone.sql`)

```sql
-- ============ Brams Phone ============
create table if not exists gartic_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_player_id uuid,
  status text not null default 'lobby',          -- lobby|writing|drawing|describing|reveal|finished
  settings jsonb not null default '{}',          -- { rounds, phaseDurations, mode, n }
  current_round int not null default 0,
  current_phase text,
  phase_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists gartic_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references gartic_rooms(id) on delete cascade,
  auth_uid uuid default auth.uid(),
  user_id text,
  display_name text not null,
  avatar_url text,
  seat int,
  is_host boolean default false,
  is_ready boolean default false,
  connected boolean default true,
  last_seen timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  unique (room_id, auth_uid)
);
create table if not exists gartic_pages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references gartic_rooms(id) on delete cascade,
  book_id int not null,
  page_index int not null,
  author_player_id uuid references gartic_players(id),
  type text not null,                            -- 'text' | 'drawing'
  content text,                                  -- text OR R2 URL
  created_at timestamptz not null default now(),
  unique (room_id, book_id, page_index)
);
create index if not exists idx_gp_room on gartic_players(room_id);
create index if not exists idx_gpg_room on gartic_pages(room_id);

-- N players in a room (cached on the room as settings->>'n' at start; this is the live count helper)
create or replace function gartic_seat(p_room uuid) returns int
  language sql stable security definer set search_path=public as $$
  select seat from gartic_players where room_id = p_room and auth_uid = auth.uid()
$$;
create or replace function gartic_is_host(p_room uuid) returns boolean
  language sql stable security definer set search_path=public as $$
  select exists(select 1 from gartic_players
    where room_id=p_room and auth_uid=auth.uid() and is_host)
$$;
create or replace function gartic_now() returns timestamptz
  language sql stable as $$ select now() $$;

alter table gartic_rooms   enable row level security;
alter table gartic_players enable row level security;
alter table gartic_pages   enable row level security;

-- ROOMS: any authed user can read a room (needed to join by code); inserts allowed; no client UPDATE/DELETE (host RPCs only).
create policy gr_read   on gartic_rooms for select to authenticated using (true);
create policy gr_insert on gartic_rooms for insert to authenticated with check (true);

-- PLAYERS: members of the room read the roster; you may insert/maintain only your own row.
create policy gpl_read on gartic_players for select to authenticated
  using (exists(select 1 from gartic_players me where me.room_id=gartic_players.room_id and me.auth_uid=auth.uid()));
create policy gpl_self_ins on gartic_players for insert to authenticated with check (auth_uid = auth.uid());
create policy gpl_self_upd on gartic_players for update to authenticated
  using (auth_uid = auth.uid()) with check (auth_uid = auth.uid());

-- PAGES: read/write only the book at MY seat for the CURRENT round; everything at reveal/finished.
create policy gpg_read on gartic_pages for select to authenticated using (
  exists(select 1 from gartic_rooms r where r.id=gartic_pages.room_id and (
    r.status in ('reveal','finished')
    or gartic_pages.book_id = ((gartic_seat(r.id) - r.current_round) % (r.settings->>'n')::int + (r.settings->>'n')::int) % (r.settings->>'n')::int
  ))
);
create policy gpg_write on gartic_pages for insert to authenticated with check (
  exists(select 1 from gartic_rooms r where r.id=gartic_pages.room_id
    and r.status in ('writing','drawing','describing')
    and gartic_pages.book_id = ((gartic_seat(r.id) - r.current_round) % (r.settings->>'n')::int + (r.settings->>'n')::int) % (r.settings->>'n')::int
    and gartic_pages.page_index = r.current_round)
);

-- HOST RPCs (the only writers of room state) -------------------------------
create or replace function gartic_start(p_room uuid, p_settings jsonb)
  returns void language plpgsql security definer set search_path=public as $$
declare n int;
begin
  if not gartic_is_host(p_room) then raise exception 'not host'; end if;
  -- assign seats 0..n-1 by join order, snapshot n into settings
  with ordered as (select id, row_number() over (order by joined_at) - 1 rn
                   from gartic_players where room_id=p_room)
  update gartic_players p set seat = o.rn from ordered o where p.id=o.id;
  select count(*) into n from gartic_players where room_id=p_room;
  update gartic_rooms set status='writing', current_round=0, current_phase='writing',
     settings = p_settings || jsonb_build_object('n', n),
     phase_ends_at = now() + ((p_settings->'phaseDurations'->>'writing')::int || ' seconds')::interval,
     updated_at=now()
  where id=p_room;
end $$;

create or replace function gartic_advance(p_room uuid)
  returns void language plpgsql security definer set search_path=public as $$
declare r gartic_rooms; n int; nextr int; ph text; dur int;
begin
  if not gartic_is_host(p_room) then raise exception 'not host'; end if;
  select * into r from gartic_rooms where id=p_room; n := (r.settings->>'n')::int;
  nextr := r.current_round + 1;
  if nextr >= n then
    update gartic_rooms set status='reveal', current_phase='reveal', phase_ends_at=null, updated_at=now() where id=p_room;
    return;
  end if;
  ph := case when nextr % 2 = 1 then 'drawing' else 'describing' end;
  dur := coalesce((r.settings->'phaseDurations'->>ph)::int, 60);
  update gartic_rooms set status=ph, current_phase=ph, current_round=nextr,
     phase_ends_at = now() + (dur || ' seconds')::interval, updated_at=now()
  where id=p_room;
end $$;

create or replace function gartic_migrate_host(p_room uuid)
  returns void language plpgsql security definer set search_path=public as $$
declare newh uuid;
begin
  -- only run if current host is disconnected
  if exists(select 1 from gartic_players where room_id=p_room and is_host and connected) then return; end if;
  select id into newh from gartic_players where room_id=p_room and connected and auth_uid=auth.uid()
    order by seat limit 1;  -- caller claims host if eligible
  if newh is null then return; end if;
  update gartic_players set is_host=false where room_id=p_room;
  update gartic_players set is_host=true where id=newh;
  update gartic_rooms set host_player_id=newh, updated_at=now() where id=p_room;
end $$;

grant execute on function gartic_start, gartic_advance, gartic_migrate_host, gartic_now, gartic_seat, gartic_is_host to authenticated, anon;
```

- [ ] **Step 2: Write the applier** (`scripts/apply_migration.py`) — psycopg2, reads `SUPABASE_URL` env, executes the file path passed as argv, prints success. (Mirror today's RLS scripts.)
- [ ] **Step 3: Apply to prod** — `railway run -- py -3 scripts/apply_migration.py supabase/migrations/20260614_brams_phone.sql`. Expected: `migration OK`.
- [ ] **Step 4: Verify** — re-run an introspection query: 3 tables `rowsecurity=true`, 6 policies, 5 functions present. Enable Anonymous sign-ins in dashboard; confirm `supabase.auth.signInAnonymously()` returns a session in a scratch test.
- [ ] **Step 5: Commit** — `git add supabase/migrations scripts/apply_migration.py && git commit -m "feat(brams-phone): schema + RLS + host RPCs"`.

---

## Task 2: Rotation logic (pure, TDD) — N = 1..12

**Files:**
- Create: `src/features/garticphone/logic/rotation.js`
- Test: `src/features/garticphone/logic/rotation.test.js`

- [ ] **Step 1: Write failing tests** (`rotation.test.js`)

```js
import { describe, it, expect } from 'vitest';
import { bookForSeat, seatForBook, pageType, seatTask, buildAlbums } from './rotation.js';

describe('rotation invariants', () => {
  for (let n = 1; n <= 12; n++) {
    it(`N=${n}: each player touches each book exactly once, never own except page 0`, () => {
      const touched = Array.from({ length: n }, () => new Set());
      for (let r = 0; r < n; r++)
        for (let s = 0; s < n; s++) {
          const b = bookForSeat(s, r, n);
          touched[s].add(b);
          if (r > 0) expect(b).not.toBe(s);     // never your own after round 0
        }
      touched.forEach(set => expect(set.size).toBe(n)); // every book once
    });
    it(`N=${n}: book returns to author at reveal order`, () => {
      // page_index r authored by seat bookForSeat? round r writes book at that seat
      for (let b = 0; b < n; b++) expect(seatForBook(b, 0, n)).toBe(b);
    });
  }
  it('pageType: 0 text, odd drawing, even>=2 text', () => {
    expect(pageType(0)).toBe('text'); expect(pageType(1)).toBe('drawing');
    expect(pageType(2)).toBe('text'); expect(pageType(3)).toBe('drawing');
  });
  it('N=1 solo: one task then over', () => {
    expect(seatTask(0, 0, 1)).toEqual({ book: 0, pageIndex: 0, type: 'text' });
    expect(seatTask(0, 1, 1)).toBeNull();
  });
  it('buildAlbums groups + orders', () => {
    const pages = [{book_id:0,page_index:1},{book_id:0,page_index:0},{book_id:1,page_index:0}];
    const a = buildAlbums(pages, 2);
    expect(a[0].pages.map(p=>p.page_index)).toEqual([0,1]);
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run src/features/garticphone/logic/rotation.test.js` → FAIL (module missing).
- [ ] **Step 3: Implement** `rotation.js` (the contract code shown in "Rotation contract" above).
- [ ] **Step 4: Run, verify pass** — same command → all green.
- [ ] **Step 5: Commit** — `git commit -m "feat(brams-phone): rotation logic + tests N=1..12"`.

---

## Task 3: Data + realtime lib (`garticRooms.js`) and upload (`garticUpload.js`)

**Files:**
- Create: `src/lib/garticRooms.js` (clone the REST-direct `rest()` + `subscribeRoom` from `src/lib/undercoverRooms.js`; tables `gartic_rooms/players/pages`).
- Create: `src/lib/garticUpload.js`.

- [ ] **Step 1:** `garticRooms.js` exports — `ensureAnonSession()` (`supabase.auth.signInAnonymously()` if no session), `genRoomCode(4)`, `createRoom({displayName,avatarUrl,userId})`, `joinRoom({code,...})`, `fetchRoom(code)`, `fetchPlayers(roomId)`, `fetchMyPage(roomId)`, `submitPage({roomId,bookId,pageIndex,type,content})`, `setReady`, `touchPlayer`, `setConnected`, RPC wrappers `startGame(roomId,settings)`, `advance(roomId)`, `migrateHost(roomId)`, `serverNow()` (calls `gartic_now`), and `subscribeRoom(roomId,onChange)` (postgres_changes on the 3 tables, filter `room_id=eq.<id>` / `id=eq.<id>`, with the same socket auto-rebuild as undercover). All CRUD via the REST-direct `rest()` helper. **Reason:** supabase-js `.from()` hangs on the auth lock (documented today); REST direct is the project standard.
- [ ] **Step 2:** `garticUpload.js` — `export async function uploadDrawing(canvas, roomCode)`: `canvas.toBlob(... 'image/png')`, POST presign (same endpoint TierListPage uses for `tierlist-*`), `PUT` the blob to the signed URL, return public URL. Filename `gartic-${roomCode}-${crypto.randomUUID()}.png`.
- [ ] **Step 3:** Smoke test in a scratch route: create → join (2nd anon tab) → both appear in `fetchPlayers`. Manual, documented.
- [ ] **Step 4: Commit** — `git commit -m "feat(brams-phone): rooms data/realtime lib + R2 upload"`.

---

## Task 4: `useGarticRoom` hook (state machine glue)

**Files:** Create `src/features/garticphone/useGarticRoom.js`

- [ ] **Step 1:** Hook responsibilities (no UI):
  - On mount: `ensureAnonSession()`, `joinRoom`, `subscribeRoom` → keep `{room, players, me}` in state; `serverNow` offset calibrated once.
  - Derive `myTask = seatTask(me.seat, room.current_round, n)` and `mySubmitted` (does my page exist for this round) via `fetchMyPage`.
  - **Heartbeat:** every 10s `touchPlayer` (sets `last_seen`, `connected=true`); on unload `setConnected(false)`.
  - **Host loop** (only if `me.is_host`): on each tick, if `phase_ends_at` passed OR all connected players submitted the current round → call `advance(roomId)`. Late/AFK: before advancing, host writes empty placeholder pages (`'—'` / blank PNG) for missing seats so the chain never breaks.
  - **Host migration:** if `room.host` disconnected (no `connected` host, stale `last_seen`), the lowest-seat connected client calls `migrateHost(roomId)` (RPC decides atomically).
  - **Reconnection:** subscription + refetch on focus → full resync (already covered by re-deriving from room state).
- [ ] **Step 2:** Unit-test the host-decision helper `shouldAdvance(room, players, pagesThisRound, serverNow)` (pure) — TDD: advances on timeout, advances when all submitted, not before. (Extract this pure fn into `logic/hostLoop.js` + test.)
- [ ] **Step 3:** Commit — `git commit -m "feat(brams-phone): useGarticRoom hook + host-loop logic"`.

---

## Task 5: Pages access — verify RLS, wire fallback RPC if needed

**Files:** `supabase/migrations/20260614_brams_phone.sql` (already has policies); add `gartic_current_page` RPC as ready fallback.

- [ ] **Step 1:** Adversarial check (security-review): from anon session A (seat 0) try to SELECT a page whose `book_id` is not A's current book → must return 0 rows. From the same session try INSERT into the wrong book/round → must be rejected. Script it with the DSN + two anon JWTs.
- [ ] **Step 2:** If the dynamic policy misbehaves (e.g., `n` casting, NULL seat pre-start), swap page reads to RPC `gartic_current_page(p_room)` (SECURITY DEFINER, returns the row at the caller's seat/round) and drop the SELECT policy to `using(false)` for in-game statuses. Keep reveal-time SELECT open to members.
- [ ] **Step 3:** Commit — `git commit -m "test(brams-phone): RLS page-secrecy verified (+ RPC fallback)"`.

---

## Task 6–10: UI (subagents, parallelizable — isolate via worktrees)

Each is one component, inline styles, `import { type, fonts } from '../../styles/typography'`, theme tokens from `theme.js`. Build with `frontend-design`/`canvas-design`, test parcours with `webapp-testing`.

- **Task 6 — `Lobby.jsx`:** room code share, player ring around a captain's-table layout, ready toggles, host settings (rounds=N default, per-phase durations, mode), Start (calls `startGame`). Late join after start → spectator banner.
- **Task 7 — `DrawCanvas.jsx` + `DrawPhase.jsx`:** HTML5 canvas, pointer events (desktop+touch), 3–4 brush sizes, ~16-color palette + picker, eraser, fill (flood), optional eyedropper, undo/redo/clear (stroke stack), prompt shown on top, timer, Submit → `uploadDrawing` → `submitPage`. Auto-submit current canvas at timer 0.
- **Task 8 — `WritePhase.jsx` + `DescribePhase.jsx`:** text inputs with timer + auto-submit; DescribePhase shows the drawing it must caption (read via hook).
- **Task 9 — `Reveal.jsx`:** `buildAlbums`, cinematic page-by-page playback (flashback-style transitions, author name per page), host advances or autoplay; end → shareable recap card (`canvas` → PNG) for Discord.
- **Task 10 — `BramsPhonePage.jsx` + `ui.jsx` + routing:** status→phase switch; add `/brams-phone` + `/brams-phone/:code` to `App.jsx` (navigate() URL pattern); shared `Timer/PlayerChip/PhaseFrame`.

Each task: build → `webapp-testing` the screen → commit.

---

## Task 11: Full-game integration test + verification

- [ ] `webapp-testing`: scripted 4-player game (4 anon contexts) lobby→reveal; assert each book has N pages, correct type order, nobody draws own text.
- [ ] Host-migration test: kill host mid-round → another client takes over → game continues.
- [ ] AFK test: one player never submits → auto-submit placeholder → chain intact.
- [ ] `verification-before-completion`: re-run rotation tests, RLS check, build.
- [ ] Commit.

---

## Task 12: Discord anchors (Phase-2 stub) + deploy

- [ ] `api/brams-phone-webhook.js`: stub that, on a `game_finished` event, would POST to Buster (env `BUSTER_WEBHOOK_URL`). v1 = endpoint + the end-of-game event emitted by `gartic_advance` reaching `finished` (add a `finished` transition + a row/event). No bot logic yet.
- [ ] `deploy` (Vercel) + `env-vars`: confirm `VITE_SUPABASE_URL/ANON_KEY` present; R2 presign env already set. Push to `main` → Vercel build.
- [ ] README: launch, env vars, Discord anchor columns.

---

## Self-review (spec coverage)

- Phases lobby/write/draw/describe/reveal → Tasks 6–10. ✓
- Rotation core + tests N=2..12 (and N=1) → Task 2. ✓
- Host-authoritative timing (`phase_ends_at`, server now, advance on timeout/all-submitted) → Tasks 1,4. ✓
- Edge cases: host migration (Task 1 RPC + Task 4), AFK auto-submit (Task 4), reconnection resync (Task 4), late join → spectator (Task 6). ✓
- RLS page secrecy verified server-side, not front-only → Tasks 1,5 (+ RPC fallback). ✓
- Anonymous auth → Task 1. ✓
- Canvas engine → Task 7. One Piece theme/typography → theme.js + typography.js across UI. ✓
- R2 PNG upload → Task 3. Share card → Task 9. ✓
- Realtime channel → Task 3 (`postgres_changes`); **deviation from spec's presence/broadcast — flagged in Decision 2.** ⚠
- Build Vercel + env → Task 12. ✓
- Discord anchors → Task 12. ✓

**Open questions for you:** (a) OK to use `postgres_changes` instead of Realtime presence/broadcast in v1 (Decision 2)? (b) Confirm you'll toggle **Anonymous sign-ins** on in the Supabase dashboard (Task 1) — I can't do that via SQL. (c) RLS dynamic policy as primary, RPC fallback ready (Decision 3) — good?
