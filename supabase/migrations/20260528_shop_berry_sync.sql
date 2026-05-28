-- ═══════════════════════════════════════════════════════════════
--  Boutique Berry + Sync bot Discord
--  Tables : shop_items, user_inventory, shop_transactions, berry_sync
--  RPCs   : get_berry_balance, purchase_shop_item, equip_shop_item
-- ═══════════════════════════════════════════════════════════════

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shop_items (
  id           text PRIMARY KEY,
  name         text        NOT NULL,
  description  text        NOT NULL DEFAULT '',
  category     text        NOT NULL DEFAULT 'Autre',
  price        integer     NOT NULL DEFAULT 0,
  rarity       text        NOT NULL DEFAULT 'Commun',
  stock        integer,                       -- NULL = illimité
  limited      boolean     NOT NULL DEFAULT false,
  active       boolean     NOT NULL DEFAULT true,
  reward_type  text        NOT NULL DEFAULT 'other',
  reward_data  jsonb       NOT NULL DEFAULT '{}',
  image_url    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_inventory (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id   text        NOT NULL,
  item_id      text        NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  quantity     integer     NOT NULL DEFAULT 1,
  equipped     boolean     NOT NULL DEFAULT false,
  acquired_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(discord_id, item_id)
);

CREATE TABLE IF NOT EXISTS shop_transactions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id   text        NOT NULL,
  item_id      text        REFERENCES shop_items(id) ON DELETE SET NULL,
  price        integer     NOT NULL,
  status       text        NOT NULL DEFAULT 'completed',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- berry_sync : file de déductions à appliquer dans le bot Discord
-- Le bot poll cette table avant chaque flush et applique les déductions
CREATE TABLE IF NOT EXISTS berry_sync (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id   text        NOT NULL,
  deduction    bigint      NOT NULL,
  applied      boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS berry_sync_pending_idx ON berry_sync(discord_id, applied) WHERE applied = false;
CREATE INDEX IF NOT EXISTS user_inventory_discord_idx ON user_inventory(discord_id);

-- ── RLS (sécurité côté client) ─────────────────────────────────────────────

ALTER TABLE shop_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory     ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE berry_sync         ENABLE ROW LEVEL SECURITY;

-- shop_items : lecture publique, écriture via service role seulement
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='shop_items' AND policyname='shop_items_public_read') THEN
    CREATE POLICY shop_items_public_read ON shop_items FOR SELECT USING (true);
  END IF;
END $$;

-- user_inventory / shop_transactions : lecture via fonctions SECURITY DEFINER
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_inventory' AND policyname='user_inventory_own') THEN
    CREATE POLICY user_inventory_own ON user_inventory FOR SELECT
      USING (discord_id = (SELECT raw_user_meta_data->>'provider_id' FROM auth.users WHERE id = auth.uid()));
  END IF;
END $$;

-- ── Fonction helpers ─────────────────────────────────────────────────────────

-- Résoudre le discord_id depuis l'auth Supabase
CREATE OR REPLACE FUNCTION _resolve_discord_id()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_discord_id text;
BEGIN
  SELECT COALESCE(
    raw_user_meta_data->>'provider_id',
    raw_user_meta_data->>'custom_claims.provider_id',
    (SELECT identity_data->>'sub' FROM auth.identities WHERE user_id = auth.uid() AND provider = 'discord' LIMIT 1)
  ) INTO v_discord_id
  FROM auth.users WHERE id = auth.uid();
  RETURN v_discord_id;
END;
$$;

-- ── get_berry_balance : lit dans users.data (géré par le bot) ─────────────────

CREATE OR REPLACE FUNCTION get_berry_balance()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_discord_id text;
  v_balance    bigint;
BEGIN
  v_discord_id := _resolve_discord_id();
  IF v_discord_id IS NULL THEN RETURN 0; END IF;
  SELECT COALESCE((data->>'berrys')::bigint, 0) INTO v_balance
  FROM users WHERE uid = v_discord_id;
  RETURN COALESCE(v_balance, 0);
END;
$$;

-- ── purchase_shop_item : achat atomique ───────────────────────────────────────

CREATE OR REPLACE FUNCTION purchase_shop_item(
  p_item_id         text,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_discord_id  text;
  v_balance     bigint;
  v_item        shop_items%ROWTYPE;
  v_new_balance bigint;
BEGIN
  v_discord_id := _resolve_discord_id();
  IF v_discord_id IS NULL THEN
    RETURN '{"ok":false,"error":"Non authentifié — connecte-toi avec Discord"}'::jsonb;
  END IF;

  -- Anti-double achat (fenêtre 5 min)
  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM shop_transactions
    WHERE discord_id = v_discord_id AND item_id = p_item_id
      AND created_at > now() - interval '5 minutes'
  ) THEN
    RETURN '{"ok":false,"error":"Achat déjà effectué récemment, attends quelques minutes"}'::jsonb;
  END IF;

  -- Récupérer l'article
  SELECT * INTO v_item FROM shop_items WHERE id = p_item_id AND active = true;
  IF NOT FOUND THEN
    RETURN '{"ok":false,"error":"Article introuvable ou indisponible"}'::jsonb;
  END IF;

  -- Vérifier le stock
  IF v_item.stock IS NOT NULL AND v_item.stock <= 0 THEN
    RETURN '{"ok":false,"error":"Stock épuisé"}'::jsonb;
  END IF;

  -- Vérifier si déjà possédé (pour les fonds, un seul suffit)
  IF EXISTS (SELECT 1 FROM user_inventory WHERE discord_id = v_discord_id AND item_id = p_item_id) THEN
    RETURN '{"ok":false,"error":"Tu possèdes déjà cet article"}'::jsonb;
  END IF;

  -- Lire le solde depuis la table du bot
  SELECT COALESCE((data->>'berrys')::bigint, 0) INTO v_balance
  FROM users WHERE uid = v_discord_id;

  IF v_balance IS NULL THEN
    RETURN '{"ok":false,"error":"Compte introuvable — utilise le bot Discord d''abord"}'::jsonb;
  END IF;

  IF v_balance < v_item.price THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', format('Solde insuffisant — il te faut %s ฿, tu en as %s ฿', v_item.price, v_balance)
    );
  END IF;

  v_new_balance := v_balance - v_item.price;

  -- Déduire les berries dans la table du bot
  UPDATE users
  SET data = jsonb_set(data, '{berrys}', to_jsonb(v_new_balance))
  WHERE uid = v_discord_id;

  -- Décrémenter le stock si limité
  IF v_item.stock IS NOT NULL THEN
    UPDATE shop_items SET stock = stock - 1, updated_at = now() WHERE id = p_item_id;
  END IF;

  -- Ajouter à l'inventaire
  INSERT INTO user_inventory (discord_id, item_id, quantity, equipped)
  VALUES (v_discord_id, p_item_id, 1, false)
  ON CONFLICT (discord_id, item_id) DO UPDATE SET quantity = user_inventory.quantity + 1;

  -- Enregistrer la transaction
  INSERT INTO shop_transactions (discord_id, item_id, price, status)
  VALUES (v_discord_id, p_item_id, v_item.price, 'completed');

  -- File de sync pour le bot Discord (_CACHE sera mis à jour avant le prochain flush)
  INSERT INTO berry_sync (discord_id, deduction)
  VALUES (v_discord_id, v_item.price);

  RETURN jsonb_build_object('ok', true, 'balance', v_new_balance, 'item_id', p_item_id);
END;
$$;

-- ── equip_shop_item : équiper/déséquiper un fond d'opening ────────────────────

CREATE OR REPLACE FUNCTION equip_shop_item(p_item_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_discord_id  text;
  v_item        shop_items%ROWTYPE;
  v_was_equipped boolean;
BEGIN
  v_discord_id := _resolve_discord_id();
  IF v_discord_id IS NULL THEN
    RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb;
  END IF;

  -- Vérifier la possession
  IF NOT EXISTS (SELECT 1 FROM user_inventory WHERE discord_id = v_discord_id AND item_id = p_item_id) THEN
    RETURN '{"ok":false,"error":"Tu ne possèdes pas cet article"}'::jsonb;
  END IF;

  SELECT * INTO v_item FROM shop_items WHERE id = p_item_id;
  SELECT equipped INTO v_was_equipped FROM user_inventory
  WHERE discord_id = v_discord_id AND item_id = p_item_id;

  -- Fonds d'opening : déséquiper tous les autres fonds avant d'équiper
  IF v_item.reward_type = 'opening_background' THEN
    UPDATE user_inventory
    SET equipped = false
    WHERE discord_id = v_discord_id
      AND item_id IN (SELECT id FROM shop_items WHERE reward_type = 'opening_background');
  END IF;

  -- Toggle (si déjà équipé → déséquiper, sinon équiper)
  UPDATE user_inventory
  SET equipped = NOT v_was_equipped
  WHERE discord_id = v_discord_id AND item_id = p_item_id;

  RETURN jsonb_build_object('ok', true, 'equipped', NOT v_was_equipped);
END;
$$;

-- ── get_my_inventory : récupérer l'inventaire complet ─────────────────────────

CREATE OR REPLACE FUNCTION get_my_inventory()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_discord_id text;
  v_result     jsonb;
BEGIN
  v_discord_id := _resolve_discord_id();
  IF v_discord_id IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT jsonb_agg(row_to_json(r)) INTO v_result FROM (
    SELECT
      ui.item_id, ui.quantity, ui.equipped, ui.acquired_at,
      si.name, si.description, si.category, si.rarity,
      si.reward_type, si.reward_data, si.image_url
    FROM user_inventory ui
    JOIN shop_items si ON si.id = ui.item_id
    WHERE ui.discord_id = v_discord_id
    ORDER BY ui.acquired_at DESC
  ) r;
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ── Seed : fonds d'opening ────────────────────────────────────────────────────

INSERT INTO shop_items (id, name, description, category, price, rarity, stock, limited, active, reward_type, reward_data) VALUES
  ('bg-unravel',        'Fond : Unravel',                "Un fond sombre et fragmenté. Porté uniquement par les nakamas qui ont tout compris.",          'Fonds', 5000000, 'Secret',     NULL, false, true, 'opening_background', '{"opTitle":"Unravel","anime":"Tokyo Ghoul"}'),
  ('bg-the-rumbling',   'Fond : The Rumbling',           "La fin du monde en fond. Réservé aux rares qui ont tenu jusqu''au bout.",                      'Fonds', 6000000, 'Secret',     NULL, false, true, 'opening_background', '{"opTitle":"The Rumbling","anime":"Attack on Titan Final"}'),
  ('bg-gurenge',        'Fond : Gurenge',                "Flammes et lames. L''ouverture qui a lancé une ère nouvelle.",                                  'Fonds', 2500000, 'Mythique',   NULL, false, true, 'opening_background', '{"opTitle":"Gurenge","anime":"Demon Slayer"}'),
  ('bg-kaikai-kitan',   'Fond : Kaikai Kitan',           "Les malédictions comme décor. Une ambiance unique et redoutable.",                              'Fonds', 2500000, 'Mythique',   NULL, false, true, 'opening_background', '{"opTitle":"Kaikai Kitan","anime":"Jujutsu Kaisen"}'),
  ('bg-we-are',         'Fond : We Are!',                "Le grand voyage des nakamas. Fond culte pour les vrais fans de One Piece.",                     'Fonds', 1500000, 'Legendaire', NULL, false, true, 'opening_background', '{"opTitle":"We Are!","anime":"One Piece"}'),
  ('bg-again',          'Fond : Again',                  "Alchimie et métal. L''opening parfait d''une des meilleures séries de tous les temps.",         'Fonds', 1500000, 'Legendaire', NULL, false, true, 'opening_background', '{"opTitle":"Again","anime":"FMA: Brotherhood"}'),
  ('bg-cruel-angel',    "Fond : A Cruel Angel's Thesis", "L''opening mythique. Un morceau de légende pour un fond qui force le respect.",                 'Fonds', 1500000, 'Legendaire', NULL, false, true, 'opening_background', '{"opTitle":"A Cruel Angel''s Thesis","anime":"Neon Genesis Evangelion"}'),
  ('bg-hacking-gate',   'Fond : Hacking to the Gate',    "El Psy Kongroo. Pour les voyageurs du temps et les nostalgiques du future.",                   'Fonds', 1500000, 'Legendaire', NULL, false, true, 'opening_background', '{"opTitle":"Hacking to the Gate","anime":"Steins;Gate"}'),
  ('bg-blue-bird',      'Fond : Blue Bird',              "L''oiseau bleu de Sasuke. Nostalgie garantie pour chaque fan de Naruto.",                       'Fonds',  900000, 'Epique',     NULL, false, true, 'opening_background', '{"opTitle":"Blue Bird","anime":"Naruto"}'),
  ('bg-silhouette',     'Fond : Silhouette',             "La course vers un but. Silhouettes et ambiance chaude de Konoha.",                              'Fonds',  900000, 'Epique',     NULL, false, true, 'opening_background', '{"opTitle":"Silhouette","anime":"Naruto Shippuden"}'),
  ('bg-haruka-mirai',   'Fond : Haruka Mirai',           "L''énergie brute d''Asta. Pour ceux qui n''abandonnent jamais.",                               'Fonds',  900000, 'Epique',     NULL, false, true, 'opening_background', '{"opTitle":"Haruka Mirai","anime":"Black Clover"}'),
  ('bg-colors',         'Fond : Colors',                 "L''échiquier de Lelouch. Stratégie et trahison comme toile de fond.",                           'Fonds',  600000, 'Rare',       NULL, false, true, 'opening_background', '{"opTitle":"Colors","anime":"Code Geass"}'),
  ('bg-connect',        'Fond : Connect',                "L''illusion de la magie. Derrière la douceur, quelque chose de bien plus sombre.",              'Fonds',  600000, 'Rare',       NULL, false, true, 'opening_background', '{"opTitle":"Connect","anime":"Puella Magi Madoka Magica"}'),
  ('bg-99',             'Fond : 99',                     "100% — Une explosion d''énergie psychique comme ambiance.",                                     'Fonds',  600000, 'Rare',       NULL, false, true, 'opening_background', '{"opTitle":"99","anime":"Mob Psycho 100"}'),
  ('bg-tank',           'Fond : Tank!',                  "Jazz, espace et mélancolie. L''un des openings les plus cultes de l''histoire.",                'Fonds',  600000, 'Rare',       NULL, false, true, 'opening_background', '{"opTitle":"Tank!","anime":"Cowboy Bebop"}'),
  ('bg-crossing-field', 'Fond : crossing field',         "L''ouverture qui a lancé une génération. Simple, efficace, mémorable.",                         'Fonds',  400000, 'Commun',     NULL, false, true, 'opening_background', '{"opTitle":"crossing field","anime":"Sword Art Online"}')
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  price       = EXCLUDED.price,
  rarity      = EXCLUDED.rarity,
  active      = EXCLUDED.active,
  updated_at  = now();
