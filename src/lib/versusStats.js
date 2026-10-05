import { supabase } from './supabase.js'

// Taux de victoire communautaire des tournois en images.
// Tant que la migration 20261005_versus_duels.sql n'est pas collée, les appels
// échouent en silence : la page fonctionne, sans les chiffres.

const cache = new Map()   // tournament -> Promise<Map<id, {wins, duels}> | null>

export function recordDuel(tournament, winner, loser) {
  if (!supabase || !winner || !loser) return
  supabase.rpc('versus_record', { p_tournament: tournament, p_winner: winner, p_loser: loser })
    .then(({ error }) => { if (!error) cache.delete(tournament) }, () => {})
}

export function fetchStats(tournament, { fresh = false } = {}) {
  if (!supabase) return Promise.resolve(null)
  if (!fresh && cache.has(tournament)) return cache.get(tournament)
  const p = supabase.rpc('versus_stats', { p_tournament: tournament })
    .then(({ data, error }) => {
      if (error || !Array.isArray(data)) return null
      return new Map(data.map(r => [r.participant, { wins: Number(r.wins), duels: Number(r.duels) }]))
    }, () => null)
  cache.set(tournament, p)
  return p
}

export const MIN_DUELS = 5

export function winRate(s) {
  return s && s.duels >= MIN_DUELS ? Math.round((s.wins / s.duels) * 100) : null
}

// Répartition des votes sur une paire (Duel du jour). null si la RPC manque.
export async function fetchPair(tournament, a, b) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('versus_pair', { p_tournament: tournament, p_a: a, p_b: b })
    if (error || !data?.[0]) return null
    return { a: Number(data[0].a_wins), b: Number(data[0].b_wins) }
  } catch { return null }
}
