-- ═══════════════════════════════════════════════════════════════════════════
--  FIL — édition de post
--  Pré-requis : 20260530_feed.sql (posts, _resolve_discord_id).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION edit_post(p_post uuid, p_content text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_author text; v_clean text;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  v_clean := NULLIF(trim(COALESCE(p_content, '')), '');
  IF v_clean IS NULL THEN RETURN '{"ok":false,"error":"Le post ne peut pas être vide"}'::jsonb; END IF;
  IF length(v_clean) > 500 THEN RETURN '{"ok":false,"error":"Post trop long (max 500)"}'::jsonb; END IF;
  -- On ne modifie que ses propres posts (pas les reposts purs, pas les supprimés)
  SELECT author_id INTO v_author FROM posts WHERE id = p_post AND deleted_at IS NULL AND repost_of IS NULL;
  IF v_author IS NULL THEN RETURN '{"ok":false,"error":"Post introuvable"}'::jsonb; END IF;
  IF v_author <> v_me THEN RETURN '{"ok":false,"error":"Tu ne peux modifier que tes posts"}'::jsonb; END IF;
  UPDATE posts SET content = v_clean, edited_at = now() WHERE id = p_post;
  RETURN jsonb_build_object('ok', true, 'edited_at', now());
END;
$$;
