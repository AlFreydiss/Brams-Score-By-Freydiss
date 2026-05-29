-- ═══════════════════════════════════════════════════════════════════════════
--  STAFF CHAT — salon réservé au staff (Staff Panel)
--  Table dédiée + RPC SECURITY DEFINER + RLS staff-only. Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS staff_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   text NOT NULL,
  sender_name text,
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS staff_messages_created_idx ON staff_messages(created_at DESC);

-- Liste des discord_id du staff (synchro avec src/lib/roles.js / api/_staff.js)
CREATE OR REPLACE FUNCTION _is_staff()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE v text;
BEGIN
  v := _resolve_discord_id();
  RETURN v IN (
    '1094070545248694342', '999607813334638692', '1079054995917381672',
    '670668161540161559', '1095386277169340426', '239486561366835201'
  );
END;
$$;

CREATE OR REPLACE FUNCTION staff_send_message(p_content text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_me text := _resolve_discord_id(); v_id uuid; v_name text;
BEGIN
  IF NOT _is_staff() THEN RETURN '{"ok":false,"error":"Réservé au staff"}'::jsonb; END IF;
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN RETURN '{"ok":false,"error":"Message vide"}'::jsonb; END IF;
  IF length(p_content) > 4000 THEN RETURN '{"ok":false,"error":"Message trop long"}'::jsonb; END IF;
  SELECT data->>'username' INTO v_name FROM users WHERE uid = v_me;
  INSERT INTO staff_messages (sender_id, sender_name, content)
  VALUES (v_me, v_name, p_content) RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'message_id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION staff_list_messages(p_before timestamptz DEFAULT NULL, p_limit int DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT _is_staff() THEN RETURN '{"ok":false,"error":"Réservé au staff"}'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.created_at ASC), '[]'::jsonb) INTO v_result FROM (
    SELECT m.id, m.sender_id, m.content, m.created_at,
           COALESCE(u.data->>'username', m.sender_name) AS sender_name,
           u.data->>'avatar_url' AS sender_avatar
    FROM staff_messages m LEFT JOIN users u ON u.uid = m.sender_id
    WHERE (p_before IS NULL OR m.created_at < p_before)
    ORDER BY m.created_at DESC LIMIT LEAST(GREATEST(COALESCE(p_limit,50),1),100)
  ) r;
  RETURN jsonb_build_object('ok', true, 'messages', v_result);
END;
$$;

CREATE OR REPLACE FUNCTION staff_delete_message(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_me text := _resolve_discord_id();
BEGIN
  IF NOT _is_staff() THEN RETURN '{"ok":false,"error":"Réservé au staff"}'::jsonb; END IF;
  -- Un staff peut supprimer son message ; le créateur peut tout supprimer.
  DELETE FROM staff_messages WHERE id = p_id AND (sender_id = v_me OR v_me = '1094070545248694342');
  RETURN '{"ok":true}'::jsonb;
END;
$$;

ALTER TABLE staff_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_messages_read ON staff_messages;
CREATE POLICY staff_messages_read ON staff_messages FOR SELECT USING (_is_staff());

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE staff_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
