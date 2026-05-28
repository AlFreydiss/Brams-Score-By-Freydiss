-- ═══════════════════════════════════════════════════════════════
--  FIX : résolution discord_id + RLS boutique (fond op / berry pas co)
--  Idempotent — sûr à relancer. Corrige aussi le cas "migration shop
--  jamais exécutée" si 20260528_shop_berry_sync.sql n'a pas tourné.
--  ───────────────────────────────────────────────────────────────
--  Bugs corrigés :
--   1. _resolve_discord_id() : la ligne custom_claims utilisait une
--      syntaxe JSON fausse (->>'custom_claims.provider_id') qui ne
--      matchait jamais. Corrigée en ->'custom_claims'->>'provider_id'.
--      + fallback supplémentaire sur identities.provider_id.
--   2. RLS user_inventory : lecture directe bloquée car la policy
--      n'utilisait que provider_id des metadata, sans fallback
--      identities. On la fait passer par _resolve_discord_id().
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Résolution robuste du discord_id ───────────────────────────────────────
CREATE OR REPLACE FUNCTION _resolve_discord_id()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_discord_id text;
BEGIN
  SELECT COALESCE(
    raw_user_meta_data->>'provider_id',
    raw_user_meta_data->'custom_claims'->>'provider_id',   -- FIX syntaxe JSON
    (SELECT identity_data->>'provider_id' FROM auth.identities
       WHERE user_id = auth.uid() AND provider = 'discord' LIMIT 1),
    (SELECT identity_data->>'sub' FROM auth.identities
       WHERE user_id = auth.uid() AND provider = 'discord' LIMIT 1)
  ) INTO v_discord_id
  FROM auth.users WHERE id = auth.uid();
  RETURN v_discord_id;
END;
$$;

-- ── 2. RLS user_inventory : lecture de son propre inventaire ──────────────────
-- On recrée la policy pour qu'elle utilise _resolve_discord_id() (avec fallback
-- identities) au lieu d'un accès direct aux metadata (qui ratait les comptes
-- dont le provider_id n'est que dans identities).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_inventory' AND policyname='user_inventory_own') THEN
    DROP POLICY user_inventory_own ON user_inventory;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_inventory') THEN
    CREATE POLICY user_inventory_own ON user_inventory FOR SELECT
      USING (discord_id = _resolve_discord_id());
  END IF;
END $$;

-- ── 3. Diagnostic : RPC pour vérifier la résolution côté client ───────────────
-- Permet de débugger "berry pas co" : renvoie le discord_id résolu + le solde.
CREATE OR REPLACE FUNCTION debug_my_identity()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_discord_id text;
  v_balance    bigint;
  v_user_found boolean;
BEGIN
  v_discord_id := _resolve_discord_id();
  SELECT EXISTS(SELECT 1 FROM users WHERE uid = v_discord_id) INTO v_user_found;
  SELECT COALESCE((data->>'berrys')::bigint, 0) INTO v_balance
  FROM users WHERE uid = v_discord_id;
  RETURN jsonb_build_object(
    'discord_id',  v_discord_id,
    'user_found',  v_user_found,
    'balance',     COALESCE(v_balance, 0),
    'auth_uid',    auth.uid()
  );
END;
$$;
