import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bookmark, Copy, Flag, Heart, MessageCircle, MoreHorizontal, Pencil,
  Repeat2, Share2, SmilePlus, Trash2, X,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { toggleLike, deletePost, createPost, editPost, toggleBookmark, fetchLinkPreview, togglePostReaction } from '../../lib/feed.js'
import { isCreator, isStaff } from '../../lib/roles.js'
import { btn, avatar, T } from '../social/socialStyles.js'

const QUICK_REACTIONS = ['❤️', '🔥', '😂', '😮', '😢', '👏', '💯', '🙌']
const TOKEN_RE = /(https?:\/\/[^\s]+|#[\p{L}0-9_]+|@[A-Za-z0-9_.]{2,32}|\|\|[^|]+\|\|)/gu

function applyReaction(reactions, emoji) {
  const list = (reactions || []).map(r => ({ ...r }))
  const i = list.findIndex(r => r.emoji === emoji)
  if (i >= 0) {
    if (list[i].mine) {
      list[i].count -= 1
      list[i].mine = false
      if (list[i].count <= 0) list.splice(i, 1)
    } else {
      list[i].count += 1
      list[i].mine = true
    }
  } else list.push({ emoji, count: 1, mine: true })
  return list
}

function LinkPreview({ url }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    let on = true
    fetchLinkPreview(url).then(d => { if (on) setData(d) })
    return () => { on = false }
  }, [url])
  if (!data) return null
  return (
    <a href={data.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
      style={{ display: 'block', marginTop: 10, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden', textDecoration: 'none', background: 'rgba(255,255,255,0.02)' }}>
      {data.image && <img src={data.image} alt="" loading="lazy" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>{data.site}</div>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: T.text, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{data.title}</div>
        {data.description && <div style={{ fontSize: 12, color: T.textDim, marginTop: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{data.description}</div>}
      </div>
    </a>
  )
}

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return "à l'instant"
  if (s < 3600) return `${Math.floor(s / 60)} min`
  if (s < 86400) return `${Math.floor(s / 3600)} h`
  if (s < 604800) return `${Math.floor(s / 86400)} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function Avatar({ url, name, size = 44 }) {
  return <span style={avatar(size)}>{url ? <img src={url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name || '?').slice(0, 2).toUpperCase()}</span>
}

function RoleBadge({ userId }) {
  if (isCreator(userId)) return <span className="feed-role-badge">Fondateur</span>
  if (isStaff(userId)) return <span className="feed-role-badge">Staff</span>
  return null
}

function Spoiler({ text }) {
  const [shown, setShown] = useState(false)
  return (
    <button type="button" onClick={e => { e.stopPropagation(); setShown(v => !v) }} className={`feed-spoiler ${shown ? '' : 'is-hidden'}`}>
      {text}
    </button>
  )
}

function RichText({ text, mentions }) {
  if (!text) return null
  const mmap = {}
  for (const m of (mentions || [])) if (m?.username) mmap[m.username.toLowerCase()] = m.uid
  return (
    <div className="feed-rich-text">
      {String(text).split(TOKEN_RE).map((p, i) => {
        if (!p) return null
        if (/^\|\|[^|]+\|\|$/.test(p)) return <Spoiler key={i} text={p.slice(2, -2)} />
        if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>{p}</a>
        if (/^#[\p{L}0-9_]+$/u.test(p)) return <Link key={i} to={`/fil/recherche?q=${encodeURIComponent(p)}`} onClick={e => e.stopPropagation()}>{p}</Link>
        if (/^@[A-Za-z0-9_.]{2,32}$/.test(p)) {
          const uid = mmap[p.slice(1).toLowerCase()]
          if (uid) return <Link key={i} to={`/u/${uid}`} onClick={e => e.stopPropagation()}>{p}</Link>
        }
        return <span key={i}>{p}</span>
      })}
    </div>
  )
}

function MediaGallery({ urls, compact, onOpen }) {
  const list = (urls || []).slice(0, 4)
  if (list.length === 0) return null
  return (
    <div className={`feed-media-grid count-${list.length}`} style={compact ? { maxWidth: 320 } : null}>
      {list.map((u, i) => (
        <button key={`${u}-${i}`} type="button" onClick={e => { e.stopPropagation(); onOpen?.(u) }} className="feed-media-button" aria-label="Ouvrir le média">
          <img src={u} alt="" loading="lazy" className="feed-media-image" style={compact ? { maxHeight: 220 } : null} />
        </button>
      ))}
    </div>
  )
}

function Embedded({ p, onClick, onOpenMedia }) {
  const deleted = !!p?.deleted_at
  return (
    <div onClick={onClick} className="feed-card" style={{ padding: '10px 12px', marginTop: 10, marginBottom: 0, cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
        <Avatar url={p.author_avatar} name={p.author_username} size={22} />
        <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{p.author_username || `Pirate #${String(p.author_id || '').slice(-5)}`}</span>
        <span style={{ fontSize: 12, color: T.textFaint }}>· {timeAgo(p.created_at)}</span>
      </div>
      {deleted ? <span style={{ fontSize: 14, color: T.textFaint, fontStyle: 'italic' }}>Post supprimé</span> : (
        <>
          <RichText text={p.content} mentions={p.mentions} />
          <MediaGallery urls={p.media_urls?.length ? p.media_urls : (p.media_url ? [p.media_url] : [])} compact onOpen={onOpenMedia} />
        </>
      )}
    </div>
  )
}

function Counter({ children, active, className = '', ...props }) {
  return (
    <button type="button" className={`feed-post-action ${active ? className : ''}`} {...props}>
      {children}
    </button>
  )
}

export default function PostCard({ post, embedded = false, disableNav = false, onChange, onDeleted, onQuote }) {
  const { discordId } = useAuth()
  const navigate = useNavigate()
  const isRepost = !!post.repost_of && !!post.original
  const isPureRepost = isRepost && !post.content
  const main = isPureRepost ? post.original : post
  const quoted = (isRepost && post.content) ? post.original : null
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState(false)
  const [repostMenu, setRepostMenu] = useState(false)
  const [reactPicker, setReactPicker] = useState(false)
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [mediaModal, setMediaModal] = useState(null)
  const [editText, setEditText] = useState(post.content || '')
  const mineRow = post.author_id === discordId
  const canEdit = !post.repost_of && mineRow && !post.deleted_at
  const deleted = !!main?.deleted_at
  const urls = main.media_urls?.length ? main.media_urls : (main.media_url ? [main.media_url] : [])
  const hasMedia = urls.length > 0
  const firstUrl = (!deleted && main.content) ? (main.content.match(/https?:\/\/[^\s]+/)?.[0] || null) : null
  const longText = (main.content || '').length > 360
  const visibleText = longText && !expanded ? `${main.content.slice(0, 360)}...` : main.content

  useEffect(() => {
    if (!mediaModal) return
    const onKey = (e) => { if (e.key === 'Escape') setMediaModal(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mediaModal])

  const postUrl = useMemo(() => `${window.location.origin}/fil/${main.id}`, [main.id])

  if (embedded) return <Embedded p={post} onOpenMedia={setMediaModal} />

  async function like(e) {
    e.stopPropagation()
    if (!discordId) { navigate('/messages'); return }
    const liked = !main.liked
    onChange?.(main.id, { liked, like_count: Math.max(0, (main.like_count || 0) + (liked ? 1 : -1)) })
    const res = await toggleLike(main.id)
    if (res?.ok === false) onChange?.(main.id, { liked: main.liked, like_count: main.like_count })
  }

  async function react(emoji, e) {
    e?.stopPropagation()
    setReactPicker(false)
    if (!discordId) { navigate('/messages'); return }
    onChange?.(main.id, { reactions: applyReaction(main.reactions, emoji) })
    const res = await togglePostReaction(main.id, emoji)
    if (res?.ok === false) onChange?.(main.id, { reactions: main.reactions })
  }

  async function bookmark(e) {
    e.stopPropagation()
    if (!discordId) { navigate('/messages'); return }
    const next = !main.bookmarked
    onChange?.(main.id, { bookmarked: next })
    const res = await toggleBookmark(main.id)
    if (res?.ok === false) onChange?.(main.id, { bookmarked: main.bookmarked })
  }

  async function doRepost(e) {
    e.stopPropagation()
    setRepostMenu(false)
    setBusy(true)
    const res = await createPost({ repostOf: main.id })
    setBusy(false)
    if (res?.ok) onChange?.(main.id, { repost_count: (main.repost_count || 0) + 1 })
    else if (res?.error) alert(res.error)
  }

  async function remove(e) {
    e.stopPropagation()
    setMenu(false)
    if (!window.confirm(isPureRepost ? 'Annuler ton repost ?' : 'Supprimer ce post ?')) return
    const res = await deletePost(post.id)
    if (res?.ok) onDeleted?.(post.id)
  }

  async function saveEdit(e) {
    e?.stopPropagation()
    const t = editText.trim()
    if (!t || t === post.content) { setEditing(false); return }
    const res = await editPost(post.id, t)
    if (res?.ok) { onChange?.(post.id, { content: t, edited_at: res.edited_at || new Date().toISOString() }); setEditing(false) }
    else if (res?.error) alert(res.error)
  }

  async function copyLink(e) {
    e.stopPropagation()
    setMenu(false)
    try { await navigator.clipboard.writeText(postUrl) } catch {}
  }

  async function sharePost(e) {
    e.stopPropagation()
    setMenu(false)
    if (navigator.share) {
      try { await navigator.share({ title: 'Post Brams Community', url: postUrl }) } catch {}
    } else {
      try { await navigator.clipboard.writeText(postUrl) } catch {}
    }
  }

  const goThread = () => { if (!disableNav && !deleted) navigate(`/fil/${main.id}`) }

  return (
    <>
      <article onClick={goThread} className={`feed-post-card ${disableNav || deleted ? 'is-disabled' : ''}`}>
        <div style={{ flexShrink: 0 }}>
          <Link to={`/u/${main.author_id}`} onClick={e => e.stopPropagation()}><Avatar url={main.author_avatar} name={main.author_username} /></Link>
        </div>

        <div className="feed-post-content">
          {isPureRepost && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: T.textFaint, fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
              <Repeat2 size={14} /> {mineRow ? 'Tu as reposté' : `${post.author_username || 'Quelqu’un'} a reposté`}
            </div>
          )}

          <div className="feed-post-top">
            <Link to={`/u/${main.author_id}`} onClick={e => e.stopPropagation()} className="feed-post-author">
              {main.author_username || `Pirate #${String(main.author_id || '').slice(-5)}`}
            </Link>
            <RoleBadge userId={main.author_id} />
            <span className="feed-post-meta">· {timeAgo(main.created_at)}{main.edited_at ? ' · modifié' : ''}</span>

            <div className="feed-post-menu" onClick={e => e.stopPropagation()}>
              <button type="button" className="feed-icon-button" onClick={() => setMenu(v => !v)} aria-label="Options du post"><MoreHorizontal size={17} /></button>
              {menu && (
                <div className="feed-post-menu-panel">
                  <button type="button" className="feed-post-menu-item" onClick={copyLink}><Copy size={15} /> Copier le lien</button>
                  <button type="button" className="feed-post-menu-item" onClick={sharePost}><Share2 size={15} /> Partager</button>
                  {canEdit && <button type="button" className="feed-post-menu-item" onClick={() => { setEditText(post.content || ''); setEditing(true); setMenu(false) }}><Pencil size={15} /> Modifier</button>}
                  <button type="button" className="feed-post-menu-item" disabled title="Signalement: RPC modération à ajouter"><Flag size={15} /> Signaler</button>
                  {mineRow && <button type="button" className="feed-post-menu-item is-danger" onClick={remove}><Trash2 size={15} /> Supprimer</button>}
                </div>
              )}
            </div>
          </div>

          {deleted ? <div style={{ fontSize: 15, color: T.textFaint, fontStyle: 'italic' }}>Post supprimé</div> : (
            <>
              {editing ? (
                <div onClick={e => e.stopPropagation()}>
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3} autoFocus
                    style={{ width: '100%', resize: 'vertical', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 15, fontFamily: 'inherit', padding: 10, boxSizing: 'border-box', outline: 'none' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    <button type="button" onClick={() => setEditing(false)} style={{ ...btn('ghost'), borderRadius: 8, padding: '6px 14px', fontSize: 12 }}>Annuler</button>
                    <button type="button" onClick={saveEdit} disabled={editText.trim().length > 500} style={{ ...btn('gold'), borderRadius: 8, padding: '6px 16px', fontSize: 12 }}>Enregistrer</button>
                  </div>
                </div>
              ) : (
                visibleText && <RichText text={visibleText} mentions={main.mentions} />
              )}

              {!editing && longText && (
                <button type="button" onClick={e => { e.stopPropagation(); setExpanded(v => !v) }} className="feed-post-menu-item" style={{ width: 'auto', marginTop: 5, paddingLeft: 0, color: T.gold }}>
                  {expanded ? 'Voir moins' : 'Voir plus'}
                </button>
              )}

              {!editing && <MediaGallery urls={urls} onOpen={setMediaModal} />}
              {!editing && firstUrl && !hasMedia && !quoted && <LinkPreview url={firstUrl} />}
              {quoted && <Embedded p={quoted} onClick={(e) => { e.stopPropagation(); navigate(`/fil/${quoted.id}`) }} onOpenMedia={setMediaModal} />}

              {!editing && main.reactions?.length > 0 && (
                <div className="feed-reactions" onClick={e => e.stopPropagation()}>
                  {main.reactions.map(r => (
                    <button key={r.emoji} type="button" onClick={(e) => react(r.emoji, e)} className={`feed-reaction-pill ${r.mine ? 'is-mine' : ''}`}>{r.emoji} {r.count}</button>
                  ))}
                </div>
              )}

              {!editing && (
                <div className="feed-actions" onClick={e => e.stopPropagation()}>
                  <Counter onClick={(e) => { e.stopPropagation(); navigate(`/fil/${main.id}`) }}><MessageCircle size={17} /> {main.reply_count || 0}</Counter>
                  <div style={{ position: 'relative' }}>
                    <Counter onClick={() => setReactPicker(o => !o)}><SmilePlus size={17} /></Counter>
                    {reactPicker && (
                      <div className="feed-react-menu">
                        {QUICK_REACTIONS.map(em => <button key={em} type="button" onClick={(e) => react(em, e)}>{em}</button>)}
                      </div>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Counter onClick={() => setRepostMenu(o => !o)} disabled={busy}><Repeat2 size={17} /> {main.repost_count || 0}</Counter>
                    {repostMenu && (
                      <div className="feed-repost-menu">
                        <button type="button" onClick={doRepost} className="feed-post-menu-item"><Repeat2 size={15} /> Reposter</button>
                        {onQuote && <button type="button" onClick={() => { setRepostMenu(false); onQuote(main) }} className="feed-post-menu-item"><Pencil size={15} /> Citer</button>}
                      </div>
                    )}
                  </div>
                  <Counter onClick={like} active={main.liked} className="is-liked"><Heart size={17} fill={main.liked ? 'currentColor' : 'none'} /> {main.like_count || 0}</Counter>
                  <Counter onClick={bookmark} active={main.bookmarked} className="is-bookmarked" style={{ marginLeft: 'auto' }}><Bookmark size={17} fill={main.bookmarked ? 'currentColor' : 'none'} /></Counter>
                </div>
              )}
            </>
          )}
        </div>
      </article>

      {mediaModal && (
        <div className="feed-modal-backdrop" onClick={() => setMediaModal(null)} role="dialog" aria-modal="true" aria-label="Aperçu du média">
          <button type="button" onClick={() => setMediaModal(null)} className="feed-icon-button" aria-label="Fermer" style={{ position: 'fixed', top: 18, right: 18, background: 'rgba(0,0,0,.45)' }}><X size={20} /></button>
          <img src={mediaModal} alt="" className="feed-modal-image" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}
