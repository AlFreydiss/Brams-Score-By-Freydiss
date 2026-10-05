-- Tournois en images (/tournoi/bankai, /tournoi/panels) : chaque duel joué est
-- enregistré pour calculer un taux de victoire communautaire par participant.
-- Lecture et écriture uniquement via les deux fonctions SECURITY DEFINER.

create table if not exists public.versus_duels (
  id          bigserial primary key,
  tournament  text not null,
  winner      text not null,
  loser       text not null,
  created_at  timestamptz not null default now()
);

create index if not exists versus_duels_tournament_idx on public.versus_duels (tournament);

alter table public.versus_duels enable row level security;
-- aucune policy : pas d'accès direct à la table depuis le client

create or replace function public.versus_record(p_tournament text, p_winner text, p_loser text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_tournament not in ('bleach-bankai', 'manga-panels') then return; end if;
  if p_winner is null or p_loser is null or p_winner = p_loser then return; end if;
  if length(p_winner) > 80 or length(p_loser) > 80 then return; end if;
  if p_winner !~ '^[a-z0-9-]+$' or p_loser !~ '^[a-z0-9-]+$' then return; end if;
  insert into public.versus_duels (tournament, winner, loser) values (p_tournament, p_winner, p_loser);
end;
$$;

create or replace function public.versus_stats(p_tournament text)
returns table (participant text, wins bigint, duels bigint)
language sql
stable
security definer
set search_path = public
as $$
  with d as (
    select winner as participant, 1 as win from public.versus_duels where tournament = p_tournament
    union all
    select loser, 0 from public.versus_duels where tournament = p_tournament
  )
  select participant, sum(win)::bigint, count(*)::bigint from d group by participant;
$$;

grant execute on function public.versus_record(text, text, text) to anon, authenticated;
grant execute on function public.versus_stats(text) to anon, authenticated;
