import { supabase } from './supabase.js'

// ── Local tracks (always available, no DB needed) ──────────────────────────
export const LOCAL_TRACKS = [
  {
    id: 'vivy-op1',
    anime:      'Vivy: Fluorite Eye\'s Song',
    title:      'Sing My Pleasure',
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
    type:       'OP',
    episode:    'Opening 2',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/sao-wou-op2.mp4',
    difficulty: 'difficile',
    color:      '#7c3aed',
    emoji:      '🌌',
    aliases:    ['sword art online', 'sao', 'alicization', 'war of underworld', 'anima', 'reona', 'kirito', 'alice'],
  },
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

// ── Pick random track (exclude last) ─────────────────────────────────────
export function pickTrack(excludeIds = []) {
  const excluded = new Set(Array.isArray(excludeIds) ? excludeIds : [excludeIds])
  let pool = LOCAL_TRACKS.filter(t => !excluded.has(t.id))
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

  const code = makeRoomCode()
  const { error } = await supabase.from('blind_test_rooms').insert({
    code,
    host_user_id: hostUserId,
    status: 'waiting',
    difficulty_id: difficultyId,
    round: 0,
  })
  if (error) throw error

  await joinBlindTestRoom({ code, userId: hostUserId, displayName, avatarUrl })
  return code
}

export async function fetchBlindTestRoom(code) {
  if (!supabase || !code) return null
  const { data, error } = await supabase
    .from('blind_test_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()
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
  } catch { return null }
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
