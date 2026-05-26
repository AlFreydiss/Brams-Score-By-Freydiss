create table if not exists public.tier_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  owner_discord_id text,
  author_name text not null default 'Pirate Brams',
  author_avatar text,
  title text not null default 'Ma Tier List',
  emoji text default '📋',
  category text default 'Custom',
  type_id text,
  tier_count integer not null default 0,
  tier_labels jsonb not null default '[]'::jsonb,
  tier_colors jsonb not null default '[]'::jsonb,
  tiers jsonb not null default '[]'::jsonb,
  board jsonb not null default '{}'::jsonb,
  custom_items jsonb not null default '[]'::jsonb,
  favorites jsonb not null default '[]'::jsonb,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tier_list_likes (
  tier_list_id uuid not null references public.tier_lists(id) on delete cascade,
  voter_id text not null,
  created_at timestamptz not null default now(),
  primary key (tier_list_id, voter_id)
);

create index if not exists tier_lists_public_idx
  on public.tier_lists (published, visibility, updated_at desc);

create index if not exists tier_lists_owner_idx
  on public.tier_lists (owner_id, updated_at desc);

alter table public.tier_lists enable row level security;
alter table public.tier_list_likes enable row level security;

drop policy if exists "public tier lists are readable" on public.tier_lists;
create policy "public tier lists are readable"
  on public.tier_lists for select
  using (published = true and visibility = 'public');

drop policy if exists "public tier list likes are readable" on public.tier_list_likes;
create policy "public tier list likes are readable"
  on public.tier_list_likes for select
  using (true);
