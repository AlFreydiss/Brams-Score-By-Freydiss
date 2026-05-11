-- Tables du système bancaire Freydiss Bank
-- À exécuter une fois dans Supabase

CREATE TABLE IF NOT EXISTS bank_accounts (
    user_id            TEXT        NOT NULL,
    guild_id           TEXT        NOT NULL,
    vault              BIGINT      DEFAULT 0,
    vault_locked_until TIMESTAMPTZ,
    vault_lock_days    INT         DEFAULT 0,
    last_daily         TIMESTAMPTZ,
    streak             INT         DEFAULT 0,
    bank_rank          TEXT        DEFAULT 'Mousse',
    PRIMARY KEY (user_id, guild_id)
);

CREATE TABLE IF NOT EXISTS bank_transactions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT        NOT NULL,
    type        TEXT        NOT NULL,
    categorie   TEXT        NOT NULL,
    montant     BIGINT      NOT NULL,
    description TEXT,
    solde_apres BIGINT      DEFAULT 0,
    target_user_id TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_achievements (
    user_id        TEXT        NOT NULL,
    achievement_id TEXT        NOT NULL,
    unlocked_at    TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS bank_settings (
    user_id                 TEXT    PRIMARY KEY,
    dm_notifications        BOOL    DEFAULT FALSE,
    confirm_large_transfers BOOL    DEFAULT TRUE,
    thumbnail_url           TEXT    DEFAULT NULL
);

-- Migration pour les installations existantes :
-- ALTER TABLE bank_settings ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_created
    ON bank_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_categorie
    ON bank_transactions(categorie);
CREATE INDEX IF NOT EXISTS idx_bank_achievements_user
    ON bank_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_guild
    ON bank_accounts(guild_id);
