const STATS = [
  { value: '2 000+', label: 'Membres' },
  { value: '5',      label: 'Rangs' },
  { value: '24/7',   label: 'Bot actif' },
]

const RANK_CARDS = [
  { emoji: '👑', rang: 'Yonkou',      h: '70h / sem', color: '#9B59B6' },
  { emoji: '🪖', rang: 'Amiral',      h: '40h / sem', color: '#F1C40F' },
  { emoji: '⚔️', rang: 'Shichibukai', h: '25h / sem', color: '#166024' },
]

export default function Hero() {
  return (
    <section style={{ minHeight:'100vh', display:'flex', alignItems:'center', position:'relative', overflow:'hidden', paddingTop:80 }}>
      {/* Orbs */}
      <div className="orb" style={{ width:600, height:600, top:'5%', left:'30%', background:'rgba(224,82,74,.08)' }} />
      <div className="orb" style={{ width:400, height:400, bottom:'0%', right:'-5%', background:'rgba(155,89,182,.07)', animationDelay:'3s' }} />
      <div className="orb" style={{ width:300, height:300, top:'60%', left:'-5%', background:'rgba(255,215,0,.05)', animationDelay:'5s' }} />

      {/* Dot grid */}
      <div className="dot-bg" style={{ position:'absolute', inset:0, opacity:.5, pointerEvents:'none' }} />

      <div className="container" style={{ position:'relative', zIndex:1, width:'100%' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', alignItems:'center', gap:48 }}>

          <div>
            <div className="fade-up" style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'rgba(224,82,74,.1)', border:'1px solid rgba(224,82,74,.2)',
              borderRadius:100, padding:'6px 16px', marginBottom:32,
            }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--accent)', animation:'pulse 2s infinite' }} />
              <span style={{ fontSize:13, color:'var(--accent)', fontWeight:600 }}>Serveur communautaire</span>
            </div>

            <h1 className="fade-up-2" style={{
              fontFamily:'var(--display)', fontSize:'clamp(48px,7vw,80px)',
              fontWeight:800, lineHeight:1.02, color:'#fff',
              marginBottom:24, letterSpacing:'-.03em',
            }}>
              Rejoins le<br />
              <span style={{
                background:'linear-gradient(135deg, #e0524a, #ff8a80)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              }}>Brams Community</span>
            </h1>

            <p className="fade-up-3" style={{ fontSize:17, color:'var(--muted)', marginBottom:40, maxWidth:500, lineHeight:1.8 }}>
              Le serveur Discord animé par le bot <strong style={{ color:'#fff' }}>Brams Score</strong>.
              Grimpe les rangs en vocal, gagne des Berrys et affronte la communauté.
            </p>

            <div className="fade-up-3" style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:60 }}>
              <a href="https://discord.gg/ez4dBTPE" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ fontSize:16, padding:'14px 28px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                Rejoindre le serveur
              </a>
              <a href="https://www.twitch.tv/bouledog_" target="_blank" rel="noopener noreferrer" className="btn" style={{ background:'var(--twitch)', color:'#fff', fontSize:16, padding:'14px 24px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
                Twitch
              </a>
              <a href="https://www.youtube.com/@BouleDogg/featured" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize:16, padding:'14px 24px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="red"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                YouTube
              </a>
            </div>

            <div className="fade-up-3" style={{ display:'flex', gap:48, flexWrap:'wrap' }}>
              {STATS.map(s => (
                <div key={s.label}>
                  <div style={{ fontFamily:'var(--display)', fontSize:36, fontWeight:800, color:'#fff', lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Rank cards */}
          <div className="hide-mobile" style={{ display:'flex', flexDirection:'column', gap:10, animation:'float 5s ease-in-out infinite' }}>
            {RANK_CARDS.map(r => (
              <div key={r.rang} style={{
                background:'var(--card)', border:`1px solid ${r.color}30`,
                borderRadius:14, padding:'14px 20px',
                display:'flex', alignItems:'center', gap:14,
                boxShadow:`0 8px 32px ${r.color}18`,
                minWidth:220,
              }}>
                <div style={{ width:40, height:40, borderRadius:10, background:`${r.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{r.emoji}</div>
                <div>
                  <div style={{ fontWeight:700, color:'#fff', fontSize:14 }}>{r.rang}</div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>{r.h}</div>
                </div>
                <div style={{ marginLeft:'auto', width:8, height:8, borderRadius:'50%', background:r.color, boxShadow:`0 0 10px ${r.color}` }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:120, background:'linear-gradient(transparent, var(--bg))', pointerEvents:'none' }} />
    </section>
  )
}
