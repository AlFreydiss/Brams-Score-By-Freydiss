// Guess Who — orchestration du salon : rejoindre, état, horloge serveur,
// boucle d'avancement (hôte, ou filet de sécurité pour les autres), présence,
// reprise d'hôte. Les écrans ne font que lire ce hook et appeler `act`.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as api from '../../lib/guessWhoRooms.js'
import { PHASE_TOTAL, remainingSec, shouldAdvance, isDone } from './logic/clock.js'
import { takeNotice } from './logic/notices.js'
import { addHighlight } from './logic/highlights.js'

export function useGuessWhoRoom({ code, identity }) {
  const [status, setStatus] = useState('joining')
  const [error, setError] = useState(null)
  const [join, setJoin] = useState({ roomId: null, spectator: false, reason: null })
  const [state, setState] = useState({ room: null, players: [] })
  const [prog, setProg] = useState(null)
  const [takes, setTakes] = useState([])
  const [notice, setNotice] = useState(null)
  const [highlights, setHighlights] = useState([])
  const [now, setNow] = useState(Date.now())
  const offset = useRef(0)
  const advancing = useRef(false)

  const refresh = useCallback(async () => {
    const [st, pg] = await Promise.all([api.roomState(code), api.progress(code)])
    if (st) setState(st)
    if (pg) setProg(pg)
  }, [code])

  // Rejoindre + recalage d'horloge
  useEffect(() => {
    let alive = true
    ;(async () => {
      const t0 = Date.now()
      const server = await api.serverNow()
      offset.current = server - (t0 + Date.now()) / 2
      const r = await api.joinRoom({ code, ...identity })
      if (!alive) return
      if (r.error) { setError(r.error); setStatus('error'); return }
      setJoin(r)
      await refresh()
      if (alive) setStatus('ready')
    })()
    return () => { alive = false }
  }, [code, identity, refresh])

  // Realtime sur le salon + sondage de la progression (tables fermées en lecture)
  useEffect(() => {
    if (!join.roomId) return
    const off = api.subscribeRoom(join.roomId, () => refresh())
    const poll = setInterval(refresh, 3000)
    return () => { off(); clearInterval(poll) }
  }, [join.roomId, refresh])

  // Tic d'horloge
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset.current), 250)
    return () => clearInterval(t)
  }, [])

  // Présence
  useEffect(() => {
    if (join.spectator || status !== 'ready') return
    api.touch(code)
    const t = setInterval(() => api.touch(code), 8000)
    return () => clearInterval(t)
  }, [code, join.spectator, status])

  const { room, players } = state
  const me = useMemo(() => players.find((p) => p.user_id === String(identity.userId)) || null, [players, identity.userId])
  const isHost = !!me?.is_host

  // Imitations du tour, visibles à partir du vote
  const phase = room?.phase
  const round = room?.round
  useEffect(() => {
    if (!['vote', 'revote', 'result', 'gage'].includes(phase)) {
      setTakes([])
      if (phase === 'gages') setHighlights([]) // nouvelle partie
      return
    }
    let alive = true
    // Instantané du verdict au moment où la phase commence (résultat + son du tour).
    const res = room?.last_result
    const clipTitle = room?.clip?.title
    api.fetchTakes(code, round).then((t) => {
      if (!alive) return
      setTakes(t)
      if (phase === 'result') setHighlights((h) => addHighlight(h, res, t, clipTitle))
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, phase, round])

  // Reprise d'hôte si l'hôte a disparu
  useEffect(() => {
    if (join.spectator || !me || isHost || !players.length) return
    if (!players.some((p) => p.is_host && p.connected)) api.promoteHost(code).then(refresh)
  }, [code, players, me, isHost, join.spectator, refresh])

  // Boucle d'avancement
  const endsAtMs = room?.phase_ends_at ? new Date(room.phase_ends_at).getTime() : null
  const done = isDone(phase, players, prog)
  useEffect(() => {
    if (!me || advancing.current) return
    if (!shouldAdvance({ endsAtMs, nowMs: now, isHost, done })) return
    advancing.current = true
    api.advance(code, phase, round).then(refresh).finally(() => { advancing.current = false })
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
  }), [code, round, refresh])

  return {
    status, error, spectator: join.spectator, reason: join.reason,
    room, players, me, isHost, prog, takes, notice, highlights, clearNotice: () => setNotice(null),
    remaining: remainingSec(room?.phase_ends_at, now),
    // chrono rapide : durées × 0,6 (sauf l'écriture des gages), comme le serveur
    total: PHASE_TOTAL[phase] ? Math.round(PHASE_TOTAL[phase] * (room?.settings?.speed === 'fast' && phase !== 'gages' ? 0.6 : 1)) : null,
    maxLives: room?.settings?.lives || 2,
    refresh, act,
  }
}
