import { useState, useEffect } from 'react'

const DISCORD_INVITE = 'https://discord.gg/brams'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '0 24px',
      background: scrolled ? 'rgba(26,27,30,0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(16px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
      transition: 'all 0.3s ease',
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🏴‍☠️</span>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18, color: '#fff' }}>
            Brams
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {['Rangs', 'Bot Buster', 'Classement'].map(label => (
            <a key={label}
              href={`#${label.toLowerCase().replace(' ', '-')}`}
              style={{
                padding: '6px 14px', borderRadius: 8,
                fontSize: 14, fontWeight: 500, color: 'var(--muted)',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.target.style.color = '#fff'}
              onMouseLeave={e => e.target.style.color = 'var(--muted)'}
            >{label}</a>
          ))}
          <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
            className="btn btn-primary" style={{ padding: '8px 18px', fontSize: 14 }}>
            Rejoindre ↗
          </a>
        </div>
      </div>
    </nav>
  )
}
