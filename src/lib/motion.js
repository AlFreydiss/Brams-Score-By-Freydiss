import { useEffect, useRef, useState } from 'react'

// ── Vocabulaire de mouvement ────────────────────────────────────────────────
// Trois pages animaient chacune à sa façon : des durées tirées au hasard entre
// 0,18 s et 1 s, quatre courbes différentes, et surtout des animations d'entrée
// jouées au MONTAGE — donc terminées depuis longtemps quand on arrive enfin sur
// la section en défilant. Ce module donne une seule grammaire :
//
//   EASE / DUR      les courbes et durées, partout les mêmes
//   useReveal()     l'entrée se déclenche quand on ARRIVE sur l'élément
//   MOTION_CSS      les classes correspondantes pour ce qui n'est pas en JS
//
// Tout est neutralisé sous `prefers-reduced-motion`.

export const EASE = {
  // Sortie franche puis freinage long : le mouvement se pose au lieu de
  // s'arrêter net. C'est la courbe par défaut du site.
  out: [0.16, 1, 0.3, 1],
  // Variante plus douce, déjà en place sur les pages de tournoi.
  soft: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
}

export const EASE_CSS = {
  out: 'cubic-bezier(.16,1,.3,1)',
  soft: 'cubic-bezier(.22,1,.36,1)',
  inOut: 'cubic-bezier(.65,0,.35,1)',
}

export const DUR = {
  fast: 0.16,   // survol, bascule d'état
  base: 0.3,    // apparition d'un élément
  slow: 0.55,   // entrée d'une section
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

// Révélation à l'entrée dans le viewport.
// `margin` négatif en bas : l'élément commence à se révéler juste avant
// d'apparaître, l'animation est donc finie quand le regard s'y pose.
export function useReveal({ margin = '0px 0px -10% 0px', threshold = 0.05, once = true } = {}) {
  const ref = useRef(null)
  // Sous réduction de mouvement, tout est visible d'emblée : pas d'observateur,
  // pas de transition, et surtout aucun contenu bloqué à l'état caché.
  const [shown, setShown] = useState(prefersReducedMotion)

  useEffect(() => {
    if (shown) return
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return }

    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        // `isIntersecting` seul ne suffit pas : un saut de défilement — ancre,
        // restauration de position, « tout voir » — peut franchir l'élément
        // sans qu'aucune observation ne le voie à l'écran, et il resterait
        // invisible pour de bon. On révèle donc aussi ce qui est déjà passé
        // au-dessus.
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          setShown(true)
          if (once) io.disconnect()
        } else if (!once) {
          setShown(false)
        }
      }
    }, { rootMargin: margin, threshold })

    io.observe(el)

    // Filet de sécurité : quoi qu'il arrive, rien ne reste caché. Une
    // révélation ratée coûterait un contenu invisible, ce qui est bien pire
    // que de perdre l'animation.
    const failsafe = setTimeout(() => setShown(true), 2500)

    return () => { clearTimeout(failsafe); io.disconnect() }
  }, [shown, margin, threshold, once])

  return [ref, shown]
}

// Classe à poser sur un élément révélé, avec un décalage optionnel pour les
// listes (une carte après l'autre plutôt que toutes d'un bloc).
export function revealProps(shown, index = 0, step = 45, max = 260) {
  return {
    className: `mo-rise${shown ? ' mo-in' : ''}`,
    style: { transitionDelay: shown ? `${Math.min(index * step, max)}ms` : '0ms' },
  }
}

// ── Variantes framer-motion ─────────────────────────────────────────────────
export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: { duration: DUR.slow, ease: EASE.out } },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: DUR.base, ease: EASE.out } },
}

export const staggerChildren = (step = 0.05, delay = 0) => ({
  hidden: {},
  shown: { transition: { staggerChildren: step, delayChildren: delay } },
})

// ── Feuille de style commune ────────────────────────────────────────────────
// `translate3d` plutôt que `translateY` : la couche part sur le compositeur et
// la révélation ne repeint pas la page pendant le défilement.
export const MOTION_CSS = `
  :root { --mo-out: ${EASE_CSS.out}; --mo-soft: ${EASE_CSS.soft} }

  .mo-rise {
    opacity: 0;
    transform: translate3d(0, 18px, 0);
    transition: opacity ${DUR.slow}s var(--mo-out), transform ${DUR.slow}s var(--mo-out);
    will-change: opacity, transform;
  }
  .mo-rise.mo-in { opacity: 1; transform: none; will-change: auto }

  .mo-lift { transition: transform ${DUR.fast}s var(--mo-out), box-shadow ${DUR.base}s var(--mo-out) }

  @media (prefers-reduced-motion: reduce) {
    .mo-rise, .mo-rise.mo-in {
      opacity: 1 !important;
      transform: none !important;
      transition: none !important;
      transition-delay: 0ms !important;
    }
    .mo-lift { transition: none !important }
  }
`
