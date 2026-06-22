import { useState, useMemo, useCallback, useEffect, useRef } from 'react'

// Décision pure : que faire quand on clique `square` ? Renvoie une action.
export function deciderClic({ square, pieceCouleur, selection, partie, peutJouer }) {
  if (selection) {
    const legaux = partie.coupsLegaux(selection)
    if (legaux.some(m => m.to === square)) return { type: 'move', from: selection, to: square }
  }
  if (pieceCouleur && pieceCouleur === partie.trait && peutJouer?.(pieceCouleur)) {
    return { type: 'select', square }
  }
  return { type: 'deselect' }
}

// Hook partagé par Plateau (2D) et Plateau3D : sélection, coups légaux affichés,
// promotion, PREMOVES (file d'attente pendant le tour adverse). `partie` = retour
// usePartie. `pieceSur(square)` → 'w'|'b'|null. `maCouleur` (optionnel, 'w'|'b')
// active les premoves : un coup tenté hors de mon tour est mis en file et joué dès
// que le trait me revient (si encore légal). Sans maCouleur → comportement v4 strict.
export function useInteractionEchecs(partie, { peutJouer, onCoup, interactif = true, maCouleur = null, pieceSur = null } = {}) {
  const [selection, setSelection] = useState(null)
  const [promo, setPromo] = useState(null)        // { from, to }
  const [premove, setPremove] = useState(null)    // { from, to, promotion? } | null

  const coupsLegauxSel = useMemo(
    () => (selection ? partie.coupsLegaux(selection) : []),
    [selection, partie.fen]                       // eslint-disable-line react-hooks/exhaustive-deps
  )

  const monTrait = maCouleur && partie.trait === maCouleur
  // Premoves actifs seulement si on connaît MA couleur et que ce n'est pas mon tour.
  const premovesActifs = !!maCouleur

  const tenter = useCallback((from, to) => {
    const candidats = partie.coupsLegaux(from).filter(m => m.to === to)
    if (!candidats.length) return
    if (candidats.some(m => m.promotion)) { setPromo({ from, to }); setSelection(null); return }
    const mv = partie.jouer({ from, to })
    if (mv) { setSelection(null); onCoup?.(mv) }
  }, [partie, onCoup])

  // Tente un coup ; si ce n'est pas mon tour et que les premoves sont actifs, met
  // le coup en file au lieu de le rejeter. Le from doit porter une pièce à MOI.
  const tenterOuPremove = useCallback((from, to, promotion) => {
    if (premovesActifs && !monTrait) {
      const couleurDepart = pieceSur?.(from)
      if (couleurDepart && couleurDepart === maCouleur) {
        setPremove(promotion ? { from, to, promotion } : { from, to })
        setSelection(null)
        return
      }
    }
    if (promotion) {
      const mv = partie.jouer({ from, to, promotion })
      if (mv) { setSelection(null); onCoup?.(mv) }
      return
    }
    tenter(from, to)
  }, [premovesActifs, monTrait, pieceSur, maCouleur, partie, onCoup, tenter])

  const onCaseClic = useCallback((square, pieceCouleur) => {
    if (!interactif) return
    // Un clic annule un premove en attente (geste explicite de l'utilisateur).
    if (premove) setPremove(null)
    // Pendant le tour adverse avec premoves : on autorise sélection + premove.
    if (premovesActifs && !monTrait) {
      if (selection) {
        const dejaLegalUnJour = pieceSur?.(selection) === maCouleur
        if (dejaLegalUnJour && square !== selection) { tenterOuPremove(selection, square); return }
      }
      if (pieceSur?.(square) === maCouleur) { setSelection(square); return }
      setSelection(null)
      return
    }
    const a = deciderClic({ square, pieceCouleur, selection, partie, peutJouer })
    if (a.type === 'move') tenter(a.from, a.to)
    else if (a.type === 'select') setSelection(a.square)
    else setSelection(null)
  }, [interactif, premove, premovesActifs, monTrait, selection, pieceSur, maCouleur, partie, peutJouer, tenter, tenterOuPremove])

  const choisirPromotion = useCallback((p) => {
    if (!promo) return
    const mv = partie.jouer({ from: promo.from, to: promo.to, promotion: p })
    setPromo(null)
    if (mv) onCoup?.(mv)
  }, [promo, partie, onCoup])

  // Exécution du premove dès que le trait me revient (si toujours légal).
  useEffect(() => {
    if (!premove || !premovesActifs || !monTrait) return
    const legal = partie.coupsLegaux(premove.from).some(m => m.to === premove.to)
    const pm = premove
    setPremove(null)
    if (!legal) return
    const candidats = partie.coupsLegaux(pm.from).filter(m => m.to === pm.to)
    const promotion = pm.promotion || (candidats.some(m => m.promotion) ? 'q' : undefined)
    const mv = partie.jouer({ from: pm.from, to: pm.to, promotion })
    if (mv) { setSelection(null); onCoup?.(mv) }
  }, [partie.fen, monTrait, premove, premovesActifs]) // eslint-disable-line react-hooks/exhaustive-deps

  const annulerPremove = useCallback(() => setPremove(null), [])

  // tenterCoup : joue (ou met en file) un coup from→to. Exposé pour le drag&drop.
  return {
    selection, coupsLegauxSel, promo, premove,
    onCaseClic, tenterCoup: tenterOuPremove, choisirPromotion,
    annulerPromo: () => setPromo(null), annulerPremove,
  }
}
