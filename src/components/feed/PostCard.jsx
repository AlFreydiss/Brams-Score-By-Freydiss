import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { toggleLike, deletePost, createPost } from '../../lib/feed.js'
import { avatar, T } from '../social/socialStyles.js'

const URL_RE = /(https?:\/\/[^\s]+)/g
function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return "à l'instant"
  if (s < 3600) return `${Math.floor(s / 60)} min`
  if (s < 86400) return `${Math.floor(s / 3600)} h`
  if (s < 604800) return `${Math.floor(s / 86400)} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
function RichText({ text }) {
  if (!text) return null
  return String(text).split(URL_RE).map((p, i) => URL_RE.test(p)
    ? <a key={i} href={p} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: T.gold, wordBreak: 'break-all' }}>{p}</a>
    : <span key={i}>{p}</span>)
}
function Avatar({ url, name, size = 44 }) {
  return <span style={avatar(size)}>{url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name || '?').slice(0, 2).toUpperCase()}</span>
}

const actionBtn = (color) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: T.textFaint, fontFamily: 'inherit', padding: '4px 8px', borderRadius: 8, transition: 'color .12s, background .12s', '--hc': color })

// post : objet enrichi (cf _enrich_post). embedded = rendu compact sans actions
// (pour l'original à l'intérieur d'un repost). onChange / onDeleted remontent.
export default function PostCard({ post, embedded = false, disableNav = false, onChange, onDeleted }) {
  const { discordId } = useAuth()
  const navigate = useNavigate()
  const isRepost = !!post.repost_of && !!post.original
  const body = isRepost ? post.original : post   // ce qu'on affiche/actionne
  const [busy, setBusy] = useState(false)
  const mineRow = post.author_id === discordId
  const deleted = !!body?.deleted_at

  async function like(e) {
    e.stopPropagation()
    if (!discordId) { navigate('/messages'); return }
    const liked = !body.liked
    onChange?.(body.id, { liked, like_count: (body.like_count || 0) + (liked ? 1 : -1) })
    const res = await toggleLike(body.id)
    if (res?.ok === false) onChange?.(body.id, { liked: body.liked, like_count: body.like_count })
  }
  async function repost(e) {
    e.stopPropagation()
    if (!discordId) { navigate('/messages'); return }
    setBusy(true)
    const res = await createPost({ repostOf: body.id })
    setBusy(false)
    if (res?.ok) onChange?.(body.id, { repost_count: (body.repost_count || 0) + 1 })
    else if (res?.error) alert(res.error)
  }
  async function remove(e) {
    e.stopPropagation()
    if (!window.confirm(isRepost ? 'Annuler ton repost ?' : 'Supprimer ce post ?')) return
    const res = await deletePost(post.id)
    if (res?.ok) onDeleted?.(post.id)
  }
  const goThread = () => { if (!disableNav && !deleted) navigate(`/fil/${body.id}`) }

  if (embedded) {
    return (
      <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, padding: '10px 12px', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Avatar url={body.author_avatar} name={body.author_username} size={22} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{body.author_username || `Pirate #${String(body.author_id || '').slice(-5)}`}</span>
          <span style={{ fontSize: 12, color: T.textFaint }}>· {timeAgo(body.created_at)}</span>
        </div>
        {deleted ? <span style={{ fontSize: 14, color: T.textFaint, fontStyle: 'italic' }}>Post supprimé</span> : <>
          <div style={{ fontSize: 14, color: T.text, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}><RichText text={body.content} /></div>
          {body.media_url && <img src={body.media_url} alt="" style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 10, marginTop: 8, border: `1px solid ${T.border}` }} />}
        </>}
      </div>
    )
  }

  return (
    <article onClick={goThread} style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${T.border}`, cursor: disableNav || deleted ? 'default' : 'pointer' }}>
      <div style={{ flexShrink: 0 }}>
        <Link to={`/u/${body.author_id}`} onClick={e => e.stopPropagation()}><Avatar url={body.author_avatar} name={body.author_username} /></Link>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {isRepost && <div style={{ fontSize: 12, color: T.textFaint, fontWeight: 600, marginBottom: 4 }}>🔁 {mineRow ? 'Tu as' : `${post.author_username || 'Quelqu’un'} a`} reposté</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <Link to={`/u/${body.author_id}`} onClick={e => e.stopPropagation()} style={{ fontSize: 15, fontWeight: 800, color: T.text, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {body.author_username || `Pirate #${String(body.author_id || '').slice(-5)}`}
          </Link>
          <span style={{ fontSize: 13, color: T.textFaint, flexShrink: 0 }}>· {timeAgo(body.created_at)}{body.edited_at ? ' · modifié' : ''}</span>
          {(mineRow || (!isRepost && body.author_id === discordId)) && (
            <button onClick={remove} title="Supprimer" style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: T.textFaint, fontSize: 13, padding: 4 }}>🗑</button>
          )}
        </div>
        {deleted ? <div style={{ fontSize: 15, color: T.textFaint, fontStyle: 'italic' }}>Post supprimé</div> : <>
          {body.content && <div style={{ fontSize: 15, color: T.text, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><RichText text={body.content} /></div>}
          {body.media_url && <img src={body.media_url} alt="" style={{ maxWidth: '100%', maxHeight: 420, borderRadius: 14, marginTop: 10, border: `1px solid ${T.border}` }} />}
          {/* Action bar */}
          <div style={{ display: 'flex', gap: 18, marginTop: 10 }}>
            <button onClick={(e) => { e.stopPropagation(); navigate(`/fil/${body.id}`) }} style={actionBtn(T.blue)}
              onMouseEnter={e => { e.currentTarget.style.color = T.blue }} onMouseLeave={e => { e.currentTarget.style.color = T.textFaint }}>
              💬 {body.reply_count || 0}
            </button>
            <button onClick={repost} disabled={busy} style={actionBtn(T.green)}
              onMouseEnter={e => { e.currentTarget.style.color = T.green }} onMouseLeave={e => { e.currentTarget.style.color = T.textFaint }}>
              🔁 {body.repost_count || 0}
            </button>
            <button onClick={like} style={{ ...actionBtn(T.red), color: body.liked ? T.red : T.textFaint }}
              onMouseEnter={e => { e.currentTarget.style.color = T.red }} onMouseLeave={e => { e.currentTarget.style.color = body.liked ? T.red : T.textFaint }}>
              {body.liked ? '❤️' : '🤍'} {body.like_count || 0}
            </button>
          </div>
        </>}
      </div>
    </article>
  )
}
