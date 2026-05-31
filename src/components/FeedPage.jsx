import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { getFeed, getPost, getFeedStats, subscribeFeed } from '../lib/feed.js'
import PostComposer from './feed/PostComposer.jsx'
import PostCard from './feed/PostCard.jsx'
import QuoteModal from './feed/QuoteModal.jsx'
import FeedRail from './feed/FeedRail.jsx'
import StoriesBar from './feed/StoriesBar.jsx'
import { T } from './social/socialStyles.js'

const COL = { flex: '1 1 600px', maxWidth: 600, minWidth: 0, minHeight: '100vh', borderLeft: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}`, background: 'rgba(10,11,16,0.55)', backdropFilter: 'blur(2px)' }

// Animations + responsive du Fil.
const FX = `
@keyframes feed-shimmer { 0%{background-position:-180% 0} 100%{background-position:180% 0} }
@keyframes feed-pulse { 0%,100%{transform:scale(1);opacity:.85} 50%{transform:scale(1.35);opacity:1} }
@keyframes feed-ring { 0%{transform:scale(.7);opacity:.55} 100%{transform:scale(2.6);opacity:0} }
@keyframes feed-fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
@media (max-width: 1000px){ .feed-rail{ display:none !important } }
@media (prefers-reduced-motion: reduce){ [data-fx]{animation:none !important} }
`

// Met à jour un post dans la liste (gère aussi l'original d'un repost).
function patch(posts, id, partial) {
  return posts.map(p => {
    if (p.id === id) return { ...p, ...partial }
    if (p.original?.id === id) return { ...p, original: { ...p.original, ...partial } }
    return p
  })
}

function LiveDot() {
  return (
    <span style={{ position: 'relative', width: 7, height: 7, display: 'inline-block', flexShrink: 0 }}>
      <span data-fx style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: T.gold, animation: 'feed-ring 2.4s ease-out infinite' }} />
      <span data-fx style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#ffd84d', animation: 'feed-pulse 2.4s ease-in-out infinite' }} />
    </span>
  )
}

function SkeletonPost() {
  const sh = { background: 'linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.09) 37%, rgba(255,255,255,.04) 63%)', backgroundSize: '200% 100%', animation: 'feed-shimmer 1.5s ease-in-out infinite' }
  return (
    <div style={{ display: 'flex', gap: 12, padding: '16px', borderBottom: `1px solid ${T.border}` }}>
      <div data-fx style={{ ...sh, width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 4 }}>
        <div data-fx style={{ ...sh, width: '42%', height: 11, borderRadius: 6 }} />
        <div data-fx style={{ ...sh, width: '92%', height: 10, borderRadius: 6 }} />
        <div data-fx style={{ ...sh, width: '70%', height: 10, borderRadius: 6 }} />
        <div data-fx style={{ ...sh, width: 160, height: 90, borderRadius: 12, marginTop: 4 }} />
      </div>
    </div>
  )
}

export default function FeedPage() {
  const { isAuthenticated, discordId, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [searchFocus, setSearchFocus] = useState(false)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [newCount, setNewCount] = useState(0)
  const [quoteTarget, setQuoteTarget] = useState(null)
  const [stats, setStats] = useState({ posts: 0 })
  const loadingMore = useRef(false)
  const seen = useRef(new Set())

  const reload = useCallback(async () => {
    setLoading(true); setError(null)
    const { posts: list, error: err } = await getFeed(null)
    if (err) { setError(err); setLoading(false); return }
    seen.current = new Set(list.map(p => p.id))
    setPosts(list); setHasMore(list.length >= 20); setNewCount(0); setLoading(false)
    getFeedStats().then(setStats)
  }, [])

  // On attend que l'auth soit résolue avant le 1er chargement : sinon getFeed part
  // en anonyme avant la restauration de session → le fil restait vide tant qu'on
  // n'actualisait pas. Se recharge aussi à la connexion/déconnexion (discordId).
  useEffect(() => { if (!authLoading) reload() }, [authLoading, discordId, reload])

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
    const { posts: older } = await getFeed(posts[posts.length - 1].created_at)
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
    <div onScroll={onScroll} style={{ position: 'relative', height: 'calc(100vh - 72px)', marginTop: 72, overflowY: 'auto', background: T.bg }}>
      <style>{FX}</style>
      {/* Fond ambiant : halos or + violet très diffus, donne de la profondeur (plus plat). */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, top: 72, zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(900px 480px at 22% -6%, rgba(212,160,23,.10), transparent 60%),
                     radial-gradient(820px 520px at 88% 8%, rgba(155,108,255,.09), transparent 62%),
                     radial-gradient(700px 700px at 50% 120%, rgba(212,160,23,.05), transparent 60%)` }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 28, maxWidth: 952, margin: '0 auto', alignItems: 'flex-start' }}>
        <div style={COL}>
          {/* ── Header premium ── */}
          <div style={{ position: 'sticky', top: 0, zIndex: 5, padding: '16px 16px 13px', background: 'rgba(8,9,13,0.78)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: '-.02em',
                background: `linear-gradient(95deg, ${T.gold}, ${T.goldSoft} 60%, #ffe9a8)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Le Fil
              </h1>
              <span style={{ fontSize: 17 }}>🏴‍☠️</span>
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 10, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: T.gold, padding: '4px 10px', borderRadius: 999, background: 'rgba(212,160,23,0.10)', border: `1px solid ${T.borderHi}` }}>
                <LiveDot /> En direct
              </span>
            </div>
            <form onSubmit={e => { e.preventDefault(); const q = search.trim(); if (q.length >= 2) navigate(`/fil/recherche?q=${encodeURIComponent(q)}`) }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocus(true)} onBlur={() => setSearchFocus(false)}
                placeholder="🔍 Rechercher dans le fil (#hashtag, mot-clé…)"
                style={{ width: '100%', padding: '11px 16px', borderRadius: 999, fontSize: 13,
                  background: searchFocus ? 'rgba(255,255,255,0.05)' : T.surface,
                  border: `1px solid ${searchFocus ? T.borderHi : T.border}`, color: T.text, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  boxShadow: searchFocus ? '0 0 0 3px rgba(212,160,23,0.10)' : 'none', transition: 'border-color .18s, box-shadow .18s, background .18s' }} />
            </form>
          </div>

          <StoriesBar />

          {isAuthenticated ? <PostComposer onPosted={onPosted} /> : (
            <div style={{ padding: '20px 16px', borderBottom: `1px solid ${T.border}`, color: T.textDim, fontSize: 14, textAlign: 'center' }}>
              Connecte-toi pour publier dans le fil.
            </div>
          )}

          {newCount > 0 && (
            <button onClick={reload} style={{ width: '100%', padding: '12px', border: 'none', borderBottom: `1px solid ${T.border}`, background: 'rgba(212,160,23,0.10)', color: T.gold, fontWeight: 800, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
              ↑ {newCount} nouveau{newCount > 1 ? 'x' : ''} post{newCount > 1 ? 's' : ''}
            </button>
          )}

          {loading ? (
            <div data-fx style={{ animation: 'feed-fadein .3s ease' }}>
              <SkeletonPost /><SkeletonPost /><SkeletonPost />
            </div>
          ) : error ? (
            <div style={{ padding: '52px 24px', textAlign: 'center', color: T.textFaint, fontSize: 14, lineHeight: 1.7 }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>⚠️</div>
              Le fil n'a pas pu se charger.<br />
              <span style={{ fontSize: 12, color: T.textFaint, opacity: 0.8 }}>{error}</span>
              <div>
                <button onClick={reload} style={{ marginTop: 18, padding: '10px 22px', borderRadius: 999, border: `1px solid ${T.borderHi}`, background: 'rgba(212,160,23,0.12)', color: T.gold, fontWeight: 800, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                  ↻ Réessayer
                </button>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center', color: T.textFaint, fontSize: 14, lineHeight: 1.7 }}>
              <div style={{ fontSize: 46, marginBottom: 14, filter: 'grayscale(.2)' }}>🪶</div>
              <div style={{ color: T.text, fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Le fil est vide</div>
              Sois le premier à poster, nakama !
            </div>
          ) : (
            <>
              {posts.map(p => <PostCard key={p.id} post={p} onChange={onChange} onDeleted={onDeleted} onQuote={setQuoteTarget} />)}
              {hasMore && <div style={{ padding: 20, textAlign: 'center', color: T.textFaint, fontSize: 13 }}>Chargement…</div>}
              {!hasMore && <div style={{ padding: 28, textAlign: 'center', color: T.textFaint, fontSize: 12 }}>Tu as tout vu 🏁</div>}
            </>
          )}
        </div>
        <aside className="feed-rail" style={{ width: 300, flexShrink: 0, paddingTop: 16 }}>
          <FeedRail stats={stats} />
        </aside>
      </div>
      <QuoteModal quote={quoteTarget} onClose={() => setQuoteTarget(null)} onPosted={onPosted} />
    </div>
  )
}
