import { useState, useEffect, useRef } from 'react'
import Particles from './Particles.jsx'

const QUOTES = [
  { text: "Je vais devenir le Roi des Pirates !", author: "Monkey D. Luffy" },
  { text: "Un homme qui abandonne quelque chose ne mérite pas de le retrouver.", author: "Roronoa Zoro" },
  { text: "Les rêves ne meurent jamais tant qu'il reste quelqu'un pour les porter.", author: "Monkey D. Luffy" },
  { text: "Je ne regrette rien.", author: "Portgas D. Ace" },
  { text: "Ce n'est pas le monde qui est cruel. C'est toi qui es trop faible.", author: "Donquixote Doflamingo" },
  { text: "Si tu blesses un de mes nakamas, tu devras m'affronter.", author: "Monkey D. Luffy" },
  { text: "La force n'est pas la seule chose qui compte dans ce monde.", author: "Shanks" },
  { text: "Nul ne peut changer le passé. Mais n'importe qui peut changer l'avenir.", author: "Nico Robin" },
  { text: "Même affaibli, un lion reste un lion.", author: "Rayleigh" },
  { text: "Je vis selon mes propres règles. C'est ça la vraie liberté.", author: "Eustass Kid" },
]

const RANK_CARDS = [
  { emoji:'🤴', rang:'Roi des pirates', h:'150h', color:'#FFD700', members:'Elite' },
  { emoji:'👑', rang:'Yonkou',          h:'70h',  color:'#9B59B6', members:'Grande puissance' },
  { emoji:'🪖', rang:'Amiral',          h:'40h',  color:'#F1C40F', members:'Respecté' },
  { emoji:'⚔️', rang:'Shichibukai',     h:'25h',  color:'#2ECC71', members:'Reconnu' },
  { emoji:'🏴‍☠️', rang:'Pirate',         h:'10h',  color:'#3B82F6', members:'En route' },
]

// Simulated live feed from the server
const LIVE_EVENTS = [
  "🔊 CartonOG vient de passer 158h vocales cette semaine",
  "💰 Freydiss a gagné 450 000 Berrys en vocal",
  "🏆 Pirate #07754 est en tête du classement avec 166h",
  "⚔️ Un duel entre deux Shichibukai vient de se terminer",
  "🤴 Nouveau Roi des Pirates couronné cette semaine",
  "💰 La banque de la communauté dépasse 500M Berrys",
  "🎯 Quiz animé — 12 nakamas en compétition en ce moment",
  "🔊 3 membres actifs en vocal en ce moment",
  "🏴‍☠️ 2 000+ nakamas ont rejoint l'aventure",
  "💎 Le coffre de CartonOG atteint 54M Berrys",
]

function useCountUp(target, duration = 1400) {
  const [val, setVal] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    const num = parseInt(target.replace(/\D/g, ''))
    const suffix = target.replace(/[\d]/g, '')
    if (isNaN(num)) { setVal(target); return }
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.floor(ease * num) + suffix)
      if (p < 1) requestAnimationFrame(tick)
      else setVal(target)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return val || target
}

function StatBlock({ value, label }) {
  const v = useCountUp(value)
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ fontFamily:'var(--pirate)', fontSize:30, color:'#fff', lineHeight:1, letterSpacing:'.02em' }}>{v}</div>
      <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginTop:6, textTransform:'uppercase', letterSpacing:'.12em' }}>{label}</div>
    </div>
  )
}

function QuoteRotator() {
  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(true)
  useEffect(() => {
    const id = setInterval(() => {
      setFade(false)
      setTimeout(() => { setIdx(i => (i + 1) % QUOTES.length); setFade(true) }, 500)
    }, 15000)
    return () => clearInterval(id)
  }, [])
  const q = QUOTES[idx]
  return (
    <div style={{ opacity:fade?1:0, transition:'opacity 0.5s ease', borderLeft:'2px solid rgba(224,82,74,.5)', paddingLeft:16, marginBottom:40, maxWidth:480 }}>
      <p style={{ fontSize:14.5, color:'rgba(255,255,255,.7)', lineHeight:1.75, fontStyle:'italic', marginBottom:5 }}>« {q.text} »</p>
      <span style={{ fontSize:11, color:'var(--accent)', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase' }}>— {q.author}</span>
    </div>
  )
}

function LiveTicker() {
  const [pos, setPos] = useState(0)
  const text = LIVE_EVENTS.join('   ·   ')
  useEffect(() => {
    const id = setInterval(() => setPos(p => p - 1), 30)
    return () => clearInterval(id)
  }, [])
  const resetPos = text.length * 8
  const display = pos < -resetPos ? 0 : pos

  return (
    <div style={{
      position:'absolute', bottom:0, left:0, right:0, zIndex:2,
      borderTop:'1px solid rgba(255,255,255,.04)',
      background:'rgba(10,10,12,.5)',
      backdropFilter:'blur(8px)',
      padding:'8px 0',
      overflow:'hidden',
      display:'flex', alignItems:'center',
    }}>
      <div style={{ flexShrink:0, padding:'0 16px', borderRight:'1px solid rgba(255,255,255,.08)', marginRight:16 }}>
        <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--accent)' }}>LIVE</span>
        <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'var(--accent)', marginLeft:6, verticalAlign:'middle', animation:'pulse 1.5s infinite' }} />
      </div>
      <div style={{ overflow:'hidden', flex:1 }}>
        <div style={{ whiteSpace:'nowrap', transform:`translateX(${display}px)`, transition:'none', fontSize:12, color:'rgba(255,255,255,.45)', willChange:'transform' }}>
          {text}   ·   {text}
        </div>
      </div>
    </div>
  )
}

export default function Hero() {
  return (
    <section style={{ minHeight:'100vh', display:'flex', alignItems:'center', position:'relative', overflow:'hidden', paddingTop:80, paddingBottom:60 }}>
      <div className="orb" style={{ width:700, height:700, top:'0%', left:'25%', background:'rgba(224,82,74,.07)' }} />
      <div className="orb" style={{ width:500, height:500, bottom:'-10%', right:'-10%', background:'rgba(155,89,182,.07)', animationDelay:'3s' }} />
      <div className="orb" style={{ width:350, height:350, top:'55%', left:'-8%', background:'rgba(255,215,0,.04)', animationDelay:'6s' }} />
      <div className="dot-bg" style={{ position:'absolute', inset:0, opacity:.4, pointerEvents:'none' }} />
      <Particles />

      {['8%','22%','68%','82%','45%'].map((left,i) => (
        <div key={i} style={{ position:'absolute', left, top:`${15+i*15}%`, fontSize:14+i*4, opacity:0.03+i*0.01, pointerEvents:'none', userSelect:'none', animation:`float ${7+i*2}s ease-in-out ${i}s infinite` }}>🏴‍☠️</div>
      ))}

      <div className="container" style={{ position:'relative', zIndex:1, width:'100%' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', alignItems:'center', gap:56 }}>

          <div>
            {/* Badge */}
            <div className="fade-up" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.09)', borderRadius:100, padding:'6px 16px', marginBottom:36 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#2ECC71', boxShadow:'0 0 8px #2ECC71', animation:'pulse 2s infinite' }} />
              <span style={{ fontSize:12, color:'rgba(255,255,255,.5)', fontWeight:500, letterSpacing:'.06em', textTransform:'uppercase' }}>2 000+ nakamas · Actif maintenant</span>
            </div>

            {/* Title */}
            <h1 className="fade-up-2" style={{ fontFamily:'var(--pirate)', fontSize:'clamp(58px,8.5vw,100px)', fontWeight:400, lineHeight:.95, color:'#fff', marginBottom:32, letterSpacing:'.01em' }}>
              <span style={{ display:'block', background:'linear-gradient(135deg,#fff 40%,rgba(255,255,255,.55))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Brams</span>
              <span style={{ display:'block', background:'linear-gradient(135deg,#e0524a 0%,#ff8a80 50%,#ffb347 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', filter:'drop-shadow(0 0 40px rgba(224,82,74,.3))' }}>Community</span>
            </h1>

            {/* Quote */}
            <div className="fade-up-3"><QuoteRotator /></div>

            {/* CTAs */}
            <div className="fade-up-3" style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:48 }}>
              <a href="https://discord.gg/ez4dBTPE" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ fontSize:15, padding:'13px 26px' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                Rejoindre
              </a>
              <a href="https://www.twitch.tv/bouledog_" target="_blank" rel="noopener noreferrer" className="btn" style={{ background:'rgba(145,71,255,.15)', border:'1px solid rgba(145,71,255,.3)', color:'#9147ff', fontSize:15, padding:'13px 22px' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(145,71,255,.28)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(145,71,255,.15)'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
                Twitch
              </a>
              <a href="https://www.youtube.com/@BouleDogg/featured" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize:15, padding:'13px 20px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="red"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                YouTube
              </a>
            </div>

            {/* Stats */}
            <div className="fade-up-3" style={{ display:'flex', gap:32, flexWrap:'wrap', paddingTop:20, borderTop:'1px solid rgba(255,255,255,.05)' }}>
              <StatBlock value="2 000+" label="Membres" />
              <StatBlock value="24/7" label="Bot actif" />
              <StatBlock value="100+" label="Top classement" />
            </div>
          </div>

          {/* Rank cards — sans animation float */}
          <div className="hide-mobile" style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {RANK_CARDS.map((r, i) => (
              <div key={r.rang}
                style={{
                  position:'relative', overflow:'hidden',
                  background:`linear-gradient(100deg, ${r.color}14 0%, rgba(14,14,16,.85) 55%)`,
                  border:`1px solid ${r.color}28`,
                  borderRadius:14, padding:'14px 20px',
                  display:'flex', alignItems:'center', gap:14,
                  minWidth:360,
                  backdropFilter:'blur(12px)',
                  transition:'transform .2s, box-shadow .2s, border-color .2s',
                  animationDelay:`${i * 0.08}s`,
                }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateX(-4px)';e.currentTarget.style.boxShadow=`0 8px 32px ${r.color}25`;e.currentTarget.style.borderColor=`${r.color}50`}}
                onMouseLeave={e=>{e.currentTarget.style.transform='translateX(0)';e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor=`${r.color}28`}}
              >
                {/* Glow spot */}
                <div style={{ position:'absolute', right:-20, top:-20, width:80, height:80, borderRadius:'50%', background:`${r.color}12`, filter:'blur(18px)', pointerEvents:'none' }} />

                <div style={{ width:46, height:46, borderRadius:12, background:`${r.color}20`, border:`1px solid ${r.color}35`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0, boxShadow:`0 0 16px ${r.color}22` }}>{r.emoji}</div>

                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, color:'#fff', fontSize:17, marginBottom:2 }}>{r.rang}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.60)' }}>{r.members}</div>
                </div>

                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:22, fontWeight:700, color:r.color }}>{r.h}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', marginTop:1 }}>/ sem.</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

    </section>
  )
}
