-- DM call history. Idempotent and scoped through SECURITY DEFINER.
-- Requires 20260529_social_system.sql (_resolve_discord_id, _is_participant, messages).

CREATE OR REPLACE FUNCTION log_call_event(
  p_conversation uuid,
  p_status text,
  p_duration int DEFAULT NULL,
  p_call_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me text := _resolve_discord_id();
  v_id uuid;
  v_content text;
BEGIN
  IF v_me IS NULL THEN
    RETURN '{"ok":false,"error":"Connexion requise"}'::jsonb;
  END IF;

  IF p_status NOT IN ('started','missed','rejected','busy','failed','ended') THEN
    RETURN '{"ok":false,"error":"Statut d''appel invalide"}'::jsonb;
  END IF;

  IF NOT _is_participant(p_conversation, v_me) THEN
    RETURN '{"ok":false,"error":"Conversation interdite"}'::jsonb;
  END IF;

  v_content := CASE p_status
    WHEN 'started'  THEN 'Appel démarré'
    WHEN 'missed'   THEN 'Appel manqué'
    WHEN 'rejected' THEN 'Appel refusé'
    WHEN 'busy'     THEN 'Correspondant occupé'
    WHEN 'failed'   THEN 'Appel impossible'
    ELSE 'Appel terminé'
  END;

  INSERT INTO messages (conversation_id, sender_id, content, type, voice_duration)
  VALUES (p_conversation, v_me, v_content, 'call', GREATEST(COALESCE(p_duration, 0), 0))
  RETURNING id INTO v_id;

  UPDATE conversations
  SET last_message_at = now(), updated_at = now()
  WHERE id = p_conversation;

  RETURN jsonb_build_object('ok', true, 'message_id', v_id, 'call_id', p_call_id);
END;
$$;
