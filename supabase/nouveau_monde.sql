-- ════════════════════════════════════════════════════════════════════════════
--  NOUVEAU MONDE — backend classements / primes (฿) du hub d'arcade One Piece
--  Identité = auth.uid() (uuid), aligné sur le modèle Échecs (echecs.sql).
--  `game` ∈ clés ratingKey du registre src/features/nouveau-monde/data/islands.js :
--     echecs, dames, fredisu, blind_test, brams_phone, brams_arena, brams_island
--
--  SÉCURITÉ (priorité) :
--    - SELECT public sur game_ratings (lecture des classements) ;
--    - AUCUN insert/update/delete client sur game_ratings / nm_match_history ;
--    - tout calcul ELO + prime passe par RPC SECURITY DEFINER (jamais côté client).
--  La prime ฿ est DÉRIVÉE de l'ELO côté serveur (voir nm_bounty_of()).
--
--  Idempotent et re-jouable : CREATE ... IF NOT EXISTS, CREATE OR REPLACE,
--  DROP POLICY IF EXISTS avant CREATE POLICY.
--  → À exécuter dans le SQL Editor Supabase (migration manuelle, cf. backend.md).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Tables ────────────────────────────────────────────────────────────────────

-- Un rating par (joueur, jeu). bounty = prime ฿ dérivée, jamais écrite par le client.
create table if not exists game_ratings (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  game       text        not null,
  elo        int         not null default 1000,
  bounty     bigint      not null default 0,
  wins       int         not null default 0,
  losses     int         not null default 0,
  draws      int         not null default 0,
  games      int         not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, game),
  -- garde-fou : seules les clés du registre islands.js sont acceptées
  constraint game_ratings_game_chk check (game in
    ('echecs','dames','fredisu','blind_test','brams_phone','brams_arena','brams_island'))
);
create index if not exists game_ratings_game_elo_idx on game_ratings (game, elo desc);

-- Historique des matchs classés (player_b null = solo/IA / score-based).
create table if not exists nm_match_history (
  id             uuid        primary key default gen_random_uuid(),
  game           text        not null,
  player_a       uuid        not null references auth.users(id) on delete cascade,
  player_b       uuid                 references auth.users(id) on delete set null,
  result         text        not null check (result in ('a_win','b_win','draw')),
  elo_delta_a    int         not null default 0,
  elo_delta_b    int         not null default 0,
  bounty_delta_a bigint      not null default 0,
  bounty_delta_b bigint      not null default 0,
  mode           text        not null default 'classe',  -- classe | ami | solo
  created_at     timestamptz not null default now()
);
create index if not exists nm_match_history_game_idx   on nm_match_history (game, created_at desc);
create index if not exists nm_match_history_player_idx on nm_match_history (player_a, created_at desc);
create index if not exists nm_match_history_playerb_idx on nm_match_history (player_b, created_at desc);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table game_ratings     enable row level security;
alter table nm_match_history enable row level security;

-- Classements = lecture publique. Aucune policy write : insert/update/delete
-- impossibles depuis un client (anon/authenticated). Seules les RPC SECURITY
-- DEFINER (propriétaire) écrivent.
drop policy if exists game_ratings_public_read on game_ratings;
create policy game_ratings_public_read on game_ratings
  for select to anon, authenticated using (true);
grant select on game_ratings to anon, authenticated;
-- révoque tout droit d'écriture direct hérité d'un éventuel grant antérieur
revoke insert, update, delete on game_ratings from anon, authenticated;

-- Historique : un joueur lit ses propres matchs (les classements n'en ont pas besoin,
-- nm_leaderboard agrège via RPC SECURITY DEFINER qui bypass la RLS).
drop policy if exists nm_match_history_own_read on nm_match_history;
create policy nm_match_history_own_read on nm_match_history
  for select to authenticated
  using (auth.uid() = player_a or auth.uid() = player_b);
grant select on nm_match_history to authenticated;
revoke insert, update, delete on nm_match_history from anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
--  HELPERS (internes, non exposés)
-- ══════════════════════════════════════════════════════════════════════════════

-- Prime ฿ dérivée de l'ELO. Formule monotone, croissante, plancher à 0.
-- WHY : la prime n'est PAS stockée librement — elle est toujours recalculée depuis
-- l'ELO à chaque match, ce qui la rend infalsifiable (pas d'accumulation côté client).
-- 800 = ELO « sans prime » ; chaque point d'ELO au-dessus vaut 1000 ฿.
--   ELO 1000 (départ) → 200 000 ฿ ; ELO 1500 → 700 000 ฿.
create or replace function nm_bounty_of(p_elo int)
returns bigint language sql immutable set search_path = public, pg_temp as $$
  select greatest(0, (p_elo - 800))::bigint * 1000;
$$;

-- Facteur K standard Elo (K=32 demandé par le cahier des charges).
create or replace function nm_k_factor()
returns int language sql immutable set search_path = public, pg_temp as $$
  select 32;
$$;

-- Enrichissement d'affichage (username/avatar) : auth.uid (uuid) → discord_id → users.
-- WHY : l'identité de session est un uuid Supabase, mais le pseudo/avatar vit dans
-- la table `users` keyée par le Discord id (text). On résout via auth.identities.
create or replace function nm_display(p_user uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with did as (
    select coalesce(
      au.raw_user_meta_data->>'provider_id',
      (select identity_data->>'sub' from auth.identities
        where user_id = p_user and provider = 'discord' limit 1)
    ) as discord_id
    from auth.users au where au.id = p_user
  )
  select jsonb_build_object(
    'discord_id', d.discord_id,
    'username',   coalesce(u.data->>'username', 'Pirate'),
    'avatar',     u.data->>'avatar_url'
  )
  from did d left join users u on u.uid = d.discord_id;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
--  RPC : nm_report_match
--  Calcule l'ELO (Elo standard, K=32) des 2 joueurs, met à jour ratings + bounty,
--  insère l'historique, et retourne le delta du joueur courant.
--  p_result est TOUJOURS du point de vue de l'appelant (auth.uid()) :
--     'a_win' = l'appelant gagne, 'b_win' = l'adversaire gagne, 'draw' = nulle.
--  Anti-triche : refuse p_opponent = self en mode classé ; vérifie auth.uid().
-- ══════════════════════════════════════════════════════════════════════════════
create or replace function nm_report_match(
  p_game     text,
  p_opponent uuid,
  p_result   text,
  p_mode     text default 'classe'
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_me    uuid := auth.uid();
  v_elo_a int;  v_elo_b int;
  v_exp_a double precision; v_score_a double precision;
  v_k     int := nm_k_factor();
  v_da    int;  v_db int;
  v_new_a int;  v_new_b int;
  v_bd_a  bigint; v_bd_b bigint;
  v_old_b_bounty bigint;
begin
  if v_me is null then
    return '{"ok":false,"error":"Non authentifié"}'::jsonb;
  end if;
  if p_game not in
    ('echecs','dames','fredisu','blind_test','brams_phone','brams_arena','brams_island') then
    return '{"ok":false,"error":"Jeu inconnu"}'::jsonb;
  end if;
  if p_result not in ('a_win','b_win','draw') then
    return '{"ok":false,"error":"Résultat invalide"}'::jsonb;
  end if;
  -- Anti-triche : on ne s'auto-affronte pas pour se primer en classé.
  if p_opponent is not null and p_opponent = v_me and coalesce(p_mode,'classe') = 'classe' then
    return '{"ok":false,"error":"Adversaire invalide"}'::jsonb;
  end if;

  -- Profils ELO (créés à 1000 au besoin), verrou ordonné pour éviter les deadlocks.
  insert into game_ratings (user_id, game) values (v_me, p_game)
    on conflict (user_id, game) do nothing;
  if p_opponent is not null then
    insert into game_ratings (user_id, game) values (p_opponent, p_game)
      on conflict (user_id, game) do nothing;
  end if;

  -- Verrou dans un ordre déterministe (par user_id) pour 2 joueurs concurrents.
  if p_opponent is null or v_me <= p_opponent then
    select elo into v_elo_a from game_ratings where user_id = v_me and game = p_game for update;
    if p_opponent is not null then
      select elo into v_elo_b from game_ratings where user_id = p_opponent and game = p_game for update;
    end if;
  else
    select elo into v_elo_b from game_ratings where user_id = p_opponent and game = p_game for update;
    select elo into v_elo_a from game_ratings where user_id = v_me and game = p_game for update;
  end if;

  v_score_a := case p_result when 'a_win' then 1.0 when 'b_win' then 0.0 else 0.5 end;

  if p_opponent is null then
    -- Solo / score-based (player_b null) : pas d'ELO adverse, pas de transfert.
    -- On applique un mouvement contre un adversaire « moyen » = même ELO (50/50).
    v_da := round(v_k * (v_score_a - 0.5))::int;
    v_db := 0;
    v_new_a := greatest(100, v_elo_a + v_da);
    v_new_b := null;
    v_bd_a  := nm_bounty_of(v_new_a) - nm_bounty_of(v_elo_a);
    v_bd_b  := 0;

    update game_ratings set
      elo = v_new_a,
      bounty = nm_bounty_of(v_new_a),
      wins   = wins   + (p_result = 'a_win')::int,
      losses = losses + (p_result = 'b_win')::int,
      draws  = draws  + (p_result = 'draw')::int,
      games  = games + 1,
      updated_at = now()
    where user_id = v_me and game = p_game;
  else
    -- 1v1 classé : Elo standard symétrique.
    v_exp_a := 1.0 / (1.0 + power(10::double precision, (v_elo_b - v_elo_a) / 400.0));
    v_da := round(v_k * (v_score_a - v_exp_a))::int;
    v_db := round(v_k * ((1.0 - v_score_a) - (1.0 - v_exp_a)))::int;
    v_new_a := greatest(100, v_elo_a + v_da);
    v_new_b := greatest(100, v_elo_b + v_db);
    v_bd_a  := nm_bounty_of(v_new_a) - nm_bounty_of(v_elo_a);
    v_bd_b  := nm_bounty_of(v_new_b) - nm_bounty_of(v_elo_b);

    update game_ratings set
      elo = v_new_a,
      bounty = nm_bounty_of(v_new_a),
      wins   = wins   + (p_result = 'a_win')::int,
      losses = losses + (p_result = 'b_win')::int,
      draws  = draws  + (p_result = 'draw')::int,
      games  = games + 1,
      updated_at = now()
    where user_id = v_me and game = p_game;

    update game_ratings set
      elo = v_new_b,
      bounty = nm_bounty_of(v_new_b),
      wins   = wins   + (p_result = 'b_win')::int,
      losses = losses + (p_result = 'a_win')::int,
      draws  = draws  + (p_result = 'draw')::int,
      games  = games + 1,
      updated_at = now()
    where user_id = p_opponent and game = p_game;
  end if;

  insert into nm_match_history
    (game, player_a, player_b, result, elo_delta_a, elo_delta_b,
     bounty_delta_a, bounty_delta_b, mode)
  values
    (p_game, v_me, p_opponent, p_result, v_da, coalesce(v_db,0),
     v_bd_a, coalesce(v_bd_b,0), coalesce(p_mode,'classe'));

  return jsonb_build_object(
    'ok', true,
    'game', p_game,
    'elo', v_new_a,
    'elo_delta', v_da,
    'bounty', nm_bounty_of(v_new_a),
    'bounty_delta', v_bd_a
  );
end $$;

-- ══════════════════════════════════════════════════════════════════════════════
--  RPC : nm_leaderboard — top 50 par ELO d'un jeu.
--  p_period ∈ all | week | month. Pour week/month on ne retient que les joueurs
--  ayant au moins un match classé sur la fenêtre (le rating affiché reste l'ELO
--  courant ; la période sert de filtre d'activité).
-- ══════════════════════════════════════════════════════════════════════════════
create or replace function nm_leaderboard(p_game text, p_period text default 'all')
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_since timestamptz;
  v_rows  jsonb;
begin
  if p_game not in
    ('echecs','dames','fredisu','blind_test','brams_phone','brams_arena','brams_island') then
    return '{"ok":false,"error":"Jeu inconnu"}'::jsonb;
  end if;

  v_since := case lower(coalesce(p_period,'all'))
               when 'week'  then now() - interval '7 days'
               when 'month' then now() - interval '30 days'
               else null
             end;

  select coalesce(jsonb_agg(r order by (r->>'rang')::int), '[]'::jsonb) into v_rows
  from (
    select jsonb_build_object(
      'rang',     row_number() over (order by gr.elo desc, gr.bounty desc),
      'user_id',  gr.user_id,
      'elo',      gr.elo,
      'bounty',   gr.bounty,
      'wins',     gr.wins,
      'losses',   gr.losses,
      'draws',    gr.draws,
      'games',    gr.games,
      'username', d.username,
      'avatar',   d.avatar
    ) as r
    from game_ratings gr
    cross join lateral jsonb_to_record(nm_display(gr.user_id)) as d(username text, avatar text)
    where gr.game = p_game
      and gr.games > 0
      and (
        v_since is null
        or exists (
          select 1 from nm_match_history h
          where h.game = p_game
            and h.created_at >= v_since
            and (h.player_a = gr.user_id or h.player_b = gr.user_id)
        )
      )
    order by gr.elo desc, gr.bounty desc
    limit 50
  ) s;

  return jsonb_build_object('ok', true, 'game', p_game, 'period', lower(coalesce(p_period,'all')), 'rows', v_rows);
end $$;

-- ══════════════════════════════════════════════════════════════════════════════
--  RPC : nm_player_log — « Mon Log Pose » d'un joueur :
--  prime totale (somme bounty tous jeux), stats par jeu, derniers matchs.
-- ══════════════════════════════════════════════════════════════════════════════
create or replace function nm_player_log(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_total_bounty bigint;
  v_per_game jsonb;
  v_recent   jsonb;
begin
  if p_user is null then
    return '{"ok":false,"error":"Joueur manquant"}'::jsonb;
  end if;

  select coalesce(sum(bounty), 0) into v_total_bounty
  from game_ratings where user_id = p_user;

  select coalesce(jsonb_agg(jsonb_build_object(
           'game', game, 'elo', elo, 'bounty', bounty,
           'wins', wins, 'losses', losses, 'draws', draws, 'games', games
         ) order by bounty desc), '[]'::jsonb) into v_per_game
  from game_ratings where user_id = p_user;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'game', game, 'mode', mode, 'created_at', created_at,
           -- delta du point de vue de p_user (a ou b selon sa position)
           'is_player_a', (player_a = p_user),
           'opponent', case when player_a = p_user then player_b else player_a end,
           'won', case
                    when result = 'draw' then null
                    when (player_a = p_user and result = 'a_win')
                      or (player_b = p_user and result = 'b_win') then true
                    else false end,
           'elo_delta',    case when player_a = p_user then elo_delta_a    else elo_delta_b end,
           'bounty_delta', case when player_a = p_user then bounty_delta_a else bounty_delta_b end
         ) order by created_at desc), '[]'::jsonb) into v_recent
  from (
    select * from nm_match_history
    where player_a = p_user or player_b = p_user
    order by created_at desc limit 20
  ) h;

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user,
    'display', nm_display(p_user),
    'total_bounty', v_total_bounty,
    'per_game', v_per_game,
    'recent', v_recent
  );
end $$;

-- ══════════════════════════════════════════════════════════════════════════════
--  RPC : nm_global_bounty — prime globale agrégée d'un joueur (tous jeux).
-- ══════════════════════════════════════════════════════════════════════════════
create or replace function nm_global_bounty(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_total bigint;
begin
  if p_user is null then
    return '{"ok":false,"error":"Joueur manquant"}'::jsonb;
  end if;
  select coalesce(sum(bounty), 0) into v_total from game_ratings where user_id = p_user;
  return jsonb_build_object('ok', true, 'user_id', p_user, 'bounty', v_total, 'display', nm_display(p_user));
end $$;

-- ── Droits d'exécution ─────────────────────────────────────────────────────────
revoke all on function nm_report_match(text,uuid,text,text) from public;
grant execute on function nm_report_match(text,uuid,text,text) to authenticated;

revoke all on function nm_leaderboard(text,text)   from public;
grant execute on function nm_leaderboard(text,text)   to anon, authenticated;

revoke all on function nm_player_log(uuid)         from public;
grant execute on function nm_player_log(uuid)         to anon, authenticated;

revoke all on function nm_global_bounty(uuid)      from public;
grant execute on function nm_global_bounty(uuid)      to anon, authenticated;

-- helpers internes : pas d'exécution publique (utilisés par les RPC ci-dessus)
revoke all on function nm_bounty_of(int) from public;
revoke all on function nm_k_factor()     from public;
revoke all on function nm_display(uuid)  from public;
