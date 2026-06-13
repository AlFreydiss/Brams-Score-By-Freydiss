// ─────────────────────────────────────────────────────────────────────────────
// DamesGame3D — orchestrateur du jeu 3D (Phase 1). Lazy-charge DamesRenderer
// (chunk Three.js), tient l'état de partie dans une ref (zéro setState par frame),
// ne remonte que des événements discrets vers le HUD React (tour, captures, fin).
// Modes : Local 2 joueurs · vs IA (4 niveaux). Rafle max + dames volantes.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, useCallback } from 'react'
import { initBoard, generateMoves, applyMove, countPieces, opp, aiMove, P, M } from './engine/draughts-engine.js'

const GOLD = '#d9b870', PARCH = '#efe6d4', MUTED = '#9a8f7d'
const DIFFS = [['mousse', 'Mousse'], ['marin', 'Marin'], ['capitaine', 'Capitaine'], ['amiral', 'Amiral']]
const seg = (on) => ({
  appearance: 'none', border: 0, background: on ? `linear-gradient(180deg,${GOLD},#b8924a)` : 'transparent',
  color: on ? '#231703' : MUTED, fontFamily: 'inherit', fontWeight: 600, fontSize: 13, letterSpacing: '.3px',
  padding: '8px 15px', borderRadius: 999, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
  boxShadow: on ? '0 4px 14px rgba(217,184,112,.28), inset 0 1px 1px rgba(255,255,255,.4)' : 'none', transition: '.18s',
})
const segWrap = { display: 'flex', background: 'rgba(18,13,8,.72)', border: '1px solid rgba(217,184,112,.16)', borderRadius: 999, padding: 4, gap: 3, backdropFilter: 'blur(10px)' }
const iconBtn = (dis) => ({ appearance: 'none', border: '1px solid rgba(217,184,112,.16)', background: 'rgba(18,13,8,.72)', color: MUTED, width: 40, height: 40, borderRadius: '50%', cursor: dis ? 'not-allowed' : 'pointer', display: 'grid', placeItems: 'center', fontSize: 16, backdropFilter: 'blur(10px)', opacity: dis ? 0.32 : 1 })

export default function DamesGame3D() {
  const canvasRef = useRef(null)
  const rdrRef = useRef(null)
  const G = useRef({ board: null, turn: P, mode: 'local', diff: 'marin', humanSide: P, aiSide: M, legalMoves: [], movableKeys: new Set(), selected: null, inputLocked: false, gameOver: false, history: [] })
  const [hud, setHud] = useState({ turn: P, pir: 20, mar: 20, gameOver: false, winner: null, thinking: false, mode: 'local', diff: 'marin', canUndo: false, ready: false })
  const [muted, setMuted] = useState(false)
  const aiTimer = useRef(0)

  const syncHUD = useCallback(() => {
    const g = G.current
    setHud(h => ({ ...h, turn: g.turn, pir: countPieces(g.board, P), mar: countPieces(g.board, M), gameOver: g.gameOver, mode: g.mode, diff: g.diff, canUndo: g.history.length > 0 }))
  }, [])

  const drawMarkers = useCallback(() => {
    const g = G.current, rdr = rdrRef.current; if (!rdr) return
    const aiTurn = g.mode === 'ai' && g.turn === g.aiSide
    rdr.setMarkers({ selected: g.selected, legalMoves: g.legalMoves, movableKeys: g.movableKeys, interactive: !g.inputLocked && !aiTurn && !g.gameOver, gameOver: g.gameOver })
  }, [])

  const endGame = useCallback((winner) => {
    G.current.gameOver = true; G.current.selected = null
    drawMarkers(); setHud(h => ({ ...h, gameOver: true, winner }))
  }, [drawMarkers])

  const scheduleAI = useCallback(() => {
    const g = G.current
    setHud(h => ({ ...h, thinking: true }))
    aiTimer.current = setTimeout(() => {
      const mv = aiMove(g.board, g.turn, g.diff)
      setHud(h => ({ ...h, thinking: false }))
      if (!mv) { endGame(opp(g.turn)); return }
      doMove(mv)
    }, 360)
  }, [endGame])

  const refreshTurn = useCallback(() => {
    const g = G.current
    g.legalMoves = generateMoves(g.board, g.turn)
    g.movableKeys = new Set(g.legalMoves.map(m => m.from[0] + '_' + m.from[1]))
    g.selected = null; drawMarkers(); syncHUD()
    if (g.legalMoves.length === 0) { endGame(opp(g.turn)); return }
    if (g.mode === 'ai' && g.turn === g.aiSide) scheduleAI()
  }, [drawMarkers, syncHUD, endGame, scheduleAI])

  const doMove = useCallback((mv) => {
    const g = G.current, rdr = rdrRef.current; if (!rdr) return
    g.history.push({ board: g.board.map(row => row.map(c => c ? { ...c } : null)), turn: g.turn })
    g.inputLocked = true; g.selected = null
    const before = g.board; const { board: nb, promoted } = applyMove(g.board, mv)
    rdr.playMove(mv, before, { promoted }).then(() => {
      g.board = nb; g.turn = opp(g.turn); g.inputLocked = false; refreshTurn()
    })
  }, [refreshTurn])

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
    const g = G.current; clearTimeout(aiTimer.current)
    g.board = initBoard(); g.turn = P; g.gameOver = false; g.history = []; g.selected = []; g.selected = null; g.inputLocked = false
    setHud(h => ({ ...h, gameOver: false, winner: null, thinking: false }))
    rdrRef.current?.setBoard(g.board); rdrRef.current?.resetView(); refreshTurn()
  }, [refreshTurn])

  const undo = useCallback(() => {
    const g = G.current; if (g.inputLocked || !g.history.length) return
    let snap = null
    if (g.mode === 'ai') { while (g.history.length) { snap = g.history.pop(); if (snap.turn === g.humanSide) break } }
    else snap = g.history.pop()
    if (!snap) return
    clearTimeout(aiTimer.current)
    g.board = snap.board.map(row => row.map(c => c ? { ...c } : null)); g.turn = snap.turn; g.gameOver = false; g.selected = null
    setHud(h => ({ ...h, gameOver: false, winner: null, thinking: false }))
    rdrRef.current?.setBoard(g.board)
    g.legalMoves = generateMoves(g.board, g.turn); g.movableKeys = new Set(g.legalMoves.map(m => m.from[0] + '_' + m.from[1]))
    drawMarkers(); syncHUD()
  }, [drawMarkers, syncHUD])

  // ── montage du renderer (lazy) ──────────────────────────────────────────────
  useEffect(() => {
    let renderer = null, alive = true
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    import('./render/DamesRenderer.js').then(({ default: DamesRenderer }) => {
      if (!alive || !canvasRef.current) return
      renderer = new DamesRenderer(); rdrRef.current = renderer
      renderer.onSquareClick = (r, c) => handleSquare(r, c)
      renderer.mount(canvasRef.current, { reducedMotion: reduced })
      G.current.board = initBoard()
      renderer.setBoard(G.current.board)
      setHud(h => ({ ...h, ready: true }))
      refreshTurn()
    }).catch(e => console.error('[dames3d] renderer load', e))
    return () => { alive = false; clearTimeout(aiTimer.current); if (renderer) renderer.dispose(); rdrRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setMode = (m) => { G.current.mode = m; setHud(h => ({ ...h, mode: m })); newGame() }
  const setDiff = (d) => { G.current.diff = d; setHud(h => ({ ...h, diff: d })) }
  const toggleMute = () => { const m = !muted; setMuted(m); rdrRef.current?.setMuted(m) }

  const turnColor = hud.turn === P ? '#ef8a7c' : '#82b6e6'
  const turnText = hud.turn === P ? (hud.mode === 'ai' ? 'Pirates — à toi de jouer' : 'Pirates — à vous')
    : (hud.mode === 'ai' ? (hud.thinking ? 'Marine réfléchit…' : 'Marine') : 'Marine — à vous')

  return (
    <div style={{ position: 'relative', width: '100%', height: 'min(74vh, 720px)', minHeight: 460, borderRadius: 18, overflow: 'hidden', background: 'radial-gradient(120% 90% at 50% 12%, #241a10 0%, #150f0a 40%, #0a0807 78%)', border: '1px solid rgba(217,184,112,.16)' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 200px 30px rgba(0,0,0,.6)' }} />

      {/* HUD haut : modes + actions + tour */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center', pointerEvents: 'auto' }}>
          <div style={segWrap}>
            <button style={seg(hud.mode === 'local')} onClick={() => setMode('local')}>👥 Local 2 J</button>
            <button style={seg(hud.mode === 'ai')} onClick={() => setMode('ai')}>⚔️ vs IA</button>
          </div>
          {hud.mode === 'ai' && (
            <div style={segWrap}>{DIFFS.map(([id, lbl]) => <button key={id} style={{ ...seg(hud.diff === id), fontSize: 12, padding: '7px 12px' }} onClick={() => setDiff(id)}>{lbl}</button>)}</div>
          )}
          <button style={iconBtn(false)} title="Nouvelle partie" onClick={newGame}>↻</button>
          <button style={iconBtn(!hud.canUndo)} title="Annuler" onClick={undo} disabled={!hud.canUndo}>↶</button>
          <button style={iconBtn(false)} title="Recentrer" onClick={() => rdrRef.current?.resetView()}>⌖</button>
          <button style={iconBtn(false)} title="Son" onClick={toggleMute}>{muted ? '🔇' : '🔊'}</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(14,10,7,.78)', border: '1px solid rgba(217,184,112,.16)', borderRadius: 999, padding: '9px 18px', backdropFilter: 'blur(12px)', boxShadow: '0 8px 28px rgba(0,0,0,.45)', fontWeight: 700, fontSize: 15, color: turnColor }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: hud.turn === P ? '#c0392b' : '#3f86c8', boxShadow: '0 0 12px currentColor' }} />
          {turnText}
        </div>
      </div>

      {/* HUD bas : compteurs */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 14px 14px', display: 'flex', justifyContent: 'center', gap: 12, pointerEvents: 'none' }}>
        {[['Pirates', hud.pir, '#d9594d', '#5e1110', '☠️'], ['Marine', hud.mar, '#5a97d6', '#0e2444', '⚓']].map(([lbl, n, c1, c2, ic]) => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(14,10,7,.74)', border: '1px solid rgba(217,184,112,.16)', borderRadius: 14, padding: '8px 14px', backdropFilter: 'blur(10px)' }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 14, background: `radial-gradient(circle at 35% 30%,${c1},${c2})` }}>{ic}</span>
            <div><div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED, fontWeight: 700 }}>{lbl}</div><div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 20, lineHeight: 1, color: PARCH }}>{n}</div></div>
          </div>
        ))}
      </div>

      {!hud.ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: GOLD, fontFamily: "'Fraunces', serif", fontSize: 18 }}>Chargement du plateau 3D…</div>
      )}

      {/* Modal victoire */}
      {hud.gameOver && hud.winner && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'radial-gradient(circle at 50% 45%, rgba(10,8,6,.6), rgba(5,4,3,.92))', backdropFilter: 'blur(6px)', zIndex: 20 }}>
          <div style={{ width: 'min(420px,90%)', textAlign: 'center', padding: '34px 30px 28px', background: 'linear-gradient(180deg,#1b140d,#100b07)', border: '1px solid rgba(217,184,112,.16)', borderRadius: 22, boxShadow: '0 30px 80px rgba(0,0,0,.7)' }}>
            <div style={{ fontSize: 46, marginBottom: 8 }}>{hud.winner === P ? '☠️' : '⚓'}</div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 26, color: '#e8cf92', marginBottom: 8 }}>{hud.winner === P ? "Les Pirates l'emportent" : 'La Marine triomphe'}</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 22, lineHeight: 1.5 }}>{hud.winner === P ? "Le trésor est à toi. La Marine n'a plus aucun coup légal." : "L'ordre est rétabli. Les Pirates sont à court de coups."}</p>
            <button onClick={newGame} style={{ appearance: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, padding: '13px 26px', borderRadius: 999, color: '#231703', background: `linear-gradient(180deg,#e8cf92,#b8924a)`, boxShadow: '0 8px 24px rgba(217,184,112,.32)' }}>↻ Nouvelle partie</button>
          </div>
        </div>
      )}
    </div>
  )
}
