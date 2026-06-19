-- Brams Phone — PURGE DES FANTÔMES après "Rejouer".
-- Bug confirmé : gartic_replay ne purgeait jamais les joueurs déconnectés et ne forçait pas
-- connected=false côté serveur, d'où :
--  (1) un hôte qui a fermé son onglet garde is_host=true sur une ligne fantôme → lui seul peut
--      lancer la partie → soft-lock permanent (la migration d'hôte ne peut pas se déclencher car le
--      replay a remis tous les sièges à null).
--  (2) gartic_start comptait TOUS les gartic_players (sans filtre connected) → les fantômes prennent
--      un siège, gonflent n, et produisent des livres vides ("Dessin manquant") au reveal.
-- Correctif (idempotent, create or replace) :
--  A) gartic_replay purge les joueurs périmés, réélit exactement un hôte parmi les survivants, puis reset.
--  B) gartic_start ne sièges/compte QUE les joueurs récemment connectés.

-- ── (A) REPLAY : purge fantômes + réélection d'hôte avant le reset ────────────
create or replace function gartic_replay(p_code text, p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare g record; r gartic_rooms;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null or not g.is_host then return jsonb_build_object('error','unauthorized'); end if;
  select * into r from gartic_rooms where id = g.room_id;
  if r.status not in ('lobby','reveal','finished') then return jsonb_build_object('error','in_progress'); end if;

  -- Purge les fantômes : déconnectés explicites OU sans heartbeat depuis 40s (touchPlayer rafraîchit
  -- last_seen). Sans ça, l'hôte fantôme garde is_host=true et soft-lock le lobby.
  delete from gartic_players
    where room_id = g.room_id and (connected = false or last_seen < now() - interval '40 seconds');

  -- Garantit exactement un hôte parmi les survivants : on remet tout le monde à false puis on élit
  -- le plus ancien encore vivant. Le subselect réélit même si l'ancien hôte vient d'être purgé.
  update gartic_players set is_host = false where room_id = g.room_id;
  update gartic_players set is_host = true where id = (
    select id from gartic_players
      where room_id = g.room_id and last_seen > now() - interval '40 seconds'
      order by joined_at asc limit 1);

  -- Reset existant.
  delete from gartic_pages where room_id = g.room_id;
  update gartic_players set is_ready = false, seat = null where room_id = g.room_id;
  update gartic_rooms set status='lobby', current_round=0, current_phase=null, phase_ends_at=null,
    settings = settings - 'n', updated_at = now() where id = g.room_id;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function gartic_replay(text,uuid) to anon, authenticated;

-- ── (B) START : ne sièges/compte QUE les joueurs récemment connectés ──────────
create or replace function gartic_start(p_code text, p_token uuid, p_settings jsonb)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare g record; v_n int;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null or not g.is_host then return jsonb_build_object('error','unauthorized'); end if;
  with ordered as (select id, row_number() over (order by joined_at) - 1 as rn
    from gartic_players where room_id = g.room_id and connected and last_seen > now() - interval '40 seconds')
  update gartic_players p set seat = o.rn from ordered o where p.id = o.id;
  select count(*) into v_n from gartic_players
    where room_id = g.room_id and connected and last_seen > now() - interval '40 seconds';
  update gartic_rooms set status='writing', current_round=0, current_phase='writing',
    settings = p_settings || jsonb_build_object('n', v_n),
    phase_ends_at = now() + (coalesce((p_settings->'phaseDurations'->>'writing')::int,60)||' seconds')::interval,
    updated_at = now() where id = g.room_id;
  return jsonb_build_object('ok', true, 'n', v_n);
end $$;
grant execute on function gartic_start(text,uuid,jsonb) to anon, authenticated;
