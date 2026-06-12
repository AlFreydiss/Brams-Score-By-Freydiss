-- Top du moment réel : événements d'ouverture d'animé sur le site.
-- À exécuter une fois dans le SQL Editor Supabase.

create table if not exists public.anime_watch_events (
  id         bigint generated always as identity primary key,
  anime_id   text not null,
  uid        text,
  created_at timestamptz not null default now()
);

create index if not exists anime_watch_events_recent
  on public.anime_watch_events (created_at desc, anime_id);

-- RLS : insertion + lecture anonymes (le site écrit/lit avec la clé anon),
-- jamais d'update/delete côté client.
alter table public.anime_watch_events enable row level security;

drop policy if exists "anon insert watch events" on public.anime_watch_events;
create policy "anon insert watch events" on public.anime_watch_events
  for insert to anon, authenticated with check (true);

drop policy if exists "anon read watch events" on public.anime_watch_events;
create policy "anon read watch events" on public.anime_watch_events
  for select to anon, authenticated using (true);
