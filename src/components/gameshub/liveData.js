// ── Données live du hub des jeux (Arcade) ───────────────────────────────────
// REST direct UNIQUEMENT — le client supabase-js peut hanger sur le verrou
// d'auth (même gotcha que lib/hubLive.js / features/echecs/lib/api.js).
// Chaque appel : timeout 4 s (AbortController) + dégradation silencieuse en
// null. fetchArcadeLive() ne throw JAMAIS.
import { useEffect, useState } from 'react'

const SB_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Fetch PostgREST anonyme (lectures publiques only). null si env absente,
// réponse non-ok, timeout ou erreur réseau.
async function restFetch(path, { method = 'GET', body } = {}) {
  if (!SB_URL || !SB_KEY) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 4000)
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
      method,
      signal: ctrl.signal,
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body != null ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) return null
    const text = await res.text()
    return text ? JSON.parse(text) : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Vocal en direct : même RPC voice_live que lib/hubLive.js (connectés < 4 min).
async function fetchVoiceCount() {
  const data = await restFetch('rpc/voice_live', { method: 'POST', body: { p_window: 240 } })
  return Array.isArray(data) ? data.length : null
}

// Top 3 échecs : table echecs_profils, mêmes filtres que getLeaderboard()
// (features/echecs/lib/api.js) — ≥1 partie jouée, tri elo desc.
async function fetchEchecsTop() {
  const data = await restFetch('echecs_profils?select=pseudo,elo&parties=gt.0&order=elo.desc&limit=3')
  if (!Array.isArray(data) || data.length === 0) return null
  return data.map(p => ({ pseudo: p.pseudo || 'Joueur', elo: p.elo ?? 0 }))
}

// Top 3 dames : RPC dames_rank_leaderboard (la table dames_ratings n'est pas
// lue en direct — le pseudo vient d'une jointure côté RPC security definer).
// Même appel que damesRanked.leaderboard() ; rows = { username, rating, ... }.
async function fetchDamesTop() {
  const r = await restFetch('rpc/dames_rank_leaderboard', { method: 'POST', body: { p_limit: 3 } })
  const rows = r && r.ok ? r.rows : null
  if (!Array.isArray(rows) || rows.length === 0) return null
  return rows.map(x => ({ pseudo: x.username || 'Joueur', elo: x.rating ?? 0 }))
}

// → { voice: number|null, echecsTop: [{pseudo,elo}]|null, damesTop: [{pseudo,elo}]|null }
export async function fetchArcadeLive() {
  const [voice, echecs, dames] = await Promise.allSettled([
    fetchVoiceCount(),
    fetchEchecsTop(),
    fetchDamesTop(),
  ])
  return {
    voice: voice.status === 'fulfilled' ? voice.value : null,
    echecsTop: echecs.status === 'fulfilled' ? echecs.value : null,
    damesTop: dames.status === 'fulfilled' ? dames.value : null,
  }
}

// Hook : fetch au mount + refresh 60 s (skippé si l'onglet est caché).
export function useArcadeLive() {
  const [state, setState] = useState({ voice: null, echecsTop: null, damesTop: null, loaded: false })
  useEffect(() => {
    let alive = true
    const load = () => fetchArcadeLive().then(data => {
      if (alive) setState({ ...data, loaded: true })
    })
    load()
    const id = setInterval(() => { if (!document.hidden) load() }, 60_000)
    return () => { alive = false; clearInterval(id) }
  }, [])
  return state
}
