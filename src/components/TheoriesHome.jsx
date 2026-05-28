import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTheories } from '../lib/wiki.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const G = {
  bg:      '#08090D',
  card:    'rgba(13,14,20,0.97)',
  border:  'rgba(255,255,255,0.07)',
  gold:    '#BFA46A',
  muted:   'rgba(232,228,222,0.38)',
  text:    '#e8e4de',
  violet:  '#7b3f45',
}

const TH_CSS = `
  @keyframes thFadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
  @keyframes thPulse  { 0%,100%{opacity:.04} 50%{opacity:.09} }
  .th-card:hover { border-color: rgba(191,164,106,.22) !important; background: rgba(16,17,24,0.98) !important; }
  .th-vote-btn:hover { background: rgba(191,164,106,.12) !important; }
  .th-vote-up:hover  { color: #34d399 !important; }
  .th-vote-dn:hover  { color: #f87171 !important; }
`

const CATEGORIES = ['Tous', 'Personnages', 'Arcs', 'Fruits du Démon', 'Lieux', 'Organisations', 'Autre']
const SORTS = [
  { id: 'recent', label: 'Récent', icon: '🕐' },
  { id: 'top',    label: 'Top',    icon: '🔥' },
  { id: 'hot',    label: 'Hot',    icon: '💬' },
]
const LIMIT = 15

const CAT_COLORS = {
  'Personnages':     '#9b4d55',
  'Arcs':            '#b08a3a',
  'Fruits du Démon': '#7060a0',
  'Lieux':           '#4d7080',
  'Organisations':   '#4d7060',
  'Autre':           '#6b7280',
  'Tous':            '#BFA46A',
}

function relativeTime(iso) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)  return 'à l\'instant'
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)}j`
  return new Date(iso).toLocaleDateString('fr-FR')
}

function Avatar({ name, avatarUrl, size = 38 }) {
  const [err, setErr] = useState(false)
  const initials = (name || 'P').slice(0, 2).toUpperCase()
  const seed = (name || 'P').charCodeAt(0) % 6
  const colors = ['#7b3f45','#b08a3a','#7060a0','#4d7080','#4d7060','#6b7280']
  if (avatarUrl && !err) {
    return <img src={avatarUrl} alt={name} onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: colors[seed], display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: 'rgba(255,255,255,0.9)',
    }}>{initials}</div>
  )
}

function TheoryPost({ theory, index, onClick, onVote, myVote }) {
  const c = CAT_COLORS[theory.category] || G.gold
  const up   = theory.votes_up   || 0
  const down = theory.votes_down || 0
  const score = up - down
  const excerpt = theory.content
    ? theory.content.replace(/<[^>]*>/g, '').slice(0, 200)
    : ''

  return (
    <div
      className="th-card"
      onClick={onClick}
      style={{
        background: G.card,
        border: `1px solid ${G.border}`,
        borderRadius: 14,
        padding: '16px 20px',
        cursor: 'pointer',
        transition: 'all .18s',
        animation: `thFadeUp .35s ${Math.min(index * 0.04, 0.4)}s ease both`,
        display: 'flex',
        gap: 14,
      }}
    >
      {/* Left: avatar */}
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        <Avatar name={theory.author_name} avatarUrl={theory.author_avatar} size={40} />
      </div>

      {/* Right: content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: G.text }}>
            {theory.author_name || 'Pirate Brams'}
          </span>
          <span style={{ fontSize: 11, color: G.muted }}>·</span>
          <span style={{ fontSize: 11, color: G.muted }}>{relativeTime(theory.created_at)}</span>
          <span style={{
            marginLeft: 'auto',
            fontSize: 9, fontWeight: 800, letterSpacing: '.08em',
            padding: '2px 8px', borderRadius: 100,
            background: `${c}14`, color: c, border: `1px solid ${c}30`,
            textTransform: 'uppercase', flexShrink: 0,
          }}>
            {theory.category}
          </span>
        </div>

        {/* Title */}
        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 6, lineHeight: 1.35 }}>
          {theory.title}
        </div>

        {/* Excerpt */}
        {excerpt && (
          <div style={{ fontSize: 13, color: 'rgba(232,228,222,0.52)', lineHeight: 1.6, marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
            {excerpt}{excerpt.length >= 200 ? '...' : ''}
          </div>
        )}

        {/* Tags */}
        {(theory.tags || []).length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
            {(theory.tags || []).slice(0, 3).map(tag => (
              <span key={tag} style={{ fontSize: 10, padding: '1px 7px', borderRadius: 100, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.32)', border: '1px solid rgba(255,255,255,0.07)' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Cover image */}
        {theory.cover_image && (
          <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 10, maxHeight: 180 }}>
            <img src={theory.cover_image} alt="" style={{ width: '100%', objectFit: 'cover', display: 'block', maxHeight: 180 }} />
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }} onClick={e => e.stopPropagation()}>
          {/* Upvote */}
          <button
            className="th-vote-btn th-vote-up"
            onClick={e => { e.stopPropagation(); onVote(theory.id, 'up') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', borderRadius: 999, border: 'none',
              background: myVote === 'up' ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.04)',
              color: myVote === 'up' ? '#34d399' : G.muted,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
            }}
          >
            ▲ {up}
          </button>

          {/* Downvote */}
          <button
            className="th-vote-btn th-vote-dn"
            onClick={e => { e.stopPropagation(); onVote(theory.id, 'down') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', borderRadius: 999, border: 'none',
              background: myVote === 'down' ? 'rgba(248,113,113,0.14)' : 'rgba(255,255,255,0.04)',
              color: myVote === 'down' ? '#f87171' : G.muted,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
            }}
          >
            ▼ {down}
          </button>

          {/* Score */}
          <span style={{ fontSize: 12, fontWeight: 800, marginLeft: 2, color: score > 0 ? '#34d399' : score < 0 ? '#f87171' : G.muted }}>
            {score > 0 ? `+${score}` : score}
          </span>

          {/* Comments */}
          <button
            onClick={e => { e.stopPropagation(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', borderRadius: 999, border: 'none',
              background: 'rgba(255,255,255,0.04)', color: G.muted,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', marginLeft: 4,
            }}
          >
            💬 {theory.comments_count || 0}
          </button>

          {/* Lire */}
          <button
            onClick={onClick}
            style={{
              marginLeft: 'auto', padding: '5px 14px', borderRadius: 999,
              border: `1px solid ${G.gold}33`, background: 'transparent',
              color: G.gold, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            Lire →
          </button>
        </div>
      </div>
    </div>
  )
}

function ComposeBox({ onPost }) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return null
  return (
    <div
      onClick={() => navigate('/theories/new')}
      style={{
        background: G.card, border: `1px solid ${G.border}`,
        borderRadius: 14, padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer', marginBottom: 12,
        transition: 'border-color .18s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(191,164,106,.28)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = G.border}
    >
      <div style={{
        flex: 1, padding: '10px 16px', borderRadius: 999,
        background: 'rgba(255,255,255,0.04)', border: `1px solid ${G.border}`,
        color: 'rgba(232,228,222,0.32)', fontSize: 14,
      }}>
        Partage une théorie One Piece...
      </div>
      <button style={{
        background: G.gold, border: 'none', borderRadius: 999,
        padding: '9px 20px', fontSize: 13, fontWeight: 800,
        color: '#08090D', cursor: 'pointer', flexShrink: 0,
      }}>
        Publier
      </button>
    </div>
  )
}

export default function TheoriesHome() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [theories, setTheories] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [category, setCategory] = useState('Tous')
  const [sort,     setSort]     = useState('recent')
  const [page,     setPage]     = useState(0)
  const [hasMore,  setHasMore]  = useState(true)
  const [myVotes,  setMyVotes]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('brams_theory_votes') || '{}') } catch { return {} }
  })

  useEffect(() => {
    document.title = 'Théories — Brams Community'
    return () => { document.title = 'Brams Community' }
  }, [])

  useEffect(() => {
    setLoading(true); setPage(0)
    fetchTheories({ category, sort, limit: LIMIT, offset: 0 }).then(data => {
      setTheories(data)
      setHasMore(data.length === LIMIT)
      setLoading(false)
    })
  }, [category, sort])

  async function loadMore() {
    const nextPage = page + 1
    const data = await fetchTheories({ category, sort, limit: LIMIT, offset: nextPage * LIMIT })
    setTheories(prev => [...prev, ...data])
    setHasMore(data.length === LIMIT)
    setPage(nextPage)
  }

  const handleVote = useCallback((id, dir) => {
    if (!isAuthenticated) {
      document.dispatchEvent(new CustomEvent('open-auth-modal'))
      return
    }
    setMyVotes(prev => {
      const current = prev[id]
      const next = { ...prev }
      if (current === dir) {
        delete next[id]
        setTheories(ts => ts.map(t => t.id === id ? {
          ...t,
          votes_up:   dir === 'up'   ? Math.max(0, (t.votes_up   || 0) - 1) : t.votes_up,
          votes_down: dir === 'down' ? Math.max(0, (t.votes_down || 0) - 1) : t.votes_down,
        } : t))
      } else {
        next[id] = dir
        setTheories(ts => ts.map(t => t.id === id ? {
          ...t,
          votes_up:   dir === 'up'   ? (t.votes_up   || 0) + 1 : current === 'up'   ? Math.max(0, (t.votes_up   || 0) - 1) : t.votes_up,
          votes_down: dir === 'down' ? (t.votes_down || 0) + 1 : current === 'down' ? Math.max(0, (t.votes_down || 0) - 1) : t.votes_down,
        } : t))
      }
      try { localStorage.setItem('brams_theory_votes', JSON.stringify(next)) } catch {}
      return next
    })
  }, [isAuthenticated])

  return (
    <div style={{ minHeight: '100vh', background: G.bg, color: G.text, paddingTop: 80 }}>
      <style>{TH_CSS}</style>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 16px 100px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-.02em' }}>
              🔮 Théories
            </h1>
            {!isAuthenticated && (
              <button
                onClick={() => document.dispatchEvent(new CustomEvent('open-auth-modal'))}
                style={{ padding: '7px 16px', borderRadius: 999, border: `1px solid ${G.gold}44`, background: 'transparent', color: G.gold, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Se connecter
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: G.muted }}>Partage, vote, débats — One Piece theories community</div>
        </div>

        {/* ── Compose box ── */}
        <ComposeBox />

        {/* ── Filters ── */}
        <div style={{ marginBottom: 16 }}>
          {/* Sort tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${G.border}`, marginBottom: 12 }}>
            {SORTS.map(s => (
              <button key={s.id} onClick={() => setSort(s.id)} style={{
                flex: 1, padding: '10px 0', border: 'none',
                background: 'transparent', cursor: 'pointer',
                color: sort === s.id ? G.gold : G.muted,
                fontSize: 13, fontWeight: 700,
                borderBottom: `2px solid ${sort === s.id ? G.gold : 'transparent'}`,
                transition: 'all .15s',
              }}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          {/* Category pills */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => {
              const active = category === cat
              const c = CAT_COLORS[cat] || G.gold
              return (
                <button key={cat} onClick={() => setCategory(cat)} style={{
                  padding: '5px 13px', borderRadius: 999,
                  border: `1px solid ${active ? c + '55' : 'rgba(255,255,255,0.08)'}`,
                  background: active ? `${c}14` : 'transparent',
                  color: active ? c : G.muted,
                  fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
                }}>
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Feed ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ height: 140, borderRadius: 14, background: 'rgba(255,255,255,0.03)', animation: 'thPulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : theories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: G.muted, fontSize: 15 }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: .4 }}>🔮</div>
            Aucune théorie dans cette catégorie. Sois le premier !
            {isAuthenticated && (
              <div style={{ marginTop: 20 }}>
                <button onClick={() => navigate('/theories/new')} style={{ padding: '10px 24px', borderRadius: 999, border: `1px solid ${G.gold}44`, background: `${G.gold}10`, color: G.gold, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  + Proposer une théorie
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {theories.map((t, i) => (
                <TheoryPost
                  key={t.id}
                  theory={t}
                  index={i}
                  onClick={() => navigate(`/theories/${t.id}`)}
                  onVote={handleVote}
                  myVote={myVotes[t.id]}
                />
              ))}
            </div>
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button onClick={loadMore} style={{
                  padding: '10px 28px', borderRadius: 999,
                  border: `1px solid ${G.border}`, background: 'transparent',
                  color: G.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  transition: 'all .15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = G.gold; e.currentTarget.style.color = G.gold }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = G.border; e.currentTarget.style.color = G.muted }}
                >
                  Charger plus
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
