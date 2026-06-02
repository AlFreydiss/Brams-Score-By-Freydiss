// ── Grille de publications style Instagram ───────────────────────────────────
// Réutilise getUserPosts / getMyBookmarks. 3 modes : posts (publications du
// membre), reposts, saved (signets — privé, mon profil uniquement). Cliquer une
// case ouvre le thread du post (/fil/:postId). Supporte média + carte texte.
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, Repeat2 } from 'lucide-react'
import { getUserPosts, getMyBookmarks } from '../../lib/feed.js'

function mediaOf(post) {
  if (!post) return null
  if (Array.isArray(post.media_urls) && post.media_urls.length) return post.media_urls[0]
  return post.media_url || null
}

function EmptyGrid({ mode, isOwnProfile, onCreate }) {
  const cfg = {
    posts:   { icon: '📷', title: 'Partager une publication', sub: 'Tes posts apparaîtront ici.' },
    reposts: { icon: '🔁', title: 'Aucun repost',            sub: 'Les posts repartagés apparaîtront ici.' },
    saved:   { icon: '🔖', title: 'Aucun post sauvegardé',   sub: 'Garde tes posts favoris en un clic.' },
  }[mode] || {}
  return (
    <div className="pfx-grid-empty">
      <span className="pfx-grid-empty-ic">{cfg.icon}</span>
      <strong>{cfg.title}</strong>
      <p>{cfg.sub}</p>
      {mode === 'posts' && isOwnProfile && (
        <button type="button" className="pfx-btn pfx-btn-gold" onClick={onCreate}>Créer ma première publication</button>
      )}
    </div>
  )
}

export default function PostsGrid({ userId, isOwnProfile, mode = 'posts' }) {
  const navigate = useNavigate()
  const [posts, setPosts] = useState(null) // null = loading
  const aliveRef = useRef(true)
  useEffect(() => () => { aliveRef.current = false }, [])

  const load = useCallback(async () => {
    setPosts(null)
    let list
    if (mode === 'saved') list = await getMyBookmarks()
    else list = await getUserPosts(userId)
    list = Array.isArray(list) ? list : []
    if (mode === 'posts')   list = list.filter(p => !p.repost_of)
    if (mode === 'reposts') list = list.filter(p => p.repost_of)
    if (aliveRef.current) setPosts(list)
  }, [userId, mode])
  useEffect(() => { load() }, [load])

  if (posts === null) {
    return <div className="pfx-grid-loading">Chargement…</div>
  }
  if (posts.length === 0) {
    return <EmptyGrid mode={mode} isOwnProfile={isOwnProfile} onCreate={() => navigate('/fil')} />
  }

  return (
    <div className="pfx-postgrid">
      {posts.map(p => {
        const show = p.original || p   // pour un repost, on affiche le post d'origine
        const media = mediaOf(show)
        const isRepost = !!p.repost_of
        return (
          <button type="button" key={p.id} className="pfx-cell" onClick={() => navigate(`/fil/${show.id || p.id}`)}>
            {media ? (
              <img className="pfx-cell-media" src={media} alt="" loading="lazy" />
            ) : (
              <div className="pfx-cell-text"><span>{show.content || '…'}</span></div>
            )}
            {isRepost && <span className="pfx-cell-repost"><Repeat2 size={14} /></span>}
            <div className="pfx-cell-overlay">
              <span><Heart size={16} fill="currentColor" /> {show.like_count ?? 0}</span>
              <span><MessageCircle size={16} fill="currentColor" /> {show.reply_count ?? 0}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
