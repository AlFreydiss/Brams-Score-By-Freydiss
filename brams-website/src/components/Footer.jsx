const LINKS = [
  { label:'Discord',  href:'https://discord.gg/ez4dBTPE' },
  { label:'Twitch',   href:'https://www.twitch.tv/bouledog_' },
  { label:'YouTube',  href:'https://www.youtube.com/@BouleDogg/featured' },
  { label:'TikTok',   href:'https://www.tiktok.com/@bouledogg' },
]

export default function Footer() {
  return (
    <footer style={{ borderTop:'1px solid var(--border)', padding:'36px 28px' }}>
      <div style={{ maxWidth:1120, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:20 }}>🏴‍☠️</span>
          <span style={{ fontFamily:'var(--display)', fontWeight:800, color:'#fff', fontSize:16 }}>Brams Community</span>
        </div>

        <div style={{ display:'flex', gap:4 }}>
          {LINKS.map(l => (
            <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
              style={{ padding:'6px 12px', borderRadius:8, fontSize:13, color:'var(--muted)', transition:'color .15s' }}
              onMouseEnter={e=>e.target.style.color='#fff'}
              onMouseLeave={e=>e.target.style.color='var(--muted)'}
            >{l.label}</a>
          ))}
        </div>

        <span style={{ fontSize:12, color:'var(--muted)' }}>
          Made by <strong style={{ color:'#fff' }}>Freydiss</strong> · Bot Brams Score · © 2025
        </span>
      </div>
    </footer>
  )
}
