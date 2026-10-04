// Guess Who — palmarès du joueur sur cet appareil (logique PURE, testée).
// Parties : jouées, victoires, podiums, record de votes. Entraînement : meilleur
// score par son et nombre d'essais. Tout vit en localStorage (aucune table).

export const PALMARES_KEY = 'gw_palmares'

export function emptyPalmares() {
  return { games: 0, wins: 0, podiums: 0, bestVotes: 0, seen: [], solo: {}, soloPlays: 0 }
}

export function parsePalmares(raw) {
  try {
    const p = JSON.parse(raw || 'null')
    return p && typeof p === 'object' ? { ...emptyPalmares(), ...p } : emptyPalmares()
  } catch { return emptyPalmares() }
}

// Fin de partie : `gameId` évite de compter deux fois (rechargement de
// l'écran de fin, revanche dans le même salon = autre id).
export function recordGame(p, { gameId, rank, votes = 0 }) {
  if (!gameId || rank == null || p.seen.includes(gameId)) return p
  return {
    ...p,
    games: p.games + 1,
    wins: p.wins + (rank === 1 ? 1 : 0),
    podiums: p.podiums + (rank <= 3 ? 1 : 0),
    bestVotes: Math.max(p.bestVotes, votes),
    seen: [...p.seen, gameId].slice(-40),
  }
}

// Essai d'entraînement → nouveau palmarès + record battu ?
export function recordSolo(p, clipId, score) {
  const prev = p.solo[clipId] || 0
  return {
    palmares: { ...p, soloPlays: p.soloPlays + 1, solo: { ...p.solo, [clipId]: Math.max(prev, score) } },
    record: score > prev,
    previous: prev,
  }
}

export function soloSummary(p) {
  const scores = Object.values(p.solo)
  return {
    clips: scores.length,
    best: scores.length ? Math.max(...scores) : 0,
    mastered: scores.filter((s) => s >= 85).length,
  }
}
