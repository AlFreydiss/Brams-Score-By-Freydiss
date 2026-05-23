-- Migration : ajout des champs de modération persistante
-- À exécuter dans le SQL Editor de ton dashboard Supabase
-- https://supabase.com/dashboard/project/zeqetrmulqndxugfbojd/sql

-- ── wiki_pages ────────────────────────────────────────────────────────────────
ALTER TABLE wiki_pages
  ADD COLUMN IF NOT EXISTS moderated_by      TEXT,
  ADD COLUMN IF NOT EXISTS moderated_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

-- ── theories ─────────────────────────────────────────────────────────────────
ALTER TABLE theories
  ADD COLUMN IF NOT EXISTS moderated_by      TEXT,
  ADD COLUMN IF NOT EXISTS moderated_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

-- ── Index pour filtrer les contenus modérés rapidement ────────────────────────
CREATE INDEX IF NOT EXISTS idx_wiki_pages_status   ON wiki_pages (status);
CREATE INDEX IF NOT EXISTS idx_theories_status     ON theories   (status);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_modby    ON wiki_pages (moderated_by) WHERE moderated_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_theories_modby      ON theories   (moderated_by) WHERE moderated_by IS NOT NULL;

-- ── RLS : politique staff pour modifier le statut ────────────────────────────
-- Ces policies permettent aux staff de mettre à jour le statut sans service role key.
-- À activer UNIQUEMENT si tu veux bypasser le service role key.
-- (Désactivé par défaut — décommente si nécessaire)

-- CREATE POLICY "staff can moderate wiki_pages"
--   ON wiki_pages FOR UPDATE
--   USING (auth.uid() IS NOT NULL)
--   WITH CHECK (true);

-- CREATE POLICY "staff can moderate theories"
--   ON theories FOR UPDATE
--   USING (auth.uid() IS NOT NULL)
--   WITH CHECK (true);
