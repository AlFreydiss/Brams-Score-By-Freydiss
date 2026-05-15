import { useState, useEffect, useRef } from 'react'
import GlobalStyles from './components/GlobalStyles.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import Ranks from './components/Ranks.jsx'
import BotFeatures from './components/BotFeatures.jsx'
import AIChatWidget from './components/AIChatWidget.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import JoinCTA from './components/JoinCTA.jsx'
import Footer from './components/Footer.jsx'
import Roadmap from './components/Roadmap.jsx'
import EncyclopediePage from './components/EncyclopediePage.jsx'
import Quiz from './components/Quiz.jsx'
import HallOfFame from './components/HallOfFame.jsx'
import QuoteSection from './components/QuoteSection.jsx'
import Contact from './components/Contact.jsx'
import NousSoutenir from './components/NousSoutenir.jsx'
import ScansPage from './components/ScansPage.jsx'
import AkainuGame from './components/AkainuGame.jsx'
import AnimeHub from './components/AnimeHub.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import MusicPlayer from './components/MusicPlayer.jsx'
import TpnPage from './components/TpnPage.jsx'
import DrStonePage from './components/DrStonePage.jsx'
import JjkPage from './components/JjkPage.jsx'
import KingdomPage from './components/KingdomPage.jsx'
import AotPage from './components/AotPage.jsx'
import KnyPage from './components/KnyPage.jsx'
import NntPage from './components/NntPage.jsx'
import SlPage from './components/SlPage.jsx'
import DbsPage from './components/DbsPage.jsx'
import BcPage from './components/BcPage.jsx'
import DiscordFeed from './components/DiscordFeed.jsx'
import WeeklySchedule from './components/WeeklySchedule.jsx'

function BgVideo() {
  const [visible, setVisible] = useState(false)
  const vidRef = useRef(null)

  useEffect(() => {
    const vid = vidRef.current
    if (!vid) return
    const onMeta = () => { vid.currentTime = 25 }
    vid.addEventListener('loadedmetadata', onMeta)
    return () => vid.removeEventListener('loadedmetadata', onMeta)
  }, [])

  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:0, overflow:'hidden', pointerEvents:'none', transform:'translateZ(0)' }}>
      <video
        ref={vidRef}
        autoPlay muted loop playsInline
        onCanPlay={() => setVisible(true)}
        style={{ display:'block', position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%) translateZ(0)', width:'max(177.78vh,100vw)', height:'max(56.25vw,100vh)', objectFit:'cover', pointerEvents:'none', backfaceVisibility:'hidden', opacity: visible ? 1 : 0, transition:'opacity 1.2s ease' }}
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>
    </div>
  )
}

export default function App() {
  const [scansOpen,       setScansOpen]       = useState(false)
  const [encyclopedieOpen, setEncyclopedieOpen] = useState(false)
  const [animeHubOpen,    setAnimeHubOpen]    = useState(false)
  const [tpnOpen,         setTpnOpen]         = useState(false)
  const [drstoneOpen,     setDrstoneOpen]     = useState(false)
  const [jjkOpen,         setJjkOpen]         = useState(false)
  const [kingdomOpen,     setKingdomOpen]     = useState(false)
  const [aotOpen,         setAotOpen]         = useState(false)
  const [knyOpen,         setKnyOpen]         = useState(false)
  const [nntOpen,         setNntOpen]         = useState(false)
  const [slOpen,          setSlOpen]          = useState(false)
  const [dbsOpen,         setDbsOpen]         = useState(false)
  const [bcOpen,          setBcOpen]          = useState(false)

  useEffect(() => {
    const fnScans    = () => setScansOpen(true)
    const fnEncy     = () => setEncyclopedieOpen(true)
    const fnAnimeHub = () => setAnimeHubOpen(true)
    const fnTpn      = () => setTpnOpen(true)
    const fnDrstone  = () => setDrstoneOpen(true)
    const fnJjk      = () => setJjkOpen(true)
    const fnKingdom  = () => setKingdomOpen(true)
    const fnAot      = () => setAotOpen(true)
    const fnKny      = () => setKnyOpen(true)
    const fnNnt      = () => setNntOpen(true)
    const fnSl       = () => setSlOpen(true)
    const fnDbs      = () => setDbsOpen(true)
    const fnBc       = () => setBcOpen(true)
    document.addEventListener('open-scans',        fnScans)
    document.addEventListener('open-encyclopedie', fnEncy)
    document.addEventListener('open-anime-hub',    fnAnimeHub)
    document.addEventListener('open-tpn',          fnTpn)
    document.addEventListener('open-drstone',      fnDrstone)
    document.addEventListener('open-jjk',          fnJjk)
    document.addEventListener('open-kingdom',      fnKingdom)
    document.addEventListener('open-aot',          fnAot)
    document.addEventListener('open-kny',          fnKny)
    document.addEventListener('open-nnt',          fnNnt)
    document.addEventListener('open-sl',           fnSl)
    document.addEventListener('open-dbs',          fnDbs)
    document.addEventListener('open-bc',           fnBc)
    return () => {
      document.removeEventListener('open-scans',        fnScans)
      document.removeEventListener('open-encyclopedie', fnEncy)
      document.removeEventListener('open-anime-hub',    fnAnimeHub)
      document.removeEventListener('open-tpn',          fnTpn)
      document.removeEventListener('open-drstone',      fnDrstone)
      document.removeEventListener('open-jjk',          fnJjk)
      document.removeEventListener('open-kingdom',      fnKingdom)
      document.removeEventListener('open-aot',          fnAot)
      document.removeEventListener('open-kny',          fnKny)
      document.removeEventListener('open-nnt',          fnNnt)
      document.removeEventListener('open-sl',           fnSl)
      document.removeEventListener('open-dbs',          fnDbs)
      document.removeEventListener('open-bc',           fnBc)
    }
  }, [])

  return (
    <ThemeProvider>
      <GlobalStyles />

      {/* Fond vidéo local — One Piece Memories AMV */}
      <BgVideo />
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1,
        background: 'var(--overlay-bg, rgba(14,14,16,0.82))',
        pointerEvents: 'none',
        transform: 'translateZ(0)', willChange: 'transform',
      }} />

      <div style={{ position: 'relative', zIndex: 2, isolation: 'isolate' }}>
        <Navbar />
        <Hero />
        <QuoteSection />
        <Ranks />
        <BotFeatures />
        <Quiz />
        <HallOfFame />
        <NousSoutenir />
        <Roadmap />
        <Leaderboard />
        <Contact />
        <JoinCTA />
        <Footer />
      </div>

      <MusicPlayer />
      <ThemeToggle />

      {/* Right sidebar: schedule + Discord feed — only on wide screens */}
      <div style={{
        position: 'fixed', top: '50%', right: 16, transform: 'translateY(-50%)',
        zIndex: 190, width: 280, display: 'flex', flexDirection: 'column', gap: 10,
        pointerEvents: 'none',
      }} className="right-panel">
        <div style={{ pointerEvents: 'all' }}><WeeklySchedule /></div>
        <div style={{ pointerEvents: 'all' }}><DiscordFeed /></div>
      </div>
      <AIChatWidget hidden={scansOpen || encyclopedieOpen || tpnOpen || drstoneOpen || jjkOpen || kingdomOpen || aotOpen || knyOpen || nntOpen || slOpen || dbsOpen || bcOpen} />
      <AkainuGame />

      {animeHubOpen && (
        <AnimeHub
          onClose={() => setAnimeHubOpen(false)}
          onOpenOnepiece={() => { setAnimeHubOpen(false); setScansOpen(true) }}
          onOpenTpn={() => { setAnimeHubOpen(false); setTpnOpen(true) }}
          onOpenDrstone={() => { setAnimeHubOpen(false); setDrstoneOpen(true) }}
          onOpenJjk={() => { setAnimeHubOpen(false); setJjkOpen(true) }}
          onOpenKingdom={() => { setAnimeHubOpen(false); setKingdomOpen(true) }}
          onOpenAot={() => { setAnimeHubOpen(false); setAotOpen(true) }}
          onOpenKny={() => { setAnimeHubOpen(false); setKnyOpen(true) }}
          onOpenNnt={() => { setAnimeHubOpen(false); setNntOpen(true) }}
          onOpenSl={() => { setAnimeHubOpen(false); setSlOpen(true) }}
          onOpenDbs={() => { setAnimeHubOpen(false); setDbsOpen(true) }}
          onOpenBc={() => { setAnimeHubOpen(false); setBcOpen(true) }}
        />
      )}
      {tpnOpen          && <TpnPage         onClose={() => setTpnOpen(false)} />}
      {drstoneOpen      && <DrStonePage     onClose={() => setDrstoneOpen(false)} />}
      {jjkOpen          && <JjkPage         onClose={() => setJjkOpen(false)} />}
      {kingdomOpen      && <KingdomPage     onClose={() => setKingdomOpen(false)} />}
      {aotOpen          && <AotPage         onClose={() => setAotOpen(false)} />}
      {knyOpen          && <KnyPage         onClose={() => setKnyOpen(false)} />}
      {nntOpen          && <NntPage         onClose={() => setNntOpen(false)} />}
      {slOpen           && <SlPage          onClose={() => setSlOpen(false)} />}
      {dbsOpen          && <DbsPage         onClose={() => setDbsOpen(false)} />}
      {bcOpen           && <BcPage          onClose={() => setBcOpen(false)} />}
      {scansOpen        && <ScansPage        onClose={() => setScansOpen(false)} />}
      {encyclopedieOpen && <EncyclopediePage onClose={() => setEncyclopedieOpen(false)} />}
    </ThemeProvider>
  )
}
