-- Réglages de jeu par utilisateur × jeu (échecs, dames, …) — Le Nouveau Monde.
-- Un seul row par (user, jeu). Données NON sensibles (préférences UI) → lecture/écriture
-- directe client, protégée par RLS (chacun ne voit/écrit QUE ses réglages). L'ELO/prime, lui,
-- reste calculé serveur via nm_report_match (voir nouveau_monde.sql) — JAMAIS ici.
-- Idempotent / re-jouable.

create table if not exists public.game_settings (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  jeu        text        not null,
  settings   jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, jeu)
);

alter table public.game_settings enable row level security;

drop policy if exists gs_select on public.game_settings;
create policy gs_select on public.game_settings
  for select using (auth.uid() = user_id);

drop policy if exists gs_insert on public.game_settings;
create policy gs_insert on public.game_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists gs_update on public.game_settings;
create policy gs_update on public.game_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists gs_delete on public.game_settings;
create policy gs_delete on public.game_settings
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.game_settings to authenticated;
