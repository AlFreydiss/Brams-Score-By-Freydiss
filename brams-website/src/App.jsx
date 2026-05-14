import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import Ranks from './components/Ranks.jsx'
import BotFeatures from './components/BotFeatures.jsx'
import AIChatWidget from './components/AIChatWidget.jsx'
import MusicPlayer from './components/MusicPlayer.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import JoinCTA from './components/JoinCTA.jsx'
import Footer from './components/Footer.jsx'

export default function App() {
  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'url(/luffy-bg.gif)',
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
        opacity: 0.22,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'rgba(14,14,16,0.78)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position:'relative', zIndex:300,
        background:'linear-gradient(90deg, rgba(224,82,74,.15), rgba(155,89,182,.15), rgba(224,82,74,.15))',
        borderBottom:'1px solid rgba(224,82,74,.2)',
        padding:'8px 20px', textAlign:'center',
        fontSize:13, color:'rgba(255,255,255,.8)', fontWeight:500,
        backdropFilter:'blur(10px)',
      }}>
        🏴‍☠️ &nbsp; Rejoins la <strong style={{color:'#e0524a'}}>Brams Community</strong> — 2 000+ membres · Bot actif 24/7 &nbsp;
        <a href="https://discord.gg/ez4dBTPE" target="_blank" rel="noopener noreferrer"
          style={{ color:'var(--accent)', fontWeight:700, textDecoration:'underline', textUnderlineOffset:3 }}>
          Rejoindre →
        </a>
      </div>
      <Navbar />
      <Hero />
      <Ranks />
      <BotFeatures />
      <Leaderboard />
      <JoinCTA />
      <Footer />
      <AIChatWidget />
      <MusicPlayer />
    </>
  )
}
