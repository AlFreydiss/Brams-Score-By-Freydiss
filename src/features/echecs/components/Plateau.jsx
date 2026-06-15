// ── Plateau : wrapper react-chessboard v4 (2D pur) ───────────────────────────
// ⚠ Déviation volontaire du brief : react-chessboard v5 exige React 19 (hook
// `use()`), or le site est en React 18 — v5 crashe au rendu. v4.7.3 (>=16.14)
// offre les mêmes capacités via des props individuelles.
// Gère : drag & drop ET clic-clic, surbrillance coups légaux (pastille / anneau
// de capture), dernier coup, échec (roi en rouge), promotion via NOTRE sélecteur
// (le dialog intégré est désactivé par onPromotionCheck → false).
// La logique sélection/coup/promotion est extraite dans useInteractionEchecs,
// partagée avec Plateau3D. Le rendu 3D (vrai 3D r3f) vit dans Plateau3D.jsx.
import { useMemo, useCallback } from 'react'
import { Chessboard } from 'react-chessboard'
import SelecteurPromotion from './SelecteurPromotion.jsx'
import { useInteractionEchecs } from '../hooks/useInteractionEchecs.js'
import { THEME, ANIM_PIECE_MS } from '../constants.js'

export default function Plateau({
  partie,                  // retour de usePartie()
  orientation = 'white',   // 'white' | 'black'
  peutJouer,               // (couleurPiece 'w'|'b') => bool — qui a le droit de bouger
  onCoup,                  // (move chess.js) => void — coup légal joué
  taille = 480,
  interactif = true,
}) {
  const { fen, coupsLegaux, dernierCoup, caseRoiEnEchec, trait } = partie

  const { selection, coupsLegauxSel, promo, onCaseClic, tenterCoup, choisirPromotion, annulerPromo } =
    useInteractionEchecs(partie, { peutJouer, onCoup, interactif })

  // ── Handlers react-chessboard v4 ──
  // Clic : on délègue la décision (sélection/coup/désélection) au hook.
  const onSquareClick = useCallback((square, piece) => {
    onCaseClic(square, piece?.[0])
  }, [onCaseClic])

  // Drag&drop : on joue directement via tenterCoup du hook (promotion-aware) —
  // pas via deux onCaseClic (la closure `selection` ne se mettrait pas à jour
  // entre les deux appels du même tick → le coup ne partirait pas).
  const onPieceDrop = useCallback((sourceSquare, targetSquare, piece) => {
    if (!interactif || !targetSquare) return false
    const couleur = piece?.[0]
    if (!peutJouer?.(couleur) || couleur !== trait) return false
    const legal = coupsLegaux(sourceSquare).some(m => m.to === targetSquare)
    if (!legal) return false
    tenterCoup(sourceSquare, targetSquare)
    return true
  }, [interactif, peutJouer, trait, coupsLegaux, tenterCoup])

  const isDraggablePiece = useCallback(({ piece }) => {
    if (!interactif) return false
    const couleur = piece?.[0]
    return couleur === trait && !!peutJouer?.(couleur)
  }, [interactif, trait, peutJouer])

  // ── Surbrillances (source : selection / coupsLegauxSel du hook) ──
  const customSquareStyles = useMemo(() => {
    const s = {}
    if (dernierCoup) {
      s[dernierCoup.from] = { background: THEME.dernierCoup }
      s[dernierCoup.to]   = { background: THEME.dernierCoup }
    }
    if (selection) s[selection] = { background: THEME.selection }
    for (const m of coupsLegauxSel) {
      s[m.to] = m.captured || m.flags?.includes('e')
        ? { ...(s[m.to] || {}), boxShadow: `inset 0 0 0 4px ${THEME.anneauCapture}`, borderRadius: 2 }
        : { ...(s[m.to] || {}), background: `${s[m.to]?.background ? s[m.to].background + ', ' : ''}radial-gradient(circle, ${THEME.pastilleLegale} 26%, transparent 30%)` }
    }
    if (caseRoiEnEchec) s[caseRoiEnEchec] = { ...(s[caseRoiEnEchec] || {}), background: THEME.echecRoi }
    return s
  }, [dernierCoup, selection, coupsLegauxSel, caseRoiEnEchec])

  return (
    <div data-testid="plateau-wrap" style={{ position: 'relative', width: taille, height: taille }}>
      <Chessboard
        id="plateau-brams"
        position={fen}
        boardWidth={taille}
        boardOrientation={orientation}
        onPieceDrop={onPieceDrop}
        onSquareClick={onSquareClick}
        isDraggablePiece={isDraggablePiece}
        arePiecesDraggable={interactif}
        onPromotionCheck={() => false}
        autoPromoteToQueen={false}
        animationDuration={ANIM_PIECE_MS}
        showBoardNotation
        customSquareStyles={customSquareStyles}
        customBoardStyle={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 30px 70px -28px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.05)' }}
        customDarkSquareStyle={{ backgroundColor: THEME.caseFoncee }}
        customLightSquareStyle={{ backgroundColor: THEME.caseClaire }}
        customNotationStyle={{ fontSize: Math.max(9, taille * 0.022), fontFamily: THEME.fontBody, fontWeight: 700 }}
        customDropSquareStyle={{ boxShadow: `inset 0 0 0 3px ${THEME.gold}` }}
      />
      {promo && (
        <SelecteurPromotion couleur={trait} onChoisir={choisirPromotion} onAnnuler={annulerPromo} />
      )}
    </div>
  )
}
