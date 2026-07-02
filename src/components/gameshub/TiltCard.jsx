// ── Taverne de l'Arcade — TiltCard : tilt 3D + spotlight doré au curseur ──────
// Wrapper d'interaction pour les cartes du deck (.gh-card). Le tilt vit sur le
// WRAPPER, le lift translateY(-4px) du :hover reste sur l'ENFANT → pas de conflit.
// - Ne vole PAS les clics : handlers pointer seulement (jamais click), overlay en
//   pointerEvents:none, pas de tabindex → focus-visible de l'enfant intact.
// - rAF-throttle : une mise à jour max par frame, zéro setState (refs +
//   style.setProperty direct).
// - prefers-reduced-motion OU pointer:coarse → enfant rendu tel quel, aucun tilt.
// - `accent` doit être un hex 6 chiffres (#rrggbb) : on lui suffixe l'alpha "14".
import { useEffect, useMemo, useRef } from 'react'

export default function TiltCard({ accent = '#d4a017', maxTilt = 5, children, style }) {
  const wrapRef = useRef(null)
  const glowRef = useRef(null)
  const rectRef = useRef(null)          // rect figé au pointerenter (transform = identité à ce moment-là,
                                        // getBoundingClientRect pendant le tilt renverrait la boîte transformée → jitter)
  const posRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef(0)

  // Évalué une fois au mount : mobile/tactile ou motion réduite → composant passif.
  const disabled = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || window.matchMedia('(pointer: coarse)').matches
  }, [])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  if (disabled) {
    // display:grid → l'enfant s'étire et remplit le wrapper (préserve les
    // hauteurs égales quand TiltCard est un item de la grille du hub).
    return <div style={{ display: 'grid', ...style }}>{children}</div>
  }

  const apply = () => {
    rafRef.current = 0
    const el = wrapRef.current
    const r = rectRef.current
    if (!el || !r || !r.width || !r.height) return
    const px = Math.min(Math.max((posRef.current.x - r.left) / r.width, 0), 1)
    const py = Math.min(Math.max((posRef.current.y - r.top) / r.height, 0), 1)
    const rx = (0.5 - py) * 2 * maxTilt
    const ry = (px - 0.5) * 2 * maxTilt
    el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`
    el.style.setProperty('--tx', `${(px * r.width).toFixed(1)}px`)
    el.style.setProperty('--ty', `${(py * r.height).toFixed(1)}px`)
  }

  const schedule = (e) => {
    posRef.current.x = e.clientX
    posRef.current.y = e.clientY
    if (!rafRef.current) rafRef.current = requestAnimationFrame(apply)
  }

  const onPointerEnter = (e) => {
    const el = wrapRef.current
    if (!el) return
    rectRef.current = el.getBoundingClientRect()
    el.style.transition = 'transform .12s ease-out' // suivi souple pendant le move
    if (glowRef.current) glowRef.current.style.opacity = '1'
    schedule(e)
  }

  const onPointerLeave = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0 }
    const el = wrapRef.current
    if (el) {
      el.style.transition = 'transform .3s ease' // reset doux
      el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)'
    }
    if (glowRef.current) glowRef.current.style.opacity = '0'
  }

  return (
    <div
      ref={wrapRef}
      onPointerEnter={onPointerEnter}
      onPointerMove={schedule}
      onPointerLeave={onPointerLeave}
      style={{
        display: 'grid', position: 'relative', willChange: 'transform',
        '--tx': '50%', '--ty': '50%',
        ...style,
      }}
    >
      {children}
      {/* Spotlight radial qui suit le curseur — au-dessus de la carte mais
          transparent aux événements ; borderRadius 18 = rayon des .gh-card. */}
      <div
        ref={glowRef}
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
          borderRadius: 18,
          background: `radial-gradient(320px circle at var(--tx) var(--ty), ${accent}14, transparent 70%)`,
          opacity: 0, transition: 'opacity .2s ease',
        }}
      />
    </div>
  )
}
