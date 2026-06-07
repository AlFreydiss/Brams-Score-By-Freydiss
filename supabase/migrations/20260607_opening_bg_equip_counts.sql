-- ═══════════════════════════════════════════════════════════════════════════
--  Social proof boutique : combien de membres ont chaque fond ÉQUIPÉ
--  RPC publique (SECURITY DEFINER) → agrégat seul, aucune donnée perso exposée.
--  Renvoie { "<item_id>": <nb de membres distincts>, ... }.
--  Le flag `equipped` n'est utilisé que par les fonds d'opening (equip_shop_item),
--  donc on compte directement sur user_inventory sans dépendre de shop_items.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_opening_bg_equip_counts()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(jsonb_object_agg(item_id, cnt), '{}'::jsonb)
  FROM (
    SELECT item_id, count(DISTINCT discord_id)::int AS cnt
    FROM user_inventory
    WHERE equipped = true
    GROUP BY item_id
  ) t;
$$;

GRANT EXECUTE ON FUNCTION get_opening_bg_equip_counts() TO anon, authenticated;

-- Après avoir exécuté ce fichier dans l'éditeur SQL Supabase, la boutique
-- affichera « Équipé par X membres » sur le hero et les cartes (dégradé propre
-- si la RPC n'existe pas encore : aucun compteur, aucun crash).
