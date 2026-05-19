const stats = (rawPower, mobility, defense, utility, rarity, awakeningPotential, combatDanger, versatility) => ({
  rawPower, mobility, defense, utility, rarity, awakeningPotential, combatDanger, versatility,
})

export const onePieceFruits = [
  {
    id: 'one-piece:nika', animeId: 'one-piece', slug: 'nika', name: 'Gomu Gomu no Mi / Hito Hito no Mi, modele Nika', subtitle: 'Zoan mythique - Luffy', category: 'devil-fruits', rarity: 'forbidden', spoilerLevel: 5, isMajorSpoiler: true,
    description: 'Fruit de la liberte absolue, classe comme archive interdite apres son eveil.',
    fruitType: 'mythical-zoan', knownUser: 'Monkey D. Luffy', stats: stats(94, 96, 88, 92, 100, 100, 98, 99),
    strengths: ['Polyvalence extreme', 'Eveil realite cartoon', 'Mobilite et endurance'], weaknesses: ['Depend fortement de la creativite', 'Spoiler majeur', 'Cible prioritaire du Gouvernement'],
    awakening: 'Gear 5 - liberation complete de Nika.', tags: ['nika', 'luffy', 'gear 5'],
  },
  {
    id: 'one-piece:mera-mera-no-mi', animeId: 'one-piece', slug: 'mera-mera-no-mi', name: 'Mera Mera no Mi', subtitle: 'Logia - Ace / Sabo', category: 'devil-fruits', rarity: 'legendary', spoilerLevel: 2,
    description: 'Controle total du feu, tres dangereux en duel et en bataille ouverte.',
    fruitType: 'logia', knownUser: 'Ace / Sabo', stats: stats(88, 72, 64, 65, 86, 80, 88, 72),
    strengths: ['Puissance directe', 'Zone damage', 'Pression constante'], weaknesses: ['Moins defensif que les meilleurs Logia', 'Desavantage naturel contre magma'], awakening: 'Non confirme.', tags: ['feu', 'logia'],
  },
  {
    id: 'one-piece:pika-pika-no-mi', animeId: 'one-piece', slug: 'pika-pika-no-mi', name: 'Pika Pika no Mi', subtitle: 'Logia - Kizaru', category: 'devil-fruits', rarity: 'legendary', spoilerLevel: 2,
    description: 'Lumiere pure: vitesse, lasers et presence militaire dominante.',
    fruitType: 'logia', knownUser: 'Kizaru', stats: stats(84, 100, 70, 74, 90, 78, 91, 82),
    strengths: ['Mobilite absolue', 'Attaques laser', 'Controle de distance'], weaknesses: ['Lecture previsible si l’adversaire anticipe', 'Depend du niveau de Haki'], awakening: 'Non confirme.', tags: ['lumiere', 'amiral'],
  },
  {
    id: 'one-piece:yami-yami-no-mi', animeId: 'one-piece', slug: 'yami-yami-no-mi', name: 'Yami Yami no Mi', subtitle: 'Logia special - Teach', category: 'devil-fruits', rarity: 'forbidden', spoilerLevel: 4,
    description: 'Tenebres capables d’attirer, absorber et neutraliser les pouvoirs.',
    fruitType: 'logia', knownUser: 'Marshall D. Teach', stats: stats(82, 48, 58, 98, 100, 84, 99, 86),
    strengths: ['Annule les fruits', 'Controle gravitationnel', 'Danger strategique'], weaknesses: ['Douleur amplifiee', 'Mobilite faible'], awakening: 'Inconnu.', tags: ['tenebres', 'barbe noire'],
  },
  {
    id: 'one-piece:gura-gura-no-mi', animeId: 'one-piece', slug: 'gura-gura-no-mi', name: 'Gura Gura no Mi', subtitle: 'Paramecia - Whitebeard / Teach', category: 'devil-fruits', rarity: 'forbidden', spoilerLevel: 3,
    description: 'Fruit capable de provoquer des seismes et de menacer le monde.',
    fruitType: 'paramecia', knownUser: 'Whitebeard / Teach', stats: stats(100, 45, 76, 64, 98, 88, 100, 70),
    strengths: ['Destruction massive', 'Menace strategique', 'Brise les defenses'], weaknesses: ['Peu discret', 'Risque collateral enorme'], awakening: 'Non confirme.', tags: ['seisme', 'yonko'],
  },
  {
    id: 'one-piece:ope-ope-no-mi', animeId: 'one-piece', slug: 'ope-ope-no-mi', name: 'Ope Ope no Mi', subtitle: 'Paramecia - Law', category: 'devil-fruits', rarity: 'mythic', spoilerLevel: 3,
    description: 'Fruit chirurgical, tactique, presque imbattable entre de bonnes mains.',
    fruitType: 'paramecia', knownUser: 'Trafalgar Law', stats: stats(76, 82, 70, 100, 96, 94, 90, 98),
    strengths: ['Utilite maximale', 'Teleportation dans Room', 'Potentiel medical unique'], weaknesses: ['Consomme beaucoup d’endurance', 'Exige une precision elevee'], awakening: 'K-Room et attaques internes.', tags: ['room', 'law'],
  },
  {
    id: 'one-piece:magu-magu-no-mi', animeId: 'one-piece', slug: 'magu-magu-no-mi', name: 'Magu Magu no Mi', subtitle: 'Logia - Akainu', category: 'devil-fruits', rarity: 'legendary', spoilerLevel: 3,
    description: 'Magma destructeur, l’un des fruits les plus lethaux en combat frontal.',
    fruitType: 'logia', knownUser: 'Akainu', stats: stats(96, 58, 78, 62, 90, 82, 99, 66),
    strengths: ['Puissance brute', 'Lethalite', 'Pression militaire'], weaknesses: ['Moins flexible hors combat', 'Approche frontale'], awakening: 'Non confirme.', tags: ['magma', 'marine'],
  },
  {
    id: 'one-piece:hie-hie-no-mi', animeId: 'one-piece', slug: 'hie-hie-no-mi', name: 'Hie Hie no Mi', subtitle: 'Logia - Aokiji', category: 'devil-fruits', rarity: 'legendary', spoilerLevel: 2,
    description: 'Glace a grande echelle, controle du terrain et defense remarquable.',
    fruitType: 'logia', knownUser: 'Aokiji', stats: stats(82, 66, 92, 88, 88, 82, 86, 84),
    strengths: ['Controle de zone', 'Defense', 'Neutralisation'], weaknesses: ['Vulnerable aux contres thermiques extremes'], awakening: 'Punk Hazard suggere un effet permanent.', tags: ['glace', 'amiral'],
  },
  {
    id: 'one-piece:tori-tori-phoenix', animeId: 'one-piece', slug: 'tori-tori-phoenix', name: 'Tori Tori no Mi, modele Phoenix', subtitle: 'Zoan mythique - Marco', category: 'devil-fruits', rarity: 'mythic', spoilerLevel: 2,
    description: 'Regeneration bleue, vol et soutien de tres haut niveau.',
    fruitType: 'mythical-zoan', knownUser: 'Marco', stats: stats(74, 90, 96, 86, 94, 84, 82, 88),
    strengths: ['Regeneration', 'Vol', 'Soutien defensif'], weaknesses: ['Puissance pure limitee face aux monstres'], awakening: 'Non confirme.', tags: ['phoenix', 'marco'],
  },
  {
    id: 'one-piece:uo-uo-seiryu', animeId: 'one-piece', slug: 'uo-uo-seiryu', name: 'Uo Uo no Mi, modele Seiryu', subtitle: 'Zoan mythique - Kaido', category: 'devil-fruits', rarity: 'mythic', spoilerLevel: 4,
    description: 'Dragon oriental, puissance imperiale et endurance monstrueuse.',
    fruitType: 'mythical-zoan', knownUser: 'Kaido', stats: stats(98, 82, 100, 78, 96, 90, 100, 82),
    strengths: ['Puissance', 'Defense', 'Vol et elements'], weaknesses: ['Taille exploitable', 'Cible massive'], awakening: 'Non confirme.', tags: ['dragon', 'kaido'],
  },
  {
    id: 'one-piece:ito-ito-no-mi', animeId: 'one-piece', slug: 'ito-ito-no-mi', name: 'Ito Ito no Mi', subtitle: 'Paramecia - Doflamingo', category: 'devil-fruits', rarity: 'epic', spoilerLevel: 2,
    description: 'Fils tranchants, controle, pieges et eveil urbain.',
    fruitType: 'paramecia', knownUser: 'Doflamingo', stats: stats(78, 76, 70, 88, 78, 92, 84, 90),
    strengths: ['Polyvalence', 'Controle des corps', 'Eveil dangereux'], weaknesses: ['Moins destructeur que les fruits interdits'], awakening: 'Transforme l’environnement en fils.', tags: ['fils', 'doflamingo'],
  },
  {
    id: 'one-piece:suna-suna-no-mi', animeId: 'one-piece', slug: 'suna-suna-no-mi', name: 'Suna Suna no Mi', subtitle: 'Logia - Crocodile', category: 'devil-fruits', rarity: 'epic', spoilerLevel: 1,
    description: 'Sable, dessiccation et controle de terrain desertique.',
    fruitType: 'logia', knownUser: 'Crocodile', stats: stats(76, 70, 66, 84, 76, 78, 82, 80),
    strengths: ['Controle', 'Drain hydrique', 'Infiltration'], weaknesses: ['Faiblesse a l’humidite'], awakening: 'Non confirme.', tags: ['sable', 'crocodile'],
  },
  {
    id: 'one-piece:mochi-mochi-no-mi', animeId: 'one-piece', slug: 'mochi-mochi-no-mi', name: 'Mochi Mochi no Mi', subtitle: 'Paramecia special - Katakuri', category: 'devil-fruits', rarity: 'epic', spoilerLevel: 2,
    description: 'Mochi modelable, defense elastique et synergie avec vision du futur.',
    fruitType: 'paramecia', knownUser: 'Katakuri', stats: stats(80, 78, 86, 82, 80, 90, 84, 90),
    strengths: ['Defense', 'Eveil', 'Adaptation'], weaknesses: ['Requiert maitrise technique et Haki'], awakening: 'Transforme l’environnement en mochi.', tags: ['mochi', 'katakuri'],
  },
  {
    id: 'one-piece:hana-hana-no-mi', animeId: 'one-piece', slug: 'hana-hana-no-mi', name: 'Hana Hana no Mi', subtitle: 'Paramecia - Robin', category: 'devil-fruits', rarity: 'rare', spoilerLevel: 1,
    description: 'Fait pousser des membres sur toute surface visible, tres fort en utilite.',
    fruitType: 'paramecia', knownUser: 'Nico Robin', stats: stats(58, 54, 52, 90, 62, 74, 68, 86),
    strengths: ['Utilite', 'Controle', 'Reconnaissance'], weaknesses: ['Transfert de douleur', 'Portee visuelle importante'], awakening: 'Non confirme.', tags: ['robin', 'utilite'],
  },
]
