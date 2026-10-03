-- Guess Who : deux sons de Bankai mal étiquetés (vérifié par transcription
-- faster-whisper des fichiers R2, 2026-10-03).
--  * « bleach-bankai-komamura » : on entend Rukia, « Bankai, Hakka no Togame »,
--    pas Komamura. Le son devient le Bankai de Rukia (même fichier).
--  * « bleach-bankai-renji » : on entend « Ikuze, Zabimaru » (pas l'annonce du
--    Bankai) : titre aligné sur ce qu'on entend.
-- À coller dans l'éditeur SQL Supabase. Rejouable sans effet de bord.

insert into guesswho_clips (id, title, anime, lang, kind, url, duration, enabled)
select 'bleach-bankai-rukia', 'Bankai ! Hakka no Togame', 'Bleach (Rukia)', lang, kind, url, duration, true
from guesswho_clips where id = 'bleach-bankai-komamura'
on conflict (id) do update set title = excluded.title, anime = excluded.anime, url = excluded.url,
  duration = excluded.duration, enabled = true;

delete from guesswho_clips where id = 'bleach-bankai-komamura';

update guesswho_clips set title = 'Ikuze, Zabimaru !' where id = 'bleach-bankai-renji';
