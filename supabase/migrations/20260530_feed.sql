-- ═══════════════════════════════════════════════════════════════════════════
--  FIL (réseau social type Twitter) — remplace Wiki/Théories
--  Tables : posts (+ réponses + reposts), post_likes
--  RPC SECURITY DEFINER : create_post, delete_post, toggle_like, get_feed,
--  get_post (thread), get_user_posts. Notifs via _notify.
--  Pré-requis : 20260529_social_system.sql (_resolve_discord_id, _notify, users).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   text NOT NULL,
  content     text,
  media_url   text,
  reply_to    uuid REFERENCES posts(id) ON DELETE CASCADE,   -- réponse à un post
  repost_of   uuid REFERENCES posts(id) ON DELETE CASCADE,   -- repost d'un post
  edited_at   timestamptz,
  deleted_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_feed_idx    ON posts(created_at DESC) WHERE reply_to IS NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS posts_replies_idx ON posts(reply_to, created_at) WHERE reply_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS posts_author_idx  ON posts(author_id, created_at DESC);

-- Performance indexes for feed counts and liked checks (prevents slow counts on large tables)
CREATE INDEX IF NOT EXISTS post_likes_post_user_idx ON post_likes(post_id, user_id);
CREATE INDEX IF NOT EXISTS posts_repost_idx ON posts(repost_of, created_at) WHERE repost_of IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS post_likes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS post_likes_post_idx ON post_likes(post_id);

-- ── RLS : lecture publique (le fil est public + nécessaire au Realtime).
--    Toutes les écritures passent par les RPC SECURITY DEFINER ci-dessous.
ALTER TABLE posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='posts' AND policyname='posts_public_read') THEN
    CREATE POLICY posts_public_read ON posts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_likes' AND policyname='post_likes_public_read') THEN
    CREATE POLICY post_likes_public_read ON post_likes FOR SELECT USING (true);
  END IF;
END $$;

-- ── Realtime : ajoute posts à la publication (pastille "nouveaux posts" du fil).
--    Safe si la publication n'existe pas ou si la table y est déjà.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='posts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE posts;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ── Enrichit un post en jsonb : auteur, compteurs, liké-par-moi, original (repost).
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
    'original', CASE WHEN m.repost_of IS NOT NULL THEN (
      SELECT jsonb_build_object(
        'id', o.id, 'author_id', o.author_id,
        'author_username', ou.data->>'username', 'author_avatar', ou.data->>'avatar_url',
        'content', o.content, 'media_url', o.media_url,
        'created_at', o.created_at, 'deleted_at', o.deleted_at,
        'like_count',  (SELECT count(*) FROM post_likes WHERE post_id = o.id),
        'reply_count', (SELECT count(*) FROM posts rr WHERE rr.reply_to = o.id AND rr.deleted_at IS NULL),
        'liked', (p_me IS NOT NULL AND EXISTS (SELECT 1 FROM post_likes WHERE post_id = o.id AND user_id = p_me))
      )
      FROM posts o LEFT JOIN users ou ON ou.uid = o.author_id WHERE o.id = m.repost_of
    ) ELSE NULL END
  )
  FROM posts m LEFT JOIN users u ON u.uid = m.author_id
  WHERE m.id = p_id;
$$;

-- ── Publier (post, réponse ou repost) ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_post(
  p_content   text DEFAULT NULL,
  p_media_url text DEFAULT NULL,
  p_reply_to  uuid DEFAULT NULL,
  p_repost_of uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_id uuid; v_recent int; v_target text; v_clean text;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié — connecte-toi"}'::jsonb; END IF;
  v_clean := NULLIF(trim(COALESCE(p_content, '')), '');

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
    -- post / réponse : contenu requis (un repost peut être vide = simple partage)
    IF v_clean IS NULL AND p_media_url IS NULL THEN
      RETURN '{"ok":false,"error":"Post vide"}'::jsonb;
    END IF;
  END IF;
  IF v_clean IS NOT NULL AND length(v_clean) > 500 THEN
    RETURN '{"ok":false,"error":"Post trop long (max 500)"}'::jsonb;
  END IF;
  IF p_media_url IS NOT NULL AND p_media_url !~ '^https://' THEN
    RETURN '{"ok":false,"error":"URL média invalide"}'::jsonb;
  END IF;

  SELECT count(*) INTO v_recent FROM posts WHERE author_id = v_me AND created_at > now() - interval '20 seconds';
  IF v_recent >= 5 THEN RETURN '{"ok":false,"error":"Tu publies trop vite, ralentis"}'::jsonb; END IF;

  INSERT INTO posts (author_id, content, media_url, reply_to, repost_of)
  VALUES (v_me, v_clean, p_media_url, p_reply_to, p_repost_of)
  RETURNING id INTO v_id;

  IF p_reply_to IS NOT NULL THEN
    SELECT author_id INTO v_target FROM posts WHERE id = p_reply_to;
    IF v_target IS NOT NULL AND v_target <> v_me THEN
      PERFORM _notify(v_target, 'post_reply', 'Nouvelle réponse',
        COALESCE(left(v_clean, 80), 'a répondu à ton post'),
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

-- ── Supprimer (soft delete, auteur uniquement) ────────────────────────────────
CREATE OR REPLACE FUNCTION delete_post(p_post uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_author text;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  SELECT author_id INTO v_author FROM posts WHERE id = p_post;
  IF v_author IS NULL THEN RETURN '{"ok":false,"error":"Post introuvable"}'::jsonb; END IF;
  IF v_author <> v_me THEN RETURN '{"ok":false,"error":"Tu ne peux supprimer que tes posts"}'::jsonb; END IF;
  UPDATE posts SET deleted_at = now(), content = NULL, media_url = NULL WHERE id = p_post;
  RETURN '{"ok":true}'::jsonb;
END;
$$;

-- ── Like / unlike ─────────────────────────────────────────────────────────────
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

-- ── Fil global (posts racines, paginé) ────────────────────────────────────────
-- Optimized get_feed: uses LATERAL joins for counts in a single efficient query (avoids N+1 subqueries in _enrich_post calls, faster for large feeds, prevents timeouts).
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
      'reply_to', p.reply_to,
      'repost_of', p.repost_of,
      'created_at', p.created_at,
      'edited_at', p.edited_at,
      'deleted_at', p.deleted_at,
      'like_count', COALESCE(lc.cnt, 0),
      'reply_count', COALESCE(rc.cnt, 0),
      'repost_count', COALESCE(rpc.cnt, 0),
      'liked', (v_me IS NOT NULL AND l.user_id IS NOT NULL),
      'original', CASE WHEN p.repost_of IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'id', o.id, 'author_id', o.author_id,
          'author_username', ou.data->>'username', 'author_avatar', ou.data->>'avatar_url',
          'content', o.content, 'media_url', o.media_url,
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
    SELECT id, author_id, content, media_url, reply_to, repost_of, created_at, edited_at, deleted_at
    FROM posts
    WHERE reply_to IS NULL AND deleted_at IS NULL
      AND (p_before IS NULL OR created_at < p_before)
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

-- ── Post + ses réponses (thread) ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_post(p_post uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_post jsonb; v_replies jsonb;
BEGIN
  v_post := _enrich_post(p_post, v_me);
  IF v_post IS NULL THEN RETURN '{"ok":false,"error":"Post introuvable"}'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(_enrich_post(r.id, v_me) ORDER BY r.created_at ASC), '[]'::jsonb) INTO v_replies
  FROM posts r WHERE r.reply_to = p_post AND r.deleted_at IS NULL;
  RETURN jsonb_build_object('ok', true, 'post', v_post, 'replies', v_replies);
END;
$$;

-- ── Posts d'un utilisateur (profil) ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_posts(p_user text, p_before timestamptz DEFAULT NULL, p_limit int DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_lim int; v_result jsonb;
BEGIN
  v_lim := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  SELECT COALESCE(jsonb_agg(_enrich_post(t.id, v_me) ORDER BY t.created_at DESC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT id, created_at FROM posts
    WHERE author_id = p_user AND reply_to IS NULL AND deleted_at IS NULL
      AND (p_before IS NULL OR created_at < p_before)
    ORDER BY created_at DESC LIMIT v_lim
  ) t;
  RETURN jsonb_build_object('ok', true, 'posts', v_result);
END;
$$;
