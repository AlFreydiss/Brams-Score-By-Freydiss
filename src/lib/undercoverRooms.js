// ── Undercover : salons multijoueur temps réel ──────────────────────────────
// Réutilise les tables des salons Tournoi (zéro migration) :
//   tournament_rooms        → 1 ligne/salon, tournament_id='undercover',
//                              tout l'état du jeu dans le JSONB `rounds`.
//   tournament_room_players → joueurs (display_name, avatar, is_host, last_seen).
//   tournament_room_votes   → indices ET votes d'élimination (1 ligne/user/clé) :
//       match_id = `clue:<round>:<pass>`  side = texte de l'indice
//       match_id = `elim:<round>`         side = uid de la cible
// Seul l'HÔTE écrit `rounds` (pas de course) ; les joueurs n'écrivent que des votes.
import { supabase } from './supabase.js'   // gardé UNIQUEMENT pour le realtime (subscribeRoom)
import { SB_URL, SB_KEY, getAccessToken } from './supabaseRest.js'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function genRoomCode(len = 4) {
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return s
}

// ⚠️ REST DIRECT (anti-hang). Avant, supabase.from() pouvait rester bloqué sur le
// verrou d'auth → "Création…/chargement à l'infini". Le fetch direct lit le JWT
// du storage sans le client supabase-js. Borné à 10s.
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

export async function createUndercoverRoom({ hostUserId, displayName, avatarUrl }) {
  if (!hostUserId) return { error: 'non connecté' }
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genRoomCode()
    const { error } = await rest('tournament_rooms', {
      method: 'POST', prefer: 'return=minimal',
      body: { code, host_user_id: String(hostUserId), tournament_id: 'undercover', status: 'lobby', rounds: { phase: 'lobby' }, current_match: null },
    })
    if (!error) {
      // L'ajout du joueur ne doit pas bloquer la création.
      await rest('tournament_room_players?on_conflict=room_code,user_id', {
        method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
        body: { room_code: code, user_id: String(hostUserId), display_name: displayName, avatar_url: avatarUrl, is_host: true, last_seen: new Date().toISOString() },
      }).catch(() => {})
      return { code, error: null }
    }
    if (error === 'timeout') return { error: 'Délai dépassé, réessaie' }
    if (!/duplicate|conflict|23505/i.test(error)) return { error }
  }
  return { error: 'code_collision' }
}

export async function fetchRoom(code) {
  const { data } = await rest(`tournament_rooms?code=eq.${enc(code.toUpperCase())}&select=*&limit=1`)
  const room = Array.isArray(data) && data[0] ? data[0] : null
  return room && room.tournament_id === 'undercover' ? room : (room ? { ...room, _wrongType: true } : null)
}

export async function joinRoom({ code, userId, displayName, avatarUrl }) {
  const room = await fetchRoom(code)
  if (!room || room._wrongType) return { error: 'introuvable' }
  const { error } = await rest('tournament_room_players?on_conflict=room_code,user_id', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: { room_code: code.toUpperCase(), user_id: String(userId), display_name: displayName, avatar_url: avatarUrl, last_seen: new Date().toISOString() },
  })
  return { error: error === 'timeout' ? 'Délai dépassé, réessaie' : (error || null), room }
}

export async function fetchPlayers(code) {
  const { data } = await rest(`tournament_room_players?room_code=eq.${enc(code.toUpperCase())}&select=*&order=joined_at.asc`)
  return Array.isArray(data) ? data : []
}

export async function fetchAllVotes(code) {
  const { data } = await rest(`tournament_room_votes?room_code=eq.${enc(code.toUpperCase())}&select=match_id,user_id,side`)
  return Array.isArray(data) ? data : []
}

export async function castVote({ code, matchId, userId, side }) {
  const { error } = await rest('tournament_room_votes?on_conflict=room_code,match_id,user_id', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: { room_code: code.toUpperCase(), match_id: matchId, user_id: String(userId), side: String(side) },
  })
  return { error: error || null }
}

export const submitClue = ({ code, round, pass, userId, clue }) =>
  castVote({ code, matchId: `clue:${round}:${pass}`, userId, side: clue })
export const castElimVote = ({ code, round, userId, targetUid }) =>
  castVote({ code, matchId: `elim:${round}`, userId, side: targetUid })

export async function updateRoom(code, patch) {
  const { error } = await rest(`tournament_rooms?code=eq.${enc(code.toUpperCase())}`, {
    method: 'PATCH', prefer: 'return=minimal',
    body: { ...patch, updated_at: new Date().toISOString() },
  })
  return { error: error || null }
}

export async function touchPlayer(code, userId) {
  await rest(`tournament_room_players?room_code=eq.${enc(code.toUpperCase())}&user_id=eq.${enc(String(userId))}`, {
    method: 'PATCH', prefer: 'return=minimal', body: { last_seen: new Date().toISOString() },
  }).catch(() => {})
}

export function subscribeRoom(code, onChange) {
  if (!supabase) return () => {}
  const c = code.toUpperCase()
  let ch, retry, closed = false
  const build = () => supabase.channel(`ucroom_${c}_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_rooms', filter: `code=eq.${c}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_room_players', filter: `room_code=eq.${c}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_room_votes', filter: `room_code=eq.${c}` }, onChange)
    .subscribe((status) => {
      // Le websocket peut tomber après une longue inactivité (onglet en arrière-plan,
      // veille de l'écran). Sans réabonnement, le temps réel meurt définitivement et
      // l'écran ne bouge plus qu'au rechargement. On reconstruit le canal.
      if (!closed && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED')) {
        clearTimeout(retry)
        retry = setTimeout(() => { if (closed) return; try { supabase.removeChannel(ch) } catch {}; ch = build() }, 2000)
      }
    })
  ch = build()
  return () => { closed = true; clearTimeout(retry); try { supabase.removeChannel(ch) } catch {} }
}
