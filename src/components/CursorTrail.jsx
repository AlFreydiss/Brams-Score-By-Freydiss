import { useEffect, useRef, useState } from 'react'

const TRAIL_MODES = {
  normal: {
    colors: ['#e8c878', '#d4a017', '#bfa46a'],
    maxParts: 70,
    maxEmit: 2,
    emitDivisor: 19,
    minDist: 14,
    dpr: 1.1,
    speed: 0.2,
    drift: 0.1,
    sizeBase: 1.05,
    sizeRand: 1.1,
    decay: 0.06,
    shadow: 3,
    alpha: 0.55,
  },
  neon: {
    colors: ['#00e7ff', '#ff4fd8', '#ffd84d', '#8cfffb'],
    maxParts: 130,
    maxEmit: 4,
    emitDivisor: 14,
    minDist: 10,
    dpr: 1.25,
    speed: 0.52,
    drift: 0.26,
    sizeBase: 1.55,
    sizeRand: 2.25,
    decay: 0.044,
    shadow: 7,
    alpha: 0.72,
  },
  rift: {
    colors: ['#a855f7', '#22d3ee', '#fb7185', '#c4ff47'],
    maxParts: 140,
    maxEmit: 4,
    emitDivisor: 13,
    minDist: 9,
    dpr: 1.25,
    speed: 0.6,
    drift: 0.18,
    sizeBase: 1.7,
    sizeRand: 2.15,
    decay: 0.048,
    shadow: 6,
    alpha: 0.74,
  },
}

const MOUSE_CODES = [
  { mode: 'neon', dirs: ['up', 'up', 'down', 'down', 'left', 'right'] },
  { mode: 'rift', dirs: ['up', 'up', 'down', 'down', 'right', 'left'] },
]
const MAX_MOUSE_CODE_LENGTH = Math.max(...MOUSE_CODES.map(code => code.dirs.length))
const GESTURE_STEP = 34
const GESTURE_MAX_GAP = 5000

function getStoredTrailMode() {
  if (typeof window === 'undefined') return 'normal'
  try {
    const stored = window.localStorage.getItem('brams_cursor_mode')
    if (stored && TRAIL_MODES[stored]) return stored
    return window.localStorage.getItem('brams_cursor_cheat') === 'on' ? 'neon' : 'normal'
  } catch {
    return 'normal'
  }
}

function advanceMouseCode(seq, dir) {
  if (MOUSE_CODES.some(code => seq.every((value, index) => value === code.dirs[index]) && dir === code.dirs[seq.length])) {
    return [...seq, dir].slice(-MAX_MOUSE_CODE_LENGTH)
  }
  if (dir === seq[seq.length - 1]) return seq
  return MOUSE_CODES.some(code => dir === code.dirs[0]) ? [dir] : []
}

function completeMouseCodeMode(seq) {
  return MOUSE_CODES.find(code => seq.length === code.dirs.length && seq.every((value, index) => value === code.dirs[index]))?.mode || null
}

// Traînée dorée premium qui suit le curseur (sparkles qui s'estompent).
// Canvas pour la perf, particules plafonnées, fondu "lighter" pour le glow.
// Désactivé sur tactile (pas de curseur) et si l'utilisateur réduit les animations.
export default function CursorTrail() {
  const canvasRef = useRef(null)
  const [trailMode, setTrailMode] = useState(getStoredTrailMode)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    const fine = window.matchMedia?.('(pointer: fine)')?.matches
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    const active = trailMode !== 'normal' && fine && !reduce
    document.documentElement.classList.toggle('brams-cursor-cheat', active)
    try {
      window.localStorage.setItem('brams_cursor_mode', trailMode)
      window.localStorage.setItem('brams_cursor_cheat', trailMode === 'normal' ? 'off' : 'on')
    } catch {}
    return () => document.documentElement.classList.remove('brams-cursor-cheat')
  }, [trailMode])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(null), 1900)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    const fine = window.matchMedia?.('(pointer: fine)')?.matches
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (!fine || reduce) return
    const modeConfig = TRAIL_MODES[trailMode] || TRAIL_MODES.normal
    const customCursor = trailMode !== 'normal'

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, modeConfig.dpr)
    let w = 0, h = 0
    const resize = () => {
      w = canvas.width = window.innerWidth * dpr
      h = canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
    }
    resize()
    window.addEventListener('resize', resize)

    const COLORS = modeConfig.colors
    const parts = []
    const gesture = { seq: [], x: null, y: null, lastAt: 0 }
    let pointerX = null, pointerY = null, emitX = null, emitY = null, raf = 0

    const acceptGestureDirections = (dirs, x, y) => {
      const now = performance.now()
      if (now - gesture.lastAt > GESTURE_MAX_GAP) gesture.seq = []

      let nextSeq = gesture.seq
      for (const dir of dirs) {
        const candidate = advanceMouseCode(gesture.seq, dir)
        if (candidate.length > nextSeq.length || completeMouseCodeMode(candidate)) {
          nextSeq = candidate
        }
      }
      gesture.seq = nextSeq
      gesture.lastAt = now
      gesture.x = x
      gesture.y = y

      const completedMode = completeMouseCodeMode(gesture.seq)
      if (completedMode) {
        gesture.seq = []
        setTrailMode(active => {
          const next = active === completedMode ? 'normal' : completedMode
          const label = completedMode === 'rift' ? 'MODE RIFT ACTIVE' : 'MODE TRAINEE ACTIVE'
          setNotice(next === 'normal' ? 'MODE TRAINEE OFF' : label)
          return next
        })
      }
    }

    const trackMouseCode = (x, y) => {
      if (gesture.x == null || gesture.y == null) {
        gesture.x = x
        gesture.y = y
        return
      }

      const dx = x - gesture.x
      const dy = y - gesture.y
      if (Math.hypot(dx, dy) < GESTURE_STEP) return

      const ax = Math.abs(dx)
      const ay = Math.abs(dy)
      const horizontal = dx < 0 ? 'left' : 'right'
      const vertical = dy < 0 ? 'up' : 'down'
      const dirs = ay >= ax ? [vertical, horizontal] : [horizontal, vertical]
      if (Math.min(ax, ay) < GESTURE_STEP * 0.35) dirs.length = 1
      acceptGestureDirections(dirs, x, y)
    }

    const onMove = (e) => {
      trackMouseCode(e.clientX, e.clientY)

      const x = e.clientX * dpr, y = e.clientY * dpr
      pointerX = x; pointerY = y
      if (!raf) raf = requestAnimationFrame(tick)

      if (emitX != null) {
        const dx = x - emitX, dy = y - emitY
        const dist = Math.hypot(dx, dy)
        const minDist = modeConfig.minDist * dpr
        if (dist < minDist) return
        // densité proportionnelle à la vitesse (sans spammer)
        const n = Math.min(modeConfig.maxEmit, Math.max(1, Math.round(dist / (modeConfig.emitDivisor * dpr))))
        for (let i = 0; i < n; i++) {
          const t = i / n
          parts.push({
            x: emitX + dx * t, y: emitY + dy * t,
            vx: (Math.random() - 0.5) * modeConfig.speed * dpr,
            vy: ((Math.random() - 0.5) * modeConfig.drift + 0.1) * dpr,
            life: 1,
            size: (Math.random() * modeConfig.sizeRand + modeConfig.sizeBase) * dpr,
            color: COLORS[(Math.random() * COLORS.length) | 0],
            rot: Math.random() * Math.PI,
            spin: (Math.random() - 0.5) * 0.08,
          })
        }
      }
      emitX = x; emitY = y
      if (parts.length > modeConfig.maxParts) parts.splice(0, parts.length - modeConfig.maxParts)
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    const drawCustomCursor = () => {
      if (!customCursor || pointerX == null || pointerY == null) return
      ctx.save()
      ctx.translate(pointerX, pointerY)
      ctx.globalCompositeOperation = 'lighter'
      ctx.lineWidth = 2 * dpr

      if (trailMode === 'rift') {
        ctx.shadowBlur = 9 * dpr
        ctx.shadowColor = '#a855f7'
        ctx.strokeStyle = '#c4ff47'
        ctx.fillStyle = 'rgba(32, 10, 48, 0.78)'
        ctx.rotate(Math.PI / 4)
        ctx.fillRect(-6 * dpr, -6 * dpr, 12 * dpr, 12 * dpr)
        ctx.strokeRect(-6 * dpr, -6 * dpr, 12 * dpr, 12 * dpr)
        ctx.rotate(-Math.PI / 4)
        ctx.globalAlpha = 0.58
        ctx.beginPath()
        ctx.moveTo(-17 * dpr, 0)
        ctx.lineTo(17 * dpr, 0)
        ctx.moveTo(0, -17 * dpr)
        ctx.lineTo(0, 17 * dpr)
        ctx.strokeStyle = '#22d3ee'
        ctx.stroke()
      } else {
        ctx.shadowBlur = 8 * dpr
        ctx.shadowColor = '#00e7ff'
        ctx.fillStyle = 'rgba(6, 18, 28, 0.72)'
        ctx.strokeStyle = '#ffd84d'
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(18 * dpr, 7 * dpr)
        ctx.lineTo(8 * dpr, 11 * dpr)
        ctx.lineTo(5 * dpr, 21 * dpr)
        ctx.lineTo(-1 * dpr, 19 * dpr)
        ctx.lineTo(2 * dpr, 11 * dpr)
        ctx.lineTo(-7 * dpr, 15 * dpr)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
      ctx.restore()
      ctx.globalAlpha = 1
    }

    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        p.x += p.vx; p.y += p.vy
        p.vy += 0.02 * dpr
        p.rot += p.spin
        p.life -= modeConfig.decay
        if (p.life <= 0) { parts.splice(i, 1); continue }
        ctx.shadowBlur = modeConfig.shadow * dpr
        ctx.shadowColor = p.color
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.life * modeConfig.alpha
        if (trailMode === 'rift') {
          const size = p.size * p.life
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rot)
          ctx.fillRect(-size, -size, size * 2, size * 2)
          ctx.restore()
        } else {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
      ctx.globalCompositeOperation = 'source-over'
      drawCustomCursor()
      raf = parts.length ? requestAnimationFrame(tick) : 0
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
    }
  }, [trailMode])

  return (
    <>
      <style>{`
        html.brams-cursor-cheat,
        html.brams-cursor-cheat body,
        html.brams-cursor-cheat a,
        html.brams-cursor-cheat button,
        html.brams-cursor-cheat input,
        html.brams-cursor-cheat textarea,
        html.brams-cursor-cheat select,
        html.brams-cursor-cheat [role="button"] {
          cursor: none !important;
        }
        .brams-cursor-toast {
          position: fixed;
          left: 50%;
          bottom: 28px;
          z-index: 10000;
          transform: translateX(-50%);
          pointer-events: none;
          padding: 10px 16px;
          border-radius: 8px;
          border: 1px solid rgba(255, 216, 77, 0.48);
          background: rgba(7, 12, 20, 0.88);
          color: #ffe9a8;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.36), 0 0 24px rgba(0, 231, 255, 0.18);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .08em;
          white-space: nowrap;
          animation: brams-cursor-toast 1.9s ease forwards;
        }
        @keyframes brams-cursor-toast {
          0% { opacity: 0; transform: translateX(-50%) translateY(10px) scale(.96); }
          16% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          78% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) translateY(8px) scale(.98); }
        }
      `}</style>
      <canvas ref={canvasRef} aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none',
      }} />
      {notice && <div className="brams-cursor-toast">{notice}</div>}
    </>
  )
}
