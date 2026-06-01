import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
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

// Landing "Salon multi-tournoi" — palette resserrée : noir profond + charbon,
// magenta en accent uniquement, glow minimal (pas de RGB, purple quasi absent).
const MAGENTA = '#e0457b', MAGENTA_D = '#b1245a', INK = '#9aa0ad'
const SURFACE = 'linear-gradient(168deg, #16141b 0%, #100f14 100%)'
const SURFACE_FLAT = '#161419'
const HAIR = 'rgba(255,255,255,.07)', HAIR_TOP = 'rgba(255,255,255,.10)'
const CTA = `linear-gradient(135deg, ${MAGENTA}, ${MAGENTA_D})`
const TXT = '#f4f3f6', TXT_MUTED = 'rgba(244,243,246,.55)', TXT_FAINT = 'rgba(244,243,246,.34)'
const ease = [0.22, 0.61, 0.36, 1]

const hexA = (c, a) => {
  const n = parseInt(String(c || '#9d174d').replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

const ARENA_KEYFRAMES = `@keyframes troom-pulse{0%,100%{opacity:.5}50%{opacity:1}}`

// Animations du lobby : pulse live très subtil, halo lent, shimmer des skeletons.
const LOBBY_KEYFRAMES = `
@keyframes tl-livedot{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.25);opacity:1}}
@keyframes tl-livering{0%{transform:scale(.8);opacity:.5}100%{transform:scale(2.4);opacity:0}}
@keyframes tl-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes tl-bar{from{width:0}}
@keyframes tl-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion: reduce){
  *[data-tl-anim]{animation:none!important}
}`

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
  const [isNarrow, setIsNarrow] = useState(typeof window !== 'undefined' && window.innerWidth < 1024)
  const [notFound, setNotFound] = useState(false)
  const [publicRooms, setPublicRooms] = useState([])
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [roomsError, setRoomsError] = useState(false)
  const resolvingRef = useRef(false)
  const autoJoinRef = useRef(false)
  const refreshing = useRef(false)
  const lastRealtimeRef = useRef(0)
  const revealTimerRef = useRef(null)
  useEffect(() => () => clearTimeout(revealTimerRef.current), [])

  // Salons récents pour la section "Salons en direct" (uniquement sur l'accueil).
  const loadRooms = useCallback(() => {
    setRoomsLoading(true); setRoomsError(false)
    return fetchRecentTournamentRooms(8)
      .then(r => setPublicRooms(Array.isArray(r) ? r : []))
      .catch(() => setRoomsError(true))
      .finally(() => setRoomsLoading(false))
  }, [])

  useEffect(() => {
    if (code) return
    let ignore = false
    setRoomsLoading(true); setRoomsError(false)
    fetchRecentTournamentRooms(8)
      .then(r => { if (!ignore) setPublicRooms(Array.isArray(r) ? r : []) })
      .catch(() => { if (!ignore) setRoomsError(true) })
      .finally(() => { if (!ignore) setRoomsLoading(false) })
    return () => { ignore = true }
  }, [code])

  useEffect(() => {
    const f = () => { setIsMobile(window.innerWidth < 768); setIsNarrow(window.innerWidth < 1024) }
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
    if (!c || refreshing.current) return   // anti refresh-en-vol (realtime + poll)
    refreshing.current = true
    try {
      const [r, pl] = await Promise.all([fetchTournamentRoom(c), fetchTournamentRoomPlayers(c)])
      if (!r) { setNotFound(true); setRoom(null); return }
      const cur = r?.rounds ? getCurrentMatch(r.rounds) : null
      const vt = cur ? await fetchTournamentRoomVotes(c, cur.match.id) : []
      setNotFound(false); setRoom(r); setPlayers(pl); setVotes(vt)
    } finally { refreshing.current = false }
  }, [code])

  useEffect(() => {
    if (!code) return
    let stop = false, timer
    refresh(code)
    const unsub = subscribeTournamentRoom(code, () => { lastRealtimeRef.current = Date.now(); refresh(code) })
    // Polling de secours ADAPTATIF : pause en arrière-plan, ralentit quand le
    // realtime délivre, rapide sinon → live sans recharger, coût réseau maîtrisé.
    const tick = () => {
      if (stop) return
      const recentRT = Date.now() - lastRealtimeRef.current < 20000
      const delay = document.hidden ? 30000 : recentRT ? 12000 : 3000
      timer = setTimeout(async () => { await refresh(code); tick() }, delay)
    }
    tick()
    const ping = setInterval(() => touchTournamentPlayer(code, ident.userId), 25000)
    return () => { stop = true; clearTimeout(timer); unsub(); clearInterval(ping) }
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
    const done = getWinner(next)
    // Phase 1 — RÉVÉLATION : on reste sur le duel résolu (status 'reveal') ~2,4s
    // pour montrer le gagnant au centre, PUIS on enchaîne direct sur le duel suivant.
    updateTournamentRoom(code, { rounds: next, current_match: matchId, status: 'reveal' })
      .then(() => {
        refresh(code)
        clearTimeout(revealTimerRef.current)
        revealTimerRef.current = setTimeout(() => {
          updateTournamentRoom(code, { current_match: nextCur?.match.id || null, status: done ? 'done' : 'playing' })
            .then(() => { resolvingRef.current = false; refresh(code) })
            .catch(() => { resolvingRef.current = false })
        }, 2400)
      })
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

  // 1) Aucun code → lobby premium "Salon multi-tournoi"
  if (!code) {
    const recent = publicRooms.filter(r => r.status !== 'done')
    const liveCount = recent.length
    const openRoom = (c) => { setErr(''); setJoinCode(c); setParams({ code: c }); setCode(c) }

    const fadeUp = {
      hidden: { opacity: 0, y: 14 },
      show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.05 * i, ease } }),
    }
    const card = {
      background: SURFACE, border: `1px solid ${HAIR}`, borderTop: `1px solid ${HAIR_TOP}`,
      borderRadius: 18, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,.38)',
    }
    const label = (t) => (
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: TXT_FAINT, marginBottom: 14 }}>{t}</div>
    )

    return (
      <div style={wrap}>
        <style>{LOBBY_KEYFRAMES}</style>
        {/* Fond : halo magenta unique, très diffus, charbon en bas. Pas de RGB. */}
        <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `radial-gradient(1100px 620px at 78% -10%, rgba(224,69,123,.10), transparent 58%),
                       radial-gradient(900px 500px at 8% 2%, rgba(224,69,123,.05), transparent 60%),
                       linear-gradient(180deg, transparent 60%, rgba(0,0,0,.5))` }} />

        <div style={{ ...inner, maxWidth: 1180 }}>
          {/* Retour — discret, intégré */}
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
            onClick={() => navigate('/tournoi')}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = TXT }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TXT_MUTED }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 13px 7px 10px', marginBottom: 24,
              borderRadius: 10, border: `1px solid ${HAIR}`, background: 'transparent', color: TXT_MUTED,
              fontSize: 12.5, fontWeight: 700, cursor: 'pointer', transition: 'background .18s, color .18s', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>←</span> Tournoi
          </motion.button>

          {/* ════ HERO ════ */}
          <motion.div initial="hidden" animate="show"
            style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1.05fr 0.95fr', gap: isNarrow ? 28 : 36, alignItems: 'center', marginBottom: 40 }}>

            {/* Gauche : accroche */}
            <div>
              <motion.div custom={0} variants={fadeUp}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginBottom: 18, padding: '6px 14px', borderRadius: 999,
                  fontSize: 10.5, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: PINK_L,
                  background: 'rgba(224,69,123,.10)', border: `1px solid rgba(224,69,123,.28)` }}>
                <LiveDot />Mode multi · temps réel
              </motion.div>

              <motion.h1 custom={1} variants={fadeUp}
                style={{ fontSize: 'clamp(32px,4.8vw,52px)', fontWeight: 900, margin: '0 0 16px', letterSpacing: '-.03em', lineHeight: 1.04, color: TXT }}>
                Crée ton salon<br /><span style={{ background: `linear-gradient(100deg, ${MAGENTA}, ${PINK_L})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>multi-tournoi</span>
              </motion.h1>

              <motion.p custom={2} variants={fadeUp}
                style={{ color: TXT_MUTED, margin: '0 0 26px', fontSize: 16, lineHeight: 1.6, maxWidth: 480 }}>
                Invite tes potes, choisis ton mode, votez en direct et laissez le bracket couronner le meilleur opening ou OST.
              </motion.p>

              <motion.div custom={3} variants={fadeUp} style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {[['🏆', 'Bracket automatique'], ['⚡', 'Vote en direct'], ['🔗', 'Partage instantané']].map(([ic, t]) => (
                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 11,
                    background: SURFACE_FLAT, border: `1px solid ${HAIR}`, fontSize: 12.5, fontWeight: 700, color: 'rgba(244,243,246,.7)' }}>
                    <span style={{ fontSize: 14 }}>{ic}</span>{t}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Droite : preview live du salon (fictif, illustratif) */}
            <motion.div custom={2} variants={fadeUp}>
              <LobbyPreview tid={tid} />
            </motion.div>
          </motion.div>

          {/* ════ ZONE D'ACTION ════ */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 18, alignItems: 'stretch', marginBottom: 42 }}>

            {/* Créer un salon — action primaire */}
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease }}
              style={{ ...card, display: 'flex', flexDirection: 'column' }}>
              {label('Créer un salon')}
              {ident.guest && (
                <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Choisis ton pseudo"
                  style={{ ...field, marginBottom: 14, fontWeight: 700 }} maxLength={20} />
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                {Object.entries(TOURNAMENT_CONFIGS).map(([id, c]) => (
                  <ModeCard key={id} id={id} cfg={c} active={tid === id} onSelect={() => setTid(id)} />
                ))}
              </div>
              <button onClick={handleCreate} disabled={busy} aria-busy={busy}
                onMouseEnter={e => { if (!busy) e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
                style={{ ...btn(CTA), width: '100%', padding: 15, fontSize: 15, marginTop: 'auto',
                  boxShadow: busy ? 'none' : '0 10px 28px rgba(224,69,123,.28)', opacity: busy ? .6 : 1,
                  cursor: busy ? 'default' : 'pointer', transition: 'transform .15s, opacity .15s' }}>
                {busy ? '⏳ Création…' : 'Créer un salon'}
              </button>
              <p style={{ textAlign: 'center', fontSize: 11.5, color: TXT_FAINT, margin: '11px 0 0' }}>
                Un code privé est généré automatiquement.
              </p>
            </motion.div>

            {/* Rejoindre avec un code — action secondaire */}
            <motion.form onSubmit={handleJoin} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.06, ease }}
              style={{ ...card, background: SURFACE_FLAT, display: 'flex', flexDirection: 'column' }}>
              {label('Rejoindre avec un code')}
              <p style={{ fontSize: 12.5, color: TXT_MUTED, margin: '-4px 0 16px', lineHeight: 1.5 }}>
                Tes potes t'ont envoyé un code ? Entre-le pour voter avec eux.
              </p>
              <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="CODE" maxLength={6} autoComplete="off" aria-label="Code du salon"
                style={{ ...field, textTransform: 'uppercase', letterSpacing: '.4em', fontWeight: 900, fontSize: 22, textAlign: 'center', padding: 15, marginBottom: 12 }} />
              <button type="submit" disabled={busy || !joinCode.trim()}
                style={{ ...btn('rgba(255,255,255,.07)'), width: '100%', padding: 13, fontSize: 14, border: `1px solid ${HAIR_TOP}`,
                  opacity: (busy || !joinCode.trim()) ? .5 : 1, cursor: (busy || !joinCode.trim()) ? 'default' : 'pointer' }}>
                Rejoindre
              </button>
              {err && <p role="alert" style={{ color: '#f3849b', margin: '12px 0 0', fontSize: 12.5, textAlign: 'center' }}>⚠ {err}</p>}
            </motion.form>
          </div>

        </div>
      </div>
    )
  }

  // 2) Code présent mais salon introuvable — état erreur propre
  if (notFound) {
    return (
      <div style={wrap}>
        <style>{LOBBY_KEYFRAMES}</style>
        <motion.div role="alert" aria-live="assertive" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease }}
          style={{ ...inner, maxWidth: 440, textAlign: 'center', paddingTop: 90 }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 18px', borderRadius: 18, display: 'grid', placeItems: 'center', fontSize: 28,
            background: SURFACE_FLAT, border: `1px solid ${HAIR}` }}>🔍</div>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 8px', color: TXT }}>Salon introuvable</h2>
          <p style={{ color: TXT_MUTED, margin: '0 0 24px', fontSize: 14, lineHeight: 1.55 }}>
            Le code <strong style={{ color: PINK_L, letterSpacing: '.1em' }}>{code}</strong> ne correspond à aucun salon — il a peut-être été fermé.
          </p>
          <button onClick={leave} style={{ ...btn(CTA), boxShadow: '0 10px 28px rgba(224,69,123,.26)' }}>Créer ou rejoindre un salon</button>
        </motion.div>
      </div>
    )
  }

  // 3) Code présent, chargement du salon en cours — état loading propre
  if (!room) {
    return (
      <div style={wrap}>
        <style>{LOBBY_KEYFRAMES}</style>
        <div style={{ ...inner, maxWidth: 440, textAlign: 'center', paddingTop: 100 }}>
          <span data-tl-anim style={{ display: 'inline-block', width: 34, height: 34, marginBottom: 16, borderRadius: '50%',
            border: `3px solid ${HAIR_TOP}`, borderTopColor: MAGENTA, animation: 'tl-spin .8s linear infinite' }} />
          <div style={{ color: TXT_MUTED, fontSize: 14 }}>
            Connexion au salon <strong style={{ color: PINK_L, letterSpacing: '.1em' }}>{code}</strong>…
          </div>
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

        {/* RÉVÉLATION DU GAGNANT — affiché au centre entre deux duels */}
        {room.status === 'reveal' && (() => {
          let rm = null
          for (const r of (rounds || [])) for (const m of (r.matches || [])) if (m.id === room.current_match) rm = m
          const w = rm && rm.winnerId ? (rm.left?.id === rm.winnerId ? rm.left : rm.right) : null
          return <WinnerReveal winner={w} />
        })()}

        {/* DUEL EN COURS — openings empilés (haut / bas) + sidebar votes */}
        {room.status === 'playing' && current && (
          <div>
            {/* Fond persistant : collage flouté des 2 openings du duel → remplit toute
                la page (fini la zone noire à droite), même quand aucun ne joue. */}
            <DuelAmbient left={current.match.left} right={current.match.right} />
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
              {/* Duel agrandi (cartes taille desktop, empilées) */}
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
                  vertical
                  multiplayer
                  multiplayerStatus={null}
                />
              </div>
              {/* Sidebar : votes + mini-bracket */}
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'column', gap: 14, width: isMobile ? '100%' : 'auto' }}>
                <VotersPanel players={players} votes={votes} match={current.match} isMobile={isMobile}
                  voteStatus={`${totalV}/${players.length} ont voté · ${myVote ? 'en attente des autres…' : 'à toi de voter !'}`} />
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

// ── Révélation du gagnant d'un duel (centré, entre deux duels) ────────────────
function WinnerReveal({ winner }) {
  if (!winner) return null
  const col = winner.color || PINK
  const ytOk = winner.ytId && !String(winner.ytId).startsWith('similar')
  return (
    <>
      <DuelAmbient left={winner} right={winner} />
      {/* Conteneur plein écran qui centre parfaitement le vainqueur au milieu */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px', pointerEvents: 'none' }}>
        <motion.div initial={{ opacity: 0, scale: 0.94, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          style={{ width: '100%', maxWidth: 470, textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '6px 16px', borderRadius: 999, marginBottom: 18,
                     background: hexA(col, 0.16), border: `1px solid ${hexA(col, 0.5)}`, boxShadow: `0 0 26px ${hexA(col, 0.3)}` }}>
            <span style={{ fontSize: 13 }}>🏆</span>
            <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '.22em', color: '#fff' }}>VAINQUEUR DU DUEL</span>
          </motion.div>
          {ytOk && (
            <motion.img initial={{ scale: 1.04 }} animate={{ scale: 1 }} transition={{ duration: 0.5, ease }}
              src={`https://img.youtube.com/vi/${winner.ytId}/hqdefault.jpg`} alt=""
              style={{ display: 'block', width: '100%', maxWidth: 430, margin: '0 auto', borderRadius: 18, border: `2px solid ${col}`, boxShadow: `0 28px 80px ${hexA(col, 0.5)}, 0 0 0 6px ${hexA(col, 0.08)}` }} />
          )}
          <h2 style={{ margin: '20px 0 5px', fontSize: 'clamp(26px,4.4vw,36px)', fontWeight: 900, letterSpacing: '-.02em', color: '#fff', textShadow: '0 4px 28px rgba(0,0,0,.6)' }}>{winner.title}</h2>
          <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 14.5, fontWeight: 600 }}>{winner.anime}{winner.artist ? ` · ${winner.artist}` : ''}</div>
          <div style={{ marginTop: 16, fontSize: 11.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: TXT_FAINT }}>Duel suivant…</div>
        </motion.div>
      </div>
    </>
  )
}

// ── Ambiance de fond : collage flouté des 2 openings (quand aucun ne joue) ────
function DuelAmbient({ left, right }) {
  // Deux moitiés plein écran (haut/bas) qui se rejoignent au centre : le fond de
  // l'opening remplit TOUTE la fenêtre, bord à bord — fini la zone noire à droite.
  const tile = (p, pos) => p?.ytId ? (
    <img src={`https://img.youtube.com/vi/${p.ytId}/hqdefault.jpg`} alt="" style={{
      position: 'absolute', left: '-4%', right: '-4%', width: '108%', height: '52%', objectFit: 'cover',
      filter: 'blur(26px) saturate(1.3) brightness(.74)', opacity: 0.62, ...pos,
    }} />
  ) : null
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {tile(left, { top: 0 })}
      {tile(right, { bottom: 0 })}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(72% 44% at 50% 0%, ${hexA(left?.color, 0.2)}, transparent 70%), radial-gradient(72% 44% at 50% 100%, ${hexA(right?.color, 0.2)}, transparent 70%), linear-gradient(180deg, rgba(8,7,11,.48), rgba(8,7,11,.42) 50%, rgba(8,7,11,.66)), radial-gradient(60% 50% at 50% 50%, rgba(8,7,11,.34), transparent 75%)` }} />
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
function VotersPanel({ players, votes, match, isMobile, voteStatus }) {
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: voteStatus ? 8 : 14 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', color: PINK_L, textTransform: 'uppercase' }}>Votes</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>{votedCount}/{players.length}</span>
      </div>
      {voteStatus && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', textAlign: 'center', padding: '6px 8px', marginBottom: 12, borderRadius: 8, background: 'rgba(255,255,255,.04)', border: `1px solid rgba(255,255,255,.07)` }}>{voteStatus}</div>
      )}
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

// ════════════════ Lobby premium — composants ════════════════

const TID_META = {
  ost:     { emoji: '🎵', tag: 'OST', desc: 'Duel musical sur les bandes-son les plus marquantes.' },
  opening: { emoji: '🎬', tag: 'Opening', desc: 'Opening contre opening jusqu’au champion.' },
}
const tidEmoji = (id) => TID_META[id]?.emoji || '🏆'

// Point "live" : pastille magenta avec halo qui pulse, très subtil.
function LiveDot({ size = 6 }) {
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-block', flexShrink: 0 }}>
      <span data-tl-anim style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: MAGENTA, animation: 'tl-livering 2.4s ease-out infinite' }} />
      <span data-tl-anim style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: PINK_L, animation: 'tl-livedot 2.4s ease-in-out infinite' }} />
    </span>
  )
}

// Carte de sélection de mode (OST / Opening) — hover premium, transition douce.
function ModeCard({ id, cfg, active, onSelect }) {
  const [hover, setHover] = useState(false)
  const meta = TID_META[id] || { emoji: '🏆', desc: '' }
  return (
    <button onClick={onSelect} aria-pressed={active} type="button"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8, padding: 15, borderRadius: 14, cursor: 'pointer', textAlign: 'left',
        border: `1px solid ${active ? MAGENTA : (hover ? HAIR_TOP : HAIR)}`,
        background: active ? 'rgba(224,69,123,.10)' : SURFACE_FLAT,
        boxShadow: active ? '0 8px 24px rgba(224,69,123,.16)' : 'none',
        transform: hover && !active ? 'translateY(-1px)' : 'none',
        transition: 'border-color .18s, background .18s, transform .15s, box-shadow .18s', fontFamily: 'inherit',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 22 }}>{meta.emoji}</span>
        <span style={{ width: 17, height: 17, borderRadius: '50%', border: `2px solid ${active ? MAGENTA : 'rgba(255,255,255,.20)'}`, display: 'grid', placeItems: 'center', transition: 'border-color .18s' }}>
          {active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: MAGENTA }} />}
        </span>
      </div>
      <span style={{ fontSize: 14, fontWeight: 800, color: TXT, lineHeight: 1.2 }}>{cfg.title || id}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: active ? PINK_L : TXT_FAINT }}>{cfg.participants?.length || 0} participants</span>
      <span style={{ fontSize: 11.5, color: TXT_MUTED, lineHeight: 1.5 }}>{meta.desc}</span>
    </button>
  )
}

// Aperçu fictif d'un salon live (illustratif) — réagit au mode choisi.
function LobbyPreview({ tid }) {
  const cfg = TOURNAMENT_CONFIGS[tid] || {}
  const parts = cfg.participants || []
  const left = parts[0] || { title: 'Gurenge', anime: 'Demon Slayer' }
  const right = parts[1] || { title: 'Unravel', anime: 'Tokyo Ghoul' }
  const voters = ['Kaito', 'Mira', 'Sora', 'Reki', 'Yuna']
  const votedSides = ['left', 'right', 'left', 'left', null] // 4/5 ont voté, 3-1
  const leftN = votedSides.filter(s => s === 'left').length
  const rightN = votedSides.filter(s => s === 'right').length
  const total = leftN + rightN
  const leftPct = total ? Math.round((leftN / total) * 100) : 50

  const row = (name, side, i) => (
    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 10.5, fontWeight: 800, color: '#fff',
        background: side ? 'rgba(224,69,123,.18)' : 'rgba(255,255,255,.06)', border: `1.5px solid ${side ? 'rgba(224,69,123,.5)' : 'rgba(255,255,255,.12)'}` }}>
        {name[0]}
      </span>
      <span style={{ flex: 1, fontSize: 12, color: 'rgba(244,243,246,.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}{i === 0 ? ' 👑' : ''}</span>
      <span style={{ fontSize: 12, color: side ? '#34d399' : TXT_FAINT }}>{side ? '✓' : '⋯'}</span>
    </div>
  )

  return (
    <motion.div key={tid} initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease }}
      style={{ background: SURFACE, border: `1px solid ${HAIR}`, borderTop: `1px solid ${HAIR_TOP}`, borderRadius: 20, padding: 18,
        boxShadow: '0 28px 70px rgba(0,0,0,.45)' }}>
      {/* En-tête salon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 18 }}>{tidEmoji(tid)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: TXT, lineHeight: 1.1 }}>{cfg.title || 'Tournoi'}</div>
          <div style={{ fontSize: 10.5, color: TXT_FAINT, letterSpacing: '.18em', fontWeight: 700 }}>SALON · BRAMS42</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', color: PINK_L,
          padding: '4px 9px', borderRadius: 999, background: 'rgba(224,69,123,.12)', border: '1px solid rgba(224,69,123,.3)' }}>
          <LiveDot size={5} />LIVE
        </span>
      </div>

      {/* Duel en cours */}
      <div style={{ background: SURFACE_FLAT, border: `1px solid ${HAIR}`, borderRadius: 13, padding: 13, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: TXT_FAINT, marginBottom: 9 }}>
          <span>Vote en cours</span><span style={{ color: PINK_L }}>{total}/5</span>
        </div>
        {[[left, leftN, true], [right, rightN, false]].map(([t, n, lead], i) => (
          <div key={i} style={{ marginBottom: i === 0 ? 8 : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: lead ? TXT : 'rgba(244,243,246,.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '75%' }}>{t.title}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: lead ? PINK_L : TXT_FAINT }}>{n}</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
              <div data-tl-anim style={{ height: '100%', borderRadius: 99, width: `${i === 0 ? leftPct : 100 - leftPct}%`,
                background: lead ? CTA : 'rgba(255,255,255,.18)', animation: 'tl-bar .8s ease', transition: 'width .5s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Participants + mini bracket */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {voters.map((n, i) => row(n, votedSides[i], i))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 12, borderTop: `1px solid ${HAIR}` }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: TXT_FAINT, marginRight: 4 }}>Bracket</span>
        {['8e', '4e', '½', 'F'].map((r, i) => (
          <span key={r} style={{ flex: 1, height: 4, borderRadius: 99, background: i === 0 ? CTA : (i === 1 ? 'rgba(224,69,123,.4)' : 'rgba(255,255,255,.08)') }} />
        ))}
        <span style={{ fontSize: 11 }}>👑</span>
      </div>
    </motion.div>
  )
}

// Statuts d'un salon — tous les états prévus (data réelle = lobby/playing).
const ROOM_STATUS = {
  lobby:   { label: 'Ouvert',    color: '#46c08a', live: false, joinable: true },
  playing: { label: 'En cours',  color: MAGENTA,   live: true,  joinable: true },
  full:    { label: 'Complet',   color: TXT_FAINT, live: false, joinable: false },
  private: { label: 'Privé',     color: '#d6a23e', live: false, joinable: true },
  done:    { label: 'Terminé',   color: TXT_FAINT, live: false, joinable: false },
}

function LiveRoomCard({ room, onOpen }) {
  const [hover, setHover] = useState(false)
  const meta = ROOM_STATUS[room.status] || ROOM_STATUS.lobby
  const disabled = meta.joinable === false
  return (
    <button type="button" disabled={disabled} onClick={() => !disabled && onOpen(room.code)}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, textAlign: 'left', width: '100%',
        background: SURFACE_FLAT, border: `1px solid ${hover && !disabled ? HAIR_TOP : HAIR}`, color: TXT,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .6 : 1,
        transform: hover && !disabled ? 'translateY(-2px)' : 'none',
        boxShadow: hover && !disabled ? '0 12px 30px rgba(0,0,0,.32)' : 'none',
        transition: 'transform .16s, border-color .16s, box-shadow .16s', fontFamily: 'inherit',
      }}>
      <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 11, display: 'grid', placeItems: 'center', fontSize: 18,
        background: 'rgba(255,255,255,.04)', border: `1px solid ${HAIR}` }}>{tidEmoji(room.tournament_id)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 900, letterSpacing: '.16em', fontSize: 14, color: PINK_L }}>{room.code}</div>
        <div style={{ fontSize: 11, color: TXT_FAINT, marginTop: 1 }}>{room.tournament_id === 'ost' ? 'Best Anime OST' : 'Best Anime Opening'}</div>
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase',
        color: meta.color, padding: '4px 9px', borderRadius: 999, background: 'rgba(255,255,255,.04)', border: `1px solid ${HAIR}` }}>
        {meta.live ? <LiveDot size={5} /> : <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.color }} />}
        {meta.label}
      </span>
    </button>
  )
}

function RoomSkeleton() {
  const shimmer = {
    background: 'linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.09) 37%, rgba(255,255,255,.04) 63%)',
    backgroundSize: '200% 100%', animation: 'tl-shimmer 1.4s ease-in-out infinite',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, background: SURFACE_FLAT, border: `1px solid ${HAIR}` }}>
      <div data-tl-anim style={{ ...shimmer, width: 38, height: 38, borderRadius: 11, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div data-tl-anim style={{ ...shimmer, width: '55%', height: 11, borderRadius: 6 }} />
        <div data-tl-anim style={{ ...shimmer, width: '80%', height: 9, borderRadius: 6 }} />
      </div>
      <div data-tl-anim style={{ ...shimmer, width: 56, height: 18, borderRadius: 999 }} />
    </div>
  )
}

