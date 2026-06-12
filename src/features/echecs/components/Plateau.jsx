// ── Plateau : wrapper react-chessboard v4 ────────────────────────────────────
// ⚠ Déviation volontaire du brief : react-chessboard v5 exige React 19 (hook
// `use()`), or le site est en React 18 — v5 crashe au rendu. v4.7.3 (>=16.14)
// offre les mêmes capacités via des props individuelles.
// Gère : drag & drop ET clic-clic, surbrillance coups légaux (pastille / anneau
// de capture), dernier coup, échec (roi en rouge), promotion via NOTRE sélecteur
// (le dialog intégré est désactivé par onPromotionCheck → false).
import { useState, useMemo, useCallback } from 'react'
import { Chessboard } from 'react-chessboard'
import SelecteurPromotion from './SelecteurPromotion.jsx'
import { THEME, ANIM_PIECE_MS } from '../constants.js'

export default function Plateau({
  partie,                  // retour de usePartie()
  orientation = 'white',   // 'white' | 'black'
  peutJouer,               // (couleurPiece 'w'|'b') => bool — qui a le droit de bouger
  onCoup,                  // (move chess.js) => void — coup légal joué
  taille = 480,
  interactif = true,
}) {
  const [caseSelection, setCaseSelection] = useState(null)
  const [promo, setPromo] = useState(null)   // { from, to } en attente du choix

  const { fen, coupsLegaux, jouer, dernierCoup, caseRoiEnEchec, trait } = partie

  const legauxDepuisSelection = useMemo(
    () => (caseSelection ? coupsLegaux(caseSelection) : []),
    [caseSelection, coupsLegaux, fen]                          // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Tente un coup from→to ; ouvre le sélecteur si c'est une promotion.
  const tenterCoup = useCallback((from, to) => {
    const legaux = coupsLegaux(from)
    const candidats = legaux.filter(m => m.to === to)
    if (!candidats.length) return false
    if (candidats.some(m => m.promotion)) {       // promotion → choix manuel
      setPromo({ from, to })
      setCaseSelection(null)
      return true
    }
    const mv = jouer({ from, to })
    if (mv) { setCaseSelection(null); onCoup?.(mv) }
    return !!mv
  }, [coupsLegaux, jouer, onCoup])

  const choisirPromotion = useCallback(p => {
    if (!promo) return
    const mv = jouer({ from: promo.from, to: promo.to, promotion: p })
    setPromo(null)
    if (mv) onCoup?.(mv)
  }, [promo, jouer, onCoup])

  // ── Handlers react-chessboard v4 ──
  const onPieceDrop = useCallback((sourceSquare, targetSquare, piece) => {
    if (!interactif || !targetSquare) return false
    const couleur = piece?.[0]
    if (!peutJouer?.(couleur) || couleur !== trait) return false
    return tenterCoup(sourceSquare, targetSquare)
  }, [interactif, peutJouer, trait, tenterCoup])

  const onSquareClick = useCallback((square, piece) => {
    if (!interactif) return
    // un coup légal est cliqué depuis la sélection → jouer
    if (caseSelection && legauxDepuisSelection.some(m => m.to === square)) {
      tenterCoup(caseSelection, square)
      return
    }
    // sélectionne sa propre pièce (au trait), sinon désélectionne
    const couleur = piece?.[0]
    if (couleur && couleur === trait && peutJouer?.(couleur)) setCaseSelection(square)
    else setCaseSelection(null)
  }, [interactif, caseSelection, legauxDepuisSelection, tenterCoup, trait, peutJouer])

  const isDraggablePiece = useCallback(({ piece }) => {
    if (!interactif) return false
    const couleur = piece?.[0]
    return couleur === trait && !!peutJouer?.(couleur)
  }, [interactif, trait, peutJouer])

  // ── Surbrillances ──
  const customSquareStyles = useMemo(() => {
    const s = {}
    if (dernierCoup) {
      s[dernierCoup.from] = { background: THEME.dernierCoup }
      s[dernierCoup.to]   = { background: THEME.dernierCoup }
    }
    if (caseSelection) s[caseSelection] = { background: THEME.selection }
    for (const m of legauxDepuisSelection) {
      s[m.to] = m.captured || m.flags?.includes('e')
        ? { ...(s[m.to] || {}), boxShadow: `inset 0 0 0 4px ${THEME.anneauCapture}`, borderRadius: 2 }
        : { ...(s[m.to] || {}), background: `${s[m.to]?.background ? s[m.to].background + ', ' : ''}radial-gradient(circle, ${THEME.pastilleLegale} 26%, transparent 30%)` }
    }
    if (caseRoiEnEchec) s[caseRoiEnEchec] = { ...(s[caseRoiEnEchec] || {}), background: THEME.echecRoi }
    return s
  }, [dernierCoup, caseSelection, legauxDepuisSelection, caseRoiEnEchec])

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
        <SelecteurPromotion
          couleur={trait}
          onChoisir={choisirPromotion}
          onAnnuler={() => setPromo(null)}
        />
      )}
    </div>
  )
}
