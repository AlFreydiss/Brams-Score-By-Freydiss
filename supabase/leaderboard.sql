-- Colle ce SQL dans Supabase → SQL Editor → New query → Run
-- Permet au site d'afficher le vrai classement vocal en direct

DROP FUNCTION IF EXISTS public.top_classement(int);

CREATE OR REPLACE FUNCTION public.top_classement(p_limit int DEFAULT 10, p_period text DEFAULT 'week')
RETURNS TABLE(uid text, username text, avatar_url text, vocal_h numeric, berrys bigint)
LANGUAGE sql SECURITY DEFINER
AS $$
  WITH params AS (
    SELECT
      extract(epoch from now())::float8 AS now_ts,
      CASE lower(coalesce(p_period, 'week'))
        WHEN 'day' THEN 1
        WHEN 'today' THEN 1
        WHEN 'week' THEN 7
        WHEN '7d' THEN 7
        WHEN 'month' THEN 30
        WHEN '30d' THEN 30
        ELSE NULL
      END AS days
  ),
  computed AS (
  SELECT
    u.uid,
    coalesce(u.data->>'username', concat('Pirate #', right(u.uid, 5))) AS username,
    u.data->>'avatar_url' AS avatar_url,
    round((
      CASE
        WHEN params.days IS NULL THEN
          coalesce((
            SELECT SUM(GREATEST(0, least((s->>'end')::float8, params.now_ts) - (s->>'start')::float8))
            FROM jsonb_array_elements(coalesce(u.data->'vocal_sessions', '[]'::jsonb)) s
            WHERE s ? 'start' AND s ? 'end'
          ), 0)
          + coalesce((u.data->>'extra_seconds')::float8, 0)
          + CASE
              WHEN coalesce((u.data->>'join_time')::float8, 0) > 0
              THEN GREATEST(0, params.now_ts - (u.data->>'join_time')::float8)
              ELSE 0
            END
        ELSE
          coalesce((
            SELECT SUM(
              -- plafond anti-fantôme 24h/session (= bot seconds_since / api leaderboard)
              LEAST(
                GREATEST(
                  0,
                  LEAST((s->>'end')::float8, params.now_ts)
                  - GREATEST((s->>'start')::float8, params.now_ts - params.days * 86400)
                ),
                86400
              )
            )
            FROM jsonb_array_elements(coalesce(u.data->'vocal_sessions', '[]'::jsonb)) s
            WHERE s ? 'start'
              AND s ? 'end'
              AND (s->>'end')::float8 >= (params.now_ts - params.days * 86400)
          ), 0)
          + CASE
              WHEN coalesce((u.data->>'join_time')::float8, 0) > 0
              THEN LEAST(GREATEST(0, params.now_ts - GREATEST((u.data->>'join_time')::float8, params.now_ts - params.days * 86400)), 86400)
              ELSE 0
            END
      END
    )::numeric / 3600, 1) AS vocal_h,
    coalesce((u.data->>'berrys')::bigint, 0) AS berrys
  FROM users u
  CROSS JOIN params
  WHERE u.data IS NOT NULL
  )
  SELECT *
  FROM computed
  ORDER BY vocal_h DESC, berrys DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.top_classement(int, text) FROM public;
GRANT EXECUTE ON FUNCTION public.top_classement(int, text) TO anon;
