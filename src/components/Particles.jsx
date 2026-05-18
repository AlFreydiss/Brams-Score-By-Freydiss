import { useEffect, useRef } from 'react'

export default function Particles() {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const particlesRef = useRef([])
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const onMouse = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMouse)

    // Crée des "fils de Doflamingo" — petits traits blancs qui flottent
    const MAX = 30
    const spawn = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      len: Math.random() * 40 + 20,
      angle: Math.random() * Math.PI * 2,
      vangle: (Math.random() - 0.5) * 0.01,
      alpha: Math.random() * 0.3 + 0.05,
      life: 1,
      decay: Math.random() * 0.001 + 0.0003,
    })

    particlesRef.current = Array.from({ length: MAX }, spawn)

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      particlesRef.current.forEach((p, idx) => {
        // Parallax mouse
        const dx = mx - p.x, dy = my - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 200) {
          p.vx -= dx / dist * 0.015
          p.vy -= dy / dist * 0.015
        }

        p.x += p.vx
        p.y += p.vy
        p.angle += p.vangle
        p.life -= p.decay

        // Damping
        p.vx *= 0.995
        p.vy *= 0.995

        // Wrap around
        if (p.x < -50) p.x = canvas.width + 50
        if (p.x > canvas.width + 50) p.x = -50
        if (p.y < -50) p.y = canvas.height + 50
        if (p.y > canvas.height + 50) p.y = -50

        if (p.life <= 0) {
          particlesRef.current[idx] = spawn()
          return
        }

        const alpha = p.alpha * p.life
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)

        // Fil fin style Doflamingo
        const grad = ctx.createLinearGradient(0, 0, p.len, 0)
        grad.addColorStop(0, 'rgba(255,255,255,0)')
        grad.addColorStop(0.3, 'rgba(255,255,255,0.9)')
        grad.addColorStop(0.7, 'rgba(255,220,220,0.6)')
        grad.addColorStop(1, 'rgba(255,255,255,0)')

        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(p.len, 0)
        ctx.strokeStyle = grad
        ctx.lineWidth = 0.8
        ctx.stroke()

        ctx.restore()
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouse)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  )
}
