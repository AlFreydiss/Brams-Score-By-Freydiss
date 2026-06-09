import { useState, useEffect, useCallback, useRef } from 'react'
import { getUserPosts, getMyBookmarks } from '../../lib/feed.js'
import PostCard from './PostCard.jsx'
import QuoteModal from './QuoteModal.jsx'
import { T } from '../social/socialStyles.js'

function patch(list, id, partial) {
  return list.map(p => p.id === id ? { ...p, ...partial } : (p.original?.id === id ? { ...p, original: { ...p.original, ...partial } } : p))
}

const EMPTY = {
  all:     { icon: '🪶', text: "Aucune publication pour l'instant." },
  reposts: { icon: '🔁', text: 'Aucun repost pour le moment.' },
  saved:   { icon: '🔖', text: 'Aucun post sauvegardé.' },
}

// Onglet posts d'un profil — flux vertical type Twitter (posts + reposts/RT).
// mode: 'all' (tout, chrono) | 'reposts' (uniquement les reposts) | 'saved' (signets).
export default function ProfilePosts({ userId, mode = 'all' }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [quoteTarget, setQuoteTarget] = useState(null)
  const refreshTimer = useRef(null)

  const fetchPage = useCallback((before = null) => (
    mode === 'saved' ? getMyBookmarks(before) : getUserPosts(userId, before)
  ), [userId, mode])

  const load = useCallback(async () => {
    setLoading(true)
    let list
    try {
      // Garde-fou timeout pour éviter "chargement à mort" sur certains profils
      const p = fetchPage()
      const timeout = new Promise(resolve => setTimeout(() => resolve([]), 9500))
      list = await Promise.race([p, timeout])
    } catch {
      list = []
    }
    list = Array.isArray(list) ? list : []
    if (mode === 'reposts') list = list.filter(p => p.repost_of)
    setPosts(list); setHasMore(list.length >= 20); setLoading(false)
  }, [fetchPage, mode])

  const scheduleLoad = useCallback((delay = 150) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => { refreshTimer.current = null; load() }, delay)
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
    const t = setInterval(() => { if (!document.hidden) scheduleLoad(0) }, 45000)
    return () => clearInterval(t)
  }, [scheduleLoad])

  useEffect(() => () => { if (refreshTimer.current) clearTimeout(refreshTimer.current) }, [])

  async function loadMore() {
    if (!hasMore || !posts.length) return
    let older = await fetchPage(posts[posts.length - 1].created_at)
    older = Array.isArray(older) ? older : []
    if (mode === 'reposts') older = older.filter(p => p.repost_of)
    setPosts(prev => [...prev, ...older.filter(o => !prev.some(p => p.id === o.id))])
    setHasMore(older.length >= 20)
  }

  const onChange = (id, partial) => setPosts(prev => patch(prev, id, partial))
  const onDeleted = (rowId) => setPosts(prev => prev.filter(p => p.id !== rowId))

  if (loading) return <div style={{ padding: '36px 8px', textAlign: 'center', color: T.textFaint, fontSize: 13 }}>Chargement…</div>
  if (posts.length === 0) {
    const e = EMPTY[mode] || EMPTY.all
    return (
      <div style={{ padding: '44px 16px', textAlign: 'center', color: T.textFaint, fontSize: 14, lineHeight: 1.7 }}>
        <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.5 }}>{e.icon}</div>
        {e.text}
      </div>
    )
  }

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.012)' }}>
      {posts.map(p => <PostCard key={p.id} post={p} onChange={onChange} onDeleted={onDeleted} onQuote={setQuoteTarget} />)}
      {hasMore && (
        <button onClick={loadMore} style={{ width: '100%', padding: 14, border: 'none', background: 'transparent', color: T.gold, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
          Charger plus
        </button>
      )}
      <QuoteModal quote={quoteTarget} onClose={() => setQuoteTarget(null)} onPosted={load} />
    </div>
  )
}
