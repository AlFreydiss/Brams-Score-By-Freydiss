import { useState, useEffect, useRef } from 'react'
import Particles from './Particles.jsx'
import UnifiedSidebar from './UnifiedSidebar.jsx'
import { useMobile } from '../hooks/useMediaQuery.js'

const QUOTES = [
  { text: "Je vais devenir le Roi des Pirates !", author: "Monkey D. Luffy" },
  { text: "Un homme qui abandonne quelque chose ne mérite pas de le retrouver.", author: "Roronoa Zoro" },
  { text: "Les rêves ne meurent jamais tant qu'il reste quelqu'un pour les porter.", author: "Monkey D. Luffy" },
  { text: "Je ne regrette rien.", author: "Portgas D. Ace" },
  { text: "Ce n'est pas le monde qui est cruel. C'est toi qui es trop faible.", author: "Donquixote Doflamingo" },
  { text: "Si tu blesses un de mes nakamas, tu devras m'affronter.", author: "Monkey D. Luffy" },
  { text: "La force n'est pas la seule chose qui compte dans ce monde.", author: "Shanks" },
  { text: "Nul ne peut changer le passé. Mais n'importe qui peut changer l'avenir.", author: "Nico Robin" },
  { text: "Même affaibli, un lion reste un lion.", author: "Rayleigh" },
  { text: "Je vis selon mes propres règles. C'est ça la vraie liberté.", author: "Eustass Kid" },
]

function useCountUp(target, duration = 1400) {
  const [val, setVal] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    const num = parseInt(target.replace(/\D/g, ''))
    const suffix = target.replace(/[\d]/g, '')
    if (isNaN(num)) { setVal(target); return }
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.floor(ease * num) + suffix)
      if (p < 1) requestAnimationFrame(tick)
      else setVal(target)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return val || target
}

function StatBlock({ value, label }) {
  const v = useCountUp(value)
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--pirate)', fontSize: 30, color: '#fff', lineHeight: 1, letterSpacing: '.02em' }}>{v}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '.12em' }}>{label}</div>
    </div>
  )
}

function QuoteRotator() {
  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(true)
  useEffect(() => {
    const id = setInterval(() => {
      setFade(false)
      setTimeout(() => { setIdx(i => (i + 1) % QUOTES.length); setFade(true) }, 500)
    }, 15000)
    return () => clearInterval(id)
  }, [])
  const q = QUOTES[idx]
  return (
    <div style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.5s ease', borderLeft: '2px solid rgba(224,82,74,.5)', paddingLeft: 16, marginBottom: 40, maxWidth: 480 }}>
      <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,.7)', lineHeight: 1.75, fontStyle: 'italic', marginBottom: 5 }}>« {q.text} »</p>
      <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>— {q.author}</span>
    </div>
  )
}

export default function Hero() {
  const isMobile = useMobile()

  return (
    <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden', paddingTop: 140, paddingBottom: 80 }}>
      <div className="orb" style={{ width: 700, height: 700, top: '0%', left: '25%', background: 'rgba(224,82,74,.07)' }} />
      <div className="orb" style={{ width: 500, height: 500, bottom: '-10%', right: '-10%', background: 'rgba(155,89,182,.07)', animationDelay: '3s' }} />
      <div className="orb" style={{ width: 350, height: 350, top: '55%', left: '-8%', background: 'rgba(255,215,0,.04)', animationDelay: '6s' }} />
      <div className="dot-bg" style={{ position: 'absolute', inset: 0, opacity: .4, pointerEvents: 'none' }} />
      <Particles />

      {['8%', '22%', '68%', '82%', '45%'].map((left, i) => (
        <div key={i} style={{ position: 'absolute', left, top: `${15 + i * 15}%`, fontSize: 14 + i * 4, opacity: 0.03 + i * 0.01, pointerEvents: 'none', userSelect: 'none', animation: `float ${7 + i * 2}s ease-in-out ${i}s infinite` }}>🏴‍☠️</div>
      ))}

      <div className="container" style={{ position: 'relative', zIndex: 1, width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', alignItems: 'start', gap: isMobile ? 48 : 56 }}>

          {/* ── Left column ── */}
          <div>
            <div className="fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 100, padding: '6px 16px', marginBottom: 36 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2ECC71', boxShadow: '0 0 8px #2ECC71', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase' }}>2 000+ nakamas · Actif maintenant</span>
            </div>

            <h1 style={{ fontFamily: 'var(--pirate)', fontSize: 'clamp(58px,8.5vw,100px)', fontWeight: 400, lineHeight: .95, color: '#fff', marginBottom: 32, letterSpacing: '.01em' }}>
              <span className="hero-brams">Brams</span>
              <span className="hero-community-glow">
                <span className="hero-community">Community</span>
              </span>
            </h1>

            <div className="fade-up-3"><QuoteRotator /></div>

            <div className="fade-up-3" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 48 }}>
              <a href="https://discord.gg/ez4dBTPE" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ fontSize: 15, padding: '13px 26px' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>
                Rejoindre
              </a>
            </div>

            <div className="fade-up-3" style={{ display: 'flex', gap: 32, flexWrap: 'wrap', paddingTop: 20 }}>
              <StatBlock value="2 000+" label="Membres" />
              <StatBlock value="24/7"   label="Bot actif" />
              <StatBlock value="100+"   label="Top classement" />
            </div>
          </div>

          {/* ── Right column — UnifiedSidebar ── */}
          {!isMobile && <UnifiedSidebar />}

        </div>
      </div>
    </section>
  )
}
