import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createTheory } from '../lib/wiki.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { md } from '../lib/markdown.js'

const CATEGORIES = ['Personnages', 'Arcs', 'Fruits du Démon', 'Lieux', 'Organisations', 'Autre']

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

export default function TheoryEditor() {
  const navigate = useNavigate()
  const { isAuthenticated, user, displayName } = useAuth()
  const [title,      setTitle]      = useState('')
  const [category,   setCategory]   = useState('')
  const [tags,       setTags]       = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [content,    setContent]    = useState('')
  const [rgpd,       setRgpd]       = useState(false)
  const [preview,    setPreview]    = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState(false)
  const [failCount,  setFailCount]  = useState(0)
  const [cooldown,   setCooldown]   = useState(0)

  useEffect(() => {
    document.title = 'Proposer une théorie — Brams'
    return () => { document.title = 'Brams Community' }
  }, [])

  // Countdown timer for bruteforce cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  if (!isAuthenticated) return (
    <div style={{ minHeight: '100vh', paddingTop: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <div style={{ fontFamily: "'Pirata One', cursive", fontSize: 26, color: '#fff' }}>Connexion requise</div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Tu dois être connecté pour proposer une théorie.</div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => document.dispatchEvent(new CustomEvent('open-auth-modal'))} style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: '#d4a017', color: '#1a1f2e', cursor: 'pointer', fontSize: 13, fontWeight: 800 }}>Se connecter</button>
        <button onClick={() => navigate('/theories')} style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>← Retour</button>
      </div>
    </div>
  )

  if (success) return (
    <div style={{ minHeight: '100vh', paddingTop: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: '80px 24px' }}>
      <div style={{ fontSize: 56 }}>🎉</div>
      <div style={{ fontFamily: "'Pirata One', cursive", fontSize: 32, color: '#fff' }}>Théorie soumise !</div>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
        Ta théorie est en attente de modération. Elle sera publiée après validation d'un admin.
      </div>
      <button onClick={() => navigate('/theories')} style={{ padding: '11px 26px', borderRadius: 10, border: 'none', background: '#d4a017', color: '#1a1f2e', cursor: 'pointer', fontSize: 14, fontWeight: 800 }}>
        Voir les théories
      </button>
    </div>
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !content.trim() || !category) { setError('Titre, catégorie et contenu sont obligatoires.'); return }
    if (!rgpd) { setError("Tu dois accepter les conditions d'utilisation pour publier."); return }
    if (cooldown > 0) { setError(`Attends encore ${cooldown} secondes.`); return }

    setLoading(true); setError('')
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)

    const { error } = await createTheory({ title: title.trim(), content, category, tags: tagList, author_id: user.id, author_name: displayName, cover_image: coverImage || null })
    setLoading(false)

    if (error) {
      const next = failCount + 1
      setFailCount(next)
      if (next >= 3) setCooldown(30)
      setError(error.message || 'Erreur lors de la soumission.')
      return
    }
    setSuccess(true)
  }

  return (
    <div style={{ minHeight: '100vh', paddingTop: 80 }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 12 }}>
            <Link to="/theories" style={{ color: '#d4a017', textDecoration: 'none', fontWeight: 600 }}>Théories</Link>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>›</span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Proposer</span>
          </div>
          <h1 style={{ fontFamily: "'Pirata One', cursive", fontSize: 36, color: '#fff', margin: 0 }}>Proposer une théorie</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 8, lineHeight: 1.6 }}>
            Partage ta théorie avec la communauté. Elle sera modérée avant publication.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Titre *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Imu est en fait le Roi des Pirates..." style={inputStyle} onFocus={focus} onBlur={blur} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Catégorie *</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }} onFocus={focus} onBlur={blur}>
                <option value="">— Choisir —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tags (séparés par des virgules)</label>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Imu, Void Century, D." style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>URL image de couverture</label>
            <input value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="https://..." style={inputStyle} onFocus={focus} onBlur={blur} />
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Contenu * (Markdown)</label>
              <button type="button" onClick={() => setPreview(v => !v)} style={{ background: preview ? 'rgba(212,160,23,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${preview ? 'rgba(212,160,23,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 6, color: preview ? '#d4a017' : 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                {preview ? '✏️ Éditer' : '👁 Aperçu'}
              </button>
            </div>
            {!preview ? (
              <textarea value={content} onChange={e => setContent(e.target.value)} placeholder={'Explique ta théorie en détail...\n\n# Preuves\n- Indice 1\n- Indice 2'} rows={16} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, fontFamily: 'monospace', fontSize: 13 }} onFocus={focus} onBlur={blur} />
            ) : (
              <div className="wiki-content" style={{ minHeight: 200, padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }} dangerouslySetInnerHTML={{ __html: md(content) }} />
            )}
          </div>

          {/* RGPD Consent */}
          <div style={{ marginBottom: 22, padding: '16px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={rgpd} onChange={e => setRgpd(e.target.checked)} style={{ width: 17, height: 17, marginTop: 2, accentColor: '#d4a017', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                J'accepte que mon pseudo et le contenu de cette théorie soient publiquement visibles sur ce site.
                Ce contenu sera modéré avant publication et peut être refusé ou supprimé s'il ne respecte pas les règles.{' '}
                <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11 }}>(RGPD — Art. 6.1.a)</span>
              </span>
            </label>
          </div>

          {cooldown > 0 && (
            <div style={{ background: 'rgba(224,82,74,0.1)', border: '1px solid rgba(224,82,74,0.3)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#ff8a7a', marginBottom: 16 }}>
              🛡️ Trop de tentatives consécutives. Attends encore {cooldown} secondes.
            </div>
          )}

          {error && cooldown === 0 && (
            <div style={{ background: 'rgba(224,82,74,0.1)', border: '1px solid rgba(224,82,74,0.3)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#ff8a7a', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" disabled={loading || cooldown > 0} style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: (loading || cooldown > 0) ? 'rgba(212,160,23,0.35)' : '#d4a017', color: '#1a1f2e', fontSize: 14, fontWeight: 800, cursor: (loading || cooldown > 0) ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Envoi...' : cooldown > 0 ? `Attends ${cooldown}s...` : 'Soumettre la théorie'}
            </button>
            <button type="button" onClick={() => navigate('/theories')} style={{ padding: '12px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
