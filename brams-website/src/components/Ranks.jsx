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

          <div style={{ display:'flex', flexDirection:'column', gap:4, maxWidth:720, margin:'0 auto' }}>
            {RANKS.map((r, i) => (
              <div key={r.name} className={`reveal reveal-${Math.min(i+1,4)} ${inView?'visible':''}`}
                style={{
                  display:'flex', alignItems:'center', gap:20,
                  background:'rgba(17,18,20,0.6)', backdropFilter:'blur(8px)',
                  borderRadius:14, padding:'20px 26px',
                  border:`1px solid ${r.color}25`,
                  transition:'transform .2s, box-shadow .2s, border-color .2s',
                  cursor:'pointer',
                }}
                onClick={() => setSelectedRank(r)}
                onMouseEnter={e=>{ e.currentTarget.style.transform='translateX(8px)'; e.currentTarget.style.boxShadow=`0 6px 28px ${r.color}25`; e.currentTarget.style.borderColor=`${r.color}50` }}
                onMouseLeave={e=>{ e.currentTarget.style.transform='translateX(0)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=`${r.color}25` }}
              >
                <div style={{ width:52, height:52, borderRadius:14, background:`${r.color}14`, border:`1px solid ${r.color}28`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>{r.emoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
                    <span style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:17, color:'#fff' }}>{r.name}</span>
                    <span style={{ background:`${r.color}18`, color:r.color, fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:100, border:`1px solid ${r.color}35` }}>{r.hours} / semaine</span>
                  </div>
                  <div style={{ fontSize:14, color:'var(--muted)', lineHeight:1.6 }}>{r.desc}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                  <span style={{ fontSize:12, color:r.color, fontWeight:600, opacity:.8 }}>Voir membres</span>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:r.color, boxShadow:`0 0 10px ${r.color}` }} />
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
