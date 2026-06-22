// Variants Framer Motion partagés par les univers de jeu.
// Sobres et motivés : entrée plein écran (on "entre dans un autre site"),
// changement d'onglet discret. Rien de gratuit.
// Respecte prefers-reduced-motion : on retombe sur un simple fondu, sans scale ni y.

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const universeEnter = (() => {
  if (prefersReducedMotion()) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.3, ease: 'linear' } },
      exit: { opacity: 0, transition: { duration: 0.2, ease: 'linear' } },
    }
  }
  return {
    initial: { opacity: 0, scale: 0.985 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, scale: 0.99, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
  }
})()

// Morph « shared-element » : l'univers grandit depuis le point cliqué sur la carte
// du hub (origin = {x,y} en px viewport, passé via location.state). Sobre — un seul
// élément qui s'agrandit, transform-origin calé sur la carte. Fallback = universeEnter
// quand on arrive en URL directe (pas d'origin).
// Le scale de départ est plafonné à ~0.62 : assez pour lire « ça grandit depuis la
// carte » sans transformer toute la page en vignette floue qui ballonne.
export const universeMorph = (origin) => {
  if (!origin) return universeEnter
  if (prefersReducedMotion()) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.3, ease: 'linear' } },
      exit: { opacity: 0, transition: { duration: 0.2, ease: 'linear' } },
    }
  }
  const ox = typeof window !== 'undefined' ? (origin.x / window.innerWidth) * 100 : 50
  const oy = typeof window !== 'undefined' ? (origin.y / window.innerHeight) * 100 : 50
  return {
    style: { transformOrigin: `${ox}% ${oy}%` },
    initial: { opacity: 0, scale: 0.62 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.46, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, scale: 0.99, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
  }
}

export const tabSwap = (() => {
  if (prefersReducedMotion()) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.16, ease: 'linear' } },
      exit: { opacity: 0, transition: { duration: 0.12, ease: 'linear' } },
    }
  }
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, y: -6, transition: { duration: 0.12, ease: 'linear' } },
  }
})()

// Révélations échelonnées au montage d'un onglet (listes, panneaux).
// Sans mouvement vertical quand la réduction d'animation est demandée.
export const stagger = (i, base = 0.04) => {
  if (prefersReducedMotion()) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.24, delay: i * base, ease: 'linear' } },
    }
  }
  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.32, delay: i * base, ease: [0.22, 1, 0.36, 1] } },
  }
}
