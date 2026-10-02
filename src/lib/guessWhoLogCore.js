// Cœur du journal Guess Who (sans dépendance Supabase, testable sous node).
import { deviceSummary } from '../features/guesswho/logic/device.js'

export function makeLogger(rpc, ua) {
  const device = deviceSummary(ua)
  return async function logEvent(code, userId, kind, detail = '') {
    try {
      await rpc('guesswho_log', { p_code: String(code || ''), p_user: userId ? String(userId) : null, p_kind: kind, p_detail: String(detail || ''), p_device: device })
    } catch { /* le journal ne doit jamais gêner le jeu */ }
  }
}
