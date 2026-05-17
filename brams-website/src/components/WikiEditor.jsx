import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchWikiPage, fetchWikiCategories, createWikiPage, updateWikiPage } from '../lib/wiki.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { md } from '../lib/markdown.js'

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '11px 14px', borderRadius: 8,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff', fontSize: 14, outline: 'none',
  transition: 'border-color .15s', fontFamily: 'inherit',
}
const focus = (e) => e.target.style.borderColor = 'rgba(212,160,23,0.6)'
const blur  = (e) => e.target.style.borderColor = 'rgba(255,255,255,0.12)'
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700,
  letterSpacing: '.08em', color: 'rgba(255,255,255,0.45)',
  marginBottom: 6, textTransform: 'uppercase',
}

export default function WikiEditor() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user, displayName } = useAuth()
  const isEdit = Boolean(slug)

  const [categories,   setCategories]   = useState([])
  const [title,        setTitle]        = useState('')
  const [titleSlug,    setTitleSlug]    = useState('')
  const [categoryId,   setCategoryId]   = useState('')
  const [coverImage,   setCoverImage]   = useState('')
  const [content,      setContent]      = useState('')
  const [infoboxPairs, setInfoboxPairs] = useState([{ key: '', val: '' }])
  const [summary,      setSummary]      = useState('')
  const [pageId,       setPageId]       = useState(null)
  const [preview,      setPreview]      = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [loadingPage,  setLoadingPage]  = useState(isEdit)
  const [error,        setError]        = useState('')
  const [success,      setSuccess]      = useState(false)

  useEffect(() => {
    fetchWikiCategories().then(setCategories)
    document.title = isEdit ? 'Modifier — Wiki Brams' : 'Nouvel article — Wiki Brams'
    return () => { document.title = 'Brams Community' }
  }, [isEdit])

  useEffect(() => {
    if (!isEdit) return
    fetchWikiPage(slug).then(page => {
      if (!page) { navigate('/wiki'); return }
      setTitle(page.title)
      setTitleSlug(slug)
      setCategoryId(page.category_id ?? '')
      setCoverImage(page.cover_image ?? '')
      setContent(page.content)
      setPageId(page.id)
      const entries = Object.entries(page.infobox || {})
      if (entries.length > 0) setInfoboxPairs(entries.map(([k, v]) => ({ key: k, val: String(v) })))
      setLoadingPage(false)
    })
  }, [slug, isEdit, navigate])

  if (!isAuthenticated) return (
    <div style={{ minHeight: '100vh', paddingTop: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <div style={{ fontFamily: "'Pirata One', cursive", fontSize: 26, color: '#fff' }}>Connexion requise</div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button onClick={() => document.dispatchEvent(new CustomEvent('open-auth-modal'))} style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: '#d4a017', color: '#1a1f2e', cursor: 'pointer', fontSize: 13, fontWeight: 800 }}>Se connecter</button>
        <button onClick={() => navigate('/wiki')} style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>← Retour</button>
      </div>
    </div>
  )

  if (loadingPage) return (
    <div style={{ minHeight: '100vh', paddingTop: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.3)' }}>Chargement...</div>
    </div>
  )

  if (success) return (
    <div style={{ minHeight: '100vh', paddingTop: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: '80px 24px' }}>
      <div style={{ fontSize: 56 }}>📬</div>
      <div style={{ fontFamily: "'Pirata One', cursive", fontSize: 32, color: '#fff' }}>Article soumis !</div>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
        Ton article a été soumis pour modération. Un admin le publiera prochainement.
      </div>
      <button onClick={() => navigate('/wiki')} style={{ padding: '11px 26px', borderRadius: 10, border: 'none', background: '#d4a017', color: '#1a1f2e', cursor: 'pointer', fontSize: 14, fontWeight: 800 }}>
        Retour au Wiki
      </button>
    </div>
  )

  const addRow    = () => setInfoboxPairs(p => [...p, { key: '', val: '' }])
  const removeRow = (i) => setInfoboxPairs(p => p.filter((_, idx) => idx !== i))
  const updateRow = (i, field, value) => setInfoboxPairs(p => p.map((row, idx) => idx === i ? { ...row, [field]: value } : row))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) { setError('Le titre et le contenu sont obligatoires.'); return }
    setLoading(true); setError('')

    const infobox = {}
    for (const { key, val } of infoboxPairs) {
      if (key.trim()) infobox[key.trim()] = val
    }

    if (isEdit) {
      const { error } = await updateWikiPage({ id: pageId, content, infobox, cover_image: coverImage || null, author_id: user?.id, author_name: displayName, summary: summary || 'Modification' })
      setLoading(false)
      if (error) { setError(error.message); return }
      navigate(`/wiki/${slug}`)
    } else {
      const { data, error } = await createWikiPage({ slug: slugify(title), title, category_id: categoryId || null, content, infobox, cover_image: coverImage || null, author_id: user?.id, author_name: displayName })
      setLoading(false)
      if (error) { setError(error.message || 'Erreur lors de la création.'); return }
      setSuccess(true)
    }
  }

  return (
    <div style={{ minHeight: '100vh', paddingTop: 80 }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 12 }}>
            <Link to="/wiki" style={{ color: '#d4a017', textDecoration: 'none', fontWeight: 600 }}>Wiki</Link>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>›</span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>{isEdit ? 'Modifier' : 'Nouvel article'}</span>
          </div>
          <h1 style={{ fontFamily: "'Pirata One', cursive", fontSize: 36, color: '#fff', margin: 0 }}>
            {isEdit ? "Modifier l'article" : 'Proposer un article'}
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 8, lineHeight: 1.6 }}>
            Les articles sont relus par un modérateur avant publication.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Titre *</label>
              <input value={title} onChange={e => { setTitle(e.target.value); if (!isEdit) setTitleSlug(slugify(e.target.value)) }} placeholder="Monkey D. Luffy" style={inputStyle} onFocus={focus} onBlur={blur} />
              {!isEdit && titleSlug && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 5 }}>URL : /wiki/{titleSlug}</div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Catégorie</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }} onFocus={focus} onBlur={blur}>
                <option value="">— Choisir —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>URL image de couverture</label>
            <input value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="https://..." style={inputStyle} onFocus={focus} onBlur={blur} />
          </div>

          {/* Infobox */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Infobox (clé / valeur)</label>
              <button type="button" onClick={addRow} style={{ background: 'none', border: '1px solid rgba(212,160,23,0.3)', borderRadius: 6, color: '#d4a017', cursor: 'pointer', padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>+ Ajouter</button>
            </div>
            {infoboxPairs.map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={row.key} onChange={e => updateRow(i, 'key', e.target.value)} placeholder="Rang" style={{ ...inputStyle, flex: '0 0 150px' }} onFocus={focus} onBlur={blur} />
                <input value={row.val} onChange={e => updateRow(i, 'val', e.target.value)} placeholder="Yonkou" style={{ ...inputStyle, flex: 1 }} onFocus={focus} onBlur={blur} />
                {infoboxPairs.length > 1 && (
                  <button type="button" onClick={() => removeRow(i)} style={{ background: 'rgba(224,82,74,0.1)', border: '1px solid rgba(224,82,74,0.3)', borderRadius: 6, color: '#E0524A', cursor: 'pointer', padding: '0 12px', fontSize: 16, flexShrink: 0 }}>✕</button>
                )}
              </div>
            ))}
          </div>

          {/* Contenu */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Contenu * (Markdown)</label>
              <button type="button" onClick={() => setPreview(v => !v)} style={{ background: preview ? 'rgba(212,160,23,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${preview ? 'rgba(212,160,23,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 6, color: preview ? '#d4a017' : 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                {preview ? '✏️ Éditer' : '👁 Aperçu'}
              </button>
            </div>
            {!preview ? (
              <textarea value={content} onChange={e => setContent(e.target.value)} placeholder={'# Titre\n\nContenu en **Markdown**...'} rows={18} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, fontFamily: 'monospace', fontSize: 13 }} onFocus={focus} onBlur={blur} />
            ) : (
              <div className="wiki-content" style={{ minHeight: 200, padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }} dangerouslySetInnerHTML={{ __html: md(content) }} />
            )}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>
              Supporte : **gras**, *italique*, # Titres, - listes, `code`, [lien](url)
            </div>
          </div>

          {isEdit && (
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Résumé de la modification</label>
              <input value={summary} onChange={e => setSummary(e.target.value)} placeholder="Correction orthographe, ajout section..." style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(224,82,74,0.1)', border: '1px solid rgba(224,82,74,0.3)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#ff8a7a', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" disabled={loading} style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: loading ? 'rgba(212,160,23,0.4)' : '#d4a017', color: '#1a1f2e', fontSize: 14, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Envoi...' : isEdit ? 'Enregistrer' : "Soumettre l'article"}
            </button>
            <button type="button" onClick={() => navigate('/wiki')} style={{ padding: '12px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
