import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, ClipboardList, Film, LockKeyhole, LogIn, Music2, Radio, Trophy, Trash2, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { TOURNAMENT_CONFIGS } from '../data/tournament-data.js'
import { generateBracket, getCurrentMatch, advanceWinner, getWinner, getTournamentProgress } from '../lib/tournament.js'
import DuelArena from './tournament/DuelArena.jsx'
import DuelAmbient from './tournament/DuelAmbient.jsx'
import BracketPanel from './tournament/BracketPanel.jsx'
import WinnerCard from './tournament/WinnerCard.jsx'
import {
  createTournamentRoom, fetchTournamentRoom, joinTournamentRoom,
  fetchTournamentRoomPlayers, fetchTournamentRoomVotes, castTournamentVote,
  updateTournamentRoom, subscribeTournamentRoom, touchTournamentPlayer,
  deleteTournamentRoom,
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
@keyframes tl-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes tl-softline{0%{transform:translateX(-18%);opacity:.18}50%{opacity:.34}100%{transform:translateX(18%);opacity:.18}}
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
  const refreshQueuedRef = useRef(false)
  const lastRealtimeRef = useRef(0)
  const revealTimerRef = useRef(null)
  const revealWatchdogRef = useRef(null)
  useEffect(() => () => {
    clearTimeout(revealTimerRef.current)
    clearTimeout(revealWatchdogRef.current)
  }, [])

  // Salons récents pour la section "Salons en direct" (uniquement sur l'accueil).
  const loadRooms = useCallback(() => {
    setRoomsLoading(true); setRoomsError(false)
    return fetchRecentTournamentRooms(8)
      .then(r => setPublicRooms(Array.isArray(r) ? r : []))
      .catch(() => setRoomsError(true))
      .finally(() => setRoomsLoading(false))
  }, [])

  // Liste "Salons en direct" : chargée à l'arrivée + realtime pour apparition instantanée des nouveaux salons
  // (plus besoin d'actualiser ou d'attendre le polling). Polling de secours conservé pour robustesse.
  useEffect(() => {
    if (code) return
    let ignore = false
    const tick = () => { if (!ignore) loadRooms() }
    tick()

    // Realtime: quand un salon est créé/modifié/supprimé, on recharge la liste live
    // (filtre soft côté handler pour n'affecter que les salons "publics" type ost/opening/ending)
    let roomSub = null
    if (supabase) {
      const relevant = new Set(['ost', 'opening', 'ending'])
      roomSub = supabase
        .channel('public-trooms-list')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_rooms' }, payload => {
          const tid = (payload.new || payload.old)?.tournament_id
          if (!tid || relevant.has(tid)) {
            if (!ignore) tick()
          }
        })
        .subscribe()
    }

    const iv = setInterval(() => { if (!document.hidden) tick() }, 8000)
    const onFocus = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    return () => {
      ignore = true
      clearInterval(iv)
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
      if (roomSub) supabase.removeChannel(roomSub)
    }
  }, [code, loadRooms])

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
    if (!c) return
    if (refreshing.current) {
      refreshQueuedRef.current = true
      return
    }
    refreshing.current = true
    try {
      const [r, pl] = await Promise.all([fetchTournamentRoom(c), fetchTournamentRoomPlayers(c)])
      if (!r) { setNotFound(true); setRoom(null); return }
      const cur = r?.rounds ? getCurrentMatch(r.rounds) : null
      const vt = cur ? await fetchTournamentRoomVotes(c, cur.match.id) : []
      setNotFound(false); setRoom(r); setPlayers(pl); setVotes(vt)
    } catch {
      // Le polling/realtime ne doit jamais s'arreter sur une erreur reseau.
    } finally {
      refreshing.current = false
    }
    if (refreshQueuedRef.current) {
      refreshQueuedRef.current = false
      return refresh(c)
    }
  }, [code])

  useEffect(() => {
    if (!code) return
    let stop = false, timer
    lastRealtimeRef.current = Date.now()
    // Le canal realtime Supabase meurt silencieusement sur les longues sessions
    // (socket coupé, onglet en veille, wifi) → sans ça il fallait F5 pour revoir
    // le live. On garde l'unsub dans un ref pour pouvoir se ré-abonner à chaud.
    const subscribe = () => subscribeTournamentRoom(code, () => { lastRealtimeRef.current = Date.now(); refresh(code) })
    let unsub = subscribe()
    refresh(code)
    // Polling de secours ADAPTATIF : pause en arrière-plan, ralentit quand le
    // realtime délivre, rapide sinon → live sans recharger, coût réseau maîtrisé.
    const tick = () => {
      if (stop) return
      const recentRT = Date.now() - lastRealtimeRef.current < 20000
      const delay = document.hidden ? 15000 : recentRT ? 5000 : 2000
      timer = setTimeout(async () => { await refresh(code); tick() }, delay)
    }
    tick()
    const syncOnFocus = () => { if (!document.hidden) { resubscribe(); refresh(code) } }
    // Watchdog : si aucun event realtime depuis 45s (page active), le canal est
    // probablement mort → on le recrée. Évite le "faut actualiser" sur le long.
    const resubscribe = () => {
      try { unsub?.() } catch {}
      unsub = subscribe()
      lastRealtimeRef.current = Date.now()
    }
    const watchdog = setInterval(() => {
      if (!document.hidden && Date.now() - lastRealtimeRef.current > 45000) resubscribe()
    }, 20000)
    window.addEventListener('focus', syncOnFocus)
    document.addEventListener('visibilitychange', syncOnFocus)
    const ping = setInterval(() => touchTournamentPlayer(code, ident.userId), 25000)
    return () => {
      stop = true
      clearTimeout(timer)
      try { unsub?.() } catch {}
      clearInterval(watchdog)
      clearInterval(ping)
      window.removeEventListener('focus', syncOnFocus)
      document.removeEventListener('visibilitychange', syncOnFocus)
    }
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
      .then(({ error }) => {
        if (error) throw new Error(error)
        refresh(code)
        clearTimeout(revealTimerRef.current)
        revealTimerRef.current = setTimeout(() => {
          updateTournamentRoom(code, { current_match: nextCur?.match.id || null, status: done ? 'done' : 'playing' })
            .then(({ error }) => {
              if (error) throw new Error(error)
              resolvingRef.current = false
              refresh(code)
            })
            .catch(() => { resolvingRef.current = false })
        }, 2400)
      })
      .catch(() => { resolvingRef.current = false })
  }, [isHost, current, totalV, players.length, leftN, rightN, room?.status, rounds, code, refresh])

  // Filet de sécurité : si le timer de révélation est throttlé/perdu, le salon
  // ne doit jamais rester bloqué sur "Duel suivant…".
  useEffect(() => {
    clearTimeout(revealWatchdogRef.current)
    if (room?.status !== 'reveal' || !rounds) return
    revealWatchdogRef.current = setTimeout(async () => {
      const nextCur = getCurrentMatch(rounds)
      const done = getWinner(rounds)
      const { error } = await updateTournamentRoom(code, {
        current_match: nextCur?.match.id || null,
        status: done ? 'done' : 'playing',
      })
      resolvingRef.current = false
      if (!error) refresh(code)
    }, isHost ? 4200 : 7000)
    return () => clearTimeout(revealWatchdogRef.current)
  }, [isHost, room?.status, room?.current_match, rounds, code, refresh])

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
    const matchId = current.match.id
    setErr('')
    setVotes(v => v.some(x => String(x.user_id) === ident.userId)
      ? v
      : [...v, { user_id: ident.userId, side }]) // optimiste
    let error = null
    try {
      ;({ error } = await castTournamentVote({ code, matchId, userId: ident.userId, side }))
    } catch {
      error = 'network'
    }
    if (error) {
      setVotes(v => v.filter(x => String(x.user_id) !== ident.userId))
      setErr('Vote non enregistré. Réessaie dans quelques secondes.')
      return
    }
    await refresh(code)
  }

  function leave() { setParams({}); setCode(''); setRoom(null); setNotFound(false); autoJoinRef.current = false }

  // ── Vues ─────────────────────────────────────────────────────────────────
  const wrap = { position: 'relative', minHeight: '100vh', background: BG, color: '#fff', paddingTop: 84, paddingBottom: 60, fontFamily: "'Inter',system-ui,sans-serif", overflowX: 'hidden' }
  // zIndex:2 → le contenu reste AU-DESSUS des fonds plein écran rendus dans la page
  // (DuelAmbient + PlayingBgOverlay de DuelArena, tous deux fixed en z0) pendant la lecture.
  const inner = { position: 'relative', zIndex: 2, width: 'min(1180px, calc(100% - 32px))', margin: '0 auto' }
  const btn = (bg = GRAD) => ({ padding: '12px 22px', borderRadius: 12, border: 'none', background: bg, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' })
  const field = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 11, background: 'rgba(255,255,255,.05)', border: `1px solid ${BORDER}`, color: '#fff', fontSize: 14, fontFamily: 'inherit' }

  // 1) Aucun code → lobby premium "Salon multi-tournoi"
  if (!code) {
    const recent = publicRooms.filter(r => r.status !== 'done')
    const openRoom = (c) => { setErr(''); setJoinCode(c); setParams({ code: c }); setCode(c) }
    const jumpTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const activeCfg = TOURNAMENT_CONFIGS[tid] || TOURNAMENT_CONFIGS.ost
    const createDisabled = busy || (ident.guest && !guestName.trim())
    const joinDisabled = busy || !joinCode.trim() || (ident.guest && !guestName.trim())

    const fadeUp = {
      hidden: { opacity: 0, y: 18 },
      show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: 0.06 * i, ease } }),
    }
    const panel = {
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(160deg, rgba(31,29,38,.86), rgba(16,16,22,.92))',
      border: '1px solid rgba(255,255,255,.085)',
      borderTop: '1px solid rgba(255,255,255,.14)',
      borderRadius: 22,
      boxShadow: '0 26px 70px rgba(0,0,0,.36)',
      backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
    }
    const label = (t) => (
      <div style={{ fontSize: 11.5, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(246,218,232,.58)', marginBottom: 14 }}>{t}</div>
    )
    const heroButton = (primary = false) => ({
      minHeight: 46, padding: '0 18px', borderRadius: 13,
      border: primary ? '1px solid rgba(236,96,143,.32)' : '1px solid rgba(255,255,255,.10)',
      background: primary
        ? 'linear-gradient(135deg, rgba(219,64,119,.96), rgba(144,76,126,.92))'
        : 'rgba(255,255,255,.045)',
      color: primary ? '#fff' : 'rgba(246,243,248,.78)',
      fontSize: 13.5, fontWeight: 850, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
      boxShadow: primary ? '0 14px 34px rgba(160,54,102,.22)' : 'none',
      fontFamily: 'inherit', transition: 'transform .18s, border-color .18s, background .18s',
    })

    return (
      <div style={{ ...wrap, background: '#08090d', paddingTop: isMobile ? 82 : 92, paddingBottom: 44 }}>
        <style>{LOBBY_KEYFRAMES}</style>
        {/* Fond premium sobre : gradients larges + grain léger, sans gros vide plat. */}
        <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `radial-gradient(900px 520px at 70% 7%, rgba(116,76,118,.18), transparent 62%),
                       radial-gradient(720px 460px at 18% 22%, rgba(188,78,124,.10), transparent 65%),
                       radial-gradient(820px 520px at 74% 82%, rgba(191,143,85,.08), transparent 62%),
                       linear-gradient(180deg, #0a0b10 0%, #08090d 54%, #06070a 100%)` }} />
        <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: .15,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,.22) 1px, transparent 0)',
          backgroundSize: '22px 22px' }} />
        <div aria-hidden data-tl-anim style={{ position: 'fixed', left: '9%', right: '9%', top: isMobile ? 116 : 132, height: 1, zIndex: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.16), rgba(216,111,151,.20), transparent)',
          animation: 'tl-softline 9s ease-in-out infinite' }} />

        <main style={{ ...inner, maxWidth: 1280 }}>
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

          <motion.div initial="hidden" animate="show"
            style={{
              display: 'grid',
              gridTemplateColumns: isNarrow ? '1fr' : 'minmax(0,1.04fr) minmax(390px,.82fr)',
              gap: isNarrow ? 24 : 38,
              alignItems: 'center',
              minHeight: isMobile ? 'auto' : 'min(620px, calc(100vh - 170px))',
              padding: isMobile ? '10px 0 24px' : '18px 0 32px',
            }}>

            <div style={{ maxWidth: 650 }}>
              <motion.div custom={0} variants={fadeUp}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginBottom: 20, padding: '7px 14px', borderRadius: 999,
                  fontSize: 11, fontWeight: 850, letterSpacing: '.15em', textTransform: 'uppercase', color: 'rgba(251,207,232,.86)',
                  background: 'rgba(187,80,123,.10)', border: '1px solid rgba(236,132,176,.24)' }}>
                <LiveDot />Mode multi · temps réel
              </motion.div>

              <motion.h1 custom={1} variants={fadeUp}
                style={{ fontSize: 'clamp(42px,6.2vw,82px)', fontWeight: 950, margin: '0 0 18px', letterSpacing: '-.035em', lineHeight: .94, color: TXT }}>
                Crée ton salon<br /><span style={{ background: `linear-gradient(100deg, ${MAGENTA}, ${PINK_L})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>multi-tournoi</span>
              </motion.h1>

              <motion.p custom={2} variants={fadeUp}
                style={{ color: 'rgba(244,243,246,.66)', margin: '0 0 26px', fontSize: 'clamp(15.5px,1.5vw,18px)', lineHeight: 1.7, maxWidth: 560 }}>
                Invite tes potes, lance un bracket privé, votez en direct et couronnez le meilleur opening, ending ou OST.
              </motion.p>

              <motion.div custom={3} variants={fadeUp} style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 24 }}>
                {[[Trophy, 'Bracket automatique'], [Radio, 'Votes en direct'], [LockKeyhole, 'Code privé instantané']].map(([Icon, t]) => (
                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 34, padding: '0 13px', borderRadius: 999,
                    background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.075)', fontSize: 12.5, fontWeight: 760, color: 'rgba(244,243,246,.72)' }}>
                    <Icon size={14} strokeWidth={2.1} />{t}
                  </span>
                ))}
              </motion.div>

              <motion.div custom={4} variants={fadeUp} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <button type="button" onClick={() => jumpTo('create-room-panel')} style={heroButton(true)}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}>
                  Créer un salon <ArrowRight size={16} />
                </button>
                <button type="button" onClick={() => jumpTo('join-room-panel')} style={heroButton(false)}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.18)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.10)' }}>
                  <LogIn size={16} /> Rejoindre un salon
                </button>
              </motion.div>
              <motion.p custom={5} variants={fadeUp} style={{ margin: '16px 0 0', color: 'rgba(244,243,246,.42)', fontSize: 12.5, fontWeight: 650 }}>
                Aucun setup compliqué. Le code est généré automatiquement.
              </motion.p>
            </div>

            <motion.div custom={2} variants={fadeUp} data-tl-anim style={{ animation: isMobile ? 'none' : 'tl-float 7s ease-in-out infinite' }}>
              <LobbyPreview tid={tid} />
            </motion.div>
          </motion.div>

          <div aria-hidden style={{ height: 1, margin: isMobile ? '0 0 18px' : '0 0 24px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent)' }} />

          <section style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.26fr) minmax(330px,.74fr)',
            gap: 18,
            alignItems: 'stretch',
            marginBottom: 18,
          }}>

            <motion.div id="create-room-panel" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease }}
              style={{ ...panel, padding: isMobile ? 18 : 22, display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(520px 220px at 16% 0%, rgba(236,96,143,.10), transparent 65%)' }} />
              <div style={{ position: 'relative' }}>
              {label('Choisis un mode')}
              {ident.guest && (
                <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Choisis ton pseudo"
                  style={{ ...field, marginBottom: 14, fontWeight: 750, minHeight: 46, borderRadius: 13 }} maxLength={20} />
              )}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 18 }}>
                {Object.entries(TOURNAMENT_CONFIGS).map(([id, c]) => (
                  <ModeCard key={id} id={id} cfg={c} active={tid === id} onSelect={() => setTid(id)} />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(244,243,246,.58)', fontSize: 12.5, lineHeight: 1.45 }}>
                  <ClipboardList size={18} color="rgba(246,218,232,.62)" />
                  <span>{activeCfg.participants?.length || 0} participants · bracket privé · votes synchronisés</span>
                </div>
                <span style={{ justifySelf: isMobile ? 'start' : 'end', color: 'rgba(255,255,255,.38)', fontSize: 11.5, fontWeight: 750 }}>Code privé généré automatiquement</span>
              </div>
              <button onClick={handleCreate} disabled={createDisabled} aria-busy={busy}
                onMouseEnter={e => { if (!createDisabled) e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
                style={{ ...btn('linear-gradient(135deg, rgba(219,64,119,.98), rgba(140,80,126,.95))'), width: '100%', minHeight: 50, padding: 0, fontSize: 15.5, marginTop: 'auto',
                  boxShadow: createDisabled ? 'none' : '0 16px 38px rgba(160,54,102,.26)', opacity: createDisabled ? .55 : 1,
                  cursor: createDisabled ? 'default' : 'pointer', transition: 'transform .16s, opacity .16s, box-shadow .16s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
                {busy ? 'Création…' : 'Créer mon salon'} {!busy && <ArrowRight size={17} />}
              </button>
              {err && <p role="alert" style={{ color: '#f49ab1', margin: '12px 0 0', fontSize: 12.5, textAlign: 'center' }}>{err}</p>}
              </div>
            </motion.div>

            <motion.form id="join-room-panel" onSubmit={handleJoin} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.06, ease }}
              style={{ ...panel, padding: isMobile ? 18 : 22, display: 'flex', flexDirection: 'column' }}>
              {label('Rejoindre avec un code')}
              <p style={{ fontSize: 13.5, color: 'rgba(244,243,246,.58)', margin: '-3px 0 16px', lineHeight: 1.55 }}>
                Entre le code envoyé par ton pote pour rejoindre son vote.
              </p>
              {ident.guest && (
                <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Ton pseudo"
                  style={{ ...field, marginBottom: 12, fontWeight: 750, minHeight: 46, borderRadius: 13 }} maxLength={20} />
              )}
              <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="BRAMS42" maxLength={6} autoComplete="off" aria-label="Code du salon"
                style={{ ...field, textTransform: 'uppercase', letterSpacing: '.36em', fontWeight: 950, fontSize: 21, textAlign: 'center', minHeight: 54, padding: '0 15px', marginBottom: 12, borderRadius: 14, background: 'rgba(255,255,255,.055)' }} />
              <button type="submit" disabled={joinDisabled}
                onMouseEnter={e => { if (!joinDisabled) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)' } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = HAIR_TOP }}
                style={{ ...btn('rgba(255,255,255,.065)'), width: '100%', minHeight: 48, padding: 0, fontSize: 14.5, border: `1px solid ${HAIR_TOP}`,
                  opacity: joinDisabled ? .5 : 1, cursor: joinDisabled ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'transform .16s, border-color .16s, opacity .16s' }}>
                {busy ? 'Connexion…' : 'Rejoindre'} {!busy && <LogIn size={16} />}
              </button>
              {err && <p role="alert" style={{ color: '#f49ab1', margin: '12px 0 0', fontSize: 12.5, textAlign: 'center' }}>{err}</p>}
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.075)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: 'rgba(244,243,246,.45)', fontSize: 11.5, fontWeight: 850, letterSpacing: '.12em', textTransform: 'uppercase' }}>
                  <Users size={14} /> Salons live
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {roomsLoading ? (
                    <>
                      <RoomSkeleton />
                      <RoomSkeleton />
                    </>
                  ) : roomsError ? (
                    <div style={{ color: 'rgba(244,243,246,.42)', fontSize: 12.5, lineHeight: 1.45 }}>Impossible de charger les salons actifs pour le moment.</div>
                  ) : recent.length ? (
                    recent.slice(0, 2).map(r => <LiveRoomCard key={r.code} room={r} onOpen={openRoom} />)
                  ) : (
                    <div style={{ color: 'rgba(244,243,246,.42)', fontSize: 12.5, lineHeight: 1.45 }}>Aucun salon public actif. Crée le tien et partage le code.</div>
                  )}
                </div>
              </div>
            </motion.form>
          </section>

        </main>
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
              {isHost && (
                <button
                  onClick={() => requestCloseTournamentRoom({
                    isHost,
                    code,
                    hostUserId: ident.userId,
                    setErr,
                    setBusy,
                    onClosed: leave,
                  })}
                  disabled={busy}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '9px 12px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: busy ? 'wait' : 'pointer',
                    color: 'rgba(255,190,190,.9)',
                    border: '1px solid rgba(255,120,120,.26)',
                    background: 'rgba(80,20,20,.22)',
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  <Trash2 size={14} /> Fermer
                </button>
              )}
              <button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/tournoi/salon?code=${code}`)}
              style={{ ...btn('rgba(255,255,255,.08)'), padding: '4px 10px', fontSize: 11 }}>Copier le lien</button>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 13, color: 'rgba(255,255,255,.55)' }}>
            👥 {players.length} · {progress.done}/{progress.total} duels
          </div>
        </div>

        {err && (
          <div role="alert" style={{
            margin: '-4px 0 16px',
            padding: '10px 14px',
            borderRadius: 12,
            border: '1px solid rgba(244,154,177,.28)',
            background: 'rgba(157,23,77,.13)',
            color: '#ffd1dc',
            fontSize: 12.5,
            fontWeight: 700,
          }}>
            {err}
          </div>
        )}

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
              {getTournamentRoomTitle(room.tournament_id)} · {(rounds?.[0]?.matches?.length || 0) * 2} participants
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
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, position: 'relative', zIndex: 1 }}>
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
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'column', gap: 14, width: isMobile ? '100%' : 'auto', position: 'relative', zIndex: 1 }}>
                <VotersPanel players={players} votes={votes} match={current.match} isMobile={isMobile}
                  voteStatus={`${totalV}/${players.length} ont voté · ${myVote ? 'en attente des autres…' : 'à toi de voter !'}`} />
                <BracketPanel rounds={rounds} currentId={current.match.id} isMobile={isMobile} />
              </div>
            </div>
          </div>
        )}

        {/* FIN */}
        {room.status === 'done' && winner && (
          <WinnerCard winner={winner} onReset={leave} resetLabel="Nouveau salon" subtitle="Salon terminé — la communauté a tranché." />
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
// DuelAmbient + BracketPanel extraits dans ./tournament/ (partagés solo + multi).

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
  ost:     { emoji: '🎵', icon: Music2, accent: '#bfa46a', tag: 'OST', desc: 'Bandes-son, inserts et thèmes marquants.' },
  opening: { emoji: '🎬', icon: Film, accent: '#d86f9f', tag: 'Opening', desc: 'Openings du blind test, duel après duel.' },
  ending:  { emoji: '🌙', icon: Radio, accent: '#0891b2', tag: 'Ending', desc: 'Endings du blind test, emotion et nostalgie.' },
}
const tidEmoji = (id) => TID_META[id]?.emoji || '🏆'

function getTournamentRoomTitle(tournamentId) {
  return TOURNAMENT_CONFIGS[tournamentId]?.title || 'Tournoi Brams'
}

// Point "live" : pastille magenta avec halo qui pulse, très subtil.
function LiveDot({ size = 6 }) {
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-block', flexShrink: 0 }}>
      <span data-tl-anim style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: MAGENTA, animation: 'tl-livering 2.4s ease-out infinite' }} />
      <span data-tl-anim style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: PINK_L, animation: 'tl-livedot 2.4s ease-in-out infinite' }} />
    </span>
  )
}

// Carte de sélection de mode (OST / Opening / Ending) — hover premium, transition douce.
function ModeCard({ id, cfg, active, onSelect }) {
  const [hover, setHover] = useState(false)
  const meta = TID_META[id] || { icon: Trophy, accent: MAGENTA, desc: '' }
  const Icon = meta.icon || Trophy
  const accent = meta.accent || MAGENTA
  return (
    <button onClick={onSelect} aria-pressed={active} type="button"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 10, minHeight: 150,
        padding: 16, borderRadius: 18, cursor: 'pointer', textAlign: 'left',
        border: `1px solid ${active ? `${accent}88` : (hover ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.08)')}`,
        background: active
          ? `linear-gradient(160deg, ${hexA(accent, 0.18)}, rgba(255,255,255,.045))`
          : 'rgba(255,255,255,.035)',
        boxShadow: active ? `0 16px 38px ${hexA(accent, 0.16)}` : 'none',
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: 'border-color .18s, background .18s, transform .15s, box-shadow .18s',
        fontFamily: 'inherit',
      }}>
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: `radial-gradient(220px 120px at 15% 0%, ${hexA(accent, active ? 0.16 : 0.08)}, transparent 65%)`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ width: 38, height: 38, borderRadius: 13, display: 'grid', placeItems: 'center', color: active ? accent : 'rgba(244,243,246,.56)',
          background: active ? hexA(accent, 0.14) : 'rgba(255,255,255,.045)', border: `1px solid ${active ? hexA(accent, 0.34) : 'rgba(255,255,255,.08)'}` }}>
          <Icon size={18} strokeWidth={2.1} />
        </span>
        <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${active ? accent : 'rgba(255,255,255,.18)'}`, display: 'grid', placeItems: 'center', transition: 'border-color .18s' }}>
          {active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />}
        </span>
      </div>
      <span style={{ position: 'relative', fontSize: 15, fontWeight: 900, color: TXT, lineHeight: 1.2 }}>{cfg.title || id}</span>
      <span style={{ position: 'relative', fontSize: 12, fontWeight: 800, color: active ? accent : 'rgba(244,243,246,.42)' }}>{cfg.participants?.length || 0} participants</span>
      <span style={{ position: 'relative', fontSize: 12.2, color: 'rgba(244,243,246,.55)', lineHeight: 1.5 }}>{meta.desc}</span>
    </button>
  )
}

// Aperçu fictif d'un salon live (illustratif) — réagit au mode choisi.
function LobbyPreview({ tid }) {
  const cfg = TOURNAMENT_CONFIGS[tid] || {}
  const parts = cfg.participants || []
  const left = parts[0] || { title: 'Gurenge', anime: 'Demon Slayer' }
  const right = parts[1] || { title: 'Unravel', anime: 'Tokyo Ghoul' }
  const meta = TID_META[tid] || TID_META.opening
  const Icon = meta.icon || Trophy
  const accent = meta.accent || MAGENTA
  const voters = ['Kaito', 'Mira', 'Sora', 'Reki', 'Yuna']
  const votedSides = ['left', 'right', 'left', 'left', null] // 4/5 ont voté, 3-1
  const leftN = votedSides.filter(s => s === 'left').length
  const rightN = votedSides.filter(s => s === 'right').length
  const total = leftN + rightN
  const leftPct = total ? Math.round((leftN / total) * 100) : 50

  const row = (name, side, i) => (
    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 28 }}>
      <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 10.5, fontWeight: 850, color: '#fff',
        background: side ? hexA(accent, 0.18) : 'rgba(255,255,255,.055)', border: `1.5px solid ${side ? hexA(accent, 0.5) : 'rgba(255,255,255,.12)'}` }}>
        {name[0]}
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'rgba(244,243,246,.72)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 700 }}>{name}{i === 0 ? ' · hôte' : ''}</span>
      <span style={{ fontSize: 12, color: side ? '#54d89c' : 'rgba(244,243,246,.30)' }}>{side ? '✓' : '…'}</span>
    </div>
  )

  return (
    <motion.div key={tid} initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease }}
      style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(160deg, rgba(32,30,40,.84), rgba(14,15,21,.93))',
        border: '1px solid rgba(255,255,255,.10)',
        borderTop: '1px solid rgba(255,255,255,.16)',
        borderRadius: 24, padding: 18,
        boxShadow: '0 32px 82px rgba(0,0,0,.46)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: `radial-gradient(420px 220px at 20% -10%, ${hexA(accent, 0.16)}, transparent 64%), radial-gradient(360px 180px at 100% 16%, rgba(255,255,255,.055), transparent 62%)` }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ width: 40, height: 40, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 14, color: accent,
          background: hexA(accent, 0.12), border: `1px solid ${hexA(accent, 0.32)}` }}>
          <Icon size={19} strokeWidth={2.2} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: TXT, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cfg.title || 'Tournoi'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 10.5, color: 'rgba(244,243,246,.42)', letterSpacing: '.14em', fontWeight: 850 }}>
            <span>SALON</span><span style={{ color: accent }}>BRAMS42</span>
          </div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 900, letterSpacing: '.12em', color: accent,
          padding: '5px 10px', borderRadius: 999, background: hexA(accent, 0.10), border: `1px solid ${hexA(accent, 0.32)}` }}>
          <LiveDot size={5} />LIVE
        </span>
      </div>

      <div style={{ position: 'relative', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.075)', borderRadius: 16, padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(244,243,246,.42)', marginBottom: 10 }}>
          <span>Vote en cours</span><span style={{ color: accent }}>{total}/5 votants</span>
        </div>
        {[[left, leftN, true], [right, rightN, false]].map(([t, n, lead], i) => (
          <div key={i} style={{ marginBottom: i === 0 ? 10 : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 5 }}>
              <span style={{ fontSize: 12.5, fontWeight: 850, color: lead ? TXT : 'rgba(244,243,246,.58)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '78%' }}>{t.title}</span>
              <span style={{ fontSize: 11.5, fontWeight: 900, color: lead ? accent : 'rgba(244,243,246,.35)' }}>{n}</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
              <div data-tl-anim style={{ height: '100%', borderRadius: 99, width: `${i === 0 ? leftPct : 100 - leftPct}%`,
                background: lead ? `linear-gradient(90deg, ${accent}, ${hexA(accent, 0.72)})` : 'rgba(255,255,255,.20)', animation: 'tl-bar .8s ease', transition: 'width .5s' }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 9px', color: 'rgba(244,243,246,.42)', fontSize: 10.5, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>
        <span>Participants connectés</span>
        <span>{voters.length}</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
        {voters.map((n, i) => row(n, votedSides[i], i))}
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 7, paddingTop: 13, borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <span style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(244,243,246,.42)', marginRight: 4 }}>Bracket</span>
        {['8e', '4e', '½', 'F'].map((r, i) => (
          <span key={r} title={r} style={{ flex: 1, height: 4, borderRadius: 99, background: i === 0 ? accent : (i === 1 ? hexA(accent, 0.42) : 'rgba(255,255,255,.09)') }} />
        ))}
        <Trophy size={13} color={accent} />
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
        <div style={{ fontSize: 11, color: TXT_FAINT, marginTop: 1 }}>{getTournamentRoomTitle(room.tournament_id)}</div>
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

async function requestCloseTournamentRoom({ isHost, code, hostUserId, setErr, setBusy, onClosed }) {
  if (!isHost || !code) return
  const confirmed = window.confirm('Fermer ce salon ? Le tournoi, les votes et les joueurs seront supprimes pour tout le monde.')
  if (!confirmed) return

  setErr('')
  setBusy(true)
  const { error } = await deleteTournamentRoom(code, hostUserId)
  setBusy(false)

  if (error) {
    setErr(`Fermeture impossible : ${error}`)
    return
  }

  onClosed?.()
}
