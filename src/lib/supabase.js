import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = url && key ? createClient(url, key, {
  auth: {
    detectSessionInUrl: false,
    persistSession:     true,
    autoRefreshToken:   true,
    flowType:           'pkce',
  },
}) : null

export async function fetchLeaderboard(limit = 10) {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('top_classement', { p_limit: limit })
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
  const { data, error } = await supabase.rpc('top_classement', { p_limit: 200 })
  if (error || !data) return null
  const active = data.filter(m => (parseFloat(m.vocal_h) || 0) >= 1).length
  return { membersTracked: data.length, activeVocal: active }
}

// â”€â”€ Auth helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchMemberProfile(discordId) {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('top_classement', { p_limit: 500 })
  if (error || !data) return null
  const member = data.find(m => String(m.uid) === String(discordId))
  if (!member) return null
  return {
    ...member,
    rank: parseInt(data.indexOf(member)) + 1,
    total: data.length,
  }
}

export async function signInWithDiscord() {
  if (!supabase) return { error: { message: 'Client Supabase non initialisé — variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes.' } }
  // Vider les verifiers PKCE périmés pour éviter les conflits entre tentatives
  try {
    const ref = url ? new URL(url).hostname.split('.')[0] : ''
    if (ref) localStorage.removeItem(`sb-${ref}-auth-token-code-verifier`)
  } catch {}
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

