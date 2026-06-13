// ── Dames 3D — En ligne classé (serveur autoritaire + Realtime) ─────────────
// Lobby (rating, matchmaking, leaderboard) + match 3D live. Le client anime de
// façon optimiste puis se resynchronise sur le serveur ; les coups adverses
// arrivent par Realtime. Coups validés par /api/dames (anti-triche).
import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { initBoard, generateMoves, applyMove, opp, countPieces, P, M } from './engine/draughts-engine.js'
import { ensureRating, matchmake, cancelQueue, getMatch, submitMove, resign, subscribeMatch, leaderboard } from './online/damesRanked.js'

const GOLD = '#d9b870', PARCH = '#efe6d4', MUTED = '#9a8f7d'
const panel = { width: '100%', maxWidth: 560, background: 'rgba(18,13,8,.72)', border: '1px solid rgba(217,184,112,.16)', borderRadius: 16, padding: 20, textAlign: 'center' }
const primary = { padding: '12px 26px', borderRadius: 999, border: 0, cursor: 'pointer', background: `linear-gradient(180deg,#e8cf92,#b8924a)`, color: '#231703', fontWeight: 700, fontSize: 15, fontFamily: 'inherit' }
const ghost = { padding: '9px 18px', borderRadius: 999, cursor: 'pointer', background: 'rgba(255,255,255,.05)', color: PARCH, border: '1px solid rgba(217,184,112,.2)', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }

export default function DamesOnline3D() {
  const { isAuthenticated } = useAuth()
  const [phase, setPhase] = useState('lobby')          // lobby | searching | playing | finished
  const [rating, setRating] = useState(null)
  const [opponent, setOpponent] = useState(null)
  const [result, setResult] = useState(null)           // { winner, myDelta }
  const [board, setBoard] = useState(null)             // pour les compteurs (snapshot)
  const [turn, setTurn] = useState(P)
  const [err, setErr] = useState(null)
  const [lb, setLb] = useState([])
  const [fs, setFs] = useState(false)
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const rdrRef = useRef(null)
  const G = useRef({ matchId: null, myColor: P, board: null, turn: P, ply: 0, legalMoves: [], movableKeys: new Set(), selected: null, locked: false, status: 'active' })
  const unsubRef = useRef(null), pollRef = useRef(0), aliveRef = useRef(true)

  const loadLb = useCallback(() => { leaderboard(30).then(setLb).catch(() => {}) }, [])
  useEffect(() => { aliveRef.current = true; loadLb(); if (isAuthenticated) ensureRating().then(r => { if (aliveRef.current) setRating(r) }).catch(() => {}); return () => { aliveRef.current = false } }, [isAuthenticated, loadLb])
  useEffect(() => { const h = () => setFs(!!document.fullscreenElement); document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h) }, [])
  const toggleFs = () => { const el = containerRef.current; if (!el) return; if (document.fullscreenElement) document.exitFullscreen?.(); else el.requestFullscreen?.() }

  const drawMarkers = useCallback(() => {
    const g = G.current, rdr = rdrRef.current; if (!rdr) return
    rdr.setMarkers({ selected: g.selected, legalMoves: g.legalMoves, movableKeys: g.movableKeys, interactive: !g.locked && g.status === 'active' && g.turn === g.myColor, gameOver: g.status !== 'active', last: g.last })
  }, [])

  const refreshLocal = useCallback(() => {
    const g = G.current
    g.legalMoves = (g.status === 'active' && g.turn === g.myColor) ? generateMoves(g.board, g.myColor) : []
    g.movableKeys = new Set(g.legalMoves.map(m => m.from[0] + '_' + m.from[1]))
    g.selected = null; drawMarkers(); setBoard(g.board.map(r => r.slice())); setTurn(g.turn)
  }, [drawMarkers])

  const resync = useCallback(async () => {
    const g = G.current; const m = await getMatch(g.matchId); if (!m || !aliveRef.current) return
    g.board = m.board_state; g.turn = m.current_turn; g.ply = m.ply || 0; g.status = m.status; g.locked = false
    rdrRef.current?.setBoard(g.board); refreshLocal()
    if (m.status === 'finished') finish(m)
  }, [refreshLocal])

  const finish = useCallback((m) => {
    const g = G.current; g.status = 'finished'; g.locked = true
    const delta = g.myColor === P ? m.elo_change_pirate : m.elo_change_marine
    setResult({ winner: m.winner, myDelta: typeof delta === 'number' ? delta : null })
    setPhase('finished'); drawMarkers(); loadLb()
  }, [drawMarkers, loadLb])

  // Coup adverse reçu via Realtime → on l'anime.
  const onRemoteMove = useCallback((row) => {
    const g = G.current
    if (!row || g.status !== 'active') return
    if (row.player === g.myColor) { if (row.ply > g.ply) g.ply = row.ply; return }  // mon propre coup (echo)
    if (row.ply <= g.ply) return
    const before = g.board; const { promoted } = applyMove(before, row.move)
    g.last = row.move; g.locked = true
    rdrRef.current?.playMove(row.move, before, { promoted }).then(() => {
      g.board = row.board_after; g.turn = g.myColor; g.ply = row.ply; g.locked = false; refreshLocal()
    })
  }, [refreshLocal])

  // Mon coup : valide localement (UX) → anime optimiste → envoie au serveur (autoritaire).
  const playMyMove = useCallback(async (mv) => {
    const g = G.current; g.locked = true; g.selected = null
    const before = g.board; const { board: nb, promoted } = applyMove(before, mv)
    g.last = mv
    await rdrRef.current?.playMove(mv, before, { promoted })
    g.board = nb; g.turn = opp(g.myColor); g.ply += 1; refreshLocal()
    const res = await submitMove(g.matchId, mv)
    if (res?.error) { setErr(res.error); g.locked = true; await resync() }  // rejeté → on se resync sur le serveur
    else if (res?.status === 'finished') { /* la MAJ Realtime appellera finish ; filet : */ getMatch(g.matchId).then(m => m && finish(m)) }
  }, [refreshLocal, resync, finish])

  const handleSquare = useCallback((r, c) => {
    const g = G.current
    if (g.locked || g.status !== 'active' || g.turn !== g.myColor) return
    const key = r + '_' + c
    if (g.selected) {
      const mv = g.legalMoves.find(m => m.from[0] === g.selected[0] && m.from[1] === g.selected[1] && m.to[0] === r && m.to[1] === c)
      if (mv) { playMyMove(mv); return }
      if (g.movableKeys.has(key)) { g.selected = [r, c]; drawMarkers(); rdrRef.current?.sfxSelect(); return }
      g.selected = null; drawMarkers(); return
    }
    if (g.movableKeys.has(key)) { g.selected = [r, c]; drawMarkers(); rdrRef.current?.sfxSelect() }
  }, [playMyMove, drawMarkers])

  // Entrée en match : monte le renderer + s'abonne + charge l'état.
  const enterMatch = useCallback((matchId, color) => {
    G.current.matchId = matchId; G.current.myColor = color; G.current.last = null; setErr(null); setPhase('playing')
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    let renderer = null, alive = true
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    import('./render/DamesRenderer.js').then(async ({ default: DamesRenderer }) => {
      if (!alive || !canvasRef.current) return
      renderer = new DamesRenderer(); rdrRef.current = renderer
      renderer.onSquareClick = (r, c) => handleSquare(r, c)
      renderer.mount(canvasRef.current, { reducedMotion: reduced })
      const m = await getMatch(G.current.matchId)
      if (!alive || !m) return
      setOpponent(m.opponent || null)
      const g = G.current; g.board = m.board_state; g.turn = m.current_turn; g.ply = m.ply || 0; g.status = m.status
      renderer.setBoard(g.board); refreshLocal()
      if (m.status === 'finished') finish(m)
      unsubRef.current = subscribeMatch(G.current.matchId, { onMove: onRemoteMove, onMatch: (row) => { if (row.status === 'finished') getMatch(G.current.matchId).then(mm => mm && finish(mm)) } })
    }).catch(e => console.error('[dames-online3d]', e))
    return () => { alive = false; if (unsubRef.current) { unsubRef.current(); unsubRef.current = null } if (renderer) renderer.dispose(); rdrRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Reconnexion : au montage, reprendre une partie active.
  useEffect(() => {
    if (!isAuthenticated) return
    getMatch(null).then(m => { if (m && aliveRef.current && m.status === 'active') enterMatch(m.id, m.my_color) }).catch(() => {})
  }, [isAuthenticated, enterMatch])

  const search = useCallback(async () => {
    if (!isAuthenticated) { setErr('Connecte-toi pour jouer en ligne.'); return }
    setErr(null); setPhase('searching')
    const r = await matchmake(initBoard())
    if (r?.matched) { enterMatch(r.match_id, r.color); return }
    if (r?.ok === false) { setErr(r.error || 'Matchmaking indisponible'); setPhase('lobby'); return }
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const rr = await matchmake(initBoard())
      if (rr?.matched) { clearInterval(pollRef.current); enterMatch(rr.match_id, rr.color) }
    }, 2500)
  }, [isAuthenticated, enterMatch])
  const cancel = useCallback(async () => { clearInterval(pollRef.current); await cancelQueue().catch(() => {}); setPhase('lobby') }, [])
  useEffect(() => () => { clearInterval(pollRef.current); cancelQueue().catch(() => {}) }, [])

  const doResign = useCallback(async () => { const g = G.current; if (g.status !== 'active') return; await resign(g.matchId).catch(() => {}); resync() }, [resync])
  const leave = useCallback(() => { setPhase('lobby'); setResult(null); setOpponent(null); G.current.matchId = null }, [])

  // ── Rendu ──────────────────────────────────────────────────────────────────
  const Lb = () => (
    <div style={{ ...panel, maxWidth: 560, marginTop: 16, textAlign: 'left' }}>
      <div style={{ fontWeight: 800, fontSize: 14, color: PARCH, marginBottom: 10 }}>🏆 Classement ELO</div>
      {lb.length === 0 ? <div style={{ color: MUTED, fontSize: 13, textAlign: 'center', padding: 10 }}>Aucune partie classée — sois le premier !</div>
        : lb.map((r, i) => (
          <div key={r.discord_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 9, background: i < 3 ? 'rgba(217,184,112,.06)' : 'transparent' }}>
            <span style={{ width: 20, textAlign: 'center', fontWeight: 900, color: i === 0 ? GOLD : MUTED }}>{i + 1}</span>
            <span style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,.08)', display: 'grid', placeItems: 'center', fontSize: 11, color: '#fff' }}>{r.avatar ? <img src={r.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (r.username || '?').slice(0, 2).toUpperCase()}</span>
            <span style={{ flex: 1, color: PARCH, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.username}</span>
            <span style={{ color: GOLD, fontWeight: 800, fontFamily: "'Fraunces',serif" }}>{r.rating}</span>
          </div>
        ))}
    </div>
  )

  if (phase === 'lobby' || phase === 'searching') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%' }}>
        <div style={panel}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>🌐</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: PARCH, marginBottom: 4 }}>En ligne classé</div>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>Ton ELO : <strong style={{ color: GOLD }}>{rating ? rating.rating : '—'}</strong>{rating ? ` · ${rating.wins}V ${rating.losses}D ${rating.draws}N` : ''}</div>
          {err && <div style={{ color: '#ef8a7c', fontSize: 13, marginBottom: 12 }}>{err}</div>}
          {phase === 'searching'
            ? <div><div style={{ fontSize: 15, color: PARCH, marginBottom: 14 }}>🧭 Recherche d'un adversaire…</div><button style={ghost} onClick={cancel}>Annuler</button></div>
            : <button style={primary} onClick={search} disabled={!isAuthenticated}>{isAuthenticated ? '⚔️ Trouver une partie' : 'Connecte-toi pour jouer'}</button>}
        </div>
        <Lb />
      </div>
    )
  }

  // playing | finished
  const pir = board ? countPieces(board, P) : 20, mar = board ? countPieces(board, M) : 20
  const myTurn = G.current.status === 'active' && turn === G.current.myColor
  const won = result && result.winner === G.current.myColor
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: MUTED }}>
        Tu joues <strong style={{ color: G.current.myColor === P ? '#ef8a7c' : '#82b6e6' }}>{G.current.myColor === P ? '☠️ Pirates' : '⚓ Marine'}</strong>
        <span style={{ opacity: .4 }}>·</span> vs <strong style={{ color: PARCH }}>{opponent?.username || 'Adversaire'}</strong>
      </div>
      <div ref={containerRef} style={{ position: 'relative', width: '100%', height: fs ? '100vh' : 'min(70vh, 680px)', minHeight: 440, borderRadius: fs ? 0 : 18, overflow: 'hidden', background: 'radial-gradient(120% 90% at 50% 12%, #241a10 0%, #150f0a 40%, #0a0807 78%)', border: fs ? 'none' : '1px solid rgba(217,184,112,.16)' }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        <button onClick={toggleFs} title="Plein écran" aria-label="Plein écran" style={{ position: 'absolute', top: 12, right: 12, width: 38, height: 38, borderRadius: '50%', border: '1px solid rgba(217,184,112,.2)', background: 'rgba(14,10,7,.7)', color: MUTED, cursor: 'pointer', fontSize: 15 }}>{fs ? '🗗' : '⛶'}</button>
        <div style={{ position: 'absolute', top: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(14,10,7,.8)', border: '1px solid rgba(217,184,112,.16)', borderRadius: 999, padding: '8px 16px', fontWeight: 700, fontSize: 14, color: myTurn ? '#9fe0a0' : MUTED }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: turn === P ? '#c0392b' : '#3f86c8' }} />
            {G.current.status !== 'active' ? 'Partie terminée' : myTurn ? 'À toi de jouer' : "Tour de l'adversaire…"}
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 10, pointerEvents: 'auto' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {[['☠️', pir, '#5e1110'], ['⚓', mar, '#0e2444']].map(([ic, n, bg]) => (
              <div key={ic} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(14,10,7,.74)', border: '1px solid rgba(217,184,112,.16)', borderRadius: 12, padding: '6px 12px' }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12, background: bg }}>{ic}</span>
                <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 18, color: PARCH }}>{n}</span>
              </div>
            ))}
            {G.current.status === 'active' && <button style={{ ...ghost, padding: '6px 14px' }} onClick={doResign}>🏳️ Abandonner</button>}
          </div>
        </div>
        {phase === 'finished' && result && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'radial-gradient(circle at 50% 45%, rgba(10,8,6,.6), rgba(5,4,3,.92))', backdropFilter: 'blur(6px)' }}>
            <div style={{ ...panel, maxWidth: 380 }}>
              <div style={{ fontSize: 44 }}>{result.winner === 'draw' ? '🤝' : won ? '🏆' : '☠️'}</div>
              <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 24, color: '#e8cf92', margin: '6px 0 6px' }}>{result.winner === 'draw' ? 'Match nul' : won ? 'Victoire !' : 'Défaite'}</h2>
              {typeof result.myDelta === 'number' && <p style={{ color: result.myDelta >= 0 ? '#9fe0a0' : '#ef8a7c', fontWeight: 800, marginBottom: 16 }}>{result.myDelta >= 0 ? '+' : ''}{result.myDelta} ELO</p>}
              <button style={primary} onClick={leave}>↻ Rejouer</button>
            </div>
          </div>
        )}
      </div>
      <Lb />
    </div>
  )
}
