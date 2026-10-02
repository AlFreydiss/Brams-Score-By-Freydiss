// Cœur du journal Guess Who (sans dépendance Supabase, testable sous node).
// Le serveur n'accepte qu'un joueur du salon : on envoie son jeton secret,
// jamais un identifiant déclaratif. Sans jeton (spectateur), rien n'est envoyé.
import { deviceSummary } from '../features/guesswho/logic/device.js'

export function makeLogger(rpc, ua, tokenOf) {
  const device = deviceSummary(ua)
  return async function logEvent(code, kind, detail = '') {
    try {
      const token = tokenOf(String(code || '').toUpperCase())
      if (!token) return
      await rpc('guesswho_log', { p_code: String(code || '').toUpperCase(), p_token: token, p_kind: kind, p_detail: String(detail || ''), p_device: device })
    } catch { /* le journal ne doit jamais gêner le jeu */ }
  }
}
