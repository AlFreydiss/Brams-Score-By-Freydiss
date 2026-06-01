// ── Undercover : salons multijoueur temps réel ──────────────────────────────
// Réutilise les tables des salons Tournoi (zéro migration) :
//   tournament_rooms        → 1 ligne/salon, tournament_id='undercover',
//                              tout l'état du jeu dans le JSONB `rounds`.
//   tournament_room_players → joueurs (display_name, avatar, is_host, last_seen).
//   tournament_room_votes   → indices ET votes d'élimination (1 ligne/user/clé) :
//       match_id = `clue:<round>:<pass>`  side = texte de l'indice
//       match_id = `elim:<round>`         side = uid de la cible
// Seul l'HÔTE écrit `rounds` (pas de course) ; les joueurs n'écrivent que des votes.
import { supabase } from './supabase.js'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function genRoomCode(len = 4) {
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return s
}

// Garde-fou anti-hang : une requête Supabase peut rester bloquée (refresh de token
// d'auth, réseau) et figer l'UI ("Création…" à l'infini). On borne à 10s.
function withTimeout(promise, ms = 10000) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])
}

export async function createUndercoverRoom({ hostUserId, displayName, avatarUrl }) {
  if (!supabase) return { error: 'supabase' }
  if (!hostUserId) return { error: 'non connecté' }   // sinon salon sans hôte → ingérable
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = genRoomCode()
      const { error } = await withTimeout(supabase.from('tournament_rooms').insert({
        code, host_user_id: String(hostUserId), tournament_id: 'undercover',
        status: 'lobby', rounds: { phase: 'lobby' }, current_match: null,
      }))
      if (!error) {
        // L'ajout du joueur ne doit pas bloquer la création : on tente, sans figer.
        try {
          await withTimeout(supabase.from('tournament_room_players').upsert({
            room_code: code, user_id: String(hostUserId),
            display_name: displayName, avatar_url: avatarUrl, is_host: true,
            last_seen: new Date().toISOString(),
          }, { onConflict: 'room_code,user_id' }))
        } catch {}
        return { code, error: null }
      }
      if (!String(error.message || '').includes('duplicate')) return { error: error.message }
    }
    return { error: 'code_collision' }
  } catch (e) {
    return { error: e?.message === 'timeout' ? 'Délai dépassé, réessaie' : (e?.message || 'erreur') }
  }
}

export async function fetchRoom(code) {
  if (!supabase) return null
  const { data } = await supabase.from('tournament_rooms').select('*')
    .eq('code', code.toUpperCase()).maybeSingle()
  // Garde-fou : un code peut exister côté Tournoi — on ne sert que les salons undercover.
  return data && data.tournament_id === 'undercover' ? data : (data ? { ...data, _wrongType: true } : null)
}

export async function joinRoom({ code, userId, displayName, avatarUrl }) {
  if (!supabase) return { error: 'supabase' }
  try {
    const room = await fetchRoom(code)
    if (!room || room._wrongType) return { error: 'introuvable' }
    const { error } = await withTimeout(supabase.from('tournament_room_players').upsert({
      room_code: code.toUpperCase(), user_id: String(userId),
      display_name: displayName, avatar_url: avatarUrl, last_seen: new Date().toISOString(),
    }, { onConflict: 'room_code,user_id' }))
    return { error: error?.message || null, room }
  } catch (e) {
    return { error: e?.message === 'timeout' ? 'Délai dépassé, réessaie' : (e?.message || 'erreur') }
  }
}

export async function fetchPlayers(code) {
  if (!supabase) return []
  const { data } = await supabase.from('tournament_room_players').select('*')
    .eq('room_code', code.toUpperCase()).order('joined_at', { ascending: true })
  return data || []
}

export async function fetchAllVotes(code) {
  if (!supabase) return []
  const { data } = await supabase.from('tournament_room_votes')
    .select('match_id, user_id, side').eq('room_code', code.toUpperCase())
  return data || []
}

export async function castVote({ code, matchId, userId, side }) {
  if (!supabase) return { error: 'supabase' }
  const { error } = await supabase.from('tournament_room_votes').upsert({
    room_code: code.toUpperCase(), match_id: matchId, user_id: String(userId), side: String(side),
  }, { onConflict: 'room_code,match_id,user_id' })
  return { error: error?.message || null }
}

export const submitClue = ({ code, round, pass, userId, clue }) =>
  castVote({ code, matchId: `clue:${round}:${pass}`, userId, side: clue })
export const castElimVote = ({ code, round, userId, targetUid }) =>
  castVote({ code, matchId: `elim:${round}`, userId, side: targetUid })

export async function updateRoom(code, patch) {
  if (!supabase) return { error: 'supabase' }
  const { error } = await supabase.from('tournament_rooms')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('code', code.toUpperCase())
  return { error: error?.message || null }
}

export async function touchPlayer(code, userId) {
  if (!supabase) return
  await supabase.from('tournament_room_players')
    .update({ last_seen: new Date().toISOString() })
    .eq('room_code', code.toUpperCase()).eq('user_id', String(userId))
}

export function subscribeRoom(code, onChange) {
  if (!supabase) return () => {}
  const c = code.toUpperCase()
  const ch = supabase.channel(`ucroom_${c}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_rooms', filter: `code=eq.${c}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_room_players', filter: `room_code=eq.${c}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_room_votes', filter: `room_code=eq.${c}` }, onChange)
    .subscribe()
  return () => { try { supabase.removeChannel(ch) } catch {} }
}
