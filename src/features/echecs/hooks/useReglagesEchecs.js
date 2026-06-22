// ── Resolver des réglages Échecs (DOUBLE SOURCE : Nouveau Monde ↔ standalone) ─
// EchecsPage tourne À LA FOIS embarqué dans Le Nouveau Monde (route
// /nouveau-monde/echecs/jouer, dans <GameShell> → useGameShell().settings porte
// les valeurs du joueur) ET en standalone (/echecs, hors provider → settings vide).
//
// Ce hook fusionne, par ordre de priorité :
//   1. useGameShell().settings  (si une clé y existe, elle PRIME)
//   2. l'état persisté existant (localStorage via les knobs du module)
//   3. les défauts du schéma (DEFAULTS.echecs)
//
// → embarqué : le drawer ⚙ pilote tout en live (re-render à chaque `set`).
// → standalone : comportement actuel inchangé (knobs localStorage + boutons barre).
//
// On NE casse rien : ce hook ne fait que LIRE et NORMALISER. Les knobs sons
// (volume/mute) restent appliqués via un effet de synchro pour rester live.
import { useEffect, useMemo } from 'react'
import { useGameShell } from '../../nouveau-monde/game/GameShell'
import { DEFAULTS } from '../../nouveau-monde/game/schemas'
import {
  THEMES_PLATEAU, THEME_PLATEAU_DEFAUT, themePlateau as themePlateauStocke,
  modeTroisD,
} from '../constants.js'
import {
  getVolume, setVolume, isMuted as sonsMute, setMuted,
} from '../lib/sons.js'
import { NIVEAUX_IA } from '../lib/niveauxIA.js'

// vitesseAnim → durée d'animation des pièces (ms). instant=0 → pas d'anim.
export const ANIM_MS_PAR_VITESSE = { instant: 0, rapide: 120, normal: 220, lent: 400 }

// Palette daltonien : surbrillances haute-visibilité (bleu/orange = paire la plus
// distinguable en deutéranopie/protanopie) appliquée PAR-DESSUS le thème choisi.
// Ne change pas les cases du plateau, seulement les repères de jeu.
const SURBRILLANCES_DALTONIEN = {
  dernierCoup:    'rgba(0, 114, 178, 0.42)',     // bleu
  selection:      'rgba(0, 158, 115, 0.50)',     // vert-bleu
  pastilleLegale: 'rgba(0, 0, 0, 0.42)',
  anneauCapture:  'rgba(230, 159, 0, 0.95)',     // orange vif (capture)
  premove:        'rgba(86, 180, 233, 0.55)',    // ciel
  echecRoi:       'radial-gradient(circle, rgba(213,94,0,.92) 18%, rgba(213,94,0,.4) 55%, transparent 72%)',
}

// niveauIA (1..8) → id de niveau Stockfish proposé par défaut (8 = Yonkou pleine
// puissance ; 7 ≈ Amiral ; etc.). On mappe linéairement sur la liste des niveaux.
export function idNiveauDepuisCurseur(n) {
  const i = Math.max(0, Math.min(NIVEAUX_IA.length - 1, Math.round(n) - 1))
  return NIVEAUX_IA[i]?.id || NIVEAUX_IA[1].id
}

const DEF = DEFAULTS.echecs

// Lit la valeur d'une clé : Nouveau Monde d'abord, sinon fallback fourni.
function resoudre(settings, cle, fallback) {
  return settings && Object.prototype.hasOwnProperty.call(settings, cle)
    ? settings[cle]
    : fallback
}

export function useReglagesEchecs() {
  const { settings } = useGameShell()                 // {} hors provider
  const embarque = !!(settings && Object.keys(settings).length)

  const r = useMemo(() => {
    // Fallbacks standalone = état persisté actuel (sinon défaut du schéma).
    const themeFallback = (() => {
      try { return themePlateauStocke().id } catch { return THEME_PLATEAU_DEFAUT }
    })()
    const troisDFallback = (() => {
      try { return modeTroisD() } catch { return DEF.plateau3D }
    })()
    const volumeFallback = (() => {
      try { return getVolume() } catch { return DEF.volume }
    })()
    const sonsFallback = (() => {
      try { return !sonsMute() } catch { return DEF.sons }
    })()

    const themePlateau = resoudre(settings, 'themePlateau', themeFallback)
    const plateau3D    = resoudre(settings, 'plateau3D', troisDFallback)
    const vitesseAnim  = resoudre(settings, 'vitesseAnim', DEF.vitesseAnim)
    const coordonnees  = resoudre(settings, 'coordonnees', DEF.coordonnees)
    const niveauIA     = resoudre(settings, 'niveauIA', DEF.niveauIA)

    const daltonien = resoudre(settings, 'daltonien', DEF.daltonien)
    const themeBase = THEMES_PLATEAU[themePlateau] || THEMES_PLATEAU[THEME_PLATEAU_DEFAUT]
    // Daltonien : on garde les CASES du thème (claire/foncee/notation) mais on
    // remplace les surbrillances de jeu par la palette haute-visibilité.
    const themeObj = daltonien ? { ...themeBase, ...SURBRILLANCES_DALTONIEN } : themeBase

    return {
      embarque,
      // Plateau & pièces
      themePlateau,
      themeObj,
      plateau3D,
      // Coups & repères
      coupsLegaux:         resoudre(settings, 'coupsLegaux', DEF.coupsLegaux),
      surbrillanceDernier: resoudre(settings, 'surbrillanceDernier', DEF.surbrillanceDernier),
      indicateurEchec:     resoudre(settings, 'indicateurEchec', DEF.indicateurEchec),
      // Animation & saisie
      vitesseAnim,
      animationMs: ANIM_MS_PAR_VITESSE[vitesseAnim] ?? ANIM_MS_PAR_VITESSE.normal,
      premove:   resoudre(settings, 'premove', DEF.premove),
      autoPromo: resoudre(settings, 'autoPromo', DEF.autoPromo),
      // Affichage
      coordonnees,
      barreEval:       resoudre(settings, 'barreEval', DEF.barreEval),
      piecesCapturees: resoudre(settings, 'piecesCapturees', DEF.piecesCapturees),
      // Sons
      sons:   resoudre(settings, 'sons', sonsFallback),
      volume: resoudre(settings, 'volume', volumeFallback),
      // Accessibilité
      daltonien,
      mesPiecesEnBas: resoudre(settings, 'mesPiecesEnBas', DEF.mesPiecesEnBas),
      // Moteur
      niveauIA,
      niveauIaId: idNiveauDepuisCurseur(niveauIA),
    }
  }, [settings, embarque])

  // ── Synchro sons : volume/mute sont appliqués sur le graphe WebAudio en live.
  // Dérive le master gain dès qu'un réglage change (drawer ⚙ ou barre standalone).
  useEffect(() => {
    setVolume(r.volume)        // applique le gain (et persiste pour le standalone)
    setMuted(!r.sons)          // setMuted recalcule master.gain depuis getVolume()
  }, [r.volume, r.sons])

  return r
}
