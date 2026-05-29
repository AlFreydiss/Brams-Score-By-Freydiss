-- ═══════════════════════════════════════════════════════════════════════════
--  MESSAGES ÉPINGLÉS — phase 4+ réseau social
--  Colonnes pinned_at / pinned_by sur messages + RPC SECURITY DEFINER.
--  Idempotent. Pré-requis : 20260529_social_system.sql (messages, _is_participant,
--  _resolve_discord_id, _notify).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_by text;

-- Index partiel : ne couvre que les messages épinglés (liste = lecture fréquente,
-- volume faible). conversation_id + pinned_at DESC pour l'ordre d'affichage.
CREATE INDEX IF NOT EXISTS messages_pinned_idx
  ON messages(conversation_id, pinned_at DESC)
  WHERE pinned_at IS NOT NULL;

-- ── Épingler ──────────────────────────────────────────────────────────────────
-- Max 50 épinglés par conversation (comme Discord). Un message supprimé ne peut
-- pas être épinglé. Notifie l'autre participant (info, pas spam : seulement à l'épingle).
CREATE OR REPLACE FUNCTION pin_message(p_message uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_me text := _resolve_discord_id();
  v_conv uuid;
  v_deleted timestamptz;
  v_already timestamptz;
  v_count int;
  v_other text;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  SELECT conversation_id, deleted_at, pinned_at INTO v_conv, v_deleted, v_already
    FROM messages WHERE id = p_message;
  IF v_conv IS NULL THEN RETURN '{"ok":false,"error":"Message introuvable"}'::jsonb; END IF;
  IF NOT _is_participant(v_conv, v_me) THEN
    RETURN '{"ok":false,"error":"Accès refusé"}'::jsonb;
  END IF;
  IF v_deleted IS NOT NULL THEN
    RETURN '{"ok":false,"error":"Message supprimé"}'::jsonb;
  END IF;
  IF v_already IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'pinned_at', v_already);   -- déjà épinglé : no-op
  END IF;

  SELECT count(*) INTO v_count FROM messages
    WHERE conversation_id = v_conv AND pinned_at IS NOT NULL;
  IF v_count >= 50 THEN
    RETURN '{"ok":false,"error":"Limite de 50 messages épinglés atteinte"}'::jsonb;
  END IF;

  UPDATE messages SET pinned_at = now(), pinned_by = v_me WHERE id = p_message;

  SELECT user_id INTO v_other FROM conversation_participants
    WHERE conversation_id = v_conv AND user_id <> v_me LIMIT 1;
  IF v_other IS NOT NULL THEN
    PERFORM _notify(v_other, 'message_pinned', 'Message épinglé',
      'a épinglé un message dans votre conversation',
      '/messages/' || v_conv::text,
      jsonb_build_object('conversation_id', v_conv, 'message_id', p_message, 'from', v_me));
  END IF;

  RETURN jsonb_build_object('ok', true, 'pinned_at', now());
END;
$$;

-- ── Désépingler ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION unpin_message(p_message uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_me text := _resolve_discord_id(); v_conv uuid;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  SELECT conversation_id INTO v_conv FROM messages WHERE id = p_message;
  IF v_conv IS NULL THEN RETURN '{"ok":false,"error":"Message introuvable"}'::jsonb; END IF;
  IF NOT _is_participant(v_conv, v_me) THEN
    RETURN '{"ok":false,"error":"Accès refusé"}'::jsonb;
  END IF;
  UPDATE messages SET pinned_at = NULL, pinned_by = NULL WHERE id = p_message;
  RETURN '{"ok":true}'::jsonb;
END;
$$;

-- ── Liste des épinglés d'une conversation ────────────────────────────────────
-- Même forme de lignes que get_messages (pour réutiliser le rendu côté front).
CREATE OR REPLACE FUNCTION list_pinned_messages(p_conversation uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE v_me text := _resolve_discord_id(); v_result jsonb;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  IF NOT _is_participant(p_conversation, v_me) THEN
    RETURN '{"ok":false,"error":"Accès refusé"}'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.pinned_at DESC), '[]'::jsonb) INTO v_result FROM (
    SELECT
      m.id, m.sender_id, m.content, m.type, m.media_url, m.gif_url,
      m.voice_duration, m.reply_to_id, m.edited_at, m.deleted_at, m.created_at,
      m.pinned_at, m.pinned_by,
      u.data->>'username' AS sender_username,
      u.data->>'avatar_url' AS sender_avatar,
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('emoji', emoji, 'user_id', user_id)), '[]'::jsonb)
         FROM message_reactions WHERE message_id = m.id) AS reactions
    FROM messages m
    LEFT JOIN users u ON u.uid = m.sender_id
    WHERE m.conversation_id = p_conversation
      AND m.pinned_at IS NOT NULL
      AND m.deleted_at IS NULL
  ) r;
  RETURN jsonb_build_object('ok', true, 'messages', v_result);
END;
$$;

-- ── get_messages enrichi : expose pinned_at / pinned_by (pastille inline) ─────
CREATE OR REPLACE FUNCTION get_messages(p_conversation uuid, p_before timestamptz DEFAULT NULL, p_limit int DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE v_me text := _resolve_discord_id(); v_result jsonb; v_lim int;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  IF NOT _is_participant(p_conversation, v_me) THEN
    RETURN '{"ok":false,"error":"Accès refusé"}'::jsonb;
  END IF;
  v_lim := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 50);

  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.created_at ASC), '[]'::jsonb) INTO v_result FROM (
    SELECT
      m.id, m.sender_id, m.content, m.type, m.media_url, m.gif_url,
      m.voice_duration, m.reply_to_id, m.edited_at, m.deleted_at, m.created_at,
      m.pinned_at, m.pinned_by,
      u.data->>'username' AS sender_username,
      u.data->>'avatar_url' AS sender_avatar,
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('emoji', emoji, 'user_id', user_id)), '[]'::jsonb)
         FROM message_reactions WHERE message_id = m.id) AS reactions
    FROM messages m
    LEFT JOIN users u ON u.uid = m.sender_id
    WHERE m.conversation_id = p_conversation
      AND (p_before IS NULL OR m.created_at < p_before)
    ORDER BY m.created_at DESC
    LIMIT v_lim
  ) r;
  RETURN jsonb_build_object('ok', true, 'messages', v_result);
END;
$$;
