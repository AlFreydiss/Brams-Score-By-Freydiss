const LINKS = [
  { label:'Discord',  href:'https://discord.gg/ez4dBTPE' },
  { label:'Twitch',   href:'https://www.twitch.tv/bouledog_' },
  { label:'YouTube',  href:'https://www.youtube.com/@BouleDogg/featured' },
  { label:'TikTok',   href:'https://www.tiktok.com/@bouledogg' },
]

export default function Footer() {
  return (
    <footer style={{
      borderTop:'1px solid rgba(255,255,255,.06)',
      padding:'28px 28px',
      background:'rgba(14,14,16,.6)',
      backdropFilter:'blur(10px)',
    }}>
      <div style={{ maxWidth:1120, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:17 }}>🏴‍☠️</span>
          <span style={{ fontFamily:'var(--pirate)', color:'#fff', fontSize:17, letterSpacing:'.02em' }}>Brams Community</span>
        </div>

        <div style={{ display:'flex', gap:2 }}>
          {LINKS.map(l => (
            <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
              style={{ padding:'5px 11px', borderRadius:7, fontSize:12, color:'rgba(255,255,255,.35)', transition:'color .15s' }}
              onMouseEnter={e=>e.target.style.color='rgba(255,255,255,.8)'}
              onMouseLeave={e=>e.target.style.color='rgba(255,255,255,.35)'}
            >{l.label}</a>
          ))}
        </div>

        <span style={{ fontSize:11, color:'rgba(255,255,255,.2)', letterSpacing:'.04em' }}>
          Made by <strong style={{ color:'rgba(255,255,255,.4)' }}>Freydiss</strong> · © {new Date().getFullYear()}
        </span>
      </div>
    </footer>
  )
}
