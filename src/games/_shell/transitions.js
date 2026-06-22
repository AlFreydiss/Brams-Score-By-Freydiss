// Variants Framer Motion partagés par les univers de jeu.
// Sobres et motivés : entrée plein écran (on "entre dans un autre site"),
// changement d'onglet discret. Rien de gratuit.

export const universeEnter = {
  initial: { opacity: 0, scale: 0.985 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.99, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
}

// Morph « shared-element » : l'univers grandit depuis le point cliqué sur la carte
// du hub (origin = {x,y} en px viewport, passé via location.state). Sobre — un seul
// élément qui s'agrandit, transform-origin calé sur la carte. Fallback = universeEnter
// quand on arrive en URL directe (pas d'origin).
export const universeMorph = (origin) => {
  if (!origin) return universeEnter
  const ox = typeof window !== 'undefined' ? (origin.x / window.innerWidth) * 100 : 50
  const oy = typeof window !== 'undefined' ? (origin.y / window.innerHeight) * 100 : 50
  return {
    style: { transformOrigin: `${ox}% ${oy}%` },
    initial: { opacity: 0, scale: 0.18 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.46, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, scale: 0.99, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
  }
}

export const tabSwap = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.12, ease: 'linear' } },
}

// Révélations échelonnées au montage d'un onglet (listes, panneaux).
export const stagger = (i, base = 0.04) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, delay: i * base, ease: [0.22, 1, 0.36, 1] } },
})
