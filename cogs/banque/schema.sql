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

CREATE TABLE IF NOT EXISTS bank_achievements (
    user_id        TEXT        NOT NULL,
    achievement_id TEXT        NOT NULL,
    unlocked_at    TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS bank_settings (
    user_id                 TEXT    PRIMARY KEY,
    dm_notifications        BOOL    DEFAULT FALSE,
    confirm_large_transfers BOOL    DEFAULT TRUE
);

-- Ajout colonne target_user_id à la table transactions existante
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS target_user_id TEXT;

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_transactions_user_created
    ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_categorie
    ON transactions(categorie);
CREATE INDEX IF NOT EXISTS idx_bank_achievements_user
    ON bank_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_guild
    ON bank_accounts(guild_id);
