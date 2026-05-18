// Sons désactivés — fonctions vides pour rétrocompatibilité
const noop = () => {}

export function useSoundEffect() {
  return { play: noop, toggleMute: noop, isMuted: () => false }
}

export function useSoundHandlers() {
  return { onMouseEnter: noop, onClick: noop }
}
