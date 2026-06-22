// ── Client « En ligne classé » (dames 3D) ───────────────────────────────────
// Matchmaking/lecture via RPC SECURITY DEFINER ; soumission de coup via la fonction
// Vercel /api/dames (serveur autoritaire, valide avec le moteur) ; sync Realtime.
import { sbRpc, getAccessToken } from '../../../lib/supabaseRest.js'
import { supabase } from '../../../lib/supabase.js'

const rpc = (fn, args = {}) => sbRpc(fn, args, { tag: 'dames-rank' })

export async function ensureRating() { const r = await rpc('dames_rank_ensure'); return r?.ok ? r.rating : null }
// variante : '10x10' (défaut) | '8x8'. On la passe au RPC pour n'apparier que des
// joueurs de la même variante. Défensif : si la colonne `variante` n'existe pas
// encore en base (migration non appliquée), le RPC ignore l'argument et tout
// reste en 10×10 — voir le fallback dans matchmake() ci-dessous.
export async function matchmake(board, variante = '10x10') {
  const r = await rpc('dames_rank_matchmake', { p_board: board, p_variante: variante })
  // Ancienne signature en base (sans p_variante) → PostgREST renvoie une erreur
  // de résolution de fonction (PGRST202 / "Could not find the function ... in the
  // schema cache" → http_404). On retombe alors sur le matchmaking 10×10
  // historique pour ne rien casser tant que la migration n'est pas appliquée.
  if (r && r.ok === false && /http_404|PGRST202|Could not find the function|does not exist/i.test(String(r.error || ''))) {
    return await rpc('dames_rank_matchmake', { p_board: board }) || { ok: false }
  }
  return r || { ok: false }
}
export async function cancelQueue() { return await rpc('dames_rank_cancel') }
export async function getMatch(matchId = null) { const r = await rpc('dames_rank_match', { p_match_id: matchId }); return r?.ok ? r.match : null }
export async function leaderboard(limit = 30) { const r = await rpc('dames_rank_leaderboard', { p_limit: limit }); return r?.ok ? (r.rows || []) : [] }

async function post(tool, body) {
  const token = await getAccessToken()
  if (!token) return { error: 'Connexion requise' }
  try {
    const res = await fetch(`/api/bot-tools?tool=dames-${tool}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
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
