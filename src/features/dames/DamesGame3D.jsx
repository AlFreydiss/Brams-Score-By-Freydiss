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

const QUALITY = [['high', 'Élevé'], ['medium', 'Moyen'], ['low', 'Basique']]

const GOLD = '#d9b870', PARCH = '#efe6d4', MUTED = '#9a8f7d', EMBER = '#e0623a'
const PIRATA = "'Pirata One','OnePiece',cursive"   // titres/faction (design system Brams)
const DIFFS = [['mousse', 'Mousse'], ['marin', 'Pirate'], ['capitaine', 'Corsaire'], ['amiral', 'Amiral'], ['legende', 'Roi des Pirates']]
const seg = (on) => ({ appearance: 'none', border: 0, background: on ? `linear-gradient(180deg,${GOLD},#b8924a)` : 'transparent', color: on ? '#231703' : MUTED, fontFamily: 'inherit', fontWeight: 600, fontSize: 13, letterSpacing: '.3px', padding: '8px 15px', borderRadius: 999, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: on ? '0 4px 14px rgba(217,184,112,.28), inset 0 1px 1px rgba(255,255,255,.4)' : 'none', transition: '.18s' })
const segWrap = { display: 'flex', background: 'rgba(18,13,8,.72)', border: '1px solid rgba(217,184,112,.16)', borderRadius: 999, padding: 4, gap: 3, backdropFilter: 'blur(10px)', flexWrap: 'wrap' }
const iconBtn = (dis) => ({ appearance: 'none', border: '1px solid rgba(217,184,112,.16)', background: 'rgba(18,13,8,.72)', color: MUTED, width: 40, height: 40, borderRadius: '50%', cursor: dis ? 'not-allowed' : 'pointer', display: 'grid', placeItems: 'center', fontSize: 16, backdropFilter: 'blur(10px)', opacity: dis ? 0.32 : 1 })

export default function DamesGame3D() {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const rdrRef = useRef(null)
  const workerRef = useRef(null)
  const G = useRef({ board: null, turn: P, mode: 'local', diff: 'marin', humanSide: P, aiSide: M, legalMoves: [], movableKeys: new Set(), selected: null, inputLocked: false, gameOver: false, history: [], last: null, seq: 0, pendingMove: null, pendingHint: null, halfmoveClock: 0, reps: new Map(), pendingEval: null })
  const [hud, setHud] = useState({ turn: P, pir: 20, mar: 20, gameOver: false, winner: null, draw: false, drawReason: null, thinking: false, mode: 'local', diff: 'marin', canUndo: false, ready: false, hinting: false })
  const [evalState, setEvalState] = useState(null)
  const evalTimer = useRef(0)
  const [moves, setMoves] = useState([])
  const [muted, setMuted] = useState(false)
  const [music, setMusic] = useState(() => { try { return localStorage.getItem('dames_music') === '1' } catch (e) { return false } })
  const navigate = useNavigate()
  const [quality, setQuality] = useState(() => { try { return localStorage.getItem('dames_quality') || 'high' } catch (e) { return 'high' } })
  const [fs, setFs] = useState(false)
  const [focused, setFocused] = useState(false)   // focus clavier visible (a11y) — révèle le mode flèches
  const hintTimer = useRef(0)
  const thinkDotRef = useRef(null)   // pastille pulsante « IA réfléchit » (WAAPI, repo inline-only)
  // Sur petit écran, la barre de boutons du haut déborde sur plusieurs lignes : l'historique
  // (top:92) chevaucherait alors les boutons et le plateau. On le masque sous 760px.
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.innerWidth < 760)

  useEffect(() => { const r = () => setCompact(window.innerWidth < 760); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r) }, [])

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
    rdr.setMarkers({ selected: g.selected, legalMoves: g.legalMoves, movableKeys: g.movableKeys, interactive: !g.inputLocked && !aiTurn && !g.gameOver, gameOver: g.gameOver, last: g.last })
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
      workerRef.current.postMessage({ id, type: 'analyse', board: g2.board, side: g2.turn, depth: 6 })
    }, 260)
  }, [])

  const askAI = useCallback((type) => {
    const g = G.current
    const id = (type === 'hint' ? 'h' : 'm') + (++g.seq)
    if (type === 'hint') g.pendingHint = id; else g.pendingMove = id
    const payload = { id, type, board: g.board, side: type === 'hint' ? g.humanSide : g.turn, diff: g.diff }
    if (workerRef.current) workerRef.current.postMessage(payload)
    else { // repli thread principal
      const mv = type === 'hint' ? aiMove(g.board, g.humanSide, 'amiral') : aiMove(g.board, g.turn, g.diff)
      setTimeout(() => onAIResult(id, mv), 20)
    }
  }, [])

  const refreshTurn = useCallback(() => {
    const g = G.current
    g.legalMoves = generateMoves(g.board, g.turn)
    g.movableKeys = new Set(g.legalMoves.map(m => m.from[0] + '_' + m.from[1]))
    g.selected = null; drawMarkers(); syncHUD()
    const st = gameStatus(g.board, g.turn, { halfmoveClock: g.halfmoveClock, repetitions: g.reps })
    if (st.over) { endGame(st.winner, st.draw ? (st.reason || 'Partie nulle.') : null); return }
    requestEval()
    if (g.mode === 'ai' && g.turn === g.aiSide) { setHud(h => ({ ...h, thinking: true })); askAI('move') }
  }, [drawMarkers, syncHUD, endGame, askAI, requestEval])

  const doMove = useCallback((mv) => {
    const g = G.current, rdr = rdrRef.current; if (!rdr) return
    g.history.push({ board: g.board.map(row => row.map(c => c ? { ...c } : null)), turn: g.turn, last: g.last, halfmoveClock: g.halfmoveClock })
    g.inputLocked = true; g.selected = null
    const notation = moveToNotation(mv); const mover = g.turn
    const before = g.board; const newClock = nextHalfmoveClock(g.halfmoveClock, g.board, mv)
    const { board: nb, promoted } = applyMove(g.board, mv)
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
    g.board = initBoard(); g.turn = P; g.gameOver = false; g.history = []; g.selected = null; g.inputLocked = false; g.last = null
    g.halfmoveClock = 0; g.reps = new Map(); g.reps.set(positionKey(g.board, g.turn), 1); setEvalState(null)
    setMoves([]); setHud(h => ({ ...h, gameOver: false, winner: null, draw: false, drawReason: null, thinking: false, hinting: false }))
    rdrRef.current?.setHint(null); rdrRef.current?.setBoard(g.board); rdrRef.current?.resetView(); refreshTurn()
  }, [refreshTurn])

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
    g.legalMoves = generateMoves(g.board, g.turn); g.movableKeys = new Set(g.legalMoves.map(m => m.from[0] + '_' + m.from[1]))
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
      renderer.mount(canvasRef.current, { reducedMotion: reduced })
      G.current.board = initBoard(); renderer.setBoard(G.current.board)
      setHud(h => ({ ...h, ready: true })); refreshTurn()
    }).catch(e => console.error('[dames3d] renderer load', e))
    return () => { alive = false; clearTimeout(hintTimer.current); if (worker) worker.terminate(); workerRef.current = null; if (renderer) renderer.dispose(); rdrRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setMode = (m) => { G.current.mode = m; setHud(h => ({ ...h, mode: m })); newGame() }
  const setDiff = (d) => { G.current.diff = d; setHud(h => ({ ...h, diff: d })) }
  const toggleMute = () => { const m = !muted; setMuted(m); rdrRef.current?.setMuted(m) }
  const toggleMusic = () => { const m = !music; setMusic(m); rdrRef.current?.setMusic(m) }
  const cycleQuality = () => { const i = QUALITY.findIndex(q => q[0] === quality); const next = QUALITY[(i + 1) % QUALITY.length][0]; setQuality(next); rdrRef.current?.setQuality(next) }
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

  const turnColor = hud.turn === P ? '#ef8a7c' : '#82b6e6'
  const turnText = hud.turn === P ? (hud.mode === 'ai' ? 'Pirates — à toi de jouer' : 'Pirates — à vous') : (hud.mode === 'ai' ? (hud.thinking ? 'Marine réfléchit…' : 'Marine') : 'Marine — à vous')
  const myTurn = !hud.gameOver && (hud.mode === 'local' || hud.turn === G.current.humanSide) && !hud.thinking

  return (
    <div ref={containerRef} tabIndex={0} onKeyDown={onKeyDown} role="application" aria-label="Plateau de dames 3D — flèches pour déplacer le curseur, Entrée pour sélectionner ou jouer, Échap pour annuler la sélection"
      onFocus={(e) => { try { if (e.target.matches(':focus-visible')) setFocused(true) } catch { setFocused(true) } }} onBlur={() => setFocused(false)}
      style={{ position: 'relative', width: '100%', height: fs ? '100vh' : 'min(74vh, 720px)', minHeight: 460, borderRadius: fs ? 0 : 18, overflow: 'hidden', background: 'radial-gradient(120% 90% at 50% 12%, #241a10 0%, #150f0a 40%, #0a0807 78%)', border: fs ? 'none' : '1px solid rgba(217,184,112,.16)', outline: 'none', boxShadow: focused ? 'inset 0 0 0 2px rgba(217,184,112,.4)' : 'none' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 200px 30px rgba(0,0,0,.6)' }} />

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
            <button style={seg(hud.mode === 'local')} onClick={() => setMode('local')}>👥 Local 2 J</button>
            <button style={seg(hud.mode === 'ai')} onClick={() => setMode('ai')}>⚔️ vs IA</button>
          </div>
          {hud.mode === 'ai' && (<div style={segWrap}>{DIFFS.map(([id, lbl]) => <button key={id} style={{ ...seg(hud.diff === id), fontSize: 12, padding: '7px 11px' }} onClick={() => setDiff(id)}>{lbl}</button>)}</div>)}
          <button style={iconBtn(false)} title="Nouvelle partie" onClick={newGame}>↻</button>
          <button style={iconBtn(!hud.canUndo)} title="Annuler" onClick={undo} disabled={!hud.canUndo}>↶</button>
          <button style={iconBtn(!myTurn || hud.hinting)} title={hud.thinking ? "Indice indisponible — l'IA joue" : hud.hinting ? 'Recherche du meilleur coup…' : 'Indice (meilleur coup)'} onClick={hint} disabled={!myTurn || hud.hinting}>💡</button>
          <button style={iconBtn(false)} title="Recentrer" onClick={() => rdrRef.current?.resetView()}>⌖</button>
          <button style={iconBtn(false)} title={`Effets : ${QUALITY.find(q => q[0] === quality)?.[1] || ''}`} aria-label="Qualité des effets" onClick={cycleQuality}>{quality === 'high' ? '✨' : quality === 'medium' ? '◐' : '○'}</button>
          <button style={iconBtn(false)} title={fs ? 'Quitter le plein écran' : 'Plein écran'} aria-label="Plein écran" onClick={toggleFs}>{fs ? '🗗' : '⛶'}</button>
          <button style={iconBtn(false)} title="Son" onClick={toggleMute}>{muted ? '🔇' : '🔊'}</button>
          <button style={{ ...iconBtn(false), opacity: music ? 1 : 0.45 }} title={music ? 'Musique : on' : 'Musique : off'} aria-label="Musique" onClick={toggleMusic}>🎵</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'rgba(14,10,7,.82)', border: '1px solid rgba(217,184,112,.22)', borderRadius: 999, padding: '7px 20px 7px 8px', backdropFilter: 'blur(12px)', boxShadow: '0 8px 28px rgba(0,0,0,.5)' }}>
          <span style={{ width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 17, background: `radial-gradient(circle at 35% 30%, ${hud.turn === P ? '#d9594d' : '#5a97d6'}, ${hud.turn === P ? '#5e1110' : '#0e2444'})`, boxShadow: `0 0 16px ${hud.turn === P ? 'rgba(217,89,77,.55)' : 'rgba(90,151,214,.55)'}` }}>{hud.turn === P ? '☠️' : '⚓'}</span>
          {hud.thinking && <span ref={thinkDotRef} aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: turnColor, flexShrink: 0 }} />}
          <span style={{ fontFamily: PIRATA, fontSize: 19, letterSpacing: '.5px', color: turnColor }}>{turnText}</span>
        </div>
      </div>

      {/* Historique notation (desktop) */}
      {moves.length > 0 && !compact && (
        <div style={{ position: 'absolute', top: 92, right: 12, width: 116, maxHeight: 'min(46vh,360px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, padding: 8, background: 'rgba(14,10,7,.7)', border: '1px solid rgba(217,184,112,.14)', borderRadius: 12, backdropFilter: 'blur(8px)', pointerEvents: 'auto' }} className="dames-hist">
          <div style={{ fontSize: 9.5, letterSpacing: 1.4, textTransform: 'uppercase', color: MUTED, fontWeight: 700, marginBottom: 3 }}>Coups</div>
          {moves.slice().reverse().map((m, i) => { const n = moves.length - i; return (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontFamily: "'Inter',sans-serif", fontWeight: 600, color: PARCH }}>
              <span style={{ color: MUTED, fontSize: 10, width: 18 }}>{n}.</span>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.side === P ? '#c0392b' : '#3f86c8', flexShrink: 0 }} />
              {m.n}
            </div>) })}
        </div>
      )}

      {/* Compteurs bas + plateau des pièces capturées */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 14px 14px', display: 'flex', justifyContent: 'center', gap: 12, pointerEvents: 'none' }}>
        {[['Pirates', hud.pir, '#d9594d', '#5e1110', '☠️'], ['Marine', hud.mar, '#5a97d6', '#0e2444', '⚓']].map(([lbl, n, c1, c2, ic]) => {
          const lost = Math.max(0, 20 - n)
          return (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'rgba(14,10,7,.78)', border: '1px solid rgba(217,184,112,.18)', borderRadius: 14, padding: '8px 14px', backdropFilter: 'blur(10px)' }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 15, background: `radial-gradient(circle at 35% 30%,${c1},${c2})` }}>{ic}</span>
            <div><div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED, fontWeight: 700 }}>{lbl}</div><div style={{ fontFamily: PIRATA, fontSize: 24, lineHeight: 1, color: PARCH }}>{n}</div></div>
            <div title={`${lost} capturé(s)`} style={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: 50, maxHeight: 32, alignContent: 'center', justifyContent: 'flex-start' }}>
              {Array.from({ length: lost }).map((_, i) => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%,${c1},${c2})`, opacity: 0.85, boxShadow: '0 1px 2px rgba(0,0,0,.4)' }} />)}
            </div>
          </div>)
        })}
      </div>

      {!hud.ready && (<div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: GOLD, fontFamily: PIRATA, fontSize: 22, letterSpacing: '.5px' }}>Chargement du plateau 3D…</div>)}

      {hud.gameOver && hud.draw && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 20, background: 'radial-gradient(circle at 50% 38%, rgba(40,34,22,.6), rgba(8,7,5,.95))', backdropFilter: 'blur(7px)' }}>
          <div style={{ width: 'min(460px,92%)', textAlign: 'center', padding: '40px 32px 30px', background: 'linear-gradient(180deg, rgba(27,20,13,.92), rgba(12,9,7,.96))', border: '1px solid rgba(217,184,112,.4)', borderRadius: 24, boxShadow: '0 30px 90px rgba(0,0,0,.75), 0 0 60px rgba(191,164,106,.2)' }}>
            <div style={{ fontSize: 60, marginBottom: 4, filter: 'drop-shadow(0 0 22px rgba(191,164,106,.6))' }}>⚖️</div>
            <div style={{ fontFamily: PIRATA, fontSize: 'clamp(30px,5vw,46px)', lineHeight: 1.05, color: '#e8cf92', textShadow: '0 0 24px rgba(191,164,106,.5)' }}>Match nul</div>
            <p style={{ color: PARCH, fontSize: 13.5, margin: '12px 0 6px', lineHeight: 1.5 }}>{hud.drawReason}</p>
            <p style={{ color: MUTED, fontSize: 12, margin: '0 0 20px', lineHeight: 1.5 }}>Pirates et Marine se séparent dos à dos — aucun camp n'a pu forcer la décision.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 26, marginBottom: 24 }}>
              {[['Coups', moves.length], ['Prises', Math.max(0, 40 - hud.pir - hud.mar)]].map(([l, v]) => (
                <div key={l}><div style={{ fontFamily: PIRATA, fontSize: 30, color: GOLD, lineHeight: 1 }}>{v}</div><div style={{ fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: MUTED, fontWeight: 700, marginTop: 3 }}>{l}</div></div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={newGame} style={{ appearance: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, padding: '13px 26px', borderRadius: 999, color: '#231703', background: 'linear-gradient(180deg,#e8cf92,#b8924a)', boxShadow: '0 8px 24px rgba(217,184,112,.32)' }}>↻ Rejouer</button>
              <button onClick={() => navigate('/jeux')} style={{ appearance: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: '13px 22px', borderRadius: 999, color: PARCH, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(217,184,112,.22)' }}>Quitter</button>
            </div>
          </div>
        </div>
      )}

      {hud.gameOver && hud.winner && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 20, background: hud.winner === P ? 'radial-gradient(circle at 50% 38%, rgba(120,24,18,.55), rgba(8,5,4,.94))' : 'radial-gradient(circle at 50% 38%, rgba(16,52,92,.55), rgba(5,7,12,.94))', backdropFilter: 'blur(7px)' }}>
          <div style={{ width: 'min(460px,92%)', textAlign: 'center', padding: '40px 32px 30px', background: 'linear-gradient(180deg, rgba(27,20,13,.92), rgba(12,9,7,.96))', border: `1px solid ${hud.winner === P ? 'rgba(224,98,58,.4)' : 'rgba(90,151,214,.4)'}`, borderRadius: 24, boxShadow: `0 30px 90px rgba(0,0,0,.75), 0 0 60px ${hud.winner === P ? 'rgba(200,50,30,.22)' : 'rgba(60,120,200,.22)'}` }}>
            <div style={{ fontSize: 64, marginBottom: 4, filter: `drop-shadow(0 0 24px ${hud.winner === P ? 'rgba(224,98,58,.7)' : 'rgba(90,151,214,.7)'})` }}>{hud.winner === P ? '☠️' : '⚓'}</div>
            <div style={{ fontFamily: PIRATA, fontSize: 'clamp(30px,5vw,46px)', lineHeight: 1.05, color: hud.winner === P ? '#ffb38a' : '#9fd0ff', textShadow: `0 0 26px ${hud.winner === P ? 'rgba(224,98,58,.55)' : 'rgba(90,151,214,.55)'}` }}>{hud.winner === P ? "Les Pirates l'emportent" : 'La Marine triomphe'}</div>
            <p style={{ color: MUTED, fontSize: 13.5, margin: '12px 0 20px', lineHeight: 1.5 }}>{hud.winner === P ? "Le trésor est à toi — la Marine n'a plus aucun coup légal." : "L'ordre est rétabli — les Pirates sont à court de coups."}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 26, marginBottom: 24 }}>
              {[['Coups', moves.length], ['Prises', Math.max(0, 40 - hud.pir - hud.mar)]].map(([l, v]) => (
                <div key={l}><div style={{ fontFamily: PIRATA, fontSize: 30, color: GOLD, lineHeight: 1 }}>{v}</div><div style={{ fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: MUTED, fontWeight: 700, marginTop: 3 }}>{l}</div></div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={newGame} style={{ appearance: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, padding: '13px 26px', borderRadius: 999, color: '#231703', background: `linear-gradient(180deg,#e8cf92,#b8924a)`, boxShadow: '0 8px 24px rgba(217,184,112,.32)' }}>↻ Rejouer</button>
              <button onClick={() => navigate('/jeux')} style={{ appearance: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: '13px 22px', borderRadius: 999, color: PARCH, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(217,184,112,.22)' }}>Quitter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
