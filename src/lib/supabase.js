import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = url && key ? createClient(url, key, {
  auth: {
    detectSessionInUrl: true,
    persistSession:     true,
    autoRefreshToken:   true,
    flowType:           'implicit',
  },
}) : null

async function callTopClassement(limit, period = 'week') {
  try {
    const response = await fetch(`/api/leaderboard?limit=${encodeURIComponent(limit)}&period=${encodeURIComponent(period)}`)
    if (response.ok) {
      return { data: await response.json(), error: null }
    }
  } catch {
    // Keep the Supabase RPC fallback below for local/static environments.
  }

  const next = await supabase.rpc('top_classement', { p_limit: limit, p_period: period })
  if (!next.error) return next

  // Production can briefly have the older RPC signature until the Supabase SQL is run.
  if (period === 'week') {
    const legacy = await supabase.rpc('top_classement', { p_limit: limit })
    if (!legacy.error) return legacy
  }

  return next
}

export async function fetchLeaderboard(limit = 10, period = 'week') {
  if (!supabase) return null
  const { data, error } = await callTopClassement(limit, period)
  if (error) { console.error('[leaderboard]', error); return null }
  return data
}

export async function fetchMembersByRank(minH, maxH = 99999) {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('members_by_rank', { p_min_h: minH, p_max_h: maxH })
  if (error) { console.error('[members_by_rank]', error); return null }
  return data
}

export async function fetchStats() {
  if (!supabase) return null
  const { data, error } = await callTopClassement(200, 'week')
  if (error || !data) return null
  const active = data.filter(m => (parseFloat(m.vocal_h) || 0) >= 1).length
  return { membersTracked: data.length, activeVocal: active }
}

// â”€â”€ Auth helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchMemberProfile(discordId) {
  if (!supabase) return null
  const id = String(discordId)

  // Go directly to Supabase RPC — skip the broken /api/leaderboard (402 on every call).
  // Try new signature (with p_period) then legacy (without).
  let board = null
  const rpc1 = await supabase.rpc('top_classement', { p_limit: 500, p_period: 'week' })
  if (!rpc1.error && rpc1.data) {
    board = rpc1.data
  } else {
    const rpc2 = await supabase.rpc('top_classement', { p_limit: 500 })
    if (!rpc2.error && rpc2.data) board = rpc2.data
  }

  if (board) {
    const idx = board.findIndex(m => String(m.uid) === id)
    if (idx !== -1) return { ...board[idx], rank: idx + 1, total: board.length }
  }

  // Direct lookup: works even if user has 0 vocal hours or is outside top 500
  const { data: user } = await supabase
    .from('users')
    .select('uid, data')
    .eq('uid', id)
    .maybeSingle()

  if (!user?.data) return null
  const d = user.data
  return {
    uid: id,
    username: d.username || `Pirate #${id.slice(-5)}`,
    avatar_url: d.avatar_url || null,
    vocal_h: 0,
    berrys: parseInt(d.berrys || 0) || 0,
    rank: board ? board.length + 1 : '?',
    total: board ? board.length : '?',
  }
}

export async function signInWithDiscord() {
  if (!supabase) return { error: { message: 'Client Supabase non initialisé — variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes.' } }
  const redirectTo = `${window.location.origin}/`
  console.log('[auth] signInWithDiscord → redirectTo:', redirectTo)
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo, scopes: 'identify email' },
  })
  return { data, error }
}

export async function signUpWithEmail(email, password, displayName) {
  if (!supabase) return { error: { message: 'Client Supabase non initialisé.' } }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })
  return { data, error }
}

export async function signInWithEmail(email, password) {
  if (!supabase) return { error: { message: 'Client Supabase non initialisé.' } }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signOutUser() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function getSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

