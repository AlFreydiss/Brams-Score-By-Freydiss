// fx — primitives de juice partagées (screen shake, glows d'événements).
// Toutes dégradent proprement sous prefers-reduced-motion (shake → no-op).
import { useCallback, useRef, useState, useEffect } from 'react'
import { glow, timing } from './arenaTokens.js'

const prefersReduce = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// useScreenShake → { style, shake(intensity?) }. Applique un micro-jitter borné
// sur un conteneur (transform translate) pendant timing.shake ms, via rAF.
export function useScreenShake() {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const raf = useRef(0)
  const shake = useCallback((intensity = 4) => {
    if (prefersReduce()) return
    const start = performance.now()
    cancelAnimationFrame(raf.current)
    const step = (now) => {
      const t = (now - start) / timing.shake
      if (t >= 1) { setOffset({ x: 0, y: 0 }); return }
      const decay = (1 - t) * intensity
      // jitter pseudo-aléatoire déterministe (pas de Math.random requis pour l'effet)
      const a = Math.sin(now * 0.09) * decay
      const b = Math.cos(now * 0.13) * decay
      setOffset({ x: a, y: b })
      raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
  }, [])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const style = { transform: `translate(${offset.x.toFixed(2)}px, ${offset.y.toFixed(2)}px)` }
  return { style, shake }
}

// boxShadow d'un événement de case/pièce (échec, promotion, victoire).
export function eventGlow(kind) {
  return glow[kind] || 'none'
}

export { timing, glow }
