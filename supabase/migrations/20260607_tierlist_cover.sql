-- Image de présentation (couverture) d'une tier list publiée.
ALTER TABLE tier_lists ADD COLUMN IF NOT EXISTS cover_url text;
