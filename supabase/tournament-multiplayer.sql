-- Tournoi multijoueur — salons en ligne
-- À coller dans Supabase → SQL Editor → Run
-- Même modèle que blind-test-multiplayer : RLS publique + realtime.

create table if not exists public.tournament_rooms (
  code           text primary key,
  host_user_id   text not null,
  tournament_id  text not null default 'ost',   -- 'ost' | 'opening'
  status         text not null default 'lobby', -- 'lobby' | 'playing' | 'done'
  rounds         jsonb,                          -- état complet du bracket (généré par l'hôte)
  current_match  text,                           -- id du duel en cours (raccourci pour le realtime)
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create table if not exists public.tournament_room_players (
  room_code     text references public.tournament_rooms(code) on delete cascade,
  user_id       text,
  display_name  text,
  avatar_url    text,
  is_host       boolean not null default false,
  joined_at     timestamptz default now(),
  last_seen     timestamptz default now(),
  primary key (room_code, user_id)
);

create table if not exists public.tournament_room_votes (
  room_code   text references public.tournament_rooms(code) on delete cascade,
  match_id    text not null,
  user_id     text,
  side        text not null,                    -- 'left' | 'right'
  created_at  timestamptz default now(),
  primary key (room_code, match_id, user_id)
);

alter table public.tournament_rooms        enable row level security;
alter table public.tournament_room_players enable row level security;
alter table public.tournament_room_votes   enable row level security;

drop policy if exists "tr rooms public read"   on public.tournament_rooms;
drop policy if exists "tr rooms public write"  on public.tournament_rooms;
drop policy if exists "tr players public read" on public.tournament_room_players;
drop policy if exists "tr players public write" on public.tournament_room_players;
drop policy if exists "tr votes public read"   on public.tournament_room_votes;
drop policy if exists "tr votes public write"  on public.tournament_room_votes;

create policy "tr rooms public read"   on public.tournament_rooms        for select using (true);
create policy "tr rooms public write"  on public.tournament_rooms        for all using (true) with check (true);
create policy "tr players public read" on public.tournament_room_players for select using (true);
create policy "tr players public write" on public.tournament_room_players for all using (true) with check (true);
create policy "tr votes public read"   on public.tournament_room_votes   for select using (true);
create policy "tr votes public write"  on public.tournament_room_votes   for all using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.tournament_rooms;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.tournament_room_players;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.tournament_room_votes;
exception when duplicate_object then null; end $$;
