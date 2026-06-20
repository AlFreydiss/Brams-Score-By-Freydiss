import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { staffListMessages, staffSendMessage, staffDeleteMessage, subscribeStaffChat } from '../../lib/social.js'
import { isCreator } from '../../lib/roles.js'
import { btn, avatar, T } from './socialStyles.js'

function dayLabel(iso) {
  const d = new Date(iso), now = new Date()
  const same = (a, b) => a.toDateString() === b.toDateString()
  if (same(d, now)) return "Aujourd'hui"
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (same(d, y)) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}
const timeLabel = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const dedupe = (l) => { const s = new Set(); return l.filter(m => s.has(m.id) ? false : (s.add(m.id), true)) }

export default function StaffChat() {
  const { discordId, displayName } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const scrollToBottom = useCallback((s) => requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: s ? 'smooth' : 'auto' })), [])

  useEffect(() => {
    let active = true
    staffListMessages().then(m => { if (active) { setMessages(m); setLoading(false); scrollToBottom() } })
    const unsub = subscribeStaffChat(
      (m) => { setMessages(prev => dedupe([...prev, m])); scrollToBottom(true) },
      (old) => setMessages(prev => prev.filter(x => x.id !== old.id)),
    )
    const iv = setInterval(async () => {
      if (document.hidden) return
      const recent = await staffListMessages()
      setMessages(prev => {
        const known = new Map(prev.map(m => [m.id, m])); let changed = false
        for (const m of recent) if (!known.has(m.id)) { known.set(m.id, m); changed = true }
        return changed ? Array.from(known.values()).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) : prev
      })
    }, 5000)
    return () => { active = false; unsub(); clearInterval(iv) }
  }, [scrollToBottom])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    try {
      const res = await staffSendMessage(text)
      if (res?.message_id) { setMessages(prev => dedupe([...prev, { id: res.message_id, sender_id: discordId, sender_name: displayName, content: text, created_at: new Date().toISOString() }])); scrollToBottom(true) }
      setInput('')
    } finally { setSending(false) }
  }
  async function del(id) {
    const res = await staffDeleteMessage(id)
    if (res?.ok) setMessages(prev => prev.filter(m => m.id !== id))
  }

  const rendered = useMemo(() => {
    const out = []; let lastDay = null
    for (const m of messages) {
      const d = dayLabel(m.created_at)
      if (d !== lastDay) { out.push({ sep: d, id: `s-${m.id}` }); lastDay = d }
      out.push({ msg: m, id: m.id })
    }
    return out
  }, [messages])

  const canDelete = (m) => m.sender_id === discordId || isCreator(discordId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'min(620px, 70vh)', borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.border}`, background: T.panel }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>🛡️</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>QG Staff</div>
          <div style={{ fontSize: 11, color: T.textFaint }}>Salon privé · staff uniquement</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
        {loading ? <div style={{ padding: 30, textAlign: 'center', color: T.textFaint, fontSize: 13 }}>Chargement…</div>
          : messages.length === 0 ? <div style={{ padding: '48px 20px', textAlign: 'center', color: T.textFaint, fontSize: 14 }}>🏴‍☠️<br />Le QG est calme pour l'instant.</div>
          : rendered.map(item => item.sep
            ? <div key={item.id} style={{ textAlign: 'center', margin: '14px 0 8px' }}><span style={{ fontSize: 11, color: T.textFaint, background: T.surface, padding: '3px 12px', borderRadius: 10 }}>{item.sep}</span></div>
            : (() => {
                const m = item.msg, mine = m.sender_id === discordId
                return (
                  <div key={item.id} style={{ display: 'flex', gap: 10, marginBottom: 12, flexDirection: mine ? 'row-reverse' : 'row' }}>
                    <span style={avatar(34)}>{m.sender_avatar ? <img loading="lazy" decoding="async" src={m.sender_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (m.sender_name || '?').slice(0, 2).toUpperCase()}</span>
                    <div style={{ maxWidth: '72%', textAlign: mine ? 'right' : 'left' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2, flexDirection: mine ? 'row-reverse' : 'row' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: isCreator(m.sender_id) ? T.gold : T.text }}>{m.sender_name || `#${String(m.sender_id).slice(-5)}`}</span>
                        {isCreator(m.sender_id) && <span style={{ fontSize: 8.5, fontWeight: 800, background: 'rgba(212,160,23,0.18)', color: T.gold, borderRadius: 5, padding: '1px 6px' }}>OWNER</span>}
                        <span style={{ fontSize: 10, color: T.textFaint }}>{timeLabel(m.created_at)}</span>
                        {canDelete(m) && <button onClick={() => del(m.id)} title="Supprimer" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: T.textFaint, fontSize: 11 }}>🗑</button>}
                      </div>
                      <div style={{ display: 'inline-block', padding: '8px 12px', borderRadius: 14, background: mine ? T.mineBg : T.theirBg, border: `1px solid ${mine ? T.mineBorder : T.theirBorder}`, color: T.text, fontSize: 14, lineHeight: 1.45, wordBreak: 'break-word', textAlign: 'left' }}>{m.content}</div>
                    </div>
                  </div>
                )
              })())}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: `1px solid ${T.border}`, alignItems: 'flex-end' }}>
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Message au staff…" rows={1}
          style={{ flex: 1, resize: 'none', maxHeight: 120, padding: '11px 15px', borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, color: T.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', lineHeight: 1.4, boxSizing: 'border-box' }} />
        <button onClick={send} disabled={sending || !input.trim()} style={{ ...btn('gold'), padding: '11px 16px', height: 44, opacity: (sending || !input.trim()) ? 0.5 : 1 }}>➤</button>
      </div>
    </div>
  )
}
