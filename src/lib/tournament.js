// ── Tournament bracket logic ───────────────────────────────────────────────
// Single elimination, participants count must be power of 2 (16/32/64/128).
// Tournament state lives in localStorage per-browser (v1).
// When Supabase tables are ready, swap loadState/saveState to use RPC.

export function getRoundLabel(size) {
  if (size === 2)   return 'Finale'
  if (size === 4)   return 'Demi-finales'
  if (size === 8)   return 'Quarts de finale'
  if (size === 16)  return '16e de finale'
  if (size === 32)  return '32e de finale'
  if (size === 64)  return '64e de finale'
  if (size === 128) return '128e de finale'
  return `Tour de ${size}`
}

export function getRoundShort(size) {
  if (size === 2)  return 'Finale'
  if (size === 4)  return '½ Finale'
  if (size === 8)  return 'Quarts'
  if (size === 16) return '16e'
  if (size === 32) return '32e'
  if (size === 64) return '64e'
  return `${size}e`
}

// Generate a full bracket from a list of participant objects.
// participants: array of { id, title, anime, artist, ytId, color }
// Returns: { rounds: Round[], voteCounts: { [matchId]: { left:0, right:0 } } }
export function generateBracket(participants) {
  const n = participants.length
  if (!isPow2(n) || n < 4) throw new Error('participants must be power of 2, min 4')

  const rounds = []
  let roundSize = n

  while (roundSize >= 2) {
    const matchCount = roundSize / 2
    const isFirst = roundSize === n
    const matches = []

    for (let i = 0; i < matchCount; i++) {
      let left = null, right = null
      if (isFirst) {
        left  = { ...participants[i * 2],     votes: 0 }
        right = { ...participants[i * 2 + 1], votes: 0 }
      }
      const isPendingInFirstRound = isFirst && i > 0
      matches.push({
        id:        `r${roundSize}_m${i}`,
        position:  i,
        roundSize,
        status:    isFirst && i === 0 ? 'voting' : 'pending',
        left,
        right,
        winnerId:  null,
      })
    }

    rounds.push({
      id:      `round_${roundSize}`,
      label:   getRoundLabel(roundSize),
      short:   getRoundShort(roundSize),
      size:    roundSize,
      matches,
    })

    roundSize = roundSize / 2
  }

  const voteCounts = {}
  for (const round of rounds) {
    for (const m of round.matches) {
      voteCounts[m.id] = { left: 0, right: 0 }
    }
  }

  return { rounds, voteCounts }
}

function isPow2(n) { return n > 0 && (n & (n - 1)) === 0 }

// Returns the currently active { round, match } or null if tournament is done.
export function getCurrentMatch(rounds) {
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.status === 'voting') return { round, match }
    }
  }
  return null
}

// Returns the final winner participant or null.
export function getWinner(rounds) {
  const final = rounds[rounds.length - 1]
  if (!final) return null
  const m = final.matches[0]
  if (m?.status !== 'closed' || !m.winnerId) return null
  return m.left?.id === m.winnerId ? m.left : m.right
}

// Close a match (winnerId='left'|'right' participant id), advance winner to
// the next round, and open the next match to vote on.
// Returns a NEW rounds array (immutable update).
export function advanceWinner(rounds, matchId, winnerId) {
  const r = JSON.parse(JSON.stringify(rounds))

  let winnerParticipant = null
  let ri = -1, mi = -1

  outer: for (let a = 0; a < r.length; a++) {
    for (let b = 0; b < r[a].matches.length; b++) {
      if (r[a].matches[b].id === matchId) {
        ri = a; mi = b
        const m = r[a].matches[b]
        m.status    = 'closed'
        m.winnerId  = winnerId
        winnerParticipant = m.left?.id === winnerId
          ? { ...m.left, votes: 0 }
          : { ...m.right, votes: 0 }
        break outer
      }
    }
  }

  if (!winnerParticipant || ri === -1) return r

  // Place winner in next round slot
  const nextRi = ri + 1
  if (nextRi < r.length) {
    const nextMi   = Math.floor(mi / 2)
    const slot     = mi % 2 === 0 ? 'left' : 'right'
    r[nextRi].matches[nextMi][slot] = { ...winnerParticipant, votes: 0 }
  }

  // Open next match: prefer next match in same round, else first of next round
  const nextInRound = r[ri].matches[mi + 1]
  if (nextInRound && nextInRound.status === 'pending') {
    nextInRound.status = 'voting'
  } else if (!nextInRound) {
    // Round complete — open next round's first match if both slots are ready
    if (nextRi < r.length) {
      const first = r[nextRi].matches[0]
      if (first && first.left && first.right && first.status === 'pending') {
        first.status = 'voting'
      }
    }
  }

  return r
}

// Progress counters: how many matches are done vs total playable.
export function getTournamentProgress(rounds) {
  let total = 0, done = 0
  for (const round of rounds) {
    for (const m of round.matches) {
      if (m.left && m.right) {
        total++
        if (m.status === 'closed') done++
      }
    }
  }
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 }
}

// ── LocalStorage persistence ───────────────────────────────────────────────

const lsKey   = id => `brams_t_state_${id}`
const voteKey = id => `brams_t_votes_${id}`

export function loadState(tournamentId) {
  try { return JSON.parse(localStorage.getItem(lsKey(tournamentId)) || 'null') }
  catch { return null }
}

export function saveState(tournamentId, rounds) {
  try { localStorage.setItem(lsKey(tournamentId), JSON.stringify(rounds)) }
  catch {}
}

// votes: { [matchId]: 'left' | 'right' } — personal vote history
export function loadPersonalVotes(tournamentId) {
  try { return JSON.parse(localStorage.getItem(voteKey(tournamentId)) || '{}') }
  catch { return {} }
}

export function savePersonalVote(tournamentId, matchId, side) {
  try {
    const v = loadPersonalVotes(tournamentId)
    v[matchId] = side
    localStorage.setItem(voteKey(tournamentId), JSON.stringify(v))
  } catch {}
}

// voteCounts: { [matchId]: { left: N, right: N } } — aggregate (client-side)
export function loadVoteCounts(tournamentId) {
  try { return JSON.parse(localStorage.getItem(`brams_t_vc_${tournamentId}`) || '{}') }
  catch { return {} }
}

export function addVoteCount(tournamentId, matchId, side) {
  try {
    const vc = loadVoteCounts(tournamentId)
    if (!vc[matchId]) vc[matchId] = { left: 0, right: 0 }
    vc[matchId][side] = (vc[matchId][side] || 0) + 1
    localStorage.setItem(`brams_t_vc_${tournamentId}`, JSON.stringify(vc))
    return vc
  } catch { return {} }
}

export function getVotePercents(voteCounts, matchId) {
  const v = voteCounts?.[matchId] || { left: 0, right: 0 }
  const total = (v.left || 0) + (v.right || 0)
  if (!total) return { left: 50, right: 50, total: 0 }
  return {
    left:  Math.round(((v.left  || 0) / total) * 100),
    right: Math.round(((v.right || 0) / total) * 100),
    total,
    leftN:  v.left  || 0,
    rightN: v.right || 0,
  }
}

export function resetTournament(tournamentId) {
  try {
    localStorage.removeItem(lsKey(tournamentId))
    localStorage.removeItem(voteKey(tournamentId))
    localStorage.removeItem(`brams_t_vc_${tournamentId}`)
  } catch {}
}
