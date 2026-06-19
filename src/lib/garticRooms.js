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

// ── Token secret par salon (mémoire + sessionStorage pour la reconnexion) ────
const _tokens = new Map() // code -> secret_token
function tokenKey(code) { return 'bp_token_' + String(code).toUpperCase() }
export function getToken(code) {
  const c = String(code).toUpperCase()
  if (_tokens.has(c)) return _tokens.get(c)
  try { const t = sessionStorage.getItem(tokenKey(c)); if (t) { _tokens.set(c, t); return t } } catch {}
  return null
}
function setToken(code, tok) {
  const c = String(code).toUpperCase()
  _tokens.set(c, tok)
  try { sessionStorage.setItem(tokenKey(c), tok) } catch {}
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
const rpc = (fn, args) => rest(`rpc/${fn}`, { method: 'POST', body: args, prefer: 'return=representation' })

// ── Salon (RPC sécurisées : token secret, anti-triche serveur) ───────────────
export async function createRoom({ userId, displayName, avatarUrl }) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = genRoomCode()
    const { data } = await rpc('gartic_create', { p_code: code, p_user: String(userId), p_name: displayName, p_avatar: avatarUrl })
    const out = Array.isArray(data) ? data[0] : data
    if (out?.secret_token) { setToken(out.code, out.secret_token); return { code: out.code, room: out.room, error: null } }
    if (out?.error && out.error !== 'code_taken') return { error: out.error }
  }
  return { error: 'code_collision' }
}

export async function joinRoom({ code, userId, displayName, avatarUrl }) {
  const base = { p_code: String(code), p_user: String(userId), p_name: displayName, p_avatar: avatarUrl }
  // p_token = réclamation sécurisée de SA place (anti vol de token). Si la migration sécurité
  // n'est pas encore appliquée (fonction 5-args absente → 404 → data null), on retombe sur
  // l'ancienne signature 4-args pour ne pas casser les joins pendant le déploiement.
  let r = await rpc('gartic_join', { ...base, p_token: getToken(code) })
  if (r.data == null) r = await rpc('gartic_join', base)
  const data = r.data
  const out = Array.isArray(data) ? data[0] : data
  if (!out || out.error === 'introuvable') return { error: 'introuvable' }
  if (out.spectator) return { room: out.room, spectator: true, error: null }
  if (out.secret_token) setToken(code, out.secret_token)
  return { room: out.room, error: null }
}

// État complet du salon (room + players) via RPC ; pages/players non lisibles direct.
export async function roomState(code) {
  const { data } = await rpc('gartic_room_state', { p_code: String(code) })
  const out = Array.isArray(data) ? data[0] : data
  return out && !out.error ? out : null // { room, players }
}
export async function fetchRoom(code)    { return (await roomState(code))?.room ?? null }
export async function fetchPlayers(code) { return (await roomState(code))?.players ?? [] }

// ── Pages (siège + round résolus serveur) ───────────────────────────────────
// round = la manche où le client a réellement produit la page. Un upload de dessin lent
// peut se terminer APRÈS que l'hôte ait fait avancer la partie : sans ce round figé, le
// serveur écrirait la page sur la mauvaise manche et laisserait le placeholder « Dessin
// manquant ». gartic_submit tolère round == current_round ou current_round-1.
export async function submitPage(code, content, round) {
  const tok = getToken(code); if (!tok) return { error: 'no_token' }
  const base = { p_code: String(code), p_token: tok, p_content: content ?? '' }
  if (Number.isInteger(round)) {
    // chemin migré : passe la manche figée. Si la fonction DB n'a pas encore le param p_round
    // (migration pas encore appliquée → 404 PostgREST, data null), on retombe sur l'ancienne
    // signature pour ne JAMAIS bloquer les soumissions pendant la fenêtre de déploiement.
    const r = await rpc('gartic_submit', { ...base, p_round: round })
    if (r.data != null) { const out = Array.isArray(r.data) ? r.data[0] : r.data; return out?.ok ? { error: null } : { error: out?.error || 'fail' } }
  }
  const { data } = await rpc('gartic_submit', base)
  const out = Array.isArray(data) ? data[0] : data
  return out?.ok ? { error: null } : { error: out?.error || 'fail' }
}
export async function fetchPrevPage(code) {
  const tok = getToken(code); if (!tok) return null
  const { data } = await rpc('gartic_prev_page', { p_code: String(code), p_token: tok })
  const out = Array.isArray(data) ? data[0] : data
  return out?.page ?? null // { type, content } | null
}
export async function submittedSeats(code) {
  const { data } = await rpc('gartic_submitted_seats', { p_code: String(code) })
  const out = Array.isArray(data) ? data[0] : data
  return { round: out?.round ?? 0, seats: new Set(Array.isArray(out?.seats) ? out.seats : []) }
}
export async function fetchAllPages(code) {
  const { data } = await rpc('gartic_all_pages', { p_code: String(code) })
  const out = Array.isArray(data) ? data[0] : data
  return Array.isArray(out?.pages) ? out.pages : []
}

// ── Présence / état joueur (token implicite) ─────────────────────────────────
export async function setReady(code, ready) {
  const tok = getToken(code); if (!tok) return
  await rpc('gartic_set_ready', { p_code: String(code), p_token: tok, p_ready: ready })
}
export async function touchPlayer(code) {
  const tok = getToken(code); if (!tok) return
  await rpc('gartic_touch', { p_code: String(code), p_token: tok })
}

// Migration d'hôte : le serveur valide candidat (plus bas siège vivant) + staleness.
export async function promoteSelfHost(code) {
  const tok = getToken(code); if (!tok) return { ok: false }
  const { data } = await rpc('gartic_promote_host', { p_code: String(code), p_token: tok })
  return (Array.isArray(data) ? data[0] : data) || { ok: false }
}

// ── RPC (horloge serveur + transitions) ─────────────────────────────────────
export const startGame = (code, settings) => rpc('gartic_start', { p_code: String(code), p_token: getToken(code), p_settings: settings })
export const advance = (code, expectedRound) => rpc('gartic_advance', { p_code: String(code), p_token: getToken(code), p_expected_round: expectedRound ?? null })
// Rejouer : ramène le salon au lobby (efface pages, reset ready/sièges). Hôte uniquement.
export const replayGame = (code) => rpc('gartic_replay', { p_code: String(code), p_token: getToken(code) })
export async function serverNow() {
  const { data } = await rpc('gartic_now', {})
  const iso = Array.isArray(data) ? data[0] : data
  return iso ? new Date(iso).getTime() : Date.now()
}

// ── Realtime (postgres_changes sur gartic_rooms UNIQUEMENT) ─────────────────
// players/pages sont en RLS deny → aucun event ne remonterait. Les transitions de
// phase passent par gartic_rooms (SELECT-able) ; la liveness/les signaux passent
// par le canal presence/broadcast (joinChannel).
export function subscribeRoom(roomId, onChange) {
  if (!supabase) return () => {}
  let ch, retry, closed = false
  const build = () => supabase.channel(`bpgartic_${roomId}_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'gartic_rooms', filter: `id=eq.${roomId}` }, onChange)
    .subscribe((status) => {
      if (!closed && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED')) {
        clearTimeout(retry)
        retry = setTimeout(() => { if (closed) return; try { supabase.removeChannel(ch) } catch {}; ch = build() }, 2000)
      }
    })
  ch = build()
  return () => { closed = true; clearTimeout(retry); try { supabase.removeChannel(ch) } catch {} }
}

// ── Canal liveness + signaux basse latence ──────────────────────────────────
// presence = qui est là (lobby) ; broadcast = player_submitted / phase_change /
// host_migrated (Phase 3 ajoutera reaction).
export function joinChannel(code, { userId, displayName, avatarUrl, onPresence, onBroadcast }) {
  if (!supabase) return { send: () => {}, leave: () => {} }
  // broadcast.self:false explicite : l'émetteur ne reçoit pas ses propres events
  // (réactions/reveal_step). C'est le défaut Supabase mais le reveal en dépend → on le fige.
  const ch = supabase.channel(`room:${String(code).toUpperCase()}`, { config: { presence: { key: String(userId) }, broadcast: { self: false } } })
  ch.on('presence', { event: 'sync' }, () => onPresence?.(ch.presenceState()))
  ch.on('broadcast', { event: '*' }, (p) => onBroadcast?.(p.event, p.payload))
  ch.subscribe((status) => {
    if (status === 'SUBSCRIBED') ch.track({ user_id: String(userId), display_name: displayName, avatar_url: avatarUrl, at: Date.now() })
  })
  return {
    send: (event, payload = {}) => { try { ch.send({ type: 'broadcast', event, payload }) } catch {} },
    leave: () => { try { supabase.removeChannel(ch) } catch {} },
  }
}
