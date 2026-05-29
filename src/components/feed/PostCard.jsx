import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { toggleLike, deletePost, createPost, editPost, toggleBookmark } from '../../lib/feed.js'
import { btn, avatar, T } from '../social/socialStyles.js'

const TOKEN_RE = /(https?:\/\/[^\s]+|#[\p{L}0-9_]+|@[A-Za-z0-9_.]{2,32})/gu
function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return "à l'instant"
  if (s < 3600) return `${Math.floor(s / 60)} min`
  if (s < 86400) return `${Math.floor(s / 3600)} h`
  if (s < 604800) return `${Math.floor(s / 86400)} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
function RichText({ text, mentions }) {
  if (!text) return null
  const mmap = {}
  for (const m of (mentions || [])) if (m?.username) mmap[m.username.toLowerCase()] = m.uid
  return String(text).split(TOKEN_RE).map((p, i) => {
    if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: T.gold, wordBreak: 'break-all' }}>{p}</a>
    if (/^#[\p{L}0-9_]+$/u.test(p)) return <Link key={i} to={`/fil/recherche?q=${encodeURIComponent(p)}`} onClick={e => e.stopPropagation()} style={{ color: T.violet, fontWeight: 600, textDecoration: 'none' }}>{p}</Link>
    if (/^@[A-Za-z0-9_.]{2,32}$/.test(p)) {
      const uid = mmap[p.slice(1).toLowerCase()]
      if (uid) return <Link key={i} to={`/u/${uid}`} onClick={e => e.stopPropagation()} style={{ color: T.violet, fontWeight: 600, textDecoration: 'none' }}>{p}</Link>
    }
    return <span key={i}>{p}</span>
  })
}
function Avatar({ url, name, size = 44 }) {
  return <span style={avatar(size)}>{url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name || '?').slice(0, 2).toUpperCase()}</span>
}

// Galerie : 1 image plein cadre, 2-4 en grille (3 = la 1re en pleine largeur).
function MediaGallery({ urls, compact }) {
  const list = (urls || []).slice(0, 4)
  if (list.length === 0) return null
  const cap = compact ? 220 : 420
  if (list.length === 1) return <img src={list[0]} alt="" style={{ maxWidth: '100%', maxHeight: cap, borderRadius: compact ? 10 : 14, marginTop: 8, border: `1px solid ${T.border}`, display: 'block' }} />
  const cell = list.length === 2 ? (compact ? 130 : 200) : (compact ? 100 : 150)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, marginTop: 8, borderRadius: compact ? 10 : 14, overflow: 'hidden', border: `1px solid ${T.border}` }}>
      {list.map((u, i) => (
        <img key={i} src={u} alt="" style={{ width: '100%', height: cell, objectFit: 'cover', gridColumn: (list.length === 3 && i === 0) ? 'span 2' : 'auto' }} />
      ))}
    </div>
  )
}

// Bloc original cité / reposté (lecture seule).
function Embedded({ p, onClick }) {
  const deleted = !!p?.deleted_at
  return (
    <div onClick={onClick} style={{ border: `1px solid ${T.border}`, borderRadius: 14, padding: '10px 12px', marginTop: 8, cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Avatar url={p.author_avatar} name={p.author_username} size={22} />
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{p.author_username || `Pirate #${String(p.author_id || '').slice(-5)}`}</span>
        <span style={{ fontSize: 12, color: T.textFaint }}>· {timeAgo(p.created_at)}</span>
      </div>
      {deleted ? <span style={{ fontSize: 14, color: T.textFaint, fontStyle: 'italic' }}>Post supprimé</span> : <>
        {p.content && <div style={{ fontSize: 14, color: T.text, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><RichText text={p.content} mentions={p.mentions} /></div>}
        <MediaGallery urls={p.media_urls?.length ? p.media_urls : (p.media_url ? [p.media_url] : [])} compact />
      </>}
    </div>
  )
}

const actionStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: T.textFaint, fontFamily: 'inherit', padding: '4px 8px', borderRadius: 8 }

export default function PostCard({ post, embedded = false, disableNav = false, onChange, onDeleted, onQuote }) {
  const { discordId } = useAuth()
  const navigate = useNavigate()
  const isRepost = !!post.repost_of && !!post.original
  const isPureRepost = isRepost && !post.content
  const main = isPureRepost ? post.original : post   // post qu'on affiche/actionne en principal
  const quoted = (isRepost && post.content) ? post.original : null   // original cité (quote-repost)
  const [busy, setBusy] = useState(false)
  const [repostMenu, setRepostMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(post.content || '')
  const mineRow = post.author_id === discordId
  const canEdit = !post.repost_of && mineRow && !post.deleted_at
  const deleted = !!main?.deleted_at

  if (embedded) return <Embedded p={post} />

  async function like(e) {
    e.stopPropagation()
    if (!discordId) { navigate('/messages'); return }
    const liked = !main.liked
    onChange?.(main.id, { liked, like_count: (main.like_count || 0) + (liked ? 1 : -1) })
    const res = await toggleLike(main.id)
    if (res?.ok === false) onChange?.(main.id, { liked: main.liked, like_count: main.like_count })
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
    e.stopPropagation(); setRepostMenu(false); setBusy(true)
    const res = await createPost({ repostOf: main.id })
    setBusy(false)
    if (res?.ok) onChange?.(main.id, { repost_count: (main.repost_count || 0) + 1 })
    else if (res?.error) alert(res.error)
  }
  async function remove(e) {
    e.stopPropagation()
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
  const goThread = () => { if (!disableNav && !deleted) navigate(`/fil/${main.id}`) }

  return (
    <article onClick={goThread} style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${T.border}`, cursor: disableNav || deleted ? 'default' : 'pointer' }}>
      <div style={{ flexShrink: 0 }}>
        <Link to={`/u/${main.author_id}`} onClick={e => e.stopPropagation()}><Avatar url={main.author_avatar} name={main.author_username} /></Link>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {isPureRepost && <div style={{ fontSize: 12, color: T.textFaint, fontWeight: 600, marginBottom: 4 }}>🔁 {mineRow ? 'Tu as' : `${post.author_username || 'Quelqu’un'} a`} reposté</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <Link to={`/u/${main.author_id}`} onClick={e => e.stopPropagation()} style={{ fontSize: 15, fontWeight: 800, color: T.text, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {main.author_username || `Pirate #${String(main.author_id || '').slice(-5)}`}
          </Link>
          <span style={{ fontSize: 13, color: T.textFaint, flexShrink: 0 }}>· {timeAgo(main.created_at)}{main.edited_at ? ' · modifié' : ''}</span>
          {(mineRow || (!isRepost && main.author_id === discordId)) && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
              {canEdit && !editing && <button onClick={() => { setEditText(post.content || ''); setEditing(true) }} title="Modifier" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: T.textFaint, fontSize: 13, padding: 4 }}>✏️</button>}
              <button onClick={remove} title="Supprimer" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: T.textFaint, fontSize: 13, padding: 4 }}>🗑</button>
            </div>
          )}
        </div>

        {deleted ? <div style={{ fontSize: 15, color: T.textFaint, fontStyle: 'italic' }}>Post supprimé</div> : <>
          {editing ? (
            <div onClick={e => e.stopPropagation()}>
              <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3} autoFocus
                style={{ width: '100%', resize: 'none', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 15, fontFamily: 'inherit', padding: 10, boxSizing: 'border-box', outline: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button onClick={() => setEditing(false)} style={{ ...btn('ghost'), padding: '6px 14px', fontSize: 12 }}>Annuler</button>
                <button onClick={saveEdit} disabled={editText.trim().length > 500} style={{ ...btn('gold'), padding: '6px 16px', fontSize: 12 }}>Enregistrer</button>
              </div>
            </div>
          ) : (
            main.content && <div style={{ fontSize: 15, color: T.text, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><RichText text={main.content} mentions={main.mentions} /></div>
          )}
          {!editing && <MediaGallery urls={main.media_urls?.length ? main.media_urls : (main.media_url ? [main.media_url] : [])} />}
          {quoted && <Embedded p={quoted} onClick={(e) => { e.stopPropagation(); navigate(`/fil/${quoted.id}`) }} />}

          {!editing && (
            <div style={{ display: 'flex', gap: 18, marginTop: 10, position: 'relative' }}>
              <button onClick={(e) => { e.stopPropagation(); navigate(`/fil/${main.id}`) }} style={actionStyle}
                onMouseEnter={e => { e.currentTarget.style.color = T.blue }} onMouseLeave={e => { e.currentTarget.style.color = T.textFaint }}>💬 {main.reply_count || 0}</button>
              <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setRepostMenu(o => !o)} disabled={busy} style={actionStyle}
                  onMouseEnter={e => { e.currentTarget.style.color = T.green }} onMouseLeave={e => { e.currentTarget.style.color = T.textFaint }}>🔁 {main.repost_count || 0}</button>
                {repostMenu && (
                  <div style={{ position: 'absolute', bottom: 32, left: 0, zIndex: 10, background: '#16171d', border: `1px solid ${T.border}`, borderRadius: 10, padding: 4, minWidth: 150, boxShadow: '0 10px 30px rgba(0,0,0,.5)' }}>
                    <button onClick={doRepost} style={menuItem}>🔁 Reposter</button>
                    {onQuote && <button onClick={() => { setRepostMenu(false); onQuote(main) }} style={menuItem}>✍️ Citer</button>}
                  </div>
                )}
              </div>
              <button onClick={like} style={{ ...actionStyle, color: main.liked ? T.red : T.textFaint }}
                onMouseEnter={e => { e.currentTarget.style.color = T.red }} onMouseLeave={e => { e.currentTarget.style.color = main.liked ? T.red : T.textFaint }}>{main.liked ? '❤️' : '🤍'} {main.like_count || 0}</button>
              <button onClick={bookmark} title={main.bookmarked ? 'Retirer des signets' : 'Enregistrer'} style={{ ...actionStyle, marginLeft: 'auto', color: main.bookmarked ? T.gold : T.textFaint }}
                onMouseEnter={e => { e.currentTarget.style.color = T.gold }} onMouseLeave={e => { e.currentTarget.style.color = main.bookmarked ? T.gold : T.textFaint }}>{main.bookmarked ? '🔖' : '📑'}</button>
            </div>
          )}
        </>}
      </div>
    </article>
  )
}

const menuItem = { display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 7, border: 'none', background: 'transparent', color: T.text, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }
