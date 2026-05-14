import { lazy, Suspense } from 'react'
import GlobalStyles from './components/GlobalStyles.jsx'
import { GearProvider } from './contexts/GearContext.jsx'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import Ranks from './components/Ranks.jsx'
import BotFeatures from './components/BotFeatures.jsx'
import AIChatWidget from './components/AIChatWidget.jsx'
import MusicPlayer from './components/MusicPlayer.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import JoinCTA from './components/JoinCTA.jsx'
import Footer from './components/Footer.jsx'
import Gear5Easter from './components/Gear5Easter.jsx'
import DevilFruits from './components/DevilFruits.jsx'
import Roadmap from './components/Roadmap.jsx'
import Quiz from './components/Quiz.jsx'
import HallOfFame from './components/HallOfFame.jsx'
import GrandLineMap from './components/GrandLineMap.jsx'
import QuoteSection from './components/QuoteSection.jsx'
import Contact from './components/Contact.jsx'
import NousSoutenir from './components/NousSoutenir.jsx'
import GearModeUI from './components/GearModeUI.jsx'
import ComicMode from './components/ComicMode.jsx'
import ConquerorsHaki from './components/ConquerorsHaki.jsx'
import AkainuGame from './components/AkainuGame.jsx'

export default function App() {
  return (
    <GearProvider>
      <GlobalStyles />

      {/* Fond vidéo YouTube */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <iframe
          src="https://www.youtube.com/embed/eBAiYv-OnrI?autoplay=1&mute=1&loop=1&playlist=eBAiYv-OnrI&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&start=25"
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'max(177.78vh, 100vw)',
            height: 'max(56.25vw, 100vh)',
            border: 'none', pointerEvents: 'none',
          }}
          allow="autoplay; encrypted-media"
          title="bg"
        />
      </div>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'rgba(14,14,16,0.72)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Navbar />
        <Hero />
        <QuoteSection />
        <Ranks />
        <BotFeatures />
        <DevilFruits />
        <GrandLineMap />
        <Quiz />
        <HallOfFame />
        <NousSoutenir />
        <Roadmap />
        <Leaderboard />
        <Contact />
        <JoinCTA />
        <Footer />
      </div>

      {/* Overlays & outils globaux */}
      <AIChatWidget />
      <MusicPlayer />
      <Gear5Easter />
      <GearModeUI />
      <ComicMode />
      <ConquerorsHaki />
      <AkainuGame />
    </GearProvider>
  )
}
