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
  if (!supabase) { console.warn('[profile] supabase null — env vars manquantes'); return null }
  const id = String(discordId)

  // ── 1. Leaderboard RPC (gives vocal_h + rank) ──────────────────────────────
  let board = null
  const rpc1 = await supabase.rpc('top_classement', { p_limit: 500, p_period: 'week' })
  console.log('[profile] rpc1', { err: rpc1.error?.message, rows: rpc1.data?.length })
  if (!rpc1.error && rpc1.data?.length) {
    board = rpc1.data
  } else {
    const rpc2 = await supabase.rpc('top_classement', { p_limit: 500 })
    console.log('[profile] rpc2 (legacy)', { err: rpc2.error?.message, rows: rpc2.data?.length })
    if (!rpc2.error && rpc2.data?.length) board = rpc2.data
  }

  if (board) {
    // uid field might be named differently depending on RPC version
    const idx = board.findIndex(m =>
      String(m.uid ?? m.user_id ?? m.discord_id ?? '') === id
    )
    console.log('[profile] board match idx', idx, 'for id', id, 'sample uid', board[0]?.uid ?? board[0]?.user_id)
    if (idx !== -1) return { ...board[idx], uid: id, rank: idx + 1, total: board.length }
  }

  // ── 2. Direct users table lookup ────────────────────────────────────────────
  console.log('[profile] falling back to direct users table query')
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('uid, data')
    .eq('uid', id)
    .maybeSingle()
  console.log('[profile] direct query', { err: userErr?.message, found: !!user })

  if (!user) return null
  const d = user.data || {}
  return {
    uid: id,
    username: d.username || d.display_name || `Pirate #${id.slice(-5)}`,
    avatar_url: d.avatar_url || d.avatar || null,
    vocal_h: parseFloat(d.vocal_h || d.total_vocal_h || 0),
    berrys: parseInt(d.berrys || d.balance || 0) || 0,
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

