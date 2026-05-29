-- ═══════════════════════════════════════════════════════════════════════════
--  FIL — recherche de posts + hashtags
--  RPC search_posts (ILIKE trigram sur le contenu des posts racines).
--  Pré-requis : 20260530_feed.sql (posts, _enrich_post, _resolve_discord_id).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS posts_content_trgm_idx
  ON posts USING gin (content gin_trgm_ops)
  WHERE deleted_at IS NULL;

-- Recherche dans les posts racines (texte libre ou #hashtag). Renvoie au plus 50
-- posts enrichis, du plus récent au plus ancien.
CREATE OR REPLACE FUNCTION search_posts(p_query text, p_limit int DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_lim int; v_result jsonb; v_pattern text;
BEGIN
  IF p_query IS NULL OR length(trim(p_query)) < 2 THEN
    RETURN jsonb_build_object('ok', true, 'posts', '[]'::jsonb);
  END IF;
  v_lim := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 50);
  v_pattern := '%' || replace(replace(replace(trim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  SELECT COALESCE(jsonb_agg(_enrich_post(t.id, v_me) ORDER BY t.created_at DESC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT id, created_at FROM posts
    WHERE reply_to IS NULL AND deleted_at IS NULL
      AND content ILIKE v_pattern ESCAPE '\'
    ORDER BY created_at DESC LIMIT v_lim
  ) t;
  RETURN jsonb_build_object('ok', true, 'posts', v_result);
END;
$$;
