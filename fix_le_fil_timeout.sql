-- === FIX POUR LE FIL (timeout) ===
-- Colle TOUT ce fichier dans l'éditeur SQL de Supabase (https://supabase.com/dashboard/project/_/sql)
-- Puis clique "Run" ou "Execute".
-- Après, redéploie le site avec "vercel --prod" depuis le dossier brams-web-clone.

-- 1. Indexes pour accélérer les counts (like, reply, repost) et les checks "liked"
CREATE INDEX IF NOT EXISTS post_likes_post_user_idx ON post_likes(post_id, user_id);
CREATE INDEX IF NOT EXISTS posts_repost_idx ON posts(repost_of, created_at) WHERE repost_of IS NOT NULL AND deleted_at IS NULL;

-- 2. Remplace la fonction get_feed par une version bien plus rapide
-- (utilise des LATERAL JOINs au lieu d'appeler _enrich_post 20 fois avec des sous-requêtes)
-- Ça évite les timeouts sur le feed initial.
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

-- 3. (Optionnel mais recommandé) Vérifie que les autres index existent déjà
-- (ils sont dans la migration originale)

-- Après avoir exécuté ça :
-- 1. Rafraîchis la page du Fil (ou redémarre le dev server)
-- 2. Si tu es en prod, fais un nouveau deploy : vercel --prod
-- Le feed devrait maintenant charger sans timeout (même sur table avec beaucoup de posts).

-- Si tu as encore des problèmes, envoie les logs de la console navigateur (onglet Network + Console quand tu cliques Réessayer).