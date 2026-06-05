-- ============================================================
-- FIX : les scores du Blind Test ne s'enregistraient pas.
-- Cause : RLS activée sur blind_test_scores avec policy SELECT
-- seulement → tous les INSERT/UPDATE refusés (erreur 42501).
-- À lancer dans Supabase → SQL Editor.
-- ============================================================

-- blind_test_scores : autoriser écriture (lecture déjà OK)
alter table blind_test_scores enable row level security;

drop policy if exists "bts_select" on blind_test_scores;
drop policy if exists "bts_insert" on blind_test_scores;
drop policy if exists "bts_update" on blind_test_scores;

create policy "bts_select" on blind_test_scores
  for select to anon, authenticated using (true);
create policy "bts_insert" on blind_test_scores
  for insert to anon, authenticated with check (true);
create policy "bts_update" on blind_test_scores
  for update to anon, authenticated using (true) with check (true);

-- blind_test_sessions : autoriser l'insertion des stats de manche
alter table blind_test_sessions enable row level security;

drop policy if exists "btsess_insert" on blind_test_sessions;
create policy "btsess_insert" on blind_test_sessions
  for insert to anon, authenticated with check (true);
