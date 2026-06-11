// ── Personnalisation profil + stories par membre ────────────────────────────
// RPC SECURITY DEFINER (migration 20260531_profile_settings.sql).
// ⚠️ fetch REST direct (sbRpc) et PAS supabase.rpc() : le client supabase-js
// peut hanger indéfiniment sur l'auth (bug connu du projet — la modale
// "Personnaliser mon profil" tournait à l'infini sur Enregistrer).
import { sbRpc } from './supabaseRest.js'

export async function getProfileSettings(discordId) {
  if (!discordId) return null
  try {
    const data = await sbRpc('get_profile_settings', { p_discord_id: String(discordId) }, { tag: 'profile' })
    if (data?.error) return null
    return data || null
  } catch { return null }
}

// patch : { bio, quote, featured_badge, featured_achievement, pinned_post, theme,
//           banner_url, link, visibility, social_links }
// Les champs absents (undefined) ne sont pas modifiés. Toujours sur SON profil
// (le discord_id est résolu côté serveur — impossible de viser un autre membre).
export async function updateProfileSettings(patch = {}) {
  try {
    const data = await sbRpc('update_profile_settings', {
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
      p_dm_privacy:           patch.dm_privacy ?? null,
    }, { tag: 'profile' })
    if (data?.error) return { data: null, error: { message: data.error } }
    return { data, error: null }
  } catch (e) {
    return { data: null, error: { message: e?.message || 'Sauvegarde impossible.' } }
  }
}

// ── Vues de profil (façon TikTok) ───────────────────────────────────────────
export function recordProfileView(profileId) {
  if (!profileId) return Promise.resolve(null)
  return sbRpc('record_profile_view', { p_profile: String(profileId) }, { tag: 'profile' }).catch(() => null)
}

export async function getProfileViews(limit = 30) {
  try {
    const data = await sbRpc('get_profile_views', { p_limit: limit }, { tag: 'profile' })
    return data?.ok ? data : { ok: false, total: 0, viewers: [] }
  } catch { return { ok: false, total: 0, viewers: [] } }
}

export async function getUserStories(userId) {
  if (!userId) return []
  try {
    const data = await sbRpc('get_user_stories', { p_user: String(userId) }, { tag: 'profile' })
    if (Array.isArray(data?.stories)) return data.stories
    return Array.isArray(data) ? data : []
  } catch { return [] }
}
