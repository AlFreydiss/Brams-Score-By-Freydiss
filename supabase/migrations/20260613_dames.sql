-- ════════════════════════════════════════════════════════════════════════════
--  JEU DE DAMES — profils ELO, parties, file d'attente + leaderboard
--  Identité = Discord ID (text), comme le reste du site (cf. 20260601_post_reports).
--  Pré-requis : _resolve_discord_id() + table users (uid, data) déjà créés.
--  RPC de matchmaking / fin de partie (find/finish) : étape 5 (multijoueur).
--  → À exécuter dans le SQL Editor Supabase.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Profil dames (1 par membre) ───────────────────────────────────────────────
create table if not exists dames_profiles (
  user_id        text primary key,
  elo            integer not null default 1000,
  rank_tier      text    not null default 'supernova',
  wins           integer not null default 0,
  losses         integer not null default 0,
  draws          integer not null default 0,
  games_played   integer not null default 0,
  current_streak integer not null default 0,
  best_streak    integer not null default 0,
  peak_elo       integer not null default 1000,
  updated_at     timestamptz not null default now()
);
alter table dames_profiles enable row level security;
-- Leaderboard = lecture publique. Écriture uniquement via RPC SECURITY DEFINER.
drop policy if exists dames_profiles_read_public on dames_profiles;
create policy dames_profiles_read_public on dames_profiles for select to anon, authenticated using (true);
grant select on dames_profiles to anon, authenticated;

-- ── Parties ───────────────────────────────────────────────────────────────────
create table if not exists dames_matches (
  id             uuid primary key default gen_random_uuid(),
  ruleset        text not null default 'international',
  player_red     text,
  player_black   text,
  current_turn   text not null default 'red',
  board_state    jsonb not null,
  move_history   jsonb not null default '[]',
  status         text not null default 'active',   -- active | finished | abandoned
  winner         text,
  win_reason     text,                             -- no_moves | resign | timeout | no_pieces
  is_ranked      boolean not null default true,
  elo_change_red integer,
  elo_change_black integer,
  red_time_left  integer,
  black_time_left integer,
  created_at     timestamptz not null default now(),
  ended_at       timestamptz
);
alter table dames_matches enable row level security;
-- Les deux joueurs peuvent lire leur partie (écriture des coups : RPC étape 5).
drop policy if exists dames_matches_read_players on dames_matches;
create policy dames_matches_read_players on dames_matches for select to authenticated
  using (player_red = _resolve_discord_id() or player_black = _resolve_discord_id());
grant select on dames_matches to authenticated;

-- ── File d'attente matchmaking ────────────────────────────────────────────────
create table if not exists dames_queue (
  user_id   text primary key,
  elo       integer not null,
  ruleset   text not null default 'international',
  joined_at timestamptz not null default now()
);
alter table dames_queue enable row level security;
-- Pas de policy directe : tout passe par les RPC (étape 5).

create index if not exists dames_profiles_elo_idx on dames_profiles (elo desc);
create index if not exists dames_matches_status_idx on dames_matches (status, created_at desc);

-- ── Mon profil (crée à 1000 si absent) ────────────────────────────────────────
create or replace function ensure_dames_profile()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_me text := _resolve_discord_id(); v jsonb;
begin
  if v_me is null then return '{"ok":false,"error":"Non authentifié"}'::jsonb; end if;
  insert into dames_profiles (user_id) values (v_me) on conflict (user_id) do nothing;
  select to_jsonb(p) into v from dames_profiles p where p.user_id = v_me;
  return jsonb_build_object('ok', true, 'profile', v);
end; $$;

-- ── Leaderboard (top N par ELO, avec pseudo + avatar) ─────────────────────────
create or replace function get_dames_leaderboard(p_limit int default 50)
returns jsonb language sql security definer stable set search_path = public, pg_temp as $$
  select jsonb_build_object('ok', true, 'rows', coalesce(jsonb_agg(row order by elo desc), '[]'::jsonb))
  from (
    select jsonb_build_object(
      'user_id', dp.user_id,
      'elo', dp.elo,
      'rank_tier', dp.rank_tier,
      'wins', dp.wins, 'losses', dp.losses, 'draws', dp.draws,
      'games_played', dp.games_played, 'best_streak', dp.best_streak, 'peak_elo', dp.peak_elo,
      'username', coalesce(u.data->>'username', '#' || right(dp.user_id, 5)),
      'avatar',   u.data->>'avatar_url'
    ) AS row, dp.elo AS elo
    from dames_profiles dp
    left join users u on u.uid = dp.user_id
    where dp.games_played > 0
    order by dp.elo desc
    limit greatest(1, least(coalesce(p_limit, 50), 200))
  ) s;
$$;
