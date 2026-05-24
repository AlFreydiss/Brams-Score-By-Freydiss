import { useState, useEffect, useMemo, useRef, useCallback } from 'react'

// ─── Data ─────────────────────────────────────────────────────────────────────

const ANIMES = [
  {
    id: 'onepiece',
    title: 'One Piece',
    subtitle: 'Arc Elbaf · En cours',
    emoji: '🏴‍☠️',
    color: '#e0524a',
    coverImage: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/op-egghead-thumbnails/E1086.jpg',
    coverPosition: 'center top',
    genres: ['Aventure', 'Action', 'Shōnen'],
    description: "Monkey D. Luffy et son équipage sillonnent les mers à la recherche du légendaire trésor « One Piece » pour devenir Roi des Pirates.",
    stats: [{ label: 'Épisodes', value: '1100+' }, { label: 'Arc actuel', value: 'Elbaf' }, { label: 'Statut', value: 'En cours' }],
    action: '▶ Voir les épisodes', badge: 'À JOUR',
  },
  {
    id: 'violet-evergarden',
    title: 'Violet Evergarden',
    subtitle: 'VF & VOSTFR · 13 épisodes',
    emoji: '💜',
    color: '#8b7cff',
    coverImage: 'https://img.goodfon.com/original/1080x1920/4/38/art-akiko-takase-violet-evergarden-violet-vverkh-v-vode.jpg',
    coverPosition: 'center 26%',
    genres: ['Drame', 'Émotion', 'Josei'],
    description: "Violet, ancienne soldate, devient Auto Memory Doll pour comprendre les sentiments humains et le sens des mots qu'elle a reçus.",
    stats: [{ label: 'Épisodes', value: '13' }, { label: 'Audio', value: 'VF + JAP' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Voir les épisodes', badge: 'VF + VOSTFR',
  },
  {
    id: 'tpn',
    title: 'The Promised Neverland',
    subtitle: 'Scans & Épisodes',
    emoji: '🌿',
    color: '#6c5ce7',
    coverImage: 'https://a.storyblok.com/f/178900/678x960/b998a75a12/30b71f52a3fcad111ddf2f84aab4dad91631262181_main.jpg/m/filters:quality(95)format(webp)',
    coverPosition: 'center top',
    genres: ['Thriller', 'Mystère', 'Shōnen'],
    description: "Emma, Norman et Ray vivent dans un orphelinat idyllique… jusqu'au jour où ils découvrent une vérité qui brise tout.",
    stats: [{ label: 'Chapitres', value: '184' }, { label: 'Épisodes', value: '12' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Voir les épisodes', badge: 'NOUVEAU',
  },
  {
    id: 'drstone',
    title: 'Dr. Stone',
    subtitle: 'Science & Survie',
    emoji: '⚗️',
    color: '#00b894',
    coverImage: 'https://images.squarespace-cdn.com/content/v1/5e90e8679180dd053f86571c/1607648759877-XA0OOQUYTHR5DPVRJY0K/keyvisual_notext.jpg',
    coverPosition: 'center center',
    genres: ['Science-fiction', 'Aventure', 'Shōnen'],
    description: "Toute l'humanité est pétrifiée. Des millénaires plus tard, le génie Senku se réveille et décide de reconstruire la civilisation grâce à la science.",
    stats: [{ label: 'Chapitres', value: '174' }, { label: 'Épisodes', value: '35' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Voir les épisodes', badge: 'NOUVEAU',
  },
  {
    id: 'jjk',
    title: 'Jujutsu Kaisen',
    subtitle: 'Maléfices & Combats',
    emoji: '⚡',
    color: '#c62828',
    coverImage: 'https://d28hgpri8am2if.cloudfront.net/book_images/onix/cvr9781974740819/jujutsu-kaisen-the-official-anime-guide-season-1-9781974740819_lg.jpg',
    coverPosition: 'center top',
    genres: ['Action', 'Surnaturel', 'Shōnen'],
    description: "Yuji Itadori avale un doigt de Ryomen Sukuna, le roi des Fléaux. Condamné à mort, il rejoint l'École de sorcellerie de Jujutsu pour trouver les doigts restants.",
    stats: [{ label: 'Chapitres', value: '263' }, { label: 'Épisodes', value: '48' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Voir les épisodes', badge: 'NOUVEAU',
  },
  {
    id: 'kingdom',
    title: 'Kingdom',
    subtitle: 'Chine Antique · Guerre',
    emoji: '⚔️',
    color: '#c9a227',
    coverImage: 'https://www.manga-news.com/public/images/dvd/Kingdom-anime-saison-3-visual-1.webp',
    coverPosition: 'center center',
    genres: ['Action', 'Historique', 'Seinen'],
    description: "Dans la Chine des Royaumes Combattants, Shin rêve de devenir le plus grand général sous les cieux aux côtés du futur roi Ying Zheng.",
    stats: [{ label: 'Chapitres', value: '874' }, { label: 'Épisodes', value: '100+' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Voir les épisodes', badge: 'NOUVEAU',
  },
  {
    id: 'aot',
    title: "L'Attaque des Titans",
    subtitle: 'Titans & Liberté',
    emoji: '🗡️',
    color: '#546e7a',
    coverImage: 'https://www.manga-news.com/public/images/dvd/Attaque-des-Titans-s4-anime-visual.jpg',
    coverPosition: 'center top',
    genres: ['Action', 'Drame', 'Shōnen'],
    description: "Eren Yeager découvre que les murs qui protègent l'humanité cachent un secret bien plus sombre que les Titans eux-mêmes.",
    stats: [{ label: 'Chapitres', value: '81' }, { label: 'Épisodes', value: '87' }, { label: 'Statut', value: 'Terminé' }],
    action: '▶ Voir les épisodes', badge: 'COMPLET',
  },
  {
    id: 'kny',
    title: 'Kimetsu no Yaiba',
    subtitle: 'Demon Slayer',
    emoji: '🔥',
    color: '#e85d27',
    coverImage: 'https://storage.ghost.io/c/2b/7f/2b7f69fc-a243-4d2f-ae8e-db8312c6653a/content/images/size/w1200/2025/10/Demon-Slayer-en-421-c-1.png',
    coverPosition: 'center top',
    genres: ['Action', 'Surnaturel', 'Shōnen'],
    description: "Tanjiro Kamado devient chasseur de démons après que sa famille est massacrée et sa sœur Nezuko transformée en démon.",
    stats: [{ label: 'Chapitres', value: '206' }, { label: 'Épisodes', value: '44' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Voir les épisodes', badge: 'NOUVEAU',
  },
  {
    id: 'nnt',
    title: 'Nanatsu no Taizai',
    subtitle: 'Les Sept Péchés Capitaux',
    emoji: '🐗',
    color: '#8e44ad',
    coverImage: 'https://static.wikia.nocookie.net/nanatsu-no-taizai/images/2/25/Nanatsu_no_Taizai_Anime_Fourth_Season_Poster.png/revision/latest?cb=20200805045531',
    coverPosition: 'center top',
    genres: ['Action', 'Fantasy', 'Shōnen'],
    description: "La princesse Elizabeth part à la recherche des Sept Péchés Capitaux, des chevaliers légendaires bannis du royaume, pour sauver Britannia.",
    stats: [{ label: 'Chapitres', value: '342' }, { label: 'Épisodes', value: '100' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Voir les épisodes', badge: 'NOUVEAU',
  },
  {
    id: 'sl',
    title: 'Solo Leveling',
    subtitle: 'Le plus faible monte de rang',
    emoji: '💎',
    color: '#1976d2',
    coverImage: 'https://i.pinimg.com/736x/e3/9c/56/e39c564360a91e48edcd430355ee68ce.jpg',
    coverPosition: 'center top',
    genres: ['Action', 'Fantasy', 'Manhwa'],
    description: "Sung Jinwoo, le chasseur le plus faible du monde, reçoit un mystérieux système qui lui permet de monter de rang à l'infini.",
    stats: [{ label: 'Chapitres', value: '202' }, { label: 'Épisodes', value: '12' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Voir les épisodes', badge: 'NOUVEAU',
  },
  {
    id: 'dbs',
    title: 'Dragon Ball Super',
    subtitle: 'Au-delà des limites',
    emoji: '🐉',
    color: '#f57f17',
    coverImage: 'https://static.wikia.nocookie.net/dragonball/images/0/00/Dragon_Ball_Super_Poster.jpg/revision/latest?cb=20160615161440',
    coverPosition: 'center center',
    genres: ['Action', 'Science-fiction', 'Shōnen'],
    description: "Après la défaite de Majin Buu, Goku continue à repousser ses limites en affrontant des adversaires venus d'autres univers.",
    stats: [{ label: 'Chapitres', value: '101' }, { label: 'Épisodes', value: '131' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Voir les épisodes', badge: 'VF + JAP',
  },
  {
    id: 'bc',
    title: 'Black Clover',
    subtitle: 'La magie du trèfle noir',
    emoji: '🍀',
    color: '#388e3c',
    coverImage: 'https://img2.hulu.com/user/v3/artwork/f6451467-97a8-4ddf-9ae8-e9e4cbb53fc8?base_image_bucket_name=image_manager&base_image=bc1a1c50-6786-4cf7-ae75-75de958b64e1&size=458x687&format=webp',
    coverPosition: 'center center',
    genres: ['Action', 'Fantasy', 'Shōnen'],
    description: "Asta, né sans magie dans un monde où tout le monde en a, rêve de devenir Sorcier Empereur grâce à sa ténacité et à son grimoire à cinq feuilles.",
    stats: [{ label: 'Chapitres', value: '280' }, { label: 'Épisodes', value: '170' }, { label: 'Statut', value: 'Disponible' }],
    action: '▶ Voir les épisodes', badge: 'NOUVEAU',
  },
  {
    id: 'mha',
    title: 'My Hero Academia',
    subtitle: 'Plus Ultra !',
    emoji: '💪',
    color: '#1e88e5',
    coverImage: 'https://static.wikia.nocookie.net/bokunoheroacademia/images/a/a5/My_Hero_Academia_Movie_Poster_3.png/revision/latest?cb=20210808041156',
    coverPosition: 'center top',
    genres: ['Action', 'Super-héros', 'Shōnen'],
    description: "Dans un monde où 80% de la population a un Super Pouvoir, Izuku Midoriya naît sans capacité mais rêve de devenir le plus grand héros.",
    stats: [{ label: 'Chapitres', value: '430+' }, { label: 'Épisodes', value: '138' }, { label: 'Statut', value: 'Terminé' }],
    action: '▶ Voir les épisodes', badge: 'COMPLET',
  },
  {
    id: 'fireforce',
    title: 'Fire Force',
    subtitle: 'Enen no Shouboutai',
    emoji: '🔥',
    color: '#f4511e',
    coverImage: 'https://static.wikia.nocookie.net/souleater/images/2/28/Fire_Force_Vol_1.jpg/revision/latest?cb=20220224034042',
    coverPosition: 'center top',
    genres: ['Action', 'Surnaturel', 'Shōnen'],
    description: "Dans un monde où des humains s'enflamment spontanément, Shinra Kusakabe intègre la 8ème Brigade pour comprendre les mystères de la combustion spontanée.",
    stats: [{ label: 'Chapitres', value: '304' }, { label: 'Épisodes', value: '48' }, { label: 'Statut', value: 'Terminé' }],
    action: '▶ Voir les épisodes', badge: 'COMPLET',
  },
  {
    id: 'bluelock',
    title: 'Blue Lock',
    subtitle: 'Projet égoïste',
    emoji: '⚽',
    color: '#1565c0',
    coverImage: 'https://static.wikia.nocookie.net/bluelock/images/6/6d/Blue_Lock_TV_Anime_Key_Visual.png/revision/latest?cb=20221004123456',
    coverPosition: 'center top',
    genres: ['Sport', 'Compétition', 'Shōnen'],
    description: "La Fédération japonaise de football engage Ego Jinpachi pour former le meilleur attaquant du monde via un programme radical : Blue Lock.",
    stats: [{ label: 'Chapitres', value: '280+' }, { label: 'Épisodes', value: '24' }, { label: 'Statut', value: 'En cours' }],
    action: '▶ Voir les épisodes', badge: 'NOUVEAU',
  },
  {
    id: 'kaiju8',
    title: 'Kaiju No. 8',
    subtitle: 'Saison 1 · VF + VO',
    emoji: '👾',
    color: '#00bcd4',
    coverImage: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/kaiju-no-8-thumbnails/S01E01.jpg',
    coverPosition: 'center center',
    genres: ['Action', 'Monstres', 'Shōnen'],
    description: "Kafka Hibino rêve d'intégrer les Forces de Défense. Un jour, il avale un petit kaiju et se transforme en monstre de classe dix. Le Kaiju n°8.",
    stats: [{ label: 'Épisodes', value: '12' }, { label: 'Saison', value: '1' }, { label: 'Audio', value: 'VF + VO' }],
    action: '▶ Voir les épisodes', badge: 'MULTI',
  },
  {
    id: 'vivy',
    title: "Vivy: Fluorite Eye's Song",
    subtitle: 'VOSTFR · 13 épisodes',
    emoji: '🎵',
    color: '#00d4ff',
    coverImage: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/vivy/key-visual.jpg',
    coverPosition: 'center top',
    genres: ['Science-fiction', 'Action', 'IA'],
    description: "Vivy, une androïde chanteuse, est chargée d'une mission de 100 ans : empêcher une guerre apocalyptique entre humains et machines en altérant l'histoire.",
    stats: [{ label: 'Épisodes', value: '13' }, { label: 'Studio', value: 'WIT' }, { label: 'Audio', value: 'VOSTFR' }],
    action: '▶ Voir les épisodes', badge: 'VOSTFR',
  },
]

const SEARCH_ALIASES = {
  onepiece:            ['op', 'one piece', 'luffy', 'mugiwara', 'elbaf', 'pirate'],
  'violet-evergarden': ['violet', 'violet evergarden', 'vostfr', 'vf', 'auto memory doll'],
  tpn:                 ['promised neverland', 'neverland', 'emma', 'norman', 'ray'],
  drstone:             ['dr stone', 'senku', 'science'],
  jjk:                 ['jujutsu', 'jujutsu kaisen', 'sukuna', 'itadori', 'gojo'],
  kingdom:             ['shin', 'chine', 'guerre', 'royaumes combattants'],
  aot:                 ['aot', 'snk', 'shingeki', 'attaque des titans', 'attack on titan', 'eren', 'levi'],
  kny:                 ['kny', 'demon slayer', 'kimetsu', 'tanjiro', 'nezuko'],
  nnt:                 ['nnt', 'nanatsu', 'seven deadly sins', '7ds', 'meliodas'],
  sl:                  ['solo leveling', 'sung jinwoo', 'manhwa'],
  dbs:                 ['dbs', 'dragon ball', 'goku', 'vegeta'],
  bc:                  ['black clover', 'asta', 'yuno'],
  mha:                 ['mha', 'my hero academia', 'boku no hero', 'deku', 'izuku'],
  fireforce:           ['fire force', 'enen no shouboutai', 'shinra'],
  bluelock:            ['blue lock', 'football', 'isagi', 'ego'],
  vivy:                ['vivy', 'fluorite', 'eye song', 'ia', 'androide', 'wit studio', 'tappei', 'rezero'],
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function normalizeText(v) {
  return String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
function searchableText(anime) {
  return normalizeText([
    anime.id, anime.title, anime.subtitle, anime.description,
    ...(anime.genres || []), ...(SEARCH_ALIASES[anime.id] || []),
  ].join(' '))
}

// ─── Badge config ─────────────────────────────────────────────────────────────

const BADGE = {
  'NOUVEAU':     { bg: 'rgba(52,211,153,0.12)',  color: '#86efac', border: 'rgba(52,211,153,0.22)'  },
  'À JOUR':      { bg: 'rgba(251,146,60,0.12)',  color: '#fdba74', border: 'rgba(251,146,60,0.22)'  },
  'COMPLET':     { bg: 'rgba(148,163,184,0.10)', color: '#cbd5e1', border: 'rgba(148,163,184,0.18)' },
  'VF + VOSTFR': { bg: 'rgba(167,139,250,0.12)', color: '#c4b5fd', border: 'rgba(167,139,250,0.22)' },
  'VF + JAP':    { bg: 'rgba(251,191,36,0.10)',  color: '#fde68a', border: 'rgba(251,191,36,0.18)'  },
  'MULTI':       { bg: 'rgba(34,211,238,0.10)',  color: '#67e8f9', border: 'rgba(34,211,238,0.18)'  },
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const AH_CSS = `
  @keyframes ahFadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
  @keyframes ahTwinkle { 0%,100%{opacity:.04} 50%{opacity:.26} }
  @keyframes ahDrift   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
  @keyframes ahSlideIn { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:none} }

  .ah-chips-row { scrollbar-width:none; -ms-overflow-style:none; }
  .ah-chips-row::-webkit-scrollbar { display:none; }

  .ah-card {
    transition: transform .28s cubic-bezier(.25,.46,.45,.94),
                box-shadow .28s ease, border-color .22s ease;
  }
  .ah-card:hover {
    transform: scale(1.022) translateY(-4px) !important;
    border-color: rgba(255,255,255,0.16) !important;
    box-shadow: 0 16px 48px rgba(0,0,0,0.70) !important;
  }
  .ah-card:focus-visible { outline: 2px solid rgba(212,160,23,.7); outline-offset: 3px; }
  .ah-card-img { transition: transform .44s cubic-bezier(.25,.46,.45,.94); }
  .ah-card:hover .ah-card-img { transform: scale(1.06) !important; }

  .ah-search { transition: border-color .2s, box-shadow .2s; }
  .ah-search:focus-within {
    border-color: rgba(255,255,255,0.18) !important;
    box-shadow: 0 0 0 3px rgba(255,255,255,.04) !important;
  }

  .ah-pill { transition: background .16s, border-color .16s, color .16s; }
  .ah-pill:hover { border-color: rgba(255,255,255,.22) !important; color: rgba(255,255,255,.85) !important; }
  .ah-pill:focus-visible { outline: 2px solid rgba(212,160,23,.6); outline-offset: 2px; }

  .ah-back { transition: background .16s, color .16s; }
  .ah-back:hover { background: rgba(255,255,255,.10) !important; color: #fff !important; }

  .ah-rail { scrollbar-width: none; -ms-overflow-style: none; }
  .ah-rail::-webkit-scrollbar { display: none; }
  .ah-rail:active { cursor: grabbing !important; }

  .ah-arrow { transition: opacity .16s, background .16s; }
  .ah-arrow:hover:not(:disabled) { background: rgba(255,255,255,.12) !important; }

  .ah-grid-card { transition: transform .25s ease, box-shadow .25s ease, border-color .18s ease; }
  .ah-grid-card:hover { transform: translateY(-7px) !important; border-color: rgba(255,255,255,0.14) !important; }
  .ah-grid-card:focus-visible { outline: 2px solid rgba(212,160,23,.7); outline-offset: 3px; }
  .ah-grid-img { transition: transform .38s ease; }
  .ah-grid-card:hover .ah-grid-img { transform: scale(1.05) !important; }

  .ah-detail-enter { animation: ahSlideIn .28s ease-out both; }
  .ah-cta { transition: background .18s, border-color .18s, transform .14s; }
  .ah-cta:hover { background: rgba(255,255,255,.12) !important; transform: translateY(-1px); }
  .ah-cta:active { transform: translateY(0); }

  @media (prefers-reduced-motion: reduce) {
    .ah-card, .ah-card-img, .ah-arrow, .ah-grid-card, .ah-grid-img,
    .ah-detail-enter, .ah-cta { transition: none !important; animation: none !important; }
  }
`

// ─── FADE_W: fade mask width must match rail padding so first card is fully visible
const FADE_W = 52

// ─── Background ───────────────────────────────────────────────────────────────

function AHBackground() {
  const stars = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    x: (i * 43.7 + 9) % 98, y: (i * 37.1 + 13) % 93,
    size: i % 9 === 0 ? 1.5 : 0.9,
    dur: 4 + (i * 0.33) % 5, del: (i * 0.29) % 8,
  })), [])
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {/* ambient radials */}
      <div style={{ position: 'absolute', left: '8%',  top: '15%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.022),transparent 70%)', transform: 'translate(-50%,-50%)' }} />
      <div style={{ position: 'absolute', left: '82%', top: '55%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,0.016),transparent 70%)', transform: 'translate(-50%,-50%)' }} />
      <div style={{ position: 'absolute', left: '44%', top: '78%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle,rgba(212,160,23,0.014),transparent 70%)', transform: 'translate(-50%,-50%)' }} />
      {/* stars */}
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: '50%',
          background: 'rgba(255,255,255,0.35)',
          animation: `ahTwinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

// ─── Fallback cover ───────────────────────────────────────────────────────────

function FallbackCover({ anime }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(160deg,#14161e 0%,#0b0d12 60%,#0e1018 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
    }}>
      <div style={{ fontSize: 30, filter: 'brightness(0.75)' }}>{anime.emoji}</div>
      <div style={{
        fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.18)',
        letterSpacing: '.14em', textTransform: 'uppercase', textAlign: 'center', maxWidth: 110,
      }}>
        {anime.title.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
      </div>
    </div>
  )
}

// ─── Inline badge ─────────────────────────────────────────────────────────────

function Badge({ badge, style: extra }) {
  if (!badge) return null
  const s = BADGE[badge] || { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.12)' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 8.5, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 100, padding: '2.5px 8px', backdropFilter: 'blur(10px)',
      ...extra,
    }}>
      {badge}
    </span>
  )
}

// ─── Carousel card ────────────────────────────────────────────────────────────

function AnimeCard({ anime, onClick }) {
  const [imgErr, setImgErr] = useState(false)
  const mainStat = anime.stats?.[0]

  return (
    <div
      className="ah-card"
      onClick={onClick}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      aria-label={`${anime.title}${anime.badge ? ` — ${anime.badge}` : ''}`}
      style={{
        flexShrink: 0, width: 216, height: 312, borderRadius: 18, overflow: 'hidden',
        position: 'relative', cursor: 'pointer', background: '#0d0f15',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.55)',
        scrollSnapAlign: 'start',
      }}
    >
      {/* cover image */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {(!imgErr && anime.coverImage)
          ? <img
              src={anime.coverImage} alt={anime.title} loading="lazy"
              className="ah-card-img"
              onError={() => setImgErr(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: anime.coverPosition || 'center top' }}
            />
          : <FallbackCover anime={anime} />
        }
      </div>

      {/* gradient — stronger bottom */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.02) 0%, transparent 26%, rgba(0,0,0,0.50) 58%, rgba(0,0,0,0.97) 100%)',
      }} />

      {/* badge top-left */}
      {anime.badge && (
        <div style={{ position: 'absolute', top: 9, left: 9, zIndex: 4 }}>
          <Badge badge={anime.badge} />
        </div>
      )}

      {/* info bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 13px 14px', zIndex: 3 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 800, color: '#EDEBE3', lineHeight: 1.22,
          marginBottom: 7, textShadow: '0 1px 14px rgba(0,0,0,1)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {anime.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {anime.genres.slice(0, 2).map(g => (
              <span key={g} style={{
                fontSize: 9, fontWeight: 700, background: 'rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.50)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 100, padding: '2px 7px', whiteSpace: 'nowrap',
              }}>{g}</span>
            ))}
          </div>
          {mainStat && (
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.32)', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {mainStat.value}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Horizontal rail ──────────────────────────────────────────────────────────

function AnimeRail({ title, subtitle, accent = 'rgba(255,255,255,0.4)', animes, onCardClick }) {
  const railRef = useRef(null)
  const drag    = useRef({ on: false, x: 0, sl: 0, moved: false })
  const [canL, setCanL] = useState(false)
  const [canR, setCanR] = useState(true)

  const sync = useCallback(() => {
    const el = railRef.current
    if (!el) return
    setCanL(el.scrollLeft > 8)
    setCanR(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
  }, [])

  useEffect(() => {
    const el = railRef.current
    if (!el) return
    el.addEventListener('scroll', sync, { passive: true })
    sync()
    return () => el.removeEventListener('scroll', sync)
  }, [sync])

  const shift = dir => railRef.current?.scrollBy({ left: dir * 560, behavior: 'smooth' })

  const onDown = e => {
    drag.current = { on: true, x: e.pageX, sl: railRef.current.scrollLeft, moved: false }
  }
  const onMove = e => {
    if (!drag.current.on) return
    const dx = e.pageX - drag.current.x
    if (Math.abs(dx) > 4) drag.current.moved = true
    railRef.current.scrollLeft = drag.current.sl - dx
  }
  const onUp = () => { drag.current.on = false }

  const handleCardClick = id => { if (!drag.current.moved) onCardClick(id) }

  if (!animes.length) return null

  return (
    <div style={{ marginBottom: 28 }} role="region" aria-label={title}>
      {/* section header — même padding que les cartes pour alignement parfait */}
      <div style={{
        padding: `0 ${FADE_W}px 10px`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 3, height: 16, borderRadius: 2, background: accent, flexShrink: 0 }} />
          <h3 style={{ fontSize: 15.5, fontWeight: 800, color: '#EDEBE3', margin: 0, letterSpacing: '-.01em' }}>
            {title}
          </h3>
          {subtitle && (
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.24)', fontWeight: 600 }}>{subtitle}</span>
          )}
        </div>

        {/* arrow buttons */}
        <div style={{ display: 'flex', gap: 5 }}>
          {[{ dir: -1, label: 'Précédent', can: canL }, { dir: 1, label: 'Suivant', can: canR }].map(({ dir, label, can }) => (
            <button
              key={dir}
              className="ah-arrow"
              onClick={() => shift(dir)}
              disabled={!can}
              aria-label={label}
              style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                border: `1px solid ${can ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.05)'}`,
                background: can ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
                color: can ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.18)',
                cursor: can ? 'pointer' : 'default',
                fontSize: 19, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {dir < 0 ? '‹' : '›'}
            </button>
          ))}
        </div>
      </div>

      {/* scroll zone */}
      <div style={{ position: 'relative' }}>
        {/* left fade — only when scrolled right */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 8, width: FADE_W, zIndex: 2, pointerEvents: 'none',
          background: 'linear-gradient(to right,#07090e 0%,transparent 100%)',
          opacity: canL ? 1 : 0, transition: 'opacity .22s',
        }} />
        {/* right fade — only when more content exists */}
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 8, width: FADE_W, zIndex: 2, pointerEvents: 'none',
          background: 'linear-gradient(to left,#07090e 0%,transparent 100%)',
          opacity: canR ? 1 : 0, transition: 'opacity .22s',
        }} />

        <div
          ref={railRef}
          className="ah-rail"
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          style={{
            display: 'flex', gap: 13,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            padding: `6px ${FADE_W}px 16px`,
            cursor: 'grab',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {animes.map(anime => (
            <AnimeCard key={anime.id} anime={anime} onClick={() => handleCardClick(anime.id)} />
          ))}
        </div>
      </div>
    </div>
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
        position: 'relative', borderRadius: 16, overflow: 'hidden',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.30)',
        cursor: 'pointer',
        animation: `ahFadeUp .38s ${index * 0.048}s ease-out both`,
      }}
    >
      <div style={{ height: 205, position: 'relative', overflow: 'hidden', background: '#0c0e14' }}>
        {(!imgErr && anime.coverImage)
          ? <img
              src={anime.coverImage} alt={anime.title} loading="lazy"
              className="ah-grid-img"
              onError={() => setImgErr(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: anime.coverPosition || 'center top' }}
            />
          : <FallbackCover anime={anime} />
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,transparent 30%,rgba(0,0,0,0.68) 100%)', zIndex: 1 }} />
        {anime.badge && (
          <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }}>
            <Badge badge={anime.badge} />
          </div>
        )}
      </div>
      <div style={{ padding: '14px 16px 14px' }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#EDEBE3', marginBottom: 2, letterSpacing: '-.01em' }}>{anime.title}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginBottom: 10, fontWeight: 600 }}>{anime.subtitle}</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
          {anime.genres.map(g => (
            <span key={g} style={{
              fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.40)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 100, padding: '2px 9px',
            }}>{g}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}>
          {anime.stats?.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.26)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Anime detail view ────────────────────────────────────────────────────────

function AnimeDetailView({ anime, onBack, onOpen }) {
  const [imgErr, setImgErr] = useState(false)

  return (
    <div className="ah-detail-enter" style={{ minHeight: '100%' }}>
      {/* hero */}
      <div style={{ position: 'relative', height: 'clamp(300px,42vh,460px)', overflow: 'hidden', background: '#0c0e14' }}>
        {(!imgErr && anime.coverImage)
          ? <img
              src={anime.coverImage} alt={anime.title} loading="eager"
              onError={() => setImgErr(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: anime.coverPosition || 'center top' }}
            />
          : <FallbackCover anime={anime} />
        }
        {/* dark overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(7,9,14,0.25) 35%, rgba(7,9,14,0.82) 75%, #07090e 100%)',
        }} />

        {/* back button */}
        <button
          className="ah-back"
          onClick={onBack}
          aria-label="Retour à la bibliothèque"
          style={{
            position: 'absolute', top: 16, left: 16, zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'rgba(0,0,0,0.52)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10, color: 'rgba(255,255,255,0.72)', cursor: 'pointer',
            padding: '8px 16px', fontSize: 12.5, fontWeight: 700,
            backdropFilter: 'blur(16px)',
          }}
        >
          ← Retour
        </button>

        {/* title area */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 40px 26px', zIndex: 2 }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            {anime.badge && (
              <div style={{ marginBottom: 10 }}>
                <Badge badge={anime.badge} />
              </div>
            )}
            <h1 style={{
              fontFamily: "'Pirata One', cursive",
              fontSize: 'clamp(22px,3.5vw,42px)', fontWeight: 900,
              color: '#fff', margin: '0 0 5px', lineHeight: 1.05,
              textShadow: '0 2px 24px rgba(0,0,0,0.85)',
            }}>
              {anime.title}
            </h1>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', fontWeight: 600 }}>{anime.subtitle}</div>
          </div>
        </div>
      </div>

      {/* content */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 40px 64px' }}>
        {/* genres + stats pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
          {anime.genres?.map(g => (
            <span key={g} style={{
              fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.48)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 100, padding: '4px 12px',
            }}>{g}</span>
          ))}
          {anime.stats?.map(s => (
            <span key={s.label} style={{
              fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.42)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 100, padding: '4px 12px',
            }}>
              {s.value} {s.label}
            </span>
          ))}
        </div>

        {/* description */}
        {anime.description && (
          <p style={{
            fontSize: 14.5, color: 'rgba(255,255,255,0.60)', lineHeight: 1.72,
            margin: '0 0 28px', maxWidth: 680,
          }}>
            {anime.description}
          </p>
        )}

        {/* divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 24 }} />

        {/* action */}
        {onOpen ? (
          <button
            className="ah-cta"
            onClick={onOpen}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.13)',
              borderRadius: 12, color: '#fff', cursor: 'pointer',
              padding: '13px 26px', fontSize: 14, fontWeight: 800,
            }}
          >
            {anime.action || '▶ Voir les épisodes'}
          </button>
        ) : (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.24)', fontWeight: 600 }}>
            Page dédiée bientôt disponible.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AnimeHub({
  onClose,
  onOpenOnepiece, onOpenTpn, onOpenDrstone, onOpenJjk, onOpenKingdom,
  onOpenAot, onOpenKny, onOpenNnt, onOpenSl, onOpenDbs, onOpenViolet,
  onOpenBc, onOpenMha, onOpenFireforce, onOpenBluelock, onOpenKaiju8, onOpenVivy,
}) {
  const [query,       setQuery]       = useState('')
  const [activeGenre, setActiveGenre] = useState('all')
  const [detailId,    setDetailId]    = useState(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const OPEN_MAP = {
    onepiece: onOpenOnepiece, tpn: onOpenTpn, drstone: onOpenDrstone,
    jjk: onOpenJjk, kingdom: onOpenKingdom, aot: onOpenAot,
    kny: onOpenKny, nnt: onOpenNnt, sl: onOpenSl, dbs: onOpenDbs,
    'violet-evergarden': onOpenViolet,
    bc: onOpenBc, mha: onOpenMha, fireforce: onOpenFireforce,
    bluelock: onOpenBluelock, kaiju8: onOpenKaiju8, vivy: onOpenVivy,
  }

  const sortedAnimes = useMemo(() => {
    const prio = { onepiece: 0, 'violet-evergarden': 1, kaiju8: 2, jjk: 3, sl: 4, aot: 5, kny: 6 }
    return [...ANIMES].sort((a, b) => (prio[a.id] ?? 10) - (prio[b.id] ?? 10))
  }, [])

  const sections = useMemo(() => ({
    tendances:  sortedAnimes.filter(a => ['onepiece', 'jjk', 'sl', 'aot', 'kny', 'violet-evergarden', 'kaiju8'].includes(a.id)),
    nouveautes: sortedAnimes.filter(a => a.badge === 'NOUVEAU'),
    collection: sortedAnimes,
  }), [sortedAnimes])

  const heroStats = useMemo(() => ({
    total:      sortedAnimes.length,
    vf:         sortedAnimes.filter(a => ['VF + VOSTFR', 'VF + JAP', 'MULTI'].includes(a.badge)).length,
    nouveautes: sortedAnimes.filter(a => a.badge === 'NOUVEAU').length,
    complets:   sortedAnimes.filter(a => a.badge === 'COMPLET').length,
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

  const handleCardClick = id => setDetailId(id)

  const detailAnime = detailId ? ANIMES.find(a => a.id === detailId) : null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#07090e', display: 'flex', flexDirection: 'column' }}>
      <style>{AH_CSS}</style>

      {/* ── Top nav bar ──────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, padding: '0 24px', height: 62,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(7,9,14,0.97)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)', zIndex: 10, position: 'relative',
      }}>
        <button
          className="ah-back"
          onClick={detailAnime ? () => setDetailId(null) : onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 10, color: 'rgba(255,255,255,0.65)', cursor: 'pointer',
            padding: '8px 16px', fontSize: 12.5, fontWeight: 700,
          }}
        >
          ← {detailAnime ? 'Bibliothèque' : 'Retour'}
        </button>

        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 9,
        }}>
          <span style={{ fontSize: 18, animation: 'ahDrift 6s ease-in-out infinite' }}>🎌</span>
          <span style={{ fontFamily: "'Pirata One',cursive", fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: '-.01em' }}>
            {detailAnime ? detailAnime.title : 'Mes Animés'}
          </span>
        </div>

        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.26)', fontWeight: 700 }}>
          {heroStats.total} séries
        </div>
      </div>

      {/* ── Scrollable content ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <AHBackground />

        <div style={{ position: 'relative', zIndex: 2 }}>

          {detailAnime ? (
            /* ── DETAIL VIEW ──────────────────────────────────────────────── */
            <AnimeDetailView
              anime={detailAnime}
              onBack={() => setDetailId(null)}
              onOpen={OPEN_MAP[detailAnime.id] || null}
            />
          ) : (
            /* ── LIBRARY VIEW ─────────────────────────────────────────────── */
            <>
              {/* hero compact — titre + stats en 1 bloc dense */}
              <div style={{ padding: `12px ${FADE_W}px 10px`, position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'radial-gradient(ellipse 55% 55% at 50% 0%,rgba(139,92,246,0.04),transparent)',
                }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <h1 style={{
                      fontFamily: "'Pirata One',cursive", fontWeight: 900,
                      fontSize: 'clamp(22px,2.6vw,32px)', color: '#fff',
                      margin: '0 0 4px', lineHeight: 1.05, letterSpacing: '-.02em',
                    }}>
                      Mes Animés
                    </h1>
                    <p style={{
                      fontSize: 12, color: 'rgba(255,255,255,0.28)', margin: 0,
                      lineHeight: 1.4, fontWeight: 500,
                    }}>
                      Scans, épisodes, suivis et découvertes de la communauté.
                    </p>
                  </div>
                  {/* stats pills — ligne droite */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {[
                      { label: 'Nouveautés', value: heroStats.nouveautes, dot: '#86efac' },
                      { label: 'VF dispo',   value: heroStats.vf,         dot: '#c4b5fd' },
                      { label: 'Complétés',  value: heroStats.complets,   dot: '#cbd5e1' },
                    ].map(s => (
                      <div key={s.label} style={{
                        display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                        borderRadius: 100, background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.38)',
                        whiteSpace: 'nowrap',
                      }}>
                        <div style={{ width: 4.5, height: 4.5, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                        <span style={{ fontWeight: 800, color: 'rgba(255,255,255,0.65)' }}>{s.value}</span>
                        <span>{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* search + filters — bande horizontale compacte */}
              <div style={{ padding: `0 ${FADE_W}px 10px` }}>
                {/* search input */}
                <div
                  className="ah-search"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: 10, padding: '8px 13px', marginBottom: 8,
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.30)', fontSize: 15, flexShrink: 0 }}>⌕</span>
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Rechercher un animé, un genre, un statut…"
                    aria-label="Rechercher un animé"
                    style={{
                      width: '100%', background: 'transparent', border: 'none', outline: 'none',
                      color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'var(--body)',
                    }}
                  />
                  {(query || activeGenre !== 'all') && (
                    <button
                      type="button"
                      onClick={() => { setQuery(''); setActiveGenre('all') }}
                      style={{
                        flexShrink: 0, border: '1px solid rgba(255,255,255,0.09)',
                        background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)',
                        borderRadius: 7, padding: '3px 9px', cursor: 'pointer', fontSize: 11, fontWeight: 800,
                      }}
                    >✕</button>
                  )}
                  {/* count inline */}
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', fontWeight: 700, flexShrink: 0, paddingLeft: 4 }}>
                    {isFiltering
                      ? `${visibleAnimes.length} rés.`
                      : `${sortedAnimes.length} séries`}
                  </span>
                </div>

                {/* genre chips — une seule ligne, scroll horizontal */}
                <div className="ah-chips-row" style={{ display: 'flex', gap: 5, overflowX: 'auto', padding: '2px 0 4px' }}>
                  {genreOptions.map(genre => {
                    const active = activeGenre === genre
                    return (
                      <button
                        key={genre} type="button"
                        className="ah-pill"
                        onClick={() => setActiveGenre(genre)}
                        style={{
                          border: `1px solid ${active ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.07)'}`,
                          background: active ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.02)',
                          color: active ? '#fff' : 'rgba(255,255,255,0.38)',
                          borderRadius: 999, padding: '4px 12px', cursor: 'pointer',
                          fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
                        }}
                      >
                        {genre === 'all' ? 'Tous' : genre}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* content: filtered grid or section rails */}
              {isFiltering ? (
                <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px 80px' }}>
                  {visibleAnimes.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
                      {visibleAnimes.map((anime, i) => (
                        <AnimeGridCard key={anime.id} anime={anime} index={i} onClick={() => handleCardClick(anime.id)} />
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      border: '1px dashed rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)',
                      borderRadius: 16, padding: '52px 20px', textAlign: 'center',
                      color: 'rgba(255,255,255,0.28)', fontSize: 14, fontWeight: 700,
                    }}>
                      Aucun animé trouvé pour cette recherche
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ paddingBottom: 80 }}>
                  <AnimeRail
                    title="Tendances"
                    subtitle="Les séries les plus suivies"
                    accent="#e0524a"
                    animes={sections.tendances}
                    onCardClick={handleCardClick}
                  />
                  <AnimeRail
                    title="Nouveautés"
                    subtitle="Récemment ajoutées"
                    accent="#86efac"
                    animes={sections.nouveautes}
                    onCardClick={handleCardClick}
                  />
                  <AnimeRail
                    title="Collection complète"
                    subtitle={`${sortedAnimes.length} séries disponibles`}
                    accent="#c4b5fd"
                    animes={sections.collection}
                    onCardClick={handleCardClick}
                  />
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}
