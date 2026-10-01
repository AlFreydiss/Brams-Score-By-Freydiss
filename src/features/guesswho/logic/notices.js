// Guess Who — messages à afficher au niveau du salon (logique PURE, testée).
// Un envoi d'imitation peut se terminer alors que l'écran d'enregistrement a
// déjà été remplacé par le vote : le message doit vivre au-dessus des phases.
export function takeNotice(result) {
  if (result?.error === 'phase') {
    return "Trop tard : ton imitation est arrivée après la fin du chrono, elle ne compte pas pour ce tour."
  }
  return null
}
