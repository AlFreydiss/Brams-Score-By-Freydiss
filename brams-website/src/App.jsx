import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import GlobalStyles from './components/GlobalStyles.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { useAuth } from './contexts/AuthContext.jsx'
import WelcomeAnimation from './components/WelcomeAnimation.jsx'
import AuthGuard from './components/AuthGuard.jsx'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import Ranks from './components/Ranks.jsx'
import BotFeatures from './components/BotFeatures.jsx'
import AIChatWidget from './components/AIChatWidget.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import JoinCTA from './components/JoinCTA.jsx'
import Footer from './components/Footer.jsx'
import Roadmap from './components/Roadmap.jsx'
import Quiz from './components/Quiz.jsx'
import HallOfFame from './components/HallOfFame.jsx'
import QuoteSection from './components/QuoteSection.jsx'
import Contact from './components/Contact.jsx'
import NousSoutenir from './components/NousSoutenir.jsx'
import EquipageSection from './components/EquipageSection.jsx'
import AkainuGame from './components/AkainuGame.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import MusicPlayer from './components/MusicPlayer.jsx'

// Lazy — chargés uniquement quand ouverts
const ProfilePage     = lazy(() => import('./components/ProfilePage.jsx'))
const EncyclopediePage= lazy(() => import('./components/EncyclopediePage.jsx'))
const ScansPage       = lazy(() => import('./components/ScansPage.jsx'))
const AnimeHub        = lazy(() => import('./components/AnimeHub.jsx'))
const TpnPage         = lazy(() => import('./components/TpnPage.jsx'))
const DrStonePage     = lazy(() => import('./components/DrStonePage.jsx'))
const JjkPage         = lazy(() => import('./components/JjkPage.jsx'))
const KingdomPage     = lazy(() => import('./components/KingdomPage.jsx'))
const AotPage         = lazy(() => import('./components/AotPage.jsx'))
const KnyPage         = lazy(() => import('./components/KnyPage.jsx'))
const NntPage         = lazy(() => import('./components/NntPage.jsx'))
const SlPage          = lazy(() => import('./components/SlPage.jsx'))
const DbsPage         = lazy(() => import('./components/DbsPage.jsx'))
const BcPage          = lazy(() => import('./components/BcPage.jsx'))
const MhaPage         = lazy(() => import('./components/MhaPage.jsx'))
const FireForcePage   = lazy(() => import('./components/FireForcePage.jsx'))
const BlueLockPage    = lazy(() => import('./components/BlueLockPage.jsx'))
const FamilyTree3D    = lazy(() => import('./components/FamilyTree3D.jsx'))
const BlobUploadPage  = lazy(() => import('./components/BlobUploadPage.jsx'))
const WikiHome        = lazy(() => import('./components/WikiHome.jsx'))
const WikiArticle     = lazy(() => import('./components/WikiArticle.jsx'))
const WikiEditor      = lazy(() => import('./components/WikiEditor.jsx'))
const TheoriesHome       = lazy(() => import('./components/TheoriesHome.jsx'))
const TheoryDetail       = lazy(() => import('./components/TheoryDetail.jsx'))
const TheoryEditor       = lazy(() => import('./components/TheoryEditor.jsx'))
const ConstellationPage  = lazy(() => import('./components/ConstellationPage.jsx'))
const DevilFruitPage     = lazy(() => import('./components/devil-fruit/DevilFruitPage.jsx'))

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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none', transform: 'translateZ(0)' }}>
      <video ref={vidRef} autoPlay muted loop playsInline onCanPlay={() => setVisible(true)}
        style={{ display: 'block', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) translateZ(0)', width: 'max(177.78vh,100vw)', height: 'max(56.25vw,100vh)', objectFit: 'cover', pointerEvents: 'none', backfaceVisibility: 'hidden', opacity: visible ? 1 : 0, transition: 'opacity 1.2s ease' }}>
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>
    </div>
  )
}

// Wrapper pour les pages Wiki/Théories (Navbar + fond sombre + WelcomeAnimation)
function PageLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0b0c0e', position: 'relative' }}>
      <WelcomeAnimation />
      <Navbar />
      {children}
    </div>
  )
}

export default function App() {
  const { isAuthenticated } = useAuth()
  const [scansOpen,        setScansOpen]        = useState(false)
  const [encyclopedieOpen, setEncyclopedieOpen]  = useState(false)
  const [animeHubOpen,     setAnimeHubOpen]      = useState(false)
  const [tpnOpen,          setTpnOpen]           = useState(false)
  const [drstoneOpen,      setDrstoneOpen]       = useState(false)
  const [jjkOpen,          setJjkOpen]           = useState(false)
  const [kingdomOpen,      setKingdomOpen]       = useState(false)
  const [aotOpen,          setAotOpen]           = useState(false)
  const [knyOpen,          setKnyOpen]           = useState(false)
  const [nntOpen,          setNntOpen]           = useState(false)
  const [slOpen,           setSlOpen]            = useState(false)
  const [dbsOpen,          setDbsOpen]           = useState(false)
  const [bcOpen,           setBcOpen]            = useState(false)
  const [mhaOpen,          setMhaOpen]           = useState(false)
  const [fireforcOpen,     setFireforcOpen]      = useState(false)
  const [bluelockOpen,     setBluelockOpen]      = useState(false)
  const [treeOpen,         setTreeOpen]          = useState(false)
  const [uploadOpen,       setUploadOpen]        = useState(false)

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
    const fnBc         = () => setBcOpen(true)
    const fnMha        = () => setMhaOpen(true)
    const fnFireforce  = () => setFireforcOpen(true)
    const fnBluelock   = () => setBluelockOpen(true)
    const fnTree       = () => setTreeOpen(true)
    const fnUpload     = () => setUploadOpen(true)
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
    document.addEventListener('open-mha',          fnMha)
    document.addEventListener('open-fireforce',    fnFireforce)
    document.addEventListener('open-bluelock',     fnBluelock)
    document.addEventListener('open-tree',         fnTree)
    document.addEventListener('open-upload',       fnUpload)
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
      document.removeEventListener('open-mha',          fnMha)
      document.removeEventListener('open-fireforce',    fnFireforce)
      document.removeEventListener('open-bluelock',     fnBluelock)
      document.removeEventListener('open-tree',         fnTree)
      document.removeEventListener('open-upload',       fnUpload)
    }
  }, [])

  const mediaOverlayOpen = scansOpen || animeHubOpen || tpnOpen || drstoneOpen || jjkOpen || kingdomOpen || aotOpen || knyOpen || nntOpen || slOpen || dbsOpen || bcOpen || mhaOpen || fireforcOpen || bluelockOpen
  const immersiveOverlayOpen = mediaOverlayOpen || encyclopedieOpen || treeOpen || uploadOpen

  const mainContent = (
    <>
      <WelcomeAnimation />
      <BgVideo />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, background: 'var(--overlay-bg, rgba(14,14,16,0.82))', pointerEvents: 'none', transform: 'translateZ(0)', willChange: 'transform' }} />

      <div style={{ position: 'relative', zIndex: 2, isolation: 'isolate' }}>
        <Navbar />
        <Hero />
        <QuoteSection />
        <Ranks />
        <BotFeatures />
        <Quiz />
        <HallOfFame />
        <EquipageSection />
        <NousSoutenir />
        <Roadmap />
        <Leaderboard />
        <Contact />
        <JoinCTA />
        <Footer />
      </div>

      {!immersiveOverlayOpen && <MusicPlayer />}
      <ThemeToggle />
      <AIChatWidget hidden={mediaOverlayOpen || encyclopedieOpen} />
      <AkainuGame />

      {animeHubOpen && (
        isAuthenticated ? (
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
            onOpenMha={() => { setAnimeHubOpen(false); setMhaOpen(true) }}
            onOpenFireforce={() => { setAnimeHubOpen(false); setFireforcOpen(true) }}
            onOpenBluelock={() => { setAnimeHubOpen(false); setBluelockOpen(true) }}
          />
        ) : (
          <AuthGuard onClose={() => setAnimeHubOpen(false)} feature="les animés & scans" />
        )
      )}
      {tpnOpen     && <TpnPage     onClose={() => setTpnOpen(false)} />}
      {drstoneOpen && <DrStonePage onClose={() => setDrstoneOpen(false)} />}
      {jjkOpen     && <JjkPage     onClose={() => setJjkOpen(false)} />}
      {kingdomOpen && <KingdomPage onClose={() => setKingdomOpen(false)} />}
      {aotOpen     && <AotPage     onClose={() => setAotOpen(false)} />}
      {knyOpen     && <KnyPage     onClose={() => setKnyOpen(false)} />}
      {nntOpen     && <NntPage     onClose={() => setNntOpen(false)} />}
      {slOpen      && <SlPage      onClose={() => setSlOpen(false)} />}
      {dbsOpen     && <DbsPage     onClose={() => setDbsOpen(false)} />}
      {bcOpen        && <BcPage        onClose={() => setBcOpen(false)} />}
      {mhaOpen       && <MhaPage       onClose={() => setMhaOpen(false)} />}
      {fireforcOpen  && <FireForcePage onClose={() => setFireforcOpen(false)} />}
      {bluelockOpen  && <BlueLockPage  onClose={() => setBluelockOpen(false)} />}
      {treeOpen      && <FamilyTree3D  onClose={() => setTreeOpen(false)} />}
      {scansOpen && (
        isAuthenticated
          ? <ScansPage onClose={() => setScansOpen(false)} />
          : <AuthGuard onClose={() => setScansOpen(false)} feature="les scans One Piece" />
      )}
      {encyclopedieOpen && <EncyclopediePage onClose={() => setEncyclopedieOpen(false)} />}
      {uploadOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0b0c0e', overflowY: 'auto' }}>
          <button onClick={() => setUploadOpen(false)} style={{ position: 'fixed', top: 16, right: 16, zIndex: 10000, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 16px', cursor: 'pointer', fontSize: 14 }}>✕ Fermer</button>
          <BlobUploadPage />
        </div>
      )}
    </>
  )

  return (
    <ThemeProvider>
      <GlobalStyles />
      <Suspense fallback={
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#0b0c0e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 36, height: 36,
            border: '3px solid rgba(212,160,23,0.2)',
            borderTopColor: '#d4a017',
            borderRadius: '50%',
            animation: 'spin 0.75s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }>
      <Routes>
        {/* Profil utilisateur */}
        <Route path="/u/:discordId" element={<ProfilePage />} />

        {/* Wiki Communautaire */}
        <Route path="/wiki"           element={<PageLayout><WikiHome      /></PageLayout>} />
        <Route path="/wiki/new"       element={<PageLayout><WikiEditor    /></PageLayout>} />
        <Route path="/wiki/:slug/edit"element={<PageLayout><WikiEditor    /></PageLayout>} />
        <Route path="/wiki/:slug"     element={<PageLayout><WikiArticle   /></PageLayout>} />

        {/* Forum Théories */}
        <Route path="/theories"       element={<PageLayout><TheoriesHome  /></PageLayout>} />
        <Route path="/theories/new"   element={<PageLayout><TheoryEditor  /></PageLayout>} />
        <Route path="/theories/:id"   element={<PageLayout><TheoryDetail  /></PageLayout>} />

        {/* Constellation Équipages */}
        <Route path="/equipage" element={<PageLayout><ConstellationPage /></PageLayout>} />

        {/* Encyclopédie Fruits du Démon */}
        <Route path="/fruits-du-demon" element={<PageLayout><DevilFruitPage /></PageLayout>} />

        {/* Homepage */}
        <Route path="/*" element={mainContent} />
      </Routes>
      </Suspense>
    </ThemeProvider>
  )
}
