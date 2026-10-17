-- Tournois en duels (/tournoi/<path>) : chaque duel joué alimente les stats
-- du site (versus_duels). On ouvre versus_record aux sept tournois.
-- versus_stats et versus_pair lisent déjà n'importe quel tournoi.

create or replace function public.versus_record(p_tournament text, p_winner text, p_loser text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_tournament not in (
    'bleach-bankai', 'manga-panels', 'anime-ost',
    'anime-openings', 'anime-endings', 'rap-fr', 'rap-vs-ost'
  ) then return; end if;
  if p_winner is null or p_loser is null or p_winner = p_loser then return; end if;
  if length(p_winner) > 80 or length(p_loser) > 80 then return; end if;
  if p_winner !~ '^[a-z0-9-]+$' or p_loser !~ '^[a-z0-9-]+$' then return; end if;
  insert into public.versus_duels (tournament, winner, loser) values (p_tournament, p_winner, p_loser);
end;
$$;

grant execute on function public.versus_record(text, text, text) to anon, authenticated;

-- versus_pair filtre sur (tournament, winner, loser) : index pour que la
-- répartition d'un duel reste instantanée quand la table grossit.
create index if not exists versus_duels_pair_idx on public.versus_duels (tournament, winner, loser);
