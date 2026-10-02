// Guess Who — décisions d'horloge et de synchro (logique PURE, testée).
export const PHASE_TOTAL = { gages: 45, listen: 20, record: 40, vote: 45, revote: 25, result: 8, gage: 10 }
const SPEED = { fast: 0.6, slow: 1.5 }

export function remainingSec(endsAtIso, nowMs) {
  if (!endsAtIso) return null
  return Math.max(0, (new Date(endsAtIso).getTime() - nowMs) / 1000)
}

// Durée totale de la phase : donnée par le serveur (migration 20261002b),
// sinon recalculée comme lui (gages jamais accélérés).
export function phaseTotal(room) {
  if (!room) return null
  if (room.phase_secs > 0) return room.phase_secs
  const base = PHASE_TOTAL[room.phase]
  if (!base) return null
  const k = room.phase === 'gages' ? 1 : (SPEED[room.settings?.speed] || 1)
  return Math.round(base * k)
}

// Le serveur accepte : hôte à échéance (ou tout le monde a fini), n'importe qui
// à échéance + 5 s. On prend 6 s côté client pour éviter un refus « too_early ».
export function shouldAdvance({ endsAtMs, nowMs, isHost, done }) {
  if (endsAtMs == null) return false
  if (done) return true // le serveur accepte n'importe quel joueur quand tout le monde a fini
  if (isHost) return nowMs >= endsAtMs
  return nowMs >= endsAtMs + 6000
}

// Délai avant de redemander la même avance (sinon on martèlerait le serveur
// 4 fois par seconde quand il répond « trop tôt » à cause d'un décalage).
export function advanceRetryMs(result) {
  if (result?.reason === 'too_early') return Math.min(3000, Math.max(500, Number(result.wait_ms) || 1000))
  if (result?.ok) return 1500
  return 2000 // réseau ou refus : on retente un peu plus tard
}

export function isDone(phase, players, prog) {
  const live = (players || []).filter((p) => p.seat != null && p.connected)
  if (!prog || live.length === 0) return false
  if (prog.phase && prog.phase !== phase) return false // progression d'une autre phase
  const has = (list, id) => (list || []).includes(id)
  if (phase === 'gages') return live.every((p) => has(prog.gaged, p.user_id))
  if (phase === 'record') return live.filter((p) => p.lives > 0).every((p) => has(prog.took, p.user_id))
  if (phase === 'vote' || phase === 'revote') return live.every((p) => has(prog.voted, p.user_id))
  return false
}

export function votableTakes(takes, { me, phase, tied }) {
  return (takes || []).filter((t) => t.user_id !== me && (phase !== 'revote' || (tied || []).includes(t.user_id)))
}

// ── Horloge serveur ──────────────────────────────────────────────────────────
// Un échantillon = heure serveur reçue pendant un aller-retour ; on suppose
// qu'elle date du milieu de l'aller-retour.
export function clockSample(sentMs, recvMs, serverIso) {
  const server = new Date(serverIso).getTime()
  if (!serverIso || !Number.isFinite(server) || !(recvMs >= sentMs)) return null
  return { offset: server - (sentMs + recvMs) / 2, rtt: recvMs - sentMs }
}

// On garde les derniers échantillons et on croit celui au plus court
// aller-retour (le moins faussé par une 4G qui rame).
export function addSample(samples, sample, keep = 8) {
  if (!sample) return samples
  return [...samples, sample].slice(-keep)
}
export function bestOffset(samples, fallback = 0) {
  let best = null
  for (const s of samples || []) if (!best || s.rtt < best.rtt) best = s
  return best ? Math.round(best.offset) : fallback
}

// Attente avant une nouvelle tentative réseau : 1 s, 2 s, 4 s… plafonné.
export function backoffMs(attempt, max = 8000) {
  return Math.min(max, 1000 * 2 ** Math.max(0, attempt))
}

// Cadence du sondage : la progression (qui a voté, envoyé…) n'est pas poussée
// en temps réel, on la sonde plus vite quand on attend les autres.
export function pollMs({ phase, live, hidden }) {
  if (hidden) return 6000
  if (!live) return 1500
  return ['gages', 'record', 'vote', 'revote'].includes(phase) ? 2000 : 3500
}

// Erreurs de transport (à retenter) vs refus métier (à afficher).
const NET = /timeout|failed to fetch|load failed|network|rpc_failed|http_5\d\d|http_0|aborted/i
export function isNetworkError(out) {
  return !!out && out.ok === false && NET.test(String(out.error || ''))
}

// Fonction SQL absente : migration pas encore collée → ancien comportement.
const MISSING = /could not find the function|schema cache|PGRST202|does not exist/i
export function isMissingFunction(out) {
  return !!out && out.ok === false && MISSING.test(String(out.error || ''))
}
