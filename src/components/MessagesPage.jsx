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
  pinMessage, unpinMessage, listPinnedMessages, searchMessages,
  createGroupConversation, leaveConversation,
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

// Surligne (insensible à la casse) le terme recherché dans un extrait clampé.
function Highlight({ text, term }) {
  const clamp = { fontSize: 12.5, color: T.textDim, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word', lineHeight: 1.4 }
  const t = (term || '').trim()
  if (!t) return <div style={clamp}>{text}</div>
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = String(text).split(new RegExp(`(${esc})`, 'ig'))
  return (
    <div style={clamp}>
      {parts.map((p, i) => p.toLowerCase() === t.toLowerCase()
        ? <mark key={i} style={{ background: 'rgba(212,160,23,0.32)', color: T.text, borderRadius: 3, padding: '0 1px' }}>{p}</mark>
        : <span key={i}>{p}</span>)}
    </div>
  )
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
function GroupAvatar({ members = [], size = 44 }) {
  const pics = members.filter(m => m.avatar_url).slice(0, 2)
  if (pics.length === 0) {
    return <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(155,108,255,0.18)', border: `1px solid ${T.border}`, fontSize: size * 0.42 }}>👥</div>
  }
  const s = size * 0.66
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      {pics.map((m, i) => (
        <img key={i} src={m.avatar_url} alt="" style={{ width: s, height: s, borderRadius: '50%', objectFit: 'cover', position: 'absolute', border: `2px solid ${T.bg || '#0b0c0e'}`,
          top: i === 0 ? 0 : 'auto', left: i === 0 ? 0 : 'auto', bottom: i === 1 ? 0 : 'auto', right: i === 1 ? 0 : 'auto' }} />
      ))}
    </div>
  )
}

function ConversationList({ conversations, friends, requests, activeId, tab, setTab, search, setSearch, loading, onSelect, onOpenFriend, onRespond, onCreateGroup, navigate, isMobile }) {
  const { isOnline } = useSocial()
  const [groupMode, setGroupMode] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupSel, setGroupSel]   = useState(() => new Set())
  const [groupBusy, setGroupBusy] = useState(false)
  const toggleSel = (id) => setGroupSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const submitGroup = async () => {
    if (groupSel.size < 1 || groupBusy) return
    setGroupBusy(true)
    await onCreateGroup(groupName, [...groupSel])
    setGroupBusy(false); setGroupMode(false); setGroupName(''); setGroupSel(new Set())
  }
  const convName = (c) => c.is_group ? (c.title || 'Groupe') : (c.other_username || `Pirate #${String(c.other_id || '').slice(-5)}`)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(c => convName(c).toLowerCase().includes(q))
  }, [conversations, search])

  const unreadN = useMemo(() => conversations.filter(c => Number(c.unread) > 0).length, [conversations])
  const displayConvs = tab === 'unread' ? filtered.filter(c => Number(c.unread) > 0) : filtered

  const TABS = [
    { id: 'all', label: 'Tous' },
    { id: 'unread', label: 'Non lus', badge: unreadN },
    { id: 'friends', label: 'Amis' },
    { id: 'requests', label: 'Demandes', badge: requests.incoming?.length || 0 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header sidebar */}
      <div style={{ padding: '16px 16px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 19, fontWeight: 800, color: T.text }}>Messages</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => { setTab('friends'); setGroupMode(true) }} title="Nouveau groupe"
              style={{ ...btn('ghost'), background: T.violetSoft, border: `1px solid ${T.violet}55`, color: T.violet, padding: '6px 12px', fontSize: 12 }}>👥 Groupe</button>
            <button onClick={() => { setTab('friends'); setGroupMode(false) }} title="Nouveau DM"
              style={{ ...btn('gold'), padding: '6px 12px', fontSize: 12 }}>＋ Nouveau</button>
          </div>
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

        {/* ── Tous / Non lus : conversations ── */}
        {!loading && (tab === 'all' || tab === 'unread') && (displayConvs.length === 0 ? (
          tab === 'unread'
            ? <Empty icon="✅">Aucun message non lu.</Empty>
            : <Empty icon="💬">Aucune conversation.<br /><Link to="#" onClick={e => { e.preventDefault(); setTab('friends') }} style={{ color: T.gold, textDecoration: 'none' }}>Ajoute un ami</Link> pour commencer.</Empty>
        ) : displayConvs.map(c => {
          const active = c.conversation_id === activeId
          return (
            <button key={c.conversation_id} onClick={() => onSelect(c.conversation_id)} style={convItemStyle(active)}>
              {c.is_group
                ? <GroupAvatar members={c.members} size={44} />
                : <Avatar url={c.other_avatar} name={c.other_username} size={44} online={isOnline(c.other_id)} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {c.is_group && <span style={{ fontSize: 11 }}>👥</span>}
                    {convName(c)}
                    {c.is_group && <span style={{ fontSize: 11, fontWeight: 600, color: T.textFaint }}>· {c.member_count}</span>}
                  </span>
                  <span style={{ fontSize: 10, color: T.textFaint, flexShrink: 0 }}>{c.last_message_at ? timeLabel(c.last_message_at) : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginTop: 2 }}>
                  <span style={{ fontSize: 12, color: Number(c.unread) > 0 ? T.text : T.textFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.last_type === 'gif' ? '🖼️ GIF' : c.last_type === 'voice' ? '🎤 Vocal' : c.last_type === 'image' ? '🖼️ Image' : c.last_type === 'call' ? '📞 Appel' : (c.last_content || 'Conversation démarrée')}
                  </span>
                  {Number(c.unread) > 0 && <span style={{ background: T.gold, color: '#0b0c0e', fontSize: 11, fontWeight: 800, borderRadius: 10, padding: '1px 7px', flexShrink: 0 }}>{c.unread}</span>}
                </div>
              </div>
            </button>
          )
        }))}

        {/* ── Amis ── */}
        {!loading && tab === 'friends' && (
          <>
            {/* Barre de bascule DM / Groupe */}
            <div style={{ display: 'flex', gap: 6, padding: '2px 6px 8px' }}>
              <button onClick={() => setGroupMode(false)} style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, background: !groupMode ? T.violetSoft : 'transparent', color: !groupMode ? T.violet : T.textDim }}>💬 Message</button>
              <button onClick={() => setGroupMode(true)} style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, background: groupMode ? T.violetSoft : 'transparent', color: groupMode ? T.violet : T.textDim }}>👥 Nouveau groupe</button>
            </div>

            {groupMode && (
              <div style={{ padding: '0 6px 8px' }}>
                <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Nom du groupe…" maxLength={60}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10, fontSize: 13, background: T.surface, border: `1px solid ${T.border}`, color: T.text, outline: 'none', fontFamily: 'inherit', marginBottom: 8 }} />
                <button onClick={submitGroup} disabled={groupSel.size < 1 || groupBusy}
                  style={{ ...btn('gold'), width: '100%', padding: '9px', fontSize: 13, opacity: (groupSel.size < 1 || groupBusy) ? 0.5 : 1, cursor: (groupSel.size < 1 || groupBusy) ? 'default' : 'pointer' }}>
                  {groupBusy ? 'Création…' : `Créer le groupe${groupSel.size ? ` (${groupSel.size})` : ''}`}
                </button>
                <div style={{ fontSize: 11, color: T.textFaint, padding: '8px 4px 2px' }}>Sélectionne les membres :</div>
              </div>
            )}

            {friends.length === 0 ? (
              <Empty icon="👥">Aucun ami pour l'instant.<br /><Link to="/amis" style={{ color: T.gold, textDecoration: 'none' }}>Trouver des membres</Link></Empty>
            ) : friends.map(f => {
              const sel = groupSel.has(f.user_id)
              return (
                <button key={f.user_id}
                  onClick={() => groupMode ? toggleSel(f.user_id) : onOpenFriend(f.user_id)}
                  style={{ ...convItemStyle(sel) }}>
                  <Avatar url={f.avatar_url} name={f.username} size={44} online={isOnline(f.user_id)} />
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.username || `Pirate #${String(f.user_id).slice(-5)}`}</div>
                    <div style={{ fontSize: 12, color: T.textFaint }}>{groupMode ? (sel ? 'Sélectionné' : 'Toucher pour ajouter') : 'Envoyer un message'}</div>
                  </div>
                  {groupMode
                    ? <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, background: sel ? T.violet : 'transparent', color: sel ? '#fff' : 'transparent', border: `1.5px solid ${sel ? T.violet : T.border}` }}>✓</span>
                    : <span style={{ color: T.gold, fontSize: 16 }}>💬</span>}
                </button>
              )
            })}
          </>
        )}

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
function MessageBubble({ msg, mine, grouped, isGroup, onReact, onReply, onEdit, onDelete, onPin, onUnpin }) {
  const [menu, setMenu] = useState(false)
  const deleted = !!msg.deleted_at
  const pinned = !!msg.pinned_at
  const reactions = useMemo(() => {
    const map = {}
    for (const r of (msg.reactions || [])) map[r.emoji] = (map[r.emoji] || 0) + 1
    return Object.entries(map)
  }, [msg.reactions])

  // Message système (création/renommage/départ de groupe) → ligne centrée discrète
  if (msg.type === 'system') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
        <span style={{ fontSize: 11.5, color: T.textFaint, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 999, padding: '4px 12px' }}>
          {msg.sender_username ? `${msg.sender_username} ` : ''}{msg.content}
        </span>
      </div>
    )
  }

  return (
    <div id={`msg-${msg.id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', marginTop: grouped ? 2 : 12, scrollMarginTop: 80, borderRadius: 12 }}
      onMouseLeave={() => setMenu(false)}>
      {pinned && !deleted && <span style={{ fontSize: 10, color: T.gold, fontWeight: 700, padding: '0 6px 2px', display: 'flex', alignItems: 'center', gap: 3 }}>📌 Épinglé</span>}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: mine ? '80%' : 'calc(80% - 36px)', flexDirection: mine ? 'row-reverse' : 'row' }}>
        {!mine && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, flexShrink: 0 }}>
            {isGroup && !grouped && (
              <span style={{ fontSize: 11, fontWeight: 700, color: T.violet, padding: '0 0 2px 0', whiteSpace: 'nowrap' }}>
                {msg.sender_username || `Pirate #${String(msg.sender_id || '').slice(-5)}`}
              </span>
            )}
            {grouped
              ? <div style={{ width: 28, height: 28, flexShrink: 0 }} />
              : <Avatar url={msg.sender_avatar} name={msg.sender_username || `Pirate #${String(msg.sender_id || '').slice(-5)}`} size={28} />
            }
          </div>
        )}
        <div style={{ position: 'relative' }} onMouseEnter={() => setMenu(true)}>
          <div style={{
            padding: msg.type === 'gif' || msg.type === 'image' ? 4 : (msg.type === 'voice' ? 6 : '9px 13px'),
            borderRadius: 16,
            borderTopLeftRadius: !mine && grouped ? 6 : 16,
            borderTopRightRadius: mine && grouped ? 6 : 16,
            // Vocaux : pas de fond doré (le lecteur audio est blanc) → neutre pour les
            // miens, teinte bleue pour ceux de l'autre.
            background: deleted ? T.surface
              : msg.type === 'voice' ? (mine ? 'rgba(255,255,255,0.05)' : 'rgba(91,141,239,0.15)')
              : (mine ? T.mineBg : T.theirBg),
            border: `1px solid ${deleted ? T.border : msg.type === 'voice' ? (mine ? T.border : 'rgba(91,141,239,0.3)') : (mine ? T.mineBorder : T.theirBorder)}`,
            color: deleted ? T.textFaint : T.text, fontSize: 14, lineHeight: 1.5,
            wordBreak: 'break-word', fontStyle: deleted ? 'italic' : 'normal', overflow: 'hidden',
          }}>
            {msg.reply_to_id && !deleted && <div style={{ fontSize: 11, color: T.textFaint, marginBottom: 4, borderLeft: `2px solid ${T.violet}`, paddingLeft: 6 }}>↩ réponse</div>}
            {deleted ? 'Message supprimé'
              : msg.type === 'gif' ? <img src={msg.gif_url} alt="gif" style={{ maxWidth: 240, borderRadius: 12, display: 'block' }} />
              : msg.type === 'image' ? <img src={msg.media_url} alt="image" style={{ maxWidth: 280, maxHeight: 320, borderRadius: 12, display: 'block' }} />
              : msg.type === 'voice' ? <audio src={msg.media_url} controls style={{ height: 36, maxWidth: 240 }} />
              : msg.type === 'call' ? <span>{formatCallContent(msg)}</span>
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
              <button onClick={() => pinned ? onUnpin(msg.id) : onPin(msg.id)} style={{ ...iconBtn, color: pinned ? T.gold : T.textDim }} title={pinned ? 'Désépingler' : 'Épingler'}>📌</button>
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

// ── Panneau des messages épinglés ────────────────────────────────────────────
function normalizeCallText(content) {
  const raw = String(content || 'Appel')
  const fixed = raw
    .replaceAll('dÃ©marrÃ©', 'démarré')
    .replaceAll('manquÃ©', 'manqué')
    .replaceAll('refusÃ©', 'refusé')
    .replaceAll('occupÃ©', 'occupé')
    .replaceAll('terminÃ©', 'terminé')
    .replaceAll('Ã©', 'é')
  return fixed || 'Appel'
}

function formatCallContent(msg) {
  const text = normalizeCallText(msg?.content)
  const sec = Math.max(0, Number(msg?.voice_duration || 0))
  if (!sec) return text
  return `${text} · ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

function pinPreview(m) {
  if (m.type === 'gif') return '🖼️ GIF'
  if (m.type === 'voice') return '🎤 Message vocal'
  if (m.type === 'image') return '🖼️ Image'
  if (m.type === 'call') return formatCallContent(m)
  return m.content || 'Message'
}
function PinnedPanel({ pinned, onJump, onUnpin, onClose }) {
  return (
    <div style={{ position: 'absolute', top: 44, right: 0, zIndex: 25, width: 320, maxHeight: 360, overflowY: 'auto', background: '#16171d', border: `1px solid ${T.border}`, borderRadius: 12, padding: 6, boxShadow: '0 14px 40px rgba(0,0,0,.55)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px 8px' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>📌 Messages épinglés</span>
        <button onClick={onClose} style={iconBtn}>✕</button>
      </div>
      {pinned.length === 0 ? (
        <div style={{ padding: '24px 16px', textAlign: 'center', color: T.textFaint, fontSize: 12.5, lineHeight: 1.6 }}>
          Aucun message épinglé.<br />Survole un message puis clique 📌 pour l'épingler.
        </div>
      ) : pinned.map(m => (
        <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 9 }}
          onMouseEnter={e => e.currentTarget.style.background = T.surface}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <button onClick={() => onJump(m.id)} style={{ flex: 1, minWidth: 0, textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.gold, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.sender_username || `Pirate #${String(m.sender_id || '').slice(-5)}`}</div>
            <div style={{ fontSize: 12.5, color: T.textDim, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{pinPreview(m)}</div>
          </button>
          <button onClick={() => onUnpin(m.id)} title="Désépingler" style={{ ...iconBtn, flexShrink: 0, fontSize: 12 }}>✕</button>
        </div>
      ))}
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
  const [pinned, setPinned]     = useState([])
  const [pinnedOpen, setPinnedOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
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
      onInsert: (m) => {
        let enriched = { ...m };
        if (!enriched.sender_avatar && m.sender_id !== discordId) {
          if (meta?.is_group && meta.members?.length) {
            const mem = meta.members.find(mm => String(mm.user_id || mm.id) === String(m.sender_id));
            if (mem) {
              enriched.sender_avatar = mem.avatar_url;
              enriched.sender_username = mem.username || mem.display_name;
            }
          } else if (meta?.other_avatar) {
            enriched.sender_avatar = meta.other_avatar;
            enriched.sender_username = meta.other_username;
          }
        }
        setMessages(prev => dedupeById([...prev, enriched]));
        scrollToBottom(true);
        if (m.sender_id !== discordId) markRead();
      },
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
          if (!ex) {
            known.set(m.id, m); changed = true
          } else {
            // merge, especially to pick up sender_avatar / username from enriched RPC data
            const merged = { ...ex, ...m, sender_avatar: m.sender_avatar || ex.sender_avatar, sender_username: m.sender_username || ex.sender_username }
            if (JSON.stringify(ex) !== JSON.stringify(merged)) {
              known.set(m.id, merged); changed = true
            }
          }
        }
        return changed ? Array.from(known.values()).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) : prev
      })
    }, 4000)
    return () => clearInterval(iv)
  }, [conversationId])

  // Messages épinglés (chargés à l'ouverture + après chaque pin/unpin).
  const refreshPinned = useCallback(() => {
    listPinnedMessages(conversationId).then(p => setPinned(Array.isArray(p) ? p : []))
  }, [conversationId])
  // Au changement de conversation : reset + chargement gardé (une réponse en
  // retard d'une conv précédente ne doit pas écraser les épinglés de la courante).
  useEffect(() => {
    let active = true
    setPinnedOpen(false); setPinned([])
    listPinnedMessages(conversationId).then(p => { if (active) setPinned(Array.isArray(p) ? p : []) })
    return () => { active = false }
  }, [conversationId])

  const handlePin = useCallback(async (messageId) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, pinned_at: new Date().toISOString() } : m))
    const res = await pinMessage(messageId)
    if (res?.ok === false) { setMessages(prev => prev.map(m => m.id === messageId ? { ...m, pinned_at: null } : m)); if (res.error) alert(res.error) }
    refreshPinned()
  }, [refreshPinned])
  const handleUnpin = useCallback(async (messageId) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, pinned_at: null } : m))
    setPinned(prev => prev.filter(m => m.id !== messageId))
    await unpinMessage(messageId)
    refreshPinned()
  }, [refreshPinned])

  // Saute au message épinglé : scroll + flash. S'il n'est pas dans la fenêtre
  // chargée (trop ancien), on charge des messages plus anciens jusqu'à le trouver.
  const jumpToMessage = useCallback(async (messageId) => {
    setPinnedOpen(false)
    let before = messages[0]?.created_at   // curseur local : progresse vers le passé à chaque page
    for (let i = 0; i < 8; i++) {
      const el = document.getElementById(`msg-${messageId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.style.transition = 'background .3s'
        el.style.background = 'rgba(212,160,23,0.18)'
        setTimeout(() => { el.style.background = 'transparent' }, 1100)
        return
      }
      const more = await getMessages(conversationId, before)
      if (!more.length) break
      before = more[0]?.created_at   // get_messages renvoie en ordre croissant → [0] = le plus ancien
      setMessages(prev => dedupeById([...more, ...prev]))
      await new Promise(r => requestAnimationFrame(r))
    }
  }, [conversationId, messages])

  // Reset recherche au changement de conversation.
  useEffect(() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]) }, [conversationId])

  // Recherche serveur débouncée (les messages sont paginés → pas de filtre local).
  useEffect(() => {
    const q = searchQuery.trim()
    if (!searchOpen || q.length < 2) { setSearchResults([]); setSearching(false); return }
    setSearching(true)
    let active = true
    const t = setTimeout(async () => {
      const res = await searchMessages(conversationId, q)
      if (active) { setSearchResults(Array.isArray(res) ? res : []); setSearching(false) }
    }, 300)
    return () => { active = false; clearTimeout(t) }
  }, [searchQuery, searchOpen, conversationId])

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
    try {
      // 1) Pièce jointe (image) → upload R2 puis message
      if (attach?.file) {
        setUploadPct(1)
        const up = await uploadAttachment(attach.file, setUploadPct)
        if (up.error) { setAttach({ error: up.error }); setUploadPct(0); return }
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
    } catch (e) {
      console.error('[messages] send', e)
    } finally {
      setSending(false)   // TOUJOURS → plus de blocage "peut plus envoyer" après un échec
    }
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
  async function handleLeaveGroup() {
    if (!window.confirm('Quitter ce groupe ?')) return
    await leaveConversation(conversationId); setMenuOpen(false); navigate('/messages'); refreshList()
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
        {meta?.is_group
          ? <GroupAvatar members={meta?.members} size={40} />
          : <Avatar url={meta?.other_avatar} name={meta?.other_username} size={40} online={isOnline(meta?.other_id)} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          {meta?.is_group ? (
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              👥 {meta?.title || 'Groupe'}
            </div>
          ) : (
            <Link to={meta?.other_id ? `/u/${meta.other_id}` : '#'} style={{ fontSize: 15, fontWeight: 700, color: T.text, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {meta?.other_username || 'Conversation'}
            </Link>
          )}
          <span style={{ fontSize: 11, color: typingName ? T.violet : (meta?.is_group ? T.textFaint : (isOnline(meta?.other_id) ? T.online : T.textFaint)) }}>
            {typingName ? 'écrit…' : meta?.is_group
              ? `${meta?.member_count || (meta?.members?.length || 0)} membres${meta?.members?.length ? ' · ' + meta.members.map(m => m.username).filter(Boolean).slice(0, 3).join(', ') : ''}`
              : (isOnline(meta?.other_id) ? 'En ligne' : 'Hors ligne')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
          <HeaderAction label="🔍" onClick={() => setSearchOpen(o => !o)} />
          {!meta?.is_group && <HeaderAction label="📞" onClick={() => meta?.other_id && startCall({ id: meta.other_id, name: meta.other_username, avatar: meta.other_avatar, conversationId }, 'audio')} />}
          {!meta?.is_group && <HeaderAction label="🎥" onClick={() => meta?.other_id && startCall({ id: meta.other_id, name: meta.other_username, avatar: meta.other_avatar, conversationId }, 'video')} />}
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <HeaderAction label="📌" onClick={() => setPinnedOpen(o => !o)} />
            {pinned.length > 0 && <span style={{ position: 'absolute', top: -3, right: -3, minWidth: 15, height: 15, padding: '0 3px', borderRadius: 8, background: T.gold, color: '#0b0c0e', fontSize: 9.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>{pinned.length}</span>}
            {pinnedOpen && <PinnedPanel pinned={pinned} onJump={jumpToMessage} onUnpin={handleUnpin} onClose={() => setPinnedOpen(false)} />}
          </span>
          {!meta?.is_group && meta?.other_id && <HeaderAction label="👤" onClick={() => navigate(`/u/${meta.other_id}`)} />}
          <HeaderAction label="⋯" onClick={() => setMenuOpen(o => !o)} />
          {menuOpen && (
            <div style={{ position: 'absolute', top: 42, right: 0, zIndex: 20, background: '#16171d', border: `1px solid ${T.border}`, borderRadius: 10, padding: 4, minWidth: 160, boxShadow: '0 10px 30px rgba(0,0,0,.5)' }}>
              {meta?.is_group ? (
                <button onClick={handleLeaveGroup} style={{ ...menuItemStyle, color: T.red }}>Quitter le groupe</button>
              ) : (<>
                {meta?.other_id && <button onClick={() => { navigate(`/u/${meta.other_id}`); setMenuOpen(false) }} style={menuItemStyle}>Voir le profil</button>}
                <button onClick={handleBlock} style={{ ...menuItemStyle, color: T.red }}>Bloquer</button>
              </>)}
            </div>
          )}
        </div>
      </div>

      {/* Barre de recherche dans la conversation */}
      {searchOpen && (
        <div style={{ flexShrink: 0, borderBottom: `1px solid ${T.border}`, background: T.panel }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px' }}>
            <span style={{ fontSize: 14, color: T.textFaint }}>🔍</span>
            <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') } }}
              placeholder="Rechercher dans la conversation…"
              style={{ flex: 1, padding: '8px 12px', borderRadius: 10, fontSize: 13, background: T.surface, border: `1px solid ${T.border}`, color: T.text, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <button onClick={() => { setSearchOpen(false); setSearchQuery('') }} style={iconBtn}>✕</button>
          </div>
          {searchQuery.trim().length >= 2 && (
            <div style={{ maxHeight: 280, overflowY: 'auto', padding: '0 8px 10px' }}>
              {searching ? <div style={{ padding: '16px', textAlign: 'center', color: T.textFaint, fontSize: 12.5 }}>Recherche…</div>
                : searchResults.length === 0 ? <div style={{ padding: '20px 16px', textAlign: 'center', color: T.textFaint, fontSize: 12.5 }}>Aucun résultat pour « {searchQuery.trim()} ».</div>
                : <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, padding: '4px 10px 6px' }}>{searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}</div>
                  {searchResults.map(m => (
                    <button key={m.id} onClick={() => jumpToMessage(m.id)} style={{ width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 10px', borderRadius: 9, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}
                      onMouseEnter={e => e.currentTarget.style.background = T.surface}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: m.sender_id === discordId ? T.gold : T.violet, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.sender_id === discordId ? 'Toi' : (m.sender_username || `Pirate #${String(m.sender_id || '').slice(-5)}`)}</span>
                        <span style={{ fontSize: 10, color: T.textFaint, flexShrink: 0 }}>{new Date(m.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <Highlight text={m.content || ''} term={searchQuery.trim()} />
                    </button>
                  ))}
                </>}
            </div>
          )}
        </div>
      )}

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
              : <MessageBubble key={item.id} msg={item.msg} mine={item.msg.sender_id === discordId} grouped={item.grouped} isGroup={meta?.is_group} onReact={handleReact} onReply={setReplyTo} onEdit={(m) => { setEditing(m); setInput(m.content || '') }} onDelete={handleDelete} onPin={handlePin} onUnpin={handleUnpin} />)}
            {seenByPeer && messages.length > 0 && messages[messages.length - 1].sender_id === discordId && (
              <div style={{ textAlign: 'right', fontSize: 10, color: T.textFaint, padding: '3px 6px 0' }}>Vu ✓✓</div>
            )}
            {typingName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <div style={{ padding: '11px 15px', borderRadius: 16, background: T.theirBg, border: `1px solid ${T.theirBorder}`, display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: T.textDim, animation: `typingDot 1.1s ${i * 0.16}s infinite` }} />)}
                </div>
                <span style={{ fontSize: 11, color: T.textFaint }}>{typingName} écrit…</span>
              </div>
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

// ── Écran d'accueil messagerie (aucune conversation sélectionnée) ─────────────
function EmptyMessages({ friends, requests, onOpenFriend, onTab, navigate }) {
  const incoming = requests?.incoming?.length || 0
  const suggestions = (friends || []).slice(0, 4)
  const actions = [
    { icon: '✍️', label: 'Nouveau message', desc: 'Écris à un nakama', onClick: () => onTab('friends') },
    { icon: '📥', label: 'Voir les demandes', desc: incoming ? `${incoming} en attente` : 'Aucune en attente', onClick: () => onTab('requests'), badge: incoming },
    { icon: '🧭', label: 'Trouver un ami', desc: 'Explorer les membres', onClick: () => navigate('/amis') },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32, gap: 22, textAlign: 'center' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', inset: -18, borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,108,255,0.18), transparent 70%)' }} />
        <div style={{ position: 'relative', width: 78, height: 78, borderRadius: '50%', background: T.violetSoft, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>💬</div>
      </div>
      <div>
        <div style={{ fontSize: 21, fontWeight: 800, color: T.text, marginBottom: 6 }}>Ta messagerie Brams</div>
        <div style={{ fontSize: 13.5, color: T.textDim, lineHeight: 1.6, maxWidth: 360 }}>Discute avec tes nakamas, réponds aux demandes et lance de nouvelles conversations.</div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 560 }}>
        {actions.map(a => (
          <button key={a.label} onClick={a.onClick} style={{ position: 'relative', width: 168, textAlign: 'left', padding: '14px 16px', borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = T.surface2; e.currentTarget.style.borderColor = T.borderHi; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = 'none' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{a.icon}</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>{a.label}</div>
            <div style={{ fontSize: 11.5, color: T.textFaint, marginTop: 2 }}>{a.desc}</div>
            {a.badge > 0 && <span style={{ position: 'absolute', top: 12, right: 12, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: T.gold, color: '#0b0c0e', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{a.badge}</span>}
          </button>
        ))}
      </div>

      {suggestions.length > 0 && (
        <div style={{ width: '100%', maxWidth: 420, marginTop: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: T.textFaint, marginBottom: 10 }}>Suggestions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {suggestions.map(f => (
              <button key={f.user_id} onClick={() => onOpenFriend(f.user_id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 12, background: T.surface, border: `1px solid ${T.border}`, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = T.surface2}
                onMouseLeave={e => e.currentTarget.style.background = T.surface}>
                <Avatar url={f.avatar_url} name={f.username} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.username || `Pirate #${String(f.user_id).slice(-5)}`}</div>
                  <div style={{ fontSize: 11.5, color: T.textFaint }}>Envoyer un message</div>
                </div>
                <span style={{ color: T.gold, fontSize: 16 }}>💬</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { refreshCounts, counts } = useSocial()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [conversations, setConversations] = useState([])
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] })
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadedOnce = useRef(false)   // le skeleton ne s'affiche qu'au 1er chargement
  const convInflight = useRef(false) // évite les fetchs qui se chevauchent (anti-boucle)

  // Récupère les conversations sans toucher au skeleton (refresh silencieux).
  const refreshConversations = useCallback(async () => {
    if (!isAuthenticated || convInflight.current) return
    convInflight.current = true
    try {
      const c = await listConversations()
      setConversations(Array.isArray(c) ? c : [])
    } catch { /* rpc gère déjà timeout/erreur */ }
    finally { convInflight.current = false; loadedOnce.current = true; setLoading(false) }
  }, [isAuthenticated])

  const load = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    if (!loadedOnce.current) setLoading(true)   // skeleton uniquement la 1re fois
    refreshConversations()
    // Amis + demandes en arrière-plan (alimentent les autres onglets, non bloquant).
    listFriends().then(f => setFriends(Array.isArray(f) ? f : [])).catch(() => {})
    listFriendRequests().then(r => setRequests(r && typeof r === 'object' ? r : { incoming: [], outgoing: [] })).catch(() => {})
  }, [isAuthenticated, refreshConversations])
  useEffect(() => { load() }, [load])

  // Filet de sécurité : le skeleton ne doit JAMAIS rester affiché indéfiniment,
  // même si un fetch part en vrille. Au pire, on coupe le chargement après 4s.
  useEffect(() => {
    const t = setTimeout(() => { loadedOnce.current = true; setLoading(false) }, 4000)
    return () => clearTimeout(t)
  }, [])

  // ── Liste EN LIVE : refresh silencieux sur nouvelle notif, focus, et poll 10s ──
  const onlyVisible = useCallback(() => { if (!document.hidden) refreshConversations() }, [refreshConversations])
  const countsSig = `${counts.messages}|${counts.notifications}`
  useEffect(() => { if (loadedOnce.current) refreshConversations() }, [countsSig, refreshConversations])
  useEffect(() => {
    window.addEventListener('focus', onlyVisible)
    document.addEventListener('visibilitychange', onlyVisible)
    const id = setInterval(onlyVisible, 10000)
    return () => {
      window.removeEventListener('focus', onlyVisible)
      document.removeEventListener('visibilitychange', onlyVisible)
      clearInterval(id)
    }
  }, [onlyVisible])

  async function openFriend(userId) {
    const res = await getOrCreateDm(userId)
    if (res?.ok) { navigate(`/messages/${res.conversation_id}`); load() }
  }
  async function createGroup(title, memberIds) {
    const res = await createGroupConversation(title, memberIds)
    if (res?.ok) { navigate(`/messages/${res.conversation_id}`); load() }
    else if (res?.error) alert(res.error)
  }
  async function respond(reqId, accept) { await respondFriendRequest(reqId, accept); await load(); refreshCounts() }

  const activeMeta = conversations.find(c => c.conversation_id === conversationId)

  if (!isAuthenticated) {
    return <div style={{ minHeight: '100vh', background: T.bg }}><Navbar /><div style={{ padding: '90px 20px', textAlign: 'center', color: T.textFaint }}>Connecte-toi pour accéder à tes messages.</div></div>
  }

  const showSidebar = !isMobile || !conversationId
  const showChat = !isMobile || !!conversationId

  return (
    <div style={{ minHeight: '100vh', background: T.bg, position: 'relative', zIndex: 1 }}>
      <Navbar />
      <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} } @keyframes typingDot { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-4px);opacity:1} }`}</style>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: isMobile ? '64px 0 0' : '76px 16px 20px', height: isMobile ? '100dvh' : 'calc(100dvh - 16px)' }}>
        <div style={{ display: 'flex', height: '100%', borderRadius: isMobile ? 0 : 18, overflow: 'hidden', border: isMobile ? 'none' : `1px solid ${T.border}`, background: 'rgba(255,255,255,0.012)' }}>
          {showSidebar && (
            <div style={{ width: isMobile ? '100%' : 340, flexShrink: 0, borderRight: isMobile ? 'none' : `1px solid ${T.border}`, background: T.panel }}>
              <ConversationList
                conversations={conversations} friends={friends} requests={requests}
                activeId={conversationId} tab={tab} setTab={setTab} search={search} setSearch={setSearch}
                loading={loading} onSelect={(id) => navigate(`/messages/${id}`)} onOpenFriend={openFriend}
                onRespond={respond} onCreateGroup={createGroup} navigate={navigate} isMobile={isMobile}
              />
            </div>
          )}
          {showChat && (
            <div style={{ flex: 1, minWidth: 0 }}>
              {conversationId
                ? <ChatView conversationId={conversationId} meta={activeMeta} isMobile={isMobile} onBack={() => navigate('/messages')} refreshList={load} />
                : <EmptyMessages friends={friends} requests={requests} onOpenFriend={openFriend} onTab={setTab} navigate={navigate} />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
