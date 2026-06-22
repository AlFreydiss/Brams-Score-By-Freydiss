// ─────────────────────────────────────────────────────────────────────────────
// useDraughtsGame — état de partie autonome (moteur + Web Worker IA), SANS store
// externe ni R3F. Remplace l'orchestrateur DamesGame3D pour le board 2D piloté par
// props. Le moteur fait foi (rafle maximale forcée + dames volantes par défaut).
// Modes : 'ai' (4 niveaux) · 'local' (2 joueurs). L'IA tourne dans le worker →
// l'UI ne bloque jamais ; repli synchrone si le worker échoue.
// Expose : board, turn, legalMoves, movableKeys, selected, last, hint, history,
//          moves (notation), counts, status, thinking, modes/contrôles.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  initBoard, generateMoves, applyMove, countPieces, opp, aiMove, P, M,
  gameStatus, nextHalfmoveClock, positionKey, DEFAULT_RULES,
} from '../../../features/dames/engine/draughts-engine.js'
import { moveToNotation } from '../../../features/dames/engine/notation.js'

const cloneBoard = (b) => b.map(row => row.map(c => (c ? { ...c } : null)))

// 4 niveaux exposés (libellés sobres) → difficulté moteur.
export const LEVELS = [
  ['mousse', 'Débutant'],
  ['marin', 'Facile'],
  ['capitaine', 'Moyen'],
  ['amiral', 'Difficile'],
]

export function useDraughtsGame({ rules = DEFAULT_RULES, initialMode = 'ai', initialDiff = 'capitaine', onMove, onPromote, onEnd } = {}) {
  const rulesRef = useRef(rules)
  rulesRef.current = rules

  // état "noyau" en ref (mutations rapides) + miroir React pour le rendu.
  const G = useRef(null)
  if (!G.current) {
    const b = initBoard(rules)
    G.current = {
      board: b, turn: P, mode: initialMode, diff: initialDiff, humanSide: P, aiSide: M,
      legalMoves: [], movableKeys: new Set(), selected: null, last: null, hint: null,
      inputLocked: false, gameOver: false, history: [], seq: 0, pendingMove: null, pendingHint: null,
      halfmoveClock: 0, reps: new Map(),
    }
  }
  const workerRef = useRef(null)
  const hintTimer = useRef(0)
  const cbRef = useRef({ onMove, onPromote, onEnd })
  cbRef.current = { onMove, onPromote, onEnd }

  const [snap, setSnap] = useState(() => readSnap(G.current))
  const sync = useCallback(() => setSnap(readSnap(G.current)), [])

  function readSnap(g) {
    return {
      board: g.board, turn: g.turn, legalMoves: g.legalMoves, movableKeys: g.movableKeys,
      selected: g.selected, last: g.last, hint: g.hint, mode: g.mode, diff: g.diff,
      humanSide: g.humanSide, gameOver: g.gameOver, status: g.status || null,
      thinking: g.thinking || false, hinting: g.hinting || false,
      canUndo: g.history.length > 0,
      counts: { [P]: countPieces(g.board, P), [M]: countPieces(g.board, M) },
      moves: g.moves || [],
    }
  }

  // ── recalcul du trait : coups légaux, statut, déclenchement IA ──
  const refreshTurn = useCallback(() => {
    const g = G.current
    g.legalMoves = generateMoves(g.board, g.turn, rulesRef.current)
    g.movableKeys = new Set(g.legalMoves.map(m => m.from[0] + '_' + m.from[1]))
    g.selected = null
    const st = gameStatus(g.board, g.turn, { halfmoveClock: g.halfmoveClock, repetitions: g.reps }, rulesRef.current)
    if (st.over) {
      g.gameOver = true
      g.status = { winner: st.draw ? null : st.winner, draw: !!st.draw, reason: st.reason || null }
      g.thinking = false
      sync()
      cbRef.current.onEnd?.(g.status)
      return
    }
    if (g.mode === 'ai' && g.turn === g.aiSide) { g.thinking = true; sync(); askAI('move') }
    else sync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync])

  const askAI = useCallback((type) => {
    const g = G.current
    const id = (type === 'hint' ? 'h' : 'm') + (++g.seq)
    if (type === 'hint') g.pendingHint = id; else g.pendingMove = id
    const payload = { id, type, board: g.board, side: type === 'hint' ? g.humanSide : g.turn, diff: g.diff, rules: rulesRef.current }
    if (workerRef.current) workerRef.current.postMessage(payload)
    else { // repli thread principal
      const mv = type === 'hint'
        ? aiMove(g.board, g.humanSide, 'amiral', rulesRef.current)
        : aiMove(g.board, g.turn, g.diff, rulesRef.current)
      setTimeout(() => onAIResult(id, mv), 30)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doMove = useCallback((mv) => {
    const g = G.current
    g.history.push({ board: cloneBoard(g.board), turn: g.turn, last: g.last, halfmoveClock: g.halfmoveClock, mv })
    g.inputLocked = true; g.selected = null; g.hint = null
    const mover = g.turn
    const notation = moveToNotation(mv)
    const newClock = nextHalfmoveClock(g.halfmoveClock, g.board, mv)
    const { board: nb, promoted } = applyMove(g.board, mv, rulesRef.current)
    g.board = nb; g.last = mv; g.turn = opp(g.turn); g.halfmoveClock = newClock
    const k = positionKey(g.board, g.turn); g.reps.set(k, (g.reps.get(k) || 0) + 1)
    g.moves = [...(g.moves || []), { side: mover, n: notation, capture: !!(mv.caps && mv.caps.length) }]
    g.inputLocked = false
    cbRef.current.onMove?.({ mv, mover, capture: !!(mv.caps && mv.caps.length) })
    if (promoted) cbRef.current.onPromote?.(mover)
    sync()
    refreshTurn()
  }, [refreshTurn, sync])

  const onAIResult = useCallback((id, mv) => {
    const g = G.current
    if (id && id[0] === 'h') {
      if (id !== g.pendingHint) return
      g.pendingHint = null; g.hinting = false
      if (mv) { g.hint = mv; clearTimeout(hintTimer.current); hintTimer.current = setTimeout(() => { G.current.hint = null; sync() }, 3800) }
      sync(); return
    }
    if (id !== g.pendingMove) return
    g.pendingMove = null; g.thinking = false
    if (!mv) { g.gameOver = true; g.status = { winner: opp(g.turn), draw: false, reason: null }; sync(); cbRef.current.onEnd?.(g.status); return }
    doMove(mv)
  }, [doMove, sync])

  // ── interactions ──
  const handleSquare = useCallback((r, c) => {
    const g = G.current
    if (g.inputLocked || g.gameOver) return
    if (g.mode === 'ai' && g.turn !== g.humanSide) return
    const key = r + '_' + c
    if (g.selected) {
      const mv = g.legalMoves.find(m => m.from[0] === g.selected[0] && m.from[1] === g.selected[1] && m.to[0] === r && m.to[1] === c)
      if (mv) { doMove(mv); return }
      if (g.movableKeys.has(key)) { g.selected = [r, c]; sync(); return }
      g.selected = null; sync(); return
    }
    if (g.movableKeys.has(key)) { g.selected = [r, c]; sync() }
  }, [doMove, sync])

  const newGame = useCallback((opts = {}) => {
    const g = G.current; g.seq++; g.pendingMove = null; g.pendingHint = null; clearTimeout(hintTimer.current)
    if (opts.mode) g.mode = opts.mode
    if (opts.diff) g.diff = opts.diff
    if (opts.humanSide) { g.humanSide = opts.humanSide; g.aiSide = opp(opts.humanSide) }
    g.board = initBoard(rulesRef.current); g.turn = P; g.gameOver = false; g.status = null
    g.history = []; g.selected = null; g.last = null; g.hint = null; g.inputLocked = false
    g.thinking = false; g.hinting = false; g.moves = []
    g.halfmoveClock = 0; g.reps = new Map(); g.reps.set(positionKey(g.board, g.turn), 1)
    sync(); refreshTurn()
  }, [refreshTurn, sync])

  const undo = useCallback(() => {
    const g = G.current
    if (g.inputLocked || !g.history.length) return
    g.seq++; g.pendingMove = null; clearTimeout(hintTimer.current)
    const dropRep = () => { const k = positionKey(g.board, g.turn); const n = (g.reps.get(k) || 1) - 1; if (n <= 0) g.reps.delete(k); else g.reps.set(k, n) }
    let snapH = null, pop = 0
    if (g.mode === 'ai') {
      while (g.history.length) { dropRep(); snapH = g.history.pop(); pop++; g.board = cloneBoard(snapH.board); g.turn = snapH.turn; if (snapH.turn === g.humanSide) break }
    } else { dropRep(); snapH = g.history.pop(); pop = 1 }
    if (!snapH) return
    g.board = cloneBoard(snapH.board); g.turn = snapH.turn; g.last = snapH.last || null
    g.halfmoveClock = snapH.halfmoveClock | 0
    g.gameOver = false; g.status = null; g.selected = null; g.hint = null; g.thinking = false; g.hinting = false
    g.moves = (g.moves || []).slice(0, Math.max(0, (g.moves || []).length - pop))
    g.legalMoves = generateMoves(g.board, g.turn, rulesRef.current)
    g.movableKeys = new Set(g.legalMoves.map(m => m.from[0] + '_' + m.from[1]))
    sync()
  }, [sync])

  const resign = useCallback(() => {
    const g = G.current
    if (g.gameOver) return
    const loser = g.mode === 'ai' ? g.humanSide : g.turn
    g.gameOver = true; g.status = { winner: opp(loser), draw: false, reason: 'abandon', resigned: true }
    g.thinking = false; g.selected = null; sync()
    cbRef.current.onEnd?.(g.status)
  }, [sync])

  const hint = useCallback(() => {
    const g = G.current
    if (g.inputLocked || g.gameOver || g.hinting) return
    if (g.mode === 'ai' && g.turn !== g.humanSide) return
    g.hinting = true; sync(); askAI('hint')
  }, [askAI, sync])

  const setDiff = useCallback((d) => { G.current.diff = d; sync() }, [sync])

  // ── montage du worker IA + 1er trait ──
  useEffect(() => {
    let worker = null, alive = true
    try {
      worker = new Worker(new URL('../../../features/dames/engine/dames-ai.worker.js', import.meta.url), { type: 'module' })
      worker.onmessage = (e) => { if (!alive) return; const d = e.data || {}; if (d.eval !== undefined) return; onAIResult(d.id, d.mv) }
      worker.onerror = () => { try { worker.terminate() } catch { /* */ } workerRef.current = null }
      workerRef.current = worker
    } catch { workerRef.current = null }
    refreshTurn()
    return () => { alive = false; clearTimeout(hintTimer.current); if (worker) { try { worker.terminate() } catch { /* */ } } workerRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const api = useMemo(() => ({
    ...snap, handleSquare, newGame, undo, resign, hint, setDiff,
  }), [snap, handleSquare, newGame, undo, resign, hint, setDiff])

  return api
}
