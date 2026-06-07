import { useState, useEffect, useRef } from 'react'
import UnifiedSidebar from './UnifiedSidebar.jsx'
import OpeningBgMedia from './social/OpeningBgMedia.jsx'
import { getBgById } from '../data/opening-backgrounds.js'
import { useMobile, useNarrow } from '../hooks/useMediaQuery.js'
import { fetchStats } from '../lib/supabase.js'

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
        background: hov ? 'rgba(212,160,23,0.10)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hov ? 'rgba(212,160,23,0.32)' : 'rgba(255,255,255,0.09)'}`,
        borderRadius: 14,
        padding: '13px 14px 12px',
        transition: 'all .25s cubic-bezier(.22,1,.36,1)',
        transform: hov ? 'translateY(-3px)' : 'none',
        boxShadow: hov ? '0 12px 30px rgba(212,160,23,0.14)' : '0 2px 10px rgba(0,0,0,0.18)',
        cursor: 'default',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        {live && (
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2ECC71', boxShadow: '0 0 8px #2ECC71', animation: 'pulse 2s infinite', flexShrink: 0 }} />
        )}
        <div className="premium-stat-value" style={{ fontSize: 'clamp(20px,2.4vw,28px)' }}>{shown}</div>
      </div>
      <div className="premium-stat-label">{label}</div>
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

// ── Top soutiens de la cagnotte Leetchi ──────────────────────────────────────
// Leetchi n'a pas d'API publique → liste éditable à la main. Mets les vrais
// donateurs ici (triés par montant décroissant). Laisser vide = bandeau masqué.
const TOP_DONORS = [
  { name: 'Al Freydiss', amount: 50 },
  { name: 'Nidel', amount: 30 },
  { name: 'Berat', amount: 25 },
  { name: 'Hakuji', amount: 20 },
  { name: 'ayoub93', amount: 15 },
  { name: 'Vinn', amount: 10 },
]
const LEETCHI_URL = 'https://www.leetchi.com/fr/c/brams-score-by-freydiss-1073815?utm_source=copylink&utm_medium=social_sharing'
const DISCORD_URL = 'https://discord.gg/8uzU3eatMr'

function DonorsMarquee() {
  if (!TOP_DONORS.length) return null
  const loop = [...TOP_DONORS, ...TOP_DONORS]
  return (
    <a href={LEETCHI_URL} target="_blank" rel="noopener noreferrer"
      style={{ display: 'block', textDecoration: 'none', maxWidth: 760, width: '100%', margin: '28px auto 0',
        border: '1px solid rgba(212,160,23,0.18)', borderRadius: 12, background: 'rgba(212,160,23,0.04)', overflow: 'hidden' }}>
      <style>{`@keyframes donors-scroll { from{transform:translateX(0)} to{transform:translateX(-50%)} } .donors-track:hover{ animation-play-state:paused }`}</style>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ flexShrink: 0, padding: '10px 14px', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#d8bd7e', borderRight: '1px solid rgba(212,160,23,0.18)', background: 'rgba(212,160,23,0.06)', whiteSpace: 'nowrap' }}>💛 Top soutiens</span>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div className="donors-track" style={{ display: 'inline-flex', whiteSpace: 'nowrap', animation: 'donors-scroll 26s linear infinite' }}>
            {loop.map((d, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', fontSize: 12.5, color: 'rgba(255,255,255,0.66)' }}>
                <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{d.name}</span>
                <span style={{ fontWeight: 800, color: '#d8bd7e' }}>{d.amount} €</span>
                <span style={{ color: 'rgba(212,160,23,0.4)' }}>•</span>
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
  const heroBg = getBgById('bg-we-are') || getBgById('bg-the-rumbling')

  useEffect(() => {
    let stop = false
    const load = () => fetchStats().then(s => { if (!stop && s) setStats(s) })
    load()
    const id = setInterval(load, 15000)
    const onFocus = () => { if (!document.hidden) load() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      stop = true
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  const scrollToModules = () => document.getElementById('hero-modules')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <>
      {/* ════ HERO IMMERSIF CINÉMATIQUE ════ */}
      <section style={{
        position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', textAlign: 'center', padding: isMobile ? '96px 20px 48px' : '110px 24px 64px',
      }}>
        {/* Fond animé (opening) plein écran */}
        {heroBg && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <OpeningBgMedia bg={heroBg} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        {/* Voiles légibilité (radial centre + dégradé haut/bas) */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'radial-gradient(120% 95% at 50% 42%, rgba(8,9,13,0.52) 0%, rgba(8,9,13,0.84) 66%, #08090d 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(8,9,13,0.88) 0%, transparent 24%, transparent 54%, rgba(8,9,13,0.97) 100%)' }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          {/* Badge live */}
          <div className="fade-up" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.22)',
            borderRadius: 100, padding: '6px 16px', marginBottom: 26,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2ECC71', boxShadow: '0 0 10px #2ECC71', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase' }}>
              {stats ? `${stats.membersTracked}+ nakamas · ` : ''}Actif maintenant
            </span>
          </div>

          {/* Titre */}
          <h1 className="hero-title-premium fade-up" style={{ textAlign: 'center' }}>
            <span className="hero-brams">Brams</span>
            <span className="hero-community hero-community-glow">Community</span>
          </h1>

          {/* Sous-titre */}
          <p className="fade-up-2" style={{
            fontSize: 'clamp(15px,1.8vw,21px)', color: 'rgba(255,255,255,.92)', fontWeight: 640,
            margin: '6px 0 14px', maxWidth: 600, lineHeight: 1.4, textShadow: '0 2px 18px rgba(0,0,0,.7)',
          }}>
            Ton équipage, tes rangs, tes théories, tes moments.
          </p>
          <p className="fade-up-2" style={{
            fontSize: 'clamp(13px,1.2vw,15px)', color: 'rgba(255,255,255,.6)', fontWeight: 440,
            lineHeight: 1.7, marginBottom: 32, maxWidth: 540, textWrap: 'balance',
          }}>
            Une communauté anime connectée à Discord — classements, équipages, blind tests, le fil, événements et récompenses en berries.
          </p>

          {/* CTA */}
          <div className="fade-up-3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="btn" data-premium-cta="primary"
              style={{
                fontSize: 15, padding: '15px 30px', display: 'inline-flex', alignItems: 'center', gap: 9,
                background: 'linear-gradient(135deg, #C8940F 0%, #E8B84A 50%, #C8940F 100%)', backgroundSize: '200% auto',
                color: '#12090a', fontWeight: 700, boxShadow: '0 8px 34px rgba(212,160,23,0.42)', border: 'none', textDecoration: 'none',
                transition: 'box-shadow .28s, transform .28s, background-position .4s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundPosition = 'right center'; e.currentTarget.style.boxShadow = '0 10px 40px rgba(212,160,23,0.60)'; e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundPosition = 'left center'; e.currentTarget.style.boxShadow = '0 4px 28px rgba(212,160,23,0.40)'; e.currentTarget.style.transform = 'none' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>
              Rejoindre l'équipage
            </a>
            <button onClick={scrollToModules}
              style={{ fontSize: 14, padding: '14px 24px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.82)',
                transition: 'background .2s, border-color .2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)' }}>
              Découvrir ↓
            </button>
          </div>

          {/* Bandeau stats live */}
          <div className="fade-up-3" style={{
            display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))',
            gap: 12, marginTop: 40, width: '100%', maxWidth: 720,
          }}>
            <StatBlock value="2 000+" label="Nakamas" />
            <StatBlock value="24/7" label="Bot actif" />
            <StatBlock value={stats ? `${stats.membersTracked}` : '200+'} label="Classés" live={!!stats} liveVal={stats ? `${stats.membersTracked}` : null} />
            <StatBlock value={stats?.activeVocal > 0 ? `${stats.activeVocal}` : '64'} label="Vocal / sem." live={!!(stats?.activeVocal > 0)} liveVal={stats?.activeVocal > 0 ? `${stats.activeVocal}` : null} />
          </div>

          {/* Top soutiens Leetchi (défile sobrement) */}
          <DonorsMarquee />

          {/* Indice scroll */}
          <button onClick={scrollToModules} aria-label="Défiler" style={{
            marginTop: 30, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
            fontSize: 22, animation: 'pulse 2.4s ease-in-out infinite',
          }}>⌄</button>
        </div>
      </section>

      {/* ════ MODULES + HUB (sous le hero) ════ */}
      <section id="hero-modules" style={{ position: 'relative', zIndex: 1, maxWidth: 1440, margin: '0 auto', padding: isMobile ? '32px 20px 64px' : '48px clamp(32px,4vw,64px) 90px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr minmax(340px, 420px)', gap: isNarrow ? 40 : 'clamp(40px,5vw,80px)', alignItems: 'start' }}>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: 'clamp(20px,2.4vw,28px)', fontWeight: 900, letterSpacing: '-.02em', color: '#fff' }}>Tout ce que tu peux faire</h2>
            <p style={{ margin: '0 0 22px', fontSize: 13.5, color: 'rgba(255,255,255,0.5)' }}>Un hub anime complet, connecté à ton Discord.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              <HeroFeatureCard icon="⚓" title="Équipages" desc="Rejoins un crew, progresse avec tes nakamas." accent="rgba(212,160,23" />
              <HeroFeatureCard icon="📊" title="Classements" desc="Monte dans les rangs et marque ton nom." accent="rgba(88,101,242" />
              <HeroFeatureCard icon="🎵" title="Blind Test" desc="Teste ta mémoire sur les openings anime." accent="rgba(52,211,153" />
              <HeroFeatureCard icon="📖" title="Le Fil" desc="Poste, réagis, débats et partage tes théories." accent="rgba(224,82,74" />
              <HeroFeatureCard icon="🛒" title="Boutique" desc="Débloque des fonds d'opening rares." accent="rgba(168,85,247" />
              <HeroFeatureCard icon="🎉" title="Événements" desc="Participe aux soirées, tournois et défis." accent="rgba(234,179,8" />
            </div>
          </div>

          <div style={isNarrow ? { maxWidth: 480, margin: '0 auto', width: '100%' } : { position: 'sticky', top: 96 }}>
            <UnifiedSidebar />
          </div>
        </div>
      </section>
    </>
  )
}
