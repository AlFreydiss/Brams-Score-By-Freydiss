-- Attribution tier list : « créé par X · modifié par Y »
-- editor_name = membre qui republie la tier list d'un AUTRE (fork). NULL pour une
-- liste créée de zéro (l'auteur est alors le créateur).
ALTER TABLE tier_lists ADD COLUMN IF NOT EXISTS editor_name text;
