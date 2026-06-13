import { Link } from 'react-router-dom'
import { Flame, Hash, Users } from 'lucide-react'
import MemberSuggestions from '../social/MemberSuggestions.jsx'

// Petit en-tête de carte avec icône (façon "What's happening" de X).
function Kicker({ icon: Icon, children }) {
  return (
    <div className="feed-kicker" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <Icon size={13} style={{ color: '#d4a017' }} /> {children}
    </div>
  )
}

export default function FeedRail({ trends = [], activeAuthors = [] }) {
  return (
    <>
      {/* 1. Tendances — l'équivalent Brams du "What's happening" */}
      <section className="feed-card">
        <Kicker icon={Flame}>Tendances Brams</Kicker>
        {trends.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, lineHeight: 1.5 }}>Aucun hashtag actif sur les posts chargés.</div>
        ) : (
          <div className="feed-nav-list">
            {trends.map(t => (
              <Link key={t.tag} to={`/fil/recherche?q=${encodeURIComponent(t.tag)}`} className="feed-nav-link">
                <Hash size={16} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.tag.replace(/^#/, '')}</span>
                <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12 }}>{t.count}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 2. Qui suivre */}
      <section className="feed-card">
        <Kicker icon={Users}>Qui suivre</Kicker>
        <MemberSuggestions layout="list" limit={4} />
      </section>

      {/* 3. Membres actifs */}
      <section className="feed-card">
        <Kicker icon={Flame}>Membres actifs</Kicker>
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

      <div style={{ padding: '4px 8px 10px', color: 'rgba(255,255,255,0.26)', fontSize: 11, lineHeight: 1.6 }}>
        Brams Community · Le Fil
      </div>
    </>
  )
}
