import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useSocial } from '../contexts/SocialContext.jsx'
import { useCall } from '../contexts/CallContext.jsx'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import {
  listConversations, getMessages, sendTextMessage, markConversationRead,
  editMessage, deleteMessage, toggleReaction, subscribeToConversation,
  listFriends, listFriendRequests, respondFriendRequest, cancelFriendRequest,
  getOrCreateDm, blockUser, uploadAttachment, sendImageMessage,
  sendGifMessage, sendVoiceMessage, joinTyping,
} from '../lib/social.js'
import { btn, avatar, T } from './social/socialStyles.js'
import GifPicker from './social/GifPicker.jsx'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '😮', '😢']
const EMOJI_SET = ['😀','😂','🤣','😊','😍','😎','🤔','😏','😅','😭','😱','🥺','😤','😡','🥶','🤯','🙄','😴','🤤','🤑','🤩','🥳','😈','👀','💀','🔥','✨','💯','🎉','❤️','🧡','💛','💚','💙','💜','🖤','👍','👎','👏','🙏','🤝','💪','🫶','🤙','✌️','🤞','🫡','👑','⚔️','🏴‍☠️','🍿','⚓','🌊','💰','🎵','😼','👋']
const URL_RE = /(https?:\/\/[^\s]+)/g
const MAX_ATTACH = 30 * 1024 * 1024
const ALLOWED_IMG = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
function humanSize(b) { return b > 1e6 ? `${(b / 1e6).toFixed(1)} Mo` : `${Math.round(b / 1e3)} Ko` }

// ── Helpers date ──────────────────────────────────────────────────────────────
function dayLabel(iso) {
  const d = new Date(iso), now = new Date()
  const same = (a, b) => a.toDateString() === b.toDateString()
  if (same(d, now)) return "Aujourd'hui"
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (same(d, y)) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
const timeLabel = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
function dedupeById(list) { const s = new Set(); return list.filter(m => (s.has(m.id) ? false : (s.add(m.id), true))) }

function Avatar({ url, name, size = 40, online }) {
  const initials = (name || '?').slice(0, 2).toUpperCase()
  return (
    <span style={{ position: 'relative', flexShrink: 0, display: 'inline-flex' }}>
      <span style={avatar(size)}>
        {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
      </span>
      {online != null && (
        <span style={{
          position: 'absolute', bottom: 0, right: 0, width: size * 0.28, height: size * 0.28,
          borderRadius: '50%', background: online ? T.online : T.textFaint,
          border: `2px solid ${T.bg}`,
        }} />
      )}
    </span>
  )
}

// Linkify + texte sûr (React échappe déjà, on ajoute juste les liens cliquables)
function RichText({ text }) {
  if (!text) return null
  const parts = String(text).split(URL_RE)
  return parts.map((p, i) => URL_RE.test(p)
    ? <a key={i} href={p} target="_blank" rel="noopener noreferrer" style={{ color: T.gold, wordBreak: 'break-all' }}>{p}</a>
    : <span key={i}>{p}</span>)
}

const iconBtn = {
  border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14,
  padding: '4px 6px', borderRadius: 7, color: T.textDim, fontFamily: 'inherit',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'background .12s, color .12s',
}
const composerIcon = {
  width: 38, height: 44, borderRadius: 10, border: 'none', background: 'transparent',
  cursor: 'pointer', fontSize: 18, color: T.textDim, flexShrink: 0,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}
function HeaderAction({ label, onClick, disabled, danger }) {
  return (
    <button onClick={onClick} disabled={disabled} title={label}
      style={{
        width: 36, height: 36, borderRadius: 9, cursor: disabled ? 'not-allowed' : 'pointer',
        background: 'transparent', border: `1px solid ${T.border}`, fontSize: 15,
        color: disabled ? T.textFaint : (danger ? T.red : T.textDim),
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all .14s',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = T.surface2; e.currentTarget.style.color = danger ? T.red : T.text } }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = disabled ? T.textFaint : (danger ? T.red : T.textDim) }}
    >{label}</button>
  )
}

// ── Sidebar : liste conversations / amis / demandes ──────────────────────────
function ConversationList({ conversations, friends, requests, activeId, tab, setTab, search, setSearch, loading, onSelect, onOpenFriend, onRespond, navigate, isMobile }) {
  const { isOnline } = useSocial()
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(c => (c.other_username || '').toLowerCase().includes(q))
  }, [conversations, search])

  const TABS = [
    { id: 'all', label: 'Tous' },
    { id: 'friends', label: 'Amis' },
    { id: 'requests', label: 'Demandes', badge: requests.incoming?.length || 0 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header sidebar */}
      <div style={{ padding: '16px 16px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 19, fontWeight: 800, color: T.text }}>Messages</span>
          <button onClick={() => setTab('friends')} title="Nouveau DM"
            style={{ ...btn('gold'), padding: '6px 12px', fontSize: 12 }}>＋ Nouveau</button>
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13,
            background: T.surface, border: `1px solid ${T.border}`, color: T.text,
            outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '7px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit', position: 'relative',
              background: tab === t.id ? T.violetSoft : 'transparent',
              color: tab === t.id ? T.violet : T.textDim,
            }}>
              {t.label}
              {t.badge > 0 && <span style={{ marginLeft: 5, background: T.gold, color: '#0b0c0e', fontSize: 10, fontWeight: 800, borderRadius: 8, padding: '0 5px' }}>{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 12px' }}>
        {loading && <div style={{ padding: 16 }}>{[0, 1, 2].map(i => <Skeleton key={i} />)}</div>}

        {/* ── Tous : conversations ── */}
        {!loading && tab === 'all' && (filtered.length === 0 ? (
          <Empty icon="💬">Aucune conversation.<br /><Link to="#" onClick={e => { e.preventDefault(); setTab('friends') }} style={{ color: T.gold, textDecoration: 'none' }}>Ajoute un ami</Link> pour commencer.</Empty>
        ) : filtered.map(c => {
          const active = c.conversation_id === activeId
          return (
            <button key={c.conversation_id} onClick={() => onSelect(c.conversation_id)} style={convItemStyle(active)}>
              <Avatar url={c.other_avatar} name={c.other_username} size={44} online={isOnline(c.other_id)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.other_username || `Pirate #${String(c.other_id || '').slice(-5)}`}
                  </span>
                  <span style={{ fontSize: 10, color: T.textFaint, flexShrink: 0 }}>{c.last_message_at ? timeLabel(c.last_message_at) : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginTop: 2 }}>
                  <span style={{ fontSize: 12, color: Number(c.unread) > 0 ? T.text : T.textFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.last_type === 'gif' ? '🖼️ GIF' : c.last_type === 'voice' ? '🎤 Vocal' : c.last_type === 'image' ? '🖼️ Image' : (c.last_content || 'Conversation démarrée')}
                  </span>
                  {Number(c.unread) > 0 && <span style={{ background: T.gold, color: '#0b0c0e', fontSize: 11, fontWeight: 800, borderRadius: 10, padding: '1px 7px', flexShrink: 0 }}>{c.unread}</span>}
                </div>
              </div>
            </button>
          )
        }))}

        {/* ── Amis ── */}
        {!loading && tab === 'friends' && (friends.length === 0 ? (
          <Empty icon="👥">Aucun ami pour l'instant.<br /><Link to="/amis" style={{ color: T.gold, textDecoration: 'none' }}>Trouver des membres</Link></Empty>
        ) : friends.map(f => (
          <button key={f.user_id} onClick={() => onOpenFriend(f.user_id)} style={convItemStyle(false)}>
            <Avatar url={f.avatar_url} name={f.username} size={44} online={isOnline(f.user_id)} />
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.username || `Pirate #${String(f.user_id).slice(-5)}`}</div>
              <div style={{ fontSize: 12, color: T.textFaint }}>Envoyer un message</div>
            </div>
            <span style={{ color: T.gold, fontSize: 16 }}>💬</span>
          </button>
        )))}

        {/* ── Demandes ── */}
        {!loading && tab === 'requests' && (
          <div style={{ padding: '4px 6px' }}>
            <SectionTitle>Reçues</SectionTitle>
            {(requests.incoming || []).length === 0 ? <Empty icon="📭">Aucune demande reçue.</Empty> :
              requests.incoming.map(r => (
                <div key={r.request_id} style={reqRowStyle}>
                  <Avatar url={r.avatar_url} name={r.username} size={40} />
                  <Link to={`/u/${r.user_id}`} style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: T.text, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.username || `Pirate #${String(r.user_id).slice(-5)}`}</Link>
                  <button onClick={() => onRespond(r.request_id, true)} style={{ ...btn('green'), padding: '6px 10px', fontSize: 12 }}>✓</button>
                  <button onClick={() => onRespond(r.request_id, false)} style={{ ...btn('red'), padding: '6px 10px', fontSize: 12 }}>✕</button>
                </div>
              ))}
            <SectionTitle style={{ marginTop: 14 }}>Envoyées</SectionTitle>
            {(requests.outgoing || []).length === 0 ? <Empty icon="📤">Aucune demande envoyée.</Empty> :
              requests.outgoing.map(r => (
                <div key={r.request_id} style={reqRowStyle}>
                  <Avatar url={r.avatar_url} name={r.username} size={40} />
                  <Link to={`/u/${r.user_id}`} style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: T.text, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.username || `Pirate #${String(r.user_id).slice(-5)}`}</Link>
                  <span style={{ fontSize: 11, color: T.textFaint }}>en attente</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

const convItemStyle = (active) => ({
  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
  borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: 2,
  background: active ? 'rgba(155,108,255,0.10)' : 'transparent', fontFamily: 'inherit',
  boxShadow: active ? `inset 3px 0 0 ${T.violet}` : 'none', transition: 'background .12s',
})
const reqRowStyle = { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 10 }
function SectionTitle({ children, style }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: T.textFaint, padding: '4px 8px', ...style }}>{children}</div>
}
function Skeleton() {
  return <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 8px' }}>
    <div style={{ width: 44, height: 44, borderRadius: '50%', background: T.surface2, animation: 'pulse 1.5s infinite' }} />
    <div style={{ flex: 1 }}>
      <div style={{ height: 12, width: '60%', background: T.surface2, borderRadius: 4, marginBottom: 6, animation: 'pulse 1.5s infinite' }} />
      <div style={{ height: 10, width: '85%', background: T.surface2, borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
    </div>
  </div>
}
function Empty({ icon, children }) {
  return <div style={{ padding: '36px 16px', textAlign: 'center', color: T.textFaint, fontSize: 13, lineHeight: 1.6 }}>
    <div style={{ fontSize: 30, marginBottom: 10, opacity: 0.5 }}>{icon}</div>{children}
  </div>
}

// ── Bulle de message ─────────────────────────────────────────────────────────
function MessageBubble({ msg, mine, grouped, onReact, onReply, onEdit, onDelete }) {
  const [menu, setMenu] = useState(false)
  const deleted = !!msg.deleted_at
  const reactions = useMemo(() => {
    const map = {}
    for (const r of (msg.reactions || [])) map[r.emoji] = (map[r.emoji] || 0) + 1
    return Object.entries(map)
  }, [msg.reactions])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', marginTop: grouped ? 2 : 12 }}
      onMouseLeave={() => setMenu(false)}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: '80%', flexDirection: mine ? 'row-reverse' : 'row' }}>
        <div style={{ position: 'relative' }} onMouseEnter={() => setMenu(true)}>
          <div style={{
            padding: msg.type === 'gif' || msg.type === 'image' ? 4 : '9px 13px',
            borderRadius: 16,
            borderTopLeftRadius: !mine && grouped ? 6 : 16,
            borderTopRightRadius: mine && grouped ? 6 : 16,
            background: deleted ? T.surface : (mine ? T.mineBg : T.theirBg),
            border: `1px solid ${mine ? T.mineBorder : T.theirBorder}`,
            color: deleted ? T.textFaint : T.text, fontSize: 14, lineHeight: 1.5,
            wordBreak: 'break-word', fontStyle: deleted ? 'italic' : 'normal', overflow: 'hidden',
          }}>
            {msg.reply_to_id && !deleted && <div style={{ fontSize: 11, color: T.textFaint, marginBottom: 4, borderLeft: `2px solid ${T.violet}`, paddingLeft: 6 }}>↩ réponse</div>}
            {deleted ? 'Message supprimé'
              : msg.type === 'gif' ? <img src={msg.gif_url} alt="gif" style={{ maxWidth: 240, borderRadius: 12, display: 'block' }} />
              : msg.type === 'image' ? <img src={msg.media_url} alt="image" style={{ maxWidth: 280, maxHeight: 320, borderRadius: 12, display: 'block' }} />
              : msg.type === 'voice' ? <audio src={msg.media_url} controls style={{ height: 36, maxWidth: 240 }} />
              : <RichText text={msg.content} />}
            {msg.edited_at && !deleted && <span style={{ fontSize: 10, color: T.textFaint, marginLeft: 6 }}>(modifié)</span>}
          </div>

          {menu && !deleted && (
            <div style={{
              position: 'absolute', top: -16, [mine ? 'left' : 'right']: 0,
              display: 'flex', gap: 1, background: '#16171d', border: `1px solid ${T.border}`,
              borderRadius: 9, padding: 3, zIndex: 5, boxShadow: '0 6px 20px rgba(0,0,0,.4)',
            }}>
              {QUICK_EMOJIS.slice(0, 4).map(e => <button key={e} onClick={() => onReact(msg.id, e)} style={iconBtn}>{e}</button>)}
              <button onClick={() => onReply(msg)} style={iconBtn} title="Répondre">↩</button>
              {mine && msg.type === 'text' && <button onClick={() => onEdit(msg)} style={iconBtn} title="Modifier">✎</button>}
              {mine && <button onClick={() => onDelete(msg.id)} style={iconBtn} title="Supprimer">🗑</button>}
            </div>
          )}
        </div>
      </div>

      {reactions.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexDirection: mine ? 'row-reverse' : 'row' }}>
          {reactions.map(([emoji, count]) => (
            <button key={emoji} onClick={() => onReact(msg.id, emoji)} style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 11, cursor: 'pointer',
              background: T.surface, border: `1px solid ${T.border}`, color: T.textDim, fontFamily: 'inherit',
            }}>{emoji} {count}</button>
          ))}
        </div>
      )}
      {!grouped && <span style={{ fontSize: 10, color: T.textFaint, marginTop: 4, padding: '0 4px' }}>{timeLabel(msg.created_at)}</span>}
    </div>
  )
}

// ── Vue conversation ───────────────────────────────────────────────────────
function ChatView({ conversationId, meta, onBack, isMobile, refreshList }) {
  const { discordId, displayName, avatarUrl } = useAuth()
  const { refreshCounts, isOnline } = useSocial()
  const { startCall } = useCall()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(true)
  const [hasMore, setHasMore]   = useState(true)
  const [input, setInput]       = useState('')
  const [replyTo, setReplyTo]   = useState(null)
  const [editing, setEditing]   = useState(null)
  const [sending, setSending]   = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [gifOpen, setGifOpen]   = useState(false)
  const [attach, setAttach]     = useState(null)   // { file, preview, error }
  const [uploadPct, setUploadPct] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recSec, setRecSec]     = useState(0)
  const [typingName, setTypingName] = useState(null)
  const [seenByPeer, setSeenByPeer] = useState(false)
  const scrollRef = useRef(null)
  const bottomRef = useRef(null)
  const reactionTimer = useRef(null)
  const fileInputRef = useRef(null)
  const recRef = useRef(null)       // MediaRecorder
  const recChunks = useRef([])
  const recTimer = useRef(null)
  const typingRef = useRef(null)    // canal typing
  const typingClear = useRef(null)
  const lastTypingSent = useRef(0)

  // Canal temps réel : "écrit…" + accusé de lecture "Vu".
  useEffect(() => {
    setSeenByPeer(false)
    const ch = joinTyping(conversationId,
      (p) => { setTypingName(p?.name || 'Quelqu\'un'); clearTimeout(typingClear.current); typingClear.current = setTimeout(() => setTypingName(null), 3000) },
      () => setSeenByPeer(true),   // le pair a lu (DM 1-1, self:false → forcément l'autre)
    )
    typingRef.current = ch
    return () => { ch.unsubscribe(); clearTimeout(typingClear.current); setTypingName(null) }
  }, [conversationId])

  // Marque lu + prévient le pair (broadcast "seen") → affiche "Vu" chez lui.
  const markRead = useCallback(() => {
    markConversationRead(conversationId).then(refreshCounts)
    try { typingRef.current?.seen(discordId) } catch {}
  }, [conversationId, refreshCounts, discordId])

  function notifyTyping() {
    const now = Date.now()
    if (now - lastTypingSent.current < 1800) return
    lastTypingSent.current = now
    typingRef.current?.send(discordId, displayName)
  }

  // ── Pièces jointes ──────────────────────────────────────────────────────────
  function acceptFile(file) {
    if (!file) return
    if (file.size > MAX_ATTACH) { setAttach({ error: `Fichier trop lourd (max 30 Mo)` }); return }
    if (!ALLOWED_IMG.includes(file.type)) { setAttach({ error: 'Format image non supporté (png/jpg/webp/gif)' }); return }
    setAttach({ file, preview: URL.createObjectURL(file) })
  }
  function onPickFile(e) { acceptFile(e.target.files?.[0]); e.target.value = '' }
  function onPaste(e) {
    const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'))
    if (item) { const f = item.getAsFile(); if (f) { e.preventDefault(); acceptFile(f) } }
  }
  function onDrop(e) {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer?.files?.[0]; if (f) acceptFile(f)
  }

  // ── Capture d'écran ──────────────────────────────────────────────────────────
  async function captureScreen() {
    if (!navigator.mediaDevices?.getDisplayMedia) { setAttach({ error: 'Capture non disponible sur ce navigateur' }); return }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 1 }, audio: false })
      const video = document.createElement('video')
      video.srcObject = stream; video.muted = true
      await video.play()
      await new Promise(r => setTimeout(r, 250))
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 1280; canvas.height = video.videoHeight || 720
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
      stream.getTracks().forEach(t => t.stop())
      canvas.toBlob(blob => {
        if (blob) acceptFile(new File([blob], `capture-${Date.now()}.png`, { type: 'image/png' }))
      }, 'image/png', 0.92)
    } catch { /* annulé par l'utilisateur — silencieux */ }
  }

  // ── GIF ───────────────────────────────────────────────────────────────────
  async function handleSendGif(url) {
    setGifOpen(false)
    const res = await sendGifMessage(conversationId, url)
    if (res?.message_id) {
      setMessages(prev => dedupeById([...prev, { id: res.message_id, sender_id: discordId, type: 'gif', gif_url: url, created_at: new Date().toISOString(), reactions: [] }]))
      scrollToBottom(true)
    }
    refreshList()
  }

  // ── Vocaux ──────────────────────────────────────────────────────────────────
  async function startRecording() {
    if (recording) return
    if (!navigator.mediaDevices?.getUserMedia) { alert('Micro non disponible sur ce navigateur'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '' })
      recChunks.current = []
      mr.ondataavailable = e => { if (e.data.size) recChunks.current.push(e.data) }
      mr.onstop = () => stream.getTracks().forEach(t => t.stop())
      recRef.current = mr; mr.start()
      setRecording(true); setRecSec(0)
      recTimer.current = setInterval(() => setRecSec(s => { if (s >= 120) { stopRecording(true) } return s + 1 }), 1000)
    } catch { alert('Permission micro refusée') }
  }
  function stopRecording(send) {
    clearInterval(recTimer.current)
    const mr = recRef.current
    if (!mr) { setRecording(false); return }
    mr.onstop = async () => {
      mr.stream?.getTracks?.().forEach(t => t.stop())
      setRecording(false)
      if (!send) return
      const blob = new Blob(recChunks.current, { type: 'audio/webm' })
      if (blob.size < 800) return
      const dur = recSec
      const file = new File([blob], `vocal-${Date.now()}.webm`, { type: 'audio/webm' })
      setUploadPct(1)
      const up = await uploadAttachment(file, setUploadPct)
      setUploadPct(0)
      if (up.error) { alert(up.error); return }
      const res = await sendVoiceMessage(conversationId, up.url, dur)
      if (res?.message_id) {
        setMessages(prev => dedupeById([...prev, { id: res.message_id, sender_id: discordId, type: 'voice', media_url: up.url, voice_duration: dur, created_at: new Date().toISOString(), reactions: [] }]))
        scrollToBottom(true)
      }
      refreshList()
    }
    try { mr.stop() } catch { setRecording(false) }
  }
  useEffect(() => () => { clearInterval(recTimer.current); try { recRef.current?.stop() } catch {} }, [])

  const scrollToBottom = useCallback((smooth = false) => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' }))
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true); setMessages([]); setHasMore(true)
    getMessages(conversationId).then(msgs => {
      if (!active) return
      setMessages(msgs); setHasMore(msgs.length >= 30); setLoading(false)
      scrollToBottom()
      markRead()
    })
    return () => { active = false }
  }, [conversationId, scrollToBottom, refreshCounts])

  useEffect(() => {
    const unsub = subscribeToConversation(conversationId, {
      onInsert: (m) => { setMessages(prev => dedupeById([...prev, m])); scrollToBottom(true); if (m.sender_id !== discordId) markRead() },
      onUpdate: (m) => setMessages(prev => prev.map(x => x.id === m.id ? { ...x, ...m } : x)),
      onReaction: () => {
        clearTimeout(reactionTimer.current)
        reactionTimer.current = setTimeout(async () => {
          const recent = await getMessages(conversationId)
          setMessages(prev => { const byId = Object.fromEntries(recent.map(m => [m.id, m.reactions])); return prev.map(m => byId[m.id] ? { ...m, reactions: byId[m.id] } : m) })
        }, 400)
      },
    })
    return () => { unsub(); clearTimeout(reactionTimer.current) }
  }, [conversationId, discordId, scrollToBottom, refreshCounts])

  // Polling de secours (si Realtime coupé)
  useEffect(() => {
    const iv = setInterval(async () => {
      if (document.hidden) return
      const recent = await getMessages(conversationId)
      if (!recent.length) return
      setMessages(prev => {
        const known = new Map(prev.map(m => [m.id, m])); let changed = false
        for (const m of recent) {
          const ex = known.get(m.id)
          if (!ex) { known.set(m.id, m); changed = true }
          else if (JSON.stringify(ex.reactions) !== JSON.stringify(m.reactions) || ex.content !== m.content || ex.deleted_at !== m.deleted_at) { known.set(m.id, { ...ex, ...m }); changed = true }
        }
        return changed ? Array.from(known.values()).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) : prev
      })
    }, 4000)
    return () => clearInterval(iv)
  }, [conversationId])

  async function loadOlder() {
    if (!hasMore || !messages.length) return
    const el = scrollRef.current, prevH = el?.scrollHeight || 0
    const older = await getMessages(conversationId, messages[0].created_at)
    if (!older.length) { setHasMore(false); return }
    setMessages(prev => dedupeById([...older, ...prev])); setHasMore(older.length >= 30)
    requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevH })
  }
  function onScroll(e) {
    const el = e.target
    if (el.scrollTop < 60) loadOlder()
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 240)
  }

  async function handleSend() {
    if (sending) return
    const text = input.trim()
    if (!text && !attach?.file && !editing) return
    setSending(true); setEmojiOpen(false); setSeenByPeer(false)

    // 1) Pièce jointe (image) → upload R2 puis message
    if (attach?.file) {
      setUploadPct(1)
      const up = await uploadAttachment(attach.file, setUploadPct)
      if (up.error) { setAttach({ error: up.error }); setUploadPct(0); setSending(false); return }
      const res = await sendImageMessage(conversationId, up.url, replyTo?.id || null)
      if (res?.message_id) {
        setMessages(prev => dedupeById([...prev, { id: res.message_id, sender_id: discordId, type: 'image', media_url: up.url, created_at: new Date().toISOString(), reactions: [], reply_to_id: replyTo?.id || null }]))
        scrollToBottom(true)
      }
      setAttach(null); setUploadPct(0); setReplyTo(null); refreshList()
    }

    // 2) Texte (ou édition)
    if (editing) {
      const res = await editMessage(editing.id, text)
      if (res?.ok) setMessages(prev => prev.map(m => m.id === editing.id ? { ...m, content: text, edited_at: new Date().toISOString() } : m))
      setEditing(null); setInput('')
    } else if (text) {
      const res = await sendTextMessage(conversationId, text, replyTo?.id || null)
      if (res?.message_id) {
        setMessages(prev => dedupeById([...prev, { id: res.message_id, sender_id: discordId, content: text, type: 'text', created_at: new Date().toISOString(), reactions: [], sender_username: displayName, sender_avatar: avatarUrl, reply_to_id: replyTo?.id || null }]))
        scrollToBottom(true)
      }
      setReplyTo(null); setInput(''); refreshList()
    }
    setSending(false)
  }

  async function handleReact(messageId, emoji) {
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m
      const list = m.reactions || []; const has = list.some(r => r.emoji === emoji && r.user_id === discordId)
      return { ...m, reactions: has ? list.filter(r => !(r.emoji === emoji && r.user_id === discordId)) : [...list, { emoji, user_id: discordId }] }
    }))
    await toggleReaction(messageId, emoji)
  }
  async function handleDelete(messageId) {
    const res = await deleteMessage(messageId)
    if (res?.ok) setMessages(prev => prev.map(m => m.id === messageId ? { ...m, deleted_at: new Date().toISOString(), content: null } : m))
  }
  async function handleBlock() {
    if (!meta?.other_id) return
    if (!window.confirm(`Bloquer ${meta.other_username || 'cet utilisateur'} ?`)) return
    await blockUser(meta.other_id); setMenuOpen(false); navigate('/messages'); refreshList()
  }

  const rendered = useMemo(() => {
    const out = []; let lastDay = null, lastSender = null, lastTime = 0
    for (const m of messages) {
      const d = dayLabel(m.created_at)
      if (d !== lastDay) { out.push({ sep: d, id: `sep-${m.id}` }); lastDay = d; lastSender = null }
      const t = new Date(m.created_at).getTime()
      const grouped = m.sender_id === lastSender && (t - lastTime) < 5 * 60 * 1000
      out.push({ msg: m, grouped, id: m.id }); lastSender = m.sender_id; lastTime = t
    }
    return out
  }, [messages])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${T.border}`, flexShrink: 0, background: T.panel, backdropFilter: 'blur(8px)' }}>
        {isMobile && <button onClick={onBack} style={{ ...iconBtn, fontSize: 22 }}>‹</button>}
        <Avatar url={meta?.other_avatar} name={meta?.other_username} size={40} online={isOnline(meta?.other_id)} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <Link to={meta?.other_id ? `/u/${meta.other_id}` : '#'} style={{ fontSize: 15, fontWeight: 700, color: T.text, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {meta?.other_username || 'Conversation'}
          </Link>
          <span style={{ fontSize: 11, color: typingName ? T.violet : (isOnline(meta?.other_id) ? T.online : T.textFaint) }}>
            {typingName ? 'écrit…' : (isOnline(meta?.other_id) ? 'En ligne' : 'Hors ligne')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
          <HeaderAction label="📞" onClick={() => meta?.other_id && startCall({ id: meta.other_id, name: meta.other_username, avatar: meta.other_avatar }, 'audio')} />
          <HeaderAction label="🎥" onClick={() => meta?.other_id && startCall({ id: meta.other_id, name: meta.other_username, avatar: meta.other_avatar }, 'video')} />
          {meta?.other_id && <HeaderAction label="👤" onClick={() => navigate(`/u/${meta.other_id}`)} />}
          <HeaderAction label="⋯" onClick={() => setMenuOpen(o => !o)} />
          {menuOpen && (
            <div style={{ position: 'absolute', top: 42, right: 0, zIndex: 20, background: '#16171d', border: `1px solid ${T.border}`, borderRadius: 10, padding: 4, minWidth: 160, boxShadow: '0 10px 30px rgba(0,0,0,.5)' }}>
              {meta?.other_id && <button onClick={() => { navigate(`/u/${meta.other_id}`); setMenuOpen(false) }} style={menuItemStyle}>Voir le profil</button>}
              <button onClick={handleBlock} style={{ ...menuItemStyle, color: T.red }}>Bloquer</button>
            </div>
          )}
        </div>
      </div>

      {/* Drag overlay */}
      {dragOver && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(8,9,13,0.85)', border: `2px dashed ${T.gold}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.gold, fontSize: 16, fontWeight: 700, pointerEvents: 'none' }}>
          📎 Dépose ton image ici
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll}
        onDragOver={e => { e.preventDefault(); if (!dragOver) setDragOver(true) }}
        onDragLeave={e => { if (e.currentTarget === e.target) setDragOver(false) }}
        onDrop={onDrop}
        style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(155,108,255,0.03), transparent 70%)' }}>
        {loading ? <div style={{ padding: 30, color: T.textFaint, fontSize: 13, textAlign: 'center' }}>Chargement…</div>
          : messages.length === 0 ? <div style={{ padding: '48px 20px', color: T.textFaint, fontSize: 14, textAlign: 'center' }}>Début de votre conversation. Dis bonjour 👋</div>
          : <>
            {hasMore && <div style={{ textAlign: 'center', padding: 8 }}><button onClick={loadOlder} style={{ ...btn('ghost'), fontSize: 12, padding: '5px 12px' }}>Charger plus</button></div>}
            {rendered.map(item => item.sep
              ? <div key={item.id} style={{ textAlign: 'center', margin: '16px 0 8px' }}><span style={{ fontSize: 11, color: T.textFaint, background: T.surface, padding: '4px 14px', borderRadius: 12, border: `1px solid ${T.border}` }}>{item.sep}</span></div>
              : <MessageBubble key={item.id} msg={item.msg} mine={item.msg.sender_id === discordId} grouped={item.grouped} onReact={handleReact} onReply={setReplyTo} onEdit={(m) => { setEditing(m); setInput(m.content || '') }} onDelete={handleDelete} />)}
            {seenByPeer && messages.length > 0 && messages[messages.length - 1].sender_id === discordId && (
              <div style={{ textAlign: 'right', fontSize: 10, color: T.textFaint, padding: '3px 6px 0' }}>Vu ✓✓</div>
            )}
            <div ref={bottomRef} />
          </>}
      </div>

      {showScrollBtn && (
        <button onClick={() => scrollToBottom(true)} style={{ position: 'absolute', bottom: 86, right: 18, width: 38, height: 38, borderRadius: '50%', background: T.violet, border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,.4)' }}>↓</button>
      )}

      {/* Reply / edit bar */}
      {(replyTo || editing) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.textDim, background: T.surface }}>
          <span style={{ color: T.violet }}>{editing ? '✎ Modification' : '↩ Réponse'}</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(editing || replyTo)?.content}</span>
          <button onClick={() => { setReplyTo(null); setEditing(null); setInput('') }} style={iconBtn}>✕</button>
        </div>
      )}

      {/* Aperçu pièce jointe */}
      {attach && (
        <div style={{ padding: '8px 16px', borderTop: `1px solid ${T.border}`, background: T.surface }}>
          {attach.error ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.red }}>
              ⚠️ {attach.error}
              <button onClick={() => setAttach(null)} style={iconBtn}>✕</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={attach.preview} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: `1px solid ${T.border}` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attach.file.name}</div>
                <div style={{ fontSize: 11, color: T.textFaint }}>{humanSize(attach.file.size)}{uploadPct > 0 && ` · envoi ${uploadPct}%`}</div>
                {uploadPct > 0 && <div style={{ height: 3, background: T.surface2, borderRadius: 2, marginTop: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: `${uploadPct}%`, background: T.gold, transition: 'width .2s' }} /></div>}
              </div>
              <button onClick={() => setAttach(null)} disabled={uploadPct > 0} style={{ ...iconBtn, fontSize: 16 }}>✕</button>
            </div>
          )}
        </div>
      )}

      {/* Emoji picker */}
      {emojiOpen && (
        <div style={{ borderTop: `1px solid ${T.border}`, background: T.surface, padding: '10px 14px', maxHeight: 180, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(34px, 1fr))', gap: 2 }}>
            {EMOJI_SET.map(e => (
              <button key={e} onClick={() => { setInput(v => v + e) }} style={{ fontSize: 20, padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 7 }}
                onMouseEnter={ev => ev.currentTarget.style.background = T.surface2}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>{e}</button>
            ))}
          </div>
        </div>
      )}

      {/* GIF picker */}
      {gifOpen && <GifPicker onSelect={handleSendGif} />}

      {/* Composer */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 14px', borderTop: `1px solid ${T.border}`, flexShrink: 0, alignItems: 'flex-end', background: T.panel }}>
        {recording ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 14, background: T.surface, border: `1px solid ${T.border}` }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: T.red, animation: 'pulse 1s infinite', flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{String(Math.floor(recSec / 60)).padStart(2, '0')}:{String(recSec % 60).padStart(2, '0')}</span>
            <span style={{ flex: 1, fontSize: 12, color: T.textFaint }}>Enregistrement… (max 2 min)</span>
            <button onClick={() => stopRecording(false)} style={{ ...btn('ghost'), padding: '8px 12px', fontSize: 12 }}>Annuler</button>
            <button onClick={() => stopRecording(true)} style={{ ...btn('gold'), padding: '8px 14px', fontSize: 12 }}>Envoyer ➤</button>
          </div>
        ) : (
          <>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onPickFile} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} title="Joindre une image" style={composerIcon}>📎</button>
            <button onClick={() => { setEmojiOpen(o => !o); setGifOpen(false) }} title="Emoji" style={{ ...composerIcon, color: emojiOpen ? T.gold : T.textDim }}>😊</button>
            <button onClick={() => { setGifOpen(o => !o); setEmojiOpen(false) }} title="GIF" style={{ ...composerIcon, color: gifOpen ? T.gold : T.textDim, fontSize: 11, fontWeight: 800 }}>GIF</button>
            <button onClick={captureScreen} title="Capture d'écran" style={composerIcon}>🖥️</button>
            <button onClick={startRecording} title="Message vocal" style={composerIcon}>🎤</button>
            <textarea
              value={input} onChange={e => { setInput(e.target.value); notifyTyping() }} onPaste={onPaste}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Écris un message…" rows={1}
              style={{ flex: 1, resize: 'none', maxHeight: 140, padding: '11px 15px', borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, color: T.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', lineHeight: 1.4, boxSizing: 'border-box' }}
            />
            <button onClick={handleSend} disabled={sending || (!input.trim() && !attach?.file && !editing)} style={{ ...btn('gold'), padding: '11px 16px', height: 44, opacity: (sending || (!input.trim() && !attach?.file && !editing)) ? 0.5 : 1 }}>
              {editing ? '✓' : '➤'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
const menuItemStyle = { display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 7, border: 'none', background: 'transparent', color: T.text, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }

// ── Page ──────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { refreshCounts } = useSocial()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [conversations, setConversations] = useState([])
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] })
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    setLoading(true)
    // Conversations en priorité (contenu principal) → la sidebar s'affiche vite.
    listConversations()
      .then(c => setConversations(Array.isArray(c) ? c : []))
      .catch(e => console.error('[messages] conversations', e))
      .finally(() => setLoading(false))
    // Amis + demandes en arrière-plan (alimentent les autres onglets, non bloquant).
    listFriends().then(f => setFriends(Array.isArray(f) ? f : [])).catch(() => {})
    listFriendRequests().then(r => setRequests(r && typeof r === 'object' ? r : { incoming: [], outgoing: [] })).catch(() => {})
  }, [isAuthenticated])
  useEffect(() => { load() }, [load])

  async function openFriend(userId) {
    const res = await getOrCreateDm(userId)
    if (res?.ok) { navigate(`/messages/${res.conversation_id}`); load() }
  }
  async function respond(reqId, accept) { await respondFriendRequest(reqId, accept); await load(); refreshCounts() }

  const activeMeta = conversations.find(c => c.conversation_id === conversationId)

  if (!isAuthenticated) {
    return <div style={{ minHeight: '100vh', background: T.bg }}><Navbar /><div style={{ padding: '90px 20px', textAlign: 'center', color: T.textFaint }}>Connecte-toi pour accéder à tes messages.</div></div>
  }

  const showSidebar = !isMobile || !conversationId
  const showChat = !isMobile || !!conversationId

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      <Navbar />
      <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: isMobile ? '64px 0 0' : '76px 16px 20px', height: isMobile ? '100vh' : 'calc(100vh - 16px)' }}>
        <div style={{ display: 'flex', height: '100%', borderRadius: isMobile ? 0 : 18, overflow: 'hidden', border: isMobile ? 'none' : `1px solid ${T.border}`, background: 'rgba(255,255,255,0.012)' }}>
          {showSidebar && (
            <div style={{ width: isMobile ? '100%' : 340, flexShrink: 0, borderRight: isMobile ? 'none' : `1px solid ${T.border}`, background: T.panel }}>
              <ConversationList
                conversations={conversations} friends={friends} requests={requests}
                activeId={conversationId} tab={tab} setTab={setTab} search={search} setSearch={setSearch}
                loading={loading} onSelect={(id) => navigate(`/messages/${id}`)} onOpenFriend={openFriend}
                onRespond={respond} navigate={navigate} isMobile={isMobile}
              />
            </div>
          )}
          {showChat && (
            <div style={{ flex: 1, minWidth: 0 }}>
              {conversationId
                ? <ChatView conversationId={conversationId} meta={activeMeta} isMobile={isMobile} onBack={() => navigate('/messages')} refreshList={load} />
                : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.textFaint, fontSize: 14, textAlign: 'center', padding: 24, gap: 10 }}>
                    <div style={{ fontSize: 44, opacity: 0.4 }}>💬</div>
                    <div style={{ fontSize: 16, color: T.textDim, fontWeight: 600 }}>Ta messagerie Brams</div>
                    <div>Choisis une conversation à gauche<br />ou <Link to="/amis" style={{ color: T.gold, textDecoration: 'none' }}>ajoute un ami</Link> pour commencer.</div>
                  </div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
