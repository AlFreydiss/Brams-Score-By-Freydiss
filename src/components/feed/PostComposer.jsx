import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { BarChart3, EyeOff, Film, Hash, ImagePlus, Loader2, Send, Smile, Sparkles, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { createPost, uploadAttachment, searchUsers } from '../../lib/feed.js'
import { avatar, T } from '../social/socialStyles.js'
import GifPicker from '../social/GifPicker.jsx'
import VideoTrimmer from './VideoTrimmer.jsx'

const MAX = 500
const ALLOWED_IMG = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime']
const PLACEHOLDERS = [
  'Partage une théorie...',
  'Balance ton hot take...',
  'Montre ton fan art...',
  'Lance un débat...',
  'Quel anime mérite plus de respect ?',
]

function detectMention(value, caret) {
  const before = value.slice(0, caret)
  const m = before.match(/(?:^|\s)@([A-Za-z0-9_.]*)$/)
  if (!m) return null
  const query = m[1]
  return { start: caret - query.length - 1, query }
}

export default function PostComposer({ replyTo = null, quote = null, onPosted, placeholder, autoFocus = false }) {
  const { isAuthenticated, displayName, avatarUrl } = useAuth()
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState([])
  const [attachErr, setAttachErr] = useState(null)
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [showGif, setShowGif] = useState(false)
  const [trimIdx, setTrimIdx] = useState(null) // index de la vidéo en cours de rognage
  const [mention, setMention] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const fileRef = useRef(null)
  const taRef = useRef(null)
  const statusTimer = useRef(null)
  const attachmentsRef = useRef([])

  const draftKey = useMemo(() => {
    if (quote?.id) return `feed:draft:quote:${quote.id}`
    if (replyTo) return `feed:draft:reply:${replyTo}`
    return 'feed:draft:root'
  }, [quote?.id, replyTo])

  const resolvedPlaceholder = useMemo(() => {
    if (placeholder) return placeholder
    if (quote) return 'Ajoute un commentaire...'
    if (replyTo) return 'Poste ta réponse...'
    return PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]
  }, [placeholder, quote, replyTo])

  useEffect(() => {
    const draft = localStorage.getItem(draftKey)
    if (draft) setText(draft)
  }, [draftKey])

  useEffect(() => {
    if (!text.trim()) localStorage.removeItem(draftKey)
    else localStorage.setItem(draftKey, text)
  }, [draftKey, text])

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [text, focused])

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

  useEffect(() => { attachmentsRef.current = attachments }, [attachments])

  useEffect(() => () => {
    clearTimeout(statusTimer.current)
    for (const a of attachmentsRef.current) if (a.objectUrl) URL.revokeObjectURL(a.preview)
  }, [])

  if (!isAuthenticated) return null

  function setTransientStatus(next) {
    setStatus(next)
    clearTimeout(statusTimer.current)
    if (next?.type === 'success') statusTimer.current = setTimeout(() => setStatus(null), 1800)
  }

  const addFiles = useCallback((files) => {
    setAttachErr(null)
    setAttachments(prev => {
      const next = [...prev]
      for (const f of files) {
        const isVideo = ALLOWED_VIDEO.includes(f.type)
        if (next.length >= 4) { setAttachErr('4 médias maximum'); break }
        if (!ALLOWED_IMG.includes(f.type) && !isVideo) { setAttachErr('Format non supporté (image, GIF ou vidéo)'); continue }
        if (isVideo && next.some(a => a.isVideo)) { setAttachErr('1 vidéo maximum par post'); continue }
        if (isVideo && f.size > 200 * 1024 * 1024) { setAttachErr('Vidéo trop lourde (max 200 Mo)'); continue }
        if (!isVideo && f.size > 30 * 1024 * 1024) { setAttachErr('Image trop lourde (max 30 Mo)'); continue }
        next.push({ file: f, preview: URL.createObjectURL(f), objectUrl: true, isVideo })
      }
      return next
    })
  }, [])

  function onChangeText(e) {
    setText(e.target.value)
    setMention(detectMention(e.target.value, e.target.selectionStart))
  }

  function selectMention(u) {
    if (!mention) return
    const caret = taRef.current?.selectionStart ?? text.length
    const next = text.slice(0, mention.start) + '@' + u.username + ' ' + text.slice(caret)
    setText(next)
    setMention(null)
    setSuggestions([])
    const pos = mention.start + u.username.length + 2
    requestAnimationFrame(() => { taRef.current?.focus(); taRef.current?.setSelectionRange(pos, pos) })
  }

  function insertText(value, selectStart = 0, selectEnd = 0) {
    const el = taRef.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    const next = text.slice(0, start) + value + text.slice(end)
    setText(next)
    requestAnimationFrame(() => {
      const posStart = start + selectStart
      const posEnd = start + (selectEnd || value.length)
      taRef.current?.focus()
      taRef.current?.setSelectionRange(posStart, posEnd)
    })
  }

  function onKeyDown(e) {
    if (suggestions.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => (i + 1) % suggestions.length); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => (i - 1 + suggestions.length) % suggestions.length); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); selectMention(suggestions[activeIdx]); return }
      if (e.key === 'Escape') { setMention(null); setSuggestions([]); return }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit()
  }

  function pickFile(e) {
    addFiles([...(e.target.files || [])])
    e.target.value = ''
  }

  function removeAttachment(index) {
    setAttachments(prev => {
      const item = prev[index]
      if (item?.objectUrl) URL.revokeObjectURL(item.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function submit() {
    if (busy) return
    const content = text.trim()
    if (!content && !attachments.length && !quote) return
    if (content.length > MAX) return

    setBusy(true)
    setAttachErr(null)
    setTransientStatus(null)
    try {
      const urls = []
      for (const a of attachments) {
        if (a.remoteUrl) { urls.push(a.remoteUrl); continue }
        const up = await uploadAttachment(a.file)
        if (up.error) {
          setAttachErr(up.error)
          setTransientStatus({ type: 'error', text: up.error })
          setBusy(false)
          return
        }
        urls.push(up.url)
      }
      const res = await createPost({ content: content || null, mediaUrls: urls.length ? urls : null, replyTo, repostOf: quote?.id || null })
      if (res?.ok) {
        for (const a of attachments) if (a.objectUrl) URL.revokeObjectURL(a.preview)
        setText('')
        setAttachments([])
        setAttachErr(null)
        setMention(null)
        setSuggestions([])
        localStorage.removeItem(draftKey)
        setTransientStatus({ type: 'success', text: 'Publié' })
        onPosted?.(res.post_id)
      } else {
        setTransientStatus({ type: 'error', text: res?.error || 'Publication impossible' })
      }
    } finally {
      setBusy(false)
    }
  }

  const over = text.length > MAX
  const disabled = busy || over || (!text.trim() && !attachments.length && !quote)

  return (
    <div
      className={`feed-composer ${focused ? 'is-focused' : ''} ${dragging ? 'is-dragging' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault()
        setDragging(false)
        addFiles([...(e.dataTransfer.files || [])])
      }}
    >
      <span style={avatar(44)}>
        {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (displayName || '?').slice(0, 2).toUpperCase()}
      </span>

      <div className="feed-composer-body">
        <div style={{ position: 'relative' }}>
          <textarea
            ref={taRef}
            value={text}
            onChange={onChangeText}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoFocus={autoFocus}
            placeholder={resolvedPlaceholder}
            rows={replyTo || quote ? 2 : 3}
            aria-label={replyTo ? 'Répondre au post' : 'Composer un post'}
          />

          {suggestions.length > 0 && (
            <div className="feed-mention-popover">
              {suggestions.map((u, i) => (
                <button
                  key={u.uid}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); selectMention(u) }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`feed-mention-option ${i === activeIdx ? 'is-active' : ''}`}
                >
                  <span style={avatar(28)}>{u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.username || '?').slice(0, 2).toUpperCase()}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{u.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {quote && (
          <div className="feed-card" style={{ marginTop: 8, marginBottom: 0, padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <span style={avatar(20)}>{quote.author_avatar ? <img src={quote.author_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (quote.author_username || '?').slice(0, 2).toUpperCase()}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{quote.author_username || `Pirate #${String(quote.author_id || '').slice(-5)}`}</span>
            </div>
            <div style={{ fontSize: 13, color: T.textDim, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{quote.content || (quote.media_url ? 'Image' : '')}</div>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="feed-attachments">
            {attachments.map((a, i) => (
              <div key={`${a.preview}-${i}`} className="feed-attachment">
                {a.isVideo
                  ? <video src={a.preview} controls playsInline style={{ width: '100%', display: 'block', maxHeight: 240, background: '#000' }} />
                  : <img src={a.preview} alt="" loading="lazy" />}
                {a.isVideo && a.file && (
                  <button type="button" onClick={() => setTrimIdx(i)} aria-label="Rogner la vidéo" title="Rogner la vidéo" style={{
                    position: 'absolute', left: 8, top: 8, display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
                    background: 'rgba(0,0,0,.65)', border: '1px solid rgba(212,160,23,.45)', color: T.gold,
                  }}>✂️ Rogner</button>
                )}
                <button type="button" onClick={() => removeAttachment(i)} className="feed-attachment-remove" aria-label="Supprimer le média"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}

        {trimIdx != null && attachments[trimIdx]?.file && (
          <VideoTrimmer
            file={attachments[trimIdx].file}
            onCancel={() => setTrimIdx(null)}
            onDone={(clip) => {
              setAttachments(prev => prev.map((a, i) => {
                if (i !== trimIdx) return a
                if (a.objectUrl) URL.revokeObjectURL(a.preview)
                return { file: clip, preview: URL.createObjectURL(clip), objectUrl: true, isVideo: true }
              }))
              setTrimIdx(null)
            }}
          />
        )}

        {attachErr && <div className="feed-status is-error">{attachErr}</div>}
        {status && <div className={`feed-status is-${status.type}`}>{status.text}</div>}

        <div className="feed-composer-toolbar">
          <div className="feed-composer-tools" style={{ position: 'relative' }}>
            <input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={pickFile} style={{ display: 'none' }} />
            <button type="button" onClick={() => fileRef.current?.click()} title="Images" className="feed-tool-button" aria-label="Ajouter une image"><ImagePlus size={18} /></button>
            <button type="button" onClick={() => setShowGif(v => !v)} title="GIF" className="feed-tool-button" aria-label="Ajouter un GIF"><Film size={18} /></button>
            <button type="button" onClick={() => insertText('🔥')} title="Emoji" className="feed-tool-button" aria-label="Ajouter un emoji"><Smile size={18} /></button>
            <button type="button" onClick={() => insertText('#theorie ')} title="Hashtag" className="feed-tool-button" aria-label="Ajouter un hashtag"><Hash size={18} /></button>
            <button type="button" onClick={() => insertText('||spoiler||', 2, 9)} title="Spoiler" className="feed-tool-button" aria-label="Ajouter un spoiler"><EyeOff size={18} /></button>
            <button type="button" onClick={() => insertText('#anime ')} title="Anime / univers" className="feed-tool-button" aria-label="Ajouter un tag anime"><Sparkles size={18} /></button>
            <button type="button" disabled title="Sondages: backend à ajouter avant activation" className="feed-tool-button" aria-label="Sondages indisponibles"><BarChart3 size={18} /></button>
            {showGif && (
              <div className="feed-gif-popover">
                <GifPicker onSelect={(url) => {
                  setAttachments(prev => prev.length >= 4 ? prev : [...prev, { preview: url, remoteUrl: url }])
                  setShowGif(false)
                }} />
              </div>
            )}
          </div>

          <div className="feed-composer-submit">
            <span style={{ fontSize: 12, color: over ? T.red : T.textFaint, fontVariantNumeric: 'tabular-nums' }}>{text.length}/{MAX}</span>
            <button type="button" onClick={submit} disabled={disabled} className="feed-post-button">
              {busy ? <Loader2 size={15} /> : <Send size={15} />}
              {quote ? 'Citer' : replyTo ? 'Répondre' : 'Poster'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
