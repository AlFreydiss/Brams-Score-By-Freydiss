import { useState, useEffect } from 'react'
import { fetchMembersByRank } from '../lib/supabase.js'

function fmt(n) { return n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}k` : String(n) }

const PER_PAGE = 20

export default function RankModal({ rank, onClose }) {
  const [members, setMembers] = useState(null)
  const [page, setPage] = useState(0)

  useEffect(() => {
    let ignore = false
    let timer = null
    const load = () => {
      fetchMembersByRank(rank.minH, rank.maxH).then(data => {
        if (!ignore) setMembers(data)
      })
    }
    setMembers(null)
    setPage(0)
    load()
    const loop = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        load()
        loop()
      }, document.hidden ? 30000 : 20000)
    }
    loop()
    const onFocus = () => { if (!document.hidden) load() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      ignore = true
      clearTimeout(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [rank])

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const total = members?.length ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const display = (members ?? []).slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  return (
    <div
      style={{
        position:'fixed', inset:0, zIndex:500,
        background:'rgba(0,0,0,0.75)', backdropFilter:'blur(12px)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:20, animation:'scaleIn .2s ease-out',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background:'var(--card)', border:`1px solid ${rank.color}30`,
        borderRadius:20, width:'100%', maxWidth:580,
        maxHeight:'85vh', display:'flex', flexDirection:'column',
        boxShadow:`0 24px 80px rgba(0,0,0,.6), 0 0 40px ${rank.color}15`,
      }}>
        {/* Header */}
        <div style={{
          padding:'24px 28px 20px',
          borderBottom:`1px solid ${rank.color}20`,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:`linear-gradient(135deg, ${rank.color}12, transparent)`,
          borderRadius:'20px 20px 0 0',
          flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:52, height:52, borderRadius:14,
              background:`${rank.color}20`, border:`1px solid ${rank.color}40`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:26,
              boxShadow:`0 0 20px ${rank.color}30`,
            }}>{rank.emoji}</div>
            <div>
              <div style={{ fontFamily:'var(--pirate)', fontSize:24, color:'#fff', lineHeight:1 }}>{rank.name}</div>
              <div style={{ fontSize:13, color:rank.color, marginTop:4 }}>
                {members === null ? 'Chargement…' : `${total} membre${total > 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width:36, height:36, borderRadius:10, border:'1px solid rgba(255,255,255,.1)',
            background:'rgba(255,255,255,.05)', color:'var(--muted)', cursor:'pointer', fontSize:18,
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'background .15s, color .15s',
          }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.1)';e.currentTarget.style.color='#fff'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.05)';e.currentTarget.style.color='var(--muted)'}}
          >✕</button>
        </div>

        {/* List */}
        <div style={{ overflowY:'auto', flex:1, padding:'16px 20px' }}>
          {members === null
            ? Array.from({length:8}).map((_,i) => (
                <div key={i} style={{ height:56, borderRadius:10, background:'rgba(255,255,255,.03)', marginBottom:6, animation:'pulse 1.5s ease-in-out infinite', animationDelay:`${i*0.07}s` }} />
              ))
            : display.length === 0
            ? <p style={{ textAlign:'center', color:'var(--muted)', padding:'40px 0' }}>Aucun membre dans ce rang cette semaine.</p>
            : display.map((m, i) => (
                <div key={m.uid} style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'10px 14px', borderRadius:10, marginBottom:4,
                  background: i === 0 && page === 0 ? `${rank.color}10` : 'rgba(255,255,255,.02)',
                  border: i === 0 && page === 0 ? `1px solid ${rank.color}25` : '1px solid transparent',
                  transition:'background .15s',
                }}
                  onMouseEnter={e=>e.currentTarget.style.background=`${rank.color}08`}
                  onMouseLeave={e=>e.currentTarget.style.background= i===0&&page===0 ? `${rank.color}10` : 'rgba(255,255,255,.02)'}
                >
                  <span style={{ width:28, textAlign:'center', fontSize:12, fontWeight:700, color:'var(--muted)', flexShrink:0 }}>
                    {page * PER_PAGE + i + 1}
                  </span>
                  <div style={{
                    width:36, height:36, borderRadius:'50%', flexShrink:0,
                    background:`${rank.color}18`, border:`1px solid ${rank.color}30`,
                    overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                  }}>
                    {m.avatar_url
                      ? <img src={m.avatar_url} alt="" width={36} height={36} style={{ objectFit:'cover', borderRadius:'50%' }} onError={e=>{e.currentTarget.style.display='none';e.currentTarget.nextSibling.style.display='flex'}} />
                      : null}
                    <span style={{ display:m.avatar_url?'none':'flex' }}>{rank.emoji}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {m.username || `Pirate #${m.uid.slice(-5)}`}
                    </div>
                  </div>
                  <div style={{ fontWeight:700, fontSize:14, color:rank.color, flexShrink:0 }}>{parseFloat(m.vocal_h||0)}h</div>
                  <div style={{ fontWeight:600, fontSize:13, color:'var(--gold)', flexShrink:0, minWidth:60, textAlign:'right' }}>{fmt(parseInt(m.berrys||0))} ฿</div>
                </div>
              ))
          }
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,.06)',
            display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0,
          }}>
            <button onClick={() => setPage(p=>Math.max(0,p-1))} disabled={page===0}
              style={{ padding:'7px 16px', borderRadius:8, border:'1px solid rgba(255,255,255,.1)', background:page===0?'rgba(255,255,255,.03)':`${rank.color}18`, color:page===0?'var(--muted)':'#fff', cursor:page===0?'not-allowed':'pointer', fontSize:13, fontWeight:600 }}>
              ← Préc
            </button>
            <span style={{ fontSize:13, color:'var(--muted)' }}>Page {page+1}/{totalPages}</span>
            <button onClick={() => setPage(p=>Math.min(totalPages-1,p+1))} disabled={page===totalPages-1}
              style={{ padding:'7px 16px', borderRadius:8, border:'1px solid rgba(255,255,255,.1)', background:page===totalPages-1?'rgba(255,255,255,.03)':`${rank.color}18`, color:page===totalPages-1?'var(--muted)':'#fff', cursor:page===totalPages-1?'not-allowed':'pointer', fontSize:13, fontWeight:600 }}>
              Suiv →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
