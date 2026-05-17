import { useState, useEffect } from 'react'
import { useInView } from '../hooks/useInView.js'

const DISCORD = {
  label: 'Rejoindre le Discord',
  href: 'https://discord.gg/v3Ddhtbz',
  color: '#5865f2',
  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>,
}

const SOCIALS = [
  { label:'Twitch',   href:'https://www.twitch.tv/bouledog_',             color:'#9147ff', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg> },
  { label:'YouTube',  href:'https://www.youtube.com/@BouleDogg/featured', color:'#ff0000', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
  { label:'TikTok',   href:'https://www.tiktok.com/@bouledogg',           color:'#ff0050', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg> },
]

function NewMembersCounter() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    fetch('/api/stats/new-members?period=7d')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.count != null) setCount(d.count) })
      .catch(() => {})
  }, [])

  if (count === null) return null

  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:7, marginBottom:28,
      background:'rgba(46,204,113,.08)', border:'1px solid rgba(46,204,113,.22)',
      borderRadius:100, padding:'6px 16px' }}>
      <span style={{ width:7, height:7, borderRadius:'50%', background:'#2ECC71', boxShadow:'0 0 8px #2ECC71', animation:'pulse 2s infinite', flexShrink:0 }} />
      <span style={{ fontSize:13, color:'rgba(255,255,255,.75)', fontWeight:600 }}>
        <span style={{ color:'#2ECC71', fontWeight:800 }}>{count}</span> nakamas ont rejoint cette semaine
      </span>
    </div>
  )
}

export default function JoinCTA() {
  const [ref, inView] = useInView()

  return (
    <section style={{ padding:'80px 0' }} ref={ref}>
      <div className="container">
        <div className={`reveal ${inView?'visible':''}`} style={{
          position:'relative', overflow:'hidden', borderRadius:24, padding:'clamp(40px,6vw,80px)',
          background:'linear-gradient(135deg, rgba(224,82,74,.12) 0%, rgba(155,89,182,.08) 50%, rgba(88,101,242,.1) 100%)',
          border:'1px solid rgba(224,82,74,.18)',
          textAlign:'center',
        }}>
          <div className="orb" style={{ width:300, height:300, top:'-30%', left:'50%', transform:'translateX(-50%)', background:'rgba(224,82,74,.1)' }} />

          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ fontSize:56, marginBottom:20, animation:'float 3s ease-in-out infinite' }}>🏴‍☠️</div>
            <h2 style={{ fontFamily:'var(--display)', fontSize:'clamp(28px,4vw,48px)', fontWeight:800, color:'#fff', marginBottom:16, lineHeight:1.1, letterSpacing:'-.02em' }}>
              Prêt à embarquer ?
            </h2>
            <p style={{ fontSize:17, color:'var(--muted)', marginBottom:32, maxWidth:480, margin:'0 auto 32px', lineHeight:1.75 }}>
              Rejoins Brams Community et commence à grimper les rangs dès aujourd'hui.
            </p>

            <NewMembersCounter />

            {/* Discord — CTA principal */}
            <div style={{ marginBottom:24 }}>
              <a href={DISCORD.href} target="_blank" rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ fontSize:17, padding:'16px 40px', display:'inline-flex', alignItems:'center', gap:10,
                  boxShadow:`0 8px 32px ${DISCORD.color}40` }}
                onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 12px 40px ${DISCORD.color}60` }}
                onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)';    e.currentTarget.style.boxShadow=`0 8px 32px ${DISCORD.color}40` }}
              >
                {DISCORD.icon} {DISCORD.label}
              </a>
            </div>

            {/* Autres réseaux — secondaires */}
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              {SOCIALS.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  className="btn" style={{ background:`${s.color}15`, color:s.color, border:`1px solid ${s.color}30`, padding:'10px 20px', fontSize:13, display:'inline-flex', alignItems:'center', gap:7 }}
                  onMouseEnter={e=>{ e.currentTarget.style.background=`${s.color}28`; e.currentTarget.style.transform='translateY(-2px)' }}
                  onMouseLeave={e=>{ e.currentTarget.style.background=`${s.color}15`; e.currentTarget.style.transform='translateY(0)' }}
                >
                  {s.icon} {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
