-- Feedback du module « Recommandé par l'IA » (bridge front → Supabase → Ruflo).
-- Écriture/lecture via la service key (API api/tierlists.js?action=reco_feedback).

create table if not exists public.recommendation_feedback (
  id           bigint generated always as identity primary key,
  user_id      text,                       -- discord id si connecté, sinon null (anonyme)
  anime_id     text not null,
  action       text not null check (action in ('like', 'dislike')),
  reason_given text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_reco_fb_created on public.recommendation_feedback (created_at desc);
create index if not exists idx_reco_fb_user    on public.recommendation_feedback (user_id);

alter table public.recommendation_feedback enable row level security;
-- Pas de policy publique : seul le backend (service role) lit/écrit. Le front passe
-- toujours par l'API, jamais en direct.
