-- Guess Who — revanche sans éjection, avance anticipée par tous, journal d'erreurs.
-- À coller dans l'éditeur SQL Supabase APRÈS 20261002b. Recollable sans risque.

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
  -- Plus de 8 restants (téléphone en veille pendant qu'un 9e entrait) : au lieu
  -- de refuser à chaque fois, les 8 premiers arrivés jouent, les autres regardent.
  v_n := least(v_n, 8);

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
  update guesswho_players p set seat = case when o.rn < 8 then o.rn end, lives = v_lives, total_votes = 0, gage = null, ready = false
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

-- Écriture réservée à un joueur du salon (jeton) : le code et l'identité ne
-- peuvent pas être inventés. Plafonds : 20 / salon / minute, 300 / minute en tout.
drop function if exists guesswho_log(text, text, text, text, text);
create or replace function guesswho_log(p_code text, p_token uuid, p_kind text, p_detail text default null, p_device text default null)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_pl guesswho_players; v_code text := upper(left(coalesce(p_code, ''), 8));
begin
  if p_kind is null or p_kind not in ('mic_error', 'upload_failed', 'start_refused', 'offline', 'record_timeout') then
    return jsonb_build_object('error', 'kind');
  end if;
  select * into v_pl from _gw_player(v_code, p_token);
  if v_pl.id is null then return jsonb_build_object('error', 'unauthorized'); end if;
  if (select count(*) from guesswho_events where room_code = v_code and at > now() - interval '1 minute') >= 20
     or (select count(*) from guesswho_events where at > now() - interval '1 minute') >= 300 then
    return jsonb_build_object('error', 'rate');
  end if;
  delete from guesswho_events where at < now() - interval '30 days';
  insert into guesswho_events (room_code, user_id, kind, detail, device)
    values (v_code, left(v_pl.user_id, 64), p_kind, left(p_detail, 500), left(p_device, 80));
  return jsonb_build_object('ok', true);
end $$;

grant execute on function guesswho_log(text, uuid, text, text, text) to anon, authenticated;
