create table if not exists public.blind_test_rooms (
  room_code text primary key,
  phase text not null default 'lobby',
  round integer not null default 0,
  track_id text,
  last_track_id text,
  started_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.blind_test_rooms enable row level security;

drop policy if exists blind_test_rooms_select on public.blind_test_rooms;
drop policy if exists blind_test_rooms_insert on public.blind_test_rooms;
drop policy if exists blind_test_rooms_update on public.blind_test_rooms;

create policy blind_test_rooms_select
  on public.blind_test_rooms
  for select
  using (true);

create policy blind_test_rooms_insert
  on public.blind_test_rooms
  for insert
  with check (true);

create policy blind_test_rooms_update
  on public.blind_test_rooms
  for update
  using (true)
  with check (true);
