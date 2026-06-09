import { useEffect, useRef } from 'react'
import { TRAIL_DEFAULTS } from '../data/cursor-trails.js'

// Moteur de traînée de curseur piloté par un skin (cf. data/cursor-trails.js).
// skin = config fusionnée sur TRAIL_DEFAULTS. Rendu uniquement si skin fourni
// (la traînée n'apparaît que quand une est équipée en boutique).
export default function CursorTrail({ skin, isGlobal = false }) {
  const canvasRef = useRef(null)
  // Ref vivante : permet de changer de skin sans recréer la boucle/les listeners.
  const cfgRef = useRef(null)
  cfgRef.current = skin ? { ...TRAIL_DEFAULTS, ...skin } : null

  useEffect(() => {
    const fine = window.matchMedia?.('(pointer: fine)')?.matches
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (!fine || reduce) return undefined

    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, TRAIL_DEFAULTS.dpr)
    let w = 0, h = 0, emitX = null, emitY = null, raf = 0, hue = 0
    const parts = []

    const resize = () => {
      w = canvas.width = window.innerWidth * dpr
      h = canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
    }

    // PERF : au lieu d'un shadowBlur par particule À CHAQUE frame (très coûteux en
    // canvas), on pré-rend UN sprite de glow par couleur (radial gradient) une seule
    // fois, puis on fait drawImage (bon marché). Même rendu glowy, sans le coût du
    // shadowBlur. Cache borné (couleurs fixes du skin + teintes arrondies pour l'arc-en-ciel).
    const SPR = 64
    const spriteCache = new Map()
    const getSprite = (color) => {
      let c = spriteCache.get(color)
      if (c) return c
      c = document.createElement('canvas'); c.width = c.height = SPR
      const g = c.getContext('2d')
      const grd = g.createRadialGradient(SPR / 2, SPR / 2, 0, SPR / 2, SPR / 2, SPR / 2)
      grd.addColorStop(0, color); grd.addColorStop(0.32, color); grd.addColorStop(1, 'transparent')
      g.fillStyle = grd; g.beginPath(); g.arc(SPR / 2, SPR / 2, SPR / 2, 0, Math.PI * 2); g.fill()
      if (spriteCache.size > 400) spriteCache.clear()
      spriteCache.set(color, c)
      return c
    }

    const tick = () => {
      const C = cfgRef.current
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = (C?.composite) || 'lighter'

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += (p.gravity ?? 0.02) * dpr
        p.life -= p.decay

        if (p.life <= 0) { parts.splice(i, 1); continue }

        // rayon visuel = cœur + halo (équivalent de l'ancien shadowBlur), via le sprite
        const r = p.size * p.life + p.shadow * dpr * 0.6
        ctx.globalAlpha = p.life * p.alpha
        ctx.drawImage(getSprite(p.color), p.x - r, p.y - r, r * 2, r * 2)
      }

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      raf = parts.length ? requestAnimationFrame(tick) : 0
    }

    const onMove = (event) => {
      const C = cfgRef.current
      if (!C) return // aucune traînée équipée → on n'émet rien
      // En boutique, quand on survole une traînée pour l'essayer, on masque la
      // traînée GLOBALE équipée → on voit uniquement l'aperçu de celle qu'on regarde.
      if (isGlobal && document.body.dataset.trailPreview === '1') return
      const x = event.clientX * dpr
      const y = event.clientY * dpr
      // Ne pas saigner sur le viewer de story (plein écran)
      if (document.body.dataset.storyOpen === 'true') { emitX = x; emitY = y; return }

      if (emitX != null) {
        const dx = x - emitX, dy = y - emitY
        const dist = Math.hypot(dx, dy)
        const minDist = C.minDist * dpr
        if (dist >= minDist) {
          if (C.hueCycle) hue = (hue + C.hueCycle) % 360
          const count = Math.min(C.maxEmit, Math.max(1, Math.round(dist / (C.emitDivisor * dpr))))
          for (let i = 0; i < count; i++) {
            const t = i / count
            parts.push({
              x: emitX + dx * t, y: emitY + dy * t,
              vx: (Math.random() - 0.5) * C.speed * dpr,
              vy: ((Math.random() - 0.5) * C.drift + 0.1) * dpr,
              life: 1,
              size: (Math.random() * C.sizeRand + C.sizeBase) * dpr,
              color: C.hueCycle ? `hsl(${Math.round(hue)}, 95%, 62%)` : C.colors[(Math.random() * C.colors.length) | 0],
              gravity: C.gravity, decay: C.decay, shadow: C.shadow, alpha: C.alpha,
            })
          }
        }
      }
      emitX = x; emitY = y
      if (parts.length > C.maxParts) parts.splice(0, parts.length - C.maxParts)
      if (!raf && parts.length) raf = requestAnimationFrame(tick)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <canvas ref={canvasRef} aria-hidden
      style={{ position: 'fixed', inset: 0, zIndex: 9997, pointerEvents: 'none' }} />
  )
}
