// Guess Who — décisions d'horloge (logique PURE, testée).
export const PHASE_TOTAL = { gages: 45, listen: 20, record: 40, vote: 45, revote: 25, result: 8, gage: 10 }

export function remainingSec(endsAtIso, nowMs) {
  if (!endsAtIso) return null
  return Math.max(0, (new Date(endsAtIso).getTime() - nowMs) / 1000)
}

// Le serveur accepte : hôte à échéance (ou tout le monde a fini), n'importe qui
// à échéance + 5 s. On prend 6 s côté client pour éviter un refus « too_early ».
export function shouldAdvance({ endsAtMs, nowMs, isHost, done }) {
  if (endsAtMs == null) return false
  if (isHost) return done || nowMs >= endsAtMs
  return nowMs >= endsAtMs + 6000
}

export function isDone(phase, players, prog) {
  const live = (players || []).filter((p) => p.seat != null && p.connected)
  if (!prog || live.length === 0) return false
  const has = (list, id) => (list || []).includes(id)
  if (phase === 'gages') return live.every((p) => has(prog.gaged, p.user_id))
  if (phase === 'record') return live.filter((p) => p.lives > 0).every((p) => has(prog.took, p.user_id))
  if (phase === 'vote' || phase === 'revote') return live.every((p) => has(prog.voted, p.user_id))
  return false
}

export function votableTakes(takes, { me, phase, tied }) {
  return (takes || []).filter((t) => t.user_id !== me && (phase !== 'revote' || (tied || []).includes(t.user_id)))
}
