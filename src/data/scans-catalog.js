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
    "first": 60,
    "last": 139.5,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/covers/aot.webp",
    "author": "Hajime Isayama",
    "year": 2009,
    "status": "termine",
    "score": 84,
    "genres": [
      "Action",
      "Drame",
      "Mystère"
    ],
    "animeId": "aot"
  },
  {
    "slug": "black-clover",
    "title": "Black Clover",
    "color": "#d97706",
    "chapters": 280,
    "first": 109,
    "last": 389,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/covers/black-clover.webp",
    "author": "Yūki Tabata",
    "year": 2014,
    "status": "termine",
    "score": 69,
    "genres": [
      "Action",
      "Comédie",
      "Fantasy"
    ],
    "animeId": "bc"
  },
  {
    "slug": "blue-lock",
    "title": "Blue Lock",
    "color": "#1565c0",
    "chapters": 341,
    "first": 1,
    "last": 345,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/covers/blue-lock.webp",
    "author": "Muneyuki Kaneshiro · Yūsuke Nomura",
    "year": 2018,
    "status": "encours",
    "score": 82,
    "genres": [
      "Sport",
      "Drame"
    ],
    "animeId": "bluelock"
  },
  {
    "slug": "boruto",
    "title": "Boruto: Two Blue Vortex",
    "color": "#1d7fd4",
    "chapters": 36,
    "first": 1,
    "last": 36,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/covers/boruto.webp",
    "author": "Masashi Kishimoto · Mikio Ikemoto",
    "year": 2023,
    "status": "encours",
    "score": 75,
    "genres": [
      "Action",
      "Aventure"
    ],
    "animeId": null
  },
  {
    "slug": "dr-stone",
    "title": "Dr. Stone",
    "color": "#16a34a",
    "chapters": 174,
    "first": 1,
    "last": 232.1,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/covers/dr-stone.webp",
    "author": "Riichirō Inagaki · Boichi",
    "year": 2017,
    "status": "termine",
    "score": 81,
    "genres": [
      "Aventure",
      "Science-fiction"
    ],
    "animeId": "drstone"
  },
  {
    "slug": "fire-force",
    "title": "Fire Force",
    "color": "#ea580c",
    "chapters": 235,
    "first": 1,
    "last": 304,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/covers/fire-force.webp",
    "author": "Atsushi Ōkubo",
    "year": 2015,
    "status": "termine",
    "score": 78,
    "genres": [
      "Action",
      "Surnaturel"
    ],
    "animeId": "fireforce"
  },
  {
    "slug": "jjk",
    "title": "Jujutsu Kaisen",
    "color": "#9b59b6",
    "chapters": 263,
    "first": 1,
    "last": 271,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/covers/jjk.webp",
    "author": "Gege Akutami",
    "year": 2018,
    "status": "termine",
    "score": 80,
    "genres": [
      "Action",
      "Surnaturel"
    ],
    "animeEnd": {
      "season": "Saison 2 · Incident de Shibuya",
      "last": 136,
      "next": 137
    },
    "animeId": "jjk"
  },
  {
    "slug": "kingdom",
    "title": "Kingdom",
    "color": "#b45309",
    "chapters": 874,
    "first": 1,
    "last": 874,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/covers/kingdom.webp",
    "author": "Yasuhisa Hara",
    "year": 2006,
    "status": "encours",
    "score": 89,
    "genres": [
      "Action",
      "Historique"
    ],
    "animeId": "kingdom"
  },
  {
    "slug": "kny",
    "title": "Demon Slayer",
    "color": "#16a34a",
    "chapters": 206,
    "first": 1,
    "last": 206,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/covers/kny.webp",
    "author": "Koyoharu Gotōge",
    "year": 2016,
    "status": "termine",
    "score": 79,
    "genres": [
      "Action",
      "Surnaturel"
    ],
    "animeEnd": {
      "season": "Saison 4 · Entraînement des Piliers",
      "last": 139,
      "next": 140
    },
    "animeId": "kny"
  },
  {
    "slug": "mha",
    "title": "My Hero Academia",
    "color": "#1e88e5",
    "chapters": 171,
    "first": 261,
    "last": 431,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/covers/mha.webp",
    "author": "Kōhei Horikoshi",
    "year": 2014,
    "status": "termine",
    "score": 78,
    "genres": [
      "Action",
      "Super-héros"
    ],
    "animeId": "mha"
  },
  {
    "slug": "solo-leveling",
    "title": "Solo Leveling",
    "color": "#1976d2",
    "chapters": 202,
    "first": 0,
    "last": 200,
    "cover": "https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/covers/solo-leveling.webp",
    "author": "Chugong · DUBU",
    "year": 2018,
    "status": "termine",
    "score": 84,
    "genres": [
      "Action",
      "Fantasy"
    ],
    "animeEnd": {
      "season": "Saison 2",
      "last": 110,
      "next": 111
    },
    "animeId": "sl"
  }
]
