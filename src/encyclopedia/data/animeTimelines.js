const item = (animeId, title, spoilerLevel = 1) => ({
  id: `${animeId}:${title.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`,
  animeId,
  title,
  description: `Etape majeure: ${title}. Sert de repere pour filtrer les spoilers et relier les archives importantes.`,
  arcs: [title],
  importantEntries: [],
  spoilerLevel,
  badge: spoilerLevel > 3 ? 'Spoiler' : 'Archive',
})

export const animeTimelines = {
  'one-piece': ['East Blue','Alabasta','Skypiea','Water Seven','Enies Lobby','Thriller Bark','Sabaody','Impel Down','Marineford','Fishman Island','Punk Hazard','Dressrosa','Whole Cake Island','Wano','Egghead','Elbaf'].map((t, i) => item('one-piece', t, i > 13 ? 5 : i > 12 ? 4 : 1)),
  naruto: ['Academie','Examen Chunin','Recherche de Tsunade','Sasuke Retrieval','Akatsuki','Pain','Guerre Ninja','Fin'].map((t, i) => item('naruto', t, i > 5 ? 4 : 1)),
  'dragon-ball': ['Dragon Ball','Saiyan Saga','Namek','Cell','Buu','Battle of Gods','Tournament of Power'].map((t, i) => item('dragon-ball', t, i > 4 ? 3 : 1)),
  bleach: ['Substitute Shinigami','Soul Society','Arrancar','Fullbring','TYBW'].map((t, i) => item('bleach', t, i > 3 ? 5 : 1)),
  'fullmetal-alchemist': ['Debut freres Elric','Pierre philosophale','Homonculus','Briggs','Promised Day'].map((t, i) => item('fullmetal-alchemist', t, i > 3 ? 4 : 1)),
  'my-hero-academia': ['UA','Sports Festival','Stain','Kamino','Overhaul','War','Final Act'].map((t, i) => item('my-hero-academia', t, i > 4 ? 4 : 1)),
  'the-promised-neverland': ['Grace Field','Evasion','Monde exterieur','Goldy Pond','Promesse'].map((t, i) => item('the-promised-neverland', t, i > 1 ? 4 : 1)),
  'dr-stone': ['Reveil','Royaume de la Science','Stone Wars','Exploration','Why-Man'].map((t, i) => item('dr-stone', t, i > 3 ? 5 : 1)),
}
