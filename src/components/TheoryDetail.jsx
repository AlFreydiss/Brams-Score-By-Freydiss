import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchTheory, fetchUserVote, castVote, fetchComments, postComment } from '../lib/wiki.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { md } from '../lib/markdown.js'

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  return `il y a ${Math.floor(s / 86400)} j`
}

function VoteButton({ direction, count, active, onClick }) {
  const color = direction === 'up' ? '#2ECC71' : '#E0524A'
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 18px', borderRadius: 12, border: `1px solid ${active ? color + '60' : 'rgba(255,255,255,0.1)'}`, background: active ? `${color}15` : 'rgba(255,255,255,0.04)', color: active ? color : 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'all .2s', fontFamily: 'inherit' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color + '50'; e.currentTarget.style.color = color }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = active ? color + '60' : 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = active ? color : 'rgba(255,255,255,0.5)' }}
    >
      <span style={{ fontSize: 18 }}>{direction === 'up' ? '▲' : '▼'}</span>
      <span style={{ fontSize: 15, fontWeight: 800 }}>{count}</span>
    </button>
  )
}

function Comment({ comment, allComments, depth = 0, isAuthenticated, onSubmitReply }) {
  const [replying,   setReplying]   = useState(false)
  const [replyText,  setReplyText]  = useState('')
  const [sending,    setSending]    = useState(false)
  const children = allComments.filter(c => c.parent_id === comment.id)

  async function submitReply(e) {
    e.preventDefault()
    if (!replyText.trim()) return
    setSending(true)
    await onSubmitReply(replyText, comment.id)
    setReplyText(''); setReplying(false); setSending(false)
  }

  return (
    <div style={{ marginLeft: depth > 0 ? 28 : 0, marginBottom: 10 }}>
      <div style={{ background: depth === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #d4a017, #e5b83a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#1a1f2e', flexShrink: 0 }}>
            {(comment.author_name || 'A').slice(0, 2).toUpperCase()}
          </div>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{comment.author_name}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{timeAgo(comment.created_at)}</span>
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {comment.content}
        </div>
        {isAuthenticated && depth < 2 && (
          <button onClick={() => setReplying(v => !v)} style={{ marginTop: 10, background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '2px 0' }}>
            💬 Répondre
          </button>
        )}
        {replying && (
          <form onSubmit={submitReply} style={{ marginTop: 12 }}>
            <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Ta réponse..." rows={3} autoFocus
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
              onFocus={e => e.target.style.borderColor = 'rgba(212,160,23,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="submit" disabled={sending} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#d4a017', color: '#1a1f2e', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {sending ? '...' : 'Répondre'}
              </button>
              <button type="button" onClick={() => setReplying(false)} style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>
      {children.map(child => (
        <Comment key={child.id} comment={child} allComments={allComments} depth={depth + 1} isAuthenticated={isAuthenticated} onSubmitReply={onSubmitReply} />
      ))}
    </div>
  )
}

export default function TheoryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user, displayName } = useAuth()
  const [theory,     setTheory]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [notFound,   setNotFound]   = useState(false)
  const [userVote,   setUserVote]   = useState(null)
  const [votes,      setVotes]      = useState({ up: 0, down: 0 })
  const [comments,   setComments]   = useState([])
  const [newComment, setNewComment] = useState('')
  const [commenting, setCommenting] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchTheory(id).then(data => {
      if (!data) { setNotFound(true); setLoading(false); return }
      setTheory(data)
      setVotes({ up: data.votes_up, down: data.votes_down })
      document.title = `${data.title} — Théories Brams`
      setLoading(false)
    })
    fetchComments(id).then(setComments)
  }, [id])

  useEffect(() => {
    if (user) fetchUserVote(id, user.id).then(setUserVote)
  }, [id, user])

  useEffect(() => {
    return () => { document.title = 'Brams Community' }
  }, [])

  async function handleVote(vote) {
    if (!isAuthenticated) { document.dispatchEvent(new CustomEvent('open-auth-modal')); return }
    const prev = userVote
    const prevVotes = { ...votes }

    if (userVote === vote) {
      setUserVote(null)
      setVotes(v => ({ ...v, [vote === 1 ? 'up' : 'down']: Math.max(0, v[vote === 1 ? 'up' : 'down'] - 1) }))
    } else {
      if (prev !== null) setVotes(v => ({ ...v, [prev === 1 ? 'up' : 'down']: Math.max(0, v[prev === 1 ? 'up' : 'down'] - 1) }))
      setVotes(v => ({ ...v, [vote === 1 ? 'up' : 'down']: v[vote === 1 ? 'up' : 'down'] + 1 }))
      setUserVote(vote)
    }

    const { error } = await castVote(id, user.id, vote)
    if (error) { setUserVote(prev); setVotes(prevVotes) }
  }

  async function handleComment(e) {
    e.preventDefault()
    if (!newComment.trim() || !isAuthenticated) return
    setCommenting(true)
    const { data } = await postComment({ theory_id: id, parent_id: null, content: newComment.trim(), author_id: user.id, author_name: displayName })
    if (data) { setComments(prev => [...prev, data]); setNewComment('') }
    setCommenting(false)
  }

  async function handleReply(content, parentId) {
    if (!isAuthenticated) return
    const { data } = await postComment({ theory_id: id, parent_id: parentId, content, author_id: user.id, author_name: displayName })
    if (data) setComments(prev => [...prev, data])
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', paddingTop: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.3)' }}>Chargement...</div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', paddingTop: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🔍</div>
      <div style={{ fontFamily: "'Pirata One', cursive", fontSize: 28, color: '#fff' }}>Théorie introuvable</div>
      <button onClick={() => navigate('/theories')} style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#d4a017', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
        ← Retour aux théories
      </button>
    </div>
  )

  const score = votes.up - votes.down
  const rootComments = comments.filter(c => !c.parent_id)

  return (
    <div style={{ minHeight: '100vh', paddingTop: 80 }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
          <Link to="/theories" style={{ color: '#d4a017', textDecoration: 'none', fontWeight: 600 }}>Théories</Link>
          <span>›</span>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{theory.category}</span>
        </div>

        {theory.cover_image && (
          <img src={theory.cover_image} alt={theory.title} style={{ width: '100%', maxHeight: 340, objectFit: 'cover', borderRadius: 14, marginBottom: 28 }} />
        )}

        {/* Header avec votes */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <VoteButton direction="up"   count={votes.up}   active={userVote === 1}  onClick={() => handleVote(1)} />
            <div style={{ fontSize: 16, fontWeight: 800, color: score > 0 ? '#2ECC71' : score < 0 ? '#E0524A' : 'rgba(255,255,255,0.4)', textAlign: 'center', minWidth: 32 }}>
              {score > 0 ? '+' : ''}{score}
            </div>
            <VoteButton direction="down" count={votes.down} active={userVote === -1} onClick={() => handleVote(-1)} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12, background: 'rgba(212,160,23,0.12)', color: '#d4a017', border: '1px solid rgba(212,160,23,0.25)' }}>
                {theory.category}
              </span>
              {(theory.tags || []).map(tag => (
                <span key={tag} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  #{tag}
                </span>
              ))}
            </div>
            <h1 style={{ fontFamily: "'Pirata One', cursive", fontSize: 'clamp(22px,4vw,36px)', color: '#fff', margin: '0 0 12px', lineHeight: 1.2 }}>
              {theory.title}
            </h1>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
              ✍️ {theory.author_name} · 💬 {comments.length} commentaire{comments.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div style={{ marginBottom: 48, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="wiki-content" dangerouslySetInnerHTML={{ __html: md(theory.content) }} />
        </div>

        {/* Section commentaires */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 32 }}>
          <h2 style={{ fontWeight: 800, fontSize: 18, color: '#fff', marginBottom: 24 }}>
            💬 {comments.length} Commentaire{comments.length !== 1 ? 's' : ''}
          </h2>

          {isAuthenticated ? (
            <form onSubmit={handleComment} style={{ marginBottom: 32 }}>
              <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Partage ton avis sur cette théorie..." rows={4}
                style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, marginBottom: 10 }}
                onFocus={e => e.target.style.borderColor = 'rgba(212,160,23,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <button type="submit" disabled={!newComment.trim() || commenting} style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: '#d4a017', color: '#1a1f2e', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: newComment.trim() ? 1 : 0.5 }}>
                {commenting ? 'Envoi...' : 'Commenter'}
              </button>
            </form>
          ) : (
            <div style={{ marginBottom: 32, padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, textAlign: 'center' }}>
              <button onClick={() => document.dispatchEvent(new CustomEvent('open-auth-modal'))} style={{ background: 'none', border: 'none', color: '#d4a017', cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: 0 }}>
                Connecte-toi
              </button>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}> pour commenter et voter.</span>
            </div>
          )}

          {rootComments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
              Aucun commentaire. Sois le premier à réagir !
            </div>
          ) : (
            <div>
              {rootComments.map(c => (
                <Comment key={c.id} comment={c} allComments={comments} depth={0} isAuthenticated={isAuthenticated} onSubmitReply={handleReply} />
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Link to="/theories" style={{ color: '#d4a017', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>← Retour aux théories</Link>
          {isAuthenticated && (
            <button onClick={() => navigate('/theories/new')} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#d4a017', color: '#1a1f2e', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + Nouvelle théorie
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
