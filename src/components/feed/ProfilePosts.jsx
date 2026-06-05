import { useState, useEffect, useCallback, useRef } from 'react'
import { getUserPosts } from '../../lib/feed.js'
import PostCard from './PostCard.jsx'
import QuoteModal from './QuoteModal.jsx'
import { T } from '../social/socialStyles.js'

function patch(list, id, partial) {
  return list.map(p => p.id === id ? { ...p, ...partial } : (p.original?.id === id ? { ...p, original: { ...p.original, ...partial } } : p))
}

// Onglet "Posts" d'un profil : les publications du membre dans le Fil.
export default function ProfilePosts({ userId }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [quoteTarget, setQuoteTarget] = useState(null)
  const refreshTimer = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    const list = await getUserPosts(userId)
    setPosts(Array.isArray(list) ? list : []); setHasMore(list.length >= 20); setLoading(false)
  }, [userId])

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
    const t = setInterval(() => {
      if (!document.hidden) scheduleLoad(0)
    }, 45000)
    return () => clearInterval(t)
  }, [scheduleLoad])

  useEffect(() => () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
  }, [])

  async function loadMore() {
    if (!hasMore || !posts.length) return
    const older = await getUserPosts(userId, posts[posts.length - 1].created_at)
    setPosts(prev => [...prev, ...older.filter(o => !prev.some(p => p.id === o.id))])
    setHasMore(older.length >= 20)
  }

  const onChange = (id, partial) => setPosts(prev => patch(prev, id, partial))
  const onDeleted = (rowId) => setPosts(prev => prev.filter(p => p.id !== rowId))

  if (loading) return <div style={{ padding: '36px 8px', textAlign: 'center', color: T.textFaint, fontSize: 13 }}>Chargement des posts…</div>
  if (posts.length === 0) return (
    <div style={{ padding: '44px 16px', textAlign: 'center', color: T.textFaint, fontSize: 14, lineHeight: 1.7 }}>
      <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.5 }}>🪶</div>
      Aucun post pour l'instant.
    </div>
  )

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.012)' }}>
      {posts.map(p => <PostCard key={p.id} post={p} onChange={onChange} onDeleted={onDeleted} onQuote={setQuoteTarget} hideRepostSave />)}
      {hasMore && (
        <button onClick={loadMore} style={{ width: '100%', padding: 14, border: 'none', background: 'transparent', color: T.gold, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
          Charger plus
        </button>
      )}
      <QuoteModal quote={quoteTarget} onClose={() => setQuoteTarget(null)} onPosted={load} />
    </div>
  )
}
