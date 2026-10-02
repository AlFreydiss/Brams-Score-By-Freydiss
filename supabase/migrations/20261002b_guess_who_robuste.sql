-- Guess Who — robustesse et gameplay (à coller APRÈS 20261001_guess_who.sql
-- et 20261002_guess_who_modes.sql). Idempotent : peut être recollé.
--
--  • guesswho_sync : UNE requête = salon + joueurs + progression + heure serveur
--    + présence ; reprise d'hôte et filet de sécurité (avance si échéance + 5 s)
--    faits côté serveur, la partie ne dépend plus d'un onglet précis.
--  • guesswho_stats : récap de fin calculé par le serveur (survit au rechargement).
--  • Réglages : vitesse lente, nombre de tours max (verdict final), sons par type.
--  • Arrivée en cours de partie (gages / écoute) ; fantômes du salon purgés.
--  • Sons : le moins récemment joué d'abord, même entre deux parties du salon.
--  • Entrées bornées : nom, avatar, code, durée d'imitation.
--  • Pour l'UI : textes des gages (machine à sous), qui a voté pour qui par tour,
--    mon vote / mon gage après rechargement, vies perdues, bouton « prêt ».

alter table guesswho_rooms add column if not exists phase_secs int;
alter table guesswho_rooms add column if not exists history jsonb not null default '[]'::jsonb;
alter table guesswho_rooms add column if not exists gage_pool jsonb;
alter table guesswho_players add column if not exists ready boolean not null default false;

-- ── Nettoyage des entrées ────────────────────────────────────────────────────
create or replace function _gw_clean_name(p_name text) returns text
  language sql immutable as $$
  select coalesce(nullif(left(btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g')), 32), ''), 'Invité')
$$;

-- Avatar : https uniquement, longueur bornée (sinon pas d'avatar).
create or replace function _gw_clean_avatar(p_url text) returns text
  language sql immutable as $$
  select case when p_url like 'https://%' and length(p_url) <= 500 and p_url !~ '[[:space:]"<>]' then p_url end
$$;

-- ── Durées : vitesse lente / normale / rapide ────────────────────────────────
create or replace function _gw_set_phase(p_room uuid, p_phase text)
  returns void language plpgsql security definer set search_path = public as $$
declare v_dur int; v_speed text;
begin
  select coalesce(settings->>'speed', 'normal') into v_speed from guesswho_rooms where id = p_room;
  v_dur := round(_gw_duration(p_phase) * case
    when p_phase = 'gages' then 1
    when v_speed = 'fast' then 0.6
    when v_speed = 'slow' then 1.5
    else 1 end);
  update guesswho_rooms set phase = p_phase, phase_secs = nullif(v_dur, 0),
    phase_ends_at = case when v_dur > 0 then now() + make_interval(secs => v_dur) else null end,
    updated_at = now()
  where id = p_room;
end $$;

-- ── Choix du son : jamais joué d'abord, sinon le moins récent ────────────────
create or replace function _gw_pick_clip(p_used text[], p_sounds text default 'all')
  returns jsonb language sql volatile security definer set search_path = public as $$
  with pool as (
    select c.* from guesswho_clips c
    where c.enabled and (
      coalesce(p_sounds, 'all') = 'all'
      or (p_sounds in ('fr', 'ja') and c.lang = p_sounds)
      or (p_sounds in ('technique', 'opening', 'meme') and c.kind = p_sounds)
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

-- ── Reprise d'hôte automatique ───────────────────────────────────────────────
-- Hôte absent depuis 22 s : le joueur connecté arrivé en premier (assis d'abord) le remplace.
create or replace function _gw_auto_host(p_room uuid)
  returns boolean language plpgsql security definer set search_path = public as $$
declare v_new guesswho_players;
begin
  if exists (select 1 from guesswho_players where room_id = p_room and is_host
             and last_seen > now() - interval '22 seconds') then return false; end if;
  select * into v_new from guesswho_players where room_id = p_room
    and last_seen > now() - interval '22 seconds'
    order by (seat is null), joined_at limit 1;
  if v_new.id is null then return false; end if;
  update guesswho_players set is_host = (id = v_new.id) where room_id = p_room;
  update guesswho_rooms set host_user_id = v_new.user_id, updated_at = now() where id = p_room;
  return true;
end $$;

create or replace function guesswho_promote_host(p_code text, p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_pl guesswho_players;
begin
  select * into v_pl from _gw_player(p_code, p_token);
  if v_pl.id is null then return jsonb_build_object('error', 'unauthorized'); end if;
  update guesswho_players set last_seen = now() where id = v_pl.id;
  if exists (select 1 from guesswho_players where room_id = v_pl.room_id and is_host
             and last_seen > now() - interval '22 seconds') then
    return jsonb_build_object('ok', false, 'reason', 'host_alive'); end if;
  perform _gw_auto_host(v_pl.room_id);
  if not (select is_host from guesswho_players where id = v_pl.id) then
    return jsonb_build_object('ok', false, 'reason', 'not_candidate'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- ── Créer / rejoindre ────────────────────────────────────────────────────────
create or replace function guesswho_create(p_code text, p_user text, p_name text, p_avatar text)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room guesswho_rooms; v_tok uuid;
begin
  if upper(coalesce(p_code, '')) !~ '^[A-Z0-9]{4,8}$' then return jsonb_build_object('error', 'bad_code'); end if;
  if coalesce(btrim(p_user), '') = '' or length(p_user) > 64 then return jsonb_build_object('error', 'bad_user'); end if;
  begin
    insert into guesswho_rooms(code, host_user_id) values (upper(p_code), p_user) returning * into v_room;
  exception when unique_violation then
    return jsonb_build_object('error', 'code_taken');
  end;
  insert into guesswho_players(room_id, user_id, display_name, avatar_url, is_host)
    values (v_room.id, p_user, _gw_clean_name(p_name), _gw_clean_avatar(p_avatar), true)
    returning secret_token into v_tok;
  return jsonb_build_object('code', v_room.code, 'room_id', v_room.id, 'secret_token', v_tok);
end $$;

-- Rejoindre : reprise de place par jeton ; arrivée possible pendant l'écriture
-- des gages (vies pleines) ou au début d'un tour (vies = la plus basse en jeu).
create or replace function guesswho_join(p_code text, p_user text, p_name text, p_avatar text, p_token uuid default null)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room guesswho_rooms; v_pl guesswho_players; v_n int; v_lives int; v_seat int;
begin
  if coalesce(btrim(p_user), '') = '' or length(p_user) > 64 then return jsonb_build_object('error', 'bad_user'); end if;
  select * into v_room from guesswho_rooms where code = upper(p_code) for update;
  if v_room.id is null then return jsonb_build_object('error', 'introuvable'); end if;
  select * into v_pl from guesswho_players where room_id = v_room.id and user_id = p_user;
  if v_pl.id is not null then
    if p_token is distinct from v_pl.secret_token then
      return jsonb_build_object('spectator', true, 'room_id', v_room.id, 'reason', 'seat_taken');
    end if;
    update guesswho_players set last_seen = now(),
      display_name = case when nullif(btrim(p_name), '') is null then display_name else _gw_clean_name(p_name) end,
      avatar_url = _gw_clean_avatar(p_avatar)
      where id = v_pl.id;
    return jsonb_build_object('secret_token', v_pl.secret_token, 'room_id', v_room.id, 'spectator', false);
  end if;

  if v_room.phase in ('lobby', 'end') then
    -- Fantômes du salon d'attente (onglet fermé depuis 1 min) : on libère la place.
    if v_room.phase = 'lobby' then
      delete from guesswho_players where room_id = v_room.id and not is_host
        and last_seen < now() - interval '60 seconds';
    end if;
    select count(*) into v_n from guesswho_players where room_id = v_room.id
      and (v_room.phase = 'lobby' or last_seen > now() - interval '22 seconds');
    if v_n >= 8 then
      return jsonb_build_object('spectator', true, 'room_id', v_room.id, 'reason', 'full');
    end if;
    insert into guesswho_players(room_id, user_id, display_name, avatar_url)
      values (v_room.id, p_user, _gw_clean_name(p_name), _gw_clean_avatar(p_avatar))
      returning * into v_pl;
    return jsonb_build_object('secret_token', v_pl.secret_token, 'room_id', v_room.id, 'spectator', false);
  end if;

  if v_room.phase in ('gages', 'listen') then
    select count(*), max(seat) into v_n, v_seat from guesswho_players where room_id = v_room.id and seat is not null;
    if v_n >= 8 then
      return jsonb_build_object('spectator', true, 'room_id', v_room.id, 'reason', 'full');
    end if;
    v_lives := coalesce((v_room.settings->>'lives')::int, 2);
    if v_room.phase = 'listen' then
      select least(v_lives, coalesce(min(lives), v_lives)) into v_lives
        from guesswho_players where room_id = v_room.id and seat is not null and lives > 0;
    end if;
    insert into guesswho_players(room_id, user_id, display_name, avatar_url, seat, lives)
      values (v_room.id, p_user, _gw_clean_name(p_name), _gw_clean_avatar(p_avatar), coalesce(v_seat, -1) + 1, greatest(1, v_lives))
      returning * into v_pl;
    return jsonb_build_object('secret_token', v_pl.secret_token, 'room_id', v_room.id, 'spectator', false, 'late', true);
  end if;

  return jsonb_build_object('spectator', true, 'room_id', v_room.id, 'reason', 'started');
end $$;

-- ── Lancer avec réglages ─────────────────────────────────────────────────────
--   lives  : 1..5 (défaut 2)        speed  : 'slow' | 'normal' | 'fast'
--   sounds : 'all' | 'fr' | 'ja' | 'bankai' | 'technique' | 'opening' | 'meme'
--   rounds : 0 (illimité) ou 3..30 ; au dernier tour, s'il n'y a pas d'éliminé,
--            le joueur avec le moins de vies (puis de votes) prend le gage.
create or replace function guesswho_start(p_code text, p_token uuid, p_settings jsonb default '{}'::jsonb)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_pl guesswho_players; v_room guesswho_rooms; v_n int; v_lives int; v_rounds int; v_settings jsonb;
        s jsonb := coalesce(p_settings, '{}'::jsonb);
begin
  select * into v_pl from _gw_player(p_code, p_token);
  if v_pl.id is null or not v_pl.is_host then return jsonb_build_object('error', 'unauthorized'); end if;
  select * into v_room from guesswho_rooms where id = v_pl.room_id for update;
  if v_room.phase not in ('lobby', 'end') then return jsonb_build_object('error', 'phase'); end if;
  update guesswho_players set last_seen = now() where id = v_pl.id;
  select count(*) into v_n from guesswho_players
    where room_id = v_room.id and last_seen > now() - interval '22 seconds';
  if v_n < 3 then return jsonb_build_object('error', 'not_enough_players'); end if;
  delete from guesswho_players
    where room_id = v_room.id and last_seen <= now() - interval '22 seconds' and not is_host;
  if v_n > 8 then return jsonb_build_object('error', 'too_many_players'); end if;

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
  update guesswho_players p set seat = o.rn, lives = v_lives, total_votes = 0, gage = null, ready = false
    from o where p.id = o.id;
  delete from guesswho_takes where room_id = v_room.id;
  delete from guesswho_votes where room_id = v_room.id;
  -- used_clips conservé : une revanche dans le même salon ne rejoue pas les mêmes sons.
  update guesswho_rooms set status = 'playing', round = 0, clip = null, history = '[]'::jsonb, gage_pool = null,
    tied = '{}', last_result = null, gage_result = null, settings = v_settings where id = v_room.id;
  perform _gw_set_phase(v_room.id, 'gages');
  return jsonb_build_object('ok', true, 'players', v_n, 'settings', v_settings);
end $$;

-- ── Imitation : durée bornée ─────────────────────────────────────────────────
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
  if p_url is null or not (p_url like 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/%'
                           or p_url like 'data:audio/%') then
    return jsonb_build_object('error', 'bad_url'); end if;
  if length(p_url) > 200000 then return jsonb_build_object('error', 'too_big'); end if;
  if p_url like 'https://%' and p_url ~ '[[:space:]"<>]' then return jsonb_build_object('error', 'bad_url'); end if;
  update guesswho_players set last_seen = now() where id = v_pl.id;
  insert into guesswho_takes(room_id, round, user_id, audio_url, duration)
    values (v_room.id, v_room.round, v_pl.user_id, p_url, least(60, greatest(0, coalesce(p_duration, 0))))
    on conflict (room_id, round, user_id)
    do update set audio_url = excluded.audio_url, duration = excluded.duration, created_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- ── Résultat du tour (+ historique pour le récap) ────────────────────────────
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
      v_losers := v_notake;
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
  update guesswho_rooms set tied = '{}',
    last_result = jsonb_build_object(
      'round', r.round, 'stage', p_stage, 'scores', v_scores, 'revote_scores', v_rev,
      'losers', to_jsonb(v_losers),
      'votes', coalesce((select jsonb_agg(jsonb_build_object('voter', voter, 'target', target, 'stage', stage))
                         from guesswho_votes where room_id = p_room and round = r.round), '[]'::jsonb)),
    history = coalesce((select jsonb_agg(e) from jsonb_array_elements(history) e
                        where (e->>'round')::int <> r.round), '[]'::jsonb)
      || jsonb_build_array(jsonb_build_object(
        'round', r.round, 'stage', p_stage, 'scores', v_scores, 'revote_scores', v_rev,
        'losers', to_jsonb(v_losers),
        'votes', coalesce((select jsonb_agg(jsonb_build_object('voter', voter, 'target', target, 'stage', stage) order by stage, created_at)
                           from guesswho_votes where room_id = p_room and round = r.round), '[]'::jsonb),
        'clip', case when r.clip is null then null else jsonb_build_object(
          'id', r.clip->>'id', 'title', r.clip->>'title', 'anime', r.clip->>'anime',
          'lang', r.clip->>'lang', 'kind', r.clip->>'kind') end))
    where id = p_room;
  perform _gw_set_phase(p_room, 'result');
end $$;

-- Dernier tour sans éliminé : moins de vies, puis moins de votes au total → 0 vie.
create or replace function _gw_final_verdict(p_room uuid)
  returns void language plpgsql security definer set search_path = public as $$
declare v_losers text[];
begin
  with s as (select user_id, lives, total_votes from guesswho_players where room_id = p_room and seat is not null),
       m as (select min(lives) ml from s),
       c as (select s.* from s, m where s.lives = m.ml),
       mv as (select min(total_votes) mt from c)
  select array_agg(c.user_id) into v_losers from c, mv where c.total_votes = mv.mt;
  update guesswho_players set lives = 0 where room_id = p_room and user_id = any(coalesce(v_losers, '{}'));
  update guesswho_rooms set last_result = coalesce(last_result, '{}'::jsonb) || jsonb_build_object('final', to_jsonb(coalesce(v_losers, '{}')))
    where id = p_room;
end $$;

-- ── Transition de phase (salon déjà verrouillé par l'appelant) ───────────────
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
    update guesswho_rooms set status = 'ended', phase = 'end', phase_ends_at = null, phase_secs = null, updated_at = now()
      where id = r.id;
  end if;
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
    return jsonb_build_object('ok', false, 'reason', 'too_early',
      'wait_ms', greatest(0, round(extract(epoch from (r.phase_ends_at - now())) * 1000)));
  end if;
  perform _gw_step(r.id);
  return jsonb_build_object('ok', true, 'phase', (select phase from guesswho_rooms where id = r.id));
end $$;

-- ── Synchro : état complet + présence + filets de sécurité ───────────────────
-- p_token facultatif (spectateur). Avec un jeton valide : présence, reprise
-- d'hôte si besoin, et avance de la phase si l'échéance est dépassée de 5 s.
create or replace function guesswho_sync(p_code text, p_token uuid default null)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room guesswho_rooms; v_pl guesswho_players; v_me jsonb; v_state jsonb;
begin
  select * into v_room from guesswho_rooms where code = upper(p_code);
  if v_room.id is null then return jsonb_build_object('error', 'introuvable'); end if;
  if p_token is not null then
    select * into v_pl from guesswho_players where room_id = v_room.id and secret_token = p_token;
    if v_pl.id is null then
      v_me := jsonb_build_object('error', 'unauthorized');
    else
      update guesswho_players set last_seen = now() where id = v_pl.id;
      perform _gw_auto_host(v_room.id);
      if v_room.phase not in ('lobby', 'end') and v_room.phase_ends_at is not null
         and now() >= v_room.phase_ends_at + interval '5 seconds' then
        -- un autre joueur avance déjà : on ne l'attend pas
        select * into v_room from guesswho_rooms where id = v_room.id for update skip locked;
        if v_room.id is not null and v_room.phase not in ('lobby', 'end') and v_room.phase_ends_at is not null
           and now() >= v_room.phase_ends_at + interval '5 seconds' then
          perform _gw_step(v_room.id);
        end if;
      end if;
      -- Ce que JE sais déjà (retrouvé après rechargement) : mon vote, mon gage, mon imitation.
      select * into v_room from guesswho_rooms where id = v_pl.room_id;
      v_me := jsonb_build_object('user_id', v_pl.user_id,
        'gage', (select gage from guesswho_players where id = v_pl.id),
        'vote', (select target from guesswho_votes where room_id = v_room.id and round = v_room.round
                 and stage = v_room.phase and voter = v_pl.user_id),
        'has_take', exists (select 1 from guesswho_takes where room_id = v_room.id and round = v_room.round
                            and user_id = v_pl.user_id));
    end if;
  end if;
  v_state := guesswho_room_state(p_code);
  return v_state || jsonb_build_object(
    'progress', guesswho_progress(p_code),
    'now', now(),
    'me', v_me);
end $$;

-- ── Récap de partie ──────────────────────────────────────────────────────────
-- Tours terminés seulement (les imitations sont déjà publiques à ce stade).
create or replace function guesswho_stats(p_code text)
  returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r guesswho_rooms; v_rounds jsonb; v_players jsonb; v_best jsonb;
begin
  select * into r from guesswho_rooms where code = upper(p_code);
  if r.id is null then return jsonb_build_object('error', 'introuvable'); end if;

  -- Par tour : l'imitation la plus votée (ex aequo : la première envoyée).
  select coalesce(jsonb_agg(e || jsonb_build_object('best', (
      select jsonb_build_object('user_id', t.user_id, 'votes', (e->'scores'->>t.user_id)::int,
                                'audio_url', t.audio_url, 'duration', t.duration)
      from guesswho_takes t
      where t.room_id = r.id and t.round = (e->>'round')::int
        and coalesce((e->'scores'->>t.user_id)::int, 0) > 0
      order by (e->'scores'->>t.user_id)::int desc, t.created_at limit 1))
    order by (e->>'round')::int), '[]'::jsonb)
  into v_rounds from jsonb_array_elements(r.history) e;

  select coalesce(jsonb_agg(jsonb_build_object(
      'user_id', p.user_id, 'display_name', p.display_name, 'lives', p.lives, 'total_votes', p.total_votes,
      'takes', (select count(*) from guesswho_takes t where t.room_id = r.id and t.user_id = p.user_id
                and t.round in (select (e->>'round')::int from jsonb_array_elements(r.history) e)),
      'wins', (select count(*) from jsonb_array_elements(v_rounds) x where x->'best'->>'user_id' = p.user_id),
      'lives_lost', (select count(*) from jsonb_array_elements(r.history) e where e->'losers' ? p.user_id))
    order by p.total_votes desc, p.seat), '[]'::jsonb)
  into v_players from guesswho_players p where p.room_id = r.id and p.seat is not null;

  -- Meilleure imitation : le plus de votes, puis le tour le plus ancien.
  select x->'best' || jsonb_build_object('round', (x->>'round')::int, 'clip', x->'clip') into v_best
  from jsonb_array_elements(v_rounds) x where x->'best' is not null and x->'best' <> 'null'::jsonb
  order by (x->'best'->>'votes')::int desc, (x->>'round')::int limit 1;

  return jsonb_build_object('rounds', v_rounds, 'players', v_players, 'awards', jsonb_build_object(
    'best_take', v_best,
    'most_voted', (select x->>'user_id' from jsonb_array_elements(v_players) x
                   where (x->>'total_votes')::int > 0 order by (x->>'total_votes')::int desc limit 1),
    'most_wins', (select x->>'user_id' from jsonb_array_elements(v_players) x
                  where (x->>'wins')::int > 0 order by (x->>'wins')::int desc, (x->>'total_votes')::int desc limit 1),
    'untouchable', (select x->>'user_id' from jsonb_array_elements(v_players) x
                    where (x->>'lives_lost')::int = 0 and jsonb_array_length(v_rounds) > 0
                    order by (x->>'total_votes')::int desc limit 1)));
end $$;

-- ── État public : + vies perdues, « prêt » ───────────────────────────────────
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
      'has_gage', gage is not null, 'ready', ready,
      'lives_lost', (select count(*) from jsonb_array_elements(v_room.history) e where e->'losers' ? p.user_id))
      order by joined_at)
    from guesswho_players p where room_id = v_room.id), '[]'::jsonb));
end $$;

-- « Prêt » dans le salon d'attente (indicatif : l'hôte lance quand il veut).
create or replace function guesswho_set_ready(p_code text, p_token uuid, p_ready boolean)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_pl guesswho_players;
begin
  select * into v_pl from _gw_player(p_code, p_token);
  if v_pl.id is null then return jsonb_build_object('error', 'unauthorized'); end if;
  if (select phase from guesswho_rooms where id = v_pl.room_id) not in ('lobby', 'end') then
    return jsonb_build_object('error', 'phase'); end if;
  update guesswho_players set ready = coalesce(p_ready, false), last_seen = now() where id = v_pl.id;
  -- réveille les abonnés realtime (seule la table des salons est diffusée)
  update guesswho_rooms set updated_at = now() where id = v_pl.room_id;
  return jsonb_build_object('ok', true);
end $$;

-- Gages : + gage_pool = tous les textes de la partie, sans auteurs (machine à
-- sous de l'écran du gage), publié seulement au moment du tirage.
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
  update guesswho_rooms set gage_result = v_out, gage_pool = coalesce((
      select jsonb_agg(g order by random()) from (
        select gage as g from guesswho_players where room_id = p_room and gage is not null
        union
        select x->>'gage' from jsonb_array_elements(v_out) x) t), '[]'::jsonb)
    where id = p_room;
  perform _gw_set_phase(p_room, 'gage');
end $$;

-- ── Droits ───────────────────────────────────────────────────────────────────
revoke execute on function _gw_clean_name(text), _gw_clean_avatar(text), _gw_set_phase(uuid, text),
  _gw_pick_clip(text[], text), _gw_auto_host(uuid), _gw_resolve(uuid, text), _gw_final_verdict(uuid),
  _gw_step(uuid), _gw_draw_gages(uuid) from public, anon, authenticated;
grant execute on function guesswho_sync(text, uuid), guesswho_stats(text), guesswho_join(text, text, text, text, uuid),
  guesswho_create(text, text, text, text), guesswho_start(text, uuid, jsonb), guesswho_advance(text, uuid, text, int),
  guesswho_submit_take(text, uuid, text, real, int), guesswho_promote_host(text, uuid),
  guesswho_room_state(text), guesswho_set_ready(text, uuid, boolean) to anon, authenticated;
