// Refus de guesswho_start → message lisible. Une erreur inconnue garde son
// texte brut : sans lui, « Lancement impossible » ne dit pas quoi réparer.
const MESSAGES = {
  not_enough_players: 'Il faut au moins 3 joueurs connectés.',
  too_many_players: '8 joueurs maximum.',
  unauthorized: "Seul l'hôte peut lancer la partie.",
  phase: 'Une partie est déjà en cours.',
}

export function startErrorText(r) {
  if (!r?.error) return null
  if (MESSAGES[r.error]) return MESSAGES[r.error]
  return `Lancement impossible : ${String(r.error).slice(0, 140)}`
}
