import { useState, useEffect } from 'react'
import { useInView } from '../hooks/useInView.js'
import { fetchLeaderboard } from '../lib/supabase.js'

const MEDALS = { 1:'🥇', 2:'🥈', 3:'🥉' }
const RANK_MAP = [
  { min:150, rang:'Roi des pirates', emoji:'🤴', color:'#FFD700' },
  { min:70,  rang:'Yonkou',          emoji:'👑', color:'#9B59B6' },
  { min:40,  rang:'Amiral',          emoji:'🪖', color:'#F1C40F' },
  { min:25,  rang:'Shichibukai',     emoji:'⚔️', color:'#166024' },
  { min:10,  rang:'Pirate',          emoji:'🏴‍☠️', color:'#2ECC71' },
  { min:0,   rang:'Moussaillon',     emoji:'⚓', color:'#7c7f8a' },
]

function getRank(h) { return RANK_MAP.find(r => h >= r.min) ?? RANK_MAP[RANK_MAP.length-1] }

function fmt(n) { return n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}k` : String(n) }

const MOCK = [
  { pos:1, uid:'123456789012345', username:'Freydiss',    vocal_h:187, berrys:4200000 },
  { pos:2, uid:'234567890123456', username:'ZoroLover',   vocal_h:98,  berrys:1850000 },
  { pos:3, uid:'345678901234567', username:'Nakama99',    vocal_h:76,  berrys:1230000 },
  { pos:4, uid:'456789012345678', username:'LuffyFan',    vocal_h:54,  berrys:780000  },
  { pos:5, uid:'567890123456789', username:'SankuPrime',  vocal_h:47,  berrys:620000  },
  { pos:6, uid:'678901234567890', username:'TobiRoronoa', vocal_h:31,  berrys:340000  },
  { pos:7, uid:'789012345678901', username:'AcePower',    vocal_h:27,  berrys:210000  },
  { pos:8, uid:'890123456789012', username:'Nami_Berry',  vocal_h:14,  berrys:95000   },
]

export default function Leaderboard() {
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ref, inView] = useInView()

  useEffect(() => {
    fetchLeaderboard(10).then(data => {
      setRows(data)
      setLoading(false)
    })
  }, [])

  const display = rows
    ? rows.map((r,i) => ({ ...r, pos: i+1, vocal_h: parseFloat(r.vocal_h||0), berrys: parseInt(r.berrys||0) }))
    : MOCK

  return (
    <section id="classement" style={{ background:'var(--surface)', position:'relative' }}>
      <div className="orb" style={{ width:400, height:400, top:'10%', left:'-5%', background:'rgba(155,89,182,.06)', pointerEvents:'none' }} />

      <div className="container" ref={ref}>
        <div style={{ textAlign:'center', marginBottom:64 }}>
          <div className={`reveal ${inView?'visible':''}`}>
            <div className="label">Top membres</div>
            <h2 className="h2" style={{ margin:'0 auto 16px' }}>Classement vocal</h2>
            <p className="sub" style={{ margin:'0 auto' }}>
              Les membres les plus actifs en vocal cette semaine. Mis à jour en direct via Brams Score.
            </p>
          </div>
        </div>

        <div style={{ maxWidth:780, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'52px 1fr 110px 130px', padding:'0 20px 10px', fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--muted)' }}>
            <span>#</span><span>Membre</span><span style={{ textAlign:'right' }}>Heures</span><span style={{ textAlign:'right' }}>Berrys</span>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {display.map((m, i) => {
              const rk = getRank(m.vocal_h)
              return (
                <div key={m.uid} className={`reveal reveal-${Math.min(i+1,4)} ${inView?'visible':''}`}
                  style={{
                    display:'grid', gridTemplateColumns:'52px 1fr 110px 130px',
                    alignItems:'center', borderRadius:12, padding:'14px 20px',
                    background: m.pos<=3 ? `${rk.color}08` : 'var(--card)',
                    border: m.pos<=3 ? `1px solid ${rk.color}25` : '1px solid var(--border)',
                    transition:'transform .15s',
                  }}
                  onMouseEnter={e=>e.currentTarget.style.transform='translateX(4px)'}
                  onMouseLeave={e=>e.currentTarget.style.transform='translateX(0)'}
                >
                  <span style={{ fontSize:m.pos<=3?22:14, fontWeight:700, color:m.pos<=3?rk.color:'var(--muted)' }}>
                    {MEDALS[m.pos] ?? m.pos}
                  </span>

                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{
                      width:36, height:36, borderRadius:'50%', flexShrink:0,
                      background:`${rk.color}18`, border:`1px solid ${rk.color}30`,
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                    }}>{rk.emoji}</div>
                    <div>
                      <div style={{ fontWeight:600, fontSize:14, color:'#fff' }}>{m.username || `Pirate #${m.uid.slice(-5)}`}</div>
                      <div style={{ fontSize:11, color:rk.color }}>{rk.rang}</div>
                    </div>
                  </div>

                  <div style={{ textAlign:'right', fontWeight:700, fontSize:15, color:'#fff' }}>{m.vocal_h}h</div>
                  <div style={{ textAlign:'right', fontWeight:600, fontSize:14, color:'var(--gold)' }}>{fmt(m.berrys)} ฿</div>
                </div>
              )
            })}
          </div>

          {!rows && !loading && (
            <p style={{ textAlign:'center', marginTop:16, fontSize:12, color:'var(--muted)', opacity:.6 }}>
              * Données d'exemple — connecte Supabase pour le classement en direct
            </p>
          )}

          <p style={{ textAlign:'center', marginTop:24, fontSize:12, color:'var(--muted)' }}>
            Mis à jour toutes les heures · Rejoins le serveur et parle en vocal pour apparaître ici
          </p>
        </div>
      </div>
    </section>
  )
}
