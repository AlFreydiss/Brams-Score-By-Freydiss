// Guess Who — niveau sonore « ambiant » partagé avec le fond (SoundField).
// Les lecteurs (enveloppe du son en cours) et le micro (ta voix) y poussent
// une valeur 0..1 à chaque image ; le fond la lit sans passer par React.
const state = { level: 0, at: -1e9 }

export function pushLevel(v) {
  state.level = Math.max(0, Math.min(1, v || 0))
  state.at = performance.now()
}

// Dernier niveau reçu, ou 0 si personne n'a rien poussé depuis 200 ms.
export function ambientLevel(now = performance.now()) {
  return now - state.at < 200 ? state.level : 0
}
