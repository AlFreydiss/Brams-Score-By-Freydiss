-- ═══════════════════════════════════════════════════════════════════════════
--  PROFIL SOCIAL — Enrichissement de l'édition de profil
--  Ajoute bannière, lien externe, visibilité et liens sociaux à profile_settings,
--  puis étend get/update_profile_settings. Idempotent.
--  Pré-requis : 20260531_profile_settings.sql (table + RPC de base).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE profile_settings ADD COLUMN IF NOT EXISTS banner_url   text;
ALTER TABLE profile_settings ADD COLUMN IF NOT EXISTS link         text;
ALTER TABLE profile_settings ADD COLUMN IF NOT EXISTS visibility   text NOT NULL DEFAULT 'public';
ALTER TABLE profile_settings ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ── Lecture — applique la visibilité choisie par le membre ────────────────────
-- 'private' : seul le propriétaire voit sa perso ; 'members' : tout membre
-- connecté ; 'public' : tout le monde. Un visiteur non autorisé reçoit un objet
-- minimal { discord_id, visibility, restricted } → le front masque naturellement
-- bio/citation/lien (champs absents). La perso n'expose donc rien hors règle.
CREATE OR REPLACE FUNCTION get_profile_settings(p_discord_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE
  v_row profile_settings%ROWTYPE;
  v_me  text := _resolve_discord_id();
BEGIN
  SELECT * INTO v_row FROM profile_settings WHERE discord_id = p_discord_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF v_row.visibility = 'private' AND v_me IS DISTINCT FROM p_discord_id THEN
    RETURN jsonb_build_object('discord_id', v_row.discord_id, 'visibility', 'private', 'restricted', true);
  END IF;
  IF v_row.visibility = 'members' AND v_me IS NULL THEN
    RETURN jsonb_build_object('discord_id', v_row.discord_id, 'visibility', 'members', 'restricted', true);
  END IF;

  RETURN jsonb_build_object(
    'discord_id',           v_row.discord_id,
    'bio',                  v_row.bio,
    'quote',                v_row.quote,
    'featured_badge',       v_row.featured_badge,
    'featured_achievement', v_row.featured_achievement,
    'pinned_post',          v_row.pinned_post,
    'theme',                v_row.theme,
    'banner_url',           v_row.banner_url,
    'link',                 v_row.link,
    'visibility',           v_row.visibility,
    'social_links',         COALESCE(v_row.social_links, '{}'::jsonb),
    'updated_at',           v_row.updated_at
  );
END;
$$;

-- L'ancienne signature (6 args) doit disparaître : sans ça, un appel par arguments
-- nommés correspondrait à la fois à l'ancienne et à la nouvelle (params défautés)
-- → "could not choose best candidate function".
DROP FUNCTION IF EXISTS update_profile_settings(text, text, text, text, uuid, text);

-- ── Mise à jour de SA perso (discord_id résolu serveur — jamais celui d'autrui) ─
-- p_x NULL => champ inchangé. Pour vider un champ texte, passer '' (chaîne vide).
CREATE OR REPLACE FUNCTION update_profile_settings(
  p_bio                  text  DEFAULT NULL,
  p_quote                text  DEFAULT NULL,
  p_featured_badge       text  DEFAULT NULL,
  p_featured_achievement text  DEFAULT NULL,
  p_pinned_post          uuid  DEFAULT NULL,
  p_theme                text  DEFAULT NULL,
  p_banner_url           text  DEFAULT NULL,
  p_link                 text  DEFAULT NULL,
  p_visibility           text  DEFAULT NULL,
  p_social_links         jsonb DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id();
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;

  -- Bornes anti-abus
  IF p_bio   IS NOT NULL AND length(p_bio)   > 280 THEN RETURN '{"ok":false,"error":"Bio trop longue (280 max)"}'::jsonb; END IF;
  IF p_quote IS NOT NULL AND length(p_quote) > 160 THEN RETURN '{"ok":false,"error":"Citation trop longue (160 max)"}'::jsonb; END IF;
  IF p_link  IS NOT NULL AND p_link  <> '' AND p_link  !~* '^https?://[^\s]{1,500}$' THEN
    RETURN '{"ok":false,"error":"Lien invalide (http(s) uniquement)"}'::jsonb;
  END IF;
  IF p_banner_url IS NOT NULL AND p_banner_url <> '' AND p_banner_url !~* '^https?://[^\s]{1,500}$' THEN
    RETURN '{"ok":false,"error":"Bannière invalide"}'::jsonb;
  END IF;
  IF p_visibility IS NOT NULL AND p_visibility NOT IN ('public', 'members', 'private') THEN
    RETURN '{"ok":false,"error":"Visibilité invalide"}'::jsonb;
  END IF;

  INSERT INTO profile_settings AS ps (
    discord_id, bio, quote, featured_badge, featured_achievement, pinned_post,
    theme, banner_url, link, visibility, social_links, updated_at
  )
  VALUES (
    v_me, p_bio, p_quote, p_featured_badge, p_featured_achievement, p_pinned_post,
    p_theme, p_banner_url, p_link, COALESCE(p_visibility, 'public'), COALESCE(p_social_links, '{}'::jsonb), now()
  )
  ON CONFLICT (discord_id) DO UPDATE SET
    bio                  = COALESCE(EXCLUDED.bio,                  ps.bio),
    quote                = COALESCE(EXCLUDED.quote,                ps.quote),
    featured_badge       = COALESCE(EXCLUDED.featured_badge,       ps.featured_badge),
    featured_achievement = COALESCE(EXCLUDED.featured_achievement, ps.featured_achievement),
    pinned_post          = COALESCE(EXCLUDED.pinned_post,          ps.pinned_post),
    theme                = COALESCE(EXCLUDED.theme,                ps.theme),
    banner_url           = COALESCE(EXCLUDED.banner_url,           ps.banner_url),
    link                 = COALESCE(EXCLUDED.link,                 ps.link),
    visibility           = COALESCE(p_visibility,                  ps.visibility),
    social_links         = COALESCE(p_social_links,                ps.social_links),
    updated_at           = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── list_following accepte désormais une cible (par défaut soi-même) ──────────
-- Sans ça, on ne pouvait lister que SES propres suivis → la modale "Suivis" d'un
-- autre profil restait vide. On supprime l'ancienne version 0-arg pour éviter
-- l'ambiguïté de surcharge.
DROP FUNCTION IF EXISTS list_following();

CREATE OR REPLACE FUNCTION list_following(p_user text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE
  v_me     text := _resolve_discord_id();
  v_target text := COALESCE(NULLIF(p_user, ''), v_me);
  v_result jsonb;
BEGIN
  IF v_target IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT f.following_id AS user_id, u.data->>'username' AS username, u.data->>'avatar_url' AS avatar_url, f.created_at
    FROM user_follows f
    LEFT JOIN users u ON u.uid = f.following_id
    WHERE f.follower_id = v_target
  ) r;
  RETURN v_result;
END;
$$;

-- ── follow_user : ne notifie QUE si l'abonnement vient d'être créé ────────────
-- Avant : _notify était appelé même quand ON CONFLICT DO NOTHING n'insérait rien
-- (re-follow d'un abonné déjà suivi → notification fantôme en double).
CREATE OR REPLACE FUNCTION follow_user(p_target text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_me   text := _resolve_discord_id();
  v_rows int  := 0;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifie"}'::jsonb; END IF;
  IF p_target IS NULL OR trim(p_target) = '' THEN RETURN '{"ok":false,"error":"Cible invalide"}'::jsonb; END IF;
  IF p_target = v_me THEN RETURN '{"ok":false,"error":"Tu ne peux pas te suivre toi-meme"}'::jsonb; END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE uid = p_target) THEN RETURN '{"ok":false,"error":"Utilisateur introuvable"}'::jsonb; END IF;
  IF EXISTS (SELECT 1 FROM user_blocks WHERE (blocker_id = v_me AND blocked_id = p_target) OR (blocker_id = p_target AND blocked_id = v_me)) THEN
    RETURN '{"ok":false,"error":"Action impossible"}'::jsonb;
  END IF;

  INSERT INTO user_follows (follower_id, following_id)
  VALUES (v_me, p_target)
  ON CONFLICT (follower_id, following_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows > 0 THEN
    PERFORM _notify(p_target, 'new_follower', 'Nouvel abonne', 'te suit maintenant',
      '/u/' || v_me, jsonb_build_object('from', v_me));
  END IF;

  RETURN jsonb_build_object('ok', true, 'following', true);
END;
$$;
