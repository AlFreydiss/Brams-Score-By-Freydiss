import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = url && key ? createClient(url, key) : null

export async function fetchLeaderboard(limit = 10) {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('top_classement', { p_limit: limit })
  if (error) { console.error('[leaderboard]', error); return null }
  return data
}
