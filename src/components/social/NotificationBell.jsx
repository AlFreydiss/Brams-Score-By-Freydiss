import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocial } from '../../contexts/SocialContext.jsx'
import { listNotifications, markNotificationsRead } from '../../lib/social.js'
import { T } from './socialStyles.js'

const ICONS = {
  post_like: '❤️', post_reply: '💬', post_mention: '🏷️', post_repost: '🔁',
  friend_request: '👥', friend_accepted: '🤝', new_message: '✉️', message_pinned: '📌',
}
function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return "à l'instant"
  if (s < 3600) return `${Math.floor(s / 60)} min`
  if (s < 86400) return `${Math.floor(s / 3600)} h`
  if (s < 604800) return `${Math.floor(s / 86400)} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const { counts, refreshCounts } = useSocial()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)
  const total = counts.notifications || 0

  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const openPanel = useCallback(async () => {
    setOpen(true); setLoading(true)
    const list = await listNotifications(30)
    setItems(Array.isArray(list) ? list : []); setLoading(false)
    // Marque tout lu → vide le badge
    if (total > 0) { await markNotificationsRead(); refreshCounts() }
  }, [total, refreshCounts])

  function onItem(n) {
    setOpen(false)
    setItems(prev => prev.map(x => x.id === n.id ? { ...x, read_at: x.read_at || new Date().toISOString() } : x))
    if (n.link) navigate(n.link)
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button onClick={() => open ? setOpen(false) : openPanel()} aria-label="Notifications"
        style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)', fontSize: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        🔔
        {total > 0 && (
          <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 9, background: '#d4a017', color: '#0b0c0e', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{total > 99 ? '99+' : total}</span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 46, right: 0, zIndex: 300, width: 340, maxHeight: 440, overflowY: 'auto', background: '#16171d', border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: '0 16px 44px rgba(0,0,0,.6)' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontSize: 14, fontWeight: 800, color: T.text, position: 'sticky', top: 0, background: '#16171d' }}>Notifications</div>
          {loading ? <div style={{ padding: '28px', textAlign: 'center', color: T.textFaint, fontSize: 13 }}>Chargement…</div>
            : items.length === 0 ? <div style={{ padding: '40px 16px', textAlign: 'center', color: T.textFaint, fontSize: 13, lineHeight: 1.6 }}><div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>🔔</div>Aucune notification.</div>
            : items.map(n => (
              <button key={n.id} onClick={() => onItem(n)} style={{ display: 'flex', gap: 11, width: '100%', textAlign: 'left', padding: '11px 14px', border: 'none', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', fontFamily: 'inherit', background: n.read_at ? 'transparent' : 'rgba(212,160,23,0.06)' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{ICONS[n.type] || '🔔'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{n.title}</div>
                  {n.body && <div style={{ fontSize: 12.5, color: T.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>}
                  <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>{timeAgo(n.created_at)}</div>
                </div>
                {!n.read_at && <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.gold, flexShrink: 0, alignSelf: 'center' }} />}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
