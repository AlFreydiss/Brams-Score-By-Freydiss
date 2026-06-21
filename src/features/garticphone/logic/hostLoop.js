// Freydiss Phone — décisions de la boucle hôte (logique PURE, testable).
// L'hôte fait avancer la partie quand le temps est écoulé OU quand tous les
// joueurs connectés ont soumis leur page du round courant.

// remaining (secondes) écoulé ?
export function timeUp(phaseEndsAtMs, serverNowMs) {
  if (!phaseEndsAtMs) return false
  return serverNowMs >= phaseEndsAtMs
}

// Tous les joueurs CONNECTÉS (avec un siège assigné) ont une page ce round ?
// players: [{ user_id, seat, connected }], submittedSeats: Set<number>
export function allSubmitted(players, submittedSeats) {
  const active = players.filter((p) => p.connected && p.seat != null)
  if (active.length === 0) return false
  return active.every((p) => submittedSeats.has(p.seat))
}

// Décision finale : faut-il avancer ?
// room: { phase_ends_at(ms), current_round, status }, players, submittedSeats, serverNow(ms)
export function shouldAdvance(room, players, submittedSeats, serverNowMs) {
  if (!room) return false
  if (!['writing', 'drawing', 'describing'].includes(room.status)) return false
  if (timeUp(room.phaseEndsAtMs, serverNowMs)) return true
  if (allSubmitted(players, submittedSeats)) return true
  return false
}

// Sièges sans page ce round, à combler par des placeholders avant d'avancer.
// Seuls les sièges assignés (0..n-1) comptent.
export function missingSeats(players, submittedSeats, n) {
  const seats = []
  for (let s = 0; s < n; s++) if (!submittedSeats.has(s)) seats.push(s)
  return seats
}
