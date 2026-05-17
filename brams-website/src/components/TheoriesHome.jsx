import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTheories } from '../lib/wiki.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const CATEGORIES = ['Tous', 'Personnages', 'Arcs', 'Fruits du Démon', 'Lieux', 'Organisations', 'Autre']
const SORTS = [
  { id: 'recent', label: '🕐 Récent' },
  { id: 'top',    label: '🔥 Top votes' },
  { id: 'hot',    label: '💬 Hot' },
]
const LIMIT = 12

function ScoreBar({ up, down }) {
  const total = up + down
  const pct = total === 0 ? 50 : Math.round((up / total) * 100)
  return (
    <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #2ECC71, #34d399)', transition: 'width .3s' }} />
    </div>
  )
}

function TheoryCard({ theory, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'transform .15s, border-color .15s, box-shadow .15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,0.25)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {theory.cover_image && (
        <img src={theory.cover_image} alt={theory.title} style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
      )}
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 12, background: 'rgba(212,160,23,0.12)', color: '#d4a017', border: '1px solid rgba(212,160,23,0.25)' }}>
            {theory.category}
          </span>
          {(theory.tags || []).slice(0, 2).map(tag => (
            <span key={tag} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.38)', border: '1px solid rgba(255,255,255,0.07)' }}>
              #{tag}
            </span>
          ))}
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 8, lineHeight: 1.35 }}>{theory.title}</div>
        <ScoreBar up={theory.votes_up} down={theory.votes_down} />
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
          <span>✍️ {theory.author_name}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <span>👍 {theory.votes_up}</span>
            <span>💬 {theory.comments_count}</span>
          </span>
        </div>
      </div>
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

  return (
    <div style={{ minHeight: '100vh', paddingTop: 80 }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 24px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.15em', color: '#d4a017', textTransform: 'uppercase', marginBottom: 12 }}>Communauté</div>
          <h1 style={{ fontFamily: "'Pirata One', cursive", fontSize: 'clamp(36px,6vw,60px)', color: '#fff', marginBottom: 12, lineHeight: 1.1 }}>
            Forum Théories
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', maxWidth: 500, margin: '0 auto 28px', lineHeight: 1.7 }}>
            Partage tes théories, vote pour les meilleures, débats avec la communauté.
          </p>
          {isAuthenticated ? (
            <button onClick={() => navigate('/theories/new')} style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: '#d4a017', color: '#1a1f2e', fontSize: 13, fontWeight: 800, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#e5b83a'} onMouseLeave={e => e.currentTarget.style.background = '#d4a017'}>
              + Proposer une théorie
            </button>
          ) : (
            <button onClick={() => document.dispatchEvent(new CustomEvent('open-auth-modal'))} style={{ padding: '10px 24px', borderRadius: 9, border: '1px solid rgba(212,160,23,0.3)', background: 'transparent', color: '#d4a017', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Se connecter pour proposer →
            </button>
          )}
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all .15s', background: category === cat ? '#d4a017' : 'rgba(255,255,255,0.06)', color: category === cat ? '#1a1f2e' : 'rgba(255,255,255,0.55)' }}>
                {cat}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {SORTS.map(s => (
              <button key={s.id} onClick={() => setSort(s.id)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1px solid ${sort === s.id ? 'rgba(212,160,23,0.4)' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', transition: 'all .15s', background: sort === s.id ? 'rgba(212,160,23,0.12)' : 'transparent', color: sort === s.id ? '#d4a017' : 'rgba(255,255,255,0.45)' }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grille */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 200, borderRadius: 14, background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : theories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.25)', fontSize: 15 }}>
            Aucune théorie dans cette catégorie. Sois le premier !
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
              {theories.map(t => (
                <TheoryCard key={t.id} theory={t} onClick={() => navigate(`/theories/${t.id}`)} />
              ))}
            </div>
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <button onClick={loadMore} style={{ padding: '11px 28px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                  Voir plus
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
