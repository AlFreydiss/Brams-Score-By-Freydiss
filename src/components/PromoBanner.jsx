// Bannière promo boutique : "1 acheté = 1 offert" (la promo BOGO du panier) avec
// décompte live jusqu'à la fin de l'offre. Se masque automatiquement à l'expiration.
import { useState, useEffect } from 'react'

// Fin de l'offre : 6 jours (modifiable). Date fixe → le décompte est cohérent
// d'un chargement à l'autre (pas "6j à chaque visite").
const PROMO_END = new Date('2026-06-15T23:59:59').getTime()
const GOLD = '#f5b50a'

function parts(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return { j: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

export default function PromoBanner() {
  const [left, setLeft] = useState(() => PROMO_END - Date.now())
  useEffect(() => {
    const t = setInterval(() => setLeft(PROMO_END - Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (left <= 0) return null
  const { j, h, m, s } = parts(left)
  const Chip = ({ v, l }) => (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', minWidth: 38, padding: '5px 8px', borderRadius: 9, background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(0,0,0,0.18)' }}>
      <strong style={{ fontSize: 18, fontWeight: 900, color: '#1a1206', fontFamily: "'Cinzel', serif", lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{String(v).padStart(2, '0')}</strong>
      <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(26,18,6,0.65)' }}>{l}</span>
    </span>
  )
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 16, margin: '6px 0 22px', padding: '16px 22px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      background: 'linear-gradient(100deg, #f6d98a, #f5b50a 45%, #e8a317)',
      boxShadow: '0 14px 44px rgba(245,181,10,0.28), inset 0 1px 0 rgba(255,255,255,0.4)',
    }}>
      <style>{`@keyframes promo-shine{0%{transform:translateX(-120%)}60%,100%{transform:translateX(220%)}} @keyframes promo-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}`}</style>
      {/* éclat qui balaie */}
      <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, width: '40%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)', animation: 'promo-shine 4.5s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <span style={{ fontSize: 34, animation: 'promo-pulse 1.6s ease-in-out infinite' }}>🎁</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Pirata One', serif", fontSize: 'clamp(22px,3vw,30px)', color: '#1a1206', lineHeight: 1, letterSpacing: '.01em' }}>1 acheté = 1 offert</div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: 'rgba(26,18,6,0.78)', fontFamily: "'Cinzel', serif", marginTop: 3 }}>Sur tout le panier — curseurs, traînées & fonds 🏴‍☠️</div>
        </div>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(26,18,6,0.7)', marginRight: 4 }}>Fin dans</span>
        <Chip v={j} l="jours" /><Chip v={h} l="h" /><Chip v={m} l="min" /><Chip v={s} l="sec" />
      </div>
    </div>
  )
}
