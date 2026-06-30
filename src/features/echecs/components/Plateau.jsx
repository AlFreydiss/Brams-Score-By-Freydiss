// ── Plateau : wrapper react-chessboard v5 (2D pur) ───────────────────────────
// API v5 : un seul prop `options={{ position, onPieceDrop, onSquareClick,
// boardOrientation, squareStyles, darkSquareStyle, lightSquareStyle, ... }}`
// (vs les nombreuses props individuelles de v4). v5 est responsive : il prend la
// taille de son CONTENEUR → on enferme l'échiquier dans un carré de `taille` px.
//
// Gère : drag & drop ET clic-clic, surbrillance coups légaux (pastille / anneau
// de capture), dernier coup, échec (roi en rouge), PREMOVES (file pendant le tour
// adverse), bouton « retourner le plateau » (flip local), thèmes de plateau,
// coordonnées a–h / 1–8 qui suivent le flip (notation native v5), promotion via
// NOTRE sélecteur (v5 n'a plus de dialog de promotion intégré).
//
// La logique sélection/coup/promotion/premove est extraite dans useInteractionEchecs,
// partagée avec Plateau3D. Le rendu 3D (vrai 3D r3f) vit dans Plateau3D.jsx.
import { useMemo, useCallback, useState, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import SelecteurPromotion from './SelecteurPromotion.jsx'
import { useInteractionEchecs } from '../hooks/useInteractionEchecs.js'
import { THEME, ANIM_PIECE_MS, themePlateau, THEMES_PLATEAU } from '../constants.js'
import { PIECES } from '../../../games/chess/ui/pieces.jsx'

// piece v5 = objet { pieceType: 'wP' } (couleur MAJ + type MAJ). couleur = 'w'|'b'.
const couleurDe = (piece) => {
  const t = typeof piece === 'string' ? piece : piece?.pieceType
  return t ? t[0].toLowerCase() : null
}

export default function Plateau({
  partie,                  // retour de usePartie()
  orientation = 'white',   // 'white' | 'black' — orientation INITIALE
  peutJouer,               // (couleurPiece 'w'|'b') => bool — qui a le droit de bouger
  onCoup,                  // (move chess.js) => void — coup légal joué
  taille = 480,
  interactif = true,
  maCouleur = null,        // 'w'|'b' → active les premoves (file pendant le tour adverse)
  theme,                   // override de thème ; sinon préférence persistée
  // ── Réglages live (useReglagesEchecs) ; défauts = comportement actuel ──
  reglages,                // override de thème live (themeObj) prioritaire si fourni
  animationMs,             // durée d'anim des pièces (ms) ; sinon ANIM_PIECE_MS
  afficherCoupsLegaux = true,   // surbrillance des coups légaux
  afficherDernierCoup = true,   // surbrillance du dernier coup
  afficherEchec = true,         // roi en échec en rouge
  premoveActif = true,          // autorise les premoves (avec maCouleur)
  autoPromo = false,            // promotion auto en Dame (pas de sélecteur)
  coordonnees = 'exterieur',    // 'exterieur' | 'interieur' | 'masque'
}) {
  const { fen, coupsLegaux, dernierCoup, caseRoiEnEchec, trait } = partie

  // Thème : réglage live (reglages) prioritaire, puis prop explicite (theme),
  // sinon préférence persistée + écoute des changements de thème faits depuis la
  // barre du hub (event 'echecs:theme-plateau').
  const [temaId, setTemaId] = useState(() => themePlateau().id)
  useEffect(() => {
    if (theme || reglages) return
    const maj = (e) => setTemaId(e?.detail || themePlateau().id)
    window.addEventListener('echecs:theme-plateau', maj)
    return () => window.removeEventListener('echecs:theme-plateau', maj)
  }, [theme, reglages])
  const tema = reglages || theme || THEMES_PLATEAU[temaId] || themePlateau()

  // Orientation locale : démarre depuis la prop, basculable par le bouton flip.
  // Ne touche PAS la logique des modes (l'orientation n'est qu'un affichage).
  const [flip, setFlip] = useState(false)
  useEffect(() => { setFlip(false) }, [orientation])  // un nouveau mode/couleur réinitialise
  const orientationEff = flip ? (orientation === 'white' ? 'black' : 'white') : orientation

  // pieceSur(square) → 'w'|'b'|null (pour les premoves : reconnaître MES pièces).
  const pieceSur = useCallback((sq) => {
    try { const p = partie.chess.get(sq); return p ? p.color : null } catch { return null }
  }, [partie.chess, fen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Premoves : désactivés si le réglage est off (on neutralise maCouleur côté hook).
  const maCouleurInter = premoveActif ? maCouleur : null
  const inter = useInteractionEchecs(partie, { peutJouer, onCoup, interactif, maCouleur: maCouleurInter, pieceSur, autoPromo })
  const { selection, coupsLegauxSel, promo, premove, onCaseClic, tenterCoup, choisirPromotion, annulerPromo, annulerPremove } = inter

  // ── Handlers react-chessboard v5 (args en objet) ──
  const onSquareClick = useCallback(({ square, piece }) => {
    onCaseClic(square, couleurDe(piece))
  }, [onCaseClic])

  // Drag&drop : on délègue à tenterCoup (promotion-aware + premove-aware).
  const onPieceDrop = useCallback(({ sourceSquare, targetSquare, piece }) => {
    if (!interactif || !targetSquare) return false
    const couleur = couleurDe(piece)
    // Premove : pas mon tour mais c'est ma pièce → on met en file (legal vérifié au retour du trait).
    if (maCouleurInter && couleur === maCouleurInter && couleur !== trait) {
      tenterCoup(sourceSquare, targetSquare)
      return true
    }
    if (!peutJouer?.(couleur) || couleur !== trait) return false
    const legal = coupsLegaux(sourceSquare).some(m => m.to === targetSquare)
    if (!legal) return false
    tenterCoup(sourceSquare, targetSquare)
    return true
  }, [interactif, peutJouer, trait, maCouleurInter, coupsLegaux, tenterCoup])

  const canDragPiece = useCallback(({ piece }) => {
    if (!interactif) return false
    const couleur = couleurDe(piece)
    if (maCouleurInter) return couleur === maCouleurInter   // premoves : je peux saisir mes pièces même hors trait
    return couleur === trait && !!peutJouer?.(couleur)
  }, [interactif, trait, maCouleurInter, peutJouer])

  // ── Surbrillances (conditionnées par les réglages live) ──
  const squareStyles = useMemo(() => {
    const s = {}
    if (afficherDernierCoup && dernierCoup) {
      s[dernierCoup.from] = { background: tema.dernierCoup }
      s[dernierCoup.to]   = { background: tema.dernierCoup }
    }
    // La sélection reste toujours visible (repère de saisie, pas un "indice").
    if (selection) s[selection] = { background: tema.selection }
    if (afficherCoupsLegaux) {
      for (const m of coupsLegauxSel) {
        s[m.to] = m.captured || m.flags?.includes('e')
          ? { ...(s[m.to] || {}), boxShadow: `inset 0 0 0 4px ${tema.anneauCapture}`, borderRadius: 2 }
          : { ...(s[m.to] || {}), background: `${s[m.to]?.background ? s[m.to].background + ', ' : ''}radial-gradient(circle, ${tema.pastilleLegale} 26%, transparent 30%)` }
      }
    }
    // Premove en file : surligne départ + arrivée en bleu (lisible sur tous les thèmes).
    if (premove) {
      s[premove.from] = { ...(s[premove.from] || {}), background: tema.premove }
      s[premove.to]   = { ...(s[premove.to] || {}), background: tema.premove }
    }
    if (afficherEchec && caseRoiEnEchec) s[caseRoiEnEchec] = { ...(s[caseRoiEnEchec] || {}), background: tema.echecRoi }
    return s
  }, [dernierCoup, selection, coupsLegauxSel, premove, caseRoiEnEchec, tema, afficherDernierCoup, afficherCoupsLegaux, afficherEchec])

  const notationTaille = Math.max(9, taille * 0.022)
  const dureeAnim = animationMs ?? ANIM_PIECE_MS
  const montrerNotation = coordonnees !== 'masque'

  const options = useMemo(() => ({
    id: 'plateau-brams',
    pieces: PIECES,
    position: fen,
    boardOrientation: orientationEff,
    onPieceDrop,
    onSquareClick,
    canDragPiece,
    allowDragging: interactif,
    animationDurationInMs: dureeAnim,
    showNotation: montrerNotation,
    squareStyles,
    boardStyle: { borderRadius: 12, overflow: 'hidden', boxShadow: '0 30px 70px -28px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.05)' },
    darkSquareStyle: { backgroundColor: tema.foncee },
    lightSquareStyle: { backgroundColor: tema.claire },
    lightSquareNotationStyle: { fontSize: notationTaille, fontFamily: THEME.fontBody, fontWeight: 700, color: tema.notationClaire },
    darkSquareNotationStyle: { fontSize: notationTaille, fontFamily: THEME.fontBody, fontWeight: 700, color: tema.notationFoncee },
    alphaNotationStyle: { fontSize: notationTaille, fontFamily: THEME.fontBody, fontWeight: 700 },
    numericNotationStyle: { fontSize: notationTaille, fontFamily: THEME.fontBody, fontWeight: 700 },
    dropSquareStyle: { boxShadow: `inset 0 0 0 3px ${THEME.gold}` },
  }), [fen, orientationEff, onPieceDrop, onSquareClick, canDragPiece, interactif, squareStyles, tema, notationTaille, dureeAnim, montrerNotation])

  return (
    <div data-testid="plateau-wrap" style={{ position: 'relative', width: taille, height: taille }}>
      <Chessboard options={options} />

      {/* Bouton retourner le plateau (coin bas-droit, hors plateau) */}
      <button
        onClick={() => setFlip(f => !f)}
        title="Retourner le plateau"
        aria-label="Retourner le plateau"
        style={{
          position: 'absolute', right: -42, bottom: 0, width: 34, height: 34, borderRadius: 10,
          cursor: 'pointer', fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: THEME.card, border: `1px solid ${THEME.cardBorder}`, color: THEME.text,
        }}
      >
        ⇅
      </button>

      {/* Annuler le premove en file (apparaît seulement si premove en attente) */}
      {premove && (
        <button
          onClick={annulerPremove}
          title="Annuler le coup anticipé"
          style={{
            position: 'absolute', right: -42, bottom: 42, width: 34, height: 34, borderRadius: 10,
            cursor: 'pointer', fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(116,185,255,0.16)', border: '1px solid rgba(116,185,255,0.5)', color: THEME.blue,
          }}
        >
          ✕
        </button>
      )}

      {promo && (
        <SelecteurPromotion couleur={trait} onChoisir={choisirPromotion} onAnnuler={annulerPromo} />
      )}
    </div>
  )
}
