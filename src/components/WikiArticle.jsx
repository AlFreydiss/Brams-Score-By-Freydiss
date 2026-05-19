import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchWikiPage, fetchWikiRevisions } from '../lib/wiki.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { md } from '../lib/markdown.js'

const GOLD = '#d4a017'

const WA_CSS = `
  @keyframes waFadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
  @keyframes waTwinkle { 0%,100%{opacity:.10} 50%{opacity:.65} }
  @keyframes waScan    { 0%{top:-2px} 100%{top:100%} }
  @keyframes waSpin    { to{transform:rotate(360deg)} }
`

function WAStars({ c }) {
  const stars = useMemo(() => Array.from({ length: 44 }, (_, i) => ({
    x: (i*38.7+11)%98, y: (i*44.3+7)%96,
    size: i%9===0?2.5:i%4===0?1.6:1,
    dur: 2.8+(i*0.27)%4.5, del: (i*0.22)%7,
    gold: i%13===0, accent: i%19===0,
  })), [])
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position:'absolute', left:`${s.x}%`, top:`${s.y}%`,
          width:s.size, height:s.size, borderRadius:'50%',
          background: s.gold ? 'rgba(212,160,23,.65)' : s.accent ? `${c}99` : 'rgba(255,255,255,.50)',
          animation:`waTwinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

function WAScanLine({ c }) {
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:1, overflow:'hidden' }}>
      <div style={{
        position:'absolute', left:0, right:0, height:2,
        background:`linear-gradient(90deg,transparent,${c}0a,${c}18,${c}0a,transparent)`,
        animation:'waScan 18s linear infinite',
      }} />
    </div>
  )
}

function FullPageShell({ c = GOLD, children }) {
  return (
    <div style={{ minHeight:'100vh', background:'#07090e', position:'relative', overflowX:'hidden' }}>
      <style>{WA_CSS}</style>
      <WAStars c={c} />
      <WAScanLine c={c} />
      <div style={{ position:'relative', zIndex:2 }}>{children}</div>
    </div>
  )
}

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000
  if (s < 60)    return "à l'instant"
  if (s < 3600)  return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  return `il y a ${Math.floor(s / 86400)} j`
}

export default function WikiArticle() {
  const { slug }          = useParams()
  const navigate          = useNavigate()
  const { isAuthenticated } = useAuth()
  const [page, setPage]   = useState(null)
  const [revisions, setRevisions] = useState([])
  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)
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
    return () => { document.title = 'Brams Community' }
  }, [page])

  useEffect(() => {
    if (page) fetchWikiRevisions(page.id).then(setRevisions)
  }, [page])

  if (loading) return (
    <FullPageShell c={GOLD}>
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14 }}>
        <div style={{ width:38, height:38, border:'3px solid rgba(212,160,23,0.2)', borderTopColor:GOLD, borderRadius:'50%', animation:'waSpin .75s linear infinite' }} />
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.30)' }}>Chargement…</div>
      </div>
    </FullPageShell>
  )

  if (notFound) return (
    <FullPageShell c={GOLD}>
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, textAlign:'center', padding:'0 24px' }}>
        <div style={{ fontSize:64, marginBottom:4, opacity:.35 }}>📄</div>
        <div style={{ fontFamily:"'Pirata One',cursive", fontSize:34, color:'#fff' }}>Article introuvable</div>
        <div style={{ fontSize:14, color:'rgba(255,255,255,0.40)', maxWidth:360, lineHeight:1.7 }}>
          Cet article n'existe pas ou n'est pas encore publié.
        </div>
        <button onClick={() => navigate('/wiki')} style={{
          padding:'12px 28px', borderRadius:100,
          border:`1px solid ${GOLD}40`, background:`${GOLD}0d`,
          color:GOLD, cursor:'pointer', fontSize:13, fontWeight:700,
        }}>← Retour au Wiki</button>
      </div>
    </FullPageShell>
  )

  const cat = page.wiki_categories
  const c   = cat?.color || GOLD
  const infoboxEntries = Object.entries(page.infobox || {}).filter(([k]) => k.trim())

  return (
    <FullPageShell c={c}>
      <div style={{ maxWidth:1120, margin:'0 auto', padding:'88px 24px 100px' }}>

        {/* ── Breadcrumb ── */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:32, fontSize:12, color:'rgba(255,255,255,0.35)', flexWrap:'wrap', animation:'waFadeUp .4s ease both' }}>
          <Link to="/wiki" style={{ color:GOLD, textDecoration:'none', fontWeight:700 }}>📖 Wiki</Link>
          {cat && (
            <>
              <span style={{ opacity:.4 }}>›</span>
              <span style={{ color:c, fontWeight:600 }}>{cat.icon} {cat.name}</span>
            </>
          )}
          <span style={{ opacity:.4 }}>›</span>
          <span style={{ color:'rgba(255,255,255,0.65)' }}>{page.title}</span>
        </div>

        {/* ── Main grid ── */}
        <div style={{ display:'grid', gridTemplateColumns: infoboxEntries.length > 0 ? 'minmax(0,1fr) 300px' : '1fr', gap:36, alignItems:'start' }}>

          {/* Left — article */}
          <div>
            {/* Cover image */}
            {page.cover_image && (
              <div style={{ borderRadius:16, overflow:'hidden', marginBottom:28, border:`1px solid ${c}28`, boxShadow:`0 8px 40px ${c}14`, animation:'waFadeUp .45s ease both' }}>
                <img src={page.cover_image} alt={page.title} style={{ width:'100%', maxHeight:340, objectFit:'cover', display:'block' }} />
              </div>
            )}

            {/* Header */}
            <div style={{ marginBottom:28, animation:'waFadeUp .45s .04s ease both' }}>
              {cat && (
                <div style={{
                  display:'inline-flex', alignItems:'center', gap:6,
                  padding:'4px 14px', borderRadius:100, marginBottom:16,
                  background:`${c}18`, border:`1px solid ${c}40`,
                  fontSize:10, fontWeight:800, letterSpacing:'.16em', color:c, textTransform:'uppercase',
                }}>
                  {cat.icon} {cat.name}
                </div>
              )}
              <h1 style={{
                fontFamily:"'Pirata One',cursive",
                fontSize:'clamp(30px,5vw,54px)',
                color:'#fff', margin:'0 0 18px', lineHeight:1.1, letterSpacing:'-.01em',
              }}>
                {page.title}
              </h1>
              <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.38)' }}>
                  ✍️ <span style={{ color:'rgba(255,255,255,0.60)', fontWeight:600 }}>{page.author_name}</span>
                </span>
                <span style={{ width:3, height:3, borderRadius:'50%', background:'rgba(255,255,255,0.15)', flexShrink:0 }} />
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.38)' }}>🕐 {timeAgo(page.updated_at ?? page.created_at)}</span>
                <span style={{ width:3, height:3, borderRadius:'50%', background:'rgba(255,255,255,0.15)', flexShrink:0 }} />
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.38)' }}>👁 {page.views ?? 0} vues</span>
                {isAuthenticated && (
                  <button
                    onClick={() => navigate(`/wiki/${slug}/edit`)}
                    style={{
                      padding:'5px 14px', borderRadius:100,
                      border:`1px solid ${GOLD}40`, background:`${GOLD}0d`,
                      color:GOLD, cursor:'pointer', fontSize:11, fontWeight:800, letterSpacing:'.06em',
                      transition:'all .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background=`${GOLD}1a`}
                    onMouseLeave={e => e.currentTarget.style.background=`${GOLD}0d`}
                  >
                    ✏️ Modifier
                  </button>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height:1, background:`linear-gradient(90deg,${c}45,rgba(255,255,255,0.06),transparent)`, marginBottom:32 }} />

            {/* Content */}
            <div className="wiki-content" style={{ animation:'waFadeUp .5s .08s ease both' }} dangerouslySetInnerHTML={{ __html: md(page.content) }} />

            {/* Revisions */}
            {revisions.length > 0 && (
              <div style={{
                marginTop:48, padding:'18px 22px',
                background:'rgba(255,255,255,0.02)',
                border:`1px solid ${c}1a`,
                borderLeft:`3px solid ${c}`,
                borderRadius:12, animation:'waFadeUp .5s .12s ease both',
              }}>
                <button
                  onClick={() => setShowRevisions(v => !v)}
                  style={{
                    display:'flex', alignItems:'center', gap:8, width:'100%',
                    background:'none', border:'none', cursor:'pointer',
                    color:'rgba(255,255,255,0.58)', fontSize:13, fontWeight:700, padding:0,
                  }}
                >
                  <span>📋 Historique ({revisions.length} révision{revisions.length > 1 ? 's' : ''})</span>
                  <span style={{ marginLeft:'auto', transform: showRevisions ? 'rotate(180deg)' : 'none', transition:'transform .15s' }}>▾</span>
                </button>
                {showRevisions && (
                  <div style={{ marginTop:14 }}>
                    {revisions.map((rev, i) => (
                      <div key={rev.id} style={{
                        display:'flex', alignItems:'center', gap:12,
                        fontSize:12, color:'rgba(255,255,255,0.38)',
                        padding:'9px 0',
                        borderBottom: i < revisions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      }}>
                        <span style={{ color:c, fontWeight:700, flexShrink:0 }}>{rev.author_name}</span>
                        <span style={{ flex:1 }}>{rev.summary}</span>
                        <span style={{ flexShrink:0 }}>{timeAgo(rev.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right — Infobox */}
          {infoboxEntries.length > 0 && (
            <div style={{ position:'sticky', top:88, animation:'waFadeUp .5s .1s ease both' }}>
              <div style={{
                background:`linear-gradient(160deg,${c}0d 0%,rgba(7,9,14,0.97) 100%)`,
                border:`1px solid ${c}2a`,
                borderTop:`3px solid ${c}`,
                borderRadius:14, overflow:'hidden',
                boxShadow:`0 8px 32px ${c}14`,
              }}>
                <div style={{ padding:'14px 18px', borderBottom:`1px solid ${c}18`, background:`${c}0a` }}>
                  <div style={{ fontFamily:"'Pirata One',cursive", fontWeight:900, fontSize:15, color:'#fff' }}>{page.title}</div>
                </div>
                {infoboxEntries.map(([key, val], i) => (
                  <div key={key} style={{ display:'flex', borderBottom: i < infoboxEntries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{
                      width:110, padding:'10px 14px', flexShrink:0,
                      background:'rgba(255,255,255,0.025)',
                      fontSize:10, fontWeight:800, color:`${c}bb`,
                      textTransform:'uppercase', letterSpacing:'.07em',
                    }}>
                      {key}
                    </div>
                    <div style={{ flex:1, padding:'10px 14px', fontSize:13, color:'rgba(255,255,255,0.72)', wordBreak:'break-word' }}>
                      {String(val)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom navigation ── */}
        <div style={{
          marginTop:56, paddingTop:24,
          borderTop:'1px solid rgba(255,255,255,0.07)',
          display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12,
          animation:'waFadeUp .5s .16s ease both',
        }}>
          <button
            onClick={() => navigate('/wiki')}
            style={{
              padding:'11px 24px', borderRadius:100,
              border:`1px solid ${GOLD}40`, background:`${GOLD}0d`,
              color:GOLD, cursor:'pointer', fontSize:13, fontWeight:700, transition:'all .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background=`${GOLD}1a`}
            onMouseLeave={e => e.currentTarget.style.background=`${GOLD}0d`}
          >
            ← Retour au Wiki
          </button>
          {isAuthenticated && (
            <button
              onClick={() => navigate('/wiki/new')}
              style={{
                padding:'11px 24px', borderRadius:100, border:'none',
                background:`linear-gradient(135deg,${GOLD},#e5b83a)`,
                color:'#1a1200', fontSize:13, fontWeight:800, cursor:'pointer',
                boxShadow:`0 6px 24px rgba(212,160,23,0.28)`,
              }}
            >
              + Nouvel article
            </button>
          )}
        </div>
      </div>
    </FullPageShell>
  )
}
