// ── Client « En ligne classé » (dames 3D) ───────────────────────────────────
// Matchmaking/lecture via RPC SECURITY DEFINER ; soumission de coup via la fonction
// Vercel /api/dames (serveur autoritaire, valide avec le moteur) ; sync Realtime.
import { sbRpc, getAccessToken } from '../../../lib/supabaseRest.js'
import { supabase } from '../../../lib/supabase.js'

const rpc = (fn, args = {}) => sbRpc(fn, args, { tag: 'dames-rank' })

export async function ensureRating() { const r = await rpc('dames_rank_ensure'); return r?.ok ? r.rating : null }
export async function matchmake(board) { return await rpc('dames_rank_matchmake', { p_board: board }) || { ok: false } }
export async function cancelQueue() { return await rpc('dames_rank_cancel') }
export async function getMatch(matchId = null) { const r = await rpc('dames_rank_match', { p_match_id: matchId }); return r?.ok ? r.match : null }
export async function leaderboard(limit = 30) { const r = await rpc('dames_rank_leaderboard', { p_limit: limit }); return r?.ok ? (r.rows || []) : [] }

async function post(tool, body) {
  const token = await getAccessToken()
  if (!token) return { error: 'Connexion requise' }
  try {
    const res = await fetch(`/api/dames?tool=${tool}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data?.error) return { error: data?.error || `Erreur (${res.status})` }
    return data
  } catch (e) { return { error: e?.message || 'Réseau' } }
}
export function submitMove(matchId, move) { return post('move', { matchId, move }) }
export function resign(matchId) { return post('resign', { matchId }) }

// Realtime : 1 channel par match. onMove(row) pour chaque coup inséré, onMatch(row) pour les MAJ de la partie (fin, etc.).
export function subscribeMatch(matchId, { onMove, onMatch } = {}) {
  if (!supabase) return () => {}
  const ch = supabase.channel(`dames:${matchId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dames_rmoves', filter: `match_id=eq.${matchId}` }, p => onMove?.(p.new))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dames_rmatches', filter: `id=eq.${matchId}` }, p => onMatch?.(p.new))
    .subscribe()
  return () => { try { supabase.removeChannel(ch) } catch (e) { /* */ } }
}
