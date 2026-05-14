-- Colle dans Supabase → SQL Editor → New query → Run
CREATE OR REPLACE FUNCTION public.members_by_rank(p_min_h float DEFAULT 0, p_max_h float DEFAULT 99999)
RETURNS TABLE(uid text, username text, avatar_url text, vocal_h numeric, berrys bigint)
LANGUAGE sql SECURITY DEFINER
AS $$
  WITH computed AS (
    SELECT
      u.uid,
      coalesce(u.data->>'username', concat('Pirate #', right(u.uid, 5))) AS username,
      u.data->>'avatar_url' AS avatar_url,
      round(coalesce((
        SELECT SUM(
          LEAST((s->>'end')::float8, extract(epoch from now())::float8)
          - GREATEST((s->>'start')::float8, (extract(epoch from now()) - 604800)::float8)
        )
        FROM jsonb_array_elements(coalesce(u.data->'vocal_sessions', '[]'::jsonb)) s
        WHERE (s->>'end')::float8 > (extract(epoch from now()) - 604800)::float8
      ), 0)::numeric / 3600, 1) AS vocal_h,
      coalesce((u.data->>'berrys')::bigint, 0) AS berrys
    FROM users u
    WHERE u.data IS NOT NULL
  )
  SELECT * FROM computed
  WHERE vocal_h >= p_min_h AND vocal_h < p_max_h
  ORDER BY vocal_h DESC;
$$;

REVOKE ALL ON FUNCTION public.members_by_rank(float, float) FROM public;
GRANT EXECUTE ON FUNCTION public.members_by_rank(float, float) TO anon;
