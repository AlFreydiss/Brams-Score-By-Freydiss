-- Guess Who — jeu d'imitation de sons anime. Idempotent : peut être recollé.
-- Tables fermées en écriture ; tout passe par des fonctions SECURITY DEFINER
-- qui vérifient le jeton secret du joueur. Le serveur calcule votes, vies,
-- revote et gage (aucune triche possible depuis le navigateur).

create table if not exists guesswho_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_user_id text not null,
  status text not null default 'lobby',          -- lobby | playing | ended
  phase text not null default 'lobby',           -- lobby|gages|listen|record|vote|revote|result|gage|end
  round int not null default 0,
  phase_ends_at timestamptz,
  clip jsonb,
  used_clips text[] not null default '{}',
  tied text[] not null default '{}',
  last_result jsonb,
  gage_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists guesswho_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references guesswho_rooms(id) on delete cascade,
  user_id text not null,
  display_name text not null default 'Invité',
  avatar_url text,
  seat int,
  lives int not null default 2,
  total_votes int not null default 0,
  is_host boolean not null default false,
  gage text,
  secret_token uuid not null default gen_random_uuid(),
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (room_id, user_id)
);

create table if not exists guesswho_takes (
  room_id uuid not null references guesswho_rooms(id) on delete cascade,
  round int not null,
  user_id text not null,
  audio_url text not null,
  duration real,
  created_at timestamptz not null default now(),
  primary key (room_id, round, user_id)
);

create table if not exists guesswho_votes (
  room_id uuid not null references guesswho_rooms(id) on delete cascade,
  round int not null,
  stage text not null,                            -- vote | revote
  voter text not null,
  target text not null,
  created_at timestamptz not null default now(),
  primary key (room_id, round, stage, voter)
);

create table if not exists guesswho_clips (
  id text primary key,
  title text not null,
  anime text not null,
  lang text not null,                             -- fr | ja
  kind text not null,                             -- technique | opening | meme
  url text not null,
  duration real not null,
  enabled boolean not null default false
);

alter table guesswho_rooms   enable row level security;
alter table guesswho_players enable row level security;
alter table guesswho_takes   enable row level security;
alter table guesswho_votes   enable row level security;
alter table guesswho_clips   enable row level security;

drop policy if exists gw_rooms_select on guesswho_rooms;
create policy gw_rooms_select on guesswho_rooms for select to anon, authenticated using (true);
drop policy if exists gw_clips_select on guesswho_clips;
create policy gw_clips_select on guesswho_clips for select to anon, authenticated using (enabled);

-- Realtime : seuls les changements de salon sont diffusés (phase, tour, son).
do $$ begin
  alter publication supabase_realtime add table guesswho_rooms;
exception when duplicate_object then null; when undefined_object then null; end $$;

create or replace function guesswho_now() returns timestamptz
  language sql stable as $$ select now() $$;

create or replace function _gw_duration(p_phase text) returns int
  language sql immutable as $$
  select case p_phase
    when 'gages' then 45 when 'listen' then 20 when 'record' then 40
    when 'vote' then 45 when 'revote' then 25 when 'result' then 8
    when 'gage' then 10 else 0 end
$$;

create or replace function _gw_player(p_code text, p_token uuid)
  returns guesswho_players language sql stable security definer set search_path = public as $$
  select pl.* from guesswho_players pl join guesswho_rooms r on r.id = pl.room_id
  where r.code = upper(p_code) and pl.secret_token = p_token
$$;

create or replace function guesswho_create(p_code text, p_user text, p_name text, p_avatar text)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room guesswho_rooms; v_tok uuid;
begin
  begin
    insert into guesswho_rooms(code, host_user_id) values (upper(p_code), p_user) returning * into v_room;
  exception when unique_violation then
    return jsonb_build_object('error', 'code_taken');
  end;
  insert into guesswho_players(room_id, user_id, display_name, avatar_url, is_host)
    values (v_room.id, p_user, coalesce(nullif(btrim(p_name), ''), 'Invité'), p_avatar, true)
    returning secret_token into v_tok;
  return jsonb_build_object('code', v_room.code, 'room_id', v_room.id, 'secret_token', v_tok);
end $$;

create or replace function guesswho_join(p_code text, p_user text, p_name text, p_avatar text, p_token uuid default null)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room guesswho_rooms; v_pl guesswho_players; v_n int;
begin
  select * into v_room from guesswho_rooms where code = upper(p_code);
  if v_room.id is null then return jsonb_build_object('error', 'introuvable'); end if;
  select * into v_pl from guesswho_players where room_id = v_room.id and user_id = p_user;
  if v_pl.id is not null then
    if p_token is distinct from v_pl.secret_token then
      return jsonb_build_object('spectator', true, 'room_id', v_room.id, 'reason', 'seat_taken');
    end if;
    update guesswho_players set last_seen = now(),
      display_name = coalesce(nullif(btrim(p_name), ''), display_name), avatar_url = p_avatar
      where id = v_pl.id;
    return jsonb_build_object('secret_token', v_pl.secret_token, 'room_id', v_room.id, 'spectator', false);
  end if;
  if v_room.phase not in ('lobby', 'end') then
    return jsonb_build_object('spectator', true, 'room_id', v_room.id, 'reason', 'started');
  end if;
  select count(*) into v_n from guesswho_players where room_id = v_room.id;
  if v_n >= 8 then
    return jsonb_build_object('spectator', true, 'room_id', v_room.id, 'reason', 'full');
  end if;
  insert into guesswho_players(room_id, user_id, display_name, avatar_url)
    values (v_room.id, p_user, coalesce(nullif(btrim(p_name), ''), 'Invité'), p_avatar)
    returning * into v_pl;
  return jsonb_build_object('secret_token', v_pl.secret_token, 'room_id', v_room.id, 'spectator', false);
end $$;

create or replace function guesswho_room_state(p_code text)
  returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_room guesswho_rooms;
begin
  select * into v_room from guesswho_rooms where code = upper(p_code);
  if v_room.id is null then return jsonb_build_object('error', 'introuvable'); end if;
  return jsonb_build_object('room', to_jsonb(v_room), 'players', coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', user_id, 'display_name', display_name, 'avatar_url', avatar_url,
      'seat', seat, 'lives', lives, 'total_votes', total_votes, 'is_host', is_host,
      'connected', last_seen > now() - interval '22 seconds',
      'has_gage', gage is not null) order by joined_at)
    from guesswho_players where room_id = v_room.id), '[]'::jsonb));
end $$;

create or replace function guesswho_touch(p_code text, p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_pl guesswho_players;
begin
  select * into v_pl from _gw_player(p_code, p_token);
  if v_pl.id is null then return jsonb_build_object('error', 'unauthorized'); end if;
  update guesswho_players set last_seen = now() where id = v_pl.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function guesswho_promote_host(p_code text, p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_pl guesswho_players; v_alive boolean; v_first uuid;
begin
  select * into v_pl from _gw_player(p_code, p_token);
  if v_pl.id is null then return jsonb_build_object('error', 'unauthorized'); end if;
  select exists(select 1 from guesswho_players where room_id = v_pl.room_id and is_host
    and last_seen > now() - interval '22 seconds') into v_alive;
  if v_alive then return jsonb_build_object('ok', false, 'reason', 'host_alive'); end if;
  select id into v_first from guesswho_players where room_id = v_pl.room_id
    and last_seen > now() - interval '22 seconds' order by joined_at limit 1;
  if v_first is distinct from v_pl.id then return jsonb_build_object('ok', false, 'reason', 'not_candidate'); end if;
  update guesswho_players set is_host = (id = v_pl.id) where room_id = v_pl.room_id;
  update guesswho_rooms set host_user_id = v_pl.user_id, updated_at = now() where id = v_pl.room_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function _gw_set_phase(p_room uuid, p_phase text)
  returns void language plpgsql security definer set search_path = public as $$
declare v_dur int := _gw_duration(p_phase);
begin
  update guesswho_rooms set phase = p_phase,
    phase_ends_at = case when v_dur > 0 then now() + make_interval(secs => v_dur) else null end,
    updated_at = now()
  where id = p_room;
end $$;

-- Lance (ou relance après la fin) : sièges, vies, gages et tours remis à zéro.
create or replace function guesswho_start(p_code text, p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_pl guesswho_players; v_room guesswho_rooms; v_n int;
begin
  select * into v_pl from _gw_player(p_code, p_token);
  if v_pl.id is null or not v_pl.is_host then return jsonb_build_object('error', 'unauthorized'); end if;
  select * into v_room from guesswho_rooms where id = v_pl.room_id for update;
  if v_room.phase not in ('lobby', 'end') then return jsonb_build_object('error', 'phase'); end if;
  select count(*) into v_n from guesswho_players where room_id = v_room.id;
  if v_n < 3 then return jsonb_build_object('error', 'not_enough_players'); end if;
  with o as (select id, row_number() over (order by joined_at) - 1 as rn
             from guesswho_players where room_id = v_room.id)
  update guesswho_players p set seat = o.rn, lives = 2, total_votes = 0, gage = null
    from o where p.id = o.id;
  delete from guesswho_takes where room_id = v_room.id;
  delete from guesswho_votes where room_id = v_room.id;
  update guesswho_rooms set status = 'playing', round = 0, clip = null, used_clips = '{}',
    tied = '{}', last_result = null, gage_result = null where id = v_room.id;
  perform _gw_set_phase(v_room.id, 'gages');
  return jsonb_build_object('ok', true, 'players', v_n);
end $$;

create or replace function guesswho_submit_gage(p_code text, p_token uuid, p_text text)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_pl guesswho_players; v_text text := left(btrim(coalesce(p_text, '')), 140);
begin
  select * into v_pl from _gw_player(p_code, p_token);
  if v_pl.id is null or v_pl.seat is null then return jsonb_build_object('error', 'unauthorized'); end if;
  if (select phase from guesswho_rooms where id = v_pl.room_id) <> 'gages' then
    return jsonb_build_object('error', 'phase'); end if;
  if v_text = '' then return jsonb_build_object('error', 'empty'); end if;
  update guesswho_players set gage = v_text where id = v_pl.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function guesswho_submit_take(p_code text, p_token uuid, p_url text, p_duration real, p_round int)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_pl guesswho_players; v_room guesswho_rooms;
begin
  select * into v_pl from _gw_player(p_code, p_token);
  if v_pl.id is null or v_pl.seat is null or v_pl.lives <= 0 then
    return jsonb_build_object('error', 'unauthorized'); end if;
  select * into v_room from guesswho_rooms where id = v_pl.room_id;
  if v_room.phase <> 'record' or v_room.round <> p_round then
    return jsonb_build_object('error', 'phase'); end if;
  if p_url is null or not (p_url like 'https://%' or p_url like 'data:audio/%') then
    return jsonb_build_object('error', 'bad_url'); end if;
  if length(p_url) > 200000 then return jsonb_build_object('error', 'too_big'); end if;
  insert into guesswho_takes(room_id, round, user_id, audio_url, duration)
    values (v_room.id, v_room.round, v_pl.user_id, p_url, p_duration)
    on conflict (room_id, round, user_id)
    do update set audio_url = excluded.audio_url, duration = excluded.duration, created_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function guesswho_vote(p_code text, p_token uuid, p_target text)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_pl guesswho_players; v_room guesswho_rooms;
begin
  select * into v_pl from _gw_player(p_code, p_token);
  if v_pl.id is null or v_pl.seat is null then return jsonb_build_object('error', 'unauthorized'); end if;
  select * into v_room from guesswho_rooms where id = v_pl.room_id;
  if v_room.phase not in ('vote', 'revote') then return jsonb_build_object('error', 'phase'); end if;
  if p_target = v_pl.user_id then return jsonb_build_object('error', 'self'); end if;
  if not exists (select 1 from guesswho_takes where room_id = v_room.id and round = v_room.round and user_id = p_target)
     or (v_room.phase = 'revote' and not (p_target = any(v_room.tied))) then
    return jsonb_build_object('error', 'invalid_target');
  end if;
  insert into guesswho_votes(room_id, round, stage, voter, target)
    values (v_room.id, v_room.round, v_room.phase, v_pl.user_id, p_target)
    on conflict (room_id, round, stage, voter) do update set target = excluded.target, created_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function guesswho_progress(p_code text)
  returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r guesswho_rooms;
begin
  select * into r from guesswho_rooms where code = upper(p_code);
  if r.id is null then return jsonb_build_object('error', 'introuvable'); end if;
  return jsonb_build_object('phase', r.phase, 'round', r.round,
    'took', coalesce((select jsonb_agg(user_id) from guesswho_takes where room_id = r.id and round = r.round), '[]'::jsonb),
    'voted', coalesce((select jsonb_agg(voter) from guesswho_votes where room_id = r.id and round = r.round and stage = r.phase), '[]'::jsonb),
    'gaged', coalesce((select jsonb_agg(user_id) from guesswho_players where room_id = r.id and gage is not null), '[]'::jsonb));
end $$;

create or replace function guesswho_takes(p_code text, p_round int)
  returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r guesswho_rooms;
begin
  select * into r from guesswho_rooms where code = upper(p_code);
  if r.id is null then return jsonb_build_object('error', 'introuvable'); end if;
  if not (p_round < r.round or (p_round = r.round and r.phase in ('vote', 'revote', 'result', 'gage', 'end'))) then
    return jsonb_build_object('error', 'hidden');
  end if;
  return jsonb_build_object('takes', coalesce((
    select jsonb_agg(jsonb_build_object('user_id', user_id, 'audio_url', audio_url, 'duration', duration) order by created_at)
    from guesswho_takes where room_id = r.id and round = p_round), '[]'::jsonb));
end $$;

-- ── Droits ───────────────────────────────────────────────────────────────────
revoke execute on function _gw_duration(text), _gw_player(text, uuid), _gw_set_phase(uuid, text)
  from public, anon, authenticated;
grant execute on function guesswho_now(), guesswho_create(text, text, text, text),
  guesswho_join(text, text, text, text, uuid), guesswho_room_state(text),
  guesswho_touch(text, uuid), guesswho_promote_host(text, uuid),
  guesswho_start(text, uuid), guesswho_submit_gage(text, uuid, text),
  guesswho_submit_take(text, uuid, text, real, int), guesswho_vote(text, uuid, text),
  guesswho_progress(text), guesswho_takes(text, int) to anon, authenticated;
