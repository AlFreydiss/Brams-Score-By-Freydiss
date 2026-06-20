// ── Progression de lecture mirroir Supabase (cross-device) ────────────────────
// Le lecteur garde localStorage comme cache instantané ; ici on pousse/lit la
// même progression côté serveur via les RPC (pattern anti-hang sbRpc, jamais
// supabase.rpc). Tout est fire-and-forget et tolérant : si la migration n'est
// pas appliquée (RPC absente) ou si l'utilisateur est déconnecté, on ne casse
// rien et on retombe sur le local.
import { sbRpc, sbAccessToken } from './supabaseRest.js'

// Throttle par épisode : on ne pousse au serveur qu'une fois toutes les ~10s
// pour le même (ns, epKey), histoire de ne pas spammer pendant la lecture.
const SAVE_INTERVAL_MS = 10000
const lastPush = new Map() // `${ns}::${epKey}` -> timestamp du dernier push

// Authentifié seulement : un token valide en localStorage suffit (pas d'appel
// réseau auth). Si déconnecté → no-op partout.
function isAuthed() {
  return Boolean(sbAccessToken())
}

// Pousse la progression d'un épisode. FIRE-AND-FORGET : ne throw jamais,
// throttlé par (ns, epKey). No-op si déconnecté. `completed` force le push
// (ignore le throttle) pour ne pas rater la fin d'un épisode.
export function saveWatchProgress({ ns, epKey, position, duration, completed, episode }) {
  if (!ns || !epKey || !isAuthed()) return
  const key = `${ns}::${epKey}`
  const now = Date.now()
  const last = lastPush.get(key) || 0
  if (!completed && now - last < SAVE_INTERVAL_MS) return
  lastPush.set(key, now)
  sbRpc('save_watch_progress', {
    p_ns: ns,
    p_ep_key: epKey,
    p_position: position,
    p_duration: duration,
    p_completed: completed,
    p_episode: episode,
  }, { tag: 'watch' }).catch(() => {})
}

// Lit toute la progression serveur d'un namespace.
// → { epKey: { episode, position, duration, completed } } (ou {} si rien/erreur).
export async function getWatchProgress(ns) {
  if (!ns || !isAuthed()) return {}
  try {
    const res = await sbRpc('get_watch_progress', { p_ns: ns }, { tag: 'watch' })
    if (!res || res.ok === false) return {}
    return res && typeof res === 'object' ? res : {}
  } catch {
    return {}
  }
}

// Liste "Continuer à regarder" cross-namespace, triée serveur par récence.
// → [{ ns, ep_key, episode, position, duration, completed, updated_at }] (ou []).
export async function getContinueWatching(limit = 20) {
  if (!isAuthed()) return []
  try {
    const res = await sbRpc('get_continue_watching', { p_limit: limit }, { tag: 'watch' })
    if (!res || res.ok === false) return []
    return Array.isArray(res) ? res : []
  } catch {
    return []
  }
}
