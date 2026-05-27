import { LOCAL_TRACKS } from '../lib/blindTest.js'

// ── OST Participants catalog ───────────────────────────────────────────────
// ytId: YouTube video ID for playback embed. Verify/update IDs as needed.
// color: accent color for the card (used when thumbnail fails to load).

export const OST_CATALOG = [
  { id:'aot-op1',      title:'Guren no Yumiya',          anime:'Attack on Titan',            artist:'Linked Horizon',         ytId:'yFng5OTIW0k', color:'#c62828' },
  { id:'tkg-op1',      title:'Unravel',                  anime:'Tokyo Ghoul',                artist:'TK from 凛として時雨',    ytId:'vStHmc6oOCo', color:'#7c3aed' },
  { id:'jjk-op1',      title:'Kaikai Kitan',              anime:'Jujutsu Kaisen',             artist:'Eve',                    ytId:'wQCOAt0nMPU', color:'#0e7490' },
  { id:'kny-op1',      title:'Gurenge',                  anime:'Demon Slayer',               artist:'LiSA',                   ytId:'pManX5H7PGs', color:'#dc2626' },
  { id:'cg-op1',       title:'Colors',                   anime:'Code Geass',                 artist:'FLOW',                   ytId:'UCo4FE5xhT0', color:'#b45309' },
  { id:'sg-op1',       title:'Hacking to the Gate',      anime:"Steins;Gate",                artist:'Kanako Itou',            ytId:'GTFK9TIFhbk', color:'#0369a1' },
  { id:'fmab-op1',     title:'Again',                    anime:'FMA: Brotherhood',           artist:'YUI',                    ytId:'fIRCVHBEFg8', color:'#b45309' },
  { id:'jojo-op2',     title:'Bloody Stream',            anime:"JoJo's Bizarre Adventure",   artist:'Coda',                   ytId:'wskp2grqVjE', color:'#7c3aed' },
  { id:'rezero-op1',   title:'Redo',                     anime:'Re:Zero',                    artist:'Konomi Suzuki',          ytId:'XTZj7_O8Blc', color:'#0891b2' },
  { id:'sao-op1',      title:'crossing field',           anime:'Sword Art Online',           artist:'LiSA',                   ytId:'u9K7B8UQRiw', color:'#1d4ed8' },
  { id:'hxh-op1',      title:'Departure!',               anime:'Hunter x Hunter 2011',       artist:'Masatoshi Ono',          ytId:'bDlbj7p_sWQ', color:'#065f46' },
  { id:'dn-op1',       title:'The World',                anime:'Death Note',                 artist:'Nightmare',              ytId:'uBTRa1KbPiQ', color:'#0f172a' },
  { id:'mha-op1',      title:'The Day',                  anime:'My Hero Academia',           artist:'PORNO GRAFFITTI',        ytId:'6OmwKZ9r07o', color:'#1e40af' },
  { id:'tpn-op1',      title:'Touch Off',                anime:'The Promised Neverland',     artist:'UVERworld',              ytId:'J0GR01AkBxQ', color:'#15803d' },
  { id:'bc-op1',       title:'Haruka Mirai',             anime:'Black Clover',               artist:'KANA-BOON',             ytId:'zJmBEJZpMRE', color:'#16a34a' },
  { id:'ns-op16',      title:'Silhouette',               anime:'Naruto Shippuden',           artist:'KANA-BOON',             ytId:'XHiQl-u1qEU', color:'#b45309' },
  { id:'vivy-op1',     title:'Sing My Pleasure',         anime:'Vivy: Fluorite Eye\'s Song', artist:'Vo. Kairi Yagi',         ytId:'TGHJeSNk5Ug', color:'#0e7490' },
  { id:'aot-op4',      title:'Shoukei to Shikabane',     anime:'Attack on Titan Final',      artist:'SiM',                    ytId:'3tBi5RFBj7Y',  color:'#991b1b' },
  { id:'madoka-op1',   title:'Connect',                  anime:'Puella Magi Madoka Magica',  artist:'ClariS',                 ytId:'hFf3HfJkVN8', color:'#be185d' },
  { id:'nge-op1',      title:"A Cruel Angel's Thesis",   anime:'Neon Genesis Evangelion',    artist:'Yoko Takahashi',         ytId:'JlP1pWFruCU', color:'#7c3aed' },
  { id:'cb-op1',       title:'Tank!',                    anime:'Cowboy Bebop',               artist:'The Seatbelts',          ytId:'J3QnHHGQyiY', color:'#b45309' },
  { id:'op-op1',       title:'We Are!',                  anime:'One Piece',                  artist:'Hiroshi Kitadani',       ytId:'qvKAApHaHnw', color:'#d97706' },
  { id:'hk-op1',       title:'Imagination',              anime:'Haikyuu!!',                  artist:'SPYAIR',                 ytId:'similar',     color:'#0369a1' },
  { id:'ylia-op1',     title:'Hikaru Nara',              anime:'Your Lie in April',          artist:'Goose house',            ytId:'VkHN5K3fhTw', color:'#7c3aed' },
  { id:'violet-op1',   title:'Sincerely',                anime:'Violet Evergarden',          artist:'TRUE',                   ytId:'fmXRmH1_Wqw', color:'#1e3a5f' },
  { id:'fate-ubw-op2', title:'Brave Shine',              anime:'Fate/stay night UBW',        artist:'Aimer',                  ytId:'tZ6vVYfCRaI', color:'#7c3aed' },
  { id:'anohana-ed1',  title:'Secret Base',              anime:'AnoHana',                    artist:'Zone',                   ytId:'oTHF9B1Byxg', color:'#be185d' },
  { id:'mob-op1',      title:'99',                       anime:'Mob Psycho 100',             artist:'MOB CHOIR',              ytId:'wqbmMhzYA3M', color:'#065f46' },
  { id:'op-op15',      title:'We Go!',                   anime:'One Piece',                  artist:'Hiroshi Kitadani',       ytId:'GvvjKqXRY9w', color:'#d97706' },
  { id:'fmab-op3',     title:'Golden Time Lover',        anime:'FMA: Brotherhood',           artist:'Sukima Switch',          ytId:'similar2',    color:'#b45309' },
  { id:'kny-op2',      title:'Zankyou Sanka',            anime:'Demon Slayer S2',            artist:'Aimer',                  ytId:'similar3',    color:'#dc2626' },
  { id:'yoi-op1',      title:'History Maker',            anime:'Yuri!!! on Ice',             artist:'Dean Fujioka',           ytId:'rFOVBVMJhgY', color:'#1d4ed8' },
]

export const BLIND_TEST_OPENING_CATALOG = LOCAL_TRACKS.map((track) => ({
  id: track.id,
  title: track.title,
  anime: track.anime,
  artist: track.artist || track.episode || 'Blind Test',
  type: track.type || 'OP',
  episode: track.episode,
  audioUrl: track.url,
  ytId: track.ytId || null,
  color: track.color || '#6366f1',
  emoji: track.emoji || null,
}))

// ── Initial tournament configuration ─────────────────────────────────────
export const TOURNAMENT_CONFIG = {
  id:          'best-anime-ost-2026',
  title:       'Best Anime OST 2026',
  description: 'Le tournoi communautaire pour élire la meilleure OST anime de la décennie.',
  status:      'active',
  format:      'single_elimination',
  edition:     'Edition 1',
  startDate:   '2026-05-24',
  categoryLabel:'OST Arena',
  route:        '/tournoi/ost',
  version:      'v2-ost',
  participants: OST_CATALOG, // 32 participants
}

export const OPENING_TOURNAMENT_CONFIG = {
  id:          'best-anime-opening-2026',
  title:       'Best Anime Opening 2026',
  description: `${BLIND_TEST_OPENING_CATALOG.length} openings du Blind Test. Lance les extraits, compare en 1v1, et fais avancer le meilleur opening.`,
  status:      'active',
  format:      'single_elimination',
  edition:     'Edition 1',
  startDate:   '2026-05-27',
  categoryLabel:'Openings',
  route:        '/tournoi/openings',
  version:      'v2-opening-blind-test',
  participants: BLIND_TEST_OPENING_CATALOG,
}

export const TOURNAMENT_CONFIGS = {
  ost: TOURNAMENT_CONFIG,
  opening: OPENING_TOURNAMENT_CONFIG,
}
