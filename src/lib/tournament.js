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
  if (n < 2) throw new Error('participants must be min 2')

  // Tirage aléatoire Fisher-Yates
  const shuffled = [...participants]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const rounds = []
  let roundSize = nextPow2(Math.max(n, 4))
  const slots = [...shuffled, ...Array.from({ length: roundSize - n }, () => null)]

  while (roundSize >= 2) {
    const matchCount = roundSize / 2
    const isFirst = roundSize === slots.length
    const matches = []

    for (let i = 0; i < matchCount; i++) {
      let left = null, right = null
      if (isFirst) {
        const leftParticipant = slots[i * 2]
        const rightParticipant = slots[i * 2 + 1]
        left  = leftParticipant  ? { ...leftParticipant, votes: 0 } : null
        right = rightParticipant ? { ...rightParticipant, votes: 0 } : null
      }
      matches.push({
        id:        `r${roundSize}_m${i}`,
        position:  i,
        roundSize,
        status:    'pending',
        left,
        right,
        leftReady: isFirst,
        rightReady: isFirst,
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

  closeByes(rounds)
  openNextPlayable(rounds)

  const voteCounts = {}
  for (const round of rounds) {
    for (const m of round.matches) {
      voteCounts[m.id] = { left: 0, right: 0 }
    }
  }

  return { rounds, voteCounts }
}

function nextPow2(n) {
  let size = 1
  while (size < n) size *= 2
  return size
}

function placeWinner(rounds, ri, mi, winnerParticipant) {
  const nextRi = ri + 1
  if (nextRi >= rounds.length) return
  const nextMi = Math.floor(mi / 2)
  const slot = mi % 2 === 0 ? 'left' : 'right'
  const nextMatch = rounds[nextRi].matches[nextMi]
  if (winnerParticipant) {
    nextMatch[slot] = { ...winnerParticipant, votes: 0 }
  }
  nextMatch[`${slot}Ready`] = true
}

function closeByes(rounds) {
  let changed = true
  while (changed) {
    changed = false
    for (let ri = 0; ri < rounds.length; ri++) {
      for (let mi = 0; mi < rounds[ri].matches.length; mi++) {
        const match = rounds[ri].matches[mi]
        if (match.status !== 'pending') continue
        const leftReady = match.leftReady ?? false
        const rightReady = match.rightReady ?? false
        const winner = match.left && !match.right && rightReady
          ? match.left
          : !match.left && match.right && leftReady
            ? match.right
            : null
        const emptyResolved = !match.left && !match.right && leftReady && rightReady
        if (!winner && !emptyResolved) continue
        match.status = 'closed'
        match.winnerId = winner?.id || null
        placeWinner(rounds, ri, mi, winner)
        changed = true
      }
    }
  }
}

function openNextPlayable(rounds, afterRi = 0, afterMi = -1) {
  if (getCurrentMatch(rounds)) return
  for (let ri = afterRi; ri < rounds.length; ri++) {
    const startMi = ri === afterRi ? afterMi + 1 : 0
    for (let mi = startMi; mi < rounds[ri].matches.length; mi++) {
      const match = rounds[ri].matches[mi]
      if (match.status === 'pending' && match.left && match.right && match.leftReady && match.rightReady) {
        match.status = 'voting'
        return
      }
    }
  }
}

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

  placeWinner(r, ri, mi, winnerParticipant)
  closeByes(r)
  openNextPlayable(r, ri, mi)

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
