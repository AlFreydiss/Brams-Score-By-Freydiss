-- ═══════════════════════════════════════════════════════════════════════════
--  SHOP — Coffre Mystère (gacha)
--  open_mystery_box() : coûte un prix fixe, donne un fond d'opening ALÉATOIRE
--  (pondéré par rareté) que le joueur ne possède pas encore. Déduit + berry_sync.
--  Pré-requis : 20260528_shop_berry_sync.sql (shop_items, user_inventory,
--  shop_transactions, berry_sync, _resolve_discord_id).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION open_mystery_box()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_me   text := _resolve_discord_id();
  v_cost bigint := 1200000;        -- prix du coffre (ajustable)
  v_balance bigint;
  v_item shop_items%ROWTYPE;
  v_new  bigint;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié — connecte-toi avec Discord"}'::jsonb; END IF;

  SELECT COALESCE((data->>'berrys')::bigint, 0) INTO v_balance FROM users WHERE uid = v_me;
  IF v_balance IS NULL THEN RETURN '{"ok":false,"error":"Compte introuvable — utilise le bot Discord d''abord"}'::jsonb; END IF;
  IF v_balance < v_cost THEN
    RETURN jsonb_build_object('ok', false, 'error', format('Il te faut %s berries pour ouvrir un coffre (tu en as %s).', v_cost, v_balance));
  END IF;

  -- Tirage pondéré par rareté parmi les fonds NON possédés (commons fréquents, secrets rares).
  SELECT * INTO v_item FROM shop_items si
   WHERE si.reward_type = 'opening_background' AND si.active = true
     AND NOT EXISTS (SELECT 1 FROM user_inventory ui WHERE ui.discord_id = v_me AND ui.item_id = si.id)
   ORDER BY power(random(), 1.0 / (CASE si.rarity
       WHEN 'Commun' THEN 100 WHEN 'Rare' THEN 60 WHEN 'Epique' THEN 32
       WHEN 'Legendaire' THEN 16 WHEN 'Mythique' THEN 7 WHEN 'Secret' THEN 3 ELSE 20 END)) DESC
   LIMIT 1;

  IF v_item.id IS NULL THEN
    RETURN '{"ok":false,"error":"Tu possèdes déjà tous les fonds — collection complète ! 🏆"}'::jsonb;
  END IF;

  v_new := v_balance - v_cost;
  UPDATE users SET data = jsonb_set(data, '{berrys}', to_jsonb(v_new)) WHERE uid = v_me;
  INSERT INTO berry_sync (discord_id, deduction) VALUES (v_me, v_cost);
  INSERT INTO user_inventory (discord_id, item_id, quantity, equipped)
    VALUES (v_me, v_item.id, 1, false)
    ON CONFLICT (discord_id, item_id) DO UPDATE SET quantity = user_inventory.quantity + 1;
  INSERT INTO shop_transactions (discord_id, item_id, price, status)
    VALUES (v_me, v_item.id, v_cost, 'completed');

  RETURN jsonb_build_object('ok', true, 'balance', v_new, 'item', jsonb_build_object(
    'id', v_item.id, 'name', v_item.name, 'description', v_item.description,
    'category', v_item.category, 'rarity', v_item.rarity, 'price', v_item.price,
    'reward_type', v_item.reward_type));
END;
$$;
