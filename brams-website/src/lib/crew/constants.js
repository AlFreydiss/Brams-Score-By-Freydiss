// ── Design tokens ────────────────────────────────────────────────────────────

export const C = {
  // Parchemin
  p50:  '#FAF3E0',
  p100: '#F5E6C8',
  p200: '#E8D4A0',
  p300: '#D4B97A',
  p400: '#B8956A',
  p500: '#9C7649',
  p600: '#7A5A32',
  p700: '#5C4226',
  p800: '#3D2817',
  p900: '#1F140A',

  // Or / Bronze
  goldPale:   '#E8D08C',
  goldLight:  '#D4AF37',
  goldMed:    '#B8860B',
  goldDark:   '#8B6914',
  goldBronze: '#A0723D',

  // Marine rouge
  blood:   '#7F1D1D',
  crimson: '#991B1B',
  red:     '#B91C1C',

  // Encre
  ink:       '#0F0A06',
  inkSepia:  '#3D2817',
  inkFaded:  '#5C4A2A',
}

// Couleur de bordure/accent par rôle (warm tones only)
export const ROLE_COLORS = {
  capitaine:   '#B91C1C',
  second:      '#1E3A8A',
  navigateur:  '#EA580C',
  cuisinier:   '#CA8A04',
  sniper:      '#78350F',
  medecin:     '#BE185D',
  archeologue: '#6B21A8',
  charpentier: '#0E5F6A',  // cyan désaturé — PAS néon
  musicien:    '#374151',
  timonier:    '#065F46',
  bretteur:    '#4A1D96',
  mousse:      '#8B4513',
}

export const ROLE_LABELS = {
  capitaine:   'Capitaine',
  second:      'Second',
  navigateur:  'Navigateur',
  cuisinier:   'Cuisinier',
  sniper:      'Sniper',
  medecin:     'Médecin',
  archeologue: 'Archéologue',
  charpentier: 'Charpentier',
  musicien:    'Musicien',
  timonier:    'Timonier',
  bretteur:    'Bretteur',
  mousse:      'Mousse',
}

// 0 = capitaine, 1 = officiers, 2 = membres, 3 = recrues
export const ROLE_LEVEL = {
  capitaine:   0,
  second:      1,
  navigateur:  1,
  cuisinier:   1,
  sniper:      1,
  medecin:     1,
  archeologue: 1,
  charpentier: 1,
  bretteur:    1,
  musicien:    2,
  timonier:    2,
  mousse:      2,
}

// Dimensions de base du poster (avant scale)
export const POSTER_W = 160
export const POSTER_H = 228  // ratio ~5:7

// Marges minimales entre posters
export const POSTER_MARGIN = 20

// Rayons des anneaux (fraction de Math.min(canvasW, canvasH))
export const RING_RADII = [0, 0.21, 0.38, 0.52]

// Scales par anneau
export const RING_SCALES = [1.15, 0.88, 0.70, 0.54]

// Rotation max (degrés) par anneau
export const RING_ROT_MAX = [0, 7, 11, 15]

// Opacité par anneau
export const RING_OPACITY = [1, 1, 1, 0.9]

// zIndex par anneau
export const RING_Z = [100, 70, 50, 30]

// Nb max de membres dans les anneaux 1 et 2
export const RING_MAX = [1, 8, 14, Infinity]
