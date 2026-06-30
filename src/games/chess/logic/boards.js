// ── Presets de plateau pour l'univers Échecs (2D strict) ────────────────────
// On réutilise les thèmes existants (THEMES_PLATEAU, dérivés des tokens partagés
// echecsBoards) et on AJOUTE le preset « Nuit » demandé par le spec — localement,
// sans toucher neutralTheme.js. Chaque thème porte ses surbrillances (héritées de
// `marks`) → compatible direct avec le prop `theme` de Plateau.jsx.
import { THEMES_PLATEAU, THEME_PLATEAU_DEFAUT } from '../../../features/echecs/constants.js'
import { marks } from '../../../features/games/neutralTheme.js'
import { CHESSCOM_BOARD } from '../ui/chesscom.js'

// helpers hex → notation lisible (contraste auto), repris de constants.js.
function mix(hex, vers, k) {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16)
  const t = vers === 'noir' ? 0 : 255
  const m = (x) => Math.round(x + (t - x) * k).toString(16).padStart(2, '0')
  return '#' + m(r) + m(g) + m(b)
}

// Preset « Nuit » (spec : clair #9E9E9E / sombre #4A4A4F) — graphite neutre.
const NUIT = {
  id: 'nuit',
  label: 'Nuit',
  claire: '#9E9E9E',
  foncee: '#4A4A4F',
  notationClaire: mix('#9E9E9E', 'noir', 0.5),
  notationFoncee: mix('#4A4A4F', 'blanc', 0.6),
  dernierCoup: marks.dernier,
  selection: marks.selection,
  pastilleLegale: marks.legal,
  anneauCapture: marks.capture,
  premove: 'rgba(111,168,214,0.45)',
  echecRoi: marks.echec,
}

// Catalogue complet exposé à l'univers (ordre d'affichage stable).
export const BOARDS = { ...THEMES_PLATEAU, nuit: NUIT, chesscom: CHESSCOM_BOARD }
export const BOARD_IDS = ['chesscom', 'bois', 'vert', 'marbre', 'ardoise', 'glace', 'nuit']
export const BOARD_DEFAUT = 'chesscom'

export function boardParId(id) {
  return BOARDS[id] || BOARDS[BOARD_DEFAUT]
}
