import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { TOURNAMENT_CONFIGS } from '../data/tournament-data.js'
import { generateBracket, getCurrentMatch, advanceWinner, getWinner, getTournamentProgress } from '../lib/tournament.js'
import DuelArena from './tournament/DuelArena.jsx'
import {
  createTournamentRoom, fetchTournamentRoom, joinTournamentRoom,
  fetchTournamentRoomPlayers, fetchTournamentRoomVotes, castTournamentVote,
  updateTournamentRoom, subscribeTournamentRoom, touchTournamentPlayer,
  fetchRecentTournamentRooms,
} from '../lib/tournamentRooms.js'

const BG = '#0a0a0b', PINK = '#9d174d', PURPLE = '#4c1d95', PINK_L = '#f9a8d4'
const GRAD = `linear-gradient(135deg, ${PINK}, ${PURPLE})`
const GRAD_TXT = `linear-gradient(135deg, ${PINK_L} 0%, ${PINK} 48%, ${PURPLE} 100%)`
const CARD = 'rgba(18,14,24,.92)', BORDER = 'rgba(255,255,255,.08)'

const hexA = (c, a) => {
  const n = parseInt(String(c || '#9d174d').replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

const ARENA_KEYFRAMES = `@keyframes troom-pulse{0%,100%{opacity:.5}50%{opacity:1}}`

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
  const [publicRooms, setPublicRooms] = useState([])
  const resolvingRef = useRef(false)
  const autoJoinRef = useRef(false)

  // Salons récents pour la colonne droite (uniquement sur l'accueil du salon).
  useEffect(() => {
    if (code) return
    let ignore = false
    fetchRecentTournamentRooms(6).then(r => { if (!ignore) setPublicRooms(r) })
    return () => { ignore = true }
  }, [code])

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
      .catch(() => { resolvingRef.current = false })
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
  const wrap = { position: 'relative', minHeight: '100vh', background: BG, color: '#fff', paddingTop: 84, paddingBottom: 60, fontFamily: "'Inter',system-ui,sans-serif", overflowX: 'hidden' }
  // zIndex:2 → le contenu reste AU-DESSUS du fond plein écran (PlayingBgOverlay,
  // portail fixe en z1 dans le body) quand on écoute un opening.
  const inner = { position: 'relative', zIndex: 2, width: 'min(1180px, calc(100% - 32px))', margin: '0 auto' }
  const btn = (bg = GRAD) => ({ padding: '12px 22px', borderRadius: 12, border: 'none', background: bg, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' })
  const field = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 11, background: 'rgba(255,255,255,.05)', border: `1px solid ${BORDER}`, color: '#fff', fontSize: 14, fontFamily: 'inherit' }

  // 1) Aucun code → vraie page "Salon de tournoi" (2 colonnes, premium sobre)
  if (!code) {
    const panel = {
      background: 'linear-gradient(165deg, #1a1623, #131019)',
      border: `1px solid ${BORDER}`, borderTop: '1px solid rgba(255,255,255,.10)',
      borderRadius: 18, padding: 22, boxShadow: '0 24px 70px rgba(0,0,0,.4)',
    }
    const TID_META = {
      ost:     { emoji: '🎵', desc: 'Duel musical basé sur les bandes-son les plus marquantes.' },
      opening: { emoji: '🎬', desc: 'Vote opening contre opening jusqu’au champion final.' },
    }
    const stat = (val, lbl) => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '0 18px' }}>
        <span style={{ fontSize: 17, fontWeight: 900, color: PINK_L }}>{val}</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.42)', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }}>{lbl}</span>
      </div>
    )
    const sectionTitle = t => (
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: PINK, boxShadow: `0 0 8px ${PINK}` }} />{t}
      </div>
    )
    const recent = publicRooms.filter(r => r.status !== 'done').slice(0, 5)

    return (
      <div style={wrap}>
        <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `radial-gradient(1000px 560px at 14% -8%, rgba(157,23,77,.13), transparent 60%),
                       radial-gradient(900px 560px at 96% 4%, rgba(76,29,149,.16), transparent 62%)` }} />
        <div style={{ ...inner, maxWidth: 1200 }}>
          <button onClick={() => navigate('/tournoi')} style={{ ...btn('rgba(255,255,255,.06)'), padding: '8px 14px', fontSize: 12, marginBottom: 22 }}>← Tournoi</button>

          {/* HERO compact */}
          <div style={{ marginBottom: 26 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 14, padding: '5px 13px', borderRadius: 999, fontSize: 10.5, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: PINK_L, background: 'rgba(157,23,77,.13)', border: `1px solid ${PINK}44` }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: PINK_L, boxShadow: `0 0 8px ${PINK_L}` }} />Mode multi · temps réel
            </div>
            <h1 style={{ fontSize: 'clamp(30px,4.4vw,46px)', fontWeight: 900, margin: '0 0 10px', letterSpacing: '-.025em', lineHeight: 1.05, background: GRAD_TXT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Crée ton salon de tournoi
            </h1>
            <p style={{ color: 'rgba(255,255,255,.6)', margin: '0 0 18px', fontSize: 15, lineHeight: 1.6, maxWidth: 560 }}>
              Invite tes potes, votez en live, et laissez la majorité couronner le meilleur opening ou OST.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 6px', borderRadius: 12, background: 'rgba(255,255,255,.03)', border: `1px solid ${BORDER}` }}>
              {stat('2', 'Modes')}
              <div style={{ width: 1, height: 26, background: 'rgba(255,255,255,.08)' }} />
              {stat('Live', 'Votes')}
              <div style={{ width: 1, height: 26, background: 'rgba(255,255,255,.08)' }} />
              {stat('Auto', 'Bracket')}
            </div>
          </div>

          {/* GRILLE 2 colonnes */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.15fr 0.85fr', gap: 18, alignItems: 'start' }}>

            {/* ── GAUCHE : créer / rejoindre ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={panel}>
                {sectionTitle('Choisis ton tournoi')}
                {ident.guest && (
                  <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Choisis ton pseudo" style={{ ...field, marginBottom: 14, fontWeight: 700 }} maxLength={20} />
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                  {Object.entries(TOURNAMENT_CONFIGS).map(([id, cfg]) => {
                    const active = tid === id
                    const meta = TID_META[id] || { emoji: '🏆', desc: '' }
                    return (
                      <button key={id} onClick={() => setTid(id)} aria-pressed={active} style={{
                        display: 'flex', flexDirection: 'column', gap: 7, padding: 16, borderRadius: 15, cursor: 'pointer', textAlign: 'left',
                        border: `1px solid ${active ? PINK : BORDER}`,
                        background: active ? 'linear-gradient(160deg, rgba(157,23,77,.20), rgba(76,29,149,.12))' : '#201c2a',
                        boxShadow: active ? '0 10px 30px rgba(157,23,77,.22)' : 'none',
                        transition: 'border-color .18s, background .18s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 24 }}>{meta.emoji}</span>
                          <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${active ? PINK_L : 'rgba(255,255,255,.18)'}`, display: 'grid', placeItems: 'center' }}>
                            {active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: PINK_L }} />}
                          </span>
                        </div>
                        <span style={{ fontSize: 14.5, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{cfg.title || id}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: active ? PINK_L : 'rgba(255,255,255,.4)' }}>{cfg.participants?.length || 0} participants</span>
                        <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,.45)', lineHeight: 1.5 }}>{meta.desc}</span>
                      </button>
                    )
                  })}
                </div>
                <button onClick={handleCreate} disabled={busy || !tid} style={{ ...btn(), width: '100%', padding: 14, fontSize: 15, boxShadow: (busy || !tid) ? 'none' : '0 10px 30px rgba(157,23,77,.3)', opacity: (busy || !tid) ? .55 : 1, cursor: (busy || !tid) ? 'default' : 'pointer' }}>
                  {busy ? '⏳ Création…' : '⚔️  Créer un salon privé'}
                </button>
                <p style={{ textAlign: 'center', fontSize: 11.5, color: 'rgba(255,255,255,.35)', margin: '10px 0 0' }}>Un code sera généré automatiquement.</p>
              </div>

              <form onSubmit={handleJoin} style={panel}>
                {sectionTitle('Tu as déjà un code ?')}
                <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.5)', margin: '-6px 0 14px' }}>Rejoins un salon existant et vote avec les autres.</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="CODE" maxLength={6} autoComplete="off"
                    style={{ ...field, flex: 1, textTransform: 'uppercase', letterSpacing: '.4em', fontWeight: 900, fontSize: 20, textAlign: 'center', padding: 14 }} />
                  <button type="submit" disabled={busy || !joinCode.trim()} style={{ ...btn(), padding: '0 22px', opacity: (busy || !joinCode.trim()) ? .55 : 1 }}>Rejoindre</button>
                </div>
                {err && <p style={{ color: '#f87171', margin: '12px 0 0', fontSize: 12.5 }}>⚠ {err}</p>}
              </form>
            </div>

            {/* ── DROITE : aperçu / explication / salons ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={panel}>
                {sectionTitle('Aperçu du bracket')}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[['Opening A', 'Opening B'], ['Opening C', 'Opening D']].map((pair, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {pair.map((n, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', borderRadius: 9, background: '#201c2a', border: `1px solid ${BORDER}` }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: j === 0 ? PINK : 'rgba(255,255,255,.22)' }} />
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>{n}</span>
                        </div>
                      ))}
                      {i === 0 && <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,.25)' }}>⌄ demi-finale ⌄</div>}
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,.32)', margin: '14px 0 0', lineHeight: 1.5 }}>Le bracket réel apparaîtra ici une fois le salon créé.</p>
              </div>

              <div style={panel}>
                {sectionTitle('Comment ça marche')}
                {[
                  ['Crée un salon', 'Choisis OST ou Opening, un code privé est généré.'],
                  ['Partage le code', 'Tes potes rejoignent en un clic via le code ou le lien.'],
                  ['Votez jusqu’au champion', 'Chaque duel avance à la majorité des votes.'],
                ].map(([t, d], i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i < 2 ? 14 : 0 }}>
                    <span style={{ width: 24, height: 24, flexShrink: 0, borderRadius: 8, background: GRAD, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900 }}>{i + 1}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{t}</div>
                      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.45)', lineHeight: 1.5, marginTop: 2 }}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={panel}>
                {sectionTitle('Salons actifs')}
                {recent.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.35)', margin: 0 }}>Aucun salon public pour le moment.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {recent.map(r => (
                      <button key={r.code} onClick={() => { setJoinCode(r.code); setParams({ code: r.code }); setCode(r.code) }} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                        background: '#201c2a', border: `1px solid ${BORDER}`, color: '#fff',
                      }}>
                        <span style={{ fontSize: 16 }}>{r.tournament_id === 'ost' ? '🎵' : '🎬'}</span>
                        <span style={{ flex: 1, fontWeight: 800, letterSpacing: '.14em', fontSize: 13, color: PINK_L }}>{r.code}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: r.status === 'lobby' ? '#34d399' : 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{r.status === 'lobby' ? 'Ouvert' : 'En cours'}</span>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>→</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
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

        {/* DUEL EN COURS — openings empilés (haut / bas) + sidebar votes */}
        {room.status === 'playing' && current && (
          <div>
            {/* Petit header joli : round + numéro de duel */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '7px 16px', borderRadius: 999, background: 'rgba(157,23,77,.12)', border: `1px solid ${PINK}44` }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: PINK_L, boxShadow: `0 0 8px ${PINK_L}`, animation: 'troom-pulse 2s ease-in-out infinite' }} />
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: PINK_L }}>{current.round.label}</span>
                <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,.15)' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.55)' }}>Duel {current.match.position + 1}/{current.round.matches.length}</span>
              </div>
            </div>
            <style>{ARENA_KEYFRAMES}</style>

            <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', justifyContent: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
              {/* Duel (fond sombre sobre, sans backdrop énergétique) */}
              <div style={{ flex: '1 1 0', minWidth: 0, maxWidth: 760, width: '100%' }}>
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
                  vertical
                  multiplayer
                  multiplayerStatus={`${totalV}/${players.length} ont voté · ${myVote ? 'en attente des autres…' : 'à toi de voter !'}`}
                />
              </div>
              {/* Sidebar : votes + mini-bracket */}
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'column', gap: 14, width: isMobile ? '100%' : 'auto' }}>
                <VotersPanel players={players} votes={votes} match={current.match} isMobile={isMobile} />
                <BracketPanel rounds={rounds} currentId={current.match.id} isMobile={isMobile} />
              </div>
            </div>
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

// ── Mini-bracket du tournoi (parcours vers la finale) ─────────────────────────
function BracketPanel({ rounds, currentId, isMobile }) {
  if (!rounds?.length) return null
  return (
    <aside style={{
      width: isMobile ? '100%' : 248, flexShrink: 0,
      background: 'rgba(12,13,20,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,.10)', borderRadius: 16, padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', color: PINK_L, textTransform: 'uppercase' }}>🏆 Bracket</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>vers la finale</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rounds.map(r => {
          const playable = r.matches.filter(m => m.left && m.right)
          const total = playable.length
          const done = playable.filter(m => m.status === 'closed').length
          const isCurrent = r.matches.some(m => m.id === currentId)
          const allDone = total > 0 && done === total
          const isFinal = r.size === 2
          const pct = total ? Math.round((done / total) * 100) : 0
          const accent = isFinal ? '#d4a017' : PINK
          return (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', borderRadius: 10,
              border: `1px solid ${isCurrent ? accent : 'rgba(255,255,255,.06)'}`,
              background: isCurrent ? hexA(accent, 0.14) : 'rgba(255,255,255,.02)',
              boxShadow: isCurrent ? `0 0 16px ${hexA(accent, 0.22)}` : 'none',
              animation: isCurrent ? 'troom-pulse 2.4s ease-in-out infinite' : 'none',
            }}>
              <span style={{ fontSize: 13, width: 16, textAlign: 'center' }}>{isFinal ? '👑' : allDone ? '✓' : isCurrent ? '⚔️' : '•'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                  <strong style={{ color: isCurrent ? '#fff' : allDone ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.45)', fontWeight: 700 }}>{r.short}</strong>
                  <span style={{ color: allDone ? '#34d399' : 'rgba(255,255,255,.35)', fontWeight: 700 }}>{done}/{total}</span>
                </div>
                <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,.08)', overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: allDone ? '#34d399' : accent, transition: 'width .5s' }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
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

