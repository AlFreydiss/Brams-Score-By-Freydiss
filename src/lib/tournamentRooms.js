// ── Tournoi multijoueur : salons en ligne (Supabase realtime) ──────────────
// Même approche que les salons blind-test. L'hôte génère le bracket et le stocke
// dans la room (champ `rounds`). Tous les joueurs lisent le même bracket, votent
// (left/right) sur le duel courant, et l'HÔTE résout à la majorité puis avance.
import { supabase } from './supabase.js'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans I/O/0/1 (lisible)

export function genRoomCode(len = 4) {
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return s
}

export async function createTournamentRoom({ hostUserId, displayName, avatarUrl, tournamentId, rounds }) {
  if (!supabase) return { error: 'supabase' }
  // Quelques tentatives pour éviter une collision de code (PK).
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genRoomCode()
    const { error } = await supabase.from('tournament_rooms').insert({
      code, host_user_id: String(hostUserId), tournament_id: tournamentId,
      status: 'lobby', rounds, current_match: null,
    })
    if (!error) {
      await supabase.from('tournament_room_players').upsert({
        room_code: code, user_id: String(hostUserId),
        display_name: displayName, avatar_url: avatarUrl, is_host: true,
        last_seen: new Date().toISOString(),
      }, { onConflict: 'room_code,user_id' })
      return { code, error: null }
    }
    if (!String(error.message || '').includes('duplicate')) return { error: error.message }
  }
  return { error: 'code_collision' }
}

export async function fetchTournamentRoom(code) {
  if (!supabase) return null
  const { data } = await supabase
    .from('tournament_rooms').select('*').eq('code', code.toUpperCase()).maybeSingle()
  return data || null
}

export async function joinTournamentRoom({ code, userId, displayName, avatarUrl }) {
  if (!supabase) return { error: 'supabase' }
  const room = await fetchTournamentRoom(code)
  if (!room) return { error: 'introuvable' }
  const { error } = await supabase.from('tournament_room_players').upsert({
    room_code: code.toUpperCase(), user_id: String(userId),
    display_name: displayName, avatar_url: avatarUrl,
    last_seen: new Date().toISOString(),
  }, { onConflict: 'room_code,user_id' })
  return { error: error?.message || null, room }
}

export async function fetchTournamentRoomPlayers(code) {
  if (!supabase) return []
  const { data } = await supabase
    .from('tournament_room_players').select('*')
    .eq('room_code', code.toUpperCase()).order('joined_at', { ascending: true })
  return data || []
}

export async function fetchTournamentRoomVotes(code, matchId) {
  if (!supabase) return []
  const { data } = await supabase
    .from('tournament_room_votes').select('user_id, side')
    .eq('room_code', code.toUpperCase()).eq('match_id', matchId)
  return data || []
}

export async function castTournamentVote({ code, matchId, userId, side }) {
  if (!supabase) return { error: 'supabase' }
  const { error } = await supabase.from('tournament_room_votes').upsert({
    room_code: code.toUpperCase(), match_id: matchId, user_id: String(userId), side,
  }, { onConflict: 'room_code,match_id,user_id' })
  return { error: error?.message || null }
}

export async function updateTournamentRoom(code, patch) {
  if (!supabase) return { error: 'supabase' }
  const { error } = await supabase.from('tournament_rooms')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('code', code.toUpperCase())
  return { error: error?.message || null }
}

export async function touchTournamentPlayer(code, userId) {
  if (!supabase) return
  await supabase.from('tournament_room_players')
    .update({ last_seen: new Date().toISOString() })
    .eq('room_code', code.toUpperCase()).eq('user_id', String(userId))
}

// Abonnement realtime à la room (rounds/status), aux joueurs et aux votes.
// onChange est appelé sans argument à chaque évènement — la page refetch.
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
