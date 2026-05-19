import { useState, useEffect, useRef, useCallback } from 'react'
import UnifiedSidebar from './UnifiedSidebar.jsx'
import { useMobile, useNarrow } from '../hooks/useMediaQuery.js'
import { fetchStats } from '../lib/supabase.js'

const QUOTES = [
  { text: "Je vais devenir le Roi des Pirates !", author: "Monkey D. Luffy", color: '#E0524A' },
  { text: "Un homme qui abandonne quelque chose ne mérite pas de le retrouver.", author: "Roronoa Zoro", color: '#2ECC71' },
  { text: "La force n'est pas la seule chose qui compte dans ce monde.", author: "Shanks", color: '#FFD700' },
  { text: "Les rêves ne meurent jamais tant qu'il reste quelqu'un pour les porter.", author: "Monkey D. Luffy", color: '#E0524A' },
  { text: "Je ne regrette rien.", author: "Portgas D. Ace", color: '#F97316' },
  { text: "Ce n'est pas le monde qui est cruel. C'est toi qui es trop faible.", author: "Donquixote Doflamingo", color: '#9B59B6' },
  { text: "Nul ne peut changer le passé. Mais n'importe qui peut changer l'avenir.", author: "Nico Robin", color: '#3B82F6' },
  { text: "Même affaibli, un lion reste un lion.", author: "Rayleigh", color: '#F1C40F' },
  { text: "Je vis selon mes propres règles. C'est ça la vraie liberté.", author: "Eustass Kid", color: '#E0524A' },
]

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

function StatBlock({ value, label, icon, live = false, liveVal = null }) {
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
        padding: '18px 20px 14px',
        transition: 'all .25s cubic-bezier(.22,1,.36,1)',
        transform: hov ? 'translateY(-4px)' : 'none',
        boxShadow: hov ? '0 14px 36px rgba(212,160,23,0.14)' : '0 2px 10px rgba(0,0,0,0.18)',
        cursor: 'default',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ height: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
        {icon && <div style={{ fontSize: 18, opacity: 0.85, marginBottom: 6 }}>{icon}</div>}
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
    </div>
  )
}

function QuoteRotator() {
  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(true)
  const timerRef = useRef(null)

  const goTo = useCallback((nextIdx) => {
    setFade(false)
    setTimeout(() => { setIdx(nextIdx); setFade(true) }, 400)
  }, [])

  const next = useCallback(() => {
    clearInterval(timerRef.current)
    goTo((idx + 1) % QUOTES.length)
    timerRef.current = setInterval(() => {
      setIdx(i => { const n = (i + 1) % QUOTES.length; goTo(n); return i })
    }, 12000)
  }, [idx, goTo])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setFade(false)
      setTimeout(() => { setIdx(i => (i + 1) % QUOTES.length); setFade(true) }, 400)
    }, 12000)
    return () => clearInterval(timerRef.current)
  }, [])

  const q = QUOTES[idx]
  return (
    <div style={{ marginBottom: 36, maxWidth: 480 }}>
      <div style={{
        opacity: fade ? 1 : 0,
        transition: 'opacity 0.4s ease',
        background: 'rgba(255,255,255,.035)',
        border: `1px solid rgba(255,255,255,.07)`,
        borderLeft: `3px solid ${q.color}`,
        borderRadius: '0 12px 12px 0',
        padding: '14px 18px',
        marginBottom: 12,
        backdropFilter: 'blur(8px)',
      }}>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,.80)', lineHeight: 1.75, fontStyle: 'italic', margin: '0 0 8px' }}>
          « {q.text} »
        </p>
        <span style={{ fontSize: 10, color: q.color, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
          — {q.author}
        </span>
      </div>
      <button
        onClick={next}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.10)',
          borderRadius: 20, padding: '5px 14px', fontSize: 10.5, fontWeight: 600,
          color: 'rgba(255,255,255,.45)', cursor: 'pointer', letterSpacing: '.04em',
          transition: 'all .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.1)'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.color = 'rgba(255,255,255,.45)' }}
      >
        ↻ Autre citation
      </button>
    </div>
  )
}

function HeroFeatureCard({ icon, title, desc }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: '1 1 130px',
        background: hov ? 'rgba(212,160,23,.07)' : 'rgba(255,255,255,.025)',
        border: `1px solid ${hov ? 'rgba(212,160,23,.24)' : 'rgba(255,255,255,.07)'}`,
        borderRadius: 14, padding: '14px 16px',
        transition: 'all .25s cubic-bezier(.22,1,.36,1)',
        transform: hov ? 'translateY(-3px)' : 'none',
        cursor: 'default', backdropFilter: 'blur(10px)',
        display: 'flex', flexDirection: 'column', gap: 6,
        boxShadow: hov ? '0 8px 24px rgba(212,160,23,.10)' : 'none',
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,.88)', marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.34)', lineHeight: 1.4 }}>{desc}</div>
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
      position: 'relative', overflow: 'hidden',
      paddingTop: isMobile ? 80 : 110, paddingBottom: 80,
    }}>
      {/* Overlay directionnel principal */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'linear-gradient(90deg, rgba(3,7,14,0.97) 0%, rgba(3,7,14,0.90) 35%, rgba(3,7,14,0.58) 58%, rgba(3,7,14,0.14) 100%)',
      }} />
      {/* Overlay sombre uniforme */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'rgba(3,7,14,0.22)',
      }} />
      {/* Glow radial doré derrière le titre */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 62% 55% at 27% 50%, rgba(212,160,23,0.18) 0%, transparent 65%)',
      }} />
      {/* Glow radial derrière le dashboard */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 45% 50% at 78% 50%, rgba(88,101,242,0.07) 0%, transparent 65%)',
      }} />
      {/* Vignette top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '28%', zIndex: 0, pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(3,7,14,0.40) 0%, transparent 100%)',
      }} />
      {/* Vignette bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '22%', zIndex: 0, pointerEvents: 'none',
        background: 'linear-gradient(0deg, rgba(3,7,14,0.92) 0%, rgba(3,7,14,0.30) 55%, transparent 100%)',
      }} />

      <StarField />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 1320, margin: '0 auto', padding: isMobile ? '0 20px' : '0 48px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isNarrow ? '1fr' : 'minmax(0,1fr) clamp(390px, 34vw, 470px)',
          alignItems: 'center',
          gap: isNarrow ? 40 : 56,
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
              <span className="hero-community">Community</span>
            </h1>

            {/* Subtitle */}
            <p className="fade-up" style={{
              fontSize: 'clamp(14px,1.6vw,17px)',
              color: 'rgba(255,255,255,.75)', fontWeight: 500,
              letterSpacing: '.01em', marginBottom: 10, maxWidth: 480, lineHeight: 1.5,
            }}>
              La plus grande communauté One Piece francophone 🏴‍☠️
            </p>

            {/* Description */}
            <p className="fade-up-2" style={{
              fontSize: 'clamp(12px,1.2vw,14px)',
              color: 'rgba(255,255,255,.40)', fontWeight: 400,
              lineHeight: 1.7, marginBottom: 32, maxWidth: 440,
            }}>
              Rangs, équipages, quiz, classements, théories, événements et aventures communautaires réunis au même endroit.
            </p>

            <div className="fade-up-2"><QuoteRotator /></div>

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
                  fontSize: 15, padding: '14px 28px',
                  background: 'linear-gradient(135deg, #C8940F 0%, #E8B84A 50%, #C8940F 100%)',
                  backgroundSize: '200% auto',
                  color: '#12090a', fontWeight: 700,
                  boxShadow: '0 4px 28px rgba(212,160,23,0.40)',
                  border: 'none', textDecoration: 'none',
                  transition: 'box-shadow .28s, transform .28s, background-position .4s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundPosition = 'right center'; e.currentTarget.style.boxShadow = '0 10px 40px rgba(212,160,23,0.60)'; e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundPosition = 'left center'; e.currentTarget.style.boxShadow = '0 4px 28px rgba(212,160,23,0.40)'; e.currentTarget.style.transform = 'none' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>
                Rejoindre le Discord
              </a>
              <a
                href="#rangs"
                className="btn"
                data-premium-cta="ghost"
                style={{
                  fontSize: 15, padding: '14px 28px',
                  background: 'transparent',
                  border: '1px solid rgba(212,160,23,0.50)',
                  color: '#D4A017', textDecoration: 'none',
                  transition: 'background .22s, border-color .22s, transform .22s, box-shadow .22s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,0.12)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,0.80)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(212,160,23,0.18)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(212,160,23,0.50)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
              >
                ⚔️ Voir les rangs
              </a>
              </div>
              <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,.26)', fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', margin: 0 }}>
                Gratuit · Actif 24/7 · Classements, équipages, events
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
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: 12,
            }}>
              <StatBlock value="2 000+" label="Nakamas" icon="🏴‍☠️" />
              <StatBlock value="24/7" label="Bot actif" icon="🤖" />
              <StatBlock
                value={stats ? `${stats.membersTracked}` : '100+'}
                label="Classés"
                icon="📊"
                live={!!stats}
                liveVal={stats ? `${stats.membersTracked}` : null}
              />
              <StatBlock
                value={stats?.activeVocal > 0 ? `${stats.activeVocal}` : '—'}
                label="Vocal / sem."
                icon="🎙️"
                live={!!(stats?.activeVocal > 0)}
                liveVal={stats?.activeVocal > 0 ? `${stats.activeVocal}` : null}
              />
            </div>

              {/* Features */}
              <div className="fade-up-3" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
                <HeroFeatureCard icon="⚓" title="Équipages" desc="Rejoins ton équipage de nakamas" />
                <HeroFeatureCard icon="📊" title="Classements" desc="Grimpe le leaderboard vocal" />
                <HeroFeatureCard icon="🎉" title="Événements" desc="Ne rate aucun event du serveur" />
              </div>
          </div>

          {/* ── Right column — UnifiedSidebar ── */}
          {!isNarrow && (
            <div style={{ position: 'sticky', top: 90 }}>
              <UnifiedSidebar />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
