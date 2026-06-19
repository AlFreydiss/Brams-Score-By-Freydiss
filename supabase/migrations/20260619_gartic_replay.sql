-- Brams Phone — « Rejouer » ramène le salon au LOBBY (au lieu de relancer direct avec les
-- mêmes joueurs/sièges/ready/pages de la partie précédente). Hôte uniquement.
-- Efface les pages de la partie, remet tout le monde non-prêt et déséquipe les sièges, et
-- repasse le salon en status='lobby' (drop le 'n' caché des settings → recompté au prochain
-- gartic_start). Après ça, des joueurs peuvent partir/rejoindre et chacun re-prêt avant départ.
create or replace function gartic_replay(p_code text, p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare g record;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null or not g.is_host then return jsonb_build_object('error','unauthorized'); end if;
  delete from gartic_pages where room_id = g.room_id;
  update gartic_players set is_ready = false, seat = null where room_id = g.room_id;
  update gartic_rooms
    set status = 'lobby', current_round = 0, current_phase = null, phase_ends_at = null,
        settings = settings - 'n', updated_at = now()
    where id = g.room_id;
  return jsonb_build_object('ok', true);
end $$;

grant execute on function gartic_replay(text,uuid) to anon, authenticated;
