const entry = (animeId, name, category, rarity = 'rare', extra = {}) => ({
  id: `${animeId}:${extra.slug || name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
  animeId,
  slug: extra.slug || name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  name,
  category,
  rarity,
  subtitle: extra.subtitle || '',
  description: extra.description || `${name} est une archive cle de cet univers, classee pour faciliter la recherche et les futures extensions communautaires.`,
  tags: extra.tags || [],
  spoilerLevel: extra.spoilerLevel ?? 1,
  isMajorSpoiler: extra.isMajorSpoiler || false,
  stats: extra.stats,
  relatedIds: extra.relatedIds || [],
})

export const animeEntries = [
  entry('one-piece', 'Monkey D. Luffy', 'characters', 'legendary', { subtitle: 'Capitaine des Mugiwara', tags: ['mugiwara', 'd', 'nika'], spoilerLevel: 4, isMajorSpoiler: true, description: 'Pirate central de la nouvelle ere, porteur du fruit lie a Nika et symbole de liberte.' }),
  entry('one-piece', 'Roronoa Zoro', 'characters', 'epic', { subtitle: 'Sabreur des Mugiwara', tags: ['mugiwara', 'epeiste', 'haki'] }),
  entry('one-piece', 'Nico Robin', 'characters', 'epic', { subtitle: 'Archeologue', tags: ['poneglyphes', 'ohara', 'mugiwara'] }),
  entry('one-piece', 'Shanks le Roux', 'characters', 'mythic', { subtitle: 'Empereur', tags: ['yonko', 'haki', 'roger'] }),
  entry('one-piece', 'Imu', 'mysteries', 'forbidden', { subtitle: 'Trone vide', tags: ['gouvernement', 'secret'], spoilerLevel: 5, isMajorSpoiler: true }),
  entry('one-piece', 'Siècle oublié', 'mysteries', 'secret', { tags: ['poneglyphes', 'joy boy'], spoilerLevel: 5, isMajorSpoiler: true }),
  entry('one-piece', 'East Blue', 'arcs', 'common', { tags: ['debut', 'equipage'] }),
  entry('one-piece', 'Alabasta', 'arcs', 'rare', { tags: ['crocodile', 'vivi'] }),
  entry('one-piece', 'Water Seven', 'arcs', 'epic', { tags: ['franky', 'robin'] }),
  entry('one-piece', 'Marineford', 'arcs', 'legendary', { tags: ['guerre', 'ace'], spoilerLevel: 4 }),
  entry('one-piece', 'Wano', 'arcs', 'mythic', { tags: ['kaido', 'nika'], spoilerLevel: 5, isMajorSpoiler: true }),
  entry('one-piece', 'Haki du Conquerant', 'haki', 'legendary', { tags: ['volonte', 'rois'] }),
  entry('one-piece', 'Equipage du Chapeau de Paille', 'crews', 'legendary', { tags: ['mugiwara', 'sunny'] }),
  entry('one-piece', 'Laugh Tale', 'islands', 'forbidden', { tags: ['roger', 'one piece'], spoilerLevel: 5, isMajorSpoiler: true }),

  ...['Naruto Uzumaki','Sasuke Uchiha','Sakura Haruno','Kakashi Hatake','Itachi Uchiha','Madara Uchiha','Hashirama Senju','Minato Namikaze','Jiraiya','Pain / Nagato','Obito Uchiha','Gaara','Orochimaru','Rock Lee','Shikamaru Nara'].map((n, i) => entry('naruto', n, 'characters', i > 4 ? 'legendary' : 'epic', { tags: ['shinobi'], spoilerLevel: i > 5 ? 4 : 2 })),
  ...['Clan Uchiha','Clan Hyuga','Clan Senju','Clan Uzumaki'].map(n => entry('naruto', n, 'clans', 'legendary', { tags: ['heritage'] })),
  ...['Akatsuki'].map(n => entry('naruto', n, 'organizations', 'secret', { tags: ['organisation'], spoilerLevel: 3 })),
  ...['Konoha','Suna','Kiri','Kumo','Iwa'].map(n => entry('naruto', n, 'villages', 'rare', { tags: ['village cache'] })),
  ...['Rasengan','Chidori','Sharingan','Mangekyo Sharingan','Rinnegan','Amaterasu','Edo Tensei'].map((n, i) => entry('naruto', n, i < 2 ? 'jutsu' : 'kekkei-genkai', i > 3 ? 'legendary' : 'epic', { tags: ['technique'], spoilerLevel: i > 3 ? 4 : 2 })),
  ...['Kyubi','Shukaku','Hachibi'].map(n => entry('naruto', n, 'biju', 'legendary', { tags: ['jinchuriki'] })),

  ...['Son Goku','Vegeta','Son Gohan','Piccolo','Frieza','Cell','Majin Buu','Beerus','Whis','Broly','Trunks','Jiren','Gogeta','Vegito'].map((n, i) => entry('dragon-ball', n, 'characters', i > 6 ? 'legendary' : 'epic', { tags: ['guerrier'], spoilerLevel: i > 7 ? 3 : 1 })),
  ...['Super Saiyan','Super Saiyan 2','Super Saiyan 3','Super Saiyan Blue','Ultra Instinct','Ultra Ego'].map((n, i) => entry('dragon-ball', n, 'transformations', i > 3 ? 'mythic' : 'legendary', { spoilerLevel: i > 3 ? 4 : 2 })),
  ...['Kamehameha','Final Flash','Genkidama','Kaioken'].map(n => entry('dragon-ball', n, 'techniques', 'epic')),
  ...['Dragon Balls','Namek','Planete Vegeta','Terre'].map(n => entry('dragon-ball', n, n === 'Dragon Balls' ? 'objects' : 'planets', 'rare')),

  ...['Ichigo Kurosaki','Rukia Kuchiki','Byakuya Kuchiki','Kenpachi Zaraki','Sosuke Aizen','Kisuke Urahara','Yoruichi','Toshiro Hitsugaya','Yamamoto','Ulquiorra','Grimmjow','Yhwach','Renji','Orihime'].map((n, i) => entry('bleach', n, 'characters', i > 10 ? 'forbidden' : i > 4 ? 'legendary' : 'epic', { spoilerLevel: i > 10 ? 5 : 2 })),
  ...['Zangetsu','Senbonzakura'].map(n => entry('bleach', n, 'zanpakuto', 'legendary')),
  entry('bleach', 'Bankai', 'bankai', 'legendary', { tags: ['pouvoir'] }),
  ...['Soul Society','Hueco Mundo','Espada','Quincy'].map(n => entry('bleach', n, n === 'Espada' ? 'espadas' : n === 'Quincy' ? 'quincy' : 'arcs', 'epic')),

  ...['Edward Elric','Alphonse Elric','Roy Mustang','Riza Hawkeye','Scar','Winry Rockbell','Father','Lust','Envy','Greed','Wrath','Pride','Hohenheim','Armstrong'].map((n, i) => entry('fullmetal-alchemist', n, i > 6 && i < 12 ? 'homunculus' : 'characters', i > 5 ? 'legendary' : 'epic', { spoilerLevel: i > 6 ? 3 : 1 })),
  ...['Pierre philosophale','Verite','Porte','Amestris','Cercle de transmutation','Homonculus'].map((n, i) => entry('fullmetal-alchemist', n, i < 3 ? 'mysteries' : i === 3 ? 'amestris' : 'alchemy', i < 3 ? 'secret' : 'rare', { spoilerLevel: i < 3 ? 4 : 1 })),

  ...['Izuku Midoriya','Katsuki Bakugo','Shoto Todoroki','All Might','Endeavor','Shigaraki','All For One','Ochaco Uraraka','Tenya Iida','Hawks','Dabi','Toga','Eraser Head','Mirio'].map((n, i) => entry('my-hero-academia', n, i > 4 && i < 8 ? 'villains' : 'heroes', i > 5 ? 'legendary' : 'epic', { spoilerLevel: i > 9 ? 3 : 1 })),
  ...['One For All','All For One','UA','Ligue des Vilains','Classe 1-A','Heros Pro'].map((n, i) => entry('my-hero-academia', n, i < 2 ? 'quirks' : i === 1 ? 'villains' : 'ua', i < 2 ? 'legendary' : 'rare')),

  ...['Emma','Norman','Ray','Isabella','Phil','Mujika','Sonju','Peter Ratri','William Minerva','Leuvis'].map((n, i) => entry('the-promised-neverland', n, 'characters', i > 4 ? 'secret' : 'epic', { spoilerLevel: i > 4 ? 3 : 1 })),
  ...['Grace Field','Goldy Pond','Monde des demons','La Promesse','Fermes premium','Plans d’evasion'].map((n, i) => entry('the-promised-neverland', n, i < 2 ? 'farms' : i === 5 ? 'escape-plans' : 'mysteries', i > 1 ? 'secret' : 'rare', { spoilerLevel: i > 1 ? 4 : 1 })),

  ...['Senku Ishigami','Taiju','Yuzuriha','Tsukasa','Chrome','Kohaku','Gen','Ryusui','Suika','Xeno','Stanley','Why-Man'].map((n, i) => entry('dr-stone', n, 'characters', i > 8 ? 'secret' : 'epic', { spoilerLevel: i > 8 ? 4 : 1 })),
  ...['Royaume de la Science','Petrification','Telephone','Sulfa drug','Bateau','Fusee','Materiaux','Stone Wars'].map((n, i) => entry('dr-stone', n, i === 6 ? 'materials' : i > 1 && i < 6 ? 'inventions' : i === 7 ? 'arcs' : 'science', i > 4 ? 'legendary' : 'rare', { spoilerLevel: i > 4 ? 3 : 1 })),
]
