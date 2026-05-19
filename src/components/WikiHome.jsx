import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWikiCategories, fetchWikiPages } from '../lib/wiki.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const GOLD   = '#d4a017'
const ACCENT = '#e0524a'

const WH_CSS = `
  @keyframes whFadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
  @keyframes whTwinkle { 0%,100%{opacity:.12} 50%{opacity:.70} }
  @keyframes whScan    { 0%{top:-2px} 100%{top:100%} }
  @keyframes whPulse   { 0%,100%{opacity:.04} 50%{opacity:.09} }
  @keyframes whSpin    { to{transform:rotate(360deg)} }
`

function WHStars() {
  const stars = useMemo(() => Array.from({ length: 55 }, (_, i) => ({
    x:    (i * 39.1 + 13) % 99,
    y:    (i * 43.7 + 5)  % 96,
    size: i % 9 === 0 ? 2.8 : i % 4 === 0 ? 1.8 : 1,
    dur:  2.6 + (i * 0.31) % 4.5,
    del:  (i * 0.19) % 6,
    gold: i % 11 === 0,
    red:  i % 17 === 0,
  })), [])
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position:'absolute', left:`${s.x}%`, top:`${s.y}%`,
          width:s.size, height:s.size, borderRadius:'50%',
          background: s.gold ? 'rgba(212,160,23,.70)' : s.red ? 'rgba(224,82,74,.55)' : 'rgba(255,255,255,.50)',
          animation:`whTwinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

function WHScanLine() {
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:1, overflow:'hidden' }}>
      <div style={{
        position:'absolute', left:0, right:0, height:2,
        background:'linear-gradient(90deg,transparent,rgba(212,160,23,.06),rgba(212,160,23,.14),rgba(212,160,23,.06),transparent)',
        animation:'whScan 18s linear infinite',
      }} />
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

function SectionHeading({ eyebrow, title, color = GOLD }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ fontSize:10, fontWeight:800, letterSpacing:'.28em', color, textTransform:'uppercase', marginBottom:10 }}>
        {eyebrow}
      </div>
      <h2 style={{ fontFamily:"'Pirata One',cursive", fontWeight:900, fontSize:'clamp(26px,4vw,42px)', color:'#fff', margin:0, lineHeight:1.1 }}>
        {title}
      </h2>
      <div style={{ width:48, height:3, background:`linear-gradient(90deg,${color},transparent)`, borderRadius:2, marginTop:12 }} />
    </div>
  )
}

function CategoryCard({ cat, index, onClick }) {
  const [hov, setHov] = useState(false)
  const c = cat.color || ACCENT
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:'relative',
        background:`linear-gradient(145deg,${c}18 0%,rgba(7,9,14,0.96) 100%)`,
        border:`1px solid ${hov ? c+'55' : c+'22'}`,
        borderTop:`3px solid ${c}`,
        borderRadius:14, padding:'22px 20px 18px', cursor:'pointer',
        transition:'all .22s ease',
        transform: hov ? 'translateY(-5px)' : 'none',
        boxShadow: hov ? `0 12px 36px ${c}22` : `0 2px 8px ${c}0a`,
        animation:`whFadeUp 0.4s ${index * 0.07}s ease-out both`,
      }}
    >
      <div style={{ fontSize:36, marginBottom:12, filter:`drop-shadow(0 0 12px ${c}55)`, lineHeight:1 }}>{cat.icon}</div>
      <div style={{ fontWeight:800, fontSize:15, color:'#fff', marginBottom:8, lineHeight:1.2 }}>{cat.name}</div>
      {cat.description && (
        <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.40)', lineHeight:1.6, marginBottom:14 }}>{cat.description}</div>
      )}
      <div style={{
        display:'inline-flex', alignItems:'center', gap:5,
        fontSize:10, fontWeight:800, letterSpacing:'.12em', textTransform:'uppercase',
        color: hov ? c : 'rgba(255,255,255,0.28)', transition:'color .18s',
      }}>
        Explorer →
      </div>
    </div>
  )
}

function PageCard({ page, index, onClick }) {
  const [hov, setHov] = useState(false)
  const cat = page.wiki_categories
  const c   = cat?.color || GOLD
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:`linear-gradient(160deg,${c}0d 0%,rgba(7,9,14,0.97) 100%)`,
        border:`1px solid ${hov ? c+'44' : c+'1a'}`,
        borderTop:`3px solid ${c}${hov ? '' : 'bb'}`,
        borderRadius:12, overflow:'hidden', cursor:'pointer',
        transition:'all .22s ease',
        transform: hov ? 'translateY(-5px)' : 'none',
        boxShadow: hov ? `0 10px 28px ${c}1a` : 'none',
        animation:`whFadeUp 0.35s ${(index ?? 0) * 0.06}s ease-out both`,
      }}
    >
      {page.cover_image ? (
        <div style={{ overflow:'hidden', height:120 }}>
          <img src={page.cover_image} alt={page.title} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transition:'transform .35s', transform: hov ? 'scale(1.05)' : 'scale(1)' }} />
        </div>
      ) : (
        <div style={{ height:72, background:`linear-gradient(135deg,${c}1a,transparent)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>
          {cat?.icon ?? '📄'}
        </div>
      )}
      <div style={{ padding:'14px 16px' }}>
        {cat && (
          <div style={{ fontSize:9, fontWeight:800, letterSpacing:'.14em', color:c, textTransform:'uppercase', marginBottom:7 }}>
            {cat.icon} {cat.name}
          </div>
        )}
        <div style={{ fontWeight:700, fontSize:14, color:'#fff', marginBottom:7, lineHeight:1.3 }}>{page.title}</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.30)' }}>
          {page.author_name} · {timeAgo(page.updated_at ?? page.created_at)} · 👁 {page.views ?? 0}
        </div>
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

  if (pages === null) return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ height:160, borderRadius:12, background:'rgba(255,255,255,0.03)', animation:'whPulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )

  if (pages.length === 0) return (
    <div style={{ textAlign:'center', padding:'80px 0', color:'rgba(255,255,255,0.25)', fontSize:15 }}>
      <div style={{ fontSize:48, marginBottom:16, opacity:.4 }}>📄</div>
      Aucun article dans cette catégorie. Sois le premier !
    </div>
  )

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14 }}>
      {pages.map((p, i) => <PageCard key={p.id} page={p} index={i} onClick={() => navigate(`/wiki/${p.slug}`)} />)}
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
    { id:'accueil', label:'Accueil', icon:'🏠' },
    ...categories.map(c => ({ id:c.slug, label:c.name, icon:c.icon, color:c.color })),
  ]

  const activeCat   = categories.find(c => c.slug === activeTab)
  const activeColor = activeCat?.color || GOLD

  return (
    <div style={{ minHeight:'100vh', paddingTop:80, position:'relative' }}>
      <style>{WH_CSS}</style>
      <WHStars />
      <WHScanLine />

      <div style={{ position:'relative', zIndex:2 }}>
        <div style={{ maxWidth:1120, margin:'0 auto', padding:'40px 24px 100px' }}>

          {/* ── Hero ── */}
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8,
              padding:'5px 18px', borderRadius:100,
              background:'rgba(212,160,23,0.10)', border:'1px solid rgba(212,160,23,0.28)',
              fontSize:10, fontWeight:800, letterSpacing:'.22em', color:GOLD, textTransform:'uppercase',
              marginBottom:20, animation:'whFadeUp .4s ease both',
            }}>
              ⚓ Encyclopédie communautaire
            </div>

            <h1 style={{
              fontFamily:"'Pirata One',cursive", fontWeight:900,
              fontSize:'clamp(42px,7vw,78px)', color:'#fff',
              margin:'0 0 16px', lineHeight:1, letterSpacing:'-0.02em',
              animation:'whFadeUp .4s .05s ease both',
            }}>
              Wiki One Piece
            </h1>

            <p style={{
              fontSize:15, color:'rgba(255,255,255,0.40)', maxWidth:520,
              margin:'0 auto 36px', lineHeight:1.75,
              animation:'whFadeUp .4s .08s ease both',
            }}>
              L'encyclopédie francophone de la communauté — personnages, arcs, fruits du démon, lieux et bien plus.
            </p>

            {/* Stats pills */}
            {categories.length > 0 && (
              <div style={{ display:'flex', gap:40, justifyContent:'center', flexWrap:'wrap', marginBottom:40, animation:'whFadeUp .4s .1s ease both' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'Pirata One',cursive", fontSize:44, fontWeight:900, color:GOLD, lineHeight:1 }}>{categories.length}</div>
                  <div style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginTop:5 }}>Catégories</div>
                </div>
                <div style={{ width:1, height:50, background:'rgba(255,255,255,0.08)', alignSelf:'center' }} />
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'Pirata One',cursive", fontSize:44, fontWeight:900, color:GOLD, lineHeight:1 }}>{recent.length}</div>
                  <div style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginTop:5 }}>Articles récents</div>
                </div>
              </div>
            )}

            {/* Search */}
            <div style={{ position:'relative', maxWidth:580, margin:'0 auto 28px', animation:'whFadeUp .4s .12s ease both' }}>
              <span style={{ position:'absolute', left:18, top:'50%', transform:'translateY(-50%)', fontSize:15, color:'rgba(255,255,255,0.28)', pointerEvents:'none' }}>🔍</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un article…"
                style={{
                  width:'100%', boxSizing:'border-box',
                  padding:'16px 48px 16px 50px', borderRadius:14,
                  background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)',
                  color:'#fff', fontSize:15, outline:'none',
                  transition:'border-color .15s, box-shadow .15s', fontFamily:'inherit',
                }}
                onFocus={e => { e.target.style.borderColor='rgba(212,160,23,0.5)'; e.target.style.boxShadow='0 0 0 3px rgba(212,160,23,0.08)' }}
                onBlur={e  => { e.target.style.borderColor='rgba(255,255,255,0.12)'; e.target.style.boxShadow='none' }}
              />
              {searching && (
                <div style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)', width:16, height:16, border:'2px solid rgba(212,160,23,0.3)', borderTopColor:GOLD, borderRadius:'50%', animation:'whSpin 0.75s linear infinite' }} />
              )}
              {search && !searching && (
                <button onClick={() => setSearch('')} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'rgba(255,255,255,0.35)', cursor:'pointer', fontSize:16, lineHeight:1 }}>✕</button>
              )}
            </div>

            {isAuthenticated && (
              <button
                onClick={() => navigate('/wiki/new')}
                style={{
                  padding:'12px 28px', borderRadius:100, border:'none',
                  background:`linear-gradient(135deg,${GOLD},#e5b83a)`,
                  color:'#1a1200', fontSize:13, fontWeight:800, cursor:'pointer',
                  transition:'all .18s', letterSpacing:'.04em',
                  boxShadow:`0 6px 24px rgba(212,160,23,0.28)`,
                  animation:'whFadeUp .4s .14s ease both',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity='.88'; e.currentTarget.style.transform='translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='none' }}
              >
                + Proposer un article
              </button>
            )}
          </div>

          {/* ── Search results ── */}
          {results !== null && (
            <div style={{ marginBottom:48 }}>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginBottom:20 }}>
                {results.length} résultat{results.length !== 1 ? 's' : ''} pour « {search} »
              </div>
              {results.length === 0 ? (
                <div style={{ textAlign:'center', padding:'60px 0', color:'rgba(255,255,255,0.25)', fontSize:15 }}>
                  <div style={{ fontSize:40, marginBottom:14, opacity:.35 }}>🔍</div>
                  Aucun article trouvé. Sois le premier à le créer !
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14 }}>
                  {results.map((p, i) => <PageCard key={p.id} page={p} index={i} onClick={() => navigate(`/wiki/${p.slug}`)} />)}
                </div>
              )}
            </div>
          )}

          {/* ── Tabs + content ── */}
          {results === null && (
            <>
              {/* Category pills */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
                {TABS.map(t => {
                  const active = activeTab === t.id
                  const c = t.color || GOLD
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      style={{
                        display:'inline-flex', alignItems:'center', gap:6,
                        padding:'9px 18px', borderRadius:100,
                        border:`1px solid ${active ? c+'55' : 'rgba(255,255,255,0.09)'}`,
                        background: active ? `${c}14` : 'rgba(255,255,255,0.03)',
                        color: active ? c : 'rgba(255,255,255,0.40)',
                        fontSize:12, fontWeight:700, cursor:'pointer',
                        transition:'all .18s',
                        boxShadow: active ? `0 0 18px ${c}18` : 'none',
                      }}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor='rgba(255,255,255,0.18)'; e.currentTarget.style.color='rgba(255,255,255,0.70)' } }}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor='rgba(255,255,255,0.09)'; e.currentTarget.style.color='rgba(255,255,255,0.40)' } }}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Tab separator */}
              <div style={{ height:1, background:`linear-gradient(90deg,transparent,${activeColor}35,transparent)`, marginBottom:40, transition:'background .4s' }} />

              {activeTab === 'accueil' ? (
                <>
                  {/* Categories grid */}
                  <div style={{ marginBottom:60 }}>
                    <SectionHeading eyebrow="Parcourir le Wiki" title="Catégories" color={GOLD} />
                    {categories.length === 0 ? (
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} style={{ height:140, borderRadius:14, background:'rgba(255,255,255,0.03)', animation:'whPulse 1.5s ease-in-out infinite' }} />
                        ))}
                      </div>
                    ) : (
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
                        {categories.map((cat, i) => (
                          <CategoryCard key={cat.id} cat={cat} index={i} onClick={() => setActiveTab(cat.slug)} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent articles */}
                  <div>
                    <SectionHeading eyebrow="Dernières contributions" title="Articles récents" color={GOLD} />
                    {recent.length === 0 ? (
                      <div style={{ textAlign:'center', padding:'60px 0', color:'rgba(255,255,255,0.25)', fontSize:15 }}>
                        <div style={{ fontSize:40, marginBottom:14, opacity:.35 }}>📖</div>
                        Le wiki est vide pour l'instant. Sois le premier à contribuer !
                      </div>
                    ) : (
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14 }}>
                        {recent.map((p, i) => <PageCard key={p.id} page={p} index={i} onClick={() => navigate(`/wiki/${p.slug}`)} />)}
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
    </div>
  )
}
