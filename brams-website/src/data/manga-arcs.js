// Arc definitions per manga. start/end = chapter numbers (inclusive).
export const MANGA_ARCS = {
  onepiece: [
    { name: 'Arc Egghead', start: 1058, end: 1126 },
    { name: 'Arc Elbaf',   start: 1127, end: 9999 },
  ],

  tpn: [
    { name: 'Évasion de Grace Field',          start: 1,   end: 37  },
    { name: 'Bunker B06-32',                   start: 38,  end: 53  },
    { name: 'Goldy Pond',                      start: 54,  end: 75  },
    { name: 'Guerre de la Capitale Impériale', start: 76,  end: 131 },
    { name: 'Retour à Grace Field',            start: 132, end: 160 },
    { name: 'Lambda & Épilogue',               start: 161, end: 183 },
  ],

  drstone: [
    { name: 'Éveil & Tsukasa',         start: 1,   end: 24  },
    { name: 'Stone Wars',              start: 25,  end: 69  },
    { name: 'Route vers la Civilisation', start: 70, end: 100 },
    { name: 'Île au Trésor',           start: 101, end: 142 },
    { name: 'Nouvelle Amérique',       start: 143, end: 193 },
    { name: 'Amérique du Sud',         start: 194, end: 232 },
  ],

  jjk: [
    { name: 'Introduction',                     start: 1,   end: 12  },
    { name: 'Malédictions en Caveau & Mahito',  start: 13,  end: 31  },
    { name: 'Tournoi de Bon Vouloir de Kyoto',  start: 32,  end: 63  },
    { name: 'Peintures de la Mort',             start: 64,  end: 78  },
    { name: 'Incident de Shibuya',              start: 79,  end: 136 },
    { name: 'Post-Shibuya',                     start: 137, end: 160 },
    { name: "Jeu d'Élimination",                start: 161, end: 222 },
    { name: 'Arc Final',                        start: 223, end: 271 },
  ],

  kingdom: [
    { name: "Formation de l'Armée",         start: 1,   end: 35  },
    { name: 'Bataille de Bayou',            start: 36,  end: 88  },
    { name: 'Campagne de Sanyou',           start: 89,  end: 159 },
    { name: 'Invasion de la Coalition',     start: 160, end: 241 },
    { name: "Campagne du Pays d'Ai",        start: 242, end: 318 },
    { name: 'Campagne de Gyou',             start: 319, end: 392 },
    { name: 'Bataille de Kokuyou',          start: 393, end: 477 },
    { name: 'Invasion du Zhao Occidental',  start: 478, end: 556 },
    { name: "Bataille d'Eikyuu",            start: 557, end: 633 },
    { name: 'Col de Kankoku',               start: 634, end: 714 },
    { name: 'Campagne du Pays de Bei',      start: 715, end: 800 },
    { name: 'Arc Récent',                   start: 801, end: 999 },
  ],

  aot: [
    { name: 'Gouvernement Royal',           start: 57,  end: 69  },
    { name: 'Retour à Shiganshina',         start: 70,  end: 90  },
    { name: 'Marley',                       start: 91,  end: 106 },
    { name: 'Guerre pour Paradis',          start: 107, end: 140 },
  ],

  kny: [
    { name: 'Débuts & Formation',           start: 1,   end: 27  },
    { name: 'Tsuzumi & Montagne Natagumo',  start: 28,  end: 67  },
    { name: 'Rétablissement',               start: 68,  end: 96  },
    { name: 'District des Plaisirs',        start: 97,  end: 117 },
    { name: 'Village des Forgerons',        start: 118, end: 131 },
    { name: 'Entraînement des Piliers',     start: 132, end: 136 },
    { name: "Château de l'Infini",          start: 137, end: 183 },
    { name: 'Fin du Démon Suprême',         start: 184, end: 210 },
  ],

  nnt: [
    { name: 'Les Sept Péchés',             start: 1,   end: 41  },
    { name: 'Festival de Byzel',           start: 42,  end: 102 },
    { name: 'Infiltration du Royaume',     start: 103, end: 168 },
    { name: 'Nouvelle Guerre Sainte',      start: 169, end: 267 },
    { name: 'Camelot & Roi Démon',         start: 268, end: 342 },
  ],

  sl: [
    { name: 'Double Donjon',              start: 0,   end: 14  },
    { name: 'Changement de Classe',       start: 15,  end: 43  },
    { name: 'Porte Rouge',                start: 44,  end: 67  },
    { name: "Île de Jeju",                start: 68,  end: 97  },
    { name: 'Conférence Internationale',  start: 98,  end: 130 },
    { name: 'Guerre des Monarques',       start: 131, end: 202 },
  ],

  dbs: [
    { name: 'Dieu de la Destruction Beerus', start: 1,  end: 4  },
    { name: "Résurrection de Freezer",       start: 5,  end: 9  },
    { name: "Tournoi de l'Univers 6",        start: 10, end: 24 },
    { name: 'Trunks du Futur',               start: 25, end: 32 },
    { name: 'Tournoi du Pouvoir',            start: 33, end: 42 },
    { name: 'Moro — Prisonnier Galactique',  start: 43, end: 67 },
    { name: 'Granolah le Survivant',         start: 68, end: 87 },
    { name: 'Super Hero',                    start: 88, end: 101 },
  ],

  bc: [
    { name: 'Forêt des Sorcières',         start: 89,  end: 113 },
    { name: "Assassinat de l'Empereur",    start: 114, end: 141 },
    { name: 'Réincarnation des Elfes',     start: 142, end: 230 },
    { name: 'Pays de Trèfle',              start: 231, end: 261 },
    { name: 'Raid du Pays de Pique',       start: 262, end: 331 },
    { name: 'Arc Final',                   start: 332, end: 389 },
  ],
}
