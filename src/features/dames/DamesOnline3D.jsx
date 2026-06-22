// ── Dames 3D — En ligne classé (serveur autoritaire + Realtime) ─────────────
// Lobby (rating, matchmaking, leaderboard) + match 3D live. Le client anime de
// façon optimiste puis se resynchronise sur le serveur ; les coups adverses
// arrivent par Realtime. Coups validés par /api/dames (anti-triche).
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { initBoard, generateMoves, applyMove, opp, countPieces, rulesFromVariante, VARIANTES, P, M } from './engine/draughts-engine.js'
import { useReglagesDames } from './hooks/useReglagesDames.js'
import { ensureRating, matchmake, cancelQueue, getMatch, submitMove, resign, subscribeMatch, leaderboard } from './online/damesRanked.js'
import { eloToTier, formatPrime } from '../../lib/dames/damesRank.js'
import DamesFxOverlay from './DamesFxOverlay.jsx'
import DamesPoster from './DamesPoster.jsx'

const GOLD = '#d9b870', PARCH = '#efe6d4', MUTED = '#9a8f7d'
const panel = { width: '100%', maxWidth: 560, background: 'rgba(18,13,8,.72)', border: '1px solid rgba(217,184,112,.16)', borderRadius: 16, padding: 20, textAlign: 'center' }
const primary = { padding: '12px 26px', borderRadius: 999, border: 0, cursor: 'pointer', background: `linear-gradient(180deg,#e8cf92,#b8924a)`, color: '#231703', fontWeight: 700, fontSize: 15, fontFamily: 'inherit' }
const ghost = { padding: '9px 18px', borderRadius: 999, cursor: 'pointer', background: 'rgba(255,255,255,.05)', color: PARCH, border: '1px solid rgba(217,184,112,.2)', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }

export default function DamesOnline3D() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  // Variante choisie par le joueur dans le drawer (défaut 10×10). Sert à la file
  // d'attente : on n'apparie que des joueurs de la même variante. Une fois en
  // match, ce sont les règles DE LA PARTIE (stockées serveur) qui priment.
  const { variante: myVariante = '10x10' } = useReglagesDames()
  const [phase, setPhase] = useState('lobby')          // lobby | searching | playing | finished
  const [confirmResign, setConfirmResign] = useState(false)  // abandon à 2 temps (anti fat-finger)
  const [waited, setWaited] = useState(0)              // secondes d'attente en matchmaking
  const [rating, setRating] = useState(null)
  const [opponent, setOpponent] = useState(null)
  const [result, setResult] = useState(null)           // { winner, myDelta }
  const [board, setBoard] = useState(null)             // pour les compteurs (snapshot)
  const [turn, setTurn] = useState(P)
  const [err, setErr] = useState(null)
  const [lb, setLb] = useState([])
  const [fs, setFs] = useState(false)
  const [view2D, setView2D] = useState(() => { try { return localStorage.getItem('dames_view2d') === '1' } catch (e) { return false } })
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const rdrRef = useRef(null)
  const fxRef = useRef(null)          // couche d'effets premium 2D (combo / promotion / victoire)
  // rules = règles de la PARTIE en cours (dérivées de la variante stockée dans le
  // match côté serveur). Défaut 10×10 tant qu'aucune partie n'est chargée.
  const G = useRef({ matchId: null, myColor: P, board: null, turn: P, ply: 0, legalMoves: [], movableKeys: new Set(), selected: null, locked: false, status: 'active', variante: '10x10', rules: rulesFromVariante('10x10') })
  const unsubRef = useRef(null), pollRef = useRef(0), aliveRef = useRef(true)

  const loadLb = useCallback(() => { leaderboard(30).then(setLb).catch(() => {}) }, [])
  useEffect(() => { aliveRef.current = true; loadLb(); if (isAuthenticated) ensureRating().then(r => { if (aliveRef.current) setRating(r) }).catch(() => {}); return () => { aliveRef.current = false } }, [isAuthenticated, loadLb])
  useEffect(() => { const h = () => setFs(!!document.fullscreenElement); document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h) }, [])
  useEffect(() => {
    if (phase !== 'searching') { setWaited(0); return }
    const t = setInterval(() => setWaited(w => w + 1), 1000)
    return () => clearInterval(t)
  }, [phase])
  const toggleFs = () => { const el = containerRef.current; if (!el) return; if (document.fullscreenElement) document.exitFullscreen?.(); else el.requestFullscreen?.() }

  const drawMarkers = useCallback(() => {
    const g = G.current, rdr = rdrRef.current; if (!rdr) return
    rdr.setMarkers({ selected: g.selected, legalMoves: g.legalMoves, movableKeys: g.movableKeys, interactive: !g.locked && g.status === 'active' && g.turn === g.myColor, gameOver: g.status !== 'active', last: g.last })
  }, [])

  const refreshLocal = useCallback(() => {
    const g = G.current
    g.legalMoves = (g.status === 'active' && g.turn === g.myColor) ? generateMoves(g.board, g.myColor, g.rules) : []
    g.movableKeys = new Set(g.legalMoves.map(m => m.from[0] + '_' + m.from[1]))
    g.selected = null; drawMarkers(); setBoard(g.board.map(r => r.slice())); setTurn(g.turn)
  }, [drawMarkers])

  const resync = useCallback(async () => {
    const g = G.current; const m = await getMatch(g.matchId); if (!m || !aliveRef.current) return
    g.variante = m.variante || '10x10'; g.rules = rulesFromVariante(g.variante)
    g.board = m.board_state; g.turn = m.current_turn; g.ply = m.ply || 0; g.status = m.status; g.locked = false
    rdrRef.current?.setBoard(g.board); refreshLocal()
    if (m.status === 'finished') finish(m)
  }, [refreshLocal])

  const finish = useCallback((m) => {
    const g = G.current; g.status = 'finished'; g.locked = true
    const delta = g.myColor === P ? m.elo_change_pirate : m.elo_change_marine
    setResult({ winner: m.winner, myDelta: typeof delta === 'number' ? delta : null })
    setPhase('finished'); drawMarkers(); loadLb()
    ensureRating().then(r => { if (aliveRef.current) setRating(r) }).catch(() => {})  // ELO à jour pour le palier/bounty
    rdrRef.current?.[m.winner === g.myColor ? 'sfxWin' : 'sfxLose']?.()
    if (m.winner === P || m.winner === M) rdrRef.current?.setWinner?.(m.winner)   // cinématique 3D (orbite + feux d'artifice) pour le camp gagnant
  }, [drawMarkers, loadLb])

  // Coup adverse reçu via Realtime → on l'anime.
  const onRemoteMove = useCallback((row) => {
    const g = G.current
    if (!row || g.status !== 'active') return
    if (row.player === g.myColor) { if (row.ply > g.ply) g.ply = row.ply; return }  // mon propre coup (echo)
    if (row.ply <= g.ply) return
    const before = g.board; const { promoted } = applyMove(before, row.move, g.rules)
    g.last = row.move; g.locked = true
    rdrRef.current?.playMove(row.move, before, { promoted, ai: true }).then(() => {
      g.board = row.board_after; g.turn = g.myColor; g.ply = row.ply; g.locked = false; refreshLocal()
    })
  }, [refreshLocal])

  // Mon coup : valide localement (UX) → anime optimiste → envoie au serveur (autoritaire).
  const playMyMove = useCallback(async (mv) => {
    const g = G.current; g.locked = true; g.selected = null
    const before = g.board; const { board: nb, promoted } = applyMove(before, mv, g.rules)
    g.last = mv
    await rdrRef.current?.playMove(mv, before, { promoted })
    g.board = nb; g.turn = opp(g.myColor); g.ply += 1; refreshLocal()
    const res = await submitMove(g.matchId, mv)
    if (res?.error) { setErr(res.error); setTimeout(() => { if (aliveRef.current) setErr(null) }, 2600); g.locked = true; await resync() }  // rejeté → on se resync sur le serveur
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
      renderer.onCombo = (n) => fxRef.current?.combo(n)        // bandeau « RAFLE ×N » 2D
      renderer.onPromote = (side) => fxRef.current?.promote(side)  // couronnement Dame 2D
      renderer.mount(canvasRef.current, { reducedMotion: reduced })
      const m = await getMatch(G.current.matchId)
      if (!alive || !m) return
      setOpponent(m.opponent || null)
      const g = G.current; g.variante = m.variante || '10x10'; g.rules = rulesFromVariante(g.variante)
      g.board = m.board_state; g.turn = m.current_turn; g.ply = m.ply || 0; g.status = m.status
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
    // Plateau initial DE LA VARIANTE choisie + variante envoyée à la file.
    const startBoard = () => initBoard(rulesFromVariante(myVariante))
    const r = await matchmake(startBoard(), myVariante)
    if (r?.matched) { enterMatch(r.match_id, r.color); return }
    if (r?.ok === false) { setErr(r.error || 'Matchmaking indisponible'); setPhase('lobby'); return }
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const rr = await matchmake(startBoard(), myVariante)
      if (rr?.matched) { clearInterval(pollRef.current); enterMatch(rr.match_id, rr.color) }
    }, 2500)
  }, [isAuthenticated, enterMatch, myVariante])
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
            <span style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,.08)', display: 'grid', placeItems: 'center', fontSize: 11, color: '#fff' }}>{r.avatar ? <img loading="lazy" decoding="async" src={r.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (r.username || '?').slice(0, 2).toUpperCase()}</span>
            <span style={{ flex: 1, color: PARCH, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.username}</span>
            {(() => { const t = eloToTier(r.rating); return (
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.15 }}>
                <span style={{ color: t.color, fontWeight: 800, fontSize: 13 }}>{t.emoji} {formatPrime(t.prime)}</span>
                <span style={{ color: MUTED, fontSize: 10 }}>{r.rating} ELO</span>
              </span>) })()}
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
          {rating ? (() => { const t = eloToTier(rating.rating); return (
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}><span style={{ color: t.color, fontWeight: 800 }}>{t.emoji} {t.label}</span> · <strong style={{ color: GOLD }}>{formatPrime(t.prime)}</strong> · {rating.rating} ELO · {rating.wins}V {rating.losses}D {rating.draws}N</div>
          ) })() : <div style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>Ton ELO : <strong style={{ color: GOLD }}>—</strong></div>}
          {err && <div style={{ color: '#ef8a7c', fontSize: 13, marginBottom: 12 }}>{err}</div>}
          {phase === 'searching'
            ? <div><div style={{ fontSize: 15, color: PARCH, marginBottom: 14 }}>🧭 Recherche d'un adversaire… ({waited}s)</div><button style={ghost} onClick={cancel}>Annuler</button></div>
            : <button style={primary} onClick={search} disabled={!isAuthenticated}>{isAuthenticated ? '⚔️ Trouver une partie' : 'Connecte-toi pour jouer'}</button>}
        </div>
        <Lb />
      </div>
    )
  }

  // playing | finished
  const startMen = (VARIANTES[G.current.variante] || VARIANTES['10x10']).men
  const pir = board ? countPieces(board, P) : startMen, mar = board ? countPieces(board, M) : startMen
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
        <DamesFxOverlay ref={fxRef} winner={result && (result.winner === P || result.winner === M) ? result.winner : null} />
        <button onClick={() => { const v = !view2D; setView2D(v); rdrRef.current?.setView2D(v) }} title={view2D ? 'Vue 3D' : 'Vue 2D (de dessus)'} aria-label="Basculer vue 2D / 3D" aria-pressed={view2D} style={{ position: 'absolute', top: 12, right: 56, width: 38, height: 38, borderRadius: '50%', border: `1px solid ${view2D ? GOLD : 'rgba(217,184,112,.2)'}`, background: view2D ? `linear-gradient(180deg,${GOLD},#b8924a)` : 'rgba(14,10,7,.7)', color: view2D ? '#231703' : MUTED, cursor: 'pointer', fontSize: 15 }}>{view2D ? '🧊' : '🗺️'}</button>
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
                <span style={{ fontFamily: "'Pirata One',cursive", fontWeight: 700, fontSize: 18, color: PARCH }}>{n}</span>
              </div>
            ))}
            {G.current.status === 'active' && <button style={{ ...ghost, padding: '6px 14px', ...(confirmResign ? { background: 'rgba(192,57,43,.25)', color: '#ffd9cf', borderColor: 'rgba(192,57,43,.5)' } : {}) }} onClick={() => { if (confirmResign) { doResign() } else { setConfirmResign(true); setTimeout(() => setConfirmResign(false), 3000) } }}>{confirmResign ? '🏳️ Confirmer ?' : '🏳️ Abandonner'}</button>}
          </div>
        </div>
        {err && phase === 'playing' && (
          <div style={{ position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', background: 'rgba(120,24,18,.9)', color: '#ffd9cf', padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700, zIndex: 5 }}>{err}</div>
        )}
        {phase === 'finished' && result && (() => {
          const after = rating ? eloToTier(rating.rating) : null
          const before = (rating && typeof result.myDelta === 'number') ? eloToTier(rating.rating - result.myDelta) : null
          const promoted = !!(after && before && after.tier !== before.tier && result.myDelta >= 0)
          return (
            <DamesPoster
              result={result.winner === 'draw' ? 'draw' : result.winner}
              myColor={G.current.myColor}
              reason={result.winner === 'draw' ? 'Trêve — aucun camp n\'a forcé la décision.'
                : won ? 'Prime encaissée sur les eaux classées.' : 'Ta tête a une nouvelle valeur.'}
              stats={[['Prises', Math.max(0, startMen * 2 - pir - mar)], ['Pièces', won ? Math.max(pir, mar) : Math.min(pir, mar)]]}
              prime={after ? { text: formatPrime(after.prime), label: after.label, emoji: after.emoji, color: after.color } : null}
              eloDelta={typeof result.myDelta === 'number' ? result.myDelta : null}
              promoted={promoted}
              onRematch={leave}
              onQuit={() => navigate('/jeux')}
              rematchLabel="⚔️ Revanche"
            />
          )
        })()}
      </div>
      <Lb />
    </div>
  )
}
