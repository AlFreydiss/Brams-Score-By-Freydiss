import { useCallback, useRef } from 'react'

// Lecture vidéo au survol/focus d'une carte boutique.
// - onMouseEnter/onFocus → play ; onMouseLeave/onBlur → pause + retour au frame initial
// - supporte le fragment #t=XX dans l'URL (frame de départ de la miniature)
// - JAMAIS plus d'une vidéo en lecture : registre module qui met en pause la précédente.

let currentPlaying = null // <video> en cours de lecture (une seule à la fois)

export function startTimeOf(src = '') {
  const m = /#t=([\d.]+)/.exec(src)
  return m ? parseFloat(m[1]) || 0 : 1 // défaut 1s : vraie miniature (0s = frame noir)
}

export function pauseCurrent() {
  if (currentPlaying) {
    try { currentPlaying.pause() } catch {}
    currentPlaying = null
  }
}

export function useHoverVideo() {
  const videoRef = useRef(null)

  const play = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (currentPlaying && currentPlaying !== v) {
      try { currentPlaying.pause() } catch {}
    }
    currentPlaying = v
    const p = v.play?.()
    if (p?.catch) p.catch(() => {})
  }, [])

  const stop = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    try {
      v.pause()
      v.currentTime = startTimeOf(v.currentSrc || v.src)
    } catch {}
    if (currentPlaying === v) currentPlaying = null
  }, [])

  return {
    videoRef,
    onMouseEnter: play,
    onMouseLeave: stop,
    onFocus: play,
    onBlur: stop,
  }
}
