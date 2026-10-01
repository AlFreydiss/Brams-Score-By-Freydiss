-- Guess Who — modes de jeu (à coller APRÈS 20261001_guess_who.sql). Idempotent.
-- Réglages choisis par l'hôte au lancement, stockés dans guesswho_rooms.settings :
--   lives  : 1..3 (défaut 2)
--   speed  : 'normal' | 'fast' (fast = durées × 0,6)
--   sounds : 'all' | 'fr' | 'ja' | 'bankai'

alter table guesswho_rooms add column if not exists settings jsonb not null default '{}'::jsonb;

create or replace function _gw_set_phase(p_room uuid, p_phase text)
  returns void language plpgsql security definer set search_path = public as $$
declare v_dur numeric; v_fast boolean;
begin
  select coalesce(settings->>'speed', 'normal') = 'fast' into v_fast from guesswho_rooms where id = p_room;
  v_dur := _gw_duration(p_phase) * case when v_fast and p_phase <> 'gages' then 0.6 else 1 end;
  update guesswho_rooms set phase = p_phase,
    phase_ends_at = case when v_dur > 0 then now() + make_interval(secs => round(v_dur)) else null end,
    updated_at = now()
  where id = p_room;
end $$;

drop function if exists _gw_pick_clip(text[]);
create or replace function _gw_pick_clip(p_used text[], p_sounds text default 'all')
  returns jsonb language sql volatile security definer set search_path = public as $$
  with pool as (
    select c.* from guesswho_clips c
    where c.enabled and (
      coalesce(p_sounds, 'all') = 'all'
      or (p_sounds in ('fr', 'ja') and c.lang = p_sounds)
      or (p_sounds = 'bankai' and c.id like 'bleach-bankai-%'))
  )
  select coalesce(
    (select to_jsonb(p) from pool p where not (p.id = any(p_used)) order by random() limit 1),
    (select to_jsonb(p) from pool p order by random() limit 1),
    -- filtre trop strict (aucun son) : on retombe sur tous les sons actifs
    (select to_jsonb(c) from guesswho_clips c where c.enabled order by random() limit 1))
$$;

create or replace function _gw_begin_round(p_room uuid)
  returns void language plpgsql security definer set search_path = public as $$
declare v_clip jsonb; r guesswho_rooms;
begin
  select * into r from guesswho_rooms where id = p_room;
  v_clip := _gw_pick_clip(r.used_clips, r.settings->>'sounds');
  update guesswho_rooms set round = round + 1, clip = v_clip, tied = '{}',
    used_clips = case when v_clip is null then used_clips else array_append(used_clips, v_clip->>'id') end
  where id = p_room;
  perform _gw_set_phase(p_room, 'listen');
end $$;

create or replace function guesswho_skip_clip(p_code text, p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_pl guesswho_players; r guesswho_rooms; v_clip jsonb;
begin
  select * into v_pl from _gw_player(p_code, p_token);
  if v_pl.id is null or not v_pl.is_host then return jsonb_build_object('error', 'unauthorized'); end if;
  select * into r from guesswho_rooms where id = v_pl.room_id for update;
  if r.phase <> 'listen' then return jsonb_build_object('error', 'phase'); end if;
  v_clip := _gw_pick_clip(r.used_clips, r.settings->>'sounds');
  if v_clip is null then return jsonb_build_object('error', 'no_clip'); end if;
  update guesswho_rooms set clip = v_clip, used_clips = array_append(used_clips, v_clip->>'id') where id = r.id;
  perform _gw_set_phase(r.id, 'listen');
  return jsonb_build_object('ok', true);
end $$;

-- Lancer avec réglages (l'ancienne signature à 2 arguments reste appelable :
-- p_settings a une valeur par défaut).
drop function if exists guesswho_start(text, uuid);
create or replace function guesswho_start(p_code text, p_token uuid, p_settings jsonb default '{}'::jsonb)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_pl guesswho_players; v_room guesswho_rooms; v_n int; v_lives int; v_settings jsonb;
begin
  select * into v_pl from _gw_player(p_code, p_token);
  if v_pl.id is null or not v_pl.is_host then return jsonb_build_object('error', 'unauthorized'); end if;
  select * into v_room from guesswho_rooms where id = v_pl.room_id for update;
  if v_room.phase not in ('lobby', 'end') then return jsonb_build_object('error', 'phase'); end if;
  select count(*) into v_n from guesswho_players
    where room_id = v_room.id and last_seen > now() - interval '22 seconds';
  if v_n < 3 then return jsonb_build_object('error', 'not_enough_players'); end if;
  delete from guesswho_players
    where room_id = v_room.id and last_seen <= now() - interval '22 seconds' and not is_host;

  v_lives := greatest(1, least(3, coalesce((p_settings->>'lives')::int, 2)));
  v_settings := jsonb_build_object(
    'lives', v_lives,
    'speed', case when p_settings->>'speed' = 'fast' then 'fast' else 'normal' end,
    'sounds', case when p_settings->>'sounds' in ('fr', 'ja', 'bankai') then p_settings->>'sounds' else 'all' end);

  with o as (select id, row_number() over (order by joined_at) - 1 as rn
             from guesswho_players where room_id = v_room.id)
  update guesswho_players p set seat = o.rn, lives = v_lives, total_votes = 0, gage = null
    from o where p.id = o.id;
  delete from guesswho_takes where room_id = v_room.id;
  delete from guesswho_votes where room_id = v_room.id;
  update guesswho_rooms set status = 'playing', round = 0, clip = null, used_clips = '{}',
    tied = '{}', last_result = null, gage_result = null, settings = v_settings where id = v_room.id;
  perform _gw_set_phase(v_room.id, 'gages');
  return jsonb_build_object('ok', true, 'players', v_n, 'settings', v_settings);
end $$;

revoke execute on function _gw_set_phase(uuid, text), _gw_pick_clip(text[], text), _gw_begin_round(uuid)
  from public, anon, authenticated;
grant execute on function guesswho_start(text, uuid, jsonb), guesswho_skip_clip(text, uuid) to anon, authenticated;
