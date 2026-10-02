// Guess Who — meilleures imitations de la partie (logique PURE, testée).
// À chaque verdict, on retient l'imitation la plus votée du tour ; à la fin,
// la meilleure de toutes est rejouée en grand.

export function addHighlight(list, result, takes, clipTitle) {
  if (!result || result.stage === 'auto' || list.some((h) => h.round === result.round)) return list
  const scores = result.scores || {}
  let best = null
  for (const t of takes || []) {
    const v = scores[t.user_id] || 0
    if (v > 0 && (!best || v > best.votes)) best = { round: result.round, user_id: t.user_id, votes: v, audio_url: t.audio_url, clip: clipTitle }
  }
  return best ? [...list, best] : list
}

export function bestHighlight(list) {
  let best = null
  for (const h of list || []) if (!best || h.votes >= best.votes) best = h
  return best
}

// Récap serveur (guesswho_stats) → même forme que addHighlight. Il fait foi :
// il survit au rechargement et aux phases ratées en arrière-plan.
export function highlightsFromStats(stats) {
  const out = []
  for (const r of stats?.rounds || []) {
    const b = r?.best
    if (!b || !b.user_id || !(b.votes > 0) || !b.audio_url) continue
    out.push({ round: r.round, user_id: b.user_id, votes: b.votes, audio_url: b.audio_url, clip: r.clip?.title || '' })
  }
  return out
}

// Fusion : le serveur remplace le local pour un même tour, le local comble les trous.
export function mergeHighlights(local, server) {
  const byRound = new Map()
  for (const h of local || []) byRound.set(h.round, h)
  for (const h of server || []) byRound.set(h.round, h)
  return [...byRound.values()].sort((a, b) => a.round - b.round)
}
