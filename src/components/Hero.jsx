import { useState, useEffect, useRef } from 'react'
import UnifiedSidebar from './UnifiedSidebar.jsx'
import { useMobile, useNarrow } from '../hooks/useMediaQuery.js'
import { fetchStats } from '../lib/supabase.js'

const STARS = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  x: (i * 37.3 + 13) % 100,
  y: (i * 53.7 + 7) % 100,
  size: (i % 3) + 1,
  delay: (i * 0.38) % 4,
  dur: ((i * 0.72) % 2.5) + 2.5,
  opacity: ((i * 0.13) % 0.35) + 0.12,
}))

function StarField() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {STARS.map(s => (
        <div key={s.id} style={{
          position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: '50%',
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
    if (!el) { setActive(true); return }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setActive(true); obs.disconnect() } },
      { threshold: 0.4 }
    )
    obs.observe(el)
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight || document.documentElement.clientHeight
    if (rect.top < vh && rect.bottom > 0) { setActive(true); obs.disconnect() }
    const fallback = setTimeout(() => { setActive(true); obs.disconnect() }, 1500)
    return () => { obs.disconnect(); clearTimeout(fallback) }
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
      const fmt = cur >= 1000 ? Math.floor(cur / 1000) + ' ' + String(cur % 1000).padStart(3, '0') : String(cur)
      setDisplay(fmt + suffix)
      if (p < 1) requestAnimationFrame(tick)
      else setDisplay(value)
    }
    requestAnimationFrame(tick)
  }, [active, value, isStatic])

  const shown = live && liveVal != null ? liveVal : (active ? display : value)

  return (
    <div ref={ref} className="premium-stat" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'rgba(191,164,106,0.09)' : 'rgba(255,255,255,0.035)',
        border: `1px solid ${hov ? 'rgba(191,164,106,0.30)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 14, padding: '14px 15px 12px',
        transition: 'all .25s cubic-bezier(.22,1,.36,1)',
        transform: hov ? 'translateY(-3px)' : 'none',
        boxShadow: hov ? '0 12px 30px rgba(191,164,106,0.12)' : '0 2px 10px rgba(0,0,0,0.18)',
        cursor: 'default', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column',
      }}>
      <div style={{ height: 56, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
        {icon && <div style={{ fontSize: 15, opacity: 0.85, marginBottom: 5 }}>{icon}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {live && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2ECC71', boxShadow: '0 0 8px #2ECC71', animation: 'pulse 2s infinite', flexShrink: 0 }} />}
          <div className="premium-stat-value">{shown}</div>
        </div>
      </div>
      <div style={{ height: 2, width: '100%', background: 'linear-gradient(90deg, #bfa46a, #d8bd7e)', borderRadius: 2, margin: '8px 0 10px', transform: active ? 'scaleX(1)' : 'scaleX(0)', transformOrigin: 'left', transition: 'transform 0.9s 0.3s cubic-bezier(0.22,1,0.36,1)' }} />
      <div className="premium-stat-label">{label}</div>
      {sub && <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,.28)', marginTop: 2, letterSpacing: '.03em', lineHeight: 1.3 }}>{sub}</div>}
    </div>
  )
}

function HeroFeatureCard({ icon, title, desc, accent = 'rgba(191,164,106' }) {
  const [hov, setHov] = useState(false)
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        flex: '1 1 130px',
        background: hov ? `linear-gradient(135deg, ${accent},.09) 0%, ${accent},.04) 100%)` : 'linear-gradient(135deg, rgba(255,255,255,.035) 0%, rgba(255,255,255,.014) 100%)',
        border: `1px solid ${hov ? `${accent},.30)` : 'rgba(255,255,255,.08)'}`,
        borderRadius: 14, padding: '15px 15px 13px',
        transition: 'all .28s cubic-bezier(.22,1,.36,1)', transform: hov ? 'translateY(-4px)' : 'none',
        cursor: 'default', backdropFilter: 'blur(14px)', display: 'flex', flexDirection: 'column', gap: 7,
        boxShadow: hov ? `0 12px 30px ${accent},.12)` : 'none', position: 'relative', overflow: 'hidden',
      }}>
      <span style={{ fontSize: 21, lineHeight: 1 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 760, color: hov ? '#fff' : 'rgba(255,255,255,.88)', marginBottom: 3, transition: 'color .2s' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  )
}

// ── Top soutiens de la cagnotte Leetchi (liste éditable à la main) ────────────
const TOP_DONORS = [
  { name: 'Hakuji', amount: 10 },
  { name: 'Ayoub', amount: 7 },
  { name: 'Lamar', amount: 1 },
]
const LEETCHI_URL = 'https://www.leetchi.com/fr/c/brams-score-by-freydiss-1073815?utm_source=copylink&utm_medium=social_sharing'
const DISCORD_URL = 'https://discord.gg/8uzU3eatMr'

function DonorsMarquee() {
  if (!TOP_DONORS.length) return null
  const loop = [...TOP_DONORS, ...TOP_DONORS, ...TOP_DONORS]
  return (
    <a href={LEETCHI_URL} target="_blank" rel="noopener noreferrer"
      style={{ display: 'block', textDecoration: 'none', maxWidth: 500, marginTop: 24,
        border: '1px solid rgba(191,164,106,0.18)', borderRadius: 12, background: 'rgba(191,164,106,0.04)', overflow: 'hidden' }}>
      <style>{`@keyframes donors-scroll{from{transform:translateX(0)}to{transform:translateX(-33.333%)}} .donors-track:hover{animation-play-state:paused}`}</style>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ flexShrink: 0, padding: '9px 13px', fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#d8bd7e', borderRight: '1px solid rgba(191,164,106,0.18)', whiteSpace: 'nowrap' }}>💛 Top soutiens</span>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div className="donors-track" style={{ display: 'inline-flex', whiteSpace: 'nowrap', animation: 'donors-scroll 22s linear infinite' }}>
            {loop.map((d, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 12.5, color: 'rgba(255,255,255,0.6)' }}>
                <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{d.name}</span>
                <span style={{ fontWeight: 800, color: '#d8bd7e' }}>{d.amount} €</span>
                <span style={{ color: 'rgba(191,164,106,0.35)' }}>•</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </a>
  )
}

export default function Hero() {
  const isMobile = useMobile()
  const isNarrow = useNarrow()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let stop = false
    const load = () => fetchStats().then(s => { if (!stop && s) setStats(s) })
    load()
    const id = setInterval(load, 15000)
    const onFocus = () => { if (!document.hidden) load() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => { stop = true; clearInterval(id); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus) }
  }, [])

  return (
    <section style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'visible',
      paddingTop: isMobile ? 92 : 110, paddingBottom: isMobile ? 64 : 80,
    }}>
      {/* Lueurs sobres (or à gauche, ambiance froide à droite) */}
      <div style={{ position: 'absolute', top: '4%', left: '-6%', width: '55%', height: '80%', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 60% at 30% 40%, rgba(191,164,106,0.10) 0%, rgba(191,164,106,0.03) 50%, transparent 80%)', filter: 'blur(24px)' }} />
      <div style={{ position: 'absolute', top: 0, right: '-8%', width: '50%', height: '90%', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 65% at 70% 35%, rgba(120,110,150,0.10) 0%, transparent 75%)', filter: 'blur(34px)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '22%', zIndex: 0, pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(8,9,13,0.7) 0%, transparent 100%)' }} />
      <StarField />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 1560, margin: '0 auto', padding: isMobile ? '0 20px' : '0 clamp(32px, 4vw, 72px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr minmax(340px, 420px)', alignItems: 'center', gap: isNarrow ? 40 : 'clamp(56px, 6vw, 120px)' }}>

          {/* ── Colonne gauche ── */}
          <div>
            <div className="fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(46,204,113,0.07)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: 100, padding: '6px 15px', marginBottom: 30 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2ECC71', boxShadow: '0 0 10px #2ECC71', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.62)', fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase' }}>
                {stats ? `${stats.membersTracked}+ nakamas · ` : ''}Actif maintenant
              </span>
            </div>

            {/* Titre — serif premium, sobre, accent or sur "Community" */}
            <h1 className="fade-up" style={{
              margin: '0 0 18px', fontFamily: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
              fontSize: 'clamp(52px, 8vw, 104px)', lineHeight: 1.0, letterSpacing: '-0.005em', fontWeight: 600,
            }}>
              <span style={{ display: 'block', color: '#f4f0e6', textShadow: '0 2px 24px rgba(0,0,0,0.4)' }}>Brams</span>
              {/* lineHeight + paddingBottom : laisse respirer la descendante du « y » (sinon coupée) */}
              <span style={{ display: 'block', fontStyle: 'italic', fontWeight: 500, lineHeight: 1.18, paddingBottom: '0.14em',
                background: 'linear-gradient(96deg, #e6cf94 0%, #d8bd7e 45%, #b89a5a 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                filter: 'drop-shadow(0 3px 22px rgba(191,164,106,0.18))' }}>
                Community
              </span>
            </h1>

            {/* Sous-titre unique (texte allégé) */}
            <p className="fade-up-2" style={{ fontSize: 'clamp(15px,1.6vw,19px)', color: 'rgba(255,255,255,.82)', fontWeight: 500, margin: '0 0 32px', maxWidth: 460, lineHeight: 1.5 }}>
              Ton équipage, tes rangs, tes théories, tes moments — une communauté anime connectée à Discord.
            </p>

            {/* CTA */}
            <div className="fade-up-3" style={{ marginBottom: 30 }}>
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="btn" data-premium-cta="primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 15, padding: '15px 30px',
                  background: 'linear-gradient(135deg, #C8940F 0%, #E8B84A 50%, #C8940F 100%)', backgroundSize: '200% auto',
                  color: '#12090a', fontWeight: 700, boxShadow: '0 8px 30px rgba(191,164,106,0.38)', border: 'none', textDecoration: 'none',
                  transition: 'box-shadow .28s, transform .28s, background-position .4s' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundPosition = 'right center'; e.currentTarget.style.boxShadow = '0 10px 38px rgba(191,164,106,0.55)'; e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundPosition = 'left center'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(191,164,106,0.38)'; e.currentTarget.style.transform = 'none' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>
                Rejoindre l'équipage
              </a>
            </div>

            {/* Stats */}
            <div className="fade-up-3" style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: 12 }}>
              <StatBlock value="2 000+" label="Nakamas" icon="🏴‍☠️" sub="Membres actifs" />
              <StatBlock value="24/7" label="Bot actif" icon="🤖" sub="Toujours dispo" />
              <StatBlock value={stats ? `${stats.membersTracked}` : '200+'} label="Classés" icon="📊" sub="Au leaderboard" live={!!stats} liveVal={stats ? `${stats.membersTracked}` : null} />
              <StatBlock value={stats?.activeVocal > 0 ? `${stats.activeVocal}` : '64'} label="Vocal / sem." icon="🎙️" sub="Sessions actives" live={!!(stats?.activeVocal > 0)} liveVal={stats?.activeVocal > 0 ? `${stats.activeVocal}` : null} />
            </div>

            {/* Modules */}
            <div className="fade-up-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginTop: 20 }}>
              <HeroFeatureCard icon="📊" title="Classements" desc="Monte dans les rangs." accent="rgba(120,110,150" />
              <HeroFeatureCard icon="🎵" title="Blind Test" desc="Devine les openings." accent="rgba(52,211,153" />
              <HeroFeatureCard icon="🏆" title="Tier List" desc="Classe tes persos préférés." accent="rgba(191,164,106" />
              <HeroFeatureCard icon="📖" title="Le Fil" desc="Poste, réagis, débats." accent="rgba(224,82,74" />
              <HeroFeatureCard icon="🛒" title="Boutique" desc="Fonds d'opening rares." accent="rgba(168,85,247" />
              <HeroFeatureCard icon="🎉" title="Événements" desc="Soirées, tournois, défis." accent="rgba(234,179,8" />
            </div>

            {/* Top soutiens Leetchi (défile sobrement) */}
            <DonorsMarquee />
          </div>

          {/* ── Colonne droite — Hub (comme avant) ── */}
          <div style={isNarrow ? { marginTop: isMobile ? 48 : 40, maxWidth: 480 } : { position: 'sticky', top: 112 }}>
            <UnifiedSidebar />
          </div>
        </div>
      </div>
    </section>
  )
}
