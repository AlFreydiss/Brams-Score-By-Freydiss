// ── Brams Score · IA : score de prestige global (ex-"Aura"), look futuriste sobre.
// Restyle inline (zéro CSS externe) — même score (computeAura), nouveau design.
import { CountUp } from './shared.jsx'

const GOLD = '#d4a017'
const GOLD_LT = '#f5cf6b'

export default function ProfileAura({ data }) {
  const { aura, auraTier, auraFactors, rank } = data
  const factors = [
    { label: 'Vocal',      value: auraFactors.vocal,   max: 30, color: GOLD_LT },
    { label: 'Berries',    value: auraFactors.berries, max: 25, color: GOLD },
    { label: 'Classement', value: auraFactors.rankF,   max: 30, color: rank.color },
  ]
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 18, padding: '18px 18px 16px',
      background: 'linear-gradient(160deg, rgba(28,23,12,.92), rgba(13,11,8,.96))',
      border: `1px solid ${GOLD}33`,
      boxShadow: '0 18px 50px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.04)',
    }}>
      {/* halo IA discret en haut à droite */}
      <div aria-hidden style={{
        position: 'absolute', top: -42, right: -34, width: 170, height: 170, borderRadius: '50%',
        background: `radial-gradient(circle, ${GOLD}26, transparent 70%)`, pointerEvents: 'none',
      }} />

      {/* en-tête : label IA + palier */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', color: GOLD_LT }}>
          <span style={{ fontSize: 12 }}>✦</span> Brams Score · IA
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 9px', borderRadius: 999, color: auraTier.color, background: `${auraTier.color}1a`, border: `1px solid ${auraTier.color}3a` }}>
          {auraTier.label}
        </span>
      </div>

      {/* score géant */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 14 }}>
        <span style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, color: '#fff', textShadow: `0 0 24px ${GOLD}55` }}><CountUp value={aura} /></span>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,.35)' }}>/100</span>
      </div>

      {/* barre globale */}
      <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,.06)', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ height: '100%', width: `${aura}%`, borderRadius: 999, background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LT})`, boxShadow: `0 0 12px ${GOLD}88`, transition: 'width .6s cubic-bezier(.22,1,.36,1)' }} />
      </div>

      {/* facteurs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {factors.map(f => (
          <div key={f.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.5)', marginBottom: 4 }}>
              <span>{f.label}</span>
              <span style={{ color: 'rgba(255,255,255,.32)' }}>{f.value}/{f.max}</span>
            </div>
            <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (f.value / f.max) * 100)}%`, borderRadius: 999, background: f.color, transition: 'width .6s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
