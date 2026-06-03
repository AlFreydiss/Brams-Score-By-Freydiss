import { supabase } from './supabase.js'

// ── Local tracks (always available, no DB needed) ──────────────────────────
// type: 'OP' (opening) ou 'ED' (ending) — sert à séparer Blind Test / Tournois.
export const LOCAL_TRACKS = [
  // ═══ ENDINGS ═══
  {
    id: 'fz-ed1', anime: 'Fate/Zero', title: 'Memoria', artist: 'Kalafina', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/fz-ed1.mp4',
    difficulty: 'difficile', color: '#3b2f6b', emoji: '🌙',
    aliases: ['fate zero', 'fate/zero', 'memoria', 'fate'],
  },
  {
    id: 'op-ed15', anime: 'One Piece', title: 'Dear friends', artist: 'TRIPLANE', type: 'ED', episode: 'Ending 15',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-ed15.mp4',
    difficulty: 'difficile', color: '#d97706', emoji: '🏴‍☠️',
    aliases: ['one piece', 'dear friends', 'op'],
  },
  {
    id: 'bleach-ed12', anime: 'Bleach', title: 'Hitohira no Hanabira', artist: 'Stereopony', type: 'ED', episode: 'Ending',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bleach-ed12.mp4',
    difficulty: 'moyen', color: '#0e7490', emoji: '⚔️',
    aliases: ['bleach', 'hitohira no hanabira', 'stereopony'],
  },
  {
    id: 'bleach-ed5', anime: 'Bleach', title: 'Life', artist: 'YUI', type: 'ED', episode: 'Ending 5',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bleach-ed5.mp4',
    difficulty: 'moyen', color: '#0e7490', emoji: '⚔️',
    aliases: ['bleach', 'life', 'yui'],
  },
  {
    id: 'bleach-ed1', anime: 'Bleach', title: 'Life is Like a Boat', artist: 'Rie fu', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bleach-ed1.mp4',
    difficulty: 'facile', color: '#0e7490', emoji: '⚔️',
    aliases: ['bleach', 'life is like a boat', 'rie fu'],
  },
  {
    id: 'vinland-ed1', anime: 'Vinland Saga', title: 'Torches', artist: 'Aimer', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/vinland-ed1.mp4',
    difficulty: 'moyen', color: '#1f6f54', emoji: '🪓',
    aliases: ['vinland saga', 'torches', 'aimer', 'vinland'],
  },
  {
    id: 'vinland-ed2', anime: 'Vinland Saga', title: 'Drown', artist: 'survive said the prophet', type: 'ED', episode: 'Ending 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/vinland-ed2.mp4',
    difficulty: 'difficile', color: '#1f6f54', emoji: '🪓',
    aliases: ['vinland saga', 'drown', 'vinland'],
  },
  {
    id: 'dn-ed1', anime: 'Death Note', title: 'Alumina', artist: 'Nightmare', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dn-ed1.mp4',
    difficulty: 'moyen', color: '#0f172a', emoji: '📓',
    aliases: ['death note', 'alumina', 'nightmare'],
  },
  {
    id: 'ylia-ed2', anime: 'Your Lie in April', title: 'Orange', artist: '7!!', type: 'ED', episode: 'Ending 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ylia-ed2.mp4',
    difficulty: 'difficile', color: '#be4f8a', emoji: '🎹',
    aliases: ['your lie in april', 'orange', 'shigatsu wa kimi no uso', 'kimi no uso'],
  },
  {
    id: 'tr-ed1', anime: 'Tokyo Revengers', title: 'Koko de Iki o Shite', artist: 'eill', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/tr-ed1.mp4',
    difficulty: 'difficile', color: '#6d28d9', emoji: '🕰️',
    aliases: ['tokyo revengers', 'koko de iki o shite', 'tokyo revenger'],
  },
  {
    id: 'fmab-ed1', anime: 'FMA: Brotherhood', title: 'Uso', artist: 'SID', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/fmab-ed1.mp4',
    difficulty: 'moyen', color: '#b45309', emoji: '⚗️',
    aliases: ['fullmetal alchemist', 'fma', 'brotherhood', 'uso', 'fullmetal alchemist brotherhood'],
  },
  {
    id: 'hxh-ed2', anime: 'Hunter x Hunter 2011', title: 'HUNTING FOR YOUR DREAM', artist: 'Galneryus', type: 'ED', episode: 'Ending 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/hxh-ed2.mp4',
    difficulty: 'difficile', color: '#065f46', emoji: '🗡️',
    aliases: ['hunter x hunter', 'hxh', 'hunting for your dream', 'hunter hunter'],
  },
  {
    id: 'hxh-ed5', anime: 'Hunter x Hunter 2011', title: 'Hyouriittai', artist: 'Yuzu', type: 'ED', episode: 'Ending 5',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/hxh-ed5.mp4',
    difficulty: 'difficile', color: '#065f46', emoji: '🗡️',
    aliases: ['hunter x hunter', 'hxh', 'hyouriittai', 'hunter hunter'],
  },
  {
    id: 'mha-ed2', anime: 'My Hero Academia', title: 'Datte Atashi no Hero', artist: 'LiSA', type: 'ED', episode: 'Ending 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/mha-ed2.mp4',
    difficulty: 'moyen', color: '#1e40af', emoji: '💥',
    aliases: ['my hero academia', 'mha', 'boku no hero', 'datte atashi no hero'],
  },
  {
    id: 'aot-ed7', anime: 'Attack on Titan', title: 'Akuma no Ko', artist: 'Ai Higuchi', type: 'ED', episode: 'Ending 7',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/aot-ed7.mp4',
    difficulty: 'moyen', color: '#7f1d1d', emoji: '⚔️',
    aliases: ['attack on titan', 'snk', 'shingeki no kyojin', "l'attaque des titans", 'aot', 'akuma no ko'],
  },
  // ═══ OPENINGS ═══
  {
    id: 'aot-s2-op',
    anime:      'Attack on Titan S2',
    title:      'Shinzou wo Sasageyo!',
    artist:     'Linked Horizon',
    type:       'OP',
    episode:    'Opening (Saison 2)',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/aot-s2-op.mp4',
    difficulty: 'facile',
    color:      '#b91c1c',
    emoji:      '⚔️',
    aliases:    ['attack on titan', 'snk', 'shingeki no kyojin', "l'attaque des titans", 'aot', 'shinzou wo sasageyo'],
  },
  {
    id: 'aot-s3-op',
    anime:      'Attack on Titan S3',
    title:      'Red Swan',
    artist:     'YOSHIKI feat. HYDE',
    type:       'OP',
    episode:    'Opening (Saison 3)',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/aot-s3-op.mp4',
    difficulty: 'difficile',
    color:      '#7f1d1d',
    emoji:      '⚔️',
    aliases:    ['attack on titan', 'snk', 'shingeki no kyojin', "l'attaque des titans", 'aot', 'red swan'],
  },
  {
    id: 'overlord-op3',
    anime:      'Overlord III',
    title:      'VORACITY',
    artist:     'MYTH & ROID',
    type:       'OP',
    episode:    'Opening 3',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/overlord-op3.mp4',
    difficulty: 'difficile',
    color:      '#6d28d9',
    emoji:      '💀',
    aliases:    ['overlord', 'voracity', 'ainz', 'overlord 3'],
  },
  {
    id: 'nanatsu-op1',
    anime:      'Seven Deadly Sins',
    title:      'Netsujou no Spectrum',
    artist:     'Ikimonogakari',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/nanatsu-op1.mp4',
    difficulty: 'moyen',
    color:      '#d97706',
    emoji:      '🐗',
    aliases:    ['seven deadly sins', 'nanatsu no taizai', 'netsujou no spectrum', 'passionate spectrum', '7 deadly sins'],
  },
  {
    id: 'kanojo-op1',
    anime:      'Rent-a-Girlfriend',
    title:      'Centimeter',
    artist:     'the peggies',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/kanojo-op1.mp4',
    difficulty: 'difficile',
    color:      '#ec4899',
    emoji:      '💕',
    aliases:    ['rent a girlfriend', 'kanojo okarishimasu', 'kanokari', 'centimeter', 'rent-a-girlfriend'],
  },
  {
    id: 'fmab-op5',
    anime:      'FMA: Brotherhood',
    title:      'Rain',
    artist:     'SID',
    type:       'OP',
    episode:    'Opening 5',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/fmab-op5.mp4',
    difficulty: 'moyen',
    color:      '#b45309',
    emoji:      '⚗️',
    aliases:    ['fullmetal alchemist', 'fma', 'brotherhood', 'fullmetal alchemist brotherhood', 'rain'],
  },
  {
    id: 'ns-op3',
    anime:      'Naruto Shippuden',
    title:      'Blue Bird',
    artist:     'Ikimono-gakari',
    type:       'OP',
    episode:    'Opening 3',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ns-op3.mp4',
    difficulty: 'facile',
    color:      '#1d4ed8',
    emoji:      '🍥',
    aliases:    ['naruto', 'naruto shippuden', 'blue bird', 'shippuden'],
  },
  {
    id: 'vivy-op1',
    anime:      'Vivy: Fluorite Eye\'s Song',
    title:      'Sing My Pleasure',
    artist:     'Vivy (CV: Rikako Aida)',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/vivy-op1.mp4',
    difficulty: 'difficile',
    color:      '#38bdf8',
    emoji:      '🎙️',
    aliases:    ['vivy', 'vivy fluorite eyes song', 'sing my pleasure', 'fluorite eye song'],
  },
  {
    id: 'bc-op1',
    anime:      'Black Clover',
    title:      'Haruka Mirai',
    artist:     'Vickeblanka',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bc-op1.mp4',
    difficulty: 'facile',
    color:      '#22c55e',
    emoji:      '🍀',
    aliases:    ['black clover', 'haruka mirai', 'bc', 'asta'],
  },
  {
    id: 'op-op11',
    anime:      'One Piece',
    title:      'Share The World',
    artist:     'TVXQ',
    type:       'OP',
    episode:    'Opening 11',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op11.mp4',
    difficulty: 'moyen',
    color:      '#d4a017',
    emoji:      '🏴‍☠️',
    aliases:    ['one piece', 'share the world', 'one piece op 11', 'op', 'mugiwara'],
  },
  {
    id: 'jojo-op2',
    anime:      "JoJo's Bizarre Adventure",
    title:      'Bloody Stream',
    artist:     'Coda',
    type:       'OP',
    episode:    'Opening 2',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/jojo-op2.mp4',
    difficulty: 'moyen',
    color:      '#a855f7',
    emoji:      '⭐',
    aliases:    ['jojo', 'jojos bizarre adventure', "jojo's bizarre adventure", 'bloody stream', 'battle tendency'],
  },
  {
    id: 'bc-op10',
    anime:      'Black Clover',
    title:      'Black Catcher',
    artist:     'Vickeblanka',
    type:       'OP',
    episode:    'Opening 10',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bc-op10.mp4',
    difficulty: 'moyen',
    color:      '#16a34a',
    emoji:      '♣️',
    aliases:    ['black clover', 'black catcher', 'bc', 'vickeblanka', 'asta'],
  },
  {
    id: 'sao-op1',
    anime:      'Sword Art Online',
    title:      'Crossing Field',
    artist:     'LiSA',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/sao-op1.mp4',
    difficulty: 'facile',
    color:      '#2563eb',
    emoji:      '⚔️',
    aliases:    ['sword art online', 'sao', 'crossing field', 'kirito', 'asuna'],
  },
  {
    id: 'fmab-op1',
    anime:      'Fullmetal Alchemist: Brotherhood',
    title:      'Again',
    artist:     'YUI',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/fmab-op1.mp4',
    difficulty: 'moyen',
    color:      '#f97316',
    emoji:      '⚙️',
    aliases:    ['fullmetal alchemist', 'fullmetal alchemist brotherhood', 'fmab', 'again', 'yui'],
  },
  {
    id: 'dtb-op3',
    anime:      'Darker than Black',
    title:      'Tsukiakari no Michishirube',
    artist:     'Stereopony',
    type:       'OP',
    episode:    'Opening 3',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dtb-op3.mp4',
    difficulty: 'difficile',
    color:      '#64748b',
    emoji:      '🌙',
    aliases:    ['darker than black', 'dtb', 'tsukiakari no michishirube', 'stereopony'],
  },
  {
    id: 'sg-op1',
    anime:      'Steins;Gate',
    title:      'Hacking to the Gate',
    artist:     'Kanako Itou',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/sg-op1.mp4',
    difficulty: 'moyen',
    color:      '#f97316',
    emoji:      '⏱️',
    aliases:    ['steins gate', 'steinsgate', 'sg', 'hacking to the gate', 'kanako ito', 'okabe'],
  },
  {
    id: 'vanitas-op2',
    anime:      'The Case Study of Vanitas',
    title:      'Sora to Utsuro',
    artist:     'Rémi (CV: Takuya Eguchi)',
    type:       'OP',
    episode:    'Opening 2',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/vanitas-op2.mp4',
    difficulty: 'difficile',
    color:      '#1e40af',
    emoji:      '🔵',
    aliases:    ['vanitas no carte', 'the case study of vanitas', 'vanitas', 'sora to utsuro', 'jun mamiya'],
  },
  {
    id: 'tg-op1',
    anime:      'Tokyo Ghoul',
    title:      'Unravel',
    artist:     'TK from Ling tosite sigure',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/tg-op1.mp4',
    difficulty: 'moyen',
    color:      '#8b1a1a',
    emoji:      '🩸',
    aliases:    ['tokyo ghoul', 'unravel', 'tk', 'tg'],
  },
  {
    id: 'cg-op1',
    anime:      'Code Geass',
    title:      'Colors',
    artist:     'FLOW',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/cg-op1.mp4',
    difficulty: 'moyen',
    color:      '#6c1f6c',
    emoji:      '⚡',
    aliases:    ['code geass', 'colors', 'cg', 'lelouch'],
  },
  {
    id: 'op-op15',
    anime:      'One Piece',
    title:      'We Go!',
    artist:     'Hiroshi Kitadani',
    type:       'OP',
    episode:    'Opening 15',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op15.mp4',
    difficulty: 'facile',
    color:      '#d4a017',
    emoji:      '🏴‍☠️',
    aliases:    ['one piece', 'we go', 'one piece op 15', 'op', 'mugiwara'],
  },
  {
    id: 'ns-op16',
    anime:      'Naruto Shippuden',
    title:      'Silhouette',
    artist:     'KANA-BOON',
    type:       'OP',
    episode:    'Opening 16',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ns-op16.mp4',
    difficulty: 'facile',
    color:      '#f59e0b',
    emoji:      '🍃',
    aliases:    ['naruto', 'naruto shippuden', 'silhouette', 'ns', 'shippuden'],
  },
  {
    id: 'tpn-op1',
    anime:      'The Promised Neverland',
    title:      'Touch Off',
    artist:     'UVERworld',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/tpn-op1.mp4',
    difficulty: 'difficile',
    color:      '#9b59b6',
    emoji:      '🔑',
    aliases:    ['the promised neverland', 'promised neverland', 'tpn', 'touch off', 'yakusoku no neverland'],
  },
  {
    id: 'aot-op5',
    anime:      'Attack on Titan',
    title:      'Shoukei to Shikabane no Michi',
    artist:     'Linked Horizon',
    type:       'OP',
    episode:    'Opening 5',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/aot-op5.mp4',
    difficulty: 'difficile',
    color:      '#a0522d',
    emoji:      '⚔️',
    aliases:    ['attack on titan', 'shingeki no kyojin', 'aot', 'snk', 'shoukei to shikabane no michi', 'linked horizon'],
  },
  {
    id: 'bc-op3',
    anime:      'Black Clover',
    title:      'Black Rover',
    artist:     'Vickeblanka',
    type:       'OP',
    episode:    'Opening 3',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bc-op3.mp4',
    difficulty: 'moyen',
    color:      '#22c55e',
    emoji:      '🍀',
    aliases:    ['black clover', 'black rover', 'bc', 'asta', 'vickeblanka'],
  },
  {
    id: 'fsn-ubw-op2',
    anime:      'Fate/stay night: Unlimited Blade Works',
    title:      'Brave Shine',
    artist:     'Aimer',
    type:       'OP',
    episode:    'Opening 2',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/fsn-ubw-op2.mp4',
    difficulty: 'difficile',
    color:      '#c0a060',
    emoji:      '✨',
    aliases:    ['fate stay night', 'fate ubw', 'unlimited blade works', 'fsn', 'brave shine', 'aimer', 'emiya'],
  },
  {
    id: 'domestic-op1',
    anime:      'Domestic Girlfriend',
    title:      'Kawaki wo Ameku',
    artist:     'Minami',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/domestic-op1.mp4',
    difficulty: 'difficile',
    color:      '#e11d48',
    emoji:      '🌹',
    aliases:    ['domestic girlfriend', 'domestic na kanojo', 'kawaki wo ameku', 'minami'],
  },
  {
    id: 'ft-op2',
    anime:      'Fairy Tail',
    title:      'S.O.W. ~Sense of Wonder~',
    artist:     'No Regret Life',
    type:       'OP',
    episode:    'Opening 2',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ft-op2.mp4',
    difficulty: 'difficile',
    color:      '#f59e0b',
    emoji:      '✨',
    aliases:    ['fairy tail', 'sense of wonder', 'sow', 'ft op 2', 'no regret life'],
  },
  {
    id: 'ft-op3',
    anime:      'Fairy Tail',
    title:      'Ft.',
    artist:     'Funkist',
    type:       'OP',
    episode:    'Opening 3',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ft-op3.mp4',
    difficulty: 'moyen',
    color:      '#f59e0b',
    emoji:      '🔥',
    aliases:    ['fairy tail', 'ft', 'fairy tail op 3', 'funkist'],
  },
  {
    id: 'ft-op6',
    anime:      'Fairy Tail',
    title:      'Fiesta',
    artist:     "Lil'B",
    type:       'OP',
    episode:    'Opening 6',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ft-op6.mp4',
    difficulty: 'difficile',
    color:      '#f59e0b',
    emoji:      '🎉',
    aliases:    ['fairy tail', 'fiesta', 'ft op 6', 'lil b'],
  },
  {
    id: 'ff-op3',
    anime:      'Fire Force',
    title:      'SPARK-AGAIN',
    artist:     'Aimer',
    type:       'OP',
    episode:    'Opening 3',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ff-op3.mp4',
    difficulty: 'moyen',
    color:      '#ef4444',
    emoji:      '🔥',
    aliases:    ['fire force', 'enen no shouboutai', 'spark again', 'aimer', 'ff', 'shinra'],
  },
  {
    id: 'op-op5',
    anime:      'One Piece',
    title:      'Kokoro no Chizu',
    artist:     'BOYSTYLE',
    type:       'OP',
    episode:    'Opening 5',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op5.mp4',
    difficulty: 'moyen',
    color:      '#d4a017',
    emoji:      '🗺️',
    aliases:    ['one piece', 'kokoro no chizu', 'op op 5', 'boystyle', 'map of the heart'],
  },
  {
    id: 'dn-op1',
    anime:      'Death Note',
    title:      'The World',
    artist:     'Nightmare',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dn-op1.mp4',
    difficulty: 'facile',
    color:      '#1e1e2e',
    emoji:      '📓',
    aliases:    ['death note', 'the world', 'nightmare', 'light yagami', 'kira', 'dn'],
  },
  {
    id: 'dbk-op1',
    anime:      'Dragon Ball Kai',
    title:      'Dragon Soul',
    artist:     'Takayoshi Tanimoto',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dbk-op1.mp4',
    difficulty: 'moyen',
    color:      '#f97316',
    emoji:      '🐉',
    aliases:    ['dragon ball kai', 'dragon ball z kai', 'dragon soul', 'dbk', 'goku'],
  },
  {
    id: 'dbz-op1',
    anime:      'Dragon Ball Z',
    title:      'CHA-LA HEAD-CHA-LA',
    artist:     'Hironobu Kageyama',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dbz-op1.mp4',
    difficulty: 'facile',
    color:      '#f97316',
    emoji:      '⚡',
    aliases:    ['dragon ball z', 'dbz', 'cha la head cha la', 'chalala', 'kageyama', 'goku', 'dragon ball'],
  },
  {
    id: 'klk-op2',
    anime:      'Kill la Kill',
    title:      'ambiguous',
    artist:     'GARNiDELiA',
    type:       'OP',
    episode:    'Opening 2',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/klk-op2.mp4',
    difficulty: 'moyen',
    color:      '#dc2626',
    emoji:      '✂️',
    aliases:    ['kill la kill', 'ambiguous', 'klk', 'garnidelia', 'ryuko', 'senketsu'],
  },
  {
    id: 'agk-op2',
    anime:      'Akame ga Kill',
    title:      'Liar Mask',
    artist:     'Rika Mayama',
    type:       'OP',
    episode:    'Opening 2',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/agk-op2.mp4',
    difficulty: 'difficile',
    color:      '#7f1d1d',
    emoji:      '🗡️',
    aliases:    ['akame ga kill', 'liar mask', 'agk', 'rika mayama', 'akame', 'night raid'],
  },
  {
    id: 've-op1',
    anime:      'Violet Evergarden',
    title:      'Sincerely',
    artist:     'TRUE',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ve-op1.mp4',
    difficulty: 'difficile',
    color:      '#7dd3fc',
    emoji:      '💌',
    aliases:    ['violet evergarden', 'sincerely', 've', 'true', 'auto memoir doll'],
  },
  {
    id: 'ylia-op1',
    anime:      'Your Lie in April',
    title:      'Hikaru Nara',
    artist:     'Goose house',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ylia-op1.mp4',
    difficulty: 'moyen',
    color:      '#fbbf24',
    emoji:      '🎹',
    aliases:    ['your lie in april', 'shigatsu wa kimi no uso', 'hikaru nara', 'goose house', 'arima kousei', 'kaori'],
  },
  {
    id: 'hxh-op1',
    anime:      'Hunter x Hunter',
    title:      'Departure!',
    artist:     'Masatoshi Ono',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/hxh-op1.mp4',
    difficulty: 'facile',
    color:      '#84cc16',
    emoji:      '⚡',
    aliases:    ['hunter x hunter', 'hxh', 'departure', 'gon', 'killua', 'masatoshi ono'],
  },
  {
    id: 'amdb-op1',
    anime:      "The Ancient Magus' Bride",
    title:      'Here',
    artist:     'JUNNA',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/amdb-op1.mp4',
    difficulty: 'difficile',
    color:      '#6d28d9',
    emoji:      '🌿',
    aliases:    ['the ancient magus bride', 'mahoutsukai no yome', 'here', 'junna', 'chise', 'elias'],
  },
  {
    id: 'fz-op1',
    anime:      'Fate/Zero',
    title:      'oath sign',
    artist:     'LiSA',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/fz-op1.mp4',
    difficulty: 'difficile',
    color:      '#1d4ed8',
    emoji:      '⚔️',
    aliases:    ['fate zero', 'fate/zero', 'oath sign', 'lisa', 'kiritsugu', 'grail war'],
  },
  {
    id: 'bleach-op6',
    anime:      'Bleach',
    title:      'Alones',
    artist:     'Aqua Timez',
    type:       'OP',
    episode:    'Opening 6',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bleach-op6.mp4',
    difficulty: 'moyen',
    color:      '#0284c7',
    emoji:      '⚔️',
    aliases:    ['bleach', 'alones', 'aqua timez', 'ichigo', 'soul society'],
  },
  {
    id: 'sao-wou-op2',
    anime:      'Sword Art Online: Alicization — War of Underworld',
    title:      'ANIMA',
    artist:     'ReoNa',
    type:       'OP',
    episode:    'Opening 2',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/sao-wou-op2.mp4',
    difficulty: 'difficile',
    color:      '#7c3aed',
    emoji:      '🌌',
    aliases:    ['sword art online', 'sao', 'alicization', 'war of underworld', 'anima', 'reona', 'kirito', 'alice'],
  },
  {
    id: 'parasyte-op1',
    anime:      'Parasyte: The Maxim',
    title:      'Let Me Hear',
    artist:     'Fear, and Loathing in Las Vegas',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/parasyte-op1.mp4',
    difficulty: 'moyen',
    color:      '#16a34a',
    emoji:      '🧬',
    aliases:    ['parasyte', 'kiseijuu', 'kiseiju', 'the maxim', 'let me hear', 'fear and loathing in las vegas'],
  },
  {
    id: 'vinland-op1',
    anime:      'Vinland Saga',
    title:      'MUKANJYO',
    artist:     'Survive Said The Prophet',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/vinland-op1.mp4',
    difficulty: 'moyen',
    color:      '#92400e',
    emoji:      '🛡️',
    aliases:    ['vinland saga', 'vinland', 'mukanjyo', 'survive said the prophet', 'thorfinn'],
  },
  {
    id: 'dandadan-op1',
    anime:      'Dandadan',
    title:      'Otonoke',
    artist:     'Creepy Nuts',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dandadan-op1.mp4',
    difficulty: 'facile',
    color:      '#ec4899',
    emoji:      '👻',
    aliases:    ['dandadan', 'dan da dan', 'otonoke', 'creepy nuts', 'momo', 'okarun'],
  },
  {
    id: 'apothecary-op1',
    anime:      'The Apothecary Diaries',
    title:      'Hana ni Natte',
    artist:     'Ryokuoushoku Shakai',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/apothecary-op1.mp4',
    difficulty: 'moyen',
    color:      '#22c55e',
    emoji:      '🌿',
    aliases:    ['the apothecary diaries', 'apothecary diaries', 'kusuriya no hitorigoto', 'hana ni natte', 'maomao'],
  },
  {
    id: 'chainsaw-op1',
    anime:      'Chainsaw Man',
    title:      'KICK BACK',
    artist:     'Kenshi Yonezu',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/chainsaw-op1.mp4',
    difficulty: 'facile',
    color:      '#f97316',
    emoji:      '🪚',
    aliases:    ['chainsaw man', 'csm', 'kick back', 'kenshi yonezu', 'denji', 'makima', 'power'],
  },
  {
    id: 'kakegurui-op1',
    anime:      'Kakegurui',
    title:      'Deal with the Devil',
    artist:     'Tia',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/kakegurui-op1.mp4',
    difficulty: 'moyen',
    color:      '#dc2626',
    emoji:      '🎲',
    aliases:    ['kakegurui', 'deal with the devil', 'tia', 'yumeko', 'jabami'],
  },
  {
    id: 'aot-op7',
    anime:      'Attack on Titan',
    title:      'The Rumbling',
    artist:     'SiM',
    type:       'OP',
    episode:    'Opening 7',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/aot-op7.mp4',
    difficulty: 'facile',
    color:      '#78350f',
    emoji:      '🌊',
    aliases:    ['attack on titan', 'shingeki no kyojin', 'aot', 'snk', 'the rumbling', 'sim', 'eren'],
  },
  {
    id: 'mha-op6',
    anime:      'My Hero Academia',
    title:      'Polaris',
    artist:     'BLUE ENCOUNT',
    type:       'OP',
    episode:    'Opening 6',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/mha-op6.mp4',
    difficulty: 'moyen',
    color:      '#22c55e',
    emoji:      '💥',
    aliases:    ['my hero academia', 'boku no hero academia', 'mha', 'bnha', 'polaris', 'blue encount', 'deku'],
  },
  {
    id: 'mirai-nikki-op1',
    anime:      'Future Diary',
    title:      'Kuusou Mesorogiwi',
    artist:     'Yousei Teikoku',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/mirai-nikki-op1.mp4',
    difficulty: 'moyen',
    color:      '#be123c',
    emoji:      '📱',
    aliases:    ['future diary', 'mirai nikki', 'kuusou mesorogiwi', 'kuso mesorogiwi', 'yousei teikoku', 'yuno'],
  },
  {
    id: 'jjk-op1',
    anime:      'Jujutsu Kaisen',
    title:      'Kaikai Kitan',
    artist:     'Eve',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/jjk-op1.mp4',
    difficulty: 'facile',
    color:      '#7c3aed',
    emoji:      '🫸',
    aliases:    ['jujutsu kaisen', 'jjk', 'kaikai kitan', 'eve', 'itadori', 'gojo'],
  },
  {
    id: 'jojo-op10',
    anime:      "JoJo's Bizarre Adventure",
    title:      "Traitor's Requiem",
    artist:     'Daisuke Hasegawa',
    type:       'OP',
    episode:    'Opening 10',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/jojo-op10.mp4',
    difficulty: 'moyen',
    color:      '#f59e0b',
    emoji:      '🐞',
    aliases:    ['jojo', 'jojos bizarre adventure', "jojo's bizarre adventure", 'traitors requiem', "traitor's requiem", 'golden wind', 'vento aureo', 'giorno'],
  },
  {
    id: 'ns-op14',
    anime:      'Naruto Shippuden',
    title:      'Tsuki no Ookisa',
    artist:     'Nogizaka46',
    type:       'OP',
    episode:    'Opening 14',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ns-op14.mp4',
    difficulty: 'moyen',
    color:      '#f97316',
    emoji:      '🌙',
    aliases:    ['naruto', 'naruto shippuden', 'tsuki no ookisa', 'tsuki no okisa', 'nogizaka46', 'shippuden'],
  },
  {
    id: 'kaguya-op1',
    anime:      'Kaguya-sama: Love is War',
    title:      'Love Dramatic',
    artist:     'Masayuki Suzuki feat. Rikka Ihara',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/kaguya-op1.mp4',
    difficulty: 'facile',
    color:      '#ec4899',
    emoji:      '💘',
    aliases:    ['kaguya sama', 'kaguya-sama love is war', 'love is war', 'love dramatic', 'masayuki suzuki', 'chika'],
  },
  {
    id: 'levius-op1',
    anime:      'Levius',
    title:      'Wit and Love',
    artist:     'Mystery Skulls',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/levius-op1.mp4',
    difficulty: 'difficile',
    color:      '#64748b',
    emoji:      '🥊',
    aliases:    ['levius', 'wit and love', 'mystery skulls'],
  },
  {
    id: 'carole-tuesday-op1',
    anime:      'Carole & Tuesday',
    title:      'Kiss Me',
    artist:     'Nai Br.XX & Celeina Ann',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/carole-tuesday-op1.mp4',
    difficulty: 'difficile',
    color:      '#06b6d4',
    emoji:      '🎸',
    aliases:    ['carole and tuesday', 'carole tuesday', 'kiss me', 'nai br xx', 'celeina ann'],
  },
  {
    id: 'ngnl-op1',
    anime:      'No Game No Life',
    title:      'This game',
    artist:     'Konomi Suzuki',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ngnl-op1.mp4',
    difficulty: 'facile',
    color:      '#a855f7',
    emoji:      '♟️',
    aliases:    ['no game no life', 'ngnl', 'this game', 'konomi suzuki', 'sora', 'shiro'],
  },
  {
    id: 'op-op13',
    anime:      'One Piece',
    title:      'One Day',
    artist:     'The ROOTLESS',
    type:       'OP',
    episode:    'Opening 13',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op13.mp4',
    difficulty: 'moyen',
    color:      '#d4a017',
    emoji:      '🏴‍☠️',
    aliases:    ['one piece', 'one day', 'the rootless', 'marineford', 'ace', 'luffy'],
  },
  {
    id: 'beastars-op1',
    anime:      'Beastars',
    title:      'Wild Side',
    artist:     'ALI',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/beastars-op1.mp4',
    difficulty: 'moyen',
    color:      '#b45309',
    emoji:      '🎭',
    aliases:    ['beastars', 'wild side', 'ali', 'legoshi', 'legosi'],
  },
  {
    id: 'aot-op1',
    anime:      'Attack on Titan',
    title:      'Guren no Yumiya',
    artist:     'Linked Horizon',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/aot-op1.mp4',
    difficulty: 'facile',
    color:      '#c62828',
    emoji:      '⚔️',
    aliases:    ['attack on titan', 'shingeki no kyojin', 'aot', 'snk', 'guren no yumiya', 'linked horizon', 'eren'],
  },
  {
    id: 'op-op9',
    anime:      'One Piece',
    title:      'Jungle P',
    artist:     '5050',
    type:       'OP',
    episode:    'Opening 9',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op9.mp4',
    difficulty: 'difficile',
    color:      '#d4a017',
    emoji:      '🌴',
    aliases:    ['one piece', 'jungle p', 'op op 9', '5050', 'mugiwara', 'luffy'],
  },
  {
    id: 'bc-op5',
    anime:      'Black Clover',
    title:      'Gamushara',
    artist:     'sky-hi',
    type:       'OP',
    episode:    'Opening 5',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bc-op5.mp4',
    difficulty: 'moyen',
    color:      '#16a34a',
    emoji:      '🍀',
    aliases:    ['black clover', 'gamushara', 'bc', 'asta', 'sky-hi', 'skyhi'],
  },
  {
    id: 'op-op4',
    anime:      'One Piece',
    title:      'Bon Voyage!',
    artist:     'Angela',
    type:       'OP',
    episode:    'Opening 4',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op4.mp4',
    difficulty: 'moyen',
    color:      '#d4a017',
    emoji:      '⛵',
    aliases:    ['one piece', 'bon voyage', 'op op 4', 'angela', 'mugiwara', 'luffy'],
  },
  {
    id: 'nge-op1',
    anime:      'Neon Genesis Evangelion',
    title:      "A Cruel Angel's Thesis",
    artist:     'Yoko Takahashi',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/nge-op1.mp4',
    difficulty: 'facile',
    color:      '#7c3aed',
    emoji:      '🤖',
    aliases:    ['neon genesis evangelion', 'evangelion', 'eva', 'nge', 'a cruel angels thesis', 'cruel angel thesis', 'yoko takahashi', 'shinji'],
  },
  {
    id: 'dal-op1',
    anime:      'Date A Live',
    title:      'Date A Live',
    artist:     'sweet ARMS',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dal-op1.mp4',
    difficulty: 'difficile',
    color:      '#e11d48',
    emoji:      '🌸',
    aliases:    ['date a live', 'deto a raibu', 'dal', 'sweet arms', 'shido', 'tohka', 'date a live op 1'],
  },
  {
    id: 'gintama-op17',
    anime:      'Gintama',
    title:      'Know Know Know',
    artist:     'Thinking Dogs',
    type:       'OP',
    episode:    'Opening 17',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/gintama-op17.mp4',
    difficulty: 'difficile',
    color:      '#0ea5e9',
    emoji:      '🎋',
    aliases:    ['gintama', 'gin tama', 'know know know', 'thinking dogs', 'gintoki', 'gintama op 17'],
  },
  {
    id: 'dr-stone-op3',
    anime:      'Dr. Stone',
    title:      'Rakuen',
    artist:     'Fujifabric',
    type:       'OP',
    episode:    'Opening 3',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dr-stone-op3.mp4',
    difficulty: 'moyen',
    color:      '#84cc16',
    emoji:      '🧪',
    aliases:    ['dr stone', 'doctor stone', 'rakuen', 'fujifabric', 'senku', 'dr stone op 3', 'ishigami'],
  },
  {
    id: 'boruto-op8',
    anime:      'Boruto: Naruto Next Generations',
    title:      'BAKU',
    artist:     'Ikimonogakari',
    type:       'OP',
    episode:    'Opening 8',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/boruto-op8.mp4',
    difficulty: 'moyen',
    color:      '#3b82f6',
    emoji:      '🌀',
    aliases:    ['boruto', 'boruto naruto next generations', 'baku', 'ikimonogakari', 'boruto op 8', 'naruto next generations'],
  },

  // ═══ ENDINGS — batch 2 (ajout Freydiss) ═══
  { id:'another-ed1', anime:'Another', title:'Anamnesis', artist:'Annabel', type:'ED', episode:'Ending', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/another-ed1.mp4', difficulty:'difficile', color:'#5b3a4a', emoji:'🩸', aliases:['another'] },
  { id:'carole-ed2', anime:'Carole & Tuesday', title:'Not Afraid', artist:'Lauren Dyson', type:'ED', episode:'Ending 2', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/carole-ed2.mp4', difficulty:'difficile', color:'#e8a33d', emoji:'🎤', aliases:['carole and tuesday','carole & tuesday','carole tuesday'] },
  { id:'arslan-ed1', anime:'The Heroic Legend of Arslan', title:'Lapis Lazuli', artist:'Eir Aoi', type:'ED', episode:'Ending 1', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/arslan-ed1.mp4', difficulty:'difficile', color:'#2e5a8a', emoji:'⚔️', aliases:['arslan senki','the heroic legend of arslan','arslan'] },
  { id:'magi-ed1', anime:'Magi: The Labyrinth of Magic', title:'Yubikiri', artist:'NICO Touches the Walls', type:'ED', episode:'Ending 1', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/magi-ed1.mp4', difficulty:'difficile', color:'#c8a44d', emoji:'🪔', aliases:['magi','magi labyrinth of magic','magi the labyrinth of magic'] },
  { id:'sao-wou-ed1', anime:'Sword Art Online: Alicization WoU', title:'Unlasting', artist:'LiSA', type:'ED', episode:'Ending', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/sao-wou-ed1.mp4', difficulty:'moyen', color:'#1d4ed8', emoji:'⚔️', aliases:['sao','sword art online','alicization','war of underworld'] },
  { id:'ds-ed1', anime:'Demon Slayer', title:'from the edge', artist:'FictionJunction feat. LiSA', type:'ED', episode:'Ending 1', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ds-ed1.mp4', difficulty:'facile', color:'#dc2626', emoji:'🔥', aliases:['demon slayer','kimetsu no yaiba','kimetsu'] },
  { id:'tpn-ed1', anime:'The Promised Neverland', title:'Zettai Zetsumei', artist:'Cö shu Nie', type:'ED', episode:'Ending 1', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/tpn-ed1.mp4', difficulty:'moyen', color:'#15803d', emoji:'🌿', aliases:['the promised neverland','promised neverland','yakusoku no neverland','tpn'] },
  { id:'champloo-ed1', anime:'Samurai Champloo', title:'Shiki no Uta', artist:'MINMI', type:'ED', episode:'Ending', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/champloo-ed1.mp4', difficulty:'difficile', color:'#6b8e23', emoji:'🎐', aliases:['samurai champloo','champloo'] },
  { id:'ds-ed2', anime:'Demon Slayer', title:'Shirogane', artist:'LiSA', type:'ED', episode:'Ending 2', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ds-ed2.mp4', difficulty:'moyen', color:'#b91c1c', emoji:'❄️', aliases:['demon slayer','kimetsu no yaiba','kimetsu'] },
  { id:'ds-tanjiro', anime:'Demon Slayer', title:'Kamado Tanjiro no Uta', artist:'Go Shiina', type:'ED', episode:'Ending (ép. 19)', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ds-tanjiro.mp4', difficulty:'moyen', color:'#dc2626', emoji:'🎶', aliases:['demon slayer','kimetsu no yaiba','kimetsu','kamado tanjiro no uta'] },
  { id:'eva-ed1', anime:'Neon Genesis Evangelion', title:'Fly Me to the Moon', artist:'Claire', type:'ED', episode:'Ending', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/eva-ed1.mp4', difficulty:'facile', color:'#7c3aed', emoji:'🌙', aliases:['evangelion','neon genesis evangelion','nge','eva'] },
  { id:'gto-ed1', anime:'GTO: Great Teacher Onizuka', title:'Last Piece', artist:'Hitomi Takahashi', type:'ED', episode:'Ending 1', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/gto-ed1.mp4', difficulty:'difficile', color:'#b45309', emoji:'🏍️', aliases:['gto','great teacher onizuka','onizuka'] },
  { id:'ippo-ed1', anime:'Hajime no Ippo', title:'Ending 1', artist:'', type:'ED', episode:'Ending 1', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ippo-ed1.mp4', difficulty:'difficile', color:'#d97706', emoji:'🥊', aliases:['hajime no ippo','ippo'] },
  { id:'akame-ed2', anime:'Akame ga Kill!', title:'Tsuki Akari', artist:'Sora Amamiya', type:'ED', episode:'Ending 2', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/akame-ed2.mp4', difficulty:'difficile', color:'#991b1b', emoji:'🌙', aliases:['akame ga kill','akame'] },
  { id:'gto-ed2', anime:'GTO: Great Teacher Onizuka', title:'Shizuku', artist:'', type:'ED', episode:'Ending 2', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/gto-ed2.mp4', difficulty:'difficile', color:'#b45309', emoji:'🏍️', aliases:['gto','great teacher onizuka','onizuka'] },
  { id:'beastars-ed-s2', anime:'Beastars', title:'Yasashii Suisei', artist:'YOASOBI', type:'ED', episode:'Ending (S2)', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/beastars-ed-s2.mp4', difficulty:'moyen', color:'#5b21b6', emoji:'🐺', aliases:['beastars','yasashii suisei','yoasobi'] },
  { id:'3gatsu-ed2', anime:'March Comes in Like a Lion', title:'Ending 2', artist:'', type:'ED', episode:'Ending 2', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/3gatsu-ed2.mp4', difficulty:'difficile', color:'#0369a1', emoji:'♟️', aliases:['march comes in like a lion','3-gatsu no lion','sangatsu no lion','3 gatsu no lion'] },
  { id:'naruto-ed1', anime:'Naruto', title:'Wind', artist:'Akeboshi', type:'ED', episode:'Ending 1', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/naruto-ed1.mp4', difficulty:'facile', color:'#d97706', emoji:'🍃', aliases:['naruto','wind'] },
  { id:'narutos-ed1', anime:'Naruto Shippuden', title:'Hotaru no Hikari (Shooting Star)', artist:'Ikimono-gakari', type:'ED', episode:'Ending 1', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/narutos-ed1.mp4', difficulty:'moyen', color:'#b45309', emoji:'⭐', aliases:['naruto shippuden','shippuden','shooting star','hotaru no hikari'] },
  { id:'koiame-ed1', anime:'After the Rain', title:'Ref:rain', artist:'Aimer', type:'ED', episode:'Ending', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/koiame-ed1.mp4', difficulty:'difficile', color:'#4a6b8a', emoji:'🌧️', aliases:['after the rain','koi wa ameagari no you ni','koi wa ameagari','refrain','ref rain'] },
  { id:'mugen-ed1', anime:'Demon Slayer: Mugen Train', title:'Homura', artist:'LiSA', type:'ED', episode:'Thème (film)', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/mugen-ed1.mp4', difficulty:'facile', color:'#dc2626', emoji:'🔥', aliases:['demon slayer','kimetsu no yaiba','mugen train','le train de l\'infini','homura'] },
  { id:'violet-ed1', anime:'Violet Evergarden', title:'Michishirube', artist:'Minori Chihara', type:'ED', episode:'Ending', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/violet-ed1.mp4', difficulty:'moyen', color:'#1e3a5f', emoji:'✉️', aliases:['violet evergarden','michishirube'] },
  { id:'dear-sunrise', anime:'One Piece', title:'Dear Sunrise', artist:'', type:'ED', episode:'Ending 20', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dear-sunrise.mp4', difficulty:'moyen', color:'#d97706', emoji:'🌅', aliases:['one piece','dear sunrise','op'] },
]

// ── Answer matching ────────────────────────────────────────────────────────
function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function animeFamilyKey(anime) {
  const value = normalize(anime)
  if (!value) return ''
  if (value.startsWith('sword art online')) return 'sword art online'
  if (value.startsWith('dragon ball')) return 'dragon ball'
  if (value.startsWith('fate')) return 'fate'
  if (value.startsWith('naruto')) return 'naruto'
  if (value.startsWith('attack on titan') || value.startsWith('shingeki no kyojin')) return 'attack on titan'
  if (value.startsWith('fullmetal alchemist')) return 'fullmetal alchemist'
  if (value.startsWith('jojo')) return 'jojo'
  if (value.startsWith('my hero academia') || value.startsWith('boku no hero academia')) return 'my hero academia'
  if (value.startsWith('jujutsu kaisen')) return 'jujutsu kaisen'
  if (value.startsWith('one piece')) return 'one piece'
  if (value.startsWith('kaguya')) return 'kaguya sama'
  return value
}

function matchesAnime(guess, track) {
  const g = normalize(guess)
  if (!g) return false
  const targets = [track.anime, ...track.aliases].map(normalize)
  return targets.some(t => t.includes(g) || g.includes(t))
}

function matchesTitle(guess, track) {
  const g = normalize(guess)
  if (!g) return false
  const targets = [track.title, ...track.aliases].map(normalize)
  return targets.some(t => t.includes(g) || g.includes(t))
}

export function checkAnswer(animeGuess, titleGuess, track) {
  const animeOk = matchesAnime(animeGuess, track)
  const titleOk = matchesTitle(titleGuess, track)
  return { animeOk, titleOk, perfect: animeOk && titleOk }
}

// ── Berry calculation ──────────────────────────────────────────────────────
export function calcBerries({ animeOk, titleOk, timeMs, streak }) {
  if (!animeOk && !titleOk) return 0
  let base = 0
  if (animeOk && titleOk) base = 100
  else if (animeOk)        base = 50
  else if (titleOk)        base = 30

  // Speed bonus (based on seconds elapsed)
  const secs = timeMs / 1000
  const speedMult = secs < 5 ? 2.0 : secs < 10 ? 1.5 : secs < 20 ? 1.2 : 1.0

  // Streak bonus
  const streakMult = streak >= 5 ? 1.5 : streak >= 3 ? 1.2 : 1.0

  // Difficulty
  return Math.round(base * speedMult * streakMult * 1000) // convert to berries scale
}

// ── Pick random track ────────────────────────────────────────────────────
export function pickTrack(excludeIds = [], options = {}) {
  const excluded = new Set(Array.isArray(excludeIds) ? excludeIds : [excludeIds])
  const excludedAnime = new Set(
    (options.excludeAnime || [])
      .map(anime => animeFamilyKey(anime))
      .filter(Boolean)
  )
  let pool = LOCAL_TRACKS.filter(t => !excluded.has(t.id) && !excludedAnime.has(animeFamilyKey(t.anime)))
  if (pool.length === 0) pool = LOCAL_TRACKS.filter(t => !excluded.has(t.id))
  if (pool.length === 0) pool = LOCAL_TRACKS  // tous joués → reset
  return pool[Math.floor(Math.random() * pool.length)]
}

export function getTrackById(trackId) {
  return LOCAL_TRACKS.find(t => t.id === trackId) || null
}

function makeRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

export async function createBlindTestRoom({ hostUserId, displayName, avatarUrl, difficultyId = 'easy' }) {
  if (!supabase) throw new Error('Supabase non initialise.')

  let lastError = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeRoomCode()
    const { error } = await supabase.from('blind_test_rooms').insert({
      code,
      host_user_id: String(hostUserId),
      status: 'waiting',
      difficulty_id: difficultyId,
      round: 0,
    })
    if (!error) {
      await joinBlindTestRoom({ code, userId: hostUserId, displayName, avatarUrl })
      return code
    }
    lastError = error
    if (!String(error.message || '').toLowerCase().includes('duplicate')) break
  }
  throw lastError || new Error('Impossible de creer la room.')
}

export async function fetchBlindTestRoom(code) {
  if (!supabase || !code) return null
  const { data, error } = await supabase
    .from('blind_test_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle()
  if (error) return null
  return data
}

export async function joinBlindTestRoom({ code, userId, displayName, avatarUrl }) {
  if (!supabase || !code || !userId) return null
  const { data, error } = await supabase
    .from('blind_test_room_players')
    .upsert({
      room_code: code.toUpperCase(),
      user_id: userId,
      display_name: displayName || 'Pirate',
      avatar_url: avatarUrl || null,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'room_code,user_id' })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function fetchBlindTestRoomPlayers(code) {
  if (!supabase || !code) return []
  const { data, error } = await supabase
    .from('blind_test_room_players')
    .select('*')
    .eq('room_code', code.toUpperCase())
    .order('score', { ascending: false })
    .order('joined_at', { ascending: true })
  if (error) return []
  return data || []
}

export async function fetchBlindTestRoomAnswers(code, round) {
  if (!supabase || !code || !round) return []
  const { data, error } = await supabase
    .from('blind_test_room_answers')
    .select('*')
    .eq('room_code', code.toUpperCase())
    .eq('round', round)
  if (error) return []
  return data || []
}

export async function fetchBlindTestRoomPlayedTrackIds(code) {
  if (!supabase || !code) return []
  const { data, error } = await supabase
    .from('blind_test_room_answers')
    .select('track_id')
    .eq('room_code', code.toUpperCase())
    .not('track_id', 'is', null)
  if (error) return []
  return [...new Set((data || []).map(row => row.track_id).filter(Boolean))]
}

export async function updateBlindTestRoom(code, patch) {
  if (!supabase || !code) return null
  const { data, error } = await supabase
    .from('blind_test_rooms')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('code', code.toUpperCase())
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function submitBlindTestRoomAnswer({ code, userId, round, track, animeGuess, titleGuess, timeMs, streak }) {
  if (!supabase || !code || !userId || !track || !round) return null
  const result = checkAnswer(animeGuess, titleGuess, track)
  const earned = calcBerries({ animeOk: result.animeOk, titleOk: result.titleOk, timeMs, streak })

  const { data, error } = await supabase
    .from('blind_test_room_answers')
    .upsert({
      room_code: code.toUpperCase(),
      user_id: userId,
      round,
      track_id: track.id,
      anime_guess: animeGuess || '',
      title_guess: titleGuess || '',
      anime_ok: result.animeOk,
      title_ok: result.titleOk,
      earned,
      time_ms: Math.max(0, Math.round(timeMs)),
    }, { onConflict: 'room_code,user_id,round' })
    .select('*')
    .single()
  if (error) throw error

  const { data: player } = await supabase
    .from('blind_test_room_players')
    .select('score, streak')
    .eq('room_code', code.toUpperCase())
    .eq('user_id', userId)
    .single()

  const correct = result.animeOk || result.titleOk
  await supabase
    .from('blind_test_room_players')
    .update({
      score: (player?.score || 0) + earned,
      streak: correct ? (player?.streak || 0) + 1 : 0,
      last_seen: new Date().toISOString(),
    })
    .eq('room_code', code.toUpperCase())
    .eq('user_id', userId)

  return data
}

// ── Supabase score persistence ─────────────────────────────────────────────
export async function fetchBlindTestLeaderboard(limit = 20) {
  if (!supabase) return null
  try {
    const { data } = await supabase
      .from('blind_test_scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(limit)
    return data ?? null
  } catch {
    return []
  }
}

export async function upsertBlindTestScore({ userId, displayName, avatarUrl, score, streakMax, gamesPlayed }) {
  if (!supabase || !userId) return
  try {
    const { data: existing } = await supabase
      .from('blind_test_scores')
      .select('score, streak_max, games_played')
      .eq('user_id', userId)
      .single()

    await supabase.from('blind_test_scores').upsert({
      user_id:     userId,
      display_name: displayName,
      avatar_url:  avatarUrl,
      score:       Math.max(score, existing?.score ?? 0),
      streak_max:  Math.max(streakMax, existing?.streak_max ?? 0),
      games_played:(existing?.games_played ?? 0) + gamesPlayed,
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'user_id' })
  } catch { /* table may not exist yet */ }
}

export async function logSession({ userId, trackId, correct, timeMs }) {
  if (!supabase || !userId) return
  try {
    await supabase.from('blind_test_sessions').insert({
      user_id:   userId,
      track_id:  trackId,
      guessed_at: new Date().toISOString(),
      correct,
      time_ms:   timeMs,
    })
  } catch { /* table may not exist yet */ }
}

// ── SQL to create tables (for admin/setup reference) ──────────────────────
export const SETUP_SQL = `
create table if not exists blind_test_scores (
  user_id      text primary key,
  display_name text,
  avatar_url   text,
  score        bigint default 0,
  streak_max   int default 0,
  games_played int default 0,
  updated_at   timestamptz default now()
);

create table if not exists blind_test_sessions (
  id         bigserial primary key,
  user_id    text,
  track_id   text,
  guessed_at timestamptz default now(),
  correct    boolean,
  time_ms    int
);

create table if not exists blind_test_rooms (
  code text primary key,
  host_user_id text not null,
  status text not null default 'waiting',
  difficulty_id text not null default 'easy',
  round int not null default 0,
  current_track_id text,
  started_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists blind_test_room_players (
  room_code text references blind_test_rooms(code) on delete cascade,
  user_id text,
  display_name text,
  avatar_url text,
  score bigint not null default 0,
  streak int not null default 0,
  joined_at timestamptz default now(),
  last_seen timestamptz default now(),
  primary key (room_code, user_id)
);

create table if not exists blind_test_room_answers (
  id bigserial primary key,
  room_code text references blind_test_rooms(code) on delete cascade,
  user_id text,
  round int not null,
  track_id text,
  anime_guess text,
  title_guess text,
  anime_ok boolean default false,
  title_ok boolean default false,
  earned bigint default 0,
  time_ms int default 0,
  created_at timestamptz default now(),
  unique(room_code, user_id, round)
);
`
