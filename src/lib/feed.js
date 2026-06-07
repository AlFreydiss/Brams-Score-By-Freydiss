// ── Couche client du Fil (réseau social type Twitter) ──────────────────────
// Tout passe par des RPC Supabase SECURITY DEFINER (migration 20260530_feed.sql).
import { supabase } from './supabase.js'
export { uploadAttachment } from './social.js'   // réutilise l'upload R2 de la messagerie

// On appelle PostgREST en fetch direct au lieu de supabase.rpc(...).
// Pourquoi : le client supabase-js attend la résolution de la session auth
// (getSession / navigator.locks) avant d'émettre la requête ; quand ce verrou
// se bloque, TOUTES les RPC du fil hangent → "timeout" 15s alors que la même
// RPC en REST direct répond en <0.5s. Le fetch direct contourne ce point de
// blocage (et reste authentifié en lisant le JWT depuis le storage supabase).
const SB_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const SB_REF = (SB_URL.match(/https?:\/\/([^.]+)\./) || [])[1] || ''

// JWT de la session courante lu directement dans le storage supabase-js
// (clé sb-<ref>-auth-token) — évite getSession() qui pouvait hanger.
function accessToken() {
  if (!SB_REF) return null
  try {
    const raw = localStorage.getItem(`sb-${SB_REF}-auth-token`)
    if (!raw) return null
    const p = JSON.parse(raw)
    return p?.access_token || p?.currentSession?.access_token || null
  } catch { return null }
}

async function rpc(fn, args = {}) {
  if (!SB_URL || !SB_KEY) return { ok: false, error: 'Supabase non configuré' }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const token = accessToken()
    const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${token || SB_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    })
    clearTimeout(timer)
    if (!res.ok) {
      let msg = `http_${res.status}`
      try { const j = await res.json(); msg = j?.message || j?.error || msg } catch {}
      console.error(`[feed] ${fn}`, msg)
      return { ok: false, error: msg }
    }
    return await res.json()
  } catch (e) {
    clearTimeout(timer)
    const msg = e?.name === 'AbortError' ? 'timeout' : (e?.message || 'rpc_failed')
    console.error(`[feed] ${fn} (throw)`, msg)
    return { ok: false, error: msg }
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

// Stats publiques du fil (nombre de posts racines) — count via REST direct
// (PostgREST Prefer: count=exact → header Content-Range). On évite supabase.from()
// pour la même raison que rpc() ci-dessus (client qui peut hanger sur l'auth).
export async function getFeedStats() {
  if (!SB_URL || !SB_KEY) return { posts: 0 }
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/posts?select=id&deleted_at=is.null&reply_to=is.null`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: 'count=exact', Range: '0-0' } }
    )
    const range = res.headers.get('content-range') || ''
    const total = parseInt(range.split('/')[1], 10)
    return { posts: Number.isFinite(total) ? total : 0 }
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
