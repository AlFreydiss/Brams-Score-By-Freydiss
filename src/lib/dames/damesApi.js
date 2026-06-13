// ── API Dames (RPC Supabase via REST direct, comme le Fil) ───────────────────
import { sbRpc } from '../supabaseRest.js'

const rpc = (fn, args = {}) => sbRpc(fn, args, { tag: 'dames' })

/** Crée le profil dames (1000 ELO) si absent et le renvoie. Null si non connecté. */
export async function ensureDamesProfile() {
  const r = await rpc('ensure_dames_profile')
  return r?.ok ? r.profile : null
}

/** Leaderboard : top joueurs par ELO (pseudo + avatar inclus). */
export async function getDamesLeaderboard(limit = 50) {
  const r = await rpc('get_dames_leaderboard', { p_limit: limit })
  return r?.ok ? (r.rows || []) : []
}

// ── Multijoueur en ligne (étape 5) ───────────────────────────────────────────
/** Trouve/rejoint une partie : { matched, match_id, color } ou { queued }. */
export async function findDamesMatch(ruleset, board) {
  const r = await rpc('find_dames_match', { p_ruleset: ruleset, p_board: board })
  return r || { ok: false }
}
/** Quitte la file d'attente. */
export async function cancelDamesQueue() {
  return await rpc('cancel_dames_queue')
}
/** État courant d'une partie (plateau, tour, statut, ELO…). Null si pas la mienne. */
export async function getDamesMatch(matchId) {
  const r = await rpc('get_dames_match', { p_match_id: matchId })
  return r?.ok ? r.match : null
}
/** Soumet un coup (plateau résultant + tour suivant). */
export async function submitDamesMove(matchId, board, move, nextTurn) {
  return await rpc('submit_dames_move', { p_match_id: matchId, p_board: board, p_move: move, p_next_turn: nextTurn })
}
/** Termine la partie + applique l'ELO (idempotent). winner ∈ 'red'|'black'|'draw'. */
export async function finishDamesMatch(matchId, winner, reason) {
  return await rpc('finish_dames_match', { p_match_id: matchId, p_winner: winner, p_reason: reason || null })
}
