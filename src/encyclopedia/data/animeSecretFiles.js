const file = (animeId, title, rarity = 'secret', spoilerLevel = 4, tags = []) => ({
  id: `${animeId}:${title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`,
  animeId,
  title,
  rarity,
  spoilerLevel,
  dangerLevel: rarity === 'forbidden' ? 'Interdit' : 'Classifie',
  summary: `Dossier sensible sur ${title}. Archive masquee en mode sans spoiler et prete a recevoir theorie, sources internes et liens wiki.`,
  tags,
  relatedIds: [],
})

export const animeSecretFiles = [
  ...['Joy Boy','Siecle oublie','Volonte du D.','Imu','Gouvernement Mondial','Armes antiques','Poneglyphes','Nika','Laugh Tale','Elbaf','Fruits mythiques','Origine des fruits du demon'].map((t, i) => file('one-piece', t, i > 2 ? 'forbidden' : 'secret', i > 1 ? 5 : 4, ['archive interdite'])),
  ...['Origine du chakra','Clan Otsutsuki','Verite sur Itachi','Projet Tsuki no Me','Rinnegan','Jinchuriki','Guerre Ninja'].map((t, i) => file('naruto', t, i > 1 ? 'secret' : 'forbidden', i > 1 ? 4 : 5, ['shinobi'])),
  ...['Zeno','Univers effaces','Dieux de la destruction','Anges','Origine des Saiyans','Ultra Instinct','Hierarchie cosmique'].map((t, i) => file('dragon-ball', t, i < 2 ? 'forbidden' : 'secret', i < 2 ? 5 : 4, ['cosmique'])),
  ...['Roi des Ames','Division Zero','Plan d’Aizen','Quincy','Enfer','Verite sur Zangetsu'].map((t, i) => file('bleach', t, i < 2 ? 'forbidden' : 'secret', i < 2 ? 5 : 4, ['spirituel'])),
  ...['La Verite','La Porte','Pere','Pierre philosophale','Promised Day','Sacrifice humain','Amestris'].map((t, i) => file('fullmetal-alchemist', t, i < 2 ? 'forbidden' : 'secret', i < 3 ? 5 : 4, ['alchimie'])),
  ...['One For All','All For One','Origine des alters','Famille Todoroki','Societe heroique','Declin des heros'].map((t, i) => file('my-hero-academia', t, i < 2 ? 'forbidden' : 'secret', i < 2 ? 5 : 3, ['heroique'])),
  ...['La Promesse','Monde des demons','Fermes','William Minerva','Clan Ratri','Verite du systeme'].map((t, i) => file('the-promised-neverland', t, i < 2 ? 'forbidden' : 'secret', 4, ['grace field'])),
  ...['Petrification','Why-Man','Origine du rayon','Reconstruction du monde','Science interdite','Voyage spatial'].map((t, i) => file('dr-stone', t, i < 2 ? 'forbidden' : 'secret', i < 3 ? 5 : 3, ['science'])),
]
