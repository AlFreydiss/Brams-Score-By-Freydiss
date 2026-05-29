// ── Couche client du Fil (réseau social type Twitter) ──────────────────────
// Tout passe par des RPC Supabase SECURITY DEFINER (migration 20260530_feed.sql).
import { supabase } from './supabase.js'
export { uploadAttachment } from './social.js'   // réutilise l'upload R2 de la messagerie

async function rpc(fn, args = {}) {
  if (!supabase) return { ok: false, error: 'Supabase non configuré' }
  try {
    const { data, error } = await Promise.race([
      supabase.rpc(fn, args),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000)),
    ])
    if (error) { console.error(`[feed] ${fn}`, error.message); return { ok: false, error: error.message } }
    return data
  } catch (e) {
    console.error(`[feed] ${fn} (throw)`, e?.message || e)
    return { ok: false, error: e?.message || 'rpc_failed' }
  }
}

export const createPost = ({ content = null, mediaUrl = null, replyTo = null, repostOf = null } = {}) =>
  rpc('create_post', { p_content: content, p_media_url: mediaUrl, p_reply_to: replyTo, p_repost_of: repostOf })
export const deletePost = (postId)  => rpc('delete_post', { p_post: postId })
export const editPost   = (postId, content) => rpc('edit_post', { p_post: postId, p_content: content })
export const toggleLike = (postId)  => rpc('toggle_like', { p_post: postId })

export async function getFeed(before = null, limit = 20) {
  const r = await rpc('get_feed', { p_before: before, p_limit: limit })
  return r?.ok ? (r.posts || []) : []
}

export async function getPost(postId) {
  const r = await rpc('get_post', { p_post: postId })
  return r?.ok ? { post: r.post, replies: r.replies || [] } : null
}

export async function getUserPosts(userId, before = null, limit = 20) {
  const r = await rpc('get_user_posts', { p_user: String(userId), p_before: before, p_limit: limit })
  return r?.ok ? (r.posts || []) : []
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

// Realtime : nouveaux posts racines du fil. Renvoie une fonction d'unsubscribe.
export function subscribeFeed(onInsert) {
  if (!supabase) return () => {}
  const channel = supabase.channel('feed:global')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, p => onInsert?.(p.new))
    .subscribe()
  return () => { try { supabase.removeChannel(channel) } catch {} }
}
