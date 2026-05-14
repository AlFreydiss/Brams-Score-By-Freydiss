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
import WantedGenerator from './components/WantedGenerator.jsx'
import HallOfFame from './components/HallOfFame.jsx'
import GrandLineMap from './components/GrandLineMap.jsx'

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
      <Navbar />
      <Hero />
      <Ranks />
      <BotFeatures />
      <DevilFruits />
      <GrandLineMap />
      <Quiz />
      <HallOfFame />
      <WantedGenerator />
      <Roadmap />
      <Leaderboard />
      <JoinCTA />
      <Footer />
      <AIChatWidget />
      <MusicPlayer />
      <Gear5Easter />
    </>
  )
}
