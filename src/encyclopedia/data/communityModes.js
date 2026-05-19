const mode = (animeId, title, description) => ({ animeId, title, description, status: 'Bientot', locked: true })

export const communityModes = [
  ...['Devine le fruit','Devine l’arc','Blind test opening','Blind test OST','Blind test endings','Devine le personnage avec silhouette','Quiz lore','Defis chronometres','Classements communautaires','Recompenses en berries'].map(t => mode('one-piece', t, 'Mode lie au classement Brams, aux berries et aux defis communautaires.')),
  ...['Devine le jutsu','Devine le clan','Devine le village','Quiz Akatsuki'].map(t => mode('naruto', t, 'Mode shinobi prevu pour les archives Naruto.')),
  ...['Devine la transformation','Devine la technique','Devine la planete','Quiz saga'].map(t => mode('dragon-ball', t, 'Mode multivers prevu pour les archives Dragon Ball.')),
  ...['Devine le bankai','Devine le zanpakuto','Devine le capitaine','Quiz Espada'].map(t => mode('bleach', t, 'Mode spirituel prevu pour les archives Bleach.')),
  ...['Devine le cercle','Devine l’homonculus','Quiz alchimie'].map(t => mode('fullmetal-alchemist', t, 'Mode alchimie prevu pour les archives FMA.')),
  ...['Devine l’alter','Devine le heros','Devine le vilain'].map(t => mode('my-hero-academia', t, 'Mode heroique prevu pour les archives MHA.')),
  ...['Devine la ferme','Devine le personnage','Quiz mysteres'].map(t => mode('the-promised-neverland', t, 'Mode mystere prevu pour Grace Field.')),
  ...['Devine l’invention','Devine le materiau','Quiz science'].map(t => mode('dr-stone', t, 'Mode science prevu pour Stonepedia.')),
]
