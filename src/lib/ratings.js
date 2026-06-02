// Notes & avis anime (migration 20260602_anime_ratings.sql) — RPC Supabase direct.
import { supabase } from './supabase.js'

async function rpc(fn, args = {}) {
  if (!supabase) return { ok: false, error: 'Supabase non configuré' }
  try {
    const { data, error } = await Promise.race([
      supabase.rpc(fn, args),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000)),
    ])
    if (error) { console.error(`[ratings] ${fn}`, error.message); return { ok: false, error: error.message } }
    return data
  } catch (e) {
    console.error(`[ratings] ${fn} (throw)`, e?.message || e)
    return { ok: false, error: e?.message || 'rpc_failed' }
  }
}

export const rateAnime   = (animeId, rating) => rpc('rate_anime', { p_anime: animeId, p_rating: rating })
export const unrateAnime = (animeId)         => rpc('unrate_anime', { p_anime: animeId })

// → { 'onepiece': { avg: 4.5, count: 12, mine: 5 }, ... }  (mine null si pas noté / non connecté)
export async function getAnimeRatings() {
  const r = await rpc('get_anime_ratings')
  return r?.ok ? (r.ratings || {}) : {}
}
