// ── Stats de visionnage serveur ──────────────────────────────────────────────
// Chaque ouverture d'un animé est loggée dans Supabase (anime_watch_events) →
// le « Top du moment » du hub reflète ce qui est VRAIMENT regardé sur le
// serveur (7 jours glissants), plus l'ordre statique du catalogue.
// Résilient : table absente / réseau KO → null → le hub retombe sur l'ordre
// statique sans erreur visible.

const URL_ = import.meta.env.VITE_SUPABASE_URL || ''
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const THROTTLE_MS = 30 * 60 * 1000 // 1 event max par animé par 30 min par appareil

let _cache = { t: 0, rows: null }

export function logAnimeOpen(animeId, uid = null) {
  if (!URL_ || !KEY || !animeId) return
  try {
    const k = `watch_evt_${animeId}`
    const last = Number(localStorage.getItem(k) || 0)
    if (Date.now() - last < THROTTLE_MS) return
    localStorage.setItem(k, String(Date.now()))
  } catch {}
  // Fire-and-forget : ne bloque jamais la navigation.
  fetch(`${URL_}/rest/v1/anime_watch_events`, {
    method: 'POST',
    headers: {
      apikey: KEY, Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
    },
    body: JSON.stringify({ anime_id: String(animeId).slice(0, 64), uid: uid ? String(uid) : null }),
    keepalive: true,
  }).catch(() => {})
}

// → [{ id, count }] trié décroissant, ou null si indisponible.
export async function fetchTopWatched(days = 7) {
  if (!URL_ || !KEY) return null
  const now = Date.now()
  if (_cache.rows && now - _cache.t < 5 * 60 * 1000) return _cache.rows
  try {
    const since = new Date(now - days * 86400_000).toISOString()
    const res = await fetch(
      `${URL_}/rest/v1/anime_watch_events?select=anime_id&created_at=gte.${encodeURIComponent(since)}&limit=20000`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return null
    const rows = await res.json()
    if (!Array.isArray(rows)) return null
    const counts = new Map()
    for (const r of rows) counts.set(r.anime_id, (counts.get(r.anime_id) || 0) + 1)
    const out = [...counts.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count)
    _cache = { t: now, rows: out }
    return out
  } catch { return null }
}
