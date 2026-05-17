import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchWikiPage, fetchWikiRevisions } from '../lib/wiki.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { md } from '../lib/markdown.js'

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  return `il y a ${Math.floor(s / 86400)} j`
}

export default function WikiArticle() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [page, setPage] = useState(null)
  const [revisions, setRevisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showRevisions, setShowRevisions] = useState(false)

  useEffect(() => {
    setLoading(true); setNotFound(false); setPage(null)
    fetchWikiPage(slug).then(data => {
      if (!data) setNotFound(true)
      else setPage(data)
      setLoading(false)
    })
  }, [slug])

  useEffect(() => {
    if (!page) return
    document.title = `${page.title} — Wiki Brams`
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta) }
    meta.content = `Article wiki One Piece : ${page.title} — Brams Community.`
    return () => { document.title = 'Brams Community'; if (meta) meta.content = '' }
  }, [page])

  useEffect(() => {
    if (page) fetchWikiRevisions(page.id).then(setRevisions)
  }, [page])

  if (loading) return (
    <div style={{ minHeight: '100vh', paddingTop: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 15 }}>Chargement...</div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', paddingTop: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 52 }}>📄</div>
      <div style={{ fontFamily: "'Pirata One', cursive", fontSize: 30, color: '#fff' }}>Article introuvable</div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Cet article n'existe pas ou n'est pas encore publié.</div>
      <button onClick={() => navigate('/wiki')} style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#d4a017', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
        ← Retour au Wiki
      </button>
    </div>
  )

  const cat = page.wiki_categories
  const infoboxEntries = Object.entries(page.infobox || {}).filter(([k]) => k.trim())

  return (
    <div style={{ minHeight: '100vh', paddingTop: 80 }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 24px' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, fontSize: 13, color: 'rgba(255,255,255,0.35)', flexWrap: 'wrap' }}>
          <Link to="/wiki" style={{ color: '#d4a017', textDecoration: 'none', fontWeight: 600 }}>Wiki</Link>
          {cat && <><span>›</span><span>{cat.icon} {cat.name}</span></>}
          <span>›</span>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{page.title}</span>
        </div>

        {/* Grid 2 colonnes */}
        <div style={{ display: 'grid', gridTemplateColumns: infoboxEntries.length > 0 ? 'minmax(0,1fr) 280px' : '1fr', gap: 32, alignItems: 'start' }}>

          {/* Colonne principale */}
          <div>
            {page.cover_image && (
              <img src={page.cover_image} alt={page.title} style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 14, marginBottom: 28 }} />
            )}

            <div style={{ marginBottom: 24 }}>
              {cat && (
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: cat.color, textTransform: 'uppercase', display: 'inline-block', marginBottom: 10 }}>
                  {cat.icon} {cat.name}
                </span>
              )}
              <h1 style={{ fontFamily: "'Pirata One', cursive", fontSize: 'clamp(28px,5vw,48px)', color: '#fff', margin: '0 0 12px', lineHeight: 1.15 }}>
                {page.title}
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                <span>✍️ {page.author_name}</span>
                <span>🕐 {timeAgo(page.updated_at ?? page.created_at)}</span>
                <span>👁 {page.views ?? 0} vues</span>
                {isAuthenticated && (
                  <button
                    onClick={() => navigate(`/wiki/${slug}/edit`)}
                    style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(212,160,23,0.35)', background: 'rgba(212,160,23,0.08)', color: '#d4a017', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                  >✏️ Modifier</button>
                )}
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 28 }} />

            {/* Contenu Markdown */}
            <div className="wiki-content" dangerouslySetInnerHTML={{ __html: md(page.content) }} />

            {/* Historique */}
            {revisions.length > 0 && (
              <div style={{ marginTop: 48, padding: '18px 22px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                <button
                  onClick={() => setShowRevisions(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: 700, padding: 0 }}
                >
                  <span>📋 Historique ({revisions.length} révision{revisions.length > 1 ? 's' : ''})</span>
                  <span style={{ marginLeft: 'auto', transform: showRevisions ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
                </button>
                {showRevisions && (
                  <div style={{ marginTop: 14 }}>
                    {revisions.map(rev => (
                      <div key={rev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'rgba(255,255,255,0.4)', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: '#d4a017', fontWeight: 600 }}>{rev.author_name}</span>
                        <span style={{ flex: 1 }}>{rev.summary}</span>
                        <span>{timeAgo(rev.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Infobox */}
          {infoboxEntries.length > 0 && (
            <div style={{ position: 'sticky', top: 88 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${cat?.color ?? '#d4a017'}28`, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: `${cat?.color ?? '#d4a017'}12`, borderBottom: `1px solid ${cat?.color ?? '#d4a017'}20` }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>{page.title}</div>
                </div>
                {infoboxEntries.map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: 110, padding: '9px 12px', background: 'rgba(255,255,255,0.02)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '.05em', flexShrink: 0 }}>
                      {key}
                    </div>
                    <div style={{ flex: 1, padding: '9px 12px', fontSize: 13, color: 'rgba(255,255,255,0.72)', wordBreak: 'break-word' }}>
                      {String(val)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation bas */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Link to="/wiki" style={{ color: '#d4a017', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>← Retour au Wiki</Link>
          {isAuthenticated && (
            <button onClick={() => navigate('/wiki/new')} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#d4a017', color: '#1a1f2e', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + Nouvel article
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
