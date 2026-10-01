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
  -- Seuls les joueurs encore là jouent : un onglet fermé ne doit pas recevoir de
  -- place (il perdrait d'office chaque tour et fausserait toute la partie).
  select count(*) into v_n from guesswho_players
    where room_id = v_room.id and last_seen > now() - interval '22 seconds';
  if v_n < 3 then return jsonb_build_object('error', 'not_enough_players'); end if;
  delete from guesswho_players
    where room_id = v_room.id and last_seen <= now() - interval '22 seconds' and not is_host;
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
  -- Uniquement R2 du site ou audio inline : une URL externe ferait charger le
  -- serveur d'un tricheur à tous les votants (fuite de leurs adresses IP).
  if p_url is null or not (p_url like 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/%'
                           or p_url like 'data:audio/%') then
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

-- Tout le monde a-t-il fini la phase ? (joueurs connectés seulement)
create or replace function _gw_all_done(p_room uuid)
  returns boolean language plpgsql stable security definer set search_path = public as $$
declare r guesswho_rooms;
begin
  select * into r from guesswho_rooms where id = p_room;
  if r.phase = 'gages' then
    return not exists (select 1 from guesswho_players where room_id = p_room and seat is not null
      and last_seen > now() - interval '22 seconds' and gage is null);
  elsif r.phase = 'record' then
    return not exists (select 1 from guesswho_players p where p.room_id = p_room and p.seat is not null
      and p.lives > 0 and p.last_seen > now() - interval '22 seconds'
      and not exists (select 1 from guesswho_takes t where t.room_id = p_room and t.round = r.round and t.user_id = p.user_id));
  elsif r.phase in ('vote', 'revote') then
    return not exists (select 1 from guesswho_players p where p.room_id = p_room and p.seat is not null
      and p.last_seen > now() - interval '22 seconds'
      and not exists (select 1 from guesswho_votes v where v.room_id = p_room and v.round = r.round
        and v.stage = r.phase and v.voter = p.user_id));
  end if;
  return false;
end $$;

-- Son au hasard parmi les actifs pas encore joués (sinon parmi tous les actifs).
create or replace function _gw_pick_clip(p_used text[])
  returns jsonb language sql volatile security definer set search_path = public as $$
  select coalesce(
    (select to_jsonb(c) from guesswho_clips c where c.enabled and not (c.id = any(p_used)) order by random() limit 1),
    (select to_jsonb(c) from guesswho_clips c where c.enabled order by random() limit 1))
$$;

create or replace function _gw_begin_round(p_room uuid)
  returns void language plpgsql security definer set search_path = public as $$
declare v_clip jsonb;
begin
  v_clip := _gw_pick_clip((select used_clips from guesswho_rooms where id = p_room));
  update guesswho_rooms set round = round + 1, clip = v_clip, tied = '{}',
    used_clips = case when v_clip is null then used_clips else array_append(used_clips, v_clip->>'id') end
  where id = p_room;
  perform _gw_set_phase(p_room, 'listen');
end $$;

-- Calcule le résultat du tour. p_stage : 'vote' | 'revote' | 'auto' (< 2 imitations).
create or replace function _gw_resolve(p_room uuid, p_stage text)
  returns void language plpgsql security definer set search_path = public as $$
declare r guesswho_rooms; v_scores jsonb; v_rev jsonb; v_min int;
        v_tied text[]; v_losers text[]; v_notake text[];
begin
  select * into r from guesswho_rooms where id = p_room;

  select coalesce(jsonb_object_agg(p.user_id, coalesce(v.n, 0)), '{}'::jsonb) into v_scores
  from guesswho_players p
  left join (select target, count(*)::int as n from guesswho_votes
             where room_id = p_room and round = r.round and stage = 'vote' group by target) v
    on v.target = p.user_id
  where p.room_id = p_room and p.seat is not null;

  select coalesce(array_agg(p.user_id), '{}') into v_notake from guesswho_players p
  where p.room_id = p_room and p.seat is not null
    and not exists (select 1 from guesswho_takes t where t.room_id = p_room and t.round = r.round and t.user_id = p.user_id);

  if p_stage = 'auto' then
    v_losers := v_notake;
  elsif p_stage = 'vote' then
    if cardinality(v_notake) > 0 then
      v_losers := v_notake;                       -- pas d'imitation = perd d'office
    else
      select min(value::int) into v_min from jsonb_each_text(v_scores);
      select array_agg(key) into v_tied from jsonb_each_text(v_scores) where value::int = v_min;
      if cardinality(v_tied) > 1 then
        update guesswho_rooms set tied = v_tied where id = p_room;
        perform _gw_set_phase(p_room, 'revote');
        return;
      end if;
      v_losers := v_tied;
    end if;
  else
    select coalesce(jsonb_object_agg(t.uid, coalesce(v.n, 0)), '{}'::jsonb) into v_rev
    from unnest(r.tied) as t(uid)
    left join (select target, count(*)::int as n from guesswho_votes
               where room_id = p_room and round = r.round and stage = 'revote' group by target) v
      on v.target = t.uid;
    select min(value::int) into v_min from jsonb_each_text(v_rev);
    select array_agg(key) into v_losers from jsonb_each_text(v_rev) where value::int = v_min;
  end if;

  v_losers := coalesce(v_losers, '{}');
  update guesswho_players set lives = greatest(0, lives - 1)
    where room_id = p_room and user_id = any(v_losers);
  update guesswho_players p set total_votes = total_votes + coalesce((v_scores->>p.user_id)::int, 0)
    where p.room_id = p_room and p.seat is not null;
  update guesswho_rooms set tied = '{}', last_result = jsonb_build_object(
      'round', r.round, 'stage', p_stage, 'scores', v_scores, 'revote_scores', v_rev,
      'losers', to_jsonb(v_losers),
      'votes', coalesce((select jsonb_agg(jsonb_build_object('voter', voter, 'target', target, 'stage', stage))
                         from guesswho_votes where room_id = p_room and round = r.round), '[]'::jsonb))
    where id = p_room;
  perform _gw_set_phase(p_room, 'result');
end $$;

-- Un gage par joueur à 0 vie, tiré parmi les gages des AUTRES (jamais deux fois
-- le même) ; à défaut, gage de secours.
create or replace function _gw_draw_gages(p_room uuid)
  returns void language plpgsql security definer set search_path = public as $$
declare d record; v_pid uuid; v_gage text; v_author text; v_used uuid[] := '{}'; v_out jsonb := '[]'::jsonb;
        v_fallback text[] := array[
          'Chanter l''opening de ton anime préféré en vocal',
          'Parler avec l''accent de ton choix pendant 5 minutes',
          'Garder la photo de profil choisie par le groupe pendant 24 h',
          'Imiter un personnage d''anime choisi par le groupe',
          'Envoyer un vocal où tu cries ta technique préférée'];
begin
  for d in select user_id, display_name from guesswho_players
           where room_id = p_room and seat is not null and lives <= 0 order by seat loop
    v_pid := null; v_gage := null; v_author := null;
    select p.id, p.gage, p.display_name into v_pid, v_gage, v_author from guesswho_players p
      where p.room_id = p_room and p.user_id <> d.user_id and p.gage is not null and not (p.id = any(v_used))
      order by random() limit 1;
    if v_pid is null then
      v_gage := v_fallback[1 + floor(random() * cardinality(v_fallback))::int];
    else
      v_used := array_append(v_used, v_pid);
    end if;
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'user_id', d.user_id, 'name', d.display_name, 'gage', v_gage, 'author', v_author));
  end loop;
  update guesswho_rooms set gage_result = v_out where id = p_room;
  perform _gw_set_phase(p_room, 'gage');
end $$;

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
  if not ((v_pl.is_host and (v_due or _gw_all_done(r.id))) or v_late) then
    return jsonb_build_object('ok', false, 'reason', 'too_early');
  end if;

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
    if exists (select 1 from guesswho_players where room_id = r.id and seat is not null and lives <= 0) then
      perform _gw_draw_gages(r.id);
    else
      perform _gw_begin_round(r.id);
    end if;
  elsif r.phase = 'gage' then
    update guesswho_rooms set status = 'ended', phase = 'end', phase_ends_at = null, updated_at = now()
      where id = r.id;
  end if;
  return jsonb_build_object('ok', true, 'phase', (select phase from guesswho_rooms where id = r.id));
end $$;

create or replace function guesswho_skip_clip(p_code text, p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_pl guesswho_players; r guesswho_rooms; v_clip jsonb;
begin
  select * into v_pl from _gw_player(p_code, p_token);
  if v_pl.id is null or not v_pl.is_host then return jsonb_build_object('error', 'unauthorized'); end if;
  select * into r from guesswho_rooms where id = v_pl.room_id for update;
  if r.phase <> 'listen' then return jsonb_build_object('error', 'phase'); end if;
  v_clip := _gw_pick_clip(r.used_clips);
  if v_clip is null then return jsonb_build_object('error', 'no_clip'); end if;
  update guesswho_rooms set clip = v_clip, used_clips = array_append(used_clips, v_clip->>'id') where id = r.id;
  perform _gw_set_phase(r.id, 'listen');
  return jsonb_build_object('ok', true);
end $$;

-- ── Droits ───────────────────────────────────────────────────────────────────
revoke execute on function _gw_duration(text), _gw_player(text, uuid), _gw_set_phase(uuid, text),
  _gw_all_done(uuid), _gw_pick_clip(text[]), _gw_begin_round(uuid), _gw_resolve(uuid, text),
  _gw_draw_gages(uuid) from public, anon, authenticated;
grant execute on function guesswho_now(), guesswho_create(text, text, text, text),
  guesswho_join(text, text, text, text, uuid), guesswho_room_state(text),
  guesswho_touch(text, uuid), guesswho_promote_host(text, uuid),
  guesswho_start(text, uuid), guesswho_submit_gage(text, uuid, text),
  guesswho_submit_take(text, uuid, text, real, int), guesswho_vote(text, uuid, text),
  guesswho_progress(text), guesswho_takes(text, int),
  guesswho_advance(text, uuid, text, int), guesswho_skip_clip(text, uuid) to anon, authenticated;
