-- ═══════════════════════════════════════════════════════════════════════════
--  FRED'ISU — Garde anti-triche du classement (osu_scores)
--  PROBLÈME : le client (fredisu.html) insérait DIRECTEMENT dans osu_scores via
--  PostgREST avec la clé anon — n'importe qui pouvait forger un record mondial
--  en curl. Aucune validation côté serveur.
--  FIX : osu_submit_score() (SECURITY DEFINER) valide la plausibilité AVANT
--  d'insérer. Le client appelle désormais cette RPC au lieu d'un INSERT brut.
--  La LECTURE du classement (SELECT) reste inchangée.
--
--  À FAIRE (durcissement futur, hors de cette migration car les GRANT/RLS
--  actuels d'osu_scores ne sont pas visibles ici) : RÉVOQUER l'INSERT anon
--  direct sur osu_scores et n'autoriser l'écriture QUE via cette RPC, p.ex. :
--    REVOKE INSERT ON osu_scores FROM anon;
--    ALTER TABLE osu_scores ENABLE ROW LEVEL SECURITY;
--  (Ne pas l'appliquer ici à l'aveugle pour ne pas casser l'existant.)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION osu_submit_score(
  p_pseudo    text,
  p_song      text,
  p_diff      int,
  p_mods      text,
  p_score     int,
  p_acc       numeric,
  p_max_combo int,
  p_grade     text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_pseudo text := btrim(COALESCE(p_pseudo, ''));
  v_song   text := COALESCE(p_song, '');
  v_mods   text := COALESCE(p_mods, '');
BEGIN
  -- Validation de plausibilité (mêmes bornes que le filtre client, mais ici non contournables).
  IF char_length(v_pseudo) < 2 OR char_length(v_pseudo) > 16 THEN
    RETURN '{"ok":false,"error":"Pseudo : 2 à 16 caractères"}'::jsonb;
  END IF;
  IF p_acc IS NULL OR p_acc < 0 OR p_acc > 100 THEN
    RETURN '{"ok":false,"error":"Précision invalide"}'::jsonb;
  END IF;
  IF p_score IS NULL OR p_score < 0 OR p_score > 50000000 THEN
    RETURN '{"ok":false,"error":"Score invalide"}'::jsonb;
  END IF;
  IF p_max_combo IS NULL OR p_max_combo < 0 THEN
    RETURN '{"ok":false,"error":"Combo invalide"}'::jsonb;
  END IF;
  IF COALESCE(p_grade, '') NOT IN ('SS','S','A','B','C','D') THEN
    RETURN '{"ok":false,"error":"Rang invalide"}'::jsonb;
  END IF;
  IF char_length(v_song) < 1 OR char_length(v_song) > 200 THEN
    RETURN '{"ok":false,"error":"Map invalide"}'::jsonb;
  END IF;

  INSERT INTO osu_scores (pseudo, song, diff, mods, score, acc, max_combo, grade)
  VALUES (v_pseudo, v_song, p_diff, v_mods, p_score, p_acc, p_max_combo, p_grade);

  RETURN '{"ok":true}'::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION osu_submit_score(text, text, int, text, int, numeric, int, text)
  TO anon, authenticated;
