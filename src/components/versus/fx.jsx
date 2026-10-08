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
// Iris de trame : des points noirs gonflent depuis le centre jusqu'à manger
// l'écran (un liseré de points blancs court sur le front), le nom du tour
// s'étire, puis la trame se rétracte du centre vers les bords.
const WIPE_MS = 1250
function DotIris() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const w = window.innerWidth, h = window.innerHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = w * dpr; canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const step = w < 700 ? 14 : 18
    const cx = w / 2, cy = h / 2, R = Math.hypot(cx, cy)
    const full = step * 0.74   // au-delà de step·√2/2 les disques se recouvrent
    const pts = []
    for (let y = step / 2; y < h + step; y += step) for (let x = step / 2; x < w + step; x += step) {
      pts.push([x, y, Math.hypot(x - cx, y - cy) / R])
    }
    const smooth = k => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k))
    const t0 = performance.now()
    let raf = 0
    const frame = now => {
      const t = (now - t0) / WIPE_MS
      // entrée 0 → 0,32, maintien, sortie 0,7 → 1 (le centre se libère d'abord)
      const fin = reduce ? 1 : t / 0.32
      const fout = reduce ? (t > 0.85 ? 1 : 0) : (t - 0.7) / 0.3
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#000'
      ctx.beginPath()
      const front = []
      for (const [x, y, d] of pts) {
        const kin = smooth((fin * 1.35 - d) / 0.35)
        const kout = smooth((fout * 1.35 - d) / 0.35)
        const k = kin * (1 - kout)
        if (k <= 0.02) continue
        ctx.moveTo(x + full * k, y); ctx.arc(x, y, full * k, 0, 6.2832)
        if (k < 0.55 && k > 0.12) front.push([x, y, k])
      }
      ctx.fill()
      ctx.fillStyle = 'rgba(236,236,236,.5)'
      ctx.beginPath()
      for (const [x, y, k] of front) { const r = 0.6 + k * 2.2; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832) }
      ctx.fill()
      if (t < 1) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} className="vs-iris" aria-hidden />
}

export function RoundWipe({ label, sub }) {
  return (
    <motion.div className="vs-wipe" aria-live="polite"
      initial={{ opacity: 1 }} animate={{ opacity: 1 }}>
      <DotIris />
      <motion.div className="vs-wipe-txt"
        initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: WIPE_MS / 1000, times: [0.18, 0.3, 0.66, 0.78] }}>
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
      </motion.div>
    </motion.div>
  )
}

// ── Assemblage en trame (champion) ─────────────────────────────────────────
// Inverse de DotDust : des points d'impression arrivent de partout et se
// posent à leur place jusqu'à recomposer l'image, qui apparaît par-dessus.
export function DotAssemble({ src, fit = 'contain', delay = 0, dur = 1300, onDone }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onDone?.(); return }
    const ctx = canvas.getContext('2d')
    const r = canvas.getBoundingClientRect()
    const w = Math.max(1, r.width), h = Math.max(1, r.height)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = w * dpr; canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    let raf = 0, dead = false, timer = 0
    const img = new Image()
    img.src = src
    img.onload = () => {
      if (dead) return
      const step = w < 400 ? 7 : 9
      const cols = Math.ceil(w / step), rows = Math.ceil(h / step)
      const off = document.createElement('canvas')
      off.width = cols; off.height = rows
      const o = off.getContext('2d')
      const s = fit === 'cover' ? Math.max(cols / img.width, rows / img.height) : Math.min(cols / img.width, rows / img.height)
      const iw = img.width * s, ih = img.height * s
      o.drawImage(img, (cols - iw) / 2, (rows - ih) / 2, iw, ih)
      let data
      try { data = o.getImageData(0, 0, cols, rows).data } catch { onDone?.(); return }
      const parts = []
      const cx = w / 2, cy = h / 2
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4
        if (data[i + 3] < 40) continue
        const lum = (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11) / 255
        if (lum < 0.06) continue
        const tx = x * step + step / 2, ty = y * step + step / 2
        const a = Math.random() * 6.2832, far = (0.6 + Math.random() * 0.8) * Math.hypot(w, h)
        parts.push({
          tx, ty, sx: cx + Math.cos(a) * far, sy: cy + Math.sin(a) * far,
          r: lum * step * 0.5 + 0.5, c: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`,
          // les points clairs (le sujet) arrivent en premier
          d: (1 - lum) * dur * 0.35 + Math.random() * dur * 0.2,
        })
      }
      const t0 = performance.now() + delay
      const out = k => 1 - Math.pow(1 - k, 4)
      let told = false
      const frame = now => {
        const t = now - t0
        ctx.clearRect(0, 0, w, h)
        if (t < 0) { raf = requestAnimationFrame(frame); return }
        let left = 0
        for (const p of parts) {
          const k = Math.max(0, Math.min(1, (t - p.d) / (dur * 0.45)))
          if (k === 0) { left++; continue }
          if (k < 1) left++
          const e = out(k)
          ctx.globalAlpha = Math.min(1, k * 3)
          ctx.fillStyle = p.c
          ctx.beginPath()
          ctx.arc(p.sx + (p.tx - p.sx) * e, p.sy + (p.ty - p.sy) * e, p.r * (0.4 + e * 0.6), 0, 6.2832)
          ctx.fill()
        }
        ctx.globalAlpha = 1
        if (!left && !told) { told = true; onDone?.() }
        if (t < dur + 900) raf = requestAnimationFrame(frame)
        else ctx.clearRect(0, 0, w, h)
      }
      raf = requestAnimationFrame(frame)
    }
    img.onerror = () => { timer = setTimeout(() => onDone?.(), delay) }
    return () => { dead = true; cancelAnimationFrame(raf); clearTimeout(timer) }
    // onDone volontairement hors dépendances : appelé une seule fois
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, fit, delay, dur])
  return <canvas ref={ref} className="vs-assemble" aria-hidden />
}

// ── Vol du gagnant vers la bande du tour ───────────────────────────────────
// Une copie de l'image part de la case, rétrécit jusqu'à la largeur du trait
// de son duel puis s'y aplatit : « classé ».
export function WinnerFlight({ flight }) {
  const { src, from, to } = flight
  const s = Math.max(0.04, Math.min(1, (to.width * 2.4) / from.width))
  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height / 2 - (from.top + from.height / 2)
  return (
    <motion.img className="vs-flight" src={src} alt="" aria-hidden
      style={{ left: from.left, top: from.top, width: from.width, height: from.height }}
      initial={{ x: 0, y: 0, scale: 1, scaleY: 1, opacity: 1, borderRadius: 6 }}
      animate={{ x: [0, dx * 0.15, dx], y: [0, -40, dy], scale: [1, 0.55, s], scaleY: [1, 1, 0.08], opacity: [1, 1, 0.9, 0], borderRadius: [6, 10, 2] }}
      transition={{ duration: 0.62, times: [0, 0.35, 1], ease: [0.6, 0, 0.2, 1], opacity: { duration: 0.7, times: [0, 0.6, 0.88, 1] } }} />
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
