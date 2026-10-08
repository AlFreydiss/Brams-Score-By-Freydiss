-- Guess Who — type de son « replique » (répliques cultes des voice packs) et
-- filtre « Répliques » dans le salon. À coller APRÈS 20261003. Recollable.
-- Les sons eux-mêmes sont insérés par le SQL généré depuis la page de tri
-- (scripts/guesswho-voicepacks.mjs → choix.html).

create or replace function _gw_pick_clip(p_used text[], p_sounds text default 'all')
  returns jsonb language sql volatile security definer set search_path = public as $$
  with pool as (
    select c.* from guesswho_clips c
    where c.enabled and (
      coalesce(p_sounds, 'all') = 'all'
      or (p_sounds in ('fr', 'ja') and c.lang = p_sounds)
      or (p_sounds in ('technique', 'opening', 'meme', 'replique') and c.kind = p_sounds)
      or (p_sounds = 'bankai' and c.id like 'bleach-bankai-%'))
  ), src as (
    select * from pool
    union all
    -- filtre trop strict (aucun son) : tous les sons actifs
    select c.* from guesswho_clips c where c.enabled and not exists (select 1 from pool)
  )
  select to_jsonb(s) from src s
  order by (select max(u.i) from unnest(coalesce(p_used, '{}')) with ordinality u(id, i) where u.id = s.id) asc nulls first,
           random()
  limit 1
$$;

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
    'sounds', case when s->>'sounds' in ('fr', 'ja', 'bankai', 'technique', 'opening', 'meme', 'replique') then s->>'sounds' else 'all' end,
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
