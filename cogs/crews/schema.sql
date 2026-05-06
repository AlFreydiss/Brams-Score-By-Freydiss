-- ============================================================
--  Brams Score — Système d'Équipages (Crews)
--  À exécuter dans Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS crews (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(40)  NOT NULL UNIQUE,
    tag              VARCHAR(6)   NOT NULL UNIQUE,
    description      TEXT,
    captain_id       BIGINT       NOT NULL,
    level            SMALLINT     NOT NULL DEFAULT 1,
    xp               INT          NOT NULL DEFAULT 0,
    treasury         BIGINT       NOT NULL DEFAULT 0,
    total_bounty     BIGINT       NOT NULL DEFAULT 0,
    wars_won         INT          NOT NULL DEFAULT 0,
    wars_lost        INT          NOT NULL DEFAULT 0,
    is_recruiting    BOOLEAN      NOT NULL DEFAULT TRUE,
    flag_url         TEXT,
    role_id          BIGINT,
    text_channel_id  BIGINT,
    voice_channel_id BIGINT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    disbanded_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS crew_members (
    id           SERIAL PRIMARY KEY,
    crew_id      INT     NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    user_id      BIGINT  NOT NULL,
    position     VARCHAR(30)  NOT NULL DEFAULT 'mousse',
    contribution BIGINT       NOT NULL DEFAULT 0,
    joined_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS crew_applications (
    id          SERIAL PRIMARY KEY,
    crew_id     INT     NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    user_id     BIGINT  NOT NULL,
    message     TEXT,
    status      VARCHAR(20)  NOT NULL DEFAULT 'pending',
    reviewed_by BIGINT,
    reviewed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crew_alliances (
    id          SERIAL PRIMARY KEY,
    crew_a_id   INT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    crew_b_id   INT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    status      VARCHAR(20)  NOT NULL DEFAULT 'pending',
    proposed_by INT,
    proposed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    broken_by   INT,
    broken_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(crew_a_id, crew_b_id)
);

CREATE TABLE IF NOT EXISTS crew_wars (
    id              SERIAL PRIMARY KEY,
    attacker_id     INT     NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    defender_id     INT     NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending',
    attacker_score  INT          NOT NULL DEFAULT 0,
    defender_score  INT          NOT NULL DEFAULT 0,
    prize_pool      BIGINT       NOT NULL DEFAULT 0,
    duration_hours  INT          NOT NULL DEFAULT 72,
    winner_id       INT REFERENCES crews(id),
    declared_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    started_at      TIMESTAMPTZ,
    ends_at         TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS war_battles (
    id          SERIAL PRIMARY KEY,
    war_id      INT    NOT NULL REFERENCES crew_wars(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL,
    crew_id     INT    NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    opponent_id BIGINT,
    result      VARCHAR(10),
    points      INT    NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crew_treasury_logs (
    id          SERIAL PRIMARY KEY,
    crew_id     INT     NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    user_id     BIGINT  NOT NULL,
    amount      BIGINT  NOT NULL,
    action      VARCHAR(30) NOT NULL,
    reason      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crew_history (
    id          SERIAL PRIMARY KEY,
    crew_id     INT     NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    user_id     BIGINT  NOT NULL,
    action      VARCHAR(30) NOT NULL,
    details     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_crew_members_crew   ON crew_members(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_user   ON crew_members(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_apps_crew      ON crew_applications(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_apps_user      ON crew_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_wars_att       ON crew_wars(attacker_id);
CREATE INDEX IF NOT EXISTS idx_crew_wars_def       ON crew_wars(defender_id);
CREATE INDEX IF NOT EXISTS idx_war_battles_war     ON war_battles(war_id);
CREATE INDEX IF NOT EXISTS idx_crew_treasury_crew  ON crew_treasury_logs(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_history_crew   ON crew_history(crew_id);
