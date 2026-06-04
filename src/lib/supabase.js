import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = url && key ? createClient(url, key, {
  auth: {
    detectSessionInUrl: true,
    persistSession:     true,
    autoRefreshToken:   true,
    flowType:           'implicit',
    // Verrou no-op : court-circuite navigator.locks qui pouvait se bloquer et
    // faire hanger TOUS les appels client (getSession jamais résolu → blind test,
    // théories, boutique, classement figés). Trade-off accepté : pas de
    // coordination du refresh token entre onglets (sans impact réel ici).
    lock: (_name, _acquireTimeout, fn) => fn(),
  },
}) : null

// Garde-fou anti-blocage : si un appel Supabase ne répond pas (client coincé
// après un refresh de token, réseau lent), on résout en erreur au lieu de hanger
// pour toujours → l'UI sort du skeleton (retry possible) au lieu de "faut F5".
function withTimeout(promise, ms = 7000) {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((resolve) => setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), ms)),
  ])
}

async function callTopClassement(limit, period = 'week') {
  try {
    const response = await fetch(
      `/api/leaderboard?limit=${encodeURIComponent(limit)}&period=${encodeURIComponent(period)}&_=${Date.now()}`,
      { cache: 'no-store' }
    )
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
  if (!supabase) return false
  // IMPORTANT : on utilise la MÊME source que le Classement vocal principal
  // (/api/leaderboard via callTopClassement, période semaine) filtrée par heures,
  // pour que le modal de rang affiche exactement les mêmes chiffres/membres.
  // (Avant : members_by_rank RPC calculait différemment → incohérence.)
  const board = await callTopClassement(500, 'week')
  if (board.error || !Array.isArray(board.data)) return false
  return board.data.filter(m => {
    const h = parseFloat(m.vocal_h || 0)
    return h >= minH && h < maxH
  })
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

  // ── 1. Leaderboard via the SAME source as /classement (API first, then RPC) ──
  // This ensures consistency with the public leaderboard and may be faster/cached.
  let board = null
  try {
    const boardRes = await withTimeout( callTopClassement(500, 'week') )
    if (!boardRes?.error && Array.isArray(boardRes?.data) && boardRes.data.length) {
      board = boardRes.data
    } else {
      const boardRes2 = await withTimeout( callTopClassement(500) )
      if (!boardRes2?.error && Array.isArray(boardRes2?.data) && boardRes2.data.length) {
        board = boardRes2.data
      }
    }
  } catch (e) {
    console.warn('[profile] leaderboard fetch failed', e?.message || e)
  }

  if (board) {
    // uid field might be named differently depending on RPC version
    const idx = board.findIndex(m =>
      String(m.uid ?? m.user_id ?? m.discord_id ?? '') === id
    )
    console.log('[profile] board match idx', idx, 'for id', id, 'sample uid', board[0]?.uid ?? board[0]?.user_id)
    if (idx !== -1) return { ...board[idx], uid: id, rank: idx + 1, total: board.length }
  }

  // ── 2. Direct users table lookup (fallback) ─────────────────────────────────
  const { data: user } = await withTimeout(
    supabase.from('users').select('uid, data').eq('uid', id).maybeSingle()
  )

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
  // scope 'local' : pas de round-trip serveur (qui pouvait hang/échouer avec les
  // tokens ES256 et laisser l'utilisateur "connecté"). On purge tout localement.
  try { await supabase.auth.signOut({ scope: 'local' }) } catch {}
  try {
    Object.keys(localStorage)
      .filter(k => k.includes('supabase') || k.startsWith('sb-'))
      .forEach(k => localStorage.removeItem(k))
  } catch {}
}

export async function getSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

