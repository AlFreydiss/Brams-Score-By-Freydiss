import { Link } from 'react-router-dom'
import { Anchor, BarChart3, Bookmark, Compass, Flame, Hash, Swords, Trophy, Users } from 'lucide-react'

const QUICK_LINKS = [
  { to: '/fil/signets', icon: Bookmark, label: 'Mes signets' },
  { to: '/', icon: Trophy, label: 'Classement' },
  { to: '/equipage', icon: Anchor, label: 'Équipages' },
  { to: '/tier-list', icon: BarChart3, label: 'Tier List' },
  { to: '/tournoi', icon: Swords, label: 'Tournoi' },
  { to: '/undercover', icon: Compass, label: 'Undercover' },
]

export default function FeedRail({ trends = [], activeAuthors = [] }) {
  return (
    <>
      <section className="feed-card">
        <div className="feed-card-title">Bienvenue dans Brams Network</div>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.58)', fontSize: 13, lineHeight: 1.65 }}>
          Le fil centralise les théories, fan arts, débats, reposts et réactions de la communauté.
        </p>
      </section>

      <section className="feed-card">
        <div className="feed-kicker">Tendances</div>
        {trends.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, lineHeight: 1.5 }}>Aucun hashtag actif sur les posts chargés.</div>
        ) : (
          <div className="feed-nav-list">
            {trends.map(t => (
              <Link key={t.tag} to={`/fil/recherche?q=${encodeURIComponent(t.tag)}`} className="feed-nav-link">
                <Hash size={16} />
                <span style={{ flex: 1 }}>{t.tag.replace(/^#/, '')}</span>
                <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12 }}>{t.count}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="feed-card">
        <div className="feed-kicker">Membres actifs</div>
        {activeAuthors.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13 }}>Aucune activité récente.</div>
        ) : (
          <div className="feed-nav-list">
            {activeAuthors.map(a => (
              <div key={a.name} className="feed-nav-link" style={{ cursor: 'default' }}>
                <Users size={16} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12 }}>{a.count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

    </>
  )
}
