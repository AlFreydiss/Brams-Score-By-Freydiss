import PostComposer from './PostComposer.jsx'
import { T } from '../social/socialStyles.js'

// Modal de citation (quote-repost) : commentaire + aperçu de l'original.
export default function QuoteModal({ quote, onClose, onPosted }) {
  if (!quote) return null
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(4,5,8,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '80px 16px 16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 540, background: '#0d0e13', border: `1px solid ${T.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Citer ce post</span>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: T.textDim, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <PostComposer quote={quote} autoFocus onPosted={(id) => { onPosted?.(id); onClose() }} />
      </div>
    </div>
  )
}
