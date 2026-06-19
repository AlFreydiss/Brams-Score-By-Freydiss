-- Brams Phone — fix « Dessin manquant / indisponible ».
-- Cause : gartic_submit écrivait la page sur la manche LIVE (current_round). Un upload de
-- dessin lent qui se termine APRÈS que l'hôte ait fait avancer la partie atterrissait alors
-- sur la mauvaise manche, et le placeholder vide ('') inséré par gartic_advance restait en
-- place → « Dessin manquant » (Reveal) / « Dessin indisponible » (phase description).
--
-- Fix : le client fige la manche où il a réellement dessiné et la passe en p_round. Le serveur
-- tolère p_round == current_round OU current_round-1 (la manche qui vient juste d'être avancée),
-- recalcule book_id/type depuis CE round, et écrit (on conflict do update) → le vrai dessin
-- écrase le placeholder même s'il arrive en retard. p_round absent ⇒ comportement d'avant.
create or replace function gartic_submit(p_code text, p_token uuid, p_content text, p_round int default null)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare g record; v_book int; v_type text; v_round int;
begin
  select * into g from _gartic_player(p_code, p_token);
  if g.room_id is null or g.seat is null then return jsonb_build_object('error','unauthorized'); end if;
  if g.status not in ('writing','drawing','describing') or g.n is null then return jsonb_build_object('error','phase'); end if;
  v_round := coalesce(p_round, g.current_round);
  -- garde-fou : seules la manche courante ou la précédente (upload arrivé après l'avance) sont
  -- acceptées ; une valeur aberrante retombe sur la manche courante (un siège ne peut écrire
  -- que SA propre page via book_id dérivé du siège).
  if v_round <> g.current_round and v_round <> g.current_round - 1 then
    v_round := g.current_round;
  end if;
  v_book := ((g.seat - v_round) % g.n + g.n) % g.n;
  v_type := case when v_round = 0 then 'text' when v_round % 2 = 1 then 'drawing' else 'text' end;
  insert into gartic_pages(room_id, book_id, page_index, type, content, author_user_id)
    values (g.room_id, v_book, v_round, v_type, p_content, (select user_id from gartic_players where id = g.player_id))
    on conflict (room_id, book_id, page_index) do update set content = excluded.content, type = excluded.type;
  return jsonb_build_object('ok', true, 'round', v_round);
end $$;
