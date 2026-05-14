import { useState, useEffect } from 'react'
import { useInView } from '../hooks/useInView.js'
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

function getRank(h) { return RANK_MAP.find(r => h >= r.min) ?? RANK_MAP[RANK_MAP.length-1] }
function fmt(n) { return n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}k` : String(n) }

const PER_PAGE = 10

export default function Leaderboard() {
  const [allRows, setAllRows] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [ref, inView] = useInView()

  useEffect(() => {
    fetchLeaderboard(100).then(data => {
      setAllRows(data)
      setLoading(false)
    })
  }, [])

  const rows = allRows
    ? allRows.map((r, i) => ({ ...r, pos: i+1, vocal_h: parseFloat(r.vocal_h||0), berrys: parseInt(r.berrys||0) }))
    : []

  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE))
  const display = rows.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  return (
    <section id="classement" style={{ background:'transparent', position:'relative' }}>
      <div className="orb" style={{ width:400, height:400, top:'10%', left:'-5%', background:'rgba(155,89,182,.06)', pointerEvents:'none' }} />

      <div className="container" ref={ref}>
        <div style={{ textAlign:'center', marginBottom:64 }}>
          <div className={`reveal ${inView?'visible':''}`}>
            <div className="label">Top membres</div>
            <h2 className="h2" style={{ margin:'0 auto 16px', fontFamily:'var(--pirate)', fontWeight:400, letterSpacing:'.02em' }}>Classement vocal</h2>
            <p className="sub" style={{ margin:'0 auto' }}>
              Les membres les plus actifs en vocal cette semaine · Top {rows.length || 100}
            </p>
          </div>
        </div>

        <div style={{ maxWidth:780, margin:'0 auto' }}>
          {/* Header */}
          <div style={{ display:'grid', gridTemplateColumns:'52px 1fr 110px 130px', padding:'0 20px 10px', fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--muted)' }}>
            <span>#</span><span>Membre</span><span style={{ textAlign:'right' }}>Heures</span><span style={{ textAlign:'right' }}>Berrys</span>
          </div>

          {/* Rows */}
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {loading
              ? Array.from({length:10}).map((_,i) => (
                  <div key={i} style={{ height:64, borderRadius:12, background:'rgba(255,255,255,.03)', animation:'pulse 1.5s ease-in-out infinite', animationDelay:`${i*0.07}s` }} />
                ))
              : display.map((m, i) => {
                  const rk = getRank(m.vocal_h)
                  const isTop3 = m.pos <= 3
                  return (
                    <div key={m.uid} className={`reveal reveal-${Math.min(i+1,4)} ${inView?'visible':''}`}
                      style={{
                        display:'grid', gridTemplateColumns:'52px 1fr 110px 130px',
                        alignItems:'center', borderRadius:12, padding:'14px 20px',
                        background: isTop3
                          ? `linear-gradient(90deg, ${rk.color}15 0%, rgba(17,18,20,0.6) 100%)`
                          : 'rgba(17,18,20,0.5)',
                        border: isTop3 ? `1px solid ${rk.color}35` : '1px solid rgba(255,255,255,0.06)',
                        backdropFilter:'blur(8px)',
                        transition:'transform .15s, box-shadow .15s',
                      }}
                      onMouseEnter={e=>{e.currentTarget.style.transform='translateX(4px)';e.currentTarget.style.boxShadow=`0 4px 20px ${rk.color}15`}}
                      onMouseLeave={e=>{e.currentTarget.style.transform='translateX(0)';e.currentTarget.style.boxShadow='none'}}
                    >
                      <span style={{ fontSize:isTop3?22:14, fontWeight:700, color:isTop3?rk.color:'var(--muted)' }}>
                        {MEDALS[m.pos] ?? m.pos}
                      </span>

                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{
                          width:36, height:36, borderRadius:'50%', flexShrink:0,
                          background:`${rk.color}18`, border:`1px solid ${rk.color}40`,
                          overflow:'hidden',
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                          boxShadow: isTop3 ? `0 0 12px ${rk.color}40` : 'none',
                        }}>
                          {m.avatar_url
                            ? <img src={m.avatar_url} alt="" width={36} height={36} style={{ objectFit:'cover', borderRadius:'50%' }} onError={e=>{e.currentTarget.style.display='none';e.currentTarget.nextSibling.style.display='flex'}} />
                            : null}
                          <span style={{ display:m.avatar_url?'none':'flex' }}>{rk.emoji}</span>
                        </div>
                        <div>
                          <div style={{ fontWeight:600, fontSize:14, color:'#fff' }}>{m.username || `Pirate #${m.uid.slice(-5)}`}</div>
                          <div style={{ fontSize:11, color:rk.color, fontWeight:600 }}>{rk.emoji} {rk.rang}</div>
                        </div>
                      </div>

                      <div style={{ textAlign:'right', fontWeight:700, fontSize:15, color:rk.color }}>{m.vocal_h}h</div>
                      <div style={{ textAlign:'right', fontWeight:600, fontSize:14, color:'var(--gold)' }}>{fmt(m.berrys)} ฿</div>
                    </div>
                  )
                })
            }
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:28 }}>
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

              <div style={{ display:'flex', gap:4 }}>
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
