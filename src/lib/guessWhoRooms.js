// ── Guess Who : salons multijoueur (RPC sécurisées + realtime) ───────────────
// Calque Frds Phone (garticRooms.js) : REST direct borné (anti-hang), jeton
// secret par salon en localStorage (reprise de place au rechargement), realtime
// sur guesswho_rooms uniquement (les autres tables sont fermées en lecture).
import { supabase } from './supabase.js'
import { sbRpc } from './supabaseRest.js'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function genRoomCode(len = 4) {
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return s
}

export function guestId() {
  try {
    let g = localStorage.getItem('bp_guest')
    if (!g) { g = 'guest_' + crypto.randomUUID().slice(0, 12); localStorage.setItem('bp_guest', g) }
    return g
  } catch { return 'guest_' + Math.floor(Math.random() * 1e12) }
}

const tokenKey = (code) => 'gw_token_' + String(code).toUpperCase()
export function getToken(code) {
  try { return localStorage.getItem(tokenKey(code)) } catch { return null }
}
function setToken(code, tok) {
  try { localStorage.setItem(tokenKey(code), tok) } catch {}
}

const rpc = (fn, args) => sbRpc(fn, args, { timeout: 10000, tag: 'guesswho' })
const withToken = (code, extra = {}) => ({ p_code: String(code), p_token: getToken(code), ...extra })

export async function createRoom({ userId, displayName, avatarUrl }) {
  for (let i = 0; i < 6; i++) {
    const out = await rpc('guesswho_create', { p_code: genRoomCode(), p_user: String(userId), p_name: displayName, p_avatar: avatarUrl })
    if (out?.secret_token) { setToken(out.code, out.secret_token); return { code: out.code } }
    if (out?.error && out.error !== 'code_taken') return { error: out.error }
  }
  return { error: 'code_collision' }
}

export async function joinRoom({ code, userId, displayName, avatarUrl }) {
  const out = await rpc('guesswho_join', {
    p_code: String(code), p_user: String(userId), p_name: displayName, p_avatar: avatarUrl, p_token: getToken(code),
  })
  if (!out || out.error) return { error: out?.error || 'introuvable' }
  if (out.secret_token) setToken(code, out.secret_token)
  return { roomId: out.room_id, spectator: !!out.spectator, reason: out.reason || null }
}

export async function roomState(code) {
  const out = await rpc('guesswho_room_state', { p_code: String(code) })
  return out?.room ? out : null
}
export async function progress(code) {
  const out = await rpc('guesswho_progress', { p_code: String(code) })
  return out?.phase ? out : null
}
export async function fetchTakes(code, round) {
  const out = await rpc('guesswho_takes', { p_code: String(code), p_round: round })
  return Array.isArray(out?.takes) ? out.takes : []
}

export const startGame = (code) => rpc('guesswho_start', withToken(code))
export const submitGage = (code, text) => rpc('guesswho_submit_gage', withToken(code, { p_text: text }))
export const submitTake = (code, url, duration, round) =>
  rpc('guesswho_submit_take', withToken(code, { p_url: url, p_duration: duration, p_round: round }))
export const castVote = (code, target) => rpc('guesswho_vote', withToken(code, { p_target: target }))
export const advance = (code, phase, round) =>
  rpc('guesswho_advance', withToken(code, { p_expected_phase: phase, p_expected_round: round }))
export const skipClip = (code) => rpc('guesswho_skip_clip', withToken(code))
export const touch = (code) => rpc('guesswho_touch', withToken(code))
export const promoteHost = (code) => rpc('guesswho_promote_host', withToken(code))

export async function serverNow() {
  const out = await rpc('guesswho_now', {})
  const t = typeof out === 'string' ? new Date(out).getTime() : NaN
  return Number.isFinite(t) ? t : Date.now()
}

export function subscribeRoom(roomId, onChange) {
  if (!supabase || !roomId) return () => {}
  let ch, retry, closed = false
  const build = () => supabase.channel(`guesswho_${roomId}_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'guesswho_rooms', filter: `id=eq.${roomId}` }, onChange)
    .subscribe((status) => {
      if (!closed && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED')) {
        clearTimeout(retry)
        retry = setTimeout(() => { if (closed) return; try { supabase.removeChannel(ch) } catch {}; ch = build() }, 2000)
      }
    })
  ch = build()
  return () => { closed = true; clearTimeout(retry); try { supabase.removeChannel(ch) } catch {} }
}
