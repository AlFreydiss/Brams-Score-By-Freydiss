import { supabase } from './supabase.js'

// ── Local tracks (always available, no DB needed) ──────────────────────────
export const LOCAL_TRACKS = [
  {
    id: 'tg-op1',
    anime:      'Tokyo Ghoul',
    title:      'Unravel',
    type:       'OP',
    episode:    'Opening 1',
    url:        '/blind-test/tg-op1.mp4',
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
    url:        '/blind-test/cg-op1.mp4',
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
    url:        '/blind-test/op-op15.mp4',
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
    url:        '/blind-test/ns-op16.mp4',
    difficulty: 'facile',
    color:      '#f59e0b',
    emoji:      '🍃',
    aliases:    ['naruto', 'naruto shippuden', 'silhouette', 'ns', 'shippuden'],
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
export function pickTrack(excludeId = null) {
  const pool = LOCAL_TRACKS.filter(t => t.id !== excludeId)
  return pool[Math.floor(Math.random() * pool.length)]
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
`
