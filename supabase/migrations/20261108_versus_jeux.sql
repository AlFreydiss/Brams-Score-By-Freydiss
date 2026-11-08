-- Tournoi des OST de jeux vidéo (2026-11-08) : nouvel identifiant de stats
-- « video-game-ost » ajouté à la liste autorisée de versus_record. Le reste de
-- la fonction (empreinte IP, plafonds) est inchangé : même corps que
-- 20261026_versus_rate_limit.sql. À coller dans l'éditeur SQL de Supabase.

create or replace function public.versus_record(p_tournament text, p_winner text, p_loser text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  h json := coalesce(current_setting('request.headers', true), '{}')::json;
  ip text := coalesce(
    nullif(h->>'cf-connecting-ip', ''),
    nullif(trim(split_part(coalesce(h->>'x-forwarded-for', ''), ',', 1)), ''),
    nullif(h->>'x-real-ip', '')
  );
  ih text := case when ip is null then null else md5('versus:' || ip) end;
begin
  if p_tournament not in (
    'bleach-bankai', 'manga-panels', 'anime-ost',
    'anime-openings', 'anime-endings', 'rap-fr', 'rap-vs-ost',
    'video-game-ost'
  ) then return; end if;
  if p_winner is null or p_loser is null or p_winner = p_loser then return; end if;
  if length(p_winner) > 80 or length(p_loser) > 80 then return; end if;
  if p_winner !~ '^[a-z0-9-]+$' or p_loser !~ '^[a-z0-9-]+$' then return; end if;

  if ih is not null then
    if (select count(*) from public.versus_duels
        where ip_hash = ih and created_at > now() - interval '1 minute') >= 40 then return; end if;
    if (select count(*) from public.versus_duels
        where ip_hash = ih and created_at > now() - interval '1 day') >= 2000 then return; end if;
    if exists (select 1 from public.versus_duels
        where ip_hash = ih and tournament = p_tournament and winner = p_winner and loser = p_loser
          and created_at > now() - interval '2 minutes') then return; end if;
  end if;

  insert into public.versus_duels (tournament, winner, loser, ip_hash)
  values (p_tournament, p_winner, p_loser, ih);
end;
$$;

grant execute on function public.versus_record(text, text, text) to anon, authenticated;
