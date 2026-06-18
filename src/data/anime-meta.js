// Métadonnées par animé pour l'interface "détail épisode" du lecteur.
//  - title  : nom de l'animé (pour le synopsis IA + recherche trailer)
//  - note   : note "des gens" (~score MyAnimeList /10) affichée sur la fiche
//  - youtube: id de la vidéo YouTube du trailer (ou null → bouton "recherche YouTube")
//
// L'id (clé) = le `storageKey`/NS passé au VideoPlayer (ex: 'dbs', 'onepiece').
// Ajoute un trailer : mets l'id YouTube (la partie après v= ou youtu.be/).
export const ANIME_META = {
  onepiece:            { title: 'One Piece',                      note: 8.7, youtube: null },
  tpn:                 { title: 'The Promised Neverland',         note: 8.5, youtube: null },
  drstone:             { title: 'Dr. Stone',                      note: 8.3, youtube: null },
  jjk:                 { title: 'Jujutsu Kaisen',                 note: 8.6, youtube: null },
  kingdom:             { title: 'Kingdom',                        note: 8.9, youtube: null },
  aot:                 { title: "L'Attaque des Titans",           note: 9.0, youtube: null },
  kny:                 { title: 'Demon Slayer',                   note: 8.5, youtube: null },
  nnt:                 { title: 'Nanatsu no Taizai',              note: 7.6, youtube: null },
  sl:                  { title: 'Solo Leveling',                  note: 8.3, youtube: null },
  dbs:                 { title: 'Dragon Ball Super',              note: 7.4, youtube: null },
  'violet-evergarden': { title: 'Violet Evergarden',              note: 8.7, youtube: null },
  vivy:                { title: "Vivy: Fluorite Eye's Song",      note: 8.4, youtube: null },
  'love-prism':        { title: 'Love Through A Prism',           note: 7.5, youtube: null },
  'carole-tuesday':    { title: 'Carole & Tuesday',              note: 8.3, youtube: null },
  'bunny-girl':        { title: 'Bunny Girl Senpai',             note: 8.2, youtube: null },
  'rent-girlfriend':   { title: 'Rent-a-Girlfriend',             note: 7.0, youtube: null },
  bc:                  { title: 'Black Clover',                   note: 8.2, youtube: null },
  mha:                 { title: 'My Hero Academia',               note: 7.9, youtube: null },
  fireforce:           { title: 'Fire Force',                     note: 7.6, youtube: null },
  bleach:              { title: 'Bleach',                         note: 7.9, youtube: null },
  bluelock:            { title: 'Blue Lock',                      note: 8.2, youtube: null },
  'fate-zero':         { title: 'Fate/Zero',                      note: 8.3, youtube: null },
  'your-name':         { title: 'Your Name',                      note: 8.8, youtube: null },
}

export function getAnimeMeta(id) {
  return ANIME_META[id] || {}
}
