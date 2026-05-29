-- ═══════════════════════════════════════════════════════════════════════════
--  FIL — réactions emoji sur les posts (en plus du like)
--  Table post_reactions + toggle_post_reaction. _enrich_post expose "reactions".
--  Pré-requis : feed.sql + feed_bookmarks + feed_mentions + feed_multi_image
--  (cette définition de _enrich_post conserve TOUS les champs précédents).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS post_reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    text NOT NULL,
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS post_reactions_post_idx ON post_reactions(post_id);

ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_reactions' AND policyname='post_reactions_public_read') THEN
    CREATE POLICY post_reactions_public_read ON post_reactions FOR SELECT USING (true);
  END IF;
END $$;

-- ── _enrich_post : ajoute "reactions" [{emoji,count,mine}] ───────────────────
CREATE OR REPLACE FUNCTION _enrich_post(p_id uuid, p_me text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object(
    'id', m.id,
    'author_id', m.author_id,
    'author_username', u.data->>'username',
    'author_avatar', u.data->>'avatar_url',
    'content', m.content,
    'media_url', m.media_url,
    'media_urls', COALESCE(m.media_urls, CASE WHEN m.media_url IS NOT NULL THEN jsonb_build_array(m.media_url) ELSE '[]'::jsonb END),
    'reply_to', m.reply_to,
    'repost_of', m.repost_of,
    'mentions', COALESCE(m.mentions, '[]'::jsonb),
    'created_at', m.created_at,
    'edited_at', m.edited_at,
    'deleted_at', m.deleted_at,
    'like_count',   (SELECT count(*) FROM post_likes WHERE post_id = m.id),
    'reply_count',  (SELECT count(*) FROM posts r WHERE r.reply_to = m.id AND r.deleted_at IS NULL),
    'repost_count', (SELECT count(*) FROM posts r WHERE r.repost_of = m.id AND r.deleted_at IS NULL),
    'liked', (p_me IS NOT NULL AND EXISTS (SELECT 1 FROM post_likes WHERE post_id = m.id AND user_id = p_me)),
    'bookmarked', (p_me IS NOT NULL AND EXISTS (SELECT 1 FROM post_bookmarks WHERE post_id = m.id AND user_id = p_me)),
    'reactions', (SELECT COALESCE(jsonb_agg(jsonb_build_object('emoji', e.emoji, 'count', e.cnt, 'mine', e.mine) ORDER BY e.cnt DESC, e.emoji), '[]'::jsonb)
                  FROM (SELECT emoji, count(*) AS cnt, bool_or(p_me IS NOT NULL AND user_id = p_me) AS mine
                        FROM post_reactions WHERE post_id = m.id GROUP BY emoji) e),
    'original', CASE WHEN m.repost_of IS NOT NULL THEN (
      SELECT jsonb_build_object(
        'id', o.id, 'author_id', o.author_id,
        'author_username', ou.data->>'username', 'author_avatar', ou.data->>'avatar_url',
        'content', o.content, 'media_url', o.media_url,
        'media_urls', COALESCE(o.media_urls, CASE WHEN o.media_url IS NOT NULL THEN jsonb_build_array(o.media_url) ELSE '[]'::jsonb END),
        'mentions', COALESCE(o.mentions, '[]'::jsonb),
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

-- ── Ajouter / retirer une réaction ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION toggle_post_reaction(p_post uuid, p_emoji text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_existing uuid; v_author text;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  IF p_emoji IS NULL OR length(p_emoji) = 0 OR length(p_emoji) > 16 THEN
    RETURN '{"ok":false,"error":"Emoji invalide"}'::jsonb;
  END IF;
  SELECT author_id INTO v_author FROM posts WHERE id = p_post AND deleted_at IS NULL;
  IF v_author IS NULL THEN RETURN '{"ok":false,"error":"Post introuvable"}'::jsonb; END IF;
  SELECT id INTO v_existing FROM post_reactions WHERE post_id = p_post AND user_id = v_me AND emoji = p_emoji;
  IF v_existing IS NOT NULL THEN
    DELETE FROM post_reactions WHERE id = v_existing;
    RETURN jsonb_build_object('ok', true, 'reacted', false);
  END IF;
  INSERT INTO post_reactions (post_id, user_id, emoji) VALUES (p_post, v_me, p_emoji) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'reacted', true);
END;
$$;
