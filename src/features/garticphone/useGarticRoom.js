// Freydiss Phone — hook d'orchestration du salon (glue de la machine à états).
// Responsabilités : identité + join (token secret), abonnement realtime (gartic_rooms),
// canal presence/broadcast (liveness + signaux basse latence), dérivation de ma tâche,
// horloge serveur calibrée, heartbeat, boucle hôte (avance au timeout / quand tout
// le monde a soumis — le serveur comble les manquants), migration d'hôte serveur.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  joinRoom, roomState, fetchPrevPage,
  submitPage, submittedSeats as apiSubmittedSeats, fetchAllPages,
  setReady as apiSetReady, touchPlayer, startGame, advance as apiAdvance,
  promoteSelfHost, serverNow, subscribeRoom, joinChannel, replayGame,
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
  const [revealStep, setRevealStep] = useState(null) // {a,p} page synchronisée par l'hôte au reveal

  const offsetRef = useRef(0)        // serverNow - Date.now()
  const refreshing = useRef(false)
  const refreshQueued = useRef(false)
  const advancingRef = useRef(false)
  const migratingRef = useRef(false)
  const joinedRef = useRef(false)
  const chRef = useRef(null)         // canal presence/broadcast
  const reactionCbsRef = useRef(new Set()) // abonnés aux emojis broadcastés (reveal)

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
    let stop = false, unsub = null, hb = null, watchdog = null, poll = null

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
          onBroadcast: (event, payload) => {
            if (stop) return
            if (event === 'reaction') { reactionCbsRef.current.forEach((cb) => { try { cb(payload) } catch {} }); return }
            if (event === 'reveal_step') { setRevealStep(payload || null); return }
            // Soumission d'un AUTRE joueur : on incrémente le compteur affiché (X/N ont envoyé).
            // Sans ça, submittedSeats ne contenait QUE mon siège → le compteur restait bloqué à 1.
            if (event === 'player_submitted') {
              if (payload && payload.seat != null) setSubmittedSeats((s) => { const n = new Set(s); n.add(payload.seat); return n })
              return
            }
            refresh() // phase_change / host_migrated
          },
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

      // Filet de sécurité : re-fetch périodique de l'état du salon. Le flux est sinon 100%
      // event-driven (postgres_changes + broadcast phase_change) ; un event manqué (onglet
      // throttlé, canal realtime stale, réseau) laissait un joueur BLOQUÉ sur « En attente des
      // autres pirates » alors que le serveur avait avancé. refresh() est ré-entrant (garde).
      poll = setInterval(() => { if (!stop) refresh() }, 3500)

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
      if (poll) clearInterval(poll)
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
  // n (base de la rotation des carnets) DOIT être figé au démarrage : sinon, dès qu'un joueur
  // part, players.length chute → bookForSeat/seatTask se désynchronisent → des sièges pointent
  // vers une page inexistante (écran vide "aucune phrase"). settings.rounds est gelé au start
  // (= nombre de sièges) → on s'en sert comme n stable. Fallback live uniquement hors-jeu.
  const n = room?.settings?.n || room?.settings?.rounds || players.length || 0
  const isHost = !!me?.is_host
  const phaseEndsAtMs = room?.phase_ends_at ? new Date(room.phase_ends_at).getTime() : null

  // Joueurs « connectés » = vus par le canal presence (fallback : flag DB connected).
  // NOTE Phase 1 : connected reste true côté serveur (pas de setConnected(false)) ; un joueur parti compte "actif" jusqu'à la staleness last_seen — le timeout de phase relance de toute façon. Affinage = phases ultérieures.
  const connectedPlayers = useMemo(() => {
    if (presence.size === 0) return players
    return players.map((p) => ({ ...p, connected: presence.has(String(p.user_id)) || p.connected }))
  }, [players, presence])

  // connectedPlayers obtient une nouvelle référence à chaque sync presence (poll 3,5s, broadcast,
  // postgres_changes) → le garder dans un ref évite de relancer la boucle hôte (et son setInterval)
  // à chaque rafraîchissement, ce qui retardait/sautait l'avance « tous soumis ».
  const connectedPlayersRef = useRef([])
  useEffect(() => { connectedPlayersRef.current = connectedPlayers }, [connectedPlayers])

  const remaining = useMemo(() => {
    if (!phaseEndsAtMs) return null
    return Math.max(0, (phaseEndsAtMs - serverNowMs()) / 1000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseEndsAtMs, tick])

  const myTask = useMemo(() => {
    if (!me || me.seat == null) return null
    // n invalide (0/NaN) ou siège hors-borne (sièges non-contigus, ex. trou laissé par un
    // départ) → seatTask donnerait une rotation cassée. On rend null proprement (écran d'attente)
    // au lieu d'un carnet fantôme.
    if (!n || me.seat >= n) return null
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

  // Réhydrate « j'ai déjà soumis ce round » après reconnexion/refresh : mySubmitted est local
  // (remis à false ci-dessus), donc au retour en pleine partie le joueur revoyait sa tâche
  // déjà faite (canvas/textarea vierge) au lieu de l'écran d'attente — et pouvait re-soumettre.
  // submittedSeats(code) est dérivé serveur (déjà exposé, aucune migration).
  useEffect(() => {
    if (!me || me.seat == null || spectator) return
    if (!['writing', 'drawing', 'describing'].includes(room?.status)) return
    let alive = true
    apiSubmittedSeats(code).then(({ round, seats }) => {
      if (!alive) return
      if (round === room.current_round && seats?.has?.(me.seat)) {
        setMySubmitted(true)
        setSubmittedSeats((s) => new Set(s).add(me.seat))
      }
    }).catch(() => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, me?.seat, room?.status, room?.current_round, spectator])

  // Compteur « X/N ont envoyé » fiable côté NON-hôtes : sync léger (2,5s) sur la vérité
  // serveur. Les broadcasts player_submitted peuvent manquer (onglet throttlé, réseau) →
  // sans ça le compteur restait figé. L'hôte l'a déjà via sa boucle.
  useEffect(() => {
    if (isHost || spectator || !me) return
    if (!['writing', 'drawing', 'describing'].includes(room?.status)) return
    let stop = false
    const id = setInterval(async () => {
      const { round, seats } = await apiSubmittedSeats(code)
      if (!stop && round === room?.current_round) setSubmittedSeats(new Set(seats))
    }, 2500)
    return () => { stop = true; clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, spectator, me?.seat, room?.status, room?.current_round, code])

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
    const out = await apiAdvance(code, room?.current_round)
    const j = Array.isArray(out?.data) ? out.data[0] : out?.data
    if (j?.error) console.warn('[gartic] advance:', j.error)
    chRef.current?.send('phase_change', {})
    await refresh()
  }, [code, refresh, room?.current_round])

  const setReady = useCallback(async (b) => { await apiSetReady(code, b) }, [code])

  // Rejouer : remet le salon en LOBBY (efface pages + ready, déséquipe les sièges) pour que
  // tout le monde re-prêt et que de nouveaux puissent rejoindre. Renvoie false si le RPC
  // gartic_replay n'existe pas encore (migration pas lancée) → l'appelant fait un fallback.
  const replay = useCallback(async () => {
    const out = await replayGame(code)
    const j = Array.isArray(out?.data) ? out.data[0] : out?.data
    if (j?.ok) { chRef.current?.send('phase_change', { status: 'lobby' }); await refresh(); return true }
    return false
  }, [code, refresh])

  const submit = useCallback(async (content, round) => {
    const rnd = Number.isInteger(round) ? round : room?.current_round
    let out = await submitPage(code, content, rnd)
    // Erreur réseau transitoire (timeout/fail) → 1 retry. gartic_submit est idempotent
    // par (carnet, page, manche) : re-soumettre le même contenu ne crée jamais de doublon.
    // Sinon un glitch réseau perdait la soumission en silence (surtout l'auto-submit à 0s).
    if (out.error === 'fail' || out.error === 'timeout') out = await submitPage(code, content, rnd)
    if (!out.error) {
      setMySubmitted(true)
      if (me?.seat != null) setSubmittedSeats((s) => new Set(s).add(me.seat))
      chRef.current?.send('player_submitted', { seat: me?.seat })
    }
    return out
  }, [code, me, room?.current_round])

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
      // Vérité serveur → affichage (rattrape un broadcast player_submitted manqué).
      setSubmittedSeats(new Set(seats))
      const decision = shouldAdvance(
        { status: room.status, phaseEndsAtMs, current_round: round },
        connectedPlayersRef.current, seats, serverNowMs(),
      )
      if (!decision) return
      advancingRef.current = true
      try {
        await apiAdvance(code, round)   // le serveur comble les sièges manquants
        chRef.current?.send('phase_change', {})
        await refresh()
      } finally {
        // petit délai pour laisser le nouveau round se propager avant de re-décider
        setTimeout(() => { advancingRef.current = false }, 1500)
      }
    }, 2000)
    return () => { stop = true; clearInterval(loop) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, room?.status, room?.current_round, phaseEndsAtMs, code])

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

  // ── Reveal : réactions emojis + synchro de page (broadcast canal room) ────
  // `extra` (optionnel) est fusionné au payload sans rien casser : les appels
  // historiques sendReaction('🔥') restent identiques. Sert au vote « coup de
  // cœur » du reveal : sendReaction('vote', { album: idx }) → payload porte
  // { emoji:'vote', album, from } et transite sur le canal réactions existant.
  const sendReaction = useCallback((emoji, extra) => { chRef.current?.send('reaction', { emoji, from: userId, ...(extra || null) }) }, [userId])
  const sendRevealStep = useCallback((step) => { chRef.current?.send('reveal_step', step) }, [])
  const onReaction = useCallback((cb) => {
    reactionCbsRef.current.add(cb)
    return () => reactionCbsRef.current.delete(cb)
  }, [])

  return {
    room, players: connectedPlayers, me, n, myTask, remaining, isHost, spectator, error, ready,
    mySubmitted, submittedSeats,
    start, advance, setReady, submit, prevPage, allPages, refresh, replay,
    serverNowMs,
    revealStep, sendReaction, sendRevealStep, onReaction,
  }
}
