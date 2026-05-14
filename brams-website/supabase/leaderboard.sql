-- Colle ce SQL dans Supabase → SQL Editor → New query → Run
-- Permet au site d'afficher le vrai classement vocal en direct

CREATE OR REPLACE FUNCTION public.top_classement(p_limit int DEFAULT 10)
RETURNS TABLE(uid text, username text, avatar_url text, vocal_h numeric, berrys bigint)
LANGUAGE sql SECURITY DEFINER
AS $$
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
  ORDER BY vocal_h DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.top_classement(int) FROM public;
GRANT EXECUTE ON FUNCTION public.top_classement(int) TO anon;
