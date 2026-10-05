-- Duel du jour des tournois en images : répartition des votes sur une paire précise.
-- Dépend de 20261005_versus_duels.sql.

create or replace function public.versus_pair(p_tournament text, p_a text, p_b text)
returns table (a_wins bigint, b_wins bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where winner = p_a and loser = p_b)::bigint,
    count(*) filter (where winner = p_b and loser = p_a)::bigint
  from public.versus_duels
  where tournament = p_tournament
    and ((winner = p_a and loser = p_b) or (winner = p_b and loser = p_a));
$$;

grant execute on function public.versus_pair(text, text, text) to anon, authenticated;
