import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchWikiPage, fetchWikiCategories, createWikiPage, updateWikiPage } from '../lib/wiki.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { md } from '../lib/markdown.js'

const GOLD  = '#b08a3a'
const RED   = '#7b3f45'

const WE_CSS = `
  @keyframes weFadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
  @keyframes weTwinkle { 0%,100%{opacity:.10} 50%{opacity:.65} }
  @keyframes weScan    { 0%{top:-2px} 100%{top:100%} }
  @keyframes weSpin    { to{transform:rotate(360deg)} }
`

function WEStars() {
  const stars = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    x: (i*38.7+11)%98, y: (i*44.3+7)%96,
    size: i%9===0?2.5:i%4===0?1.6:1,
    dur: 2.8+(i*0.27)%4.5, del: (i*0.22)%7, gold: i%13===0,
  })), [])
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position:'absolute', left:`${s.x}%`, top:`${s.y}%`,
          width:s.size, height:s.size, borderRadius:'50%',
          background: s.gold ? 'rgba(176,138,58,.65)' : 'rgba(236,229,220,.50)',
          animation:`weTwinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

function WEScanLine() {
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:1, overflow:'hidden' }}>
      <div style={{
        position:'absolute', left:0, right:0, height:2,
        background:'linear-gradient(90deg,transparent,rgba(176,138,58,.06),rgba(123,63,69,.14),rgba(176,138,58,.06),transparent)',
        animation:'weScan 18s linear infinite',
      }} />
    </div>
  )
}

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const inputBase = {
  width:'100%', boxSizing:'border-box',
  padding:'12px 16px', borderRadius:10,
  background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)',
  color:'#fff', fontSize:14, outline:'none',
  transition:'border-color .15s, box-shadow .15s', fontFamily:'inherit',
}

const labelBase = {
  display:'block', fontSize:10, fontWeight:800,
  letterSpacing:'.10em', color:'rgba(255,255,255,0.45)',
  marginBottom:7, textTransform:'uppercase',
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:18 }}>
      <label style={labelBase}>{label}</label>
      {children}
    </div>
  )
}

function FocusInput({ style, ...props }) {
  return (
    <input
      style={{ ...inputBase, ...style }}
      onFocus={e => { e.target.style.borderColor='rgba(176,138,58,0.55)'; e.target.style.boxShadow='0 0 0 3px rgba(176,138,58,0.09)' }}
      onBlur={e  => { e.target.style.borderColor='rgba(255,255,255,0.12)'; e.target.style.boxShadow='none' }}
      {...props}
    />
  )
}

function FocusTextarea({ style, ...props }) {
  return (
    <textarea
      style={{ ...inputBase, resize:'vertical', lineHeight:1.65, fontFamily:'monospace', fontSize:13, ...style }}
      onFocus={e => { e.target.style.borderColor='rgba(176,138,58,0.55)'; e.target.style.boxShadow='0 0 0 3px rgba(176,138,58,0.09)' }}
      onBlur={e  => { e.target.style.borderColor='rgba(255,255,255,0.12)'; e.target.style.boxShadow='none' }}
      {...props}
    />
  )
}

export default function WikiEditor() {
  const { slug }   = useParams()
  const navigate   = useNavigate()
  const { isAuthenticated, user, displayName } = useAuth()
  const isEdit     = Boolean(slug)

  const [categories,   setCategories]   = useState([])
  const [title,        setTitle]        = useState('')
  const [titleSlug,    setTitleSlug]    = useState('')
  const [categoryId,   setCategoryId]   = useState('')
  const [coverImage,   setCoverImage]   = useState('')
  const [content,      setContent]      = useState('')
  const [infoboxPairs, setInfoboxPairs] = useState([{ key:'', val:'' }])
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
      if (entries.length > 0) setInfoboxPairs(entries.map(([k, v]) => ({ key:k, val:String(v) })))
      setLoadingPage(false)
    })
  }, [slug, isEdit, navigate])

  const addRow    = () => setInfoboxPairs(p => [...p, { key:'', val:'' }])
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
      const { error } = await updateWikiPage({ id:pageId, content, infobox, cover_image:coverImage||null, author_id:user?.id, author_name:displayName, summary:summary||'Modification' })
      setLoading(false)
      if (error) { setError(error.message); return }
      navigate(`/wiki/${slug}`)
    } else {
      const { error } = await createWikiPage({ slug:slugify(title), title, category_id:categoryId||null, content, infobox, cover_image:coverImage||null, author_id:user?.id, author_name:displayName })
      setLoading(false)
      if (error) { setError(error.message || 'Erreur lors de la création.'); return }
      setSuccess(true)
    }
  }

  // Shell
  const Shell = ({ children }) => (
    <div style={{ minHeight:'100vh', background:'#07090e', position:'relative', overflowX:'hidden' }}>
      <style>{WE_CSS}</style>
      <WEStars />
      <WEScanLine />
      <div style={{ position:'relative', zIndex:2 }}>{children}</div>
    </div>
  )

  if (!isAuthenticated) return (
    <Shell>
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, textAlign:'center', padding:'0 24px' }}>
        <div style={{ fontSize:64, marginBottom:4, opacity:.35 }}>🔒</div>
        <div style={{ fontFamily:"'Pirata One',cursive", fontSize:32, color:'#fff' }}>Connexion requise</div>
        <div style={{ fontSize:14, color:'rgba(255,255,255,0.40)', lineHeight:1.7 }}>Tu dois être connecté pour proposer un article.</div>
        <div style={{ display:'flex', gap:12, marginTop:8 }}>
          <button onClick={() => document.dispatchEvent(new CustomEvent('open-auth-modal'))} style={{ padding:'12px 26px', borderRadius:100, border:'none', background:`linear-gradient(135deg,#8e6d31,#b08a3a)`, color:'#1a1200', cursor:'pointer', fontSize:13, fontWeight:800 }}>
            Se connecter
          </button>
          <button onClick={() => navigate('/wiki')} style={{ padding:'12px 22px', borderRadius:100, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.60)', cursor:'pointer', fontSize:13, fontWeight:600 }}>
            ← Retour
          </button>
        </div>
      </div>
    </Shell>
  )

  if (loadingPage) return (
    <Shell>
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14 }}>
        <div style={{ width:38, height:38, border:'3px solid rgba(176,138,58,0.2)', borderTopColor:GOLD, borderRadius:'50%', animation:'weSpin .75s linear infinite' }} />
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.30)' }}>Chargement…</div>
      </div>
    </Shell>
  )

  if (success) return (
    <Shell>
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, textAlign:'center', padding:'0 24px', animation:'weFadeUp .5s ease both' }}>
        <div style={{ fontSize:72, marginBottom:4, filter:`drop-shadow(0 0 28px ${GOLD}55)` }}>📬</div>
        <div style={{ fontSize:10, fontWeight:800, letterSpacing:'.28em', color:GOLD, textTransform:'uppercase', marginBottom:4 }}>Article soumis</div>
        <div style={{ fontFamily:"'Pirata One',cursive", fontSize:36, color:'#fff' }}>Bien reçu, Nakama !</div>
        <div style={{ fontSize:14, color:'rgba(255,255,255,0.45)', maxWidth:400, lineHeight:1.7 }}>
          Ton article a été soumis pour modération. Un admin le publiera prochainement.
        </div>
        <button onClick={() => navigate('/wiki')} style={{ padding:'12px 28px', borderRadius:100, border:'none', background:`linear-gradient(135deg,#8e6d31,#b08a3a)`, color:'#1a1200', cursor:'pointer', fontSize:13, fontWeight:800 }}>
          Retour au Wiki
        </button>
      </div>
    </Shell>
  )

  const selectedCat = categories.find(c => c.id === categoryId)

  return (
    <Shell>
      <div style={{ maxWidth:860, margin:'0 auto', padding:'88px 24px 100px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom:40, animation:'weFadeUp .4s ease both' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, marginBottom:16 }}>
            <Link to="/wiki" style={{ color:GOLD, textDecoration:'none', fontWeight:700 }}>📖 Wiki</Link>
            <span style={{ color:'rgba(255,255,255,0.30)' }}>›</span>
            <span style={{ color:'rgba(255,255,255,0.55)' }}>{isEdit ? 'Modifier' : 'Nouvel article'}</span>
          </div>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8, padding:'5px 16px', borderRadius:100,
            background:'rgba(176,138,58,0.10)', border:'1px solid rgba(176,138,58,0.28)',
            fontSize:10, fontWeight:800, letterSpacing:'.22em', color:GOLD, textTransform:'uppercase', marginBottom:18,
          }}>
            ✍️ {isEdit ? 'Modification' : 'Contribution'}
          </div>
          <h1 style={{ fontFamily:"'Pirata One',cursive", fontSize:'clamp(32px,5vw,52px)', color:'#fff', margin:'0 0 10px', lineHeight:1 }}>
            {isEdit ? "Modifier l'article" : 'Proposer un article'}
          </h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.38)', lineHeight:1.65 }}>
            Les articles sont relus par un modérateur avant publication.
          </p>
        </div>

        <div style={{ height:1, background:`linear-gradient(90deg,${GOLD}35,rgba(255,255,255,0.06),transparent)`, marginBottom:36 }} />

        <form onSubmit={handleSubmit} style={{ animation:'weFadeUp .4s .06s ease both' }}>

          {/* Title + Slug */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:18 }}>
            <div>
              <label style={labelBase}>Titre *</label>
              <FocusInput
                value={title}
                onChange={e => { setTitle(e.target.value); if (!isEdit) setTitleSlug(slugify(e.target.value)) }}
                placeholder="Monkey D. Luffy"
              />
              {!isEdit && titleSlug && (
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.28)', marginTop:5 }}>
                  URL : /wiki/<span style={{ color:`${GOLD}99` }}>{titleSlug}</span>
                </div>
              )}
            </div>
            <div>
              <label style={labelBase}>URL image de couverture</label>
              <FocusInput value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="https://…" />
            </div>
          </div>

          {/* Category pills */}
          <Field label="Catégorie">
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <button
                type="button"
                onClick={() => setCategoryId('')}
                style={{
                  padding:'8px 16px', borderRadius:100, cursor:'pointer', fontSize:12, fontWeight:700,
                  border:`1px solid ${!categoryId ? `${GOLD}55` : 'rgba(255,255,255,0.10)'}`,
                  background: !categoryId ? `${GOLD}14` : 'rgba(255,255,255,0.03)',
                  color: !categoryId ? GOLD : 'rgba(255,255,255,0.40)',
                  transition:'all .15s',
                }}
              >
                — Aucune
              </button>
              {categories.map(cat => {
                const active = categoryId === cat.id
                const c = cat.color || GOLD
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    style={{
                      padding:'8px 16px', borderRadius:100, cursor:'pointer', fontSize:12, fontWeight:700,
                      border:`1px solid ${active ? c+'55' : 'rgba(255,255,255,0.10)'}`,
                      background: active ? `${c}14` : 'rgba(255,255,255,0.03)',
                      color: active ? c : 'rgba(255,255,255,0.40)',
                      transition:'all .15s',
                    }}
                  >
                    {cat.icon} {cat.name}
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Infobox */}
          <div style={{ marginBottom:18 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <label style={{ ...labelBase, marginBottom:0 }}>Infobox (clé / valeur)</label>
              <button
                type="button"
                onClick={addRow}
                style={{
                  background:'none', border:`1px solid ${GOLD}35`, borderRadius:100,
                  color:GOLD, cursor:'pointer', padding:'4px 12px', fontSize:11, fontWeight:800,
                  letterSpacing:'.06em',
                }}
              >+ Ajouter</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {infoboxPairs.map((row, i) => (
                <div key={i} style={{ display:'flex', gap:8 }}>
                  <FocusInput value={row.key} onChange={e => updateRow(i, 'key', e.target.value)} placeholder="Rang" style={{ flex:'0 0 150px' }} />
                  <FocusInput value={row.val} onChange={e => updateRow(i, 'val', e.target.value)} placeholder="Yonkou" style={{ flex:1 }} />
                  {infoboxPairs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      style={{ background:'rgba(224,82,74,0.10)', border:'1px solid rgba(224,82,74,0.30)', borderRadius:10, color:RED, cursor:'pointer', padding:'0 14px', fontSize:16, flexShrink:0 }}
                    >✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content + Preview */}
          <div style={{ marginBottom:18 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <label style={{ ...labelBase, marginBottom:0 }}>Contenu * (Markdown)</label>
              <button
                type="button"
                onClick={() => setPreview(v => !v)}
                style={{
                  padding:'5px 14px', borderRadius:100, cursor:'pointer', fontSize:11, fontWeight:800,
                  border:`1px solid ${preview ? `${GOLD}45` : 'rgba(255,255,255,0.12)'}`,
                  background: preview ? `${GOLD}14` : 'rgba(255,255,255,0.05)',
                  color: preview ? GOLD : 'rgba(255,255,255,0.50)',
                  transition:'all .15s',
                }}
              >
                {preview ? '✏️ Éditer' : '👁 Aperçu'}
              </button>
            </div>
            {!preview ? (
              <FocusTextarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={'# Titre\n\nContenu en **Markdown**…'}
                rows={18}
              />
            ) : (
              <div
                className="wiki-content"
                style={{
                  minHeight:200, padding:'20px 24px',
                  background:'rgba(255,255,255,0.03)',
                  border:'1px solid rgba(255,255,255,0.12)',
                  borderTop:`3px solid ${GOLD}`,
                  borderRadius:10,
                }}
                dangerouslySetInnerHTML={{ __html: md(content) }}
              />
            )}
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:7 }}>
              Supporte : **gras**, *italique*, # Titres, - listes, `code`, [lien](url)
            </div>
          </div>

          {/* Edit summary */}
          {isEdit && (
            <Field label="Résumé de la modification">
              <FocusInput value={summary} onChange={e => setSummary(e.target.value)} placeholder="Correction orthographe, ajout section…" />
            </Field>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background:'rgba(224,82,74,0.10)', border:'1px solid rgba(224,82,74,0.30)',
              borderLeft:`3px solid ${RED}`, borderRadius:10,
              padding:'12px 16px', fontSize:13, color:'#ff8a7a', marginBottom:20,
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding:'13px 30px', borderRadius:100, border:'none',
                background: loading ? 'rgba(176,138,58,0.40)' : `linear-gradient(135deg,#8e6d31,#b08a3a)`,
                color:'#1a1200', fontSize:13, fontWeight:800,
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing:'.04em',
                boxShadow: loading ? 'none' : `0 6px 24px rgba(176,138,58,0.28)`,
                transition:'all .18s',
              }}
            >
              {loading ? '⏳ Envoi…' : isEdit ? '✓ Enregistrer' : "Soumettre l'article"}
            </button>
            <button
              type="button"
              onClick={() => navigate('/wiki')}
              style={{
                padding:'13px 22px', borderRadius:100,
                border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.04)',
                color:'rgba(255,255,255,0.50)', cursor:'pointer', fontSize:13, fontWeight:600,
              }}
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </Shell>
  )
}
