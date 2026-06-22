// ── useChessSettings : préférences de l'univers Échecs, persistées localStorage ─
// Une seule clé JSON ('brams_chess_settings') pour tout regrouper. Pas de
// dépendance Supabase (aucun helper game_settings trivial ici → localStorage only,
// documenté). Diffuse un event pour que toute instance montée se resynchronise.
import { useState, useEffect, useCallback, useRef } from 'react'
import { BOARD_DEFAUT } from './boards.js'
import { NIVEAU_IA_DEFAUT } from '../../../features/echecs/lib/niveauxIA.js'
import { getVolume, setVolume as setVolumeSon, isMuted, setMuted as setMutedSon } from '../../../features/echecs/lib/sons.js'
import { useAuth } from '../../../contexts/AuthContext.jsx'
import { loadRemoteSettings, saveRemoteSettings } from '../../_shell/settingsSync.js'

const CLE = 'brams_chess_settings'
const EVT = 'brams:chess-settings'

export const REGLAGES_DEFAUT = {
  board: BOARD_DEFAUT,        // preset d'échiquier (boards.js)
  pieceSet: 'cburnett',       // jeu de pièces (react-chessboard défaut)
  coords: true,               // coordonnées a–h / 1–8
  surbrillanceLegale: true,   // pastilles des coups légaux
  surbrillanceHover: true,    // (réservé : react-chessboard gère le hover nativement)
  confirmerCoup: false,       // demander confirmation avant de jouer
  autoQueen: false,           // promotion auto en Dame (sinon dialog Q/R/B/N)
  autoFlipLocal: false,       // retourner l'échiquier à chaque coup (2 joueurs)
  premoves: true,             // coups anticipés
  animations: true,           // animations des pièces
  vitesseAnim: 220,           // durée d'anim (ms)
  niveauIa: NIVEAU_IA_DEFAUT, // niveau IA par défaut
}

function lire() {
  try {
    const brut = localStorage.getItem(CLE)
    const obj = brut ? JSON.parse(brut) : {}
    return { ...REGLAGES_DEFAUT, ...obj }
  } catch { return { ...REGLAGES_DEFAUT } }
}

function ecrire(reglages) {
  try {
    localStorage.setItem(CLE, JSON.stringify(reglages))
    window.dispatchEvent(new CustomEvent(EVT, { detail: reglages }))
  } catch {}
}

export function useChessSettings() {
  const [reglages, setReglages] = useState(lire)
  // sons : volume + mute vivent dans le module sons (clés dédiées) → on les expose ici.
  const [volume, setVolumeState] = useState(getVolume)
  const [muet, setMuetState] = useState(isMuted)
  const { userId } = useAuth()
  const uidRef = useRef(userId); uidRef.current = userId

  useEffect(() => {
    const maj = (e) => setReglages(e?.detail || lire())
    const majStorage = (e) => { if (e.key === CLE) setReglages(lire()) }
    window.addEventListener(EVT, maj)
    window.addEventListener('storage', majStorage)
    return () => { window.removeEventListener(EVT, maj); window.removeEventListener('storage', majStorage) }
  }, [])

  // Au login : tire les réglages du compte (cross-device). Le distant gagne sur le
  // local au premier chargement ; ecrire() ne re-pousse pas (le push n'a lieu que
  // dans set). Best-effort : sans RPC déployée, on garde le localStorage.
  useEffect(() => {
    if (!userId) return
    let mort = false
    loadRemoteSettings('chess').then(remote => {
      if (mort || !remote) return
      const merged = { ...REGLAGES_DEFAUT, ...remote }
      ecrire(merged); setReglages(merged)
    })
    return () => { mort = true }
  }, [userId])

  const set = useCallback((patch) => {
    setReglages(prev => {
      const next = { ...prev, ...patch }
      ecrire(next)
      if (uidRef.current) saveRemoteSettings('chess', next)
      return next
    })
  }, [])

  const setVolume = useCallback((v) => { setVolumeState(v); setVolumeSon(v) }, [])
  const setMuet = useCallback((m) => { setMuetState(m); setMutedSon(m) }, [])

  const reinitialiser = useCallback(() => {
    ecrire({ ...REGLAGES_DEFAUT })
    setReglages({ ...REGLAGES_DEFAUT })
    if (uidRef.current) saveRemoteSettings('chess', { ...REGLAGES_DEFAUT })
  }, [])

  return { reglages, set, volume, setVolume, muet, setMuet, reinitialiser }
}
