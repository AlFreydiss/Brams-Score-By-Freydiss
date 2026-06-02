// ── Personnalisation profil + stories par membre ────────────────────────────
// RPC SECURITY DEFINER (migration 20260531_profile_settings.sql).
import { supabase } from './supabase.js'

export async function getProfileSettings(discordId) {
  if (!supabase || !discordId) return null
  try {
    const { data, error } = await supabase.rpc('get_profile_settings', { p_discord_id: String(discordId) })
    if (error) return null
    return data || null
  } catch { return null }
}

// patch : { bio, quote, featured_badge, featured_achievement, pinned_post, theme,
//           banner_url, link, visibility, social_links }
// Les champs absents (undefined) ne sont pas modifiés. Toujours sur SON profil
// (le discord_id est résolu côté serveur — impossible de viser un autre membre).
export async function updateProfileSettings(patch = {}) {
  if (!supabase) return { error: { message: 'Supabase non configuré.' } }
  const { data, error } = await supabase.rpc('update_profile_settings', {
    p_bio:                  patch.bio ?? null,
    p_quote:                patch.quote ?? null,
    p_featured_badge:       patch.featured_badge ?? null,
    p_featured_achievement: patch.featured_achievement ?? null,
    p_pinned_post:          patch.pinned_post ?? null,
    p_theme:                patch.theme ?? null,
    p_banner_url:           patch.banner_url ?? null,
    p_link:                 patch.link ?? null,
    p_visibility:           patch.visibility ?? null,
    p_social_links:         patch.social_links ?? null,
  })
  return { data, error }
}

export async function getUserStories(userId) {
  if (!supabase || !userId) return []
  try {
    const { data, error } = await supabase.rpc('get_user_stories', { p_user: String(userId) })
    if (error) return []
    if (Array.isArray(data?.stories)) return data.stories
    return Array.isArray(data) ? data : []
  } catch { return [] }
}
