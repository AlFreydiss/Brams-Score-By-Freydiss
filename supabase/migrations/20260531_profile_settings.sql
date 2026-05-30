-- ═══════════════════════════════════════════════════════════════════════════
--  PROFIL — Personnalisation membre + stories par profil
--  Table profile_settings + RPC get/update_profile_settings + get_user_stories.
--  Pré-requis : _resolve_discord_id() (20260528_shop_berry_sync / social), stories.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS profile_settings (
  discord_id            text PRIMARY KEY,
  bio                   text,
  quote                 text,
  featured_badge        text,
  featured_achievement  text,
  pinned_post           uuid,
  theme                 text,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profile_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profile_settings' AND policyname='profile_settings_public_read') THEN
    CREATE POLICY profile_settings_public_read ON profile_settings FOR SELECT USING (true);
  END IF;
END $$;

-- ── Lire la perso d'un profil (lecture publique) ──────────────────────────────
CREATE OR REPLACE FUNCTION get_profile_settings(p_discord_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_row profile_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM profile_settings WHERE discord_id = p_discord_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'discord_id',           v_row.discord_id,
    'bio',                  v_row.bio,
    'quote',                v_row.quote,
    'featured_badge',       v_row.featured_badge,
    'featured_achievement', v_row.featured_achievement,
    'pinned_post',          v_row.pinned_post,
    'theme',                v_row.theme,
    'updated_at',           v_row.updated_at
  );
END;
$$;

-- ── Mettre à jour SA perso (impossible de viser un autre membre) ──────────────
-- p_x NULL => champ inchangé. Pour vider un champ, passer '' (string vide).
CREATE OR REPLACE FUNCTION update_profile_settings(
  p_bio                  text DEFAULT NULL,
  p_quote                text DEFAULT NULL,
  p_featured_badge       text DEFAULT NULL,
  p_featured_achievement text DEFAULT NULL,
  p_pinned_post          uuid DEFAULT NULL,
  p_theme                text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id();
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;

  -- Bornes anti-abus
  IF p_bio   IS NOT NULL AND length(p_bio)   > 280 THEN RETURN '{"ok":false,"error":"Bio trop longue (280 max)"}'::jsonb; END IF;
  IF p_quote IS NOT NULL AND length(p_quote) > 160 THEN RETURN '{"ok":false,"error":"Citation trop longue (160 max)"}'::jsonb; END IF;

  INSERT INTO profile_settings (discord_id, bio, quote, featured_badge, featured_achievement, pinned_post, theme, updated_at)
  VALUES (v_me, p_bio, p_quote, p_featured_badge, p_featured_achievement, p_pinned_post, p_theme, now())
  ON CONFLICT (discord_id) DO UPDATE SET
    bio                  = COALESCE(EXCLUDED.bio,                  profile_settings.bio),
    quote                = COALESCE(EXCLUDED.quote,                profile_settings.quote),
    featured_badge       = COALESCE(EXCLUDED.featured_badge,       profile_settings.featured_badge),
    featured_achievement = COALESCE(EXCLUDED.featured_achievement, profile_settings.featured_achievement),
    pinned_post          = COALESCE(EXCLUDED.pinned_post,          profile_settings.pinned_post),
    theme                = COALESCE(EXCLUDED.theme,                profile_settings.theme),
    updated_at           = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── Stories actives (<24h) d'un membre précis (lecture publique) ──────────────
CREATE OR REPLACE FUNCTION get_user_stories(p_user text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id, 'media_url', s.media_url, 'created_at', s.created_at
  ) ORDER BY s.created_at ASC), '[]'::jsonb) INTO v_result
  FROM stories s
  WHERE s.author_id = p_user AND s.expires_at > now();
  RETURN jsonb_build_object('ok', true, 'stories', v_result);
END;
$$;
