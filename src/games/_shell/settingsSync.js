// ── Synchro best-effort des réglages de jeu vers Supabase (cross-device) ──────
// localStorage reste la source instantanée + hors-ligne (voir useChessSettings /
// useDraughtsSettings). Cette couche ne fait QUE synchroniser : au login on tire
// les réglages du compte, à chaque changement on les pousse (débouncé). Dégrade en
// silence si les RPC game_settings_* ne sont pas encore déployées (sbRpc → {ok:false})
// → on garde le comportement localStorage d'origine. Voir migration 20260622_game_settings.sql.
import { sbRpc } from '../../lib/supabaseRest.js'

export async function loadRemoteSettings(game) {
  const r = await sbRpc('game_settings_get', { p_game: game }, { tag: 'game-settings', timeout: 8000 })
  return r && r.ok && r.data && typeof r.data === 'object' ? r.data : null
}

// Un timer par jeu : on écrase les pushs rapprochés (un seul write réseau au repos).
const timers = {}
export function saveRemoteSettings(game, data) {
  clearTimeout(timers[game])
  timers[game] = setTimeout(() => {
    sbRpc('game_settings_set', { p_game: game, p_data: data }, { tag: 'game-settings', timeout: 8000 })
  }, 800)
}
