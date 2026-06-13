import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bookmark, Copy, Flag, Heart, MessageCircle, MoreHorizontal, Pencil,
  Repeat2, Share2, SmilePlus, Trash2, X,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { toggleLike, deletePost, createPost, editPost, toggleBookmark, fetchLinkPreview, togglePostReaction, reportPost, listPostLikers } from '../../lib/feed.js'
import { isCreator, isStaff, roleBadge, certif } from '../../lib/roles.js'
import { btn, avatar, T } from '../social/socialStyles.js'
import './feedPremium.css'   // styles des cartes/actions — sinon non stylé hors du Fil (profil, thread → boutons en carrés)

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
  const b = roleBadge(userId)
  if (!b) return null
  return (
    <span className="feed-role-badge"
      style={{ color: b.color, borderColor: `${b.color}3a`, background: `${b.color}14` }}>
      {b.label}
    </span>
  )
}

// Pastille certif (✓ coloré) visible à côté du pseudo dans le Fil — même source que le profil.
function CertifBadge({ userId }) {
  const c = certif(userId)
  if (!c) return null
  return (
    <span title={c.title} aria-label={c.title} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      width: 15, height: 15, borderRadius: '50%', background: c.color, color: '#fff',
      fontSize: 9, fontWeight: 900, lineHeight: 1, boxShadow: `0 0 0 1px ${c.color}55, 0 0 7px ${c.glow}`,
    }}>✓</span>
  )
}

function Spoiler({ text }) {
  const [shown, setShown] = useState(false)
  return (
    <button type="button" onClick={e => { e.stopPropagation(); setShown(v => !v) }} className={`feed-spoiler ${shown ? '' : 'is-hidden'}`}>
      {text}
    </button>
  )
}

function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

function RichText({ text, mentions }) {
  if (!text) return null
  const mlist = (mentions || []).filter(m => m?.username)
  const mmap = {}
  for (const m of mlist) mmap[m.username.toLowerCase()] = m.uid
  // Les pseudos connus du post (avec ESPACES et ACCENTS) sont matchés en priorité,
  // puis le @mot générique. Corrige "@Carton OG" / "@Pépé chicken (J3)" non liés.
  const alt = mlist.map(m => m.username).sort((a, b) => b.length - a.length).map(n => '@' + escapeRe(n)).join('|')
  const RE = new RegExp(`(https?:\\/\\/[^\\s]+|#[\\p{L}0-9_]+|${alt ? alt + '|' : ''}@[\\p{L}0-9_.]{2,32}|\\|\\|[^|]+\\|\\|)`, 'gu')
  return (
    <div className="feed-rich-text">
      {String(text).split(RE).map((p, i) => {
        if (!p) return null
        if (/^\|\|[^|]+\|\|$/.test(p)) return <Spoiler key={i} text={p.slice(2, -2)} />
        if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>{p}</a>
        if (/^#[\p{L}0-9_]+$/u.test(p)) return <Link key={i} to={`/fil/recherche?q=${encodeURIComponent(p)}`} onClick={e => e.stopPropagation()}>{p}</Link>
        if (p[0] === '@') {
          const uid = mmap[p.slice(1).toLowerCase()]
          if (uid) return <Link key={i} to={`/u/${uid}`} onClick={e => e.stopPropagation()}>{p}</Link>
        }
        return <span key={i}>{p}</span>
      })}
    </div>
  )
}

const isVideoUrl = (u = '') => /\.(mp4|webm|mov)(\?|$)/i.test(u)

function MediaGallery({ urls, compact, onOpen }) {
  const list = (urls || []).slice(0, 4)
  if (list.length === 0) return null
  return (
    <div className={`feed-media-grid count-${list.length}`} style={compact ? { maxWidth: 320 } : null}>
      {list.map((u, i) => (
        isVideoUrl(u) ? (
          // Vidéo lue en place (controls natifs) — pas de lightbox, pas de re-encode.
          <div key={`${u}-${i}`} onClick={e => e.stopPropagation()} className="feed-media-button" style={{ cursor: 'default' }}>
            <video src={u} controls playsInline preload="metadata"
              style={{ width: '100%', display: 'block', maxHeight: compact ? 220 : 420, background: '#000' }} />
          </div>
        ) : (
          <button key={`${u}-${i}`} type="button" onClick={e => { e.stopPropagation(); onOpen?.(u) }} className="feed-media-button" aria-label="Ouvrir le média">
            <img src={u} alt="" loading="lazy" className="feed-media-image" style={compact ? { maxHeight: 220 } : null} />
          </button>
        )
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

function Counter({ children, active, kind = '', className = '', ...props }) {
  return (
    <button type="button" className={`feed-post-action ${kind} ${active ? className : ''}`} {...props}>
      {children}
    </button>
  )
}

// Parent compact au-dessus d'une réponse (threading X) : avatar + pseudo + texte
// + média éventuel, trait vertical 2px reliant son avatar à celui de la réponse.
function ParentCompact({ p, onOpenMedia }) {
  const navigate = useNavigate()
  const deleted = !!p.deleted_at
  return (
    <div onClick={e => { e.stopPropagation(); navigate(`/fil/${p.id}`) }} style={{ display: 'flex', gap: 13, cursor: 'pointer' }}>
      <div style={{ width: 44, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar url={p.author_avatar} name={p.author_username} size={36} />
        <div aria-hidden style={{ width: 2, flex: 1, minHeight: 10, background: 'rgba(255,255,255,.12)', marginTop: 4, borderRadius: 1 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <Link to={`/u/${p.author_id}`} onClick={e => e.stopPropagation()} className="feed-post-author">
            {p.author_username || `Pirate #${String(p.author_id || '').slice(-5)}`}
          </Link>
          <CertifBadge userId={p.author_id} />
          <span className="feed-post-meta">· {timeAgo(p.created_at)}</span>
        </div>
        {deleted ? (
          <div style={{ fontSize: 14, color: T.textFaint, fontStyle: 'italic', marginTop: 2 }}>Post supprimé</div>
        ) : (
          <>
            {p.content && (
              <div style={{ marginTop: 1, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                <RichText text={p.content} mentions={p.mentions} />
              </div>
            )}
            <MediaGallery urls={p.media_urls?.length ? p.media_urls : (p.media_url ? [p.media_url] : [])} compact onOpen={onOpenMedia} />
          </>
        )}
      </div>
    </div>
  )
}

export default function PostCard({ post, embedded = false, disableNav = false, showParent = false, onChange, onDeleted, onQuote, hideRepostSave = false }) {
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
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportState, setReportState] = useState(null)  // null | 'sending' | 'done' | error string
  const [likePop, setLikePop] = useState(false)         // anim "pop" au like
  const mineRow = post.author_id === discordId
  const canEdit = !post.repost_of && mineRow && !post.deleted_at
  const deleted = !!main?.deleted_at
  const urls = main.media_urls?.length ? main.media_urls : (main.media_url ? [main.media_url] : [])
  const hasMedia = urls.length > 0
  const firstUrl = (!deleted && main.content) ? (main.content.match(/https?:\/\/[^\s]+/)?.[0] || null) : null
  const longText = (main.content || '').length > 360
  const visibleText = longText && !expanded ? `${main.content.slice(0, 360)}...` : main.content
  // Bloc threadé (feed / haut de thread) : parent compact UNIQUEMENT si demandé
  // (les réponses listées dans une vue thread n'affichent pas leur parent)
  const parent = showParent && !isPureRepost && main.reply_to && post.parent ? post.parent : null

  useEffect(() => {
    if (!mediaModal) return
    const onKey = (e) => { if (e.key === 'Escape') setMediaModal(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mediaModal])

  const postUrl = useMemo(() => `${window.location.origin}/fil/${main.id}`, [main.id])
  const [likers, setLikers] = useState(undefined) // undefined = fermé | 'loading' | tableau

  if (embedded) return <Embedded p={post} onOpenMedia={setMediaModal} />

  async function like(e) {
    e.stopPropagation()
    if (!discordId) { navigate('/messages'); return }
    const liked = !main.liked
    if (liked) { setLikePop(true); setTimeout(() => setLikePop(false), 450) }   // anim "pop"
    onChange?.(main.id, { liked, like_count: Math.max(0, (main.like_count || 0) + (liked ? 1 : -1)) })
    const res = await toggleLike(main.id)
    if (res?.ok === false) onChange?.(main.id, { liked: main.liked, like_count: main.like_count })
  }

  function openLikers(e) {
    e?.stopPropagation?.()
    setLikers('loading')
    listPostLikers(main.id).then((l) => setLikers(Array.isArray(l) ? l : []))
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

  async function submitReport() {
    if (!discordId) { navigate('/messages'); return }
    const reason = reportReason.trim()
    if (!reason) { setReportState('Indique une raison'); return }
    setReportState('sending')
    const res = await reportPost(main.id, reason)
    if (res?.ok) { setReportState('done'); setTimeout(() => { setReportOpen(false); setReportReason(''); setReportState(null) }, 1400) }
    else setReportState(res?.error || 'Échec du signalement')
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
      <article onClick={goThread} className={`feed-post-card ${disableNav || deleted ? 'is-disabled' : ''} ${(main.like_count || 0) >= 50 ? 'is-fire' : (main.like_count || 0) >= 15 ? 'is-hot' : ''}`}
        style={parent ? { flexDirection: 'column', gap: 0 } : undefined}>
        {parent && <ParentCompact p={parent} onOpenMedia={setMediaModal} />}
        {/* display:contents quand pas de parent → layout d'origine strictement inchangé */}
        <div style={parent ? { display: 'flex', gap: 13 } : { display: 'contents' }}>
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
            <CertifBadge userId={main.author_id} />
            <RoleBadge userId={main.author_id} />
            <span className="feed-post-meta">· {timeAgo(main.created_at)}{main.edited_at ? ' · modifié' : ''}</span>

            <div className="feed-post-menu" onClick={e => e.stopPropagation()}>
              <button type="button" className="feed-icon-button" onClick={() => setMenu(v => !v)} aria-label="Options du post"><MoreHorizontal size={17} /></button>
              {menu && (
                <div className="feed-post-menu-panel">
                  <button type="button" className="feed-post-menu-item" onClick={copyLink}><Copy size={15} /> Copier le lien</button>
                  <button type="button" className="feed-post-menu-item" onClick={sharePost}><Share2 size={15} /> Partager</button>
                  {canEdit && <button type="button" className="feed-post-menu-item" onClick={() => { setEditText(post.content || ''); setEditing(true); setMenu(false) }}><Pencil size={15} /> Modifier</button>}
                  {!mineRow && <button type="button" className="feed-post-menu-item" onClick={() => { setMenu(false); setReportOpen(true) }}><Flag size={15} /> Signaler</button>}
                  {mineRow && <button type="button" className="feed-post-menu-item is-danger" onClick={remove}><Trash2 size={15} /> Supprimer</button>}
                </div>
              )}
            </div>
          </div>

          {deleted ? <div style={{ fontSize: 15, color: T.textFaint, fontStyle: 'italic' }}>Post supprimé</div> : (
            <>
              {parent && (
                <div style={{ fontSize: 12.5, color: T.textFaint, marginBottom: 3 }}>
                  En réponse à{' '}
                  <Link to={`/u/${parent.author_id}`} onClick={e => e.stopPropagation()} style={{ color: T.gold, textDecoration: 'none' }}>
                    @{parent.author_username || `Pirate #${String(parent.author_id || '').slice(-5)}`}
                  </Link>
                </div>
              )}
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
                  <Counter kind="act-reply" onClick={(e) => { e.stopPropagation(); navigate(`/fil/${main.id}`) }}><MessageCircle size={17} /> {main.reply_count || 0}</Counter>
                  <div style={{ position: 'relative' }}>
                    <Counter kind="act-react" onClick={() => setReactPicker(o => !o)}><SmilePlus size={17} /></Counter>
                    {reactPicker && (
                      <div className="feed-react-menu">
                        {QUICK_REACTIONS.map(em => <button key={em} type="button" onClick={(e) => react(em, e)}>{em}</button>)}
                      </div>
                    )}
                  </div>
                  {!hideRepostSave && (
                    <div style={{ position: 'relative' }}>
                      <Counter kind="act-repost" onClick={() => setRepostMenu(o => !o)} disabled={busy}><Repeat2 size={17} /> {main.repost_count || 0}</Counter>
                      {repostMenu && (
                        <div className="feed-repost-menu">
                          <button type="button" onClick={doRepost} className="feed-post-menu-item"><Repeat2 size={15} /> Reposter</button>
                          {onQuote && <button type="button" onClick={() => { setRepostMenu(false); onQuote(main) }} className="feed-post-menu-item"><Pencil size={15} /> Citer</button>}
                        </div>
                      )}
                    </div>
                  )}
                  <Counter kind="act-like" onClick={like} active={main.liked} className={`is-liked ${likePop ? 'like-pop' : ''}`}><Heart size={17} fill={main.liked ? 'currentColor' : 'none'} />{' '}
                    <span
                      role={(main.like_count || 0) > 0 ? 'button' : undefined}
                      title={(main.like_count || 0) > 0 ? 'Voir qui a aimé' : undefined}
                      onClick={(main.like_count || 0) > 0 ? openLikers : undefined}
                      style={{ cursor: (main.like_count || 0) > 0 ? 'pointer' : 'inherit' }}
                    >{main.like_count || 0}</span>
                  </Counter>
                  {!hideRepostSave && (
                    <Counter kind="act-bookmark" onClick={bookmark} active={main.bookmarked} className="is-bookmarked"><Bookmark size={17} fill={main.bookmarked ? 'currentColor' : 'none'} /></Counter>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        </div>{/* fin ligne avatar+contenu (wrapper threading) */}
      </article>

      {mediaModal && createPortal((
        <div className="feed-modal-backdrop" onClick={() => setMediaModal(null)} role="dialog" aria-modal="true" aria-label="Aperçu du média">
          <button type="button" onClick={() => setMediaModal(null)} className="feed-icon-button" aria-label="Fermer" style={{ position: 'fixed', top: 18, right: 18, background: 'rgba(0,0,0,.45)' }}><X size={20} /></button>
          <img src={mediaModal} alt="" className="feed-modal-image" onClick={e => e.stopPropagation()} />
        </div>
      ), document.body)}

      {likers !== undefined && createPortal((
        <div className="feed-modal-backdrop" onClick={() => setLikers(undefined)} role="dialog" aria-modal="true" aria-label="J'aime"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(420px, 100%)', maxHeight: '70vh', display: 'flex', flexDirection: 'column', background: '#111214', border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 800, color: T.text }}>
                <Heart size={16} fill="#e0524a" color="#e0524a" /> {Array.isArray(likers) ? `${likers.length} ` : ''}j'aime
              </span>
              <button type="button" onClick={() => setLikers(undefined)} className="feed-icon-button" aria-label="Fermer"><X size={18} /></button>
            </div>
            <div style={{ overflowY: 'auto', padding: 6 }}>
              {likers === 'loading' ? <div style={{ padding: 26, textAlign: 'center', color: T.textFaint, fontSize: 13 }}>Chargement…</div>
                : likers.length === 0 ? <div style={{ padding: 26, textAlign: 'center', color: T.textFaint, fontSize: 13 }}>Personne n'a encore aimé ce post.</div>
                  : likers.map((u) => (
                    <Link key={u.user_id} to={`/u/${u.user_id}`} onClick={() => setLikers(undefined)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', textDecoration: 'none', borderRadius: 10 }}>
                      <Avatar url={u.avatar} name={u.username} size={36} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{u.username}</span>
                    </Link>
                  ))}
            </div>
          </div>
        </div>
      ), document.body)}

      {reportOpen && (
        <div className="feed-modal-backdrop" onClick={() => setReportOpen(false)} role="dialog" aria-modal="true" aria-label="Signaler ce post"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(440px, 100%)', background: '#111214', border: `1px solid ${T.border}`, borderRadius: 16, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Flag size={18} color="#e0524a" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>Signaler ce post</h3>
            </div>
            <p style={{ fontSize: 12.5, color: T.textFaint, margin: '0 0 14px' }}>Explique pourquoi au staff. Faux signalements = sanction.</p>
            <textarea autoFocus value={reportReason} onChange={e => { setReportReason(e.target.value); if (typeof reportState === 'string' && reportState !== 'sending' && reportState !== 'done') setReportState(null) }}
              placeholder="Ex : spam, insulte, contenu choquant…" rows={3} maxLength={500}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'none', padding: '11px 14px', borderRadius: 12, background: T.surface, border: `1px solid ${T.border}`, color: T.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', lineHeight: 1.45 }} />
            {typeof reportState === 'string' && reportState !== 'sending' && (
              <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 700, color: reportState === 'done' ? '#34d399' : '#e0524a' }}>
                {reportState === 'done' ? '✓ Signalement envoyé au staff' : `✕ ${reportState}`}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={() => setReportOpen(false)} style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${T.border}`, background: 'transparent', color: T.textFaint, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
              <button type="button" onClick={submitReport} disabled={reportState === 'sending' || reportState === 'done' || !reportReason.trim()}
                style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(224,82,74,0.4)', background: 'rgba(224,82,74,0.12)', color: '#e0524a', fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: (reportState === 'sending' || reportState === 'done' || !reportReason.trim()) ? 0.5 : 1 }}>
                {reportState === 'sending' ? 'Envoi…' : 'Signaler'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
