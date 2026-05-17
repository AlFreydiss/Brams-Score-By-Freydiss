import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWikiCategories, fetchWikiPages } from '../lib/wiki.js'
import { useAuth } from '../contexts/AuthContext.jsx'

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000
  if (s < 60) return 'à l\'instant'
  if (s < 3600) return `il y a ${Math.floor(s/60)} min`
  if (s < 86400) return `il y a ${Math.floor(s/3600)} h`
  return `il y a ${Math.floor(s/86400)} j`
}

function PageCard({ page, onClick }) {
  const cat = page.wiki_categories
  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
        transition: 'transform .15s, border-color .15s, box-shadow .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,0.3)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {page.cover_image && (
        <img src={page.cover_image} alt={page.title} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
      )}
      {!page.cover_image && (
        <div style={{ height: 80, background: `linear-gradient(135deg, ${cat?.color ?? '#e0524a'}22, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
          {cat?.icon ?? '📄'}
        </div>
      )}
      <div style={{ padding: '14px 16px' }}>
        {cat && (
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: cat.color, textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
            {cat.icon} {cat.name}
          </span>
        )}
        <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 6, lineHeight: 1.3 }}>{page.title}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          {page.author_name} · {timeAgo(page.updated_at ?? page.created_at)} · 👁 {page.views ?? 0}
        </div>
      </div>
    </div>
  )
}

export default function WikiHome() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [categories, setCategories] = useState([])
  const [recent,     setRecent]     = useState([])
  const [search,     setSearch]     = useState('')
  const [results,    setResults]    = useState(null)
  const [searching,  setSearching]  = useState(false)
  const [activeTab,  setActiveTab]  = useState('accueil')

  useEffect(() => {
    fetchWikiCategories().then(setCategories)
    fetchWikiPages({ limit: 6 }).then(setRecent)
  }, [])

  useEffect(() => {
    if (!search.trim()) { setResults(null); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const data = await fetchWikiPages({ search: search.trim(), limit: 20 })
      setResults(data)
      setSearching(false)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const TABS = [
    { id: 'accueil', label: 'Accueil' },
    ...categories.map(c => ({ id: c.slug, label: `${c.icon} ${c.name}` })),
  ]

  return (
    <div style={{ minHeight: '100vh', paddingTop: 80, background: 'transparent' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 24px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.15em', color: '#d4a017', textTransform: 'uppercase', marginBottom: 12 }}>
            Communauté
          </div>
          <h1 style={{ fontFamily: "'Pirata One', cursive", fontSize: 'clamp(36px,6vw,64px)', color: '#fff', marginBottom: 12, lineHeight: 1.1 }}>
            Wiki One Piece
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', maxWidth: 520, margin: '0 auto 32px', lineHeight: 1.7 }}>
            L'encyclopédie communautaire francophone. Personnages, arcs, fruits du démon, lieux et bien plus.
          </p>

          {/* Search */}
          <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto 20px' }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'rgba(255,255,255,0.3)' }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un article..."
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '14px 16px 14px 46px', borderRadius: 12,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', fontSize: 15, outline: 'none',
                transition: 'border-color .15s', fontFamily: 'inherit',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(212,160,23,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
            />
            {searching && <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>...</span>}
          </div>

          {isAuthenticated && (
            <button
              onClick={() => navigate('/wiki/new')}
              style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: '#d4a017', color: '#1a1f2e', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = '#e5b83a'}
              onMouseLeave={e => e.currentTarget.style.background = '#d4a017'}
            >+ Proposer un article</button>
          )}
        </div>

        {/* Résultats de recherche */}
        {results !== null && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
              {results.length} résultat{results.length !== 1 ? 's' : ''} pour « {search} »
            </div>
            {results.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 15 }}>
                Aucun article trouvé. Sois le premier à le créer !
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 16 }}>
                {results.map(p => <PageCard key={p.id} page={p} onClick={() => navigate(`/wiki/${p.slug}`)} />)}
              </div>
            )}
          </div>
        )}

        {/* Tabs catégories */}
        {results === null && (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 32 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                  padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  border: 'none', cursor: 'pointer', transition: 'all .15s',
                  background: activeTab === t.id ? '#d4a017' : 'rgba(255,255,255,0.06)',
                  color: activeTab === t.id ? '#1a1f2e' : 'rgba(255,255,255,0.55)',
                }}>{t.label}</button>
              ))}
            </div>

            {activeTab === 'accueil' ? (
              <>
                {/* Catégories grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16, marginBottom: 48 }}>
                  {categories.map(cat => (
                    <div
                      key={cat.id}
                      onClick={() => setActiveTab(cat.slug)}
                      style={{
                        background: `linear-gradient(135deg, ${cat.color}12, rgba(255,255,255,0.02))`,
                        border: `1px solid ${cat.color}28`,
                        borderRadius: 14, padding: '22px 24px', cursor: 'pointer',
                        transition: 'transform .15s, box-shadow .15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${cat.color}20` }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      <div style={{ fontSize: 32, marginBottom: 10 }}>{cat.icon}</div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: '#fff', marginBottom: 6 }}>{cat.name}</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{cat.description}</div>
                    </div>
                  ))}
                </div>

                {/* Articles récents */}
                <div>
                  <h2 style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, color: '#fff', marginBottom: 20 }}>
                    Articles récents
                  </h2>
                  {recent.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.25)', fontSize: 15 }}>
                      Le wiki est vide pour l'instant. Sois le premier à contribuer !
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
                      {recent.map(p => <PageCard key={p.id} page={p} onClick={() => navigate(`/wiki/${p.slug}`)} />)}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <CategoryView slug={activeTab} navigate={navigate} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function CategoryView({ slug, navigate }) {
  const [pages, setPages] = useState(null)

  useEffect(() => {
    setPages(null)
    fetchWikiPages({ categorySlug: slug, limit: 30 }).then(setPages)
  }, [slug])

  if (pages === null) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 180, borderRadius: 12, background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    )
  }

  if (pages.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.3)', fontSize: 15 }}>
        Aucun article dans cette catégorie encore. Sois le premier !
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
      {pages.map(p => <PageCard key={p.id} page={p} onClick={() => navigate(`/wiki/${p.slug}`)} />)}
    </div>
  )
}
