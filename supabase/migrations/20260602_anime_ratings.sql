-- ════════════════════════════════════════════════════════════════════════════
--  NOTES & AVIS ANIME (anime_ratings) — étoiles communauté Brams sur l'AnimeHub
--  Pré-requis : 20260529_social_system.sql (_resolve_discord_id)
--  À exécuter dans le SQL Editor Supabase. Aucune fonction Vercel (RPC direct).
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS anime_ratings (
  anime_id   text NOT NULL,            -- id du catalogue (ex. 'onepiece', 'aot')
  user_id    text NOT NULL,            -- discord id résolu
  rating     int  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (anime_id, user_id)
);

ALTER TABLE anime_ratings ENABLE ROW LEVEL SECURITY;
-- Pas de policy directe : tout passe par les RPC SECURITY DEFINER.

-- ── Noter un anime (1..5, upsert) ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rate_anime(p_anime text, p_rating int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_clean text;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  v_clean := nullif(btrim(coalesce(p_anime, '')), '');
  IF v_clean IS NULL THEN RETURN '{"ok":false,"error":"Anime manquant"}'::jsonb; END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN RETURN '{"ok":false,"error":"Note invalide"}'::jsonb; END IF;
  INSERT INTO anime_ratings (anime_id, user_id, rating) VALUES (left(v_clean, 64), v_me, p_rating)
    ON CONFLICT (anime_id, user_id) DO UPDATE SET rating = excluded.rating, created_at = now();
  RETURN '{"ok":true}'::jsonb;
END;
$$;

-- ── Retirer sa note ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION unrate_anime(p_anime text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id();
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  DELETE FROM anime_ratings WHERE anime_id = p_anime AND user_id = v_me;
  RETURN '{"ok":true}'::jsonb;
END;
$$;

-- ── Toutes les notes agrégées { anime_id: { avg, count, mine } } ───────────────
CREATE OR REPLACE FUNCTION get_anime_ratings()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v jsonb;
BEGIN
  SELECT COALESCE(jsonb_object_agg(anime_id, obj), '{}'::jsonb) INTO v FROM (
    SELECT anime_id, jsonb_build_object(
      'avg',   round(avg(rating)::numeric, 1),
      'count', count(*),
      'mine',  max(rating) FILTER (WHERE user_id = v_me)
    ) AS obj
    FROM anime_ratings GROUP BY anime_id
  ) s;
  RETURN jsonb_build_object('ok', true, 'ratings', v);
END;
$$;
