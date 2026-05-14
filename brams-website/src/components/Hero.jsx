import { useState, useEffect, useRef } from 'react'

const QUOTES = [
  { text: "Je vais devenir le Roi des Pirates !", author: "Monkey D. Luffy" },
  { text: "Un homme qui abandonne quelque chose, ne mérite pas de le retrouver.", author: "Roronoa Zoro" },
  { text: "Les rêves ne meurent jamais tant qu'il reste quelqu'un pour les porter.", author: "Monkey D. Luffy" },
  { text: "Je ne regrette rien.", author: "Portgas D. Ace" },
  { text: "Ce n'est pas le monde qui est cruel. C'est toi qui es trop faible.", author: "Donquixote Doflamingo" },
  { text: "Si tu blesses un de mes nakamas, tu devras m'affronter.", author: "Monkey D. Luffy" },
  { text: "Je préfère une vie courte et pleine de sens à une longue vie sans but.", author: "Portgas D. Ace" },
  { text: "La force n'est pas la seule chose qui compte dans ce monde.", author: "Shanks" },
  { text: "Un homme qui ne peut pas protéger ses nakamas ne vaut rien.", author: "Roronoa Zoro" },
  { text: "Les larmes coulent uniquement quand on arrête de se battre.", author: "Monkey D. Luffy" },
  { text: "Je ne veux pas conquérir le monde. Je veux juste que mes amis vivent libres.", author: "Monkey D. Luffy" },
  { text: "La vraie force naît de la volonté de protéger ceux qu'on aime.", author: "Jinbe" },
  { text: "Nul ne peut changer le passé. Mais n'importe qui peut changer l'avenir.", author: "Nico Robin" },
  { text: "Même affaibli, un lion reste un lion.", author: "Rayleigh" },
  { text: "Je vis selon mes propres règles. C'est ça la vraie liberté.", author: "Eustass Kid" },
]

const RANK_CARDS = [
  { emoji:'🤴', rang:'Roi des pirates', h:'150h / sem', color:'#FFD700' },
  { emoji:'👑', rang:'Yonkou',          h:'70h / sem',  color:'#9B59B6' },
  { emoji:'🪖', rang:'Amiral',          h:'40h / sem',  color:'#F1C40F' },
  { emoji:'⚔️', rang:'Shichibukai',     h:'25h / sem',  color:'#2ECC71' },
  { emoji:'🏴‍☠️', rang:'Pirate',         h:'10h / sem',  color:'#3B82F6' },
]

function useCountUp(target, duration = 1400) {
  const [val, setVal] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    const start = performance.now()
    const num = parseInt(target.replace(/\D/g, ''))
    const suffix = target.replace(/[\d]/g, '')
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.floor(ease * num) + suffix)
      if (p < 1) requestAnimationFrame(tick)
      else setVal(target)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return val
}

function StatBlock({ value, label }) {
  const v = useCountUp(value)
  return (
    <div>
      <div style={{ fontFamily:'var(--display)', fontSize:34, fontWeight:800, color:'#fff', lineHeight:1 }}>{v || value}</div>
      <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginTop:5, textTransform:'uppercase', letterSpacing:'.1em' }}>{label}</div>
    </div>
  )
}

function QuoteRotator() {
  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % QUOTES.length)
        setFade(true)
      }, 500)
    }, 15000)
    return () => clearInterval(id)
  }, [])

  const q = QUOTES[idx]
  return (
    <div style={{
      opacity: fade ? 1 : 0,
      transition: 'opacity 0.5s ease',
      borderLeft: '2px solid rgba(224,82,74,.5)',
      paddingLeft: 16,
      marginBottom: 40,
      maxWidth: 500,
    }}>
      <p style={{ fontSize: 15, color: 'rgba(255,255,255,.75)', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 6 }}>
        « {q.text} »
      </p>
      <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' }}>
        — {q.author}
      </span>
    </div>
  )
}

export default function Hero() {
  return (
    <section style={{ minHeight:'100vh', display:'flex', alignItems:'center', position:'relative', overflow:'hidden', paddingTop:80 }}>
      <div className="orb" style={{ width:700, height:700, top:'0%', left:'25%', background:'rgba(224,82,74,.07)' }} />
      <div className="orb" style={{ width:500, height:500, bottom:'-10%', right:'-10%', background:'rgba(155,89,182,.07)', animationDelay:'3s' }} />
      <div className="orb" style={{ width:350, height:350, top:'55%', left:'-8%', background:'rgba(255,215,0,.04)', animationDelay:'6s' }} />

      <div className="dot-bg" style={{ position:'absolute', inset:0, opacity:.4, pointerEvents:'none' }} />

      {/* Floating skulls */}
      {['8%','22%','68%','82%','45%'].map((left,i) => (
        <div key={i} style={{
          position:'absolute', left, top:`${15+i*15}%`,
          fontSize: 14+i*4, opacity: 0.04+i*0.015,
          animation:`float ${5+i*1.5}s ease-in-out ${i*0.8}s infinite`,
          pointerEvents:'none', userSelect:'none',
        }}>🏴‍☠️</div>
      ))}

      <div className="container" style={{ position:'relative', zIndex:1, width:'100%' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', alignItems:'center', gap:48 }}>

          <div>
            {/* Live badge */}
            <div className="fade-up" style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)',
              borderRadius:100, padding:'6px 16px', marginBottom:36,
            }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#2ECC71', boxShadow:'0 0 8px #2ECC71', animation:'pulse 2s infinite' }} />
              <span style={{ fontSize:12, color:'rgba(255,255,255,.6)', fontWeight:500, letterSpacing:'.06em', textTransform:'uppercase' }}>2 000+ nakamas · Actif maintenant</span>
            </div>

            {/* Title */}
            <h1 className="fade-up-2" style={{
              fontFamily:'var(--pirate)', fontSize:'clamp(58px,8.5vw,100px)',
              fontWeight:400, lineHeight:.95, color:'#fff',
              marginBottom:32, letterSpacing:'.01em',
            }}>
              <span style={{ display:'block', background:'linear-gradient(135deg,#fff 40%,rgba(255,255,255,.55))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Brams</span>
              <span style={{
                display:'block',
                background:'linear-gradient(135deg, #e0524a 0%, #ff8a80 50%, #ffb347 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                filter:'drop-shadow(0 0 40px rgba(224,82,74,.3))',
              }}>Community</span>
            </h1>

            {/* Rotating quote */}
            <div className="fade-up-3">
              <QuoteRotator />
            </div>

            {/* CTA buttons */}
            <div className="fade-up-3" style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:56 }}>
              <a href="https://discord.gg/ez4dBTPE" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ fontSize:15, padding:'13px 26px' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                Rejoindre
              </a>
              <a href="https://www.twitch.tv/bouledog_" target="_blank" rel="noopener noreferrer" className="btn" style={{ background:'rgba(145,71,255,.2)', border:'1px solid rgba(145,71,255,.35)', color:'#9147ff', fontSize:15, padding:'13px 22px' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(145,71,255,.35)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(145,71,255,.2)'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
                Twitch
              </a>
              <a href="https://www.youtube.com/@BouleDogg/featured" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize:15, padding:'13px 22px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="red"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                YouTube
              </a>
            </div>

            {/* Stats */}
            <div className="fade-up-3" style={{ display:'flex', gap:40, flexWrap:'wrap', paddingTop:20, borderTop:'1px solid rgba(255,255,255,.06)' }}>
              <StatBlock value="2 000+" label="Membres" />
              <StatBlock value="5" label="Rangs" />
              <StatBlock value="24/7" label="Bot actif" />
              <StatBlock value="15" label="Citations" />
            </div>
          </div>

          {/* Rank cards */}
          <div className="hide-mobile" style={{ display:'flex', flexDirection:'column', gap:8, animation:'float 5s ease-in-out infinite' }}>
            {RANK_CARDS.map((r,i) => (
              <div key={r.rang} style={{
                background:`linear-gradient(90deg, ${r.color}10, rgba(17,18,20,.8))`,
                border:`1px solid ${r.color}30`,
                borderRadius:14, padding:'13px 18px',
                display:'flex', alignItems:'center', gap:12,
                boxShadow:`0 4px 24px ${r.color}12`,
                minWidth:210,
                animationDelay:`${i*0.1}s`,
                backdropFilter:'blur(10px)',
              }}>
                <div style={{ width:38, height:38, borderRadius:10, background:`${r.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{r.emoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, color:'#fff', fontSize:13 }}>{r.rang}</div>
                  <div style={{ fontSize:11, color:r.color, marginTop:2 }}>{r.h}</div>
                </div>
                <div style={{ width:7, height:7, borderRadius:'50%', background:r.color, boxShadow:`0 0 8px ${r.color}`, flexShrink:0 }} />
              </div>
            ))}
          </div>

        </div>
      </div>

      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:140, background:'linear-gradient(transparent, var(--bg))', pointerEvents:'none' }} />
    </section>
  )
}
