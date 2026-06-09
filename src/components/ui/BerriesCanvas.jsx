import { useEffect, useRef } from 'react'

// Canvas plein écran (fixed, z-index 0, pointer-events none) : des « ₿ » dorés
// qui tombent et tournent lentement. Respecte prefers-reduced-motion. Cleanup rAF.
const COUNT = 70
const SPEED_MIN = 0.4, SPEED_MAX = 1.2
const SIZE_MIN = 10, SIZE_MAX = 26
const ALPHA_MIN = 0.06, ALPHA_MAX = 0.12

export default function BerriesCanvas() {
  const ref = useRef(null)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const DPR = Math.min(2, window.devicePixelRatio || 1)
    let W = 0, H = 0, raf
    const resize = () => {
      W = window.innerWidth; H = window.innerHeight
      canvas.width = W * DPR; canvas.height = H * DPR
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    const rand = (a, b) => a + Math.random() * (b - a)
    const P = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * -H,
      v: rand(SPEED_MIN, SPEED_MAX),
      size: rand(SIZE_MIN, SIZE_MAX),
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.02,
      a: rand(ALPHA_MIN, ALPHA_MAX),
    }))
    const draw = () => {
      raf = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, W, H)
      for (const p of P) {
        p.y += p.v; p.rot += p.vr
        if (p.y > H + 30) { p.y = -30; p.x = Math.random() * W }
        ctx.save()
        ctx.translate(p.x, p.y); ctx.rotate(p.rot)
        ctx.font = `${p.size}px Georgia, serif`
        ctx.fillStyle = `rgba(255, 200, 0, ${p.a})`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('₿', 0, 0)
        ctx.restore()
      }
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
}
