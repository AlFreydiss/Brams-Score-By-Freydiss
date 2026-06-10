import { useEffect, useState } from 'react'

// Index latéral de la boutique — style « sommaire d'archive » : labels TOUJOURS
// visibles, tiret doré qui s'étire sur la section active. Pas de boîte flottante,
// pas d'emoji : juste de la typo et des filets, raccord avec la DA or/encre.
const GOLD = '#bfa46a'
const GOLD_HI = '#d8bd7e'
const DIM = 'rgba(236,232,223,0.42)'

const SECTIONS = [
  { id: 'shop-fonds', label: 'Fonds' },
  { id: 'shop-curseurs', label: 'Curseurs' },
  { id: 'shop-trainees', label: 'Traînées' },
]

export default function ShopRail() {
  const [active, setActive] = useState('shop-fonds')

  useEffect(() => {
    const els = SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean)
    if (!els.length || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      entries => { for (const e of entries) if (e.isIntersecting) setActive(e.target.id) },
      { rootMargin: '-30% 0px -60% 0px' }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <nav aria-label="Sections de la boutique" className="shop-rail"
      style={{ position: 'fixed', right: 'clamp(14px, 2vw, 30px)', top: '50%', transform: 'translateY(-50%)', zIndex: 60, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-end' }}>
      <style>{`@media (max-width: 1100px) { .shop-rail { display: none !important } }`}</style>
      {SECTIONS.map(s => {
        const on = active === s.id
        return (
          <button
            key={s.id}
            onClick={() => go(s.id)}
            aria-current={on ? 'true' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              background: 'none', border: 'none', padding: 0,
              transition: 'opacity .25s ease',
            }}
            onMouseEnter={e => { e.currentTarget.firstChild.style.color = GOLD_HI }}
            onMouseLeave={e => { e.currentTarget.firstChild.style.color = on ? GOLD : DIM }}
          >
            <span style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase',
              fontFamily: "'Cinzel', serif",
              color: on ? GOLD : DIM,
              textShadow: on ? `0 0 14px ${GOLD}55` : 'none',
              transition: 'color .25s ease, text-shadow .25s ease',
            }}>{s.label}</span>
            <span aria-hidden style={{
              display: 'block', height: 2, borderRadius: 2,
              width: on ? 30 : 14,
              background: on ? `linear-gradient(90deg, ${GOLD}, ${GOLD_HI})` : 'rgba(236,232,223,0.22)',
              boxShadow: on ? `0 0 10px ${GOLD}66` : 'none',
              transition: 'width .3s cubic-bezier(.2,.7,.3,1), background .25s ease',
            }} />
          </button>
        )
      })}
    </nav>
  )
}
