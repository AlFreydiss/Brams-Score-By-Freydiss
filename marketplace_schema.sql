-- ─────────────────────────────────────────────────────────────────
--  Brams Score — Marketplace : schéma complet (UUID ids)
--  Exécute ce fichier dans l'éditeur SQL de Supabase (une seule fois)
-- ─────────────────────────────────────────────────────────────────

-- ── listings ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id    BIGINT       NOT NULL,
    title        VARCHAR(80)  NOT NULL,
    description  TEXT         NOT NULL,
    price        INTEGER      NOT NULL,
    category     VARCHAR(50)  NOT NULL,
    image_url    TEXT,
    status       VARCHAR(20)  NOT NULL DEFAULT 'active',
    views        INTEGER      NOT NULL DEFAULT 0,
    message_id   BIGINT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    sold_at      TIMESTAMPTZ
);

ALTER TABLE listings ADD COLUMN IF NOT EXISTS status     VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS views      INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS message_id BIGINT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS sold_at    TIMESTAMPTZ;

-- ── transactions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id   UUID         NOT NULL REFERENCES listings(id),
    buyer_id     BIGINT       NOT NULL,
    seller_id    BIGINT       NOT NULL,
    price        INTEGER      NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status       VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- ── ratings ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ratings (
    id             UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID     NOT NULL REFERENCES transactions(id),
    rater_id       BIGINT   NOT NULL,
    rated_id       BIGINT   NOT NULL,
    score          SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment        TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (transaction_id, rater_id)
);

-- ── favorites ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
    id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    BIGINT  NOT NULL,
    listing_id UUID    NOT NULL REFERENCES listings(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, listing_id)
);

-- ── reports ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id  UUID    NOT NULL REFERENCES listings(id),
    reporter_id BIGINT  NOT NULL,
    reason      TEXT    NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Index ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_listings_status      ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_seller      ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status  ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_listing ON transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user       ON favorites(user_id);
