// ─────────────────────────────────────────────────────────────────────────────
// cine.jsx — Système de design CINÉMATIQUE de l'accueil Brams Community.
// ADN repris du Hero (ivoire/or/Clash Display) et UNIFIÉ : tous les blocs sous le
// hero importent d'ici → cohérence totale, zéro RGB, zéro glow agressif, pleine
// largeur. Inline styles only (pas de Tailwind global sur ce site).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'

export const CINE = {
  bg:      '#08090D',
  ink:     '#f4f0e6',          // texte titre (ivoire chaud)
  inkSoft: 'rgba(244,240,230,0.72)',
  muted:   'rgba(255,255,255,0.52)',
  faint:   'rgba(255,255,255,0.34)',
  gold:    '#BFA46A',
  goldHi:  '#d8bd7e',
  goldDim: 'rgba(191,164,106,0.55)',
  live:    '#2ECC71',
  hair:    'rgba(255,255,255,0.08)',
  hairTop: 'rgba(255,255,255,0.14)',
  panel:   'rgba(255,255,255,0.025)',
  panel2:  'rgba(255,255,255,0.045)',
  title:   "'Clash Display','Syne','Inter',system-ui,sans-serif",
  body:    "'Inter',system-ui,sans-serif",
  maxW:    1320,               // largeur de contenu (le hero va plus large à 1920)
}

// Dégradé or réutilisable pour les accents de titre.
export const GOLD_GRAD = `linear-gradient(92deg, ${CINE.goldHi}, ${CINE.gold})`

// Keyframes injectés une seule fois (id garde l'idempotence si plusieurs blocs montent).
export function CineStyles() {
  return (
    <style id="cine-kf">{`
      @keyframes cineRise { from{opacity:0;transform:translateY(26px)} to{opacity:1;transform:translateY(0)} }
      @keyframes cinePulse{ 0%,100%{opacity:.55} 50%{opacity:1} }
      @keyframes cineSheen{ 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      .cine-reveal{opacity:0}
      .cine-reveal.cine-in{animation:cineRise .7s cubic-bezier(.22,1,.36,1) both}
      @media (prefers-reduced-motion:reduce){ .cine-reveal,.cine-reveal.cine-in{opacity:1!important;animation:none!important} }
    `}</style>
  )
}

// Hook : révèle au scroll (IntersectionObserver), une seule fois.
export function useReveal(opts = {}) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (!('IntersectionObserver' in window)) { setSeen(true); return }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } })
    }, { threshold: opts.threshold ?? 0.18, rootMargin: opts.rootMargin ?? '0px 0px -8% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [seen, opts.threshold, opts.rootMargin])
  return [ref, seen]
}

// Bloc qui apparaît au scroll. `delay` en ms pour décaler en cascade.
export function Reveal({ children, delay = 0, style, as: Tag = 'div', ...rest }) {
  const [ref, seen] = useReveal()
  return (
    <Tag ref={ref} className={`cine-reveal${seen ? ' cine-in' : ''}`}
      style={{ animationDelay: seen ? `${delay}ms` : undefined, ...style }} {...rest}>
      {children}
    </Tag>
  )
}

// Section pleine largeur, rythme vertical cinématique constant. `bleed` = fond pleine
// largeur (le contenu reste centré à maxW). Pas de fond par défaut → laisse passer l'AMV.
export function CineSection({ id, children, pad = 'clamp(72px, 10vh, 132px)', bleed, max = CINE.maxW, style }) {
  return (
    <section id={id} style={{ position: 'relative', width: '100%', paddingTop: pad, paddingBottom: pad, ...(bleed || {}) }}>
      <div style={{ width: '100%', maxWidth: max, margin: '0 auto', padding: '0 clamp(20px, 5vw, 72px)', position: 'relative', zIndex: 1, ...style }}>
        {children}
      </div>
    </section>
  )
}

// En-tête de section : eyebrow doré + grand titre + sous-titre. alignement configurable.
export function SectionHead({ eyebrow, title, accent, lead, align = 'left', max = 680 }) {
  return (
    <div style={{ maxWidth: align === 'center' ? max : 'none', margin: align === 'center' ? '0 auto' : 0, textAlign: align }}>
      {eyebrow && (
        <Reveal as="span" style={{
          display: 'inline-block', fontFamily: CINE.title, fontSize: 12, fontWeight: 700,
          letterSpacing: '0.22em', textTransform: 'uppercase', color: CINE.gold, marginBottom: 16,
        }}>{eyebrow}</Reveal>
      )}
      <Reveal as="h2" delay={60} style={{
        margin: 0, fontFamily: CINE.title, fontWeight: 700, color: CINE.ink,
        fontSize: 'clamp(30px, 4.6vw, 60px)', lineHeight: 1.02, letterSpacing: '-0.025em',
      }}>
        {title}{accent && <> <span style={{
          background: GOLD_GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>{accent}</span></>}
      </Reveal>
      {lead && (
        <Reveal as="p" delay={120} style={{
          margin: align === 'center' ? '18px auto 0' : '18px 0 0', maxWidth: 620,
          fontFamily: CINE.body, fontSize: 'clamp(15px, 1.5vw, 18px)', lineHeight: 1.6, color: CINE.inkSoft,
        }}>{lead}</Reveal>
      )}
    </div>
  )
}

// Carte glass sobre : filet fin, lift discret au hover, AUCUN glow agressif.
export function CineCard({ children, style, hoverable = true, pad = 22, onClick }) {
  const [h, setH] = useState(false)
  return (
    <div onClick={onClick}
      onMouseEnter={() => hoverable && setH(true)} onMouseLeave={() => setH(false)}
      style={{
        position: 'relative', borderRadius: 18, padding: pad,
        background: h ? CINE.panel2 : CINE.panel,
        border: `1px solid ${h ? CINE.hairTop : CINE.hair}`,
        boxShadow: h ? '0 18px 50px rgba(0,0,0,0.45)' : '0 6px 24px rgba(0,0,0,0.25)',
        transform: h ? 'translateY(-4px)' : 'none',
        transition: 'transform .35s cubic-bezier(.22,1,.36,1), background .3s, border-color .3s, box-shadow .35s',
        cursor: onClick ? 'pointer' : 'default', ...style,
      }}>
      {children}
    </div>
  )
}

// Bouton or (CTA principal) — plein, sobre.
export function GoldButton({ children, as: Tag = 'a', style, ...rest }) {
  const [h, setH] = useState(false)
  return (
    <Tag onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none',
        padding: '14px 28px', borderRadius: 12, fontFamily: CINE.title, fontWeight: 600, fontSize: 15,
        color: '#0b0a06', background: GOLD_GRAD, border: 'none', cursor: 'pointer',
        boxShadow: h ? '0 14px 34px rgba(191,164,106,0.32)' : '0 8px 22px rgba(191,164,106,0.2)',
        transform: h ? 'translateY(-2px)' : 'none', transition: 'transform .25s, box-shadow .25s', ...style,
      }} {...rest}>{children}</Tag>
  )
}

// Bouton fantôme (secondaire), filet or.
export function GhostButton({ children, as: Tag = 'a', style, ...rest }) {
  const [h, setH] = useState(false)
  return (
    <Tag onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none',
        padding: '14px 28px', borderRadius: 12, fontFamily: CINE.title, fontWeight: 600, fontSize: 15,
        color: CINE.ink, background: h ? CINE.panel2 : 'transparent',
        border: `1px solid ${h ? CINE.gold : CINE.hairTop}`, cursor: 'pointer',
        transform: h ? 'translateY(-2px)' : 'none', transition: 'transform .25s, border-color .25s, background .25s', ...style,
      }} {...rest}>{children}</Tag>
  )
}

// Filet de séparation cinématique entre deux blocs (dégradé or qui s'estompe).
export function CineRule({ style }) {
  return <div aria-hidden style={{
    width: '100%', maxWidth: CINE.maxW, margin: '0 auto', height: 1,
    background: `linear-gradient(90deg, transparent, ${CINE.goldDim}, transparent)`, opacity: 0.5, ...style,
  }} />
}
