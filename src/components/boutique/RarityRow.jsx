import { useCallback, useEffect, useRef, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { CARD_WIDTH, CARD_GAP } from './FondCard.jsx'

// Rangée « Netflix » par rareté : titre (pastille + nom + compteur + flèches)
// + carousel embla drag avec inertie. Générique (fonds, curseurs, traînées).
// ⚠ PAS de balise <header> ici : une règle CSS globale du site la gonfle à 260px.

const ROW_GAP = 26
const SLIDE_STRIDE = CARD_WIDTH + CARD_GAP // pas d'une carte (px)

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function RarityRow({ label, color = '#BFA46A', count = 0, countLabel = 'fonds', children }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ dragFree: true, align: 'start', containScroll: 'trimSnaps' })
  const rowRef = useRef(null)
  const [visible, setVisible] = useState(() => reduced())
  const [canScroll, setCanScroll] = useState({ prev: false, next: false })

  // Reveal fade-up à l'entrée dans le viewport (une fois).
  useEffect(() => {
    if (visible) return
    const el = rowRef.current
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect() } }, { threshold: 0.08 })
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  // Flèches : visibles seulement s'il y a de quoi défiler, à jour pendant le drag.
  useEffect(() => {
    if (!emblaApi) return
    const update = () => setCanScroll({ prev: emblaApi.canScrollPrev(), next: emblaApi.canScrollNext() })
    update()
    emblaApi.on('select', update).on('scroll', update).on('reInit', update)
    return () => { emblaApi.off('select', update).off('scroll', update).off('reInit', update) }
  }, [emblaApi])

  // Saut PAR PAGE (≈ une largeur de viewport) — scrollPrev/Next en dragFree ne
  // bouge que d'une carte, ce qui donne l'impression que rien ne se passe.
  const page = useCallback((dir) => {
    if (!emblaApi) return
    const per = Math.max(1, Math.floor(emblaApi.rootNode().clientWidth / SLIDE_STRIDE) - 1)
    const max = emblaApi.scrollSnapList().length - 1
    const target = Math.min(max, Math.max(0, emblaApi.selectedScrollSnap() + dir * per))
    emblaApi.scrollTo(target)
  }, [emblaApi])

  // Molette horizontale (trackpad / shift+molette) → translation directe.
  useEffect(() => {
    const viewport = emblaApi?.rootNode?.()
    if (!viewport || !emblaApi) return
    let acc = 0
    const onWheel = (e) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0
      if (!dx) return
      e.preventDefault()
      acc += dx
      if (Math.abs(acc) > 50) { page(acc > 0 ? 1 : -1); acc = 0 }
    }
    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [emblaApi, page])

  const hasOverflow = canScroll.prev || canScroll.next

  const arrow = (enabled) => ({
    width: 30, height: 30, borderRadius: 9, cursor: enabled ? 'pointer' : 'default', fontSize: 16, lineHeight: 1,
    display: 'grid', placeItems: 'center',
    color: enabled ? 'rgba(236,232,223,0.85)' : 'rgba(236,232,223,0.25)',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
    transition: 'background .16s, color .16s',
  })

  return (
    <div
      ref={rowRef}
      style={{
        marginBottom: ROW_GAP,
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(18px)',
        transition: reduced() ? 'none' : 'opacity .5s ease, transform .5s cubic-bezier(.2,.7,.3,1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span aria-hidden style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}66`, flexShrink: 0 }} />
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', color }}>{label}</h3>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(236,232,223,0.4)' }}>{count} {countLabel}</span>
        <span style={{ flex: 1 }} />
        {hasOverflow && (
          <>
            <button type="button" onClick={() => page(-1)} disabled={!canScroll.prev} aria-label={`${label} : précédent`} style={arrow(canScroll.prev)}>‹</button>
            <button type="button" onClick={() => page(1)} disabled={!canScroll.next} aria-label={`${label} : suivant`} style={arrow(canScroll.next)}>›</button>
          </>
        )}
      </div>

      <div
        ref={emblaRef}
        style={{
          overflow: 'hidden',
          maskImage: 'linear-gradient(90deg, transparent 0, black 14px, black calc(100% - 26px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent 0, black 14px, black calc(100% - 26px), transparent 100%)',
        }}
      >
        <div style={{ display: 'flex', gap: CARD_GAP, paddingTop: 5, paddingBottom: 8, paddingLeft: 2 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
