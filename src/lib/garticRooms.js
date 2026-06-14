// ── Brams Phone : salons multijoueur temps réel ─────────────────────────────
// Calque sur src/lib/undercoverRooms.js : REST DIRECT (anti-hang) + postgres_changes.
// Tables gartic_rooms / gartic_players / gartic_pages. Host-authoritative par
// convention ; transitions de phase via RPC (horloge serveur). Identité = user_id
// texte (Brams/Discord si connecté, sinon guest localStorage).
import { supabase } from './supabase.js' // UNIQUEMENT pour le realtime (subscribeRoom)
import { SB_URL, SB_KEY, getAccessToken } from './supabaseRest.js'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function genRoomCode(len = 4) {
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return s
}

// Identité invité stable par navigateur (si pas connecté Brams/Discord).
export function guestId() {
  try {
    let g = localStorage.getItem('bp_guest')
    if (!g) { g = 'guest_' + crypto.randomUUID().slice(0, 12); localStorage.setItem('bp_guest', g) }
    return g
  } catch { return 'guest_' + Math.floor(Math.random() * 1e12) }
}

// REST direct borné 10s (le client supabase-js peut hang sur le verrou d'auth).
async function rest(path, { method = 'GET', body, prefer } = {}) {
  if (!SB_URL || !SB_KEY) return { data: null, error: 'supabase' }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10000)
  try {
    const token = await getAccessToken().catch(() => null)
    const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
      method, signal: ctrl.signal,
      headers: {
        apikey: SB_KEY, Authorization: `Bearer ${token || SB_KEY}`,
        'Content-Type': 'application/json', Accept: 'application/json',
        ...(prefer ? { Prefer: prefer } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    if (!res.ok) {
      let msg = `http_${res.status}`
      try { const j = JSON.parse(text); msg = j.message || j.error || msg } catch {}
      return { data: null, error: msg }
    }
    return { data: text ? JSON.parse(text) : null, error: null }
  } catch (e) {
    return { data: null, error: e?.name === 'AbortError' ? 'timeout' : (e?.message || 'fail') }
  } finally { clearTimeout(timer) }
}
const enc = encodeURIComponent
const rpc = (fn, args) => rest(`rpc/${fn}`, { method: 'POST', body: args, prefer: 'return=representation' })

// ── Salon ───────────────────────────────────────────────────────────────────
export async function createRoom({ userId, displayName, avatarUrl }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genRoomCode()
    const { data, error } = await rest('gartic_rooms', {
      method: 'POST', prefer: 'return=representation',
      body: { code, host_user_id: String(userId), status: 'lobby', settings: {} },
    })
    if (!error && data?.[0]) {
      const room = data[0]
      await rest('gartic_players', {
        method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
        body: { room_id: room.id, user_id: String(userId), display_name: displayName, avatar_url: avatarUrl, is_host: true, last_seen: new Date().toISOString() },
      }).catch(() => {})
      return { code, room, error: null }
    }
    if (error === 'timeout') return { error: 'Délai dépassé, réessaie' }
    if (!/duplicate|conflict|23505/i.test(error || '')) return { error: error || 'fail' }
  }
  return { error: 'code_collision' }
}

export async function fetchRoom(code) {
  const { data } = await rest(`gartic_rooms?code=eq.${enc(String(code).toUpperCase())}&select=*&limit=1`)
  return Array.isArray(data) && data[0] ? data[0] : null
}

export async function joinRoom({ code, userId, displayName, avatarUrl }) {
  const room = await fetchRoom(code)
  if (!room) return { error: 'introuvable' }
  if (room.status !== 'lobby') return { room, spectator: true, error: null } // join tardif = spectateur
  const { error } = await rest('gartic_players?on_conflict=room_id,user_id', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: { room_id: room.id, user_id: String(userId), display_name: displayName, avatar_url: avatarUrl, connected: true, last_seen: new Date().toISOString() },
  })
  return { room, error: error === 'timeout' ? 'Délai dépassé, réessaie' : (error || null) }
}

export async function fetchPlayers(roomId) {
  const { data } = await rest(`gartic_players?room_id=eq.${enc(roomId)}&select=*&order=joined_at.asc`)
  return Array.isArray(data) ? data : []
}

// ── Pages ─────────────────────────────────────────────────────────────────
export async function submitPage({ roomId, bookId, pageIndex, type, content, authorUserId }) {
  const { error } = await rest('gartic_pages?on_conflict=room_id,book_id,page_index', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: { room_id: roomId, book_id: bookId, page_index: pageIndex, type, content, author_user_id: String(authorUserId) },
  })
  return { error: error || null }
}

// Page précédente de mon carnet courant (à dessiner / décrire).
export async function fetchPrevPage(roomId, bookId, round) {
  if (round <= 0) return null
  const { data } = await rest(`gartic_pages?room_id=eq.${enc(roomId)}&book_id=eq.${bookId}&page_index=eq.${round - 1}&select=type,content&limit=1`)
  return Array.isArray(data) && data[0] ? data[0] : null
}

export async function fetchAllPages(roomId) {
  const { data } = await rest(`gartic_pages?room_id=eq.${enc(roomId)}&select=book_id,page_index,type,content,author_user_id&order=book_id.asc,page_index.asc`)
  return Array.isArray(data) ? data : []
}

// ── Présence / état joueur ──────────────────────────────────────────────────
export async function setReady(roomId, userId, ready) {
  await rest(`gartic_players?room_id=eq.${enc(roomId)}&user_id=eq.${enc(String(userId))}`,
    { method: 'PATCH', prefer: 'return=minimal', body: { is_ready: ready } }).catch(() => {})
}
export async function touchPlayer(roomId, userId) {
  await rest(`gartic_players?room_id=eq.${enc(roomId)}&user_id=eq.${enc(String(userId))}`,
    { method: 'PATCH', prefer: 'return=minimal', body: { connected: true, last_seen: new Date().toISOString() } }).catch(() => {})
}
export async function setConnected(roomId, userId, connected) {
  await rest(`gartic_players?room_id=eq.${enc(roomId)}&user_id=eq.${enc(String(userId))}`,
    { method: 'PATCH', prefer: 'return=minimal', body: { connected } }).catch(() => {})
}

// ── RPC (horloge serveur + transitions) ─────────────────────────────────────
export const startGame = (roomId, settings) => rpc('gartic_start', { p_room: roomId, p_settings: settings })
export const advance = (roomId) => rpc('gartic_advance', { p_room: roomId })
export async function myBook(roomId, userId, round) {
  const { data } = await rpc('gartic_my_book', { p_room: roomId, p_user: String(userId), p_round: round })
  return typeof data === 'number' ? data : (Array.isArray(data) ? data[0] : null)
}
export async function serverNow() {
  const { data } = await rpc('gartic_now', {})
  const iso = Array.isArray(data) ? data[0] : data
  return iso ? new Date(iso).getTime() : Date.now()
}

// ── Realtime (postgres_changes, auto-rebuild du canal) ──────────────────────
export function subscribeRoom(roomId, onChange) {
  if (!supabase) return () => {}
  let ch, retry, closed = false
  const build = () => supabase.channel(`bpgartic_${roomId}_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'gartic_rooms', filter: `id=eq.${roomId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'gartic_players', filter: `room_id=eq.${roomId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'gartic_pages', filter: `room_id=eq.${roomId}` }, onChange)
    .subscribe((status) => {
      if (!closed && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED')) {
        clearTimeout(retry)
        retry = setTimeout(() => { if (closed) return; try { supabase.removeChannel(ch) } catch {}; ch = build() }, 2000)
      }
    })
  ch = build()
  return () => { closed = true; clearTimeout(retry); try { supabase.removeChannel(ch) } catch {} }
}
