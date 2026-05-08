-- ─────────────────────────────────────────────────────────────────
--  Brams Score — Marketplace : remise à zéro + création complète
--  Exécute tout d'un coup dans Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────

-- Supprime les tables dans l'ordre inverse des dépendances
DROP TABLE IF EXISTS reports    CASCADE;
DROP TABLE IF EXISTS favorites  CASCADE;
DROP TABLE IF EXISTS ratings    CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS listings   CASCADE;

-- ── listings ──────────────────────────────────────────────────────
CREATE TABLE listings (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id   BIGINT      NOT NULL,
    title       VARCHAR(80) NOT NULL,
    description TEXT        NOT NULL,
    price       INTEGER     NOT NULL,
    category    VARCHAR(50) NOT NULL,
    image_url   TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'active',
    views       INTEGER     NOT NULL DEFAULT 0,
    message_id  BIGINT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sold_at     TIMESTAMPTZ
);

-- ── transactions ──────────────────────────────────────────────────
CREATE TABLE transactions (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id   UUID        NOT NULL REFERENCES listings(id),
    buyer_id     BIGINT      NOT NULL,
    seller_id    BIGINT      NOT NULL,
    price        INTEGER     NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);

-- ── ratings ───────────────────────────────────────────────────────
CREATE TABLE ratings (
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
CREATE TABLE favorites (
    id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    BIGINT  NOT NULL,
    listing_id UUID    NOT NULL REFERENCES listings(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, listing_id)
);

-- ── reports ───────────────────────────────────────────────────────
CREATE TABLE reports (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id  UUID    NOT NULL REFERENCES listings(id),
    reporter_id BIGINT  NOT NULL,
    reason      TEXT    NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Index ─────────────────────────────────────────────────────────
CREATE INDEX idx_listings_status      ON listings(status);
CREATE INDEX idx_listings_seller      ON listings(seller_id);
CREATE INDEX idx_transactions_status  ON transactions(status);
CREATE INDEX idx_transactions_listing ON transactions(listing_id);
CREATE INDEX idx_favorites_user       ON favorites(user_id);
