// ─────────────────────────────────────────────────────────────────────────────
// Tokens NEUTRES PREMIUM partagés par les jeux Brams (Échecs + Dames).
// But : cohérence "un seul produit" entre les deux jeux, niveau chess.com / lichess,
// sobre et pro — PAS de thème One Piece (factions Pirates/Marine retirées).
// Styles inline only (repo inline-only). Importer depuis echecs/ et dames/.
// ─────────────────────────────────────────────────────────────────────────────

export const fonts = {
  display: "'Bricolage Grotesque','Inter',system-ui,sans-serif",
  body: "'Inter',system-ui,sans-serif",
  mono: "'JetBrains Mono','SF Mono',ui-monospace,monospace", // horloges / éval / coups
}

// Chrome de l'app (lobby, HUD, panneaux, modales) — charcoal premium, 1 accent retenu.
export const ui = {
  bg:        '#0d0e11',   // fond appli
  bgElev:    '#121419',   // panneaux
  surface:   '#171a20',   // cartes
  surfaceHi: '#1e222a',   // hover / actif
  line:      'rgba(255,255,255,0.08)',
  lineHi:    'rgba(255,255,255,0.14)',
  text:      '#eceef2',
  textDim:   '#9aa1ad',
  textMute:  '#6b727e',
  accent:    '#c8a45c',   // or laiton retenu (un seul accent, pas de RGB criard)
  accentHi:  '#e0c074',
  accentInk: '#1a1305',   // texte sur accent
  good:      '#7fb86a',   // gain / coup excellent
  bad:       '#d4685a',   // perte / gaffe
  warn:      '#d9a441',
  info:      '#6fa8d6',
  radius:    { sm: 8, md: 12, lg: 18, pill: 999 },
  shadow:    '0 18px 50px -18px rgba(0,0,0,0.75)',
  space:     { xs: 6, sm: 10, md: 16, lg: 24, xl: 36 },
}

// Thèmes de plateau d'ÉCHECS (cases claires/sombres) — sélecteur façon chess.com.
export const echecsBoards = {
  bois:   { clair: '#f0d9b5', sombre: '#b58863', label: 'Bois' },
  vert:   { clair: '#eeeed2', sombre: '#769656', label: 'Vert' },
  marbre: { clair: '#e8e8ea', sombre: '#9aa0ab', label: 'Marbre' },
  ardoise:{ clair: '#cdd3da', sombre: '#5c6470', label: 'Ardoise' },
  glace:  { clair: '#dde6ef', sombre: '#6f8eb0', label: 'Bleu glace' },
}
export const ECHECS_BOARD_DEFAUT = 'bois'

// Plateau de DAMES neutre (bois premium par défaut) + couleurs des pions.
// On parle "Clair / Foncé" (neutre) — plus de Pirates/Marine.
export const damesBoard = {
  bois:    { clair: '#e8d3a8', sombre: '#8a5a3c', label: 'Bois' },
  marbre:  { clair: '#e8e8ea', sombre: '#8c929c', label: 'Marbre' },
  ardoise: { clair: '#cdd3da', sombre: '#566070', label: 'Ardoise' },
}
export const DAMES_BOARD_DEFAUT = 'bois'

// Pions neutres : Foncé (graphite nacré) vs Clair (ivoire), dame = liseré or.
export const damesPieces = {
  fonce:  { base: '#2a2b30', haut: '#3a3c44', bord: '#16171b', label: 'Foncé' },
  clair:  { base: '#efe7d6', haut: '#fbf6ec', bord: '#cdbfa6', label: 'Clair' },
  roi:    '#c8a45c', // liseré couronne
}

// Surbrillances de jeu neutres (dernier coup, coups légaux, sélection, échec).
export const marks = {
  dernier:   'rgba(200,164,92,0.30)',
  selection: 'rgba(200,164,92,0.45)',
  legal:     'rgba(40,40,46,0.35)',     // pastille coup possible (case vide)
  capture:   'rgba(212,104,90,0.85)',   // anneau capture
  echec:     'radial-gradient(circle, rgba(212,104,90,.9) 18%, rgba(212,104,90,.35) 55%, transparent 72%)',
}
