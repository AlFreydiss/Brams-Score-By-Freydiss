-- Blind Test multijoueur
-- A coller dans Supabase -> SQL Editor -> Run

create table if not exists public.blind_test_rooms (
  code text primary key,
  host_user_id text not null,
  status text not null default 'waiting',
  difficulty_id text not null default 'easy',
  round int not null default 0,
  current_track_id text,
  started_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.blind_test_room_players (
  room_code text references public.blind_test_rooms(code) on delete cascade,
  user_id text,
  display_name text,
  avatar_url text,
  score bigint not null default 0,
  streak int not null default 0,
  joined_at timestamptz default now(),
  last_seen timestamptz default now(),
  primary key (room_code, user_id)
);

create table if not exists public.blind_test_room_answers (
  id bigserial primary key,
  room_code text references public.blind_test_rooms(code) on delete cascade,
  user_id text,
  round int not null,
  track_id text,
  anime_guess text,
  title_guess text,
  anime_ok boolean default false,
  title_ok boolean default false,
  earned bigint default 0,
  time_ms int default 0,
  created_at timestamptz default now(),
  unique(room_code, user_id, round)
);

alter table public.blind_test_rooms enable row level security;
alter table public.blind_test_room_players enable row level security;
alter table public.blind_test_room_answers enable row level security;

drop policy if exists "blind rooms public read" on public.blind_test_rooms;
drop policy if exists "blind rooms public write" on public.blind_test_rooms;
drop policy if exists "blind players public read" on public.blind_test_room_players;
drop policy if exists "blind players public write" on public.blind_test_room_players;
drop policy if exists "blind answers public read" on public.blind_test_room_answers;
drop policy if exists "blind answers public write" on public.blind_test_room_answers;

create policy "blind rooms public read" on public.blind_test_rooms for select using (true);
create policy "blind rooms public write" on public.blind_test_rooms for all using (true) with check (true);

create policy "blind players public read" on public.blind_test_room_players for select using (true);
create policy "blind players public write" on public.blind_test_room_players for all using (true) with check (true);

create policy "blind answers public read" on public.blind_test_room_answers for select using (true);
create policy "blind answers public write" on public.blind_test_room_answers for all using (true) with check (true);

do $$
begin
  alter publication supabase_realtime add table public.blind_test_rooms;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.blind_test_room_players;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.blind_test_room_answers;
exception when duplicate_object then null;
end $$;
