-- Berry Shop Brams Community
-- A appliquer dans Supabase SQL Editor.
-- Le solde reste celui du bot Discord: public.users.uid + users.data->>'berrys'.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  price bigint NOT NULL CHECK (price > 0),
  rarity text NOT NULL CHECK (rarity IN ('Commun', 'Rare', 'Epique', 'Legendaire', 'Mythique')),
  stock integer CHECK (stock IS NULL OR stock >= 0),
  limited boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  reward_type text NOT NULL,
  reward_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shop_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id text NOT NULL,
  item_id uuid REFERENCES public.shop_items(id),
  price bigint NOT NULL CHECK (price >= 0),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  idempotency_key text UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id text NOT NULL,
  item_id uuid REFERENCES public.shop_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  equipped boolean NOT NULL DEFAULT false,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(discord_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.shop_admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  action text NOT NULL,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.current_discord_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    auth.jwt()->'user_metadata'->>'provider_id',
    auth.jwt()->'user_metadata'->>'sub',
    auth.jwt()->'user_metadata'->'custom_claims'->>'provider_id'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_shop_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(auth.jwt()->'user_metadata'->>'role', auth.jwt()->'app_metadata'->>'role', '') = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.touch_shop_item_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shop_items_touch_updated_at ON public.shop_items;
CREATE TRIGGER shop_items_touch_updated_at
BEFORE UPDATE ON public.shop_items
FOR EACH ROW EXECUTE FUNCTION public.touch_shop_item_updated_at();

CREATE OR REPLACE FUNCTION public.get_berry_balance()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discord_id text;
  v_balance bigint;
BEGIN
  v_discord_id := public.current_discord_id();
  IF v_discord_id IS NULL THEN
    RAISE EXCEPTION 'Discord OAuth requis.';
  END IF;

  SELECT coalesce((u.data->>'berrys')::bigint, 0)
  INTO v_balance
  FROM public.users u
  WHERE u.uid = v_discord_id;

  RETURN coalesce(v_balance, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_shop_item(p_item_id uuid, p_idempotency_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discord_id text;
  v_item public.shop_items%ROWTYPE;
  v_balance bigint;
  v_new_balance bigint;
  v_tx_id uuid;
BEGIN
  v_discord_id := public.current_discord_id();
  IF v_discord_id IS NULL THEN
    RAISE EXCEPTION 'Connexion Discord requise.';
  END IF;

  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 12 THEN
    RAISE EXCEPTION 'Cle idempotence invalide.';
  END IF;

  SELECT *
  INTO v_item
  FROM public.shop_items
  WHERE id = p_item_id AND active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item indisponible.';
  END IF;

  IF v_item.stock IS NOT NULL AND v_item.stock <= 0 THEN
    RAISE EXCEPTION 'Stock epuise.';
  END IF;

  SELECT coalesce((u.data->>'berrys')::bigint, 0)
  INTO v_balance
  FROM public.users u
  WHERE u.uid = v_discord_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Membre Discord introuvable dans la base bot.';
  END IF;

  IF v_balance < v_item.price THEN
    INSERT INTO public.shop_transactions(discord_id, item_id, price, status, idempotency_key, metadata)
    VALUES (v_discord_id, v_item.id, v_item.price, 'failed', p_idempotency_key, jsonb_build_object('reason', 'insufficient_balance', 'balance', v_balance));
    RETURN jsonb_build_object('ok', false, 'error', 'Solde Berry insuffisant.', 'balance', v_balance);
  END IF;

  v_new_balance := v_balance - v_item.price;

  UPDATE public.users
  SET data = jsonb_set(coalesce(data, '{}'::jsonb), '{berrys}', to_jsonb(v_new_balance), true)
  WHERE uid = v_discord_id;

  IF v_item.stock IS NOT NULL THEN
    UPDATE public.shop_items SET stock = stock - 1 WHERE id = v_item.id;
  END IF;

  INSERT INTO public.shop_transactions(discord_id, item_id, price, status, idempotency_key, metadata)
  VALUES (
    v_discord_id,
    v_item.id,
    v_item.price,
    'completed',
    p_idempotency_key,
    jsonb_build_object('reward_type', v_item.reward_type, 'reward_data', v_item.reward_data, 'balance_before', v_balance, 'balance_after', v_new_balance)
  )
  RETURNING id INTO v_tx_id;

  INSERT INTO public.user_inventory(discord_id, item_id, quantity, equipped)
  VALUES (v_discord_id, v_item.id, 1, false)
  ON CONFLICT (discord_id, item_id)
  DO UPDATE SET quantity = public.user_inventory.quantity + 1;

  RETURN jsonb_build_object(
    'ok', true,
    'transactionId', v_tx_id,
    'balance', v_new_balance,
    'rewardType', v_item.reward_type,
    'rewardData', v_item.reward_data
  );
END;
$$;

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_admin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shop_items_read_active ON public.shop_items;
CREATE POLICY shop_items_read_active ON public.shop_items
FOR SELECT USING (active = true OR public.is_shop_admin());

DROP POLICY IF EXISTS shop_items_admin_all ON public.shop_items;
CREATE POLICY shop_items_admin_all ON public.shop_items
FOR ALL TO authenticated USING (public.is_shop_admin()) WITH CHECK (public.is_shop_admin());

DROP POLICY IF EXISTS shop_transactions_read_own ON public.shop_transactions;
CREATE POLICY shop_transactions_read_own ON public.shop_transactions
FOR SELECT TO authenticated USING (discord_id = public.current_discord_id() OR public.is_shop_admin());

DROP POLICY IF EXISTS user_inventory_read_own ON public.user_inventory;
CREATE POLICY user_inventory_read_own ON public.user_inventory
FOR SELECT TO authenticated USING (discord_id = public.current_discord_id() OR public.is_shop_admin());

DROP POLICY IF EXISTS shop_admin_logs_read_admin ON public.shop_admin_logs;
CREATE POLICY shop_admin_logs_read_admin ON public.shop_admin_logs
FOR SELECT TO authenticated USING (public.is_shop_admin());

REVOKE ALL ON FUNCTION public.purchase_shop_item(uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.get_berry_balance() FROM public;
GRANT EXECUTE ON FUNCTION public.purchase_shop_item(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_berry_balance() TO authenticated;

INSERT INTO public.shop_items (name, description, category, price, rarity, stock, limited, active, reward_type, reward_data)
VALUES
  ('Titre: Pirate Prime', 'Titre premium visible sur ton profil Brams.', 'Cosmetique', 1200, 'Rare', NULL, false, true, 'profile_title', '{"title":"Pirate Prime"}'),
  ('Role Discord: Corsaire VIP', 'Role Discord a appliquer par le bot apres transaction.', 'Roles Discord', 3500, 'Epique', 12, true, true, 'discord_role', '{"roleName":"Corsaire VIP","requiresBotWorker":true}'),
  ('Coffre Mystere Grand Line', 'Coffre aleatoire: badge, titre, boost ou item rare.', 'Coffres', 900, 'Legendaire', NULL, false, true, 'mystery_chest', '{"pool":"grand_line"}'),
  ('Badge: Haki des Rois', 'Badge mythique affiche sur le profil.', 'Badges', 5000, 'Mythique', 5, true, true, 'profile_badge', '{"badge":"conqueror_haki"}'),
  ('Boost Equipage 24h', 'Boost temporaire pour ton equipage.', 'Boosts', 2200, 'Epique', NULL, false, true, 'crew_boost', '{"durationHours":24,"multiplier":1.15}')
ON CONFLICT DO NOTHING;
