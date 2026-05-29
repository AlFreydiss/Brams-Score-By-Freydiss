-- ═══════════════════════════════════════════════════════════════════════════
--  FIX encodage des messages de notification (accents corrompus en base car le
--  SQL avait été collé en ANSI). Re-crée toggle_like avec les bons accents UTF-8.
--  (create_post / post_reactions : relancer feed_multi_image + post_reactions en UTF-8.)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION toggle_like(p_post uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_author text; v_existing uuid;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  SELECT author_id INTO v_author FROM posts WHERE id = p_post AND deleted_at IS NULL;
  IF v_author IS NULL THEN RETURN '{"ok":false,"error":"Post introuvable"}'::jsonb; END IF;
  SELECT id INTO v_existing FROM post_likes WHERE post_id = p_post AND user_id = v_me;
  IF v_existing IS NOT NULL THEN
    DELETE FROM post_likes WHERE id = v_existing;
    RETURN jsonb_build_object('ok', true, 'liked', false);
  END IF;
  INSERT INTO post_likes (post_id, user_id) VALUES (p_post, v_me) ON CONFLICT DO NOTHING;
  IF v_author <> v_me THEN
    PERFORM _notify(v_author, 'post_like', 'Nouveau like', 'a aimé ton post',
      '/fil/' || p_post::text, jsonb_build_object('post_id', p_post, 'from', v_me));
  END IF;
  RETURN jsonb_build_object('ok', true, 'liked', true);
END;
$$;
