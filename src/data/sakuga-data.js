// ── Tournoi Sakuga ──────────────────────────────────────────────────────────
// Ici on ne juge plus la musique mais l'ANIMATION : chaque participant est un
// extrait découpé dans un épisode déjà hébergé sur R2, joué en boucle et sans
// intérêt pour la bande-son.
//
// Un clip reprend volontairement le champ `audioUrl` du catalogue d'openings :
// c'est ce champ que DuelArena utilise pour lire un média R2. `startAt` et
// `endAt` (ajoutés au lecteur) délimitent l'extrait dans l'épisode.
//
//   {
//     id:       'jjk-s1e19-sukuna',      // unique dans le tournoi
//     title:    'Sukuna vs Jogo',        // nom de la scène, affiché sur la carte
//     anime:    'Jujutsu Kaisen',
//     season:   'S01',
//     episode:  19,
//     audioUrl: 'https://pub-….r2.dev/anime/jjk/S01E19.mp4',
//     startAt:  742,                     // secondes — début de l'extrait
//     endAt:    778,                     // secondes — fin de l'extrait
//     color:    '#0e7490',
//     emoji:    '✦',
//   }
//
// Pour remplir cette liste sans chercher les timecodes à la main : page
// /staff/sakuga (SakugaClipperPage) — on scrube l'épisode, on pose IN et OUT,
// et on copie le JSON généré ici.

export const SAKUGA_CLIPS = []

// Un bracket a besoin d'au moins 4 participants pour être intéressant : en
// dessous, le hub affiche le tournoi comme « en préparation ».
export const SAKUGA_READY = SAKUGA_CLIPS.length >= 4

export const SAKUGA_CONFIG = {
  id:            'best-sakuga-2026',
  title:         'Tournoi Sakuga',
  description:   `${SAKUGA_CLIPS.length} séquences d'animation en 1v1. Pas de musique, pas de nostalgie : seule l'image compte.`,
  status:        SAKUGA_READY ? 'active' : 'soon',
  format:        'single_elimination',
  edition:       'Edition 1',
  startDate:     '2026-08-27',
  categoryLabel: 'Sakuga',
  route:         '/tournoi/sakuga',
  version:       'v1-sakuga',
  participants:  SAKUGA_CLIPS,
}
