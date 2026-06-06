-- Fond d'opening équipé visible publiquement sur le profil de N'IMPORTE QUEL membre.
--
-- Problème : la RLS de user_inventory ne laisse lire QUE ses propres lignes. Du coup,
-- en visitant le profil d'un autre membre, le visiteur ne peut pas lire l'inventaire
-- de la cible → le fond payé/équipé par la personne ne s'affiche pas pour les autres.
--
-- Solution : un RPC SECURITY DEFINER qui contourne la RLS et renvoie UNIQUEMENT
-- l'identifiant du fond d'opening équipé (rien d'autre de l'inventaire n'est exposé).
-- Les fonds d'opening ont tous un item_id préfixé 'bg-' (cf. data/opening-backgrounds.js),
-- donc pas besoin de jointure sur shop_items (qui peut être synthétique côté client).

create or replace function public.get_member_opening_bg(p_discord_id text)
returns text
language sql
security definer
set search_path = public
as $$
  select item_id
  from user_inventory
  where discord_id = p_discord_id
    and equipped = true
    and item_id like 'bg-%'
  order by acquired_at desc
  limit 1
$$;

grant execute on function public.get_member_opening_bg(text) to anon, authenticated;
