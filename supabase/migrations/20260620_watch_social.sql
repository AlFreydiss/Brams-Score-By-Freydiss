-- ════════════════════════════════════════════════════════════════════════════
-- Brams Community — Watch & Social pack (2026-06-20)
-- Features : Continuer à regarder (cross-device) · Avis d'épisodes · Roue
-- quotidienne + streak · Watchlist sociale (amis qui regardent).
--
-- Conventions maison (respectées) :
--   • identité = user_id text = discord_id résolu via _resolve_discord_id()
--   • RLS ON, AUCUNE policy d'écriture : tout passe par RPC SECURITY DEFINER
--   • SET search_path = public, pg_temp ; retour jsonb {ok,...} ; garde NULL
--   • crédit berries : 100% serveur (jsonb_set users.data->berrys + berry_sync)
--
-- Idempotent. À appliquer :
--   railway run -- py -3 scripts/apply_migration.py supabase/migrations/20260620_watch_social.sql
-- (ou coller dans le SQL Editor Supabase).
-- ════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) WATCH PROGRESS — reprendre un épisode où on s'est arrêté (cross-device)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS watch_progress (
  user_id      text        NOT NULL,
  ns           text        NOT NULL,           -- id anime (ex 'one-piece')
  ep_key       text        NOT NULL,           -- progressKeyFor (≈ String(episode))
  episode      int,                            -- numéro d'épisode si dispo
  position     double precision NOT NULL DEFAULT 0,
  duration     double precision NOT NULL DEFAULT 0,
  completed    boolean     NOT NULL DEFAULT false,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ns, ep_key)
);
ALTER TABLE watch_progress ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS watch_progress_user_upd ON watch_progress (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS watch_progress_ns_upd   ON watch_progress (ns, updated_at DESC);

-- Sauvegarde (upsert) — appelée fire-and-forget par le lecteur.
CREATE OR REPLACE FUNCTION save_watch_progress(
  p_ns text, p_ep_key text, p_position double precision,
  p_duration double precision, p_completed boolean, p_episode int DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id();
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"auth"}'::jsonb; END IF;
  IF p_ns IS NULL OR p_ep_key IS NULL THEN RETURN '{"ok":false,"error":"args"}'::jsonb; END IF;
  INSERT INTO watch_progress(user_id, ns, ep_key, episode, position, duration, completed, updated_at)
  VALUES (v_me, left(p_ns,64), left(p_ep_key,64), p_episode,
          GREATEST(0, COALESCE(p_position,0)), GREATEST(0, COALESCE(p_duration,0)),
          COALESCE(p_completed,false), now())
  ON CONFLICT (user_id, ns, ep_key) DO UPDATE SET
    episode   = COALESCE(excluded.episode, watch_progress.episode),
    position  = excluded.position,
    duration  = excluded.duration,
    completed = excluded.completed,
    updated_at= now();
  RETURN '{"ok":true}'::jsonb;
END; $$;

-- Toute la progression d'un anime pour l'utilisateur (resume player + page anime).
CREATE OR REPLACE FUNCTION get_watch_progress(p_ns text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id();
BEGIN
  IF v_me IS NULL THEN RETURN '{}'::jsonb; END IF;
  RETURN COALESCE((
    SELECT jsonb_object_agg(ep_key, jsonb_build_object(
      'episode', episode, 'position', position, 'duration', duration, 'completed', completed))
    FROM watch_progress WHERE user_id = v_me AND ns = left(p_ns,64)
  ), '{}'::jsonb);
END; $$;

-- "Continuer à regarder" : dernier épisode non terminé par anime, récents d'abord.
CREATE OR REPLACE FUNCTION get_continue_watching(p_limit int DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id();
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT DISTINCT ON (ns) ns, ep_key, episode, position, duration, completed, updated_at
      FROM watch_progress
      WHERE user_id = v_me AND completed = false AND position > 5
      ORDER BY ns, updated_at DESC
    ) t
  ), '[]'::jsonb);
END; $$;

GRANT EXECUTE ON FUNCTION save_watch_progress(text,text,double precision,double precision,boolean,int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_watch_progress(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_continue_watching(int) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) EPISODE REVIEWS — notes + avis par membre, par épisode
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS episode_reviews (
  user_id    text NOT NULL,
  ns         text NOT NULL,
  ep_key     text NOT NULL,
  rating     int2 NOT NULL CHECK (rating BETWEEN 1 AND 10),
  comment    text,
  username   text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ns, ep_key)
);
ALTER TABLE episode_reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS episode_reviews_lookup ON episode_reviews (ns, ep_key, updated_at DESC);

CREATE OR REPLACE FUNCTION review_episode(
  p_ns text, p_ep_key text, p_rating int, p_comment text DEFAULT NULL,
  p_username text DEFAULT NULL, p_avatar text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id();
BEGIN
  IF v_me IS NULL THEN RETURN '{"ok":false,"error":"auth"}'::jsonb; END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 10 THEN RETURN '{"ok":false,"error":"rating"}'::jsonb; END IF;
  INSERT INTO episode_reviews(user_id, ns, ep_key, rating, comment, username, avatar_url, created_at, updated_at)
  VALUES (v_me, left(p_ns,64), left(p_ep_key,64), p_rating, left(COALESCE(p_comment,''),600),
          left(COALESCE(p_username,''),64), left(COALESCE(p_avatar,''),300), now(), now())
  ON CONFLICT (user_id, ns, ep_key) DO UPDATE SET
    rating = excluded.rating, comment = excluded.comment,
    username = excluded.username, avatar_url = excluded.avatar_url, updated_at = now();
  RETURN '{"ok":true}'::jsonb;
END; $$;

-- Avis publics d'un épisode + moyenne + le mien.
CREATE OR REPLACE FUNCTION get_episode_reviews(p_ns text, p_ep_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id();
BEGIN
  RETURN jsonb_build_object(
    'avg',  COALESCE((SELECT round(avg(rating)::numeric,1) FROM episode_reviews WHERE ns=left(p_ns,64) AND ep_key=left(p_ep_key,64)),0),
    'count',COALESCE((SELECT count(*) FROM episode_reviews WHERE ns=left(p_ns,64) AND ep_key=left(p_ep_key,64)),0),
    'mine', (SELECT to_jsonb(r) FROM (SELECT rating, comment FROM episode_reviews WHERE user_id=v_me AND ns=left(p_ns,64) AND ep_key=left(p_ep_key,64)) r),
    'reviews', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT rating, comment, username, avatar_url, updated_at
        FROM episode_reviews WHERE ns=left(p_ns,64) AND ep_key=left(p_ep_key,64) AND COALESCE(comment,'') <> ''
        ORDER BY updated_at DESC LIMIT 30
      ) t), '[]'::jsonb)
  );
END; $$;

GRANT EXECUTE ON FUNCTION review_episode(text,text,int,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_episode_reviews(text,text) TO authenticated, anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) ROUE QUOTIDIENNE + STREAK — crédit berries 100% serveur, anti-rejeu atomique
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_claims (
  discord_id  text NOT NULL,
  claim_day   date NOT NULL,          -- jour Europe/Paris
  amount      bigint NOT NULL,
  prize_label text,
  streak      int NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (discord_id, claim_day)  -- ← barrière anti re-tirage atomique
);
ALTER TABLE daily_claims ENABLE ROW LEVEL SECURITY;

-- État de la roue (bouton grisé / streak / reset).
CREATE OR REPLACE FUNCTION get_daily_wheel_state()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id();
        v_today date := (now() AT TIME ZONE 'Europe/Paris')::date;
        v_claimed boolean; v_streak int;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('ok',false,'error','auth'); END IF;
  SELECT true, streak INTO v_claimed, v_streak FROM daily_claims WHERE discord_id=v_me AND claim_day=v_today;
  IF v_claimed IS NULL THEN
    -- streak courant = streak d'hier (sinon repart à 0 affiché)
    SELECT streak INTO v_streak FROM daily_claims WHERE discord_id=v_me AND claim_day=v_today-1;
  END IF;
  RETURN jsonb_build_object(
    'ok', true, 'can_claim', (v_claimed IS NULL), 'streak', COALESCE(v_streak,0),
    'next_reset_at', ((v_today+1)::timestamp AT TIME ZONE 'Europe/Paris')
  );
END; $$;

-- Tirage + crédit. RNG serveur, lot jamais envoyé par le client.
CREATE OR REPLACE FUNCTION claim_daily_wheel()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id();
        v_today date := (now() AT TIME ZONE 'Europe/Paris')::date;
        v_prev int; v_streak int; v_r double precision; v_amount bigint; v_label text; v_idx int;
        v_bal bigint;
        -- table de lots pondérée (label, montant, poids cumulatif sur 100)
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('ok',false,'error','auth'); END IF;

  -- streak : +1 si réclamé hier, sinon 1
  SELECT streak INTO v_prev FROM daily_claims WHERE discord_id=v_me AND claim_day=v_today-1;
  v_streak := COALESCE(v_prev,0) + 1;

  -- RNG serveur → lot pondéré
  v_r := random()*100;
  IF    v_r < 40 THEN v_amount := 50;   v_label := '50 berries';      v_idx := 0;
  ELSIF v_r < 70 THEN v_amount := 100;  v_label := '100 berries';     v_idx := 1;
  ELSIF v_r < 88 THEN v_amount := 250;  v_label := '250 berries';     v_idx := 2;
  ELSIF v_r < 96 THEN v_amount := 500;  v_label := '500 berries';     v_idx := 3;
  ELSIF v_r < 99 THEN v_amount := 1000; v_label := '1000 berries';    v_idx := 4;
  ELSE                v_amount := 5000; v_label := 'JACKPOT 5000 !';   v_idx := 5;
  END IF;
  -- bonus de streak : +10% par jour consécutif, plafonné à +100%
  v_amount := (v_amount * (1 + LEAST(v_streak-1,10)*0.1))::bigint;

  -- BARRIÈRE anti re-tirage : l'INSERT échoue (ON CONFLICT) si déjà réclamé aujourd'hui.
  INSERT INTO daily_claims(discord_id, claim_day, amount, prize_label, streak)
  VALUES (v_me, v_today, v_amount, v_label, v_streak)
  ON CONFLICT (discord_id, claim_day) DO NOTHING;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','already'); END IF;

  -- crédit atomique (même mécanisme que credit_berries_topup) + réveil bot
  INSERT INTO users(uid, data) VALUES (v_me, jsonb_build_object('berrys', v_amount))
  ON CONFLICT (uid) DO UPDATE SET data = jsonb_set(
    COALESCE(users.data,'{}'::jsonb), '{berrys}',
    to_jsonb(COALESCE((users.data->>'berrys')::bigint,0) + v_amount));
  INSERT INTO berry_sync(discord_id, deduction) VALUES (v_me, -v_amount);

  SELECT COALESCE((data->>'berrys')::bigint,0) INTO v_bal FROM users WHERE uid=v_me;
  RETURN jsonb_build_object('ok',true,'amount',v_amount,'prize_label',v_label,
                            'prize_index',v_idx,'streak',v_streak,'balance',v_bal);
END; $$;

GRANT EXECUTE ON FUNCTION get_daily_wheel_state() TO authenticated;
GRANT EXECUTE ON FUNCTION claim_daily_wheel() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) WATCHLIST SOCIALE — "tes amis regardent X" (croise amis × watch_progress)
-- ─────────────────────────────────────────────────────────────────────────────
-- Dépend de friendships (20260529_social_system.sql) + watch_progress (ci-dessus).
CREATE OR REPLACE FUNCTION friends_watching(p_hours int DEFAULT 48)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_me text := _resolve_discord_id();
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT wp.ns,
             max(wp.updated_at) AS last_at,
             jsonb_agg(DISTINCT jsonb_build_object(
               'user_id', f.friend_id,
               'username', COALESCE(u.data->>'username', u.data->>'name', 'Pirate'),
               'avatar_url', u.data->>'avatar_url')) AS friends
      FROM (
        -- amis du user (les 2 sens de la relation acceptée)
        SELECT CASE WHEN requester_id = v_me THEN addressee_id ELSE requester_id END AS friend_id
        FROM friendships WHERE status='accepted' AND (requester_id = v_me OR addressee_id = v_me)
      ) f
      JOIN watch_progress wp ON wp.user_id = f.friend_id
        AND wp.updated_at > now() - (p_hours||' hours')::interval
      LEFT JOIN users u ON u.uid = f.friend_id
      GROUP BY wp.ns
      ORDER BY max(wp.updated_at) DESC
      LIMIT 20
    ) t
  ), '[]'::jsonb);
END; $$;

GRANT EXECUTE ON FUNCTION friends_watching(int) TO authenticated;
