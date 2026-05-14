import { useState, useEffect } from 'react'
import AboutModal from './AboutModal.jsx'

const NAV_LINKS = [
  { label: 'Rangs', href: '#rangs' },
  { label: 'Fruits', href: '#fruits' },
  { label: 'Quiz', href: '#quiz' },
  { label: 'Classement', href: '#classement' },
  { label: 'Contact', href: '#contact' },
  { label: '❤️ Soutenir', href: '#soutenir' },
]

function openScans(e) {
  e.preventDefault()
  document.dispatchEvent(new CustomEvent('open-scans'))
}

function TikTokIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>
}
function TwitchIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
}
function YouTubeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
}
function DiscordIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
}

const ICON_BTN = { display:'flex', alignItems:'center', justifyContent:'center', width:34, height:34, borderRadius:8, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', transition:'background .15s, border-color .15s', color:'var(--muted)', textDecoration:'none' }

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [about, setAbout] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <>
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:200,
        padding:'0 28px',
        background: scrolled ? 'rgba(17,18,20,.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition:'all .3s ease',
      }}>
        <div style={{ maxWidth:1120, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:68 }}>

          <button onClick={() => setAbout(true)} style={{
            background:'none', border:'none', cursor:'pointer', padding:0,
            display:'flex', alignItems:'center', gap:10,
          }}>
            <span style={{ fontSize:22 }}>🏴‍☠️</span>
            <span style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:18, color:'#fff', letterSpacing:'-.01em' }}>Brams</span>
          </button>

          <div className="hide-mobile" style={{ display:'flex', alignItems:'center', gap:4 }}>
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} style={{
                padding:'7px 14px', borderRadius:8, fontSize:14, fontWeight:500, color:'var(--muted)',
                transition:'color .2s',
              }}
                onMouseEnter={e=>e.target.style.color='#fff'}
                onMouseLeave={e=>e.target.style.color='var(--muted)'}
              >{l.label}</a>
            ))}

            <a href="#bot" style={{
              padding:'7px 14px', borderRadius:8, fontSize:14, fontWeight:500,
              color:'var(--muted)', transition:'color .2s',
              display:'flex', alignItems:'center', gap:6,
            }}
              onMouseEnter={e=>e.currentTarget.style.color='#fff'}
              onMouseLeave={e=>e.currentTarget.style.color='var(--muted)'}
            >
              🤖 Brams Score
            </a>

            <a href="#" onClick={openScans} style={{
              padding:'7px 14px', borderRadius:8, fontSize:14, fontWeight:600,
              color:'var(--accent)', transition:'color .2s, background .2s',
              display:'flex', alignItems:'center', gap:6,
              background:'rgba(224,82,74,0.08)', border:'1px solid rgba(224,82,74,0.25)',
              borderRadius:8,
            }}
              onMouseEnter={e=>{ e.currentTarget.style.background='rgba(224,82,74,0.18)'; e.currentTarget.style.borderColor='rgba(224,82,74,0.5)' }}
              onMouseLeave={e=>{ e.currentTarget.style.background='rgba(224,82,74,0.08)'; e.currentTarget.style.borderColor='rgba(224,82,74,0.25)' }}
            >
              📖 Scans
            </a>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <a href="https://www.twitch.tv/bouledog_" target="_blank" rel="noopener noreferrer"
              style={{...ICON_BTN, color:'var(--twitch)'}}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(145,71,255,.15)';e.currentTarget.style.borderColor='rgba(145,71,255,.4)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='var(--border)'}}
            ><TwitchIcon /></a>

            <a href="https://www.youtube.com/@BouleDogg/featured" target="_blank" rel="noopener noreferrer"
              style={{...ICON_BTN, color:'var(--youtube)'}}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,0,0,.12)';e.currentTarget.style.borderColor='rgba(255,0,0,.35)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='var(--border)'}}
            ><YouTubeIcon /></a>

            <a href="https://www.tiktok.com/@bouledogg" target="_blank" rel="noopener noreferrer"
              style={{...ICON_BTN, color:'#ff0050'}}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,0,80,.12)';e.currentTarget.style.borderColor='rgba(255,0,80,.35)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='var(--border)'}}
            ><TikTokIcon /></a>

            <a href="https://discord.gg/ez4dBTPE" target="_blank" rel="noopener noreferrer"
              className="btn btn-primary hide-mobile" style={{ padding:'9px 20px', fontSize:14 }}>
              <DiscordIcon /> Rejoindre
            </a>
          </div>
        </div>
      </nav>

      {about && <AboutModal onClose={() => setAbout(false)} />}
    </>
  )
}
