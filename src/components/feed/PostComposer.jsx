import { useState, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { createPost, uploadAttachment } from '../../lib/feed.js'
import { btn, avatar, T } from '../social/socialStyles.js'

const MAX = 500
const ALLOWED_IMG = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

// Composer de post / réponse / citation. onPosted(newPostId) après succès.
// quote : post original cité (repost avec commentaire).
export default function PostComposer({ replyTo = null, quote = null, onPosted, placeholder, autoFocus = false }) {
  const { isAuthenticated, displayName, avatarUrl } = useAuth()
  const [text, setText] = useState('')
  const [attach, setAttach] = useState(null)   // { file, preview } | { error }
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  if (!isAuthenticated) return null

  function pickFile(e) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    if (!ALLOWED_IMG.includes(f.type)) { setAttach({ error: 'Format image non supporté' }); return }
    if (f.size > 30 * 1024 * 1024) { setAttach({ error: 'Image trop lourde (max 30 Mo)' }); return }
    setAttach({ file: f, preview: URL.createObjectURL(f) })
  }

  async function submit() {
    if (busy) return
    const content = text.trim()
    if (!content && !attach?.file && !quote) return
    setBusy(true)
    try {
      let mediaUrl = null
      if (attach?.file) {
        const up = await uploadAttachment(attach.file)
        if (up.error) { setAttach({ error: up.error }); setBusy(false); return }
        mediaUrl = up.url
      }
      const res = await createPost({ content: content || null, mediaUrl, replyTo, repostOf: quote?.id || null })
      if (res?.ok) { setText(''); setAttach(null); onPosted?.(res.post_id) }
      else if (res?.error) alert(res.error)
    } finally { setBusy(false) }
  }

  const over = text.length > MAX
  return (
    <div style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
      <span style={avatar(42)}>{avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (displayName || '?').slice(0, 2).toUpperCase()}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <textarea
          value={text} onChange={e => setText(e.target.value)} autoFocus={autoFocus}
          onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit() }}
          placeholder={placeholder || (quote ? 'Ajoute un commentaire…' : replyTo ? 'Poste ta réponse…' : 'Quoi de neuf, nakama ?')}
          rows={replyTo || quote ? 2 : 3}
          style={{ width: '100%', resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: T.text, fontSize: 16, fontFamily: 'inherit', lineHeight: 1.45, boxSizing: 'border-box' }}
        />
        {quote && (
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, padding: '10px 12px', marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <span style={avatar(20)}>{quote.author_avatar ? <img src={quote.author_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (quote.author_username || '?').slice(0, 2).toUpperCase()}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{quote.author_username || `Pirate #${String(quote.author_id || '').slice(-5)}`}</span>
            </div>
            <div style={{ fontSize: 13, color: T.textDim, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{quote.content || (quote.media_url ? '🖼️ Image' : '')}</div>
          </div>
        )}
        {attach?.preview && (
          <div style={{ position: 'relative', display: 'inline-block', marginTop: 8 }}>
            <img src={attach.preview} alt="" style={{ maxWidth: 220, maxHeight: 220, borderRadius: 12, border: `1px solid ${T.border}` }} />
            <button onClick={() => setAttach(null)} style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.7)', color: '#fff', cursor: 'pointer', fontSize: 13 }}>✕</button>
          </div>
        )}
        {attach?.error && <div style={{ fontSize: 12, color: T.red, marginTop: 6 }}>⚠️ {attach.error}</div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={pickFile} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} title="Image" style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: T.gold, padding: 4, borderRadius: 8 }}>🖼️</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: over ? T.red : T.textFaint, fontVariantNumeric: 'tabular-nums' }}>{text.length}/{MAX}</span>
            <button onClick={submit} disabled={busy || over || (!text.trim() && !attach?.file && !quote)} style={{ ...btn('gold'), padding: '8px 18px', opacity: (busy || over || (!text.trim() && !attach?.file && !quote)) ? 0.5 : 1 }}>
              {busy ? '…' : (quote ? 'Citer' : replyTo ? 'Répondre' : 'Poster')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
