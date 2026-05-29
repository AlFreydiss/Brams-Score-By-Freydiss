-- ═══════════════════════════════════════════════════════════════════════════
--  RECHERCHE DANS LA CONVERSATION — phase 4+ réseau social
--  RPC SECURITY DEFINER : recherche le texte des messages d'une conversation.
--  Idempotent. Pré-requis : 20260529_social_system.sql (messages, _is_participant).
-- ═══════════════════════════════════════════════════════════════════════════

-- Recherche trigram (ILIKE rapide). pg_trgm est dispo sur Supabase.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS messages_content_trgm_idx
  ON messages USING gin (content gin_trgm_ops)
  WHERE deleted_at IS NULL;

-- p_query : terme recherché (≥ 2 caractères). Renvoie au plus 50 messages texte
-- non supprimés contenant le terme, du plus récent au plus ancien. Même forme de
-- lignes que get_messages pour réutiliser le rendu côté front.
CREATE OR REPLACE FUNCTION search_messages(p_conversation uuid, p_query text, p_limit int DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE
  v_me text := _resolve_discord_id();
  v_result jsonb;
  v_lim int;
  v_pattern text;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  IF NOT _is_participant(p_conversation, v_me) THEN
    RETURN '{"ok":false,"error":"Accès refusé"}'::jsonb;
  END IF;
  IF p_query IS NULL OR length(trim(p_query)) < 2 THEN
    RETURN jsonb_build_object('ok', true, 'messages', '[]'::jsonb);
  END IF;
  v_lim := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 50);
  -- Échappe les méta-caractères ILIKE pour traiter la requête comme du texte littéral.
  v_pattern := '%' || replace(replace(replace(trim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]'::jsonb) INTO v_result FROM (
    SELECT
      m.id, m.sender_id, m.content, m.type, m.media_url, m.gif_url,
      m.voice_duration, m.reply_to_id, m.edited_at, m.deleted_at, m.created_at,
      m.pinned_at, m.pinned_by,
      u.data->>'username' AS sender_username,
      u.data->>'avatar_url' AS sender_avatar
    FROM messages m
    LEFT JOIN users u ON u.uid = m.sender_id
    WHERE m.conversation_id = p_conversation
      AND m.deleted_at IS NULL
      AND m.content IS NOT NULL
      AND m.content ILIKE v_pattern ESCAPE '\'
    ORDER BY m.created_at DESC
    LIMIT v_lim
  ) r;
  RETURN jsonb_build_object('ok', true, 'messages', v_result);
END;
$$;
