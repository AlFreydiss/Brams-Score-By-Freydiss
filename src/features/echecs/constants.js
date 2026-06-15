// ── Échecs Brams — constantes globales du module ────────────────────────────
// Toutes les valeurs magiques vivent ici (standard du projet).
import { colors, fonts } from '../../styles/tokens.js'

// Palette du module : réutilise les tokens du site + spécifiques échiquier.
// Cases chaudes « parchemin / bois sombre » — lisibles, cohérentes avec la DA
// One Piece du site (pas de noir + or froid).
export const THEME = {
  bg:            colors.bg,
  surface:       colors.surface,
  card:          'rgba(30,32,36,0.78)',          // glass card
  cardBorder:    colors.border,
  cardBorderHover: colors.borderHover,
  text:          colors.text,
  muted:         colors.muted,
  accent:        colors.accent,                  // #e0524a
  accentHover:   colors.accentHover,
  gold:          colors.gold,                    // #ffd700
  success:       colors.success,
  blue:          colors.blue,
  fontBody:      fonts.body,
  fontDisplay:   fonts.display,
  fontPirate:    fonts.pirate,

  caseClaire:    '#C8B188',                      // parchemin
  caseFoncee:    '#71503C',                      // bois sombre chaud
  notationClaire:'#5d4534',
  notationFoncee:'#e3d3ae',
  dernierCoup:   'rgba(255, 215, 0, 0.32)',      // surbrillance or du dernier coup
  selection:     'rgba(255, 215, 0, 0.45)',
  pastilleLegale:'rgba(20, 14, 8, 0.32)',        // pastille coup légal (case vide)
  anneauCapture: 'rgba(224, 82, 74, 0.85)',      // anneau sur capture possible
  echecRoi:      'radial-gradient(circle, rgba(224,82,74,.85) 18%, rgba(224,82,74,.35) 55%, transparent 72%)',
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

// Cadences proposées (a+b = a minutes + b secondes d'incrément)
export const CADENCES = [
  { id: '1+0',   label: 'Bullet',  minutes: 1,  incrementSec: 0,  emoji: '🔥' },
  { id: '3+2',   label: 'Blitz',   minutes: 3,  incrementSec: 2,  emoji: '⚡' },
  { id: '5+0',   label: 'Blitz',   minutes: 5,  incrementSec: 0,  emoji: '⚡' },
  { id: '10+0',  label: 'Rapide',  minutes: 10, incrementSec: 0,  emoji: '⛵' },
  { id: '15+10', label: 'Rapide',  minutes: 15, incrementSec: 10, emoji: '⛵' },
]
export const CADENCE_DEFAUT = '5+0'

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
