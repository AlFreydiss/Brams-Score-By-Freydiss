const c = (id, label, icon = '') => ({ id, label, icon })

export const animeCategories = {
  'one-piece': [
    c('devil-fruits', 'Fruits du demon', 'fruit'),
    c('characters', 'Personnages', 'users'),
    c('crews', 'Equipages', 'flag'),
    c('arcs', 'Arcs', 'route'),
    c('haki', 'Haki', 'spark'),
    c('islands', 'Iles', 'map'),
    c('mysteries', 'Mysteres', 'lock'),
    c('secret-files', 'Dossiers secrets', 'file'),
    c('world-map', 'Carte du monde', 'globe'),
    c('coming-soon', 'Modes bientot', 'timer'),
    c('comparator', 'Comparateur', 'scale'),
  ],
  naruto: [
    c('characters', 'Personnages'), c('clans', 'Clans'), c('jutsu', 'Jutsu'), c('villages', 'Villages'), c('biju', 'Bijus'), c('organizations', 'Organisations'), c('kekkei-genkai', 'Kekkei Genkai'), c('arcs', 'Arcs'), c('secret-files', 'Dossiers secrets'),
  ],
  'dragon-ball': [
    c('characters', 'Personnages'), c('transformations', 'Transformations'), c('techniques', 'Techniques'), c('races', 'Races'), c('planets', 'Planetes'), c('objects', 'Objets'), c('gods', 'Dieux'), c('arcs', 'Arcs'), c('secret-files', 'Dossiers secrets'),
  ],
  bleach: [
    c('characters', 'Personnages'), c('zanpakuto', 'Zanpakuto'), c('shikai', 'Shikai'), c('bankai', 'Bankai'), c('espadas', 'Espadas'), c('hollows', 'Hollows'), c('quincy', 'Quincy'), c('captains', 'Capitaines'), c('arcs', 'Arcs'), c('secret-files', 'Dossiers secrets'),
  ],
  'fullmetal-alchemist': [
    c('characters', 'Personnages'), c('alchemy', 'Alchimie'), c('homunculus', 'Homonculus'), c('transmutations', 'Transmutations'), c('alchemy-circles', "Cercles d'alchimie"), c('amestris', 'Amestris'), c('objects', 'Objets'), c('arcs', 'Arcs'), c('secret-files', 'Dossiers secrets'),
  ],
  'my-hero-academia': [
    c('characters', 'Personnages'), c('quirks', 'Alters'), c('heroes', 'Heros'), c('villains', 'Vilains'), c('ua', 'UA'), c('agencies', 'Agences'), c('rankings', 'Classements'), c('arcs', 'Arcs'), c('secret-files', 'Dossiers secrets'),
  ],
  'the-promised-neverland': [
    c('characters', 'Personnages'), c('farms', 'Fermes'), c('demons', 'Demons'), c('places', 'Lieux'), c('escape-plans', "Plans d'evasion"), c('mysteries', 'Mysteres'), c('arcs', 'Arcs'), c('secret-files', 'Dossiers secrets'),
  ],
  'dr-stone': [
    c('characters', 'Personnages'), c('inventions', 'Inventions'), c('materials', 'Materiaux'), c('science', 'Sciences'), c('kingdoms', 'Royaumes'), c('technologies', 'Technologies'), c('arcs', 'Arcs'), c('secret-files', 'Dossiers secrets'),
  ],
}
