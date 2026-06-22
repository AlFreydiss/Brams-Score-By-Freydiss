// src/features/nouveau-monde/theme/tokens.js
// DA « Le Nouveau Monde » — carte marine vivante (parchemin + océan 3D crépusculaire).
// Source unique de la direction artistique du hub d'arcade. Consommé par TOUS les modules
// (hub, îles, échecs/dames overlays "poster", classements). Inline-styles only : ces tokens
// sont des valeurs JS, jamais des classes. Distinct du reste du site (autre monde) mais cohérent
// marque Brams (One Piece, or champagne, premium).
//
// Usage : import { nm } from "@/features/nouveau-monde/theme/tokens"
//         <div style={{ background: nm.color.abyss, color: nm.color.foam }}>
//         <h1 style={{ ...nm.type.posterTitle }}>AVIS DE RECHERCHE</h1>

export const color = {
  // —— Océan (du plus profond au plus clair) — base des fonds
  abyss:    '#06141f', // near-black teal — fond le plus profond
  deepSea:  '#0b2436',
  sea:      '#103049',
  current:  '#17506b',
  shallow:  '#1f6f8b', // teal vif — eaux peu profondes / accents froids

  // —— Écume / surface
  foam:     '#eaf3f4', // off-white principal (texte sur fond océan)
  foamDim:  '#a9c4cb', // texte secondaire
  mist:     'rgba(234,243,244,0.06)', // voiles/brume sur cards

  // —— Cartographie (parchemin) — panneaux "carte", règles, posters
  parchment:    '#e7d6ad',
  parchmentDim: '#cdb486',
  ink:          '#2a2014', // encre brune sur parchemin
  inkLine:      'rgba(42,32,20,0.55)', // traits de carte

  // —— Accent chaud Brams = valeur / prime ฿ / CTA / leader
  gold:     '#d4a64b',
  goldHi:   '#e9c878', // champagne — highlight, hover
  goldDeep: '#a87a2c',

  // —— Ciel dynamique (interpolé selon l'heure réelle, cf. skyForHour)
  dawn:   '#e8a6a0',
  day:    '#7fc2cf',
  dusk:   '#e07a4d',
  duskHi: '#f0a868',
  night:  '#0a1430',
  biolum: '#3fe0c4', // écume bioluminescente la nuit

  // —— États jeu
  danger:  '#9e3b2e', // échec / défaite / wanted rouge
  win:     '#3f9e6a',
  draw:    '#7a8794',
};

// Ciel dégradé selon l'heure (0–23) → [haut, bas] pour le shader/overlay du hub.
// Crépuscule = signature de la DA (le plus chaud), nuit = bioluminescence.
export function skyForHour(h) {
  if (h < 6)  return [color.night, '#13234a'];               // nuit
  if (h < 9)  return [color.dawn, color.duskHi];             // aube
  if (h < 17) return [color.day, '#cfe9e4'];                 // jour
  if (h < 20) return [color.dusk, color.duskHi];             // crépuscule (signature)
  return [color.night, '#1b2c52'];                           // soir
}

export const fonts = {
  display: "'Bricolage Grotesque', system-ui, sans-serif", // marque (titres UI)
  body:    "'Inter', system-ui, sans-serif",               // marque (texte)
  poster:  "'Cinzel', Georgia, serif",                     // gravé/pièce — posters ฿, "AVIS DE RECHERCHE"
};

export const type = {
  // Hero du hub (sur océan) — Bricolage, gros, serré
  hero: {
    fontFamily: fonts.display, fontWeight: 800,
    fontSize: 'clamp(2.8rem, 6vw, 4.4rem)', lineHeight: 0.98,
    letterSpacing: '-0.03em', fontOpticalSizing: 'auto',
  },
  islandName: { // nom d'île au survol
    fontFamily: fonts.display, fontWeight: 700,
    fontSize: 'clamp(1.1rem, 2.2vw, 1.5rem)', letterSpacing: '-0.01em',
  },
  // Poster gravé — entêtes "Avis de Recherche", titres de modale résultat
  posterTitle: {
    fontFamily: fonts.poster, fontWeight: 700,
    fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  // Prime ฿ — grand chiffre gravé
  bounty: {
    fontFamily: fonts.poster, fontWeight: 700,
    fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '0.02em',
    fontVariantNumeric: 'tabular-nums',
  },
  eyebrow: {
    fontFamily: fonts.body, fontWeight: 600, fontSize: '0.72rem',
    letterSpacing: '0.2em', textTransform: 'uppercase',
  },
  body:  { fontFamily: fonts.body, fontWeight: 400, fontSize: '1rem', lineHeight: 1.6 },
  small: { fontFamily: fonts.body, fontWeight: 400, fontSize: '0.875rem', lineHeight: 1.5 },
  button:{ fontFamily: fonts.body, fontWeight: 600, fontSize: '0.95rem', letterSpacing: '0.01em' },
};

export const radius = { sm: '8px', md: '14px', lg: '22px', pill: '999px' };

export const space = { xs: '6px', sm: '10px', md: '16px', lg: '26px', xl: '42px', xxl: '68px' };

export const shadow = {
  // Profondeur "sous l'eau" — ombres froides + lueur dorée pour les éléments de valeur
  card:    '0 18px 50px -18px rgba(3,10,18,0.7), 0 2px 0 rgba(234,243,244,0.04) inset',
  island:  '0 30px 80px -24px rgba(3,10,18,0.85)',
  goldGlow:'0 0 0 1px rgba(233,200,120,0.5), 0 8px 30px -8px rgba(212,166,75,0.45)',
  bioGlow: '0 0 24px -2px rgba(63,224,196,0.55)',
};

export const motion = {
  // Téléportation < 1,5 s, skippable (cf. DoD)
  teleportMs: 1400,
  easeOut:  [0.16, 1, 0.3, 1],   // expo-out — accostage
  easeInOut:[0.65, 0, 0.35, 1],  // caméra
  drift:    [0.4, 0, 0.6, 1],    // idle océan
  fast: 0.18, base: 0.35, slow: 0.7,
};

// Calques z (le hub empile océan 3D < voiles < UI < transition téléport)
export const z = { ocean: 0, fog: 10, islands: 20, ui: 30, nav: 40, teleport: 90, toast: 100 };

// Lien Google Fonts à charger une seule fois (Cinzel ; Bricolage+Inter déjà chargés par la marque)
export const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&display=swap';

export const nm = { color, skyForHour, fonts, type, radius, space, shadow, motion, z, FONT_HREF };
export default nm;
