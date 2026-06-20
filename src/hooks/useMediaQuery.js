import { useState, useEffect } from 'react'

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    setMatches(mq.matches)
    return () => mq.removeEventListener('change', handler)
  }, [query])
  return matches
}

export const useMobile  = () => useMediaQuery('(max-width: 768px)')
export const useTablet  = () => useMediaQuery('(max-width: 1024px)')
// 1040 (et pas 1100) : les iPads en paysage font 1080–1194pt de viewport —
// à 1100 ils tombaient en 1 colonne (hub sous le fold, moitié droite vide).
export const useNarrow  = () => useMediaQuery('(max-width: 1040px)')
// Détection "appareil peu performant" — signaux matériels + préférence/réseau.
// Sert d'aiguillage unique pour dégrader les effets lourds (3D, particules,
// animations framer, vidéos de fond) sur les téléphones d'entrée de gamme.
// deviceMemory/hardwareConcurrency sont absents sur Safari/iOS → on ne déclenche
// QUE sur signal positif (jamais `undefined < 4`, qui vaut false → pas de faux low-end).
export function detectLowEnd() {
  if (typeof navigator === 'undefined') return false
  const mem   = navigator.deviceMemory          // Go (Chromium/Android)
  const cores = navigator.hardwareConcurrency    // logiques
  const conn  = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  const saveData = Boolean(conn?.saveData)
  const slowNet  = /(^|-)2g$/.test(conn?.effectiveType || '')
  const lowMem   = typeof mem === 'number'   && mem   <= 4
  const lowCpu   = typeof cores === 'number' && cores <= 4
  return saveData || slowNet || lowMem || lowCpu
}

// Hook réactif : low-end matériel OU mobile (petit écran = budget GPU/CPU serré).
export const useLowEnd  = () => {
  const mobile = useMediaQuery('(max-width: 768px)')
  const [hw, setHw] = useState(() => detectLowEnd())
  useEffect(() => { setHw(detectLowEnd()) }, [])
  return hw || mobile
}

// Reduced-motion seul (OS) — pour les composants qui veulent ne couper QUE l'anim,
// sans dégrader la qualité visuelle d'un appareil simplement petit.
export const usePrefersReducedMotion = () =>
  useMediaQuery('(prefers-reduced-motion: reduce)')
