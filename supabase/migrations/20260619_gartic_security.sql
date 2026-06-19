-- Brams Phone — DURCISSEMENT SÉCURITÉ (suite au code review).
-- (1) CRIT vol de token / usurpation : gartic_join rendait le secret_token de N'IMPORTE quel
--     joueur à quiconque connaissait son user_id (exposé par gartic_room_state). Un attaquant
--     récupérait ainsi le token de l'HÔTE et pouvait supprimer/reset la partie, forcer les phases.
--     Désormais : pour réclamer une place EXISTANTE il faut présenter le bon token, sinon spectateur.
-- (2) gartic_replay supprimait pages + sièges à N'IMPORTE quel status → interdit en pleine partie.
-- (3) gartic_submit (tolérance round-1) pouvait écraser une page DÉJÀ finalisée (que le voisin a
--     déjà décrite) → en retard on n'écrase QUE les placeholders.

-- ── (1) JOIN : token requis pour réclamer une place existante ────────────────
-- L'ancienne signature 4-args est SUPPRIMÉE (sinon elle resterait appelable sans token).
drop function if exists gartic_join(text,text,text,text);
create or replace function gartic_join(p_code text, p_user text, p_name text, p_avatar text, p_token uuid default null)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room gartic_rooms; v_pl gartic_players;
begin
  select * into v_room from gartic_rooms where code = upper(p_code);
  if v_room.id is null then return jsonb_build_object('error','introuvable'); end if;
  select * into v_pl from gartic_players where room_id = v_room.id and user_id = p_user;
  if v_pl.id is not null then
    -- place déjà prise : on ne rend le secret_token QUE si le bon token est fourni.
    -- Sans token valide (= quelqu'un qui a juste deviné/lu le user_id) → spectateur, zéro usurpation.
    if p_token is null or p_token <> v_pl.secret_token then
      return jsonb_build_object('spectator', true, 'room', to_jsonb(v_room));
    end if;
    update gartic_players set connected=true, last_seen=now(), display_name=p_name, avatar_url=p_avatar
      where id = v_pl.id returning * into v_pl;
    return jsonb_build_object('secret_token', v_pl.secret_token, 'seat', v_pl.seat, 'spectator', false, 'room', to_jsonb(v_room));
  end if;
  if v_room.status <> 'lobby' then return jsonb_build_object('spectator', true, 'room', to_jsonb(v_room)); end if;
  insert into gartic_players(room_id, user_id, display_name, avatar_url, connected, last_seen)
    values (v_room.id, p_user, p_name, p_avatar, true, now()) returning * into v_pl;
  return jsonb_build_object('secret_token', v_pl.secret_token, 'seat', v_pl.seat, 'spectator', false, 'room', to_jsonb(v_room));
end $$;
grant execute on function gartic_join(text,text,text,text,uuid) to anon, authenticated;

-- ── (2) REPLAY : interdit en pleine partie ───────────────────────────────────
create or replace function gartic_replay(p_code text, p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare g record; r gartic_rooms;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null or not g.is_host then return jsonb_build_object('error','unauthorized'); end if;
  select * into r from gartic_rooms where id = g.room_id;
  if r.status not in ('lobby','reveal','finished') then return jsonb_build_object('error','in_progress'); end if;
  delete from gartic_pages where room_id = g.room_id;
  update gartic_players set is_ready = false, seat = null where room_id = g.room_id;
  update gartic_rooms set status='lobby', current_round=0, current_phase=null, phase_ends_at=null,
    settings = settings - 'n', updated_at = now() where id = g.room_id;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function gartic_replay(text,uuid) to anon, authenticated;

-- ── (3) SUBMIT : en retard, n'écrase que les placeholders ─────────────────────
create or replace function gartic_submit(p_code text, p_token uuid, p_content text, p_round int default null)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare g record; v_book int; v_type text; v_round int;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null or g.seat is null then return jsonb_build_object('error','unauthorized'); end if;
  if g.status not in ('writing','drawing','describing') or g.n is null then return jsonb_build_object('error','phase'); end if;
  v_round := coalesce(p_round, g.current_round);
  if v_round <> g.current_round and v_round <> g.current_round - 1 then v_round := g.current_round; end if;
  v_book := ((g.seat - v_round) % g.n + g.n) % g.n;
  v_type := case when v_round = 0 then 'text' when v_round % 2 = 1 then 'drawing' else 'text' end;
  -- live (current_round) : écrase toujours sa propre page. En retard (round-1) : seulement si
  -- l'existant est encore un placeholder ('' / '—') → jamais clobber une page déjà finalisée.
  insert into gartic_pages(room_id, book_id, page_index, type, content, author_user_id)
    values (g.room_id, v_book, v_round, v_type, p_content, (select user_id from gartic_players where id = g.player_id))
    on conflict (room_id, book_id, page_index) do update set content = excluded.content, type = excluded.type
      where v_round = g.current_round or gartic_pages.content in ('', '—');
  return jsonb_build_object('ok', true, 'round', v_round);
end $$;
grant execute on function gartic_submit(text,uuid,text,int) to anon, authenticated;
