import { useState, useEffect } from 'react'

const ANIMES = [
  {
    id: 'onepiece',
    title: 'One Piece',
    subtitle: 'Arc Elbaf · En cours',
    emoji: '🏴‍☠️',
    color: '#e0524a',
    colorDark: '#7a1f1a',
    coverImage: 'https://www.dexerto.fr/cdn-image/wp-content/uploads/sites/2/2026/04/02/luffy-one-piece-erbaf-calendrier-sortie-episodes.jpg?width=1200&quality=60&format=auto',
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
    coverImage: 'https://a.storyblok.com/f/178900/678x960/b998a75a12/30b71f52a3fcad111ddf2f84aab4dad91631262181_main.jpg/m/filters:quality(95)format(webp)',
    genres: ['Thriller', 'Mystère', 'Shōnen'],
    description: "Emma, Norman et Ray vivent dans un orphelinat idyllique… jusqu'au jour où ils découvrent une vérité qui brise tout.",
    stats: [
      { label: 'Chapitres', value: '184' },
      { label: 'Épisodes', value: '12' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '▶ Accéder',
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
    coverImage: 'https://images.squarespace-cdn.com/content/v1/5e90e8679180dd053f86571c/1607648759877-XA0OOQUYTHR5DPVRJY0K/keyvisual_notext.jpg',
    genres: ['Science-fiction', 'Aventure', 'Shōnen'],
    description: "Toute l'humanité est pétrifiée. Des millénaires plus tard, le génie Senku se réveille et décide de reconstruire la civilisation grâce à la science.",
    stats: [
      { label: 'Chapitres', value: '174' },
      { label: 'Épisodes', value: '35' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '▶ Accéder',
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
    coverImage: 'https://d28hgpri8am2if.cloudfront.net/book_images/onix/cvr9781974740819/jujutsu-kaisen-the-official-anime-guide-season-1-9781974740819_lg.jpg',
    genres: ['Action', 'Surnaturel', 'Shōnen'],
    description: "Yuji Itadori avale un doigt de Ryomen Sukuna, le roi des Fléaux. Condamné à mort, il rejoint l'École de sorcellerie de Jujutsu pour trouver les doigts restants.",
    stats: [
      { label: 'Chapitres', value: '263' },
      { label: 'Épisodes', value: '48' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '▶ Accéder',
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
    coverImage: 'https://www.manga-news.com/public/images/dvd/Kingdom-anime-saison-3-visual-1.webp',
    genres: ['Action', 'Historique', 'Seinen'],
    description: "Dans la Chine des Royaumes Combattants, Shin, un orphelin de guerre, rêve de devenir le plus grand général sous les cieux aux côtés du futur roi Ying Zheng.",
    stats: [
      { label: 'Chapitres', value: '874' },
      { label: 'Épisodes', value: '0' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '▶ Accéder',
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
    coverImage: 'https://www.manga-news.com/public/images/dvd/Attaque-des-Titans-s4-anime-visual.jpg',
    genres: ['Action', 'Drame', 'Shōnen'],
    description: "Eren Yeager découvre que les murs qui protègent l'humanité cachent un secret bien plus sombre que les Titans eux-mêmes.",
    stats: [
      { label: 'Chapitres', value: '81' },
      { label: 'Épisodes', value: '87' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '▶ Accéder',
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
    coverImage: 'https://storage.ghost.io/c/2b/7f/2b7f69fc-a243-4d2f-ae8e-db8312c6653a/content/images/size/w1200/2025/10/Demon-Slayer-en-421-c-1.png',
    genres: ['Action', 'Surnaturel', 'Shōnen'],
    description: "Tanjiro Kamado devient chasseur de démons après que sa famille est massacrée et sa sœur Nezuko transformée en démon.",
    stats: [
      { label: 'Chapitres', value: '206' },
      { label: 'Épisodes', value: '44' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '▶ Accéder',
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
    coverImage: 'https://static.wikia.nocookie.net/nanatsu-no-taizai/images/2/25/Nanatsu_no_Taizai_Anime_Fourth_Season_Poster.png/revision/latest?cb=20200805045531',
    genres: ['Action', 'Fantasy', 'Shōnen'],
    description: "La princesse Elizabeth part à la recherche des Sept Péchés Capitaux, des chevaliers légendaires bannis du royaume, pour sauver Britannia.",
    stats: [
      { label: 'Chapitres', value: '342' },
      { label: 'Épisodes', value: '100' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '▶ Accéder',
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
    coverImage: 'https://i.pinimg.com/736x/e3/9c/56/e39c564360a91e48edcd430355ee68ce.jpg',
    genres: ['Action', 'Fantasy', 'Manhwa'],
    description: "Sung Jinwoo, le chasseur le plus faible du monde, se retrouve piégé dans un donjon mortel et reçoit un mystérieux système qui lui permet de monter de rang à l'infini.",
    stats: [
      { label: 'Chapitres', value: '202' },
      { label: 'Épisodes', value: '12' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '▶ Accéder',
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
    coverImage: 'https://resizing.flixster.com/rkYW70Qo4tqbX8akxnoNX0Yf5z0=/ems.cHJkLWVtcy1hc3NldHMvbW92aWVzLzllY2IwZjMyLWVjYjMtNDAzMC1hYWViLTBjZjcxMmFmNDU1MC5wbmc=',
    genres: ['Action', 'Science-fiction', 'Shōnen'],
    description: "Après la défaite de Majin Buu, Goku continue à repousser ses limites en affrontant des adversaires venus d'autres univers.",
    stats: [
      { label: 'Chapitres', value: '101' },
      { label: 'Épisodes', value: '131' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '▶ Accéder',
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
    coverImage: 'https://img2.hulu.com/user/v3/artwork/f6451467-97a8-4ddf-9ae8-e9e4cbb53fc8?base_image_bucket_name=image_manager&base_image=bc1a1c50-6786-4cf7-ae75-75de958b64e1&size=458x687&format=webp',
    genres: ['Action', 'Fantasy', 'Shōnen'],
    description: "Asta, né sans magie dans un monde où tout le monde en a, rêve de devenir Sorcier Empereur grâce à sa ténacité et à son grimoire à cinq feuilles.",
    stats: [
      { label: 'Chapitres', value: '280' },
      { label: 'Épisodes', value: '170' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '▶ Accéder',
    badge: 'NOUVEAU',
    badgeColor: '#388e3c',
  },
  {
    id: 'mha',
    title: 'My Hero Academia',
    subtitle: 'Plus Ultra !',
    emoji: '💪',
    color: '#1e88e5',
    colorDark: '#0a2a5c',
    coverImage: 'https://upload.wikimedia.org/wikipedia/en/4/46/Boku_no_Hero_Academia_Vol.1.png',
    genres: ['Action', 'Super-héros', 'Shōnen'],
    description: "Dans un monde où 80% de la population a un Super Pouvoir, Izuku Midoriya naît sans capacité mais rêve de devenir le plus grand héros.",
    stats: [
      { label: 'Chapitres', value: '430+' },
      { label: 'Épisodes', value: '138' },
      { label: 'Statut', value: 'Terminé' },
    ],
    action: '▶ Accéder',
    badge: 'NOUVEAU',
    badgeColor: '#1e88e5',
  },
  {
    id: 'fireforce',
    title: 'Fire Force',
    subtitle: 'Enen no Shouboutai',
    emoji: '🔥',
    color: '#f4511e',
    colorDark: '#5c1208',
    coverImage: 'https://upload.wikimedia.org/wikipedia/en/a/ab/Fire_Force_volume_1.jpg',
    genres: ['Action', 'Surnaturel', 'Shōnen'],
    description: "Dans un monde où des humains s'enflamment spontanément, Shinra Kusakabe intègre la 8ème Brigade pour comprendre les mystères de la combustion spontanée.",
    stats: [
      { label: 'Chapitres', value: '304' },
      { label: 'Épisodes', value: '48' },
      { label: 'Statut', value: 'Terminé' },
    ],
    action: '▶ Accéder',
    badge: 'NOUVEAU',
    badgeColor: '#f4511e',
  },
  {
    id: 'bluelock',
    title: 'Blue Lock',
    subtitle: 'Projet égoïste',
    emoji: '⚽',
    color: '#1565c0',
    colorDark: '#071b3a',
    coverImage: 'https://upload.wikimedia.org/wikipedia/en/a/aa/Blue_Lock_Volume_1.jpg',
    genres: ['Sport', 'Compétition', 'Shōnen'],
    description: "La Fédération japonaise de football engage Ego Jinpachi pour former le meilleur attaquant du monde via un programme radical : Blue Lock.",
    stats: [
      { label: 'Chapitres', value: '280+' },
      { label: 'Épisodes', value: '24' },
      { label: 'Statut', value: 'En cours' },
    ],
    action: '▶ Accéder',
    badge: 'NOUVEAU',
    badgeColor: '#1565c0',
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
      {/* Banner — cover art ou gradient fallback */}
      <div style={{
        height: 250, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${anime.color}dd 0%, ${anime.colorDark} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {anime.coverImage ? (
          <img
            src={anime.coverImage}
            alt={anime.title}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'top center',
              opacity: hovered ? 1 : 0.88,
              transition: 'opacity 0.25s ease, transform 0.35s ease',
              transform: hovered ? 'scale(1.04)' : 'scale(1)',
            }}
          />
        ) : (
          <div style={{ fontSize: 88, filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.5))', position: 'relative', zIndex: 1, transition: 'transform 0.25s ease', transform: hovered ? 'scale(1.08)' : 'scale(1)' }}>
            {anime.emoji}
          </div>
        )}

        {/* Gradient overlay bottom pour lisibilité */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.55) 100%)', pointerEvents: 'none', zIndex: 1 }} />

        {/* Badge */}
        <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', background: `${anime.badgeColor}cc`, color: '#fff', borderRadius: 100, padding: '3px 10px', zIndex: 2, backdropFilter: 'blur(6px)' }}>
          {anime.badge}
        </div>

        {/* Titre en bas du banner sur les covers */}
        {anime.coverImage && (
          <div style={{ position: 'absolute', bottom: 14, left: 16, zIndex: 2 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: anime.color, letterSpacing: '0.06em', textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}>{anime.subtitle}</div>
          </div>
        )}
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

export default function AnimeHub({ onClose, onOpenOnepiece, onOpenTpn, onOpenDrstone, onOpenJjk, onOpenKingdom, onOpenAot, onOpenKny, onOpenNnt, onOpenSl, onOpenDbs, onOpenBc, onOpenMha, onOpenFireforce, onOpenBluelock }) {
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
    else if (id === 'mha') onOpenMha()
    else if (id === 'fireforce') onOpenFireforce()
    else if (id === 'bluelock') onOpenBluelock()
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
