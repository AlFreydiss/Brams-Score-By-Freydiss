import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { listActiveStories, createStory, uploadAttachment } from '../../lib/feed.js'
import StoryViewer from './StoryViewer.jsx'
import { avatar, T } from '../social/socialStyles.js'

const ALLOWED_IMG = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export default function StoriesBar() {
  const { isAuthenticated, displayName, avatarUrl } = useAuth()
  const [authors, setAuthors] = useState([])
  const [viewerIdx, setViewerIdx] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const refreshRef = useRef(null)

  const load = useCallback(() => { listActiveStories().then(a => setAuthors(Array.isArray(a) ? a : [])) }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    const schedule = () => {
      clearTimeout(refreshRef.current)
      refreshRef.current = setTimeout(load, 120)
    }
    const onVisible = () => { if (!document.hidden) schedule() }
    window.addEventListener('focus', schedule)
    document.addEventListener('visibilitychange', onVisible)
    const iv = setInterval(() => { if (!document.hidden) load() }, 30000)
    return () => {
      window.removeEventListener('focus', schedule)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(iv)
      clearTimeout(refreshRef.current)
    }
  }, [load])

  async function onPick(e) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    if (!ALLOWED_IMG.includes(f.type)) { alert('Format image non supporté'); return }
    if (f.size > 30 * 1024 * 1024) { alert('Image trop lourde (max 30 Mo)'); return }
    setUploading(true)
    try {
      const up = await uploadAttachment(f)
      if (up.error) { alert(up.error); return }
      const res = await createStory(up.url)
      if (res?.ok) load()
      else if (res?.error) alert(res.error)
    } finally { setUploading(false) }
  }

  // Rien à afficher si pas connecté et aucune story
  if (!isAuthenticated && authors.length === 0) return null

  const Ring = ({ children, seen }) => (
    <div style={{ padding: 2, borderRadius: '50%', background: seen ? 'rgba(255,255,255,.18)' : 'linear-gradient(135deg, #d4a017, #9b6cff)' }}>
      <div style={{ padding: 2, borderRadius: '50%', background: T.bg }}>{children}</div>
    </div>
  )

  return (
    <div className="stories-scroll" style={{ display: 'flex', gap: 14, padding: '14px 16px', borderBottom: `1px solid ${T.border}`, overflowX: 'auto' }}>
      <style>{`.stories-scroll::-webkit-scrollbar{display:none}`}</style>
      {isAuthenticated && (
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0, width: 64 }}>
          <div style={{ position: 'relative' }}>
            <span style={{ ...avatar(58), opacity: uploading ? 0.5 : 1 }}>{avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (displayName || '?').slice(0, 2).toUpperCase()}</span>
            <span style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: T.gold, color: '#0b0c0e', fontSize: 15, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${T.bg}` }}>+</span>
          </div>
          <span style={{ fontSize: 11, color: T.textDim, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 64 }}>{uploading ? '…' : 'Ta story'}</span>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onPick} style={{ display: 'none' }} />
        </button>
      )}

      {authors.map((a, i) => (
        <button key={a.author_id} onClick={() => setViewerIdx(i)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0, width: 64 }}>
          <Ring seen={a.all_seen}><span style={avatar(54)}>{a.avatar ? <img src={a.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (a.username || '?').slice(0, 2).toUpperCase()}</span></Ring>
          <span style={{ fontSize: 11, color: T.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 64 }}>{a.username || `#${String(a.author_id).slice(-4)}`}</span>
        </button>
      ))}

      {viewerIdx !== null && (
        <StoryViewer authors={authors} startIndex={viewerIdx} onClose={() => setViewerIdx(null)} onDeleted={load} onSeen={load} />
      )}
    </div>
  )
}
