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
        animate={{ x: -14 * dir, y: -8, rotate: -2 * dir, opacity: [1, 1, 0] }}
        transition={{ delay: 0.12, duration: 0.32, ease }} />
      <motion.img src={src} style={{ objectFit: fit, clipPath: bot }}
        initial={{ x: 0, y: 0, rotate: 0 }}
        animate={{ x: 16 * dir, y: 24, rotate: 3 * dir, opacity: [1, 1, 0] }}
        transition={{ delay: 0.12, duration: 0.34, ease: [0.5, 0, 0.9, 0.4] }} />
      <DotDust src={src} fit={fit} dir={dir} />
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

// ── Changement de tour ─────────────────────────────────────────────────────
// Un voile, le nom du tour qui s'étire lettre à lettre, et c'est tout.
export function RoundWipe({ label, sub }) {
  return (
    <motion.div className="vs-wipe" aria-live="polite"
      initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.25, times: [0, 0.18, 0.75, 1], ease: 'easeInOut' }}>
      <div className="vs-wipe-txt">
        <h2>
          {[...label].map((ch, i) => (
            <motion.span key={i}
              initial={{ fontStretch: '62%', opacity: 0 }}
              animate={{ fontStretch: '125%', opacity: 1 }}
              transition={{ delay: 0.12 + i * 0.022, duration: 0.6, ease }}>
              {ch === ' ' ? ' ' : ch}
            </motion.span>
          ))}
        </h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.4 }}>{sub}</motion.p>
        <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.2, duration: 0.8, ease }} />
      </div>
    </motion.div>
  )
}

// ── Désintégration en trame ────────────────────────────────────────────────
// La case perdante est relue pixel par pixel et redessinée en points
// d'impression qui se détachent le long de la coupe, puis tombent.
export function DotDust({ src, fit = 'contain', dir = 1 }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    const r = canvas.getBoundingClientRect()
    const w = Math.max(1, r.width), h = Math.max(1, r.height)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = w * dpr; canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    let raf = 0, dead = false
    const img = new Image()
    img.src = src
    img.onload = () => {
      if (dead) return
      // Rend l'image comme object-fit sur un canvas réduit, puis échantillonne.
      const step = w < 400 ? 8 : 10
      const cols = Math.ceil(w / step), rows = Math.ceil(h / step)
      const off = document.createElement('canvas')
      off.width = cols; off.height = rows
      const o = off.getContext('2d')
      const s = fit === 'cover' ? Math.max(cols / img.width, rows / img.height) : Math.min(cols / img.width, rows / img.height)
      const iw = img.width * s, ih = img.height * s
      o.drawImage(img, (cols - iw) / 2, (rows - ih) / 2, iw, ih)
      let data
      try { data = o.getImageData(0, 0, cols, rows).data } catch { return }
      const parts = []
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4
        if (data[i + 3] < 40) continue
        const lum = (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11) / 255
        const px = x * step + step / 2, py = y * step + step / 2
        // délai : la désintégration suit la diagonale de la coupe
        const along = dir > 0 ? (px / w + (1 - py / h)) / 2 : (px / w + py / h) / 2
        parts.push({
          x: px, y: py, r: (1 - lum) * step * 0.55 + 0.6,
          c: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`,
          vx: (Math.random() - 0.5) * 2.2 + dir * 1.4, vy: -Math.random() * 2.6 - 0.4,
          d: along * 260 + Math.random() * 90,
        })
      }
      const t0 = performance.now()
      const frame = now => {
        const t = now - t0
        ctx.clearRect(0, 0, w, h)
        let alive = false
        for (const p of parts) {
          const lt = t - p.d
          if (lt < 0) { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); alive = true; continue }
          const k = lt / 16
          const a = 1 - lt / 650
          if (a <= 0) continue
          alive = true
          ctx.globalAlpha = a
          ctx.fillStyle = p.c
          ctx.beginPath()
          ctx.arc(p.x + p.vx * k, p.y + p.vy * k + 0.09 * k * k, p.r * (0.6 + a * 0.4), 0, 6.283)
          ctx.fill()
          ctx.globalAlpha = 1
        }
        if (alive && t < 1600) raf = requestAnimationFrame(frame)
      }
      raf = requestAnimationFrame(frame)
    }
    return () => { dead = true; cancelAnimationFrame(raf) }
  }, [src, fit, dir])
  return <canvas ref={ref} className="vs-dust" aria-hidden />
}

// ── Confettis de papier ────────────────────────────────────────────────────
export function PaperRain() {
  const ref = useRef(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const w = window.innerWidth, h = window.innerHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = w * dpr; canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const colors = ['#e5322d', '#2f6dff', '#f1f0ec', '#0a0a0a']
    const bits = Array.from({ length: w < 700 ? 70 : 140 }, () => ({
      x: Math.random() * w, y: -20 - Math.random() * h * 0.6,
      s: 6 + Math.random() * 12, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.25,
      vy: 2 + Math.random() * 3.5, sway: Math.random() * 6.28, c: colors[(Math.random() * colors.length) | 0],
      dots: Math.random() < 0.35,
    }))
    let raf = 0
    const t0 = performance.now()
    const frame = now => {
      const t = now - t0
      ctx.clearRect(0, 0, w, h)
      for (const b of bits) {
        b.y += b.vy; b.r += b.vr; b.sway += 0.04
        const x = b.x + Math.sin(b.sway) * 18
        ctx.save(); ctx.translate(x, b.y); ctx.rotate(b.r)
        ctx.scale(1, Math.abs(Math.cos(b.sway * 1.3)) * 0.8 + 0.2)
        ctx.globalAlpha = t > 3600 ? Math.max(0, 1 - (t - 3600) / 900) : 1
        ctx.fillStyle = b.c
        ctx.fillRect(-b.s / 2, -b.s * 0.35, b.s, b.s * 0.7)
        if (b.dots) {
          ctx.fillStyle = b.c === '#0a0a0a' ? '#f1f0ec' : '#0a0a0a'
          for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j += 2) { ctx.beginPath(); ctx.arc(i * b.s * 0.28, j * b.s * 0.14, 0.9, 0, 6.283); ctx.fill() }
        }
        ctx.restore()
      }
      if (t < 4500) raf = requestAnimationFrame(frame)
      else ctx.clearRect(0, 0, w, h)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} className="vs-rain" aria-hidden />
}

// ── Compteur de combo (décisions rapides) ──────────────────────────────────
export function ComboStamp({ n }) {
  return (
    <motion.div className="vs-combo" key={n}
      initial={{ scale: 1.9, rotate: -14, opacity: 0 }}
      animate={{ scale: 1, rotate: -6, opacity: 1 }}
      exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 600, damping: 13 }}>
      <small>Combo</small><b>×{n}</b>
    </motion.div>
  )
}

// ── Tampon de rembobinage (Annuler) ────────────────────────────────────────
export function RewindStamp() {
  return (
    <motion.div className="vs-rewind" aria-hidden
      initial={{ opacity: 0, scale: 1.6, rotate: 8 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [1.6, 1, 1, 0.9], rotate: 4 }}
      transition={{ duration: 0.8, times: [0, 0.2, 0.75, 1] }}>
      巻き戻し
    </motion.div>
  )
}
