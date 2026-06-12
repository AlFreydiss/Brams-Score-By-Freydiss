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
