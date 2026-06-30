-- ════════════════════════════════════════════════════════════════════════════
--  MODE SPECTATEUR — Arène jeux (Échecs + Dames) · LECTURE SEULE STRICTE
--  But : permettre à n'importe qui (anon ou connecté) de REGARDER une partie
--  classée EN COURS — board, coups, horloges — en DIRECT, sans jamais pouvoir
--  écrire quoi que ce soit ni voir de donnée privée.
--
--  PRINCIPE DE SÉCURITÉ (audit RLS strict de ce repo) :
--   • AUCUNE policy d'écriture ajoutée. Les écritures de jeu restent réservées
--     aux joueurs (échecs : RPC SECURITY DEFINER) / au service role (dames :
--     fonction Vercel autoritaire). Le spectateur ne peut RIEN insérer/modifier.
--   • Les policies SELECT publiques ci-dessous sont SCOPÉES aux SEULES parties
--     en cours (échecs statut='en_cours' · dames status='active'). Une partie
--     terminée n'est PLUS exposée publiquement par ces policies.
--   • Ces tables ne contiennent QUE des données de jeu : pseudo/avatar de jeu,
--     ELO, board, coups, horloges. PAS d'email, PAS de token, PAS de secret.
--     Les identifiants Discord des joueurs de dames sont déjà publics via
--     dames_rank_leaderboard() → aucune nouvelle fuite.
--   • La liste des parties de dames passe par une RPC SECURITY DEFINER dédiée
--     qui ne renvoie QUE pseudo public + ELO + variante (résolus côté serveur),
--     jamais l'identifiant brut.
--
--  À LANCER : railway run -- py -3 scripts/apply_migration.py supabase/migrations/20260624_spectator.sql
--  Pré-requis : tables echecs_parties, dames_rmatches, dames_rmoves, dames_ratings,
--               users ; fonction _resolve_discord_id() ; migrations dames_ranked.
-- ════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) ÉCHECS — SELECT public scopé aux parties EN COURS
--    echecs_parties stocke les pseudos/avatars/ELO dénormalisés (données de jeu)
--    + fen/pgn/trait/horloges. Tout est public-safe. On expose UNIQUEMENT les
--    lignes statut='en_cours'. (RLS est déjà activée sur la table.)
-- ─────────────────────────────────────────────────────────────────────────────
alter table echecs_parties enable row level security;  -- idempotent (no-op si déjà active)

drop policy if exists echecs_parties_spectate on echecs_parties;
create policy echecs_parties_spectate on echecs_parties
  for select
  to anon, authenticated
  using (statut = 'en_cours');

grant select on echecs_parties to anon, authenticated;

-- Liste « parties en direct » : tri par date, filtre statut → index partiel ciblé.
create index if not exists echecs_parties_encours_idx
  on echecs_parties (created_at desc)
  where statut = 'en_cours';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) DAMES — SELECT public scopé aux parties ACTIVE (pour le live Realtime)
--    Le board/coups vivent dans dames_rmatches.board_state et dames_rmoves.
--    Realtime (postgres_changes) ne livre une ligne au client QUE si une policy
--    SELECT l'autorise → il FAUT une policy publique scopée pour que le spectateur
--    reçoive les coups en direct. On la limite STRICTEMENT aux matchs status='active'.
--    NB : status='active' est la valeur réelle en base (le brief disait 'playing' ;
--         cette table n'a jamais eu de statut 'playing' — voir 20260613_dames_ranked.sql).
-- ─────────────────────────────────────────────────────────────────────────────

-- Les policies existantes (réservées aux joueurs) restent en place ; on AJOUTE
-- une policy spectateur. Plusieurs policies SELECT = union (OR) → un joueur garde
-- l'accès à ses parties terminées, le public ne voit QUE les parties actives.
drop policy if exists dames_rmatches_spectate on dames_rmatches;
create policy dames_rmatches_spectate on dames_rmatches
  for select
  to anon, authenticated
  using (status = 'active');

grant select on dames_rmatches to anon;  -- 'authenticated' déjà accordé en 20260613

-- Coups d'une partie ACTIVE uniquement (board_after/move/ply = données de jeu pures).
drop policy if exists dames_rmoves_spectate on dames_rmoves;
create policy dames_rmoves_spectate on dames_rmoves
  for select
  to anon, authenticated
  using (exists (select 1 from dames_rmatches m where m.id = match_id and m.status = 'active'));

grant select on dames_rmoves to anon;  -- 'authenticated' déjà accordé en 20260613

-- Liste des parties actives (tri/filtre) → index partiel.
create index if not exists dames_rmatches_active_started_idx
  on dames_rmatches (started_at desc)
  where status = 'active';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) DAMES — RPC liste spectateur (pseudo public + ELO résolus côté serveur)
--    SECURITY DEFINER : ne renvoie QUE des champs publics. Aucun secret, aucune
--    écriture. Bornée aux parties status='active'.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function dames_spectate_list(p_limit int default 24)
returns jsonb language sql security definer stable set search_path = public, pg_temp as $$
  select jsonb_build_object('ok', true, 'rows', coalesce(jsonb_agg(row order by started_at desc), '[]'::jsonb))
  from (
    select jsonb_build_object(
      'id', m.id,
      'variante', coalesce(m.variante, '10x10'),
      'ply', m.ply,
      'pirate', jsonb_build_object(
        'username', coalesce(up.data->>'username', '#'||right(m.player_pirate,5)),
        'avatar',   up.data->>'avatar_url',
        'rating',   rp.rating),
      'marine', jsonb_build_object(
        'username', coalesce(um.data->>'username', '#'||right(m.player_marine,5)),
        'avatar',   um.data->>'avatar_url',
        'rating',   rm.rating)
    ) as row, m.started_at
    from dames_rmatches m
    left join users up on up.uid = m.player_pirate
    left join users um on um.uid = m.player_marine
    left join dames_ratings rp on rp.discord_id = m.player_pirate
    left join dames_ratings rm on rm.discord_id = m.player_marine
    where m.status = 'active'
    order by m.started_at desc
    limit greatest(1, least(coalesce(p_limit,24), 60))
  ) s;
$$;

grant execute on function dames_spectate_list(int) to anon, authenticated;

-- Détail d'une partie de dames à regarder (board + pseudos publics + variante).
-- SECURITY DEFINER, lecture seule, bornée à status='active'.
create or replace function dames_spectate_match(p_match_id uuid)
returns jsonb language plpgsql security definer stable set search_path = public, pg_temp as $$
declare m record; up jsonb; um jsonb; rp int; rm int;
begin
  select * into m from dames_rmatches where id = p_match_id and status = 'active';
  if not found then return jsonb_build_object('ok', true, 'match', null); end if;
  select jsonb_build_object('username', coalesce(u.data->>'username', '#'||right(m.player_pirate,5)), 'avatar', u.data->>'avatar_url')
    into up from users u where u.uid = m.player_pirate;
  select jsonb_build_object('username', coalesce(u.data->>'username', '#'||right(m.player_marine,5)), 'avatar', u.data->>'avatar_url')
    into um from users u where u.uid = m.player_marine;
  select rating into rp from dames_ratings where discord_id = m.player_pirate;
  select rating into rm from dames_ratings where discord_id = m.player_marine;
  return jsonb_build_object('ok', true, 'match', jsonb_build_object(
    'id', m.id, 'board_state', m.board_state, 'current_turn', m.current_turn,
    'status', m.status, 'ply', m.ply, 'variante', coalesce(m.variante, '10x10'),
    'pirate', coalesce(up, '{}'::jsonb) || jsonb_build_object('rating', rp),
    'marine', coalesce(um, '{}'::jsonb) || jsonb_build_object('rating', rm)));
end; $$;

grant execute on function dames_spectate_match(uuid) to anon, authenticated;
