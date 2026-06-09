import { createClient } from '@supabase/supabase-js'
import { getAccessToken } from './supabaseRest.js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = url && key ? createClient(url, key, {
  auth: {
    detectSessionInUrl: true,
    persistSession:     true,
    autoRefreshToken:   true,
    flowType:           'pkce',
    // Verrou borne : on garde navigator.locks (coordination du refresh token entre
    // onglets — sans ça, 2 onglets rafraîchissent en même temps, la rotation du
    // refresh token en invalide un → session morte → "faut se reconnecter sans
    // arrêt"). Mais on borne l'attente via AbortSignal : si le verrou ne se
    // libère jamais (le bug d'origine qui faisait hanger getSession et figeait
    // blind test / boutique / classement), on abandonne et on exécute quand même.
    lock: async (name, acquireTimeout, fn) => {
      if (typeof navigator === 'undefined' || !navigator.locks?.request) return fn()
      const ctrl = new AbortController()
      const ms = Math.max(acquireTimeout || 0, 8000)
      const timer = setTimeout(() => ctrl.abort(), ms)
      try {
        return await navigator.locks.request(name, { signal: ctrl.signal }, () => fn())
      } catch {
        // Verrou avorté (timeout) ou indisponible → on exécute sans coordination
        // plutôt que de bloquer pour toujours.
        return await fn()
      } finally {
        clearTimeout(timer)
      }
    },
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

// Lecture de la ligne users en REST DIRECT (PostgREST) plutôt que
// supabase.from(), qui pouvait hang ~7s et faisait tourner la page profil en
// chargement. Token utilisateur si dispo, sinon clé anon (lecture publique).
async function fetchUserRowREST(id) {
  if (!url || !key) return null
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    const token = await getAccessToken().catch(() => null)
    const r = await fetch(
      `${url}/rest/v1/users?uid=eq.${encodeURIComponent(id)}&select=uid,data&limit=1`,
      { signal: ctrl.signal, headers: { apikey: key, Authorization: `Bearer ${token || key}`, Accept: 'application/json' } }
    )
    clearTimeout(timer)
    if (!r.ok) return null
    const rows = await r.json()
    return Array.isArray(rows) && rows[0] ? rows[0] : null
  } catch { return null }
}

// Classement (même source que /classement) avec repli sur l'ancienne signature.
async function fetchBoardForProfile() {
  try {
    const boardRes = await withTimeout( callTopClassement(500, 'week') )
    if (!boardRes?.error && Array.isArray(boardRes?.data) && boardRes.data.length) return boardRes.data
    const boardRes2 = await withTimeout( callTopClassement(500) )
    if (!boardRes2?.error && Array.isArray(boardRes2?.data) && boardRes2.data.length) return boardRes2.data
  } catch (e) {
    console.warn('[profile] leaderboard fetch failed', e?.message || e)
  }
  return null
}

// Résout un paramètre d'URL profil (id Discord OU pseudo) vers un uid Discord.
// Numérique = déjà un id (chemin rapide, zéro requête). Sinon lookup case-insensitive
// sur users.data->>username. null = introuvable ou ambigu (>1) → l'appelant redirige.
export async function resolveProfileId(param) {
  const raw = String(param || '').trim()
  if (/^\d+$/.test(raw)) return raw
  if (!url || !key || !raw) return null
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    const token = await getAccessToken().catch(() => null)
    // limit=2 : on veut détecter l'ambiguïté (deux pseudos identiques) sans tout charger.
    const r = await fetch(
      `${url}/rest/v1/users?select=uid&data->>username=ilike.${encodeURIComponent(raw)}&limit=2`,
      { signal: ctrl.signal, headers: { apikey: key, Authorization: `Bearer ${token || key}`, Accept: 'application/json' } }
    )
    clearTimeout(timer)
    if (!r.ok) return null
    const rows = await r.json()
    return Array.isArray(rows) && rows.length === 1 ? String(rows[0].uid) : null
  } catch { return null }
}

export async function fetchMemberProfile(discordId) {
  const id = String(discordId)

  // Profil (table users) + classement EN PARALLÈLE → la page profil ne traîne
  // plus : avant, le fetch users hangait avant même de lancer le classement.
  const [userRow, board] = await Promise.all([
    fetchUserRowREST(id),
    fetchBoardForProfile(),
  ])

  let directProfile = null
  if (userRow) {
    const d = userRow.data || {}
    directProfile = {
      uid: id,
      username: d.username || d.display_name || `Pirate #${id.slice(-5)}`,
      display_name: d.display_name || d.global_name || d.nick || d.nickname || null,
      global_name: d.global_name || null,
      avatar_url: d.avatar_url || d.avatar || null,
      vocal_h: parseFloat(d.vocal_h || d.total_vocal_h || 0),
      berrys: parseInt(d.berrys || d.balance || 0) || 0,
    }
  }

  if (board) {
    // uid field might be named differently depending on RPC version
    const idx = board.findIndex(m =>
      String(m.uid ?? m.user_id ?? m.discord_id ?? '') === id
    )
    console.log('[profile] board match idx', idx, 'for id', id, 'sample uid', board[0]?.uid ?? board[0]?.user_id)
    if (idx !== -1) {
      const fromBoard = { ...board[idx], uid: id, rank: idx + 1, total: board.length }
      return {
        ...fromBoard,
        username: directProfile?.username || fromBoard.username,
        display_name: directProfile?.display_name || directProfile?.global_name || null,
        global_name: directProfile?.global_name || null,
        avatar_url: directProfile?.avatar_url || fromBoard.avatar_url,
      }
    }
  }

  // ── 2. Direct users table lookup (fallback) ─────────────────────────────────
  if (directProfile) return {
    ...directProfile,
    rank: board ? board.length + 1 : '?',
    total: board ? board.length : '?',
  }
  return null
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

