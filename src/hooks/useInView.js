import { useEffect, useRef, useState } from 'react'

// Révèle le contenu à l'entrée dans le viewport, avec garde-fous pour qu'il
// n'arrive JAMAIS qu'une section reste invisible (le bug "faut actualiser") :
//  - seuil 0 : une section plus haute que l'écran n'atteint jamais 15% de ratio
//  - révèle tout de suite si l'élément est déjà visible au montage (au-dessus de
//    la ligne de flottaison, où l'observer n'émet pas toujours de callback fiable)
//  - filet de sécurité : révèle après un délai si l'observer ne se déclenche jamais
//  - respecte prefers-reduced-motion (affichage immédiat)
export function useInView(threshold = 0) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) { setInView(true); return }

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setInView(true)
      return
    }

    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold, rootMargin: '0px 0px -10% 0px' },
    )
    obs.observe(el)

    // Déjà dans le viewport au montage → on révèle immédiatement (l'animation CSS
    // se joue quand même : le premier rendu a peint opacity:0 avant cet effet).
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight || document.documentElement.clientHeight
    if (rect.top < vh && rect.bottom > 0) { setInView(true); obs.disconnect() }

    // Garde-fou ultime : le contenu ne doit jamais rester masqué.
    const fallback = setTimeout(() => { setInView(true); obs.disconnect() }, 1500)

    return () => { obs.disconnect(); clearTimeout(fallback) }
  }, [threshold])

  return [ref, inView]
}
