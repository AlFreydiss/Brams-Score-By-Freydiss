-- Épisodes et chapitres ajoutés à la main par le staff (page /staff/contenus).
-- Les fichiers vivent sur Cloudflare R2 ; cette table ne garde que les fiches.
-- Le site fusionne ces lignes avec les données livrées dans le bundle
-- (src/data/*-videos.json et src/data/manga/*.json) à l'ouverture d'une page.
--
-- Lecture : publique (anon). Écriture : uniquement via /api/media-additions,
-- qui vérifie le rôle staff puis écrit avec la clé service (RLS contournée).

create table if not exists public.media_additions (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('episode', 'chapter')),
  series      text not null,              -- id d'animé (jjk, kny…) ou slug de scan (kingdom…)
  num         numeric not null,           -- n° d'épisode ou de chapitre (10.5 accepté)
  season      text not null default '',   -- épisodes : 'S01', 'S02'… ; '' pour un chapitre
                                          -- (pas NULL : l'unicité ignorerait les NULL)
  title       text,
  data        jsonb not null default '{}', -- épisode : src, thumbnail, duration, subtitles… / chapitre : pages[]
  created_by  text,
  created_at  timestamptz not null default now(),
  unique (kind, series, season, num)
);

create index if not exists media_additions_series_idx on public.media_additions (kind, series);

alter table public.media_additions enable row level security;

drop policy if exists "media_additions_read" on public.media_additions;
create policy "media_additions_read" on public.media_additions
  for select using (true);
