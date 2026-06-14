-- ============================================================
--  Brams Phone — schema + RLS + RPC (modele Undercover, v1)
--  Anon sign-ins desactives -> user_id texte, RLS ouverte,
--  host-authority par convention, horloge serveur via RPC.
--  Idempotent (re-jouable).
-- ============================================================

create table if not exists gartic_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_user_id text,
  status text not null default 'lobby',          -- lobby|writing|drawing|describing|reveal|finished
  settings jsonb not null default '{}',          -- { rounds, phaseDurations, mode, n }
  current_round int not null default 0,
  current_phase text,
  phase_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gartic_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references gartic_rooms(id) on delete cascade,
  user_id text not null,                         -- id Brams/Discord ou guest localStorage
  display_name text not null,
  avatar_url text,
  seat int,
  is_host boolean default false,
  is_ready boolean default false,
  connected boolean default true,
  last_seen timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create table if not exists gartic_pages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references gartic_rooms(id) on delete cascade,
  book_id int not null,                          -- = siege auteur du carnet
  page_index int not null,                       -- 0..n-1
  author_user_id text,
  type text not null,                            -- 'text' | 'drawing'
  content text,                                  -- texte OU url R2
  created_at timestamptz not null default now(),
  unique (room_id, book_id, page_index)
);

create index if not exists idx_gpl_room on gartic_players(room_id);
create index if not exists idx_gpg_room on gartic_pages(room_id);
create index if not exists idx_grm_code on gartic_rooms(code);

alter table gartic_rooms   enable row level security;
alter table gartic_players enable row level security;
alter table gartic_pages   enable row level security;

-- Policies ouvertes = meme niveau que les salons Tournoi/Undercover deja shippes.
-- Durcissement futur : activer anon sign-ins -> policies par auth.uid (cf. plan Task 1).
drop policy if exists grm_all on gartic_rooms;
drop policy if exists gpl_all on gartic_players;
drop policy if exists gpg_all on gartic_pages;
create policy grm_all on gartic_rooms   for all to anon, authenticated using (true) with check (true);
create policy gpl_all on gartic_players for all to anon, authenticated using (true) with check (true);
create policy gpg_all on gartic_pages   for all to anon, authenticated using (true) with check (true);

-- Horloge serveur (calibration du skew client).
create or replace function gartic_now() returns timestamptz
  language sql stable as $$ select now() $$;

-- Demarrage : assigne les sieges par ordre d'arrivee, fige n, ouvre la phase ecriture.
create or replace function gartic_start(p_room uuid, p_settings jsonb)
  returns void language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with ordered as (
    select id, row_number() over (order by joined_at) - 1 as rn
    from gartic_players where room_id = p_room
  )
  update gartic_players p set seat = o.rn from ordered o where p.id = o.id;
  select count(*) into n from gartic_players where room_id = p_room;
  update gartic_rooms set
    status = 'writing', current_round = 0, current_phase = 'writing',
    settings = p_settings || jsonb_build_object('n', n),
    phase_ends_at = now() + (coalesce((p_settings->'phaseDurations'->>'writing')::int, 60) || ' seconds')::interval,
    updated_at = now()
  where id = p_room;
end $$;

-- Transition de phase (horloge serveur). drawing aux rounds impairs, describing aux pairs.
create or replace function gartic_advance(p_room uuid)
  returns void language plpgsql security definer set search_path = public as $$
declare r gartic_rooms; n int; nextr int; ph text; dur int;
begin
  select * into r from gartic_rooms where id = p_room;
  n := (r.settings->>'n')::int;
  nextr := r.current_round + 1;
  if n is null or nextr >= n then
    update gartic_rooms set status = 'reveal', current_phase = 'reveal',
      phase_ends_at = null, updated_at = now() where id = p_room;
    return;
  end if;
  ph := case when nextr % 2 = 1 then 'drawing' else 'describing' end;
  dur := coalesce((r.settings->'phaseDurations'->>ph)::int, 60);
  update gartic_rooms set status = ph, current_phase = ph, current_round = nextr,
    phase_ends_at = now() + (dur || ' seconds')::interval, updated_at = now()
  where id = p_room;
end $$;

-- Lecture advisoire : le carnet que p_user doit voir au round p_round (anti-spoil cote client honnete).
create or replace function gartic_my_book(p_room uuid, p_user text, p_round int)
  returns int language plpgsql stable security definer set search_path = public as $$
declare s int; n int;
begin
  select seat into s from gartic_players where room_id = p_room and user_id = p_user;
  select (settings->>'n')::int into n from gartic_rooms where id = p_room;
  if s is null or n is null or n = 0 then return null; end if;
  return ((s - p_round) % n + n) % n;
end $$;

grant execute on function gartic_now(), gartic_start(uuid, jsonb), gartic_advance(uuid),
  gartic_my_book(uuid, text, int) to anon, authenticated;
