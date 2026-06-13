-- ════════════════════════════════════════════════════════════════════════════
--  DAMES 3D — EN LIGNE CLASSÉ (serveur-autoritaire)
--  Identité = Discord ID (text), cohérent avec le site. Board = format moteur 3D
--  (Array[10][10] de {side:'P'|'M',king}|null) en jsonb. current_turn = 'P'|'M'.
--  Écritures matches/moves = SERVICE ROLE uniquement (fonction Vercel qui valide
--  les coups avec le moteur draughts-engine.js → anti-triche). Matchmaking atomique
--  via RPC SECURITY DEFINER. Sync = Realtime (postgres_changes).
--  → À exécuter dans le SQL Editor Supabase. Pré-requis : _resolve_discord_id().
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists dames_ratings (
  discord_id  text primary key,
  rating      int not null default 1200,
  peak_rating int not null default 1200,
  games int not null default 0, wins int not null default 0, losses int not null default 0, draws int not null default 0,
  updated_at  timestamptz not null default now()
);
create table if not exists dames_rqueue (
  discord_id text primary key,
  rating     int not null,
  joined_at  timestamptz not null default now()
);
create table if not exists dames_rmatches (
  id            uuid primary key default gen_random_uuid(),
  player_pirate text not null,            -- joue P (pirates), commence
  player_marine text not null,            -- joue M (marine)
  status        text not null default 'active',  -- active | finished | aborted
  current_turn  text not null default 'P',       -- 'P' | 'M'
  board_state   jsonb not null,
  winner        text,                            -- 'P' | 'M' | 'draw' | null
  rated         boolean not null default true,
  elo_change_pirate int, elo_change_marine int,
  ply           int not null default 0,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  last_move_at  timestamptz not null default now()
);
create table if not exists dames_rmoves (
  id bigint generated always as identity primary key,
  match_id uuid not null references dames_rmatches(id) on delete cascade,
  ply int not null, player text not null, move jsonb not null, board_after jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists dames_rmoves_idx on dames_rmoves (match_id, ply);
create index if not exists dames_rqueue_rating_idx on dames_rqueue (rating);
create index if not exists dames_rmatches_active_idx on dames_rmatches (status);

-- Realtime
do $$ begin
  begin alter publication supabase_realtime add table dames_rmatches; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table dames_rmoves;   exception when duplicate_object then null; end;
end $$;

-- RLS
alter table dames_ratings  enable row level security;
alter table dames_rqueue   enable row level security;
alter table dames_rmatches enable row level security;
alter table dames_rmoves   enable row level security;

drop policy if exists dames_rt_read on dames_ratings;
create policy dames_rt_read on dames_ratings for select to anon, authenticated using (true);
grant select on dames_ratings to anon, authenticated;

drop policy if exists dames_rm_read on dames_rmatches;
create policy dames_rm_read on dames_rmatches for select to authenticated
  using (player_pirate = _resolve_discord_id() or player_marine = _resolve_discord_id());
grant select on dames_rmatches to authenticated;

drop policy if exists dames_rmv_read on dames_rmoves;
create policy dames_rmv_read on dames_rmoves for select to authenticated
  using (exists (select 1 from dames_rmatches m where m.id = match_id and (m.player_pirate = _resolve_discord_id() or m.player_marine = _resolve_discord_id())));
grant select on dames_rmoves to authenticated;
-- queue : géré uniquement via les RPC ci-dessous (pas d'accès direct).
-- matches/moves : écriture = service role (fonction Vercel) → aucune policy write publique.

-- ── Mon rating (crée à 1200) ──────────────────────────────────────────────────
create or replace function dames_rank_ensure()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_me text := _resolve_discord_id(); v jsonb;
begin
  if v_me is null then return '{"ok":false,"error":"Non authentifié"}'::jsonb; end if;
  insert into dames_ratings (discord_id) values (v_me) on conflict (discord_id) do nothing;
  select to_jsonb(r) into v from dames_ratings r where r.discord_id = v_me;
  return jsonb_build_object('ok', true, 'rating', v);
end; $$;

-- ── Matchmaking atomique : reprend une partie active, sinon apparie, sinon file ──
create or replace function dames_rank_matchmake(p_board jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_me text := _resolve_discord_id(); v_elo int; v_opp text; v_mid uuid; v_color text;
begin
  if v_me is null then return '{"ok":false,"error":"Non authentifié"}'::jsonb; end if;
  insert into dames_ratings (discord_id) values (v_me) on conflict (discord_id) do nothing;
  select rating into v_elo from dames_ratings where discord_id = v_me;

  select id into v_mid from dames_rmatches
    where status = 'active' and (player_pirate = v_me or player_marine = v_me)
    order by started_at desc limit 1;
  if v_mid is not null then
    select case when player_pirate = v_me then 'P' else 'M' end into v_color from dames_rmatches where id = v_mid;
    return jsonb_build_object('ok', true, 'matched', true, 'match_id', v_mid, 'color', v_color, 'resumed', true);
  end if;

  delete from dames_rqueue where joined_at < now() - interval '2 minutes';
  -- adversaire de rating proche en priorité (puis n'importe qui)
  select discord_id into v_opp from dames_rqueue
    where discord_id <> v_me
    order by abs(rating - coalesce(v_elo,1200)) asc, joined_at asc
    for update skip locked limit 1;

  if v_opp is null then
    insert into dames_rqueue (discord_id, rating) values (v_me, coalesce(v_elo,1200))
      on conflict (discord_id) do update set rating = excluded.rating, joined_at = now();
    return jsonb_build_object('ok', true, 'matched', false, 'queued', true);
  end if;

  if p_board is null then return '{"ok":false,"error":"Plateau initial manquant"}'::jsonb; end if;
  if random() < 0.5 then
    insert into dames_rmatches (player_pirate, player_marine, board_state) values (v_me, v_opp, p_board) returning id into v_mid; v_color := 'P';
  else
    insert into dames_rmatches (player_pirate, player_marine, board_state) values (v_opp, v_me, p_board) returning id into v_mid; v_color := 'M';
  end if;
  delete from dames_rqueue where discord_id in (v_me, v_opp);
  return jsonb_build_object('ok', true, 'matched', true, 'match_id', v_mid, 'color', v_color);
end; $$;

create or replace function dames_rank_cancel()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_me text := _resolve_discord_id();
begin
  if v_me is null then return '{"ok":false}'::jsonb; end if;
  delete from dames_rqueue where discord_id = v_me;
  return '{"ok":true}'::jsonb;
end; $$;

-- ── Ma partie active (reconnexion) + détail ───────────────────────────────────
create or replace function dames_rank_match(p_match_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_me text := _resolve_discord_id(); m record; v_opp text; ou jsonb;
begin
  if v_me is null then return '{"ok":false,"error":"Non authentifié"}'::jsonb; end if;
  if p_match_id is not null then select * into m from dames_rmatches where id = p_match_id;
  else select * into m from dames_rmatches where status='active' and (player_pirate=v_me or player_marine=v_me) order by started_at desc limit 1; end if;
  if not found then return jsonb_build_object('ok', true, 'match', null); end if;
  if m.player_pirate <> v_me and m.player_marine <> v_me then return '{"ok":false,"error":"Pas ta partie"}'::jsonb; end if;
  v_opp := case when m.player_pirate = v_me then m.player_marine else m.player_pirate end;
  select jsonb_build_object('username', coalesce(u.data->>'username', '#'||right(v_opp,5)), 'avatar', u.data->>'avatar_url') into ou from users u where u.uid = v_opp;
  return jsonb_build_object('ok', true, 'match', jsonb_build_object(
    'id', m.id, 'player_pirate', m.player_pirate, 'player_marine', m.player_marine,
    'current_turn', m.current_turn, 'board_state', m.board_state, 'status', m.status, 'winner', m.winner,
    'ply', m.ply, 'elo_change_pirate', m.elo_change_pirate, 'elo_change_marine', m.elo_change_marine,
    'my_color', case when m.player_pirate = v_me then 'P' else 'M' end, 'opponent', coalesce(ou, '{}'::jsonb)));
end; $$;

create or replace function dames_rank_leaderboard(p_limit int default 50)
returns jsonb language sql security definer stable set search_path = public, pg_temp as $$
  select jsonb_build_object('ok', true, 'rows', coalesce(jsonb_agg(row order by rating desc), '[]'::jsonb))
  from (
    select jsonb_build_object('discord_id', dr.discord_id, 'rating', dr.rating, 'peak', dr.peak_rating,
      'wins', dr.wins, 'losses', dr.losses, 'draws', dr.draws, 'games', dr.games,
      'username', coalesce(u.data->>'username', '#'||right(dr.discord_id,5)), 'avatar', u.data->>'avatar_url') as row, dr.rating
    from dames_ratings dr left join users u on u.uid = dr.discord_id
    where dr.games > 0 order by dr.rating desc limit greatest(1, least(coalesce(p_limit,50),200))
  ) s;
$$;

grant execute on function dames_rank_ensure(), dames_rank_matchmake(jsonb), dames_rank_cancel(),
  dames_rank_match(uuid), dames_rank_leaderboard(int) to authenticated;
grant execute on function dames_rank_leaderboard(int) to anon;
