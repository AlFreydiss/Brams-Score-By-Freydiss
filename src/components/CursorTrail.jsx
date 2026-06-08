import { useEffect, useRef, useState } from 'react'

const MOUSE_CODES = [
  ['up', 'up', 'down', 'down', 'left', 'right'],
  ['up', 'up', 'down', 'down', 'right', 'left'],
]
const MAX_MOUSE_CODE_LENGTH = Math.max(...MOUSE_CODES.map(code => code.length))
const GESTURE_STEP = 34
const GESTURE_MAX_GAP = 5000
const NORMAL_MAX_PARTS = 120
const CHEAT_MAX_PARTS = 210

function getStoredCheatMode() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem('brams_cursor_cheat') === 'on'
  } catch {
    return false
  }
}

function advanceMouseCode(seq, dir) {
  if (MOUSE_CODES.some(code => seq.every((value, index) => value === code[index]) && dir === code[seq.length])) {
    return [...seq, dir].slice(-MAX_MOUSE_CODE_LENGTH)
  }
  if (dir === seq[seq.length - 1]) return seq
  return MOUSE_CODES.some(code => dir === code[0]) ? [dir] : []
}

function isCompleteMouseCode(seq) {
  return MOUSE_CODES.some(code => seq.length === code.length && seq.every((value, index) => value === code[index]))
}

// Traînée dorée premium qui suit le curseur (sparkles qui s'estompent).
// Canvas pour la perf, particules plafonnées, fondu "lighter" pour le glow.
// Désactivé sur tactile (pas de curseur) et si l'utilisateur réduit les animations.
export default function CursorTrail() {
  const canvasRef = useRef(null)
  const [cheatMode, setCheatMode] = useState(getStoredCheatMode)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    const fine = window.matchMedia?.('(pointer: fine)')?.matches
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    const active = cheatMode && fine && !reduce
    document.documentElement.classList.toggle('brams-cursor-cheat', active)
    try {
      window.localStorage.setItem('brams_cursor_cheat', cheatMode ? 'on' : 'off')
    } catch {}
    return () => document.documentElement.classList.remove('brams-cursor-cheat')
  }, [cheatMode])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(null), 1900)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    const fine = window.matchMedia?.('(pointer: fine)')?.matches
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (!fine || reduce) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, cheatMode ? 1.5 : 1.25)
    let w = 0, h = 0
    const resize = () => {
      w = canvas.width = window.innerWidth * dpr
      h = canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
    }
    resize()
    window.addEventListener('resize', resize)

    const COLORS = cheatMode
      ? ['#00e7ff', '#ff4fd8', '#ffd84d', '#8cfffb']
      : ['#e8c878', '#d4a017', '#bfa46a', '#ffe9a8']
    const parts = []
    const gesture = { seq: [], x: null, y: null, lastAt: 0 }
    let pointerX = null, pointerY = null, emitX = null, emitY = null, raf = 0

    const acceptGestureDirection = (dir, x, y) => {
      const now = performance.now()
      if (now - gesture.lastAt > GESTURE_MAX_GAP) gesture.seq = []
      gesture.seq = advanceMouseCode(gesture.seq, dir)
      gesture.lastAt = now
      gesture.x = x
      gesture.y = y

      if (isCompleteMouseCode(gesture.seq)) {
        gesture.seq = []
        setCheatMode(active => {
          const next = !active
          setNotice(next ? 'MODE TRAINEE ACTIVE' : 'MODE TRAINEE OFF')
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
      const dir = ay >= ax
        ? (dy < 0 ? 'up' : 'down')
        : (dx < 0 ? 'left' : 'right')
      acceptGestureDirection(dir, x, y)
    }

    const onMove = (e) => {
      trackMouseCode(e.clientX, e.clientY)

      const x = e.clientX * dpr, y = e.clientY * dpr
      pointerX = x; pointerY = y
      if (!raf) raf = requestAnimationFrame(tick)

      if (emitX != null) {
        const dx = x - emitX, dy = y - emitY
        const dist = Math.hypot(dx, dy)
        const minDist = (cheatMode ? 8 : 12) * dpr
        if (dist < minDist) return
        // densité proportionnelle à la vitesse (sans spammer)
        const n = cheatMode
          ? Math.min(6, Math.max(1, Math.round(dist / (11 * dpr))))
          : Math.min(3, Math.max(1, Math.round(dist / (16 * dpr))))
        for (let i = 0; i < n; i++) {
          const t = i / n
          parts.push({
            x: emitX + dx * t, y: emitY + dy * t,
            vx: (Math.random() - 0.5) * (cheatMode ? 0.75 : 0.25) * dpr,
            vy: ((Math.random() - 0.5) * (cheatMode ? 0.55 : 0.25) + 0.12) * dpr,
            life: 1,
            size: (Math.random() * (cheatMode ? 2.7 : 1.35) + (cheatMode ? 1.8 : 1.25)) * dpr,
            color: COLORS[(Math.random() * COLORS.length) | 0],
          })
        }
      }
      emitX = x; emitY = y
      const maxParts = cheatMode ? CHEAT_MAX_PARTS : NORMAL_MAX_PARTS
      if (parts.length > maxParts) parts.splice(0, parts.length - maxParts)
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    const drawCheatCursor = () => {
      if (!cheatMode || pointerX == null || pointerY == null) return
      ctx.save()
      ctx.translate(pointerX, pointerY)
      ctx.globalCompositeOperation = 'lighter'
      ctx.shadowBlur = 10 * dpr
      ctx.shadowColor = '#00e7ff'
      ctx.lineWidth = 2 * dpr
      ctx.fillStyle = 'rgba(6, 18, 28, 0.72)'
      ctx.strokeStyle = '#ffd84d'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(20 * dpr, 8 * dpr)
      ctx.lineTo(9 * dpr, 12 * dpr)
      ctx.lineTo(5 * dpr, 23 * dpr)
      ctx.lineTo(-1 * dpr, 21 * dpr)
      ctx.lineTo(2 * dpr, 12 * dpr)
      ctx.lineTo(-8 * dpr, 16 * dpr)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.strokeStyle = '#00e7ff'
      ctx.globalAlpha = 0.38
      ctx.arc(5 * dpr, 5 * dpr, 14 * dpr, 0, Math.PI * 2)
      ctx.stroke()
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
        p.life -= cheatMode ? 0.035 : 0.045
        if (p.life <= 0) { parts.splice(i, 1); continue }
        ctx.beginPath()
        ctx.shadowBlur = (cheatMode ? 10 : 5) * dpr
        ctx.shadowColor = p.color
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.life * (cheatMode ? 0.78 : 0.65)
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
      ctx.globalCompositeOperation = 'source-over'
      drawCheatCursor()
      raf = parts.length ? requestAnimationFrame(tick) : 0
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
    }
  }, [cheatMode])

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
        html.brams-cursor-cheat [role="button"],
        html.brams-cursor-cheat [style*="cursor"] {
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
