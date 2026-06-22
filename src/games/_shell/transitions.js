// Variants Framer Motion partagés par les univers de jeu.
// Sobres et motivés : entrée plein écran (on "entre dans un autre site"),
// changement d'onglet discret. Rien de gratuit.

export const universeEnter = {
  initial: { opacity: 0, scale: 0.985 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.99, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
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
