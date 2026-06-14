-- Brams Phone — anti-triche par token secret (Phase 1). Idempotent.
-- pages/players non lisibles direct ; tout via RPC SECURITY DEFINER.

alter table gartic_players add column if not exists secret_token uuid not null default gen_random_uuid();

drop policy if exists grm_all on gartic_rooms;
drop policy if exists gpl_all on gartic_players;
drop policy if exists gpg_all on gartic_pages;
drop policy if exists grm_select on gartic_rooms;
create policy grm_select on gartic_rooms for select to anon, authenticated using (true);

drop function if exists gartic_start(uuid, jsonb);
drop function if exists gartic_advance(uuid);
drop function if exists gartic_advance(text, uuid);
drop function if exists gartic_my_book(uuid, text, int);

create or replace function _gartic_player(p_code text, p_token uuid)
  returns table(room_id uuid, player_id uuid, seat int, is_host boolean, status text, current_round int, n int)
  language sql stable security definer set search_path = public as $$
  select r.id, pl.id, pl.seat, pl.is_host, r.status, r.current_round, (r.settings->>'n')::int
  from gartic_rooms r join gartic_players pl on pl.room_id = r.id
  where r.code = upper(p_code) and pl.secret_token = p_token
$$;

create or replace function gartic_create(p_code text, p_user text, p_name text, p_avatar text)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room gartic_rooms; v_tok uuid;
begin
  begin
    insert into gartic_rooms(code, host_user_id, status, settings)
      values (upper(p_code), p_user, 'lobby', '{}'::jsonb) returning * into v_room;
  exception when unique_violation then return jsonb_build_object('error','code_taken'); end;
  insert into gartic_players(room_id, user_id, display_name, avatar_url, is_host, connected, last_seen)
    values (v_room.id, p_user, p_name, p_avatar, true, true, now()) returning secret_token into v_tok;
  return jsonb_build_object('code', upper(p_code), 'secret_token', v_tok, 'room', to_jsonb(v_room));
end $$;

create or replace function gartic_join(p_code text, p_user text, p_name text, p_avatar text)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room gartic_rooms; v_pl gartic_players;
begin
  select * into v_room from gartic_rooms where code = upper(p_code);
  if v_room.id is null then return jsonb_build_object('error','introuvable'); end if;
  select * into v_pl from gartic_players where room_id = v_room.id and user_id = p_user;
  if v_pl.id is not null then
    update gartic_players set connected=true, last_seen=now(), display_name=p_name, avatar_url=p_avatar
      where id = v_pl.id returning * into v_pl;
    return jsonb_build_object('secret_token', v_pl.secret_token, 'seat', v_pl.seat, 'spectator', false, 'room', to_jsonb(v_room));
  end if;
  if v_room.status <> 'lobby' then return jsonb_build_object('spectator', true, 'room', to_jsonb(v_room)); end if;
  insert into gartic_players(room_id, user_id, display_name, avatar_url, connected, last_seen)
    values (v_room.id, p_user, p_name, p_avatar, true, now()) returning * into v_pl;
  return jsonb_build_object('secret_token', v_pl.secret_token, 'seat', v_pl.seat, 'spectator', false, 'room', to_jsonb(v_room));
end $$;

create or replace function gartic_room_state(p_code text)
  returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_room gartic_rooms;
begin
  select * into v_room from gartic_rooms where code = upper(p_code);
  if v_room.id is null then return jsonb_build_object('error','introuvable'); end if;
  return jsonb_build_object('room', to_jsonb(v_room), 'players', coalesce((
    select jsonb_agg(jsonb_build_object('user_id',pl.user_id,'display_name',pl.display_name,
      'avatar_url',pl.avatar_url,'seat',pl.seat,'is_host',pl.is_host,'is_ready',pl.is_ready,
      'connected',pl.connected,'last_seen',pl.last_seen) order by pl.joined_at)
    from gartic_players pl where pl.room_id = v_room.id), '[]'::jsonb));
end $$;

create or replace function gartic_prev_page(p_code text, p_token uuid)
  returns jsonb language plpgsql stable security definer set search_path = public as $$
declare g record; v_book int; v_type text; v_content text;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null or g.seat is null then return jsonb_build_object('error','unauthorized'); end if;
  if g.current_round <= 0 or g.n is null then return jsonb_build_object('page', null); end if;
  v_book := ((g.seat - g.current_round) % g.n + g.n) % g.n;
  select type, content into v_type, v_content from gartic_pages
    where room_id = g.room_id and book_id = v_book and page_index = g.current_round - 1;
  if not found then return jsonb_build_object('page', null); end if;
  return jsonb_build_object('page', jsonb_build_object('type', v_type, 'content', v_content));
end $$;

create or replace function gartic_submit(p_code text, p_token uuid, p_content text)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare g record; v_book int; v_type text;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null or g.seat is null then return jsonb_build_object('error','unauthorized'); end if;
  if g.status not in ('writing','drawing','describing') or g.n is null then return jsonb_build_object('error','phase'); end if;
  v_book := ((g.seat - g.current_round) % g.n + g.n) % g.n;
  v_type := case when g.current_round = 0 then 'text' when g.current_round % 2 = 1 then 'drawing' else 'text' end;
  insert into gartic_pages(room_id, book_id, page_index, type, content, author_user_id)
    values (g.room_id, v_book, g.current_round, v_type, p_content, (select user_id from gartic_players where id = g.player_id))
    on conflict (room_id, book_id, page_index) do update set content = excluded.content, type = excluded.type;
  return jsonb_build_object('ok', true);
end $$;

create or replace function gartic_submitted_seats(p_code text)
  returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_room gartic_rooms; v_n int;
begin
  select * into v_room from gartic_rooms where code = upper(p_code);
  if v_room.id is null then return jsonb_build_object('seats','[]'::jsonb); end if;
  v_n := (v_room.settings->>'n')::int;
  if v_n is null or v_n = 0 then return jsonb_build_object('round', v_room.current_round, 'seats','[]'::jsonb); end if;
  return jsonb_build_object('round', v_room.current_round, 'seats', coalesce((
    select jsonb_agg(distinct ((book_id + v_room.current_round) % v_n))
    from gartic_pages where room_id = v_room.id and page_index = v_room.current_round), '[]'::jsonb));
end $$;

create or replace function gartic_start(p_code text, p_token uuid, p_settings jsonb)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare g record; v_n int;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null or not g.is_host then return jsonb_build_object('error','unauthorized'); end if;
  with ordered as (select id, row_number() over (order by joined_at) - 1 as rn
    from gartic_players where room_id = g.room_id)
  update gartic_players p set seat = o.rn from ordered o where p.id = o.id;
  select count(*) into v_n from gartic_players where room_id = g.room_id;
  update gartic_rooms set status='writing', current_round=0, current_phase='writing',
    settings = p_settings || jsonb_build_object('n', v_n),
    phase_ends_at = now() + (coalesce((p_settings->'phaseDurations'->>'writing')::int,60)||' seconds')::interval,
    updated_at = now() where id = g.room_id;
  return jsonb_build_object('ok', true, 'n', v_n);
end $$;

create or replace function gartic_advance(p_code text, p_token uuid, p_expected_round int default null)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare g record; r gartic_rooms; v_n int; nextr int; ph text; dur int; s int; bk int; v_type text;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null or not g.is_host then return jsonb_build_object('error','unauthorized'); end if;
  select * into r from gartic_rooms where id = g.room_id;
  v_n := (r.settings->>'n')::int;
  if v_n is null then return jsonb_build_object('error','not_started'); end if;
  if p_expected_round is not null and p_expected_round <> r.current_round then
    return jsonb_build_object('ok', false, 'reason', 'stale');  -- une autre avance a déjà eu lieu
  end if;
  v_type := case when r.current_round = 0 then 'text' when r.current_round % 2 = 1 then 'drawing' else 'text' end;
  for s in 0..v_n-1 loop
    bk := ((s - r.current_round) % v_n + v_n) % v_n;
    insert into gartic_pages(room_id, book_id, page_index, type, content, author_user_id)
      values (r.id, bk, r.current_round, v_type, case when v_type='drawing' then '' else '—' end, 'host')
      on conflict (room_id, book_id, page_index) do nothing;
  end loop;
  nextr := r.current_round + 1;
  if nextr >= v_n then
    update gartic_rooms set status='reveal', current_phase='reveal', phase_ends_at=null, updated_at=now() where id=r.id;
    return jsonb_build_object('ok', true, 'status','reveal');
  end if;
  ph := case when nextr % 2 = 1 then 'drawing' else 'describing' end;
  dur := coalesce((r.settings->'phaseDurations'->>ph)::int, 60);
  update gartic_rooms set status=ph, current_phase=ph, current_round=nextr,
    phase_ends_at = now() + (dur||' seconds')::interval, updated_at=now() where id=r.id;
  return jsonb_build_object('ok', true, 'status', ph, 'round', nextr);
end $$;

create or replace function gartic_set_ready(p_code text, p_token uuid, p_ready boolean)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare g record;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null then return jsonb_build_object('error','unauthorized'); end if;
  update gartic_players set is_ready = p_ready where id = g.player_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function gartic_touch(p_code text, p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare g record;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null then return jsonb_build_object('error','unauthorized'); end if;
  update gartic_players set connected = true, last_seen = now() where id = g.player_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function gartic_promote_host(p_code text, p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare g record; v_lowest uuid; v_alive boolean;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null then return jsonb_build_object('error','unauthorized'); end if;
  select exists(select 1 from gartic_players where room_id=g.room_id and is_host and connected
    and last_seen > now() - interval '22 seconds') into v_alive;
  if v_alive then return jsonb_build_object('ok', false, 'reason','host_alive'); end if;
  select id into v_lowest from gartic_players where room_id=g.room_id and connected
    and last_seen > now() - interval '22 seconds' and seat is not null order by seat asc limit 1;
  if v_lowest is null or v_lowest <> g.player_id then return jsonb_build_object('ok', false, 'reason','not_candidate'); end if;
  update gartic_players set is_host = false where room_id = g.room_id;
  update gartic_players set is_host = true where id = g.player_id;
  update gartic_rooms set host_user_id = (select user_id from gartic_players where id=g.player_id) where id=g.room_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function gartic_all_pages(p_code text)
  returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_room gartic_rooms; v_n int;
begin
  select * into v_room from gartic_rooms where code = upper(p_code);
  if v_room.id is null then return jsonb_build_object('error','introuvable'); end if;
  if v_room.status not in ('reveal','finished') then return jsonb_build_object('error','not_reveal'); end if;
  v_n := (v_room.settings->>'n')::int;
  if v_n is null or v_n = 0 then v_n := null; end if;
  return jsonb_build_object('pages', coalesce((
    select jsonb_agg(jsonb_build_object('book_id',pg.book_id,'page_index',pg.page_index,'type',pg.type,
      'content',pg.content,'author', jsonb_build_object('name',pl.display_name,'avatar',pl.avatar_url))
      order by pg.book_id, pg.page_index)
    from gartic_pages pg
    left join gartic_players pl on pl.room_id = pg.room_id and v_n is not null and pl.seat = ((pg.book_id + pg.page_index) % v_n)
    where pg.room_id = v_room.id), '[]'::jsonb));
end $$;

grant execute on function _gartic_player(text,uuid), gartic_create(text,text,text,text),
  gartic_join(text,text,text,text), gartic_room_state(text), gartic_prev_page(text,uuid),
  gartic_submit(text,uuid,text), gartic_submitted_seats(text), gartic_start(text,uuid,jsonb),
  gartic_advance(text,uuid,int), gartic_set_ready(text,uuid,boolean), gartic_touch(text,uuid),
  gartic_promote_host(text,uuid), gartic_all_pages(text), gartic_now() to anon, authenticated;
