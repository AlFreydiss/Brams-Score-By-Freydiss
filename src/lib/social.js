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
    // Timeout : si le RPC ne répond pas en 12s (client supabase coincé), on
    // abandonne au lieu de laisser l'UI bloquée sur les skeletons à vie.
    const { data, error } = await Promise.race([
      supabase.rpc(fn, args),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000)),
    ])
    if (error) {
      console.error(`[social] ${fn}`, error.message)
      return { ok: false, error: error.message }
    }
    return data
  } catch (e) {
    // Ne JAMAIS propager : sinon un Promise.all parent rejette et l'UI reste bloquée.
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

export function sendImageMessage(conversationId, url, replyTo = null) {
  return sendMessageRpc({ p_conversation: conversationId, p_type: 'image', p_media_url: url, p_reply_to: replyTo })
}

export function sendVoiceMessage(conversationId, url, durationSec) {
  return sendMessageRpc({ p_conversation: conversationId, p_type: 'voice', p_media_url: url, p_voice_duration: Math.round(durationSec || 0) })
}

// Upload d'une pièce jointe vers R2 via /api/r2-presign (autorisé par le JWT
// Supabase de l'utilisateur). Renvoie { url } (publique R2) ou { error }.
export async function uploadAttachment(file, onProgress) {
  if (!supabase) return { error: 'Supabase non configuré' }
  if (!file) return { error: 'Fichier manquant' }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return { error: 'Connexion requise pour envoyer un fichier' }
  let presign
  try {
    const res = await fetch('/api/r2-presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ filename: file.name || 'fichier', contentType: file.type || 'application/octet-stream', size: file.size }),
    })
    presign = await res.json()
    if (!res.ok || !presign.uploadUrl) return { error: presign.error || 'Préparation upload échouée' }
  } catch (e) { return { error: e?.message || 'Réseau' } }

  // PUT avec suivi de progression
  try {
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', presign.uploadUrl)
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
      xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)) }
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`R2 ${xhr.status}`))
      xhr.onerror = () => reject(new Error('Upload échoué'))
      xhr.send(file)
    })
    return { url: presign.publicUrl }
  } catch (e) { return { error: e?.message || 'Upload échoué' } }
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

// Canal temps réel de la conversation (broadcast) : typing "X écrit…" + accusés
// de lecture "Vu". self:false → on ne reçoit pas ses propres events.
// Renvoie { send(from,name), seen(from), unsubscribe() }.
export function joinTyping(conversationId, onTyping, onSeen) {
  if (!supabase || !conversationId) return { send: () => {}, seen: () => {}, unsubscribe: () => {} }
  const channel = supabase.channel(`typing:${conversationId}`, { config: { broadcast: { self: false } } })
  channel
    .on('broadcast', { event: 'typing' }, ({ payload }) => onTyping?.(payload))
    .on('broadcast', { event: 'seen' }, ({ payload }) => onSeen?.(payload))
    .subscribe()
  return {
    send: (from, name) => { try { channel.send({ type: 'broadcast', event: 'typing', payload: { from, name } }) } catch {} },
    seen: (from) => { try { channel.send({ type: 'broadcast', event: 'seen', payload: { from } }) } catch {} },
    unsubscribe: () => { try { supabase.removeChannel(channel) } catch {} },
  }
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
