import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { getMyBookmarks } from '../lib/feed.js'
import PostCard from './feed/PostCard.jsx'
import QuoteModal from './feed/QuoteModal.jsx'
import { T } from './social/socialStyles.js'

const COL = { maxWidth: 600, margin: '0 auto', minHeight: '100vh', borderLeft: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}` }

function patch(list, id, partial) {
  return list.map(p => p.id === id ? { ...p, ...partial } : (p.original?.id === id ? { ...p, original: { ...p.original, ...partial } } : p))
}

export default function BookmarksPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [quoteTarget, setQuoteTarget] = useState(null)
  const refreshTimer = useRef(null)

  const load = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    setLoading(true)
    const list = await getMyBookmarks(null)
    setPosts(Array.isArray(list) ? list : []); setHasMore(list.length >= 20); setLoading(false)
  }, [isAuthenticated])

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
    const older = await getMyBookmarks(posts[posts.length - 1].created_at)
    setPosts(prev => [...prev, ...older.filter(o => !prev.some(p => p.id === o.id))])
    setHasMore(older.length >= 20)
  }

  const onChange = (id, partial) => setPosts(prev => patch(prev, id, partial))
  // Retiré des signets → on l'enlève de la liste
  const onBookmarkOff = (id, partial) => {
    if (partial.bookmarked === false) setPosts(prev => prev.filter(p => p.id !== id && p.original?.id !== id))
    else setPosts(prev => patch(prev, id, partial))
  }
  const onDeleted = (rowId) => setPosts(prev => prev.filter(p => p.id !== rowId))

  return (
    <div style={{ height: 'calc(100vh - 72px)', marginTop: 72, overflowY: 'auto', background: T.bg }}>
      <div>
        <div style={COL}>
          <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'rgba(8,9,13,0.82)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}` }}>
            <button onClick={() => navigate('/fil')} style={{ border: 'none', background: 'transparent', color: T.text, cursor: 'pointer', fontSize: 18 }}>←</button>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>🔖 Mes signets</h1>
          </div>

          {!isAuthenticated ? <div style={{ padding: '48px 24px', textAlign: 'center', color: T.textFaint, fontSize: 14 }}>Connecte-toi pour retrouver tes signets.</div>
            : loading ? <div style={{ padding: '48px 16px', textAlign: 'center', color: T.textFaint }}>Chargement…</div>
            : posts.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', color: T.textFaint, fontSize: 14, lineHeight: 1.7 }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>🔖</div>
                Aucun signet.<br />Touche le 📑 sous un post pour l'enregistrer ici.
              </div>
            ) : <>
              {posts.map(p => <PostCard key={p.id} post={p} onChange={onBookmarkOff} onDeleted={onDeleted} onQuote={setQuoteTarget} />)}
              {hasMore && <button onClick={loadMore} style={{ width: '100%', padding: 16, border: 'none', background: 'transparent', color: T.gold, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>Charger plus</button>}
            </>}
        </div>
      </div>
      <QuoteModal quote={quoteTarget} onClose={() => setQuoteTarget(null)} onPosted={load} />
    </div>
  )
}
