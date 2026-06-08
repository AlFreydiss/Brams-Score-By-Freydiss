import { useEffect, useRef } from 'react'

// Dessine une forme fermée avec le curseur (un cœur, un cercle…) → burst de cœurs.
// Détection : la trajectoire récente fait un tour complet (~360°) autour de son
// centre ET se referme. Robuste, ne se déclenche pas sur un mouvement normal.
// Désactivé sur tactile / si l'utilisateur réduit les animations.
const HEARTS = ['💖', '💗', '💓', '❤️', '💕', '💝', '💞']

export default function GestureHearts() {
  const layerRef = useRef(null)

  useEffect(() => {
    const fine = window.matchMedia?.('(pointer: fine)')?.matches
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (!fine || reduce) return
    const layer = layerRef.current
    if (!layer) return

    const pts = []           // points récents {x,y,t}
    let cooldownUntil = 0

    const burst = (cx, cy) => {
      const n = 16
      for (let i = 0; i < n; i++) {
        const el = document.createElement('span')
        el.textContent = HEARTS[(Math.random() * HEARTS.length) | 0]
        const size = 16 + Math.random() * 22
        el.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;font-size:${size}px;` +
          `transform:translate(-50%,-50%);pointer-events:none;will-change:transform,opacity;` +
          `filter:drop-shadow(0 2px 7px rgba(255,80,120,.55))`
        layer.appendChild(el)
        const ang = (Math.PI * 2) * (i / n) + Math.random() * 0.5
        const dist = 65 + Math.random() * 95
        const dx = Math.cos(ang) * dist
        const dy = Math.sin(ang) * dist - (65 + Math.random() * 70) // biais vers le haut
        const rot = Math.random() * 120 - 60
        el.animate([
          { transform: 'translate(-50%,-50%) scale(.3) rotate(0deg)', opacity: 0 },
          { transform: `translate(-50%,-50%) translate(${dx * 0.4}px,${dy * 0.4}px) scale(1.15) rotate(${rot * 0.5}deg)`, opacity: 1, offset: 0.25 },
          { transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) scale(.85) rotate(${rot}deg)`, opacity: 0 },
        ], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => el.remove()
      }
    }

    const onMove = (e) => {
      const now = performance.now()
      pts.push({ x: e.clientX, y: e.clientY, t: now })
      while (pts.length && now - pts[0].t > 1800) pts.shift()
      if (now < cooldownUntil || pts.length < 22) return

      // Taille + longueur du tracé (évite les micro-gestes)
      let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, len = 0
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y
        if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y
        if (i) len += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y)
      }
      const diag = Math.hypot(maxX - minX, maxY - minY)
      if (diag < 80 || len < 260) return

      // La forme se referme : fin proche du début
      const a = pts[0], b = pts[pts.length - 1]
      if (Math.hypot(b.x - a.x, b.y - a.y) > diag * 0.34) return

      // Tour complet : somme des variations d'angle autour du centre ≈ ±360°
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
      let total = 0, prev = Math.atan2(pts[0].y - cy, pts[0].x - cx)
      for (let i = 1; i < pts.length; i++) {
        let cur = Math.atan2(pts[i].y - cy, pts[i].x - cx)
        let d = cur - prev
        if (d > Math.PI) d -= 2 * Math.PI
        if (d < -Math.PI) d += 2 * Math.PI
        total += d; prev = cur
      }
      if (Math.abs(total) > Math.PI * 1.7) {
        burst(cx, cy)
        pts.length = 0
        cooldownUntil = now + 900
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return <div ref={layerRef} aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }} />
}
