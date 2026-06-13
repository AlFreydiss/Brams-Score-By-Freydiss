-- ════════════════════════════════════════════════════════════════════════════
--  ANALYTICS — autoriser le tracking (RLS)
--  Diagnostic (2026-06-13) : INSERT anon sur analytics_events renvoyait 401 →
--  aucune policy d'insertion → toutes les écritures track()/session échouaient en
--  silence → dashboard staff à 0. La lecture marchait déjà (d'où le dashboard qui
--  s'affiche mais vide). Le code client (src/lib/analytics.js) est correct.
--  → À exécuter dans le SQL Editor Supabase.
-- ════════════════════════════════════════════════════════════════════════════

-- ── analytics_events : insertion publique (les visiteurs NON connectés comptent) ──
grant insert on analytics_events to anon, authenticated;
alter table analytics_events enable row level security;
drop policy if exists analytics_events_insert_public on analytics_events;
create policy analytics_events_insert_public on analytics_events
  for insert to anon, authenticated with check (true);

-- ── analytics_sessions : insert + update (upsert de session + heartbeat 45s) ──
grant insert, update on analytics_sessions to anon, authenticated;
alter table analytics_sessions enable row level security;
drop policy if exists analytics_sessions_insert_public on analytics_sessions;
create policy analytics_sessions_insert_public on analytics_sessions
  for insert to anon, authenticated with check (true);
drop policy if exists analytics_sessions_update_public on analytics_sessions;
create policy analytics_sessions_update_public on analytics_sessions
  for update to anon, authenticated using (true) with check (true);

-- Note : la LECTURE (dashboard) passe déjà / par VITE_ANALYTICS_KEY — vérifier que
-- cette variable est bien définie dans Vercel si le dashboard restait vide après ça.
