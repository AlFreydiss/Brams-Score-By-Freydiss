// Guess Who — messages à afficher au niveau du salon (logique PURE, testée).
// Un envoi d'imitation peut se terminer alors que l'écran d'enregistrement a
// déjà été remplacé par le vote : le message doit vivre au-dessus des phases.
export function takeNotice(result) {
  if (result?.error === 'phase') {
    return "Trop tard : ton imitation est arrivée après la fin du chrono, elle ne compte pas pour ce tour."
  }
  return null
}

// Arrivée en cours de partie (place donnée par le serveur).
export function joinNotice(join) {
  if (join?.late) return 'Partie en cours : tu as une place, tu joues dès ce tour.'
  return null
}

// Bandeau de connexion : seulement après plusieurs secondes sans réponse.
export function connectionNotice(connection) {
  if (connection === 'reconnecting') return 'Connexion perdue… on se reconnecte, ta place est gardée.'
  return null
}
