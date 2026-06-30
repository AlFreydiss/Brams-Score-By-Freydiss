// ── PuzzleTrainer : entraîneur de tactiques « mat en 1 » ────────────────────
// Composant autonome rendu dans l'onglet « Apprendre » (section Tactiques).
// Principe : on NE recode aucun moteur — chess.js juge la légalité ET le mat.
//  · Au montage on FILTRE PUZZLES aux positions SAINES : on rejoue la `solution`
//    sur une instance Chess et on ne garde le puzzle que si la position finale est
//    vraiment `isCheckmate()` (sécurité anti faux-puzzle).
//  · La VALIDATION accepte n'importe quel coup légal qui donne mat (pas seulement
//    la ligne stockée) : pédagogiquement, tout mat en 1 est correct.
//  · Board interactif calqué sur PlateauLecon (TutorialTab) : react-chessboard v5,
//    instance Chess locale, drag + clic-clic, surbrillances, thème chesscom.
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import { cc } from '../ui/chesscom.js'
import { PIECES } from '../ui/pieces.jsx'
import { boardParId } from '../logic/boards.js'
import { useCoach } from '../coach/useCoach.js'
import { sons } from '../../../features/echecs/lib/sons.js'
import { PUZZLES } from './puzzles.js'

const VERT = '#81b64c'

// ════════════════════════════════════════════════════════════════════════════
// Filtre de sécurité : ne garde QUE les puzzles dont la solution mate réellement.
// On rejoue chaque demi-coup UCI sur une instance Chess neuve ; si un coup est
// illégal ou si la position finale n'est pas un mat → on jette le puzzle.
// ════════════════════════════════════════════════════════════════════════════
function puzzlesSains(liste) {
  const ok = []
  for (const p of liste || []) {
    try {
      const c = new Chess(p.fen)
      let valide = true
      for (const uci of p.solution || []) {
        const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined })
        if (!mv) { valide = false; break }
      }
      if (valide && c.isCheckmate()) ok.push(p)
    } catch { /* puzzle malformé → ignoré */ }
  }
  return ok
}

// Son d'un coup légal (réutilise le module sons, garde-fous si une clé manque).
function sonDuCoup(mv, enEchec) {
  try {
    if (enEchec) sons.echec?.()
    else if (mv.captured) sons.capture?.()
    else sons.coup?.()
  } catch {}
}

// ════════════════════════════════════════════════════════════════════════════
// Échiquier jouable d'un puzzle (react-chessboard direct, instance Chess locale).
// onResultat('mat' | 'legal' | 'illegal') remonte le verdict au parent.
// ════════════════════════════════════════════════════════════════════════════
function PuzzleBoard({ puzzle, taille, coords, indiceCase, etat, onResultat }) {
  const tema = useMemo(() => boardParId('chesscom'), [])
  const chessRef = useRef(null)
  const [fen, setFen] = useState(puzzle.fen)
  const [selection, setSelection] = useState(null)
  const [erreurCase, setErreurCase] = useState(null)

  const orient = puzzle.joueur === 'b' ? 'black' : 'white'
  const reussi = etat.statut === 'reussi'

  // (Ré)initialise l'instance chess.js quand le puzzle change ou sur « Rejouer ».
  useEffect(() => {
    chessRef.current = new Chess(puzzle.fen)
    setFen(puzzle.fen); setSelection(null); setErreurCase(null)
  }, [puzzle.id, etat.cle])

  const flashErreur = useCallback((sq) => {
    setErreurCase(sq)
    sons.illegal?.()
    setTimeout(() => setErreurCase(null), 420)
  }, [])

  // Évalue un coup tenté. chess.js juge la légalité ; nous jugeons le mat.
  const tenter = useCallback((from, to) => {
    if (reussi) return false
    const chess = chessRef.current
    let mv = null
    try { mv = chess.move({ from, to }) } catch { mv = null }
    if (!mv) {                       // illégal selon chess.js
      flashErreur(to); onResultat('illegal'); return false
    }
    if (chess.isCheckmate()) {       // n'importe quel mat en 1 = réussite
      setFen(chess.fen()); sonDuCoup(mv, true); onResultat('mat'); return true
    }
    chess.undo()                     // légal mais pas mat → on annule
    flashErreur(to); onResultat('legal'); return false
  }, [reussi, flashErreur, onResultat])

  // ── react-chessboard v5 : drag & drop ──
  const onPieceDrop = useCallback(({ sourceSquare, targetSquare }) => {
    if (!targetSquare || reussi) return false
    return tenter(sourceSquare, targetSquare)
  }, [tenter, reussi])

  // ── clic-clic (accessibilité + mobile) ──
  const onSquareClick = useCallback(({ square }) => {
    if (reussi) return
    const chess = chessRef.current
    if (selection) {
      if (square === selection) { setSelection(null); return }
      const p = chess.get(square)
      if (p && p.color === chess.turn()) { setSelection(square); return }
      tenter(selection, square)
      setSelection(null)
    } else {
      const p = chess.get(square)
      if (p && p.color === chess.turn()) setSelection(square)
    }
  }, [selection, reussi, tenter])

  const canDragPiece = useCallback(({ piece }) => {
    if (reussi) return false
    const couleur = typeof piece === 'string' ? piece[0]?.toLowerCase() : piece?.pieceType?.[0]?.toLowerCase()
    return couleur === chessRef.current?.turn()
  }, [reussi])

  // ── Surbrillances : indice (case de départ), sélection, coups légaux, erreur ──
  const squareStyles = useMemo(() => {
    const s = {}
    if (!reussi && indiceCase) {
      s[indiceCase] = { boxShadow: `inset 0 0 0 3px rgba(129,182,76,0.85)`, borderRadius: 4 }
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
    return s
  }, [selection, erreurCase, reussi, indiceCase, fen])

  const notationTaille = Math.max(9, taille * 0.024)
  const options = useMemo(() => ({
    id: `puzzle-${puzzle.id}`,
    pieces: PIECES,
    position: fen,
    boardOrientation: orient,
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
  }), [fen, puzzle.id, orient, onPieceDrop, onSquareClick, canDragPiece, reussi, coords, squareStyles, tema, notationTaille])

  return (
    <div style={{ position: 'relative', width: taille, height: taille, flexShrink: 0 }}>
      <Chessboard options={options} />
      {/* halo de succès autour du plateau */}
      <div aria-hidden style={{
        position: 'absolute', inset: -2, borderRadius: 14, pointerEvents: 'none', zIndex: 4,
        boxShadow: reussi ? '0 0 0 2px rgba(127,184,106,0.65), 0 0 40px 4px rgba(127,184,106,0.35)' : 'none',
        transition: 'box-shadow 320ms ease',
      }} />
    </div>
  )
}

// ── Taille responsive du plateau (carré borné). ────────────────────────────
function usePuzzleTaille() {
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
// PuzzleTrainer — orchestre la liste de puzzles sains + feedback + coach IA.
// ════════════════════════════════════════════════════════════════════════════
export default function PuzzleTrainer() {
  const puzzles = useMemo(() => {
    const sains = puzzlesSains(PUZZLES)
    // eslint-disable-next-line no-console
    console.log(`[PuzzleTrainer] ${sains.length}/${(PUZZLES || []).length} puzzles sains (mat vérifié).`)
    return sains
  }, [])

  const taille = usePuzzleTaille()
  const total = puzzles.length

  const [idx, setIdx] = useState(0)
  const [etat, setEtat] = useState({ statut: 'attente', cle: 0 })  // 'attente' | 'reussi'
  const [feedback, setFeedback] = useState(null)                   // { type:'ok'|'err'|'info', txt, idee? }
  const [indiceCase, setIndiceCase] = useState(null)
  const [resolus, setResolus] = useState(() => new Set())
  const coach = useCoach()

  const puzzle = total ? puzzles[Math.min(idx, total - 1)] : null

  // Reset à chaque changement de puzzle.
  useEffect(() => {
    setEtat({ statut: 'attente', cle: 0 })
    setFeedback(null)
    setIndiceCase(null)
    coach.reset()
  }, [idx])

  const onResultat = useCallback((res) => {
    if (!puzzle) return
    if (res === 'mat') {
      setEtat(e => ({ ...e, statut: 'reussi' }))
      setResolus(s => new Set(s).add(puzzle.id))
      setFeedback({ type: 'ok', txt: 'Échec et mat — bien vu.', idee: puzzle.idee })
      try { sons.victoire?.() } catch {}
    } else if (res === 'legal') {
      setFeedback({ type: 'info', txt: 'Légal, mais ce n’est pas mat. Cherche le mat en 1.' })
    } else {
      setFeedback({ type: 'err', txt: 'Coup illégal — ce déplacement n’est pas autorisé.' })
    }
  }, [puzzle])

  const rejouer = useCallback(() => {
    setEtat(e => ({ statut: 'attente', cle: e.cle + 1 }))
    setFeedback(null)
    setIndiceCase(null)
  }, [])

  const montrerIndice = useCallback(() => {
    const sq = puzzle?.solution?.[0]?.slice(0, 2)
    if (sq) {
      setIndiceCase(sq)
      setFeedback({ type: 'info', txt: `La pièce à jouer part de la case ${sq}.` })
    }
  }, [puzzle])

  const demanderConseil = useCallback(() => {
    if (!puzzle) return
    coach.demander({
      fen: puzzle.fen,
      trait: puzzle.joueur,
      resultat: { pv: puzzle.solution, scoreCp: null, mate: 1 },
      dernierSan: null,
    })
  }, [puzzle, coach])

  const suivant = useCallback(() => setIdx(i => Math.min(total - 1, i + 1)), [total])
  const precedent = useCallback(() => setIdx(i => Math.max(0, i - 1)), [])

  // ── Aucun puzzle sain : message sobre. ──
  if (!total) {
    return (
      <div style={carteVide()}>
        <span aria-hidden style={{ fontSize: 30 }}>♟️</span>
        <p style={{ margin: '10px 0 0', font: `500 14px ${fonts.body}`, color: ui.textDim, lineHeight: 1.6, textAlign: 'center' }}>
          Aucune tactique disponible pour le moment. Reviens bientôt — de nouveaux puzzles arrivent.
        </p>
      </div>
    )
  }

  const reussi = etat.statut === 'reussi'
  const progres = Math.round((resolus.size / total) * 100)
  const dernier = idx === total - 1

  return (
    <section style={{
      ...railVerre(), padding: 0, overflow: 'hidden', gridColumn: '1 / -1', display: 'grid',
      gridTemplateColumns: taille >= 360 ? 'auto minmax(0,1fr)' : '1fr', alignItems: 'stretch',
    }}>
      <style>{`
        .pzFocus:focus-visible { outline: 2px solid ${VERT}; outline-offset: 2px; border-radius: 8px; }
        .pzPrimaire:hover { filter: brightness(1.08); }
        @media (prefers-reduced-motion: reduce){ .pzBar { transition: none !important; } }
        @media (prefers-reduced-motion: no-preference){ .pzBar { transition: width 420ms cubic-bezier(.4,0,.2,1); } }
      `}</style>

      {/* Colonne plateau */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px,2vw,26px)', borderRight: `1px solid ${cc.line}`, background: 'rgba(0,0,0,0.12)' }}>
        <PuzzleBoard
          puzzle={puzzle} taille={taille} coords
          indiceCase={indiceCase} etat={etat} onResultat={onResultat}
        />
      </div>

      {/* Colonne info / feedback / actions */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: 'clamp(18px,2vw,28px)', minWidth: 0, gap: 16 }}>
        {/* en-tête + progression */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <span style={{ font: `700 11px ${fonts.body}`, letterSpacing: '0.16em', textTransform: 'uppercase', color: VERT }}>
              Puzzle {idx + 1} / {total}
            </span>
            <span style={{ font: `600 11px ${fonts.mono}`, color: ui.textMute, fontVariantNumeric: 'tabular-nums' }}>
              {resolus.size}/{total} résolus
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div className="pzBar" style={{ height: '100%', width: `${progres}%`, background: `linear-gradient(90deg, ${VERT}, #b7e08a)`, borderRadius: 999 }} />
          </div>
        </div>

        {/* thème / niveau / consigne */}
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <span style={badge(VERT)}>{puzzle.theme}</span>
            <span style={badge(ui.textMute)}>{puzzle.niveau}</span>
            <span style={badge(ui.textMute)}>Trait aux {puzzle.joueur === 'w' ? 'Blancs' : 'Noirs'}</span>
          </div>
          <h3 style={{ margin: '0 0 8px', font: `800 22px ${fonts.display}`, letterSpacing: '-0.02em', color: ui.text }}>
            Trouve le mat en 1
          </h3>
          <p style={{ margin: 0, font: `400 14.5px ${fonts.body}`, color: ui.textDim, lineHeight: 1.6 }}>
            Les {puzzle.joueur === 'w' ? 'Blancs' : 'Noirs'} jouent et matent en un coup. Joue le coup qui met le roi adverse échec et mat.
          </p>
        </div>

        {/* zone feedback (hauteur réservée pour éviter le saut de layout) */}
        <div aria-live="polite" style={{ minHeight: 58 }}>
          {feedback && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px', borderRadius: ui.radius.sm,
              background: feedback.type === 'ok' ? 'rgba(127,184,106,0.12)' : feedback.type === 'err' ? 'rgba(212,104,90,0.12)' : 'rgba(111,168,214,0.12)',
              border: `1px solid ${feedback.type === 'ok' ? 'rgba(127,184,106,0.45)' : feedback.type === 'err' ? 'rgba(212,104,90,0.45)' : 'rgba(111,168,214,0.4)'}`,
            }}>
              <span aria-hidden style={{ fontSize: 16, lineHeight: 1.4, color: feedback.type === 'ok' ? ui.good : feedback.type === 'err' ? ui.bad : ui.info }}>
                {feedback.type === 'ok' ? '✓' : feedback.type === 'err' ? '✕' : '○'}
              </span>
              <span style={{ font: `500 13.5px ${fonts.body}`, color: feedback.type === 'ok' ? '#cdeac0' : feedback.type === 'err' ? '#f0c3bb' : '#cfe2f4', lineHeight: 1.5 }}>
                {feedback.txt}{feedback.idee ? ` ${feedback.idee}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* panneau coach IA (affiché à la demande) */}
        {(coach.loading || coach.texte || coach.erreur) && (
          <div style={{ borderRadius: ui.radius.sm, background: cc.panel, border: `1px solid ${cc.line}`, padding: '12px 14px' }}>
            <div style={{ font: `700 10.5px ${fonts.body}`, letterSpacing: '0.14em', textTransform: 'uppercase', color: VERT, marginBottom: 6 }}>🎓 Coach</div>
            {coach.loading && <p style={{ margin: 0, font: `500 13px ${fonts.body}`, color: ui.textMute }}>Le coach réfléchit…</p>}
            {!coach.loading && coach.erreur && <p style={{ margin: 0, font: `500 13px ${fonts.body}`, color: ui.bad }}>{coach.erreur}</p>}
            {!coach.loading && !coach.erreur && coach.texte && (
              <p style={{ margin: 0, font: `400 13.5px ${fonts.body}`, color: ui.textDim, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{coach.texte}</p>
            )}
          </div>
        )}

        {/* actions outils */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button className="pzFocus" onClick={montrerIndice} disabled={reussi} style={btnSecondaire(reussi)}>💡 Indice</button>
          <button className="pzFocus" onClick={demanderConseil} disabled={coach.loading} style={btnSecondaire(coach.loading)}>🎓 Conseil</button>
          <button className="pzFocus" onClick={rejouer} style={btnSecondaire(false)}>↻ Rejouer</button>
        </div>

        {/* navigation */}
        <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <button className="pzFocus" onClick={precedent} disabled={idx === 0} style={btnSecondaire(idx === 0)}>← Précédent</button>
          <button
            className={`pzFocus ${reussi ? 'pzPrimaire' : ''}`}
            onClick={suivant} disabled={dernier}
            style={reussi && !dernier ? btnPrincipal() : btnSecondaire(dernier)}
          >
            Suivant →
          </button>
        </div>
      </div>
    </section>
  )
}

// ── styles helpers (cohérents avec TutorialTab) ─────────────────────────────
function badge(couleur) {
  return {
    font: `700 10.5px ${fonts.body}`, letterSpacing: '0.06em', textTransform: 'uppercase',
    color: couleur, padding: '4px 9px', borderRadius: ui.radius.pill,
    background: ui.surface, border: `1px solid ${ui.line}`,
  }
}
function btnPrincipal() {
  return {
    padding: '11px 20px', borderRadius: ui.radius.sm, cursor: 'pointer', border: 'none',
    font: `800 14px ${fonts.display}`, color: '#15110a', background: VERT,
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
    background: cc.panel, border: `1px solid ${cc.line}`,
    borderRadius: ui.radius.lg, boxShadow: cc.shadow, boxSizing: 'border-box',
  }
}
function carteVide() {
  return {
    gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '40px 24px', borderRadius: ui.radius.lg, background: cc.panel, border: `1px solid ${cc.line}`,
  }
}
