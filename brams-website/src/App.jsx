import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import Ranks from './components/Ranks.jsx'
import BotFeatures from './components/BotFeatures.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import JoinCTA from './components/JoinCTA.jsx'
import Footer from './components/Footer.jsx'

export default function App() {
  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: -1,
        backgroundImage: 'url(/luffy-bg.gif)',
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
      }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: -1,
        background: 'rgba(17,18,20,0.82)',
      }} />
      <Navbar />
      <Hero />
      <Ranks />
      <BotFeatures />
      <Leaderboard />
      <JoinCTA />
      <Footer />
    </>
  )
}
