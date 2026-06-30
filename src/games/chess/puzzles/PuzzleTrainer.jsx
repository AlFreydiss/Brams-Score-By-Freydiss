// ── PuzzleTrainer : entraîneur de tactiques « mat en 1 » et « mat en 2 ────────
// Composant autonome rendu dans l'onglet « Apprendre » (section Tactiques).
// Principe : on NE recode aucun moteur — chess.js juge la légalité ET le mat.
//  · Au montage on FILTRE PUZZLES aux positions SAINES : on rejoue TOUTE la `solution`
//    sur une instance Chess et on ne garde le puzzle que si chaque demi-coup est légal
//    ET la position finale est vraiment `isCheckmate()` (sécurité anti faux-puzzle).
//  · MAT EN 1 (solution.length === 1) : on accepte n'importe quel coup légal qui donne
//    mat (pas seulement la ligne stockée) — pédagogiquement, tout mat en 1 est correct.
//  · MAT EN 2 (solution.length > 1) : le joueur DOIT jouer solution[0] (le coup forçant) ;
//    la réplique adverse solution[1] est jouée automatiquement (~0,5 s) ; puis le joueur
//    livre le coup matant (succès si isCheckmate).
//  · Onglets de difficulté « Tous / Mat en 1 / Mat en 2 » au-dessus du plateau.
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

// Nombre de coups logiques d'un puzzle : champ explicite `coups`, sinon déduit de la
// longueur de la solution (1 demi-coup → mat en 1 ; 3 demi-coups → mat en 2).
function coupsDe(p) {
  return p?.coups || ((p?.solution?.length || 1) >= 3 ? 2 : 1)
}

// ════════════════════════════════════════════════════════════════════════════
// Filtre de sécurité : ne garde QUE les puzzles dont la solution mate réellement.
// On rejoue chaque demi-coup UCI sur une instance Chess neuve ; si un coup est
// illégal ou si la position finale n'est pas un mat → on jette le puzzle.
// (Robuste pour 1 demi-coup comme pour 3.)
// ════════════════════════════════════════════════════════════════════════════
function puzzlesSains(liste) {
  const ok = []
  for (const p of liste || []) {
    try {
      if (!p?.fen || !Array.isArray(p.solution) || p.solution.length === 0) continue
      const c = new Chess(p.fen)
      let valide = true
      for (const uci of p.solution) {
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
// onResultat('mat' | 'etape' | 'mauvaiseIdee' | 'legal' | 'illegal') remonte le verdict.
//  · Mat en 1 : tout coup matant = 'mat'.
//  · Mat en 2 : étape 0 → exiger solution[0] (sinon 'mauvaiseIdee') ; réplique adverse
//    auto-jouée ; étape 2 → tout coup matant = 'mat'.
// ════════════════════════════════════════════════════════════════════════════
function PuzzleBoard({ puzzle, taille, coords, indiceActif, etat, onResultat }) {
  const tema = useMemo(() => boardParId('chesscom'), [])
  const chessRef = useRef(null)
  const stepRef = useRef(0)            // 0: 1er coup attendu · 1: réplique adverse en cours · 2: coup matant attendu
  const timeoutRef = useRef(null)
  const [fen, setFen] = useState(puzzle.fen)
  const [selection, setSelection] = useState(null)
  const [erreurCase, setErreurCase] = useState(null)
  const [attenteAdv, setAttenteAdv] = useState(false)   // verrou pendant la réplique automatique
  const [coupAdv, setCoupAdv] = useState(null)          // { from, to } du dernier coup adverse joué

  const multi = (puzzle.solution?.length || 1) > 1
  const orient = puzzle.joueur === 'b' ? 'black' : 'white'
  const reussi = etat.statut === 'reussi'
  const verrou = reussi || attenteAdv

  // (Ré)initialise l'instance chess.js + l'état quand le puzzle change ou sur « Rejouer ».
  useEffect(() => {
    chessRef.current = new Chess(puzzle.fen)
    stepRef.current = 0
    setFen(puzzle.fen); setSelection(null); setErreurCase(null)
    setAttenteAdv(false); setCoupAdv(null)
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
  }, [puzzle.id, etat.cle, puzzle.fen])

  // Nettoyage du timer si le composant est démonté.
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, [])

  const flashErreur = useCallback((sq) => {
    setErreurCase(sq)
    sons.illegal?.()
    setTimeout(() => setErreurCase(null), 420)
  }, [])

  // Joue automatiquement la réplique forcée de l'adversaire (solution[1]) après un délai.
  const jouerRepliqueAdverse = useCallback(() => {
    setAttenteAdv(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      const chess = chessRef.current
      const uci = puzzle.solution?.[1]
      let mv = null
      try { mv = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4) }) } catch { mv = null }
      if (mv) {
        setCoupAdv({ from: mv.from, to: mv.to })
        setFen(chess.fen())
        sonDuCoup(mv, chess.inCheck())
      }
      stepRef.current = 2
      setAttenteAdv(false)
      timeoutRef.current = null
    }, 520)
  }, [puzzle])

  // Évalue un coup tenté. chess.js juge la légalité ; nous jugeons le mat et la « bonne idée ».
  const tenter = useCallback((from, to) => {
    if (verrou) return false
    const chess = chessRef.current

    // ── MAT EN 1 : n'importe quel coup légal qui mate = réussite. ──
    if (!multi) {
      let mv = null
      try { mv = chess.move({ from, to }) } catch { mv = null }
      if (!mv) { flashErreur(to); onResultat('illegal'); return false }
      if (chess.isCheckmate()) { setFen(chess.fen()); sonDuCoup(mv, true); onResultat('mat'); return true }
      chess.undo(); flashErreur(to); onResultat('legal'); return false
    }

    // ── MAT EN 2 ──
    const step = stepRef.current
    if (step === 0) {                         // doit jouer EXACTEMENT solution[0]
      const want = puzzle.solution[0]
      let mv = null
      try { mv = chess.move({ from, to }) } catch { mv = null }
      if (!mv) { flashErreur(to); onResultat('illegal'); return false }
      if (from === want.slice(0, 2) && to === want.slice(2, 4)) {
        setCoupAdv(null)
        setFen(chess.fen()); sonDuCoup(mv, chess.inCheck())
        stepRef.current = 1
        onResultat('etape')
        jouerRepliqueAdverse()
        return true
      }
      chess.undo(); flashErreur(to); onResultat('mauvaiseIdee'); return false
    }
    if (step === 2) {                         // coup matant
      let mv = null
      try { mv = chess.move({ from, to }) } catch { mv = null }
      if (!mv) { flashErreur(to); onResultat('illegal'); return false }
      if (chess.isCheckmate()) { setFen(chess.fen()); sonDuCoup(mv, true); onResultat('mat'); return true }
      chess.undo(); flashErreur(to); onResultat('legal'); return false
    }
    return false
  }, [verrou, multi, flashErreur, onResultat, puzzle, jouerRepliqueAdverse])

  // ── react-chessboard v5 : drag & drop ──
  const onPieceDrop = useCallback(({ sourceSquare, targetSquare }) => {
    if (!targetSquare || verrou) return false
    return tenter(sourceSquare, targetSquare)
  }, [tenter, verrou])

  // ── clic-clic (accessibilité + mobile) ──
  const onSquareClick = useCallback(({ square }) => {
    if (verrou) return
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
  }, [selection, verrou, tenter])

  const canDragPiece = useCallback(({ piece }) => {
    if (verrou) return false
    const couleur = typeof piece === 'string' ? piece[0]?.toLowerCase() : piece?.pieceType?.[0]?.toLowerCase()
    return couleur === chessRef.current?.turn()
  }, [verrou])

  // Case d'indice = case de départ du coup ATTENDU à l'étape courante.
  const indiceCase = useMemo(() => {
    if (!indiceActif || reussi) return null
    if (multi && stepRef.current === 2) return puzzle.solution?.[puzzle.solution.length - 1]?.slice(0, 2)
    return puzzle.solution?.[0]?.slice(0, 2)
  }, [indiceActif, reussi, multi, puzzle, fen, attenteAdv])

  // ── Surbrillances : coup adverse, indice (case de départ), sélection, coups légaux, erreur ──
  const squareStyles = useMemo(() => {
    const s = {}
    if (coupAdv && !reussi) {
      s[coupAdv.from] = { ...(s[coupAdv.from] || {}), background: 'rgba(129,182,76,0.16)' }
      s[coupAdv.to] = { ...(s[coupAdv.to] || {}), background: 'rgba(129,182,76,0.28)' }
    }
    if (!reussi && indiceCase) {
      s[indiceCase] = { ...(s[indiceCase] || {}), boxShadow: `inset 0 0 0 3px rgba(129,182,76,0.85)`, borderRadius: 4 }
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
  }, [selection, erreurCase, reussi, indiceCase, coupAdv, fen])

  const notationTaille = Math.max(9, taille * 0.024)
  const options = useMemo(() => ({
    id: `puzzle-${puzzle.id}`,
    pieces: PIECES,
    position: fen,
    boardOrientation: orient,
    onPieceDrop,
    onSquareClick,
    canDragPiece,
    allowDragging: !verrou,
    animationDurationInMs: 200,
    showNotation: coords,
    squareStyles,
    boardStyle: { borderRadius: 12, overflow: 'hidden', boxShadow: '0 30px 70px -28px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.05)' },
    darkSquareStyle: { backgroundColor: tema.foncee },
    lightSquareStyle: { backgroundColor: tema.claire },
    lightSquareNotationStyle: { fontSize: notationTaille, fontFamily: fonts.body, fontWeight: 700, color: tema.notationClaire },
    darkSquareNotationStyle: { fontSize: notationTaille, fontFamily: fonts.body, fontWeight: 700, color: tema.notationFoncee },
  }), [fen, puzzle.id, orient, onPieceDrop, onSquareClick, canDragPiece, verrou, coords, squareStyles, tema, notationTaille])

  return (
    <div style={{ position: 'relative', width: taille, height: taille, flexShrink: 0 }}>
      <Chessboard options={options} />
      {/* badge « réflexion adverse » pendant la réplique automatique */}
      {attenteAdv && (
        <div aria-hidden style={{
          position: 'absolute', top: 10, left: 10, zIndex: 5, padding: '5px 11px', borderRadius: 999,
          background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(4px)',
          font: `700 11px ${fonts.body}`, letterSpacing: '0.04em', color: '#e9efe2',
          border: '1px solid rgba(129,182,76,0.45)',
        }}>L'adversaire répond…</div>
      )}
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
// PuzzleTrainer — liste de puzzles sains + filtre de difficulté + feedback + coach IA.
// ════════════════════════════════════════════════════════════════════════════
export default function PuzzleTrainer() {
  // Liste auto-validée (mat vérifié par moteur), avec log du compte par type.
  const puzzles = useMemo(() => {
    const sains = puzzlesSains(PUZZLES)
    const n1 = sains.filter(p => coupsDe(p) === 1).length
    const n2 = sains.filter(p => coupsDe(p) === 2).length
    // eslint-disable-next-line no-console
    console.log(`[PuzzleTrainer] ${sains.length}/${(PUZZLES || []).length} puzzles sains — mat en 1: ${n1}, mat en 2: ${n2}.`)
    return sains
  }, [])

  const comptes = useMemo(() => ({
    tous: puzzles.length,
    1: puzzles.filter(p => coupsDe(p) === 1).length,
    2: puzzles.filter(p => coupsDe(p) === 2).length,
  }), [puzzles])

  const taille = usePuzzleTaille()

  const [filtre, setFiltre] = useState('tous')           // 'tous' | '1' | '2'
  const [idx, setIdx] = useState(0)
  const [etat, setEtat] = useState({ statut: 'attente', cle: 0 })  // 'attente' | 'reussi'
  const [feedback, setFeedback] = useState(null)                   // { type:'ok'|'err'|'info', txt, idee? }
  const [indiceActif, setIndiceActif] = useState(false)
  const [resolus, setResolus] = useState(() => new Set())          // ids résolus (global, conservé entre filtres)
  const coach = useCoach()

  const puzzlesFiltres = useMemo(() => {
    if (filtre === '1') return puzzles.filter(p => coupsDe(p) === 1)
    if (filtre === '2') return puzzles.filter(p => coupsDe(p) === 2)
    return puzzles
  }, [puzzles, filtre])

  const total = puzzlesFiltres.length
  const puzzle = total ? puzzlesFiltres[Math.min(idx, total - 1)] : null
  const coups = puzzle ? coupsDe(puzzle) : 1

  // Reset à chaque changement de puzzle OU de filtre.
  useEffect(() => {
    setEtat({ statut: 'attente', cle: 0 })
    setFeedback(null)
    setIndiceActif(false)
    coach.reset()
  }, [idx, filtre])

  const choisirFiltre = useCallback((f) => { setFiltre(f); setIdx(0) }, [])

  const onResultat = useCallback((res) => {
    if (!puzzle) return
    if (res === 'mat') {
      setEtat(e => ({ ...e, statut: 'reussi' }))
      setResolus(s => new Set(s).add(puzzle.id))
      setFeedback({ type: 'ok', txt: 'Échec et mat — bien vu.', idee: puzzle.idee })
      try { sons.victoire?.() } catch {}
    } else if (res === 'etape') {
      setIndiceActif(false)
      setFeedback({ type: 'info', txt: "Bonne idée — l'adversaire est forcé de répondre. À toi de livrer le mat !" })
    } else if (res === 'mauvaiseIdee') {
      setFeedback({ type: 'err', txt: "Ce n'est pas la bonne idée. Cherche le coup qui force le mat, puis réessaie." })
    } else if (res === 'legal') {
      setFeedback({ type: 'info', txt: 'Légal, mais ce n’est pas mat. Cherche le coup qui mate.' })
    } else {
      setFeedback({ type: 'err', txt: 'Coup illégal — ce déplacement n’est pas autorisé.' })
    }
  }, [puzzle])

  const rejouer = useCallback(() => {
    setEtat(e => ({ statut: 'attente', cle: e.cle + 1 }))
    setFeedback(null)
    setIndiceActif(false)
  }, [])

  const montrerIndice = useCallback(() => {
    if (!puzzle) return
    setIndiceActif(true)
    setFeedback({ type: 'info', txt: 'Indice : la case de départ du coup à jouer est surlignée sur l’échiquier.' })
  }, [puzzle])

  const demanderConseil = useCallback(() => {
    if (!puzzle) return
    coach.demander({
      fen: puzzle.fen,
      trait: puzzle.joueur,
      resultat: { pv: puzzle.solution, scoreCp: null, mate: coups },
      dernierSan: null,
    })
  }, [puzzle, coach, coups])

  const suivant = useCallback(() => setIdx(i => Math.min(total - 1, i + 1)), [total])
  const precedent = useCallback(() => setIdx(i => Math.max(0, i - 1)), [])

  // ── Style global (focus, hover, barre) injecté une fois. ──
  const styleBlock = (
    <style>{`
      .pzFocus:focus-visible { outline: 2px solid ${VERT}; outline-offset: 2px; border-radius: 8px; }
      .pzPrimaire:hover { filter: brightness(1.08); }
      .pzChip:hover { border-color: rgba(129,182,76,0.55); }
      @media (prefers-reduced-motion: reduce){ .pzBar { transition: none !important; } }
      @media (prefers-reduced-motion: no-preference){ .pzBar { transition: width 420ms cubic-bezier(.4,0,.2,1); } }
    `}</style>
  )

  // ── Barre d'onglets de difficulté (toujours visible s'il existe des puzzles). ──
  const chips = (
    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
      <span style={{ font: `700 11px ${fonts.body}`, letterSpacing: '0.14em', textTransform: 'uppercase', color: ui.textMute, marginRight: 2 }}>
        Difficulté
      </span>
      {[
        { id: 'tous', label: 'Tous', n: comptes.tous },
        { id: '1', label: 'Mat en 1', n: comptes[1] },
        { id: '2', label: 'Mat en 2', n: comptes[2] },
      ].map(c => (
        <button
          key={c.id} className="pzFocus pzChip" onClick={() => choisirFiltre(c.id)}
          aria-pressed={filtre === c.id} style={chip(filtre === c.id)}
        >
          {c.label} <span style={{ opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>({c.n})</span>
        </button>
      ))}
    </div>
  )

  // ── Aucun puzzle sain du tout : message sobre. ──
  if (!puzzles.length) {
    return (
      <div style={carteVide()}>
        <span aria-hidden style={{ fontSize: 30 }}>♟️</span>
        <p style={{ margin: '10px 0 0', font: `500 14px ${fonts.body}`, color: ui.textDim, lineHeight: 1.6, textAlign: 'center' }}>
          Aucune tactique disponible pour le moment. Reviens bientôt — de nouveaux puzzles arrivent.
        </p>
      </div>
    )
  }

  // ── Le filtre courant ne contient aucun puzzle : on garde les onglets pour revenir. ──
  if (!total) {
    return (
      <>
        {styleBlock}
        {chips}
        <div style={{ ...carteVide(), padding: '28px 24px' }}>
          <p style={{ margin: 0, font: `500 14px ${fonts.body}`, color: ui.textDim, lineHeight: 1.6, textAlign: 'center' }}>
            Aucun puzzle pour ce filtre. Choisis une autre difficulté ci-dessus.
          </p>
        </div>
      </>
    )
  }

  const reussi = etat.statut === 'reussi'
  const resolusVisibles = puzzlesFiltres.reduce((n, p) => n + (resolus.has(p.id) ? 1 : 0), 0)
  const progres = Math.round((resolusVisibles / total) * 100)
  const dernier = idx === total - 1

  return (
    <>
      {styleBlock}
      {chips}
      <section style={{
        ...railVerre(), padding: 0, overflow: 'hidden', gridColumn: '1 / -1', display: 'grid',
        gridTemplateColumns: taille >= 360 ? 'auto minmax(0,1fr)' : '1fr', alignItems: 'stretch',
      }}>
        {/* Colonne plateau */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px,2vw,26px)', borderRight: `1px solid ${cc.line}`, background: 'rgba(0,0,0,0.12)' }}>
          <PuzzleBoard
            puzzle={puzzle} taille={taille} coords
            indiceActif={indiceActif} etat={etat} onResultat={onResultat}
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
                {resolusVisibles}/{total} résolus
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
              Trouve le mat en {coups}
            </h3>
            <p style={{ margin: 0, font: `400 14.5px ${fonts.body}`, color: ui.textDim, lineHeight: 1.6 }}>
              {coups === 1
                ? `Les ${puzzle.joueur === 'w' ? 'Blancs' : 'Noirs'} jouent et matent en un coup. Joue le coup qui met le roi adverse échec et mat.`
                : `Les ${puzzle.joueur === 'w' ? 'Blancs' : 'Noirs'} matent en deux coups : joue le coup qui force, l'adversaire répond automatiquement, puis livre l'échec et mat.`}
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
    </>
  )
}

// ── styles helpers (cohérents avec TutorialTab) ─────────────────────────────
function chip(active) {
  return {
    padding: '7px 14px', borderRadius: ui.radius.pill, cursor: 'pointer',
    font: `700 12.5px ${fonts.body}`, letterSpacing: '0.01em',
    color: active ? '#15110a' : ui.text,
    background: active ? VERT : ui.surface,
    border: `1px solid ${active ? VERT : ui.line}`,
    boxShadow: active ? '0 10px 24px -16px rgba(129,182,76,0.8)' : 'none',
    transition: 'border-color .15s, filter .15s',
  }
}
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
