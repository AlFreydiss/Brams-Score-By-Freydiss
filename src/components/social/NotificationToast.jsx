import { useNavigate } from 'react-router-dom'
import { useSocial } from '../../contexts/SocialContext.jsx'
import { T } from './socialStyles.js'

const ICONS = {
  friend_request:  '👥',
  friend_accepted: '🤝',
  new_message:     '💬',
}

// Toast discret en bas à droite — déclenché par une notif Realtime.
export default function NotificationToast() {
  const { toast, dismissToast } = useSocial()
  const navigate = useNavigate()
  if (!toast) return null

  return (
    <button
      onClick={() => { if (toast.link) navigate(toast.link); dismissToast() }}
      style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 10000,
        display: 'flex', alignItems: 'center', gap: 12, maxWidth: 340,
        padding: '12px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
        background: 'rgba(18,19,24,0.96)', border: `1px solid ${T.borderHi}`,
        backdropFilter: 'blur(8px)', boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
        color: T.text, fontFamily: 'inherit', animation: 'toastIn .25s ease',
      }}
    >
      <span style={{ fontSize: 20, flexShrink: 0 }}>{ICONS[toast.type] || '🔔'}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{toast.title}</span>
        {toast.body && <span style={{ display: 'block', fontSize: 12, color: T.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{toast.body}</span>}
      </span>
      <span onClick={(e) => { e.stopPropagation(); dismissToast() }} style={{ color: T.textFaint, fontSize: 14, padding: '0 2px' }}>✕</span>
      <style>{`@keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
    </button>
  )
}
