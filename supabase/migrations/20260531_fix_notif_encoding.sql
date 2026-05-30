-- ═══════════════════════════════════════════════════════════════════════════
--  FIX encodage des messages de notification (accents corrompus en base car le
--  SQL avait été collé en ANSI). Re-crée toggle_like avec les bons accents UTF-8.
--  (create_post / post_reactions : relancer feed_multi_image + post_reactions en UTF-8.)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION toggle_like(p_post uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_author text; v_existing uuid;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  SELECT author_id INTO v_author FROM posts WHERE id = p_post AND deleted_at IS NULL;
  IF v_author IS NULL THEN RETURN '{"ok":false,"error":"Post introuvable"}'::jsonb; END IF;
  SELECT id INTO v_existing FROM post_likes WHERE post_id = p_post AND user_id = v_me;
  IF v_existing IS NOT NULL THEN
    DELETE FROM post_likes WHERE id = v_existing;
    RETURN jsonb_build_object('ok', true, 'liked', false);
  END IF;
  INSERT INTO post_likes (post_id, user_id) VALUES (p_post, v_me) ON CONFLICT DO NOTHING;
  IF v_author <> v_me THEN
    PERFORM _notify(v_author, 'post_like', 'Nouveau like', 'a aimé ton post',
      '/fil/' || p_post::text, jsonb_build_object('post_id', p_post, 'from', v_me));
  END IF;
  RETURN jsonb_build_object('ok', true, 'liked', true);
END;
$$;

-- ── Notifs d'amis (accents corrigés) ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION send_friend_request(p_target text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_me text := _resolve_discord_id(); v_existing friendships%ROWTYPE;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  IF p_target IS NULL OR p_target = '' THEN RETURN '{"ok":false,"error":"Cible invalide"}'::jsonb; END IF;
  IF p_target = v_me THEN RETURN '{"ok":false,"error":"Tu ne peux pas t''ajouter toi-même"}'::jsonb; END IF;
  IF _is_blocked(v_me, p_target) THEN RETURN '{"ok":false,"error":"Action impossible (blocage)"}'::jsonb; END IF;
  SELECT * INTO v_existing FROM friendships
   WHERE (requester_id = v_me AND addressee_id = p_target) OR (requester_id = p_target AND addressee_id = v_me);
  IF FOUND THEN
    IF v_existing.status = 'accepted' THEN RETURN '{"ok":false,"error":"Vous êtes déjà amis"}'::jsonb; END IF;
    IF v_existing.requester_id = p_target THEN
      UPDATE friendships SET status = 'accepted', updated_at = now() WHERE id = v_existing.id;
      PERFORM _notify(p_target, 'friend_accepted', 'Demande acceptée',
        'Votre demande d''ami a été acceptée', '/amis', jsonb_build_object('user_id', v_me));
      RETURN '{"ok":true,"status":"friends"}'::jsonb;
    END IF;
    RETURN '{"ok":false,"error":"Demande déjà envoyée"}'::jsonb;
  END IF;
  INSERT INTO friendships (requester_id, addressee_id, status) VALUES (v_me, p_target, 'pending');
  PERFORM _notify(p_target, 'friend_request', 'Nouvelle demande d''ami',
    'Vous avez reçu une demande d''ami', '/amis', jsonb_build_object('user_id', v_me));
  RETURN '{"ok":true,"status":"pending_sent"}'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION respond_friend_request(p_request_id uuid, p_accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_me text := _resolve_discord_id(); v_req friendships%ROWTYPE;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  SELECT * INTO v_req FROM friendships WHERE id = p_request_id;
  IF NOT FOUND THEN RETURN '{"ok":false,"error":"Demande introuvable"}'::jsonb; END IF;
  IF v_req.addressee_id <> v_me THEN RETURN '{"ok":false,"error":"Cette demande ne t''est pas adressée"}'::jsonb; END IF;
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

-- Corrige aussi les notifications DÉJÀ enregistrées (accents cassés en base)
UPDATE notifications SET
  title = replace(replace(replace(replace(replace(title,'Ã©','é'),'Ã¨','è'),'Ã ','à'),'Ã§','ç'),'Ã´','ô'),
  body  = replace(replace(replace(replace(replace(body, 'Ã©','é'),'Ã¨','è'),'Ã ','à'),'Ã§','ç'),'Ã´','ô')
WHERE title LIKE '%Ã%' OR body LIKE '%Ã%';
