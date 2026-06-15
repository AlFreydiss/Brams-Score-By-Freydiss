import { useState, useMemo, useCallback } from 'react'

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
// promotion. `partie` = retour usePartie. `pieceSur(square)` → 'w'|'b'|null.
export function useInteractionEchecs(partie, { peutJouer, onCoup, interactif = true } = {}) {
  const [selection, setSelection] = useState(null)
  const [promo, setPromo] = useState(null) // { from, to }

  const coupsLegauxSel = useMemo(
    () => (selection ? partie.coupsLegaux(selection) : []),
    [selection, partie.fen]                       // eslint-disable-line react-hooks/exhaustive-deps
  )

  const tenter = useCallback((from, to) => {
    const candidats = partie.coupsLegaux(from).filter(m => m.to === to)
    if (!candidats.length) return
    if (candidats.some(m => m.promotion)) { setPromo({ from, to }); setSelection(null); return }
    const mv = partie.jouer({ from, to })
    if (mv) { setSelection(null); onCoup?.(mv) }
  }, [partie, onCoup])

  const onCaseClic = useCallback((square, pieceCouleur) => {
    if (!interactif) return
    const a = deciderClic({ square, pieceCouleur, selection, partie, peutJouer })
    if (a.type === 'move') tenter(a.from, a.to)
    else if (a.type === 'select') setSelection(a.square)
    else setSelection(null)
  }, [interactif, selection, partie, peutJouer, tenter])

  const choisirPromotion = useCallback((p) => {
    if (!promo) return
    const mv = partie.jouer({ from: promo.from, to: promo.to, promotion: p })
    setPromo(null)
    if (mv) onCoup?.(mv)
  }, [promo, partie, onCoup])

  // tenterCoup : joue un coup from→to (ouvre le sélecteur de promotion si besoin).
  // Exposé pour le drag&drop (Plateau 2D) qui court-circuite la sélection au clic.
  return { selection, coupsLegauxSel, promo, onCaseClic, tenterCoup: tenter, choisirPromotion, annulerPromo: () => setPromo(null) }
}
