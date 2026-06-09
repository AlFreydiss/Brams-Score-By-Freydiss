// SpotlightCard — lueur premium qui suit le curseur (adapté de la GlowCard 21st.dev
// en INLINE STYLES, car Tailwind n'est pas global ici). Un seul listener global
// pose --x/--y sur <html> ; chaque carte lit ces vars via background-attachment:fixed,
// donc la lumière traverse toute la grille en suivant la souris.
import { useEffect } from 'react'

let _bound = false
function bindGlobalPointer() {
  if (_bound || typeof window === 'undefined') return
  _bound = true
  const root = document.documentElement
  window.addEventListener('pointermove', (e) => {
    root.style.setProperty('--spot-x', e.clientX.toFixed(1))
    root.style.setProperty('--spot-y', e.clientY.toFixed(1))
  }, { passive: true })
}

// hue : teinte de base de la lueur (gold ≈ 42, violet ≈ 280, rouge ≈ 0…).
export default function SpotlightCard({ children, hue = 42, size = 260, radius = 16, className, style }) {
  useEffect(() => { bindGlobalPointer() }, [])
  const glow = `radial-gradient(${size}px ${size}px at calc(var(--spot-x,0) * 1px) calc(var(--spot-y,0) * 1px), hsl(${hue} 90% 62% / 0.16), transparent 60%)`
  const border = `radial-gradient(${size}px ${size}px at calc(var(--spot-x,0) * 1px) calc(var(--spot-y,0) * 1px), hsl(${hue} 95% 65% / 0.9), transparent 60%)`
  return (
    <div className={className} style={{ position: 'relative', borderRadius: radius, ...style }}>
      {/* Bordure lumineuse qui suit le curseur (technique mask border-box) */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, borderRadius: radius, padding: 1.5, pointerEvents: 'none', zIndex: 2,
        background: border, backgroundAttachment: 'fixed',
        WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude',
      }} />
      {/* Halo intérieur diffus */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, borderRadius: radius, pointerEvents: 'none', zIndex: 1,
        background: glow, backgroundAttachment: 'fixed', mixBlendMode: 'screen',
      }} />
      <div style={{ position: 'relative', zIndex: 3, height: '100%' }}>{children}</div>
    </div>
  )
}
