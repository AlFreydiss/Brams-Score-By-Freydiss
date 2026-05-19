import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTheories } from '../lib/wiki.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const GOLD   = '#d4a017'
const VIOLET = '#a29bfe'

const TH_CSS = `
  @keyframes thFadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
  @keyframes thTwinkle { 0%,100%{opacity:.10} 50%{opacity:.65} }
  @keyframes thScan    { 0%{top:-2px} 100%{top:100%} }
  @keyframes thPulse   { 0%,100%{opacity:.04} 50%{opacity:.09} }
`

function THStars() {
  const stars = useMemo(() => Array.from({ length: 48 }, (_, i) => ({
    x:(i*38.9+11)%98, y:(i*44.1+7)%96, size:i%9===0?2.5:i%4===0?1.6:1,
    dur:2.9+(i*0.27)%4.5, del:(i*0.22)%7,
    col: i%11===0 ? 'rgba(162,155,254,.60)' : i%13===0 ? 'rgba(212,160,23,.60)' : null,
  })), [])
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position:'absolute', left:`${s.x}%`, top:`${s.y}%`,
          width:s.size, height:s.size, borderRadius:'50%',
          background:s.col ?? 'rgba(255,255,255,.5)',
          animation:`thTwinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

function THScanLine() {
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:1, overflow:'hidden' }}>
      <div style={{ position:'absolute', left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,rgba(162,155,254,.07),rgba(162,155,254,.16),rgba(162,155,254,.07),transparent)', animation:'thScan 18s linear infinite' }} />
    </div>
  )
}

const CATEGORIES = ['Tous', 'Personnages', 'Arcs', 'Fruits du Démon', 'Lieux', 'Organisations', 'Autre']
const SORTS = [
  { id:'recent', label:'Récent',    icon:'🕐' },
  { id:'top',    label:'Top votes', icon:'🔥' },
  { id:'hot',    label:'Hot',       icon:'💬' },
]
const LIMIT = 12

// Category colors
const CAT_COLORS = {
  'Personnages':     '#e0524a',
  'Arcs':            '#d4a017',
  'Fruits du Démon': '#8b5cf6',
  'Lieux':           '#0ea5e9',
  'Organisations':   '#10b981',
  'Autre':           '#6b7280',
  'Tous':            GOLD,
}

function ScoreBar({ up, down }) {
  const total = up + down
  const pct = total === 0 ? 50 : Math.round((up / total) * 100)
  return (
    <div style={{ height:3, background:'rgba(255,255,255,0.07)', borderRadius:2, overflow:'hidden', marginTop:8 }}>
      <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#2ECC71,#34d399)', transition:'width .3s', boxShadow:'0 0 6px rgba(34,197,94,0.40)' }} />
    </div>
  )
}

function TheoryCard({ theory, index, onClick }) {
  const [hov, setHov] = useState(false)
  const c = CAT_COLORS[theory.category] || GOLD
  const score = (theory.votes_up || 0) - (theory.votes_down || 0)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:`linear-gradient(160deg,${c}0c 0%,rgba(7,9,14,0.97) 100%)`,
        border:`1px solid ${hov ? c+'45' : c+'18'}`,
        borderTop:`3px solid ${hov ? c : c+'aa'}`,
        borderRadius:14, overflow:'hidden', cursor:'pointer',
        transition:'all .22s ease',
        transform: hov ? 'translateY(-5px)' : 'none',
        boxShadow: hov ? `0 12px 36px ${c}20` : 'none',
        animation:`thFadeUp .4s ${Math.min(index * 0.06, 0.48)}s ease both`,
      }}
    >
      {theory.cover_image && (
        <div style={{ overflow:'hidden', height:120 }}>
          <img src={theory.cover_image} alt={theory.title} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transition:'transform .35s', transform: hov ? 'scale(1.05)' : 'scale(1)' }} />
        </div>
      )}
      <div style={{ padding:'16px 18px' }}>
        {/* Category + tags */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10, flexWrap:'wrap' }}>
          <span style={{ fontSize:9, fontWeight:800, letterSpacing:'.10em', padding:'2px 9px', borderRadius:100, background:`${c}18`, color:c, border:`1px solid ${c}35`, textTransform:'uppercase' }}>
            {theory.category}
          </span>
          {(theory.tags || []).slice(0, 2).map(tag => (
            <span key={tag} style={{ fontSize:9, padding:'2px 8px', borderRadius:100, background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.35)', border:'1px solid rgba(255,255,255,0.07)' }}>
              #{tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <div style={{ fontFamily:"'Pirata One',cursive", fontSize:15, fontWeight:900, color:'#fff', marginBottom:8, lineHeight:1.3 }}>{theory.title}</div>

        {/* Score bar */}
        <ScoreBar up={theory.votes_up || 0} down={theory.votes_down || 0} />

        {/* Footer */}
        <div style={{ display:'flex', alignItems:'center', marginTop:10, fontSize:11, color:'rgba(255,255,255,0.32)' }}>
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:110 }}>✍️ {theory.author_name}</span>
          <span style={{ marginLeft:'auto', display:'flex', gap:10, flexShrink:0 }}>
            <span style={{ color: score > 0 ? '#34d399' : score < 0 ? '#f87171' : 'rgba(255,255,255,0.35)', fontWeight:700 }}>
              {score > 0 ? `+${score}` : score}
            </span>
            <span>💬 {theory.comments_count || 0}</span>
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
    fetchTheories({ category, sort, limit:LIMIT, offset:0 }).then(data => {
      setTheories(data)
      setHasMore(data.length === LIMIT)
      setLoading(false)
    })
  }, [category, sort])

  async function loadMore() {
    const nextPage = page + 1
    const data = await fetchTheories({ category, sort, limit:LIMIT, offset:nextPage * LIMIT })
    setTheories(prev => [...prev, ...data])
    setHasMore(data.length === LIMIT)
    setPage(nextPage)
  }

  const activeColor = CAT_COLORS[category] || GOLD

  return (
    <div style={{ minHeight:'100vh', paddingTop:80, position:'relative' }}>
      <style>{TH_CSS}</style>
      <THStars />
      <THScanLine />

      <div style={{ position:'relative', zIndex:2 }}>
        <div style={{ maxWidth:1120, margin:'0 auto', padding:'40px 24px 100px' }}>

          {/* ── Hero ── */}
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8, padding:'5px 18px', borderRadius:100,
              background:'rgba(162,155,254,0.10)', border:'1px solid rgba(162,155,254,0.28)',
              fontSize:10, fontWeight:800, letterSpacing:'.22em', color:VIOLET, textTransform:'uppercase', marginBottom:20,
            }}>
              🔮 Forum Théories
            </div>
            <h1 style={{ fontFamily:"'Pirata One',cursive", fontSize:'clamp(42px,7vw,78px)', color:'#fff', margin:'0 0 16px', lineHeight:1, letterSpacing:'-.02em' }}>
              Théories
            </h1>
            <p style={{ fontSize:15, color:'rgba(255,255,255,0.42)', maxWidth:500, margin:'0 auto 32px', lineHeight:1.75 }}>
              Partage tes théories, vote pour les meilleures, débats avec la communauté One Piece.
            </p>

            {isAuthenticated ? (
              <button
                onClick={() => navigate('/theories/new')}
                style={{
                  padding:'12px 28px', borderRadius:100, border:'none',
                  background:`linear-gradient(135deg,${VIOLET},#8b7ff0)`, color:'#fff',
                  fontSize:13, fontWeight:800, cursor:'pointer', transition:'all .18s', letterSpacing:'.04em',
                  boxShadow:`0 6px 24px rgba(162,155,254,0.28)`,
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity='.88'; e.currentTarget.style.transform='translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='none' }}
              >
                + Proposer une théorie
              </button>
            ) : (
              <button
                onClick={() => document.dispatchEvent(new CustomEvent('open-auth-modal'))}
                style={{ padding:'12px 28px', borderRadius:100, border:`1px solid ${VIOLET}40`, background:`${VIOLET}0d`, color:VIOLET, fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .18s' }}
                onMouseEnter={e => e.currentTarget.style.background=`${VIOLET}18`}
                onMouseLeave={e => e.currentTarget.style.background=`${VIOLET}0d`}
              >
                Se connecter pour proposer →
              </button>
            )}
          </div>

          {/* ── Filters ── */}
          <div style={{ marginBottom:32 }}>
            {/* Category pills */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
              {CATEGORIES.map(cat => {
                const active = category === cat
                const c = CAT_COLORS[cat] || GOLD
                return (
                  <button key={cat} onClick={() => setCategory(cat)} style={{
                    display:'inline-flex', alignItems:'center', gap:5,
                    padding:'9px 18px', borderRadius:100,
                    border:`1px solid ${active ? c+'55' : 'rgba(255,255,255,0.09)'}`,
                    background: active ? `${c}14` : 'rgba(255,255,255,0.03)',
                    color: active ? c : 'rgba(255,255,255,0.42)',
                    fontSize:12, fontWeight:700, cursor:'pointer', transition:'all .18s', whiteSpace:'nowrap',
                    boxShadow: active ? `0 0 18px ${c}18` : 'none',
                  }}>
                    {cat}
                  </button>
                )
              })}
            </div>

            {/* Sort + separator */}
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              {SORTS.map(s => (
                <button key={s.id} onClick={() => setSort(s.id)} style={{
                  display:'inline-flex', alignItems:'center', gap:5,
                  padding:'7px 14px', borderRadius:10,
                  border:`1px solid ${sort===s.id ? 'rgba(162,155,254,0.40)' : 'rgba(255,255,255,0.07)'}`,
                  background: sort===s.id ? 'rgba(162,155,254,0.12)' : 'transparent',
                  color: sort===s.id ? VIOLET : 'rgba(255,255,255,0.40)',
                  fontSize:12, fontWeight:700, cursor:'pointer', transition:'all .15s',
                }}>
                  <span>{s.icon}</span><span>{s.label}</span>
                </button>
              ))}
              <div style={{ marginLeft:'auto', fontSize:11, color:'rgba(255,255,255,0.25)', fontWeight:600 }}>
                {theories.length} théorie{theories.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Tab separator */}
          <div style={{ height:1, background:`linear-gradient(90deg,transparent,${activeColor}35,transparent)`, marginBottom:32, transition:'background .4s' }} />

          {/* ── Grid ── */}
          {loading ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:14 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height:200, borderRadius:14, background:'rgba(255,255,255,0.03)', animation:'thPulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          ) : theories.length === 0 ? (
            <div style={{ textAlign:'center', padding:'80px 0', color:'rgba(255,255,255,0.25)', fontSize:15 }}>
              <div style={{ fontSize:48, marginBottom:16, opacity:.4 }}>🔮</div>
              Aucune théorie dans cette catégorie. Sois le premier !
            </div>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:14 }}>
                {theories.map((t, i) => (
                  <TheoryCard key={t.id} theory={t} index={i} onClick={() => navigate(`/theories/${t.id}`)} />
                ))}
              </div>
              {hasMore && (
                <div style={{ textAlign:'center', marginTop:36 }}>
                  <button
                    onClick={loadMore}
                    style={{
                      padding:'12px 32px', borderRadius:100,
                      border:`1px solid ${VIOLET}40`, background:`${VIOLET}0d`,
                      color:VIOLET, fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .18s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background=`${VIOLET}18`}
                    onMouseLeave={e => e.currentTarget.style.background=`${VIOLET}0d`}
                  >
                    Voir plus →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
