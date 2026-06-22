// src/features/nouveau-monde/data/islands.js
// CONTRAT PARTAGÉ du Nouveau Monde — registre des îles-jeux.
// Source unique consommée par : le hub (carte océan), la page d'île, les classements,
// Mon Log Pose, et le backend (ratingKey = clé d'agrégation prime/ELO par jeu côté Supabase).
// Modifier la liste ici = répercute partout. NE PAS dupliquer ailleurs.
//
// pos = [x, z] sur le plan océan (unités three.js, centre ~0). Espacés pour la nav caméra.
// status: 'live' (jouable) | 'soon' (bientôt). ratingKey = colonne `game` dans game_ratings/match_history.

export const ISLANDS = [
  {
    id: 'echecs', ratingKey: 'echecs',
    title: 'Échecs', tagline: 'La Grand Line stratégique',
    route: '/echecs', status: 'live',
    pos: [-9, -3], accent: '#d4a64b',
    modes: ['solo', 'ami', 'classe'], // Solo/IA, Ami, Classé (prime/ELO)
  },
  {
    id: 'dames', ratingKey: 'dames',
    title: 'Dames Brams', tagline: 'Rafles et couronnements',
    route: '/dames', status: 'live',
    pos: [-3, 4], accent: '#e9c878',
    modes: ['solo', 'ami', 'classe'],
  },
  {
    id: 'fredisu', ratingKey: 'fredisu',
    title: "Fred'isu", tagline: 'Rythme et précision',
    route: '/fredisu', status: 'live',
    pos: [5, -5], accent: '#ff6fb0',
    modes: ['solo'],
  },
  {
    id: 'blind-test', ratingKey: 'blind_test',
    title: 'Blind Test', tagline: "Reconnais l'opening",
    route: '/blind-test', status: 'live',
    pos: [10, 2], accent: '#3fe0c4',
    modes: ['solo', 'ami'],
  },
  {
    id: 'brams-phone', ratingKey: 'brams_phone',
    title: 'Brams Phone', tagline: 'Dessine, devine, délire',
    route: '/brams-phone', status: 'live',
    pos: [2, -10], accent: '#7fc2cf',
    modes: ['ami'],
  },
  {
    id: 'brams-arena', ratingKey: 'brams_arena',
    title: 'Brams Arena', tagline: 'Action 2D, survie',
    route: '/pirate-arena', status: 'live',
    pos: [-12, 6], accent: '#9e3b2e',
    modes: ['solo'],
  },
  {
    id: 'brams-island', ratingKey: 'brams_island',
    title: 'Freydiss Island', tagline: 'Vie cozy 3D',
    route: null, status: 'soon', // app Vite standalone, pas encore intégrée au site
    pos: [12, -11], accent: '#86c46a',
    modes: ['solo'],
  },
];

export const islandById = (id) => ISLANDS.find((i) => i.id === id) || null;
export const liveIslands = () => ISLANDS.filter((i) => i.status === 'live');

// Modes → libellé One Piece pour l'UI des pages d'île
export const MODE_LABEL = {
  solo:   { label: 'Solo (IA)',  hint: "Affronte l'équipage fantôme" },
  ami:    { label: 'Ami',        hint: 'Défie un nakama' },
  classe: { label: 'Classé ฿',   hint: 'Ta prime est en jeu' },
};

export default ISLANDS;
