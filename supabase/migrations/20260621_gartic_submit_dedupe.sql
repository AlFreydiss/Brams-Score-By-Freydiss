-- Freydiss Phone — déduplication de gartic_submit (corrige les soumissions perdues).
--
-- PROBLÈME : deux surcharges de gartic_submit coexistaient en base :
--   gartic_submit(p_code text, p_token uuid, p_content text)              -- ancienne (3 args)
--   gartic_submit(p_code text, p_token uuid, p_content text, p_round int) -- nouvelle (4 args)
-- Un appel SANS p_round → PostgREST ne peut pas choisir → erreur 300 PGRST203
-- "Could not choose the best candidate function" → la soumission échoue en silence,
-- le contenu est perdu et le reveal affiche le placeholder "—" (phrases/dessins manquants).
--
-- Le client a été corrigé pour toujours envoyer p_round (clé présente = signature 4-arg
-- choisie sans ambiguïté). Cette migration retire l'ancienne signature pour supprimer
-- définitivement le piège : la 4-arg a `p_round int default null`, donc même un appel
-- sans p_round résout désormais vers elle (p_round = null = manche courante).

drop function if exists gartic_submit(text, uuid, text);
