// ── Dames multijoueur en ligne classé (étape 5) ─────────────────────────────
// Matchmaking par file + synchro par polling RPC (turn-based → ~1.8s suffit, et
// on évite le client Realtime supabase-js qui peut hanger sur l'auth). ELO/primes
// calculés côté serveur (finish_dames_match).
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import DamesBoard from './DamesBoard.jsx'
import { getInitialBoard, applyMove, getOutcome, materialCount, DEFAULT_RULESET } from '../../lib/dames/damesEngine.js'
import { eloToTier, formatPrime } from '../../lib/dames/damesRank.js'
import { findDamesMatch, cancelDamesQueue, getDamesMatch, submitDamesMove, finishDamesMatch } from '../../lib/dames/damesApi.js'

const GOLD = '#d4a017'
const SIDE = {
  red: { label: 'Pirates', icon: '🏴‍☠️', color: '#e0524a' },
  black: { label: 'Marine', icon: '⚓', color: '#5b78b0' },
}
const panel = { width: '100%', maxWidth: 520, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 20, textAlign: 'center' }
const btnPrimary = { padding: '12px 26px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${GOLD}, #f0c04a)`, color: '#1a1200', fontWeight: 800, fontSize: 15 }
const btnGhost = { padding: '9px 18px', borderRadius: 10, cursor: 'pointer', background: 'rgba(255,255,255,.05)', color: 'rgba(243,234,216,.75)', border: '1px solid rgba(255,255,255,.14)', fontWeight: 700, fontSize: 13 }

export default function DamesOnline() {
  const { isAuthenticated } = useAuth()
  const ruleset = DEFAULT_RULESET
  const [phase, setPhase] = useState('idle')       // idle | searching | playing | finished
  const [matchId, setMatchId] = useState(null)
  const [myColor, setMyColor] = useState(null)
  const [match, setMatch] = useState(null)
  const [lastMove, setLastMove] = useState(null)
  const [err, setErr] = useState(null)
  const pollRef = useRef(null)
  const expectedMovesRef = useRef(0)   // anti-flicker : ignore un snapshot serveur en retard sur mon coup optimiste
  const finishingRef = useRef(false)

  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }

  const board = match?.board_state || null
  const turn = match?.current_turn || 'red'
  const myTurn = phase === 'playing' && turn === myColor

  const enterMatch = useCallback((mid, color) => {
    expectedMovesRef.current = 0
    finishingRef.current = false
    setMatchId(mid); setMyColor(color); setMatch(null); setLastMove(null); setErr(null); setPhase('playing')
  }, [])

  // ── Recherche d'adversaire ──────────────────────────────────────────────────
  const search = useCallback(async () => {
    if (!isAuthenticated) { setErr('Connecte-toi pour jouer en ligne.'); return }
    setErr(null); setPhase('searching')
    const r = await findDamesMatch(ruleset, getInitialBoard(ruleset))
    if (r?.matched) { enterMatch(r.match_id, r.color); return }
    if (r?.ok === false) { setErr(r.error || 'Matchmaking indisponible.'); setPhase('idle'); return }
    stopPoll()
    pollRef.current = setInterval(async () => {
      const rr = await findDamesMatch(ruleset, getInitialBoard(ruleset))
      if (rr?.matched) { stopPoll(); enterMatch(rr.match_id, rr.color) }
    }, 2200)
  }, [isAuthenticated, ruleset, enterMatch])

  const cancelSearch = useCallback(async () => {
    stopPoll(); await cancelDamesQueue().catch(() => {}); setPhase('idle')
  }, [])

  // ── Synchro en partie (coups adverses + fin) ────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || !matchId) return
    let on = true
    const tick = async () => {
      const m = await getDamesMatch(matchId)
      if (!on || !m) return
      if (m.status === 'finished') { setMatch(m); expectedMovesRef.current = m.move_count; setPhase('finished'); stopPoll(); return }
      // N'accepte le plateau serveur que s'il est à jour (≥ mon coup optimiste).
      if (Number(m.move_count) >= expectedMovesRef.current) {
        setMatch(m); expectedMovesRef.current = Number(m.move_count)
      }
    }
    tick()
    stopPoll()
    pollRef.current = setInterval(tick, 1800)
    return () => { on = false; stopPoll() }
  }, [phase, matchId])

  // ── Mon coup ────────────────────────────────────────────────────────────────
  const onMove = useCallback(async (move) => {
    if (!board || !myTurn) return
    const next = myColor === 'red' ? 'black' : 'red'
    const newBoard = applyMove(board, move)
    setLastMove(move)
    expectedMovesRef.current += 1
    setMatch((m) => (m ? { ...m, board_state: newBoard, current_turn: next } : m))   // optimiste
    await submitDamesMove(matchId, newBoard, move, next).catch(() => {})
    // Si l'adversaire ne peut plus jouer → fin de partie (winner renvoyé par le moteur).
    const oc = getOutcome(newBoard, next, ruleset)
    if (oc && !finishingRef.current) {
      finishingRef.current = true
      const r = await finishDamesMatch(matchId, oc === 'draw' ? 'draw' : oc, oc === 'draw' ? 'draw' : 'no_moves').catch(() => null)
      const fresh = await getDamesMatch(matchId).catch(() => null)
      if (fresh) { setMatch(fresh); setPhase('finished'); stopPoll() }
      void r
    }
  }, [board, myTurn, myColor, matchId, ruleset])

  const resign = useCallback(async () => {
    if (phase !== 'playing' || !myColor || finishingRef.current) return
    finishingRef.current = true
    const winner = myColor === 'red' ? 'black' : 'red'
    await finishDamesMatch(matchId, winner, 'resign').catch(() => {})
    const fresh = await getDamesMatch(matchId).catch(() => null)
    if (fresh) { setMatch(fresh); setPhase('finished'); stopPoll() }
  }, [phase, myColor, matchId])

  const leave = useCallback(() => {
    stopPoll(); setPhase('idle'); setMatch(null); setMatchId(null); setMyColor(null); setLastMove(null); finishingRef.current = false
  }, [])

  // Nettoyage : on quitte la file si on s'en va en pleine recherche.
  useEffect(() => () => { stopPoll(); cancelDamesQueue().catch(() => {}) }, [])

  // ── Rendu ─────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div style={panel}>
        <div style={{ fontSize: 38, marginBottom: 8 }}>🌐</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Multijoueur classé</div>
        <p style={{ fontSize: 13, color: 'rgba(243,234,216,.6)', margin: '0 0 16px', lineHeight: 1.5 }}>
          Affronte un vrai nakama. Victoire = ELO + prime ฿ qui montent, défaite = elle dégringole. À toi de devenir Roi des Pirates. 🏴‍☠️
        </p>
        {err && <div style={{ color: '#e0524a', fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <button style={btnPrimary} onClick={search} disabled={!isAuthenticated}>
          {isAuthenticated ? '⚔️ Trouver une partie' : 'Connecte-toi pour jouer'}
        </button>
      </div>
    )
  }

  if (phase === 'searching') {
    return (
      <div style={panel}>
        <div style={{ fontSize: 32, marginBottom: 10, animation: 'spin 1.2s linear infinite' }}>🧭</div>
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Recherche d'un adversaire…</div>
        <p style={{ fontSize: 12.5, color: 'rgba(243,234,216,.5)', margin: '0 0 16px' }}>Tu rejoins la file. Garde l'onglet ouvert.</p>
        <button style={btnGhost} onClick={cancelSearch}>Annuler</button>
      </div>
    )
  }

  // playing | finished
  const mat = board ? materialCount(board) : { red: { man: 0, king: 0 }, black: { man: 0, king: 0 } }
  const opp = match?.opponent || {}
  const myEloChange = myColor === 'red' ? match?.elo_change_red : match?.elo_change_black
  const won = phase === 'finished' && match?.winner === myColor
  const isDraw = phase === 'finished' && match?.winner === 'draw'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      {/* Bandeau adversaire + couleur */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(243,234,216,.75)' }}>
        <span>Tu joues <strong style={{ color: SIDE[myColor]?.color }}>{SIDE[myColor]?.icon} {SIDE[myColor]?.label}</strong></span>
        <span style={{ opacity: .4 }}>·</span>
        <span>vs <strong style={{ color: '#fff' }}>{opp.username || 'Adversaire'}</strong></span>
      </div>

      {/* Bandeau de tour / résultat */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '9px 20px', borderRadius: 999,
        background: phase === 'finished' ? `${(isDraw ? '#888' : SIDE[match.winner]?.color)}22` : 'rgba(255,255,255,.05)',
        border: `1px solid ${phase === 'finished' ? (isDraw ? '#888' : SIDE[match.winner]?.color) : 'rgba(255,255,255,.1)'}66`,
        fontWeight: 800, fontSize: 15,
      }}>
        {phase === 'finished'
          ? (isDraw ? '🤝 Match nul'
              : <span style={{ color: won ? '#3fcf6f' : '#e0524a' }}>{won ? '🏆 Victoire !' : '☠️ Défaite'}{typeof myEloChange === 'number' ? ` · ${myEloChange >= 0 ? '+' : ''}${myEloChange} ELO` : ''}</span>)
          : myTurn
            ? <span style={{ color: SIDE[myColor]?.color }}>{SIDE[myColor]?.icon} À toi de jouer</span>
            : <span style={{ color: 'rgba(243,234,216,.6)' }}>⏳ Tour de l'adversaire…</span>}
      </div>

      <DamesBoard board={board} turn={turn} ruleset={ruleset} onMove={onMove} lastMove={lastMove}
        disabled={phase !== 'playing' || !myTurn} myColor={myColor} />

      <div style={{ display: 'flex', gap: 22, fontSize: 13, color: 'rgba(243,234,216,.6)' }}>
        <span>{SIDE.red.icon} Pirates : <strong style={{ color: '#fff' }}>{mat.red.man + mat.red.king}</strong></span>
        <span>{SIDE.black.icon} Marine : <strong style={{ color: '#fff' }}>{mat.black.man + mat.black.king}</strong></span>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {phase === 'playing'
          ? <button style={btnGhost} onClick={resign}>🏳️ Abandonner</button>
          : <button style={btnPrimary} onClick={leave}>↻ Nouvelle partie</button>}
      </div>
    </div>
  )
}
