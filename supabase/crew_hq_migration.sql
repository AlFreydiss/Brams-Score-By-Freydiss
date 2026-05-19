-- ═══════════════════════════════════════════════════════════════════
--  Brams Community — Crew HQ System  (migration v1)
--  Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- Extension UUID (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ───────────────────────────────────────────────────────────────────
-- 1. Extend existing CREWS table
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE crews
  ADD COLUMN IF NOT EXISTS motto              TEXT,
  ADD COLUMN IF NOT EXISTS description        TEXT,
  ADD COLUMN IF NOT EXISTS emblem_emoji       TEXT    DEFAULT '🏴‍☠️',
  ADD COLUMN IF NOT EXISTS primary_color      TEXT    DEFAULT '#d4a017',
  ADD COLUMN IF NOT EXISTS banner_style       TEXT    DEFAULT 'ocean',
  ADD COLUMN IF NOT EXISTS wins               INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reputation         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp                 INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS season_level       INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS treasury_balance   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recruitment_message TEXT,
  ADD COLUMN IF NOT EXISTS min_vocal_hours    NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ DEFAULT NOW();

-- ───────────────────────────────────────────────────────────────────
-- 2. Extend existing CREW_MEMBERS table
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE crew_members
  ADD COLUMN IF NOT EXISTS custom_title   TEXT,
  ADD COLUMN IF NOT EXISTS status         TEXT DEFAULT 'active'
    CHECK (status IN ('active','inactive','probation','banned')),
  ADD COLUMN IF NOT EXISTS is_elite       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS badges         TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS probation_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS note           TEXT,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

-- ───────────────────────────────────────────────────────────────────
-- 3. CREW APPLICATIONS
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crew_applications (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  crew_id         UUID        NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id         TEXT        NOT NULL,
  username        TEXT,
  avatar_url      TEXT,
  message         TEXT,
  availability    TEXT,
  specialty       TEXT,
  previous_crew   TEXT,
  accepts_rules   BOOLEAN     DEFAULT FALSE,
  status          TEXT        DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  internal_note   TEXT,
  reviewed_by     TEXT,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (crew_id, user_id, status)
);

-- ───────────────────────────────────────────────────────────────────
-- 4. CREW INVITATIONS
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crew_invites (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  crew_id         UUID        NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  invited_user_id TEXT        NOT NULL,
  invited_by      TEXT        NOT NULL,
  invited_name    TEXT,
  status          TEXT        DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','expired','cancelled')),
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- 5. CREW ACTIVITY LOG (journal de bord)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crew_logs (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  crew_id     UUID        NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  actor_id    TEXT,
  actor_name  TEXT,
  target_id   TEXT,
  target_name TEXT,
  type        TEXT        NOT NULL,
  description TEXT        NOT NULL,
  metadata    JSONB       DEFAULT '{}',
  visibility  TEXT        DEFAULT 'members'
    CHECK (visibility IN ('public','members','staff','captain')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- 6. CREW ANNOUNCEMENTS
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crew_announcements (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  crew_id     UUID        NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  author_id   TEXT        NOT NULL,
  author_name TEXT,
  title       TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  priority    TEXT        DEFAULT 'info'
    CHECK (priority IN ('info','important','urgent','event')),
  pinned      BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- 7. CREW MISSIONS
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crew_missions (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  crew_id             UUID        NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  title               TEXT        NOT NULL,
  description         TEXT,
  type                TEXT        DEFAULT 'weekly'
    CHECK (type IN ('daily','weekly','event','contribution','recruitment','ranking','bounty')),
  progress            INTEGER     DEFAULT 0,
  target              INTEGER     NOT NULL,
  reward_description  TEXT,
  reward_amount       INTEGER     DEFAULT 0,
  status              TEXT        DEFAULT 'active'
    CHECK (status IN ('active','completed','failed','expired')),
  deadline            TIMESTAMPTZ,
  created_by          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- 8. CREW TREASURY TRANSACTIONS
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crew_treasury (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  crew_id       UUID        NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id       TEXT        NOT NULL,
  username      TEXT,
  type          TEXT        NOT NULL
    CHECK (type IN ('deposit','withdrawal','reward','tax','expense')),
  amount        INTEGER     NOT NULL,
  balance_after INTEGER,
  reason        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- 9. DIPLOMACY
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crew_diplomacy (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  crew_id         UUID        NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  target_crew_id  UUID        NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL
    CHECK (type IN ('alliance','rivalry','non_aggression','war')),
  status          TEXT        DEFAULT 'pending'
    CHECK (status IN ('pending','active','rejected','ended')),
  note            TEXT,
  created_by      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (crew_id, target_crew_id, type)
);

-- ───────────────────────────────────────────────────────────────────
-- 10. Indexes
-- ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_crew_app_crew    ON crew_applications(crew_id, status);
CREATE INDEX IF NOT EXISTS idx_crew_app_user    ON crew_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_inv_crew    ON crew_invites(crew_id, status);
CREATE INDEX IF NOT EXISTS idx_crew_inv_user    ON crew_invites(invited_user_id, status);
CREATE INDEX IF NOT EXISTS idx_crew_logs_crew   ON crew_logs(crew_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crew_ann_crew    ON crew_announcements(crew_id, pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crew_mis_crew    ON crew_missions(crew_id, status);
CREATE INDEX IF NOT EXISTS idx_crew_trea_crew   ON crew_treasury(crew_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crew_dip_crew    ON crew_diplomacy(crew_id, status);

-- ───────────────────────────────────────────────────────────────────
-- 11. Row Level Security (permissive for now — tighten in prod)
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE crew_applications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_invites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_announcements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_missions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_treasury       ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_diplomacy      ENABLE ROW LEVEL SECURITY;

-- Public read on non-sensitive tables
CREATE POLICY IF NOT EXISTS "public_read_crew_ann"  ON crew_announcements FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "public_read_crew_mis"  ON crew_missions      FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "public_read_crew_dip"  ON crew_diplomacy     FOR SELECT USING (true);

-- Auth-gated full access (tighten per-role in production)
CREATE POLICY IF NOT EXISTS "auth_all_crew_app"  ON crew_applications FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "auth_all_crew_inv"  ON crew_invites      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "auth_all_crew_log"  ON crew_logs         FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "auth_all_crew_ann"  ON crew_announcements FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "auth_all_crew_mis"  ON crew_missions     FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "auth_all_crew_trea" ON crew_treasury     FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "auth_all_crew_dip"  ON crew_diplomacy    FOR ALL USING (auth.role() = 'authenticated');

-- ───────────────────────────────────────────────────────────────────
-- 12. Seed default missions for existing crews
-- ───────────────────────────────────────────────────────────────────
INSERT INTO crew_missions (crew_id, title, description, type, target, reward_description, reward_amount, deadline)
SELECT
  id,
  'Atteindre 10 membres actifs',
  'Recrutez suffisamment de nakamas pour former un équipage complet.',
  'recruitment',
  10,
  '500 000 Berrys pour le capitaine',
  500000,
  NOW() + INTERVAL '30 days'
FROM crews
WHERE id NOT IN (SELECT DISTINCT crew_id FROM crew_missions WHERE title = 'Atteindre 10 membres actifs');
