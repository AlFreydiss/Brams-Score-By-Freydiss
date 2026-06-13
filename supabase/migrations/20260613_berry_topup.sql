-- ── Recharge de Berrys en euros (top-up) ─────────────────────────────────────
-- La monnaie vit dans users.data.berrys (source PARTAGÉE bot Discord ⇄ site, modifiée
-- atomiquement des deux côtés ; le bot préserve berrys à chaque flush et resync via
-- berry_sync). On crédite donc users.data.berrys ici, en toute sécurité.
--
-- credit_berries_topup : crédit ATOMIQUE + IDEMPOTENT.
--   • Idempotence : 1 ligne par session Stripe (berry_topups.stripe_session = PK).
--     stripe-complete (retour navigateur) ET stripe-webhook appellent la fonction avec
--     la MÊME session → un seul crédit grâce au ON CONFLICT DO NOTHING.
--   • Notifie le bot via berry_sync (deduction négative = crédit ; le bot ignore la
--     valeur et relit users.data.berrys → aucun risque de double-comptage).
-- Pré-requis : table users(uid,data) + table berry_sync (20260528_shop_berry_sync.sql).
-- À exécuter dans le SQL Editor Supabase.

CREATE TABLE IF NOT EXISTS berry_topups (
  stripe_session text        PRIMARY KEY,
  discord_id     text        NOT NULL,
  amount         bigint      NOT NULL,
  pack_id        text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE berry_topups ENABLE ROW LEVEL SECURITY;
-- Aucune policy : seul le service role (qui bypass la RLS) écrit/lit. Le client n'y touche jamais.

CREATE OR REPLACE FUNCTION credit_berries_topup(
  p_discord_id     text,
  p_amount         bigint,
  p_stripe_session text,
  p_pack_id        text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new  bigint;
  v_rows int;
BEGIN
  IF p_discord_id IS NULL OR p_amount IS NULL OR p_amount <= 0 OR p_stripe_session IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_args');
  END IF;

  -- Idempotence : 1 crédit par session Stripe.
  INSERT INTO berry_topups (stripe_session, discord_id, amount, pack_id)
  VALUES (p_stripe_session, p_discord_id, p_amount, p_pack_id)
  ON CONFLICT (stripe_session) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    -- Déjà créditée → on renvoie le solde actuel SANS re-créditer.
    SELECT COALESCE((data->>'berrys')::bigint, 0) INTO v_new FROM users WHERE uid = p_discord_id;
    RETURN jsonb_build_object('ok', true, 'credited', false, 'balance', COALESCE(v_new, 0), 'amount', p_amount);
  END IF;

  -- Crédit atomique du solde partagé.
  UPDATE users
     SET data = jsonb_set(COALESCE(data, '{}'::jsonb), '{berrys}',
                  to_jsonb(COALESCE((data->>'berrys')::bigint, 0) + p_amount))
   WHERE uid = p_discord_id
  RETURNING (data->>'berrys')::bigint INTO v_new;

  -- Membre jamais synchronisé par le bot → on le crée avec son solde initial.
  IF NOT FOUND THEN
    INSERT INTO users (uid, data) VALUES (p_discord_id, jsonb_build_object('berrys', p_amount))
    ON CONFLICT (uid) DO UPDATE
      SET data = jsonb_set(COALESCE(users.data, '{}'::jsonb), '{berrys}',
                   to_jsonb(COALESCE((users.data->>'berrys')::bigint, 0) + p_amount))
    RETURNING (data->>'berrys')::bigint INTO v_new;
  END IF;

  -- Réveille le bot pour qu'il resync son cache (deduction négative = crédit).
  INSERT INTO berry_sync (discord_id, deduction) VALUES (p_discord_id, -p_amount);

  RETURN jsonb_build_object('ok', true, 'credited', true, 'balance', COALESCE(v_new, 0), 'amount', p_amount);
END;
$$;

-- Seul le serveur (clé service role) appelle cette fonction.
REVOKE ALL ON FUNCTION credit_berries_topup(text, bigint, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION credit_berries_topup(text, bigint, text, text) TO service_role;
