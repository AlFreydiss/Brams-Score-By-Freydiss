// ── Tournoi multijoueur : salons en ligne ──────────────────────────────────
// Couche DONNÉES en REST DIRECT (PostgREST) — PAS le client supabase-js : ses
// .from()/.rpc() pouvaient HANG (getSession bloque le client → "Création..." à
// l'infini). Le realtime (subscribe) reste sur le client (ça, ça marche).
// L'hôte génère le bracket (rounds), tous lisent le même, votent, l'hôte résout.
import { supabase } from './supabase.js'            // realtime uniquement
import { SB_URL, SB_KEY, getAccessToken } from './supabaseRest.js'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans I/O/0/1 (lisible)

export function genRoomCode(len = 4) {
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return s
}

// Helper REST : renvoie { ok, status, data }. Token via getAccessToken (rafraîchi),
// fallback anon key. Ne hang jamais (fetch standard).
async function rest(path, { method = 'GET', body, prefer, headers } = {}) {
  if (!SB_URL || !SB_KEY) return { ok: false, status: 0, data: null }
  const token = await getAccessToken().catch(() => null)
  let res
  try {
    res = await fetch(`${SB_URL}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${token || SB_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(prefer ? { Prefer: prefer } : {}),
        ...headers,
      },
      body: body != null ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    return { ok: false, status: 0, data: null, error: e?.message }
  }
  let data = null
  try { data = await res.json() } catch {}
  return { ok: res.ok, status: res.status, data }
}

const UPSERT = 'resolution=merge-duplicates,return=minimal'
const nowIso = () => new Date().toISOString()

export async function createTournamentRoom({ hostUserId, displayName, avatarUrl, tournamentId, rounds }) {
  if (!SB_URL) return { error: 'supabase' }
  // Quelques tentatives pour éviter une collision de code (PK).
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genRoomCode()
    const r = await rest('tournament_rooms', {
      method: 'POST', prefer: 'return=minimal',
      body: { code, host_user_id: String(hostUserId), tournament_id: tournamentId, status: 'lobby', rounds, current_match: null },
    })
    if (r.ok) {
      await rest('tournament_room_players?on_conflict=room_code,user_id', {
        method: 'POST', prefer: UPSERT,
        body: { room_code: code, user_id: String(hostUserId), display_name: displayName, avatar_url: avatarUrl, is_host: true, last_seen: nowIso() },
      })
      return { code, error: null }
    }
    if (r.status === 409) continue            // code en doublon → on retente
    return { error: `create_failed_${r.status}` }
  }
  return { error: 'code_collision' }
}

export async function fetchTournamentRoom(code) {
  const r = await rest(`tournament_rooms?code=eq.${code.toUpperCase()}&select=*&limit=1`)
  return (r.data && r.data[0]) || null
}

export async function joinTournamentRoom({ code, userId, displayName, avatarUrl }) {
  const room = await fetchTournamentRoom(code)
  if (!room) return { error: 'introuvable' }
  const r = await rest('tournament_room_players?on_conflict=room_code,user_id', {
    method: 'POST', prefer: UPSERT,
    body: { room_code: code.toUpperCase(), user_id: String(userId), display_name: displayName, avatar_url: avatarUrl, last_seen: nowIso() },
  })
  return { error: r.ok ? null : `join_${r.status}`, room }
}

// Salons récents ("Salons en direct"). Throw sur erreur → l'UI distingue vide/erreur.
export async function fetchRecentTournamentRooms(limit = 6) {
  const r = await rest(`tournament_rooms?select=code,tournament_id,status,created_at&tournament_id=in.(ost,opening,ending)&order=created_at.desc&limit=${limit}`)
  if (!r.ok) throw new Error(`fetch_rooms_failed_${r.status}`)
  return r.data || []
}

export async function fetchTournamentRoomPlayers(code) {
  const r = await rest(`tournament_room_players?room_code=eq.${code.toUpperCase()}&select=*&order=joined_at.asc`)
  return r.data || []
}

export async function fetchTournamentRoomVotes(code, matchId) {
  const r = await rest(`tournament_room_votes?room_code=eq.${code.toUpperCase()}&match_id=eq.${encodeURIComponent(matchId)}&select=user_id,side`)
  return r.data || []
}

export async function castTournamentVote({ code, matchId, userId, side }) {
  const r = await rest('tournament_room_votes?on_conflict=room_code,match_id,user_id', {
    method: 'POST', prefer: UPSERT,
    body: { room_code: code.toUpperCase(), match_id: matchId, user_id: String(userId), side },
  })
  return { error: r.ok ? null : `vote_${r.status}` }
}

export async function updateTournamentRoom(code, patch) {
  const r = await rest(`tournament_rooms?code=eq.${code.toUpperCase()}`, {
    method: 'PATCH', prefer: 'return=minimal',
    body: { ...patch, updated_at: nowIso() },
  })
  return { error: r.ok ? null : `update_${r.status}` }
}

export async function touchTournamentPlayer(code, userId) {
  await rest(`tournament_room_players?room_code=eq.${code.toUpperCase()}&user_id=eq.${String(userId)}`, {
    method: 'PATCH', prefer: 'return=minimal', body: { last_seen: nowIso() },
  })
}

// Abonnement realtime (rounds/status/joueurs/votes) — reste sur le client supabase.
export function subscribeTournamentRoom(code, onChange) {
  if (!supabase) return () => {}
  const c = code.toUpperCase()
  const channel = supabase
    .channel(`troom_${c}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_rooms', filter: `code=eq.${c}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_room_players', filter: `room_code=eq.${c}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_room_votes', filter: `room_code=eq.${c}` }, onChange)
    .subscribe()
  return () => { try { supabase.removeChannel(channel) } catch {} }
}

export async function deleteTournamentRoom(code, hostUserId) {
  if (!code || !hostUserId) return { error: 'Code ou hote manquant' }
  const r = await rest(`tournament_rooms?code=eq.${String(code).trim().toUpperCase()}&host_user_id=eq.${String(hostUserId)}`, {
    method: 'DELETE', prefer: 'return=representation',
  })
  if (!r.ok) return { error: `delete_${r.status}` }
  if (!Array.isArray(r.data) || !r.data.length) return { error: 'Salon introuvable ou reserve a son hote' }
  return { error: null }
}
