// ── OST Participants catalog ───────────────────────────────────────────────
// Uniquement des OST / BGM / insert songs — aucun opening ni ending.
// ytId: YouTube video ID. Vérifier/mettre à jour selon les uploads officiels.
// type: 'bgm' | 'insert' pour affichage

export const OST_CATALOG = [
  // ── Joe Hisaishi / Ghibli ───────────────────────────────────────────────
  { id:'spirited-summer',    title:'One Summer\'s Day',       anime:'Spirited Away',              artist:'Joe Hisaishi',           type:'bgm',    ytId:'7RFGB9DMHIA', color:'#0891b2' },
  { id:'spirited-inochi',    title:'The Name of Life',        anime:'Spirited Away',              artist:'Joe Hisaishi',           type:'bgm',    ytId:'HK4lL-bNIUo', color:'#059669' },
  { id:'howl-merry',         title:'Merry-Go-Round of Life',  anime:"Howl's Moving Castle",       artist:'Joe Hisaishi',           type:'bgm',    ytId:'HkKmFBX4-Rc', color:'#7c3aed' },

  // ── Hiroyuki Sawano / Attack on Titan ───────────────────────────────────
  { id:'aot-vogel',          title:'Vogel im Käfig',          anime:'Attack on Titan',            artist:'Hiroyuki Sawano',        type:'insert', ytId:'AVFX9sybmAA', color:'#991b1b' },
  { id:'aot-youseebigirl',   title:'YouSeeBIGGIRL/T:T',       anime:'Attack on Titan',            artist:'Hiroyuki Sawano',        type:'insert', ytId:'dUKvLNAT3Cs', color:'#b91c1c' },
  { id:'aot-callofsilence',  title:'Call of Silence',         anime:'Attack on Titan',            artist:'Hiroyuki Sawano',        type:'insert', ytId:'Gp_gS6i7VXI', color:'#7f1d1d' },

  // ── Naruto / Masuda ─────────────────────────────────────────────────────
  { id:'naruto-sadness',     title:'Sadness and Sorrow',      anime:'Naruto',                     artist:'Toshio Masuda',          type:'bgm',    ytId:'qQrOERPMjRk', color:'#d97706' },
  { id:'naruto-loneliness',  title:'Loneliness',              anime:'Naruto',                     artist:'Toshio Masuda',          type:'bgm',    ytId:'i8QJg8l4IYc', color:'#b45309' },
  { id:'naruto-ninja-way',   title:'Naruto\'s Ninja Way',     anime:'Naruto',                     artist:'Toshio Masuda',          type:'bgm',    ytId:'5MqSBuoHJ7A', color:'#92400e' },

  // ── Bleach ──────────────────────────────────────────────────────────────
  { id:'bleach-number-one',  title:'Number One',              anime:'Bleach',                     artist:'Shirō Sagisu',           type:'bgm',    ytId:'n_bCl-Q24z8', color:'#1e40af' },

  // ── Yuki Kajiura ────────────────────────────────────────────────────────
  { id:'madoka-sis-puella',  title:'Sis Puella Magica!',      anime:'Puella Magi Madoka Magica',  artist:'Yuki Kajiura',           type:'bgm',    ytId:'wZHiXpbAqwM', color:'#be185d' },
  { id:'madoka-credens',     title:'Credens Justitiam',       anime:'Puella Magi Madoka Magica',  artist:'Yuki Kajiura',           type:'bgm',    ytId:'0S-IpfkXYHM', color:'#9d174d' },
  { id:'sao-swordland',      title:'Swordland',               anime:'Sword Art Online',           artist:'Yuki Kajiura',           type:'bgm',    ytId:'7oNBBvWz0lE', color:'#1d4ed8' },
  { id:'fatezero-point',     title:'Point Zero',              anime:'Fate/Zero',                  artist:'Yuki Kajiura',           type:'bgm',    ytId:'R8-0mKRJWJg', color:'#4c1d95' },

  // ── FMA Brotherhood ─────────────────────────────────────────────────────
  { id:'fmab-lapis',         title:'Lapis Philosophorum',     anime:'FMA: Brotherhood',           artist:'Akira Senju',            type:'bgm',    ytId:'AuAeIGgIb4o', color:'#c2410c' },

  // ── Demon Slayer ────────────────────────────────────────────────────────
  { id:'kny-tanjiro-uta',    title:'Kamado Tanjiro no Uta',   anime:'Demon Slayer',               artist:'Go Shiina & Nami Nakagawa', type:'insert', ytId:'lBkbBdR7BM8', color:'#dc2626' },
  { id:'kny-homura',         title:'Homura',                  anime:'Demon Slayer: Mugen Train',  artist:'LiSA',                   type:'insert', ytId:'FzDH0eFolEc', color:'#991b1b' },

  // ── Gurren Lagann ───────────────────────────────────────────────────────
  { id:'ttgl-libera',        title:'Libera Me from Hell',     anime:'Tengen Toppa Gurren Lagann', artist:'Taku Iwasaki',           type:'insert', ytId:'8LOaQHITe20', color:'#d97706' },

  // ── One Piece ───────────────────────────────────────────────────────────
  { id:'op-binks-sake',      title:"Bink's Sake",             anime:'One Piece',                  artist:'Straw Hat Pirates',      type:'insert', ytId:'bKxRtx6CVTM', color:'#b45309' },

  // ── Clannad ─────────────────────────────────────────────────────────────
  { id:'clannad-nagisa',     title:'Nagisa',                  anime:'Clannad',                    artist:'Jun Maeda / Shinji Orito', type:'bgm',   ytId:'cIVcZqeU31Y', color:'#0369a1' },

  // ── Violet Evergarden ───────────────────────────────────────────────────
  { id:'violet-never',       title:'Never Coming Back',       anime:'Violet Evergarden',          artist:'Evan Call',              type:'bgm',    ytId:'JoFU5-5TiWY', color:'#1e3a5f' },

  // ── Sword of the Stranger ────────────────────────────────────────────────
  { id:'stranger-lotus',     title:'Lotus (Battle)',          anime:'Sword of the Stranger',      artist:'Naoki Sato',             type:'bgm',    ytId:'EkVcKhKcX3g', color:'#7c3aed' },

  // ── Made in Abyss ───────────────────────────────────────────────────────
  { id:'mia-hanezeve',       title:'Hanezeve Caradhina',      anime:'Made in Abyss',              artist:'Kevin Penkin',           type:'insert', ytId:'pYh-TKVV3a4', color:'#0891b2' },

  // ── Neon Genesis Evangelion ─────────────────────────────────────────────
  { id:'nge-komm',           title:'Komm Süsser Tod',         anime:'End of Evangelion',          artist:'Arianne',                type:'insert', ytId:'WcvbDgMTeRY', color:'#7c3aed' },

  // ── Angel Beats! ────────────────────────────────────────────────────────
  { id:'ab-my-song',         title:'My Song',                 anime:'Angel Beats!',               artist:'Girls Dead Monster',     type:'insert', ytId:'_1l6nIpRy00', color:'#1d4ed8' },

  // ── Guilty Crown ────────────────────────────────────────────────────────
  { id:'gc-euterpe',         title:'Euterpe',                 anime:'Guilty Crown',               artist:'EGOIST',                 type:'insert', ytId:'oXBHFoJUxXk', color:'#0e7490' },

  // ── JoJo's Bizarre Adventure ────────────────────────────────────────────
  { id:'jojo-vento',         title:"il vento d'oro",          anime:"JoJo's Bizarre Adventure 5", artist:'Yugo Kanno',             type:'bgm',    ytId:'a2TDsLBiggU', color:'#15803d' },

  // ── Fate/stay night ─────────────────────────────────────────────────────
  { id:'fate-emiya',         title:'Emiya',                   anime:'Fate/stay night',            artist:'Kenji Kawai',            type:'bgm',    ytId:'XpbnNJfTujE', color:'#7c3aed' },

  // ── Hunter x Hunter ─────────────────────────────────────────────────────
  { id:'hxh-you-can-smile',  title:'You Can Smile',           anime:'Hunter x Hunter 2011',       artist:'Yoshihisa Hirano',       type:'bgm',    ytId:'2YxXRlTR1fU', color:'#065f46' },

  // ── Death Note ──────────────────────────────────────────────────────────
  { id:'dn-l-theme',         title:"L's Theme",               anime:'Death Note',                 artist:'Yoshihisa Hirano & Hideki Taniuchi', type:'bgm', ytId:'ywOBhJRsFuI', color:'#1e293b' },

  // ── Vinland Saga ────────────────────────────────────────────────────────
  { id:'vinland-faraway',    title:'Far Away',                anime:'Vinland Saga',               artist:'Yutaka Yamada',          type:'bgm',    ytId:'similar1',    color:'#64748b' },

  // ── Yuri!!! on Ice ──────────────────────────────────────────────────────
  { id:'yoi-theme',          title:'Yuri on Ice',             anime:'Yuri!!! on Ice',             artist:'T. Umebayashi & T. Matsushiba', type:'bgm', ytId:'C_DdmHNGMSI', color:'#1e40af' },
]

// ── Initial tournament configuration ─────────────────────────────────────
export const TOURNAMENT_CONFIG = {
  id:          'best-anime-ost-2026',
  title:       'Best Anime OST 2026',
  description: 'Le tournoi communautaire pour élire la meilleure OST anime de la décennie. BGM, insert songs, thèmes instrumentaux — les vrais classiques.',
  status:      'active',
  format:      'single_elimination',
  edition:     'Edition 1',
  startDate:   '2026-05-24',
  participants: OST_CATALOG, // 32 participants
}
