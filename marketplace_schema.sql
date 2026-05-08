-- ─────────────────────────────────────────────────────────────────
--  Brams Score — Marketplace : migration colonnes manquantes
--  Les tables existent déjà dans Supabase (créées avec leur schéma
--  par défaut). Ce script ajoute uniquement ce qui manque.
--  Exécute bloc par bloc si une erreur survient.
-- ─────────────────────────────────────────────────────────────────

-- ── listings ──────────────────────────────────────────────────────
ALTER TABLE listings ADD COLUMN IF NOT EXISTS status     VARCHAR(20)  NOT NULL DEFAULT 'active';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS views      INTEGER      NOT NULL DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS message_id BIGINT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS sold_at    TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS image_url  TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS category   VARCHAR(50)  NOT NULL DEFAULT 'autre';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS description TEXT        NOT NULL DEFAULT '';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS price      INTEGER      NOT NULL DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS title      VARCHAR(80)  NOT NULL DEFAULT '';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS seller_id  BIGINT       NOT NULL DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW();

-- ── transactions ──────────────────────────────────────────────────
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS listing_id   UUID        REFERENCES listings(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS buyer_id     BIGINT      NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS seller_id    BIGINT      NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS price        INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status       VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- ── ratings ───────────────────────────────────────────────────────
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id);
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS rater_id       BIGINT;
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS rated_id       BIGINT;
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS score          SMALLINT;
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS comment        TEXT;
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── favorites ─────────────────────────────────────────────────────
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS user_id     BIGINT NOT NULL DEFAULT 0;
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS listing_id  UUID   REFERENCES listings(id);
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── reports ───────────────────────────────────────────────────────
ALTER TABLE reports ADD COLUMN IF NOT EXISTS listing_id  UUID REFERENCES listings(id);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reporter_id BIGINT NOT NULL DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reason      TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── Index ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_listings_status      ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_seller      ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status  ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_listing ON transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user       ON favorites(user_id);
