-- ═══════════════════════════════════════════════════════════════════════════
--  FIL — plusieurs images par post (galerie jusqu'à 4)
--  Colonne posts.media_urls (jsonb array). create_post accepte p_media_urls.
--  _enrich_post expose media_urls (fallback sur [media_url] pour les vieux posts).
--  Pré-requis : feed.sql + feed_bookmarks + feed_mentions (create_post/_enrich_post à jour).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls jsonb;

-- ── _enrich_post : ajoute media_urls (liked / bookmarked / mentions conservés) ──
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

-- ── create_post : nouvelle signature avec p_media_urls (jsonb array) ─────────
DROP FUNCTION IF EXISTS create_post(text, text, uuid, uuid);
CREATE OR REPLACE FUNCTION create_post(
  p_content    text  DEFAULT NULL,
  p_media_url  text  DEFAULT NULL,
  p_reply_to   uuid  DEFAULT NULL,
  p_repost_of  uuid  DEFAULT NULL,
  p_media_urls jsonb DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_me text := _resolve_discord_id();
  v_id uuid; v_recent int; v_target text; v_clean text;
  v_mentions jsonb := '[]'::jsonb;
  v_mname text; v_muid text; v_muser text;
  v_urls jsonb; v_first text; v_u text;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié — connecte-toi"}'::jsonb; END IF;
  v_clean := NULLIF(trim(COALESCE(p_content, '')), '');

  -- Normalise les images : tableau (max 4), sinon l'image unique héritée.
  IF p_media_urls IS NOT NULL AND jsonb_typeof(p_media_urls) = 'array' AND jsonb_array_length(p_media_urls) > 0 THEN
    v_urls := (SELECT jsonb_agg(value) FROM jsonb_array_elements_text(p_media_urls) WITH ORDINALITY t(value, ord) WHERE ord <= 4);
  ELSIF p_media_url IS NOT NULL THEN
    v_urls := jsonb_build_array(p_media_url);
  ELSE
    v_urls := '[]'::jsonb;
  END IF;
  -- Validation https de chaque image
  FOR v_u IN SELECT value FROM jsonb_array_elements_text(v_urls) LOOP
    IF v_u !~ '^https://' THEN RETURN '{"ok":false,"error":"URL média invalide"}'::jsonb; END IF;
  END LOOP;
  v_first := v_urls->>0;

  IF p_reply_to IS NOT NULL AND NOT EXISTS (SELECT 1 FROM posts WHERE id = p_reply_to AND deleted_at IS NULL) THEN
    RETURN '{"ok":false,"error":"Post introuvable"}'::jsonb;
  END IF;
  IF p_repost_of IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM posts WHERE id = p_repost_of AND deleted_at IS NULL) THEN
      RETURN '{"ok":false,"error":"Post introuvable"}'::jsonb;
    END IF;
    IF EXISTS (SELECT 1 FROM posts WHERE author_id = v_me AND repost_of = p_repost_of AND deleted_at IS NULL) THEN
      RETURN '{"ok":false,"error":"Tu as déjà reposté ce post"}'::jsonb;
    END IF;
  ELSE
    IF v_clean IS NULL AND v_first IS NULL THEN
      RETURN '{"ok":false,"error":"Post vide"}'::jsonb;
    END IF;
  END IF;
  IF v_clean IS NOT NULL AND length(v_clean) > 500 THEN
    RETURN '{"ok":false,"error":"Post trop long (max 500)"}'::jsonb;
  END IF;

  SELECT count(*) INTO v_recent FROM posts WHERE author_id = v_me AND created_at > now() - interval '20 seconds';
  IF v_recent >= 5 THEN RETURN '{"ok":false,"error":"Tu publies trop vite, ralentis"}'::jsonb; END IF;

  INSERT INTO posts (author_id, content, media_url, media_urls, reply_to, repost_of)
  VALUES (v_me, v_clean, v_first, CASE WHEN jsonb_array_length(v_urls) > 0 THEN v_urls ELSE NULL END, p_reply_to, p_repost_of)
  RETURNING id INTO v_id;

  -- @mentions
  IF v_clean IS NOT NULL AND position('@' in v_clean) > 0 THEN
    FOR v_mname IN SELECT DISTINCT lower(mm[1]) FROM regexp_matches(v_clean, '@([A-Za-z0-9_\.]{2,32})', 'g') AS mm LOOP
      SELECT uid, data->>'username' INTO v_muid, v_muser FROM users WHERE lower(data->>'username') = v_mname LIMIT 1;
      IF v_muid IS NOT NULL THEN
        v_mentions := v_mentions || jsonb_build_object('username', v_muser, 'uid', v_muid);
        IF v_muid <> v_me THEN
          PERFORM _notify(v_muid, 'post_mention', 'Tu as été mentionné',
            COALESCE(left(v_clean, 80), 't''a mentionné dans un post'),
            '/fil/' || v_id::text, jsonb_build_object('post_id', v_id, 'from', v_me));
        END IF;
      END IF;
    END LOOP;
    IF v_mentions <> '[]'::jsonb THEN UPDATE posts SET mentions = v_mentions WHERE id = v_id; END IF;
  END IF;

  IF p_reply_to IS NOT NULL THEN
    SELECT author_id INTO v_target FROM posts WHERE id = p_reply_to;
    IF v_target IS NOT NULL AND v_target <> v_me THEN
      PERFORM _notify(v_target, 'post_reply', 'Nouvelle réponse', COALESCE(left(v_clean, 80), 'a répondu à ton post'),
        '/fil/' || p_reply_to::text, jsonb_build_object('post_id', p_reply_to, 'from', v_me));
    END IF;
  END IF;
  IF p_repost_of IS NOT NULL THEN
    SELECT author_id INTO v_target FROM posts WHERE id = p_repost_of;
    IF v_target IS NOT NULL AND v_target <> v_me THEN
      PERFORM _notify(v_target, 'post_repost', 'Repost', 'a reposté ton post',
        '/fil/' || p_repost_of::text, jsonb_build_object('post_id', p_repost_of, 'from', v_me));
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'post_id', v_id);
END;
$$;
