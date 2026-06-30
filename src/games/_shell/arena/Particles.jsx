// Particles — canvas léger en overlay pour les éclats de capture (poussière d'or).
// Impératif via ref : <Particles ref={ref} />  puis  ref.current.burst(x, y).
// x/y sont relatifs au conteneur du canvas. Plafonné (perf), coupé reduced-motion.
import { forwardRef, useImperativeHandle, useRef, useEffect } from 'react'
import { particles } from './arenaTokens.js'

const prefersReduce = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const Particles = forwardRef(function Particles(_props, ref) {
  const canvasRef = useRef(null)
  const partsRef = useRef([])      // {x,y,vx,vy,born,life,size}
  const rafRef = useRef(0)
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })

  // Redimensionne le canvas à son conteneur (ResizeObserver).
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const fit = () => {
      const r = cv.parentElement?.getBoundingClientRect()
      if (!r) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      sizeRef.current = { w: r.width, h: r.height, dpr }
      cv.width = r.width * dpr; cv.height = r.height * dpr
      cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'
    }
    fit()
    const ro = new ResizeObserver(fit)
    if (cv.parentElement) ro.observe(cv.parentElement)
    return () => ro.disconnect()
  }, [])

  const loop = () => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    const { dpr } = sizeRef.current
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cv.width, cv.height)
    const now = performance.now()
    const live = []
    for (const p of partsRef.current) {
      const t = (now - p.born) / p.life
      if (t >= 1) continue
      p.x += p.vx; p.y += p.vy; p.vy += 0.045   // gravité légère
      p.vx *= 0.985
      const alpha = (1 - t) * 0.9
      ctx.beginPath()
      ctx.fillStyle = `rgba(200,164,92,${alpha.toFixed(3)})`
      ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2)
      ctx.fill()
      live.push(p)
    }
    partsRef.current = live
    if (live.length) rafRef.current = requestAnimationFrame(loop)
    else { rafRef.current = 0; ctx.clearRect(0, 0, cv.width, cv.height) }
  }

  useImperativeHandle(ref, () => ({
    burst(x, y) {
      const reduce = prefersReduce()
      const n = reduce ? particles.countLow : particles.count
      if (reduce && n === 0) return
      const now = performance.now()
      const [smin, smax] = particles.size
      for (let i = 0; i < n; i++) {
        const ang = (Math.PI * 2 * i) / n + (i % 2 ? 0.3 : 0)
        const spd = 0.8 + (i % 5) * 0.35
        partsRef.current.push({
          x, y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 0.6,
          born: now, life: particles.life,
          size: smin + ((i * 7) % 10) / 10 * (smax - smin),
        })
      }
      if (!rafRef.current) rafRef.current = requestAnimationFrame(loop)
    },
  }), [])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  return <canvas ref={canvasRef} aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }} />
})

export default Particles
