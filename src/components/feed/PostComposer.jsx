import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { createPost, uploadAttachment, searchUsers } from '../../lib/feed.js'
import { btn, avatar, T } from '../social/socialStyles.js'

const MAX = 500
const ALLOWED_IMG = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

// Détecte une mention en cours juste avant le curseur (@ suivi de [a-z0-9_.]).
function detectMention(value, caret) {
  const before = value.slice(0, caret)
  const m = before.match(/(?:^|\s)@([A-Za-z0-9_.]*)$/)
  if (!m) return null
  const query = m[1]
  return { start: caret - query.length - 1, query }
}

// Composer de post / réponse / citation. onPosted(newPostId) après succès.
export default function PostComposer({ replyTo = null, quote = null, onPosted, placeholder, autoFocus = false }) {
  const { isAuthenticated, displayName, avatarUrl } = useAuth()
  const [text, setText] = useState('')
  const [attach, setAttach] = useState(null)
  const [busy, setBusy] = useState(false)
  const [mention, setMention] = useState(null)     // { start, query } | null
  const [suggestions, setSuggestions] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const fileRef = useRef(null)
  const taRef = useRef(null)

  // Recherche débouncée des membres pendant la frappe d'une @mention.
  useEffect(() => {
    const q = mention?.query
    if (q == null || q.length < 1) { setSuggestions([]); return }
    let active = true
    const t = setTimeout(async () => {
      const res = await searchUsers(q)
      if (active) { setSuggestions(res); setActiveIdx(0) }
    }, 180)
    return () => { active = false; clearTimeout(t) }
  }, [mention?.query])

  if (!isAuthenticated) return null

  function onChangeText(e) {
    setText(e.target.value)
    setMention(detectMention(e.target.value, e.target.selectionStart))
  }

  function selectMention(u) {
    if (!mention) return
    const caret = taRef.current?.selectionStart ?? text.length
    const next = text.slice(0, mention.start) + '@' + u.username + ' ' + text.slice(caret)
    setText(next); setMention(null); setSuggestions([])
    const pos = mention.start + u.username.length + 2
    requestAnimationFrame(() => { taRef.current?.focus(); taRef.current?.setSelectionRange(pos, pos) })
  }

  function onKeyDown(e) {
    if (suggestions.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => (i + 1) % suggestions.length); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => (i - 1 + suggestions.length) % suggestions.length); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); selectMention(suggestions[activeIdx]); return }
      if (e.key === 'Escape')    { setMention(null); setSuggestions([]); return }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit()
  }

  function pickFile(e) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    if (!ALLOWED_IMG.includes(f.type)) { setAttach({ error: 'Format image non supporté' }); return }
    if (f.size > 30 * 1024 * 1024) { setAttach({ error: 'Image trop lourde (max 30 Mo)' }); return }
    setAttach({ file: f, preview: URL.createObjectURL(f) })
  }

  async function submit() {
    if (busy) return
    const content = text.trim()
    if (!content && !attach?.file && !quote) return
    setBusy(true)
    try {
      let mediaUrl = null
      if (attach?.file) {
        const up = await uploadAttachment(attach.file)
        if (up.error) { setAttach({ error: up.error }); setBusy(false); return }
        mediaUrl = up.url
      }
      const res = await createPost({ content: content || null, mediaUrl, replyTo, repostOf: quote?.id || null })
      if (res?.ok) { setText(''); setAttach(null); setMention(null); setSuggestions([]); onPosted?.(res.post_id) }
      else if (res?.error) alert(res.error)
    } finally { setBusy(false) }
  }

  const over = text.length > MAX
  return (
    <div style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
      <span style={avatar(42)}>{avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (displayName || '?').slice(0, 2).toUpperCase()}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ position: 'relative' }}>
          <textarea
            ref={taRef} value={text} onChange={onChangeText} onKeyDown={onKeyDown} autoFocus={autoFocus}
            placeholder={placeholder || (quote ? 'Ajoute un commentaire…' : replyTo ? 'Poste ta réponse…' : 'Quoi de neuf, nakama ?')}
            rows={replyTo || quote ? 2 : 3}
            style={{ width: '100%', resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: T.text, fontSize: 16, fontFamily: 'inherit', lineHeight: 1.45, boxSizing: 'border-box' }}
          />
          {suggestions.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 30, minWidth: 240, maxWidth: 320, background: '#16171d', border: `1px solid ${T.border}`, borderRadius: 12, padding: 4, boxShadow: '0 12px 36px rgba(0,0,0,.55)' }}>
              {suggestions.map((u, i) => (
                <button key={u.uid} type="button" onMouseDown={e => { e.preventDefault(); selectMention(u) }} onMouseEnter={() => setActiveIdx(i)}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left', padding: '7px 9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: i === activeIdx ? T.surface2 : 'transparent' }}>
                  <span style={avatar(28)}>{u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.username || '?').slice(0, 2).toUpperCase()}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{u.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {quote && (
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, padding: '10px 12px', marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <span style={avatar(20)}>{quote.author_avatar ? <img src={quote.author_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (quote.author_username || '?').slice(0, 2).toUpperCase()}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{quote.author_username || `Pirate #${String(quote.author_id || '').slice(-5)}`}</span>
            </div>
            <div style={{ fontSize: 13, color: T.textDim, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{quote.content || (quote.media_url ? '🖼️ Image' : '')}</div>
          </div>
        )}
        {attach?.preview && (
          <div style={{ position: 'relative', display: 'inline-block', marginTop: 8 }}>
            <img src={attach.preview} alt="" style={{ maxWidth: 220, maxHeight: 220, borderRadius: 12, border: `1px solid ${T.border}` }} />
            <button onClick={() => setAttach(null)} style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.7)', color: '#fff', cursor: 'pointer', fontSize: 13 }}>✕</button>
          </div>
        )}
        {attach?.error && <div style={{ fontSize: 12, color: T.red, marginTop: 6 }}>⚠️ {attach.error}</div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={pickFile} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} title="Image" style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: T.gold, padding: 4, borderRadius: 8 }}>🖼️</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: over ? T.red : T.textFaint, fontVariantNumeric: 'tabular-nums' }}>{text.length}/{MAX}</span>
            <button onClick={submit} disabled={busy || over || (!text.trim() && !attach?.file && !quote)} style={{ ...btn('gold'), padding: '8px 18px', opacity: (busy || over || (!text.trim() && !attach?.file && !quote)) ? 0.5 : 1 }}>
              {busy ? '…' : (quote ? 'Citer' : replyTo ? 'Répondre' : 'Poster')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
