-- ════════════════════════════════════════════════════════════════════════════
--  SIGNALEMENTS DU FIL (post_reports) + modération staff
--  Pré-requis : 20260529_social_system.sql (_resolve_discord_id, users)
--               20260530_feed.sql (posts, _notify)
--  À exécuter dans le SQL Editor Supabase.
-- ════════════════════════════════════════════════════════════════════════════

-- Helper : l'appelant est-il staff ? IDs à garder en sync avec src/lib/roles.js.
-- _resolve_discord_id() lit l'identité Discord depuis auth.identities (non-spoofable).
-- COALESCE(..., false) : sans COALESCE, un appelant sans identité Discord résolue
-- (_resolve_discord_id() = NULL) ferait renvoyer NULL → `IF NOT _is_staff()` non-vrai →
-- le garde-fou serait sauté. On force un booléen non-null.
CREATE OR REPLACE FUNCTION _is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT COALESCE(_resolve_discord_id() IN (
    '1094070545248694342', -- Al Freydiss (créateur)
    '999607813334638692',  -- Berat
    '1079054995917381672', -- Brams
    '670668161540161559',  -- BenActief
    '1095386277169340426', -- Mowgli
    '239486561366835201'   -- Yoonae
  ), false);
$$;

CREATE TABLE IF NOT EXISTS post_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id  text NOT NULL,
  reason       text NOT NULL,
  status       text NOT NULL DEFAULT 'open',   -- open | resolved
  resolution   text,                            -- dismissed | post_deleted
  resolved_by  text,
  resolved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Un seul signalement OUVERT par (post, signaleur) ; re-signaler après résolution reste possible.
CREATE UNIQUE INDEX IF NOT EXISTS post_reports_open_unique
  ON post_reports (post_id, reporter_id) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS post_reports_status_idx ON post_reports (status, created_at DESC);

ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;
-- Pas de policy directe : tout passe par les RPC SECURITY DEFINER ci-dessous.

-- ── Signaler un post (membre authentifié) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION report_post(p_post uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_author text; v_clean text;
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"Non authentifié"}'::jsonb; END IF;
  v_clean := nullif(btrim(coalesce(p_reason, '')), '');
  IF v_clean IS NULL THEN RETURN '{"ok":false,"error":"Indique une raison"}'::jsonb; END IF;
  v_clean := left(v_clean, 500);
  SELECT author_id INTO v_author FROM posts WHERE id = p_post AND deleted_at IS NULL;
  IF v_author IS NULL THEN RETURN '{"ok":false,"error":"Post introuvable"}'::jsonb; END IF;
  IF v_author = v_me THEN RETURN '{"ok":false,"error":"Tu ne peux pas signaler ton propre post"}'::jsonb; END IF;
  INSERT INTO post_reports (post_id, reporter_id, reason) VALUES (p_post, v_me, v_clean)
    ON CONFLICT (post_id, reporter_id) WHERE status = 'open' DO NOTHING;
  RETURN '{"ok":true}'::jsonb;
END;
$$;

-- ── File des signalements (staff uniquement) ──────────────────────────────────
CREATE OR REPLACE FUNCTION list_post_reports(p_status text DEFAULT 'open')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT _is_staff() THEN RETURN '{"ok":false,"error":"Réservé au staff"}'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(row ORDER BY ts DESC), '[]'::jsonb) INTO v_result FROM (
    SELECT jsonb_build_object(
      'id',               pr.id,
      'post_id',          pr.post_id,
      'reason',           pr.reason,
      'status',           pr.status,
      'resolution',       pr.resolution,
      'created_at',       pr.created_at,
      'resolved_at',      pr.resolved_at,
      'reporter_id',      pr.reporter_id,
      'reporter_name',    COALESCE(ru.data->>'username', '#' || right(pr.reporter_id, 5)),
      'post_author_id',   p.author_id,
      'post_author_name', COALESCE(au.data->>'username', '#' || right(p.author_id, 5)),
      'post_content',     p.content,
      'post_media_url',   p.media_url,
      'post_deleted',     (p.deleted_at IS NOT NULL),
      'report_count',     (SELECT count(*) FROM post_reports x WHERE x.post_id = pr.post_id AND x.status = 'open')
    ) AS row, pr.created_at AS ts
    FROM post_reports pr
    JOIN posts p   ON p.id = pr.post_id
    LEFT JOIN users ru ON ru.uid = pr.reporter_id
    LEFT JOIN users au ON au.uid = p.author_id
    WHERE pr.status = p_status
  ) s;
  RETURN jsonb_build_object('ok', true, 'reports', v_result);
END;
$$;

-- ── Résoudre un signalement (staff) : 'dismiss' = rejeter, 'delete_post' = retirer le post ──
CREATE OR REPLACE FUNCTION resolve_post_report(p_report uuid, p_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id(); v_post uuid; v_author text; v_res text;
BEGIN
  IF NOT _is_staff() THEN RETURN '{"ok":false,"error":"Réservé au staff"}'::jsonb; END IF;
  SELECT post_id INTO v_post FROM post_reports WHERE id = p_report;
  IF v_post IS NULL THEN RETURN '{"ok":false,"error":"Signalement introuvable"}'::jsonb; END IF;

  IF p_action = 'delete_post' THEN
    SELECT author_id INTO v_author FROM posts WHERE id = v_post;
    UPDATE posts SET deleted_at = now(), content = NULL, media_url = NULL WHERE id = v_post;
    v_res := 'post_deleted';
    -- résout TOUS les signalements ouverts du post
    UPDATE post_reports SET status = 'resolved', resolution = v_res, resolved_by = v_me, resolved_at = now()
      WHERE post_id = v_post AND status = 'open';
    IF v_author IS NOT NULL AND v_author <> v_me THEN
      PERFORM _notify(v_author, 'post_removed', 'Post retiré',
        'Un de tes posts a été retiré par la modération.', '/fil',
        jsonb_build_object('post_id', v_post));
    END IF;
  ELSIF p_action = 'dismiss' THEN
    v_res := 'dismissed';
    UPDATE post_reports SET status = 'resolved', resolution = v_res, resolved_by = v_me, resolved_at = now()
      WHERE id = p_report;
  ELSE
    RETURN '{"ok":false,"error":"Action invalide"}'::jsonb;
  END IF;

  RETURN jsonb_build_object('ok', true, 'resolution', v_res);
END;
$$;
