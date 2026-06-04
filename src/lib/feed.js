// ── Couche client du Fil (réseau social type Twitter) ──────────────────────
// Tout passe par des RPC Supabase SECURITY DEFINER (migration 20260530_feed.sql).
import { supabase } from './supabase.js'
export { uploadAttachment } from './social.js'   // réutilise l'upload R2 de la messagerie

async function rpc(fn, args = {}) {
  if (!supabase) return { ok: false, error: 'Supabase non configuré' }
  try {
    const { data, error } = await Promise.race([
      supabase.rpc(fn, args),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000)),
    ])
    if (error) { console.error(`[feed] ${fn}`, error.message); return { ok: false, error: error.message } }
    return data
  } catch (e) {
    console.error(`[feed] ${fn} (throw)`, e?.message || e)
    return { ok: false, error: e?.message || 'rpc_failed' }
  }
}

export const createPost = ({ content = null, mediaUrl = null, mediaUrls = null, replyTo = null, repostOf = null } = {}) =>
  rpc('create_post', { p_content: content, p_media_url: mediaUrl, p_media_urls: mediaUrls, p_reply_to: replyTo, p_repost_of: repostOf })
export const deletePost = (postId)  => rpc('delete_post', { p_post: postId })
export const editPost   = (postId, content) => rpc('edit_post', { p_post: postId, p_content: content })
export const toggleLike = (postId)  => rpc('toggle_like', { p_post: postId })
export const toggleBookmark = (postId) => rpc('toggle_bookmark', { p_post: postId })
export const togglePostReaction = (postId, emoji) => rpc('toggle_post_reaction', { p_post: postId, p_emoji: emoji })

// ── Signalements (migration 20260601_post_reports.sql) ────────────────────────
export const reportPost = (postId, reason) => rpc('report_post', { p_post: postId, p_reason: reason })
export async function listPostReports(status = 'open') {
  const r = await rpc('list_post_reports', { p_status: status })
  return r?.ok ? { reports: r.reports || [], error: null } : { reports: [], error: r?.error || 'Chargement impossible' }
}
export const resolvePostReport = (reportId, action) => rpc('resolve_post_report', { p_report: reportId, p_action: action })

export async function getMyBookmarks(before = null, limit = 20) {
  const r = await rpc('get_my_bookmarks', { p_before: before, p_limit: limit })
  return r?.ok ? (r.posts || []) : []
}

// Renvoie { posts, error } : error non-null = échec RPC (migration manquante,
// timeout, erreur SQL) → la page peut l'afficher au lieu de tourner dans le vide.
export async function getFeed(before = null, limit = 20) {
  const r = await rpc('get_feed', { p_before: before, p_limit: limit })
  if (r?.ok) return { posts: r.posts || [], error: null }
  return { posts: [], error: r?.error || 'Chargement impossible' }
}

export async function getPost(postId) {
  const r = await rpc('get_post', { p_post: postId })
  return r?.ok ? { post: r.post, replies: r.replies || [] } : null
}

export async function getUserPosts(userId, before = null, limit = 20) {
  const r = await rpc('get_user_posts', { p_user: String(userId), p_before: before, p_limit: limit })
  return r?.ok ? (r.posts || []) : []
}

export async function searchPosts(query, limit = 30) {
  const r = await rpc('search_posts', { p_query: query, p_limit: limit })
  return r?.ok ? (r.posts || []) : []
}

// Aperçu OpenGraph d'un lien (via /api/og). Renvoie {title,description,image,site,url} ou null.
const _ogCache = new Map()
export async function fetchLinkPreview(url) {
  if (_ogCache.has(url)) return _ogCache.get(url)
  let result = null
  try {
    const r = await fetch(`/api/og?url=${encodeURIComponent(url)}&_=${Date.now()}`, { cache: 'no-store' })
    const j = await r.json()
    result = j?.ok ? j : null
  } catch { result = null }
  _ogCache.set(url, result)
  return result
}

// Autocomplete @mentions : utilisateurs dont le pseudo commence par query.
export async function searchUsers(query, limit = 6) {
  const r = await rpc('search_users', { p_query: query, p_limit: limit })
  return Array.isArray(r) ? r : []
}

// Stats publiques du fil (nombre de posts racines) — count direct, sans RPC.
export async function getFeedStats() {
  if (!supabase) return { posts: 0 }
  try {
    const { count } = await supabase.from('posts')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null).is('reply_to', null)
    return { posts: count || 0 }
  } catch { return { posts: 0 } }
}

// ── Stories (éphémères 24h) ───────────────────────────────────────────────────
export const createStory = (mediaUrl) => rpc('create_story', { p_media_url: mediaUrl })
export const deleteStory = (storyId)  => rpc('delete_story', { p_story: storyId })
export const markStorySeen = (storyId) => rpc('mark_story_seen', { p_story: storyId })
export async function listStoryViewers(storyId) {
  const r = await rpc('list_story_viewers', { p_story: storyId })
  return r?.ok ? (r.viewers || []) : []
}
export async function listActiveStories() {
  const r = await rpc('list_active_stories')
  return r?.ok ? (r.authors || []) : []
}

// Realtime : changements sur les posts du fil. Renvoie une fonction d'unsubscribe.
export function subscribeFeed(onChange) {
  if (!supabase) return () => {}
  const channel = supabase.channel('feed:global')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, p => onChange?.({ type: 'INSERT', row: p.new, old: p.old || null }))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, p => onChange?.({ type: 'UPDATE', row: p.new, old: p.old || null }))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, p => onChange?.({ type: 'DELETE', row: p.new || null, old: p.old || null }))
    .subscribe()
  return () => { try { supabase.removeChannel(channel) } catch {} }
}
