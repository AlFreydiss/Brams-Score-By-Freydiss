// ── Roue de la fortune quotidienne ──────────────────────────────────────────
// Le crédit est 100% SERVEUR : la RNG + le crédit berries vivent dans la RPC.
// Le client n'envoie aucun montant — il appelle la RPC et n'affiche QUE ce que
// le serveur renvoie (amount / prize_index / prize_label / streak / balance).
import { sbRpc } from './supabaseRest.js'

// État de la roue pour l'utilisateur courant.
// Tolérant : si la RPC n'est pas (encore) déployée ou échoue, on renvoie un état
// neutre (can_claim:false) plutôt que de crasher → dégradation gracieuse.
export async function getDailyWheelState() {
  const r = await sbRpc('get_daily_wheel_state', {}, { tag: 'wheel' })
  if (!r || typeof r !== 'object' || r.ok === false) {
    return { ok: false, can_claim: false, streak: 0 }
  }
  return {
    ok: true,
    can_claim: !!r.can_claim,
    streak: Number(r.streak) || 0,
    next_reset_at: r.next_reset_at || null,
  }
}

// Réclame le tirage du jour. Succès → { ok:true, amount, prize_label,
// prize_index, streak, balance }. Échec → { ok:false, error:'already'|'auth'|… }.
// Le serveur reste seul juge : on ne lui passe aucun argument.
export async function claimDailyWheel() {
  const r = await sbRpc('claim_daily_wheel', {}, { tag: 'wheel' })
  if (!r || typeof r !== 'object') return { ok: false, error: 'rpc_failed' }
  if (r.ok === false || r.error) return { ok: false, error: r.error || 'failed' }
  return {
    ok: true,
    amount: Number(r.amount) || 0,
    prize_label: r.prize_label || '',
    prize_index: Number(r.prize_index) || 0,
    streak: Number(r.streak) || 0,
    balance: Number(r.balance) || 0,
  }
}
