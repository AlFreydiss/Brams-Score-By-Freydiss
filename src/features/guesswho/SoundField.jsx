// Guess Who — fond animé : une trame de points qui joue un spectre sonore.
// Des colonnes montent du bas comme un égaliseur (la voix qu'on imite), le
// curseur réveille les points autour de lui, un clic envoie une onde.
// Canvas plein écran, ~30 i/s, en pause onglet caché ; image fixe si l'OS
// demande moins d'animations.
import { useEffect, useRef } from 'react'
import { T } from './theme.js'
import { ambientLevel } from './ambient.js'

const GAP = 22 // pas de la trame (px CSS)
// Émis par SfxBurst à chaque changement de phase.
export const PULSE_EVT = 'gw-pulse'
const FPS = 30

// Hauteur (0..1) de la colonne `c` au temps `t` : trois sinusoïdes lentes
// déphasées par colonne, comme une voix qui module.
function level(c, t) {
  const a = Math.sin(c * 0.11 + t * 0.9) * 0.5 + 0.5
  const b = Math.sin(c * 0.043 - t * 0.55 + 1.7) * 0.5 + 0.5
  const d = Math.sin(c * 0.27 + t * 2.1) * 0.5 + 0.5
  return Math.pow(a * 0.45 + b * 0.4 + d * 0.15, 1.5)
}

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

export default function SoundField() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const NEUTRAL = rgb(T.textHi)
    const GOLD = rgb(T.accent)
    const LIT = rgb(T.accentLit)
    let w = 0, h = 0, cols = 0, rows = 0, ox = 0, oy = 0
    const mouse = { x: -1e4, y: -1e4, k: 0 }
    const waves = []
    let raf = 0, last = 0
    const t0 = performance.now()
    // Le spectre « écoute » le jeu (ambient.js + <audio> de la page) : il monte
    // et s'accélère avec le son. `phase` intègre une vitesse variable.
    let energy = 0, phase = 0, prev = t0
    const media = new Set()

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth; h = window.innerHeight
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.ceil(w / GAP) + 1; rows = Math.ceil(h / GAP) + 1
      ox = (w - (cols - 1) * GAP) / 2; oy = h - (rows - 1) * GAP - GAP / 2
    }

    const draw = (now) => {
      // un lecteur démonté en pleine lecture n'émet jamais « pause »
      for (const el of media) if (el.paused || !el.isConnected) media.delete(el)
      // niveau réel (enveloppe du son lu, ou ta voix au micro) sinon simple
      // « un <audio> joue » ; monte vite, retombe doucement
      const target = Math.max(media.size > 0 ? 0.6 : 0, Math.min(1, ambientLevel(now) * 1.4))
      energy += (target - energy) * (target > energy ? 0.45 : 0.08)
      phase += Math.min(now - prev, 100) / 1000 * (1 + 1.6 * energy)
      prev = now
      const t = phase
      ctx.clearRect(0, 0, w, h)
      mouse.k += ((mouse.x > -1e3 ? 1 : 0) - mouse.k) * 0.08
      for (let i = waves.length - 1; i >= 0; i--) if (now - waves[i].at > 2600) waves.splice(i, 1)
      const maxBar = Math.min(rows * (0.55 + 0.3 * energy), 22 + 16 * energy)
      for (let c = 0; c < cols; c++) {
        const x = ox + c * GAP
        // le spectre s'atténue vers les bords pour laisser le centre calme
        const edge = 0.55 + 0.45 * Math.sin(Math.PI * (c + 0.5) / cols)
        const bar = level(c, t) * maxBar * edge
        for (let r = 0; r < rows; r++) {
          const y = oy + r * GAP
          const fromBottom = rows - 1 - r
          const depth = fromBottom / rows // 0 en bas, 1 en haut
          // trame de base : présente en bas, s'efface vers le haut
          let a = 0.1 * Math.pow(1 - depth, 1.3)
          let col = NEUTRAL
          let size = 1.6
          if (fromBottom < bar) {
            const top = bar - fromBottom < 1
            a = top ? 0.85 : 0.3 + 0.35 * (fromBottom / Math.max(bar, 1))
            col = top ? LIT : GOLD
            size = top ? 2.6 : 2
          }
          // halo du curseur
          if (mouse.k > 0.01) {
            const d = Math.hypot(x - mouse.x, y - mouse.y)
            if (d < 170) { const k = (1 - d / 170) ** 2 * mouse.k; a += 0.5 * k; size += 1.2 * k; if (k > 0.25) col = GOLD }
          }
          // ondes de clic : anneau qui s'élargit et s'éteint
          for (const wv of waves) {
            const age = (now - wv.at) / 1000
            const ring = age * 520
            const d = Math.abs(Math.hypot(x - wv.x, y - wv.y) - ring)
            if (d < 26) { const k = (1 - d / 26) * Math.max(0, 1 - age / 2.4); a += 0.45 * k; size += 1.1 * k; col = LIT }
          }
          if (a < 0.015) continue
          ctx.fillStyle = `rgba(${col},${Math.min(a, 0.9)})`
          ctx.fillRect(x - size / 2, y - size / 2, size, size)
        }
      }
    }

    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      if (now - last < 1000 / FPS) return
      last = now
      draw(now)
    }

    resize()
    if (reduce) { phase = 4; draw(t0); return undefined }

    // Événements média : ils ne remontent pas, on les capte en phase de capture.
    const onPlay = (e) => { media.add(e.target) }
    const onStop = (e) => { media.delete(e.target) }
    // Changement de phase (SfxBurst) : une onde part du bas, au centre.
    const onPulse = () => { waves.push({ x: w / 2, y: h, at: performance.now() }); if (waves.length > 4) waves.shift() }
    document.addEventListener('playing', onPlay, true)
    document.addEventListener('pause', onStop, true)
    document.addEventListener('ended', onStop, true)
    window.addEventListener(PULSE_EVT, onPulse)

    const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY }
    const onLeave = () => { mouse.x = -1e4; mouse.y = -1e4 }
    const onDown = (e) => { waves.push({ x: e.clientX, y: e.clientY, at: performance.now() }); if (waves.length > 4) waves.shift() }
    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) raf = requestAnimationFrame(loop)
    }
    const onResize = () => { resize(); draw(performance.now()) }
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    document.addEventListener('visibilitychange', onVis)
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('playing', onPlay, true)
      document.removeEventListener('pause', onStop, true)
      document.removeEventListener('ended', onStop, true)
      window.removeEventListener(PULSE_EVT, onPulse)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
  return <canvas ref={ref} aria-hidden style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />
}
