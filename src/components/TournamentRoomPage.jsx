import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { TOURNAMENT_CONFIGS } from '../data/tournament-data.js'
import { generateBracket, getCurrentMatch, advanceWinner, getWinner, getTournamentProgress } from '../lib/tournament.js'
import OSTDuelCard from './tournament/OSTDuelCard.jsx'
import VSPanel from './tournament/VSPanel.jsx'
import {
  createTournamentRoom, fetchTournamentRoom, joinTournamentRoom,
  fetchTournamentRoomPlayers, fetchTournamentRoomVotes, castTournamentVote,
  updateTournamentRoom, subscribeTournamentRoom, touchTournamentPlayer,
} from '../lib/tournamentRooms.js'

const BG = '#0a0a0b', PINK = '#9d174d', PURPLE = '#4c1d95', PINK_L = '#f9a8d4'
const GRAD = `linear-gradient(135deg, ${PINK}, ${PURPLE})`
const CARD = 'rgba(18,14,24,.92)', BORDER = 'rgba(255,255,255,.08)'

function getIdentity(auth) {
  const id = auth?.discordId || auth?.userId
  if (id) return { userId: String(id), name: auth.displayName || 'Pirate', guest: false }
  let gid = localStorage.getItem('troom_guest_id')
  if (!gid) { gid = 'g_' + Math.random().toString(36).slice(2, 9); localStorage.setItem('troom_guest_id', gid) }
  return { userId: gid, name: localStorage.getItem('troom_guest_name') || '', guest: true }
}

export default function TournamentRoomPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [params, setParams] = useSearchParams()
  const ident = getIdentity(auth)

  const [code, setCode]       = useState(() => (params.get('code') || '').toUpperCase())
  const [room, setRoom]       = useState(null)
  const [players, setPlayers] = useState([])
  const [votes, setVotes]     = useState([])
  const [joinCode, setJoinCode] = useState('')
  const [guestName, setGuestName] = useState(ident.name)
  const [tid, setTid]         = useState('ost')
  const [busy, setBusy]       = useState(false)
  const [err, setErr]         = useState('')
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)
  const resolvingRef = useRef(false)

  useEffect(() => {
    const f = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])

  const rounds  = room?.rounds || null
  const current = rounds ? getCurrentMatch(rounds) : null
  const winner  = rounds ? getWinner(rounds) : null
  const isHost  = room && String(room.host_user_id) === ident.userId
  const myVote  = votes.find(v => String(v.user_id) === ident.userId)?.side || null
  const leftN   = votes.filter(v => v.side === 'left').length
  const rightN  = votes.filter(v => v.side === 'right').length
  const totalV  = leftN + rightN
  const progress = rounds ? getTournamentProgress(rounds) : { done: 0, total: 0, pct: 0 }

  // ── Chargement / refetch ──────────────────────────────────────────────────
  const refresh = useCallback(async (c = code) => {
    if (!c) return
    const r = await fetchTournamentRoom(c)
    setRoom(r)
    setPlayers(await fetchTournamentRoomPlayers(c))
    const cur = r?.rounds ? getCurrentMatch(r.rounds) : null
    setVotes(cur ? await fetchTournamentRoomVotes(c, cur.match.id) : [])
  }, [code])

  useEffect(() => {
    if (!code) return
    refresh(code)
    const unsub = subscribeTournamentRoom(code, () => refresh(code))
    const ping = setInterval(() => touchTournamentPlayer(code, ident.userId), 25000)
    return () => { unsub(); clearInterval(ping) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  // ── Hôte : résout à la majorité quand tout le monde a voté ──────────────────
  useEffect(() => {
    if (!isHost || !current || room?.status !== 'playing') return
    if (players.length === 0 || totalV < players.length) return
    if (resolvingRef.current) return
    resolvingRef.current = true
    const matchId = current.match.id
    const winSide = leftN === rightN ? (Math.random() < 0.5 ? 'left' : 'right') : (leftN > rightN ? 'left' : 'right')
    const winnerId = winSide === 'left' ? current.match.left?.id : current.match.right?.id
    const next = advanceWinner(rounds, matchId, winnerId)
    const nextCur = getCurrentMatch(next)
    updateTournamentRoom(code, {
      rounds: next,
      current_match: nextCur?.match.id || null,
      status: getWinner(next) ? 'done' : 'playing',
    }).then(() => { resolvingRef.current = false; refresh(code) })
  }, [isHost, current, totalV, players.length, leftN, rightN, room?.status, rounds, code, refresh])

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function handleCreate() {
    setErr(''); setBusy(true)
    const name = ident.guest ? guestName.trim() : ident.name
    if (!name) { setErr('Choisis un pseudo'); setBusy(false); return }
    if (ident.guest) localStorage.setItem('troom_guest_name', name)
    const cfg = TOURNAMENT_CONFIGS[tid]
    const { rounds: bracket } = generateBracket(cfg.participants, `room_${Date.now()}`)
    const { code: newCode, error } = await createTournamentRoom({
      hostUserId: ident.userId, displayName: name, avatarUrl: null,
      tournamentId: tid, rounds: bracket,
    })
    setBusy(false)
    if (error) { setErr('Création impossible : ' + error); return }
    setParams({ code: newCode }); setCode(newCode)
  }

  async function handleJoin(e) {
    e?.preventDefault?.()
    setErr(''); setBusy(true)
    const name = ident.guest ? guestName.trim() : ident.name
    const c = joinCode.trim().toUpperCase()
    if (!c) { setErr('Entre un code'); setBusy(false); return }
    if (!name) { setErr('Choisis un pseudo'); setBusy(false); return }
    if (ident.guest) localStorage.setItem('troom_guest_name', name)
    const { error } = await joinTournamentRoom({ code: c, userId: ident.userId, displayName: name, avatarUrl: null })
    setBusy(false)
    if (error) { setErr(error === 'introuvable' ? 'Salon introuvable' : error); return }
    setParams({ code: c }); setCode(c)
  }

  async function ensureJoined() {
    // un joueur qui ouvre directement un lien ?code= doit s'inscrire
    const name = ident.guest ? guestName.trim() : ident.name
    if (!name) return
    await joinTournamentRoom({ code, userId: ident.userId, displayName: name, avatarUrl: null })
    refresh(code)
  }

  function startTournament() {
    const cur = getCurrentMatch(rounds)
    updateTournamentRoom(code, { status: 'playing', current_match: cur?.match.id || null })
  }

  async function vote(side) {
    if (myVote || !current) return
    setVotes(v => [...v, { user_id: ident.userId, side }]) // optimiste
    await castTournamentVote({ code, matchId: current.match.id, userId: ident.userId, side })
  }

  function leave() { setParams({}); setCode(''); setRoom(null) }

  // ── Vues ─────────────────────────────────────────────────────────────────
  const wrap = { minHeight: '100vh', background: BG, color: '#fff', paddingTop: 84, paddingBottom: 60, fontFamily: "'Inter',system-ui,sans-serif" }
  const inner = { width: 'min(960px, calc(100% - 32px))', margin: '0 auto' }
  const btn = (bg = GRAD) => ({ padding: '12px 22px', borderRadius: 12, border: 'none', background: bg, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' })
  const field = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 11, background: 'rgba(255,255,255,.05)', border: `1px solid ${BORDER}`, color: '#fff', fontSize: 14, fontFamily: 'inherit' }

  // 1) Pas de salon → écran créer / rejoindre
  if (!code || !room) {
    return (
      <div style={wrap}>
        <div style={{ ...inner, maxWidth: 560 }}>
          <button onClick={() => navigate('/tournoi')} style={{ ...btn('rgba(255,255,255,.06)'), padding: '8px 14px', fontSize: 12, marginBottom: 20 }}>← Tournoi</button>
          <h1 style={{ fontSize: 30, fontWeight: 900, margin: '0 0 6px', background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Tournoi — Salon en ligne</h1>
          <p style={{ color: 'rgba(255,255,255,.55)', margin: '0 0 26px', fontSize: 14 }}>Crée un salon, partage le code, et votez ensemble les duels en temps réel. Le bracket avance à la majorité.</p>

          {ident.guest && (
            <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Ton pseudo" style={{ ...field, marginBottom: 16 }} maxLength={20} />
          )}

          {/* Créer */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>Créer un salon</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {Object.entries(TOURNAMENT_CONFIGS).map(([id, cfg]) => (
                <button key={id} onClick={() => setTid(id)} style={{
                  flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  border: `1px solid ${tid === id ? PINK : BORDER}`,
                  background: tid === id ? 'rgba(157,23,77,.18)' : 'transparent',
                  color: tid === id ? PINK_L : 'rgba(255,255,255,.6)',
                }}>{cfg.title || id}</button>
              ))}
            </div>
            <button onClick={handleCreate} disabled={busy} style={{ ...btn(), width: '100%', opacity: busy ? .6 : 1 }}>Créer le salon</button>
          </div>

          {/* Rejoindre */}
          <form onSubmit={handleJoin} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>Rejoindre avec un code</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="CODE" maxLength={6}
                style={{ ...field, flex: 1, textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 800, textAlign: 'center' }} />
              <button type="submit" disabled={busy} style={{ ...btn('rgba(255,255,255,.08)'), opacity: busy ? .6 : 1 }}>Rejoindre</button>
            </div>
          </form>

          {err && <p style={{ color: '#f87171', marginTop: 14, fontSize: 13 }}>{err}</p>}
        </div>
      </div>
    )
  }

  // Si on a un code mais qu'on n'est pas encore inscrit comme joueur
  const amIInRoom = players.some(p => String(p.user_id) === ident.userId)

  return (
    <div style={wrap}>
      <div style={inner}>
        {/* Topbar salon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <button onClick={leave} style={{ ...btn('rgba(255,255,255,.06)'), padding: '8px 14px', fontSize: 12 }}>← Quitter</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(157,23,77,.15)', border: `1px solid ${PINK}55`, borderRadius: 10, padding: '8px 14px' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>CODE</span>
            <strong style={{ fontSize: 18, letterSpacing: '.2em', color: PINK_L }}>{code}</strong>
            <button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/tournoi/salon?code=${code}`)}
              style={{ ...btn('rgba(255,255,255,.08)'), padding: '4px 10px', fontSize: 11 }}>Copier le lien</button>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 13, color: 'rgba(255,255,255,.55)' }}>
            👥 {players.length} · {progress.done}/{progress.total} duels
          </div>
        </div>

        {!amIInRoom && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
            <div style={{ marginBottom: 10, fontWeight: 700 }}>Rejoins ce salon pour participer</div>
            {ident.guest && <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Ton pseudo" style={{ ...field, marginBottom: 10 }} maxLength={20} />}
            <button onClick={ensureJoined} style={btn()}>Rejoindre</button>
          </div>
        )}

        {/* LOBBY */}
        {room.status === 'lobby' && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 22 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900 }}>Salle d'attente</h2>
            <p style={{ color: 'rgba(255,255,255,.5)', margin: '0 0 18px', fontSize: 13 }}>
              {room.tournament_id === 'ost' ? 'Best Anime OST' : 'Best Anime Opening'} · {(rounds?.[0]?.matches?.length || 0) * 2} participants
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 22 }}>
              {players.map(p => (
                <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.05)', border: `1px solid ${BORDER}`, borderRadius: 999, padding: '6px 14px 6px 8px' }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: GRAD, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800 }}>{(p.display_name || '?')[0].toUpperCase()}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{p.display_name}{p.is_host && ' 👑'}</span>
                </div>
              ))}
            </div>
            {isHost ? (
              <button onClick={startTournament} style={{ ...btn(), width: '100%' }} disabled={players.length < 1}>Démarrer le tournoi 🏁</button>
            ) : (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.5)', fontSize: 14 }}>En attente que l'hôte démarre…</div>
            )}
          </div>
        )}

        {/* DUEL EN COURS */}
        {room.status === 'playing' && current && (
          <DuelView
            match={current.match} roundLabel={current.round.label}
            myVote={myVote} leftN={leftN} rightN={rightN} totalV={totalV}
            playersCount={players.length} onVote={vote}
            canVote={amIInRoom} isHost={isHost} isMobile={isMobile}
          />
        )}

        {/* FIN */}
        {room.status === 'done' && winner && (
          <div style={{ textAlign: 'center', background: CARD, border: `1px solid ${PINK}55`, borderRadius: 20, padding: '40px 24px' }}>
            <div style={{ fontSize: 13, letterSpacing: '.2em', color: PINK_L, fontWeight: 800, marginBottom: 14 }}>🏆 VAINQUEUR DU SALON</div>
            <img src={`https://img.youtube.com/vi/${winner.ytId}/hqdefault.jpg`} alt="" style={{ width: 220, borderRadius: 14, border: `2px solid ${winner.color || PINK}`, marginBottom: 16 }} />
            <h2 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900 }}>{winner.title}</h2>
            <div style={{ color: 'rgba(255,255,255,.6)' }}>{winner.anime} · {winner.artist}</div>
            <button onClick={leave} style={{ ...btn(), marginTop: 24 }}>Nouveau salon</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Vue d'un duel — réutilise les cartes premium du mode solo (OSTDuelCard) ────
function DuelView({ match, roundLabel, myVote, leftN, rightN, totalV, playersCount, onVote, canVote, isHost, isMobile }) {
  const [playing, setPlaying] = useState(null) // 'left' | 'right' | null : opening écouté
  const total = leftN + rightN
  const pct = side => total ? Math.round(((side === 'left' ? leftN : rightN) / total) * 100) : 0
  const showResult = !!myVote   // une fois ton vote posé, on révèle les barres (comme en solo)
  const playSide = side => setPlaying(p => (p === side ? null : side))
  const watch = p => { if (p?.ytId) window.open(`https://www.youtube.com/watch?v=${p.ytId}`, '_blank', 'noopener') }
  const playingP = playing === 'left' ? match.left : playing === 'right' ? match.right : null

  return (
    <div>
      {/* Lecteur audio caché (YouTube) pour l'opening en cours d'écoute */}
      {playingP?.ytId && (
        <iframe
          key={playingP.ytId}
          title="audio"
          src={`https://www.youtube.com/embed/${playingP.ytId}?autoplay=1`}
          allow="autoplay; encrypted-media"
          style={{ position: 'fixed', width: 1, height: 1, left: -9999, top: -9999, opacity: 0, pointerEvents: 'none', border: 0 }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'stretch', gap: isMobile ? 0 : 12, flexDirection: isMobile ? 'column' : 'row' }}>
        <OSTDuelCard
          participant={match.left} side="left"
          voted={myVote} hasVoted={!!myVote}
          votePercent={pct('left')} voteCount={leftN}
          onVote={() => { if (canVote && !myVote) onVote('left') }}
          onListen={() => playSide('left')} onWatch={() => watch(match.left)}
          isPlaying={playing === 'left'} otherIsPlaying={playing === 'right'}
          showResult={showResult} isMobile={isMobile}
        />
        <VSPanel
          hasVoted={!!myVote} isMobile={isMobile} roundLabel={roundLabel}
          playingColor={playingP?.color} isPlaying={!!playing}
        />
        <OSTDuelCard
          participant={match.right} side="right"
          voted={myVote} hasVoted={!!myVote}
          votePercent={pct('right')} voteCount={rightN}
          onVote={() => { if (canVote && !myVote) onVote('right') }}
          onListen={() => playSide('right')} onWatch={() => watch(match.right)}
          isPlaying={playing === 'right'} otherIsPlaying={playing === 'left'}
          showResult={showResult} isMobile={isMobile}
        />
      </div>

      <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'rgba(255,255,255,.55)' }}>
        {totalV}/{playersCount} ont voté{myVote ? '' : ' · à toi de voter !'}
        {isHost && totalV >= playersCount && playersCount > 0 && ' · résolution…'}
      </div>
    </div>
  )
}
