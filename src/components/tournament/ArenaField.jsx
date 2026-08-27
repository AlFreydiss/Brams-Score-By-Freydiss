import { useEffect, useRef } from 'react'

// Champ d'énergie de l'arène — nappe de particules reliées entre elles, dérive
// lente, réaction au curseur et onde de choc au clic.
//
// Rendu sur <canvas> et non en <div> animées : à cette densité (jusqu'à 90
// points plus leurs liens) le DOM s'écroulait, alors qu'un seul canvas tient le
// 60 fps. Le composant est transparent et en pointer-events:none, donc il se
// POSE SUR un fond existant (TournamentBackdrop, DoublageBackdrop…) au lieu de
// le remplacer : chaque page garde son identité et gagne la profondeur.

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'

// '#e85aa0' -> [232, 90, 160]
function toRgb(hex) {
  const h = String(hex || '').replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(full, 16)
  if (Number.isNaN(n)) return [232, 90, 160]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export default function ArenaField({
  accentA = '#e85aa0',
  accentB = '#9d5aff',
  density = 1,
  zIndex = 1,
  interactive = true,
  linked = true,
}) {
  const canvasRef = useRef(null)
  // Les accents changent (couleur du tournoi, camp du doublage) : on les lit
  // depuis une ref pour ne pas relancer toute la boucle à chaque changement.
  const cfgRef = useRef(null)
  cfgRef.current = { accentA, accentB, density, interactive, linked }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const mq = window.matchMedia ? window.matchMedia(REDUCED_QUERY) : null
    let reduced = !!(mq && mq.matches)

    let w = 0, h = 0, dpr = 1
    let particles = []
    let waves = []
    let raf = 0
    let last = performance.now()
    const pointer = { x: -9999, y: -9999, active: false }

    function seed() {
      const target = Math.round(((w * h) / 22000) * cfgRef.current.density)
      const count = Math.max(16, Math.min(90, target))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.16,
        vy: -0.05 - Math.random() * 0.18,
        r: 0.7 + Math.random() * 1.9,
        // Une minorité de points prend l'accent secondaire : ça évite la nappe
        // monochrome tout en gardant la palette du site.
        b: Math.random() < 0.34,
        ph: Math.random() * Math.PI * 2,
      }))
    }

    function resize() {
      const rect = canvas.getBoundingClientRect()
      w = Math.max(1, rect.width)
      h = Math.max(1, rect.height)
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    function onPointerMove(e) {
      if (!cfgRef.current.interactive) return
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.active = true
    }
    function onPointerLeave() {
      pointer.active = false
      pointer.x = -9999
      pointer.y = -9999
    }
    function onPointerDown(e) {
      if (!cfgRef.current.interactive || reduced) return
      waves.push({ x: e.clientX, y: e.clientY, t: 0 })
      if (waves.length > 4) waves.shift()
    }

    // Rendu figé sous prefers-reduced-motion : la profondeur reste, le
    // mouvement disparaît.
    function drawStatic() {
      const a = toRgb(cfgRef.current.accentA)
      const b = toRgb(cfgRef.current.accentB)
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        const c = p.b ? b : a
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0.24)'
        ctx.fill()
      }
    }

    // Qualité adaptative. Les liens de proximité sont en O(n²) : sur une
    // machine modeste ou un grand écran, c'est eux qui coûtent. Plutôt que de
    // fixer une densité au pif, on mesure le temps réel entre frames et on
    // dégrade par paliers — d'abord les liens, puis le nombre de points. La
    // qualité remonte si la machine suit à nouveau, avec une marge entre les
    // deux seuils pour ne pas osciller.
    let slow = 0, fast = 0
    let quality = 2   // 2 = liens + tous les points, 1 = sans liens, 0 = moitié des points

    function grade(dt) {
      if (dt > 1.55) { slow++; fast = 0 } else if (dt < 1.15) { fast++; slow = 0 }
      if (slow > 45 && quality > 0) { quality--; slow = 0 }
      else if (fast > 240 && quality < 2) { quality++; fast = 0 }
    }

    function frame(now) {
      const dt = Math.min(64, now - last) / 16.6667  // en « frames de 60 fps »
      last = now
      grade(dt)

      const cfg = cfgRef.current
      const a = toRgb(cfg.accentA)
      const b = toRgb(cfg.accentB)
      const linkDist = Math.min(150, Math.max(80, w / 9))
      // Au palier le plus bas on ne DESSINE qu'un point sur deux. Ils continuent
      // tous de se déplacer : la nappe s'éclaircit, elle ne se fige pas, et elle
      // se recomplète telle quelle si la qualité remonte.
      const drawn = quality === 0 ? Math.ceil(particles.length / 2) : particles.length

      ctx.clearRect(0, 0, w, h)

      for (const p of particles) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.ph += 0.02 * dt

        // Le curseur repousse doucement les points : le fond « respire » sous
        // la souris sans jamais partir en explosion.
        if (cfg.interactive && pointer.active) {
          const dx = p.x - pointer.x
          const dy = p.y - pointer.y
          const d2 = dx * dx + dy * dy
          if (d2 < 26000 && d2 > 1) {
            const f = (1 - d2 / 26000) * 0.55 / Math.sqrt(d2)
            p.x += dx * f * dt * 6
            p.y += dy * f * dt * 6
          }
        }

        // Les ondes de choc poussent radialement pendant leur passage.
        for (const wv of waves) {
          const dx = p.x - wv.x
          const dy = p.y - wv.y
          const d = Math.sqrt(dx * dx + dy * dy) || 1
          const radius = wv.t * 9
          const delta = Math.abs(d - radius)
          if (delta < 46) {
            const f = ((46 - delta) / 46) * (1 - wv.t / 90) * 1.6
            p.x += (dx / d) * f * dt
            p.y += (dy / d) * f * dt
          }
        }

        // Rebouclage : un point sorti par le haut repart du bas.
        if (p.y < -20) { p.y = h + 12; p.x = Math.random() * w }
        if (p.y > h + 20) p.y = -12
        if (p.x < -20) p.x = w + 12
        if (p.x > w + 20) p.x = -12
      }

      // Liens de proximité — tracés avant les points pour rester en arrière.
      if (cfg.linked && quality === 2) {
        ctx.lineWidth = 0.7
        for (let i = 0; i < drawn; i++) {
          const pa = particles[i]
          for (let j = i + 1; j < drawn; j++) {
            const pb = particles[j]
            const dx = pa.x - pb.x
            const dy = pa.y - pb.y
            const d2 = dx * dx + dy * dy
            if (d2 > linkDist * linkDist) continue
            const alpha = (1 - Math.sqrt(d2) / linkDist) * 0.16
            const c = (pa.b || pb.b) ? b : a
            ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha + ')'
            ctx.beginPath()
            ctx.moveTo(pa.x, pa.y)
            ctx.lineTo(pb.x, pb.y)
            ctx.stroke()
          }
        }
      }

      for (let i = 0; i < drawn; i++) {
        const p = particles[i]
        const c = p.b ? b : a
        const pulse = 0.55 + 0.45 * Math.sin(p.ph)
        const rad = p.r * (1 + pulse * 0.35)
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 5)
        grad.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (0.5 * pulse) + ')')
        grad.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, rad * 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,' + (0.14 * pulse) + ')'
        ctx.beginPath()
        ctx.arc(p.x, p.y, rad * 0.6, 0, Math.PI * 2)
        ctx.fill()
      }

      // Anneaux de choc
      for (const wv of waves) {
        wv.t += dt
        const radius = wv.t * 9
        const alpha = Math.max(0, 1 - wv.t / 90) * 0.34
        if (alpha <= 0) continue
        ctx.strokeStyle = 'rgba(' + a[0] + ',' + a[1] + ',' + a[2] + ',' + alpha + ')'
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.arc(wv.x, wv.y, radius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.strokeStyle = 'rgba(' + b[0] + ',' + b[1] + ',' + b[2] + ',' + (alpha * 0.6) + ')'
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.arc(wv.x, wv.y, radius * 0.72, 0, Math.PI * 2)
        ctx.stroke()
      }
      waves = waves.filter(wv => wv.t < 90)

      raf = requestAnimationFrame(frame)
    }

    function start() {
      if (raf || reduced) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    function stop() {
      if (!raf) return
      cancelAnimationFrame(raf)
      raf = 0
    }
    // Onglet en arrière-plan : on rend la main au navigateur.
    function onVisibility() {
      if (document.hidden) stop()
      else start()
    }
    function onReducedChange(e) {
      reduced = e.matches
      stop()
      if (reduced) drawStatic()
      else start()
    }

    resize()
    if (reduced) drawStatic()
    else start()

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    if (ro) ro.observe(canvas)
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('visibilitychange', onVisibility)
    if (mq && mq.addEventListener) mq.addEventListener('change', onReducedChange)

    return () => {
      stop()
      if (ro) ro.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      if (mq && mq.removeEventListener) mq.removeEventListener('change', onReducedChange)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex,
      }}
    />
  )
}
