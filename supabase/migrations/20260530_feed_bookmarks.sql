-- ═══════════════════════════════════════════════════════════════════════════
--  FIL — signets (favoris)
--  Table post_bookmarks + RPC toggle_bookmark / get_my_bookmarks.
--  _enrich_post est redéfini pour exposer "bookmarked" (liké-par-moi style).
--  Pré-requis : 20260530_feed.sql (posts, post_likes, _resolve_discord_id).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS post_bookmarks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS post_bookmarks_user_idx ON post_bookmarks(user_id, created_at DESC);

ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_bookmarks' AND policyname='post_bookmarks_own_read') THEN
    CREATE POLICY post_bookmarks_own_read ON post_bookmarks FOR SELECT USING (true);
  END IF;
END $$;

-- ── _enrich_post : ajoute "bookmarked" (mes signets) ─────────────────────────
CREATE OR REPLACE FUNCTION _enrich_post(p_id uuid, p_me text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object(
    'id', m.id,
    'author_id', m.author_id,
    'author_username', u.data->>'username',
    'author_avatar', u.data->>'avatar_url',
    'content', m.content,
    'media_url', m.media_url,
    'reply_to', m.reply_to,
    'repost_of', m.repost_of,
    'created_at', m.created_at,
    'edited_at', m.edited_at,
    'deleted_at', m.deleted_at,
    'like_count',   (SELECT count(*) FROM post_likes WHERE post_id = m.id),
    'reply_count',  (SELECT count(*) FROM posts r WHERE r.reply_to = m.id AND r.deleted_at IS NULL),
    'repost_count', (SELECT count(*) FROM posts r WHERE r.repost_of = m.id AND r.deleted_at IS NULL),
    'liked', (p_me IS NOT NULL AND EXISTS (SELECT 1 FROM post_likes WHERE post_id = m.id AND user_id = p_me)),
    'bookmarked', (p_me IS NOT NULL AND EXISTS (SELECT 1 FROM post_bookmarks WHERE post_id = m.id AND user_id = p_me)),
    'original', CASE WHEN m.repost_of IS NOT NULL THEN (
      SELECT jsonb_build_object(
        'id', o.id, 'author_id', o.author_id,
        'author_username', ou.data->>'username', 'author_avatar', ou.data->>'avatar_url',
        'content', o.content, 'media_url', o.media_url,
        'created_at', o.created_at, 'deleted_at', o.deleted_at,
        'like_count',  (SELECT count(*) FROM post_likes WHERE post_id = o.id),
        'reply_count', (SELECT count(*) FROM posts rr WHERE rr.reply_to = o.id AND rr.deleted_at IS NULL),
        'liked', (p_me IS NOT NULL AND EXISTS (SELECT 1 FROM post_likes WHERE post_id = o.id AND user_id = p_me)),
        'bookmarked', (p_me IS NOT NULL AND EXISTS (SELECT 1 FROM post_bookmarks WHERE post_id = o.id AND user_id = p_me))
      )
      FROM posts o LEFT JOIN users ou ON ou.uid = o.author_id WHERE o.id = m.repost_of
    ) ELSE NULL END
  )
  FROM posts m LEFT JOIN users u ON u.uid = m.author_id
  WHERE m.id = p_id;
$$;

-- ── Ajouter / retirer un signet ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION toggle_bookmark(p_post uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_existing uuid;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  IF NOT EXISTS (SELECT 1 FROM posts WHERE id = p_post AND deleted_at IS NULL) THEN
    RETURN '{"ok":false,"error":"Post introuvable"}'::jsonb;
  END IF;
  SELECT id INTO v_existing FROM post_bookmarks WHERE post_id = p_post AND user_id = v_me;
  IF v_existing IS NOT NULL THEN
    DELETE FROM post_bookmarks WHERE id = v_existing;
    RETURN jsonb_build_object('ok', true, 'bookmarked', false);
  END IF;
  INSERT INTO post_bookmarks (post_id, user_id) VALUES (p_post, v_me) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'bookmarked', true);
END;
$$;

-- ── Mes signets (paginé) ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_bookmarks(p_before timestamptz DEFAULT NULL, p_limit int DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_lim int; v_result jsonb;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  v_lim := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  SELECT COALESCE(jsonb_agg(_enrich_post(t.post_id, v_me) ORDER BY t.created_at DESC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT b.post_id, b.created_at
    FROM post_bookmarks b JOIN posts p ON p.id = b.post_id
    WHERE b.user_id = v_me AND p.deleted_at IS NULL
      AND (p_before IS NULL OR b.created_at < p_before)
    ORDER BY b.created_at DESC LIMIT v_lim
  ) t;
  RETURN jsonb_build_object('ok', true, 'posts', v_result);
END;
$$;
