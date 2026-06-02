-- ═══════════════════════════════════════════════════════════════════════════
--  FIX — Messages d'erreur DM sans accents (évite le mojibake "RÃ©servÃ©")
--  Le client/SQL editor a stocké les accents en mauvais encodage. On repasse
--  les chaînes en ASCII pur. Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_or_create_dm(p_target text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_me   text := _resolve_discord_id();
  v_key  text;
  v_conv uuid;
  v_priv text;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Connexion requise"}'::jsonb; END IF;
  IF p_target = v_me THEN RETURN '{"ok":false,"error":"Conversation invalide"}'::jsonb; END IF;
  IF _is_blocked(v_me, p_target) THEN RETURN '{"ok":false,"error":"Action impossible (blocage)"}'::jsonb; END IF;

  v_priv := COALESCE((SELECT dm_privacy FROM profile_settings WHERE discord_id = p_target), 'friends');
  IF v_priv = 'nobody' THEN
    RETURN '{"ok":false,"error":"Ce membre n''accepte pas les messages"}'::jsonb;
  ELSIF v_priv = 'friends' AND NOT _are_friends(v_me, p_target) THEN
    RETURN '{"ok":false,"error":"Reserve a ses amis - suivez-vous mutuellement"}'::jsonb;
  END IF;

  v_key := CASE WHEN v_me < p_target THEN v_me || ':' || p_target ELSE p_target || ':' || v_me END;

  SELECT id INTO v_conv FROM conversations WHERE dm_key = v_key;
  IF v_conv IS NULL THEN
    INSERT INTO conversations (type, dm_key) VALUES ('dm', v_key)
    ON CONFLICT (dm_key) DO NOTHING
    RETURNING id INTO v_conv;
    IF v_conv IS NULL THEN
      SELECT id INTO v_conv FROM conversations WHERE dm_key = v_key;
    END IF;
    INSERT INTO conversation_participants (conversation_id, user_id) VALUES (v_conv, v_me), (v_conv, p_target)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('ok', true, 'conversation_id', v_conv);
END;
$$;
