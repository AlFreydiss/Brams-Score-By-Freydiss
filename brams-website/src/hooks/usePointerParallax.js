import { useEffect, useRef } from 'react'

export function usePointerParallax({
  strength = 1,
  damp = 0.075,
  disabled = false,
  onFrame,
} = {}) {
  const ref = useRef(null)

  useEffect(() => {
    if (disabled) return undefined

    const target = { x: 0, y: 0 }
    const current = { x: 0, y: 0 }
    let raf = 0

    const onMove = (event) => {
      target.x = (event.clientX / window.innerWidth - 0.5) * strength
      target.y = (event.clientY / window.innerHeight - 0.5) * strength
    }

    const tick = () => {
      current.x += (target.x - current.x) * damp
      current.y += (target.y - current.y) * damp

      if (ref.current) {
        ref.current.style.setProperty('--parallax-x', current.x.toFixed(3))
        ref.current.style.setProperty('--parallax-y', current.y.toFixed(3))
      }

      onFrame?.(current)
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [damp, disabled, onFrame, strength])

  return ref
}
