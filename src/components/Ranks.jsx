import { useState } from 'react'
import { useInView } from '../hooks/useInView.js'
import RankModal from './RankModal.jsx'

const RANKS = [
  { emoji:'🏴‍☠️', name:'Moussaillon', hours:'0h',  color:'#7c7f8a', minH:0,   maxH:10,    desc:"Bienvenue à bord ! Tu viens de monter sur le navire. L'aventure commence.", tier:0 },
  { emoji:'🏴‍☠️', name:'Pirate',      hours:'10h', color:'#2ECC71', minH:10,  maxH:25,    desc:"Les débuts de l'aventure. Tu es là, c'est déjà quelque chose.", tier:1 },
  { emoji:'⚔️',  name:'Shichibukai', hours:'25h', color:'#166024', minH:25,  maxH:40,    desc:"Tu t'imposes. Le serveur commence à te connaître.", tier:2 },
  { emoji:'🪖',  name:'Amiral',      hours:'40h', color:'#F1C40F', minH:40,  maxH:70,    desc:"Présence solide, respect acquis. Les Marines te craignent.", tier:3 },
  { emoji:'👑',  name:'Yonkou',      hours:'70h', color:'#9B59B6', minH:70,  maxH:150,   desc:"Élite du serveur. Une des grandes puissances du Brams.", tier:4 },
  { emoji:'🤴',  name:'Roi des Pirates', hours:'150h', color:'#FFD700', minH:150, maxH:99999, desc:"Le sommet. Celui qui a tout trouvé — le classement et le respect.", tier:5 },
]

const PARCHMENT_COLORS = {
  bg: '#f4e4bc',
  bgCard: '#fdf3d8',
  text: '#3d2b1f',
  muted: '#7a5c3a',
  border: '#c9a96e',
  section: 'rgba(180,120,40,0.06)',
}

export default function Ranks() {
  const [ref, inView] = useInView()
  const [selectedRank, setSelectedRank] = useState(null)
  const [parchment, setParchment] = useState(false)

  const p = parchment ? PARCHMENT_COLORS : null

  return (
    <>
      <section id="rangs" style={{
        background: parchment
          ? `linear-gradient(180deg, ${PARCHMENT_COLORS.bg} 0%, #f0d9a0 50%, ${PARCHMENT_COLORS.bg} 100%)`
          : 'transparent',
        position: 'relative',
        transition: 'background 0.5s ease',
      }}>
        {!parchment && (
          <>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:220, background:'linear-gradient(180deg, rgba(3,7,14,0.85) 0%, rgba(3,7,14,0.48) 45%, transparent 100%)', pointerEvents:'none', zIndex:0 }} />
            <div className="orb" style={{ width:500, height:500, bottom:0, left:'50%', transform:'translateX(-50%)', background:'rgba(255,215,0,.04)', pointerEvents:'none' }} />
          </>
        )}
        {parchment && (
          <>
            <div style={{ position:'absolute', inset:0, backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`, opacity:0.6, pointerEvents:'none' }} />
            <div style={{ position:'absolute', top:0, left:0, right:0, height:8, background:'linear-gradient(90deg, #8B5A2B, #C9A96E, #8B5A2B)', opacity:0.5 }} />
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:8, background:'linear-gradient(90deg, #8B5A2B, #C9A96E, #8B5A2B)', opacity:0.5 }} />
          </>
        )}

        <div className="container" ref={ref} style={{ position:'relative', zIndex:1 }}>
          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <div className={`reveal ${inView?'visible':''}`}>
              <div className="label" style={{ color: parchment ? '#8B5A2B' : undefined }}>Système de progression</div>
              <h2 className="h2" style={{ margin:'0 auto 16px', color: parchment ? '#3d2b1f' : undefined }}>Grimpe les rangs</h2>
              <p className="sub" style={{ margin:'0 auto', color: parchment ? '#7a5c3a' : undefined }}>
                Plus tu passes de temps en vocal sur les 7 derniers jours, plus tu montes. Clique sur un rang pour voir ses membres.
              </p>

              {/* Toggle Parchemin */}
              <button
                onClick={() => setParchment(v => !v)}
                style={{
                  marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: parchment ? '#C9A96E' : 'rgba(255,215,0,.1)',
                  border: `1px solid ${parchment ? '#8B5A2B' : 'rgba(255,215,0,.35)'}`,
                  borderRadius: 100, padding: '8px 20px', fontSize: 13, fontWeight: 700,
                  color: parchment ? '#3d2b1f' : '#FFD700', cursor: 'pointer',
                  transition: 'all .25s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                📜 {parchment ? 'Mode Normal' : 'Mode Parchemin Ancien'}
              </button>
            </div>
          </div>

          {/* Rank list */}
          <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:860, margin:'0 auto' }}>
            {RANKS.map((r, i) => (
              <div key={r.name} className={`reveal reveal-${Math.min(i+1,4)} ${inView?'visible':''}`}
                style={{
                  display:'flex', alignItems:'center', gap:28,
                  background: parchment
                    ? `linear-gradient(135deg, ${PARCHMENT_COLORS.bgCard}, #f8eccc)`
                    : `linear-gradient(135deg, ${r.color}10, rgba(17,18,20,0.85))`,
                  backdropFilter: parchment ? 'none' : 'blur(12px)',
                  borderRadius: parchment ? 6 : 20,
                  padding:'28px 36px',
                  border: parchment
                    ? `1px solid ${PARCHMENT_COLORS.border}`
                    : `1px solid ${r.color}30`,
                  boxShadow: parchment ? '2px 4px 12px rgba(120,80,20,0.15)' : 'none',
                  transition:'transform .2s, box-shadow .2s, border-color .2s',
                  cursor:'pointer',
                  position: 'relative', overflow:'hidden',
                }}
                onClick={() => setSelectedRank(r)}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateX(10px)'
                  e.currentTarget.style.boxShadow = parchment
                    ? '4px 8px 24px rgba(120,80,20,0.25)'
                    : `0 10px 40px ${r.color}35`
                  if (!parchment) e.currentTarget.style.borderColor = `${r.color}60`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateX(0)'
                  e.currentTarget.style.boxShadow = parchment ? '2px 4px 12px rgba(120,80,20,0.15)' : 'none'
                  if (!parchment) e.currentTarget.style.borderColor = `${r.color}30`
                }}
              >
                {/* Tier number */}
                {parchment && (
                  <div style={{ position:'absolute', top:10, right:14, fontSize:10, fontWeight:800, color:'#C9A96E', letterSpacing:'.1em', opacity:.6 }}>
                    TIER {r.tier}
                  </div>
                )}

                {/* Icon */}
                <div style={{
                  width:72, height:72, borderRadius: parchment ? 4 : 18, flexShrink:0,
                  background: parchment ? `${r.color}20` : `${r.color}18`,
                  border: parchment ? `2px solid ${r.color}50` : `1px solid ${r.color}40`,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:36,
                  boxShadow: parchment ? 'none' : `0 4px 16px ${r.color}20`,
                }}>
                  {r.emoji}
                </div>

                {/* Info */}
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8, flexWrap:'wrap' }}>
                    <span style={{
                      fontFamily: parchment ? 'Georgia, serif' : 'var(--display)',
                      fontWeight:800, fontSize:22,
                      color: parchment ? PARCHMENT_COLORS.text : '#fff',
                      fontStyle: parchment ? 'italic' : 'normal',
                    }}>{r.name}</span>
                    <span style={{
                      background: parchment ? `${r.color}20` : `${r.color}18`,
                      color: r.color, fontSize:12, fontWeight:700, padding:'3px 12px',
                      borderRadius: parchment ? 3 : 100,
                      border: `1px solid ${r.color}${parchment ? '60' : '40'}`,
                    }}>{r.hours} / semaine</span>
                  </div>
                  <div style={{ fontSize:14, color: parchment ? PARCHMENT_COLORS.muted : 'var(--muted)', lineHeight:1.65 }}>
                    {parchment ? `⚓ ${r.desc}` : r.desc}
                  </div>

                  {/* Progress indicator */}
                  {parchment && (
                    <div style={{ marginTop:10 }}>
                      <div style={{ height:3, background:'rgba(180,120,40,0.15)', borderRadius:2, overflow:'hidden' }}>
                        <div style={{
                          height:'100%', borderRadius:2,
                          width: `${Math.min(100, (r.tier / 5) * 100)}%`,
                          background: `linear-gradient(90deg, ${r.color}, ${r.color}80)`,
                          transition: 'width 1s ease',
                        }} />
                      </div>
                      <div style={{ fontSize:10, color:'#C9A96E', marginTop:4, fontStyle:'italic' }}>
                        Palier {r.tier} sur 5
                      </div>
                    </div>
                  )}
                </div>

                {/* Chevron */}
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <span style={{ fontSize:13, color: parchment ? '#C9A96E' : r.color, fontWeight:700 }}>
                    {parchment ? 'Consulter' : 'Voir membres'}
                  </span>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:r.color, boxShadow: parchment ? 'none' : `0 0 12px ${r.color}` }} />
                </div>
              </div>
            ))}
          </div>

          <p style={{ textAlign:'center', marginTop:32, fontSize:13, color: parchment ? PARCHMENT_COLORS.muted : 'var(--muted)' }}>
            {parchment
              ? '📜 Les heures d\'audience vocale sont comptées sur les 7 derniers jours. Les rangs s\'appliquent par paliers.'
              : 'Heures comptées sur les 7 derniers jours · Les rangs sont cumulatifs'
            }
          </p>
        </div>
      </section>

      {selectedRank && (
        <RankModal rank={selectedRank} onClose={() => setSelectedRank(null)} />
      )}
    </>
  )
}
