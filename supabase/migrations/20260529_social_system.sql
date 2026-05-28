-- ═══════════════════════════════════════════════════════════════════════════
--  SYSTÈME SOCIAL BRAMS — Phase 1 + 2
--  Amis · Blocage · Conversations DM · Messages · Réactions · Notifications
--  ───────────────────────────────────────────────────────────────────────────
--  Identité : discord_id (text) — cohérent avec users.uid et user_inventory.
--  Sécurité : tout passe par des RPC SECURITY DEFINER. RLS = lecture seule
--             de SES propres données (nécessaire pour Supabase Realtime).
--             Aucune écriture directe possible côté client.
--  Idempotent : sûr à relancer.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Pré-requis : _resolve_discord_id() (défini dans 20260529_fix_discord_resolution.sql)
-- On le redéfinit ici en filet de sécurité au cas où cette migration tourne seule.
CREATE OR REPLACE FUNCTION _resolve_discord_id()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_discord_id text;
BEGIN
  SELECT COALESCE(
    raw_user_meta_data->>'provider_id',
    raw_user_meta_data->'custom_claims'->>'provider_id',
    (SELECT identity_data->>'provider_id' FROM auth.identities
       WHERE user_id = auth.uid() AND provider = 'discord' LIMIT 1),
    (SELECT identity_data->>'sub' FROM auth.identities
       WHERE user_id = auth.uid() AND provider = 'discord' LIMIT 1)
  ) INTO v_discord_id
  FROM auth.users WHERE id = auth.uid();
  RETURN v_discord_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
--  TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Amitiés (demandes + amis) ─────────────────────────────────────────────────
-- status : 'pending' (demande en attente) | 'accepted' (amis)
-- La direction compte tant que pending (requester a demandé à addressee).
CREATE TABLE IF NOT EXISTS friendships (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  text NOT NULL,
  addressee_id  text NOT NULL,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (requester_id <> addressee_id),
  UNIQUE (requester_id, addressee_id)
);
CREATE INDEX IF NOT EXISTS friendships_requester_idx ON friendships(requester_id, status);
CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON friendships(addressee_id, status);

-- ── Blocages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  text NOT NULL,
  blocked_id  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (blocker_id <> blocked_id),
  UNIQUE (blocker_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON user_blocks(blocked_id);

-- ── Conversations ───────────────────────────────────────────────────────────
-- type : 'dm' (1-to-1) | 'staff' (réservé staff, Phase 3)
-- dm_key : clé canonique "min:max" des 2 discord_id pour empêcher les doublons DM.
CREATE TABLE IF NOT EXISTS conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            text NOT NULL DEFAULT 'dm' CHECK (type IN ('dm','staff')),
  dm_key          text UNIQUE,
  title           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_last_msg_idx ON conversations(last_message_at DESC);

-- ── Participants ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_participants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         text NOT NULL,
  role            text NOT NULL DEFAULT 'member',
  last_read_at    timestamptz NOT NULL DEFAULT now(),
  muted           boolean NOT NULL DEFAULT false,
  archived        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS conv_participants_user_idx ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS conv_participants_conv_idx ON conversation_participants(conversation_id);

-- ── Messages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       text NOT NULL,
  content         text,
  type            text NOT NULL DEFAULT 'text' CHECK (type IN ('text','voice','gif','image','system','call')),
  media_url       text,
  gif_url         text,
  voice_duration  integer,
  reply_to_id     uuid REFERENCES messages(id) ON DELETE SET NULL,
  edited_at       timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conv_created_idx ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON messages(sender_id);

-- ── Réactions ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_reactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     text NOT NULL,
  emoji       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS message_reactions_msg_idx ON message_reactions(message_id);

-- ── Notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL,
  type        text NOT NULL,
  title       text NOT NULL DEFAULT '',
  body        text NOT NULL DEFAULT '',
  link        text,
  data        jsonb NOT NULL DEFAULT '{}',
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, read_at, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
--  HELPERS internes (non exposés directement)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION _are_friends(a text, b text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
      AND ((requester_id = a AND addressee_id = b)
        OR (requester_id = b AND addressee_id = a))
  );
$$;

CREATE OR REPLACE FUNCTION _is_blocked(a text, b text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  -- True si a a bloqué b OU b a bloqué a
  SELECT EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = a AND blocked_id = b)
       OR (blocker_id = b AND blocked_id = a)
  );
$$;

CREATE OR REPLACE FUNCTION _is_participant(p_conv uuid, p_user text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conv AND user_id = p_user
  );
$$;

CREATE OR REPLACE FUNCTION _notify(p_user text, p_type text, p_title text, p_body text, p_link text, p_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link, data)
  VALUES (p_user, p_type, p_title, p_body, p_link, COALESCE(p_data, '{}'::jsonb));
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
--  RPC — AMIS / BLOCAGE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION send_friend_request(p_target text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_me text := _resolve_discord_id();
  v_existing friendships%ROWTYPE;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  IF p_target IS NULL OR p_target = '' THEN RETURN '{"ok":false,"error":"Cible invalide"}'::jsonb; END IF;
  IF p_target = v_me THEN RETURN '{"ok":false,"error":"Tu ne peux pas t''ajouter toi-même"}'::jsonb; END IF;
  IF _is_blocked(v_me, p_target) THEN RETURN '{"ok":false,"error":"Action impossible (blocage)"}'::jsonb; END IF;

  -- Déjà une relation dans un sens ou l'autre ?
  SELECT * INTO v_existing FROM friendships
  WHERE (requester_id = v_me AND addressee_id = p_target)
     OR (requester_id = p_target AND addressee_id = v_me);

  IF FOUND THEN
    IF v_existing.status = 'accepted' THEN
      RETURN '{"ok":false,"error":"Vous êtes déjà amis"}'::jsonb;
    END IF;
    -- Demande inverse en attente → on accepte directement
    IF v_existing.requester_id = p_target THEN
      UPDATE friendships SET status = 'accepted', updated_at = now() WHERE id = v_existing.id;
      PERFORM _notify(p_target, 'friend_accepted', 'Demande acceptée',
        'Votre demande d''ami a été acceptée', '/amis', jsonb_build_object('user_id', v_me));
      RETURN '{"ok":true,"status":"friends"}'::jsonb;
    END IF;
    RETURN '{"ok":false,"error":"Demande déjà envoyée"}'::jsonb;
  END IF;

  INSERT INTO friendships (requester_id, addressee_id, status)
  VALUES (v_me, p_target, 'pending');
  PERFORM _notify(p_target, 'friend_request', 'Nouvelle demande d''ami',
    'Vous avez reçu une demande d''ami', '/amis', jsonb_build_object('user_id', v_me));
  RETURN '{"ok":true,"status":"pending_sent"}'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION respond_friend_request(p_request_id uuid, p_accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_me text := _resolve_discord_id();
  v_req friendships%ROWTYPE;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  SELECT * INTO v_req FROM friendships WHERE id = p_request_id;
  IF NOT FOUND THEN RETURN '{"ok":false,"error":"Demande introuvable"}'::jsonb; END IF;
  IF v_req.addressee_id <> v_me THEN
    RETURN '{"ok":false,"error":"Cette demande ne t''est pas adressée"}'::jsonb;
  END IF;
  IF v_req.status <> 'pending' THEN RETURN '{"ok":false,"error":"Demande déjà traitée"}'::jsonb; END IF;

  IF p_accept THEN
    UPDATE friendships SET status = 'accepted', updated_at = now() WHERE id = p_request_id;
    PERFORM _notify(v_req.requester_id, 'friend_accepted', 'Demande acceptée',
      'Votre demande d''ami a été acceptée', '/amis', jsonb_build_object('user_id', v_me));
    RETURN '{"ok":true,"status":"friends"}'::jsonb;
  ELSE
    DELETE FROM friendships WHERE id = p_request_id;
    RETURN '{"ok":true,"status":"none"}'::jsonb;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION cancel_friend_request(p_target text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_me text := _resolve_discord_id();
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  DELETE FROM friendships
  WHERE requester_id = v_me AND addressee_id = p_target AND status = 'pending';
  RETURN '{"ok":true,"status":"none"}'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION remove_friend(p_target text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_me text := _resolve_discord_id();
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  DELETE FROM friendships
  WHERE status = 'accepted'
    AND ((requester_id = v_me AND addressee_id = p_target)
      OR (requester_id = p_target AND addressee_id = v_me));
  RETURN '{"ok":true,"status":"none"}'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION block_user(p_target text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_me text := _resolve_discord_id();
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  IF p_target = v_me THEN RETURN '{"ok":false,"error":"Action impossible"}'::jsonb; END IF;
  -- Supprime toute amitié / demande dans les deux sens
  DELETE FROM friendships
  WHERE (requester_id = v_me AND addressee_id = p_target)
     OR (requester_id = p_target AND addressee_id = v_me);
  INSERT INTO user_blocks (blocker_id, blocked_id)
  VALUES (v_me, p_target)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
  RETURN '{"ok":true,"status":"blocked_by_me"}'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION unblock_user(p_target text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_me text := _resolve_discord_id();
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  DELETE FROM user_blocks WHERE blocker_id = v_me AND blocked_id = p_target;
  RETURN '{"ok":true,"status":"none"}'::jsonb;
END;
$$;

-- État relationnel vis-à-vis d'une cible
CREATE OR REPLACE FUNCTION get_relationship(p_target text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_me text := _resolve_discord_id();
  v_f  friendships%ROWTYPE;
BEGIN
  IF v_me IS NULL THEN RETURN '{"state":"anon"}'::jsonb; END IF;
  IF p_target = v_me THEN RETURN '{"state":"self"}'::jsonb; END IF;

  IF EXISTS (SELECT 1 FROM user_blocks WHERE blocker_id = v_me AND blocked_id = p_target) THEN
    RETURN '{"state":"blocked_by_me"}'::jsonb;
  END IF;
  IF EXISTS (SELECT 1 FROM user_blocks WHERE blocker_id = p_target AND blocked_id = v_me) THEN
    RETURN '{"state":"blocked_me"}'::jsonb;
  END IF;

  SELECT * INTO v_f FROM friendships
  WHERE (requester_id = v_me AND addressee_id = p_target)
     OR (requester_id = p_target AND addressee_id = v_me);

  IF NOT FOUND THEN RETURN '{"state":"none"}'::jsonb; END IF;
  IF v_f.status = 'accepted' THEN RETURN '{"state":"friends"}'::jsonb; END IF;
  IF v_f.requester_id = v_me THEN
    RETURN jsonb_build_object('state','pending_sent','request_id',v_f.id);
  ELSE
    RETURN jsonb_build_object('state','pending_received','request_id',v_f.id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION list_friends()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE v_me text := _resolve_discord_id(); v_result jsonb;
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO v_result FROM (
    SELECT
      CASE WHEN f.requester_id = v_me THEN f.addressee_id ELSE f.requester_id END AS user_id,
      u.data->>'username'   AS username,
      u.data->>'avatar_url' AS avatar_url,
      f.updated_at AS since
    FROM friendships f
    LEFT JOIN users u ON u.uid = (CASE WHEN f.requester_id = v_me THEN f.addressee_id ELSE f.requester_id END)
    WHERE f.status = 'accepted' AND (f.requester_id = v_me OR f.addressee_id = v_me)
    ORDER BY f.updated_at DESC
  ) r;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION list_friend_requests()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE v_me text := _resolve_discord_id(); v_incoming jsonb; v_outgoing jsonb;
BEGIN
  IF v_me IS NULL THEN RETURN '{"incoming":[],"outgoing":[]}'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO v_incoming FROM (
    SELECT f.id AS request_id, f.requester_id AS user_id,
           u.data->>'username' AS username, u.data->>'avatar_url' AS avatar_url, f.created_at
    FROM friendships f LEFT JOIN users u ON u.uid = f.requester_id
    WHERE f.addressee_id = v_me AND f.status = 'pending'
    ORDER BY f.created_at DESC
  ) r;
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO v_outgoing FROM (
    SELECT f.id AS request_id, f.addressee_id AS user_id,
           u.data->>'username' AS username, u.data->>'avatar_url' AS avatar_url, f.created_at
    FROM friendships f LEFT JOIN users u ON u.uid = f.addressee_id
    WHERE f.requester_id = v_me AND f.status = 'pending'
    ORDER BY f.created_at DESC
  ) r;
  RETURN jsonb_build_object('incoming', v_incoming, 'outgoing', v_outgoing);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
--  RPC — CONVERSATIONS DM
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_or_create_dm(p_target text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_me text := _resolve_discord_id();
  v_key text;
  v_conv uuid;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  IF p_target = v_me THEN RETURN '{"ok":false,"error":"Conversation invalide"}'::jsonb; END IF;
  IF _is_blocked(v_me, p_target) THEN RETURN '{"ok":false,"error":"Action impossible (blocage)"}'::jsonb; END IF;
  IF NOT _are_friends(v_me, p_target) THEN
    RETURN '{"ok":false,"error":"Vous devez être amis pour discuter"}'::jsonb;
  END IF;

  -- Clé canonique
  v_key := CASE WHEN v_me < p_target THEN v_me || ':' || p_target ELSE p_target || ':' || v_me END;

  SELECT id INTO v_conv FROM conversations WHERE dm_key = v_key;
  IF v_conv IS NULL THEN
    INSERT INTO conversations (type, dm_key) VALUES ('dm', v_key) RETURNING id INTO v_conv;
    INSERT INTO conversation_participants (conversation_id, user_id) VALUES (v_conv, v_me), (v_conv, p_target)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('ok', true, 'conversation_id', v_conv);
END;
$$;

CREATE OR REPLACE FUNCTION list_conversations()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE v_me text := _resolve_discord_id(); v_result jsonb;
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO v_result FROM (
    SELECT
      c.id AS conversation_id,
      c.type,
      c.last_message_at,
      other.user_id           AS other_id,
      u.data->>'username'     AS other_username,
      u.data->>'avatar_url'   AS other_avatar,
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
      ON other.conversation_id = c.id AND other.user_id <> v_me
    LEFT JOIN users u ON u.uid = other.user_id
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

-- Pagination : renvoie les messages AVANT p_before (ou les plus récents si NULL)
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
  v_msg_id uuid;
  v_recent int;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  IF NOT _is_participant(p_conversation, v_me) THEN
    RETURN '{"ok":false,"error":"Accès refusé"}'::jsonb;
  END IF;

  -- Validation type
  IF p_type NOT IN ('text','voice','gif','image') THEN
    RETURN '{"ok":false,"error":"Type de message invalide"}'::jsonb;
  END IF;
  -- Validation contenu
  IF p_type = 'text' THEN
    IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
      RETURN '{"ok":false,"error":"Message vide"}'::jsonb;
    END IF;
    IF length(p_content) > 4000 THEN
      RETURN '{"ok":false,"error":"Message trop long (max 4000)"}'::jsonb;
    END IF;
  END IF;
  -- Validation URL gif/media (anti-XSS : https uniquement)
  IF p_gif_url IS NOT NULL AND p_gif_url !~ '^https://' THEN
    RETURN '{"ok":false,"error":"URL GIF invalide"}'::jsonb;
  END IF;
  IF p_media_url IS NOT NULL AND p_media_url !~ '^https://' THEN
    RETURN '{"ok":false,"error":"URL média invalide"}'::jsonb;
  END IF;

  -- DM : vérifier blocage avec l'autre participant
  SELECT user_id INTO v_other FROM conversation_participants
  WHERE conversation_id = p_conversation AND user_id <> v_me LIMIT 1;
  IF v_other IS NOT NULL AND _is_blocked(v_me, v_other) THEN
    RETURN '{"ok":false,"error":"Action impossible (blocage)"}'::jsonb;
  END IF;

  -- Anti-spam : max 10 messages / 10 secondes
  SELECT count(*) INTO v_recent FROM messages
  WHERE sender_id = v_me AND created_at > now() - interval '10 seconds';
  IF v_recent >= 10 THEN
    RETURN '{"ok":false,"error":"Tu envoies trop vite, ralentis"}'::jsonb;
  END IF;

  INSERT INTO messages (conversation_id, sender_id, content, type, media_url, gif_url, voice_duration, reply_to_id)
  VALUES (p_conversation, v_me, p_content, p_type, p_media_url, p_gif_url, p_voice_duration, p_reply_to)
  RETURNING id INTO v_msg_id;

  UPDATE conversations SET last_message_at = now(), updated_at = now() WHERE id = p_conversation;

  -- Notifier les autres participants
  IF v_other IS NOT NULL THEN
    PERFORM _notify(v_other, 'new_message', 'Nouveau message',
      COALESCE(left(p_content, 80), 'a envoyé un message'),
      '/messages/' || p_conversation::text,
      jsonb_build_object('conversation_id', p_conversation, 'from', v_me));
  END IF;

  RETURN jsonb_build_object('ok', true, 'message_id', v_msg_id);
END;
$$;

CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_me text := _resolve_discord_id();
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false}'::jsonb; END IF;
  UPDATE conversation_participants SET last_read_at = now()
  WHERE conversation_id = p_conversation AND user_id = v_me;
  RETURN '{"ok":true}'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION edit_message(p_message uuid, p_content text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_me text := _resolve_discord_id(); v_sender text;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RETURN '{"ok":false,"error":"Message vide"}'::jsonb;
  END IF;
  SELECT sender_id INTO v_sender FROM messages WHERE id = p_message AND deleted_at IS NULL;
  IF v_sender IS NULL THEN RETURN '{"ok":false,"error":"Message introuvable"}'::jsonb; END IF;
  IF v_sender <> v_me THEN RETURN '{"ok":false,"error":"Tu ne peux modifier que tes messages"}'::jsonb; END IF;
  UPDATE messages SET content = p_content, edited_at = now() WHERE id = p_message;
  RETURN '{"ok":true}'::jsonb;
END;
$$;

-- Suppression : pour soi (front masque) ou pour tout le monde (soft delete) si récent
CREATE OR REPLACE FUNCTION delete_message(p_message uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_me text := _resolve_discord_id(); v_sender text; v_created timestamptz;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  SELECT sender_id, created_at INTO v_sender, v_created FROM messages WHERE id = p_message;
  IF v_sender IS NULL THEN RETURN '{"ok":false,"error":"Message introuvable"}'::jsonb; END IF;
  IF v_sender <> v_me THEN RETURN '{"ok":false,"error":"Tu ne peux supprimer que tes messages"}'::jsonb; END IF;
  UPDATE messages SET deleted_at = now(), content = NULL, media_url = NULL, gif_url = NULL
  WHERE id = p_message;
  RETURN '{"ok":true}'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION toggle_reaction(p_message uuid, p_emoji text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_me text := _resolve_discord_id(); v_conv uuid; v_existing uuid;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  IF p_emoji IS NULL OR length(p_emoji) = 0 OR length(p_emoji) > 16 THEN
    RETURN '{"ok":false,"error":"Emoji invalide"}'::jsonb;
  END IF;
  SELECT conversation_id INTO v_conv FROM messages WHERE id = p_message AND deleted_at IS NULL;
  IF v_conv IS NULL THEN RETURN '{"ok":false,"error":"Message introuvable"}'::jsonb; END IF;
  IF NOT _is_participant(v_conv, v_me) THEN RETURN '{"ok":false,"error":"Accès refusé"}'::jsonb; END IF;

  SELECT id INTO v_existing FROM message_reactions
  WHERE message_id = p_message AND user_id = v_me AND emoji = p_emoji;
  IF v_existing IS NOT NULL THEN
    DELETE FROM message_reactions WHERE id = v_existing;
    RETURN '{"ok":true,"added":false}'::jsonb;
  ELSE
    INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (p_message, v_me, p_emoji)
    ON CONFLICT (message_id, user_id, emoji) DO NOTHING;
    RETURN '{"ok":true,"added":true}'::jsonb;
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
--  RPC — NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION list_notifications(p_limit int DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE v_me text := _resolve_discord_id(); v_result jsonb;
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO v_result FROM (
    SELECT id, type, title, body, link, data, read_at, created_at
    FROM notifications WHERE user_id = v_me
    ORDER BY created_at DESC LIMIT LEAST(GREATEST(COALESCE(p_limit,30),1),100)
  ) r;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION mark_notifications_read(p_ids uuid[] DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_me text := _resolve_discord_id();
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false}'::jsonb; END IF;
  IF p_ids IS NULL THEN
    UPDATE notifications SET read_at = now() WHERE user_id = v_me AND read_at IS NULL;
  ELSE
    UPDATE notifications SET read_at = now() WHERE user_id = v_me AND id = ANY(p_ids) AND read_at IS NULL;
  END IF;
  RETURN '{"ok":true}'::jsonb;
END;
$$;

-- Compteurs pour les badges navbar
CREATE OR REPLACE FUNCTION unread_counts()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_me text := _resolve_discord_id();
  v_msgs int; v_reqs int; v_notifs int;
BEGIN
  IF v_me IS NULL THEN RETURN '{"messages":0,"friend_requests":0,"notifications":0}'::jsonb; END IF;
  SELECT COALESCE(count(*),0) INTO v_msgs FROM messages m
    JOIN conversation_participants p ON p.conversation_id = m.conversation_id AND p.user_id = v_me
    WHERE m.sender_id <> v_me AND m.deleted_at IS NULL AND m.created_at > p.last_read_at;
  SELECT COALESCE(count(*),0) INTO v_reqs FROM friendships
    WHERE addressee_id = v_me AND status = 'pending';
  SELECT COALESCE(count(*),0) INTO v_notifs FROM notifications
    WHERE user_id = v_me AND read_at IS NULL;
  RETURN jsonb_build_object('messages', v_msgs, 'friend_requests', v_reqs, 'notifications', v_notifs);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
--  RLS — lecture seule de SES propres données (pour Supabase Realtime)
--  Écritures impossibles en direct → uniquement via les RPC ci-dessus.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE friendships              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications            ENABLE ROW LEVEL SECURITY;

-- Helper : recrée une policy proprement
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies
    WHERE tablename IN ('friendships','user_blocks','conversations','conversation_participants','messages','message_reactions','notifications')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- friendships : voir les relations qui me concernent
CREATE POLICY friendships_own ON friendships FOR SELECT
  USING (requester_id = _resolve_discord_id() OR addressee_id = _resolve_discord_id());

-- user_blocks : voir mes propres blocages
CREATE POLICY blocks_own ON user_blocks FOR SELECT
  USING (blocker_id = _resolve_discord_id());

-- conversations : voir celles où je suis participant
CREATE POLICY conversations_member ON conversations FOR SELECT
  USING (EXISTS (SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id AND cp.user_id = _resolve_discord_id()));

-- participants : voir les participants des conversations où je suis
CREATE POLICY participants_member ON conversation_participants FOR SELECT
  USING (EXISTS (SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = _resolve_discord_id()));

-- messages : voir les messages des conversations où je suis participant
CREATE POLICY messages_member ON messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = _resolve_discord_id()));

-- réactions : voir celles des messages que je peux voir
CREATE POLICY reactions_member ON message_reactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reactions.message_id AND cp.user_id = _resolve_discord_id()));

-- notifications : voir les miennes
CREATE POLICY notifications_own ON notifications FOR SELECT
  USING (user_id = _resolve_discord_id());

-- ── Realtime : ajouter les tables à la publication supabase_realtime ─────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE friendships; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE conversations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
