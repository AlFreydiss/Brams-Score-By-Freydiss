import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { searchPosts } from '../lib/feed.js'
import PostCard from './feed/PostCard.jsx'
import QuoteModal from './feed/QuoteModal.jsx'
import { T } from './social/socialStyles.js'

const COL = { maxWidth: 600, margin: '0 auto', minHeight: '100vh', borderLeft: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}` }

function patch(list, id, partial) {
  return list.map(p => p.id === id ? { ...p, ...partial } : (p.original?.id === id ? { ...p, original: { ...p.original, ...partial } } : p))
}

export default function FeedSearchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const q = (params.get('q') || '').trim()
  const isTag = q.startsWith('#')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [quoteTarget, setQuoteTarget] = useState(null)

  const load = useCallback(async () => {
    if (q.length < 2) { setPosts([]); setLoading(false); return }
    setLoading(true)
    const list = await searchPosts(q)
    setPosts(Array.isArray(list) ? list : []); setLoading(false)
  }, [q])
  useEffect(() => { load() }, [load])

  const onChange = (id, partial) => setPosts(prev => patch(prev, id, partial))
  const onDeleted = (rowId) => setPosts(prev => prev.filter(p => p.id !== rowId))

  return (
    <div style={{ height: 'calc(100vh - 72px)', marginTop: 72, overflowY: 'auto', background: T.bg }}>
      <div>
        <div style={COL}>
          <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'rgba(8,9,13,0.82)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}` }}>
            <button onClick={() => navigate('/fil')} style={{ border: 'none', background: 'transparent', color: T.text, cursor: 'pointer', fontSize: 18 }}>←</button>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isTag ? <span style={{ color: T.violet }}>{q}</span> : `Recherche : « ${q} »`}
              </h1>
              {!loading && <div style={{ fontSize: 12, color: T.textFaint }}>{posts.length} résultat{posts.length > 1 ? 's' : ''}</div>}
            </div>
          </div>

          {loading ? <div style={{ padding: '48px 16px', textAlign: 'center', color: T.textFaint }}>Recherche…</div>
            : q.length < 2 ? <div style={{ padding: '48px 24px', textAlign: 'center', color: T.textFaint, fontSize: 14 }}>Tape au moins 2 caractères.</div>
            : posts.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', color: T.textFaint, fontSize: 14, lineHeight: 1.7 }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>🔍</div>
                Aucun post pour {isTag ? <span style={{ color: T.violet }}>{q}</span> : `« ${q} »`}.<br />Sois le premier à en parler !
              </div>
            ) : posts.map(p => <PostCard key={p.id} post={p} onChange={onChange} onDeleted={onDeleted} onQuote={setQuoteTarget} />)}
        </div>
      </div>
      <QuoteModal quote={quoteTarget} onClose={() => setQuoteTarget(null)} onPosted={load} />
    </div>
  )
}
