import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import AboutModal from './AboutModal.jsx'
import AuthModal from './AuthModal.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'

const NAV_LINKS = [
  { label: 'Rangs', href: '#rangs', action: null, gated: false, isRoute: false },
  { label: 'Quiz', href: '#quiz', action: null, gated: false, isRoute: false },
  { label: 'Classement', href: '#classement', action: null, gated: false, isRoute: false },
  { label: 'Encyclopedie', href: '#', action: 'encyclopedie', gated: false, isRoute: false },
  { label: 'Wiki', href: '/wiki', action: null, gated: false, isRoute: true },
  { label: 'Theories', href: '/theories', action: null, gated: false, isRoute: true },
  { label: 'Carte 3D', href: '#', action: 'tree', gated: false, isRoute: false },
  { label: 'Animes & Scans', href: '#', action: 'anime-hub', gated: true, isRoute: false, live: true },
]

function openAnimeHub(event) {
  event.preventDefault()
  document.dispatchEvent(new CustomEvent('open-anime-hub'))
}

function openEncyclopedie(event) {
  event.preventDefault()
  document.dispatchEvent(new CustomEvent('open-encyclopedie'))
}

function openTree(event) {
  event.preventDefault()
  document.dispatchEvent(new CustomEvent('open-tree'))
}

function TwitchIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" /></svg>
}

function YouTubeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
}

function TikTokIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" /></svg>
}

function LockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 10h12v10H6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

const SOCIALS = [
  { href: 'https://www.twitch.tv/bouledog_', icon: <TwitchIcon /> },
  { href: 'https://www.youtube.com/@BouleDogg/featured', icon: <YouTubeIcon /> },
  { href: 'https://www.tiktok.com/@bouledogg', icon: <TikTokIcon /> },
]

function BrandMark({ onClick }) {
  return (
    <button onClick={onClick} className="nav-brand-premium" aria-label="Accueil Brams Community">
      <span className="nav-brand-emblem">B</span>
      <span className="nav-brand-copy">
        <span className="nav-brand-title">Brams</span>
        <span className="nav-brand-subtitle">Community</span>
      </span>
    </button>
  )
}

function LoginButton({ onClick }) {
  return (
    <button onClick={onClick} className="nav-login-premium">
      Se connecter
    </button>
  )
}

function UserMenu({ displayName, avatarUrl, onSignOut }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const initials = (displayName || 'BC').slice(0, 2).toUpperCase()

  useEffect(() => {
    const close = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }

    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={ref} className="nav-user-menu">
      <button onClick={() => setOpen((value) => !value)} className={open ? 'nav-user-button open' : 'nav-user-button'}>
        <span className="nav-user-avatar">
          {avatarUrl ? <img src={avatarUrl} alt={displayName} /> : initials}
        </span>
        <span className="nav-user-copy">
          <span className="nav-user-name">{displayName}</span>
          <span className="nav-user-rank">Equipage</span>
        </span>
        <span className="nav-user-caret" />
      </button>

      {open && (
        <div className="nav-user-dropdown">
          <div className="nav-user-header">
            <strong>{displayName}</strong>
            <span><i /> Connecte</span>
          </div>
          {[
            { label: 'Wiki', path: '/wiki' },
            { label: 'Theories', path: '/theories' },
            { label: 'Arbre 3D', action: 'tree' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setOpen(false)
                if (item.action) document.dispatchEvent(new CustomEvent(`open-${item.action}`))
                else navigate(item.path)
              }}
              className="nav-user-row"
            >
              {item.label}
            </button>
          ))}
          <button onClick={() => { setOpen(false); onSignOut() }} className="nav-user-row danger">
            Deconnexion
          </button>
        </div>
      )}
    </div>
  )
}

function DesktopNavLink({ link, active, locked, onClick }) {
  const content = (
    <>
      <span>{link.label}</span>
      {link.live && <span className="nav-live-inline"><i /> Live</span>}
      {locked && <span className="nav-lock"><LockIcon /></span>}
    </>
  )

  if (link.isRoute) {
    return <Link to={link.href} className={active ? 'nav-link-premium active' : 'nav-link-premium'}>{content}</Link>
  }

  return <a href={link.href} onClick={link.action ? onClick : undefined} className="nav-link-premium">{content}</a>
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [about, setAbout] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { isAuthenticated, signOut, displayName, avatarUrl } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const open = () => setAuthOpen(true)
    document.addEventListener('open-auth-modal', open)
    return () => document.removeEventListener('open-auth-modal', open)
  }, [])

  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > 42))
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    window.addEventListener('scroll', close, { once: true, passive: true })
    return () => window.removeEventListener('scroll', close)
  }, [menuOpen])

  function handleNavClick(link, event) {
    if (link.action === 'anime-hub') openAnimeHub(event)
    if (link.action === 'encyclopedie') openEncyclopedie(event)
    if (link.action === 'tree') openTree(event)
    setMenuOpen(false)
  }

  function goHome() {
    setMenuOpen(false)
    navigate('/')
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  return (
    <>
      <nav className={scrolled ? 'navbar-premium navbar-premium-scrolled' : 'navbar-premium'}>
        <div className="nav-shell-premium">
          <BrandMark onClick={goHome} />

          <div className="nav-center-premium hide-mobile">
            {NAV_LINKS.map((link) => (
              <DesktopNavLink
                key={link.label}
                link={link}
                active={pathname === link.href}
                locked={link.gated && !isAuthenticated}
                onClick={(event) => handleNavClick(link, event)}
              />
            ))}
          </div>

          <div className="nav-actions-premium">
            <div className="nav-socials-premium hide-mobile">
              {SOCIALS.map((social) => (
                <a key={social.href} href={social.href} target="_blank" rel="noopener noreferrer" className="nav-social-premium">
                  {social.icon}
                </a>
              ))}
            </div>
            <span className="nav-separator-premium hide-mobile" />
            <div className="hide-mobile">
              {isAuthenticated
                ? <UserMenu displayName={displayName} avatarUrl={avatarUrl} onSignOut={signOut} />
                : <LoginButton onClick={() => setAuthOpen(true)} />
              }
            </div>
            {isAuthenticated && (
              <div className="nav-mobile-account">
                <UserMenu displayName={displayName} avatarUrl={avatarUrl} onSignOut={signOut} />
              </div>
            )}
            <button className={menuOpen ? 'nav-menu-button show-mobile open' : 'nav-menu-button show-mobile'} onClick={() => setMenuOpen((value) => !value)} aria-label="Menu">
              <span />
              <span />
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} className="nav-mobile-backdrop" />
          <div className="nav-mobile-drawer">
            <div className="nav-mobile-links">
              {NAV_LINKS.map((link) => (
                link.isRoute ? (
                  <Link key={link.label} to={link.href} onClick={() => setMenuOpen(false)} className="nav-mobile-link">
                    <span>{link.label}</span>
                    {link.live && <span className="nav-live-inline"><i /> Live</span>}
                  </Link>
                ) : (
                  <a key={link.label} href={link.href} onClick={link.action ? (event) => handleNavClick(link, event) : () => setMenuOpen(false)} className="nav-mobile-link">
                    <span>{link.label}</span>
                    <span className="nav-mobile-meta">
                      {link.live && <span className="nav-live-inline"><i /> Live</span>}
                      {link.gated && !isAuthenticated && <span className="nav-lock"><LockIcon /></span>}
                    </span>
                  </a>
                )
              ))}
            </div>
            <div className="nav-mobile-footer">
              {SOCIALS.map((social) => (
                <a key={social.href} href={social.href} target="_blank" rel="noopener noreferrer" className="nav-mobile-social">
                  {social.icon}
                </a>
              ))}
              <span className="nav-mobile-spacer" />
              {isAuthenticated
                ? <button onClick={() => { setMenuOpen(false); signOut() }} className="nav-mobile-logout">Deconnexion</button>
                : <LoginButton onClick={() => { setMenuOpen(false); setAuthOpen(true) }} />
              }
            </div>
          </div>
        </>
      )}

      {about && <AboutModal onClose={() => setAbout(false)} />}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  )
}
