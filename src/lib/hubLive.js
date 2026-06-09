// ── Données live du Hub Communautaire ───────────────────────────────────────
// Vocal en direct (RPC voice_live → qui est connecté < 4 min), nouveaux nakamas.
import { supabase } from './supabase.js'

const SB_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// On appelle la RPC en REST DIRECT (et non via supabase-js). Le client peut
// hanger quand le verrou de rotation du refresh-token n'est pas libéré : la RPC
// retombait alors dans le catch → compteur vocal à 0 alors que la base renvoie
// bien les membres connectés. Un fetch avec la clé anon n'est pas pris dans ce
// verrou, et ça marche AUSSI en dev Vite (appel au domaine Supabase, pas /api).
export async function fetchVoiceLive(windowSec = 240) {
  if (SB_URL && SB_KEY) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 6000)
      const r = await fetch(`${SB_URL}/rest/v1/rpc/voice_live`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${SB_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_window: windowSec }),
      })
      clearTimeout(timer)
      if (r.ok) {
        const data = await r.json()
        if (Array.isArray(data)) return { count: data.length, members: data }
      }
    } catch { /* on bascule sur le client en secours */ }
  }
  // Secours : client supabase-js (si la clé/URL manquent ou REST indispo)
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
