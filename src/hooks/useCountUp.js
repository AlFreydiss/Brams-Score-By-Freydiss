import { useState, useEffect, useRef } from 'react'

// Anime une valeur de 0 → target avec un easing ease-out cubique (rAF).
// Respecte prefers-reduced-motion (affiche directement la valeur finale).
export function useCountUp(target, duration = 2000) {
  const [val, setVal] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    const t = Number(target) || 0
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) { setVal(t); return }
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(t * eased)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])
  return val
}

export default useCountUp
