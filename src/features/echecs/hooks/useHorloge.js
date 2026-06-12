// ── useHorloge : pendules basées sur les timestamps SERVEUR ──────────────────
// Vérité = colonnes DB (temps_blanc_ms / temps_noir_ms / trait / dernier_coup_at,
// toutes écrites par les RPC avec now() postgres). Ici : simple décompte visuel
// du joueur au trait + détection locale du drapeau (la réclamation est validée
// côté serveur par echecs_reclamer_temps).
import { useState, useEffect, useRef } from 'react'
import { TIC_HORLOGE_MS, SEUIL_TEMPS_CRITIQUE } from '../constants.js'
import { sons } from '../lib/sons.js'

export function useHorloge({ partie, actif, jouerTic = false }) {
  // partie : ligne echecs_parties (ou null) — relue à chaque coup
  const [tempsBlanc, setTempsBlanc] = useState(null)
  const [tempsNoir, setTempsNoir] = useState(null)
  const dernierTicRef = useRef(0)

  useEffect(() => {
    if (!partie) { setTempsBlanc(null); setTempsNoir(null); return undefined }

    const calc = () => {
      const base = new Date(partie.dernier_coup_at).getTime()
      const ecoule = Math.max(0, Date.now() - base)
      const enCours = actif && partie.statut === 'en_cours'
      const tB = partie.trait === 'blanc' && enCours ? partie.temps_blanc_ms - ecoule : partie.temps_blanc_ms
      const tN = partie.trait === 'noir'  && enCours ? partie.temps_noir_ms  - ecoule : partie.temps_noir_ms
      setTempsBlanc(Math.max(0, tB))
      setTempsNoir(Math.max(0, tN))
      // tic sonore sous le seuil critique (1×/seconde, sur MON horloge seulement)
      if (jouerTic && enCours) {
        const mien = partie.trait === 'blanc' ? tB : tN
        if (mien > 0 && mien < SEUIL_TEMPS_CRITIQUE && Date.now() - dernierTicRef.current > 950) {
          dernierTicRef.current = Date.now()
          sons.tic()
        }
      }
    }
    calc()
    const timer = setInterval(calc, TIC_HORLOGE_MS)
    return () => clearInterval(timer)
  }, [partie, actif, jouerTic])

  return {
    tempsBlanc, tempsNoir,
    drapeauBlanc: tempsBlanc != null && tempsBlanc <= 0,
    drapeauNoir:  tempsNoir != null && tempsNoir <= 0,
  }
}
