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
