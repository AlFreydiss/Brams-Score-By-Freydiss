-- ─────────────────────────────────────────────────────────────────────────────
-- SAISONS DE JEU (Échecs + Dames) — Arène Brams.
-- À LANCER : railway run -- py -3 scripts/apply_migration.py supabase/migrations/20260624_seasons.sql
--
-- Objectif : permettre un classement « Saison en cours » (fenêtre datée) en plus
-- du classement all-time existant (echecs_profils / dames_ratings, intouchés).
--
-- 2 tables :
--   • game_seasons          : définition des saisons (label, dates, active).
--   • game_season_standings : agrégat de classement PAR saison, alimenté CÔTÉ
--                             SERVICE (service_role) à l'issue des parties classées.
--
-- Sécurité (audit RLS strict) :
--   • Lecture seule publique (anon + authenticated) — ces données ne sont PAS
--     sensibles (rating/bilan de jeu, déjà publics dans le classement all-time).
--   • AUCUNE écriture client : insert/update/delete réservés au service_role
--     (le pipeline serveur qui clôt les parties). Aucune table d'argent touchée.
--   • Dégradation gracieuse : tant que ces tables n'existent pas, le front
--     retombe en silence sur le classement all-time (voir seasons.js).
--
-- Idempotent / re-jouable.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Définition des saisons ───────────────────────────────────────────────────
-- jeu : 'echecs' | 'dames'. Une seule saison `active = true` par jeu à la fois
-- (garanti par l'index partiel unique ci-dessous).
create table if not exists public.game_seasons (
  id          uuid primary key default gen_random_uuid(),
  jeu         text        not null,                    -- 'echecs' | 'dames'
  label       text        not null,                    -- ex : « Saison 1 — Grand Line »
  started_at  timestamptz not null default now(),
  ends_at     timestamptz,                             -- null = saison sans fin programmée
  active      boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- Au plus UNE saison active par jeu (le reste = saisons archivées).
create unique index if not exists game_seasons_one_active_idx
  on public.game_seasons (jeu) where active;

create index if not exists game_seasons_jeu_idx on public.game_seasons (jeu, started_at desc);

-- ── Agrégat de classement par saison ─────────────────────────────────────────
-- Un row par (saison, joueur). Alimenté côté service à la fin de chaque partie
-- classée. discord_id = identifiant joueur (cohérent avec dames_ratings).
create table if not exists public.game_season_standings (
  season_id   uuid        not null references public.game_seasons(id) on delete cascade,
  jeu         text        not null,                    -- redondant mais pratique pour filtrer/index
  discord_id  text        not null,
  username    text,
  avatar      text,
  rating      int         not null default 1200,
  wins        int         not null default 0,
  losses      int         not null default 0,
  draws       int         not null default 0,
  games       int         not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (season_id, discord_id)
);

create index if not exists game_season_standings_rank_idx
  on public.game_season_standings (season_id, rating desc);
create index if not exists game_season_standings_jeu_idx
  on public.game_season_standings (jeu, season_id);

-- ── RLS : lecture seule publique, écriture service uniquement ─────────────────
alter table public.game_seasons          enable row level security;
alter table public.game_season_standings enable row level security;

-- Lecture publique (les seules policies permissives = SELECT). Aucune policy
-- INSERT/UPDATE/DELETE → le client ne peut RIEN écrire ; seul le service_role
-- (qui bypass RLS) alimente ces tables.
drop policy if exists game_seasons_read on public.game_seasons;
create policy game_seasons_read on public.game_seasons
  for select to anon, authenticated using (true);

drop policy if exists game_season_standings_read on public.game_season_standings;
create policy game_season_standings_read on public.game_season_standings
  for select to anon, authenticated using (true);

-- Privilèges : lecture pour anon/authenticated, écriture pour service_role.
grant select on public.game_seasons          to anon, authenticated;
grant select on public.game_season_standings to anon, authenticated;
grant insert, update, delete on public.game_seasons          to service_role;
grant insert, update, delete on public.game_season_standings to service_role;
