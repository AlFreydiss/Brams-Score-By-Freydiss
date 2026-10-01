// Guess Who — onde du micro en direct pendant l'enregistrement : barres d'encre
// sur fond jaune qui suivent la voix (on voit tout de suite que le micro capte).
import { useEffect, useRef } from 'react'
import { C } from './manga.jsx'

const BARS = 32

export default function LiveWave({ stream }) {
  const canvas = useRef(null)
  useEffect(() => {
    const cv = canvas.current
    if (!stream || !cv) return
    const AC = window.AudioContext || window.webkitAudioContext
    const ctx = new AC()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    ctx.createMediaStreamSource(stream).connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)
    const g = cv.getContext('2d')
    let raf = 0
    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const w = cv.clientWidth * dpr, h = cv.clientHeight * dpr
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h }
      analyser.getByteFrequencyData(data)
      g.fillStyle = C.yellow
      g.fillRect(0, 0, w, h)
      const bw = w / BARS
      g.fillStyle = C.ink
      for (let i = 0; i < BARS; i++) {
        const v = data[Math.floor((i / BARS) * data.length * 0.7)] / 255
        const bh = Math.max(3 * dpr, v * h * 0.92)
        g.fillRect(i * bw + bw * 0.18, (h - bh) / 2, bw * 0.64, bh)
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); ctx.close().catch(() => {}) }
  }, [stream])
  return (
    <canvas ref={canvas} aria-hidden
      style={{ width: '100%', height: 90, display: 'block', border: `3px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.ink}` }} />
  )
}
