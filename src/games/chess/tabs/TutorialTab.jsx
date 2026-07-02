// ── TutorialTab (Échecs) : didacticiel interactif + règles illustrées ────────
// Deux temps :
//  1) DIDACTICIEL JOUABLE — une séquence de leçons pas-à-pas sur un petit
//     échiquier 2D. Chaque leçon = une position (FEN) + une consigne + des cases
//     cibles surlignées. Le joueur DOIT jouer le bon coup pour avancer ; chess.js
//     valide la légalité ET on compare le coup attendu (from/to[/promotion]).
//     Feedback succès/erreur, barre de progression, bouton « suivant ».
//  2) RÈGLES ILLUSTRÉES — mini-diagrammes (MiniBoard lecture seule) : objectif,
//     valeur des pièces, échec & mat, pat, roque, en passant, promotion, nulles.
//
// On NE recode AUCUN moteur : chess.js (déjà dans le projet) gère la légalité, le
// roque, l'en passant, la promotion, l'échec/mat. Le board jouable est un
// react-chessboard direct (drag & clic) câblé sur une instance Chess locale par
// leçon — plus simple que de réutiliser Plateau.jsx (couplé à usePartie, qui ne
// charge pas de FEN arbitraire). MiniBoard sert aux diagrammes statiques.
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import { glass } from '../../_shell/arena/arenaTokens.js'
import MiniBoard from '../ui/MiniBoard.jsx'
import { PIECES } from '../ui/pieces.jsx'
import PuzzleTrainer from '../puzzles/PuzzleTrainer.jsx'
import OpeningTrainer from '../openings-trainer/OpeningTrainer.jsx'
import { boardParId, BOARD_DEFAUT } from '../logic/boards.js'
import { useChessSettings } from '../logic/useChessSettings.js'
import { sons } from '../../../features/echecs/lib/sons.js'

const BRASS = '#81b64c'

// ════════════════════════════════════════════════════════════════════════════
// LEÇONS — chaque entrée décrit une position et le(s) coup(s) attendu(s).
//  fen     : position de départ (chess.js)
//  cibles  : cases à mettre en surbrillance (indice visuel)
//  attendu : prédicat (move chess.js) => bool ; le coup joué doit le satisfaire
//  trait   : couleur que le joueur contrôle (orientation du board)
// ════════════════════════════════════════════════════════════════════════════
const estVers = (...cases) => (mv) => cases.includes(mv.to)

const LECONS = [
  {
    id: 'pion', titre: 'Le Pion', icone: '♙',
    fen: '8/8/8/8/8/8/4P3/8 w - - 0 1', orient: 'white', cibles: ['e3', 'e4'],
    consigne: "Le pion avance tout droit : une case, ou deux depuis sa case de départ. Avance le pion e2.",
    attendu: estVers('e3', 'e4'),
    indice: "Glisse le pion de e2 vers e3 ou e4.",
  },
  {
    id: 'cavalier', titre: 'Le Cavalier', icone: '♘',
    fen: '8/8/8/8/8/8/8/4N3 w - - 0 1', orient: 'white', cibles: ['d3', 'f3', 'c2', 'g2'],
    consigne: "Le cavalier saute en « L ». C'est la seule pièce qui passe par-dessus les autres. Bouge-le.",
    attendu: estVers('d3', 'f3', 'c2', 'g2'),
    indice: "Deux cases puis une perpendiculaire : e1 → d3, f3, c2 ou g2.",
  },
  {
    id: 'fou', titre: 'Le Fou', icone: '♗',
    fen: '8/8/8/8/8/8/8/2B5 w - - 0 1', orient: 'white', cibles: ['a3', 'b2', 'd2', 'e3', 'f4', 'g5', 'h6'],
    consigne: "Le fou glisse en diagonale et reste sur sa couleur de départ. Déplace-le en diagonale.",
    attendu: (mv) => mv.piece === 'b',
    indice: "N'importe quelle case en diagonale depuis c1.",
  },
  {
    id: 'tour', titre: 'La Tour', icone: '♖',
    fen: '8/8/8/8/8/8/8/R7 w - - 0 1', orient: 'white', cibles: ['a2', 'a3', 'a4', 'b1', 'c1', 'd1', 'e1'],
    consigne: "La tour file en lignes droites : verticales ou horizontales. Déplace-la.",
    attendu: (mv) => mv.piece === 'r',
    indice: "Tout droit depuis a1 : sur la colonne a ou la rangée 1.",
  },
  {
    id: 'dame', titre: 'La Dame', icone: '♕',
    fen: '8/8/8/8/8/8/8/3Q4 w - - 0 1', orient: 'white', cibles: ['d2', 'd3', 'd4', 'a1', 'h1', 'a4', 'g4'],
    consigne: "La dame combine tour + fou : lignes droites ET diagonales. La pièce la plus puissante. Bouge-la.",
    attendu: (mv) => mv.piece === 'q',
    indice: "Dans n'importe quelle direction depuis d1.",
  },
  {
    id: 'roi', titre: 'Le Roi', icone: '♔',
    fen: '8/8/8/8/8/8/4K3/8 w - - 0 1', orient: 'white', cibles: ['d3', 'e3', 'f3', 'd2', 'f2', 'd1', 'e1', 'f1'],
    consigne: "Le roi se déplace d'une seule case, dans toutes les directions. Déplace-le.",
    attendu: (mv) => mv.piece === 'k',
    indice: "Une case autour de e2.",
  },
  {
    id: 'prise', titre: 'La prise', icone: '×',
    fen: '8/8/8/3p4/8/1B6/8/8 w - - 0 1', orient: 'white', cibles: ['d5'],
    consigne: "On capture en se déplaçant sur une case occupée par l'adversaire. Prends le pion noir avec le fou.",
    attendu: (mv) => mv.to === 'd5' && !!mv.captured,
    indice: "Le fou en b3 contrôle la diagonale jusqu'à d5.",
  },
  {
    id: 'echec', titre: "Donner échec", icone: '+',
    fen: '4k3/8/8/8/8/8/8/4R3 w - - 0 1', orient: 'white', cibles: ['e8', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'],
    consigne: "Mettre le roi adverse « en échec », c'est le menacer de capture. Donne échec avec la tour.",
    attendu: (mv) => mv.san.includes('+') || mv.san.includes('#'),
    indice: "Monte la tour sur la colonne e, face au roi noir.",
  },
  {
    id: 'mat', titre: 'Échec et mat', icone: '#',
    fen: '6k1/5ppp/8/8/8/8/8/R6K w - - 0 1', orient: 'white', cibles: ['a8'],
    consigne: "Mat du couloir : le roi noir est piégé par ses propres pions. Mate avec la tour sur la 8e rangée.",
    attendu: (mv) => mv.san.includes('#'),
    indice: "Ra1 → a8 : le roi ne peut ni fuir ni parer.",
  },
  {
    id: 'roque', titre: 'Le Roque', icone: '⊕',
    fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', orient: 'white', cibles: ['g1', 'c1'],
    consigne: "Coup spécial roi + tour : le roi va de deux cases vers une tour. Roque côté roi (petit roque).",
    attendu: (mv) => mv.flags.includes('k') || mv.flags.includes('q'),
    indice: "Déplace le roi de e1 vers g1 (ou c1) — la tour suit automatiquement.",
  },
  {
    id: 'enpassant', titre: 'La prise en passant', icone: '⤢',
    fen: '8/8/8/3pP3/8/8/8/8 w - d6 0 1', orient: 'white', cibles: ['d6'],
    consigne: "Un pion noir vient d'avancer de deux cases à côté du tien. Capture-le « en passant » : pousse e5 en d6.",
    attendu: (mv) => mv.flags.includes('e'),
    indice: "Le pion blanc e5 capture en diagonale vers la case vide d6.",
  },
  {
    id: 'promotion', titre: 'La promotion', icone: '★',
    fen: '8/4P3/8/8/8/8/8/8 w - - 0 1', orient: 'white', cibles: ['e8'],
    consigne: "Un pion qui atteint la dernière rangée se transforme — choisis une Dame. Pousse le pion en e8.",
    attendu: (mv) => mv.to === 'e8' && mv.promotion === 'q',
    indice: "Avance e7 → e8, puis choisis la Dame dans la fenêtre.",
  },
]

// ════════════════════════════════════════════════════════════════════════════
// Échiquier jouable d'une leçon (react-chessboard direct, instance Chess locale).
// ════════════════════════════════════════════════════════════════════════════
function PlateauLecon({ lecon, taille, boardId, coords, autoQueen, onReussite, etat, onRejouer }) {
  const tema = useMemo(() => boardParId(boardId), [boardId])
  const chessRef = useRef(null)
  const [fen, setFen] = useState(lecon.fen)
  const [selection, setSelection] = useState(null)
  const [promo, setPromo] = useState(null)        // { from, to } en attente de choix de pièce
  const [erreurCase, setErreurCase] = useState(null)

  // (Ré)initialise l'instance chess.js quand la leçon change ou sur « réessayer ».
  // Leçons mono-pièce = FEN sans roi → chess.js 1.4 valide et throw « missing king ».
  // On charge donc en skipValidation (move/isCheck/isCheckmate marchent quand même).
  useEffect(() => {
    const c = new Chess()
    try { c.load(lecon.fen, { skipValidation: true }) } catch { /* FEN vraiment cassée : board vide */ }
    chessRef.current = c
    setFen(lecon.fen); setSelection(null); setPromo(null); setErreurCase(null)
  }, [lecon.id, etat.cle])

  const reussi = etat.statut === 'reussi'

  // Évalue un coup tenté : légal ? puis = coup attendu ? — chess.js juge la légalité.
  const evaluer = useCallback((from, to, promotion) => {
    const chess = chessRef.current
    let mv = null
    try { mv = chess.move({ from, to, promotion }) } catch { mv = null }
    if (!mv) {              // coup illégal selon chess.js → erreur
      setErreurCase(to)
      sons.illegal?.()
      onReussite('erreur')
      setTimeout(() => setErreurCase(null), 420)
      return false
    }
    if (lecon.attendu(mv)) {         // bon coup
      setFen(chess.fen())
      sonDuCoup(mv, chess.isCheck())
      onReussite('reussi')
      return true
    }
    // coup légal mais pas le bon : on annule et on signale l'erreur
    chess.undo()
    setErreurCase(to)
    sons.illegal?.()
    onReussite('erreur')
    setTimeout(() => setErreurCase(null), 420)
    return false
  }, [lecon, onReussite])

  // Promotion : le coup atteint la dernière rangée pour un pion → on demande la pièce
  // (ou auto-Dame selon le réglage). chess.js confirme la promotion via move().
  const estPromotion = useCallback((from, to) => {
    const chess = chessRef.current
    const p = chess.get(from)
    if (!p || p.type !== 'p') return false
    const r = to[1]
    return (p.color === 'w' && r === '8') || (p.color === 'b' && r === '1')
  }, [])

  const tenter = useCallback((from, to) => {
    if (reussi || promo) return false
    if (estPromotion(from, to)) {
      if (autoQueen) return evaluer(from, to, 'q')
      setPromo({ from, to }); setSelection(null)
      return true
    }
    return evaluer(from, to)
  }, [reussi, promo, estPromotion, autoQueen, evaluer])

  // ── react-chessboard v5 : drag & drop ──
  const onPieceDrop = useCallback(({ sourceSquare, targetSquare }) => {
    if (!targetSquare || reussi) return false
    return tenter(sourceSquare, targetSquare)
  }, [tenter, reussi])

  // ── clic-clic (accessibilité + mobile) ──
  const onSquareClick = useCallback(({ square }) => {
    if (reussi || promo) return
    const chess = chessRef.current
    if (selection) {
      if (square === selection) { setSelection(null); return }
      // si on reclique sur une autre de nos pièces → on change de sélection
      const p = chess.get(square)
      const trait = chess.turn()
      if (p && p.color === trait) { setSelection(square); return }
      tenter(selection, square)
      setSelection(null)
    } else {
      const p = chess.get(square)
      if (p && p.color === chess.turn()) setSelection(square)
    }
  }, [selection, reussi, promo, tenter])

  const canDragPiece = useCallback(({ piece }) => {
    if (reussi) return false
    const couleur = typeof piece === 'string' ? piece[0]?.toLowerCase() : piece?.pieceType?.[0]?.toLowerCase()
    return couleur === chessRef.current?.turn()
  }, [reussi])

  // ── Surbrillances : cibles (indice), sélection, coups légaux, succès, erreur ──
  const squareStyles = useMemo(() => {
    const s = {}
    if (!reussi) {
      for (const sq of (lecon.cibles || [])) {
        s[sq] = { boxShadow: `inset 0 0 0 3px rgba(129,182,76,0.55)`, borderRadius: 4 }
      }
    }
    if (selection) {
      s[selection] = { ...(s[selection] || {}), background: 'rgba(129,182,76,0.42)' }
      const chess = chessRef.current
      if (chess) {
        for (const m of chess.moves({ square: selection, verbose: true })) {
          s[m.to] = m.captured
            ? { ...(s[m.to] || {}), boxShadow: `inset 0 0 0 4px rgba(212,104,90,0.85)`, borderRadius: 2 }
            : { ...(s[m.to] || {}), background: `radial-gradient(circle, rgba(40,40,46,0.35) 26%, transparent 30%)` }
        }
      }
    }
    if (erreurCase) s[erreurCase] = { ...(s[erreurCase] || {}), background: 'rgba(212,104,90,0.55)' }
    if (reussi && lecon.cibles?.length) {
      for (const sq of lecon.cibles) s[sq] = { ...(s[sq] || {}), boxShadow: `inset 0 0 0 3px rgba(127,184,106,0.7)`, borderRadius: 4 }
    }
    return s
  }, [lecon, selection, erreurCase, reussi, fen])

  const notationTaille = Math.max(9, taille * 0.024)
  const options = useMemo(() => ({
    id: `tuto-${lecon.id}`,
    pieces: PIECES,
    position: fen,
    boardOrientation: lecon.orient,
    onPieceDrop,
    onSquareClick,
    canDragPiece,
    allowDragging: !reussi,
    animationDurationInMs: 200,
    showNotation: coords,
    squareStyles,
    boardStyle: { borderRadius: 12, overflow: 'hidden', boxShadow: '0 30px 70px -28px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.05)' },
    darkSquareStyle: { backgroundColor: tema.foncee },
    lightSquareStyle: { backgroundColor: tema.claire },
    lightSquareNotationStyle: { fontSize: notationTaille, fontFamily: fonts.body, fontWeight: 700, color: tema.notationClaire },
    darkSquareNotationStyle: { fontSize: notationTaille, fontFamily: fonts.body, fontWeight: 700, color: tema.notationFoncee },
  }), [fen, lecon, onPieceDrop, onSquareClick, canDragPiece, reussi, coords, squareStyles, tema, notationTaille])

  return (
    <div style={{ position: 'relative', width: taille, height: taille, flexShrink: 0 }}>
      <Chessboard options={options} />

      {/* halo de succès autour du plateau */}
      <div aria-hidden style={{
        position: 'absolute', inset: -2, borderRadius: 14, pointerEvents: 'none', zIndex: 4,
        boxShadow: reussi ? '0 0 0 2px rgba(127,184,106,0.65), 0 0 40px 4px rgba(127,184,106,0.35)' : 'none',
        transition: 'box-shadow 320ms ease',
      }} />

      {/* sélecteur de promotion (réutilise chess.js pour confirmer) */}
      {promo && (
        <PromoChoix
          couleur={chessRef.current?.get(promo.from)?.color || 'w'}
          onChoisir={(piece) => { const f = promo.from, t = promo.to; setPromo(null); evaluer(f, t, piece) }}
          onAnnuler={() => setPromo(null)}
        />
      )}
    </div>
  )
}

// Mini-sélecteur de promotion (Dame/Tour/Fou/Cavalier) — overlay sobre laiton.
function PromoChoix({ couleur, onChoisir, onAnnuler }) {
  const GLY = couleur === 'w'
    ? { q: '♕', r: '♖', b: '♗', n: '♘' }
    : { q: '♛', r: '♜', b: '♝', n: '♞' }
  return (
    <div role="dialog" aria-label="Choisir la pièce de promotion" style={{
      position: 'absolute', inset: 0, zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(8,9,12,0.78)', backdropFilter: 'blur(6px)', borderRadius: 12,
    }} onClick={onAnnuler}>
      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 8, padding: 12, borderRadius: ui.radius.md, background: ui.surface, border: `1px solid ${ui.lineHi}` }}>
        {['q', 'r', 'b', 'n'].map(p => (
          <button key={p} className="tutoFocus" onClick={() => onChoisir(p)} style={{
            width: 52, height: 52, borderRadius: ui.radius.sm, cursor: 'pointer', fontSize: 30, lineHeight: 1,
            color: ui.text, background: ui.bgElev, border: `1px solid ${ui.line}`,
          }} aria-label={{ q: 'Dame', r: 'Tour', b: 'Fou', n: 'Cavalier' }[p]}>{GLY[p]}</button>
        ))}
      </div>
    </div>
  )
}

// Son du coup (réutilise le module sons existant ; garde-fous si une clé manque).
function sonDuCoup(mv, enEchec) {
  try {
    if (mv.promotion) sons.promotion?.()
    else if (enEchec) sons.echec?.()
    else if (mv.flags?.includes('k') || mv.flags?.includes('q')) sons.roque?.()
    else if (mv.captured) sons.capture?.()
    else sons.coup?.()
  } catch {}
}

// ════════════════════════════════════════════════════════════════════════════
// DIDACTICIEL — orchestre la séquence de leçons + feedback + progression.
// ════════════════════════════════════════════════════════════════════════════
function Didacticiel({ taille, boardId, coords, autoQueen }) {
  const [idx, setIdx] = useState(0)
  // statut de la leçon courante : 'attente' | 'reussi' | 'erreur'
  const [etat, setEtat] = useState({ statut: 'attente', cle: 0 })
  const [feedback, setFeedback] = useState(null)   // texte transitoire
  const lecon = LECONS[idx]
  const dernier = idx === LECONS.length - 1

  // reset à chaque changement de leçon
  useEffect(() => { setEtat({ statut: 'attente', cle: 0 }); setFeedback(null) }, [idx])

  const onReussite = useCallback((res) => {
    if (res === 'reussi') {
      setEtat(e => ({ ...e, statut: 'reussi' }))
      setFeedback({ ok: true, txt: dernier ? 'Bravo, tu as terminé le didacticiel.' : 'Bien joué.' })
    } else {
      setEtat(e => ({ ...e, statut: 'erreur' }))
      setFeedback({ ok: false, txt: lecon.indice })
    }
  }, [dernier, lecon])

  const reessayer = useCallback(() => {
    setEtat(e => ({ statut: 'attente', cle: e.cle + 1 }))
    setFeedback(null)
  }, [])

  const suivant = useCallback(() => { if (!dernier) setIdx(i => i + 1) }, [dernier])
  const precedent = useCallback(() => { if (idx > 0) setIdx(i => i - 1) }, [idx])
  const recommencer = useCallback(() => setIdx(0), [])

  const reussi = etat.statut === 'reussi'
  const progres = Math.round(((reussi ? idx + 1 : idx) / LECONS.length) * 100)

  return (
    <section style={{
      ...railVerre(), padding: 0, overflow: 'hidden',
      gridColumn: '1 / -1', display: 'grid',
      gridTemplateColumns: taille >= 360 ? 'auto minmax(0,1fr)' : '1fr', gap: 0, alignItems: 'stretch',
    }}>
      {/* Colonne plateau */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px,2vw,26px)', borderRight: `1px solid ${glass.border}` }}>
        <PlateauLecon
          lecon={lecon} taille={taille} boardId={boardId} coords={coords} autoQueen={autoQueen}
          etat={etat} onReussite={onReussite}
        />
      </div>

      {/* Colonne consigne / feedback / navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: 'clamp(18px,2vw,28px)', minWidth: 0, gap: 16 }}>
        {/* en-tête + progression */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <span style={{ font: `700 11px ${fonts.body}`, letterSpacing: '0.16em', textTransform: 'uppercase', color: BRASS }}>
              Leçon {idx + 1} / {LECONS.length}
            </span>
            <span style={{ font: `600 11px ${fonts.mono}`, color: ui.textMute, fontVariantNumeric: 'tabular-nums' }}>{progres}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div className="tutoBar" style={{ height: '100%', width: `${progres}%`, background: `linear-gradient(90deg, ${BRASS}, #e0c074)`, borderRadius: 999 }} />
          </div>
        </div>

        <div>
          <h3 style={{ margin: '0 0 8px', font: `800 22px ${fonts.display}`, letterSpacing: '-0.02em', color: ui.text, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span aria-hidden style={{ fontSize: 26, color: BRASS }}>{lecon.icone}</span>{lecon.titre}
          </h3>
          <p style={{ margin: 0, font: `400 14.5px ${fonts.body}`, color: ui.textDim, lineHeight: 1.6 }}>{lecon.consigne}</p>
        </div>

        {/* zone feedback (réservée pour éviter le saut de layout) */}
        <div aria-live="polite" style={{ minHeight: 58 }}>
          {feedback && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px', borderRadius: ui.radius.sm,
              background: feedback.ok ? 'rgba(127,184,106,0.12)' : 'rgba(212,104,90,0.12)',
              border: `1px solid ${feedback.ok ? 'rgba(127,184,106,0.45)' : 'rgba(212,104,90,0.45)'}`,
            }}>
              <span aria-hidden style={{ fontSize: 16, lineHeight: 1.4, color: feedback.ok ? ui.good : ui.bad }}>{feedback.ok ? '✓' : '✕'}</span>
              <span style={{ font: `500 13.5px ${fonts.body}`, color: feedback.ok ? '#cdeac0' : '#f0c3bb', lineHeight: 1.5 }}>{feedback.txt}</span>
            </div>
          )}
        </div>

        {/* navigation */}
        <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <button className="tutoFocus" onClick={precedent} disabled={idx === 0} style={btnSecondaire(idx === 0)}>← Précédent</button>
          {!reussi && etat.statut === 'erreur' && (
            <button className="tutoFocus" onClick={reessayer} style={btnSecondaire(false)}>Réessayer</button>
          )}
          {reussi && !dernier && (
            <button className="tutoFocus tutoPrimaire" onClick={suivant} style={btnPrincipal()}>Suivant →</button>
          )}
          {reussi && dernier && (
            <button className="tutoFocus tutoPrimaire" onClick={recommencer} style={btnPrincipal()}>↻ Recommencer</button>
          )}
          {!reussi && (
            <button className="tutoFocus" onClick={() => setFeedback({ ok: false, txt: lecon.indice })} style={{ ...btnSecondaire(false), marginLeft: 'auto', color: ui.textMute }}>Indice</button>
          )}
        </div>
      </div>
    </section>
  )
}

function btnPrincipal() {
  return {
    padding: '11px 20px', borderRadius: ui.radius.sm, cursor: 'pointer', border: 'none',
    font: `800 14px ${fonts.display}`, color: '#15110a', background: BRASS,
    boxShadow: '0 12px 28px -14px rgba(129,182,76,0.7)', transition: 'filter .15s, transform .12s',
  }
}
function btnSecondaire(disabled) {
  return {
    padding: '10px 16px', borderRadius: ui.radius.sm, cursor: disabled ? 'default' : 'pointer',
    font: `700 13px ${fonts.body}`, color: disabled ? ui.textMute : ui.text,
    background: ui.surface, border: `1px solid ${ui.line}`, opacity: disabled ? 0.5 : 1,
    transition: 'border-color .15s',
  }
}
function railVerre() {
  return {
    background: glass.bg, backdropFilter: glass.blur, WebkitBackdropFilter: glass.blur,
    border: `1px solid ${glass.border}`, borderRadius: glass.radius, boxShadow: glass.shadow, boxSizing: 'border-box',
  }
}

// ════════════════════════════════════════════════════════════════════════════
// RÈGLES ILLUSTRÉES — diagrammes statiques (MiniBoard lecture seule).
// ════════════════════════════════════════════════════════════════════════════
const surb = (cases, couleur = 'rgba(129,182,76,0.55)') => {
  const s = {}
  for (const sq of cases) s[sq] = { background: `radial-gradient(circle, ${couleur} 26%, transparent 30%)` }
  return s
}

const VALEURS = [
  { g: '♙', n: 'Pion', v: '1' }, { g: '♘', n: 'Cavalier', v: '3' }, { g: '♗', n: 'Fou', v: '3' },
  { g: '♖', n: 'Tour', v: '5' }, { g: '♕', n: 'Dame', v: '9' }, { g: '♔', n: 'Roi', v: '∞' },
]

const DIAGRAMMES = [
  { id: 'but', titre: 'Objectif du jeu', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', surb: null,
    texte: "Les Blancs commencent, puis chacun joue à tour de rôle. Le but : mettre le roi adverse en échec et mat — menacé et sans échappatoire." },
  { id: 'mat', titre: 'Échec et mat', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', surb: surb(['a8'], 'rgba(212,104,90,0.7)'),
    texte: "Le roi est attaqué et aucun coup ne le sauve : la partie est gagnée. Ici, Ta8# est un mat du couloir classique." },
  { id: 'pat', titre: 'Le Pat (nulle)', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', surb: null,
    texte: "Le joueur au trait n'est PAS en échec mais n'a aucun coup légal : la partie est nulle. Une ressource défensive précieuse." },
  { id: 'roque', titre: 'Le Roque', fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', surb: surb(['g1', 'c1']),
    texte: "Roi + tour en un coup, si ni l'un ni l'autre n'a bougé, sans pièce entre eux ni traversée d'une case attaquée. Met le roi à l'abri." },
  { id: 'enpassant', titre: 'La prise en passant', fen: '8/8/8/3pP3/8/8/8/8 w - d6 0 1', surb: surb(['d6']),
    texte: "Si un pion adverse avance de deux cases et passe à côté du vôtre, vous le capturez « en passant » — au coup suivant immédiat seulement." },
  { id: 'promotion', titre: 'La promotion', fen: '8/4P3/8/8/8/8/8/8 w - - 0 1', surb: surb(['e8']),
    texte: "Un pion qui atteint la dernière rangée devient la pièce de son choix — presque toujours une Dame. On peut donc avoir plusieurs Dames." },
]

function CarteDiagramme({ d, taille, boardId }) {
  return (
    <article style={{
      borderRadius: ui.radius.md, background: ui.surface, border: `1px solid ${ui.line}`,
      overflow: 'hidden', display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: 14, padding: 14, alignItems: 'center',
    }}>
      <MiniBoard fen={d.fen} taille={taille} boardId={boardId} surbrillances={d.surb} />
      <div style={{ minWidth: 0 }}>
        <h4 style={{ margin: '0 0 6px', font: `700 15px ${fonts.body}`, color: ui.text }}>{d.titre}</h4>
        <p style={{ margin: 0, font: `400 13px ${fonts.body}`, color: ui.textDim, lineHeight: 1.55 }}>{d.texte}</p>
      </div>
    </article>
  )
}

function ReglesIllustrees({ boardId }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header>
        <h2 style={{ margin: '0 0 6px', font: `800 22px ${fonts.display}`, letterSpacing: '-0.02em', color: ui.text }}>Règles illustrées</h2>
        <p style={{ margin: 0, font: `400 13.5px ${fonts.body}`, color: ui.textDim, lineHeight: 1.6 }}>
          Les concepts clés en diagrammes. Le détail complet vit dans l'onglet <strong style={{ color: ui.text }}>Règles</strong>.
        </p>
      </header>

      {/* valeur des pièces */}
      <div style={{ borderRadius: ui.radius.md, background: ui.surface, border: `1px solid ${ui.line}`, padding: 14 }}>
        <h4 style={{ margin: '0 0 12px', font: `700 15px ${fonts.body}`, color: ui.text }}>Valeur des pièces</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px,1fr))', gap: 10 }}>
          {VALEURS.map(p => (
            <div key={p.n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: ui.radius.sm, background: ui.bgElev, border: `1px solid ${ui.line}` }}>
              <span aria-hidden style={{ fontSize: 24, lineHeight: 1, color: ui.text }}>{p.g}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ font: `700 12.5px ${fonts.body}`, color: ui.text }}>{p.n}</div>
                <div style={{ font: `600 12px ${fonts.mono}`, color: BRASS, fontVariantNumeric: 'tabular-nums' }}>{p.v} pt{p.v !== '1' && p.v !== '∞' ? 's' : ''}</div>
              </div>
            </div>
          ))}
        </div>
        <p style={{ margin: '12px 0 0', font: `400 12.5px ${fonts.body}`, color: ui.textMute, lineHeight: 1.5 }}>
          Le roi n'a pas de valeur d'échange : on ne le perd jamais. Ces points guident les prises avantageuses.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%,420px),1fr))', gap: 14 }}>
        {DIAGRAMMES.map(d => <CarteDiagramme key={d.id} d={d} taille={128} boardId={boardId} />)}
      </div>

      {/* nulles */}
      <div style={{ borderRadius: ui.radius.md, background: ui.surface, border: `1px solid ${ui.line}`, padding: 14 }}>
        <h4 style={{ margin: '0 0 10px', font: `700 15px ${fonts.body}`, color: ui.text }}>Les parties nulles</h4>
        <ul style={{ margin: 0, paddingLeft: 18, font: `400 13px ${fonts.body}`, color: ui.textDim, lineHeight: 1.7 }}>
          <li><strong style={{ color: ui.text }}>Pat</strong> — aucun coup légal sans être en échec.</li>
          <li><strong style={{ color: ui.text }}>Répétition</strong> — la même position survient trois fois.</li>
          <li><strong style={{ color: ui.text }}>50 coups</strong> — 50 coups sans prise ni mouvement de pion.</li>
          <li><strong style={{ color: ui.text }}>Matériel insuffisant</strong> — impossible de mater (ex. Roi contre Roi).</li>
          <li><strong style={{ color: ui.text }}>Accord mutuel</strong> — les deux joueurs acceptent la nulle.</li>
        </ul>
      </div>
    </div>
  )
}

// ── Taille responsive du plateau jouable (carré borné). ─────────────────────
function useTailleTuto() {
  const [t, setT] = useState(380)
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth, vh = window.innerHeight
      const mobile = vw < 860
      const dispoL = mobile ? vw - 64 : Math.min(520, (vw - 120) * 0.42)
      const dispoH = vh - (mobile ? 360 : 260)
      setT(Math.floor(Math.max(260, Math.min(480, dispoL, dispoH))))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])
  return t
}

// ════════════════════════════════════════════════════════════════════════════
export default function TutorialTab({ accent = BRASS } = {}) {
  const { reglages } = useChessSettings()
  const boardId = reglages?.board || BOARD_DEFAUT
  const taille = useTailleTuto()

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 'clamp(20px,2.5vw,32px) clamp(16px,3vw,40px) 56px' }}>
      <style>{`
        .tutoFocus:focus-visible { outline: 2px solid ${accent}; outline-offset: 2px; border-radius: 8px; }
        .tutoPrimaire:hover { filter: brightness(1.08); }
        @media (prefers-reduced-motion: reduce){
          .tutoBar { transition: none !important; }
        }
        @media (prefers-reduced-motion: no-preference){
          .tutoBar { transition: width 420ms cubic-bezier(.4,0,.2,1); }
        }
      `}</style>

      <div style={{ maxWidth: 1320, margin: '0 auto', display: 'grid', gap: 22 }}>
        <header>
          <div style={{ font: `700 11px ${fonts.body}`, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent, marginBottom: 7 }}>Apprendre</div>
          <h2 style={{ margin: '0 0 6px', font: `800 28px ${fonts.display}`, letterSpacing: '-0.02em', color: ui.text }}>Didacticiel interactif</h2>
          <p style={{ margin: 0, font: `400 14px ${fonts.body}`, color: ui.textDim, lineHeight: 1.6, maxWidth: 700 }}>
            Apprends les échecs en jouant. Chaque leçon te demande de trouver le bon coup sur l'échiquier — joue-le pour passer à la suivante.
          </p>
        </header>

        <Didacticiel taille={taille} boardId={boardId} coords={reglages?.coords ?? true} autoQueen={reglages?.autoQueen ?? false} />

        <ReglesIllustrees boardId={boardId} />

        {/* Tactiques — entraînement « mat en 1 » (puzzles auto-validés). */}
        <section style={{ display: 'grid', gap: 16 }}>
          <header>
            <div style={{ font: `700 11px ${fonts.body}`, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent, marginBottom: 7 }}>Tactiques</div>
            <h2 style={{ margin: '0 0 6px', font: `800 22px ${fonts.display}`, letterSpacing: '-0.02em', color: ui.text }}>Tactiques — Mat en 1</h2>
            <p style={{ margin: 0, font: `400 13.5px ${fonts.body}`, color: ui.textDim, lineHeight: 1.6, maxWidth: 700 }}>
              Repère le coup qui mate immédiatement. Bloqué ? Demande un indice ou le coach.
            </p>
          </header>
          <PuzzleTrainer />
        </section>

        {/* Ouvertures — répertoire interactif (le joueur joue la théorie de son camp). */}
        <section style={{ display: 'grid', gap: 16 }}>
          <header>
            <div style={{ font: `700 11px ${fonts.body}`, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent, marginBottom: 7 }}>Ouvertures</div>
            <h2 style={{ margin: '0 0 6px', font: `800 22px ${fonts.display}`, letterSpacing: '-0.02em', color: ui.text }}>Ouvertures — le répertoire</h2>
            <p style={{ margin: 0, font: `400 13.5px ${fonts.body}`, color: ui.textDim, lineHeight: 1.6, maxWidth: 700 }}>
              Choisis une ouverture, joue les coups de ton camp — l'adversaire répond automatiquement la théorie.
              Termine la ligne pour la valider et découvrir le plan qui suit.
            </p>
          </header>
          <OpeningTrainer />
        </section>
      </div>
    </div>
  )
}
