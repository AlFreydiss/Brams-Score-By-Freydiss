-- ═══════════════════════════════════════════════════════════════════════════
--  FIL — Stories (éphémères 24h, façon Instagram)
--  Table stories + RPC create_story / list_active_stories / delete_story.
--  Pré-requis : 20260529_social_system.sql (_resolve_discord_id, users).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id  text NOT NULL,
  media_url  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
-- NB : pas de predicate "WHERE expires_at > now()" (now() n'est pas IMMUTABLE → erreur 42P17 sur l'index).
CREATE INDEX IF NOT EXISTS stories_active_idx ON stories(expires_at);
CREATE INDEX IF NOT EXISTS stories_author_idx ON stories(author_id, created_at);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stories' AND policyname='stories_public_read') THEN
    CREATE POLICY stories_public_read ON stories FOR SELECT USING (true);
  END IF;
END $$;

-- ── Publier une story ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_story(p_media_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_id uuid; v_recent int;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  IF p_media_url IS NULL OR p_media_url !~ '^https://' THEN
    RETURN '{"ok":false,"error":"Image invalide"}'::jsonb;
  END IF;
  SELECT count(*) INTO v_recent FROM stories WHERE author_id = v_me AND created_at > now() - interval '24 hours';
  IF v_recent >= 20 THEN RETURN '{"ok":false,"error":"Trop de stories (max 20 / 24h)"}'::jsonb; END IF;
  INSERT INTO stories (author_id, media_url) VALUES (v_me, p_media_url) RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'story_id', v_id);
END;
$$;

-- ── Stories actives groupées par auteur (les plus récentes d'abord) ───────────
CREATE OR REPLACE FUNCTION list_active_stories()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(g) ORDER BY g.last_at DESC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      s.author_id,
      (SELECT data->>'username'   FROM users WHERE uid = s.author_id) AS username,
      (SELECT data->>'avatar_url' FROM users WHERE uid = s.author_id) AS avatar,
      max(s.created_at) AS last_at,
      jsonb_agg(jsonb_build_object('id', s.id, 'media_url', s.media_url, 'created_at', s.created_at) ORDER BY s.created_at ASC) AS stories
    FROM stories s
    WHERE s.expires_at > now()
    GROUP BY s.author_id
  ) g;
  RETURN jsonb_build_object('ok', true, 'authors', v_result);
END;
$$;

-- ── Supprimer une de ses stories ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION delete_story(p_story uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_author text;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  SELECT author_id INTO v_author FROM stories WHERE id = p_story;
  IF v_author IS NULL THEN RETURN '{"ok":false,"error":"Story introuvable"}'::jsonb; END IF;
  IF v_author <> v_me THEN RETURN '{"ok":false,"error":"Pas ta story"}'::jsonb; END IF;
  DELETE FROM stories WHERE id = p_story;
  RETURN '{"ok":true}'::jsonb;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
--  EXTENSION : support musique / son dans les stories (comme Insta)
--  Ajoute colonnes audio + métadonnées + met à jour les RPC create + list
--  (à exécuter sur la DB si les colonnes n'existent pas encore)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stories' AND column_name='audio_url') THEN
    ALTER TABLE stories ADD COLUMN audio_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stories' AND column_name='music_title') THEN
    ALTER TABLE stories ADD COLUMN music_title text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stories' AND column_name='music_artist') THEN
    ALTER TABLE stories ADD COLUMN music_artist text;
  END IF;
END $$;

-- create_story mis à jour (accepte optionnellement audio + titre)
CREATE OR REPLACE FUNCTION create_story(p_media_url text, p_audio_url text DEFAULT NULL, p_music_title text DEFAULT NULL, p_music_artist text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_id uuid; v_recent int;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  IF p_media_url IS NULL OR p_media_url !~ '^https://' THEN
    RETURN '{"ok":false,"error":"Média invalide"}'::jsonb;
  END IF;
  SELECT count(*) INTO v_recent FROM stories WHERE author_id = v_me AND created_at > now() - interval '24 hours';
  IF v_recent >= 20 THEN RETURN '{"ok":false,"error":"Trop de stories (max 20 / 24h)"}'::jsonb; END IF;
  INSERT INTO stories (author_id, media_url, audio_url, music_title, music_artist)
  VALUES (v_me, p_media_url, p_audio_url, p_music_title, p_music_artist)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'story_id', v_id);
END;
$$;

-- list_active_stories mis à jour : renvoie aussi audio + titres dans chaque story
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
