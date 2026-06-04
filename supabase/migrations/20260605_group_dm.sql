-- ─────────────────────────────────────────────────────────────────────────────
--  GROUPES DM — conversations de groupe (type 'group')
--  Pré-requis : 20260529_social_system.sql
--  - autorise conversations.type = 'group'
--  - create_group_conversation / rename_conversation / leave_conversation / add_group_members
--  - list_conversations enrichi (title, is_group, member_count, members[])
--  - send_message notifie TOUS les autres participants (groupe), block-check DM only
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_type_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_type_check CHECK (type IN ('dm','staff','group'));

-- ── Créer un groupe ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_group_conversation(p_title text, p_members text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_me text := _resolve_discord_id(); v_conv uuid; v_m text; v_title text; v_count int;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  v_title := NULLIF(btrim(COALESCE(p_title, '')), '');
  IF v_title IS NULL THEN v_title := 'Groupe'; END IF;
  v_title := left(v_title, 60);

  SELECT count(*) INTO v_count FROM (
    SELECT DISTINCT unnest(p_members) AS m
  ) s WHERE s.m IS NOT NULL AND s.m <> '' AND s.m <> v_me;
  IF v_count < 1 THEN RETURN '{"ok":false,"error":"Ajoute au moins un membre"}'::jsonb; END IF;
  IF v_count > 49 THEN RETURN '{"ok":false,"error":"Trop de membres (max 50)"}'::jsonb; END IF;

  INSERT INTO conversations (type, title) VALUES ('group', v_title) RETURNING id INTO v_conv;
  INSERT INTO conversation_participants (conversation_id, user_id, role) VALUES (v_conv, v_me, 'admin');

  FOR v_m IN SELECT DISTINCT unnest(p_members) LOOP
    IF v_m IS NOT NULL AND v_m <> '' AND v_m <> v_me THEN
      INSERT INTO conversation_participants (conversation_id, user_id) VALUES (v_conv, v_m)
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
      PERFORM _notify(v_m, 'new_message', 'Nouveau groupe', v_title,
        '/messages/' || v_conv::text, jsonb_build_object('conversation_id', v_conv, 'from', v_me));
    END IF;
  END LOOP;

  INSERT INTO messages (conversation_id, sender_id, content, type)
    VALUES (v_conv, v_me, 'a créé le groupe « ' || v_title || ' »', 'system');
  UPDATE conversations SET last_message_at = now(), updated_at = now() WHERE id = v_conv;

  RETURN jsonb_build_object('ok', true, 'conversation_id', v_conv);
END;
$$;

-- ── Renommer un groupe ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rename_conversation(p_conversation uuid, p_title text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_me text := _resolve_discord_id(); v_title text;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  IF NOT _is_participant(p_conversation, v_me) THEN RETURN '{"ok":false,"error":"Accès refusé"}'::jsonb; END IF;
  v_title := left(NULLIF(btrim(COALESCE(p_title, '')), ''), 60);
  IF v_title IS NULL THEN RETURN '{"ok":false,"error":"Nom vide"}'::jsonb; END IF;
  UPDATE conversations SET title = v_title, updated_at = now()
    WHERE id = p_conversation AND type = 'group';
  INSERT INTO messages (conversation_id, sender_id, content, type)
    VALUES (p_conversation, v_me, 'a renommé le groupe en « ' || v_title || ' »', 'system');
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── Ajouter des membres ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION add_group_members(p_conversation uuid, p_members text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_me text := _resolve_discord_id(); v_m text; v_added int := 0;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  IF NOT _is_participant(p_conversation, v_me) THEN RETURN '{"ok":false,"error":"Accès refusé"}'::jsonb; END IF;
  FOR v_m IN SELECT DISTINCT unnest(p_members) LOOP
    IF v_m IS NOT NULL AND v_m <> '' AND NOT _is_participant(p_conversation, v_m) THEN
      INSERT INTO conversation_participants (conversation_id, user_id) VALUES (p_conversation, v_m)
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
      v_added := v_added + 1;
      PERFORM _notify(v_m, 'new_message', 'Ajouté à un groupe',
        (SELECT COALESCE(title, 'Groupe') FROM conversations WHERE id = p_conversation),
        '/messages/' || p_conversation::text, jsonb_build_object('conversation_id', p_conversation, 'from', v_me));
    END IF;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'added', v_added);
END;
$$;

-- ── Quitter une conversation (groupe) ────────────────────────────────────────
CREATE OR REPLACE FUNCTION leave_conversation(p_conversation uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_me text := _resolve_discord_id(); v_left int;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  DELETE FROM conversation_participants WHERE conversation_id = p_conversation AND user_id = v_me;
  SELECT count(*) INTO v_left FROM conversation_participants WHERE conversation_id = p_conversation;
  IF v_left = 0 THEN
    DELETE FROM conversations WHERE id = p_conversation;
  ELSE
    INSERT INTO messages (conversation_id, sender_id, content, type)
      VALUES (p_conversation, v_me, 'a quitté le groupe', 'system');
    UPDATE conversations SET last_message_at = now() WHERE id = p_conversation;
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── list_conversations : titre + groupe + membres ────────────────────────────
CREATE OR REPLACE FUNCTION list_conversations()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE v_me text := _resolve_discord_id(); v_result jsonb;
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO v_result FROM (
    SELECT
      c.id AS conversation_id,
      c.type,
      c.title,
      (c.type = 'group') AS is_group,
      c.last_message_at,
      other.user_id           AS other_id,
      ou.data->>'username'     AS other_username,
      ou.data->>'avatar_url'   AS other_avatar,
      (SELECT count(*) FROM conversation_participants p WHERE p.conversation_id = c.id) AS member_count,
      (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'user_id', p.user_id,
                'username', pu.data->>'username',
                'avatar_url', pu.data->>'avatar_url')), '[]'::jsonb)
         FROM conversation_participants p
         LEFT JOIN users pu ON pu.uid = p.user_id
         WHERE p.conversation_id = c.id) AS members,
      lm.content              AS last_content,
      lm.type                 AS last_type,
      lm.sender_id            AS last_sender,
      (SELECT count(*) FROM messages m
        WHERE m.conversation_id = c.id
          AND m.created_at > me.last_read_at
          AND m.sender_id <> v_me
          AND m.deleted_at IS NULL) AS unread
    FROM conversation_participants me
    JOIN conversations c ON c.id = me.conversation_id
    LEFT JOIN conversation_participants other
      ON other.conversation_id = c.id AND other.user_id <> v_me AND c.type <> 'group'
    LEFT JOIN users ou ON ou.uid = other.user_id
    LEFT JOIN LATERAL (
      SELECT content, type, sender_id FROM messages
      WHERE conversation_id = c.id AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 1
    ) lm ON true
    WHERE me.user_id = v_me AND me.archived = false
    ORDER BY c.last_message_at DESC
  ) r;
  RETURN v_result;
END;
$$;

-- ── send_message : notifier tous les participants (groupe), block-check DM only ─
CREATE OR REPLACE FUNCTION send_message(
  p_conversation  uuid,
  p_content       text DEFAULT NULL,
  p_type          text DEFAULT 'text',
  p_media_url     text DEFAULT NULL,
  p_gif_url       text DEFAULT NULL,
  p_voice_duration int DEFAULT NULL,
  p_reply_to      uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_me text := _resolve_discord_id();
  v_other text;
  v_type text;
  v_title text;
  v_msg_id uuid;
  v_recent int;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  IF NOT _is_participant(p_conversation, v_me) THEN
    RETURN '{"ok":false,"error":"Accès refusé"}'::jsonb;
  END IF;

  IF p_type NOT IN ('text','voice','gif','image') THEN
    RETURN '{"ok":false,"error":"Type de message invalide"}'::jsonb;
  END IF;
  IF p_type = 'text' THEN
    IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
      RETURN '{"ok":false,"error":"Message vide"}'::jsonb;
    END IF;
    IF length(p_content) > 4000 THEN
      RETURN '{"ok":false,"error":"Message trop long (max 4000)"}'::jsonb;
    END IF;
  END IF;
  IF p_gif_url IS NOT NULL AND p_gif_url !~ '^https://' THEN
    RETURN '{"ok":false,"error":"URL GIF invalide"}'::jsonb;
  END IF;
  IF p_media_url IS NOT NULL AND p_media_url !~ '^https://' THEN
    RETURN '{"ok":false,"error":"URL média invalide"}'::jsonb;
  END IF;

  SELECT type, COALESCE(title, 'Groupe') INTO v_type, v_title FROM conversations WHERE id = p_conversation;

  -- DM : vérifier blocage avec l'autre participant
  IF v_type = 'dm' THEN
    SELECT user_id INTO v_other FROM conversation_participants
    WHERE conversation_id = p_conversation AND user_id <> v_me LIMIT 1;
    IF v_other IS NOT NULL AND _is_blocked(v_me, v_other) THEN
      RETURN '{"ok":false,"error":"Action impossible (blocage)"}'::jsonb;
    END IF;
  END IF;

  SELECT count(*) INTO v_recent FROM messages
  WHERE sender_id = v_me AND created_at > now() - interval '10 seconds';
  IF v_recent >= 10 THEN
    RETURN '{"ok":false,"error":"Tu envoies trop vite, ralentis"}'::jsonb;
  END IF;

  INSERT INTO messages (conversation_id, sender_id, content, type, media_url, gif_url, voice_duration, reply_to_id)
  VALUES (p_conversation, v_me, p_content, p_type, p_media_url, p_gif_url, p_voice_duration, p_reply_to)
  RETURNING id INTO v_msg_id;

  UPDATE conversations SET last_message_at = now(), updated_at = now() WHERE id = p_conversation;

  -- Notifier tous les autres participants (DM ou groupe)
  PERFORM _notify(p.user_id, 'new_message',
      CASE WHEN v_type = 'group' THEN v_title ELSE 'Nouveau message' END,
      COALESCE(left(p_content, 80), 'a envoyé un message'),
      '/messages/' || p_conversation::text,
      jsonb_build_object('conversation_id', p_conversation, 'from', v_me))
  FROM conversation_participants p
  WHERE p.conversation_id = p_conversation AND p.user_id <> v_me;

  RETURN jsonb_build_object('ok', true, 'message_id', v_msg_id);
END;
$$;
