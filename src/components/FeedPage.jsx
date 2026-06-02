import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Anchor, BarChart3, Bookmark, Compass, Flame, Home,
  Image as ImageIcon, MessageCircle, Radio, Search, Swords, Trophy, Users,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { getFeed, getPost, getFeedStats, subscribeFeed } from '../lib/feed.js'
import { listFollowing } from '../lib/social.js'
import PostComposer from './feed/PostComposer.jsx'
import PostCard from './feed/PostCard.jsx'
import QuoteModal from './feed/QuoteModal.jsx'
import FeedRail from './feed/FeedRail.jsx'
import StoriesBar from './feed/StoriesBar.jsx'
import { T } from './social/socialStyles.js'
import './feed/feedPremium.css'

const TAB_ITEMS = [
  { id: 'for-you', label: 'Pour toi', icon: Home },
  { id: 'following', label: 'Suivis', icon: Users },
  { id: 'trending', label: 'Tendances', icon: Flame },
  { id: 'media', label: 'Médias', icon: ImageIcon },
  { id: 'polls', label: 'Sondages', icon: BarChart3, disabled: true },
  { id: 'mine', label: 'Mes posts', icon: Bookmark },
]

const QUICK_LINKS = [
  { to: '/fil/signets', label: 'Mes signets', icon: Bookmark },
  { to: '/', label: 'Classement', icon: Trophy },
  { to: '/equipage', label: 'Équipages', icon: Anchor },
  { to: '/tier-list', label: 'Tier List', icon: BarChart3 },
  { to: '/tournoi', label: 'Tournoi', icon: Swords },
  { to: '/undercover', label: 'Undercover', icon: Compass },
]

function patch(posts, id, partial) {
  return posts.map(p => {
    if (p.id === id) return { ...p, ...partial }
    if (p.original?.id === id) return { ...p, original: { ...p.original, ...partial } }
    return p
  })
}

function hasMedia(post) {
  const main = post?.original && post?.repost_of && !post?.content ? post.original : post
  return !!(main?.media_urls?.length || main?.media_url)
}

function score(post) {
  const main = post?.original && post?.repost_of && !post?.content ? post.original : post
  return Number(main?.like_count || 0) * 3 + Number(main?.reply_count || 0) * 4 + Number(main?.repost_count || 0) * 5
}

function getPostText(post) {
  return [post?.content, post?.original?.content].filter(Boolean).join(' ')
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
  const sh = {
    background: 'linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.09) 37%, rgba(255,255,255,.04) 63%)',
    backgroundSize: '200% 100%',
    animation: 'feed-shimmer 1.5s ease-in-out infinite',
  }
  return (
    <div style={{ display: 'flex', gap: 12, padding: '17px 18px', borderBottom: `1px solid ${T.border}` }}>
      <div data-fx style={{ ...sh, width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 4 }}>
        <div data-fx style={{ ...sh, width: '38%', height: 11, borderRadius: 6 }} />
        <div data-fx style={{ ...sh, width: '92%', height: 10, borderRadius: 6 }} />
        <div data-fx style={{ ...sh, width: '68%', height: 10, borderRadius: 6 }} />
        <div data-fx style={{ ...sh, width: '56%', height: 104, borderRadius: 8, marginTop: 4 }} />
      </div>
    </div>
  )
}

function FeedNav({ activeTab, onTab }) {
  return (
    <aside className="feed-left">
      <div className="feed-card">
        <div className="feed-kicker">Navigation</div>
        <div className="feed-nav-list">
          {TAB_ITEMS.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                title={item.disabled ? 'Sondages: backend à ajouter avant activation' : item.label}
                onClick={() => !item.disabled && onTab(item.id)}
                className={`feed-nav-button ${activeTab === item.id ? 'is-active' : ''}`}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="feed-card">
        <div className="feed-kicker">Accès rapides</div>
        <div className="feed-nav-list">
          {QUICK_LINKS.map(item => {
            const Icon = item.icon
            return (
              <Link key={item.to} to={item.to} className="feed-nav-link">
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

export default function FeedPage() {
  const { isAuthenticated, discordId, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('for-you')
  const [followingIds, setFollowingIds] = useState(() => new Set())
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [newCount, setNewCount] = useState(0)
  const [quoteTarget, setQuoteTarget] = useState(null)
  const [stats, setStats] = useState({ posts: 0 })
  const loadingMore = useRef(false)
  const seen = useRef(new Set())
  const refreshTimer = useRef(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { posts: list, error: err } = await getFeed(null)
    if (err) { setError(err); setLoading(false); return }
    seen.current = new Set(list.map(p => p.id))
    setPosts(list)
    setHasMore(list.length >= 20)
    setNewCount(0)
    setLoading(false)
    getFeedStats().then(setStats)
  }, [])

  const scheduleReload = useCallback((delay = 150) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null
      reload()
    }, delay)
  }, [reload])

  const refreshStats = useCallback(async () => {
    const next = await getFeedStats()
    setStats(next)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) { setFollowingIds(new Set()); return }
    let alive = true
    listFollowing().then(list => {
      if (!alive) return
      setFollowingIds(new Set((Array.isArray(list) ? list : []).map(f => String(f.user_id))))
    }).catch(() => {
      if (alive) setFollowingIds(new Set())
    })
    return () => { alive = false }
  }, [isAuthenticated])

  const feedMeta = useMemo(() => {
    const today = new Date().toLocaleDateString('fr-FR')
    const todayPosts = posts.filter(p => new Date(p.created_at).toLocaleDateString('fr-FR') === today).length
    const activeMembers = new Set(posts.map(p => String(p.author_id || '')).filter(Boolean)).size
    const tagMap = new Map()
    const authorMap = new Map()

    for (const post of posts) {
      const text = getPostText(post)
      for (const match of text.matchAll(/#[\p{L}0-9_]+/gu)) {
        const tag = match[0].toLowerCase()
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
      }
      const author = post.author_username || (post.author_id ? `#${String(post.author_id).slice(-5)}` : null)
      if (author) authorMap.set(author, (authorMap.get(author) || 0) + 1)
    }

    const trends = [...tagMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, count]) => ({ tag, count }))
    const activeAuthors = [...authorMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }))
    return { todayPosts, activeMembers, trends, activeAuthors }
  }, [posts])

  const visiblePosts = useMemo(() => {
    if (activeTab === 'following') return posts.filter(p => followingIds.has(String(p.author_id)) || String(p.author_id) === String(discordId))
    if (activeTab === 'trending') return [...posts].sort((a, b) => score(b) - score(a))
    if (activeTab === 'media') return posts.filter(hasMedia)
    if (activeTab === 'mine') return posts.filter(p => String(p.author_id) === String(discordId))
    return posts
  }, [activeTab, discordId, followingIds, posts])

  useEffect(() => { if (!authLoading) reload() }, [authLoading, discordId, reload])

  useEffect(() => {
    const onFocus = () => scheduleReload(80)
    const onVisible = () => { if (!document.hidden) scheduleReload(80) }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [scheduleReload])

  useEffect(() => {
    const unsub = subscribeFeed(({ type, row, old }) => {
      const target = row || old
      if (!target) return
      if (type === 'INSERT' && !target.reply_to && !target.repost_of && target.author_id !== discordId && !seen.current.has(target.id)) {
        seen.current.add(target.id)
        setNewCount(n => n + 1)
        scheduleReload(1200)
        return
      }
      if (type === 'UPDATE' || type === 'DELETE') {
        scheduleReload(120)
        refreshStats()
      }
    })
    return unsub
  }, [discordId, refreshStats, scheduleReload])

  useEffect(() => {
    if (loading) return
    const t = setInterval(async () => {
      if (document.hidden) return
      const { posts: list, error: err } = await getFeed(null)
      if (err || !Array.isArray(list)) return
      let n = 0
      for (const p of list) {
        if (!p.reply_to && !p.repost_of && p.author_id !== discordId && !seen.current.has(p.id)) n += 1
      }
      if (n > 0) setNewCount(c => Math.max(c, n))
      refreshStats()
    }, 45000)
    return () => clearInterval(t)
  }, [discordId, loading, refreshStats])

  useEffect(() => () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
  }, [])

  async function loadMore() {
    if (activeTab !== 'for-you' || loadingMore.current || !hasMore || !posts.length) return
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
    if (r?.post) {
      seen.current.add(r.post.id)
      setPosts(prev => [r.post, ...prev.filter(p => p.id !== r.post.id)])
      refreshStats()
    }
  }

  const activeLabel = TAB_ITEMS.find(t => t.id === activeTab)?.label || 'Pour toi'
  const mediaCount = posts.filter(hasMedia).length

  return (
    <div onScroll={onScroll} className="feed-shell">
      <div className="feed-layout">
        <FeedNav activeTab={activeTab} onTab={setActiveTab} />

        <main className="feed-main" aria-label="Fil de la communauté Brams">
          <header className="feed-header">
            <div className="feed-title-row">
              <h1 className="feed-title">Le Fil</h1>
              <span className="feed-live-badge"><LiveDot /> En direct</span>
            </div>

            <div className="feed-summary-row" aria-label="Résumé du fil">
              <span className="feed-stat-pill"><MessageCircle size={14} /><strong>{feedMeta.todayPosts}</strong> aujourd'hui</span>
              <span className="feed-stat-pill"><Users size={14} /><strong>{feedMeta.activeMembers}</strong> actifs</span>
              <span className="feed-stat-pill"><ImageIcon size={14} /><strong>{mediaCount}</strong> médias</span>
              <span className="feed-stat-pill"><Radio size={14} /><strong>{(stats?.posts ?? 0).toLocaleString('fr-FR')}</strong> total</span>
            </div>

            <form className="feed-search-row" onSubmit={e => { e.preventDefault(); const q = search.trim(); if (q.length >= 2) navigate(`/fil/recherche?q=${encodeURIComponent(q)}`) }}>
              <Search size={16} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="feed-search-input"
                placeholder="Rechercher un hashtag, un membre, un anime..."
                aria-label="Rechercher dans le fil"
              />
            </form>

            <nav className="feed-tabs" aria-label="Filtres du fil">
              {TAB_ITEMS.map(item => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={item.disabled}
                    title={item.disabled ? 'Sondages: backend à ajouter avant activation' : item.label}
                    onClick={() => !item.disabled && setActiveTab(item.id)}
                    className={`feed-chip ${activeTab === item.id ? 'is-active' : ''}`}
                  >
                    <Icon size={14} />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </header>

          <StoriesBar />

          {isAuthenticated ? <PostComposer onPosted={onPosted} /> : (
            <div className="feed-empty" style={{ paddingTop: 24, paddingBottom: 24 }}>
              Connecte-toi pour publier dans le fil.
            </div>
          )}

          {newCount > 0 && (
            <button type="button" onClick={reload} className="feed-new-button">
              Voir {newCount} nouveau{newCount > 1 ? 'x' : ''} post{newCount > 1 ? 's' : ''}
            </button>
          )}

          {loading ? (
            <div data-fx style={{ animation: 'feed-fadein .3s ease' }}>
              <SkeletonPost /><SkeletonPost /><SkeletonPost />
            </div>
          ) : error ? (
            <div className="feed-error">
              Le fil n'a pas pu se charger.<br />
              <span style={{ fontSize: 12, color: T.textFaint }}>{error}</span>
              <div>
                <button type="button" onClick={reload} className="feed-chip" style={{ marginTop: 18 }}>
                  Réessayer
                </button>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="feed-empty">
              <div className="feed-empty-title">Le fil est vide</div>
              Sois le premier à lancer une discussion.
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="feed-empty">
              <div className="feed-empty-title">Aucun post dans “{activeLabel}”</div>
              Change de filtre ou reviens quand il y aura plus d'activité.
            </div>
          ) : (
            <>
              {visiblePosts.map(p => <PostCard key={p.id} post={p} onChange={onChange} onDeleted={onDeleted} onQuote={setQuoteTarget} />)}
              {hasMore && activeTab === 'for-you' && <div style={{ padding: 20, textAlign: 'center', color: T.textFaint, fontSize: 13 }}>Chargement...</div>}
              {!hasMore && <div style={{ padding: 28, textAlign: 'center', color: T.textFaint, fontSize: 12 }}>Tu as tout vu</div>}
            </>
          )}
        </main>

        <aside className="feed-right">
          <FeedRail stats={stats} meta={feedMeta} trends={feedMeta.trends} activeAuthors={feedMeta.activeAuthors} />
        </aside>
      </div>
      <QuoteModal quote={quoteTarget} onClose={() => setQuoteTarget(null)} onPosted={onPosted} />
    </div>
  )
}
