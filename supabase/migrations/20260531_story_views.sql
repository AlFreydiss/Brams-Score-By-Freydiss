-- ═══════════════════════════════════════════════════════════════════════════
--  FIL — vues de stories (qui a vu ta story)
--  Table story_views + mark_story_seen / list_story_viewers.
--  list_active_stories enrichi (seen par story + all_seen par auteur + views).
--  Pré-requis : 20260531_stories.sql.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS story_views (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);
CREATE INDEX IF NOT EXISTS story_views_story_idx ON story_views(story_id);

-- RLS activée SANS policy de lecture : accès uniquement via les RPC SECURITY
-- DEFINER (la liste des viewers est réservée à l'auteur).
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

-- ── Marquer une story comme vue ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION mark_story_seen(p_story uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_author text;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false}'::jsonb; END IF;
  SELECT author_id INTO v_author FROM stories WHERE id = p_story AND expires_at > now();
  IF v_author IS NULL THEN RETURN '{"ok":false}'::jsonb; END IF;
  IF v_author = v_me THEN RETURN '{"ok":true}'::jsonb; END IF;   -- on ne compte pas l'auteur
  INSERT INTO story_views (story_id, viewer_id) VALUES (p_story, v_me) ON CONFLICT DO NOTHING;
  RETURN '{"ok":true}'::jsonb;
END;
$$;

-- ── Liste des viewers d'une story (auteur uniquement) ─────────────────────────
CREATE OR REPLACE FUNCTION list_story_viewers(p_story uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_author text; v_result jsonb;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  SELECT author_id INTO v_author FROM stories WHERE id = p_story;
  IF v_author IS NULL THEN RETURN '{"ok":false,"error":"Story introuvable"}'::jsonb; END IF;
  IF v_author <> v_me THEN RETURN '{"ok":false,"error":"Réservé à l''auteur"}'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]'::jsonb) INTO v_result FROM (
    SELECT sv.viewer_id AS uid,
           (SELECT data->>'username'   FROM users WHERE uid = sv.viewer_id) AS username,
           (SELECT data->>'avatar_url' FROM users WHERE uid = sv.viewer_id) AS avatar,
           sv.created_at
    FROM story_views sv WHERE sv.story_id = p_story
  ) r;
  RETURN jsonb_build_object('ok', true, 'viewers', v_result);
END;
$$;

-- ── list_active_stories : + seen / all_seen / views + audio/musique (rep) ──
CREATE OR REPLACE FUNCTION list_active_stories()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(g) ORDER BY g.all_seen ASC, g.last_at DESC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      s.author_id,
      (SELECT data->>'username'   FROM users WHERE uid = s.author_id) AS username,
      (SELECT data->>'avatar_url' FROM users WHERE uid = s.author_id) AS avatar,
      max(s.created_at) AS last_at,
      bool_and(v_me IS NOT NULL AND EXISTS (SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.viewer_id = v_me)) AS all_seen,
      jsonb_agg(jsonb_build_object(
        'id', s.id,
        'media_url', s.media_url,
        'audio_url', s.audio_url,
        'music_title', s.music_title,
        'music_artist', s.music_artist,
        'created_at', s.created_at,
        'views', (SELECT count(*) FROM story_views WHERE story_id = s.id),
        'seen', (v_me IS NOT NULL AND EXISTS (SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.viewer_id = v_me))
      ) ORDER BY s.created_at ASC) AS stories
    FROM stories s
    WHERE s.expires_at > now()
    GROUP BY s.author_id
  ) g;
  RETURN jsonb_build_object('ok', true, 'authors', v_result);
END;
$$;
