import { useState, useEffect, useRef } from 'react'
import UnifiedSidebar from './UnifiedSidebar.jsx'
import { useMobile, useNarrow } from '../hooks/useMediaQuery.js'
import { fetchStats } from '../lib/supabase.js'

const STARS = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  x: (i * 37.3 + 13) % 100,
  y: (i * 53.7 + 7) % 100,
  size: (i % 3) + 1,
  delay: (i * 0.38) % 4,
  dur: ((i * 0.72) % 2.5) + 2.5,
  opacity: ((i * 0.13) % 0.45) + 0.2,
}))

function StarField() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {STARS.map(s => (
        <div key={s.id} style={{
          position: 'absolute',
          left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size,
          borderRadius: '50%',
          background: `rgba(255,255,255,${s.opacity})`,
          animation: `starTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

function StatBlock({ value, label, icon, live = false, liveVal = null, sub = null }) {
  const ref = useRef(null)
  const [active, setActive] = useState(false)
  const [display, setDisplay] = useState('0')
  const [hov, setHov] = useState(false)
  const isStatic = value.includes('/') || value.includes('+') || !/\d/.test(value)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setActive(true); obs.disconnect() } },
      { threshold: 0.4 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!active) return
    if (isStatic) { setDisplay(value); return }
    const num = parseInt(value.replace(/\D/g, ''))
    const suffix = value.replace(/[\d]/g, '')
    const duration = 1600
    let startTs = null
    const tick = (ts) => {
      if (!startTs) startTs = ts
      const p = Math.min((ts - startTs) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      const cur = Math.floor(eased * num)
      const fmt = cur >= 1000
        ? Math.floor(cur / 1000) + ' ' + String(cur % 1000).padStart(3, '0')
        : String(cur)
      setDisplay(fmt + suffix)
      if (p < 1) requestAnimationFrame(tick)
      else setDisplay(value)
    }
    requestAnimationFrame(tick)
  }, [active, value, isStatic])

  const shown = live && liveVal != null ? liveVal : (active ? display : value)

  return (
    <div
      ref={ref}
      className="premium-stat"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'rgba(212,160,23,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hov ? 'rgba(212,160,23,0.32)' : 'rgba(255,255,255,0.09)'}`,
        borderRadius: 16,
      padding: '15px 16px 13px',
        transition: 'all .25s cubic-bezier(.22,1,.36,1)',
        transform: hov ? 'translateY(-4px)' : 'none',
        boxShadow: hov ? '0 14px 36px rgba(212,160,23,0.14)' : '0 2px 10px rgba(0,0,0,0.18)',
        cursor: 'default',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ height: 64, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
        {icon && <div style={{ fontSize: 16, opacity: 0.9, marginBottom: 5 }}>{icon}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {live && (
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2ECC71', boxShadow: '0 0 8px #2ECC71', animation: 'pulse 2s infinite', flexShrink: 0 }} />
          )}
          <div className="premium-stat-value">{shown}</div>
        </div>
      </div>
      <div style={{
        height: 2, width: '100%',
        background: 'linear-gradient(90deg, #d4a017, #e8b84a)',
        borderRadius: 2,
        margin: '8px 0 10px',
        transform: active ? 'scaleX(1)' : 'scaleX(0)',
        transformOrigin: 'left',
        transition: 'transform 0.9s 0.3s cubic-bezier(0.22,1,0.36,1)',
      }} />
      <div className="premium-stat-label">{label}</div>
      {sub && <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,.28)', marginTop: 2, letterSpacing: '.03em', lineHeight: 1.3 }}>{sub}</div>}
    </div>
  )
}

function HeroFeatureCard({ icon, title, desc, accent = 'rgba(212,160,23' }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: '1 1 130px',
        background: hov
          ? `linear-gradient(135deg, ${accent},.09) 0%, ${accent},.04) 100%)`
          : 'linear-gradient(135deg, rgba(255,255,255,.038) 0%, rgba(255,255,255,.016) 100%)',
        border: `1px solid ${hov ? `${accent},.32)` : 'rgba(255,255,255,.08)'}`,
        borderTop: `1px solid ${hov ? `${accent},.22)` : 'rgba(255,255,255,.12)'}`,
        borderRadius: 14, padding: '16px 16px 14px',
        transition: 'all .28s cubic-bezier(.22,1,.36,1)',
        transform: hov ? 'translateY(-4px)' : 'none',
        cursor: 'default',
        backdropFilter: 'blur(14px) saturate(1.2)',
        display: 'flex', flexDirection: 'column', gap: 8,
        boxShadow: hov ? `0 12px 32px ${accent},.14), inset 0 1px 0 rgba(255,255,255,.08)` : 'inset 0 1px 0 rgba(255,255,255,.06)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {hov && <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, ${accent},.50), ${accent},.20) 60%, transparent)`,
      }} />}
      <span style={{ fontSize: 22, lineHeight: 1, filter: hov ? 'drop-shadow(0 2px 8px rgba(0,0,0,.5))' : 'none', transition: 'filter .28s' }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 780, color: hov ? '#fff' : 'rgba(255,255,255,.88)', marginBottom: 4, transition: 'color .2s' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.52)', lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  )
}

export default function Hero() {
  const isMobile = useMobile()
  const isNarrow = useNarrow()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchStats().then(s => { if (s) setStats(s) })
    const id = setInterval(() => {
      fetchStats().then(s => { if (s) setStats(s) })
    }, 60000)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="hero-premium" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      position: 'relative', overflow: 'visible',
      paddingTop: isMobile ? 92 : 110, paddingBottom: isMobile ? 64 : 80,
    }}>
      {/* Overlay directionnel principal */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'transparent',
      }} />
      {/* Overlay sombre uniforme */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'transparent',
      }} />
      {/* Glow radial doré derrière le titre */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'transparent',
      }} />
      {/* Glow violet principal derrière le dashboard */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'transparent',
      }} />
      {/* Glow rouge chaud — coin bas droit */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'transparent',
      }} />
      {/* Halo violet vif haut dashboard */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'transparent',
      }} />
      {/* Aura dorée douce côté dashboard */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'transparent',
      }} />
      {/* Vignette top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '28%', zIndex: 0, pointerEvents: 'none',
        background: 'transparent',
      }} />
      {/* Vignette bottom — fade cinématique étendu vers la section suivante */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '38%', zIndex: 0, pointerEvents: 'none',
        background: 'transparent',
      }} />

      <StarField />

      {/* ── Atmospheric layers (CSS classes defined in index.css) ── */}
      <div className="hero-atmosphere">
        <div className="hero-depth-wash" />
        <div className="hero-rain" />
        <div className="hero-mist" />
        <div className="hero-mist hero-mist-b" />
        <div className="hero-haki" />
        <div className="hero-haki-line" />
        <div className="hero-haki-line hero-haki-line-b" />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 1560, margin: '0 auto', padding: isMobile ? '0 20px' : '0 clamp(32px, 4vw, 72px)' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isNarrow ? '1fr' : '1fr minmax(340px, 420px)',
          alignItems: 'start',
          gap: isNarrow ? 40 : 'clamp(64px, 7vw, 140px)',
        }}>

          {/* ── Left column ── */}
          <div>
            {/* Live badge */}
            <div className="fade-up" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.22)',
              borderRadius: 100, padding: '6px 16px', marginBottom: 28,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2ECC71', boxShadow: '0 0 10px #2ECC71', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase' }}>
                {stats ? `${stats.membersTracked}+ nakamas · ` : ''}Actif maintenant
              </span>
            </div>

            {/* Titre */}
            <h1 className="hero-title-premium fade-up">
              <span className="hero-brams">Brams</span>
              <span className="hero-community hero-community-glow">Community</span>
            </h1>

            {/* Subtitle */}
            <p className="fade-up" style={{
              fontSize: 'clamp(15px,1.7vw,20px)',
              color: 'rgba(255,255,255,.90)', fontWeight: 640,
              letterSpacing: '.005em', marginBottom: 16, maxWidth: 520, lineHeight: 1.4,
            }}>
              Ton équipage, tes rangs, tes théories, tes moments.
            </p>

            {/* Description */}
            <p className="fade-up-2" style={{
              fontSize: 'clamp(13px,1.25vw,15px)',
              color: 'rgba(255,255,255,.56)', fontWeight: 440,
              lineHeight: 1.78, marginBottom: 36, maxWidth: 480,
            }}>
              Une communauté anime connectée à Discord, avec classements, équipages, blind tests, wiki, événements et récompenses en berries.
            </p>

            {/* CTA */}
            <div className="fade-up-3" style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 11, alignItems: 'center' }}>
              <a
                href="https://discord.gg/v3Ddhtbz"
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                data-premium-cta="primary"
                style={{
                  fontSize: 15, padding: '15px 30px',
                  background: 'linear-gradient(135deg, #C8940F 0%, #E8B84A 50%, #C8940F 100%)',
                  backgroundSize: '200% auto',
                  color: '#12090a', fontWeight: 700,
                  boxShadow: '0 8px 34px rgba(212,160,23,0.42)',
                  border: 'none', textDecoration: 'none',
                  transition: 'box-shadow .28s, transform .28s, background-position .4s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundPosition = 'right center'; e.currentTarget.style.boxShadow = '0 10px 40px rgba(212,160,23,0.60)'; e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundPosition = 'left center'; e.currentTarget.style.boxShadow = '0 4px 28px rgba(212,160,23,0.40)'; e.currentTarget.style.transform = 'none' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>
                Rejoindre l'équipage
              </a>
              <a
                href="#rangs"
                className="btn"
                data-premium-cta="ghost"
                style={{
                  fontSize: 15, padding: '15px 26px',
                  background: 'rgba(255,255,255,0.035)',
                  border: '1px solid rgba(255,211,145,0.36)',
                  color: 'rgba(255,225,171,.92)', textDecoration: 'none',
                  transition: 'background .22s, border-color .22s, transform .22s, box-shadow .22s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,211,145,0.62)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(212,160,23,0.18)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.035)'; e.currentTarget.style.borderColor = 'rgba(255,211,145,0.36)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
              >
                ⚔️ Explorer les rangs
              </a>
              </div>
              <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,.42)', fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', margin: 0 }}>
                Gratuit • Discord connecté • Progression en berries • Events communautaires
              </p>
            </div>

            {/* Séparateur gradient */}
            <div style={{
              height: 1,
              background: 'linear-gradient(90deg, rgba(212,160,23,0.28) 0%, rgba(255,255,255,0.07) 50%, transparent 100%)',
              marginBottom: 24,
            }} />

            {/* Stats */}
            <div className="fade-up-3" style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
              gap: 12,
            }}>
              <StatBlock value="2 000+" label="Nakamas" icon="🏴‍☠️" sub="Membres actifs" />
              <StatBlock value="24/7" label="Bot actif" icon="🤖" sub="Toujours disponible" />
              <StatBlock
                value={stats ? `${stats.membersTracked}` : '200+'}
                label="Classés"
                icon="📊"
                sub="Au leaderboard"
                live={!!stats}
                liveVal={stats ? `${stats.membersTracked}` : null}
              />
              <StatBlock
                value={stats?.activeVocal > 0 ? `${stats.activeVocal}` : '64'}
                label="Vocal / sem."
                icon="🎙️"
                sub="Sessions actives"
                live={!!(stats?.activeVocal > 0)}
                liveVal={stats?.activeVocal > 0 ? `${stats.activeVocal}` : null}
              />
            </div>

              {/* Modules */}
              <div className="fade-up-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginTop: 22 }}>
                <HeroFeatureCard icon="⚓" title="Équipages" desc="Rejoins un crew, progresse avec tes nakamas." accent="rgba(212,160,23" />
                <HeroFeatureCard icon="📊" title="Classements" desc="Monte dans les rangs et marque ton nom." accent="rgba(88,101,242" />
                <HeroFeatureCard icon="🎵" title="Blind Test" desc="Teste ta mémoire sur les openings anime." accent="rgba(52,211,153" />
                <HeroFeatureCard icon="📖" title="Wiki & Théories" desc="Partage tes idées, débats et analyses." accent="rgba(224,82,74" />
                <HeroFeatureCard icon="🛒" title="Boutique" desc="Utilise tes berries pour débloquer des récompenses." accent="rgba(168,85,247" />
                <HeroFeatureCard icon="🎉" title="Événements" desc="Participe aux soirées, tournois et défis." accent="rgba(234,179,8" />
              </div>
          </div>

          {/* ── Right column — UnifiedSidebar ── */}
          <div style={isNarrow ? {
            marginTop: isMobile ? 48 : 40,
            maxWidth: 480,
          } : {
            position: 'sticky',
            top: 112,
            marginTop: 'clamp(0px, 2vw, 32px)',
          }}>
            {/* Aura derrière le sidebar */}
            {!isNarrow && <>
              <div style={{
                position: 'absolute', inset: '-40px -10px', zIndex: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 90% 80% at 50% 50%, rgba(88,101,242,0.12) 0%, rgba(88,101,242,0.04) 55%, transparent 80%)',
                filter: 'blur(30px)',
              }} />
              <div style={{
                position: 'absolute', bottom: '-20px', left: '10%', right: '10%', height: '40px', zIndex: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 80% 100% at 50% 100%, rgba(88,101,242,0.18) 0%, transparent 100%)',
                filter: 'blur(20px)',
              }} />
            </>}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <UnifiedSidebar />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
