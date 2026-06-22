// ─────────────────────────────────────────────────────────────────────────────
// DamesGame3D — orchestrateur du jeu 3D. Lazy-charge DamesRenderer (chunk Three.js),
// état de partie en ref (zéro setState/frame), n'émet que des événements discrets.
// Modes : Local 2J · vs IA (5 niveaux, recherche dans un Web Worker → UI fluide).
// Indice, historique en notation 1–50, dernier coup surligné, rafle max + volantes.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { initBoard, generateMoves, applyMove, countPieces, opp, aiMove, isDark, P, M, gameStatus, nextHalfmoveClock, positionKey } from './engine/draughts-engine.js'
import { moveToNotation } from './engine/notation.js'
import DamesEvalBar from './DamesEvalBar.jsx'
import DamesFxOverlay from './DamesFxOverlay.jsx'
import DamesPoster from './DamesPoster.jsx'
import DamesAnalyse from './DamesAnalyse.jsx'
import { useReglagesDames } from './hooks/useReglagesDames.js'
import { ui, fonts, damesBoard, damesPieces } from '../games/neutralTheme.js'

const QUALITY = [['high', 'Élevé'], ['medium', 'Moyen'], ['low', 'Basique']]

// Tokens NEUTRES (source unique). Plus de Pirates/Marine : on parle Foncé / Clair.
const GOLD = ui.accent, PARCH = ui.text, MUTED = ui.textDim
const DISP = fonts.display, MONO = fonts.mono
const DIFFS = [['mousse', 'Débutant'], ['marin', 'Amateur'], ['capitaine', 'Confirmé'], ['amiral', 'Expert'], ['legende', 'Maître']]
const BOARDS = Object.entries(damesBoard).map(([id, t]) => [id, t.label])
// Foncé = P (graphite), Clair = M (ivoire). Couleurs de pastille HUD = tokens pions.
const SIDE_COL = { [P]: damesPieces.fonce.base, [M]: damesPieces.clair.base }
const SIDE_LBL = { [P]: 'Foncé', [M]: 'Clair' }
const seg = (on) => ({ appearance: 'none', border: 0, background: on ? `linear-gradient(180deg,${ui.accentHi},${ui.accent})` : 'transparent', color: on ? ui.accentInk : MUTED, fontFamily: 'inherit', fontWeight: 600, fontSize: 13, letterSpacing: '.2px', padding: '8px 15px', borderRadius: ui.radius.pill, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: on ? '0 4px 14px rgba(200,164,92,.28), inset 0 1px 1px rgba(255,255,255,.35)' : 'none', transition: '.18s' })
const segWrap = { display: 'flex', background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.pill, padding: 4, gap: 3, backdropFilter: 'blur(10px)', flexWrap: 'wrap' }
const iconBtn = (dis) => ({ appearance: 'none', border: `1px solid ${ui.line}`, background: ui.surface, color: MUTED, width: 40, height: 40, borderRadius: '50%', cursor: dis ? 'not-allowed' : 'pointer', display: 'grid', placeItems: 'center', fontSize: 16, backdropFilter: 'blur(10px)', opacity: dis ? 0.32 : 1, transition: '.16s' })

export default function DamesGame3D() {
  // Réglages live (drawer ⚙ du Nouveau Monde si embarqué, sinon défauts/standalone).
  const R = useReglagesDames()
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const rdrRef = useRef(null)
  const workerRef = useRef(null)
  // `rules` = snapshot figé au début de partie (on ne change pas de variante en cours
  // de jeu). newGame() le re-capture depuis R quand un réglage de règle change.
  const G = useRef({ board: null, turn: P, mode: 'local', diff: 'marin', humanSide: P, aiSide: M, legalMoves: [], movableKeys: new Set(), selected: null, inputLocked: false, gameOver: false, history: [], last: null, seq: 0, pendingMove: null, pendingHint: null, halfmoveClock: 0, reps: new Map(), pendingEval: null, rules: R.rules })
  const [showAnalyse, setShowAnalyse] = useState(false)
  const [finalPositions, setFinalPositions] = useState(null)
  const [hud, setHud] = useState({ turn: P, pir: 20, mar: 20, gameOver: false, winner: null, draw: false, drawReason: null, thinking: false, mode: 'local', diff: 'marin', canUndo: false, ready: false, hinting: false })
  const [evalState, setEvalState] = useState(null)
  const evalTimer = useRef(0)
  const [moves, setMoves] = useState([])
  const [muted, setMuted] = useState(false)
  const [music, setMusic] = useState(() => { try { return localStorage.getItem('dames_music') === '1' } catch (e) { return false } })
  const navigate = useNavigate()
  const [quality, setQuality] = useState(() => { try { return localStorage.getItem('dames_quality') || 'high' } catch (e) { return 'high' } })
  const [view2D, setView2D] = useState(() => { try { const v = localStorage.getItem('dames_view2d'); return v == null ? true : v === '1' } catch (e) { return true } })
  const [boardTheme, setBoardThemeState] = useState(() => { try { return localStorage.getItem('dames_board') || 'bois' } catch (e) { return 'bois' } })
  const [fs, setFs] = useState(false)
  const [focused, setFocused] = useState(false)   // focus clavier visible (a11y) — révèle le mode flèches
  const hintTimer = useRef(0)
  const fxRef = useRef(null)          // couche d'effets premium 2D (combo / promotion / victoire)
  const thinkDotRef = useRef(null)   // pastille pulsante « IA réfléchit » (WAAPI, repo inline-only)
  // Sur petit écran, la barre de boutons du haut déborde sur plusieurs lignes : l'historique
  // (top:92) chevaucherait alors les boutons et le plateau. On le masque sous 760px.
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.innerWidth < 760)
  // horloge de durée de partie (informative, sans contrôle de temps) — démarre au 1er coup, gèle à la fin
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef(0)

  useEffect(() => { const r = () => setCompact(window.innerWidth < 760); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r) }, [])

  useEffect(() => {
    if (hud.gameOver || moves.length === 0) return
    if (!startedAt.current) startedAt.current = Date.now() - elapsed * 1000
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [hud.gameOver, moves.length, elapsed])

  useEffect(() => {
    if (!hud.thinking || !thinkDotRef.current) return
    const a = thinkDotRef.current.animate([{ opacity: 0.3 }, { opacity: 1 }, { opacity: 0.3 }], { duration: 900, iterations: Infinity })
    return () => { try { a.cancel() } catch { /* */ } }
  }, [hud.thinking])

  useEffect(() => { const h = () => setFs(!!document.fullscreenElement); document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h) }, [])
  const toggleFs = () => { const el = containerRef.current; if (!el) return; if (document.fullscreenElement) document.exitFullscreen?.(); else el.requestFullscreen?.() }

  const syncHUD = useCallback(() => {
    const g = G.current
    setHud(h => ({ ...h, turn: g.turn, pir: countPieces(g.board, P), mar: countPieces(g.board, M), gameOver: g.gameOver, mode: g.mode, diff: g.diff, canUndo: g.history.length > 0 }))
  }, [])

  const drawMarkers = useCallback(() => {
    const g = G.current, rdr = rdrRef.current; if (!rdr) return
    const aiTurn = g.mode === 'ai' && g.turn === g.aiSide
    rdr.setMarkers({ selected: g.selected, legalMoves: g.legalMoves, movableKeys: g.movableKeys, interactive: !g.inputLocked && !aiTurn && !g.gameOver, gameOver: g.gameOver, last: g.last, surbrillancePrises: g.surbrillancePrises !== false, coordonnees: g.coordonnees !== false })
  }, [])

  const endGame = useCallback((winner, drawReason) => {
    const g = G.current; g.gameOver = true; g.selected = null
    clearTimeout(evalTimer.current); g.pendingEval = null
    drawMarkers(); setHud(h => ({ ...h, gameOver: true, winner: drawReason ? null : winner, draw: !!drawReason, drawReason: drawReason || null }))
    rdrRef.current?.sfxWin()
    if (!drawReason) rdrRef.current?.setWinner?.(winner) // déclenche la cinématique de victoire 3D (orbite + feu d'artifice)
  }, [drawMarkers])

  // Demande une éval au worker (POV blanc), debouncée — barre d'évaluation.
  const requestEval = useCallback(() => {
    const g = G.current
    clearTimeout(evalTimer.current)
    if (g.gameOver || !workerRef.current) return
    evalTimer.current = setTimeout(() => {
      const g2 = G.current; if (g2.gameOver || !workerRef.current) return
      const id = 'e' + (++g2.seq); g2.pendingEval = id
      workerRef.current.postMessage({ id, type: 'analyse', board: g2.board, side: g2.turn, depth: 6, rules: g2.rules })
    }, 260)
  }, [])

  const askAI = useCallback((type) => {
    const g = G.current
    const id = (type === 'hint' ? 'h' : 'm') + (++g.seq)
    if (type === 'hint') g.pendingHint = id; else g.pendingMove = id
    const payload = { id, type, board: g.board, side: type === 'hint' ? g.humanSide : g.turn, diff: g.diff, rules: g.rules }
    if (workerRef.current) workerRef.current.postMessage(payload)
    else { // repli thread principal
      const mv = type === 'hint' ? aiMove(g.board, g.humanSide, 'amiral', g.rules) : aiMove(g.board, g.turn, g.diff, g.rules)
      setTimeout(() => onAIResult(id, mv), 20)
    }
  }, [])

  const refreshTurn = useCallback(() => {
    const g = G.current
    g.legalMoves = generateMoves(g.board, g.turn, g.rules)
    g.movableKeys = new Set(g.legalMoves.map(m => m.from[0] + '_' + m.from[1]))
    g.selected = null; drawMarkers(); syncHUD()
    const st = gameStatus(g.board, g.turn, { halfmoveClock: g.halfmoveClock, repetitions: g.reps }, g.rules)
    if (st.over) { endGame(st.winner, st.draw ? (st.reason || 'Partie nulle.') : null); return }
    requestEval()
    if (g.mode === 'ai' && g.turn === g.aiSide) { setHud(h => ({ ...h, thinking: true })); askAI('move') }
  }, [drawMarkers, syncHUD, endGame, askAI, requestEval])

  const doMove = useCallback((mv) => {
    const g = G.current, rdr = rdrRef.current; if (!rdr) return
    // On garde `mv` dans l'historique pour reconstruire la partie côté analyse post-partie.
    g.history.push({ board: g.board.map(row => row.map(c => c ? { ...c } : null)), turn: g.turn, last: g.last, halfmoveClock: g.halfmoveClock, mv })
    g.inputLocked = true; g.selected = null
    const notation = moveToNotation(mv); const mover = g.turn
    const before = g.board; const newClock = nextHalfmoveClock(g.halfmoveClock, g.board, mv)
    const { board: nb, promoted } = applyMove(g.board, mv, g.rules)
    rdr.setHint(null); setHud(h => ({ ...h, hinting: false }))
    rdr.playMove(mv, before, { promoted, ai: g.mode === 'ai' && mover === g.aiSide }).then(() => {
      g.board = nb; g.turn = opp(g.turn); g.last = mv; g.inputLocked = false; g.halfmoveClock = newClock
      const k = positionKey(g.board, g.turn); g.reps.set(k, (g.reps.get(k) || 0) + 1)
      setMoves(ms => [...ms, { side: mover, n: notation }])
      refreshTurn()
    })
  }, [refreshTurn])

  // Résultat du worker (ou repli). Ignore les réponses périmées (undo / new game).
  const onAIResult = useCallback((id, mv) => {
    const g = G.current
    if (id && id[0] === 'h') {
      if (id !== g.pendingHint) return; g.pendingHint = null
      setHud(h => ({ ...h, hinting: false }))
      if (mv) { rdrRef.current?.setHint(mv); clearTimeout(hintTimer.current); hintTimer.current = setTimeout(() => { rdrRef.current?.setHint(null) }, 3800) }
      return
    }
    if (id !== g.pendingMove) return; g.pendingMove = null
    setHud(h => ({ ...h, thinking: false }))
    if (!mv) { endGame(opp(g.turn)); return }
    doMove(mv)
  }, [doMove, endGame])

  // Résultat d'analyse (barre d'éval). On ignore les réponses périmées.
  const onEvalResult = useCallback((id, ev) => {
    const g = G.current
    if (!id || id !== g.pendingEval) return
    g.pendingEval = null
    if (ev) setEvalState(ev)
  }, [])

  const handleSquare = useCallback((r, c) => {
    const g = G.current
    if (g.inputLocked || g.gameOver) return
    if (g.mode === 'ai' && g.turn !== g.humanSide) return
    const key = r + '_' + c
    if (g.selected) {
      const mv = g.legalMoves.find(m => m.from[0] === g.selected[0] && m.from[1] === g.selected[1] && m.to[0] === r && m.to[1] === c)
      if (mv) { doMove(mv); return }
      if (g.movableKeys.has(key)) { g.selected = [r, c]; drawMarkers(); rdrRef.current?.sfxSelect(); return }
      g.selected = null; drawMarkers(); return
    }
    if (g.movableKeys.has(key)) { g.selected = [r, c]; drawMarkers(); rdrRef.current?.sfxSelect() }
  }, [doMove, drawMarkers])

  const newGame = useCallback(() => {
    const g = G.current; g.seq++; g.pendingMove = null; g.pendingHint = null; g.pendingEval = null; clearTimeout(hintTimer.current); clearTimeout(evalTimer.current)
    g.rules = R.rules                          // re-capture la variante active à chaque nouvelle partie
    setShowAnalyse(false); setFinalPositions(null)
    g.board = initBoard(g.rules); g.turn = P; g.gameOver = false; g.history = []; g.selected = null; g.inputLocked = false; g.last = null
    g.halfmoveClock = 0; g.reps = new Map(); g.reps.set(positionKey(g.board, g.turn), 1); setEvalState(null)
    startedAt.current = 0; setElapsed(0)
    setMoves([]); setHud(h => ({ ...h, gameOver: false, winner: null, draw: false, drawReason: null, thinking: false, hinting: false }))
    rdrRef.current?.setHint(null); rdrRef.current?.setBoard(g.board); rdrRef.current?.resetView(); refreshTurn()
  }, [refreshTurn, R.rules])

  const undo = useCallback(() => {
    const g = G.current; if (g.inputLocked || !g.history.length) return
    g.seq++; g.pendingMove = null; g.pendingEval = null
    let snap = null, pop = 0
    // chaque coup défait retire l'occurrence de la position COURANTE (celle qu'on quitte) du compteur de répétition.
    const dropRep = () => { const k = positionKey(g.board, g.turn); const n = (g.reps.get(k) || 1) - 1; if (n <= 0) g.reps.delete(k); else g.reps.set(k, n) }
    if (g.mode === 'ai') { while (g.history.length) { dropRep(); snap = g.history.pop(); pop++; g.board = snap.board.map(row => row.map(c => c ? { ...c } : null)); g.turn = snap.turn; if (snap.turn === g.humanSide) break } }
    else { dropRep(); snap = g.history.pop(); pop = 1; g.board = snap.board.map(row => row.map(c => c ? { ...c } : null)); g.turn = snap.turn }
    if (!snap) return
    clearTimeout(hintTimer.current); clearTimeout(evalTimer.current)
    g.board = snap.board.map(row => row.map(c => c ? { ...c } : null)); g.turn = snap.turn; g.gameOver = false; g.selected = null; g.last = snap.last || null
    g.halfmoveClock = snap.halfmoveClock | 0
    setMoves(ms => ms.slice(0, Math.max(0, ms.length - pop)))
    setHud(h => ({ ...h, gameOver: false, winner: null, draw: false, drawReason: null, thinking: false, hinting: false }))
    rdrRef.current?.setHint(null); rdrRef.current?.setBoard(g.board)
    g.legalMoves = generateMoves(g.board, g.turn, g.rules); g.movableKeys = new Set(g.legalMoves.map(m => m.from[0] + '_' + m.from[1]))
    drawMarkers(); syncHUD(); requestEval()
  }, [drawMarkers, syncHUD])

  const hint = useCallback(() => {
    const g = G.current
    if (g.inputLocked || g.gameOver) return
    if (g.mode === 'ai' && g.turn !== g.humanSide) return
    setHud(h => ({ ...h, hinting: true })); askAI('hint')
  }, [askAI])

  // ── montage renderer (lazy) + worker IA ──────────────────────────────────────
  useEffect(() => {
    let renderer = null, worker = null, alive = true
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    try {
      worker = new Worker(new URL('./engine/dames-ai.worker.js', import.meta.url), { type: 'module' })
      worker.onmessage = (e) => {
        if (!alive) return
        const d = e.data || {}
        if (d.eval !== undefined) { onEvalResult(d.id, d.eval); return }
        onAIResult(d.id, d.mv)
      }
      worker.onerror = () => { try { worker.terminate() } catch (e2) { /* */ } workerRef.current = null }
      workerRef.current = worker
    } catch (e) { workerRef.current = null }
    import('./render/DamesRenderer.js').then(({ default: DamesRenderer }) => {
      if (!alive || !canvasRef.current) return
      renderer = new DamesRenderer(); rdrRef.current = renderer
      renderer.onSquareClick = (r, c) => handleSquare(r, c)
      renderer.onCombo = (n) => fxRef.current?.combo(n)        // bandeau « RAFLE ×N » 2D
      renderer.onPromote = (side) => fxRef.current?.promote(side)  // couronnement Dame 2D
      renderer.mount(canvasRef.current, { reducedMotion: reduced })
      renderer.setView2D(view2D); renderer.setBoardTheme(boardTheme)
      G.current.rules = R.rules
      G.current.board = initBoard(G.current.rules); renderer.setBoard(G.current.board)
      setHud(h => ({ ...h, ready: true })); refreshTurn()
    }).catch(e => console.error('[dames3d] renderer load', e))
    return () => { alive = false; clearTimeout(hintTimer.current); if (worker) worker.terminate(); workerRef.current = null; if (renderer) renderer.dispose(); rdrRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Réglages live (drawer ⚙ du Nouveau Monde) → plateau / moteur / renderer ───
  // Changer de variante ou de règle relance une partie propre (on ne mute pas un
  // jeu en cours). On compare une clé sérialisée pour ne réagir qu'aux vrais changements.
  const rulesKey = JSON.stringify(R.rules)
  const lastRulesKey = useRef(rulesKey)
  useEffect(() => {
    if (!hud.ready || lastRulesKey.current === rulesKey) return
    lastRulesKey.current = rulesKey; newGame()
  }, [rulesKey, hud.ready, newGame])
  // Embarqué : vue 2D/3D, sons et niveau IA sont pilotés par le drawer (sinon boutons locaux).
  useEffect(() => { if (R.embarque) { setView2D(R.vue2D); rdrRef.current?.setView2D(R.vue2D) } }, [R.embarque, R.vue2D])
  useEffect(() => { if (R.embarque && R.boardTheme) { setBoardThemeState(R.boardTheme); rdrRef.current?.setBoardTheme(R.boardTheme) } }, [R.embarque, R.boardTheme])
  useEffect(() => { if (R.embarque) { setMuted(!R.sons); rdrRef.current?.setMuted(!R.sons) } }, [R.embarque, R.sons])
  useEffect(() => { rdrRef.current?.setVolume?.(R.volume) }, [R.volume])
  useEffect(() => { if (R.embarque) { G.current.diff = R.diff; setHud(h => ({ ...h, diff: R.diff })) } }, [R.embarque, R.diff])
  // Surbrillance des prises possibles (pastilles) — pilotée par le réglage, redessine.
  useEffect(() => { G.current.surbrillancePrises = R.surbrillancePrises; drawMarkers() }, [R.surbrillancePrises, drawMarkers])
  // Coordonnées (numérotation internationale, vue 2D) — pilotée par le réglage.
  useEffect(() => { G.current.coordonnees = R.coordonnees; drawMarkers() }, [R.coordonnees, drawMarkers])

  // Ouvre l'analyse post-partie à partir de l'historique (plateau AVANT chaque coup + le coup).
  const openAnalyse = useCallback(() => {
    const positions = G.current.history.filter(h => h.mv).map(h => ({ board: h.board, side: h.turn, mv: h.mv }))
    if (!positions.length) return
    setFinalPositions(positions); setShowAnalyse(true)
  }, [])

  const setMode = (m) => { G.current.mode = m; setHud(h => ({ ...h, mode: m })); newGame() }
  const setDiff = (d) => { G.current.diff = d; setHud(h => ({ ...h, diff: d })) }
  const toggleMute = () => { const m = !muted; setMuted(m); rdrRef.current?.setMuted(m) }
  const toggleMusic = () => { const m = !music; setMusic(m); rdrRef.current?.setMusic(m) }
  const cycleQuality = () => { const i = QUALITY.findIndex(q => q[0] === quality); const next = QUALITY[(i + 1) % QUALITY.length][0]; setQuality(next); rdrRef.current?.setQuality(next) }
  const toggle2D = () => { const v = !view2D; setView2D(v); rdrRef.current?.setView2D(v) }
  const cycleBoard = () => { const i = BOARDS.findIndex(b => b[0] === boardTheme); const next = BOARDS[(i + 1) % BOARDS.length][0]; setBoardThemeState(next); rdrRef.current?.setBoardTheme(next) }
  // a11y : navigation du plateau au clavier (flèches = déplacer le curseur, Entrée = sélectionner/jouer, Échap = désélectionner).
  const onKeyDown = (e) => {
    const g = G.current
    if (e.key === 'Escape') { if (g.selected) { g.selected = null; drawMarkers() } return }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (g.cursor) handleSquare(g.cursor[0], g.cursor[1]); return }
    const dirs = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    const d = dirs[e.key]; if (!d) return
    e.preventDefault()
    const [r, c] = g.cursor || [6, 1]
    let nr = Math.max(0, Math.min(9, r + d[0])), nc = Math.max(0, Math.min(9, c + d[1]))
    if (!isDark(nr, nc)) { if (nc + 1 <= 9 && isDark(nr, nc + 1)) nc++; else if (nc - 1 >= 0) nc-- }
    g.cursor = [nr, nc]; rdrRef.current?.setCursor(g.cursor)
  }

  const turnColor = hud.turn === P ? ui.text : ui.text
  const sideName = SIDE_LBL[hud.turn]
  const turnText = hud.mode === 'ai'
    ? (hud.turn === P ? 'À vous de jouer' : (hud.thinking ? `${sideName} réfléchit…` : sideName))
    : `${sideName} — à vous`
  const myTurn = !hud.gameOver && (hud.mode === 'local' || hud.turn === G.current.humanSide) && !hud.thinking

  return (
    <div ref={containerRef} tabIndex={0} onKeyDown={onKeyDown} role="application" aria-label="Plateau de dames 3D — flèches pour déplacer le curseur, Entrée pour sélectionner ou jouer, Échap pour annuler la sélection"
      onFocus={(e) => { try { if (e.target.matches(':focus-visible')) setFocused(true) } catch { setFocused(true) } }} onBlur={() => setFocused(false)}
      style={{ position: 'relative', width: '100%', height: fs ? '100vh' : 'min(74vh, 720px)', minHeight: 460, borderRadius: fs ? 0 : ui.radius.lg, overflow: 'hidden', background: `radial-gradient(120% 90% at 50% 12%, ${ui.bgElev} 0%, ${ui.bg} 55%, #08090c 82%)`, border: fs ? 'none' : `1px solid ${ui.line}`, outline: 'none', boxShadow: focused ? `inset 0 0 0 2px ${ui.accent}66` : 'none' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 200px 30px rgba(0,0,0,.6)' }} />
      <DamesFxOverlay ref={fxRef} winner={hud.gameOver && !hud.draw ? hud.winner : null} />

      {/* Barre d'évaluation (moteur) — bord gauche, centrée verticalement */}
      {hud.ready && (
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', height: 'min(56vh, 480px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, pointerEvents: 'none', zIndex: 6 }}>
          <DamesEvalBar ev={evalState} height="100%" />
          <span style={{ fontSize: 8.5, letterSpacing: 1.2, textTransform: 'uppercase', color: MUTED, fontWeight: 700, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Éval</span>
        </div>
      )}

      {/* HUD haut */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center', pointerEvents: 'auto' }}>
          <div style={segWrap}>
            <button style={seg(hud.mode === 'ai')} onClick={() => setMode('ai')}>Solo (IA)</button>
            <button style={seg(hud.mode === 'local')} onClick={() => setMode('local')}>2 joueurs</button>
          </div>
          {hud.mode === 'ai' && !R.embarque && (<div style={segWrap}>{DIFFS.map(([id, lbl]) => <button key={id} style={{ ...seg(hud.diff === id), fontSize: 12, padding: '7px 11px' }} onClick={() => setDiff(id)}>{lbl}</button>)}</div>)}
          <button style={iconBtn(false)} title="Nouvelle partie" aria-label="Nouvelle partie" onClick={newGame}>↻</button>
          <button style={iconBtn(!hud.canUndo)} title="Annuler le coup" aria-label="Annuler le coup" onClick={undo} disabled={!hud.canUndo}>↶</button>
          <button style={iconBtn(!myTurn || hud.hinting)} title={hud.thinking ? "Indice indisponible — l'IA joue" : hud.hinting ? 'Recherche du meilleur coup…' : 'Indice (meilleur coup)'} aria-label="Indice" onClick={hint} disabled={!myTurn || hud.hinting}>?</button>
          <button style={iconBtn(false)} title="Recentrer la vue" aria-label="Recentrer la vue" onClick={() => rdrRef.current?.resetView()}>⌖</button>
          {!R.embarque && <button style={{ ...iconBtn(false), fontSize: 13, fontWeight: 700 }} title={`Plateau : ${damesBoard[boardTheme]?.label || ''}`} aria-label="Changer le plateau" onClick={cycleBoard}>◧</button>}
          {!R.embarque && <button style={{ ...iconBtn(false), fontSize: 12.5, fontWeight: 700, ...(view2D ? { background: `linear-gradient(180deg,${ui.accentHi},${ui.accent})`, color: ui.accentInk, borderColor: ui.accent } : {}) }} title={view2D ? 'Passer en vue 3D' : 'Passer en vue 2D'} aria-label="Basculer vue 2D / 3D" aria-pressed={view2D} onClick={toggle2D}>{view2D ? '2D' : '3D'}</button>}
          {!view2D && <button style={iconBtn(false)} title={`Effets : ${QUALITY.find(q => q[0] === quality)?.[1] || ''}`} aria-label="Qualité des effets" onClick={cycleQuality}>{quality === 'high' ? '◉' : quality === 'medium' ? '◐' : '○'}</button>}
          <button style={iconBtn(false)} title={fs ? 'Quitter le plein écran' : 'Plein écran'} aria-label="Plein écran" onClick={toggleFs}>{fs ? '⤬' : '⛶'}</button>
          {!R.embarque && <button style={iconBtn(false)} title={muted ? 'Activer le son' : 'Couper le son'} aria-label="Son" onClick={toggleMute}>{muted ? '♪̸' : '♪'}</button>}
          {!view2D && <button style={{ ...iconBtn(false), opacity: music ? 1 : 0.45 }} title={music ? 'Musique : activée' : 'Musique : coupée'} aria-label="Musique" onClick={toggleMusic}>♬</button>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: ui.bgElev, border: `1px solid ${ui.lineHi}`, borderRadius: ui.radius.pill, padding: '7px 20px 7px 8px', backdropFilter: 'blur(12px)', boxShadow: ui.shadow }}>
          <span aria-hidden style={{ width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `radial-gradient(circle at 36% 30%, ${damesPieces[hud.turn === P ? 'fonce' : 'clair'].haut}, ${SIDE_COL[hud.turn]})`, boxShadow: `0 0 0 1px ${ui.lineHi}, inset 0 -3px 6px rgba(0,0,0,.4)` }} />
          {hud.thinking && <span ref={thinkDotRef} aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: ui.accent, flexShrink: 0 }} />}
          <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, letterSpacing: '.2px', color: turnColor }}>{turnText}</span>
          <span aria-label="Durée de la partie" title="Durée de la partie" style={{ marginLeft: 4, paddingLeft: 11, borderLeft: `1px solid ${ui.line}`, fontFamily: MONO, fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 13, color: MUTED, letterSpacing: '.3px' }}>
            {String((elapsed / 60) | 0).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Historique notation (desktop) */}
      {moves.length > 0 && !compact && (
        <div style={{ position: 'absolute', top: 92, right: 12, width: 118, maxHeight: 'min(46vh,360px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, padding: 8, background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.md, backdropFilter: 'blur(8px)', pointerEvents: 'auto' }} className="dames-hist">
          <div style={{ fontSize: 9.5, letterSpacing: 1.4, textTransform: 'uppercase', color: MUTED, fontWeight: 700, marginBottom: 3 }}>Coups</div>
          {moves.slice().reverse().map((m, i) => { const n = moves.length - i; return (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontFamily: MONO, fontWeight: 600, color: PARCH }}>
              <span style={{ color: MUTED, fontSize: 10, width: 18 }}>{n}.</span>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: SIDE_COL[m.side], border: `1px solid ${ui.lineHi}`, flexShrink: 0 }} />
              {m.n}
            </div>) })}
        </div>
      )}

      {/* Compteurs bas + plateau des pièces capturées */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 14px 14px', display: 'flex', justifyContent: 'center', gap: 12, pointerEvents: 'none' }}>
        {[[SIDE_LBL[P], hud.pir, P], [SIDE_LBL[M], hud.mar, M]].map(([lbl, n, side]) => {
          const lost = Math.max(0, 20 - n)
          const pc = damesPieces[side === P ? 'fonce' : 'clair']
          const dot = `radial-gradient(circle at 36% 30%,${pc.haut},${pc.base})`
          return (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 11, background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.md, padding: '8px 14px', backdropFilter: 'blur(10px)' }}>
            <span aria-hidden style={{ width: 26, height: 26, borderRadius: '50%', background: dot, boxShadow: `0 0 0 1px ${ui.lineHi}, inset 0 -3px 5px rgba(0,0,0,.4)` }} />
            <div><div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED, fontWeight: 700 }}>{lbl}</div><div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 22, lineHeight: 1, color: PARCH, fontVariantNumeric: 'tabular-nums' }}>{n}</div></div>
            <div title={`${lost} capturé(s)`} style={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: 50, maxHeight: 32, alignContent: 'center', justifyContent: 'flex-start' }}>
              {Array.from({ length: lost }).map((_, i) => <span key={i} aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: dot, opacity: 0.8, boxShadow: '0 1px 2px rgba(0,0,0,.4)' }} />)}
            </div>
          </div>)
        })}
      </div>

      {!hud.ready && (<div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: GOLD, fontFamily: DISP, fontWeight: 700, fontSize: 18, letterSpacing: '.3px' }}>Chargement du plateau…</div>)}

      {hud.gameOver && (hud.draw || hud.winner) && (
        <DamesPoster
          result={hud.draw ? 'draw' : hud.winner}
          myColor={hud.mode === 'ai' ? G.current.humanSide : null}
          reason={hud.draw ? hud.drawReason
            : hud.winner === P ? `${SIDE_LBL[M]} n'a plus aucun coup légal.` : `${SIDE_LBL[P]} est à court de coups.`}
          stats={[['Coups', moves.length], ['Prises', Math.max(0, 40 - hud.pir - hud.mar)]]}
          onRematch={newGame}
          onQuit={() => navigate('/jeux')}
          onAnalyse={G.current.history.some(h => h.mv) ? openAnalyse : null}
          rematchLabel="Revanche"
        />
      )}

      {showAnalyse && finalPositions && (
        <DamesAnalyse
          positions={finalPositions}
          result={hud.draw ? 'draw' : hud.winner}
          finalBoard={G.current.board}
          rules={G.current.rules}
          onClose={() => setShowAnalyse(false)}
        />
      )}
    </div>
  )
}
