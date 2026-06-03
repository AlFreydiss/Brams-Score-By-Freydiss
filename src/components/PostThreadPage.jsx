import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPost, subscribeFeed } from '../lib/feed.js'
import PostComposer from './feed/PostComposer.jsx'
import PostCard from './feed/PostCard.jsx'
import QuoteModal from './feed/QuoteModal.jsx'
import { T } from './social/socialStyles.js'

const COL = { maxWidth: 600, margin: '0 auto', minHeight: '100vh', borderLeft: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}` }

function patch(list, id, partial) {
  return list.map(p => p.id === id ? { ...p, ...partial } : (p.original?.id === id ? { ...p, original: { ...p.original, ...partial } } : p))
}

export default function PostThreadPage() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [quoteTarget, setQuoteTarget] = useState(null)
  const refreshTimer = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    setNotFound(false)
    const r = await getPost(postId)
    if (!r?.post) { setNotFound(true); setLoading(false); return }
    setPost(r.post); setReplies(r.replies || []); setLoading(false)
  }, [postId])

  const scheduleLoad = useCallback((delay = 150) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null
      load()
    }, delay)
  }, [load])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const onFocus = () => scheduleLoad(100)
    const onVisible = () => { if (!document.hidden) scheduleLoad(100) }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [scheduleLoad])

  useEffect(() => {
    const unsub = subscribeFeed(({ type, row, old }) => {
      const target = row || old
      if (!target) return
      const threadId = String(postId)
      const matchesThread = String(target.id) === threadId || String(target.reply_to || '') === threadId || String(old?.reply_to || '') === threadId
      if (matchesThread || type === 'DELETE') scheduleLoad(120)
    })
    return unsub
  }, [postId, scheduleLoad])

  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) scheduleLoad(0)
    }, 45000)
    return () => clearInterval(t)
  }, [scheduleLoad])

  useEffect(() => () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
  }, [])

  const changePost = (id, partial) => setPost(prev => prev && (prev.id === id ? { ...prev, ...partial } : prev))
  const changeReply = (id, partial) => setReplies(prev => patch(prev, id, partial))
  const onPosted = () => scheduleLoad(120)   // recharge le thread (nouvelle réponse)

  return (
    <div style={{ height: 'calc(100dvh - 72px)', marginTop: 72, overflowY: 'auto', background: T.bg }}>
      <div>
        <div style={COL}>
          <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'rgba(8,9,13,0.82)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}` }}>
            <button onClick={() => navigate('/fil')} style={{ border: 'none', background: 'transparent', color: T.text, cursor: 'pointer', fontSize: 18 }}>←</button>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>Post</h1>
          </div>

          {loading ? <div style={{ padding: '48px 16px', textAlign: 'center', color: T.textFaint }}>Chargement…</div>
            : notFound ? <div style={{ padding: '60px 24px', textAlign: 'center', color: T.textFaint }}>Ce post n'existe plus.</div>
            : <>
              <PostCard post={post} disableNav onChange={changePost} onDeleted={() => navigate('/fil')} onQuote={setQuoteTarget} />
              <PostComposer replyTo={post.repost_of && post.original ? post.original.id : post.id} onPosted={onPosted} autoFocus={false} />
              {replies.length === 0
                ? <div style={{ padding: '36px 16px', textAlign: 'center', color: T.textFaint, fontSize: 13 }}>Aucune réponse. Lance la discussion 🗣️</div>
                : replies.map(r => <PostCard key={r.id} post={r} onChange={changeReply} onDeleted={(id) => setReplies(prev => prev.filter(x => x.id !== id))} onQuote={setQuoteTarget} />)}
            </>}
        </div>
      </div>
      <QuoteModal quote={quoteTarget} onClose={() => setQuoteTarget(null)} onPosted={onPosted} />
    </div>
  )
}
