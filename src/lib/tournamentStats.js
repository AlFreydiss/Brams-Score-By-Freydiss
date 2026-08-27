// Agrégats de tournois pour le hub — champions, compteurs, arène la plus
// chaude. Tout est recalculé depuis l'état local déjà écrit par lib/tournament.js
// (localStorage) : aucune donnée inventée, aucun appel réseau ici. Un tournoi
// jamais ouvert retombe sur son bracket vierge, donc les compteurs valent 0
// plutôt que d'être absents.

import {
  loadState, loadVoteCounts, generateBracket,
  getTournamentProgress, getCurrentMatch, getWinner,
} from './tournament.js'

// Compte les victoires par participant sur les matchs déjà clos. Sert à
// désigner « qui mène » tant qu'un tournoi n'a pas de vainqueur final.
function tallyWins(rounds) {
  const wins = new Map()
  const byId = new Map()
  for (const round of rounds) {
    for (const m of round.matches) {
      if (m.left)  byId.set(m.left.id, m.left)
      if (m.right) byId.set(m.right.id, m.right)
      if (m.status !== 'closed' || !m.winnerId) continue
      // Un bye (un seul camp) n'est pas une victoire méritée : on l'ignore.
      if (!m.left || !m.right) continue
      wins.set(m.winnerId, (wins.get(m.winnerId) || 0) + 1)
    }
  }
  let bestId = null, bestN = 0
  for (const [id, n] of wins) {
    if (n > bestN) { bestN = n; bestId = id }
  }
  return { leader: bestId ? byId.get(bestId) || null : null, leaderWins: bestN }
}

function sumVotes(tournamentId) {
  const vc = loadVoteCounts(tournamentId)
  let total = 0
  for (const key of Object.keys(vc || {})) {
    const v = vc[key] || {}
    total += (v.left || 0) + (v.right || 0)
  }
  return total
}

// Lit un tournoi : bracket courant, avancement, vainqueur ou meneur, votes.
export function readTournament(config) {
  const rounds = loadState(config.id) || generateBracket(config.participants).rounds
  const progress = getTournamentProgress(rounds)
  const winner = getWinner(rounds)
  const current = getCurrentMatch(rounds)
  const { leader, leaderWins } = tallyWins(rounds)
  return {
    id: config.id,
    config,
    rounds,
    progress,
    winner,
    currentRound: current ? current.round : null,
    currentMatch: current ? current.match : null,
    votes: sumVotes(config.id),
    leader: winner || leader,
    leaderWins,
    started: progress.done > 0,
    finished: !!winner,
  }
}

export function readAll(configs) {
  return configs.map(readTournament)
}

// Bandeau de stats : uniquement des sommes de ce qui a réellement été joué.
export function globalStats(reads) {
  let votes = 0, done = 0, total = 0, finished = 0, started = 0
  let hottest = null
  for (const r of reads) {
    votes += r.votes
    done  += r.progress.done
    total += r.progress.total
    if (r.finished) finished++
    if (r.started) started++
    // « La plus chaude » = celle où le plus de duels ont été tranchés, les
    // votes départageant deux tournois au même nombre de duels.
    if (!hottest ||
        r.progress.done > hottest.progress.done ||
        (r.progress.done === hottest.progress.done && r.votes > hottest.votes)) {
      if (r.progress.done > 0) hottest = r
    }
  }
  return {
    votes, matchesDone: done, matchesTotal: total,
    pct: total ? Math.round((done / total) * 100) : 0,
    arenas: reads.length, finished, started, hottest,
  }
}

// Podium : les tournois terminés d'abord (vrais champions), puis ceux en cours
// avec leur meneur. Les tournois jamais lancés sortent de la liste — un podium
// rempli de cases vides ne dit rien.
export function championsBoard(reads, limit = 3) {
  const ranked = reads
    .filter(r => r.leader)
    .sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1
      if (b.leaderWins !== a.leaderWins) return b.leaderWins - a.leaderWins
      return b.progress.done - a.progress.done
    })
  return ranked.slice(0, limit)
}
