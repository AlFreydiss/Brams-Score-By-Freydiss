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
    // Cap du nombre de pixels du backing : sur les grands écrans (4K/retina) on
    // baisse le dpr effectif — invisible sur un glow flou, mais divise le coût de
    // clearRect/drawImage par frame. Recalculé à chaque resize.
    const PIXEL_CAP = 4_400_000
    let dpr = 1, w = 0, h = 0, emitX = null, emitY = null, raf = 0, hue = 0
    const parts = []

    const resize = () => {
      const iw = window.innerWidth, ih = window.innerHeight
      const want = Math.min(window.devicePixelRatio || 1, TRAIL_DEFAULTS.dpr)
      dpr = Math.max(0.85, Math.min(want, Math.sqrt(PIXEL_CAP / Math.max(1, iw * ih))))
      w = canvas.width = Math.round(iw * dpr)
      h = canvas.height = Math.round(ih * dpr)
      canvas.style.width = `${iw}px`
      canvas.style.height = `${ih}px`
    }

    // PERF : au lieu d'un shadowBlur par particule À CHAQUE frame (très coûteux en
    // canvas), on pré-rend UN sprite de glow par couleur (radial gradient) une seule
    // fois, puis on fait drawImage (bon marché). Même rendu glowy, sans le coût du
    // shadowBlur. Cache borné (couleurs fixes du skin + teintes arrondies pour l'arc-en-ciel).
    // Sprite glow haute qualité : cœur blanc-chaud (spark) → corps teinté → halo doux
    // qui s'éteint en douceur (Gaussian-like). Pré-rendu une fois par couleur.
    const SPR = 96
    const spriteCache = new Map()
    const getSprite = (color) => {
      let c = spriteCache.get(color)
      if (c) return c
      c = document.createElement('canvas'); c.width = c.height = SPR
      const g = c.getContext('2d')
      const grd = g.createRadialGradient(SPR / 2, SPR / 2, 0, SPR / 2, SPR / 2, SPR / 2)
      grd.addColorStop(0, 'rgba(255,255,255,0.95)') // cœur lumineux (donne le « spark »)
      grd.addColorStop(0.16, color)
      grd.addColorStop(0.45, color)
      grd.addColorStop(0.72, color)
      grd.addColorStop(1, 'transparent')            // halo qui s'éteint en douceur
      g.fillStyle = grd; g.beginPath(); g.arc(SPR / 2, SPR / 2, SPR / 2, 0, Math.PI * 2); g.fill()
      if (spriteCache.size > 400) spriteCache.clear()
      spriteCache.set(color, c)
      return c
    }

    const tick = () => {
      const C = cfgRef.current
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = (C?.composite) || 'lighter'

      const tw = C?.twinkle || 0
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += (p.gravity ?? 0.02) * dpr
        p.vx *= 0.985            // léger frottement → mouvement plus organique
        p.life -= p.decay

        if (p.life <= 0) { parts.splice(i, 1); continue }

        // Taille : easing (reste pleine plus longtemps puis fond) + halo doux.
        const ease = Math.pow(p.life, 0.6)
        const r = p.size * ease + p.shadow * dpr * 0.6
        // Cull hors écran : inutile de dessiner une particule qui a dérivé dehors.
        if (p.x < -r || p.x > w + r || p.y < -r || p.y > h + r) continue
        // Scintillement optionnel (étoiles/cosmos) : modulation d'alpha par particule.
        let a = p.life * p.alpha
        if (tw) { p.tw += 0.28; a *= 0.62 + 0.38 * Math.sin(p.tw) }
        ctx.globalAlpha = a < 0 ? 0 : a
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
              // hue arrondi par pas de 4° → ~90 sprites cachés max (au lieu de 360) sur l'arc-en-ciel.
              color: C.hueCycle ? `hsl(${Math.round(hue / 4) * 4}, 95%, 62%)` : C.colors[(Math.random() * C.colors.length) | 0],
              gravity: C.gravity, decay: C.decay, shadow: C.shadow, alpha: C.alpha,
              tw: Math.random() * 6.283,
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
