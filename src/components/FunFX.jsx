import { useEffect, useRef } from 'react'

// Pack d'effets fun (sobres/premium) :
//  - ripple doré à chaque clic
//  - double-clic → petite gerbe d'étoiles
//  - code Konami (↑↑↓↓←→←→ B A) → pluie de trésor One Piece + flash + toast
// DOM + Web Animations API. Désactivé si l'utilisateur réduit les animations.
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
const TREASURE = ['🪙', '💰', '🟡', '☠️', '🏴‍☠️', '💎']
const STARS = ['✨', '⭐', '🌟', '💫']

export default function FunFX() {
  const layerRef = useRef(null)

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (reduce) return
    const layer = layerRef.current
    if (!layer) return

    // ── Ripple doré au clic ───────────────────────────────────────────────────
    const onDown = (e) => {
      const x = e.clientX, y = e.clientY
      if (x == null) return
      const ring = document.createElement('div')
      ring.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:14px;height:14px;` +
        `margin:-7px 0 0 -7px;border-radius:50%;border:2px solid rgba(212,176,110,.7);` +
        `pointer-events:none;will-change:transform,opacity`
      layer.appendChild(ring)
      ring.animate(
        [{ transform: 'scale(.4)', opacity: .9 }, { transform: 'scale(6)', opacity: 0 }],
        { duration: 600, easing: 'cubic-bezier(.22,1,.36,1)' }
      ).onfinish = () => ring.remove()
    }
    window.addEventListener('pointerdown', onDown, { passive: true })

    // ── Double-clic → gerbe d'étoiles ─────────────────────────────────────────
    const onDbl = (e) => spawnBurst(e.clientX, e.clientY, STARS, 10, '#ffe9a8')
    window.addEventListener('dblclick', onDbl)

    function spawnBurst(cx, cy, set, n, glow) {
      for (let i = 0; i < n; i++) {
        const el = document.createElement('span')
        el.textContent = set[(Math.random() * set.length) | 0]
        const size = 14 + Math.random() * 18
        el.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;font-size:${size}px;` +
          `transform:translate(-50%,-50%);pointer-events:none;will-change:transform,opacity;` +
          `filter:drop-shadow(0 0 6px ${glow})`
        layer.appendChild(el)
        const ang = (Math.PI * 2) * (i / n) + Math.random() * 0.6
        const dist = 50 + Math.random() * 80
        const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 30
        el.animate([
          { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
          { transform: `translate(-50%,-50%) translate(${dx * .5}px,${dy * .5}px) scale(1.1)`, opacity: 1, offset: .3 },
          { transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) scale(.8)`, opacity: 0 },
        ], { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => el.remove()
      }
    }

    // ── Code Konami → pluie de trésor ─────────────────────────────────────────
    let seq = []
    const onKey = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      seq.push(k)
      if (seq.length > KONAMI.length) seq = seq.slice(-KONAMI.length)
      if (seq.length === KONAMI.length && seq.every((v, i) => v === KONAMI[i])) {
        seq = []
        treasureRain()
      }
    }
    window.addEventListener('keydown', onKey)

    function treasureRain() {
      // flash doré
      const flash = document.createElement('div')
      flash.style.cssText = 'position:absolute;inset:0;pointer-events:none;' +
        'background:radial-gradient(circle at 50% 40%, rgba(255,216,77,.28), transparent 60%)'
      layer.appendChild(flash)
      flash.animate([{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 0 }], { duration: 1400, easing: 'ease-out' }).onfinish = () => flash.remove()

      // toast TRÉSOR
      const toast = document.createElement('div')
      toast.textContent = '🏴‍☠️ TRÉSOR !'
      toast.style.cssText = 'position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);' +
        'font-family:"Pirata One",cursive;font-size:64px;color:#ffd84d;pointer-events:none;' +
        'text-shadow:0 4px 24px rgba(240,165,0,.7),0 0 2px #1a1200;font-weight:900;white-space:nowrap'
      layer.appendChild(toast)
      toast.animate([
        { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
        { transform: 'translate(-50%,-50%) scale(1.08)', opacity: 1, offset: .25 },
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: .7 },
        { transform: 'translate(-50%,-50%) scale(1.04)', opacity: 0 },
      ], { duration: 2200, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => toast.remove()

      // pluie de pièces
      const W = window.innerWidth, H = window.innerHeight
      for (let i = 0; i < 46; i++) {
        const el = document.createElement('span')
        el.textContent = TREASURE[(Math.random() * TREASURE.length) | 0]
        const size = 18 + Math.random() * 22
        const x = Math.random() * W
        el.style.cssText = `position:absolute;left:${x}px;top:-40px;font-size:${size}px;` +
          `pointer-events:none;will-change:transform,opacity;filter:drop-shadow(0 2px 6px rgba(240,165,0,.5))`
        layer.appendChild(el)
        const sway = (Math.random() * 80 - 40)
        const rot = Math.random() * 720 - 360
        el.animate([
          { transform: 'translate(0,0) rotate(0deg)', opacity: 0 },
          { opacity: 1, offset: .08 },
          { transform: `translate(${sway}px,${H + 80}px) rotate(${rot}deg)`, opacity: 1 },
        ], { duration: 2200 + Math.random() * 1400, delay: Math.random() * 600, easing: 'cubic-bezier(.45,.05,.55,.95)' }).onfinish = () => el.remove()
      }
    }

    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('dblclick', onDbl)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return <div ref={layerRef} aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 9997, pointerEvents: 'none', overflow: 'hidden' }} />
}
