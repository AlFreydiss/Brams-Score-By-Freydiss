import { useState, useEffect } from 'react'

const ANIMES = [
  {
    id: 'onepiece',
    title: 'One Piece',
    subtitle: 'Arc Elbaf · En cours',
    emoji: '🏴‍☠️',
    color: '#e0524a',
    colorDark: '#7a1f1a',
    genres: ['Aventure', 'Action', 'Shōnen'],
    description: "Monkey D. Luffy et son équipage sillonnent les mers à la recherche du légendaire trésor « One Piece » pour devenir Roi des Pirates.",
    stats: [
      { label: 'Chapitres', value: '56' },
      { label: 'Arc actuel', value: 'Elbaf' },
      { label: 'Statut', value: 'En cours' },
    ],
    action: '📖 Lire les Scans',
    badge: 'À JOUR',
    badgeColor: '#34d399',
  },
  {
    id: 'tpn',
    title: 'The Promised Neverland',
    subtitle: 'Scans & Épisodes',
    emoji: '🌿',
    color: '#6c5ce7',
    colorDark: '#2d1b8e',
    genres: ['Thriller', 'Mystère', 'Shōnen'],
    description: "Emma, Norman et Ray vivent dans un orphelinat idyllique… jusqu'au jour où ils découvrent une vérité qui brise tout.",
    stats: [
      { label: 'Chapitres', value: '184' },
      { label: 'Épisodes', value: '0' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '🌿 Accéder',
    badge: 'NOUVEAU',
    badgeColor: '#6c5ce7',
  },
  {
    id: 'drstone',
    title: 'Dr. Stone',
    subtitle: 'Science & Survie',
    emoji: '⚗️',
    color: '#00b894',
    colorDark: '#005c45',
    genres: ['Science-fiction', 'Aventure', 'Shōnen'],
    description: "Toute l'humanité est pétrifiée. Des millénaires plus tard, le génie Senku se réveille et décide de reconstruire la civilisation grâce à la science.",
    stats: [
      { label: 'Chapitres', value: '174' },
      { label: 'Épisodes', value: '0' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '⚗️ Accéder',
    badge: 'NOUVEAU',
    badgeColor: '#00b894',
  },
  {
    id: 'jjk',
    title: 'Jujutsu Kaisen',
    subtitle: 'Maléfices & Combats',
    emoji: '⚡',
    color: '#c62828',
    colorDark: '#5a0a0a',
    genres: ['Action', 'Surnaturel', 'Shōnen'],
    description: "Yuji Itadori avale un doigt de Ryomen Sukuna, le roi des Fléaux. Condamné à mort, il rejoint l'École de sorcellerie de Jujutsu pour trouver les doigts restants.",
    stats: [
      { label: 'Chapitres', value: '263' },
      { label: 'Épisodes', value: '0' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '⚡ Accéder',
    badge: 'NOUVEAU',
    badgeColor: '#c62828',
  },
  {
    id: 'kingdom',
    title: 'Kingdom',
    subtitle: 'Chine Antique · Guerre',
    emoji: '⚔️',
    color: '#c9a227',
    colorDark: '#4a3205',
    genres: ['Action', 'Historique', 'Seinen'],
    description: "Dans la Chine des Royaumes Combattants, Shin, un orphelin de guerre, rêve de devenir le plus grand général sous les cieux aux côtés du futur roi Ying Zheng.",
    stats: [
      { label: 'Chapitres', value: '874' },
      { label: 'Épisodes', value: '0' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '⚔️ Accéder',
    badge: 'NOUVEAU',
    badgeColor: '#c9a227',
  },
  {
    id: 'aot',
    title: "L'Attaque des Titans",
    subtitle: 'Titans & Liberté',
    emoji: '🗡️',
    color: '#546e7a',
    colorDark: '#1c313a',
    genres: ['Action', 'Drame', 'Shōnen'],
    description: "Eren Yeager découvre que les murs qui protègent l'humanité cachent un secret bien plus sombre que les Titans eux-mêmes.",
    stats: [
      { label: 'Chapitres', value: '81' },
      { label: 'Épisodes', value: '0' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '🗡️ Accéder',
    badge: 'NOUVEAU',
    badgeColor: '#546e7a',
  },
  {
    id: 'kny',
    title: 'Kimetsu no Yaiba',
    subtitle: 'Demon Slayer',
    emoji: '🔥',
    color: '#e85d27',
    colorDark: '#6b1f05',
    genres: ['Action', 'Surnaturel', 'Shōnen'],
    description: "Tanjiro Kamado devient chasseur de démons après que sa famille est massacrée et sa sœur Nezuko transformée en démon.",
    stats: [
      { label: 'Chapitres', value: '206' },
      { label: 'Épisodes', value: '0' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '🔥 Accéder',
    badge: 'NOUVEAU',
    badgeColor: '#e85d27',
  },
  {
    id: 'nnt',
    title: 'Nanatsu no Taizai',
    subtitle: 'Les Sept Péchés Capitaux',
    emoji: '🐗',
    color: '#8e44ad',
    colorDark: '#3d0f5a',
    genres: ['Action', 'Fantasy', 'Shōnen'],
    description: "La princesse Elizabeth part à la recherche des Sept Péchés Capitaux, des chevaliers légendaires bannis du royaume, pour sauver Britannia.",
    stats: [
      { label: 'Chapitres', value: '342' },
      { label: 'Épisodes', value: '0' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '🐗 Accéder',
    badge: 'NOUVEAU',
    badgeColor: '#8e44ad',
  },
  {
    id: 'sl',
    title: 'Solo Leveling',
    subtitle: 'Le plus faible monte de rang',
    emoji: '💎',
    color: '#1976d2',
    colorDark: '#0a2e5c',
    genres: ['Action', 'Fantasy', 'Manhwa'],
    description: "Sung Jinwoo, le chasseur le plus faible du monde, se retrouve piégé dans un donjon mortel et reçoit un mystérieux système qui lui permet de monter de rang à l'infini.",
    stats: [
      { label: 'Chapitres', value: '202' },
      { label: 'Épisodes', value: '0' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '💎 Accéder',
    badge: 'NOUVEAU',
    badgeColor: '#1976d2',
  },
  {
    id: 'dbs',
    title: 'Dragon Ball Super',
    subtitle: 'Au-delà des limites',
    emoji: '🐉',
    color: '#f57f17',
    colorDark: '#5c2e00',
    genres: ['Action', 'Science-fiction', 'Shōnen'],
    description: "Après la défaite de Majin Buu, Goku continue à repousser ses limites en affrontant des adversaires venus d'autres univers.",
    stats: [
      { label: 'Chapitres', value: '101' },
      { label: 'Épisodes', value: '0' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '🐉 Accéder',
    badge: 'NOUVEAU',
    badgeColor: '#f57f17',
  },
  {
    id: 'bc',
    title: 'Black Clover',
    subtitle: 'La magie du trèfle noir',
    emoji: '🍀',
    color: '#388e3c',
    colorDark: '#0a3d0c',
    genres: ['Action', 'Fantasy', 'Shōnen'],
    description: "Asta, né sans magie dans un monde où tout le monde en a, rêve de devenir Sorcier Empereur grâce à sa ténacité et à son grimoire à cinq feuilles.",
    stats: [
      { label: 'Chapitres', value: '280' },
      { label: 'Épisodes', value: '0' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '🍀 Accéder',
    badge: 'NOUVEAU',
    badgeColor: '#388e3c',
  },
]

function AnimeCard({ anime, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        borderRadius: 20, overflow: 'hidden',
        border: `1px solid ${hovered ? anime.color + '55' : 'rgba(255,255,255,0.07)'}`,
        background: 'rgba(18,19,22,0.9)',
        transition: 'all 0.25s ease',
        transform: hovered ? 'translateY(-8px)' : 'translateY(0)',
        boxShadow: hovered ? `0 24px 64px ${anime.color}22` : 'none',
        cursor: 'pointer',
      }}
    >
      {/* Banner gradient */}
      <div style={{
        height: 210, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${anime.color}dd 0%, ${anime.colorDark} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: `${anime.color}28`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(0,0,0,0.25)', pointerEvents: 'none' }} />

        {/* Badge */}
        <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', background: `${anime.badgeColor}22`, color: anime.badgeColor, border: `1px solid ${anime.badgeColor}44`, borderRadius: 100, padding: '3px 10px' }}>
          {anime.badge}
        </div>

        <div style={{ fontSize: 88, filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.5))', position: 'relative', zIndex: 1, transition: 'transform 0.25s ease', transform: hovered ? 'scale(1.08)' : 'scale(1)' }}>
          {anime.emoji}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '22px 24px' }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20, color: '#fff', marginBottom: 3 }}>{anime.title}</div>
          <div style={{ fontSize: 12, color: anime.color, fontWeight: 600 }}>{anime.subtitle}</div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {anime.genres.map(g => (
            <span key={g} style={{ fontSize: 11, fontWeight: 700, background: `${anime.color}18`, color: anime.color, border: `1px solid ${anime.color}33`, borderRadius: 100, padding: '2px 10px' }}>{g}</span>
          ))}
        </div>

        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, marginBottom: 18 }}>{anime.description}</p>

        <div style={{ display: 'flex', gap: 20, marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {anime.stats.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.06em', marginTop: 1 }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        <button style={{
          width: '100%', padding: '13px', borderRadius: 11, border: 'none',
          background: hovered ? anime.color : `${anime.color}22`,
          color: hovered ? '#fff' : anime.color,
          fontWeight: 700, fontSize: 14, cursor: 'pointer',
          transition: 'all 0.2s',
          fontFamily: 'var(--body)',
          boxShadow: hovered ? `0 6px 20px ${anime.color}44` : 'none',
        }}>
          {anime.action}
        </button>
      </div>
    </div>
  )
}

function ComingSoonCard() {
  return (
    <div style={{
      borderRadius: 20, overflow: 'hidden',
      border: '1px dashed rgba(255,255,255,0.08)',
      background: 'rgba(255,255,255,0.015)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 420, padding: 40, textAlign: 'center',
    }}>
      <div style={{ fontSize: 52, marginBottom: 18, opacity: 0.2 }}>+</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.2)', marginBottom: 10 }}>D'autres animes bientôt</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.1)', lineHeight: 1.6 }}>Naruto · Dragon Ball<br />Bleach · Demon Slayer…</div>
    </div>
  )
}

export default function AnimeHub({ onClose, onOpenOnepiece, onOpenTpn, onOpenDrstone, onOpenJjk, onOpenKingdom, onOpenAot, onOpenKny, onOpenNnt, onOpenSl, onOpenDbs, onOpenBc }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleClick = (id) => {
    if (id === 'onepiece') onOpenOnepiece()
    else if (id === 'tpn') onOpenTpn()
    else if (id === 'drstone') onOpenDrstone()
    else if (id === 'jjk') onOpenJjk()
    else if (id === 'kingdom') onOpenKingdom()
    else if (id === 'aot') onOpenAot()
    else if (id === 'kny') onOpenKny()
    else if (id === 'nnt') onOpenNnt()
    else if (id === 'sl') onOpenSl()
    else if (id === 'dbs') onOpenDbs()
    else if (id === 'bc') onOpenBc()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--bg)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.18s ease-out' }}>

      {/* Header */}
      <div style={{ flexShrink: 0, padding: '0 24px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(17,18,20,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20, color: '#fff' }}>🎌 Hub des Animés</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>Sélectionne un anime pour commencer</div>
        </div>
        <button
          onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 9, color: '#fff', cursor: 'pointer', padding: '8px 16px', fontSize: 13, fontWeight: 700, transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        >
          ← Retour
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '48px 24px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>

          {/* Intro */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 'clamp(22px, 4vw, 36px)', color: '#fff', marginBottom: 12 }}>
              Ton espace manga & anime
            </h2>
            <p style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 500, margin: '0 auto' }}>
              Lis les scans, regarde les épisodes, suis ta progression — tout au même endroit.
            </p>
          </div>

          {/* Cards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {ANIMES.map(anime => (
              <AnimeCard key={anime.id} anime={anime} onClick={() => handleClick(anime.id)} />
            ))}
            <ComingSoonCard />
          </div>
        </div>
      </div>
    </div>
  )
}
