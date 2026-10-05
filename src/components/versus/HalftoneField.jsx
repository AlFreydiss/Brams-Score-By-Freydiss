import { useEffect, useRef } from 'react'

// Fond « screentone » : une trame de points d'impression manga sur tout l'écran.
//  - les points gonflent autour du curseur ;
//  - fx.pulse(x, y, couleur) lance une onde d'encre (au choix d'une carte) ;
//  - fx.lean('left' | 'right' | null) teinte la moitié survolée en rouge / bleu.
// Canvas en JS : non touché par html.low-end qui fige les animations CSS.

const listeners = new Set()
export const fx = {
  pulse: (x, y, color = '#ffffff', strength = 1) => listeners.forEach(l => l({ type: 'pulse', x, y, color, strength })),
  lean: side => listeners.forEach(l => l({ type: 'lean', side })),
}

const hexToRgb = h => {
  const n = parseInt(h.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
// Teinte de survol : monochrome, la trame s'éclaircit simplement du côté visé.
const RED = [255, 255, 255]
const BLUE = [255, 255, 255]

export default function HalftoneField() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0, h = 0, step = 18, raf = 0, last = performance.now()
    const mouse = { x: -9999, y: -9999, seen: 0 }
    const waves = []
    let lean = null, leanAmt = 0

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight
      step = w < 700 ? 22 : 18
      canvas.width = w * dpr; canvas.height = h * dpr
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      kick()
    }

    const draw = now => {
      raf = 0
      const dt = Math.min(64, now - last); last = now
      leanAmt += ((lean ? 1 : 0) - leanAmt) * Math.min(1, dt / 160)
      ctx.clearRect(0, 0, w, h)
      for (let i = waves.length - 1; i >= 0; i--) if (now - waves[i].t0 > 1400) waves.splice(i, 1)
      const mouseLive = now - mouse.seen < 2500
      const ox = (w % step) / 2, oy = (h % step) / 2
      for (let y = oy; y < h; y += step) {
        for (let x = ox; x < w; x += step) {
          let r = 0.9, a = 0.07, cr = 255, cg = 255, cb = 255
          // vignette verticale : la trame s'estompe vers le bas
          const fade = 1 - Math.min(1, y / (h * 1.15))
          a *= 0.45 + fade * 0.8
          if (mouseLive) {
            const dx = x - mouse.x, dy = y - mouse.y
            const d2 = dx * dx + dy * dy
            if (d2 < 40000) { const k = 1 - d2 / 40000; r += k * k * 2.6; a += k * 0.22 }
          }
          if (leanAmt > 0.01) {
            const onSide = lean === 'left' ? x < w / 2 : x >= w / 2
            if (onSide) {
              const edge = lean === 'left' ? 1 - x / (w / 2) : (x - w / 2) / (w / 2)
              const k = leanAmt * (0.35 + edge * 0.65)
              const c = lean === 'left' ? RED : BLUE
              cr += (c[0] - cr) * k; cg += (c[1] - cg) * k; cb += (c[2] - cb) * k
              a += k * 0.06; r += k * 0.35
            }
          }
          for (const wv of waves) {
            const t = (now - wv.t0) / 1400
            const radius = t * Math.max(w, h) * 0.9
            const d = Math.hypot(x - wv.x, y - wv.y)
            const band = Math.abs(d - radius)
            if (band < 90) {
              const k = (1 - band / 90) * (1 - t) * wv.strength
              r += k * 2.6; a += k * 0.4
              cr += (wv.rgb[0] - cr) * k; cg += (wv.rgb[1] - cg) * k; cb += (wv.rgb[2] - cb) * k
            }
          }
          ctx.fillStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${Math.min(1, a)})`
          ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill()
        }
      }
      if (!reduce && (waves.length || mouseLive || Math.abs(leanAmt - (lean ? 1 : 0)) > 0.01)) kick()
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(draw) }

    const onMove = e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.seen = performance.now(); kick() }
    const onEvt = ev => {
      if (ev.type === 'pulse' && !reduce) { waves.push({ x: ev.x, y: ev.y, rgb: hexToRgb(ev.color), strength: ev.strength, t0: performance.now() }); if (waves.length > 6) waves.shift() }
      if (ev.type === 'lean') lean = ev.side
      kick()
    }
    listeners.add(onEvt)
    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      listeners.delete(onEvt)
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return <canvas ref={ref} className="vs-halftone" aria-hidden />
}
