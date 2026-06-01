import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import {
  createUndercoverRoom, fetchRoom, joinRoom, fetchPlayers, fetchAllVotes,
  submitClue, castElimVote, updateRoom, touchPlayer, subscribeRoom,
} from '../lib/undercoverRooms.js'

const C = {
  bg: '#0a0a0f', surface: '#15131c', surfaceFlat: '#161420',
  hair: 'rgba(255,255,255,.07)', hairTop: 'rgba(255,255,255,.10)',
  magenta: '#e0457b', magentaD: '#b1245a', green: '#46c08a',
  txt: '#f4f3f6', muted: 'rgba(244,243,246,.56)', faint: 'rgba(244,243,246,.34)',
}
const TURN_SECONDS = 30
const ease = [0.22, 0.61, 0.36, 1]
const shuffle = a => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[r[i], r[j]] = [r[j], r[i]] } return r }

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
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [clue, setClue] = useState('')
  const [now, setNow] = useState(Date.now())
  const [secret, setSecret] = useState(null)   // { role, word } — lu via RLS (privé)
  const actedRef = useRef('')   // dédoublonne l'action hôte par étape (anti double-avance)
  const autoJoinRef = useRef(false)

  const g = room?.rounds || null
  const isHost = room && String(room.host_user_id) === String(userId)
  const me = players.find(p => String(p.user_id) === String(userId))
  const amIn = Boolean(me)
  const nameByUid = useMemo(() => Object.fromEntries(players.map(p => [String(p.user_id), p.display_name || '?'])), [players])

  const refresh = useCallback(async (c = code) => {
    if (!c) return
    const r = await fetchRoom(c)
    if (!r || r._wrongType) { setNotFound(true); setRoom(null); return }
    setNotFound(false); setRoom(r)
    setPlayers(await fetchPlayers(c))
    setVotes(await fetchAllVotes(c))
  }, [code])

  useEffect(() => {
    if (!code) return
    refresh(code)
    const unsub = subscribeRoom(code, () => refresh(code))
    const ping = setInterval(() => userId && touchPlayer(code, userId), 25000)
    return () => { unsub(); clearInterval(ping) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, userId])

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t) }, [])

  // Récupère MON secret (rôle + perso) via RLS — jamais exposé aux autres.
  useEffect(() => {
    if (!code || !userId || !supabase) { setSecret(null); return }
    if (!g || !['reveal', 'describing', 'voting'].includes(g.phase)) { setSecret(null); return }
    let ignore = false
    supabase.from('undercover_secrets').select('role,word').eq('room_code', code).eq('user_id', String(userId)).maybeSingle()
      .then(({ data }) => { if (!ignore) setSecret(data || null) })
    return () => { ignore = true }
  }, [code, userId, g?.phase, g?.round])

  // Auto-join sur lien ?code=
  useEffect(() => {
    if (!room || !code || amIn || autoJoinRef.current || !isAuthenticated) return
    autoJoinRef.current = true
    joinRoom({ code, userId, displayName, avatarUrl }).then(() => refresh(code))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, players, code, isAuthenticated])

  const alive = g?.alive || []
  const myRole = secret?.role || null
  const myWord = secret?.word || null
  const currentUid = g?.turnOrder?.[g?.turnIdx] ?? null
  const myTurn = g?.phase === 'describing' && String(currentUid) === String(userId)
  const secsLeft = g?.turnDeadline ? Math.max(0, Math.ceil((new Date(g.turnDeadline).getTime() - now) / 1000)) : 0

  const cluesFor = useCallback((round) => {
    const out = {}
    for (const v of votes) {
      const m = v.match_id.match(/^clue:(\d+):(\d+)$/)
      if (m && Number(m[1]) === round) { (out[String(v.user_id)] ||= {})[Number(m[2])] = v.side }
    }
    return out
  }, [votes])
  const myClueThisTurn = g && votes.some(v => v.match_id === `clue:${g.round}:${g.pass}` && String(v.user_id) === String(userId))
  const elimVotes = useMemo(() => votes.filter(v => g && v.match_id === `elim:${g.round}`), [votes, g])
  const myElimVote = elimVotes.find(v => String(v.user_id) === String(userId))?.side || null

  // Appel API sécurisé (assign/resolve) — hôte uniquement, vérifié côté serveur.
  const callApi = useCallback(async (action) => {
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      const r = await fetch(`/api/tierlists?action=${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(j.error || 'Erreur serveur'); return false }
      return true
    } catch (e) { setErr(e?.message || 'Réseau'); return false }
  }, [code])

  // HÔTE : avance le tour (non secret → écriture directe du JSONB).
  const advanceTurn = useCallback((curG) => {
    let { turnIdx, pass, turnOrder } = curG
    turnIdx += 1
    if (turnIdx >= turnOrder.length) { turnIdx = 0; pass += 1 }
    const patch = pass > 2
      ? { phase: 'voting', voteDeadline: new Date(Date.now() + 45000).toISOString() }
      : { phase: 'describing', turnIdx, pass, turnDeadline: new Date(Date.now() + TURN_SECONDS * 1000).toISOString() }
    return updateRoom(code, { rounds: { ...curG, ...patch } })
  }, [code])

  // Effet hôte : descriptions. Dédoublonné par clé d'étape pour ne pas avancer 2×
  // tant que le realtime n'a pas renvoyé le nouvel état.
  useEffect(() => {
    if (!isHost || g?.phase !== 'describing') return
    const key = `desc:${g.round}:${g.pass}:${g.turnIdx}`
    if (actedRef.current === key) return
    const speakerDone = votes.some(v => v.match_id === `clue:${g.round}:${g.pass}` && String(v.user_id) === String(currentUid))
    const timedOut = g.turnDeadline && now >= new Date(g.turnDeadline).getTime()
    if (speakerDone || timedOut) { actedRef.current = key; advanceTurn(g) }
  }, [isHost, g, votes, currentUid, now, advanceTurn])

  // Effet hôte : résolution du vote (via API, qui a accès aux rôles secrets).
  useEffect(() => {
    if (!isHost || g?.phase !== 'voting') return
    const key = `resolve:${g.round}`
    if (actedRef.current === key) return
    const allVoted = alive.length > 0 && alive.every(u => elimVotes.some(v => String(v.user_id) === u))
    const timedOut = g.voteDeadline && now >= new Date(g.voteDeadline).getTime()
    if (allVoted || timedOut) { actedRef.current = key; callApi('uc_resolve') }
  }, [isHost, g, elimVotes, alive, now, callApi])

  // ── Actions ──
  async function handleCreate() {
    setErr(''); setBusy(true)
    const { code: c, error } = await createUndercoverRoom({ hostUserId: userId, displayName, avatarUrl })
    setBusy(false)
    if (error) { setErr('Création impossible : ' + error); return }
    setParams({ code: c }); setCode(c)
  }
  async function handleJoin(e) {
    e?.preventDefault?.(); setErr(''); setBusy(true)
    const c = joinCode.trim().toUpperCase()
    if (!c) { setErr('Entre un code'); setBusy(false); return }
    const { error } = await joinRoom({ code: c, userId, displayName, avatarUrl })
    setBusy(false)
    if (error) { setErr(error === 'introuvable' ? 'Salon introuvable' : error); return }
    setParams({ code: c }); setCode(c)
  }
  async function startGame() {
    if (players.length < 3) return
    setErr(''); await callApi('uc_assign')
  }
  function startDescribing() {
    updateRoom(code, { rounds: { ...g, phase: 'describing', turnDeadline: new Date(Date.now() + TURN_SECONDS * 1000).toISOString() } })
  }
  function sendClue() {
    const t = clue.trim()
    if (!t || !myTurn || myClueThisTurn) return
    setClue('')
    submitClue({ code, round: g.round, pass: g.pass, userId, clue: t })
  }
  function voteElim(targetUid) {
    if (myElimVote || !alive.includes(String(userId))) return
    castElimVote({ code, round: g.round, userId, targetUid })
  }
  function replay() { if (isHost) updateRoom(code, { status: 'lobby', rounds: { phase: 'lobby' } }) }
  function leave() { setParams({}); setCode(''); setRoom(null); setNotFound(false); autoJoinRef.current = false }

  // ── Styles ──
  const wrap = { position: 'relative', minHeight: '100vh', background: C.bg, color: C.txt, paddingTop: 88, paddingBottom: 60, fontFamily: "'Inter',system-ui,sans-serif", overflowX: 'hidden' }
  const inner = { position: 'relative', zIndex: 1, width: 'min(840px, calc(100% - 28px))', margin: '0 auto' }
  const card = { background: C.surface, border: `1px solid ${C.hair}`, borderTop: `1px solid ${C.hairTop}`, borderRadius: 18, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,.4)' }
  const cta = (bg = `linear-gradient(135deg, ${C.magenta}, ${C.magentaD})`) => ({ padding: '13px 22px', borderRadius: 12, border: 'none', background: bg, color: '#fff', fontWeight: 900, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' })
  const field = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 11, background: C.surfaceFlat, border: `1px solid ${C.hair}`, color: C.txt, fontSize: 14, fontFamily: 'inherit', outline: 'none' }
  const ambient = <div aria-hidden style={{ position: 'fixed', inset: 0, top: 72, zIndex: 0, pointerEvents: 'none', background: `radial-gradient(900px 480px at 78% -8%, rgba(224,69,123,.10), transparent 58%), radial-gradient(820px 520px at 10% 4%, rgba(224,69,123,.05), transparent 60%)` }} />
  const avatar = (uid, size = 34) => {
    const p = players.find(x => String(x.user_id) === String(uid))
    const n = (p?.display_name || '?')[0].toUpperCase()
    return p?.avatar_url
      ? <img src={p.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
      : <span style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: size * 0.42, fontWeight: 800, background: 'rgba(224,69,123,.16)', border: `1px solid rgba(224,69,123,.4)`, color: '#fff' }}>{n}</span>
  }
  const backBtn = <button onClick={() => navigate('/tournoi')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 13px', marginBottom: 22, borderRadius: 10, border: `1px solid ${C.hair}`, background: 'transparent', color: C.muted, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>← Retour</button>

  // Connexion requise (les secrets sont protégés par compte).
  if (!authLoading && !isAuthenticated) {
    return (
      <div style={wrap}>{ambient}<div style={{ ...inner, maxWidth: 460, textAlign: 'center', paddingTop: 50 }}>
        {backBtn}
        <div style={{ ...card, padding: '34px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🕵️</div>
          <h2 style={{ margin: '0 0 8px' }}>Undercover</h2>
          <p style={{ color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>Connecte-toi avec Discord pour jouer — ton rôle secret est protégé par ton compte (impossible à tricher).</p>
          <button onClick={() => auth.signInWithDiscord?.()} style={cta()}>Se connecter avec Discord</button>
        </div>
      </div></div>
    )
  }

  // ════ Accueil ════
  if (!code) {
    return (
      <div style={wrap}>{ambient}<div style={inner}>
        {backBtn}
        <div style={{ marginBottom: 26 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '6px 13px', borderRadius: 999, fontSize: 10.5, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: '#f9a8d4', background: 'rgba(224,69,123,.10)', border: '1px solid rgba(224,69,123,.28)' }}>🕵️ Multijoueur · temps réel</div>
          <h1 style={{ fontSize: 'clamp(30px,4.6vw,46px)', fontWeight: 900, margin: '0 0 12px', letterSpacing: '-.03em', lineHeight: 1.05 }}>
            Undercover <span style={{ background: `linear-gradient(100deg, ${C.magenta}, #f9a8d4)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Anime</span>
          </h1>
          <p style={{ color: C.muted, margin: 0, fontSize: 15.5, lineHeight: 1.6, maxWidth: 540 }}>
            Chacun reçoit un perso secret. Les civils ont le même… sauf le ou les <b style={{ color: '#f9a8d4' }}>intrus</b>. Décrivez votre perso à tour de rôle (30s), puis votez pour démasquer l'intrus !
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          <div style={card}>
            <button onClick={handleCreate} disabled={busy} style={{ ...cta(), width: '100%', opacity: busy ? .6 : 1 }}>{busy ? '⏳ Création…' : '⚔️ Créer un salon'}</button>
            <p style={{ textAlign: 'center', fontSize: 11.5, color: C.faint, margin: '11px 0 0' }}>3 joueurs minimum · un code privé est généré.</p>
          </div>
          <form onSubmit={handleJoin} style={{ ...card, background: C.surfaceFlat }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: C.faint, marginBottom: 14 }}>Rejoindre avec un code</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="CODE" maxLength={6} style={{ ...field, flex: 1, textTransform: 'uppercase', letterSpacing: '.4em', fontWeight: 900, fontSize: 20, textAlign: 'center' }} />
              <button type="submit" disabled={busy || !joinCode.trim()} style={{ ...cta('rgba(255,255,255,.07)'), border: `1px solid ${C.hairTop}`, opacity: (busy || !joinCode.trim()) ? .5 : 1 }}>Rejoindre</button>
            </div>
            {err && <p role="alert" style={{ color: '#f3849b', margin: '12px 0 0', fontSize: 12.5, textAlign: 'center' }}>⚠ {err}</p>}
          </form>
        </div>
      </div></div>
    )
  }

  if (notFound) return (
    <div style={wrap}>{ambient}<div style={{ ...inner, maxWidth: 440, textAlign: 'center', paddingTop: 60 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
      <h2 style={{ margin: '0 0 8px' }}>Salon introuvable</h2>
      <p style={{ color: C.muted, marginBottom: 22 }}>Le code <b style={{ color: '#f9a8d4' }}>{code}</b> ne correspond à aucun salon Undercover.</p>
      <button onClick={leave} style={cta()}>Créer ou rejoindre un salon</button>
    </div></div>
  )
  if (!room || !g) return (
    <div style={wrap}>{ambient}<div style={{ ...inner, maxWidth: 440, textAlign: 'center', paddingTop: 90, color: C.muted }}>Connexion au salon <b style={{ color: '#f9a8d4' }}>{code}</b>…</div></div>
  )

  const topbar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
      <button onClick={leave} style={{ ...cta('rgba(255,255,255,.06)'), padding: '8px 14px', fontSize: 12 }}>← Quitter</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(224,69,123,.12)', border: '1px solid rgba(224,69,123,.4)', borderRadius: 10, padding: '7px 13px' }}>
        <span style={{ fontSize: 11, color: C.muted }}>CODE</span>
        <strong style={{ fontSize: 17, letterSpacing: '.2em', color: '#f9a8d4' }}>{code}</strong>
        <button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/undercover?code=${code}`)} style={{ ...cta('rgba(255,255,255,.08)'), padding: '4px 10px', fontSize: 11 }}>Copier le lien</button>
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 13, color: C.muted }}>👥 {players.length}{g.undercoverCount ? ` · 🕵️ ${g.undercoverCount} intrus` : ''}</div>
    </div>
  )

  // ════ LOBBY ════
  if (g.phase === 'lobby') {
    return (
      <div style={wrap}>{ambient}<div style={inner}>
        {topbar}
        {!amIn && (
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ marginBottom: 10, fontWeight: 700 }}>Rejoins ce salon</div>
            <button onClick={() => joinRoom({ code, userId, displayName, avatarUrl }).then(() => refresh(code))} style={cta()}>Rejoindre</button>
          </div>
        )}
        <div style={card}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900 }}>Salle d'attente</h2>
          <p style={{ color: C.muted, margin: '0 0 18px', fontSize: 13 }}>En attente de joueurs… (3 minimum)</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 22 }}>
            {players.map(p => (
              <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.04)', border: `1px solid ${C.hair}`, borderRadius: 999, padding: '6px 14px 6px 6px' }}>
                {avatar(p.user_id, 26)}<span style={{ fontSize: 13, fontWeight: 600 }}>{p.display_name}{p.is_host && ' 👑'}</span>
              </div>
            ))}
          </div>
          {err && <p role="alert" style={{ color: '#f3849b', fontSize: 12.5, marginBottom: 10 }}>⚠ {err}</p>}
          {isHost
            ? <button onClick={startGame} disabled={players.length < 3} style={{ ...cta(), width: '100%', opacity: players.length < 3 ? .5 : 1 }}>{players.length < 3 ? `Encore ${3 - players.length} joueur(s)…` : '🎬 Démarrer la partie'}</button>
            : <div style={{ textAlign: 'center', color: C.muted, fontSize: 14 }}>En attente que l'hôte démarre…</div>}
        </div>
      </div></div>
    )
  }

  // ════ REVEAL ════
  if (g.phase === 'reveal') {
    return (
      <div style={wrap}>{ambient}<div style={{ ...inner, maxWidth: 520 }}>
        {topbar}
        <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .4, ease }}
          style={{ ...card, textAlign: 'center', padding: '34px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', color: C.faint, marginBottom: 14 }}>Ton personnage secret</div>
          <div style={{ fontSize: 'clamp(34px,7vw,54px)', fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1, marginBottom: 14, background: `linear-gradient(100deg, ${C.magenta}, #f9a8d4)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{myWord || '…'}</div>
          <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>Garde-le secret ! Décris-le sans le nommer.</p>
          <p style={{ color: C.faint, fontSize: 12, marginTop: 12 }}>Tu ne sais pas si tu es civil ou intrus 😏</p>
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
      <div style={wrap}>{ambient}<div style={inner}>
        {topbar}
        <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 11, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: C.faint }}>Manche {g.round} · Passage {g.pass}/2</div>
        <div style={{ ...card, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            {avatar(currentUid, 30)}
            <span style={{ fontSize: 16, fontWeight: 800 }}>{myTurn ? 'À toi de décrire !' : `Au tour de ${nameByUid[currentUid] || '…'}`}</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,.07)', overflow: 'hidden', maxWidth: 320, margin: '0 auto' }}>
            <div style={{ height: '100%', width: `${(secsLeft / TURN_SECONDS) * 100}%`, background: secsLeft <= 8 ? '#e0524a' : `linear-gradient(90deg, ${C.magenta}, #f9a8d4)`, transition: 'width .3s linear' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8, color: secsLeft <= 8 ? '#e0524a' : C.txt }}>{secsLeft}s</div>
          {myTurn && (
            <div style={{ display: 'flex', gap: 8, maxWidth: 420, margin: '14px auto 0' }}>
              <input value={clue} onChange={e => setClue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendClue() }}
                placeholder="Ton indice (sans dire le perso)…" maxLength={40} disabled={myClueThisTurn}
                style={{ ...field, flex: 1, opacity: myClueThisTurn ? .5 : 1 }} autoFocus />
              <button onClick={sendClue} disabled={!clue.trim() || myClueThisTurn} style={{ ...cta(), padding: '0 20px', opacity: (!clue.trim() || myClueThisTurn) ? .5 : 1 }}>{myClueThisTurn ? '✓' : 'Dire'}</button>
            </div>
          )}
          {myWord && <div style={{ marginTop: 14, fontSize: 12, color: C.faint }}>Ton perso : <b style={{ color: '#f9a8d4' }}>{myWord}</b></div>}
        </div>
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: C.faint, marginBottom: 14 }}>Indices</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(g.turnOrder || []).filter(u => alive.includes(u)).map(u => (
              <div key={u} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {avatar(u, 28)}
                <span style={{ fontSize: 13, fontWeight: 700, minWidth: 90 }}>{nameByUid[u]}{String(u) === String(userId) ? ' (toi)' : ''}</span>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[1, 2].map(pn => clues[u]?.[pn] != null && (
                    <span key={pn} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 8, background: 'rgba(255,255,255,.05)', border: `1px solid ${C.hair}` }}>{clues[u][pn]}</span>
                  ))}
                  {String(u) === String(currentUid) && <span style={{ fontSize: 11, color: '#f9a8d4' }}>✦ parle…</span>}
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
      <div style={wrap}>{ambient}<div style={inner}>
        {topbar}
        <div style={card}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900 }}>Qui est l'intrus ? 🕵️</h2>
          <p style={{ color: C.muted, margin: '0 0 6px', fontSize: 13 }}>Votez pour éliminer un suspect. {voteSecs}s</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            {alive.map(u => {
              const chosen = myElimVote === u
              const canVote = !myElimVote && alive.includes(String(userId)) && String(u) !== String(userId)
              return (
                <button key={u} onClick={() => canVote && voteElim(u)} disabled={!canVote}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, textAlign: 'left', cursor: canVote ? 'pointer' : 'default', background: chosen ? 'rgba(224,69,123,.16)' : 'rgba(255,255,255,.04)', border: `1px solid ${chosen ? C.magenta : C.hair}`, color: C.txt, fontFamily: 'inherit' }}>
                  {avatar(u, 30)}
                  <span style={{ flex: 1, fontWeight: 700 }}>{nameByUid[u]}{String(u) === String(userId) ? ' (toi)' : ''}</span>
                  {tally[u] ? <span style={{ fontSize: 12, fontWeight: 800, color: '#f9a8d4' }}>{tally[u]} vote{tally[u] > 1 ? 's' : ''}</span> : null}
                </button>
              )
            })}
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: C.faint, textAlign: 'center' }}>
            {myElimVote ? '✓ Vote enregistré — en attente des autres…' : alive.includes(String(userId)) ? 'À toi de voter.' : 'Tu es éliminé, tu regardes.'}
          </div>
        </div>
      </div></div>
    )
  }

  // ════ ENDED ════
  if (g.phase === 'ended') {
    const ucWin = g.winner === 'undercover'
    const reveal = g.reveal || { roles: {}, words: {} }
    return (
      <div style={wrap}>{ambient}<div style={{ ...inner, maxWidth: 560 }}>
        {topbar}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, ease }}
          style={{ ...card, textAlign: 'center', padding: '36px 24px', borderColor: ucWin ? 'rgba(224,69,123,.5)' : 'rgba(70,192,138,.4)' }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>{ucWin ? '🕵️' : '🎉'}</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 900 }}>{ucWin ? "Les intrus l'emportent !" : 'Les civils gagnent !'}</h2>
          <p style={{ color: C.muted, margin: '0 0 18px' }}>Civils : <b style={{ color: C.txt }}>{reveal.words.civil}</b> · Intrus : <b style={{ color: '#f9a8d4' }}>{reveal.words.undercover}</b></p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', marginBottom: 22 }}>
            {Object.keys(reveal.roles).map(u => (
              <div key={u} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: `1px solid ${C.hair}` }}>
                {avatar(u, 28)}
                <span style={{ flex: 1, fontWeight: 700 }}>{nameByUid[u] || '?'}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: reveal.roles[u] === 'undercover' ? '#f9a8d4' : C.muted }}>{reveal.roles[u] === 'undercover' ? '🕵️ Intrus' : 'Civil'}</span>
              </div>
            ))}
          </div>
          {isHost ? <button onClick={replay} style={cta()}>🔄 Rejouer</button> : <span style={{ color: C.muted, fontSize: 13 }}>En attente de l'hôte…</span>}
        </motion.div>
      </div></div>
    )
  }

  return <div style={wrap}>{ambient}<div style={inner}>{topbar}<div style={card}>Chargement…</div></div></div>
}
