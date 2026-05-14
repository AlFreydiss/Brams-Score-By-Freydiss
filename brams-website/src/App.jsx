import GlobalStyles from './components/GlobalStyles.jsx'
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

export default function App() {
  return (
    <>
      {/* Fond GIF Luffy */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'url(/luffy-bg.gif)',
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
        opacity: 0.22,
        pointerEvents: 'none',
      }} />
      {/* Overlay sombre */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'rgba(14,14,16,0.80)',
        pointerEvents: 'none',
      }} />

      <GlobalStyles />
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
        <Contact />
        <Roadmap />
        <Leaderboard />
        <JoinCTA />
        <Footer />
        <AIChatWidget />
        <MusicPlayer />
        <Gear5Easter />
      </div>
    </>
  )
}
