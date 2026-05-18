import { useState, useEffect, useRef, useCallback } from 'react'
import Particles from './Particles.jsx'
import UnifiedSidebar from './UnifiedSidebar.jsx'
import ChromaKeyHeroVideo from './ChromaKeyHeroVideo.jsx'
import { useMobile } from '../hooks/useMediaQuery.js'
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

function StatBlock({ value, label, live = false, liveVal = null }) {
  const ref = useRef(null)
  const [active, setActive] = useState(false)
  const [display, setDisplay] = useState('0')
  const isStatic = value.includes('/') || value.includes('+')

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
    <div ref={ref} style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {live && (
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2ECC71', boxShadow: '0 0 8px #2ECC71', animation: 'pulse 2s infinite', flexShrink: 0 }} />
          )}
          <div style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '.02em' }}>
            {shown}
          </div>
        </div>
        <div style={{
          position: 'absolute', bottom: -5, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, var(--accent), #ff8a80)',
          borderRadius: 2,
          transform: active ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'left',
          transition: 'transform 0.9s 0.3s cubic-bezier(0.22,1,0.36,1)',
        }} />
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 10, textTransform: 'uppercase', letterSpacing: '.12em' }}>{label}</div>
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
    <div style={{ marginBottom: 36, maxWidth: 500 }}>
      <div style={{
        opacity: fade ? 1 : 0, transition: 'opacity 0.4s ease',
        borderLeft: `2px solid ${q.color}80`, paddingLeft: 16, marginBottom: 12,
      }}>
        <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,.75)', lineHeight: 1.75, fontStyle: 'italic', marginBottom: 5 }}>
          « {q.text} »
        </p>
        <span style={{ fontSize: 11, color: q.color, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>
          — {q.author}
        </span>
      </div>
      <button
        onClick={next}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.10)',
          borderRadius: 20, padding: '5px 14px', fontSize: 11, fontWeight: 600,
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

function LiveBadge({ count, label, icon }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
      borderRadius: 10, padding: '8px 14px',
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{count}</div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, letterSpacing: '.06em' }}>{label}</div>
      </div>
    </div>
  )
}

export default function Hero() {
  const isMobile = useMobile()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchStats().then(s => { if (s) setStats(s) })
    const id = setInterval(() => {
      fetchStats().then(s => { if (s) setStats(s) })
    }, 60000)
    return () => clearInterval(id)
  }, [])

  return (
    <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden', paddingTop: 140, paddingBottom: 80 }}>
      {/* Gradient directionnel — texte lisible à gauche, personnage visible à droite */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'linear-gradient(90deg, rgba(10,12,20,0.88) 0%, rgba(10,12,20,0.68) 40%, rgba(10,12,20,0.28) 80%, rgba(10,12,20,0.10) 100%)',
      }} />
      <div className="orb" style={{ width: 700, height: 700, top: '0%', left: '25%', background: 'rgba(224,82,74,.07)' }} />
      <div className="orb" style={{ width: 500, height: 500, bottom: '-10%', right: '-10%', background: 'rgba(155,89,182,.07)', animationDelay: '3s' }} />
      <div className="orb" style={{ width: 350, height: 350, top: '55%', left: '-8%', background: 'rgba(255,215,0,.04)', animationDelay: '6s' }} />
      <div className="dot-bg" style={{ position: 'absolute', inset: 0, opacity: .4, pointerEvents: 'none' }} />
      <Particles />
      {!isMobile && <ChromaKeyHeroVideo />}

      {[['5%','55%'],['88%','48%'],['70%','72%'],['15%','80%'],['50%','88%']].map(([left, top], i) => (
        <div key={i} style={{ position: 'absolute', left, top, fontSize: 14 + i * 4, opacity: 0.025, pointerEvents: 'none', userSelect: 'none', animation: `float ${8 + i * 2}s ease-in-out ${i}s infinite` }}>🏴‍☠️</div>
      ))}

      <div className="container" style={{ position: 'relative', zIndex: 1, width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', alignItems: 'start', gap: isMobile ? 48 : 56 }}>

          {/* ── Left column ── */}
          <div>
            {/* Live badge */}
            <div className="fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 100, padding: '6px 16px', marginBottom: 28 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2ECC71', boxShadow: '0 0 8px #2ECC71', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                {stats ? `${stats.membersTracked}+ nakamas · ` : ''}Actif maintenant
              </span>
            </div>

            {/* Titre */}
            <h1 style={{ fontFamily: 'var(--pirate)', fontSize: 'clamp(58px,8.5vw,100px)', fontWeight: 400, lineHeight: .95, color: '#fff', marginBottom: 14, letterSpacing: '.01em' }}>
              <span className="hero-brams">Brams</span>
              <span className="hero-community-glow">
                <span className="hero-community">Community</span>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="fade-up" style={{ fontSize: 'clamp(13px,1.6vw,17px)', color: 'rgba(255,255,255,.5)', fontWeight: 500, letterSpacing: '.04em', marginBottom: 36, maxWidth: 460, lineHeight: 1.5 }}>
              La plus grande communauté One Piece francophone 🏴‍☠️
            </p>

            <div className="fade-up-3"><QuoteRotator /></div>

            {/* CTA */}
            <div className="fade-up-3" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 48 }}>
              <a
                href="https://discord.gg/v3Ddhtbz"
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{
                  fontSize: 15, padding: '13px 26px',
                  background: 'linear-gradient(135deg, #D4A017, #E5B43A)',
                  color: '#1a1a1a', fontWeight: 700,
                  boxShadow: '0 4px 24px rgba(212,160,23,0.35)',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(212,160,23,0.55)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(212,160,23,0.35)' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>
                Rejoindre le Discord
              </a>
              <a
                href="#rangs"
                className="btn"
                style={{
                  fontSize: 15, padding: '13px 26px',
                  background: 'transparent',
                  border: '1px solid rgba(212,160,23,0.45)',
                  color: '#D4A017',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,0.1)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,0.8)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(212,160,23,0.45)' }}
              >
                ⚔️ Voir les rangs
              </a>
            </div>

            {/* Stats */}
            <div className="fade-up-3" style={{ display: 'flex', gap: 32, flexWrap: 'wrap', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.07)' }}>
              <StatBlock value="2 000+" label="Membres" />
              <StatBlock value="24/7" label="Bot actif" />
              <StatBlock
                value={stats ? `${stats.membersTracked}` : '100+'}
                label="Classement"
                live={!!stats}
                liveVal={stats ? `${stats.membersTracked}` : null}
              />
              {stats?.activeVocal > 0 && (
                <StatBlock
                  value={`${stats.activeVocal}`}
                  label="Vocal / semaine"
                  live
                  liveVal={`${stats.activeVocal}`}
                />
              )}
            </div>
          </div>

          {/* ── Right column — UnifiedSidebar ── */}
          {!isMobile && <UnifiedSidebar />}
        </div>
      </div>
    </section>
  )
}
