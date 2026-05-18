import { supabase } from '../supabase.js'

/**
 * Fetch all crews ordered by total bounty desc.
 * @returns {Promise<Array<object>|null>}
 */
export async function fetchCrews() {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('crews')
    .select('id, name, tag, level, total_bounty, captain_id, is_recruiting, created_at')
    .order('total_bounty', { ascending: false })
  if (error) { console.error('[crews]', error.message); return null }
  return data
}

/**
 * Fetch all members of a crew, enriched with leaderboard display name & avatar.
 * @param {number} crewId
 * @returns {Promise<Array<object>|null>}
 */
export async function fetchCrewMembersEnriched(crewId) {
  if (!supabase) return null

  const [membersRes, lbRes] = await Promise.all([
    supabase
      .from('crew_members')
      .select('*')
      .eq('crew_id', crewId)
      .order('contribution', { ascending: false }),
    supabase.rpc('top_classement', { p_limit: 500 }),
  ])

  if (membersRes.error) {
    console.error('[crew_members]', membersRes.error.message)
    return null
  }

  const members = membersRes.data || []

  // Build lookup map from leaderboard
  const lbMap = {}
  if (lbRes.data) {
    for (const row of lbRes.data) {
      lbMap[String(row.uid)] = { username: row.username, avatar_url: row.avatar_url }
    }
  }

  return members.map(m => ({
    ...m,
    username:   lbMap[String(m.user_id)]?.username   ?? null,
    avatar_url: lbMap[String(m.user_id)]?.avatar_url ?? null,
  }))
}
