create table if not exists public.tier_list_rooms (
  room_code text primary key,
  board jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tier_list_rooms enable row level security;

drop policy if exists tier_list_rooms_select on public.tier_list_rooms;
drop policy if exists tier_list_rooms_insert on public.tier_list_rooms;
drop policy if exists tier_list_rooms_update on public.tier_list_rooms;

create policy tier_list_rooms_select
  on public.tier_list_rooms
  for select
  using (true);

create policy tier_list_rooms_insert
  on public.tier_list_rooms
  for insert
  with check (true);

create policy tier_list_rooms_update
  on public.tier_list_rooms
  for update
  using (true)
  with check (true);
