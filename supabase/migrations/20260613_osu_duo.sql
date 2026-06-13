-- ════════════════════════════════════════════════════════════════════════════
--  FRED'ISU — Mode DUO RELAIS (co-op temps réel à tour de rôle)
--  Identité = Discord ID (text, cohérent avec le site ; le jeu /fredisu.html lit
--  la session SPA depuis le localStorage). Le GAMEPLAY LIVE passe par Supabase
--  Realtime Broadcast (éphémère) — ces tables ne stockent que lobby + scores finaux.
--  → À exécuter dans le SQL Editor Supabase. Pré-requis : _resolve_discord_id(), users.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists osu_rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  host        text not null,                 -- discord_id
  guest       text,                          -- discord_id
  beatmap_ref text,                          -- id de map ou hash audio
  segment_ms  int not null default 30000,
  status      text not null default 'lobby', -- lobby | playing | finished
  created_at  timestamptz not null default now()
);
create table if not exists osu_duo_scores (
  id bigint generated always as identity primary key,
  room_id     uuid references osu_rooms(id) on delete set null,
  player_a    text not null,                 -- discord_id
  player_b    text not null,
  beatmap_ref text,
  segment_ms  int not null,
  total_score int not null,
  max_combo   int not null,
  accuracy    real not null,
  passed      boolean not null,
  created_at  timestamptz not null default now()
);
create index if not exists osu_duo_scores_lb_idx on osu_duo_scores (beatmap_ref, total_score desc);
create index if not exists osu_rooms_code_idx on osu_rooms (code);

alter table osu_rooms      enable row level security;
alter table osu_duo_scores enable row level security;

-- Rooms : lecture publique (rejoindre par code) ; un joueur gère sa room (host/guest).
drop policy if exists osu_rooms_read on osu_rooms;
create policy osu_rooms_read on osu_rooms for select to anon, authenticated using (true);
drop policy if exists osu_rooms_manage on osu_rooms;
create policy osu_rooms_manage on osu_rooms for all to authenticated
  using (host = _resolve_discord_id() or guest = _resolve_discord_id())
  with check (host = _resolve_discord_id() or guest = _resolve_discord_id());
-- Rejoindre une room d'un autre (poser guest) : autorisé tant que la place est libre.
drop policy if exists osu_rooms_join on osu_rooms;
create policy osu_rooms_join on osu_rooms for update to authenticated
  using (guest is null) with check (guest = _resolve_discord_id());
grant select, insert, update on osu_rooms to authenticated;
grant select on osu_rooms to anon;

drop policy if exists osu_duo_read on osu_duo_scores;
create policy osu_duo_read on osu_duo_scores for select to anon, authenticated using (true);
drop policy if exists osu_duo_insert on osu_duo_scores;
create policy osu_duo_insert on osu_duo_scores for insert to authenticated
  with check (player_a = _resolve_discord_id() or player_b = _resolve_discord_id());
grant select, insert on osu_duo_scores to anon, authenticated;

-- Leaderboard duos (public, pseudos via users)
create or replace function osu_duo_leaderboard(p_beatmap text default null, p_limit int default 30)
returns jsonb language sql security definer stable set search_path = public, pg_temp as $$
  select jsonb_build_object('ok', true, 'rows', coalesce(jsonb_agg(row order by total desc), '[]'::jsonb))
  from (
    select jsonb_build_object('total_score', s.total_score, 'max_combo', s.max_combo, 'accuracy', s.accuracy,
      'beatmap_ref', s.beatmap_ref, 'passed', s.passed,
      'a', coalesce(ua.data->>'username', '#'||right(s.player_a,5)), 'b', coalesce(ub.data->>'username', '#'||right(s.player_b,5)),
      'created_at', s.created_at) as row, s.total_score as total
    from osu_duo_scores s
    left join users ua on ua.uid = s.player_a
    left join users ub on ub.uid = s.player_b
    where p_beatmap is null or s.beatmap_ref = p_beatmap
    order by s.total_score desc limit greatest(1, least(coalesce(p_limit,30), 100))
  ) t;
$$;
grant execute on function osu_duo_leaderboard(text, int) to anon, authenticated;
