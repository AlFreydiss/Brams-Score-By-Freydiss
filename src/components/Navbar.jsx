import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import AboutModal from './AboutModal.jsx'
import AuthModal from './AuthModal.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { isStaff } from '../lib/roles.js'
import { useSocial } from '../contexts/SocialContext.jsx'
import NotificationBell from './social/NotificationBell.jsx'
import { track } from '../lib/analytics.js'

const NAV_LINKS = [
  { label: 'Rangs',           href: '#rangs',      action: null,           gated: false, isRoute: false },
  { label: 'Classement',      href: '#classement', action: null,           gated: false, isRoute: false },
  { label: 'Le Fil',          href: '/fil',        action: null,           gated: false, isRoute: true  },
  { label: '🎮 Jeux',         href: '/jeux',       action: null,           gated: false, isRoute: true  },
  { label: 'Blind Test',      href: '/blind-test', action: null,           gated: false, isRoute: true  },
  { label: 'Tournoi',         href: '/tournoi',    action: null,           gated: false, isRoute: true  },
  { label: '🔮 Akinator',     href: '/akinator',   action: null,           gated: false, isRoute: true  },
  { label: 'Tier List',       href: '/tier-list',   action: null,           gated: false, isRoute: true  },
  { label: '🍥 Animés & Scans', href: '#',          action: 'anime-hub',    gated: false, isRoute: false },
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
  { label: 'Twitch', href: 'https://www.twitch.tv/bouledog_', icon: <TwitchIcon /> },
  { label: 'YouTube', href: 'https://www.youtube.com/@BouleDogg/featured', icon: <YouTubeIcon /> },
  { label: 'TikTok', href: 'https://www.tiktok.com/@bouledogg', icon: <TikTokIcon /> },
]

function SocialLinks({ mobile = false }) {
  return (
    <div className={mobile ? 'nav-mobile-socials' : 'nav-socials-premium'}>
      {SOCIALS.map((social) => (
        <a
          key={social.href}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          className={mobile ? 'nav-mobile-social' : 'nav-social-premium'}
          aria-label={social.label}
        >
          {social.icon}
        </a>
      ))}
    </div>
  )
}

function BrandMark({ onClick }) {
  // Vrai lien <a href="/"> (et plus un <button>) → glissable vers un nouvel onglet,
  // clic-molette, "ouvrir dans un nouvel onglet". onClick garde la nav SPA + ferme les menus.
  return (
    <Link to="/" onClick={onClick} className="nav-brand-premium" aria-label="Accueil Brams Community" style={{ gap: 0, textDecoration: 'none' }}>
      <span style={{ fontSize: 22, marginRight: 8, opacity: 0.9 }}>☠</span>
      <span className="nav-brand-title" style={{ fontSize: 18, letterSpacing: '.01em', fontWeight: 800 }}>Brams</span>
    </Link>
  )
}

const LEETCHI_URL = 'https://www.leetchi.com/fr/c/brams-score-by-freydiss-1073815?utm_source=copylink&utm_medium=social_sharing'


function SoutenirButton() {
  return (
    <Link
      to="/soutenir"
      className="nav-soutenir-btn"
      aria-label="Soutenir le projet"
      onClick={() => track('soutien_click')}
    >
      <span style={{ fontSize: 13 }}>💛</span>
      Soutenir
    </Link>
  )
}

function LoginButton({ onClick }) {
  return (
    <button onClick={onClick} className="nav-login-premium">
      Se connecter
    </button>
  )
}

// Accès boutique — pastille or sobre avec un petit logo sac, hover invitant.
function BoutiqueButton() {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate('/boutique')}
      aria-label="Boutique" title="Boutique — fonds d'opening & récompenses"
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8, height: 38, padding: '0 15px',
        borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 800, letterSpacing: '.01em',
        color: '#7fe6a8', background: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(52,211,153,0.05))',
        border: '1px solid rgba(52,211,153,0.32)', transition: 'box-shadow .2s, transform .15s, background .2s, border-color .2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 22px rgba(52,211,153,0.22)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(52,211,153,0.26), rgba(52,211,153,0.10))'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.5)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(52,211,153,0.05))'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.32)' }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      <span className="hide-mobile">Boutique</span>
    </button>
  )
}

function CountBadge({ count, color = '#d4a017' }) {
  if (!count) return null
  return (
    <span style={{
      position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, padding: '0 4px',
      borderRadius: 9, background: color, color: '#0b0c0e', fontSize: 10, fontWeight: 800,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
    }}>
      {count > 9 ? '9+' : count}
    </span>
  )
}

function MessagesButton() {
  const navigate = useNavigate()
  const { counts } = useSocial()
  const total = (counts.messages || 0)
  return (
    <button
      onClick={() => navigate('/messages')}
      aria-label="Messages"
      style={{
        position: 'relative', width: 38, height: 38, borderRadius: 10, cursor: 'pointer',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.75)', fontSize: 16, display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      💬
      <CountBadge count={total} />
    </button>
  )
}

function UserMenu({ displayName, avatarUrl, discordId, berryCount, staff, onSignOut }) {
  const navigate = useNavigate()
  const { counts } = useSocial()
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
          <span className="nav-user-rank">{berryCount != null ? `${Number(berryCount).toLocaleString('fr-FR')} berries` : 'Brams Score'}</span>
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
            { label: '⚔ Mon Profil',  path: discordId ? `/u/${discordId}` : null },
            { label: '💬 Messages',    path: '/messages', badge: counts.messages },
            { label: '👥 Amis',        path: '/amis',     badge: counts.friend_requests },
          ].filter(item => item.path || item.action).map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setOpen(false)
                if (item.action) document.dispatchEvent(new CustomEvent(`open-${item.action}`))
                else navigate(item.path)
              }}
              className="nav-user-row"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ background: '#d4a017', color: '#0b0c0e', fontSize: 10, fontWeight: 800, borderRadius: 9, padding: '1px 6px' }}>
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </button>
          ))}
          {staff && (
            <button
              onClick={() => { setOpen(false); navigate('/staff') }}
              className="nav-user-row"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#e7c878' }}
            >
              <span>🛡 Staff Panel</span>
              <span style={{ background: 'rgba(212,160,23,0.15)', color: '#e7c878', border: '1px solid rgba(212,160,23,0.35)', fontSize: 9.5, fontWeight: 800, borderRadius: 6, padding: '1px 6px', letterSpacing: '.04em' }}>ADMIN</span>
            </button>
          )}
          <button onClick={() => { setOpen(false); onSignOut() }} className="nav-user-row danger">
            Déconnexion
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
      {locked && <span className="nav-lock"><LockIcon /></span>}
    </>
  )

  if (link.isRoute) {
    return <Link to={link.href} className={active ? 'nav-link-premium active' : 'nav-link-premium'}>{content}</Link>
  }

  return <a href={link.href} onClick={onClick} className={active ? 'nav-link-premium active' : 'nav-link-premium'}>{content}</a>
}

export default function Navbar({ forceScrolled = false }) {
  const [scrolled, setScrolled] = useState(false)
  const [about, setAbout] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { isAuthenticated, signOut, displayName, avatarUrl, discordId, berryCount, userId } = useAuth()
  const isStaffUser = isAuthenticated && isStaff(discordId, userId)
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
    if (link.action === 'anime-hub') { openAnimeHub(event); setMenuOpen(false); return }
    if (link.action === 'encyclopedie') { openEncyclopedie(event); setMenuOpen(false); return }
    if (link.action === 'tree') { openTree(event); setMenuOpen(false); return }

    if (link.href?.startsWith('#')) {
      event?.preventDefault()
      const targetId = link.href.slice(1)
      if (pathname !== '/') {
        navigate('/')
        setTimeout(() => {
          document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })
        }, 350)
      } else {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })
      }
    }

    setMenuOpen(false)
  }

  function goHome() {
    setMenuOpen(false)
    navigate('/')
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  function isNavActive(link) {
    if (link.action === 'anime-hub') return pathname === '/scans' || pathname === '/animes-scan' || pathname.startsWith('/animes-scan/')
    return pathname === link.href
  }

  return (
    <>
      <nav className={(scrolled || forceScrolled) ? 'navbar-premium navbar-premium-scrolled' : 'navbar-premium'}>
        <div className="nav-shell-premium">
          <div className="nav-zone-brand">
            <BrandMark onClick={goHome} />
          </div>

          <div className="nav-zone-center hide-mobile" aria-label="Navigation principale">
            {NAV_LINKS.map((link) => (
              <DesktopNavLink
                key={link.label}
                link={link}
                active={isNavActive(link)}
                locked={link.gated && !isAuthenticated}
                onClick={(event) => handleNavClick(link, event)}
              />
            ))}
          </div>

          <div className="nav-zone-status hide-mobile">
            <BoutiqueButton />
            <SoutenirButton />
            {isAuthenticated && <NotificationBell />}
            {isAuthenticated && <MessagesButton />}
            <SocialLinks />
          </div>

          <div className="nav-zone-user">
            <div className="hide-mobile">
              {isAuthenticated
                ? <UserMenu displayName={displayName} avatarUrl={avatarUrl} discordId={discordId} berryCount={berryCount} staff={isStaffUser} onSignOut={signOut} />
                : <LoginButton onClick={() => setAuthOpen(true)} />
              }
            </div>
            {isAuthenticated && (
              <div className="nav-mobile-account">
                <UserMenu displayName={displayName} avatarUrl={avatarUrl} discordId={discordId} berryCount={berryCount} staff={isStaffUser} onSignOut={signOut} />
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
                  </Link>
                ) : (
                  <a key={link.label} href={link.href} onClick={(event) => handleNavClick(link, event)} className="nav-mobile-link">
                    <span>{link.label}</span>
                    <span className="nav-mobile-meta">
                      {link.gated && !isAuthenticated && <span className="nav-lock"><LockIcon /></span>}
                    </span>
                  </a>
                )
              ))}
            </div>
            {/* Boutique + Soutenir : accessibles sur mobile MÊME sans être connecté
                (la nav-zone-status desktop est cachée en mobile). */}
            <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0' }}>
              <button onClick={() => { setMenuOpen(false); navigate('/boutique') }}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px 8px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 800, color: '#7fe6a8', background: 'linear-gradient(135deg, rgba(52,211,153,0.16), rgba(52,211,153,0.05))', border: '1px solid rgba(52,211,153,0.32)' }}>
                🛒 Boutique
              </button>
              <button onClick={() => { track('soutien_click'); setMenuOpen(false); navigate('/soutenir') }}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px 8px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 800, color: '#e7c878', background: 'linear-gradient(135deg, rgba(212,160,23,0.16), rgba(212,160,23,0.05))', border: '1px solid rgba(212,160,23,0.32)' }}>
                💛 Soutenir
              </button>
            </div>
            <div className="nav-mobile-footer">
              <SocialLinks mobile />
              <span className="nav-mobile-spacer" />
              {isStaffUser && (
                <button onClick={() => { setMenuOpen(false); navigate('/staff') }}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, background: 'rgba(212,160,23,0.10)', border: '1px solid rgba(212,160,23,0.30)', color: '#e7c878', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🛡 Staff Panel
                </button>
              )}
              {isAuthenticated
                ? <button onClick={() => { setMenuOpen(false); signOut() }} className="nav-mobile-logout">Déconnexion</button>
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
