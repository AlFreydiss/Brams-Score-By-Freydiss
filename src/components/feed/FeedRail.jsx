import { Link } from 'react-router-dom'
import { T } from '../social/socialStyles.js'

const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }
const linkRow = { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, color: T.text, textDecoration: 'none', fontSize: 14, fontWeight: 600, transition: 'background .12s' }

// Volet latéral droit du Fil : présentation + stat réelle + liens rapides.
export default function FeedRail({ stats }) {
  return (
    <div style={{ position: 'sticky', top: 16 }}>
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 900, color: T.text, marginBottom: 8 }}>Bienvenue sur Le Fil 🏴‍☠️</div>
        <p style={{ margin: 0, fontSize: 13, color: T.textDim, lineHeight: 1.65 }}>
          Le réseau de la communauté Brams. Partage tes théories, tes hot takes, tes fan arts.
          Like, réponds, repost — et reste respectueux entre nakamas.
        </p>
      </div>

      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: T.textFaint, marginBottom: 10 }}>Le Fil en chiffres</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: T.gold, fontVariantNumeric: 'tabular-nums' }}>{(stats?.posts ?? 0).toLocaleString('fr-FR')}</span>
          <span style={{ fontSize: 13, color: T.textDim, fontWeight: 600 }}>post{(stats?.posts ?? 0) > 1 ? 's' : ''} publié{(stats?.posts ?? 0) > 1 ? 's' : ''}</span>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: T.textFaint, marginBottom: 6 }}>Explorer</div>
        {[
          { to: '/', icon: '🏆', label: 'Classement' },
          { to: '/equipage', icon: '⚓', label: 'Équipages' },
          { to: '/tier-list', icon: '📊', label: 'Tier List' },
          { to: '/tournoi', icon: '⚔️', label: 'Tournoi' },
        ].map(l => (
          <Link key={l.to} to={l.to} style={linkRow}
            onMouseEnter={e => e.currentTarget.style.background = T.surface2}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span style={{ fontSize: 16 }}>{l.icon}</span>{l.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
