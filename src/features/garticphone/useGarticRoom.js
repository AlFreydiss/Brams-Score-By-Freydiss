// Brams Phone — hook d'orchestration du salon (glue de la machine à états).
// Responsabilités : identité + join, abonnement realtime, dérivation de ma tâche,
// horloge serveur calibrée, heartbeat, boucle hôte (avance au timeout / quand tout
// le monde a soumis, en comblant les manquants), migration d'hôte.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  joinRoom, fetchRoom, fetchPlayers, fetchAllPages, fetchPrevPage,
  submitPage, fillMissingPage, setReady as apiSetReady, touchPlayer, setConnected,
  startGame, advance as apiAdvance, promoteSelfHost, serverNow, subscribeRoom,
} from '../../lib/garticRooms.js'
import { seatTask, seatForBook } from './logic/rotation.js'
import { shouldAdvance, missingSeats } from './logic/hostLoop.js'

const HOST_DEAD_MS = 22000 // hôte sans heartbeat depuis >22s = décroché

export function useGarticRoom({ code, userId, displayName, avatarUrl }) {
  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [pages, setPages] = useState([])
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

  // ── Refetch complet (room + players + pages) ──────────────────────────────
  const refresh = useCallback(async () => {
    if (!code) return
    if (refreshing.current) { refreshQueued.current = true; return }
    refreshing.current = true
    try {
      const r = await fetchRoom(code)
      if (!r) { setError('introuvable'); setRoom(null); return }
      const [pl, pg] = await Promise.all([
        fetchPlayers(r.id),
        // Les pages ne sont lisibles côté serveur qu'au reveal ; en jeu, fetchPrevPage
        // (RPC/sélectif) gère la page courante. On charge tout au reveal/finished.
        ['reveal', 'finished'].includes(r.status) ? fetchAllPages(r.id) : Promise.resolve([]),
      ])
      setRoom(r); setPlayers(pl); setPages(pg)
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

  // ── Mount : join + premier refresh + abonnement realtime + heartbeat ──────
  useEffect(() => {
    if (!code || !userId) return
    let stop = false, roomIdForSub = null, unsub = null, hb = null, watchdog = null

    const init = async () => {
      const res = await joinRoom({ code, userId, displayName, avatarUrl })
      if (stop) return
      if (res.error === 'introuvable') { setError('introuvable'); setReadyState(true); return }
      if (res.spectator) setSpectator(true)
      joinedRef.current = !res.spectator
      const r = res.room
      if (r) {
        roomIdForSub = r.id
        unsub = subscribeRoom(r.id, () => { if (!stop) refresh() })
        await touchPlayer(r.id, userId).catch(() => {})
      }
      await refresh()
      setReadyState(true)

      // Heartbeat 10s : maintient connected=true + last_seen frais.
      hb = setInterval(() => { if (roomIdForSub && !spectator) touchPlayer(roomIdForSub, userId) }, 10000)

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

    const onUnload = () => { if (roomIdForSub) setConnected(roomIdForSub, userId, false) }
    window.addEventListener('beforeunload', onUnload)

    return () => {
      stop = true
      try { unsub?.() } catch {}
      if (hb) clearInterval(hb)
      watchdog?.()
      window.removeEventListener('beforeunload', onUnload)
      if (roomIdForSub) setConnected(roomIdForSub, userId, false)
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

  // Sièges ayant déjà soumis ce round (déduit des pages côté reveal, sinon via état).
  // En jeu on ne lit pas les pages des autres (RLS) → on s'appuie sur le compteur
  // dérivé par le serveur si présent ; sinon on suit nos propres soumissions.
  const [submittedSeats, setSubmittedSeats] = useState(() => new Set())
  const [mySubmitted, setMySubmitted] = useState(false)
  // Reset des soumissions à chaque changement de round/phase.
  useEffect(() => {
    setSubmittedSeats(new Set())
    setMySubmitted(false)
  }, [room?.current_round, room?.status])

  // ── Actions exposées ──────────────────────────────────────────────────────
  const start = useCallback(async (settings) => {
    if (!room) return
    setError('')
    const out = await startGame(room.id, settings)
    if (out?.error) setError(out.error)
    await refresh()
  }, [room, refresh])

  const advance = useCallback(async () => {
    if (!room) return
    await apiAdvance(room.id)
    await refresh()
  }, [room, refresh])

  const setReady = useCallback(async (b) => {
    if (!room) return
    await apiSetReady(room.id, userId, b)
  }, [room, userId])

  const submit = useCallback(async (content) => {
    if (!room || !myTask) return { error: 'no_task' }
    const out = await submitPage({
      roomId: room.id, bookId: myTask.book, pageIndex: myTask.pageIndex,
      type: myTask.type, content: content ?? (myTask.type === 'drawing' ? '' : '—'),
      authorUserId: userId,
    })
    if (!out.error) {
      setMySubmitted(true)
      if (me?.seat != null) setSubmittedSeats((s) => new Set(s).add(me.seat))
    }
    return out
  }, [room, myTask, userId, me])

  const prevPage = useCallback(async () => {
    if (!room || !myTask) return null
    return fetchPrevPage(room.id, myTask.book, room.current_round)
  }, [room, myTask])

  const allPages = useCallback(async () => {
    if (!room) return []
    return fetchAllPages(room.id)
  }, [room])

  // ── Boucle hôte : avance la partie ────────────────────────────────────────
  useEffect(() => {
    if (!isHost || !room) return
    let stop = false
    const loop = setInterval(async () => {
      if (stop || advancingRef.current) return
      if (!['writing', 'drawing', 'describing'].includes(room.status)) return
      const round = room.current_round
      // RLS ouverte (v1) : l'hôte lit toutes les pages → vrai set des sièges ayant soumis
      // ce round (déduit du book_id via seatForBook). Évite d'écraser les vraies pages.
      const pg = await fetchAllPages(room.id).catch(() => [])
      const submittedBooks = new Set(pg.filter((p) => p.page_index === round).map((p) => p.book_id))
      const realSubmitted = new Set([...submittedBooks].map((b) => seatForBook(b, round, n)))
      const decision = shouldAdvance(
        { status: room.status, phaseEndsAtMs, current_round: round },
        players, realSubmitted, serverNowMs(),
      )
      if (!decision) return
      advancingRef.current = true
      try {
        // Comble UNIQUEMENT les sièges réellement manquants, sans écraser (ignore-duplicates).
        const missing = missingSeats(players, realSubmitted, n)
        await Promise.all(missing.map((seat) => {
          const t = seatTask(seat, round, n)
          if (!t) return Promise.resolve()
          return fillMissingPage({ roomId: room.id, bookId: t.book, pageIndex: t.pageIndex, type: t.type }).catch(() => {})
        }))
        await apiAdvance(room.id)
        await refresh()
      } finally {
        // petit délai pour laisser le nouveau round se propager avant de re-décider
        setTimeout(() => { advancingRef.current = false }, 1500)
      }
    }, 2000)
    return () => { stop = true; clearInterval(loop) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, room?.status, room?.current_round, phaseEndsAtMs, players, n])

  // ── Migration d'hôte : le plus petit siège connecté se promeut si l'hôte est mort ─
  useEffect(() => {
    if (!room || !me || spectator) return
    if (isHost) return
    const now = serverNowMs()
    const hostAlive = players.some((p) => p.is_host && p.connected &&
      (!p.last_seen || now - new Date(p.last_seen).getTime() < HOST_DEAD_MS))
    if (hostAlive) return
    // Candidat = plus petit siège parmi les connectés vivants.
    const alive = players.filter((p) => p.connected && p.seat != null &&
      (!p.last_seen || now - new Date(p.last_seen).getTime() < HOST_DEAD_MS))
    if (alive.length === 0) return
    const lowest = alive.reduce((a, b) => (a.seat <= b.seat ? a : b))
    if (String(lowest.user_id) !== String(userId)) return
    if (migratingRef.current) return
    migratingRef.current = true
    promoteSelfHost(room.id, userId)
      .then(() => refresh())
      .finally(() => { setTimeout(() => { migratingRef.current = false }, 3000) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, players, me, isHost, spectator, userId, tick])

  return {
    room, players, me, n, myTask, remaining, isHost, spectator, error, ready,
    mySubmitted, submittedSeats,
    start, advance, setReady, submit, prevPage, allPages, refresh,
    serverNowMs,
  }
}
