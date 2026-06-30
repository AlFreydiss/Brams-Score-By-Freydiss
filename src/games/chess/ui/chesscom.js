// ── chesscom.js : jeton de design « clone chess.com fidèle » pour l'univers Échecs.
// Deux exports :
//   cc            → chrome (fond neutre charbon, panneaux, vert chess.com, textes)
//   CHESSCOM_BOARD → thème de plateau compatible Plateau.jsx (board vert/crème)
// Remplace l'ambiance « arène » dark/or par le look board page de chess.com.

export const cc = {
  bg: '#312E2B',        // fond de page chess.com (charbon chaud)
  panel: '#262421',     // panneau latéral (liste de coups, contrôles)
  panelHi: '#2B2825',
  row: '#2A2825',       // ligne joueur au repos
  rowHi: '#3A3733',     // ligne joueur active / hover
  line: '#3D3A36',
  lineHi: '#4A463F',
  text: '#FFFFFF',
  textDim: '#C2BFB9',
  textMute: '#8B8884',
  green: '#81B64C',     // vert d'accent chess.com (boutons, surbrillances)
  greenHi: '#9BCB5E',
  greenDk: '#5C9C3F',
  danger: '#CA3431',
  shadow: '0 18px 48px -22px rgba(0,0,0,0.75)',
  radius: { sm: 5, md: 8, lg: 10, pill: 999 },
}

// Thème de plateau (mêmes clés que les presets de boards.js → drop-in dans Plateau).
export const CHESSCOM_BOARD = {
  id: 'chesscom',
  label: 'Chess.com',
  claire: '#EBECD0',          // cases claires (crème)
  foncee: '#739552',          // cases foncées (vert chess.com)
  notationClaire: '#739552',  // coords sur case claire = vert
  notationFoncee: '#EBECD0',  // coords sur case foncée = crème
  dernierCoup: 'rgba(255,255,51,0.5)',   // surbrillance dernier coup (jaune translucide)
  selection: 'rgba(255,255,51,0.5)',
  pastilleLegale: 'rgba(0,0,0,0.16)',    // pastille coup légal (cercle sombre)
  anneauCapture: 'rgba(0,0,0,0.16)',
  premove: 'rgba(190,70,70,0.6)',        // premove rouge (chess.com)
  echecRoi: 'radial-gradient(ellipse at center, rgba(255,40,40,0.92) 0%, rgba(255,40,40,0) 72%)',
}
