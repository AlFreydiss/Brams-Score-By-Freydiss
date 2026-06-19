import { CINE, CineRule } from './home/cine.jsx'

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

const LINK = { padding: '6px 12px', borderRadius: 8, fontSize: 13, color: CINE.muted, transition: 'color .15s, background .15s', textDecoration: 'none', whiteSpace: 'nowrap' }

export default function Footer() {
  const onEnter = e => { e.target.style.color = CINE.gold; e.target.style.background = 'rgba(191,164,106,0.06)' }
  const onLeave = e => { e.target.style.color = CINE.muted; e.target.style.background = 'transparent' }

  return (
    <footer style={{ background: CINE.bg, paddingTop: 1 }}>
      <CineRule style={{ maxWidth: 'none' }} />
      <div style={{
        padding: 'clamp(40px, 6vw, 56px) clamp(20px, 5vw, 72px) 36px',
      }}>
        <div style={{ maxWidth: CINE.maxW, margin: '0 auto' }}>

          {/* Ligne principale — pleine largeur, colonnes réparties */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32, marginBottom: 32 }}>

            {/* Logo + baseline */}
            <div style={{ minWidth: 220, flex: '1 1 280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>🏴‍☠️</span>
                <span style={{ fontFamily: CINE.title, fontWeight: 700, color: CINE.ink, fontSize: 18, letterSpacing: '-0.01em' }}>Brams Community</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: CINE.inkSoft, lineHeight: 1.6, maxWidth: 320 }}>
                L'aventure One Piece en communauté. Rangs vocaux, classement et bot maison.
              </p>
            </div>

            {/* Liens internes */}
            <div style={{ flex: '0 1 auto' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: CINE.gold, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 14, fontFamily: CINE.title }}>Navigation</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                {INTERNAL.map(l => (
                  <a key={l.label} href={l.href} style={{ ...LINK, marginLeft: -12 }}
                    onMouseEnter={onEnter} onMouseLeave={onLeave}
                  >{l.label}</a>
                ))}
              </div>
            </div>

            {/* Liens sociaux */}
            <div style={{ flex: '0 1 auto' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: CINE.gold, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 14, fontFamily: CINE.title }}>Réseaux</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                {SOCIAL.map(l => (
                  <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" style={{ ...LINK, marginLeft: -12 }}
                    onMouseEnter={onEnter} onMouseLeave={onLeave}
                  >{l.label}</a>
                ))}
              </div>
            </div>
          </div>

          {/* Bas de page */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 24, borderTop: `1px solid ${CINE.hair}` }}>
            <span style={{ fontSize: 11.5, color: CINE.faint, letterSpacing: '.04em' }}>
              Made with ⚓ by <strong style={{ color: CINE.gold }}>Freydiss</strong> · © {new Date().getFullYear()} Brams Community
            </span>
            <span style={{ fontSize: 11.5, color: CINE.faint, letterSpacing: '.04em' }}>
              Tous droits réservés
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
