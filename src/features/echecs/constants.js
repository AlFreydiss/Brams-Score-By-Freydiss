// ── Échecs Brams — constantes globales du module ────────────────────────────
// Toutes les valeurs magiques vivent ici (standard du projet).
// DA : tokens NEUTRES PREMIUM partagés (neutralTheme) — charcoal + un seul accent
// or laiton, mono pour chiffres. Niveau chess.com / lichess, zéro One Piece criard.
import { fonts as nfonts, ui, echecsBoards, ECHECS_BOARD_DEFAUT, marks } from '../games/neutralTheme.js'

// Palette du module : dérivée des tokens neutres. `THEME` reste l'API consommée par
// tous les composants → on ne change QUE les valeurs (charcoal premium, 1 accent or).
export const THEME = {
  bg:            ui.bg,
  bgElev:        ui.bgElev,
  surface:       ui.surface,
  surfaceHi:     ui.surfaceHi,
  card:          ui.surface,                     // carte opaque (plus de glass criard)
  cardBorder:    ui.line,
  cardBorderHover: ui.lineHi,
  text:          ui.text,
  textDim:       ui.textDim,
  muted:         ui.textMute,
  accent:        ui.bad,                         // rouge sobre (danger / abandon)
  accentHover:   ui.bad,
  gold:          ui.accent,                      // or laiton — accent retenu unique
  goldHi:        ui.accentHi,
  accentInk:     ui.accentInk,
  success:       ui.good,
  blue:          ui.info,
  warn:          ui.warn,
  radius:        ui.radius,
  space:         ui.space,
  shadow:        ui.shadow,
  fontBody:      nfonts.body,
  fontDisplay:   nfonts.display,
  fontMono:      nfonts.mono,
  fontPirate:    nfonts.display,

  caseClaire:    echecsBoards[ECHECS_BOARD_DEFAUT].clair,
  caseFoncee:    echecsBoards[ECHECS_BOARD_DEFAUT].sombre,
  notationClaire:'#7a6a4a',
  notationFoncee:'#efe6d2',
  dernierCoup:   marks.dernier,
  selection:     marks.selection,
  pastilleLegale:marks.legal,
  anneauCapture: marks.capture,
  echecRoi:      marks.echec,
}

// Notation lisible dérivée d'une paire de cases (clair foncé) — contraste auto.
function notation(clair, sombre) {
  return { notationClaire: assombrir(clair, 0.5), notationFoncee: eclaircir(sombre, 0.6) }
}
// helpers hex → ajuste la luminosité (mélange vers noir/blanc). Hex 6 chiffres only.
function mix(hex, vers, k) {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16)
  const t = vers === 'noir' ? 0 : 255
  const mr = Math.round(r + (t - r) * k), mg = Math.round(g + (t - g) * k), mb = Math.round(b + (t - b) * k)
  return '#' + [mr, mg, mb].map(v => v.toString(16).padStart(2, '0')).join('')
}
const assombrir = (h, k) => mix(h, 'noir', k)
const eclaircir = (h, k) => mix(h, 'blanc', k)

// ── Thèmes de plateau NEUTRES (façon chess.com) wirés sur echecsBoards (tokens
// partagés). Chaque thème porte ses surbrillances (héritées de `marks`, donc
// cohérentes échecs↔dames). Sélection persistée (CLE_THEME_PLATEAU).
// id = clé echecsBoards → le sélecteur du lobby tape directement dedans.
function themePlateauDepuis(id) {
  const b = echecsBoards[id]
  return {
    id, label: b.label, claire: b.clair, foncee: b.sombre,
    ...notation(b.clair, b.sombre),
    dernierCoup: marks.dernier,
    selection: marks.selection,
    pastilleLegale: marks.legal,
    anneauCapture: marks.capture,
    premove: 'rgba(111,168,214,0.45)',           // bleu info sobre (coup anticipé)
    echecRoi: marks.echec,
  }
}
export const THEMES_PLATEAU = Object.fromEntries(
  Object.keys(echecsBoards).map(id => [id, themePlateauDepuis(id)])
)
export const THEME_PLATEAU_DEFAUT = ECHECS_BOARD_DEFAUT
export const CLE_THEME_PLATEAU = 'echecs_theme_plateau'

export function themePlateau() {
  try { return THEMES_PLATEAU[localStorage.getItem(CLE_THEME_PLATEAU)] || THEMES_PLATEAU[THEME_PLATEAU_DEFAUT] }
  catch { return THEMES_PLATEAU[THEME_PLATEAU_DEFAUT] }
}
export function setThemePlateau(id) {
  try {
    if (THEMES_PLATEAU[id]) {
      localStorage.setItem(CLE_THEME_PLATEAU, id)
      // notifie les plateaux montés ailleurs dans l'arbre (pas de prop drilling)
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('echecs:theme-plateau', { detail: id }))
    }
  } catch {}
}

// Taille du plateau : s'adapte au viewport, plafonnée pour rester net.
export const PLATEAU_MAX_PX = 640
export const PLATEAU_MIN_PX = 280
export const ANIM_PIECE_MS  = 220

// ── Rendu 3D (perspective CSS, façon chess.com) ──
export const CLE_MODE_3D   = 'echecs_3d'   // '1' (défaut) | '0'
export const TILT_3D_DEG   = 33            // inclinaison du plateau
export const EPAISSEUR_3D  = 26            // tranche avant (px)
export const PERSPECTIVE_3D = 1500         // distance caméra (px)
// pièces « debout » : compensation de l'inclinaison (≈1/cos(33°)) + un peu de hauteur
export const PIECE_SCALE_Y_3D = 1.38
export const PIECE_LIFT_3D    = '-13%'

export function modeTroisD() {
  try { return localStorage.getItem(CLE_MODE_3D) !== '0' } catch { return true }
}
export function setModeTroisD(on) {
  try { localStorage.setItem(CLE_MODE_3D, on ? '1' : '0') } catch {}
}

// Taille auto du plateau selon le mode (3D = plein écran, incliné donc plus large).
// 3D : hauteur projetée ≈ taille × cos(tilt) + tranche → on inverse pour que la
// scène tienne ENTIÈRE entre le header compact et le bas du viewport.
export function taillePlateauAuto(troisD) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900
  if (troisD) {
    const railLarge = vw > 1040 ? 396 : 24   // place pour la colonne d'infos à droite
    const dispoH = vh - 235                  // navbar + header compact + marges
    const parHauteur = dispoH / Math.cos(TILT_3D_DEG * Math.PI / 180) - EPAISSEUR_3D - 90
    return Math.max(300, Math.min(vw - railLarge, parHauteur, 920))
  }
  return Math.max(PLATEAU_MIN_PX, Math.min(560, vw - 32, vh - 260))
}

// Valeurs matérielles (avantage affiché +N)
export const VALEURS_PIECES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
export const ORDRE_CAPTURES = ['q', 'r', 'b', 'n', 'p']
export const GLYPHES_PIECES = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
}

// Cadences proposées (a+b = a minutes + b secondes d'incrément), regroupées par
// famille (façon chess.com / lichess). `cat` = catégorie pour le rendu en chips.
export const CADENCES = [
  { id: '1+0',   label: 'Bullet',    cat: 'Bullet',    minutes: 1,  incrementSec: 0 },
  { id: '2+1',   label: 'Bullet',    cat: 'Bullet',    minutes: 2,  incrementSec: 1 },
  { id: '3+0',   label: 'Blitz',     cat: 'Blitz',     minutes: 3,  incrementSec: 0 },
  { id: '3+2',   label: 'Blitz',     cat: 'Blitz',     minutes: 3,  incrementSec: 2 },
  { id: '5+0',   label: 'Blitz',     cat: 'Blitz',     minutes: 5,  incrementSec: 0 },
  { id: '5+3',   label: 'Blitz',     cat: 'Blitz',     minutes: 5,  incrementSec: 3 },
  { id: '10+0',  label: 'Rapide',    cat: 'Rapide',    minutes: 10, incrementSec: 0 },
  { id: '15+10', label: 'Rapide',    cat: 'Rapide',    minutes: 15, incrementSec: 10 },
  { id: '30+0',  label: 'Classique', cat: 'Classique', minutes: 30, incrementSec: 0 },
  { id: '30+20', label: 'Classique', cat: 'Classique', minutes: 30, incrementSec: 20 },
]
export const CADENCE_DEFAUT = '5+0'
// Familles dans l'ordre d'affichage (chips groupées dans le lobby / matchmaking).
export const CADENCE_CATEGORIES = ['Bullet', 'Blitz', 'Rapide', 'Classique']

export function parseCadence(id) {
  const [min, inc] = String(id || CADENCE_DEFAUT).split('+').map(Number)
  return { baseMs: (min || 5) * 60_000, incrementMs: (inc || 0) * 1000 }
}

// Horloges
export const TIC_HORLOGE_MS        = 200      // fréquence de rafraîchissement visuel
export const SEUIL_TEMPS_CRITIQUE  = 10_000   // < 10 s : rouge + tic sonore
export const DELAI_DECO_MS         = 30_000   // adversaire absent 30 s → alerte déconnexion

// Matchmaking
export const POLL_MATCHMAKING_MS = 4000       // re-tente l'appariement (fenêtre ELO = temps)

// ELO par défaut
export const ELO_DEFAUT = 1200

// Sons
export const VOLUME_DEFAUT = 0.6
export const CLE_VOLUME    = 'echecs_volume'
export const CLE_MUTE      = 'echecs_mute'

// Clés localStorage diverses
export const CLE_NIVEAU_IA  = 'echecs_niveau_ia'
export const CLE_COULEUR_IA = 'echecs_couleur_ia'
export const CLE_CADENCE    = 'echecs_cadence'

// ── Échiquier 3D (vrai 3D r3f) ──────────────────────────────────────────────
export const MODELE_3D_URL = '/models/echecs3d.glb'
// Noms de nœuds réels du GLB (relevés via gltf-transform). 'w'/'b' = couleur ;
// type chess.js p/n/b/r/q/k. Renseignés à partir de la sortie du script list.mjs.
// Le pion est un nœud parent (Pawn_Body_*) avec un enfant (Pawn_Top_*) : cloner
// le nœud body embarque le top, on référence donc le body.
export const NOEUDS_PIECES_3D = {
  w: { p: 'Pawn_Body_W1', n: 'Knight_W1', b: 'Bishop_W1', r: 'Castle_W1', q: 'Queen_W', k: 'King_W' },
  b: { p: 'Pawn_Body_B1', n: 'Knight_B1', b: 'Bishop_B1', r: 'Castle_B1', q: 'Queen_B', k: 'King_B' },
}
export const CREDIT_3D = 'Modèle : A Beautiful Game (Khronos) — CC-BY 4.0'
