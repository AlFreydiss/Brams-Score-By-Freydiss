-- Followers + story feed fixes. Idempotent.
-- Requires social helpers (_resolve_discord_id, _notify) and stories.

CREATE TABLE IF NOT EXISTS user_follows (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  text NOT NULL,
  following_id text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (follower_id <> following_id),
  UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS user_follows_follower_idx ON user_follows(follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_follows_following_idx ON user_follows(following_id, created_at DESC);

CREATE TABLE IF NOT EXISTS story_views (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS story_views_story_idx ON story_views(story_id);
CREATE INDEX IF NOT EXISTS story_views_viewer_idx ON story_views(viewer_id, created_at DESC);

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_follows' AND policyname='user_follows_public_read') THEN
    CREATE POLICY user_follows_public_read ON user_follows FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='story_views' AND policyname='story_views_public_read') THEN
    CREATE POLICY story_views_public_read ON story_views FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='user_follows') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_follows;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION follow_user(p_target text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_me text := _resolve_discord_id();
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

  IF p_target <> v_me THEN
    PERFORM _notify(p_target, 'new_follower', 'Nouvel abonne', 'te suit maintenant',
      '/u/' || v_me, jsonb_build_object('from', v_me));
  END IF;

  RETURN jsonb_build_object('ok', true, 'following', true);
END;
$$;

CREATE OR REPLACE FUNCTION unfollow_user(p_target text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id();
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifie"}'::jsonb; END IF;
  DELETE FROM user_follows WHERE follower_id = v_me AND following_id = p_target;
  RETURN jsonb_build_object('ok', true, 'following', false);
END;
$$;

CREATE OR REPLACE FUNCTION get_follow_state(p_target text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE
  v_me text := _resolve_discord_id();
  v_following boolean := false;
  v_follows_me boolean := false;
  v_followers int := 0;
  v_following_count int := 0;
BEGIN
  IF p_target IS NULL OR trim(p_target) = '' THEN RETURN '{"ok":false,"error":"Cible invalide"}'::jsonb; END IF;

  SELECT count(*) INTO v_followers FROM user_follows WHERE following_id = p_target;
  SELECT count(*) INTO v_following_count FROM user_follows WHERE follower_id = p_target;

  IF v_me IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM user_follows WHERE follower_id = v_me AND following_id = p_target) INTO v_following;
    SELECT EXISTS (SELECT 1 FROM user_follows WHERE follower_id = p_target AND following_id = v_me) INTO v_follows_me;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'following', v_following,
    'follows_me', v_follows_me,
    'followers_count', v_followers,
    'following_count', v_following_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION list_following()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_result jsonb;
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT f.following_id AS user_id, u.data->>'username' AS username, u.data->>'avatar_url' AS avatar_url, f.created_at
    FROM user_follows f
    LEFT JOIN users u ON u.uid = f.following_id
    WHERE f.follower_id = v_me
  ) r;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION list_followers(p_user text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_target text := COALESCE(NULLIF(p_user, ''), v_me); v_result jsonb;
BEGIN
  IF v_target IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT f.follower_id AS user_id, u.data->>'username' AS username, u.data->>'avatar_url' AS avatar_url, f.created_at
    FROM user_follows f
    LEFT JOIN users u ON u.uid = f.follower_id
    WHERE f.following_id = v_target
  ) r;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION mark_story_seen(p_story uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_author text;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false}'::jsonb; END IF;
  SELECT author_id INTO v_author FROM stories WHERE id = p_story AND expires_at > now();
  IF v_author IS NULL THEN RETURN '{"ok":false}'::jsonb; END IF;
  IF v_author = v_me THEN RETURN '{"ok":true}'::jsonb; END IF;
  INSERT INTO story_views (story_id, viewer_id) VALUES (p_story, v_me) ON CONFLICT DO NOTHING;
  RETURN '{"ok":true}'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION list_story_viewers(p_story uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_author text; v_result jsonb;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifie"}'::jsonb; END IF;
  SELECT author_id INTO v_author FROM stories WHERE id = p_story;
  IF v_author IS NULL THEN RETURN '{"ok":false,"error":"Story introuvable"}'::jsonb; END IF;
  IF v_author <> v_me THEN RETURN '{"ok":false,"error":"Reserve a l''auteur"}'::jsonb; END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT sv.viewer_id AS uid, u.data->>'username' AS username, u.data->>'avatar_url' AS avatar, sv.created_at
    FROM story_views sv
    LEFT JOIN users u ON u.uid = sv.viewer_id
    WHERE sv.story_id = p_story
  ) r;

  RETURN jsonb_build_object('ok', true, 'viewers', v_result);
END;
$$;

CREATE OR REPLACE FUNCTION list_active_stories()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.sort_bucket ASC, r.latest_at DESC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      s.author_id,
      u.data->>'username' AS username,
      u.data->>'avatar_url' AS avatar,
      max(s.created_at) AS latest_at,
      CASE
        WHEN v_me IS NOT NULL AND s.author_id = v_me THEN 0
        WHEN v_me IS NOT NULL AND EXISTS (SELECT 1 FROM user_follows f WHERE f.follower_id = v_me AND f.following_id = s.author_id) THEN 1
        ELSE 2
      END AS sort_bucket,
      bool_and(v_me IS NOT NULL AND EXISTS (SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.viewer_id = v_me)) AS all_seen,
      jsonb_agg(jsonb_build_object(
        'id', s.id,
        'media_url', s.media_url,
        'created_at', s.created_at,
        'views', COALESCE((SELECT count(*) FROM story_views WHERE story_id = s.id), 0),
        'seen', (v_me IS NOT NULL AND EXISTS (SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.viewer_id = v_me))
      ) ORDER BY s.created_at ASC) AS stories
    FROM stories s
    LEFT JOIN users u ON u.uid = s.author_id
    WHERE s.expires_at > now()
    GROUP BY s.author_id, u.data
  ) r;
  RETURN v_result;
END;
$$;
