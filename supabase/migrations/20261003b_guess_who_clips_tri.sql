-- Guess Who — tri des sons « techniques » découpés d'après les sous-titres FR.
-- Vérifiés le 2026-10-03 par transcription Whisper : ces 9 sons ne contiennent
-- pas la technique annoncée (dialogue qui en parle, mauvais passage). Désactivés.
update guesswho_clips set enabled = false where id in (
  'dbs-ep119-ja-final-flash',          -- « お前、いいな… » : pas de Final Flash
  'dbs-ep67-ja-genki-dama',            -- dialogue « その元気玉… »
  'dbs-ep87-ja-genki-dama',            -- dialogue « お前が元気玉で倒した »
  'jjk-s01e007-ja-extension-du-territoire', -- « 教えてあげる »
  'jjk-s01e011-ja-extension-du-territoire', -- dialogue qui mentionne l'extension
  'kny-kny-movie-mugen-ja-danse-du-dieu-du-feu', -- explication, pas l'attaque
  'mha-ep10-fr-smash',                 -- dialogue sans Smash
  'mha-ep10-ja-smash',
  'mha-ep2-fr-plus-ultra'              -- « Résultat ! »
);

-- Noms d'animés lisibles (affichés sous le titre : « jjk · VO » → « Jujutsu Kaisen · VO »).
update guesswho_clips set anime = 'Dragon Ball Super'   where anime = 'dbs';
update guesswho_clips set anime = 'Jujutsu Kaisen'      where anime = 'jjk';
update guesswho_clips set anime = 'Demon Slayer'        where anime = 'kny';
update guesswho_clips set anime = 'My Hero Academia'    where anime = 'mha';
