import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { getAccessToken } from '../lib/supabaseRest.js'
import {
  createUndercoverRoom, fetchRoom, joinRoom, fetchPlayers, fetchAllVotes,
  submitClue, castElimVote, updateRoom, touchPlayer, subscribeRoom,
} from '../lib/undercoverRooms.js'

// ── DA dark premium : noir profond + accents sauge/or désaturés. ───────────────
const C = {
  bg: '#07090e', bg2: '#08090D',
  surface: '#10141a', surfaceFlat: '#121821', surfaceUp: '#151d25',
  hair: 'rgba(212,160,23,.14)', hairTop: 'rgba(212,160,23,.24)',
  emerald: '#6f8f7a', emeraldL: '#9fb69a', sage: '#788b76', sageD: '#6e7d69',
  bronze: '#d4a017',
  txt: '#f0eee8', muted: 'rgba(240,238,232,.62)', faint: 'rgba(240,238,232,.46)',
}
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` }
const CTA_BG = `linear-gradient(135deg, ${C.emeraldL}, #2f6b40)`
// Durée d'un tour selon le mode : vocal = on décrit à l'oral en Discord (tour
// court, on enchaîne vite), écrit = on tape l'indice dans l'app.
const MODE_SECONDS = { voice: 7, text: 10 }
const turnSecondsFor = g => MODE_SECONDS[g?.mode] || MODE_SECONDS.text
const ease = [0.22, 0.61, 0.36, 1]
const shuffle = a => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[r[i], r[j]] = [r[j], r[i]] } return r }

// Motif de feuilles ultra discret (data-URI) + animations.
const LEAF_URI = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%237BAA6D' stroke-width='1.2' opacity='0.5'%3E%3Cpath d='M20 60 Q40 20 60 60 Q40 100 20 60 Z'/%3E%3Cpath d='M40 60 Q60 40 60 60'/%3E%3Cpath d='M70 30 Q95 5 115 30 Q95 60 70 30 Z'/%3E%3Cpath d='M85 30 Q100 18 100 30'/%3E%3C/g%3E%3C/svg%3E"
const UC_FX = `
@keyframes uc-float { 0%{transform:translateY(8px) translateX(0);opacity:0} 12%{opacity:.55} 88%{opacity:.4} 100%{transform:translateY(-90px) translateX(14px);opacity:0} }
@keyframes uc-pulse { 0%,100%{transform:scale(1);opacity:.85} 50%{transform:scale(1.3);opacity:1} }
@keyframes uc-ring { 0%{transform:scale(.7);opacity:.5} 100%{transform:scale(2.6);opacity:0} }
@keyframes uc-breathe { 0%,100%{opacity:.5} 50%{opacity:.85} }
.uc-page button:focus-visible, .uc-page input:focus-visible { outline: 2px solid #d4a017; outline-offset: 3px; }
@media (prefers-reduced-motion: reduce){ [data-fx]{animation:none!important} }
`

const CARD = { background: `linear-gradient(168deg, ${C.surface}, ${C.bg2})`, border: `1px solid ${C.hair}`, borderTop: `1px solid ${C.hairTop}`, borderRadius: 20, boxShadow: '0 24px 70px rgba(0,0,0,.45)' }

// Carte définie AU NIVEAU MODULE (identité stable) : si elle était définie dans le
// rendu, chaque re-render (tic d'horloge) la recréait → remontage → l'anim
// d'apparition rejouait en boucle = clignotement.
function Card({ children, style, delay = 0, hover = true, ...rest }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay, ease }}
      whileHover={hover ? { y: -3, borderColor: C.hairTop, boxShadow: `0 26px 60px rgba(0,0,0,.5), 0 0 0 1px ${hexA(C.emerald, .12)}` } : undefined}
      style={{ ...CARD, ...style }} {...rest}>{children}</motion.div>
  )
}

function LiveDot({ size = 7, color = '#7BE0A0' }) {
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-block', flexShrink: 0 }}>
      <span data-fx style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, animation: 'uc-ring 2.6s ease-out infinite' }} />
      <span data-fx style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, animation: 'uc-pulse 2.6s ease-in-out infinite' }} />
    </span>
  )
}

export default function UndercoverPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const { isAuthenticated, userId, displayName, avatarUrl, loading: authLoading } = auth
  const [params, setParams] = useSearchParams()

  const [code, setCode] = useState(() => (params.get('code') || '').toUpperCase())
  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [votes, setVotes] = useState([])
  const [joinCode, setJoinCode] = useState('')
  const [joinFocus, setJoinFocus] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [clue, setClue] = useState('')
  const [mode, setMode] = useState('voice')   // choix de l'hôte au lobby : 'voice' | 'text'
  const [now, setNow] = useState(Date.now())
  const [secret, setSecret] = useState(null)
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  const actedRef = useRef('')
  const autoJoinRef = useRef(false)
  const refreshing = useRef(false)    // anti refresh-en-vol simultané (realtime + poll)
  const refreshQueuedRef = useRef(false)
  const lastRealtimeRef = useRef(0)   // dernier event realtime → ralentit le poll
  const refreshTimerRef = useRef(null)
  const isMobile = vw < 720, isNarrow = vw < 1000

  const g = room?.rounds || null
  const isHost = room && String(room.host_user_id) === String(userId)
  const me = players.find(p => String(p.user_id) === String(userId))
  const amIn = Boolean(me)
  const nameByUid = useMemo(() => Object.fromEntries(players.map(p => [String(p.user_id), p.display_name || '?'])), [players])

  useEffect(() => { const f = () => setVw(window.innerWidth); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f) }, [])
  // Tic d'horloge UNIQUEMENT en partie (pour les chronos). Sur la landing, pas de
  // re-render inutile (et donc aucun risque de clignotement des cartes).
  useEffect(() => { if (!code) return; const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t) }, [code])

  const refresh = useCallback(async (c = code) => {
    if (!c) return
    if (refreshing.current) {
      refreshQueuedRef.current = true
      return
    }
    refreshing.current = true
    try {
      const [r, pl, vt] = await Promise.all([fetchRoom(c), fetchPlayers(c), fetchAllVotes(c)])
      if (!r || r._wrongType) { setNotFound(true); setRoom(null); return }
      setNotFound(false); setRoom(r); setPlayers(pl); setVotes(vt)
    } catch {
      // Le realtime/polling ne doit jamais mourir sur une erreur reseau ponctuelle.
    } finally { refreshing.current = false }
    if (refreshQueuedRef.current) {
      refreshQueuedRef.current = false
      return refresh(c)
    }
  }, [code])

  const scheduleRefresh = useCallback((c = code, delay = 150) => {
    if (!c) return
    clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(() => refresh(c), delay)
  }, [code, refresh])

  useEffect(() => {
    if (!code) return
    let stop = false, timer
    refresh(code)
    const unsub = subscribeRoom(code, () => {
      lastRealtimeRef.current = Date.now()
      scheduleRefresh(code, 120)
    })
    // Polling de secours ADAPTATIF (en plus du temps réel) : pause en arrière-plan,
    // ralentit quand le realtime délivre, rapide sinon → tout reste live sans
    // recharger, à coût réseau maîtrisé.
    const tick = () => {
      if (stop) return
      const recentRT = Date.now() - lastRealtimeRef.current < 20000
      const delay = document.hidden ? 12000 : recentRT ? 3000 : 1200
      timer = setTimeout(async () => { await refresh(code); tick() }, delay)
    }
    tick()
    const syncOnFocus = () => { if (!document.hidden) scheduleRefresh(code, 80) }
    window.addEventListener('focus', syncOnFocus)
    document.addEventListener('visibilitychange', syncOnFocus)
    const ping = setInterval(() => userId && touchPlayer(code, userId), 25000)
    return () => {
      stop = true
      clearTimeout(timer)
      clearTimeout(refreshTimerRef.current)
      unsub()
      clearInterval(ping)
      window.removeEventListener('focus', syncOnFocus)
      document.removeEventListener('visibilitychange', syncOnFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, userId])

  useEffect(() => {
    if (!code || !userId || !supabase || !g || !['reveal', 'describing', 'voting'].includes(g.phase)) { setSecret(null); return }
    let ignore = false
    supabase.from('undercover_secrets').select('role,word').eq('room_code', code).eq('user_id', String(userId)).maybeSingle()
      .then(({ data }) => { if (!ignore) setSecret(data || null) })
      .catch(() => { if (!ignore) setSecret(null) })
    return () => { ignore = true }
  }, [code, userId, g?.phase, g?.round])

  // (Ré)inscrit TA présence à chaque (re)chargement dès que salon + auth sont prêts.
  // Sans le garde `amIn` : un refresh ne doit jamais t'éjecter — l'upsert est
  // idempotent, donc si tu y es déjà ça ne fait rien, et sinon ça te remet dedans.
  useEffect(() => {
    if (!room || !code || !isAuthenticated || !userId || autoJoinRef.current) return
    autoJoinRef.current = true
    joinRoom({ code, userId, displayName, avatarUrl })
      .then(({ error }) => {
        if (error) {
          autoJoinRef.current = false
          setErr(error)
          return
        }
        scheduleRefresh(code, 150)
      })
      .catch(() => { autoJoinRef.current = false; setErr('Connexion au salon impossible') })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, code, isAuthenticated, userId])

  const alive = g?.alive || []
  const myWord = secret?.word || null
  const turnSec = turnSecondsFor(g)
  const isVoice = g?.mode === 'voice'
  const currentUid = g?.turnOrder?.[g?.turnIdx] ?? null
  const myTurn = g?.phase === 'describing' && String(currentUid) === String(userId)
  const secsLeft = g?.turnDeadline ? Math.max(0, Math.ceil((new Date(g.turnDeadline).getTime() - now) / 1000)) : 0
  const cluesFor = useCallback((round) => {
    const out = {}
    for (const v of votes) { const m = v.match_id.match(/^clue:(\d+):(\d+)$/); if (m && Number(m[1]) === round) { (out[String(v.user_id)] ||= {})[Number(m[2])] = v.side } }
    return out
  }, [votes])
  const myClueThisTurn = g && votes.some(v => v.match_id === `clue:${g.round}:${g.pass}` && String(v.user_id) === String(userId))
  const elimVotes = useMemo(() => votes.filter(v => g && v.match_id === `elim:${g.round}`), [votes, g])
  const myElimVote = elimVotes.find(v => String(v.user_id) === String(userId))?.side || null

  const callApi = useCallback(async (action, extra = {}) => {
    try {
      // getAccessToken (REST) au lieu de supabase.auth.getSession() qui pouvait
      // HANGER (verrou client) → le salon « chargeait à l'infini » et aucune
      // action ne partait. Lecture du JWT depuis le storage, sans le client.
      const token = await getAccessToken().catch(() => null)
      const r = await fetch(`/api/tierlists?action=${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ code, ...extra }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(j.error || 'Erreur serveur'); return false }
      return true
    } catch (e) { setErr(e?.message || 'Réseau'); return false }
  }, [code])

  const advanceTurn = useCallback((curG) => {
    let { turnIdx, pass, turnOrder } = curG
    turnIdx += 1
    if (turnIdx >= turnOrder.length) { turnIdx = 0; pass += 1 }
    const patch = pass > 2
      ? { phase: 'voting', voteDeadline: new Date(Date.now() + 45000).toISOString() }
      : { phase: 'describing', turnIdx, pass, turnDeadline: new Date(Date.now() + turnSecondsFor(curG) * 1000).toISOString() }
    return updateRoom(code, { rounds: { ...curG, ...patch } })
  }, [code])

  useEffect(() => {
    if (!isHost || g?.phase !== 'describing') return
    const key = `desc:${g.round}:${g.pass}:${g.turnIdx}`
    if (actedRef.current === key) return
    const speakerDone = votes.some(v => v.match_id === `clue:${g.round}:${g.pass}` && String(v.user_id) === String(currentUid))
    const timedOut = g.turnDeadline && now >= new Date(g.turnDeadline).getTime()
    if (speakerDone || timedOut) {
      actedRef.current = key
      // si l'écriture échoue/timeout, on réautorise un retry (sinon tour bloqué)
      advanceTurn(g).then(r => {
        if (r?.error) actedRef.current = ''
        else refresh(code)
      }).catch(() => { actedRef.current = '' })
    }
  }, [isHost, g, votes, currentUid, now, advanceTurn])

  useEffect(() => {
    if (!isHost || g?.phase !== 'voting') return
    const key = `resolve:${g.round}`
    if (actedRef.current === key) return
    const allVoted = alive.length > 0 && alive.every(u => elimVotes.some(v => String(v.user_id) === u))
    const timedOut = g.voteDeadline && now >= new Date(g.voteDeadline).getTime()
    if (allVoted || timedOut) {
      actedRef.current = key
      callApi('uc_resolve').then(ok => {
        if (!ok) actedRef.current = ''
        else refresh(code)
      }).catch(() => { actedRef.current = '' })
    }
  }, [isHost, g, elimVotes, alive, now, callApi])

  async function handleCreate() {
    if (busy) return
    if (!userId) { setErr('Connexion en cours, réessaie dans un instant…'); return }
    setErr(''); setBusy(true)
    let res
    try { res = await createUndercoverRoom({ hostUserId: userId, displayName, avatarUrl }) }
    catch (e) { res = { error: e?.message || 'erreur' } }
    finally { setBusy(false) }   // le bouton se débloque TOUJOURS
    const { code: c, error } = res || {}
    if (error || !c) { setErr('Création impossible : ' + (error || 'inconnue')); return }
    // Optimiste : on affiche le lobby tout de suite (le host est déjà inséré côté
    // serveur) sans attendre le 1er refresh realtime.
    autoJoinRef.current = true
    setNotFound(false)
    setRoom({ code: c, host_user_id: String(userId), tournament_id: 'undercover', status: 'lobby', rounds: { phase: 'lobby' } })
    setPlayers([{ user_id: String(userId), display_name: displayName || 'Hôte', avatar_url: avatarUrl || null, is_host: true }])
    setVotes([])
    setParams({ code: c }); setCode(c)
    scheduleRefresh(c, 250)
  }
  async function handleJoin(e) {
    e?.preventDefault?.(); if (busy) return
    if (!userId) { setErr('Connexion en cours, réessaie dans un instant…'); return }
    const c = joinCode.trim().toUpperCase()
    if (!c) { setErr('Entre un code'); return }
    setErr(''); setBusy(true)
    let res
    try { res = await joinRoom({ code: c, userId, displayName, avatarUrl }) }
    catch (e) { res = { error: e?.message || 'erreur' } }
    finally { setBusy(false) }
    const { error } = res || {}
    if (error) { setErr(error === 'introuvable' ? 'Salon introuvable' : error); return }
    setParams({ code: c }); setCode(c)
    scheduleRefresh(c, 200)
  }
  async function startGame() {
    if (players.length < 3 || busy) return
    setErr(''); setBusy(true)
    const ok = await callApi('uc_assign', { mode })
    setBusy(false)
    if (ok) scheduleRefresh(code, 180)
  }
  async function startDescribing() {
    setErr('')
    const { error } = await updateRoom(code, { rounds: { ...g, phase: 'describing', turnDeadline: new Date(Date.now() + turnSecondsFor(g) * 1000).toISOString() } })
    if (error) { setErr(error); return }
    scheduleRefresh(code, 120)
  }
  async function sendClue() {
    const t = clue.trim()
    if (!t || !myTurn || myClueThisTurn) return
    setClue('')
    const { error } = await submitClue({ code, round: g.round, pass: g.pass, userId, clue: t })
    if (error) { setErr(error); return }
    scheduleRefresh(code, 120)
  }
  // Mode vocal : on ne tape pas d'indice, on le dit à l'oral. Ce marqueur signale
  // « j'ai parlé » → l'hôte enchaîne sur le joueur suivant sans attendre les 7s.
  async function markSpoke() {
    if (!myTurn || myClueThisTurn) return
    const { error } = await submitClue({ code, round: g.round, pass: g.pass, userId, clue: '🎙️' })
    if (error) { setErr(error); return }
    scheduleRefresh(code, 120)
  }
  async function voteElim(targetUid) {
    if (myElimVote || !alive.includes(String(userId))) return
    const { error } = await castElimVote({ code, round: g.round, userId, targetUid })
    if (error) { setErr(error); return }
    scheduleRefresh(code, 120)
  }
  async function replay() {
    if (!isHost) return
    const { error } = await updateRoom(code, { status: 'lobby', rounds: { phase: 'lobby' } })
    if (error) { setErr(error); return }
    scheduleRefresh(code, 120)
  }
  function leave() { setParams({}); setCode(''); setRoom(null); setNotFound(false); autoJoinRef.current = false }

  // ── Styles ──
  const wrap = { position: 'relative', minHeight: '100vh', background: C.bg, color: C.txt, paddingTop: 92, paddingBottom: 72, fontFamily: "'Inter',system-ui,sans-serif", overflowX: 'hidden' }
  const inner = { position: 'relative', zIndex: 1, width: 'min(1080px, calc(100% - 30px))', margin: '0 auto' }
  const card = CARD
  const cta = (bg = CTA_BG) => ({ padding: '14px 24px', borderRadius: 13, border: 'none', background: bg, color: '#f3fff5', fontWeight: 900, fontSize: 14.5, cursor: 'pointer', fontFamily: 'inherit' })
  const field = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 11, background: C.surfaceFlat, border: `1px solid ${C.hair}`, color: C.txt, fontSize: 14, fontFamily: 'inherit', outline: 'none' }
  const kicker = t => <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: C.faint, marginBottom: 14 }}>{t}</div>

  // Fond premium : halos doux, grain géométrique discret et particules lentes.
  const ambient = (
    <>
      <style>{UC_FX}</style>
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: `
        radial-gradient(900px 520px at 16% -8%, ${hexA(C.bronze, .12)}, transparent 62%),
        radial-gradient(760px 520px at 88% 12%, ${hexA(C.emerald, .10)}, transparent 64%),
        radial-gradient(780px 680px at 48% 116%, ${hexA(C.sage, .08)}, transparent 66%),
        linear-gradient(180deg, ${C.bg} 0%, ${C.bg2} 58%, ${C.bg} 100%)` }} />
      <div aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: .055,
        backgroundImage: 'linear-gradient(rgba(212,160,23,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(212,160,23,.10) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
        maskImage: 'linear-gradient(180deg, transparent, black 16%, black 76%, transparent)',
      }} />
      <div data-fx aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: .025, backgroundImage: `url("${LEAF_URI}")`, backgroundSize: '180px', animation: 'uc-breathe 11s ease-in-out infinite' }} />
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {[...Array(9)].map((_, i) => (
          <span key={i} data-fx style={{ position: 'absolute', left: `${8 + i * 10}%`, bottom: '-10px', width: 4 + (i % 3), height: 4 + (i % 3), borderRadius: '50%', background: hexA(C.sage, .5), filter: 'blur(.5px)', animation: `uc-float ${11 + (i % 5) * 2}s linear ${i * 1.3}s infinite` }} />
        ))}
      </div>
    </>
  )
  const avatar = (uid, size = 34) => {
    const p = players.find(x => String(x.user_id) === String(uid))
    const n = (p?.display_name || '?')[0].toUpperCase()
    return p?.avatar_url
      ? <img src={p.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
      : <span style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: size * 0.42, fontWeight: 800, background: hexA(C.emerald, .18), border: `1px solid ${hexA(C.emerald, .42)}`, color: '#dff5e6' }}>{n}</span>
  }
  const backBtn = <button onClick={() => navigate('/tournoi')} onMouseEnter={e => e.currentTarget.style.color = C.txt} onMouseLeave={e => e.currentTarget.style.color = C.muted} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', marginBottom: 26, borderRadius: 11, border: `1px solid ${C.hair}`, background: hexA(C.emerald, .04), color: C.muted, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'color .18s' }}>← Retour</button>

  // ════ Connexion requise ════
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="uc-page" style={wrap}>{ambient}<div style={{ ...inner, maxWidth: 480, textAlign: 'center', paddingTop: 50 }}>
        {backBtn}
        <div style={{ ...card, padding: '38px 26px' }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>🌿</div>
          <h2 style={{ margin: '0 0 8px' }}>Undercover Anime</h2>
          <p style={{ color: C.muted, marginBottom: 22, lineHeight: 1.6 }}>Connecte-toi avec Discord pour entrer dans la clairière — ton rôle secret est scellé par ton compte, impossible à tricher.</p>
          <button onClick={() => auth.signInWithDiscord?.()} style={cta()}>Se connecter avec Discord</button>
        </div>
      </div></div>
    )
  }

  // ════════════════ LANDING (refonte premium végétale) ════════════════
  if (!code) {
    const RULES = [['👥', '3+ joueurs'], ['⏱️', '30s par tour'], ['🔒', 'Code privé'], ['🗳️', 'Vote final'], ['🎭', 'Persos aléatoires']]
    const STEPS = [
      ['🎴', 'Un personnage secret', 'Chaque joueur reçoit en privé un personnage anime, visible de lui seul.'],
      ['🌿', 'Le même… sauf un', "Les marines partagent le même perso. Le pirate en a un proche, mais différent."],
      ['🗳️', 'Démasquez le pirate', 'Décrivez, doutez, bluffez — puis votez pour éliminer le suspect, manche après manche.'],
    ]
    const VALUES = [
      ['🍃', 'Bluff & déduction', 'Lis entre les lignes, sème le doute, garde ton sang-froid.'],
      ['⚡', 'Parties rapides', 'Des manches nerveuses : 30s par tour, ça ne traîne jamais.'],
      ['♾️', 'Rejouabilité infinie', 'Personnages tirés au hasard, rôles cachés : jamais deux fois pareil.'],
      ['🫂', 'Entre potes', 'Le mode social parfait pour la communauté Brams, en vocal ou à distance.'],
    ]
    return (
      <div className="uc-page" style={wrap}>{ambient}
        <div style={inner}>
          {backBtn}

          {/* ── HERO ── */}
          <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: .07 } } }}
            style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1.05fr 0.95fr', gap: isNarrow ? 28 : 40, alignItems: 'center', marginBottom: 52 }}>
            <div>
              <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginBottom: 20, padding: '7px 15px', borderRadius: 999, fontSize: 10.5, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: C.emeraldL, background: hexA(C.emerald, .10), border: `1px solid ${hexA(C.emerald, .26)}` }}>
                <LiveDot size={6} /> Multijoueur • Social • Temps réel
              </motion.div>
              <motion.h1 variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                style={{ fontSize: 'clamp(44px,7.2vw,78px)', fontWeight: 900, margin: '0 0 18px', letterSpacing: '-.04em', lineHeight: .92 }}>
                <span style={{ display: 'block', color: '#eef4ee' }}>Undercover</span>
                <span style={{ display: 'block', background: `linear-gradient(100deg, ${C.emeraldL} 0%, ${C.sage} 52%, ${C.bronze} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: `drop-shadow(0 4px 36px ${hexA(C.emerald, .30)})` }}>Anime</span>
              </motion.h1>
              <motion.p variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                style={{ color: 'rgba(233,239,233,.78)', margin: '0 0 14px', fontSize: 'clamp(16px,2vw,19px)', lineHeight: 1.55, maxWidth: 540, fontWeight: 500 }}>
                Un pirate s'est glissé parmi les marines. Décrivez, bluffez, semez le doute… et démasquez-le avant qu'il ne soit trop tard.
              </motion.p>
              <motion.p variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                style={{ color: C.muted, margin: '0 0 24px', fontSize: 14, lineHeight: 1.6, maxWidth: 500 }}>
                Tout le monde reçoit un personnage secret. Sauf un. À vous de le trouver.
              </motion.p>
              <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }} style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 26 }}>
                {RULES.map(([ic, t]) => (
                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 13px', borderRadius: 10, background: C.surfaceFlat, border: `1px solid ${C.hair}`, fontSize: 12.5, fontWeight: 700, color: 'rgba(233,239,233,.72)' }}><span>{ic}</span>{t}</span>
                ))}
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={handleCreate} disabled={busy || !userId} onMouseEnter={e => { if (!busy) e.currentTarget.style.transform = 'translateY(-2px)' }} onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                  style={{ ...cta(), padding: '15px 28px', fontSize: 15.5, boxShadow: `0 14px 34px ${hexA(C.emerald, .32)}`, opacity: busy ? .6 : 1, transition: 'transform .15s' }}>
                  {busy ? '⏳ Création…' : '🌱 Créer une partie'}
                </button>
                <button onClick={() => document.getElementById('uc-join')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  style={{ ...cta('transparent'), border: `1px solid ${C.hairTop}`, color: C.txt }}>J'ai un code</button>
              </motion.div>
            </div>

            {/* Preview "salle cachée" */}
            {!isNarrow && (
              <motion.div variants={{ hidden: { opacity: 0, scale: .96 }, show: { opacity: 1, scale: 1 } }}>
                <div style={{ ...card, padding: 20, position: 'relative', overflow: 'hidden' }}>
                  <div aria-hidden style={{ position: 'absolute', inset: 0, background: `radial-gradient(420px 200px at 70% 0%, ${hexA(C.emerald, .14)}, transparent 70%)`, pointerEvents: 'none' }} />
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
                      <span style={{ fontSize: 17 }}>🌿</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 800 }}>Clairière secrète</div>
                        <div style={{ fontSize: 10.5, color: C.faint, letterSpacing: '.18em', fontWeight: 700 }}>SALON · A7K2</div>
                      </div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', color: C.emeraldL, padding: '4px 9px', borderRadius: 999, background: hexA(C.emerald, .12), border: `1px solid ${hexA(C.emerald, .3)}` }}><LiveDot size={5} />LIVE</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                      {[['Kaoru', false, '“rapide, têtu”'], ['Mei', false, '“héros, espoir”'], ['Ren', true, '“… puissant ?”'], ['Yua', false, '“sourire, justice”']].map(([n, sus, line], i) => (
                        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, background: sus ? hexA(C.bronze, .08) : 'rgba(255,255,255,.025)', border: `1px solid ${sus ? hexA(C.bronze, .3) : C.hair}` }}>
                          <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, background: hexA(sus ? C.bronze : C.emerald, .18), border: `1px solid ${hexA(sus ? C.bronze : C.emerald, .4)}`, color: '#eaf3ec' }}>{n[0]}</span>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{n}{i === 0 ? ' 👑' : ''}</span>
                          <span style={{ fontSize: 11.5, color: sus ? C.bronze : C.muted, fontStyle: 'italic' }}>{line}</span>
                          {sus && <span style={{ fontSize: 11 }}>🕵️</span>}
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 14, paddingTop: 13, borderTop: `1px solid ${C.hair}`, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: C.faint }}>
                      <span style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}><span data-fx style={{ display: 'block', height: '100%', width: '64%', background: `linear-gradient(90deg, ${C.emerald}, ${C.sage})`, animation: 'uc-breathe 3s ease-in-out infinite' }} /></span>
                      Manche 2 · vote dans 18s
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* ── COMMENT ÇA MARCHE ── */}
          <div style={{ marginBottom: 52 }}>
            <div style={{ textAlign: 'center', marginBottom: 26 }}>
              {kicker('Le principe')}
              <h2 style={{ margin: 0, fontSize: 'clamp(24px,3.4vw,32px)', fontWeight: 900, letterSpacing: '-.02em' }}>Comment ça marche</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 16 }}>
              {STEPS.map(([ic, t, d], i) => (
                <Card key={t} delay={i * .08} style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ width: 46, height: 46, borderRadius: 14, display: 'grid', placeItems: 'center', fontSize: 22, background: hexA(C.emerald, .12), border: `1px solid ${hexA(C.emerald, .26)}` }}>{ic}</span>
                    <span style={{ fontSize: 34, fontWeight: 900, color: hexA(C.sage, .22), lineHeight: 1, fontFamily: 'Georgia, serif' }}>{i + 1}</span>
                  </div>
                  <h3 style={{ margin: '0 0 7px', fontSize: 16.5, fontWeight: 800 }}>{t}</h3>
                  <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: C.muted }}>{d}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* ── ZONE D'ACTION ── */}
          <div id="uc-join" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1fr', gap: 18, marginBottom: 52 }}>
            <Card style={{ padding: 28, display: 'flex', flexDirection: 'column' }}>
              {kicker('Lancer une partie')}
              <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900 }}>Créer un salon</h3>
              <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, margin: '0 0 22px' }}>Tu deviens l'hôte. Invite tes potes avec un lien, et lance la partie quand vous êtes au moins 3.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                {[['👥', 'Joueurs', '3 minimum'], ['⏱️', 'Temps par tour', '30 secondes'], ['🎭', 'Personnages', 'Aléatoires']].map(([ic, k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 11, background: C.surfaceFlat, border: `1px solid ${C.hair}` }}>
                    <span style={{ fontSize: 15 }}>{ic}</span>
                    <span style={{ flex: 1, fontSize: 13, color: C.muted }}>{k}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: C.emeraldL }}>{v}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleCreate} disabled={busy || !userId} onMouseEnter={e => { if (!busy) e.currentTarget.style.transform = 'translateY(-2px)' }} onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                style={{ ...cta(), width: '100%', padding: 16, fontSize: 15.5, marginTop: 'auto', boxShadow: busy ? 'none' : `0 14px 34px ${hexA(C.emerald, .3)}`, opacity: busy ? .6 : 1, transition: 'transform .15s' }}>
                {busy ? '⏳ Création…' : '🌱 Créer le salon'}
              </button>
              <p style={{ textAlign: 'center', fontSize: 11.5, color: C.faint, margin: '12px 0 0' }}>Un code privé sera généré automatiquement.</p>
            </Card>

            <Card hover={false} style={{ padding: 28, background: `linear-gradient(168deg, ${C.surfaceUp}, ${C.bg2})`, display: 'flex', flexDirection: 'column' }}>
              {kicker('Rejoindre une salle')}
              <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900 }}>Rejoindre avec un code</h3>
              <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, margin: '0 0 22px' }}>Un ami t'a envoyé un code ? Entre-le pour ouvrir le passage vers sa clairière.</p>
              <form onSubmit={handleJoin} style={{ marginTop: 'auto' }}>
                <div style={{
                  position: 'relative', borderRadius: 14, padding: 3,
                  background: joinFocus ? `linear-gradient(135deg, ${hexA(C.emerald, .5)}, ${hexA(C.bronze, .3)})` : C.hair,
                  transition: 'background .25s', marginBottom: 12,
                }}>
                  <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    onFocus={() => setJoinFocus(true)} onBlur={() => setJoinFocus(false)}
                    placeholder="• • • •" maxLength={6} aria-label="Code du salon"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '18px 16px', borderRadius: 12, background: C.bg, border: 'none', color: C.emeraldL, outline: 'none', fontFamily: 'inherit', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '.5em', fontWeight: 900, fontSize: 28, textShadow: `0 0 24px ${hexA(C.emerald, joinCode ? .4 : 0)}` }} />
                </div>
                <button type="submit" disabled={busy || !joinCode.trim()}
                  style={{ ...cta(joinCode.trim() ? CTA_BG : 'rgba(255,255,255,.05)'), width: '100%', padding: 15, border: joinCode.trim() ? 'none' : `1px solid ${C.hair}`, color: joinCode.trim() ? '#f3fff5' : C.faint, opacity: busy ? .6 : 1, cursor: (busy || !joinCode.trim()) ? 'default' : 'pointer' }}>
                  {busy ? '⏳…' : joinCode.length >= 3 ? '🚪 Rejoindre la partie' : 'Entre un code…'}
                </button>
                {err && <p role="alert" style={{ color: '#e08a6f', margin: '12px 0 0', fontSize: 12.5, textAlign: 'center' }}>⚠ {err}</p>}
              </form>
            </Card>
          </div>

          {/* ── POURQUOI C'EST COOL ── */}
          <div>
            <div style={{ textAlign: 'center', marginBottom: 26 }}>
              {kicker('Pourquoi tu vas adorer')}
              <h2 style={{ margin: 0, fontSize: 'clamp(24px,3.4vw,32px)', fontWeight: 900, letterSpacing: '-.02em' }}>Un mode pensé pour la communauté</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)', gap: 14 }}>
              {VALUES.map(([ic, t, d], i) => (
                <Card key={t} delay={i * .06} style={{ padding: 22 }}>
                  <div style={{ fontSize: 26, marginBottom: 12 }}>{ic}</div>
                  <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800 }}>{t}</h3>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: C.muted }}>{d}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (notFound) return (
    <div className="uc-page" style={wrap}>{ambient}<div style={{ ...inner, maxWidth: 440, textAlign: 'center', paddingTop: 60 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🍂</div>
      <h2 style={{ margin: '0 0 8px' }}>Salon introuvable</h2>
      <p style={{ color: C.muted, marginBottom: 22 }}>Le code <b style={{ color: C.emeraldL }}>{code}</b> ne mène à aucune clairière.</p>
      <button onClick={leave} style={cta()}>Créer ou rejoindre un salon</button>
    </div></div>
  )
  if (!room || !g) return (
    <div className="uc-page" style={wrap}>{ambient}<div style={{ ...inner, maxWidth: 440, textAlign: 'center', paddingTop: 90, color: C.muted }}>Ouverture du passage vers <b style={{ color: C.emeraldL }}>{code}</b>…</div></div>
  )

  const topbar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
      <button onClick={leave} style={{ ...cta('rgba(255,255,255,.05)'), border: `1px solid ${C.hair}`, padding: '8px 14px', fontSize: 12, color: C.muted }}>← Quitter</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: hexA(C.emerald, .10), border: `1px solid ${hexA(C.emerald, .34)}`, borderRadius: 11, padding: '7px 13px' }}>
        <span style={{ fontSize: 11, color: C.muted }}>CODE</span>
        <strong style={{ fontSize: 17, letterSpacing: '.2em', color: C.emeraldL }}>{code}</strong>
        <button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/undercover?code=${code}`)} style={{ ...cta('rgba(255,255,255,.06)'), padding: '4px 10px', fontSize: 11, color: C.txt }}>Copier le lien</button>
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 13, color: C.muted }}>👥 {players.length}{g.undercoverCount ? ` · 🏴‍☠️ ${g.undercoverCount} pirate${g.undercoverCount > 1 ? 's' : ''}` : ''}{g.mode ? ` · ${g.mode === 'voice' ? '🎙️ Vocal' : '⌨️ Écrit'}` : ''}</div>
    </div>
  )

  // ════ LOBBY ════
  if (g.phase === 'lobby') {
    return (
      <div className="uc-page" style={wrap}>{ambient}<div style={{ ...inner, maxWidth: 680 }}>
        {topbar}
        {!amIn && (
          <div style={{ ...card, padding: 22, marginBottom: 16 }}>
            <div style={{ marginBottom: 10, fontWeight: 700 }}>Rejoins cette clairière</div>
            <button onClick={() => joinRoom({ code, userId, displayName, avatarUrl })
              .then(({ error }) => error ? setErr(error) : refresh(code))
              .catch(() => setErr('Connexion au salon impossible'))}
              style={cta()}>Rejoindre</button>
          </div>
        )}
        <div style={{ ...card, padding: 24 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900 }}>Salle d'attente 🌿</h2>
          <p style={{ color: C.muted, margin: '0 0 18px', fontSize: 13 }}>En attente de joueurs… (3 minimum)</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 22 }}>
            {players.map(p => (
              <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.03)', border: `1px solid ${C.hair}`, borderRadius: 999, padding: '6px 14px 6px 6px' }}>
                {avatar(p.user_id, 26)}<span style={{ fontSize: 13, fontWeight: 600 }}>{p.display_name}{p.is_host && ' 👑'}</span>
              </div>
            ))}
          </div>
          {isHost && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: C.faint, marginBottom: 9 }}>Mode de jeu</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[['voice', '🎙️ Vocal', 'On décrit à l’oral · 7s / tour'], ['text', '⌨️ Écrit', 'On tape l’indice · 10s / tour']].map(([m, label, sub]) => {
                  const on = mode === m
                  return (
                    <button key={m} onClick={() => setMode(m)} style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', background: on ? hexA(C.emerald, .16) : 'rgba(255,255,255,.03)', border: `1px solid ${on ? C.emerald : C.hair}`, color: C.txt }}>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{label}</div>
                      <div style={{ fontSize: 11.5, color: on ? C.emeraldL : C.faint, marginTop: 2 }}>{sub}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {err && <p role="alert" style={{ color: '#e08a6f', fontSize: 12.5, marginBottom: 10 }}>⚠ {err}</p>}
          {isHost
            ? <button onClick={startGame} disabled={players.length < 3} style={{ ...cta(), width: '100%', opacity: players.length < 3 ? .5 : 1 }}>{players.length < 3 ? `Encore ${3 - players.length} joueur(s)…` : '🌱 Démarrer la partie'}</button>
            : <div style={{ textAlign: 'center', color: C.muted, fontSize: 14 }}>En attente que l'hôte démarre…</div>}
        </div>
      </div></div>
    )
  }

  // ════ REVEAL ════
  if (g.phase === 'reveal') {
    return (
      <div className="uc-page" style={wrap}>{ambient}<div style={{ ...inner, maxWidth: 520 }}>
        {topbar}
        <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .4, ease }} style={{ ...card, textAlign: 'center', padding: '38px 26px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', color: C.faint, marginBottom: 14 }}>Ton personnage secret</div>
          <div style={{ fontSize: 'clamp(34px,7vw,54px)', fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1, marginBottom: 14, background: `linear-gradient(100deg, ${C.emeraldL}, ${C.sage}, ${C.bronze})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{myWord || '…'}</div>
          <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>Garde-le secret. Décris-le sans le nommer.</p>
          <p style={{ color: C.faint, fontSize: 12, marginTop: 12 }}>Tu ne sais pas si tu es marin ou pirate 🏴‍☠️</p>
        </motion.div>
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          {isHost ? <button onClick={startDescribing} style={cta()}>Lancer les descriptions →</button> : <span style={{ color: C.muted, fontSize: 13 }}>En attente que l'hôte lance…</span>}
        </div>
      </div></div>
    )
  }

  const clues = cluesFor(g.round)

  // ════ DESCRIBING ════
  if (g.phase === 'describing') {
    return (
      <div className="uc-page" style={wrap}>{ambient}<div style={{ ...inner, maxWidth: 680 }}>
        {topbar}
        <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 11, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: C.faint }}>Manche {g.round} · Passage {g.pass}/2</div>
        <div style={{ ...card, padding: 22, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            {avatar(currentUid, 30)}<span style={{ fontSize: 16, fontWeight: 800 }}>{myTurn ? 'À toi de décrire !' : `Au tour de ${nameByUid[currentUid] || '…'}`}</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,.06)', overflow: 'hidden', maxWidth: 320, margin: '0 auto' }}>
            <div style={{ height: '100%', width: `${(secsLeft / turnSec) * 100}%`, background: secsLeft <= 3 ? '#d98a5a' : `linear-gradient(90deg, ${C.emerald}, ${C.sage})`, transition: 'width .3s linear' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8, color: secsLeft <= 3 ? '#d98a5a' : C.txt }}>{secsLeft}s</div>
          {myTurn && (isVoice
            ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, margin: '14px auto 0', maxWidth: 420 }}>
                <div style={{ fontSize: 13, color: C.muted }}>🎙️ Décris ton perso à l’oral, puis valide.</div>
                <button onClick={markSpoke} disabled={myClueThisTurn} style={{ ...cta(), padding: '11px 26px', opacity: myClueThisTurn ? .5 : 1 }}>{myClueThisTurn ? '✓ C’est noté' : 'J’ai parlé →'}</button>
              </div>
            )
            : (
              <div style={{ display: 'flex', gap: 8, maxWidth: 420, margin: '14px auto 0' }}>
                <input value={clue} onChange={e => setClue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendClue() }} placeholder="Ton indice (sans dire le perso)…" aria-label="Ton indice" maxLength={40} disabled={myClueThisTurn} style={{ ...field, flex: 1, opacity: myClueThisTurn ? .5 : 1 }} autoFocus />
                <button onClick={sendClue} disabled={!clue.trim() || myClueThisTurn} style={{ ...cta(), padding: '0 20px', opacity: (!clue.trim() || myClueThisTurn) ? .5 : 1 }}>{myClueThisTurn ? '✓' : 'Dire'}</button>
              </div>
            ))}
          {myWord && <div style={{ marginTop: 14, fontSize: 12, color: C.faint }}>Ton perso : <b style={{ color: C.emeraldL }}>{myWord}</b></div>}
        </div>
        <div style={{ ...card, padding: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: C.faint, marginBottom: 14 }}>Indices</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(g.turnOrder || []).filter(u => alive.includes(u)).map(u => (
              <div key={u} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {avatar(u, 28)}<span style={{ fontSize: 13, fontWeight: 700, minWidth: 90 }}>{nameByUid[u]}{String(u) === String(userId) ? ' (toi)' : ''}</span>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[1, 2].map(pn => clues[u]?.[pn] != null && <span key={pn} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: `1px solid ${C.hair}` }}>{clues[u][pn]}</span>)}
                  {String(u) === String(currentUid) && <span style={{ fontSize: 11, color: C.emeraldL }}>✦ parle…</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div></div>
    )
  }

  // ════ VOTING ════
  if (g.phase === 'voting') {
    const tally = {}
    for (const v of elimVotes) tally[v.side] = (tally[v.side] || 0) + 1
    const voteSecs = g.voteDeadline ? Math.max(0, Math.ceil((new Date(g.voteDeadline).getTime() - now) / 1000)) : 0
    return (
      <div className="uc-page" style={wrap}>{ambient}<div style={{ ...inner, maxWidth: 600 }}>
        {topbar}
        <div style={{ ...card, padding: 24 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900 }}>Qui est le pirate ? 🏴‍☠️</h2>
          <p style={{ color: C.muted, margin: '0 0 6px', fontSize: 13 }}>Votez pour éliminer un suspect. {voteSecs}s</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            {alive.map(u => {
              const chosen = myElimVote === u
              const canVote = !myElimVote && alive.includes(String(userId)) && String(u) !== String(userId)
              return (
                <button key={u} onClick={() => canVote && voteElim(u)} disabled={!canVote} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, textAlign: 'left', cursor: canVote ? 'pointer' : 'default', background: chosen ? hexA(C.emerald, .16) : 'rgba(255,255,255,.03)', border: `1px solid ${chosen ? C.emerald : C.hair}`, color: C.txt, fontFamily: 'inherit' }}>
                  {avatar(u, 30)}<span style={{ flex: 1, fontWeight: 700 }}>{nameByUid[u]}{String(u) === String(userId) ? ' (toi)' : ''}</span>
                  {tally[u] ? <span style={{ fontSize: 12, fontWeight: 800, color: C.emeraldL }}>{tally[u]} vote{tally[u] > 1 ? 's' : ''}</span> : null}
                </button>
              )
            })}
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: C.faint, textAlign: 'center' }}>{myElimVote ? '✓ Vote enregistré — en attente des autres…' : alive.includes(String(userId)) ? 'À toi de voter.' : 'Tu es éliminé, tu regardes.'}</div>
        </div>
      </div></div>
    )
  }

  // ════ ENDED ════
  if (g.phase === 'ended') {
    const ucWin = g.winner === 'undercover'
    const reveal = g.reveal || { roles: {}, words: {} }
    return (
      <div className="uc-page" style={wrap}>{ambient}<div style={{ ...inner, maxWidth: 560 }}>
        {topbar}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, ease }} style={{ ...card, textAlign: 'center', padding: '38px 26px', borderColor: ucWin ? hexA(C.bronze, .45) : hexA(C.emerald, .4) }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>{ucWin ? '🏴‍☠️' : '🌿'}</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 900 }}>{ucWin ? "Les pirates l'emportent !" : 'Les marines gagnent !'}</h2>
          <p style={{ color: C.muted, margin: '0 0 18px' }}>Marines : <b style={{ color: C.txt }}>{reveal.words.civil}</b> · Pirate : <b style={{ color: C.bronze }}>{reveal.words.undercover}</b></p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', marginBottom: 22 }}>
            {Object.keys(reveal.roles).map(u => (
              <div key={u} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,.03)', border: `1px solid ${C.hair}` }}>
                {avatar(u, 28)}<span style={{ flex: 1, fontWeight: 700 }}>{nameByUid[u] || '?'}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: reveal.roles[u] === 'undercover' ? C.bronze : C.muted }}>{reveal.roles[u] === 'undercover' ? '🏴‍☠️ Pirate' : 'Marin'}</span>
              </div>
            ))}
          </div>
          {isHost ? <button onClick={replay} style={cta()}>🔄 Rejouer</button> : <span style={{ color: C.muted, fontSize: 13 }}>En attente de l'hôte…</span>}
        </motion.div>
      </div></div>
    )
  }

  return <div className="uc-page" style={wrap}>{ambient}<div style={inner}>{topbar}<div style={{ ...card, padding: 22 }}>Chargement…</div></div></div>
}
