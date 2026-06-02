-- ═══════════════════════════════════════════════════════════════════════════
--  DM & AMIS — Follow mutuel → amitié auto + permissions de messages
--  - profile_settings.dm_privacy : 'everyone' | 'friends' | 'nobody'
--  - follow_user : si A et B se suivent mutuellement → amitié 'accepted' auto
--  - get_or_create_dm : respecte dm_privacy de la cible (plus de "amis only" figé)
--  Pré-requis : 20260602_profile_social.sql, 20260529_social_system.sql.
--  Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE profile_settings ADD COLUMN IF NOT EXISTS dm_privacy text NOT NULL DEFAULT 'friends';

-- ── get_profile_settings : expose dm_privacy ──────────────────────────────────
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
    'dm_privacy',           COALESCE(v_row.dm_privacy, 'friends'),
    'updated_at',           v_row.updated_at
  );
END;
$$;

-- ── update_profile_settings : ajoute p_dm_privacy (signature 11 args) ─────────
DROP FUNCTION IF EXISTS update_profile_settings(text, text, text, text, uuid, text, text, text, text, jsonb);

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
  p_social_links         jsonb DEFAULT NULL,
  p_dm_privacy           text  DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id();
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;

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
  IF p_dm_privacy IS NOT NULL AND p_dm_privacy NOT IN ('everyone', 'friends', 'nobody') THEN
    RETURN '{"ok":false,"error":"Permission DM invalide"}'::jsonb;
  END IF;

  INSERT INTO profile_settings AS ps (
    discord_id, bio, quote, featured_badge, featured_achievement, pinned_post,
    theme, banner_url, link, visibility, social_links, dm_privacy, updated_at
  )
  VALUES (
    v_me, p_bio, p_quote, p_featured_badge, p_featured_achievement, p_pinned_post,
    p_theme, p_banner_url, p_link, COALESCE(p_visibility, 'public'),
    COALESCE(p_social_links, '{}'::jsonb), COALESCE(p_dm_privacy, 'friends'), now()
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
    dm_privacy           = COALESCE(p_dm_privacy,                  ps.dm_privacy),
    updated_at           = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── follow_user : notif si insertion réelle + amitié auto si follow mutuel ────
CREATE OR REPLACE FUNCTION follow_user(p_target text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_me      text := _resolve_discord_id();
  v_rows    int  := 0;
  v_mutual  boolean := false;
  v_friends boolean := false;
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

  -- Follow mutuel ? (la cible me suit déjà)
  v_mutual := EXISTS (SELECT 1 FROM user_follows WHERE follower_id = p_target AND following_id = v_me);

  IF v_rows > 0 THEN
    PERFORM _notify(p_target, 'new_follower', 'Nouvel abonne', 'te suit maintenant',
      '/u/' || v_me, jsonb_build_object('from', v_me));

    -- Suivi mutuel → amitié 'accepted' automatique (permet le DM selon dm_privacy).
    IF v_mutual THEN
      IF EXISTS (SELECT 1 FROM friendships WHERE (requester_id = v_me AND addressee_id = p_target) OR (requester_id = p_target AND addressee_id = v_me)) THEN
        UPDATE friendships SET status = 'accepted', updated_at = now()
        WHERE (requester_id = v_me AND addressee_id = p_target) OR (requester_id = p_target AND addressee_id = v_me);
      ELSE
        INSERT INTO friendships (requester_id, addressee_id, status) VALUES (v_me, p_target, 'accepted')
        ON CONFLICT (requester_id, addressee_id) DO UPDATE SET status = 'accepted', updated_at = now();
      END IF;
      v_friends := true;
      PERFORM _notify(p_target, 'friend_accepted', 'Nouvel ami',
        'Vous vous suivez mutuellement, vous etes maintenant amis', '/u/' || v_me, jsonb_build_object('user_id', v_me));
    END IF;
  ELSE
    v_friends := _are_friends(v_me, p_target);
  END IF;

  RETURN jsonb_build_object('ok', true, 'following', true, 'friends', v_friends OR v_mutual);
END;
$$;

-- ── get_or_create_dm : respecte la permission DM de la cible ──────────────────
-- 'everyone' : tout le monde peut écrire ; 'friends' : amis seulement ;
-- 'nobody' : messagerie fermée. Le blocage prime toujours.
CREATE OR REPLACE FUNCTION get_or_create_dm(p_target text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_me   text := _resolve_discord_id();
  v_key  text;
  v_conv uuid;
  v_priv text;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  IF p_target = v_me THEN RETURN '{"ok":false,"error":"Conversation invalide"}'::jsonb; END IF;
  IF _is_blocked(v_me, p_target) THEN RETURN '{"ok":false,"error":"Action impossible (blocage)"}'::jsonb; END IF;

  v_priv := COALESCE((SELECT dm_privacy FROM profile_settings WHERE discord_id = p_target), 'friends');
  IF v_priv = 'nobody' THEN
    RETURN '{"ok":false,"error":"Ce membre n''accepte pas les messages"}'::jsonb;
  ELSIF v_priv = 'friends' AND NOT _are_friends(v_me, p_target) THEN
    RETURN '{"ok":false,"error":"Réservé à ses amis (suivez-vous mutuellement)"}'::jsonb;
  END IF;

  v_key := CASE WHEN v_me < p_target THEN v_me || ':' || p_target ELSE p_target || ':' || v_me END;

  SELECT id INTO v_conv FROM conversations WHERE dm_key = v_key;
  IF v_conv IS NULL THEN
    INSERT INTO conversations (type, dm_key) VALUES ('dm', v_key)
    ON CONFLICT (dm_key) DO NOTHING
    RETURNING id INTO v_conv;
    IF v_conv IS NULL THEN
      SELECT id INTO v_conv FROM conversations WHERE dm_key = v_key;
    END IF;
    INSERT INTO conversation_participants (conversation_id, user_id) VALUES (v_conv, v_me), (v_conv, p_target)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('ok', true, 'conversation_id', v_conv);
END;
$$;
