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
import { THEME, ANIM_PIECE_MS, TILT_3D_DEG, EPAISSEUR_3D, PERSPECTIVE_3D, PIECE_SCALE_Y_3D, PIECE_LIFT_3D } from '../constants.js'

// CSS de la scène 3D : pièces « debout » (compensation de l'inclinaison du plan,
// transform-origin à la base + ombres doubles + REFLET sur le plateau), lift au
// survol, entrée caméra. Aucune logique de jeu touchée — le hit-testing des
// cases traverse les transforms 3D nativement.
const CSS_3D = `
.p3d-scene [data-piece]{
  transform: translateY(${PIECE_LIFT_3D}) scaleY(${PIECE_SCALE_Y_3D});
  transform-origin: 50% 94%;
  filter: drop-shadow(0 ${Math.round(EPAISSEUR_3D * 0.45)}px 7px rgba(0,0,0,.42))
          drop-shadow(0 3px 2px rgba(0,0,0,.28));
  -webkit-box-reflect: below -46% linear-gradient(transparent 60%, rgba(0,0,0,.20));
  transition: transform .14s ease, filter .14s ease;
}
.p3d-scene [data-piece]:hover{
  transform: translateY(calc(${PIECE_LIFT_3D} - 7px)) scaleY(${PIECE_SCALE_Y_3D});
  filter: drop-shadow(0 ${Math.round(EPAISSEUR_3D * 0.7)}px 12px rgba(0,0,0,.5))
          drop-shadow(0 4px 3px rgba(0,0,0,.28))
          brightness(1.08);
}
.p3d-scene [data-square]{ overflow: visible !important; cursor: pointer; }
.p3d-scene [data-piece] svg{ overflow: visible; }
@keyframes p3dEntree{
  from { transform: translateX(-50%) rotateX(58deg) scale(.9); opacity: 0; }
  to   { transform: translateX(-50%) rotateX(${TILT_3D_DEG}deg) scale(1); opacity: 1; }
}
@keyframes p3dSol{
  from { opacity: 0; } to { opacity: 1; }
}
@media (prefers-reduced-motion: reduce){
  .p3d-scene [data-piece]{ transition: none; }
}
`

export default function Plateau({
  partie,                  // retour de usePartie()
  orientation = 'white',   // 'white' | 'black'
  peutJouer,               // (couleurPiece 'w'|'b') => bool — qui a le droit de bouger
  onCoup,                  // (move chess.js) => void — coup légal joué
  taille = 480,
  interactif = true,
  troisD = false,          // rendu 3D perspective (plateau incliné, pièces debout)
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

  const echiquier = (
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
      customBoardStyle={troisD
        ? { borderRadius: 6 }
        : { borderRadius: 12, overflow: 'hidden', boxShadow: '0 30px 70px -28px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.05)' }}
      customDarkSquareStyle={{ backgroundColor: THEME.caseFoncee }}
      customLightSquareStyle={{ backgroundColor: THEME.caseClaire }}
      customNotationStyle={{ fontSize: Math.max(9, taille * 0.022), fontFamily: THEME.fontBody, fontWeight: 700 }}
      customDropSquareStyle={{ boxShadow: `inset 0 0 0 3px ${THEME.gold}` }}
    />
  )

  if (!troisD) {
    return (
      <div data-testid="plateau-wrap" style={{ position: 'relative', width: taille, height: taille }}>
        {echiquier}
        {promo && (
          <SelecteurPromotion couleur={trait} onChoisir={choisirPromotion} onAnnuler={() => setPromo(null)} />
        )}
      </div>
    )
  }

  // ── Scène 3D : perspective + plateau incliné, cadre bois épais, tranche avant,
  // ombre au sol. La promotion reste À PLAT au-dessus de la scène (lisibilité).
  const cadre = Math.round(taille * 0.028) + 8           // bordure bois autour des cases
  const plaque = taille + cadre * 2
  const hauteurScene = Math.round(plaque * Math.cos(TILT_3D_DEG * Math.PI / 180)) + EPAISSEUR_3D + 24
  return (
    <div data-testid="plateau-wrap" style={{ position: 'relative', width: plaque, height: hauteurScene }}>
      <style>{CSS_3D}</style>
      <div className="p3d-scene" style={{
        position: 'absolute', inset: 0,
        perspective: PERSPECTIVE_3D, perspectiveOrigin: '50% 12%',
      }}>
        {/* ombre portée au sol */}
        <div style={{
          position: 'absolute', left: '2%', right: '2%', bottom: -6, height: plaque * 0.12,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,.55), transparent 70%)',
          filter: 'blur(10px)', animation: 'p3dSol .8s ease both',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: '50%', width: plaque, height: plaque,
          transform: `translateX(-50%) rotateX(${TILT_3D_DEG}deg)`,
          transformOrigin: '50% 100%', transformStyle: 'preserve-3d',
          animation: 'p3dEntree .7s cubic-bezier(.22,1,.36,1) both',
        }}>
          {/* plaque : cadre bois + échiquier */}
          <div style={{
            position: 'absolute', inset: 0, padding: cadre, borderRadius: 14,
            background: 'linear-gradient(135deg, #4a3526, #2e2118 55%, #463224)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07), inset 0 0 26px rgba(0,0,0,.5)',
          }}>
            {echiquier}
            {/* passe d'éclairage : lointain assombri, premier plan réchauffé */}
            <div style={{
              position: 'absolute', inset: cadre, borderRadius: 6, pointerEvents: 'none', zIndex: 6,
              background: 'linear-gradient(180deg, rgba(0,0,0,.42), rgba(0,0,0,0) 36%, rgba(255,228,170,.12) 76%, rgba(255,228,170,.20))',
              mixBlendMode: 'soft-light',
            }} />
          </div>
          {/* tranche avant (épaisseur du plateau) */}
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: EPAISSEUR_3D,
            transform: 'rotateX(-90deg)', transformOrigin: '50% 100%',
            background: 'linear-gradient(#2c2014 , #170f0a)',
            borderRadius: '0 0 10px 10px',
            boxShadow: 'inset 0 2px 3px rgba(255,255,255,.07), inset 0 -8px 14px rgba(0,0,0,.45)',
          }} />
        </div>
      </div>
      {promo && (
        <SelecteurPromotion couleur={trait} onChoisir={choisirPromotion} onAnnuler={() => setPromo(null)} />
      )}
    </div>
  )
}
