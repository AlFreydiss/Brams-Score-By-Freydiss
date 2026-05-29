-- ═══════════════════════════════════════════════════════════════════════════
--  FIL — recherche d'utilisateurs (autocomplete @mentions)
--  RPC search_users(prefix) → [{uid, username, avatar_url}] par préfixe de pseudo.
--  Pré-requis : table users (bot).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION search_users(p_query text, p_limit int DEFAULT 6)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_pat text; v_result jsonb;
BEGIN
  IF p_query IS NULL OR length(trim(p_query)) < 1 THEN RETURN '[]'::jsonb; END IF;
  -- préfixe, méta-caractères LIKE échappés
  v_pat := lower(replace(replace(replace(trim(p_query), '\', '\\'), '%', '\%'), '_', '\_')) || '%';
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO v_result FROM (
    SELECT uid, data->>'username' AS username, data->>'avatar_url' AS avatar_url
    FROM users
    WHERE data->>'username' IS NOT NULL
      AND lower(data->>'username') LIKE v_pat ESCAPE '\'
    ORDER BY length(data->>'username') ASC, data->>'username' ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 6), 1), 10)
  ) r;
  RETURN v_result;
END;
$$;
