-- ─────────────────────────────────────────────────────────────────────────────
-- BADGES DE JEU (Échecs + Dames) — Arène Brams.
-- À LANCER : railway run -- py -3 scripts/apply_migration.py supabase/migrations/20260624_badges.sql
--
-- Objectif : distinctions affichées à côté du pseudo dans les classements
-- (ex : champion de saison, top 10, pic à 2000, série de 10 invaincus…).
--
-- 2 tables :
--   • game_badge_defs : catalogue des badges (label, description, palier). Le
--                       front a déjà sa propre map (badges.js) ; cette table sert
--                       de référence serveur / source de vérité optionnelle.
--   • game_badges     : badges effectivement attribués aux joueurs.
--
-- Sécurité (audit RLS strict) :
--   • Lecture seule publique (anon + authenticated) — données non sensibles
--     (récompenses de jeu, visibles de tous dans le classement).
--   • AUCUNE écriture client : l'attribution est réservée au service_role
--     (le pipeline serveur qui clôt parties / saisons). Aucune table d'argent.
--   • Dégradation gracieuse : tant que ces tables n'existent pas, le front
--     n'affiche aucun badge sans planter (try/catch dans badges.js).
--
-- Idempotent / re-jouable.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Catalogue des badges (référence) ─────────────────────────────────────────
-- tier : 'or' | 'argent' | 'bronze' (palier visuel ; le front dérive la couleur
-- de l'accent laiton, jamais de RGB criard).
create table if not exists public.game_badge_defs (
  badge_id    text primary key,                        -- ex : 'champion_saison'
  label       text not null,
  description text,
  tier        text not null default 'bronze',          -- 'or' | 'argent' | 'bronze'
  created_at  timestamptz not null default now()
);

-- ── Badges attribués ─────────────────────────────────────────────────────────
-- discord_id : identifiant joueur (cohérent avec dames_ratings / standings).
-- jeu : 'echecs' | 'dames' | null (badge transverse). Un joueur peut cumuler
-- plusieurs badges (clé composite).
create table if not exists public.game_badges (
  discord_id  text not null,
  badge_id    text not null,
  jeu         text,                                    -- 'echecs' | 'dames' | null
  granted_at  timestamptz not null default now(),
  primary key (discord_id, badge_id, jeu)
);

create index if not exists game_badges_discord_idx on public.game_badges (discord_id);
create index if not exists game_badges_jeu_idx      on public.game_badges (jeu);

-- ── Seed du catalogue (re-jouable : on n'écrase pas les libellés existants) ───
insert into public.game_badge_defs (badge_id, label, description, tier) values
  ('champion_saison', 'Champion de saison', '1ʳᵉ place à la clôture d''une saison classée.', 'or'),
  ('top10',           'Top 10',             'Classé dans le top 10 du classement.',          'argent'),
  ('pic_2000',        'Pic 2000',           'A atteint un pic de classement de 2000+.',      'or'),
  ('invaincu_10',     'Invaincu ×10',       'Série de 10 parties classées sans défaite.',    'argent'),
  ('centurion',       'Centurion',          '100 parties classées jouées.',                  'bronze')
on conflict (badge_id) do nothing;

-- ── RLS : lecture seule publique, écriture service uniquement ─────────────────
alter table public.game_badge_defs enable row level security;
alter table public.game_badges     enable row level security;

drop policy if exists game_badge_defs_read on public.game_badge_defs;
create policy game_badge_defs_read on public.game_badge_defs
  for select to anon, authenticated using (true);

drop policy if exists game_badges_read on public.game_badges;
create policy game_badges_read on public.game_badges
  for select to anon, authenticated using (true);

-- Privilèges : lecture pour anon/authenticated, attribution pour service_role.
grant select on public.game_badge_defs to anon, authenticated;
grant select on public.game_badges     to anon, authenticated;
grant insert, update, delete on public.game_badge_defs to service_role;
grant insert, update, delete on public.game_badges     to service_role;
