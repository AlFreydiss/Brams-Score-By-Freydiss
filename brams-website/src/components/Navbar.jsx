import { useState, useEffect, useRef } from 'react'
import AboutModal from './AboutModal.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'

const NAV_LINKS = [
  { label: 'Rangs',       href: '#rangs' },
  { label: 'Quiz',        href: '#quiz' },
  { label: 'Classement',  href: '#classement' },
  { label: 'Contact',     href: '#contact' },
  { label: '❤️ Soutenir', href: '#soutenir' },
]

function openAnimeHub(e) { e.preventDefault(); document.dispatchEvent(new CustomEvent('open-anime-hub')) }
function openEncyclopedie(e) { e.preventDefault(); document.dispatchEvent(new CustomEvent('open-encyclopedie')) }

function TikTokIcon()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg> }
function TwitchIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg> }
function YouTubeIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> }
function DiscordIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg> }

const ICON_BTN = { display:'flex', alignItems:'center', justifyContent:'center', width:34, height:34, borderRadius:8, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', transition:'background .15s, border-color .15s', color:'var(--muted)', textDecoration:'none' }

// ── Bouton "Wanted Poster" (non connecté) ────────────────────────────────────
function WantedButton({ onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', overflow: 'hidden',
        display: 'inline-flex', alignItems: 'center', gap: 9,
        padding: '9px 20px', fontSize: 13, fontWeight: 800,
        letterSpacing: '.03em', cursor: 'pointer',
        borderRadius: 10,
        background: hov
          ? 'linear-gradient(135deg, rgba(255,215,0,0.18), rgba(224,82,74,0.12))'
          : 'linear-gradient(135deg, rgba(255,215,0,0.10), rgba(224,82,74,0.07))',
        border: `1px solid ${hov ? 'rgba(255,215,0,0.65)' : 'rgba(255,215,0,0.35)'}`,
        color: '#fff',
        boxShadow: hov ? '0 0 24px rgba(255,215,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
        transition: 'all .2s',
        transform: hov ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      {/* Shimmer */}
      {hov && (
        <div style={{
          position: 'absolute', top: 0, left: '-100%', width: '60%', height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.12), transparent)',
          animation: 'shimmer 0.7s ease-out',
          pointerEvents: 'none',
        }} />
      )}
      {/* Coin déco */}
      <div style={{ position: 'absolute', top: 3, left: 4, fontSize: 7, color: 'rgba(255,215,0,0.4)', lineHeight: 1 }}>✦</div>
      <div style={{ position: 'absolute', top: 3, right: 4, fontSize: 7, color: 'rgba(255,215,0,0.4)', lineHeight: 1 }}>✦</div>
      <div style={{ position: 'absolute', bottom: 3, left: 4, fontSize: 7, color: 'rgba(255,215,0,0.4)', lineHeight: 1 }}>✦</div>
      <div style={{ position: 'absolute', bottom: 3, right: 4, fontSize: 7, color: 'rgba(255,215,0,0.4)', lineHeight: 1 }}>✦</div>

      <svg width="15" height="15" viewBox="0 0 24 24" fill="#5865f2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
      <span>Embarquer</span>
      <span style={{ fontSize: 15 }}>🏴‍☠️</span>
    </button>
  )
}

// ── Avatar + Dropdown (connecté) ─────────────────────────────────────────────
function UserMenu({ user, displayName, avatarUrl, onSignOut }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 9,
          background: open ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${open ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 10, padding: '6px 12px 6px 6px',
          cursor: 'pointer', transition: 'all .15s',
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' } }}
      >
        {/* Avatar */}
        <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1.5px solid rgba(255,215,0,0.4)', background: 'linear-gradient(135deg, #5865f2, #a29bfe)' }}>
          {avatarUrl
            ? <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{initials}</div>
          }
        </div>

        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,215,0,0.7)', fontWeight: 600, marginTop: 2 }}>⚓ Équipage</div>
        </div>

        <svg width="10" height="10" viewBox="0 0 10 10" fill="rgba(255,255,255,0.4)" style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>
          <path d="M2 3 L5 7 L8 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'rgba(16,17,20,0.98)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, padding: '8px', minWidth: 200,
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(20px)',
          animation: 'slideDown 0.15s ease-out',
          zIndex: 300,
        }}>
          {/* Header */}
          <div style={{ padding: '8px 10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{displayName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2ECC71', boxShadow: '0 0 6px #2ECC71' }} />
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>Connecté via Discord</span>
            </div>
          </div>

          {/* Items */}
          {[
            { icon: '👤', label: 'Mon Profil', action: null, disabled: true, hint: 'Bientôt' },
            { icon: '💰', label: 'Ma Banque', action: null, disabled: true, hint: 'Bientôt' },
            { icon: '📊', label: 'Mes Stats',  action: null, disabled: true, hint: 'Bientôt' },
          ].map(item => (
            <button key={item.label}
              disabled={item.disabled}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '9px 10px', borderRadius: 8, border: 'none',
                background: 'transparent', cursor: item.disabled ? 'default' : 'pointer',
                color: item.disabled ? 'rgba(255,255,255,0.28)' : '#fff',
                fontSize: 13, fontWeight: 600, textAlign: 'left',
                transition: 'background .1s', justifyContent: 'space-between',
              }}
              onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </span>
              {item.hint && <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '2px 6px', color: 'rgba(255,255,255,0.3)' }}>{item.hint}</span>}
            </button>
          ))}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />

          <button
            onClick={() => { setOpen(false); onSignOut() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 10px', borderRadius: 8, border: 'none',
              background: 'transparent', cursor: 'pointer',
              color: '#E0524A', fontSize: 13, fontWeight: 700, textAlign: 'left',
              transition: 'background .1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(224,82,74,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span>🚪</span>
            <span>Déconnexion</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Navbar principale ────────────────────────────────────────────────────────
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [about,    setAbout]    = useState(false)
  const { isAuthenticated, signIn, signOut, displayName, avatarUrl } = useAuth()

  useEffect(() => {
    let raf
    const fn = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setScrolled(window.scrollY > 50))
    }
    window.addEventListener('scroll', fn, { passive: true })
    return () => { window.removeEventListener('scroll', fn); cancelAnimationFrame(raf) }
  }, [])

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        padding: '0 28px',
        background: scrolled ? 'rgba(14,15,17,.95)' : 'rgba(14,15,17,.6)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,.08)',
        transition: 'background .3s ease',
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>

          {/* Logo */}
          <button onClick={() => setAbout(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🏴‍☠️</span>
            <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: '-.01em' }}>Brams</span>
          </button>

          {/* Nav links */}
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center', paddingLeft: 48, paddingRight: 64 }}>
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--muted)', transition: 'color .2s' }}
                onMouseEnter={e => e.target.style.color = '#fff'}
                onMouseLeave={e => e.target.style.color = 'var(--muted)'}
              >{l.label}</a>
            ))}

            <a href="#" onClick={openAnimeHub} style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              color: 'var(--accent)', transition: 'color .2s, background .2s',
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
              minWidth: 152, textDecoration: 'none',
              background: 'rgba(224,82,74,0.08)', border: '1px solid rgba(224,82,74,0.25)',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,82,74,0.18)'; e.currentTarget.style.borderColor = 'rgba(224,82,74,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(224,82,74,0.08)'; e.currentTarget.style.borderColor = 'rgba(224,82,74,0.25)' }}
            >
              🎌 Animés & Scans
              {!isAuthenticated && <span style={{ fontSize: 9, background: 'rgba(255,215,0,0.15)', color: '#FFD700', borderRadius: 4, padding: '1px 5px', marginLeft: 2 }}>🔒</span>}
            </a>

            <a href="#" onClick={openEncyclopedie} style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              color: '#a29bfe', transition: 'color .2s, background .2s',
              display: 'flex', alignItems: 'center', gap: 6, minWidth: 152, textDecoration: 'none',
              background: 'rgba(162,155,254,0.08)', border: '1px solid rgba(162,155,254,0.22)',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(162,155,254,0.18)'; e.currentTarget.style.borderColor = 'rgba(162,155,254,0.45)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(162,155,254,0.08)'; e.currentTarget.style.borderColor = 'rgba(162,155,254,0.22)' }}
            >📚 Encyclopédie</a>
          </div>

          {/* Actions droite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href="https://www.twitch.tv/bouledog_" target="_blank" rel="noopener noreferrer"
              style={{ ...ICON_BTN, color: 'var(--twitch)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(145,71,255,.15)'; e.currentTarget.style.borderColor = 'rgba(145,71,255,.4)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
            ><TwitchIcon /></a>

            <a href="https://www.youtube.com/@BouleDogg/featured" target="_blank" rel="noopener noreferrer"
              style={{ ...ICON_BTN, color: 'var(--youtube)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,0,0,.12)'; e.currentTarget.style.borderColor = 'rgba(255,0,0,.35)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
            ><YouTubeIcon /></a>

            <a href="https://www.tiktok.com/@bouledogg" target="_blank" rel="noopener noreferrer"
              style={{ ...ICON_BTN, color: '#ff0050' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,0,80,.12)'; e.currentTarget.style.borderColor = 'rgba(255,0,80,.35)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
            ><TikTokIcon /></a>

            {/* Bouton auth — dynamique */}
            <div className="hide-mobile">
              {isAuthenticated
                ? <UserMenu displayName={displayName} avatarUrl={avatarUrl} onSignOut={signOut} />
                : <WantedButton onClick={signIn} />
              }
            </div>
          </div>
        </div>
      </nav>

      {about && <AboutModal onClose={() => setAbout(false)} />}
    </>
  )
}
