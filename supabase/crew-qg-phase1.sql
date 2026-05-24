-- Crew QG Phase 1: read-only data model preparation.
-- Mutating actions must be added later as SECURITY DEFINER RPCs with
-- server-side permission checks and crew_logs writes.

create extension if not exists "pgcrypto";

create or replace function public.current_discord_id()
returns text
language sql
stable
as $$
  select coalesce(
    auth.jwt()->'app_metadata'->>'discord_id',
    auth.jwt()->'app_metadata'->>'provider_id',
    auth.jwt()->'user_metadata'->>'provider_id',
    auth.jwt()->'user_metadata'->>'discord_id',
    auth.jwt()->'user_metadata'->>'sub',
    auth.jwt()->'user_metadata'->'custom_claims'->>'provider_id'
  )
$$;

create table if not exists public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  tag text,
  description text,
  motto text,
  emblem_url text,
  banner_url text,
  primary_color text,
  public_roster boolean not null default true,
  status text not null default 'active',
  level integer not null default 1 check (level >= 1),
  xp integer not null default 0 check (xp >= 0),
  reputation integer not null default 0,
  total_bounty bigint not null default 0 check (total_bounty >= 0),
  recruitment_open boolean not null default true,
  recruitment_message text,
  captain_id text,
  is_recruiting boolean generated always as (recruitment_open) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crew_members (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  user_id text not null,
  username text,
  avatar_url text,
  role text not null default 'member',
  custom_title text,
  bounty bigint not null default 0 check (bounty >= 0),
  contribution bigint not null default 0 check (contribution >= 0),
  joined_at timestamptz not null default now(),
  status text not null default 'active',
  is_elite boolean not null default false,
  probation_until timestamptz,
  created_at timestamptz not null default now(),
  unique (crew_id, user_id)
);

create table if not exists public.crew_applications (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  user_id text not null,
  message text not null,
  availability text,
  specialty text,
  status text not null default 'pending',
  internal_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.crew_invites (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  invited_user_id text not null,
  invited_by text not null,
  status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create table if not exists public.crew_logs (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  actor_id text,
  target_id text,
  type text not null,
  metadata jsonb not null default '{}'::jsonb,
  visibility text not null default 'members',
  created_at timestamptz not null default now()
);

create table if not exists public.crew_treasury_transactions (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  user_id text not null,
  type text not null,
  amount bigint not null check (amount > 0),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.crew_missions (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  title text not null,
  description text,
  type text not null default 'weekly',
  progress integer not null default 0 check (progress >= 0),
  target integer not null default 1 check (target > 0),
  reward bigint not null default 0 check (reward >= 0),
  status text not null default 'active',
  deadline timestamptz,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.crew_diplomacy (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  target_crew_id uuid references public.crews(id) on delete cascade,
  type text not null,
  status text not null default 'pending',
  note text,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.crew_territories (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid references public.crews(id) on delete set null,
  territory_key text not null unique,
  status text not null default 'neutral',
  controlled_since timestamptz,
  bonus text,
  name text,
  x numeric check (x >= 0 and x <= 100),
  y numeric check (y >= 0 and y <= 100),
  created_at timestamptz not null default now()
);

create table if not exists public.crew_announcements (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  author_id text not null,
  title text not null,
  content text not null,
  priority text not null default 'info',
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.crew_events (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  created_by text,
  created_at timestamptz not null default now()
);

alter table public.crews add column if not exists slug text;
alter table public.crews add column if not exists tag text;
alter table public.crews add column if not exists description text;
alter table public.crews add column if not exists motto text;
alter table public.crews add column if not exists emblem_url text;
alter table public.crews add column if not exists banner_url text;
alter table public.crews add column if not exists primary_color text;
alter table public.crews add column if not exists public_roster boolean not null default true;
alter table public.crews add column if not exists status text not null default 'active';
alter table public.crews add column if not exists level integer not null default 1;
alter table public.crews add column if not exists xp integer not null default 0;
alter table public.crews add column if not exists reputation integer not null default 0;
alter table public.crews add column if not exists total_bounty bigint not null default 0;
alter table public.crews add column if not exists recruitment_open boolean not null default true;
alter table public.crews add column if not exists recruitment_message text;
alter table public.crews add column if not exists captain_id text;
alter table public.crews add column if not exists created_at timestamptz not null default now();
alter table public.crews add column if not exists updated_at timestamptz not null default now();

alter table public.crew_members add column if not exists username text;
alter table public.crew_members add column if not exists avatar_url text;
alter table public.crew_members add column if not exists role text not null default 'member';
alter table public.crew_members add column if not exists custom_title text;
alter table public.crew_members add column if not exists bounty bigint not null default 0;
alter table public.crew_members add column if not exists contribution bigint not null default 0;
alter table public.crew_members add column if not exists joined_at timestamptz not null default now();
alter table public.crew_members add column if not exists status text not null default 'active';
alter table public.crew_members add column if not exists is_elite boolean not null default false;
alter table public.crew_members add column if not exists probation_until timestamptz;
alter table public.crew_members add column if not exists created_at timestamptz not null default now();
alter table public.crew_territories add column if not exists name text;
alter table public.crew_territories add column if not exists x numeric;
alter table public.crew_territories add column if not exists y numeric;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'crews_slug_unique') then
    alter table public.crews add constraint crews_slug_unique unique (slug);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'crews_level_positive') then
    alter table public.crews add constraint crews_level_positive check (level >= 1);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'crews_xp_non_negative') then
    alter table public.crews add constraint crews_xp_non_negative check (xp >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'crews_total_bounty_non_negative') then
    alter table public.crews add constraint crews_total_bounty_non_negative check (total_bounty >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'crew_members_crew_user_unique') then
    alter table public.crew_members add constraint crew_members_crew_user_unique unique (crew_id, user_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'crew_members_bounty_non_negative') then
    alter table public.crew_members add constraint crew_members_bounty_non_negative check (bounty >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'crew_members_contribution_non_negative') then
    alter table public.crew_members add constraint crew_members_contribution_non_negative check (contribution >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'crew_territories_position_bounds') then
    alter table public.crew_territories add constraint crew_territories_position_bounds check ((x is null or (x >= 0 and x <= 100)) and (y is null or (y >= 0 and y <= 100)));
  end if;
end $$;

create index if not exists idx_crew_members_crew on public.crew_members(crew_id);
create index if not exists idx_crew_members_user on public.crew_members(user_id);
create index if not exists idx_crew_logs_crew_created on public.crew_logs(crew_id, created_at desc);
create index if not exists idx_crew_applications_crew_status on public.crew_applications(crew_id, status);
create index if not exists idx_crew_invites_user_status on public.crew_invites(invited_user_id, status);
create index if not exists idx_crew_treasury_crew_created on public.crew_treasury_transactions(crew_id, created_at desc);

alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.crew_applications enable row level security;
alter table public.crew_invites enable row level security;
alter table public.crew_logs enable row level security;
alter table public.crew_treasury_transactions enable row level security;
alter table public.crew_missions enable row level security;
alter table public.crew_diplomacy enable row level security;
alter table public.crew_territories enable row level security;
alter table public.crew_announcements enable row level security;
alter table public.crew_events enable row level security;

create or replace function public.is_crew_member(target_crew_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.crew_members cm
    where cm.crew_id = target_crew_id
      and cm.user_id = public.current_discord_id()
      and cm.status = 'active'
  )
$$;

create or replace function public.is_crew_staff(target_crew_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.crew_members cm
    where cm.crew_id = target_crew_id
      and cm.user_id = public.current_discord_id()
      and cm.status = 'active'
      and cm.role in ('captain', 'vice_captain', 'officer', 'recruiter', 'treasurer', 'diplomat')
  )
$$;

drop policy if exists "crews public read" on public.crews;
create policy "crews public read"
on public.crews for select
using (true);

drop policy if exists "crew members public roster read" on public.crew_members;
create policy "crew members public roster read"
on public.crew_members for select
using (status = 'active' and public.is_crew_member(crew_id));

drop policy if exists "crew missions member read" on public.crew_missions;
create policy "crew missions member read"
on public.crew_missions for select
using (public.is_crew_member(crew_id));

drop policy if exists "crew announcements member read" on public.crew_announcements;
create policy "crew announcements member read"
on public.crew_announcements for select
using (public.is_crew_member(crew_id));

drop policy if exists "crew events member read" on public.crew_events;
create policy "crew events member read"
on public.crew_events for select
using (public.is_crew_member(crew_id));

drop policy if exists "crew territories public read" on public.crew_territories;
create policy "crew territories public read"
on public.crew_territories for select
using (true);

drop policy if exists "crew diplomacy member read" on public.crew_diplomacy;
create policy "crew diplomacy member read"
on public.crew_diplomacy for select
using (public.is_crew_member(crew_id));

drop policy if exists "crew logs member scoped read" on public.crew_logs;
create policy "crew logs member scoped read"
on public.crew_logs for select
using (
  visibility = 'public'
  or (visibility = 'members' and public.is_crew_member(crew_id))
  or (visibility = 'staff' and public.is_crew_staff(crew_id))
);

drop policy if exists "crew applications staff read" on public.crew_applications;
create policy "crew applications staff read"
on public.crew_applications for select
using (
  user_id = public.current_discord_id()
  or public.is_crew_staff(crew_id)
);

drop policy if exists "crew invites participant read" on public.crew_invites;
create policy "crew invites participant read"
on public.crew_invites for select
using (
  invited_user_id = public.current_discord_id()
  or public.is_crew_staff(crew_id)
);

drop policy if exists "crew treasury staff read" on public.crew_treasury_transactions;
create policy "crew treasury staff read"
on public.crew_treasury_transactions for select
using (public.is_crew_staff(crew_id));
