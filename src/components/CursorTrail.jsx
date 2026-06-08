import { useEffect, useRef } from 'react'

// Traînée dorée premium qui suit le curseur (sparkles qui s'estompent).
// Canvas pour la perf, particules plafonnées, fondu "lighter" pour le glow.
// Désactivé sur tactile (pas de curseur) et si l'utilisateur réduit les animations.
export default function CursorTrail() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const fine = window.matchMedia?.('(pointer: fine)')?.matches
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (!fine || reduce) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0, h = 0
    const resize = () => {
      w = canvas.width = window.innerWidth * dpr
      h = canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
    }
    resize()
    window.addEventListener('resize', resize)

    const COLORS = ['#e8c878', '#d4a017', '#bfa46a', '#ffe9a8']
    const parts = []
    let lastX = null, lastY = null, raf = 0

    const onMove = (e) => {
      const x = e.clientX * dpr, y = e.clientY * dpr
      if (lastX != null) {
        const dx = x - lastX, dy = y - lastY
        const dist = Math.hypot(dx, dy)
        // densité proportionnelle à la vitesse (sans spammer)
        const n = Math.min(6, Math.max(1, Math.round(dist / (7 * dpr))))
        for (let i = 0; i < n; i++) {
          const t = i / n
          parts.push({
            x: lastX + dx * t, y: lastY + dy * t,
            vx: (Math.random() - 0.5) * 0.4 * dpr,
            vy: ((Math.random() - 0.5) * 0.4 + 0.18) * dpr,
            life: 1,
            size: (Math.random() * 2 + 1.6) * dpr,
            color: COLORS[(Math.random() * COLORS.length) | 0],
          })
        }
      }
      lastX = x; lastY = y
      if (parts.length > 260) parts.splice(0, parts.length - 260)
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        p.x += p.vx; p.y += p.vy
        p.vy += 0.02 * dpr
        p.life -= 0.03
        if (p.life <= 0) { parts.splice(i, 1); continue }
        ctx.beginPath()
        ctx.shadowBlur = 9 * dpr
        ctx.shadowColor = p.color
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.life * 0.85
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
      ctx.globalCompositeOperation = 'source-over'
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden style={{
    position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none',
  }} />
}
