// Guess Who — orchestration du salon : rejoindre, état, horloge serveur,
// boucle d'avancement (hôte, ou filet de sécurité pour les autres), présence,
// reprise d'hôte. Les écrans ne font que lire ce hook et appeler `act`.
//
// Robustesse : une seule requête de synchro (guesswho_sync) sondée en continu
// en plus du realtime, réponses périmées ignorées, resynchro complète au
// réveil d'un onglet (iPhone en veille), reconnexion du canal, nouvelles
// tentatives réseau, horloge recalée en continu. Sans la migration 20261002b,
// tout retombe sur les anciennes fonctions.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as api from '../../lib/guessWhoRooms.js'
import { logEvent } from '../../lib/guessWhoLog.js'
import {
  remainingSec, shouldAdvance, isDone, phaseTotal, advanceRetryMs,
  clockSample, addSample, bestOffset, backoffMs, pollMs,
} from './logic/clock.js'
import { takeNotice, joinNotice } from './logic/notices.js'
import { addHighlight, highlightsFromStats, mergeHighlights } from './logic/highlights.js'

const SHOW_TAKES = ['vote', 'revote', 'result', 'gage']
const SHOW_STATS = ['result', 'gage', 'end']
// Phases où un spectateur peut obtenir une place (le serveur tranche).
const OPEN = ['lobby', 'end', 'gages', 'listen']
const OFFLINE_AFTER_MS = 8000

export function useGuessWhoRoom({ code, identity }) {
  const [status, setStatus] = useState('joining')
  const [error, setError] = useState(null)
  const [join, setJoin] = useState({ roomId: null, spectator: false, reason: null, late: false })
  const [state, setState] = useState({ room: null, players: [] })
  const [prog, setProg] = useState(null)
  const [takes, setTakes] = useState([])
  const [stats, setStats] = useState(null)
  const [mine, setMine] = useState(null) // { vote, gage, has_take } renvoyé par guesswho_sync
  const [notice, setNotice] = useState(null)
  const [highlights, setHighlights] = useState([])
  const [live, setLive] = useState(false)
  const [offline, setOffline] = useState(false)
  const [hidden, setHidden] = useState(typeof document !== 'undefined' && document.visibilityState === 'hidden')
  const [now, setNow] = useState(Date.now())

  const offset = useRef(0)
  const samples = useRef([])
  const seq = useRef(0)          // numéro de la dernière synchro envoyée
  const applied = useRef(0)      // numéro de la dernière synchro appliquée
  const lastOk = useRef(Date.now())
  const asPlayer = useRef(false) // jeton valide pour ce salon
  const advancing = useRef(false)
  const lastAdvance = useRef({ key: null, at: 0, wait: 0 })
  const lastRejoin = useRef(0)
  const lastPromote = useRef(0)
  const idRef = useRef(identity)
  idRef.current = identity
  const userId = identity?.userId ? String(identity.userId) : null

  // Journal : durée de chaque coupure (> 8 s, seuil de `offline`).
  const offlineSince = useRef(null)
  useEffect(() => {
    if (offline) { offlineSince.current = Date.now() - OFFLINE_AFTER_MS; return }
    if (offlineSince.current == null) return
    const s = Math.round((Date.now() - offlineSince.current) / 1000)
    offlineSince.current = null
    logEvent(code, userId, 'offline', `${s}s`)
  }, [offline, code, userId])

  // ── Synchro (ordre garanti : une réponse plus ancienne n'écrase jamais) ─────
  const rejoinRef = useRef(() => {})
  const refresh = useCallback(async () => {
    const id = ++seq.current
    const sent = Date.now()
    const out = await api.sync(code, { asPlayer: asPlayer.current })
    const recv = Date.now()
    if (!out?.room) {
      if (Date.now() - lastOk.current > OFFLINE_AFTER_MS) setOffline(true)
      return
    }
    if (id < applied.current) return
    applied.current = id
    lastOk.current = recv
    setOffline(false)
    const sample = clockSample(sent, recv, out.now)
    if (sample) {
      samples.current = addSample(samples.current, sample)
      offset.current = bestOffset(samples.current, offset.current)
    }
    setState({ room: out.room, players: out.players || [] })
    if (out.progress) setProg(out.progress)
    setMine(out.me && !out.me.error ? out.me : null)
    // Jeton refusé (place supprimée au lancement, salon purgé…) : on redemande.
    if (out.me?.error === 'unauthorized' && asPlayer.current) rejoinRef.current()
  }, [code])

  // ── Rejoindre (avec nouvelles tentatives si le réseau lâche) ────────────────
  const doJoin = useCallback(async () => {
    const id = idRef.current
    const r = await api.joinRoom({ code, userId: String(id.userId), displayName: id.displayName, avatarUrl: id.avatarUrl })
    if (!r.error) {
      asPlayer.current = !r.spectator
      setJoin(r)
      setError(null)
      const n = joinNotice(r)
      if (n) setNotice(n)
    }
    return r
  }, [code])

  rejoinRef.current = () => {
    if (Date.now() - lastRejoin.current < 8000) return
    lastRejoin.current = Date.now()
    doJoin().then((r) => { if (!r.error) refresh() })
  }

  useEffect(() => {
    if (!userId) return
    let alive = true, timer, attempt = 0
    setStatus('joining')
    const go = async () => {
      // Premier recalage d'horloge en parallèle (utile sans la migration 20261002b).
      const t0 = Date.now()
      const [server, r] = await Promise.all([api.serverNow(), doJoin()])
      if (!alive) return
      if (!samples.current.length) offset.current = server - (t0 + Date.now()) / 2
      if (r.error) {
        if (r.network) { // réseau : on réessaie sans afficher « introuvable »
          setError(r.error); setOffline(true)
          timer = setTimeout(go, backoffMs(attempt++))
          return
        }
        setError(r.error); setStatus('error'); return
      }
      await refresh()
      if (alive) setStatus('ready')
    }
    go()
    return () => { alive = false; clearTimeout(timer) }
  }, [userId, doJoin, refresh])

  // Nom / avatar chargés après coup (profil Discord) : mise à jour silencieuse.
  const displayName = identity?.displayName
  const avatarUrl = identity?.avatarUrl
  const firstProfile = useRef(true)
  useEffect(() => {
    if (firstProfile.current) { firstProfile.current = false; return }
    if (status === 'ready' && asPlayer.current) doJoin()
  }, [displayName, avatarUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime + sondage adaptatif ────────────────────────────────────────────
  const channel = useRef(null)
  useEffect(() => {
    if (!join.roomId) return
    const off = api.subscribeRoom(join.roomId, () => refresh(), (st) => setLive(st === 'SUBSCRIBED'))
    channel.current = off
    return () => { channel.current = null; off() }
  }, [join.roomId, refresh])

  const phase = state.room?.phase
  const round = state.room?.round
  const pollRef = useRef({ phase, live, hidden })
  pollRef.current = { phase, live, hidden }
  useEffect(() => {
    if (status !== 'ready') return
    let timer, alive = true
    const loop = async () => {
      await refresh()
      if (alive) timer = setTimeout(loop, pollMs(pollRef.current))
    }
    timer = setTimeout(loop, pollMs(pollRef.current))
    return () => { alive = false; clearTimeout(timer) }
  }, [status, refresh])

  // Réveil (onglet revenu, iPhone sorti de veille, réseau retrouvé) : resynchro
  // complète tout de suite, canal realtime reconstruit s'il est tombé.
  const liveRef = useRef(live)
  liveRef.current = live
  useEffect(() => {
    if (typeof document === 'undefined') return
    let lastWake = 0
    const wake = () => {
      const isHidden = document.visibilityState === 'hidden'
      setHidden(isHidden)
      if (isHidden || Date.now() - lastWake < 1000) return
      lastWake = Date.now()
      refresh()
      if (!liveRef.current) channel.current?.reconnect?.()
    }
    const onOffline = () => setOffline(true)
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('focus', wake)
    window.addEventListener('online', wake)
    window.addEventListener('pageshow', wake)
    window.addEventListener('offline', onOffline)
    return () => {
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('focus', wake)
      window.removeEventListener('online', wake)
      window.removeEventListener('pageshow', wake)
      window.removeEventListener('offline', onOffline)
    }
  }, [refresh])

  // Tic d'horloge (heure serveur estimée)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset.current), 250)
    return () => clearInterval(t)
  }, [])

  const { room, players } = state
  const me = useMemo(() => players.find((p) => p.user_id === userId) || null, [players, userId])
  const isHost = !!me?.is_host

  // Joueur qui n'apparaît plus dans la liste (supprimé au lancement car absent) :
  // on redemande une place, le serveur répond « spectateur » si la partie tourne.
  useEffect(() => {
    if (status === 'ready' && asPlayer.current && players.length && !me) rejoinRef.current()
  }, [status, players, me])

  // Spectateur : place automatique dès qu'une phase le permet (salon, fin,
  // gages, début de tour). Jamais pour un compte déjà assis ailleurs.
  useEffect(() => {
    if (status !== 'ready' || !join.spectator || join.reason === 'seat_taken') return
    if (OPEN.includes(phase)) rejoinRef.current()
  }, [status, join.spectator, join.reason, phase, round])

  // ── Imitations du tour, visibles à partir du vote (réessaie si le réseau lâche)
  useEffect(() => {
    if (!SHOW_TAKES.includes(phase)) {
      setTakes([])
      if (phase === 'gages') { setHighlights([]); setStats(null) } // nouvelle partie
      return
    }
    let alive = true, timer, attempt = 0
    // Instantané du verdict au moment où la phase commence (résultat + son du tour).
    const res = room?.last_result
    const clipTitle = room?.clip?.title
    const load = async () => {
      const t = await api.fetchTakes(code, round)
      if (!alive) return
      if (t === null) { timer = setTimeout(load, backoffMs(attempt++, 4000)); return }
      setTakes(t)
      if (phase === 'result') setHighlights((h) => addHighlight(h, res, t, clipTitle))
    }
    load()
    return () => { alive = false; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, phase, round])

  // ── Récap serveur (meilleures imitations, prix) : après chaque verdict et à la fin
  useEffect(() => {
    if (!SHOW_STATS.includes(phase)) return
    let alive = true, timer, attempt = 0
    const load = async () => {
      const s = await api.fetchStats(code)
      if (!alive || s === false) return
      if (s === null) { if (attempt < 4) timer = setTimeout(load, backoffMs(attempt++, 4000)); return }
      setStats(s)
      setHighlights((h) => mergeHighlights(h, highlightsFromStats(s)))
    }
    load()
    return () => { alive = false; clearTimeout(timer) }
  }, [code, phase, round])

  // ── Reprise d'hôte : faite par le serveur dans guesswho_sync ; ici seulement
  // si la migration 20261002b manque (au plus une demande toutes les 5 s).
  useEffect(() => {
    if (api.hasServerSync() || join.spectator || !me || isHost || !players.length) return
    if (players.some((p) => p.is_host && p.connected)) return
    if (Date.now() - lastPromote.current < 5000) return
    lastPromote.current = Date.now()
    api.promoteHost(code).then(refresh)
  }, [code, players, me, isHost, join.spectator, refresh])

  // ── Boucle d'avancement (idempotente côté serveur, freinée côté client) ─────
  const endsAtMs = room?.phase_ends_at ? new Date(room.phase_ends_at).getTime() : null
  const done = isDone(phase, players, prog)
  useEffect(() => {
    if (!me || advancing.current || !phase) return
    if (!shouldAdvance({ endsAtMs, nowMs: now, isHost, done })) return
    const key = `${phase}:${round}`
    const last = lastAdvance.current
    if (last.key === key && Date.now() - last.at < last.wait) return
    advancing.current = true
    lastAdvance.current = { key, at: Date.now(), wait: 1500 }
    api.advance(code, phase, round)
      .then((r) => { lastAdvance.current.wait = advanceRetryMs(r) })
      .then(refresh)
      .finally(() => { advancing.current = false })
  }, [code, me, isHost, phase, round, endsAtMs, now, done, refresh])

  const act = useMemo(() => ({
    start: async (settings) => { const r = await api.startGame(code, settings); await refresh(); return r },
    gage: async (text) => { const r = await api.submitGage(code, text); await refresh(); return r },
    take: async (url, duration) => {
      const r = await api.submitTake(code, url, duration, round)
      setNotice(takeNotice(r))
      await refresh()
      return r
    },
    vote: async (target) => { const r = await api.castVote(code, target); await refresh(); return r },
    skip: async () => { const r = await api.skipClip(code); await refresh(); return r },
    // Salon d'attente : « prêt » (indicatif). { error: 'unsupported' } sans la migration.
    ready: async (on = true) => { const r = await api.setReady(code, on); await refresh(); return r },
    // Demander une place tout de suite (spectateur).
    rejoin: async () => { lastRejoin.current = 0; const r = await doJoin(); await refresh(); return r },
  }), [code, round, refresh, doJoin])

  const settings = room?.settings || {}
  const roundsMax = Number(settings.rounds) || 0
  return {
    status, error, spectator: join.spectator, reason: join.reason,
    room, players, me, isHost, prog, takes, notice, highlights, clearNotice: () => setNotice(null),
    remaining: remainingSec(room?.phase_ends_at, now),
    total: phaseTotal(room),
    maxLives: settings.lives || 2,
    refresh, act,
    // ── Ajouts (rétro-compatibles) ──
    // 'ok' | 'reconnecting' : bandeau de connexion
    connection: offline ? 'reconnecting' : 'ok',
    live,               // canal realtime abonné
    late: join.late,    // place obtenue en cours de partie
    stats,              // récap serveur (guesswho_stats) ou null
    roundsMax,          // 0 = illimité
    isLastRound: roundsMax > 0 && round === roundsMax,
    serverNow: now,     // heure serveur estimée (ms)
    myVote: mine?.vote ?? null,      // ma cible au vote/revote en cours (après rechargement)
    myGage: mine?.gage ?? null,      // texte de mon gage
    myTake: !!mine?.has_take,        // mon imitation du tour est arrivée
  }
}
