import { useEffect, useRef } from 'react'

// Champ de particules canvas pour le fond du Fil (porté de dillionverma/particles,
// inline styles, zéro dépendance). Or One Piece tamisé, dérive lente + légère
// réaction au curseur. Perf : quantité réduite mobile, rAF en pause onglet caché,
// prefers-reduced-motion → rendu statique une seule fois.
const COULEUR = [201, 162, 75] // or tamisé, raccord avec la lueur dorée du fond
const QUANTITE_DESKTOP = 70
const QUANTITE_MOBILE = 28
const EASE = 60
const STATICITY = 50
const TAILLE = 0.5

export default function ParticleField({ style }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const quantity = window.innerWidth < 768 ? QUANTITE_MOBILE : QUANTITE_DESKTOP
    let circles = []
    let mouse = { x: 0, y: 0 }
    let cw = 0
    let ch = 0
    let raf
    let running = true

    const spawn = () => ({
      x: Math.random() * cw,
      y: Math.random() * ch,
      tx: 0,
      ty: 0,
      size: Math.floor(Math.random() * 2) + TAILLE,
      alpha: 0,
      target: Math.random() * 0.5 + 0.08,
      dx: (Math.random() - 0.5) * 0.1,
      dy: (Math.random() - 0.5) * 0.1,
      mag: 0.1 + Math.random() * 4,
    })

    const drawStatic = () => {
      ctx.clearRect(0, 0, cw, ch)
      for (const c of circles) {
        ctx.beginPath()
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${COULEUR.join(',')},${c.target})`
        ctx.fill()
      }
    }

    const resize = () => {
      circles = []
      cw = container.offsetWidth
      ch = container.offsetHeight
      canvas.width = cw * dpr
      canvas.height = ch * dpr
      canvas.style.width = `${cw}px`
      canvas.style.height = `${ch}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      for (let i = 0; i < quantity; i++) circles.push(spawn())
      if (reduced) drawStatic()
    }

    const onMouseMove = (e) => {
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left - cw / 2
      const y = e.clientY - r.top - ch / 2
      if (Math.abs(x) < cw / 2 && Math.abs(y) < ch / 2) mouse = { x, y }
    }

    const frame = () => {
      if (!running) return
      ctx.clearRect(0, 0, cw, ch)
      for (let i = circles.length - 1; i >= 0; i--) {
        const c = circles[i]
        const edges = [c.x + c.tx - c.size, cw - c.x - c.tx - c.size, c.y + c.ty - c.size, ch - c.y - c.ty - c.size]
        const fade = Math.max(0, Math.min(1, Math.min(...edges) / 20))
        c.alpha = fade >= 1 ? Math.min(c.alpha + 0.02, c.target) : c.target * fade
        c.x += c.dx
        c.y += c.dy
        c.tx += (mouse.x / (STATICITY / c.mag) - c.tx) / EASE
        c.ty += (mouse.y / (STATICITY / c.mag) - c.ty) / EASE

        ctx.save()
        ctx.translate(c.tx, c.ty)
        ctx.beginPath()
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${COULEUR.join(',')},${c.alpha})`
        ctx.fill()
        ctx.restore()

        if (c.x < -c.size || c.x > cw + c.size || c.y < -c.size || c.y > ch + c.size) {
          circles[i] = spawn()
        }
      }
      raf = requestAnimationFrame(frame)
    }

    const onVisibility = () => {
      if (reduced) return
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!running) {
        running = true
        raf = requestAnimationFrame(frame)
      }
    }

    resize()
    if (!reduced) {
      frame()
      window.addEventListener('mousemove', onMouseMove)
      document.addEventListener('visibilitychange', onVisibility)
    }
    window.addEventListener('resize', resize)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <div ref={containerRef} aria-hidden style={{ pointerEvents: 'none', ...style }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}
