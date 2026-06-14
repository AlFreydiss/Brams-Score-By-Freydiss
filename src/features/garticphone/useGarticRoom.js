// Brams Phone — hook d'orchestration du salon (glue de la machine à états).
// Responsabilités : identité + join (token secret), abonnement realtime (gartic_rooms),
// canal presence/broadcast (liveness + signaux basse latence), dérivation de ma tâche,
// horloge serveur calibrée, heartbeat, boucle hôte (avance au timeout / quand tout
// le monde a soumis — le serveur comble les manquants), migration d'hôte serveur.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  joinRoom, roomState, fetchPrevPage,
  submitPage, submittedSeats as apiSubmittedSeats, fetchAllPages,
  setReady as apiSetReady, touchPlayer, startGame, advance as apiAdvance,
  promoteSelfHost, serverNow, subscribeRoom, joinChannel,
} from '../../lib/garticRooms.js'
import { seatTask } from './logic/rotation.js'
import { shouldAdvance } from './logic/hostLoop.js'

const HOST_DEAD_MS = 22000 // hôte sans heartbeat depuis >22s = décroché

export function useGarticRoom({ code, userId, displayName, avatarUrl }) {
  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [pages, setPages] = useState([])
  const [presence, setPresence] = useState(() => new Set()) // user_ids présents (canal realtime)
  const [spectator, setSpectator] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReadyState] = useState(false) // état de chargement initial
  const [tick, setTick] = useState(0)            // re-render 4x/s pour le minuteur

  const offsetRef = useRef(0)        // serverNow - Date.now()
  const refreshing = useRef(false)
  const refreshQueued = useRef(false)
  const advancingRef = useRef(false)
  const migratingRef = useRef(false)
  const joinedRef = useRef(false)
  const chRef = useRef(null)         // canal presence/broadcast

  // ── Refetch complet (room + players ; pages au reveal) ────────────────────
  const refresh = useCallback(async () => {
    if (!code) return
    if (refreshing.current) { refreshQueued.current = true; return }
    refreshing.current = true
    try {
      const st = await roomState(code)
      if (!st?.room) { setError('introuvable'); setRoom(null); return }
      setRoom(st.room); setPlayers(st.players || [])
      // Pages lisibles serveur uniquement au reveal ; en jeu, fetchPrevPage (RPC) gère
      // la page courante. On charge tout l'album au reveal/finished.
      if (['reveal', 'finished'].includes(st.room.status)) setPages(await fetchAllPages(code))
    } catch {
      // jamais casser la boucle live sur une erreur réseau
    } finally {
      refreshing.current = false
      if (refreshQueued.current) { refreshQueued.current = false; return refresh() }
    }
  }, [code])

  // ── Calibration horloge serveur (une fois) ────────────────────────────────
  useEffect(() => {
    let alive = true
    serverNow().then((srv) => { if (alive && srv) offsetRef.current = srv - Date.now() }).catch(() => {})
    return () => { alive = false }
  }, [])

  // ── Mount : join (token) + abonnement realtime + canal presence + heartbeat ─
  useEffect(() => {
    if (!code || !userId) return
    let stop = false, unsub = null, hb = null, watchdog = null

    const init = async () => {
      // Reconnexion : getToken(code) relit le token depuis sessionStorage si présent ;
      // joinRoom le rafraîchit de toute façon (idempotent côté serveur).
      const res = await joinRoom({ code, userId, displayName, avatarUrl })
      if (stop) return
      if (res.error === 'introuvable') { setError('introuvable'); setReadyState(true); return }
      if (res.spectator) setSpectator(true)
      joinedRef.current = !res.spectator
      const r = res.room
      if (r) {
        // StrictMode (mount→clean→remount) : init() est async, donc un mount jeté peut
        // créer un canal APRÈS son cleanup. On re-vérifie stop avant de stocker, sinon
        // on démantèle tout de suite → pas de canal orphelin ni de handler doublé.
        if (stop) return
        const sub = subscribeRoom(r.id, () => { if (!stop) refresh() })
        const channel = joinChannel(code, {
          userId, displayName, avatarUrl,
          onPresence: (state) => { if (!stop) setPresence(new Set(Object.keys(state || {}))) },
          onBroadcast: () => { if (!stop) refresh() }, // player_submitted / phase_change / host_migrated
        })
        if (stop) { try { sub() } catch {}; try { channel.leave() } catch {}; return }
        unsub = sub
        chRef.current = channel
        await touchPlayer(code).catch(() => {})
      }
      await refresh()
      setReadyState(true)

      // Heartbeat 10s : maintient connected=true + last_seen frais côté serveur.
      hb = setInterval(() => { if (!stop && !res.spectator) touchPlayer(code) }, 10000)

      // Watchdog realtime : resync au focus (canal mort en veille).
      const onFocus = () => { if (!document.hidden) refresh() }
      window.addEventListener('focus', onFocus)
      document.addEventListener('visibilitychange', onFocus)
      watchdog = () => {
        window.removeEventListener('focus', onFocus)
        document.removeEventListener('visibilitychange', onFocus)
      }
    }
    init()

    return () => {
      stop = true
      try { unsub?.() } catch {}
      try { chRef.current?.leave() } catch {}
      chRef.current = null
      if (hb) clearInterval(hb)
      watchdog?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, userId])

  // ── Tic du minuteur (4x/s) ────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 250)
    return () => clearInterval(t)
  }, [])

  // ── Dérivés ───────────────────────────────────────────────────────────────
  const serverNowMs = () => Date.now() + offsetRef.current
  const me = useMemo(() => players.find((p) => String(p.user_id) === String(userId)) || null, [players, userId])
  const n = room?.settings?.n || players.length || 0
  const isHost = !!me?.is_host
  const phaseEndsAtMs = room?.phase_ends_at ? new Date(room.phase_ends_at).getTime() : null

  // Joueurs « connectés » = vus par le canal presence (fallback : flag DB connected).
  // NOTE Phase 1 : connected reste true côté serveur (pas de setConnected(false)) ; un joueur parti compte "actif" jusqu'à la staleness last_seen — le timeout de phase relance de toute façon. Affinage = phases ultérieures.
  const connectedPlayers = useMemo(() => {
    if (presence.size === 0) return players
    return players.map((p) => ({ ...p, connected: presence.has(String(p.user_id)) || p.connected }))
  }, [players, presence])

  const remaining = useMemo(() => {
    if (!phaseEndsAtMs) return null
    return Math.max(0, (phaseEndsAtMs - serverNowMs()) / 1000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseEndsAtMs, tick])

  const myTask = useMemo(() => {
    if (!me || me.seat == null) return null
    if (!['writing', 'drawing', 'describing'].includes(room?.status)) return null
    return seatTask(me.seat, room.current_round, n)
  }, [me, room?.status, room?.current_round, n])

  // Sièges ayant déjà soumis ce round. En jeu on ne lit pas les pages des autres (RLS) →
  // l'hôte interroge submittedSeats(code) (dérivé serveur) ; les clients suivent leurs
  // propres soumissions + les broadcasts player_submitted.
  const [submittedSeats, setSubmittedSeats] = useState(() => new Set())
  const [mySubmitted, setMySubmitted] = useState(false)
  // Reset des soumissions à chaque changement de round/phase.
  useEffect(() => {
    setSubmittedSeats(new Set())
    setMySubmitted(false)
  }, [room?.current_round, room?.status])

  // ── Actions exposées (token implicite via le code) ────────────────────────
  const start = useCallback(async (settings) => {
    setError('')
    const out = await startGame(code, settings)
    const j = Array.isArray(out?.data) ? out.data[0] : out?.data
    if (j?.error) setError(j.error)
    chRef.current?.send('phase_change', { status: 'writing' })
    await refresh()
  }, [code, refresh])

  const advance = useCallback(async () => {
    const out = await apiAdvance(code)
    const j = Array.isArray(out?.data) ? out.data[0] : out?.data
    if (j?.error) console.warn('[gartic] advance:', j.error)
    chRef.current?.send('phase_change', {})
    await refresh()
  }, [code, refresh])

  const setReady = useCallback(async (b) => { await apiSetReady(code, b) }, [code])

  const submit = useCallback(async (content) => {
    const out = await submitPage(code, content)
    if (!out.error) {
      setMySubmitted(true)
      if (me?.seat != null) setSubmittedSeats((s) => new Set(s).add(me.seat))
      chRef.current?.send('player_submitted', { seat: me?.seat })
    }
    return out
  }, [code, me])

  const prevPage = useCallback(async () => fetchPrevPage(code), [code])
  const allPages = useCallback(async () => fetchAllPages(code), [code])

  // ── Boucle hôte : avance la partie (fill serveur) ─────────────────────────
  useEffect(() => {
    if (!isHost || !room) return
    let stop = false
    const loop = setInterval(async () => {
      if (stop || advancingRef.current) return
      if (!['writing', 'drawing', 'describing'].includes(room.status)) return
      const { round, seats } = await apiSubmittedSeats(code)
      if (round !== room.current_round) return
      const decision = shouldAdvance(
        { status: room.status, phaseEndsAtMs, current_round: round },
        connectedPlayers, seats, serverNowMs(),
      )
      if (!decision) return
      advancingRef.current = true
      try {
        await apiAdvance(code)          // le serveur comble les sièges manquants
        chRef.current?.send('phase_change', {})
        await refresh()
      } finally {
        // petit délai pour laisser le nouveau round se propager avant de re-décider
        setTimeout(() => { advancingRef.current = false }, 1500)
      }
    }, 2000)
    return () => { stop = true; clearInterval(loop) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, room?.status, room?.current_round, phaseEndsAtMs, connectedPlayers, n, code])

  // ── Migration d'hôte : pré-filtre local, validation serveur ───────────────
  // Déclencheur local (host mort >22s, plus petit siège connecté) ; le serveur
  // re-valide candidat + staleness dans gartic_promote_host.
  useEffect(() => {
    if (!room || !me || spectator) return
    if (isHost) return
    const now = serverNowMs()
    const hostAlive = connectedPlayers.some((p) => p.is_host && p.connected &&
      (!p.last_seen || now - new Date(p.last_seen).getTime() < HOST_DEAD_MS))
    if (hostAlive) return
    const alive = connectedPlayers.filter((p) => p.connected && p.seat != null &&
      (!p.last_seen || now - new Date(p.last_seen).getTime() < HOST_DEAD_MS))
    if (alive.length === 0) return
    const lowest = alive.reduce((a, b) => (a.seat <= b.seat ? a : b))
    if (String(lowest.user_id) !== String(userId)) return
    if (migratingRef.current) return
    migratingRef.current = true
    promoteSelfHost(code)
      .then((res) => { if (res?.ok) chRef.current?.send('host_migrated', {}) })
      .then(() => refresh())
      .finally(() => { setTimeout(() => { migratingRef.current = false }, 3000) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, connectedPlayers, me, isHost, spectator, userId, tick, code])

  return {
    room, players: connectedPlayers, me, n, myTask, remaining, isHost, spectator, error, ready,
    mySubmitted, submittedSeats,
    start, advance, setReady, submit, prevPage, allPages, refresh,
    serverNowMs,
  }
}
