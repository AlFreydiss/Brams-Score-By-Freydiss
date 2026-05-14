import { useState } from 'react'
import { useInView } from '../hooks/useInView.js'
import RankModal from './RankModal.jsx'

const RANKS = [
  { emoji:'🏴‍☠️', name:'Pirate',          hours:'10h',  color:'#2ECC71', minH:10,  maxH:25,    desc:"Les débuts de l'aventure. Tu es là, c'est déjà quelque chose." },
  { emoji:'⚔️',  name:'Shichibukai',     hours:'25h',  color:'#166024', minH:25,  maxH:40,    desc:'Tu t\'imposes. Le serveur commence à te connaître.' },
  { emoji:'🪖',  name:'Amiral',          hours:'40h',  color:'#F1C40F', minH:40,  maxH:70,    desc:'Présence solide, respect acquis. Les Marines te craignent.' },
  { emoji:'👑',  name:'Yonkou',          hours:'70h',  color:'#9B59B6', minH:70,  maxH:150,   desc:'Élite du serveur. Une des grandes puissances du Brams.' },
  { emoji:'🤴',  name:'Roi des Pirates', hours:'150h', color:'#FFD700', minH:150, maxH:99999, desc:'Le sommet. Celui qui a tout trouvé — le classement et le respect.' },
]

export default function Ranks() {
  const [ref, inView] = useInView()
  const [selectedRank, setSelectedRank] = useState(null)

  return (
    <>
      <section id="rangs" style={{ background:'transparent', position:'relative' }}>
        <div className="orb" style={{ width:500, height:500, bottom:0, left:'50%', transform:'translateX(-50%)', background:'rgba(255,215,0,.04)', pointerEvents:'none' }} />

        <div className="container" ref={ref}>
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <div className={`reveal ${inView?'visible':''}`}>
              <div className="label">Système de progression</div>
              <h2 className="h2" style={{ margin:'0 auto 16px' }}>Grimpe les rangs</h2>
              <p className="sub" style={{ margin:'0 auto' }}>
                Plus tu passes de temps en vocal, plus tu montes. Clique sur un rang pour voir ses membres.
              </p>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:860, margin:'0 auto' }}>
            {RANKS.map((r, i) => (
              <div key={r.name} className={`reveal reveal-${Math.min(i+1,4)} ${inView?'visible':''}`}
                style={{
                  display:'flex', alignItems:'center', gap:28,
                  background:'rgba(17,18,20,0.68)', backdropFilter:'blur(12px)',
                  borderRadius:20, padding:'32px 40px',
                  border:`1px solid ${r.color}30`,
                  transition:'transform .2s, box-shadow .2s, border-color .2s',
                  cursor:'pointer',
                }}
                onClick={() => setSelectedRank(r)}
                onMouseEnter={e=>{ e.currentTarget.style.transform='translateX(12px)'; e.currentTarget.style.boxShadow=`0 10px 40px ${r.color}35`; e.currentTarget.style.borderColor=`${r.color}60` }}
                onMouseLeave={e=>{ e.currentTarget.style.transform='translateX(0)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=`${r.color}30` }}
              >
                <div style={{ width:80, height:80, borderRadius:20, background:`${r.color}18`, border:`1px solid ${r.color}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, flexShrink:0 }}>{r.emoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:9 }}>
                    <span style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:24, color:'#fff' }}>{r.name}</span>
                    <span style={{ background:`${r.color}18`, color:r.color, fontSize:13, fontWeight:700, padding:'4px 14px', borderRadius:100, border:`1px solid ${r.color}40` }}>{r.hours} / semaine</span>
                  </div>
                  <div style={{ fontSize:16, color:'var(--muted)', lineHeight:1.7 }}>{r.desc}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                  <span style={{ fontSize:14, color:r.color, fontWeight:700, opacity:.9 }}>Voir membres</span>
                  <div style={{ width:12, height:12, borderRadius:'50%', background:r.color, boxShadow:`0 0 14px ${r.color}` }} />
                </div>
              </div>
            ))}
          </div>

          <p style={{ textAlign:'center', marginTop:32, fontSize:13, color:'var(--muted)' }}>
            Heures comptées sur les 7 derniers jours · Les rangs sont cumulatifs
          </p>
        </div>
      </section>

      {selectedRank && (
        <RankModal rank={selectedRank} onClose={() => setSelectedRank(null)} />
      )}
    </>
  )
}
