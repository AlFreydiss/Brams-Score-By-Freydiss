import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { getFeed, getPost, subscribeFeed } from '../lib/feed.js'
import PostComposer from './feed/PostComposer.jsx'
import PostCard from './feed/PostCard.jsx'
import QuoteModal from './feed/QuoteModal.jsx'
import { T } from './social/socialStyles.js'

const COL = { maxWidth: 600, margin: '0 auto', minHeight: '100vh', borderLeft: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}` }

// Met à jour un post dans la liste (gère aussi l'original d'un repost).
function patch(posts, id, partial) {
  return posts.map(p => {
    if (p.id === id) return { ...p, ...partial }
    if (p.original?.id === id) return { ...p, original: { ...p.original, ...partial } }
    return p
  })
}

export default function FeedPage() {
  const { isAuthenticated, discordId } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [newCount, setNewCount] = useState(0)
  const [quoteTarget, setQuoteTarget] = useState(null)
  const loadingMore = useRef(false)
  const seen = useRef(new Set())

  const reload = useCallback(async () => {
    setLoading(true)
    const list = await getFeed(null)
    seen.current = new Set(list.map(p => p.id))
    setPosts(list); setHasMore(list.length >= 20); setNewCount(0); setLoading(false)
  }, [])
  useEffect(() => { reload() }, [reload])

  // Realtime : un nouveau post racine d'un autre → pastille "nouveaux posts".
  useEffect(() => {
    const unsub = subscribeFeed((row) => {
      if (row.reply_to || row.repost_of) { /* réponses/reposts : ignorés ici */ }
      if (!row.reply_to && row.author_id !== discordId && !seen.current.has(row.id)) {
        seen.current.add(row.id)
        setNewCount(n => n + 1)
      }
    })
    return unsub
  }, [discordId])

  async function loadMore() {
    if (loadingMore.current || !hasMore || !posts.length) return
    loadingMore.current = true
    const older = await getFeed(posts[posts.length - 1].created_at)
    older.forEach(p => seen.current.add(p.id))
    setPosts(prev => [...prev, ...older.filter(o => !prev.some(p => p.id === o.id))])
    setHasMore(older.length >= 20)
    loadingMore.current = false
  }
  function onScroll(e) {
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 600) loadMore()
  }

  const onChange = (id, partial) => setPosts(prev => patch(prev, id, partial))
  const onDeleted = (rowId) => setPosts(prev => prev.filter(p => p.id !== rowId))
  async function onPosted(newId) {
    const r = await getPost(newId)
    if (r?.post) { seen.current.add(r.post.id); setPosts(prev => [r.post, ...prev.filter(p => p.id !== r.post.id)]) }
  }

  return (
    <div onScroll={onScroll} style={{ height: 'calc(100vh - 72px)', marginTop: 72, overflowY: 'auto', background: T.bg }}>
      <div>
        <div style={COL}>
          <div style={{ position: 'sticky', top: 0, zIndex: 5, padding: '16px 16px 12px', background: 'rgba(8,9,13,0.82)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}` }}>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 900, color: T.text }}>Le Fil 🏴‍☠️</h1>
          </div>

          {isAuthenticated ? <PostComposer onPosted={onPosted} /> : (
            <div style={{ padding: '18px 16px', borderBottom: `1px solid ${T.border}`, color: T.textDim, fontSize: 14, textAlign: 'center' }}>
              Connecte-toi pour publier dans le fil.
            </div>
          )}

          {newCount > 0 && (
            <button onClick={reload} style={{ width: '100%', padding: '12px', border: 'none', borderBottom: `1px solid ${T.border}`, background: 'rgba(212,160,23,0.08)', color: T.gold, fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
              ↑ {newCount} nouveau{newCount > 1 ? 'x' : ''} post{newCount > 1 ? 's' : ''}
            </button>
          )}

          {loading ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: T.textFaint }}>Chargement du fil…</div>
          ) : posts.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: T.textFaint, fontSize: 14, lineHeight: 1.7 }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>🪶</div>
              Le fil est vide.<br />Sois le premier à poster, nakama !
            </div>
          ) : (
            <>
              {posts.map(p => <PostCard key={p.id} post={p} onChange={onChange} onDeleted={onDeleted} onQuote={setQuoteTarget} />)}
              {hasMore && <div style={{ padding: 20, textAlign: 'center', color: T.textFaint, fontSize: 13 }}>Chargement…</div>}
              {!hasMore && <div style={{ padding: 28, textAlign: 'center', color: T.textFaint, fontSize: 12 }}>Tu as tout vu 🏁</div>}
            </>
          )}
        </div>
      </div>
      <QuoteModal quote={quoteTarget} onClose={() => setQuoteTarget(null)} onPosted={onPosted} />
    </div>
  )
}
