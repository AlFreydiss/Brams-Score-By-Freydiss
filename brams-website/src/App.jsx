import GlobalStyles from './components/GlobalStyles.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import Ranks from './components/Ranks.jsx'
import BotFeatures from './components/BotFeatures.jsx'
import AIChatWidget from './components/AIChatWidget.jsx'
import MusicPlayer from './components/MusicPlayer.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import JoinCTA from './components/JoinCTA.jsx'
import Footer from './components/Footer.jsx'
import DevilFruits from './components/DevilFruits.jsx'
import Roadmap from './components/Roadmap.jsx'
import Quiz from './components/Quiz.jsx'
import HallOfFame from './components/HallOfFame.jsx'
import QuoteSection from './components/QuoteSection.jsx'
import Contact from './components/Contact.jsx'
import NousSoutenir from './components/NousSoutenir.jsx'
import Scans from './components/Scans.jsx'
import AkainuGame from './components/AkainuGame.jsx'

export default function App() {
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
          src="https://www.youtube.com/embed/eBAiYv-OnrI?autoplay=1&mute=1&loop=1&playlist=eBAiYv-OnrI&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&start=25"
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
        <DevilFruits />
        <Quiz />
        <HallOfFame />
        <Scans />
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
    </ThemeProvider>
  )
}
