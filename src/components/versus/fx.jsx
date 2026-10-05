import { useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'

// Effets « grammaire manga » du tournoi en images.

const ease = [0.2, 0.8, 0.2, 1]

// ── Lignes de vitesse (集中線) ─────────────────────────────────────────────
// Faisceau de traits qui converge vers le VS. `burst` change → éclat bref
// et vacillant, puis retour à un fond presque invisible.
export function SpeedLines({ burst, color = '#ffffff' }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    const w = rect.width, h = rect.height
    canvas.width = w * dpr; canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const cx = w / 2, cy = h / 2
    const R = Math.hypot(w, h) / 2
    const t0 = performance.now()
    let raf = 0
    const frame = now => {
      const t = Math.min(1, (now - t0) / 700)
      const alpha = reduce ? 0.06 : 0.06 + Math.sin(Math.PI * Math.min(1, t * 1.6)) * 0.42 * (1 - t * 0.6)
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = color
      const n = 110
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.05
        const spread = 0.004 + Math.random() * 0.012
        const r0 = R * (0.16 + Math.random() * 0.14)
        ctx.globalAlpha = alpha * (0.35 + Math.random() * 0.65)
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0)
        ctx.lineTo(cx + Math.cos(a - spread) * R, cy + Math.sin(a - spread) * R)
        ctx.lineTo(cx + Math.cos(a + spread) * R, cy + Math.sin(a + spread) * R)
        ctx.closePath(); ctx.fill()
      }
      // le vacillement : ~20 i/s, comme une page qu'on feuillette
      if (t < 1 && !reduce) raf = setTimeout(() => requestAnimationFrame(frame), 50)
    }
    requestAnimationFrame(frame)
    return () => clearTimeout(raf)
  }, [burst, color])
  return <canvas ref={ref} className="vs-speed" aria-hidden />
}

// ── Onomatopée tamponnée ───────────────────────────────────────────────────
const SFX = ['ドン!', 'ズバッ!', 'ドドド', 'バーン!', 'ゴゴゴ', 'ドォン!']
export function SfxStamp({ seed = 0, side }) {
  const text = SFX[seed % SFX.length]
  const rot = side === 'left' ? -14 : 12
  return (
    <motion.div
      className={`vs-sfx vs-sfx--${side}`}
      initial={{ scale: 2.6, rotate: rot * 2, opacity: 0 }}
      animate={{ scale: 1, rotate: rot, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 14 }}
      aria-hidden
    >
      {text}
    </motion.div>
  )
}

// ── Coup de sabre sur le perdant ───────────────────────────────────────────
// L'image est découpée en deux triangles le long d'une diagonale ; un trait
// blanc traverse la case, puis les deux moitiés glissent et tombent.
export function SlashSplit({ src, fit, dir = 1 }) {
  const top = dir > 0 ? 'polygon(0 0, 100% 0, 100% 18%, 0 82%)' : 'polygon(0 0, 100% 0, 100% 82%, 0 18%)'
  const bot = dir > 0 ? 'polygon(0 82%, 100% 18%, 100% 100%, 0 100%)' : 'polygon(0 18%, 100% 82%, 100% 100%, 0 100%)'
  return (
    <div className="vs-slash" aria-hidden>
      <motion.img src={src} style={{ objectFit: fit, clipPath: top }}
        initial={{ x: 0, y: 0, rotate: 0 }}
        animate={{ x: -28 * dir, y: -16, rotate: -3 * dir, opacity: [1, 1, 0] }}
        transition={{ delay: 0.16, duration: 0.5, ease }} />
      <motion.img src={src} style={{ objectFit: fit, clipPath: bot }}
        initial={{ x: 0, y: 0, rotate: 0 }}
        animate={{ x: 30 * dir, y: 60, rotate: 4 * dir, opacity: [1, 1, 0] }}
        transition={{ delay: 0.16, duration: 0.55, ease: [0.5, 0, 0.9, 0.4] }} />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <motion.line x1="-4" y1={dir > 0 ? 86 : 14} x2="104" y2={dir > 0 ? 14 : 86}
          stroke="#fff" strokeWidth="1.4" vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1, opacity: [1, 1, 0] }}
          transition={{ duration: 0.34, ease: [0.7, 0, 0.3, 1] }} />
      </svg>
    </div>
  )
}

// ── Tache d'encre derrière le VS ───────────────────────────────────────────
export function InkSplat({ seed }) {
  const d = useMemo(() => {
    const pts = []
    const n = 18
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const r = 34 + ((Math.sin(seed * 12.9 + i * 7.3) + 1) / 2) * 16 + (i % 3 === 0 ? 10 : 0)
      pts.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r])
    }
    return 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L') + ' Z'
  }, [seed])
  return (
    <motion.svg className="vs-splat" viewBox="0 0 100 100" aria-hidden
      initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.12 }}>
      <path d={d} fill="#050505" />
    </motion.svg>
  )
}

// ── Titre qui s'étire (axe de chasse de l'Archivo variable) ────────────────
export function StretchTitle({ text }) {
  return (
    <h1 className="vs-title" aria-label={text}>
      {[...text].map((ch, i) => (
        <motion.span key={i} aria-hidden
          initial={{ fontStretch: '62%', opacity: 0, y: 18 }}
          animate={{ fontStretch: '125%', opacity: 1, y: 0 }}
          transition={{ delay: 0.04 * i, duration: 0.7, ease }}>
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </h1>
  )
}

// ── Volet de changement de tour ────────────────────────────────────────────
// Un aplat d'encre traverse l'écran en diagonale, le nom du tour s'y imprime.
export function RoundWipe({ label, sub }) {
  return (
    <motion.div className="vs-wipe" aria-live="polite"
      initial={{ clipPath: 'polygon(0 0, 0 0, -30% 100%, -30% 100%)' }}
      animate={{ clipPath: ['polygon(0 0, 0 0, -30% 100%, -30% 100%)', 'polygon(0 0, 130% 0, 100% 100%, -30% 100%)', 'polygon(0 0, 130% 0, 100% 100%, -30% 100%)', 'polygon(130% 0, 130% 0, 100% 100%, 100% 100%)'] }}
      transition={{ duration: 1.25, times: [0, 0.28, 0.72, 1], ease: [0.7, 0, 0.3, 1] }}>
      <div className="vs-wipe-tone" />
      <div className="vs-wipe-txt">
        <motion.p initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25, duration: 0.4, ease }}>{sub}</motion.p>
        <h2>
          {[...label].map((ch, i) => (
            <motion.span key={i}
              initial={{ fontStretch: '62%', opacity: 0, y: 40 }}
              animate={{ fontStretch: '125%', opacity: 1, y: 0 }}
              transition={{ delay: 0.22 + i * 0.025, duration: 0.45, ease }}>
              {ch === ' ' ? ' ' : ch}
            </motion.span>
          ))}
        </h2>
      </div>
    </motion.div>
  )
}
