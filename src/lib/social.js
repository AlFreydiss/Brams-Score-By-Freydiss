// ── Couche client du système social Brams ──────────────────────────────────
// Tout passe par des RPC Supabase SECURITY DEFINER (voir migration
// 20260529_social_system.sql). Aucune écriture directe en table côté client.
import { supabase } from './supabase.js'

function noClient() {
  return { ok: false, error: 'Supabase non configuré' }
}

async function rpc(fn, args = {}) {
  if (!supabase) return noClient()
  try {
    const { data, error } = await supabase.rpc(fn, args)
    if (error) {
      console.error(`[social] ${fn}`, error.message)
      return { ok: false, error: error.message }
    }
    return data
  } catch (e) {
    // Ne JAMAIS propager une exception : sinon un Promise.all parent rejette et
    // l'UI reste bloquée sur "Chargement…" (bug clic Messages).
    console.error(`[social] ${fn} (throw)`, e?.message || e)
    return { ok: false, error: e?.message || 'rpc_failed' }
  }
}

// ── Amis / blocage ──────────────────────────────────────────────────────────
export const sendFriendRequest    = (target)        => rpc('send_friend_request', { p_target: String(target) })
export const respondFriendRequest = (requestId, ok) => rpc('respond_friend_request', { p_request_id: requestId, p_accept: !!ok })
export const cancelFriendRequest  = (target)        => rpc('cancel_friend_request', { p_target: String(target) })
export const removeFriend         = (target)        => rpc('remove_friend', { p_target: String(target) })
export const blockUser            = (target)        => rpc('block_user', { p_target: String(target) })
export const unblockUser          = (target)        => rpc('unblock_user', { p_target: String(target) })
export const getRelationship      = (target)        => rpc('get_relationship', { p_target: String(target) })

export async function listFriends() {
  const r = await rpc('list_friends')
  return Array.isArray(r) ? r : []
}

export async function listFriendRequests() {
  const r = await rpc('list_friend_requests')
  return r && typeof r === 'object' ? r : { incoming: [], outgoing: [] }
}

// ── Conversations / messages ──────────────────────────────────────────────────
export const getOrCreateDm     = (target)            => rpc('get_or_create_dm', { p_target: String(target) })
export const markConversationRead = (conversationId) => rpc('mark_conversation_read', { p_conversation: conversationId })
export const sendMessageRpc    = (args)              => rpc('send_message', args)
export const editMessage       = (messageId, content)=> rpc('edit_message', { p_message: messageId, p_content: content })
export const deleteMessage     = (messageId)         => rpc('delete_message', { p_message: messageId })
export const toggleReaction    = (messageId, emoji)  => rpc('toggle_reaction', { p_message: messageId, p_emoji: emoji })

export async function listConversations() {
  const r = await rpc('list_conversations')
  return Array.isArray(r) ? r : []
}

export async function getMessages(conversationId, before = null, limit = 30) {
  const r = await rpc('get_messages', { p_conversation: conversationId, p_before: before, p_limit: limit })
  if (r?.ok) return r.messages || []
  return []
}

export function sendTextMessage(conversationId, content, replyTo = null) {
  return sendMessageRpc({
    p_conversation: conversationId,
    p_content: content,
    p_type: 'text',
    p_reply_to: replyTo,
  })
}

export function sendGifMessage(conversationId, gifUrl) {
  return sendMessageRpc({
    p_conversation: conversationId,
    p_type: 'gif',
    p_gif_url: gifUrl,
  })
}

// ── Notifications ─────────────────────────────────────────────────────────────
export async function listNotifications(limit = 30) {
  const r = await rpc('list_notifications', { p_limit: limit })
  return Array.isArray(r) ? r : []
}
export const markNotificationsRead = (ids = null) => rpc('mark_notifications_read', { p_ids: ids })

export async function unreadCounts() {
  const r = await rpc('unread_counts')
  return r && typeof r === 'object' && !r.error ? r : { messages: 0, friend_requests: 0, notifications: 0 }
}

// ── Realtime ──────────────────────────────────────────────────────────────────
// Abonnement aux nouveaux messages d'une conversation. Renvoie une fonction
// d'unsubscribe. Les events sont filtrés côté serveur par RLS (un user ne reçoit
// que les rows des conversations où il est participant).
export function subscribeToConversation(conversationId, { onInsert, onUpdate, onReaction } = {}) {
  if (!supabase) return () => {}
  const channel = supabase
    .channel(`conv:${conversationId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert?.(payload.new))
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onUpdate?.(payload.new))
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'message_reactions' },
      (payload) => onReaction?.(payload))
    .subscribe()
  return () => { try { supabase.removeChannel(channel) } catch {} }
}

// Abonnement aux notifications du user courant (pour badges + toasts).
export function subscribeToNotifications(discordId, onInsert) {
  if (!supabase || !discordId) return () => {}
  const channel = supabase
    .channel(`notif:${discordId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${discordId}` },
      (payload) => onInsert?.(payload.new))
    .subscribe()
  return () => { try { supabase.removeChannel(channel) } catch {} }
}
