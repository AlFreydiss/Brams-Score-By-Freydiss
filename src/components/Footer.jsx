const INTERNAL = [
  { label: 'Rangs',      href: '#rangs' },
  { label: 'Classement', href: '#classement' },
  { label: 'Contact',    href: '#contact' },
  { label: 'Soutenir',   href: '#soutenir' },
]

const SOCIAL = [
  { label: 'Discord', href: 'https://discord.gg/4FgezPpnGU' },
  { label: 'Twitch',  href: 'https://www.twitch.tv/bouledog_' },
  { label: 'YouTube', href: 'https://www.youtube.com/@BouleDogg/featured' },
  { label: 'TikTok',  href: 'https://www.tiktok.com/@bouledogg' },
]

const LINK = { padding: '4px 10px', borderRadius: 6, fontSize: 12, color: 'rgba(255,255,255,0.32)', transition: 'color .15s', textDecoration: 'none', whiteSpace: 'nowrap' }

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(255,255,255,.06)',
      padding: '32px 28px',
      background: 'rgba(14,14,16,.6)',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>

        {/* Ligne principale */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🏴‍☠️</span>
            <span style={{ fontFamily: 'var(--display)', fontWeight: 800, color: '#fff', fontSize: 16 }}>Brams Community</span>
          </div>

          {/* Liens internes */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {INTERNAL.map(l => (
              <a key={l.label} href={l.href} style={LINK}
                onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.75)'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.32)'}
              >{l.label}</a>
            ))}
          </div>

          {/* Liens sociaux */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {SOCIAL.map(l => (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" style={LINK}
                onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.75)'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.32)'}
              >{l.label}</a>
            ))}
          </div>
        </div>

        {/* Bas de page */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', letterSpacing: '.04em' }}>
            Made with ⚓ by <strong style={{ color: 'rgba(255,255,255,0.35)' }}>Freydiss</strong> · © {new Date().getFullYear()} Brams Community
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', letterSpacing: '.04em' }}>
            Tous droits réservés
          </span>
        </div>
      </div>
    </footer>
  )
}
