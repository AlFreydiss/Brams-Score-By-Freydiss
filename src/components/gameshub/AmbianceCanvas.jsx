// ── Taverne de l'Arcade — fond d'ambiance : braises/poussières d'or ───────────
// Canvas 2D plein écran (fixed, zIndex 0, pointerEvents none) : des particules
// dorées dérivent lentement vers le haut avec un léger sway sinusoïdal.
// - DPR-aware (resize), rAF pausé quand l'onglet est caché, cleanup complet.
// - prefers-reduced-motion → UNE frame statique très discrète, zéro animation.
// - Perf : une seule passe par frame, aucune allocation dans la boucle
//   (couleurs pré-calculées en strings, particules mutées en place).
import { useEffect, useRef } from 'react'

const TAU = Math.PI * 2
// Teintes interpolées entre l'or du hub (#d4a017) et son highlight (#f0d27a).
const GOLD = [212, 160, 23]
const GOLD_HI = [240, 210, 122]

function makeParticles(count, blurCount) {
  const arr = []
  for (let i = 0; i < count; i++) {
    const big = i >= count - blurCount // les grosses floues EN FIN de tableau → un seul switch shadowBlur/frame
    const t = Math.random()
    const r = Math.round(GOLD[0] + (GOLD_HI[0] - GOLD[0]) * t)
    const g = Math.round(GOLD[1] + (GOLD_HI[1] - GOLD[1]) * t)
    const b = Math.round(GOLD[2] + (GOLD_HI[2] - GOLD[2]) * t)
    arr.push({
      bx: Math.random(),                        // colonne de base (fraction de largeur)
      y: Math.random() * 1.06 - 0.03,           // fraction de hauteur
      size: big ? 2.2 + Math.random() * 1.3 : 1 + Math.random() * 1.5,
      vy: 0.015 + Math.random() * 0.035,        // fractions de hauteur / seconde (lent)
      swayAmp: 6 + Math.random() * 16,          // px
      swayFreq: 0.2 + Math.random() * 0.4,      // rad/s
      phase: Math.random() * TAU,
      alpha: 0.06 + Math.random() * 0.22,
      color: `rgb(${r},${g},${b})`,
      big,
    })
  }
  return arr
}

export default function AmbianceCanvas({ density = 55 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const count = Math.max(1, Math.round(density))
    const blurCount = Math.min(count, Math.max(1, Math.round(count * 8 / 55)))
    const firstBlur = count - blurCount
    const particles = makeParticles(count, blurCount)

    let w = 0, h = 0
    let raf = 0
    let last = 0

    // dt=0 → frame statique (reduced motion) ; dim < 1 atténue encore l'opacité.
    const draw = (timeSec, dt, dim) => {
      ctx.clearRect(0, 0, w, h)
      ctx.shadowBlur = 0
      for (let i = 0; i < count; i++) {
        const p = particles[i]
        if (dt > 0) {
          p.y -= p.vy * dt
          if (p.y < -0.03) { // sortie en haut → respawn en bas
            p.y = 1.03
            p.bx = Math.random()
            p.phase = Math.random() * TAU
          }
        }
        if (i === firstBlur) ctx.shadowBlur = 6 // léger halo, uniquement les grosses
        const x = p.bx * w + Math.sin(timeSec * p.swayFreq + p.phase) * p.swayAmp
        if (p.big) ctx.shadowColor = p.color
        ctx.globalAlpha = p.alpha * dim
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(x, p.y * h, p.size, 0, TAU)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0) // on dessine en px CSS
      if (reduced) draw(0, 0, 0.55) // frame figée très discrète, redessinée au resize
    }

    const loop = (now) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0 // clamp anti-saut (retour d'onglet)
      last = now
      draw(now / 1000, dt, 1)
      raf = requestAnimationFrame(loop)
    }

    const onVisibility = () => {
      if (document.hidden) {
        if (raf) { cancelAnimationFrame(raf); raf = 0 }
      } else if (!raf && !reduced) {
        last = 0
        raf = requestAnimationFrame(loop)
      }
    }

    resize()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    if (!reduced && !document.hidden) raf = requestAnimationFrame(loop)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [density])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        width: '100%', height: '100%', display: 'block',
      }}
    />
  )
}
