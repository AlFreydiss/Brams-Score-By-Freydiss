// GENERE PAR scripts/gen-scans-catalog.mjs — NE PAS EDITER A LA MAIN.
// Relancer apres chaque ajout de serie. Ne contient que de quoi afficher une
// carte : les chapitres eux-memes restent dans src/data/manga/<slug>.json,
// charges a la demande par la route /manga/:slug.
export const SCANS = [
  {
    "slug": "aot",
    "title": "L'Attaque des Titans",
    "color": "#7f1d1d",
    "chapters": 81,
    "last": 139.5,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/aot/60/001.jpg",
    "animeId": "aot"
  },
  {
    "slug": "black-clover",
    "title": "Black Clover",
    "color": "#d97706",
    "chapters": 280,
    "last": 389,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/black-clover/109/001.jpg",
    "animeId": "bc"
  },
  {
    "slug": "blue-lock",
    "title": "Blue Lock",
    "color": "#1565c0",
    "chapters": 341,
    "last": 345,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/blue-lock/1/001.jpg",
    "animeId": "bluelock"
  },
  {
    "slug": "boruto",
    "title": "Boruto: Two Blue Vortex",
    "color": "#1d7fd4",
    "chapters": 36,
    "last": 36,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/scans/boruto/ch1/01.png",
    "animeId": null
  },
  {
    "slug": "dr-stone",
    "title": "Dr. Stone",
    "color": "#16a34a",
    "chapters": 174,
    "last": 232.1,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/dr-stone/1/001.png",
    "animeId": "drstone"
  },
  {
    "slug": "fire-force",
    "title": "Fire Force",
    "color": "#ea580c",
    "chapters": 235,
    "last": 304,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/fire-force/1/001.jpg",
    "animeId": "fireforce"
  },
  {
    "slug": "jjk",
    "title": "Jujutsu Kaisen",
    "color": "#9b59b6",
    "chapters": 263,
    "last": 271,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/jjk/1/001.jpg",
    "animeId": "jjk"
  },
  {
    "slug": "kingdom",
    "title": "Kingdom",
    "color": "#b45309",
    "chapters": 874,
    "last": 874,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/kingdom/1/001.webp",
    "animeId": "kingdom"
  },
  {
    "slug": "kny",
    "title": "Demon Slayer",
    "color": "#16a34a",
    "chapters": 206,
    "last": 206,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/kny/1/001.jpg",
    "animeId": "kny"
  },
  {
    "slug": "mha",
    "title": "My Hero Academia",
    "color": "#1e88e5",
    "chapters": 171,
    "last": 431,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/mha/261/001.png",
    "animeId": "mha"
  },
  {
    "slug": "solo-leveling",
    "title": "Solo Leveling",
    "color": "#1976d2",
    "chapters": 202,
    "last": 200,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/solo-leveling/0/001.jpg",
    "animeId": "sl"
  }
]
