import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useSocial } from '../contexts/SocialContext.jsx'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import {
  listConversations, getMessages, sendTextMessage, markConversationRead,
  editMessage, deleteMessage, toggleReaction, subscribeToConversation,
} from '../lib/social.js'
import { btn, avatar, T } from './social/socialStyles.js'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '😮', '😢']

// ── Helpers date ──────────────────────────────────────────────────────────────
function dayLabel(iso) {
  const d = new Date(iso), now = new Date()
  const sameDay = (a, b) => a.toDateString() === b.toDateString()
  if (sameDay(d, now)) return "Aujourd'hui"
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (sameDay(d, y)) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function dedupeById(list) {
  const seen = new Set()
  return list.filter(m => (seen.has(m.id) ? false : (seen.add(m.id), true)))
}

function Avatar({ url, name, size = 36 }) {
  const initials = (name || '?').slice(0, 2).toUpperCase()
  return (
    <span style={avatar(size)}>
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </span>
  )
}

// ── Liste des conversations (sidebar) ───────────────────────────────────────
function ConversationList({ conversations, activeId, onSelect, loading }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '18px 18px 12px', fontSize: 18, fontWeight: 800, color: T.text }}>Messages</div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
        {loading && <div style={{ padding: 20, color: T.textFaint, fontSize: 13 }}>Chargement…</div>}
        {!loading && conversations.length === 0 && (
          <div style={{ padding: '32px 16px', color: T.textFaint, fontSize: 13, textAlign: 'center' }}>
            Aucune conversation pour l'instant.<br />
            <Link to="/amis" style={{ color: T.gold, textDecoration: 'none' }}>Ajoute un ami</Link> pour commencer à discuter.
          </div>
        )}
        {conversations.map(c => {
          const active = c.conversation_id === activeId
          return (
            <button key={c.conversation_id} onClick={() => onSelect(c.conversation_id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px',
              borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: 2,
              background: active ? 'rgba(212,160,23,0.10)' : 'transparent', fontFamily: 'inherit',
            }}>
              <Avatar url={c.other_avatar} name={c.other_username} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.other_username || `Pirate #${String(c.other_id || '').slice(-5)}`}
                  </span>
                  {Number(c.unread) > 0 && (
                    <span style={{ background: T.gold, color: '#0b0c0e', fontSize: 11, fontWeight: 800, borderRadius: 10, padding: '1px 7px', flexShrink: 0 }}>
                      {c.unread}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: T.textFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                  {c.last_type === 'gif' ? 'GIF' : c.last_type === 'voice' ? 'Message vocal' : (c.last_content || 'Conversation démarrée')}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Bulle de message ─────────────────────────────────────────────────────────
function MessageBubble({ msg, mine, grouped, onReact, onReply, onEdit, onDelete }) {
  const [menu, setMenu] = useState(false)
  const deleted = !!msg.deleted_at

  // Regroupe les réactions par emoji
  const reactions = useMemo(() => {
    const map = {}
    for (const r of (msg.reactions || [])) map[r.emoji] = (map[r.emoji] || 0) + 1
    return Object.entries(map)
  }, [msg.reactions])

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', marginTop: grouped ? 2 : 10 }}
      onMouseLeave={() => setMenu(false)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: '78%', flexDirection: mine ? 'row-reverse' : 'row' }}>
        <div style={{ position: 'relative' }}
          onMouseEnter={() => setMenu(true)}
        >
          <div style={{
            padding: '9px 13px', borderRadius: 14,
            borderTopLeftRadius: !mine && grouped ? 6 : 14,
            borderTopRightRadius: mine && grouped ? 6 : 14,
            background: mine ? 'rgba(212,160,23,0.16)' : T.surface2,
            border: `1px solid ${mine ? 'rgba(212,160,23,0.22)' : T.border}`,
            color: deleted ? T.textFaint : T.text, fontSize: 14, lineHeight: 1.45,
            wordBreak: 'break-word', fontStyle: deleted ? 'italic' : 'normal',
          }}>
            {msg.reply_to_id && <div style={{ fontSize: 11, color: T.textFaint, marginBottom: 4, borderLeft: `2px solid ${T.gold}`, paddingLeft: 6 }}>↩ réponse</div>}
            {deleted ? 'Message supprimé'
              : msg.type === 'gif' ? <img src={msg.gif_url} alt="gif" style={{ maxWidth: 220, borderRadius: 8, display: 'block' }} />
              : msg.content}
            {msg.edited_at && !deleted && <span style={{ fontSize: 10, color: T.textFaint, marginLeft: 6 }}>(modifié)</span>}
          </div>

          {/* Menu actions au survol */}
          {menu && !deleted && (
            <div style={{
              position: 'absolute', top: -14, [mine ? 'left' : 'right']: 0,
              display: 'flex', gap: 2, background: '#15161b', border: `1px solid ${T.border}`,
              borderRadius: 8, padding: 2, zIndex: 5,
            }}>
              {QUICK_EMOJIS.slice(0, 4).map(e => (
                <button key={e} onClick={() => onReact(msg.id, e)} style={iconBtn}>{e}</button>
              ))}
              <button onClick={() => onReply(msg)} style={iconBtn} title="Répondre">↩</button>
              {mine && <button onClick={() => onEdit(msg)} style={iconBtn} title="Modifier">✎</button>}
              {mine && <button onClick={() => onDelete(msg.id)} style={iconBtn} title="Supprimer">🗑</button>}
            </div>
          )}
        </div>
      </div>

      {reactions.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 3, flexDirection: mine ? 'row-reverse' : 'row' }}>
          {reactions.map(([emoji, count]) => (
            <button key={emoji} onClick={() => onReact(msg.id, emoji)} style={{
              fontSize: 11, padding: '1px 7px', borderRadius: 10, cursor: 'pointer',
              background: T.surface, border: `1px solid ${T.border}`, color: T.textDim, fontFamily: 'inherit',
            }}>
              {emoji} {count}
            </button>
          ))}
        </div>
      )}

      {!grouped && (
        <span style={{ fontSize: 10, color: T.textFaint, marginTop: 3, padding: '0 4px' }}>{timeLabel(msg.created_at)}</span>
      )}
    </div>
  )
}

const iconBtn = {
  border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14,
  padding: '3px 5px', borderRadius: 6, color: T.textDim, fontFamily: 'inherit',
}

// ── Vue conversation ───────────────────────────────────────────────────────
function ChatView({ conversationId, meta, onBack, isMobile, refreshList }) {
  const { discordId, displayName, avatarUrl } = useAuth()
  const { refreshCounts } = useSocial()
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(true)
  const [hasMore, setHasMore]   = useState(true)
  const [input, setInput]       = useState('')
  const [replyTo, setReplyTo]   = useState(null)
  const [editing, setEditing]   = useState(null)
  const [sending, setSending]   = useState(false)
  const scrollRef = useRef(null)
  const bottomRef = useRef(null)
  const reactionTimer = useRef(null)

  const scrollToBottom = useCallback((smooth = false) => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' }))
  }, [])

  // Chargement initial
  useEffect(() => {
    let active = true
    setLoading(true); setMessages([]); setHasMore(true)
    getMessages(conversationId).then(msgs => {
      if (!active) return
      setMessages(msgs)
      setHasMore(msgs.length >= 30)
      setLoading(false)
      scrollToBottom()
      markConversationRead(conversationId).then(refreshCounts)
    })
    return () => { active = false }
  }, [conversationId, scrollToBottom, refreshCounts])

  // Realtime
  useEffect(() => {
    const unsub = subscribeToConversation(conversationId, {
      onInsert: (m) => {
        setMessages(prev => dedupeById([...prev, m]))
        scrollToBottom(true)
        if (m.sender_id !== discordId) markConversationRead(conversationId).then(refreshCounts)
      },
      onUpdate: (m) => setMessages(prev => prev.map(x => x.id === m.id ? { ...x, ...m } : x)),
      onReaction: () => {
        // Re-sync léger des réactions de la fenêtre récente (debounce)
        clearTimeout(reactionTimer.current)
        reactionTimer.current = setTimeout(async () => {
          const recent = await getMessages(conversationId)
          setMessages(prev => {
            const byId = Object.fromEntries(recent.map(m => [m.id, m.reactions]))
            return prev.map(m => byId[m.id] ? { ...m, reactions: byId[m.id] } : m)
          })
        }, 400)
      },
    })
    return () => { unsub(); clearTimeout(reactionTimer.current) }
  }, [conversationId, discordId, scrollToBottom, refreshCounts])

  // Polling de secours : rafraîchit la fenêtre récente toutes les 4s pour que les
  // nouveaux messages (et réactions) apparaissent même si le Realtime est coupé.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.hidden) return
      const recent = await getMessages(conversationId)
      if (!recent.length) return
      setMessages(prev => {
        const known = new Map(prev.map(m => [m.id, m]))
        let changed = false
        for (const m of recent) {
          const existing = known.get(m.id)
          if (!existing) { known.set(m.id, m); changed = true }
          else if (JSON.stringify(existing.reactions) !== JSON.stringify(m.reactions)
                || existing.content !== m.content || existing.deleted_at !== m.deleted_at) {
            known.set(m.id, { ...existing, ...m }); changed = true
          }
        }
        if (!changed) return prev
        const merged = Array.from(known.values()).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        return merged
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [conversationId])

  async function loadOlder() {
    if (!hasMore || messages.length === 0) return
    const oldest = messages[0].created_at
    const el = scrollRef.current
    const prevH = el?.scrollHeight || 0
    const older = await getMessages(conversationId, oldest)
    if (older.length === 0) { setHasMore(false); return }
    setMessages(prev => dedupeById([...older, ...prev]))
    setHasMore(older.length >= 30)
    requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevH })
  }

  function onScroll(e) {
    if (e.target.scrollTop < 60) loadOlder()
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    if (editing) {
      const res = await editMessage(editing.id, text)
      if (res?.ok) setMessages(prev => prev.map(m => m.id === editing.id ? { ...m, content: text, edited_at: new Date().toISOString() } : m))
      setEditing(null)
    } else {
      const res = await sendTextMessage(conversationId, text, replyTo?.id || null)
      if (res?.ok === false) { setSending(false); return }
      // Affichage optimiste : on ajoute le message tout de suite (ne dépend plus
      // du Realtime). Le dédoublonnage par id évite les doublons si Realtime arrive ensuite.
      if (res?.message_id) {
        setMessages(prev => dedupeById([...prev, {
          id: res.message_id, sender_id: discordId, content: text, type: 'text',
          created_at: new Date().toISOString(), reactions: [],
          sender_username: displayName, sender_avatar: avatarUrl,
          reply_to_id: replyTo?.id || null,
        }]))
        scrollToBottom(true)
      }
      setReplyTo(null)
      refreshList()
    }
    setInput(''); setSending(false)
  }

  async function handleReact(messageId, emoji) {
    // Optimiste
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m
      const list = m.reactions || []
      const has = list.some(r => r.emoji === emoji && r.user_id === discordId)
      return { ...m, reactions: has
        ? list.filter(r => !(r.emoji === emoji && r.user_id === discordId))
        : [...list, { emoji, user_id: discordId }] }
    }))
    await toggleReaction(messageId, emoji)
  }

  async function handleDelete(messageId) {
    const res = await deleteMessage(messageId)
    if (res?.ok) setMessages(prev => prev.map(m => m.id === messageId ? { ...m, deleted_at: new Date().toISOString(), content: null } : m))
  }

  // Rendu avec séparateurs de date + groupement
  const rendered = useMemo(() => {
    const out = []
    let lastDay = null, lastSender = null, lastTime = 0
    for (const m of messages) {
      const d = dayLabel(m.created_at)
      if (d !== lastDay) { out.push({ sep: d, id: `sep-${m.id}` }); lastDay = d; lastSender = null }
      const t = new Date(m.created_at).getTime()
      const grouped = m.sender_id === lastSender && (t - lastTime) < 5 * 60 * 1000
      out.push({ msg: m, grouped, id: m.id })
      lastSender = m.sender_id; lastTime = t
    }
    return out
  }, [messages])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header conversation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        {isMobile && <button onClick={onBack} style={{ ...iconBtn, fontSize: 20 }}>‹</button>}
        <Avatar url={meta?.other_avatar} name={meta?.other_username} size={38} />
        <Link to={meta?.other_id ? `/u/${meta.other_id}` : '#'} style={{ fontSize: 15, fontWeight: 700, color: T.text, textDecoration: 'none' }}>
          {meta?.other_username || 'Conversation'}
        </Link>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button style={{ ...iconBtn, fontSize: 16 }} disabled title="Appel — bientôt">📞</button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {loading ? (
          <div style={{ padding: 30, color: T.textFaint, fontSize: 13, textAlign: 'center' }}>Chargement…</div>
        ) : messages.length === 0 ? (
          <div style={{ padding: '40px 20px', color: T.textFaint, fontSize: 14, textAlign: 'center' }}>
            Début de votre conversation. Dis bonjour 👋
          </div>
        ) : (
          <>
            {hasMore && <div style={{ textAlign: 'center', padding: 8 }}>
              <button onClick={loadOlder} style={{ ...btn('ghost'), fontSize: 12, padding: '5px 12px' }}>Charger plus</button>
            </div>}
            {rendered.map(item => item.sep ? (
              <div key={item.id} style={{ textAlign: 'center', margin: '14px 0 6px' }}>
                <span style={{ fontSize: 11, color: T.textFaint, background: T.surface, padding: '3px 12px', borderRadius: 10 }}>{item.sep}</span>
              </div>
            ) : (
              <MessageBubble
                key={item.id}
                msg={item.msg}
                mine={item.msg.sender_id === discordId}
                grouped={item.grouped}
                onReact={handleReact}
                onReply={setReplyTo}
                onEdit={(m) => { setEditing(m); setInput(m.content || '') }}
                onDelete={handleDelete}
              />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Barre de réponse / édition */}
      {(replyTo || editing) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.textDim }}>
          <span style={{ color: T.gold }}>{editing ? '✎ Modification' : '↩ Réponse à'}</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {(editing || replyTo)?.content}
          </span>
          <button onClick={() => { setReplyTo(null); setEditing(null); setInput('') }} style={iconBtn}>✕</button>
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: `1px solid ${T.border}`, flexShrink: 0, alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Écris un message…"
          rows={1}
          style={{
            flex: 1, resize: 'none', maxHeight: 120, padding: '10px 14px', borderRadius: 12,
            background: T.surface, border: `1px solid ${T.border}`, color: T.text, fontSize: 14,
            fontFamily: 'inherit', outline: 'none', lineHeight: 1.4,
          }}
        />
        <button onClick={handleSend} disabled={sending || !input.trim()} style={{ ...btn('gold'), padding: '10px 16px', opacity: (sending || !input.trim()) ? 0.5 : 1 }}>
          {editing ? '✓' : 'Envoyer'}
        </button>
      </div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────
export default function MessagesPage() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    setLoading(true)
    const list = await listConversations()
    setConversations(list)
    setLoading(false)
  }, [isAuthenticated])

  useEffect(() => { load() }, [load])

  const activeMeta = conversations.find(c => c.conversation_id === conversationId)

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg }}>
        <Navbar />
        <div style={{ padding: '90px 20px', textAlign: 'center', color: T.textFaint }}>Connecte-toi pour accéder à tes messages.</div>
      </div>
    )
  }

  const showSidebar = !isMobile || !conversationId
  const showChat    = !isMobile || !!conversationId

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      <Navbar />
      <div style={{
        maxWidth: 1100, margin: '0 auto', padding: isMobile ? '70px 0 0' : '78px 16px 24px',
        height: isMobile ? '100vh' : 'calc(100vh - 20px)',
      }}>
        <div style={{
          display: 'flex', height: '100%', borderRadius: isMobile ? 0 : 16, overflow: 'hidden',
          border: isMobile ? 'none' : `1px solid ${T.border}`, background: 'rgba(255,255,255,0.015)',
        }}>
          {showSidebar && (
            <div style={{
              width: isMobile ? '100%' : 320, flexShrink: 0,
              borderRight: isMobile ? 'none' : `1px solid ${T.border}`,
            }}>
              <ConversationList
                conversations={conversations}
                activeId={conversationId}
                loading={loading}
                onSelect={(id) => navigate(`/messages/${id}`)}
              />
            </div>
          )}
          {showChat && (
            <div style={{ flex: 1, minWidth: 0 }}>
              {conversationId ? (
                <ChatView
                  conversationId={conversationId}
                  meta={activeMeta}
                  isMobile={isMobile}
                  onBack={() => navigate('/messages')}
                  refreshList={load}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.textFaint, fontSize: 14, textAlign: 'center', padding: 20 }}>
                  Choisis une conversation ou <Link to="/amis" style={{ color: T.gold, margin: '0 4px', textDecoration: 'none' }}>ajoute un ami</Link>.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
