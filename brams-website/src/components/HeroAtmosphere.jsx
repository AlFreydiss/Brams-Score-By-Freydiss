import { useEffect, useRef } from 'react'

export default function HeroAtmosphere() {
  const ref = useRef(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    let raf = 0
    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0

    const onMove = (event) => {
      targetX = (event.clientX / window.innerWidth - 0.5) * 18
      targetY = (event.clientY / window.innerHeight - 0.5) * 14
    }

    const tick = () => {
      currentX += (targetX - currentX) * 0.055
      currentY += (targetY - currentY) * 0.055
      root.style.setProperty('--hero-parallax-x', `${currentX.toFixed(2)}px`)
      root.style.setProperty('--hero-parallax-y', `${currentY.toFixed(2)}px`)
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  const sparks = Array.from({ length: 18 }, (_, i) => ({
    left: `${6 + ((i * 31) % 86)}%`,
    top: `${12 + ((i * 17) % 74)}%`,
    delay: `${(i % 9) * 0.7}s`,
    duration: `${9 + (i % 5) * 2}s`,
  }))

  return (
    <div ref={ref} className="hero-atmosphere" aria-hidden="true">
      <div className="hero-depth-wash" />
      <div className="hero-rain" />
      <div className="hero-mist hero-mist-a" />
      <div className="hero-mist hero-mist-b" />
      <div className="hero-haki" />
      <div className="hero-dust-field">
        {sparks.map((spark, i) => (
          <span
            key={i}
            className="hero-dust"
            style={{
              left: spark.left,
              top: spark.top,
              animationDelay: spark.delay,
              animationDuration: spark.duration,
            }}
          />
        ))}
      </div>
    </div>
  )
}
