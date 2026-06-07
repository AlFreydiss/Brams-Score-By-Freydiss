// ── Données live du Hub Communautaire ───────────────────────────────────────
// Vocal en direct (RPC voice_live → qui est connecté < 4 min), nouveaux nakamas.
// On passe par la RPC Supabase (et non /api) pour que ça marche AUSSI en dev Vite
// (qui ne sert pas les serverless functions).
import { supabase } from './supabase.js'

export async function fetchVoiceLive(windowSec = 240) {
  if (!supabase) return { count: 0, members: [] }
  try {
    const { data, error } = await supabase.rpc('voice_live', { p_window: windowSec })
    if (error || !Array.isArray(data)) return { count: 0, members: [] }
    return { count: data.length, members: data }
  } catch {
    return { count: 0, members: [] }
  }
}

// Compteur de nouveaux membres (serverless → 404 en dev, renvoie null sans casser).
export async function fetchNewMembers(period = '7d') {
  try {
    const r = await fetch(`/api/stats/new-members?period=${period}`)
    if (!r.ok) return null
    const j = await r.json()
    return typeof j?.count === 'number' ? j.count : null
  } catch {
    return null
  }
}
