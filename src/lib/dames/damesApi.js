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
