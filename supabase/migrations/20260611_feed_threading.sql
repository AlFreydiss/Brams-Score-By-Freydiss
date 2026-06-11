-- ═══════════════════════════════════════════════════════════════════════════
--  THREADING DU FIL (comportement X/Twitter) — idempotent, AUCUNE colonne ni
--  trigger : posts.reply_to + posts_replies_idx existent déjà (20260530_feed),
--  reply_count reste calculé en LATERAL.
--  1. get_feed v3 : posts racine + réponses des gens que je suis, avec le post
--     parent embarqué en jsonb compact (un seul LATERAL, pas de N+1).
--  2. _enrich_post : ajoute le même champ 'parent' (get_post / get_user_posts /
--     prepend après publication) pour que la vue thread d'une réponse montre
--     son contexte.
--  Pré-requis : 20260531_feed_multi_image (media_urls), 20260602_followers_stories
--  (user_follows), 20260530_feed_mentions (mentions).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── get_feed v3 ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_feed(p_before timestamptz DEFAULT NULL, p_limit int DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_lim int; v_result jsonb;
BEGIN
  v_lim := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'author_id', p.author_id,
      'author_username', u.data->>'username',
      'author_avatar', u.data->>'avatar_url',
      'content', p.content,
      'media_url', p.media_url,
      'media_urls', COALESCE(p.media_urls, CASE WHEN p.media_url IS NOT NULL THEN jsonb_build_array(p.media_url) ELSE '[]'::jsonb END),
      'mentions', COALESCE(p.mentions, '[]'::jsonb),
      'reply_to', p.reply_to,
      'repost_of', p.repost_of,
      'created_at', p.created_at,
      'edited_at', p.edited_at,
      'deleted_at', p.deleted_at,
      'like_count', COALESCE(lc.cnt, 0),
      'reply_count', COALESCE(rc.cnt, 0),
      'repost_count', COALESCE(rpc.cnt, 0),
      'liked', (v_me IS NOT NULL AND l.user_id IS NOT NULL),
      -- Parent compact (UN seul niveau) pour le bloc threadé du feed
      'parent', CASE WHEN p.reply_to IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'id', pp.id, 'author_id', pp.author_id,
          'author_username', pu.data->>'username', 'author_avatar', pu.data->>'avatar_url',
          'content', pp.content, 'media_url', pp.media_url,
          'media_urls', COALESCE(pp.media_urls, CASE WHEN pp.media_url IS NOT NULL THEN jsonb_build_array(pp.media_url) ELSE '[]'::jsonb END),
          'mentions', COALESCE(pp.mentions, '[]'::jsonb),
          'reply_to', pp.reply_to,
          'created_at', pp.created_at, 'deleted_at', pp.deleted_at
        )
        FROM posts pp LEFT JOIN users pu ON pu.uid = pp.author_id
        WHERE pp.id = p.reply_to
      ) ELSE NULL END,
      'original', CASE WHEN p.repost_of IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'id', o.id, 'author_id', o.author_id,
          'author_username', ou.data->>'username', 'author_avatar', ou.data->>'avatar_url',
          'content', o.content, 'media_url', o.media_url,
          'media_urls', COALESCE(o.media_urls, CASE WHEN o.media_url IS NOT NULL THEN jsonb_build_array(o.media_url) ELSE '[]'::jsonb END),
          'mentions', COALESCE(o.mentions, '[]'::jsonb),
          'created_at', o.created_at, 'deleted_at', o.deleted_at,
          'like_count', COALESCE(olc.cnt, 0),
          'reply_count', COALESCE(orc.cnt, 0),
          'liked', (v_me IS NOT NULL AND ol.user_id IS NOT NULL)
        )
        FROM posts o
        LEFT JOIN users ou ON ou.uid = o.author_id
        LEFT JOIN LATERAL (SELECT count(*) as cnt FROM post_likes WHERE post_id = o.id) olc ON true
        LEFT JOIN LATERAL (SELECT count(*) as cnt FROM posts rr WHERE rr.reply_to = o.id AND rr.deleted_at IS NULL) orc ON true
        LEFT JOIN post_likes ol ON ol.post_id = o.id AND ol.user_id = v_me
        WHERE o.id = p.repost_of
      ) ELSE NULL END
    ) ORDER BY p.created_at DESC
  ), '[]'::jsonb) INTO v_result
  FROM (
    SELECT id, author_id, content, media_url, media_urls, mentions, reply_to, repost_of, created_at, edited_at, deleted_at
    FROM posts
    WHERE deleted_at IS NULL
      AND (p_before IS NULL OR created_at < p_before)
      AND (
        reply_to IS NULL
        -- + réponses des gens que je suis (règle 5, comportement X)
        OR (v_me IS NOT NULL AND EXISTS (
          SELECT 1 FROM user_follows f
          WHERE f.follower_id = v_me AND f.following_id = posts.author_id))
      )
    ORDER BY created_at DESC LIMIT v_lim
  ) p
  LEFT JOIN users u ON u.uid = p.author_id
  LEFT JOIN LATERAL (SELECT count(*) as cnt FROM post_likes WHERE post_id = p.id) lc ON true
  LEFT JOIN LATERAL (SELECT count(*) as cnt FROM posts r WHERE r.reply_to = p.id AND r.deleted_at IS NULL) rc ON true
  LEFT JOIN LATERAL (SELECT count(*) as cnt FROM posts r WHERE r.repost_of = p.id AND r.deleted_at IS NULL) rpc ON true
  LEFT JOIN post_likes l ON l.post_id = p.id AND l.user_id = v_me;
  RETURN jsonb_build_object('ok', true, 'posts', v_result);
END;
$$;

-- ── _enrich_post : ajoute 'parent' (mêmes champs que get_feed) ────────────────
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
    'parent', CASE WHEN m.reply_to IS NOT NULL THEN (
      SELECT jsonb_build_object(
        'id', pp.id, 'author_id', pp.author_id,
        'author_username', pu.data->>'username', 'author_avatar', pu.data->>'avatar_url',
        'content', pp.content, 'media_url', pp.media_url,
        'media_urls', COALESCE(pp.media_urls, CASE WHEN pp.media_url IS NOT NULL THEN jsonb_build_array(pp.media_url) ELSE '[]'::jsonb END),
        'mentions', COALESCE(pp.mentions, '[]'::jsonb),
        'reply_to', pp.reply_to,
        'created_at', pp.created_at, 'deleted_at', pp.deleted_at
      )
      FROM posts pp LEFT JOIN users pu ON pu.uid = pp.author_id WHERE pp.id = m.reply_to
    ) ELSE NULL END,
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
