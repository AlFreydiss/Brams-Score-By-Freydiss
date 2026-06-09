import { useEffect, useRef } from 'react'
import { ensureAnalyser } from '../../lib/audioBoost.js'

// Visualizer audio-réactif pour les openings (Blind Test / Tournoi).
// Lit le spectre via l'AnalyserNode partagé (audioBoost) branché sur l'élément
// média en lecture. Dessine : noyau lumineux qui pulse sur les basses + barres
// radiales (spectre) miroitées + waveform circulaire + particules sur les drops.
// Tout sur un canvas, rAF, composite 'lighter' pour le glow. Zéro dépendance.

function hexA(hex, a) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}
function mix(c1, c2, t) {
  const a = c1.replace('#', ''), b = c2.replace('#', '')
  const r = Math.round(parseInt(a.slice(0, 2), 16) * (1 - t) + parseInt(b.slice(0, 2), 16) * t)
  const g = Math.round(parseInt(a.slice(2, 4), 16) * (1 - t) + parseInt(b.slice(2, 4), 16) * t)
  const bl = Math.round(parseInt(a.slice(4, 6), 16) * (1 - t) + parseInt(b.slice(4, 6), 16) * t)
  return `rgb(${r},${g},${bl})`
}

export default function OpeningVisualizer({ mediaRef, active = true, accent = '#BFA46A', accent2 = '#9b59b6' }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const DPR = Math.min(2, window.devicePixelRatio || 1)
    let raf, analyser = null, freq = null, time = null, t = 0, W = 0, H = 0
    let particles = []

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      W = r.width; H = r.height
      canvas.width = Math.max(1, W * DPR); canvas.height = Math.max(1, H * DPR)
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(canvas)

    const ensure = () => {
      if (analyser || !mediaRef?.current) return
      analyser = ensureAnalyser(mediaRef.current)
      if (analyser) { freq = new Uint8Array(analyser.frequencyBinCount); time = new Uint8Array(analyser.fftSize) }
    }

    const draw = () => {
      raf = requestAnimationFrame(draw)
      t += 0.016
      ensure()
      ctx.clearRect(0, 0, W, H)
      if (!analyser) return
      analyser.getByteFrequencyData(freq)
      analyser.getByteTimeDomainData(time)

      const cx = W / 2, cy = H / 2
      let bass = 0; for (let i = 0; i < 10; i++) bass += freq[i]; bass /= 10 * 255
      const baseR = Math.min(W, H) * 0.12 * (1 + bass * 0.4)

      ctx.globalCompositeOperation = 'lighter'

      // Noyau lumineux (pulse basses)
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 2.4)
      grd.addColorStop(0, hexA(accent, 0.30 + bass * 0.45))
      grd.addColorStop(0.5, hexA(accent2, 0.14 + bass * 0.2))
      grd.addColorStop(1, hexA(accent, 0))
      ctx.fillStyle = grd
      ctx.beginPath(); ctx.arc(cx, cy, baseR * 2.4, 0, Math.PI * 2); ctx.fill()

      // Barres radiales (spectre) miroitées + rotation lente
      const bars = 100
      const reach = Math.min(W, H) * 0.20
      for (let i = 0; i < bars; i++) {
        const v = freq[Math.floor((i / bars) * freq.length * 0.72)] / 255
        const ang = (i / bars) * Math.PI * 2 + t * 0.12
        const r1 = baseR, r2 = baseR + 5 + v * reach
        ctx.strokeStyle = mix(accent, accent2, i / bars)
        ctx.globalAlpha = 0.45 + v * 0.55
        ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1); ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(-ang) * r1, cy + Math.sin(-ang) * r1); ctx.lineTo(cx + Math.cos(-ang) * r2, cy + Math.sin(-ang) * r2); ctx.stroke()
      }
      ctx.globalAlpha = 1

      // Waveform circulaire
      ctx.strokeStyle = hexA(accent, 0.7); ctx.lineWidth = 1.6
      ctx.beginPath()
      for (let i = 0; i < time.length; i += 2) {
        const ang = (i / time.length) * Math.PI * 2
        const amp = (time[i] - 128) / 128
        const r = baseR * 1.55 + amp * baseR * 0.6
        const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath(); ctx.stroke()

      // Particules sur les drops (basses fortes)
      if (bass > 0.62 && particles.length < 140) {
        for (let k = 0; k < 4; k++) {
          const ang = Math.random() * Math.PI * 2, sp = 2 + bass * 5
          particles.push({ x: cx, y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1 })
        }
      }
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy *= 0.97; p.life -= 0.018
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = accent
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.8 + p.life * 1.4, 0, Math.PI * 2); ctx.fill()
      }
      particles = particles.filter(p => p.life > 0)

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }
    draw()
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [active, mediaRef, accent, accent2])

  return <canvas ref={canvasRef} aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
}
