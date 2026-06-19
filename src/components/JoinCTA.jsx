import { useState, useEffect } from 'react'
import {
  CINE, GOLD_GRAD, CineStyles, Reveal, GoldButton, CineRule,
} from './home/cine.jsx'
import { track } from '../lib/analytics.js'

const DISCORD = {
  label: 'Rejoindre le Discord',
  href: 'https://discord.gg/4FgezPpnGU',
  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>,
}

const SOCIALS = [
  { label:'Twitch',   href:'https://www.twitch.tv/bouledog_',             icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg> },
  { label:'YouTube',  href:'https://www.youtube.com/@BouleDogg/featured', icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
  { label:'TikTok',   href:'https://www.tiktok.com/@bouledogg',           icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg> },
]

function NewMembersCounter() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    let stop = false
    const load = () => {
      fetch(`/api/stats/new-members?period=7d&_=${Date.now()}`, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (!stop && d?.count != null) setCount(d.count) })
        .catch(() => {})
    }
    load()
    const id = setInterval(load, 30000)
    const onFocus = () => { if (!document.hidden) load() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      stop = true
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  if (count === null) return null

  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:9,
      background:'rgba(46,204,113,0.07)', border:`1px solid rgba(46,204,113,0.20)`,
      borderRadius:100, padding:'7px 18px' }}>
      <span style={{ width:7, height:7, borderRadius:'50%', background:CINE.live,
        boxShadow:`0 0 8px ${CINE.live}`, animation:'cinePulse 2s ease-in-out infinite', flexShrink:0 }} />
      <span style={{ fontFamily:CINE.body, fontSize:13, color:CINE.inkSoft, fontWeight:500 }}>
        <span style={{ color:CINE.live, fontWeight:800 }}>{count}</span> nakamas ont rejoint cette semaine
      </span>
    </div>
  )
}

export default function JoinCTA() {
  return (
    <section style={{ position:'relative', width:'100%', padding:'clamp(64px,9vh,120px) clamp(16px,4vw,48px)' }}>
      <CineStyles />

      {/* Bande pleine largeur encadrée — finale cinématique */}
      <Reveal style={{
        position:'relative', width:'100%', maxWidth:CINE.maxW, margin:'0 auto',
        borderRadius:26, overflow:'hidden',
        padding:'clamp(48px,7vw,96px) clamp(24px,6vw,72px)',
        background:`
          radial-gradient(120% 140% at 50% -20%, rgba(191,164,106,0.10), transparent 60%),
          linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))`,
        border:`1px solid ${CINE.hairTop}`,
        boxShadow:'0 40px 120px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
        textAlign:'center',
      }}>
        {/* Cadre or fin en surimpression */}
        <div aria-hidden style={{
          position:'absolute', inset:14, borderRadius:18,
          border:`1px solid ${CINE.goldDim}`, opacity:0.35, pointerEvents:'none',
        }} />
        {/* Liseré or supérieur (ligne d'horizon) */}
        <div aria-hidden style={{
          position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
          width:'min(620px, 70%)', height:2,
          background:`linear-gradient(90deg, transparent, ${CINE.gold}, transparent)`,
          opacity:0.7, pointerEvents:'none',
        }} />

        <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
          <Reveal as="span" delay={40} style={{
            display:'inline-block', fontFamily:CINE.title, fontSize:12, fontWeight:700,
            letterSpacing:'0.26em', textTransform:'uppercase', color:CINE.gold, marginBottom:22,
          }}>
            Le dernier appel
          </Reveal>

          <CineRule style={{ maxWidth:120, marginBottom:28 }} />

          <Reveal as="h2" delay={80} style={{
            margin:0, fontFamily:CINE.title, fontWeight:700, color:CINE.ink,
            fontSize:'clamp(38px,6.4vw,86px)', lineHeight:0.98, letterSpacing:'-0.03em',
          }}>
            Rejoins{' '}
            <span style={{
              background:GOLD_GRAD, WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent',
            }}>l'équipage</span>
          </Reveal>

          <Reveal as="p" delay={140} style={{
            margin:'24px auto 0', maxWidth:560,
            fontFamily:CINE.body, fontSize:'clamp(15px,1.7vw,19px)', lineHeight:1.65, color:CINE.inkSoft,
          }}>
            L'aventure t'attend. Embarque avec Brams Community, grimpe les rangs et écris ta légende dès aujourd'hui.
          </Reveal>

          <Reveal delay={200} style={{ marginTop:34 }}>
            <NewMembersCounter />
          </Reveal>

          <Reveal delay={260} style={{ marginTop:34 }}>
            <GoldButton
              href={DISCORD.href} target="_blank" rel="noopener noreferrer"
              onClick={() => track('embarquer_click')}
              style={{ padding:'17px 44px', fontSize:17, borderRadius:14 }}
            >
              {DISCORD.icon} {DISCORD.label}
            </GoldButton>
          </Reveal>

          {/* Réseaux secondaires — sobres, filet or */}
          <Reveal delay={320} style={{
            marginTop:40, paddingTop:30, borderTop:`1px solid ${CINE.hair}`,
            width:'min(520px, 100%)',
          }}>
            <div style={{ fontFamily:CINE.title, fontSize:11, fontWeight:700, letterSpacing:'0.22em',
              textTransform:'uppercase', color:CINE.faint, marginBottom:16 }}>
              Suivre l'équipage ailleurs
            </div>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              {SOCIALS.map(s => (
                <SocialLink key={s.label} {...s} />
              ))}
            </div>
          </Reveal>
        </div>
      </Reveal>
    </section>
  )
}

function SocialLink({ label, href, icon }) {
  const [h, setH] = useState(false)
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display:'inline-flex', alignItems:'center', gap:8, textDecoration:'none',
        fontFamily:CINE.title, fontWeight:600, fontSize:13,
        padding:'11px 20px', minHeight:24, borderRadius:11,
        color: h ? CINE.ink : CINE.inkSoft,
        background: h ? CINE.panel2 : CINE.panel,
        border:`1px solid ${h ? CINE.gold : CINE.hairTop}`,
        transform: h ? 'translateY(-2px)' : 'none',
        transition:'transform .25s, border-color .25s, background .25s, color .25s',
      }}>
      <span style={{ color: h ? CINE.gold : CINE.faint, display:'inline-flex', transition:'color .25s' }}>{icon}</span>
      {label}
    </a>
  )
}
