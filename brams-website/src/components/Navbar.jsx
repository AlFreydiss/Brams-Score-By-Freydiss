import { useState, useEffect, useRef } from 'react'
import AboutModal from './AboutModal.jsx'
import AuthModal from './AuthModal.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'

// ── Liens centraux ───────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: 'Rangs',          href: '#rangs',       action: null,          gated: false },
  { label: 'Quiz',           href: '#quiz',         action: null,          gated: false },
  { label: 'Classement',     href: '#classement',   action: null,          gated: false },
  { label: 'Encyclopédie',   href: '#',             action: 'encyclopedie',gated: false },
  { label: 'Animés & Scans', href: '#',             action: 'anime-hub',   gated: true  },
]

function openAnimeHub(e)    { e.preventDefault(); document.dispatchEvent(new CustomEvent('open-anime-hub')) }
function openEncyclopedie(e){ e.preventDefault(); document.dispatchEvent(new CustomEvent('open-encyclopedie')) }

// ── SVG icons ────────────────────────────────────────────────────────────────
function TikTokIcon()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg> }
function TwitchIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg> }
function YouTubeIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> }

const SOCIAL_BASE = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, borderRadius: 8,
  border: '1px solid transparent',
  background: 'transparent', cursor: 'pointer',
  transition: 'color .15s, background .15s, border-color .15s',
  textDecoration: 'none', color: '#6b7280',
}

const SOCIALS = [
  {
    href: 'https://www.twitch.tv/bouledog_',
    icon: <TwitchIcon />,
    hoverColor: '#9146FF',
    hoverBg: 'rgba(145,71,255,.12)',
    hoverBorder: 'rgba(145,71,255,.3)',
  },
  {
    href: 'https://www.youtube.com/@BouleDogg/featured',
    icon: <YouTubeIcon />,
    hoverColor: '#FF0000',
    hoverBg: 'rgba(255,0,0,.1)',
    hoverBorder: 'rgba(255,0,0,.3)',
  },
  {
    href: 'https://www.tiktok.com/@bouledogg',
    icon: <TikTokIcon />,
    hoverColor: '#fff',
    hoverBg: 'rgba(255,255,255,.08)',
    hoverBorder: 'rgba(255,255,255,.2)',
  },
]

// ── Bouton Se connecter ──────────────────────────────────────────────────────
function LoginButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '8px 18px', fontSize: 13, fontWeight: 700,
        letterSpacing: '.03em', cursor: 'pointer',
        borderRadius: 8, border: 'none',
        background: '#d4a017', color: '#1a1f2e',
        transition: 'background .15s, transform .15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#e5b83a'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.background = '#d4a017'; e.currentTarget.style.transform = 'translateY(0)' }}
    >Se connecter</button>
  )
}

// ── Dropdown utilisateur connecté ────────────────────────────────────────────
function UserMenu({ displayName, avatarUrl, onSignOut }) {
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
        <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1.5px solid rgba(255,215,0,0.4)', background: 'linear-gradient(135deg, #d4a017, #e5b83a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {avatarUrl
            ? <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 11, fontWeight: 800, color: '#1a1f2e' }}>{initials}</span>
          }
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,215,0,0.7)', fontWeight: 600, marginTop: 2 }}>⚓ Équipage</div>
        </div>
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>
          <path d="M2 3 L5 7 L8 3" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'rgba(16,17,20,0.98)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, padding: '8px', minWidth: 200,
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)',
          animation: 'slideDown 0.15s ease-out', zIndex: 300,
        }}>
          <div style={{ padding: '8px 10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{displayName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2ECC71', boxShadow: '0 0 6px #2ECC71' }} />
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>Connecté</span>
            </div>
          </div>

          {[
            { icon: '👤', label: 'Mon Profil', hint: 'Bientôt' },
            { icon: '💰', label: 'Ma Banque',  hint: 'Bientôt' },
            { icon: '📊', label: 'Mes Stats',  hint: 'Bientôt' },
          ].map(item => (
            <button key={item.label} disabled style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%',
              padding: '9px 10px', borderRadius: 8, border: 'none',
              background: 'transparent', cursor: 'default',
              color: 'rgba(255,255,255,0.28)', fontSize: 13, fontWeight: 600, textAlign: 'left',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>{item.icon}</span><span>{item.label}</span>
              </span>
              <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '2px 6px', color: 'rgba(255,255,255,0.3)' }}>{item.hint}</span>
            </button>
          ))}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />
          <button
            onClick={() => { setOpen(false); onSignOut() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 10px', borderRadius: 8, border: 'none',
              background: 'transparent', cursor: 'pointer',
              color: '#E0524A', fontSize: 13, fontWeight: 700, textAlign: 'left', transition: 'background .1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(224,82,74,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span>🚪</span><span>Déconnexion</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Navbar principale ────────────────────────────────────────────────────────
export default function Navbar() {
  const [scrolled,  setScrolled]  = useState(false)
  const [about,     setAbout]     = useState(false)
  const [authOpen,  setAuthOpen]  = useState(false)
  const [menuOpen,  setMenuOpen]  = useState(false)
  const { isAuthenticated, signOut, displayName, avatarUrl } = useAuth()

  // Écoute les events externes qui veulent ouvrir le modal auth
  useEffect(() => {
    const fn = () => setAuthOpen(true)
    document.addEventListener('open-auth-modal', fn)
    return () => document.removeEventListener('open-auth-modal', fn)
  }, [])

  // Scroll listener
  useEffect(() => {
    let raf
    const fn = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setScrolled(window.scrollY > 50)) }
    window.addEventListener('scroll', fn, { passive: true })
    return () => { window.removeEventListener('scroll', fn); cancelAnimationFrame(raf) }
  }, [])

  // Ferme le menu mobile au scroll
  useEffect(() => {
    if (!menuOpen) return
    const fn = () => setMenuOpen(false)
    window.addEventListener('scroll', fn, { once: true, passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [menuOpen])

  function handleNavClick(link, e) {
    if (link.action === 'anime-hub')    openAnimeHub(e)
    if (link.action === 'encyclopedie') openEncyclopedie(e)
    setMenuOpen(false)
  }

  const linkBase = {
    padding: '6px 11px', borderRadius: 6, fontSize: 14, fontWeight: 500,
    color: 'rgba(203,213,225,0.72)', textDecoration: 'none',
    transition: 'color .15s', display: 'flex', alignItems: 'center', gap: 5,
    whiteSpace: 'nowrap',
  }

  return (
    <>
      {/* ── Barre principale ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        padding: '0 28px',
        background: scrolled ? 'rgba(14,15,17,.95)' : 'rgba(14,15,17,.6)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,.08)',
        transition: 'background .3s ease',
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'center', height: 68, gap: 0 }}>

          {/* Logo */}
          <button onClick={() => setAbout(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 22 }}>🏴‍☠️</span>
            <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: '-.01em' }}>Brams</span>
          </button>

          {/* Liens centrés — desktop */}
          <div className="hide-mobile" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            {NAV_LINKS.map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={link.action ? (e) => handleNavClick(link, e) : undefined}
                style={linkBase}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(203,213,225,0.72)'}
              >
                {link.label}
                {link.gated && !isAuthenticated && (
                  <span style={{ fontSize: 9, opacity: 0.45, lineHeight: 1, marginLeft: 1 }}>🔒</span>
                )}
              </a>
            ))}
          </div>

          {/* Droite : sociaux + séparateur + CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 'auto' }}>

            {/* Icônes sociales — gris → brand au hover */}
            <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {SOCIALS.map(s => (
                <a
                  key={s.href}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...SOCIAL_BASE }}
                  onMouseEnter={e => { e.currentTarget.style.color = s.hoverColor; e.currentTarget.style.background = s.hoverBg; e.currentTarget.style.borderColor = s.hoverBorder }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
                >{s.icon}</a>
              ))}
            </div>

            {/* Séparateur vertical */}
            <div className="hide-mobile" style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />

            {/* Auth — desktop */}
            <div className="hide-mobile">
              {isAuthenticated
                ? <UserMenu displayName={displayName} avatarUrl={avatarUrl} onSignOut={signOut} />
                : <LoginButton onClick={() => setAuthOpen(true)} />
              }
            </div>

            {/* Burger — mobile */}
            <button
              className="show-mobile"
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Menu"
              style={{
                background: menuOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, color: '#fff', cursor: 'pointer',
                width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, transition: 'background .15s',
              }}
            >{menuOpen ? '✕' : '☰'}</button>
          </div>
        </div>
      </nav>

      {/* ── Drawer mobile ── */}
      {menuOpen && (
        <>
          <div
            onClick={() => setMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 190, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          />
          <div style={{
            position: 'fixed', top: 68, left: 0, right: 0, zIndex: 195,
            background: 'rgba(14,15,17,0.98)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '16px 20px 24px',
            animation: 'slideDown 0.18s ease',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
              {NAV_LINKS.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={link.action ? (e) => handleNavClick(link, e) : () => setMenuOpen(false)}
                  style={{ padding: '12px 14px', borderRadius: 10, fontSize: 15, fontWeight: 500, color: 'rgba(203,213,225,0.8)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, transition: 'background .12s, color .12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(203,213,225,0.8)' }}
                >
                  {link.label}
                  {link.gated && !isAuthenticated && <span style={{ fontSize: 10, opacity: 0.5 }}>🔒</span>}
                </a>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {SOCIALS.map(s => (
                <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#6b7280', transition: 'color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = s.hoverColor}
                  onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
                >{s.icon}</a>
              ))}
              <div style={{ flex: 1 }} />
              {isAuthenticated
                ? <button onClick={() => { setMenuOpen(false); signOut() }} style={{ background: 'rgba(224,82,74,0.12)', border: '1px solid rgba(224,82,74,0.3)', borderRadius: 8, color: '#E0524A', cursor: 'pointer', padding: '8px 14px', fontSize: 13, fontWeight: 700 }}>Déconnexion</button>
                : <LoginButton onClick={() => { setMenuOpen(false); setAuthOpen(true) }} />
              }
            </div>
          </div>
        </>
      )}

      {about    && <AboutModal onClose={() => setAbout(false)} />}
      {authOpen && <AuthModal  onClose={() => setAuthOpen(false)} />}
    </>
  )
}
