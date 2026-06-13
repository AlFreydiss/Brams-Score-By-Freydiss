-- ════════════════════════════════════════════════════════════════════════════
--  DAMES — Multijoueur en ligne classé (étape 5)
--  Matchmaking par file d'attente + synchro par polling (RPC), ELO + tiers thémés
--  One Piece calculés CÔTÉ SERVEUR (miroir de src/lib/dames/damesRank.js).
--  Pré-requis : 20260613_dames.sql (tables + _resolve_discord_id + users).
--  → À exécuter dans le SQL Editor Supabase.
-- ════════════════════════════════════════════════════════════════════════════

-- Tier d'un ELO (miroir exact des seuils TIERS de damesRank.js).
create or replace function _dames_tier(p_elo int)
returns text language sql immutable as $$
  select case
    when p_elo >= 2200 then 'roi'
    when p_elo >= 1900 then 'empereur'
    when p_elo >= 1600 then 'commandant'
    when p_elo >= 1300 then 'corsaire'
    when p_elo >= 1000 then 'supernova'
    when p_elo >= 700  then 'pirate'
    else 'mousse' end;
$$;

-- Nouvel ELO (K=32 si <30 parties, sinon 20). score ∈ {1, 0.5, 0}.
create or replace function _dames_new_elo(p_me int, p_opp int, p_score numeric, p_games int)
returns int language sql immutable as $$
  select round(p_me + (case when coalesce(p_games,0) < 30 then 32 else 20 end)
    * (p_score - (1.0 / (1.0 + power(10.0, (p_opp - p_me)::numeric / 400.0)))))::int;
$$;

-- ── Détail d'une partie (si je suis un des deux joueurs) ──────────────────────
create or replace function get_dames_match(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_me text := _resolve_discord_id(); m record; v_opp text; ou jsonb;
begin
  if v_me is null then return '{"ok":false,"error":"Non authentifié"}'::jsonb; end if;
  select * into m from dames_matches where id = p_match_id;
  if not found then return '{"ok":false,"error":"Partie introuvable"}'::jsonb; end if;
  if m.player_red <> v_me and m.player_black <> v_me then return '{"ok":false,"error":"Pas ta partie"}'::jsonb; end if;
  v_opp := case when m.player_red = v_me then m.player_black else m.player_red end;
  select jsonb_build_object('username', coalesce(u.data->>'username', '#' || right(v_opp, 5)), 'avatar', u.data->>'avatar_url')
    into ou from users u where u.uid = v_opp;
  return jsonb_build_object('ok', true, 'match', jsonb_build_object(
    'id', m.id, 'ruleset', m.ruleset, 'player_red', m.player_red, 'player_black', m.player_black,
    'current_turn', m.current_turn, 'board_state', m.board_state, 'status', m.status,
    'winner', m.winner, 'win_reason', m.win_reason,
    'elo_change_red', m.elo_change_red, 'elo_change_black', m.elo_change_black,
    'move_count', jsonb_array_length(coalesce(m.move_history, '[]'::jsonb)),
    'my_color', case when m.player_red = v_me then 'red' else 'black' end,
    'opponent', coalesce(ou, '{}'::jsonb)
  ));
end; $$;

-- ── Matchmaking : reprend une partie active, sinon apparie, sinon met en file ──
create or replace function find_dames_match(p_ruleset text default 'international', p_board jsonb default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_me text := _resolve_discord_id(); v_elo int; v_opp text; v_mid uuid; v_color text;
begin
  if v_me is null then return '{"ok":false,"error":"Non authentifié"}'::jsonb; end if;
  insert into dames_profiles(user_id) values (v_me) on conflict (user_id) do nothing;
  select elo into v_elo from dames_profiles where user_id = v_me;

  -- Déjà dans une partie active ? → on la reprend.
  select id into v_mid from dames_matches
    where status = 'active' and (player_red = v_me or player_black = v_me)
    order by created_at desc limit 1;
  if v_mid is not null then
    select case when player_red = v_me then 'red' else 'black' end into v_color from dames_matches where id = v_mid;
    return jsonb_build_object('ok', true, 'matched', true, 'match_id', v_mid, 'color', v_color, 'resumed', true);
  end if;

  -- Purge les entrées de file périmées (>2 min sans appariement).
  delete from dames_queue where joined_at < now() - interval '2 minutes';

  -- Cherche un adversaire en attente (verrou anti double-appariement).
  select user_id into v_opp from dames_queue
    where ruleset = p_ruleset and user_id <> v_me
    order by joined_at asc
    for update skip locked
    limit 1;

  if v_opp is null then
    insert into dames_queue(user_id, elo, ruleset) values (v_me, coalesce(v_elo, 1000), p_ruleset)
      on conflict (user_id) do nothing;  -- garde joined_at (position dans la file)
    return jsonb_build_object('ok', true, 'matched', false, 'queued', true);
  end if;

  if p_board is null then return '{"ok":false,"error":"Plateau initial manquant"}'::jsonb; end if;

  -- Adversaire trouvé : crée la partie (couleurs aléatoires) + vide la file.
  if random() < 0.5 then
    insert into dames_matches(ruleset, player_red, player_black, board_state)
      values (p_ruleset, v_me, v_opp, p_board) returning id into v_mid;
    v_color := 'red';
  else
    insert into dames_matches(ruleset, player_red, player_black, board_state)
      values (p_ruleset, v_opp, v_me, p_board) returning id into v_mid;
    v_color := 'black';
  end if;
  delete from dames_queue where user_id in (v_me, v_opp);
  return jsonb_build_object('ok', true, 'matched', true, 'match_id', v_mid, 'color', v_color);
end; $$;

create or replace function cancel_dames_queue()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_me text := _resolve_discord_id();
begin
  if v_me is null then return '{"ok":false}'::jsonb; end if;
  delete from dames_queue where user_id = v_me;
  return '{"ok":true}'::jsonb;
end; $$;

-- ── Soumettre un coup (on valide tour + appartenance ; plateau = source client) ─
create or replace function submit_dames_move(p_match_id uuid, p_board jsonb, p_move jsonb, p_next_turn text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_me text := _resolve_discord_id(); m record; v_color text;
begin
  if v_me is null then return '{"ok":false,"error":"Non authentifié"}'::jsonb; end if;
  select * into m from dames_matches where id = p_match_id for update;
  if not found then return '{"ok":false,"error":"Partie introuvable"}'::jsonb; end if;
  if m.status <> 'active' then return '{"ok":false,"error":"Partie terminée"}'::jsonb; end if;
  v_color := case when m.player_red = v_me then 'red' when m.player_black = v_me then 'black' else null end;
  if v_color is null then return '{"ok":false,"error":"Pas ta partie"}'::jsonb; end if;
  if m.current_turn <> v_color then return '{"ok":false,"error":"Pas ton tour"}'::jsonb; end if;
  if p_next_turn not in ('red', 'black') then return '{"ok":false,"error":"Tour invalide"}'::jsonb; end if;
  update dames_matches
    set board_state = p_board,
        move_history = coalesce(move_history, '[]'::jsonb) || jsonb_build_array(p_move),
        current_turn = p_next_turn
    where id = p_match_id;
  return '{"ok":true}'::jsonb;
end; $$;

-- ── Terminer une partie + appliquer l'ELO (idempotent : seulement si active) ───
create or replace function finish_dames_match(p_match_id uuid, p_winner text, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  m record; v_me text := _resolve_discord_id();
  v_red_elo int; v_red_games int; v_black_elo int; v_black_games int;
  v_score_red numeric; v_new_red int; v_new_black int; v_dr int; v_db int;
begin
  if v_me is null then return '{"ok":false,"error":"Non authentifié"}'::jsonb; end if;
  if p_winner not in ('red', 'black', 'draw') then return '{"ok":false,"error":"Résultat invalide"}'::jsonb; end if;
  select * into m from dames_matches where id = p_match_id for update;
  if not found then return '{"ok":false,"error":"Partie introuvable"}'::jsonb; end if;
  if m.player_red <> v_me and m.player_black <> v_me then return '{"ok":false,"error":"Pas ta partie"}'::jsonb; end if;
  if m.status <> 'active' then
    return jsonb_build_object('ok', true, 'already', true, 'winner', m.winner,
      'elo_change_red', m.elo_change_red, 'elo_change_black', m.elo_change_black);
  end if;

  insert into dames_profiles(user_id) values (m.player_red) on conflict (user_id) do nothing;
  insert into dames_profiles(user_id) values (m.player_black) on conflict (user_id) do nothing;
  select elo, games_played into v_red_elo, v_red_games from dames_profiles where user_id = m.player_red;
  select elo, games_played into v_black_elo, v_black_games from dames_profiles where user_id = m.player_black;

  v_score_red := case p_winner when 'red' then 1 when 'black' then 0 else 0.5 end;
  if m.is_ranked then
    v_new_red   := _dames_new_elo(v_red_elo, v_black_elo, v_score_red, v_red_games);
    v_new_black := _dames_new_elo(v_black_elo, v_red_elo, 1 - v_score_red, v_black_games);
  else
    v_new_red := v_red_elo; v_new_black := v_black_elo;
  end if;
  v_dr := v_new_red - v_red_elo; v_db := v_new_black - v_black_elo;

  update dames_matches set status = 'finished', winner = p_winner, win_reason = p_reason,
    elo_change_red = v_dr, elo_change_black = v_db, ended_at = now() where id = p_match_id;

  update dames_profiles set
    elo = v_new_red, peak_elo = greatest(peak_elo, v_new_red), games_played = games_played + 1,
    wins   = wins   + (case when p_winner = 'red'   then 1 else 0 end),
    losses = losses + (case when p_winner = 'black' then 1 else 0 end),
    draws  = draws  + (case when p_winner = 'draw'  then 1 else 0 end),
    current_streak = case p_winner
      when 'red'   then (case when current_streak >= 0 then current_streak + 1 else 1 end)
      when 'black' then (case when current_streak <= 0 then current_streak - 1 else -1 end)
      else 0 end,
    best_streak = greatest(best_streak, case p_winner when 'red' then (case when current_streak >= 0 then current_streak + 1 else 1 end) else best_streak end),
    rank_tier = _dames_tier(v_new_red), updated_at = now()
    where user_id = m.player_red;

  update dames_profiles set
    elo = v_new_black, peak_elo = greatest(peak_elo, v_new_black), games_played = games_played + 1,
    wins   = wins   + (case when p_winner = 'black' then 1 else 0 end),
    losses = losses + (case when p_winner = 'red'   then 1 else 0 end),
    draws  = draws  + (case when p_winner = 'draw'  then 1 else 0 end),
    current_streak = case p_winner
      when 'black' then (case when current_streak >= 0 then current_streak + 1 else 1 end)
      when 'red'   then (case when current_streak <= 0 then current_streak - 1 else -1 end)
      else 0 end,
    best_streak = greatest(best_streak, case p_winner when 'black' then (case when current_streak >= 0 then current_streak + 1 else 1 end) else best_streak end),
    rank_tier = _dames_tier(v_new_black), updated_at = now()
    where user_id = m.player_black;

  return jsonb_build_object('ok', true, 'winner', p_winner, 'elo_change_red', v_dr, 'elo_change_black', v_db,
    'new_elo_red', v_new_red, 'new_elo_black', v_new_black);
end; $$;

grant execute on function
  find_dames_match(text, jsonb), cancel_dames_queue(), get_dames_match(uuid),
  submit_dames_move(uuid, jsonb, jsonb, text), finish_dames_match(uuid, text, text)
  to authenticated;
