import { useEffect, useState } from 'react'

// Rail de navigation fixe à droite de la boutique : saute aux sections
// Fonds / Curseurs / Traînées. La section visible est mise en avant.
const GOLD = '#bfa46a'
const SECTIONS = [
  { id: 'shop-fonds', label: 'Fonds', icon: '🎞️' },
  { id: 'shop-curseurs', label: 'Curseurs', icon: '🖱️' },
  { id: 'shop-trainees', label: 'Traînées', icon: '✨' },
]

export default function ShopRail() {
  const [active, setActive] = useState('shop-fonds')
  const [hovered, setHovered] = useState(null)

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
    <nav
      aria-label="Sections de la boutique"
      className="shop-rail"
      style={{
        position: 'fixed', right: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 60,
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: 8, borderRadius: 14,
        background: 'rgba(10,11,16,0.72)', border: '1px solid rgba(255,255,255,0.09)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {SECTIONS.map(s => {
        const on = active === s.id
        const hov = hovered === s.id
        return (
          <button
            key={s.id}
            onClick={() => go(s.id)}
            onMouseEnter={() => setHovered(s.id)}
            onMouseLeave={() => setHovered(null)}
            title={s.label}
            aria-label={s.label}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              padding: '8px 10px', borderRadius: 10, border: 'none',
              background: on ? `${GOLD}1f` : 'transparent',
              boxShadow: on ? `inset 0 0 0 1px ${GOLD}55` : 'none',
              transition: 'background .2s, box-shadow .2s',
            }}
          >
            <span style={{ fontSize: 15, lineHeight: 1, filter: on ? 'none' : 'grayscale(.4)' }}>{s.icon}</span>
            {/* Label révélé au survol (le rail reste discret sinon) */}
            <span style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
              color: on ? GOLD : 'rgba(236,232,223,0.65)',
              maxWidth: hov || on ? 70 : 0, overflow: 'hidden', whiteSpace: 'nowrap',
              transition: 'max-width .25s ease',
            }}>{s.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
