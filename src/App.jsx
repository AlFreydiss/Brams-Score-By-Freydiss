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
import AIChatWidget from './components/AIChatWidget.jsx'
import Footer from './components/Footer.jsx'
import QuoteSection from './components/QuoteSection.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import { useInView } from './hooks/useInView.js'

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
const VioletEvergardenPage = lazy(() => import('./components/VioletEvergardenPage.jsx'))
const VivyPage             = lazy(() => import('./components/VivyPage.jsx'))
const BcPage          = lazy(() => import('./components/BcPage.jsx'))
const MhaPage         = lazy(() => import('./components/MhaPage.jsx'))
const FireForcePage   = lazy(() => import('./components/FireForcePage.jsx'))
const BlueLockPage    = lazy(() => import('./components/BlueLockPage.jsx'))
const OnePiecePage    = lazy(() => import('./components/OnePiecePage.jsx'))
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
const BlindTestLeaderboard = lazy(() => import('./components/BlindTestLeaderboard.jsx'))
const TierListPage       = lazy(() => import('./components/TierListPage.jsx'))
const ProfilePageYonkou  = lazy(() => import('./components/ProfilePageYonkou.jsx'))
const BotFeatures        = lazy(() => import('./components/BotFeatures.jsx'))
const Quiz               = lazy(() => import('./components/Quiz.jsx'))
const HallOfFame         = lazy(() => import('./components/HallOfFame.jsx'))
const EquipageSection    = lazy(() => import('./components/EquipageSection.jsx'))
const NousSoutenir       = lazy(() => import('./components/NousSoutenir.jsx'))
const Leaderboard        = lazy(() => import('./components/Leaderboard.jsx'))
const Contact            = lazy(() => import('./components/Contact.jsx'))
const JoinCTA            = lazy(() => import('./components/JoinCTA.jsx'))
const AkainuGame         = lazy(() => import('./components/AkainuGame.jsx'))

function DeferredSection({ children, minHeight = 420, style = {}, threshold = 0.18 }) {
  const [ref, inView] = useInView(threshold)
  return (
    <div ref={ref} style={{ minHeight, ...style }}>
      {inView ? (
        <Suspense fallback={<div style={{ minHeight }} />}>
          {children}
        </Suspense>
      ) : (
        <div style={{ minHeight }} />
      )}
    </div>
  )
}
function AMVBackground() {
  const videoRef = useRef(null)
  const [muted, setMuted]     = useState(true)
  const [volume, setVolume]   = useState(40)
  const [hovered, setHovered] = useState(false)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    const saveData = Boolean(conn?.saveData)
    const reduceMotion = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)
    if (saveData || reduceMotion || window.innerWidth < 900) return

    const timer = window.setTimeout(() => setEnabled(true), 250)
    return () => window.clearTimeout(timer)
  }, [])

  if (!enabled) {
    return <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#05070a', pointerEvents: 'none' }} />
  }

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
      <video
        ref={videoRef}
        autoPlay muted loop playsInline
        preload="metadata"
        onLoadedMetadata={e => { e.target.currentTime = 25 }}
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, pointerEvents: 'none', opacity: 0.35 }}
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>

      {/* Contrôle audio AMV */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'fixed', bottom: 90, left: 16, zIndex: 800,
          display: 'flex', alignItems: 'center', gap: 8,
          background: hovered ? 'rgba(14,14,16,0.85)' : 'transparent',
          border: `1px solid ${hovered ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
          borderRadius: 12, padding: hovered ? '6px 10px' : '6px 6px',
          backdropFilter: hovered ? 'blur(12px)' : 'none',
          transition: 'all 0.2s',
        }}
      >
        <button
          onClick={toggle}
          title={muted ? 'Activer le son AMV' : 'Couper le son AMV'}
          style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            background: 'transparent', border: 'none',
            color: muted ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.85)',
            cursor: 'pointer', fontSize: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color .2s',
          }}
        >
          {muted || volume === 0 ? '🔇' : volume < 40 ? '🔉' : '🔊'}
        </button>

        {hovered && (
          <input
            type="range" min="0" max="100"
            value={muted ? 0 : volume}
            onChange={handleVolume}
            style={{
              width: 80, height: 4, cursor: 'pointer',
              accentColor: '#d4a017', borderRadius: 4,
              outline: 'none', border: 'none',
              appearance: 'none', WebkitAppearance: 'none',
            }}
          />
        )}
      </div>
    </>
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
  const [onepieceOpen,     setOnepieceOpen]     = useState(false)

  // Auto-open auth modal if Discord OAuth callback returned an error
  useEffect(() => {
    if (localStorage.getItem('brams_auth_error')) {
      document.dispatchEvent(new CustomEvent('open-auth-modal'))
    }
  }, [])
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
  const [violetOpen,       setVioletOpen]        = useState(false)
  const [vivyOpen,         setVivyOpen]          = useState(false)
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
    const fnViolet   = () => setVioletOpen(true)
    const fnVivy     = () => setVivyOpen(true)
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
    document.addEventListener('open-violet-evergarden', fnViolet)
    document.addEventListener('open-vivy',              fnVivy)
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
      document.removeEventListener('open-violet-evergarden', fnViolet)
      document.removeEventListener('open-vivy',              fnVivy)
      document.removeEventListener('open-bc',           fnBc)
      document.removeEventListener('open-mha',          fnMha)
      document.removeEventListener('open-fireforce',    fnFireforce)
      document.removeEventListener('open-bluelock',     fnBluelock)
      document.removeEventListener('open-tree',         fnTree)
      document.removeEventListener('open-upload',       fnUpload)
    }
  }, [])

  const mediaOverlayOpen = scansOpen || animeHubOpen || tpnOpen || drstoneOpen || jjkOpen || kingdomOpen || aotOpen || knyOpen || nntOpen || slOpen || dbsOpen || violetOpen || vivyOpen || bcOpen || mhaOpen || fireforcOpen || bluelockOpen
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
        <DeferredSection minHeight={760}><BotFeatures /></DeferredSection>
        <DeferredSection minHeight={520}><Quiz /></DeferredSection>
        <DeferredSection minHeight={520}><HallOfFame /></DeferredSection>
        <DeferredSection minHeight={520}><EquipageSection /></DeferredSection>
        <DeferredSection minHeight={480}><NousSoutenir /></DeferredSection>
        <DeferredSection minHeight={540}><Leaderboard /></DeferredSection>
        <DeferredSection minHeight={460}><Contact /></DeferredSection>
        <DeferredSection minHeight={420}><JoinCTA /></DeferredSection>
        <Footer />
      </div>

      <ThemeToggle />
      <AIChatWidget hidden={mediaOverlayOpen || encyclopedieOpen} />
      <DeferredSection minHeight={760}><AkainuGame /></DeferredSection>

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
        <Route path="/blind-test/leaderboard" element={<PageLayout><BlindTestLeaderboard /></PageLayout>} />

        {/* Tier List */}
        <Route path="/tier-list" element={<PageLayout><TierListPage /></PageLayout>} />

        {/* Profil Yonkou — Next-Gen 3D */}
        <Route path="/profil-yonkou" element={<ProfilePageYonkou />} />

        {/* Homepage */}
        <Route path="/*" element={mainContent} />
      </Routes>

      {/* ── Overlays globaux — disponibles sur toutes les routes ── */}
      {animeHubOpen && (
        isAuthenticated ? (
          <AnimeHub
            onClose={() => setAnimeHubOpen(false)}
            onOpenOnepiece={() => { setAnimeHubOpen(false); setOnepieceOpen(true) }}
            onOpenTpn={() => { setAnimeHubOpen(false); setTpnOpen(true) }}
            onOpenDrstone={() => { setAnimeHubOpen(false); setDrstoneOpen(true) }}
            onOpenJjk={() => { setAnimeHubOpen(false); setJjkOpen(true) }}
            onOpenKingdom={() => { setAnimeHubOpen(false); setKingdomOpen(true) }}
            onOpenAot={() => { setAnimeHubOpen(false); setAotOpen(true) }}
            onOpenKny={() => { setAnimeHubOpen(false); setKnyOpen(true) }}
            onOpenNnt={() => { setAnimeHubOpen(false); setNntOpen(true) }}
            onOpenSl={() => { setAnimeHubOpen(false); setSlOpen(true) }}
            onOpenDbs={() => { setAnimeHubOpen(false); setDbsOpen(true) }}
            onOpenViolet={() => { setAnimeHubOpen(false); setVioletOpen(true) }}
            onOpenVivy={() => { setAnimeHubOpen(false); setVivyOpen(true) }}
            onOpenBc={() => { setAnimeHubOpen(false); setBcOpen(true) }}
            onOpenMha={() => { setAnimeHubOpen(false); setMhaOpen(true) }}
            onOpenFireforce={() => { setAnimeHubOpen(false); setFireforcOpen(true) }}
            onOpenBluelock={() => { setAnimeHubOpen(false); setBluelockOpen(true) }}
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
      {violetOpen  && <VioletEvergardenPage onClose={() => setVioletOpen(false)} />}
      {vivyOpen    && <VivyPage             onClose={() => setVivyOpen(false)} />}
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
      </Suspense>
    </ThemeProvider>
  )
}
