// ── Resolver des réglages Dames (DOUBLE SOURCE : Nouveau Monde ↔ standalone) ───
// Calque exact de useReglagesEchecs. DamesPage/DamesGame3D tourne À LA FOIS
// embarqué dans Le Nouveau Monde (route /nouveau-monde/dames/jouer, dans
// <GameShell> → useGameShell().settings porte les valeurs du joueur, pilotées par
// le ⚙ SettingsDrawer générique) ET en standalone (/dames, hors provider).
//
// Priorité de fusion par clé :
//   1. useGameShell().settings  (si la clé existe → PRIME, drawer live)
//   2. l'état persisté localStorage du module (fallback standalone)
//   3. les défauts du schéma (DEFAULTS.dames)
//
// Ce hook ne fait que LIRE et NORMALISER : aucune écriture de plateau ici.
import { useMemo } from 'react'
import { useGameShell } from '../../nouveau-monde/game/GameShell'
import { DEFAULTS } from '../../nouveau-monde/game/schemas'
import { VARIANTES } from '../engine/draughts-engine.js'

const DEF = DEFAULTS.dames

// niveauIA (1..4) → identifiant de difficulté du moteur dames. Le 5e palier
// (« legende ») reste atteignable in-game mais le curseur du drawer plafonne à 4.
export const DIFFS_PAR_NIVEAU = ['mousse', 'marin', 'capitaine', 'amiral']
export function diffDepuisCurseur(n) {
  const i = Math.max(0, Math.min(DIFFS_PAR_NIVEAU.length - 1, Math.round(n) - 1))
  return DIFFS_PAR_NIVEAU[i] || 'marin'
}

// vitesseRafle → multiplicateur de durée d'animation des captures enchaînées.
// rapide = animations courtes (×0.55), lent = posé (×1.6).
export const RAFLE_MULT = { rapide: 0.55, normal: 1, lent: 1.6 }

// variante → taille du damier + nombre de rangées peuplées.
// Source unique : le moteur (réutilisable côté serveur sans React).
export { VARIANTES }

function lsBool(cle, def) {
  try { const v = localStorage.getItem(cle); return v == null ? def : v === '1' } catch { return def }
}

// Lit une clé : Nouveau Monde d'abord (drawer), sinon fallback fourni.
function resoudre(settings, cle, fallback) {
  return settings && Object.prototype.hasOwnProperty.call(settings, cle)
    ? settings[cle]
    : fallback
}

export function useReglagesDames() {
  const { settings } = useGameShell()                 // {} hors provider
  const embarque = !!(settings && Object.keys(settings).length)

  return useMemo(() => {
    const vue2DFallback = lsBool('dames_view2d', DEF.vue2D)

    const variante = resoudre(settings, 'variante', DEF.variante)
    const v = VARIANTES[variante] || VARIANTES['10x10']
    const niveauIA = resoudre(settings, 'niveauIA', DEF.niveauIA)
    const vitesseRafle = resoudre(settings, 'vitesseRafle', DEF.vitesseRafle)

    return {
      embarque,
      // Règles (consommées par le moteur — generateMoves(board, side, rules))
      variante,
      size: v.size,
      filledRows: v.filledRows,
      rules: {
        size: v.size,
        priseObligatoire: resoudre(settings, 'priseObligatoire', DEF.priseObligatoire),
        priseMaximale:    resoudre(settings, 'priseMaximale', DEF.priseMaximale),
        dameVolante:      resoudre(settings, 'dameVolante', DEF.dameVolante),
      },
      // Affichage
      vue2D:               resoudre(settings, 'vue2D', vue2DFallback),
      surbrillancePrises:  resoudre(settings, 'surbrillancePrises', DEF.surbrillancePrises),
      coordonnees:         resoudre(settings, 'coordonnees', DEF.coordonnees),
      // Animation
      vitesseRafle,
      rafleMult: RAFLE_MULT[vitesseRafle] ?? 1,
      // Sons
      sons:   resoudre(settings, 'sons', DEF.sons),
      volume: resoudre(settings, 'volume', DEF.volume),
      // Moteur
      niveauIA,
      diff: diffDepuisCurseur(niveauIA),
    }
  }, [settings, embarque])
}
