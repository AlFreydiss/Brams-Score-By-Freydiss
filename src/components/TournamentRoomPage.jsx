import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { TOURNAMENT_CONFIGS } from '../data/tournament-data.js'
import { generateBracket, getCurrentMatch, advanceWinner, getWinner, getTournamentProgress } from '../lib/tournament.js'
import DuelArena from './tournament/DuelArena.jsx'
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
  const [notFound, setNotFound] = useState(false)
  const resolvingRef = useRef(false)
  const autoJoinRef = useRef(false)

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
    if (!r) { setNotFound(true); setRoom(null); return }
    setNotFound(false)
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

  // ── Auto-join : ouvrir un lien ?code= ou entrer un code t'inscrit direct ────
  // (avant : on tombait sur l'écran "Créer/Rejoindre" et on créait une 2e room).
  useEffect(() => {
    if (!room || !code) { autoJoinRef.current = false; return }
    const name = ident.guest ? guestName.trim() : ident.name
    if (!name) return // invité sans pseudo : on attend qu'il en saisisse un
    if (players.some(p => String(p.user_id) === ident.userId)) return
    if (autoJoinRef.current) return
    autoJoinRef.current = true
    joinTournamentRoom({ code, userId: ident.userId, displayName: name, avatarUrl: null })
      .then(() => refresh(code))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, players, code])

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

  function leave() { setParams({}); setCode(''); setRoom(null); setNotFound(false); autoJoinRef.current = false }

  // ── Vues ─────────────────────────────────────────────────────────────────
  const wrap = { position: 'relative', minHeight: '100vh', background: BG, color: '#fff', paddingTop: 84, paddingBottom: 60, fontFamily: "'Inter',system-ui,sans-serif" }
  // zIndex:2 → le contenu reste AU-DESSUS du fond plein écran (PlayingBgOverlay,
  // portail fixe en z1 dans le body) quand on écoute un opening.
  const inner = { position: 'relative', zIndex: 2, width: 'min(1180px, calc(100% - 32px))', margin: '0 auto' }
  const btn = (bg = GRAD) => ({ padding: '12px 22px', borderRadius: 12, border: 'none', background: bg, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' })
  const field = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 11, background: 'rgba(255,255,255,.05)', border: `1px solid ${BORDER}`, color: '#fff', fontSize: 14, fontFamily: 'inherit' }

  // 1) Aucun code → écran créer / rejoindre
  if (!code) {
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

  // 2) Code présent mais salon introuvable
  if (notFound) {
    return (
      <div style={wrap}>
        <div style={{ ...inner, maxWidth: 480, textAlign: 'center', paddingTop: 80 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 8px' }}>Salon introuvable</h2>
          <p style={{ color: 'rgba(255,255,255,.55)', margin: '0 0 22px', fontSize: 14 }}>
            Le code <strong style={{ color: PINK_L }}>{code}</strong> ne correspond à aucun salon (il a peut-être été fermé).
          </p>
          <button onClick={leave} style={btn()}>Créer ou rejoindre un autre salon</button>
        </div>
      </div>
    )
  }

  // 3) Code présent, chargement du salon en cours
  if (!room) {
    return (
      <div style={wrap}>
        <div style={{ ...inner, maxWidth: 480, textAlign: 'center', paddingTop: 90, color: 'rgba(255,255,255,.55)' }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>⏳</div>
          Connexion au salon <strong style={{ color: PINK_L }}>{code}</strong>…
        </div>
      </div>
    )
  }

  // 4) Dans le salon
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
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', justifyContent: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
            {/* Espace symétrique à gauche : compense le panneau de droite → duel parfaitement centré */}
            {!isMobile && <div style={{ width: 248, flexShrink: 0 }} aria-hidden />}
            <div style={{ flex: '1 1 0', minWidth: 0, maxWidth: 900, width: '100%' }}>
              <DuelArena
                key={current.match.id}
                round={current.round}
                match={current.match}
                totalMatchesInRound={current.round.matches.length}
                voteCounts={{ [current.match.id]: { left: leftN, right: rightN } }}
                personalVotes={{ [current.match.id]: myVote }}
                onVote={(side) => { if (amIInRoom && !myVote) vote(side) }}
                onNext={() => {}}
                isLastMatch={false}
                isMobile={isMobile}
                multiplayer
                multiplayerStatus={`${totalV}/${players.length} ont voté · ${myVote ? 'en attente des autres…' : 'à toi de voter !'}`}
              />
            </div>
            <VotersPanel players={players} votes={votes} match={current.match} isMobile={isMobile} />
          </div>
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

// ── Panneau des votants (qui a voté quoi, en temps réel) ───────────────────────
function VotersPanel({ players, votes, match, isMobile }) {
  const voteBy = {}
  for (const v of votes) voteBy[String(v.user_id)] = v.side
  const votedCount = players.filter(p => voteBy[String(p.user_id)]).length
  return (
    <aside style={{
      width: isMobile ? '100%' : 248, flexShrink: 0,
      background: 'rgba(12,13,20,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,.10)', borderRadius: 16, padding: 16,
      boxShadow: '0 12px 40px rgba(0,0,0,.35)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', color: PINK_L, textTransform: 'uppercase' }}>Votes</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>{votedCount}/{players.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {players.map(p => {
          const side = voteBy[String(p.user_id)]
          const choice = side === 'left' ? match.left : side === 'right' ? match.right : null
          const col = choice?.color || PINK_L
          return (
            <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: '#fff',
                background: side ? `${col}33` : 'rgba(255,255,255,.06)',
                border: `1.5px solid ${side ? col : 'rgba(255,255,255,.12)'}`,
              }}>{(p.display_name || '?')[0].toUpperCase()}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.display_name}{p.is_host ? ' 👑' : ''}
                </div>
                <div style={{ fontSize: 10.5, color: side ? col : 'rgba(255,255,255,.32)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {side ? `▸ ${choice?.title || '—'}` : 'en attente…'}
                </div>
              </div>
              <span style={{ flexShrink: 0, fontSize: 13, color: side ? '#34d399' : 'rgba(255,255,255,.25)' }}>{side ? '✓' : '⏳'}</span>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

