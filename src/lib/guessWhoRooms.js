// ── Guess Who : salons multijoueur (RPC sécurisées + realtime) ───────────────
// Calque Frds Phone (garticRooms.js) : REST direct borné (anti-hang), jeton
// secret par salon en localStorage (reprise de place au rechargement), realtime
// sur guesswho_rooms uniquement (les autres tables sont fermées en lecture).
//
// Migration 20261002b (guesswho_sync / guesswho_stats) : utilisée si présente,
// sinon on retombe sur les anciennes fonctions (le jeu marche sans elle).
import { supabase } from './supabase.js'
import { sbRpc } from './supabaseRest.js'
import { isMissingFunction, isNetworkError } from '../features/guesswho/logic/clock.js'

export { isNetworkError }

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
  try { localStorage.setItem(tokenKey(code), tok) } catch { /* stockage indisponible */ }
}

const rpc = (fn, args) => sbRpc(fn, args, { timeout: 10000, tag: 'guesswho' })
const withToken = (code, extra = {}) => ({ p_code: String(code), p_token: getToken(code), ...extra })

// Actions idempotentes côté serveur (upsert) : on peut les renvoyer sans risque
// quand le réseau a lâché (4G qui coupe, onglet qui se réveille).
async function retrying(call, tries = 3) {
  let out
  for (let i = 0; i < tries; i++) {
    out = await call()
    if (!isNetworkError(out)) return out
    await new Promise((r) => setTimeout(r, 600 * (i + 1)))
  }
  return out
}

// Présence de la migration 20261002b : revérifiée toutes les 2 min (elle peut
// être collée pendant qu'une partie tourne).
const support = { sync: true, stats: true, checkedAt: 0 }
function supported(key) {
  if (!support[key] && Date.now() - support.checkedAt > 120000) { support.sync = support.stats = true }
  return support[key]
}
function markMissing(key) { support[key] = false; support.checkedAt = Date.now() }
export const hasServerSync = () => support.sync

export async function createRoom({ userId, displayName, avatarUrl }) {
  for (let i = 0; i < 6; i++) {
    const out = await retrying(() => rpc('guesswho_create', { p_code: genRoomCode(), p_user: String(userId), p_name: displayName, p_avatar: avatarUrl }))
    if (out?.secret_token) { setToken(out.code, out.secret_token); return { code: out.code } }
    if (out?.error && out.error !== 'code_taken') return { error: out.error }
  }
  return { error: 'code_collision' }
}

// { roomId, spectator, reason, late } ou { error, network } (network = à retenter).
// Un seul « rejoindre » en vol par salon : deux appels simultanés (effet relancé,
// StrictMode) faisaient partir le 2e sans jeton → « seat_taken » → spectateur.
const joining = new Map()
export function joinRoom(args) {
  const key = String(args.code).toUpperCase()
  if (!joining.has(key)) joining.set(key, joinOnce(args).finally(() => joining.delete(key)))
  return joining.get(key)
}
async function joinOnce({ code, userId, displayName, avatarUrl }) {
  const out = await rpc('guesswho_join', {
    p_code: String(code), p_user: String(userId), p_name: displayName, p_avatar: avatarUrl, p_token: getToken(code),
  })
  if (!out || out.error) return { error: out?.error || 'introuvable', network: isNetworkError(out) }
  if (out.secret_token) setToken(code, out.secret_token)
  return { roomId: out.room_id, spectator: !!out.spectator, reason: out.reason || null, late: !!out.late }
}

export async function roomState(code) {
  const out = await rpc('guesswho_room_state', { p_code: String(code) })
  return out?.room ? out : null
}
export async function progress(code) {
  const out = await rpc('guesswho_progress', { p_code: String(code) })
  return out?.phase ? out : null
}
// Imitations du tour ; null = échec réseau (à retenter), [] = aucune.
export async function fetchTakes(code, round) {
  const out = await rpc('guesswho_takes', { p_code: String(code), p_round: round })
  if (Array.isArray(out?.takes)) return out.takes
  return out?.error === 'hidden' ? [] : null
}

// Récap serveur ; false = migration absente, null = échec réseau.
export async function fetchStats(code) {
  if (!supported('stats')) return false
  const out = await rpc('guesswho_stats', { p_code: String(code) })
  if (isMissingFunction(out)) { markMissing('stats'); return false }
  return Array.isArray(out?.rounds) ? out : null
}

// Synchro complète : { room, players, progress, now, me } ou { error }.
// `asPlayer` : envoie le jeton (présence, reprise d'hôte, filet de sécurité).
const legacy = new Map() // code → { touch, now } (dernier envoi, ancien mode)
export async function sync(code, { asPlayer = false } = {}) {
  const token = asPlayer ? getToken(code) : null
  if (supported('sync')) {
    const out = await rpc('guesswho_sync', { p_code: String(code), p_token: token })
    if (out?.room) return out
    if (!isMissingFunction(out)) return { error: out?.error || 'sync_failed', network: isNetworkError(out) }
    markMissing('sync')
  }
  // Ancien mode : état + progression, présence toutes les 8 s, heure toutes les 30 s.
  const l = legacy.get(code) || { touch: 0, now: 0 }
  legacy.set(code, l)
  const t = Date.now()
  const doTouch = !!token && t - l.touch > 8000
  const doNow = t - l.now > 30000
  if (doTouch) l.touch = t
  if (doNow) l.now = t
  const [st, pg, , now] = await Promise.all([
    rpc('guesswho_room_state', { p_code: String(code) }),
    rpc('guesswho_progress', { p_code: String(code) }),
    doTouch ? rpc('guesswho_touch', { p_code: String(code), p_token: token }) : null,
    doNow ? rpc('guesswho_now', {}) : null,
  ])
  if (!st?.room) return { error: st?.error || 'sync_failed', network: isNetworkError(st) }
  return { ...st, progress: pg?.phase ? pg : null, now: typeof now === 'string' ? now : null, me: null }
}

// Avec réglages (migration 20261002). Si la base n'a pas encore cette version
// (fonction introuvable), on relance avec l'ancienne signature : la partie
// démarre quand même, avec les règles par défaut.
export async function startGame(code, settings = {}) {
  const out = await rpc('guesswho_start', withToken(code, { p_settings: settings || {} }))
  if (out?.ok === false && (isMissingFunction(out) || /guesswho_start|function|PGRST20/i.test(String(out.error || '')))) {
    return rpc('guesswho_start', withToken(code))
  }
  return out
}
export const submitGage = (code, text) => retrying(() => rpc('guesswho_submit_gage', withToken(code, { p_text: text })))
export const submitTake = (code, url, duration, round) =>
  retrying(() => rpc('guesswho_submit_take', withToken(code, { p_url: url, p_duration: duration, p_round: round })))
export const castVote = (code, target) => retrying(() => rpc('guesswho_vote', withToken(code, { p_target: target })))
export const advance = (code, phase, round) =>
  rpc('guesswho_advance', withToken(code, { p_expected_phase: phase, p_expected_round: round }))
export const skipClip = (code) => rpc('guesswho_skip_clip', withToken(code))
export async function setReady(code, ready) {
  const out = await rpc('guesswho_set_ready', withToken(code, { p_ready: !!ready }))
  return isMissingFunction(out) ? { error: 'unsupported' } : out
}
export const touch = (code) => rpc('guesswho_touch', withToken(code))
export const promoteHost = (code) => rpc('guesswho_promote_host', withToken(code))

export async function serverNow() {
  const out = await rpc('guesswho_now', {})
  const t = typeof out === 'string' ? new Date(out).getTime() : NaN
  return Number.isFinite(t) ? t : Date.now()
}

// Realtime sur le salon. onStatus(status) reçoit l'état du canal ; à chaque
// (ré)abonnement réussi on relance onChange pour rattraper ce qui a été manqué.
// La fonction renvoyée ferme le canal ; `.reconnect()` force un nouveau canal
// (réveil d'un onglet iPhone dont la websocket est morte en silence).
export function subscribeRoom(roomId, onChange, onStatus = () => {}) {
  if (!supabase || !roomId) { const off = () => {}; off.reconnect = () => {}; return off }
  let ch, retry, closed = false, attempt = 0
  const rebuild = () => {
    clearTimeout(retry)
    if (closed) return
    const old = ch
    ch = build() // d'abord le nouveau : l'ancien n'est plus « le canal courant »
    try { if (old) supabase.removeChannel(old) } catch { /* déjà fermé */ }
  }
  const build = () => {
    const mine = supabase.channel(`guesswho_${roomId}_${Date.now()}`)
    return mine
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guesswho_rooms', filter: `id=eq.${roomId}` }, onChange)
      .subscribe((status) => {
        // removeChannel() rappelle ce callback avec CLOSED : un ancien canal ne
        // doit pas déclencher de reconstruction (sinon il tue le nouveau, en boucle).
        if (closed || mine !== ch) return
        onStatus(status)
        if (status === 'SUBSCRIBED') { attempt = 0; onChange() }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          clearTimeout(retry)
          retry = setTimeout(rebuild, Math.min(15000, 2000 * 2 ** attempt++))
        }
      })
  }
  ch = build()
  const off = () => { closed = true; clearTimeout(retry); try { supabase.removeChannel(ch) } catch { /* déjà fermé */ } }
  off.reconnect = rebuild
  return off
}
