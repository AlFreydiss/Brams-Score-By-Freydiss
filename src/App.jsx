import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import GlobalStyles from './components/GlobalStyles.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { useAuth } from './contexts/AuthContext.jsx'
import { OpeningBgProvider, useOpeningBg } from './contexts/OpeningBgContext.jsx'
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
import Quiz from './components/Quiz.jsx'
import HallOfFame from './components/HallOfFame.jsx'
import QuoteSection from './components/QuoteSection.jsx'
import Contact from './components/Contact.jsx'
import NousSoutenir from './components/NousSoutenir.jsx'
import EquipageSection from './components/EquipageSection.jsx'
import AkainuGame from './components/AkainuGame.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'

// Lazy — chargés uniquement quand ouverts
const ProfilePage     = lazy(() => import('./components/ProfilePage.jsx'))
const EncyclopediePage= lazy(() => import('./components/EncyclopediePage.jsx'))
const ScansPage       = lazy(() => import('./components/ScansPage.jsx'))
const AnimeHub        = lazy(() => import('./components/AnimeHub.jsx'))
const OnePiecePage    = lazy(() => import('./components/OnePiecePage.jsx'))
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
const BlueLockPage           = lazy(() => import('./components/BlueLockPage.jsx'))
const VioletEvergardenPage   = lazy(() => import('./components/VioletEvergardenPage.jsx'))
const KaijuNo8Page           = lazy(() => import('./components/KaijuNo8Page.jsx'))
const FamilyTree3D    = lazy(() => import('./components/FamilyTree3D.jsx'))
const BlobUploadPage  = lazy(() => import('./components/BlobUploadPage.jsx'))
const WikiTheoryHub   = lazy(() => import('./components/WikiTheoryHub.jsx'))
const WikiArticle     = lazy(() => import('./components/WikiArticle.jsx'))
const WikiEditor      = lazy(() => import('./components/WikiEditor.jsx'))
const TheoryDetail       = lazy(() => import('./components/TheoryDetail.jsx'))
const TheoryEditor       = lazy(() => import('./components/TheoryEditor.jsx'))
const ConstellationPage  = lazy(() => import('./components/ConstellationPage.jsx'))
const CrewHQPage         = lazy(() => import('./components/crew-hq/CrewHQPage.jsx'))
const DevilFruitPage     = lazy(() => import('./components/devil-fruit/DevilFruitPage.jsx'))
const BerryShop          = lazy(() => import('./components/BerryShop.jsx'))
const BramsTraitorPage   = lazy(() => import('./components/BramsTraitorPage.jsx'))
const StaffPanel         = lazy(() => import('./components/StaffPanel.jsx'))
const BlindTestPage      = lazy(() => import('./components/BlindTestPage.jsx'))
const BlindTestRoomPage  = lazy(() => import('./components/BlindTestRoomPage.jsx'))
const BlindTestLeaderboard = lazy(() => import('./components/BlindTestLeaderboard.jsx'))
const TierListPage       = lazy(() => import('./components/TierListPage.jsx'))
const TournamentPage     = lazy(() => import('./components/TournamentPage.jsx'))
const TournamentHubPage  = lazy(() => import('./components/TournamentHubPage.jsx'))

function shouldSkipAmbientVideo() {
  if (typeof window === 'undefined') return true
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (connection?.saveData) return true
  if (['slow-2g', '2g'].includes(connection?.effectiveType)) return true

  return false
}


function AMVBackground() {
  const videoRef = useRef(null)
  const [videoEnabled, setVideoEnabled] = useState(false)
  const [muted, setMuted]     = useState(true)
  const [volume, setVolume]   = useState(40)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (shouldSkipAmbientVideo()) return

    let timeoutId
    let idleId
    const enableVideo = () => setVideoEnabled(true)

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(enableVideo, { timeout: 2500 })
    } else {
      timeoutId = window.setTimeout(enableVideo, 1200)
    }

    return () => {
      if (idleId) window.cancelIdleCallback?.(idleId)
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [])

  const toggle = () => {
    const v = videoRef.current
    if (!v) return
    const next = !muted
    v.muted = next
    if (!next) v.volume = volume / 100
    setMuted(next)
  }

  const handleVolume = e => {
    const val = parseInt(e.target.value)
    setVolume(val)
    const v = videoRef.current
    if (!v) return
    v.volume = val / 100
    if (val === 0) { v.muted = true; setMuted(true) }
    else { v.muted = false; setMuted(false) }
  }

  return (
    <>
      {videoEnabled && <video
        ref={videoRef}
        autoPlay muted loop playsInline preload="metadata"
        onLoadedMetadata={e => { e.target.currentTime = 25 }}
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, pointerEvents: 'none', opacity: 0.35 }}
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>}

      {/* Lecteur ambiance discret */}
      {videoEnabled && (
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: 'fixed',
            bottom: 18,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 800,
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(6,7,10,0.6)',
            border: `1px solid ${hovered ? 'rgba(212,160,23,0.14)' : 'rgba(255,255,255,0.04)'}`,
            borderRadius: 99,
            padding: '4px 8px',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            transition: 'opacity 0.4s ease, border-color 0.35s ease',
            opacity: hovered ? 0.94 : 0.30,
            cursor: 'default',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            gap: 0,
          }}
        >
          <button
            onClick={toggle}
            title={muted ? 'Activer le son' : 'Couper le son'}
            style={{
              background: 'none', border: 'none',
              color: muted ? 'rgba(255,255,255,0.32)' : '#c9a84c',
              cursor: 'pointer', fontSize: 13,
              padding: '0 6px',
              lineHeight: 1,
              transition: 'color 0.2s',
              display: 'flex', alignItems: 'center',
            }}
          >
            {muted || volume === 0 ? '♪' : '♫'}
          </button>

          <div style={{
            overflow: 'hidden',
            maxWidth: hovered ? 150 : 0,
            transition: 'max-width 0.3s ease',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              fontSize: 9, color: 'rgba(255,255,255,0.25)',
              letterSpacing: '0.14em', fontWeight: 600,
              textTransform: 'uppercase', paddingRight: 2,
            }}>
              Ambiance
            </span>
            <input
              type="range" min="0" max="100"
              value={muted ? 0 : volume}
              onChange={handleVolume}
              style={{
                width: 58, cursor: 'pointer',
                accentColor: '#c9a84c',
                appearance: 'none', WebkitAppearance: 'none',
                height: 3,
                background: `linear-gradient(to right, #c9a84c ${muted ? 0 : volume}%, rgba(255,255,255,0.14) ${muted ? 0 : volume}%)`,
                borderRadius: 3, outline: 'none', border: 'none',
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}

function EquippedOpeningBg() {
  const { activeBg } = useOpeningBg()
  if (!activeBg) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(https://img.youtube.com/vi/${activeBg.ytId}/hqdefault.jpg)`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(22px) brightness(0.45)',
        transform: 'scale(1.08)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(155deg, ${activeBg.overlayStart} 0%, ${activeBg.overlayEnd} 100%)`,
      }} />
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

  // Auto-open auth modal if Discord OAuth callback returned an error
  useEffect(() => {
    if (localStorage.getItem('brams_auth_error')) {
      document.dispatchEvent(new CustomEvent('open-auth-modal'))
    }
  }, [])
  const [encyclopedieOpen, setEncyclopedieOpen]  = useState(false)
  const [animeHubOpen,     setAnimeHubOpen]      = useState(false)
  const [onepieceOpen,     setOnepieceOpen]      = useState(false)
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
  const [violetOpen,       setVioletOpen]        = useState(false)
  const [kaiju8Open,       setKaiju8Open]        = useState(false)
  const [treeOpen,         setTreeOpen]          = useState(false)
  const [uploadOpen,       setUploadOpen]        = useState(false)

  useEffect(() => {
    const fnScans    = () => setScansOpen(true)
    const fnEncy     = () => setEncyclopedieOpen(true)
    const fnAnimeHub = () => setAnimeHubOpen(true)
    const fnOnepiece = () => setOnepieceOpen(true)
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
    const fnViolet     = () => setVioletOpen(true)
    const fnKaiju8     = () => setKaiju8Open(true)
    const fnTree       = () => setTreeOpen(true)
    const fnUpload     = () => setUploadOpen(true)
    document.addEventListener('open-scans',        fnScans)
    document.addEventListener('open-encyclopedie', fnEncy)
    document.addEventListener('open-anime-hub',    fnAnimeHub)
    document.addEventListener('open-onepiece',      fnOnepiece)
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
    document.addEventListener('open-violet',       fnViolet)
    document.addEventListener('open-kaiju8',       fnKaiju8)
    document.addEventListener('open-tree',         fnTree)
    document.addEventListener('open-upload',       fnUpload)
    return () => {
      document.removeEventListener('open-scans',        fnScans)
      document.removeEventListener('open-encyclopedie', fnEncy)
      document.removeEventListener('open-anime-hub',    fnAnimeHub)
      document.removeEventListener('open-onepiece',      fnOnepiece)
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
      document.removeEventListener('open-violet',       fnViolet)
      document.removeEventListener('open-kaiju8',       fnKaiju8)
      document.removeEventListener('open-tree',         fnTree)
      document.removeEventListener('open-upload',       fnUpload)
    }
  }, [])

  const mediaOverlayOpen = scansOpen || animeHubOpen || onepieceOpen || tpnOpen || drstoneOpen || jjkOpen || kingdomOpen || aotOpen || knyOpen || nntOpen || slOpen || dbsOpen || bcOpen || mhaOpen || fireforcOpen || bluelockOpen || violetOpen || kaiju8Open
  const immersiveOverlayOpen = mediaOverlayOpen || encyclopedieOpen || treeOpen || uploadOpen

  const mainContent = (
    <>
      <WelcomeAnimation />
      <AMVBackground />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, background: 'rgba(4,7,10,0.58)', pointerEvents: 'none' }} />

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
        <Leaderboard />
        <Contact />
        <JoinCTA />
        <Footer />
      </div>

      <ThemeToggle />
      <AIChatWidget hidden={mediaOverlayOpen || encyclopedieOpen} />
      <AkainuGame />

    </>
  )

  return (
    <OpeningBgProvider>
    <ThemeProvider>
      <GlobalStyles />
      <EquippedOpeningBg />
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

        {/* Wiki & Théories — Hub unifié */}
        <Route path="/wiki"           element={<PageLayout><WikiTheoryHub /></PageLayout>} />
        <Route path="/theories"       element={<PageLayout><WikiTheoryHub /></PageLayout>} />
        <Route path="/wiki/new"       element={<PageLayout><WikiEditor    /></PageLayout>} />
        <Route path="/wiki/:slug/edit"element={<PageLayout><WikiEditor    /></PageLayout>} />
        <Route path="/wiki/:slug"     element={<PageLayout><WikiArticle   /></PageLayout>} />
        <Route path="/theories/new"   element={<PageLayout><TheoryEditor  /></PageLayout>} />
        <Route path="/theories/:id"   element={<PageLayout><TheoryDetail  /></PageLayout>} />

        {/* Constellation Équipages */}
        <Route path="/equipage" element={<PageLayout><ConstellationPage /></PageLayout>} />
        <Route path="/equipage/:crewId" element={<CrewHQPage />} />

        {/* Encyclopédie Fruits du Démon */}
        <Route path="/fruits-du-demon" element={<PageLayout><DevilFruitPage /></PageLayout>} />

        {/* Boutique Berry connectee Discord */}
        <Route path="/boutique" element={<PageLayout><BerryShop /></PageLayout>} />
        <Route path="/shop" element={<PageLayout><BerryShop /></PageLayout>} />

        {/* Jeu social deduction pirate */}
        <Route path="/brams-traitor" element={<BramsTraitorPage />} />
        <Route path="/pirate-arena" element={<BramsTraitorPage />} />

        {/* Panel staff modération */}
        <Route path="/staff" element={<StaffPanel />} />

        {/* Blind Test */}
        <Route path="/blind-test" element={<PageLayout><BlindTestPage /></PageLayout>} />
        <Route path="/blind-test/multi" element={<PageLayout><BlindTestRoomPage /></PageLayout>} />
        <Route path="/blind-test/room/:code" element={<PageLayout><BlindTestRoomPage /></PageLayout>} />
        <Route path="/blind-test/leaderboard" element={<PageLayout><BlindTestLeaderboard /></PageLayout>} />
        <Route path="/tier-list" element={<PageLayout><TierListPage /></PageLayout>} />

        {/* Tournois — hub + tournois individuels */}
        <Route path="/tournoi"     element={<PageLayout><TournamentHubPage /></PageLayout>} />
        <Route path="/tournoi/ost" element={<PageLayout><TournamentPage    /></PageLayout>} />
        <Route path="/tournoi-ost" element={<PageLayout><TournamentPage    /></PageLayout>} />

        {/* Homepage */}
        <Route path="/*" element={mainContent} />
      </Routes>

      {/* ── Overlays globaux — disponibles sur toutes les routes ── */}
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
            onOpenViolet={() => { setAnimeHubOpen(false); setVioletOpen(true) }}
            onOpenKaiju8={() => { setAnimeHubOpen(false); setKaiju8Open(true) }}
          />
        ) : (
          <AuthGuard onClose={() => setAnimeHubOpen(false)} feature="les animés & scans" />
        )
      )}
      {onepieceOpen && <OnePiecePage onClose={() => setOnepieceOpen(false)} />}
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
      {violetOpen    && <VioletEvergardenPage onClose={() => setVioletOpen(false)} />}
      {kaiju8Open    && <KaijuNo8Page  onClose={() => setKaiju8Open(false)} />}
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
      </Suspense>
    </ThemeProvider>
    </OpeningBgProvider>
  )
}
