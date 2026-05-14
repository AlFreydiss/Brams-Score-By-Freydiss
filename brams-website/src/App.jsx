import { useState, useEffect } from 'react'
import GlobalStyles from './components/GlobalStyles.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
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
import MusicPlayer from './components/MusicPlayer.jsx'
import AnimeHub from './components/AnimeHub.jsx'
import TpnPage from './components/TpnPage.jsx'

export default function App() {
  const [scansOpen,       setScansOpen]       = useState(false)
  const [encyclopedieOpen, setEncyclopedieOpen] = useState(false)
  const [animeHubOpen,    setAnimeHubOpen]    = useState(false)
  const [tpnOpen,         setTpnOpen]         = useState(false)

  useEffect(() => {
    const fnScans    = () => setScansOpen(true)
    const fnEncy     = () => setEncyclopedieOpen(true)
    const fnAnimeHub = () => setAnimeHubOpen(true)
    const fnTpn      = () => setTpnOpen(true)
    document.addEventListener('open-scans',        fnScans)
    document.addEventListener('open-encyclopedie', fnEncy)
    document.addEventListener('open-anime-hub',    fnAnimeHub)
    document.addEventListener('open-tpn',          fnTpn)
    return () => {
      document.removeEventListener('open-scans',        fnScans)
      document.removeEventListener('open-encyclopedie', fnEncy)
      document.removeEventListener('open-anime-hub',    fnAnimeHub)
      document.removeEventListener('open-tpn',          fnTpn)
    }
  }, [])

  return (
    <ThemeProvider>
      <GlobalStyles />

      {/* Fond vidéo YouTube */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
        overflow: 'hidden', pointerEvents: 'none',
        transform: 'translateZ(0)', willChange: 'transform',
      }}>
        <iframe
          src="https://www.youtube.com/embed/eBAiYv-OnrI?autoplay=1&mute=1&loop=1&playlist=eBAiYv-OnrI&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&start=25&disablekb=1&fs=0&playsinline=1"
          style={{
            display: 'block',
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%) translateZ(0)',
            width: 'max(177.78vh, 100vw)',
            height: 'max(56.25vw, 100vh)',
            border: 'none', outline: 'none', pointerEvents: 'none',
            backfaceVisibility: 'hidden',
          }}
          allow="autoplay; encrypted-media"
          title="bg"
          frameBorder="0"
        />
      </div>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
        background: 'var(--overlay-bg, rgba(14,14,16,0.72))',
        pointerEvents: 'none',
        transform: 'translateZ(0)', willChange: 'transform',
      }} />

      <div style={{ position: 'relative', zIndex: 1, isolation: 'isolate' }}>
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

      <AIChatWidget />
      <MusicPlayer />
      <ThemeToggle />
      <AkainuGame />

      {animeHubOpen && (
        <AnimeHub
          onClose={() => setAnimeHubOpen(false)}
          onOpenOnepiece={() => { setAnimeHubOpen(false); setScansOpen(true) }}
          onOpenTpn={() => { setAnimeHubOpen(false); setTpnOpen(true) }}
        />
      )}
      {tpnOpen          && <TpnPage         onClose={() => setTpnOpen(false)} />}
      {scansOpen        && <ScansPage        onClose={() => setScansOpen(false)} />}
      {encyclopedieOpen && <EncyclopediePage onClose={() => setEncyclopedieOpen(false)} />}
    </ThemeProvider>
  )
}
