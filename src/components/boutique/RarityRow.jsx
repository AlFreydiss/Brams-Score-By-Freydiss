import { useCallback, useEffect, useRef, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'

// Rangée « Netflix » par rareté : header (pastille + nom + compteur + flèches)
// + carousel embla drag avec inertie. Générique : les cartes arrivent en children
// (fonds, curseurs, traînées). Fade de bord + reveal au scroll, reduced-motion ok.

const CARD_GAP = 12
const ROW_GAP = 48
const WHEEL_STEP = 60 // accumulation deltaX avant scrollNext/Prev

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function RarityRow({ label, color = '#BFA46A', count = 0, countLabel = 'fonds', children }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ dragFree: true, align: 'start', containScroll: 'trimSnaps' })
  const rowRef = useRef(null)
  const [visible, setVisible] = useState(() => reduced())

  // Reveal fade-up à l'entrée dans le viewport (une fois).
  useEffect(() => {
    if (visible) return
    const el = rowRef.current
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect() } }, { threshold: 0.08 })
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  // Molette horizontale (trackpad / shift+molette) → fait défiler la rangée.
  useEffect(() => {
    const viewport = emblaApi?.rootNode?.()
    if (!viewport || !emblaApi) return
    let acc = 0
    const onWheel = (e) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0
      if (!dx) return
      e.preventDefault()
      acc += dx
      if (acc > WHEEL_STEP) { emblaApi.scrollNext(); acc = 0 }
      else if (acc < -WHEEL_STEP) { emblaApi.scrollPrev(); acc = 0 }
    }
    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [emblaApi])

  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  const arrow = {
    width: 30, height: 30, borderRadius: 9, cursor: 'pointer', fontSize: 16, lineHeight: 1,
    display: 'grid', placeItems: 'center', color: 'rgba(236,232,223,0.75)',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
    transition: 'background .16s, color .16s',
  }

  return (
    <section
      ref={rowRef}
      style={{
        marginBottom: ROW_GAP,
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(22px)',
        transition: reduced() ? 'none' : 'opacity .55s ease, transform .55s cubic-bezier(.2,.7,.3,1)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span aria-hidden style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}66`, flexShrink: 0 }} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', color }}>{label}</h3>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(236,232,223,0.4)' }}>{count} {countLabel}</span>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={prev} aria-label={`${label} : précédent`} style={arrow}>‹</button>
        <button type="button" onClick={next} aria-label={`${label} : suivant`} style={arrow}>›</button>
      </header>

      <div
        ref={emblaRef}
        style={{
          overflow: 'hidden',
          // Fade des bords : suggère le contenu à scroller.
          maskImage: 'linear-gradient(90deg, transparent 0, black 18px, black calc(100% - 28px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent 0, black 18px, black calc(100% - 28px), transparent 100%)',
        }}
      >
        <div style={{ display: 'flex', gap: CARD_GAP, paddingTop: 6, paddingBottom: 10, paddingLeft: 2 }}>
          {children}
        </div>
      </div>
    </section>
  )
}
