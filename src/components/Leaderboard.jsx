import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInView } from '../hooks/useInView.js'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import { fetchLeaderboard } from '../lib/supabase.js'

const MEDALS = { 1:'🥇', 2:'🥈', 3:'🥉' }
const RANK_MAP = [
  { min:150, rang:'Roi des pirates', emoji:'🤴', color:'#FFD700' },
  { min:70,  rang:'Yonkou',          emoji:'👑', color:'#9B59B6' },
  { min:40,  rang:'Amiral',          emoji:'🪖', color:'#F1C40F' },
  { min:25,  rang:'Shichibukai',     emoji:'⚔️', color:'#2ECC71' },
  { min:10,  rang:'Pirate',          emoji:'🏴‍☠️', color:'#3B82F6' },
  { min:0,   rang:'Moussaillon',     emoji:'⚓', color:'#7c7f8a' },
]

const PERIODS    = ['Jour', 'Semaine', 'Mois', 'All-time']
const RANG_OPTS  = ['Tous', ...RANK_MAP.map(r => r.rang)]
const PERIOD_CONFIG = {
  Jour: { rpc: 'day', label: "aujourd'hui" },
  Semaine: { rpc: 'week', label: 'cette semaine' },
  Mois: { rpc: 'month', label: 'sur 30 jours' },
  'All-time': { rpc: 'all', label: 'depuis le debut' },
}

function getRank(h) { return RANK_MAP.find(r => h >= r.min) ?? RANK_MAP[RANK_MAP.length-1] }
function fmt(n) { return n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}k` : String(n) }

const PER_PAGE = 10

export default function Leaderboard() {
  const navigate = useNavigate()
  const [allRows,    setAllRows]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(0)
  // Défaut 'Semaine' : les rangs Discord sont basés sur les heures vocales /7j,
  // donc le classement par semaine est cohérent avec les vrais rôles.
  const [period,     setPeriod]     = useState(() => localStorage.getItem('lb_period_v2') || 'Semaine')
  const [rangFilter, setRangFilter] = useState('Tous')
  const [showRangs,  setShowRangs]  = useState(false)
  const [ref, inView] = useInView()
  const isMobile = useMediaQuery('(max-width: 560px)')
  const rowGrid = isMobile ? '32px minmax(0,1fr) minmax(72px,auto)' : '52px minmax(0,1fr) 110px 130px'

  useEffect(() => {
    let ignore = false
    let timer = null
    // silent=true : refresh en arrière-plan → on NE remet PAS le loading (sinon la
    // liste clignote/disparaît toutes les 15s) et on n'écrase pas avec un retour vide.
    const load = async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const data = await fetchLeaderboard(100, PERIOD_CONFIG[period]?.rpc || 'week')
        if (!ignore) {
          if (!silent || (data && data.length)) setAllRows(data || [])
          setLoading(false)
        }
      } catch {
        if (!ignore) setLoading(false)
      }
    }
    const loop = () => {
      clearTimeout(timer)
      timer = setTimeout(async () => {
        await load(true)
        loop()
      }, document.hidden ? 30000 : 15000)
    }
    load()
    loop()
    const onFocus = () => { if (!document.hidden) load(true) }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      ignore = true
      clearTimeout(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [period])

  const handlePeriod = (p) => { setPeriod(p); localStorage.setItem('lb_period_v2', p); setPage(0) }

  // Tri garanti côté client par heures décroissantes (puis berrys) — filet de
  // sécurité si le RPC renvoie un ordre incorrect. La position (pos) est calculée
  // APRÈS le tri pour que le rang affiché soit toujours juste.
  const rawRows = useMemo(() => {
    if (!allRows) return []
    return [...allRows]
      .map(r => ({ ...r, vocal_h: parseFloat(r.vocal_h || 0), berrys: parseInt(r.berrys || 0) || 0 }))
      .sort((a, b) => b.vocal_h - a.vocal_h || b.berrys - a.berrys)
      .map((r, i) => ({ ...r, pos: i + 1 }))
  }, [allRows])

  const rows = useMemo(() =>
    rangFilter === 'Tous' ? rawRows : rawRows.filter(r => getRank(r.vocal_h).rang === rangFilter),
    [rangFilter, rawRows]
  )

  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE))
  const display    = rows.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  return (
    <section style={{ background:'transparent', position:'relative' }}>
      <div className="orb" style={{ width:400, height:400, top:'10%', left:'-5%', background:'rgba(155,89,182,.06)', pointerEvents:'none' }} />

      <div className="container" ref={ref}>
        <div style={{ textAlign:'center', marginBottom:64 }}>
          <div className={`reveal ${inView?'visible':''}`}>
            <div className="label">Top membres</div>
            <h2 className="h2" style={{ margin:'0 auto 16px' }}>Classement vocal</h2>
            <p className="sub" style={{ margin:'0 auto' }}>
              Les membres les plus actifs en vocal {PERIOD_CONFIG[period]?.label || 'cette semaine'} · Top {rows.length || 100}
            </p>
          </div>
        </div>

        <div style={{ width:'100%', maxWidth:780, margin:'0 auto', overflow:'hidden' }}>

          {/* Controls */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:isMobile ? 'stretch' : 'space-between', flexWrap:'wrap', gap:12, marginBottom:24 }}>

            {/* Period toggle */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', width:isMobile ? '100%' : undefined }}>
              {PERIODS.map(p => (
                <button key={p} onClick={() => handlePeriod(p)} style={{
                  flex:isMobile ? '1 1 0' : undefined,
                  padding:isMobile ? '7px 10px' : '7px 16px', borderRadius:20, fontSize:12, fontWeight:700, letterSpacing:'.04em',
                  border: p===period ? 'none' : '1px solid rgba(255,255,255,.12)',
                  background: p===period ? 'var(--accent)' : 'transparent',
                  color: p===period ? '#fff' : 'var(--muted)',
                  cursor:'pointer', transition:'all .15s',
                }}>
                  {p}
                </button>
              ))}
            </div>

            {/* Rang filter dropdown */}
            <div style={{ position:'relative', width:isMobile ? '100%' : undefined }}>
              <button onClick={() => setShowRangs(v => !v)} style={{
                display:'flex', alignItems:'center', gap:8,
                justifyContent:isMobile ? 'space-between' : undefined,
                width:isMobile ? '100%' : undefined,
                padding:'7px 14px', borderRadius:20, fontSize:12, fontWeight:700, letterSpacing:'.04em',
                border:'1px solid rgba(255,255,255,.12)', background:'rgba(255,255,255,.04)',
                color:'#fff', cursor:'pointer', transition:'all .15s',
              }}>
                <span>{rangFilter === 'Tous' ? '⚔️ Filtrer par rang' : `${RANK_MAP.find(r=>r.rang===rangFilter)?.emoji??'⚓'} ${rangFilter}`}</span>
                <span style={{ fontSize:10, opacity:.6 }}>{showRangs ? '▲' : '▼'}</span>
              </button>
              {showRangs && (
                <div style={{
                  position:'absolute', top:'calc(100% + 6px)', right:isMobile ? 'auto' : 0, left:isMobile ? 0 : undefined, zIndex:20,
                  background:'#1a1b1f', border:'1px solid rgba(255,255,255,.1)', borderRadius:12,
                  padding:'6px', minWidth:isMobile ? '100%' : 200, width:isMobile ? '100%' : undefined, boxShadow:'0 8px 32px rgba(0,0,0,.5)',
                }}>
                  {RANG_OPTS.map(opt => {
                    const info = RANK_MAP.find(r => r.rang === opt)
                    return (
                      <button key={opt} onClick={() => { setRangFilter(opt); setShowRangs(false); setPage(0) }} style={{
                        display:'flex', alignItems:'center', gap:8, width:'100%', padding:'8px 12px',
                        borderRadius:8, border:'none', background: opt===rangFilter ? 'rgba(224,82,74,.15)' : 'transparent',
                        color: opt===rangFilter ? 'var(--accent)' : '#fff', cursor:'pointer', fontSize:13, fontWeight:600,
                        textAlign:'left', transition:'background .1s',
                      }}>
                        {info ? <span>{info.emoji}</span> : <span>🏴‍☠️</span>}
                        {opt}
                        {info && <span style={{ marginLeft:'auto', fontSize:10, color:info.color, opacity:.7 }}>{info.min}h+</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Header */}
          <div style={{ display:'grid', gridTemplateColumns:rowGrid, padding:isMobile ? '0 10px 8px' : '0 20px 10px', fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--muted)' }}>
            <span>#</span><span>Membre</span><span style={{ textAlign:'right' }}>{isMobile ? 'Stats' : 'Heures'}</span>{!isMobile && <span style={{ textAlign:'right' }}>Berrys</span>}
          </div>

          {/* Rows */}
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {loading
              ? Array.from({length:10}).map((_,i) => (
                  <div key={i} style={{ height:isMobile ? 56 : 64, borderRadius:12, background:'rgba(255,255,255,.03)', animation:'pulse 1.5s ease-in-out infinite', animationDelay:`${i*0.07}s` }} />
                ))
              : display.map((m, i) => {
                  const rk = getRank(m.vocal_h)
                  const isTop3 = m.pos <= 3
                  const showSep = m.pos === 4 && rangFilter === 'Tous'
                  const avatarSize = isMobile ? 32 : 36
                  return (
                    <div key={m.uid}>
                    {showSep && (
                      <div style={{ display:'flex', alignItems:'center', gap:12, margin:'12px 0 8px', padding:'0 4px' }}>
                        <div style={{ flex:1, height:1, background:'rgba(255,255,255,.06)' }} />
                        <span style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--muted)', whiteSpace:'nowrap' }}>── Top 10 ──</span>
                        <div style={{ flex:1, height:1, background:'rgba(255,255,255,.06)' }} />
                      </div>
                    )}
                    <div className={`reveal reveal-${Math.min(i+1,4)} ${inView?'visible':''}`}
                      onClick={() => navigate(`/u/${m.uid}`)}
                      style={{
                        display:'grid', gridTemplateColumns:rowGrid,
                        alignItems:'center', borderRadius:12, padding:isMobile ? '10px 10px' : '14px 20px',
                        gap:isMobile ? 8 : 0,
                        minWidth:0,
                        overflow:'hidden',
                        background: isTop3
                          ? `linear-gradient(90deg, ${rk.color}15 0%, rgba(17,18,20,0.6) 100%)`
                          : 'rgba(17,18,20,0.5)',
                        border: isTop3 ? `1px solid ${rk.color}35` : '1px solid rgba(255,255,255,0.06)',
                        backdropFilter:'blur(8px)',
                        cursor:'pointer',
                        transition:'transform .15s, box-shadow .15s',
                      }}
                      onMouseEnter={e=>{ if (isMobile) return; e.currentTarget.style.transform='translateX(4px)';e.currentTarget.style.boxShadow=`0 4px 20px ${rk.color}15`}}
                      onMouseLeave={e=>{e.currentTarget.style.transform='translateX(0)';e.currentTarget.style.boxShadow='none'}}
                    >
                      <span style={{ fontSize:isTop3 ? (isMobile ? 17 : 22) : 14, fontWeight:700, color:isTop3?rk.color:'var(--muted)' }}>
                        {MEDALS[m.pos] ?? m.pos}
                      </span>

                      <div style={{ display:'flex', alignItems:'center', gap:isMobile ? 8 : 12, minWidth:0, overflow:'hidden' }}>
                        <div style={{
                          width:avatarSize, height:avatarSize, borderRadius:'50%', flexShrink:0,
                          background:`${rk.color}18`, border:`1px solid ${rk.color}40`,
                          overflow:'hidden',
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                          boxShadow: isTop3 ? `0 0 12px ${rk.color}40` : 'none',
                        }}>
                          {m.avatar_url
                            ? <img src={m.avatar_url} alt="" width={avatarSize} height={avatarSize} loading="lazy" decoding="async" style={{ width:avatarSize, height:avatarSize, objectFit:'cover', borderRadius:'50%' }} onError={e=>{e.currentTarget.style.display='none';e.currentTarget.nextSibling.style.display='flex'}} />
                            : null}
                          <span style={{ display:m.avatar_url?'none':'flex' }}>{rk.emoji}</span>
                        </div>
                        <div style={{ minWidth:0, overflow:'hidden' }}>
                          <div style={{ fontWeight:600, fontSize:isMobile ? 13 : 14, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.username || `Pirate #${m.uid.slice(-5)}`}</div>
                          <div style={{ fontSize:isMobile ? 10.5 : 11, color:rk.color, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{rk.emoji} {rk.rang}</div>
                        </div>
                      </div>

                      <div style={{ textAlign:'right', minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:isMobile ? 13 : 15, color:rk.color, whiteSpace:'nowrap' }}>{m.vocal_h}h</div>
                        {isMobile && <div style={{ fontWeight:600, fontSize:11.5, color:'var(--gold)', whiteSpace:'nowrap', marginTop:1 }}>{fmt(m.berrys)} ฿</div>}
                      </div>
                      {!isMobile && <div style={{ textAlign:'right', fontWeight:600, fontSize:14, color:'var(--gold)' }}>{fmt(m.berrys)} ฿</div>}
                    </div>
                    </div>
                  )
                })
            }
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:28, flexWrap:'wrap', maxWidth:'100%' }}>
              <button
                onClick={() => setPage(p => Math.max(0, p-1))}
                disabled={page === 0}
                style={{
                  padding:'8px 18px', borderRadius:8, border:'1px solid rgba(255,255,255,.1)',
                  background: page===0 ? 'rgba(255,255,255,.03)' : 'rgba(224,82,74,.15)',
                  color: page===0 ? 'var(--muted)' : '#fff', cursor: page===0 ? 'not-allowed' : 'pointer',
                  fontSize:14, fontWeight:600, transition:'all .15s',
                }}
              >← Préc</button>

              <div style={{ display:'flex', gap:4, maxWidth:'100%', overflowX:'auto', padding:'2px 0' }}>
                {Array.from({length:totalPages}).map((_,i) => (
                  <button key={i} onClick={() => setPage(i)} style={{
                    width:32, height:32, borderRadius:8, border:'1px solid',
                    borderColor: i===page ? 'var(--accent)' : 'rgba(255,255,255,.08)',
                    background: i===page ? 'var(--accent)' : 'transparent',
                    color: i===page ? '#fff' : 'var(--muted)',
                    cursor:'pointer', fontSize:13, fontWeight:600, transition:'all .15s',
                  }}>{i+1}</button>
                ))}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages-1, p+1))}
                disabled={page === totalPages-1}
                style={{
                  padding:'8px 18px', borderRadius:8, border:'1px solid rgba(255,255,255,.1)',
                  background: page===totalPages-1 ? 'rgba(255,255,255,.03)' : 'rgba(224,82,74,.15)',
                  color: page===totalPages-1 ? 'var(--muted)' : '#fff', cursor: page===totalPages-1 ? 'not-allowed' : 'pointer',
                  fontSize:14, fontWeight:600, transition:'all .15s',
                }}
              >Suiv →</button>
            </div>
          )}

          <p style={{ textAlign:'center', marginTop:20, fontSize:12, color:'var(--muted)' }}>
            Page {page+1}/{totalPages} · Mis à jour toutes les heures · Parle en vocal pour apparaître ici
          </p>
        </div>
      </div>
    </section>
  )
}
