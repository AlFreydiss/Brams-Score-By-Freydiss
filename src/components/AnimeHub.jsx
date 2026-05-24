import { useState, useEffect, useMemo, useRef } from 'react'

// ─── Data ────────────────────────────────────────────────────────────────────

const ANIMES = [
  {
    id: 'onepiece',
    title: 'One Piece',
    subtitle: 'Arc Elbaf · En cours',
    emoji: '🏴‍☠️',
    color: '#e0524a',
    colorDark: '#7a1f1a',
    coverImage: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/op-egghead-thumbnails/E1086.jpg',
    coverPosition: 'center top',
    genres: ['Aventure', 'Action', 'Shōnen'],
    description: "Monkey D. Luffy et son équipage sillonnent les mers à la recherche du légendaire trésor « One Piece » pour devenir Roi des Pirates.",
    stats: [{ label: 'Épisodes', value: '1100+' }, { label: 'Arc actuel', value: 'Elbaf' }, { label: 'Statut', value: 'En cours' }],
    action: '▶ Accéder', badge: 'À JOUR',
  },
  {
    id: 'violet-evergarden',
    title: 'Violet Evergarden',
    subtitle: 'VF & VOSTFR · 13 épisodes',
    emoji: '💜',
    color: '#8b7cff',
    colorDark: '#30255f',
    coverImage: 'https://www.manga-news.com/public/images/dvd/violet-evergarden-anime-key.webp',
    coverPosition: 'center center',
    genres: ['Drame', 'Émotion', 'Josei'],
    description: "Violet, ancienne soldate, devient Auto Memory Doll pour comprendre les sentiments humains et le sens des mots qu'elle a reçus.",
    stats: [{ label: 'Épisodes', value: '13' }, { label: 'Audio', value: 'VF + JAP' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Accéder', badge: 'VF + VOSTFR',
  },
  {
    id: 'tpn',
    title: 'The Promised Neverland',
    subtitle: 'Scans & Épisodes',
    emoji: '🌿',
    color: '#6c5ce7',
    colorDark: '#2d1b8e',
    coverImage: 'https://a.storyblok.com/f/178900/678x960/b998a75a12/30b71f52a3fcad111ddf2f84aab4dad91631262181_main.jpg/m/filters:quality(95)format(webp)',
    coverPosition: 'center top',
    genres: ['Thriller', 'Mystère', 'Shōnen'],
    description: "Emma, Norman et Ray vivent dans un orphelinat idyllique… jusqu'au jour où ils découvrent une vérité qui brise tout.",
    stats: [{ label: 'Chapitres', value: '184' }, { label: 'Épisodes', value: '12' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Accéder', badge: 'NOUVEAU',
  },
  {
    id: 'drstone',
    title: 'Dr. Stone',
    subtitle: 'Science & Survie',
    emoji: '⚗️',
    color: '#00b894',
    colorDark: '#005c45',
    coverImage: 'https://images.squarespace-cdn.com/content/v1/5e90e8679180dd053f86571c/1607648759877-XA0OOQUYTHR5DPVRJY0K/keyvisual_notext.jpg',
    coverPosition: 'center center',
    genres: ['Science-fiction', 'Aventure', 'Shōnen'],
    description: "Toute l'humanité est pétrifiée. Des millénaires plus tard, le génie Senku se réveille et décide de reconstruire la civilisation grâce à la science.",
    stats: [{ label: 'Chapitres', value: '174' }, { label: 'Épisodes', value: '35' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Accéder', badge: 'NOUVEAU',
  },
  {
    id: 'jjk',
    title: 'Jujutsu Kaisen',
    subtitle: 'Maléfices & Combats',
    emoji: '⚡',
    color: '#c62828',
    colorDark: '#5a0a0a',
    coverImage: 'https://d28hgpri8am2if.cloudfront.net/book_images/onix/cvr9781974740819/jujutsu-kaisen-the-official-anime-guide-season-1-9781974740819_lg.jpg',
    coverPosition: 'center top',
    genres: ['Action', 'Surnaturel', 'Shōnen'],
    description: "Yuji Itadori avale un doigt de Ryomen Sukuna, le roi des Fléaux. Condamné à mort, il rejoint l'École de sorcellerie de Jujutsu pour trouver les doigts restants.",
    stats: [{ label: 'Chapitres', value: '263' }, { label: 'Épisodes', value: '48' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Accéder', badge: 'NOUVEAU',
  },
  {
    id: 'kingdom',
    title: 'Kingdom',
    subtitle: 'Chine Antique · Guerre',
    emoji: '⚔️',
    color: '#c9a227',
    colorDark: '#4a3205',
    coverImage: 'https://www.manga-news.com/public/images/dvd/Kingdom-anime-saison-3-visual-1.webp',
    coverPosition: 'center center',
    genres: ['Action', 'Historique', 'Seinen'],
    description: "Dans la Chine des Royaumes Combattants, Shin rêve de devenir le plus grand général sous les cieux aux côtés du futur roi Ying Zheng.",
    stats: [{ label: 'Chapitres', value: '874' }, { label: 'Épisodes', value: '100+' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Accéder', badge: 'NOUVEAU',
  },
  {
    id: 'aot',
    title: "L'Attaque des Titans",
    subtitle: 'Titans & Liberté',
    emoji: '🗡️',
    color: '#546e7a',
    colorDark: '#1c313a',
    coverImage: 'https://www.manga-news.com/public/images/dvd/Attaque-des-Titans-s4-anime-visual.jpg',
    coverPosition: 'center top',
    genres: ['Action', 'Drame', 'Shōnen'],
    description: "Eren Yeager découvre que les murs qui protègent l'humanité cachent un secret bien plus sombre que les Titans eux-mêmes.",
    stats: [{ label: 'Chapitres', value: '81' }, { label: 'Épisodes', value: '87' }, { label: 'Statut', value: 'Terminé' }],
    action: '▶ Accéder', badge: 'COMPLET',
  },
  {
    id: 'kny',
    title: 'Kimetsu no Yaiba',
    subtitle: 'Demon Slayer',
    emoji: '🔥',
    color: '#e85d27',
    colorDark: '#6b1f05',
    coverImage: 'https://storage.ghost.io/c/2b/7f/2b7f69fc-a243-4d2f-ae8e-db8312c6653a/content/images/size/w1200/2025/10/Demon-Slayer-en-421-c-1.png',
    coverPosition: 'center top',
    genres: ['Action', 'Surnaturel', 'Shōnen'],
    description: "Tanjiro Kamado devient chasseur de démons après que sa famille est massacrée et sa sœur Nezuko transformée en démon.",
    stats: [{ label: 'Chapitres', value: '206' }, { label: 'Épisodes', value: '44' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Accéder', badge: 'NOUVEAU',
  },
  {
    id: 'nnt',
    title: 'Nanatsu no Taizai',
    subtitle: 'Les Sept Péchés Capitaux',
    emoji: '🐗',
    color: '#8e44ad',
    colorDark: '#3d0f5a',
    coverImage: 'https://static.wikia.nocookie.net/nanatsu-no-taizai/images/2/25/Nanatsu_no_Taizai_Anime_Fourth_Season_Poster.png/revision/latest?cb=20200805045531',
    coverPosition: 'center top',
    genres: ['Action', 'Fantasy', 'Shōnen'],
    description: "La princesse Elizabeth part à la recherche des Sept Péchés Capitaux, des chevaliers légendaires bannis du royaume, pour sauver Britannia.",
    stats: [{ label: 'Chapitres', value: '342' }, { label: 'Épisodes', value: '100' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Accéder', badge: 'NOUVEAU',
  },
  {
    id: 'sl',
    title: 'Solo Leveling',
    subtitle: 'Le plus faible monte de rang',
    emoji: '💎',
    color: '#1976d2',
    colorDark: '#0a2e5c',
    coverImage: 'https://i.pinimg.com/736x/e3/9c/56/e39c564360a91e48edcd430355ee68ce.jpg',
    coverPosition: 'center top',
    genres: ['Action', 'Fantasy', 'Manhwa'],
    description: "Sung Jinwoo, le chasseur le plus faible du monde, reçoit un mystérieux système qui lui permet de monter de rang à l'infini.",
    stats: [{ label: 'Chapitres', value: '202' }, { label: 'Épisodes', value: '12' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Accéder', badge: 'NOUVEAU',
  },
  {
    id: 'dbs',
    title: 'Dragon Ball Super',
    subtitle: 'Au-delà des limites',
    emoji: '🐉',
    color: '#f57f17',
    colorDark: '#5c2e00',
    coverImage: 'https://static.wikia.nocookie.net/dragonball/images/0/00/Dragon_Ball_Super_Poster.jpg/revision/latest?cb=20160615161440',
    coverPosition: 'center center',
    genres: ['Action', 'Science-fiction', 'Shōnen'],
    description: "Après la défaite de Majin Buu, Goku continue à repousser ses limites en affrontant des adversaires venus d'autres univers.",
    stats: [{ label: 'Chapitres', value: '101' }, { label: 'Épisodes', value: '131' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Accéder', badge: 'VF + JAP',
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
    stats: [{ label: 'Chapitres', value: '280' }, { label: 'Épisodes', value: '170' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Accéder', badge: 'NOUVEAU',
  },
  {
    id: 'mha',
    title: 'My Hero Academia',
    subtitle: 'Plus Ultra !',
    emoji: '💪',
    color: '#1e88e5',
    colorDark: '#0a2a5c',
    coverImage: 'https://static.wikia.nocookie.net/bokunoheroacademia/images/a/a5/My_Hero_Academia_Movie_Poster_3.png/revision/latest?cb=20210808041156',
    coverPosition: 'center top',
    genres: ['Action', 'Super-héros', 'Shōnen'],
    description: "Dans un monde où 80% de la population a un Super Pouvoir, Izuku Midoriya naît sans capacité mais rêve de devenir le plus grand héros.",
    stats: [{ label: 'Chapitres', value: '430+' }, { label: 'Épisodes', value: '138' }, { label: 'Statut', value: 'Terminé' }],
    action: '▶ Accéder', badge: 'COMPLET',
  },
  {
    id: 'fireforce',
    title: 'Fire Force',
    subtitle: 'Enen no Shouboutai',
    emoji: '🔥',
    color: '#f4511e',
    colorDark: '#5c1208',
    coverImage: 'https://static.wikia.nocookie.net/souleater/images/2/28/Fire_Force_Vol_1.jpg/revision/latest?cb=20220224034042',
    coverPosition: 'center top',
    genres: ['Action', 'Surnaturel', 'Shōnen'],
    description: "Dans un monde où des humains s'enflamment spontanément, Shinra Kusakabe intègre la 8ème Brigade pour comprendre les mystères de la combustion spontanée.",
    stats: [{ label: 'Chapitres', value: '304' }, { label: 'Épisodes', value: '48' }, { label: 'Statut', value: 'Terminé' }],
    action: '▶ Accéder', badge: 'COMPLET',
  },
  {
    id: 'bluelock',
    title: 'Blue Lock',
    subtitle: 'Projet égoïste',
    emoji: '⚽',
    color: '#1565c0',
    colorDark: '#071b3a',
    coverImage: 'https://static.wikia.nocookie.net/bluelock/images/6/6d/Blue_Lock_TV_Anime_Key_Visual.png/revision/latest?cb=20221004123456',
    coverPosition: 'center top',
    genres: ['Sport', 'Compétition', 'Shōnen'],
    description: "La Fédération japonaise de football engage Ego Jinpachi pour former le meilleur attaquant du monde via un programme radical : Blue Lock.",
    stats: [{ label: 'Chapitres', value: '280+' }, { label: 'Épisodes', value: '24' }, { label: 'Statut', value: 'En cours' }],
    action: '▶ Accéder', badge: 'NOUVEAU',
  },
  {
    id: 'kaiju8',
    title: 'Kaiju No. 8',
    subtitle: 'Saison 1 · VF + VO',
    emoji: '👾',
    color: '#00bcd4',
    colorDark: '#003d45',
    coverImage: 'https://www.nautiljon.com/images/anime/00/39/kaiju_no_8_22839.jpg',
    genres: ['Action', 'Monstres', 'Shōnen'],
    description: "Kafka Hibino rêve d'intégrer les Forces de Défense. Un jour, il avale un petit kaiju et se transforme en monstre de classe dix. Le Kaiju n°8.",
    stats: [
      { label: 'Épisodes', value: '12' },
      { label: 'Saison', value: '1' },
      { label: 'Audio', value: 'VF + VO' },
    ],
    action: '▶ Regarder',
    badge: 'MULTI',
    badgeColor: '#00bcd4',
  },
]

const SEARCH_ALIASES = {
  onepiece:            ['op', 'one piece', 'luffy', 'mugiwara', 'elbaf', 'pirate'],
  'violet-evergarden': ['violet', 'violet evergarden', 'vostfr', 'vf', 'auto memory doll', 'lettres'],
  tpn:                 ['promised neverland', 'neverland', 'emma', 'norman', 'ray'],
  drstone:             ['dr stone', 'senku', 'science'],
  jjk:                 ['jujutsu', 'jujutsu kaisen', 'sukuna', 'itadori', 'gojo'],
  kingdom:             ['shin', 'chine', 'guerre', 'royaumes combattants'],
  aot:                 ['aot', 'snk', 'shingeki', 'attaque des titans', 'attack on titan', 'eren', 'levi'],
  kny:                 ['kny', 'demon slayer', 'kimetsu', 'tanjiro', 'nezuko'],
  nnt:                 ['nnt', 'nanatsu', 'seven deadly sins', '7ds', 'meliodas'],
  sl:                  ['solo leveling', 'sung jinwoo', 'manhwa'],
  dbs:                 ['dbs', 'dragon ball', 'goku', 'vegeta'],
  bc:                  ['black clover', 'asta', 'yuno', 'trefle'],
  mha:                 ['mha', 'my hero academia', 'boku no hero', 'deku', 'izuku'],
  fireforce:           ['fire force', 'enen no shouboutai', 'shinra'],
  bluelock:            ['blue lock', 'football', 'isagi', 'ego'],
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function normalizeText(v) {
  return String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
function searchableText(anime) {
  return normalizeText([anime.id, anime.title, anime.subtitle, anime.description, ...(anime.genres || []), ...(SEARCH_ALIASES[anime.id] || [])].join(' '))
}

// ─── Badge styles — sobre, pas flashy ─────────────────────────────────────────

const BADGE = {
  'NOUVEAU':     { bg:'rgba(52,211,153,0.12)',  color:'#86efac', border:'rgba(52,211,153,0.22)'  },
  'À JOUR':      { bg:'rgba(251,146,60,0.12)',  color:'#fdba74', border:'rgba(251,146,60,0.22)'  },
  'COMPLET':     { bg:'rgba(148,163,184,0.10)', color:'#cbd5e1', border:'rgba(148,163,184,0.18)' },
  'VF + VOSTFR': { bg:'rgba(167,139,250,0.12)', color:'#c4b5fd', border:'rgba(167,139,250,0.22)' },
  'VF + JAP':    { bg:'rgba(251,191,36,0.10)',  color:'#fde68a', border:'rgba(251,191,36,0.18)'  },
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const AH_CSS = `
  @keyframes ahFadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
  @keyframes ahTwinkle { 0%,100%{opacity:.04} 50%{opacity:.32} }
  @keyframes ahDrift   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
  @keyframes ahPulse   { 0%,100%{opacity:.5} 50%{opacity:1} }
  @keyframes ahMqL     { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  @keyframes ahMqR     { from{transform:translateX(-50%)} to{transform:translateX(0)} }
  .ah-mq-l { animation:ahMqL var(--mq-dur,65s) linear infinite; will-change:transform; }
  .ah-mq-r { animation:ahMqR var(--mq-dur,80s) linear infinite; will-change:transform; }
  @media(prefers-reduced-motion:reduce){ .ah-mq-l,.ah-mq-r{ animation:none!important; } }

  .ah-card { transition:transform .30s cubic-bezier(.25,.46,.45,.94),box-shadow .30s ease,border-color .22s ease; }
  .ah-card:hover { transform:scale(1.025) translateY(-4px)!important; }
  .ah-card:focus-visible { outline:2px solid rgba(212,160,23,.7); outline-offset:2px; }
  .ah-card-img { transition:transform .45s cubic-bezier(.25,.46,.45,.94); }
  .ah-card:hover .ah-card-img { transform:scale(1.07)!important; }

  .ah-search { transition:border-color .2s,box-shadow .2s; }
  .ah-search:focus-within { border-color:rgba(255,255,255,0.22)!important; box-shadow:0 0 0 3px rgba(255,255,255,.05)!important; }

  .ah-pill { transition:all .18s; }
  .ah-pill:hover { border-color:rgba(255,255,255,.22)!important; color:rgba(255,255,255,.85)!important; }
  .ah-pill:focus-visible { outline:2px solid rgba(212,160,23,.6); outline-offset:2px; }

  .ah-back { transition:all .18s; }
  .ah-back:hover { background:rgba(255,255,255,.10)!important; color:#fff!important; }

  .ah-grid-card { transition:transform .28s ease,box-shadow .28s ease,border-color .2s ease; }
  .ah-grid-card:hover { transform:translateY(-8px)!important; }
  .ah-grid-card:focus-visible { outline:2px solid rgba(212,160,23,.7); outline-offset:3px; }
  .ah-grid-img { transition:transform .4s ease; }
  .ah-grid-card:hover .ah-grid-img { transform:scale(1.055)!important; }

  .ah-rail { scrollbar-width:none; -ms-overflow-style:none; }
  .ah-rail::-webkit-scrollbar { display:none; }
  .ah-rail:active { cursor:grabbing!important; }
  .ah-arrow { transition:opacity .18s,background .18s; }
  .ah-arrow:hover { background:rgba(255,255,255,.12)!important; }
`

// ─── Background atmosphere ────────────────────────────────────────────────────

function AHStars() {
  const stars = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    x: (i * 43.7 + 9) % 98, y: (i * 37.1 + 13) % 93,
    size: i % 11 === 0 ? 1.8 : 1,
    dur: 3.8 + (i * 0.33) % 5.5, del: (i * 0.29) % 9,
  })), [])
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0 }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position:'absolute', left:`${s.x}%`, top:`${s.y}%`,
          width:s.size, height:s.size, borderRadius:'50%',
          background:'rgba(255,255,255,0.45)',
          animation:`ahTwinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

function AmbientOrbs() {
  const orbs = useMemo(() => [
    { x:10, y:20, size:500, color:'rgba(139,92,246,0.022)', dur:22 },
    { x:80, y:60, size:420, color:'rgba(59,130,246,0.018)', dur:28 },
    { x:45, y:82, size:380, color:'rgba(212,160,23,0.016)', dur:18 },
    { x:25, y:45, size:320, color:'rgba(52,211,153,0.014)', dur:24 },
  ], [])
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0 }}>
      {orbs.map((o, i) => (
        <div key={i} style={{
          position:'absolute', left:`${o.x}%`, top:`${o.y}%`,
          width:o.size, height:o.size, borderRadius:'50%',
          background:`radial-gradient(circle,${o.color},transparent 70%)`,
          transform:'translate(-50%,-50%)',
          animation:`ahDrift ${o.dur}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

// ─── Badge pill ───────────────────────────────────────────────────────────────

function BadgePill({ badge, pos = 'tl' }) {
  if (!badge) return null
  const s = BADGE[badge] || { bg:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)', border:'rgba(255,255,255,0.12)' }
  const posStyle = pos === 'tr' ? { top:9, right:9 } : { top:9, left:9 }
  return (
    <div style={{
      position:'absolute', zIndex:4, ...posStyle,
      fontSize:9, fontWeight:800, letterSpacing:'.07em', textTransform:'uppercase',
      background:s.bg, color:s.color, border:`1px solid ${s.border}`,
      borderRadius:100, padding:'3px 9px', backdropFilter:'blur(10px)',
    }}>
      {badge}
    </div>
  )
}

// ─── Premium fallback for missing/cheap covers ────────────────────────────────

function FallbackCover({ anime }) {
  const initials = anime.title.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()
  return (
    <div style={{
      position:'absolute', inset:0,
      background:'linear-gradient(160deg,#14161e 0%,#0b0d12 60%,#0e1018 100%)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10,
    }}>
      <div style={{
        width:52, height:52, borderRadius:12,
        background:'rgba(255,255,255,0.04)',
        border:'1px solid rgba(255,255,255,0.07)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:22, filter:'grayscale(0.15) brightness(0.8)',
      }}>
        {anime.emoji}
      </div>
      <div style={{
        fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.2)',
        letterSpacing:'.14em', textTransform:'uppercase', textAlign:'center',
        maxWidth:120, lineHeight:1.4,
      }}>
        {initials}
      </div>
    </div>
  )
}

// ─── Carousel card ────────────────────────────────────────────────────────────

function AnimeCarouselCard({ anime, onClick }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <div
      className="ah-card"
      onClick={onClick}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      aria-label={anime.title}
      style={{
        flexShrink:0, width:204, height:296, borderRadius:16, overflow:'hidden',
        position:'relative', cursor:'pointer', background:'#0c0e14',
        border:'1px solid rgba(255,255,255,0.08)',
        boxShadow:'0 4px 20px rgba(0,0,0,0.55)',
        scrollSnapAlign:'start',
      }}
    >
      <div style={{ position:'absolute', inset:0, overflow:'hidden' }}>
        {(!imgErr && anime.coverImage) ? (
          <img
            src={anime.coverImage} alt={anime.title} loading="lazy"
            className="ah-card-img"
            onError={() => setImgErr(true)}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:anime.coverPosition || 'center top' }}
          />
        ) : (
          <FallbackCover anime={anime} />
        )}
      </div>
      {/* gradient overlay — plus profond */}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.05) 0%,transparent 30%,rgba(0,0,0,0.55) 60%,rgba(0,0,0,0.96) 100%)', zIndex:2, pointerEvents:'none' }} />
      <BadgePill badge={anime.badge} pos="tl" />
      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'12px 14px 15px', zIndex:3 }}>
        <div style={{ fontSize:13, fontWeight:800, color:'#EDEBE3', lineHeight:1.25, marginBottom:7, textShadow:'0 1px 10px rgba(0,0,0,1)' }}>
          {anime.title}
        </div>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {anime.genres.slice(0,2).map(g => (
            <span key={g} style={{ fontSize:9, fontWeight:700, background:'rgba(255,255,255,0.10)', color:'rgba(255,255,255,0.52)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:100, padding:'2px 8px', whiteSpace:'nowrap' }}>
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Interactive rail (drag + arrows + snap) ──────────────────────────────────

function AnimeRail({ title, subtitle, accent, animes, onCardClick }) {
  const railRef  = useRef(null)
  const drag     = useRef({ on: false, x: 0, sl: 0, moved: false })
  const [canL, setCanL] = useState(false)
  const [canR, setCanR] = useState(true)

  const sync = () => {
    const el = railRef.current
    if (!el) return
    setCanL(el.scrollLeft > 8)
    setCanR(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
  }

  useEffect(() => {
    const el = railRef.current
    if (!el) return
    el.addEventListener('scroll', sync, { passive: true })
    sync()
    return () => el.removeEventListener('scroll', sync)
  }, [])

  const shift = dir => railRef.current?.scrollBy({ left: dir * 520, behavior: 'smooth' })

  const onDown  = e => { drag.current = { on: true, x: e.pageX, sl: railRef.current.scrollLeft, moved: false } }
  const onMove  = e => {
    if (!drag.current.on) return
    const dx = e.pageX - drag.current.x
    if (Math.abs(dx) > 5) drag.current.moved = true
    railRef.current.scrollLeft = drag.current.sl - dx
  }
  const onUp    = () => { drag.current.on = false }
  const cardClick = id => { if (!drag.current.moved) onCardClick(id) }

  const ArrowBtn = ({ dir }) => (
    <button
      className="ah-arrow"
      onClick={() => shift(dir)}
      aria-label={dir < 0 ? 'Précédent' : 'Suivant'}
      style={{
        width:32, height:32, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.10)',
        background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.72)',
        cursor:'pointer', fontSize:20, lineHeight:1,
        display:'flex', alignItems:'center', justifyContent:'center',
        opacity:(dir < 0 ? canL : canR) ? 1 : 0.22,
        flexShrink:0,
      }}
    >{dir < 0 ? '‹' : '›'}</button>
  )

  return (
    <section style={{ marginBottom:36 }} aria-label={title}>
      {/* Header */}
      <div style={{ maxWidth:1320, margin:'0 auto', padding:'0 36px 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {accent && <div style={{ width:3, height:18, borderRadius:2, background:accent, flexShrink:0 }} />}
          <h3 style={{ fontSize:16, fontWeight:800, color:'#fff', margin:0, letterSpacing:'-.01em' }}>{title}</h3>
          {subtitle && <span style={{ fontSize:12, color:'rgba(255,255,255,0.28)', fontWeight:600 }}>{subtitle}</span>}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <ArrowBtn dir={-1} /><ArrowBtn dir={1} />
        </div>
      </div>

      {/* Scroll zone */}
      <div style={{ position:'relative' }}>
        {/* Edge fades */}
        <div style={{ position:'absolute', left:0, top:0, bottom:8, width:56, zIndex:2, pointerEvents:'none',
          background:'linear-gradient(to right,#07090e 0%,transparent 100%)' }} />
        <div style={{ position:'absolute', right:0, top:0, bottom:8, width:56, zIndex:2, pointerEvents:'none',
          background:'linear-gradient(to left,#07090e 0%,transparent 100%)' }} />

        <div
          ref={railRef}
          className="ah-rail"
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          style={{
            display:'flex', gap:14,
            overflowX:'auto',
            scrollSnapType:'x mandatory',
            padding:'6px 36px 14px',
            cursor:'grab',
            WebkitOverflowScrolling:'touch',
          }}
        >
          {animes.map(anime => (
            <AnimeCarouselCard key={anime.id} anime={anime} onClick={() => cardClick(anime.id)} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Grid card (search results) ───────────────────────────────────────────────

function AnimeGridCard({ anime, index, onClick }) {
  const [imgErr, setImgErr] = useState(false)
  const bs = BADGE[anime.badge] || {}
  return (
    <div
      className="ah-grid-card"
      onClick={onClick}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      aria-label={anime.title}
      style={{
        position:'relative', borderRadius:16, overflow:'hidden',
        background:'rgba(255,255,255,0.024)',
        border:'1px solid rgba(255,255,255,0.07)',
        boxShadow:'0 2px 16px rgba(0,0,0,0.30)',
        cursor:'pointer',
        animation:`ahFadeUp .42s ${index * 0.055}s ease-out both`,
      }}
    >
      <div style={{ height:210, position:'relative', overflow:'hidden', background:'#0c0e14' }}>
        {(!imgErr && anime.coverImage) ? (
          <img
            src={anime.coverImage} alt={anime.title} loading="lazy"
            className="ah-grid-img"
            onError={() => setImgErr(true)}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:anime.coverPosition || 'center top' }}
          />
        ) : (
          <FallbackCover anime={anime} />
        )}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,transparent 35%,rgba(0,0,0,0.72) 100%)', zIndex:1 }} />
        {anime.badge && (
          <div style={{
            position:'absolute', top:10, left:10, zIndex:2,
            fontSize:9, fontWeight:800, letterSpacing:'.07em', textTransform:'uppercase',
            background:bs.bg || 'rgba(255,255,255,0.08)', color:bs.color || 'rgba(255,255,255,0.55)',
            border:`1px solid ${bs.border || 'rgba(255,255,255,0.1)'}`,
            borderRadius:100, padding:'3px 9px', backdropFilter:'blur(8px)',
          }}>
            {anime.badge}
          </div>
        )}
      </div>
      <div style={{ padding:'16px 18px 15px' }}>
        <div style={{ fontWeight:800, fontSize:15.5, color:'#fff', marginBottom:3, letterSpacing:'-.01em' }}>{anime.title}</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.32)', marginBottom:10, fontWeight:600 }}>{anime.subtitle}</div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:12 }}>
          {anime.genres.map(g => (
            <span key={g} style={{ fontSize:10, fontWeight:700, background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.42)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:100, padding:'2px 9px' }}>{g}</span>
          ))}
        </div>
        <div style={{ display:'flex', gap:16, borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:11 }}>
          {anime.stats.map(s => (
            <div key={s.label}>
              <div style={{ fontSize:14, fontWeight:800, color:'#fff' }}>{s.value}</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.26)', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', marginTop:1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnimeHub({ onClose, onOpenOnepiece, onOpenTpn, onOpenDrstone, onOpenJjk, onOpenKingdom, onOpenAot, onOpenKny, onOpenNnt, onOpenSl, onOpenDbs, onOpenViolet, onOpenBc, onOpenMha, onOpenFireforce, onOpenBluelock, onOpenKaiju8 }) {
  const [query,       setQuery]       = useState('')
  const [activeGenre, setActiveGenre] = useState('all')
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const sortedAnimes = useMemo(() => {
    const prio = { onepiece:0, 'violet-evergarden':1, kaiju8:2, jjk:3, sl:4, aot:5, kny:6 }
    return [...ANIMES].sort((a, b) => (prio[a.id] ?? 10) - (prio[b.id] ?? 10))
  }, [])

  const sections = useMemo(() => ({
    tendances:  sortedAnimes.filter(a => ['onepiece','jjk','sl','aot','kny','violet-evergarden','kaiju8'].includes(a.id)),
    nouveautes: sortedAnimes.filter(a => a.badge === 'NOUVEAU'),
    collection: sortedAnimes,
  }), [sortedAnimes])

  const heroStats = useMemo(() => ({
    total:     sortedAnimes.length,
    vf:        sortedAnimes.filter(a => a.badge === 'VF + VOSTFR' || a.badge === 'VF + JAP' || a.badge === 'MULTI').length,
    nouveautes:sortedAnimes.filter(a => a.badge === 'NOUVEAU').length,
    complets:  sortedAnimes.filter(a => a.badge === 'COMPLET').length,
  }), [sortedAnimes])

  const genreOptions = useMemo(() => {
    const g = new Set()
    sortedAnimes.forEach(a => a.genres?.forEach(x => g.add(x)))
    return ['all', ...Array.from(g).sort((a, b) => a.localeCompare(b, 'fr'))]
  }, [sortedAnimes])

  const visibleAnimes = useMemo(() => {
    const needle = normalizeText(query).trim()
    return sortedAnimes.filter(a => {
      const genreOk = activeGenre === 'all' || a.genres?.includes(activeGenre)
      const textOk  = !needle || searchableText(a).includes(needle)
      return genreOk && textOk
    })
  }, [activeGenre, query, sortedAnimes])

  const isFiltering = query.trim() !== '' || activeGenre !== 'all'

  const handleClick = id => {
    const map = {
      onepiece: onOpenOnepiece, tpn: onOpenTpn, drstone: onOpenDrstone,
      jjk: onOpenJjk, kingdom: onOpenKingdom, aot: onOpenAot,
      kny: onOpenKny, nnt: onOpenNnt, sl: onOpenSl, dbs: onOpenDbs,
      'violet-evergarden': onOpenViolet,
      bc: onOpenBc, mha: onOpenMha, fireforce: onOpenFireforce, bluelock: onOpenBluelock,
      kaiju8: onOpenKaiju8,
    }
    map[id]?.()
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'#07090e', display:'flex', flexDirection:'column' }}>
      <style>{AH_CSS}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink:0, padding:'0 28px', height:66,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'rgba(7,9,14,0.97)', backdropFilter:'blur(24px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)', zIndex:10, position:'relative',
      }}>
        <button
          className="ah-back"
          onClick={onClose}
          style={{
            display:'flex', alignItems:'center', gap:7,
            background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)',
            borderRadius:10, color:'rgba(255,255,255,0.68)', cursor:'pointer',
            padding:'9px 18px', fontSize:13, fontWeight:700,
          }}
        >
          ← Retour
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:10, position:'absolute', left:'50%', transform:'translateX(-50%)' }}>
          <span style={{ fontSize:20, animation:'ahDrift 6s ease-in-out infinite' }}>🎌</span>
          <span style={{ fontFamily:"'Pirata One',cursive", fontSize:18, fontWeight:900, color:'#fff', letterSpacing:'-.01em' }}>
            Hub des Animés
          </span>
        </div>

        <div style={{ fontSize:12, color:'rgba(255,255,255,0.28)', fontWeight:700 }}>
          {heroStats.total} séries
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:'auto', position:'relative' }}>
        <AmbientOrbs />
        <AHStars />

        <div style={{ position:'relative', zIndex:2, paddingBottom:80 }}>

          {/* ── Hero compact ──────────────────────────────────────────────── */}
          <div style={{
            position:'relative', overflow:'hidden',
            padding:'28px 32px 18px',
            textAlign:'center',
          }}>
            <div style={{
              position:'absolute', inset:0, pointerEvents:'none',
              background:'radial-gradient(ellipse 60% 80% at 50% 0%,rgba(139,92,246,0.05),transparent)',
            }} />

            <h1 style={{
              fontFamily:"'Pirata One',cursive", fontWeight:900,
              fontSize:'clamp(26px,4vw,44px)', color:'#fff',
              margin:'0 0 8px', lineHeight:1.05, letterSpacing:'-.02em',
            }}>
              Mes Animés
            </h1>

            <p style={{ fontSize:13, color:'rgba(255,255,255,0.32)', maxWidth:400, margin:'0 auto 14px', lineHeight:1.6 }}>
              Scans, épisodes, suivis et découvertes de la communauté.
            </p>

            {/* Mini stats */}
            <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
              {[
                { label:'Nouveautés', value:heroStats.nouveautes, dot:'#86efac' },
                { label:'VF dispo',   value:heroStats.vf,         dot:'#c4b5fd' },
                { label:'Complétés',  value:heroStats.complets,   dot:'#cbd5e1' },
              ].map(s => (
                <div key={s.label} style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'5px 12px', borderRadius:100,
                  background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
                  fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.45)',
                }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:s.dot, flexShrink:0 }} />
                  <span style={{ fontWeight:800, color:'rgba(255,255,255,0.72)' }}>{s.value}</span>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Search + filters ──────────────────────────────────────────── */}
          <div style={{ maxWidth:780, margin:'0 auto 18px', padding:'0 28px' }}>
            <div
              className="ah-search"
              style={{
                display:'flex', alignItems:'center', gap:10,
                background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)',
                borderRadius:12, padding:'10px 14px',
                boxShadow:'0 12px 36px rgba(0,0,0,0.18)',
              }}
            >
              <span style={{ color:'rgba(255,255,255,0.35)', fontSize:16, flexShrink:0 }}>⌕</span>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher un animé, un genre, un statut…"
                aria-label="Rechercher un animé"
                style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:'#fff', fontSize:14, fontWeight:600, fontFamily:'var(--body)' }}
              />
              {(query || activeGenre !== 'all') && (
                <button type="button" onClick={() => { setQuery(''); setActiveGenre('all') }}
                  style={{ flexShrink:0, border:'1px solid rgba(255,255,255,0.09)', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.65)', borderRadius:8, padding:'5px 11px', cursor:'pointer', fontSize:11, fontWeight:800 }}>
                  ✕
                </button>
              )}
            </div>

            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10, justifyContent:'center' }}>
              {genreOptions.map(genre => {
                const active = activeGenre === genre
                return (
                  <button
                    key={genre} type="button"
                    className="ah-pill"
                    onClick={() => setActiveGenre(genre)}
                    style={{
                      border:`1px solid ${active ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.09)'}`,
                      background: active ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.035)',
                      color: active ? '#fff' : 'rgba(255,255,255,0.45)',
                      borderRadius:999, padding:'5px 13px', cursor:'pointer',
                      fontSize:12, fontWeight:700,
                    }}
                  >
                    {genre === 'all' ? 'Tous' : genre}
                  </button>
                )
              })}
            </div>

            <div style={{ marginTop:10, textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.22)', fontWeight:700 }}>
              {isFiltering
                ? `${visibleAnimes.length} résultat${visibleAnimes.length !== 1 ? 's' : ''} trouvé${visibleAnimes.length !== 1 ? 's' : ''}`
                : `${sortedAnimes.length} animés disponibles dans la bibliothèque`}
            </div>
          </div>

          {/* ── Content: filtered grid OR section carousels ───────────────── */}
          {isFiltering ? (
            <div style={{ maxWidth:1240, margin:'0 auto', padding:'0 28px' }}>
              {visibleAnimes.length > 0 ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:18 }}>
                  {visibleAnimes.map((anime, i) => (
                    <AnimeGridCard key={anime.id} anime={anime} index={i} onClick={() => handleClick(anime.id)} />
                  ))}
                </div>
              ) : (
                <div style={{
                  border:'1px dashed rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.02)',
                  borderRadius:16, padding:'52px 20px', textAlign:'center',
                  color:'rgba(255,255,255,0.30)', fontSize:14, fontWeight:700,
                }}>
                  Aucun animé trouvé pour cette recherche
                </div>
              )}
            </div>
          ) : (
            <>
              <AnimeRail
                title="Tendances"
                subtitle="Les séries les plus suivies"
                accent="#e0524a"
                animes={sections.tendances}
                onCardClick={handleClick}
              />
              <AnimeRail
                title="Nouveautés"
                subtitle="Récemment ajoutées à la bibliothèque"
                accent="#86efac"
                animes={sections.nouveautes}
                onCardClick={handleClick}
              />
              <AnimeRail
                title="Collection complète"
                subtitle={`${sortedAnimes.length} séries disponibles`}
                accent="#c4b5fd"
                animes={sections.collection}
                onCardClick={handleClick}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
