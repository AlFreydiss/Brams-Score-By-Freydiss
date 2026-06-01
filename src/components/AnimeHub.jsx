import { useState, useEffect, useMemo } from 'react'

const ANIMES = [
  {
    id: 'onepiece',
    title: 'One Piece',
    subtitle: 'Arc Elbaf · En cours',
    emoji: '🏴‍☠️',
    color: '#e0524a',
    colorDark: '#7a1f1a',
    coverImage: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/op-egghead-thumbnails/E1086.jpg',
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
      { label: 'Épisodes', value: '47 + film' },
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
      { label: 'Épisodes', value: '38' },
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
    coverPosition: 'center center',
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
    id: 'violet-evergarden',
    title: 'Violet Evergarden',
    subtitle: 'VF & VOSTFR',
    emoji: '✉',
    color: '#8b7cff',
    colorDark: '#30255f',
    coverImage: '/anime-covers/violet.jpg',
    coverPosition: 'center center',
    genres: ['Drame', 'Slice of Life', 'Emotion'],
    description: "Violet, ancienne soldate, devient Auto Memory Doll pour comprendre les sentiments humains et le sens des mots qu'elle a recus.",
    stats: [
      { label: 'Chapitres', value: '0' },
      { label: 'Episodes', value: '13 + OAV' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '▶ Acceder',
    badge: 'NOUVEAU',
    badgeColor: '#8b7cff',
  },
  {
    id: 'vivy',
    title: "Vivy: Fluorite Eye's Song",
    subtitle: 'IA · Chant · 100 ans',
    emoji: '🎵',
    color: '#00d4ff',
    colorDark: '#003d52',
    coverImage: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/vivy/key-visual.jpg',
    coverPosition: 'center top',
    genres: ['Science-fiction', 'Action', 'Drame'],
    description: "Vivy est une IA chanteuse chargée d'une mission de 100 ans pour empêcher une guerre apocalyptique entre humains et machines.",
    stats: [
      { label: 'Épisodes', value: '13' },
      { label: 'Studio', value: 'WIT' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '▶ Regarder',
    badge: 'DISPONIBLE',
    badgeColor: '#00d4ff',
  },
  {
    id: 'love-prism',
    title: 'Love Through A Prism',
    subtitle: 'Saison 1 MULTi',
    emoji: '♪',
    color: '#ec4899',
    colorDark: '#5b1038',
    coverImage: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/love-prism-hls/S01E001/thumb.jpg',
    coverPosition: 'center center',
    genres: ['Romance', 'Musique', 'Drame'],
    description: 'Saison 1 en VF et japonais, avec sous-titres selon les pistes disponibles.',
    stats: [
      { label: 'Episodes', value: '20' },
      { label: 'Audio', value: 'VF + VO' },
      { label: 'Statut', value: 'Disponible' },
    ],
    action: '▶ Regarder',
    badge: 'NOUVEAU',
    badgeColor: '#ec4899',
  },
  {
    id: 'carole-tuesday',
    title: 'Carole & Tuesday',
    subtitle: 'Japonais + sous-titres',
    emoji: '♫',
    color: '#14b8a6',
    colorDark: '#064e46',
    coverImage: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/carole-tuesday-hls/S01E001/thumb.jpg',
    coverPosition: 'center center',
    genres: ['Musique', 'Drame', 'Science-fiction'],
    description: 'Carole et Tuesday poursuivent leur reve musical sur Mars. Lecture en japonais avec sous-titres francais et anglais.',
    stats: [
      { label: 'Episodes', value: '24' },
      { label: 'Audio', value: 'Japonais' },
      { label: 'Sous-titres', value: 'FR + EN' },
    ],
    action: '▶ Regarder',
    badge: 'NOUVEAU',
    badgeColor: '#14b8a6',
  },
  {
    id: 'bc',
    title: 'Black Clover',
    subtitle: 'La magie du trèfle noir',
    emoji: '🍀',
    color: '#388e3c',
    colorDark: '#0a3d0c',
    coverImage: 'https://img2.hulu.com/user/v3/artwork/f6451467-97a8-4ddf-9ae8-e9e4cbb53fc8?base_image_bucket_name=image_manager&base_image=bc1a1c50-6786-4cf7-ae75-75de958b64e1&size=458x687&format=webp',
    coverPosition: 'center center',
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
    coverImage: '/anime-covers/mha-dark-deku.webp',
    coverPosition: 'center center',
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
    coverImage: '/anime-covers/fire-force.avif',
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
    coverImage: '/anime-covers/blue-lock-isagi.webp',
    coverPosition: 'center center',
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

const SEARCH_ALIASES = {
  onepiece: ['op', 'one piece', 'luffy', 'mugiwara', 'elbaf', 'pirate'],
  tpn: ['promised neverland', 'the promised neverland', 'neverland', 'emma', 'norman', 'ray'],
  drstone: ['dr stone', 'dr. stone', 'doctor stone', 'senku', 'science'],
  jjk: ['jujutsu', 'jujutsu kaisen', 'sukuna', 'itadori', 'gojo'],
  kingdom: ['shin', 'chine', 'guerre', 'royaumes combattants'],
  aot: ['aot', 'snk', 'shingeki', 'shingeki no kyojin', 'attaque des titans', 'attaque des titan', 'attack on titan', 'eren', 'mikasa', 'levi'],
  kny: ['kny', 'demon slayer', 'kimetsu', 'kimetsu no yaiba', 'tanjiro', 'nezuko'],
  nnt: ['nnt', 'nanatsu', 'nanatsu no taizai', 'seven deadly sins', '7ds', 'meliodas'],
  sl: ['solo leveling', 'sung jinwoo', 'jinwoo', 'manhwa'],
  dbs: ['dbs', 'dragon ball', 'dragon ball super', 'goku', 'vegeta'],
  'violet-evergarden': ['violet', 'violet evergarden', 'vostfr', 'vf', 'auto memory doll', 'doll'],
  vivy: ['vivy', 'fluorite', "fluorite eye's song", 'ia', 'matsumoto', 'wit studio'],
  'love-prism': ['love through a prism', 'prism', 'romance', 'musique'],
  'carole-tuesday': ['carole', 'tuesday', 'carole and tuesday', 'carole & tuesday', 'ct', 'music'],
  bc: ['black clover', 'asta', 'yuno', 'trefle', 'magie'],
  mha: ['mha', 'my hero academia', 'boku no hero academia', 'bnha', 'deku', 'izuku'],
  fireforce: ['fire force', 'enen no shouboutai', 'shouboutai', 'shinra'],
  bluelock: ['blue lock', 'bluelock', 'football', 'isagi', 'ego'],
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function searchableText(anime) {
  return normalizeText([
    anime.id,
    anime.title,
    anime.subtitle,
    anime.description,
    ...(anime.genres || []),
    ...(SEARCH_ALIASES[anime.id] || []),
  ].join(' '))
}

const AH_CSS = `
  @keyframes ahFadeUp  { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:none } }
  @keyframes ahTwinkle { 0%,100% { opacity:.12 } 50% { opacity:.65 } }
  @keyframes ahScan    { 0% { top:-2px } 100% { top:100% } }
  @keyframes ahDrift   { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-12px) } }
  @keyframes ahPulse   { 0%,100% { opacity:.06 } 50% { opacity:.14 } }
  @keyframes ahMarqueeL { from { transform:translateX(0) } to { transform:translateX(-50%) } }
  @keyframes ahMarqueeR { from { transform:translateX(-50%) } to { transform:translateX(0) } }
  .ah-mq-l { animation: ahMarqueeL var(--mq-dur, 60s) linear infinite; will-change:transform; }
  .ah-mq-r { animation: ahMarqueeR var(--mq-dur, 66s) linear infinite; will-change:transform; }
  @media (prefers-reduced-motion: reduce) {
    .ah-mq-l, .ah-mq-r { animation: none !important; }
  }
`

// Ambient colored orbs drift in background
const ORB_COLORS = ['#e0524a', '#6c5ce7', '#00b894', '#c62828', '#c9a227', '#1976d2', '#8e44ad', '#f57f17']

function AHStars() {
  const stars = useMemo(() => Array.from({ length: 55 }, (_, i) => ({
    x:    (i * 37.7 + 9)  % 98,
    y:    (i * 43.1 + 17) % 95,
    size: i % 8 === 0 ? 2.5 : i % 3 === 0 ? 1.6 : 1,
    dur:  3.2 + (i * 0.27) % 4.8,
    del:  (i * 0.23) % 7,
    col:  i % 5 === 0 ? ORB_COLORS[i % ORB_COLORS.length] : null,
  })), [])

  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position:'absolute', left:`${s.x}%`, top:`${s.y}%`,
          width:s.size, height:s.size, borderRadius:'50%',
          background: s.col ?? 'rgba(255,255,255,0.55)',
          animation:`ahTwinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

function AHScanLine() {
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:1, overflow:'hidden' }}>
      <div style={{
        position:'absolute', left:0, right:0, height:2,
        background:'linear-gradient(90deg, transparent, rgba(224,82,74,.06), rgba(224,82,74,.14), rgba(224,82,74,.06), transparent)',
        animation:'ahScan 18s linear infinite',
      }} />
    </div>
  )
}

function AmbientOrbs() {
  const orbs = useMemo(() => [
    { x:10,  y:20, size:320, color:'rgba(224,82,74,0.04)',  dur:18 },
    { x:75,  y:60, size:280, color:'rgba(108,92,231,0.04)', dur:22 },
    { x:45,  y:80, size:380, color:'rgba(0,184,148,0.03)',  dur:26 },
    { x:88,  y:10, size:240, color:'rgba(201,162,39,0.04)', dur:20 },
  ], [])
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
      {orbs.map((o, i) => (
        <div key={i} style={{
          position:'absolute',
          left:`${o.x}%`, top:`${o.y}%`,
          width:o.size, height:o.size,
          borderRadius:'50%',
          background:`radial-gradient(circle, ${o.color}, transparent 70%)`,
          transform:'translate(-50%, -50%)',
          animation:`ahDrift ${o.dur}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

function AnimeMarqueeCard({ anime, onClick }) {
  const [hov, setHov] = useState(false)
  const c = anime.color
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        flexShrink:0, width:188, height:268, borderRadius:14, overflow:'hidden',
        position:'relative', cursor:'pointer',
        background:`linear-gradient(165deg, ${anime.colorDark} 0%, #101114 100%)`,
        border:`1px solid ${hov ? c+'4a' : 'rgba(255,255,255,0.06)'}`,
        transform: hov ? 'scale(1.025) translateY(-4px)' : 'scale(1) translateY(0)',
        boxShadow: hov ? `0 18px 38px rgba(0,0,0,0.48), 0 0 0 1px ${c}14` : '0 4px 14px rgba(0,0,0,0.30)',
        transition:'transform 0.35s ease, box-shadow 0.35s ease, border-color 0.28s ease, filter 0.35s ease, background 0.35s ease',
        marginRight:12,
        filter: hov ? 'saturate(1.03) brightness(1.04)' : 'saturate(.90) brightness(.98)',
      }}
    >
      {anime.coverImage && (
        <img
          src={anime.coverImage} alt={anime.title}
          onError={e => { e.currentTarget.style.display='none' }}
          style={{
            position:'absolute', inset:0, width:'100%', height:'100%',
            objectFit:'cover', objectPosition: anime.coverPosition || 'center top',
            transform: hov ? 'scale(1.05)' : 'scale(1)',
            filter: hov ? 'brightness(1.06) contrast(1.02)' : 'brightness(.95) contrast(1)',
            transition:'transform 0.4s ease, filter 0.4s ease',
          }}
        />
      )}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.84) 100%)', zIndex:1 }} />
      <div style={{
        position:'absolute', inset:0,
        background:`linear-gradient(to bottom, ${c}20 0%, transparent 50%)`,
        zIndex:2, opacity: hov ? 1 : 0, transition:'opacity 0.28s',
      }} />
      <div style={{
        position:'absolute', top:10, right:10, zIndex:4,
        fontSize:7.5, fontWeight:850, letterSpacing:'.14em', textTransform:'uppercase',
        background:'rgba(14,15,18,0.58)', color:hov ? '#f5f0ea' : 'rgba(245,240,234,0.72)',
        border:`1px solid ${c}${hov ? '45' : '24'}`,
        borderRadius:999, padding:'3px 8px', backdropFilter:'blur(10px)',
      }}>
        {anime.badge}
      </div>
      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'10px 12px 12px', zIndex:3 }}>
        <div style={{ fontSize:12, fontWeight:800, color:'#F2F0EA', lineHeight:1.25, marginBottom:5, textShadow:'0 1px 8px rgba(0,0,0,0.95)' }}>
          {anime.title}
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {anime.genres.slice(0,2).map(g => (
            <span key={g} style={{ fontSize:9, fontWeight:700, background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.60)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:100, padding:'2px 7px', whiteSpace:'nowrap' }}>{g}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function AnimeMarqueeRow({ animes, direction, speed, onCardClick }) {
  const [paused, setPaused] = useState(false)
  const items = [...animes, ...animes]
  const cls = direction === 'rtl' ? 'ah-mq-l' : 'ah-mq-r'
  return (
    <div
      style={{
        overflow:'hidden',
        WebkitMaskImage:'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        maskImage:'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        marginBottom:12,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={cls}
        style={{
          display:'flex', gap:0, padding:'6px 0 10px',
          '--mq-dur':`${speed}s`,
          animationPlayState: paused ? 'paused' : 'running',
          width:'fit-content',
        }}
      >
        {items.map((anime, i) => (
          <AnimeMarqueeCard key={`${anime.id}-${i}`} anime={anime} onClick={() => onCardClick(anime.id)} />
        ))}
      </div>
    </div>
  )
}

function AnimeCard({ anime, index, onClick }) {
  const [hov, setHov] = useState(false)
  const c = anime.color
  const fallbackCover = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="458" height="687" viewBox="0 0 458 687">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${anime.colorDark}"/>
          <stop offset="100%" stop-color="${anime.color}"/>
        </linearGradient>
      </defs>
      <rect width="458" height="687" rx="24" fill="url(#g)"/>
      <text x="229" y="326" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="30" font-weight="700">${anime.title}</text>
      <text x="229" y="370" text-anchor="middle" fill="rgba(255,255,255,.78)" font-family="Arial, sans-serif" font-size="17" font-weight="600">${anime.subtitle}</text>
    </svg>
  `)}`

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        position:'relative',
        borderRadius:20, overflow:'hidden',
        background:`linear-gradient(175deg, ${c}14 0%, rgba(14,14,18,0.97) 100%)`,
        border:`1px solid ${hov ? c+'55' : c+'1e'}`,
        borderTop:`3px solid ${hov ? c : c+'aa'}`,
        transition:'all 0.38s ease',
        transform: hov ? 'translateY(-10px)' : 'translateY(0)',
        boxShadow: hov ? `0 28px 70px ${c}28, 0 0 0 1px ${c}18` : `0 4px 18px ${c}0a`,
        cursor:'pointer',
        animation:`ahFadeUp 0.55s ${index * 0.07}s ease-out both`,
      }}
    >
      {/* Cover image */}
      <div style={{ height:250, position:'relative', overflow:'hidden', background:`linear-gradient(135deg, ${c}cc 0%, ${anime.colorDark} 100%)` }}>
        {anime.coverImage && (
          <img
            src={anime.coverImage}
            alt={anime.title}
            onError={e => { if (e.currentTarget.src !== fallbackCover) e.currentTarget.src = fallbackCover }}
            style={{
              position:'absolute', inset:0, width:'100%', height:'100%',
              objectFit:'cover', objectPosition: anime.coverPosition || 'center center',
              opacity: hov ? 1 : 0.85,
              transition:'opacity 0.38s ease, transform 0.45s ease',
              transform: hov ? 'scale(1.06)' : 'scale(1)',
            }}
          />
        )}
        {!anime.coverImage && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', fontSize:88, filter:`drop-shadow(0 6px 20px ${c}66)`, transition:'transform 0.38s', transform: hov ? 'scale(1.1)' : 'scale(1)' }}>
            {anime.emoji}
          </div>
        )}

        {/* Bottom gradient */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 30%, rgba(8,8,12,0.72) 100%)', zIndex:1 }} />

        {/* Glow rim at top */}
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:60,
          background:`linear-gradient(to bottom, ${c}22, transparent)`,
          zIndex:1, opacity: hov ? 1 : 0,
          transition:'opacity .38s',
        }} />

        {/* Badge */}
        <div style={{ position:'absolute', top:12, right:12, zIndex:2, fontSize:10, fontWeight:800, letterSpacing:'.08em', background:`${anime.badgeColor}dd`, color:'#fff', borderRadius:100, padding:'3px 10px', backdropFilter:'blur(6px)' }}>
          {anime.badge}
        </div>

        {/* Subtitle on cover */}
        {anime.coverImage && (
          <div style={{ position:'absolute', bottom:14, left:16, zIndex:2 }}>
            <div style={{ fontSize:11, fontWeight:800, color:c, letterSpacing:'.06em', textShadow:'0 1px 10px rgba(0,0,0,0.9)' }}>{anime.subtitle}</div>
          </div>
        )}
      </div>

      {/* Info body */}
      <div style={{ padding:'22px 22px 20px' }}>
        <div style={{ marginBottom:12 }}>
          <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:19, color:'#fff', marginBottom:3, letterSpacing:'-.01em' }}>{anime.title}</div>
          <div style={{ fontSize:12, color:c, fontWeight:600 }}>{anime.subtitle}</div>
        </div>

        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:14 }}>
          {anime.genres.map(g => (
            <span key={g} style={{ fontSize:11, fontWeight:700, background:`${c}18`, color:c, border:`1px solid ${c}33`, borderRadius:100, padding:'2px 10px' }}>{g}</span>
          ))}
        </div>

        <p style={{ fontSize:13, color:'rgba(255,255,255,0.50)', lineHeight:1.7, marginBottom:18 }}>{anime.description}</p>

        <div style={{ display:'flex', gap:20, marginBottom:20, paddingBottom:18, borderBottom:`1px solid ${c}14` }}>
          {anime.stats.map(s => (
            <div key={s.label}>
              <div style={{ fontSize:17, fontWeight:800, color:'#fff' }}>{s.value}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.32)', fontWeight:700, letterSpacing:'.06em', marginTop:1 }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        <button style={{
          width:'100%', padding:'13px', borderRadius:11, border:'none',
          background: hov ? c : `${c}20`,
          color: hov ? '#fff' : c,
          fontWeight:800, fontSize:14, cursor:'pointer',
          transition:'all 0.32s',
          fontFamily:'var(--body)',
          boxShadow: hov ? `0 8px 24px ${c}44` : 'none',
          letterSpacing:'.02em',
        }}>
          {anime.action}
        </button>
      </div>
    </div>
  )
}

function ComingSoonCard({ index }) {
  return (
    <div style={{
      borderRadius:20, overflow:'hidden',
      border:'1px dashed rgba(255,255,255,0.07)',
      background:'rgba(255,255,255,0.012)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      minHeight:420, padding:40, textAlign:'center',
      animation:`ahFadeUp 0.55s ${index * 0.07}s ease-out both`,
    }}>
      <div style={{ fontSize:52, marginBottom:18, opacity:.18, animation:'ahDrift 6s ease-in-out infinite' }}>＋</div>
      <div style={{ fontWeight:700, fontSize:15, color:'rgba(255,255,255,0.18)', marginBottom:10 }}>D'autres animes bientôt</div>
      <div style={{ fontSize:13, color:'rgba(255,255,255,0.09)', lineHeight:1.7 }}>Naruto · Dragon Ball<br />Bleach · Sword Art Online…</div>
    </div>
  )
}

export default function AnimeHub({ onClose, onOpenOnepiece, onOpenTpn, onOpenDrstone, onOpenJjk, onOpenKingdom, onOpenAot, onOpenKny, onOpenNnt, onOpenSl, onOpenDbs, onOpenViolet, onOpenVivy, onOpenLovePrism, onOpenCaroleTuesday, onOpenBc, onOpenMha, onOpenFireforce, onOpenBluelock }) {
  const [query, setQuery] = useState('')
  const [selectedGenres, setSelectedGenres] = useState(new Set())

  const sortedAnimes = useMemo(() => {
    const priority = { onepiece: 0, 'violet-evergarden': 1, vivy: 2 }
    return [...ANIMES].sort((a, b) => (priority[a.id] ?? 10) - (priority[b.id] ?? 10))
  }, [])

  const genreOptions = useMemo(() => {
    const genres = new Set()
    sortedAnimes.forEach(anime => (anime.genres || []).forEach(genre => genres.add(genre)))
    return Array.from(genres).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [sortedAnimes])

  const toggleGenre = (genre) => {
    setSelectedGenres(prev => {
      const next = new Set(prev)
      if (next.has(genre)) next.delete(genre)
      else next.add(genre)
      return next
    })
  }

  const visibleAnimes = useMemo(() => {
    const needle = normalizeText(query).trim()
    return sortedAnimes.filter(anime => {
      const genreMatch = selectedGenres.size === 0 || anime.genres?.some(g => selectedGenres.has(g))
      const textMatch = !needle || searchableText(anime).includes(needle)
      return genreMatch && textMatch
    })
  }, [selectedGenres, query, sortedAnimes])

  const isFiltering = query.trim() !== '' || selectedGenres.size > 0
  const marqueeRows = useMemo(() => {
    const a = sortedAnimes
    const half = Math.ceil(a.length / 2)
    return [
      { animes: a,                    direction: 'rtl', speed: 66 },
      { animes: [...a].reverse(),     direction: 'ltr', speed: 70 },
      { animes: a.slice(half).concat(a.slice(0, half)), direction: 'rtl', speed: 64 },
    ]
  }, [sortedAnimes])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleClick = id => {
    const map = {
      onepiece: onOpenOnepiece, tpn: onOpenTpn, drstone: onOpenDrstone,
      jjk: onOpenJjk, kingdom: onOpenKingdom, aot: onOpenAot,
      kny: onOpenKny, nnt: onOpenNnt, sl: onOpenSl, dbs: onOpenDbs,
      'violet-evergarden': onOpenViolet,
      vivy: onOpenVivy,
      'love-prism': onOpenLovePrism,
      'carole-tuesday': onOpenCaroleTuesday,
      bc: onOpenBc, mha: onOpenMha, fireforce: onOpenFireforce, bluelock: onOpenBluelock,
    }
    map[id]?.()
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'#07090e', display:'flex', flexDirection:'column' }}>
      <style>{AH_CSS}</style>

      {/* ── Header ── */}
      <div style={{
        flexShrink:0, padding:'0 24px', height:72,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'rgba(7,9,14,0.96)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(255,255,255,0.07)', zIndex:10,
        position:'relative',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ fontSize:28, filter:'drop-shadow(0 0 14px rgba(224,82,74,0.6))', animation:'ahDrift 5s ease-in-out infinite' }}>🎌</div>
          <div>
            <div style={{ fontFamily:"'Pirata One', cursive", fontWeight:900, fontSize:22, color:'#fff', letterSpacing:'-.01em', lineHeight:1 }}>Hub des Animés</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.32)', marginTop:3, fontWeight:600, letterSpacing:'.04em' }}>
              {visibleAnimes.length} séries disponibles
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ display:'flex', alignItems:'center', gap:7, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, color:'rgba(255,255,255,0.75)', cursor:'pointer', padding:'9px 18px', fontSize:13, fontWeight:700, transition:'all .18s' }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.10)'; e.currentTarget.style.color='#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='rgba(255,255,255,0.75)' }}
        >
          ← Retour
        </button>
      </div>

      {/* ── Content ── */}
      <div style={{ flex:1, overflowY:'auto', position:'relative' }}>
        {/* Atmospheric layers */}
        <AmbientOrbs />
        <AHStars />
        <AHScanLine />

        <div style={{ position:'relative', zIndex:2, padding:'52px 0 80px' }}>
          <div style={{ maxWidth:1080, margin:'0 auto', padding:'0 24px' }}>

            {/* Intro */}
            <div style={{ textAlign:'center', marginBottom:52 }}>
              <div style={{
                display:'inline-flex', alignItems:'center', gap:8,
                padding:'5px 18px', borderRadius:100,
                background:'rgba(224,82,74,0.10)', border:'1px solid rgba(224,82,74,0.25)',
                fontSize:10, fontWeight:800, letterSpacing:'.22em', color:'#e0524a', textTransform:'uppercase',
                marginBottom:20,
              }}>
                ✦ Espace Manga & Anime
              </div>
              <h2 style={{ fontFamily:"'Pirata One', cursive", fontWeight:900, fontSize:'clamp(28px,5vw,52px)', color:'#fff', marginBottom:14, lineHeight:1, letterSpacing:'-.02em' }}>
                Ton univers, ton rythme
              </h2>
              <p style={{ fontSize:15, color:'rgba(255,255,255,0.38)', maxWidth:480, margin:'0 auto', lineHeight:1.75 }}>
                Scans, épisodes, suivis — tout au même endroit pour la communauté Brams.
              </p>
            </div>

            <div style={{ margin:'0 auto 30px', maxWidth:820 }}>
              <div style={{
                display:'flex', alignItems:'center', gap:10,
                background:'rgba(255,255,255,0.055)',
                border:'1px solid rgba(255,255,255,0.10)',
                borderRadius:12,
                padding:'10px 12px',
                boxShadow:'0 18px 45px rgba(0,0,0,0.22)',
              }}>
                <span style={{ color:'rgba(255,255,255,0.42)', fontSize:15, flexShrink:0 }}>⌕</span>
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Rechercher : attaque des titans, snk, aot, violet, dbs..."
                  style={{
                    width:'100%',
                    background:'transparent',
                    border:'none',
                    outline:'none',
                    color:'#fff',
                    fontSize:14,
                    fontWeight:650,
                    fontFamily:'var(--body)',
                  }}
                />
                {(query || selectedGenres.size > 0) && (
                  <button
                    type="button"
                    onClick={() => { setQuery(''); setSelectedGenres(new Set()) }}
                    style={{
                      flexShrink:0,
                      border:'1px solid rgba(255,255,255,0.10)',
                      background:'rgba(255,255,255,0.06)',
                      color:'rgba(255,255,255,0.72)',
                      borderRadius:8,
                      padding:'7px 10px',
                      cursor:'pointer',
                      fontSize:12,
                      fontWeight:800,
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>

              <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginTop:12, justifyContent:'center', alignItems:'center' }}>
                <button
                  type="button"
                  onClick={() => setSelectedGenres(new Set())}
                  style={{
                    border:`1px solid ${selectedGenres.size === 0 ? 'rgba(224,82,74,0.65)' : 'rgba(255,255,255,0.10)'}`,
                    background: selectedGenres.size === 0 ? 'rgba(224,82,74,0.18)' : 'rgba(255,255,255,0.045)',
                    color: selectedGenres.size === 0 ? '#fff' : 'rgba(255,255,255,0.58)',
                    borderRadius:999, padding:'7px 14px', cursor:'pointer', fontSize:12, fontWeight:800, transition:'all .18s',
                  }}
                >
                  Tous
                </button>
                {genreOptions.map(genre => {
                  const active = selectedGenres.has(genre)
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      style={{
                        border:`1px solid ${active ? 'rgba(224,82,74,0.55)' : 'rgba(255,255,255,0.10)'}`,
                        background: active ? 'rgba(224,82,74,0.16)' : 'rgba(255,255,255,0.045)',
                        color: active ? '#fff' : 'rgba(255,255,255,0.58)',
                        borderRadius:999, padding:'6px 12px', cursor:'pointer', fontSize:11.5, fontWeight:800,
                        transition:'all .18s', display:'flex', alignItems:'center', gap:5,
                      }}
                    >
                      {active && <span style={{ fontSize:9, color:'rgba(224,82,74,0.9)' }}>✓</span>}
                      {genre}
                    </button>
                  )
                })}
              </div>

              <div style={{ marginTop:12, textAlign:'center', fontSize:12, color:'rgba(255,255,255,0.32)', fontWeight:700 }}>
                {isFiltering
                  ? `${visibleAnimes.length} résultat${visibleAnimes.length > 1 ? 's' : ''}`
                  : `${sortedAnimes.length} animés disponibles`
                }
              </div>
            </div>

          </div>

          {/* Marquee gallery (default) or filtered grid — outside maxWidth container for true full-bleed */}
          {isFiltering ? (
            <div style={{ maxWidth:1080, margin:'0 auto', padding:'0 24px' }}>
              {visibleAnimes.length > 0 ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:20 }}>
                  {visibleAnimes.map((anime, i) => (
                    <AnimeCard key={anime.id} anime={anime} index={i} onClick={() => handleClick(anime.id)} />
                  ))}
                </div>
              ) : (
                <div style={{
                  border:'1px dashed rgba(255,255,255,0.10)',
                  background:'rgba(255,255,255,0.025)',
                  borderRadius:14,
                  padding:'44px 20px',
                  textAlign:'center',
                  color:'rgba(255,255,255,0.42)',
                  fontWeight:750,
                }}>
                  Aucun anime trouvé
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ textAlign:'center', marginBottom:18, padding:'0 24px', fontSize:10.5, color:'rgba(255,255,255,0.18)', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase' }}>
                Galerie cinématique · survole pour pause · clique pour accéder
              </div>
              {marqueeRows.map((row, i) => (
                <AnimeMarqueeRow
                  key={i}
                  animes={row.animes}
                  direction={row.direction}
                  speed={row.speed}
                  onCardClick={handleClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
