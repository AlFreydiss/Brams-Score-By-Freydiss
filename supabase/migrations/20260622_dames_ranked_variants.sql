-- ════════════════════════════════════════════════════════════════════════════
--  DAMES 3D — EN LIGNE CLASSÉ : support des VARIANTES de plateau/règles
--  Ajoute une colonne `variante` (text, défaut '10x10') sur la file d'attente
--  et sur les matchs, et fait que le matchmaking n'apparie QUE des joueurs de la
--  même variante. 10×10 international reste le défaut, 100 % rétro-compatible :
--  toute ligne existante (sans variante) est traitée comme '10x10'.
--
--  → À exécuter dans le SQL Editor Supabase APRÈS 20260613_dames_ranked.sql.
--  Pré-requis : _resolve_discord_id(), tables dames_rqueue / dames_rmatches.
--  Tant que cette migration n'est PAS appliquée, le code client/serveur retombe
--  proprement sur 10×10 (matchmake legacy + variante undefined ⇒ règles 10×10).
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Colonnes variante (défaut 10×10 → back-compat des lignes existantes)
alter table dames_rqueue   add column if not exists variante text not null default '10x10';
alter table dames_rmatches add column if not exists variante text not null default '10x10';

-- File appariée par (variante, rating) pour matcher vite dans la bonne variante.
create index if not exists dames_rqueue_var_rating_idx on dames_rqueue (variante, rating);

-- 2) Matchmaking : nouvelle signature avec p_variante. On garde l'ancienne
--    signature (p_board jsonb seul) en vie pour les clients pas encore déployés ;
--    elle délègue à la nouvelle en 10×10.
create or replace function dames_rank_matchmake(p_board jsonb, p_variante text default '10x10')
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_me text := _resolve_discord_id(); v_elo int; v_opp text; v_mid uuid; v_color text;
        v_var text := coalesce(nullif(p_variante, ''), '10x10');
begin
  if v_me is null then return '{"ok":false,"error":"Non authentifié"}'::jsonb; end if;
  insert into dames_ratings (discord_id) values (v_me) on conflict (discord_id) do nothing;
  select rating into v_elo from dames_ratings where discord_id = v_me;

  -- Partie active déjà en cours (reconnexion) : toutes variantes confondues.
  select id into v_mid from dames_rmatches
    where status = 'active' and (player_pirate = v_me or player_marine = v_me)
    order by started_at desc limit 1;
  if v_mid is not null then
    select case when player_pirate = v_me then 'P' else 'M' end into v_color from dames_rmatches where id = v_mid;
    return jsonb_build_object('ok', true, 'matched', true, 'match_id', v_mid, 'color', v_color, 'resumed', true);
  end if;

  delete from dames_rqueue where joined_at < now() - interval '2 minutes';
  -- adversaire DE LA MÊME VARIANTE, rating proche en priorité.
  select discord_id into v_opp from dames_rqueue
    where discord_id <> v_me and coalesce(variante,'10x10') = v_var
    order by abs(rating - coalesce(v_elo,1200)) asc, joined_at asc
    for update skip locked limit 1;

  if v_opp is null then
    insert into dames_rqueue (discord_id, rating, variante) values (v_me, coalesce(v_elo,1200), v_var)
      on conflict (discord_id) do update set rating = excluded.rating, variante = excluded.variante, joined_at = now();
    return jsonb_build_object('ok', true, 'matched', false, 'queued', true);
  end if;

  if p_board is null then return '{"ok":false,"error":"Plateau initial manquant"}'::jsonb; end if;
  if random() < 0.5 then
    insert into dames_rmatches (player_pirate, player_marine, board_state, variante) values (v_me, v_opp, p_board, v_var) returning id into v_mid; v_color := 'P';
  else
    insert into dames_rmatches (player_pirate, player_marine, board_state, variante) values (v_opp, v_me, p_board, v_var) returning id into v_mid; v_color := 'M';
  end if;
  delete from dames_rqueue where discord_id in (v_me, v_opp);
  return jsonb_build_object('ok', true, 'matched', true, 'match_id', v_mid, 'color', v_color);
end; $$;

-- Compat : ancien appel à un seul argument → délègue en 10×10.
create or replace function dames_rank_matchmake(p_board jsonb)
returns jsonb language sql security definer set search_path = public, pg_temp as $$
  select dames_rank_matchmake(p_board, '10x10');
$$;

-- 3) Détail de partie : renvoyer la variante pour que le client charge les bonnes règles.
create or replace function dames_rank_match(p_match_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_me text := _resolve_discord_id(); m record; v_opp text; ou jsonb;
begin
  if v_me is null then return '{"ok":false,"error":"Non authentifié"}'::jsonb; end if;
  if p_match_id is not null then select * into m from dames_rmatches where id = p_match_id;
  else select * into m from dames_rmatches where status='active' and (player_pirate=v_me or player_marine=v_me) order by started_at desc limit 1; end if;
  if not found then return jsonb_build_object('ok', true, 'match', null); end if;
  if m.player_pirate <> v_me and m.player_marine <> v_me then return '{"ok":false,"error":"Pas ta partie"}'::jsonb; end if;
  v_opp := case when m.player_pirate = v_me then m.player_marine else m.player_pirate end;
  select jsonb_build_object('username', coalesce(u.data->>'username', '#'||right(v_opp,5)), 'avatar', u.data->>'avatar_url') into ou from users u where u.uid = v_opp;
  return jsonb_build_object('ok', true, 'match', jsonb_build_object(
    'id', m.id, 'player_pirate', m.player_pirate, 'player_marine', m.player_marine,
    'current_turn', m.current_turn, 'board_state', m.board_state, 'status', m.status, 'winner', m.winner,
    'variante', coalesce(m.variante, '10x10'),
    'ply', m.ply, 'elo_change_pirate', m.elo_change_pirate, 'elo_change_marine', m.elo_change_marine,
    'my_color', case when m.player_pirate = v_me then 'P' else 'M' end, 'opponent', coalesce(ou, '{}'::jsonb)));
end; $$;

grant execute on function dames_rank_matchmake(jsonb, text) to authenticated;
grant execute on function dames_rank_matchmake(jsonb) to authenticated;
grant execute on function dames_rank_match(uuid) to authenticated;
