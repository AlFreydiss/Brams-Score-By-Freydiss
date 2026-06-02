import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom'
import GlobalStyles from './components/GlobalStyles.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { OpeningBgProvider, useOpeningBg } from './contexts/OpeningBgContext.jsx'
import EquippedOpeningBackground from './components/social/EquippedOpeningBackground.jsx'
import { SocialProvider } from './contexts/SocialContext.jsx'
import { CallProvider } from './contexts/CallContext.jsx'
import { useAuth } from './contexts/AuthContext.jsx'
import NotificationToast from './components/social/NotificationToast.jsx'
import CallOverlay from './components/social/CallOverlay.jsx'
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
const LovePrismPage        = lazy(() => import('./components/LovePrismPage.jsx'))
const CaroleTuesdayPage    = lazy(() => import('./components/CaroleTuesdayPage.jsx'))
const BunnyGirlPage        = lazy(() => import('./components/BunnyGirlPage.jsx'))
const RentAGirlfriendPage  = lazy(() => import('./components/RentAGirlfriendPage.jsx'))
const BcPage          = lazy(() => import('./components/BcPage.jsx'))
const MhaPage         = lazy(() => import('./components/MhaPage.jsx'))
const FireForcePage   = lazy(() => import('./components/FireForcePage.jsx'))
const BlueLockPage    = lazy(() => import('./components/BlueLockPage.jsx'))
const MonUniversPage  = lazy(() => import('./components/MonUniversPage.jsx'))
const OnePiecePage    = lazy(() => import('./components/OnePiecePage.jsx'))
const FamilyTree3D    = lazy(() => import('./components/FamilyTree3D.jsx'))
const BlobUploadPage  = lazy(() => import('./components/BlobUploadPage.jsx'))
const FeedPage        = lazy(() => import('./components/FeedPage.jsx'))
const PostThreadPage  = lazy(() => import('./components/PostThreadPage.jsx'))
const FeedSearchPage  = lazy(() => import('./components/FeedSearchPage.jsx'))
const BookmarksPage   = lazy(() => import('./components/BookmarksPage.jsx'))
const ConstellationPage  = lazy(() => import('./components/ConstellationPage.jsx'))
const CrewHQPage         = lazy(() => import('./components/crew-hq/CrewHQPage.jsx'))
const DevilFruitPage     = lazy(() => import('./components/devil-fruit/DevilFruitPage.jsx'))
const BerryShop          = lazy(() => import('./components/BerryShop.jsx'))
const BramsTraitorPage   = lazy(() => import('./components/BramsTraitorPage.jsx'))
const StaffPanel         = lazy(() => import('./components/StaffPanel.jsx'))
const BlindTestPage      = lazy(() => import('./components/BlindTestPage.jsx'))
const BlindTestLeaderboard = lazy(() => import('./components/BlindTestLeaderboard.jsx'))
const TierListPage       = lazy(() => import('./components/TierListPage.jsx'))
const TournamentHubPage  = lazy(() => import('./components/TournamentHubPage.jsx'))
const TournamentPage     = lazy(() => import('./components/TournamentPage.jsx'))
const TournamentRoomPage = lazy(() => import('./components/TournamentRoomPage.jsx'))
const UndercoverPage     = lazy(() => import('./components/UndercoverPage.jsx'))
const AkinatorPage       = lazy(() => import('./components/AkinatorPage.jsx'))
const ProfilePageYonkou  = lazy(() => import('./components/ProfilePageYonkou.jsx'))
const FriendsPage        = lazy(() => import('./components/FriendsPage.jsx'))
const MessagesPage       = lazy(() => import('./components/MessagesPage.jsx'))
const BotFeatures        = lazy(() => import('./components/BotFeatures.jsx'))
const Quiz               = lazy(() => import('./components/Quiz.jsx'))
const HallOfFame         = lazy(() => import('./components/HallOfFame.jsx'))
const EquipageSection    = lazy(() => import('./components/EquipageSection.jsx'))
const NousSoutenir       = lazy(() => import('./components/NousSoutenir.jsx'))
const Leaderboard        = lazy(() => import('./components/Leaderboard.jsx'))
const Contact            = lazy(() => import('./components/Contact.jsx'))
const JoinCTA            = lazy(() => import('./components/JoinCTA.jsx'))
const AkainuGame         = lazy(() => import('./components/AkainuGame.jsx'))

function DeferredSection({ children, minHeight = 420, style = {}, threshold = 0.18, id }) {
  const [ref, inView] = useInView(threshold)
  // id sur le wrapper (toujours présent) → les ancres de scroll (#classement…)
  // fonctionnent même avant que la section deferred ne soit rendue.
  return (
    <div ref={ref} id={id} style={{ minHeight, ...style }}>
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
  const { activeBg } = useOpeningBg()
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

  // Si un fond d'opening est équipé, on laisse la place au fond global équipé
  // (EquippedOpeningBackground) au lieu de la vidéo AMV.
  if (activeBg) return null

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
  const navigate = useNavigate()
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
  const [lovePrismOpen,    setLovePrismOpen]     = useState(false)
  const [caroleTuesdayOpen,setCaroleTuesdayOpen] = useState(false)
  const [bunnyGirlOpen,    setBunnyGirlOpen]     = useState(false)
  const [rentGirlOpen,     setRentGirlOpen]      = useState(false)
  const [bcOpen,           setBcOpen]            = useState(false)
  const [mhaOpen,          setMhaOpen]           = useState(false)
  const [fireforcOpen,     setFireforcOpen]      = useState(false)
  const [bluelockOpen,     setBluelockOpen]      = useState(false)
  const [monUniversOpen,   setMonUniversOpen]    = useState(false)
  const [returnToMon,      setReturnToMon]       = useState(false)
  const [treeOpen,         setTreeOpen]          = useState(false)
  const [uploadOpen,       setUploadOpen]        = useState(false)

  // Handlers for opening pages from Mon Univers (set return flag so page close goes back to dashboard)
  const onOpenAotFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setAotOpen(true) }
  const onOpenFireforceFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setFireforcOpen(true) }
  const onOpenBluelockFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setBluelockOpen(true) }
  const onOpenBunnyGirlFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setBunnyGirlOpen(true) }
  const onOpenRentGirlfriendFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setRentGirlOpen(true) }
  const onOpenTpnFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setTpnOpen(true) }
  const onOpenDrstoneFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setDrstoneOpen(true) }
  const onOpenJjkFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setJjkOpen(true) }
  const onOpenKingdomFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setKingdomOpen(true) }
  const onOpenKnyFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setKnyOpen(true) }
  const onOpenNntFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setNntOpen(true) }
  const onOpenSlFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setSlOpen(true) }
  const onOpenDbsFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setDbsOpen(true) }
  const onOpenVioletFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setVioletOpen(true) }
  const onOpenVivyFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setVivyOpen(true) }
  const onOpenLovePrismFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setLovePrismOpen(true) }
  const onOpenCaroleTuesdayFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setCaroleTuesdayOpen(true) }
  const onOpenBcFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setBcOpen(true) }
  const onOpenMhaFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setMhaOpen(true) }
  const onOpenOnepieceFromMon = () => { setMonUniversOpen(false); setReturnToMon(true); setOnepieceOpen(true) }

  // Ferme tous les overlays anime/média quand on change de page (sinon un overlay
  // ouvert reste affiché par-dessus la nouvelle route — ex. DBS par-dessus Messages —
  // et donne l'impression qu'il faut actualiser).
  const location = useLocation()
  useEffect(() => {
    setScansOpen(false); setOnepieceOpen(false); setEncyclopedieOpen(false); setAnimeHubOpen(false)
    setTpnOpen(false); setDrstoneOpen(false); setJjkOpen(false); setKingdomOpen(false)
    setAotOpen(false); setKnyOpen(false); setNntOpen(false); setSlOpen(false); setDbsOpen(false)
    setVioletOpen(false); setVivyOpen(false); setLovePrismOpen(false); setCaroleTuesdayOpen(false); setBunnyGirlOpen(false); setRentGirlOpen(false); setBcOpen(false); setMhaOpen(false)
    setFireforcOpen(false); setBluelockOpen(false); setMonUniversOpen(false); setTreeOpen(false); setUploadOpen(false)
  }, [location.pathname])

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
    const fnLovePrism = () => setLovePrismOpen(true)
    const fnCaroleTuesday = () => setCaroleTuesdayOpen(true)
    const fnBunnyGirl = () => setBunnyGirlOpen(true)
    const fnRentGirl  = () => setRentGirlOpen(true)
    const fnBc         = () => setBcOpen(true)
    const fnMha        = () => setMhaOpen(true)
    const fnFireforce  = () => setFireforcOpen(true)
    const fnBluelock   = () => setBluelockOpen(true)
    const fnMonUnivers = () => setMonUniversOpen(true)
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
    document.addEventListener('open-love-prism',         fnLovePrism)
    document.addEventListener('open-carole-tuesday',     fnCaroleTuesday)
    document.addEventListener('open-bunny-girl',         fnBunnyGirl)
    document.addEventListener('open-rent-girlfriend',    fnRentGirl)
    document.addEventListener('open-bc',           fnBc)
    document.addEventListener('open-mha',          fnMha)
    document.addEventListener('open-fireforce',    fnFireforce)
    document.addEventListener('open-bluelock',     fnBluelock)
    document.addEventListener('open-mon-univers',  fnMonUnivers)
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
      document.removeEventListener('open-love-prism',         fnLovePrism)
      document.removeEventListener('open-carole-tuesday',     fnCaroleTuesday)
      document.removeEventListener('open-bunny-girl',         fnBunnyGirl)
      document.removeEventListener('open-rent-girlfriend',    fnRentGirl)
      document.removeEventListener('open-bc',           fnBc)
      document.removeEventListener('open-mha',          fnMha)
      document.removeEventListener('open-fireforce',    fnFireforce)
      document.removeEventListener('open-bluelock',     fnBluelock)
      document.removeEventListener('open-mon-univers',  fnMonUnivers)
      document.removeEventListener('open-tree',         fnTree)
      document.removeEventListener('open-upload',       fnUpload)
    }
  }, [])

  const mediaOverlayOpen = scansOpen || animeHubOpen || tpnOpen || drstoneOpen || jjkOpen || kingdomOpen || aotOpen || knyOpen || nntOpen || slOpen || dbsOpen || violetOpen || vivyOpen || lovePrismOpen || caroleTuesdayOpen || bunnyGirlOpen || rentGirlOpen || bcOpen || mhaOpen || fireforcOpen || bluelockOpen || monUniversOpen
  const immersiveOverlayOpen = mediaOverlayOpen || encyclopedieOpen || treeOpen || uploadOpen

  const mainContent = (
    <>
      <WelcomeAnimation />
      <AMVBackground />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, background: 'rgba(4,7,10,0.58)', pointerEvents: 'none' }} />

      {/* Hero transparent → l'AMV en fond reste visible. Le reste des sections
          a un fond opaque #08090D (corrige le débordement footer sans masquer l'AMV). */}
      <div style={{ position: 'relative', zIndex: 2, isolation: 'isolate' }}>
        <Navbar />
        <Hero />
        {/* Semi-transparent → l'AMV en fond reste visible pendant tout le scroll de la home */}
        <div style={{ background: 'rgba(8,9,13,0.82)' }}>
          <QuoteSection />
          <Ranks />
          <DeferredSection minHeight={760}><BotFeatures /></DeferredSection>
          <DeferredSection minHeight={520}><HallOfFame /></DeferredSection>
          <DeferredSection minHeight={520}><EquipageSection /></DeferredSection>
          <DeferredSection minHeight={480}><NousSoutenir /></DeferredSection>
          <DeferredSection id="classement" minHeight={540}><Leaderboard /></DeferredSection>
          <DeferredSection minHeight={460}><Contact /></DeferredSection>
          <DeferredSection minHeight={420}><JoinCTA /></DeferredSection>
          <Footer />
          <DeferredSection minHeight={0}><AkainuGame /></DeferredSection>
        </div>
      </div>

      <ThemeToggle />
      <AIChatWidget hidden={mediaOverlayOpen || encyclopedieOpen} />

    </>
  )

  return (
    <ThemeProvider>
      <OpeningBgProvider>
      <SocialProvider>
      <CallProvider>
      <GlobalStyles />
      <EquippedOpeningBackground />
      <NotificationToast />
      <CallOverlay />
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

        {/* Le Fil (réseau social) — remplace Wiki/Théories */}
        <Route path="/fil"            element={<PageLayout><FeedPage /></PageLayout>} />
        <Route path="/fil/recherche"  element={<PageLayout><FeedSearchPage /></PageLayout>} />
        <Route path="/fil/signets"    element={<PageLayout><BookmarksPage /></PageLayout>} />
        <Route path="/fil/:postId"    element={<PageLayout><PostThreadPage /></PageLayout>} />
        {/* Redirections des anciens liens Wiki/Théories vers le Fil */}
        <Route path="/wiki"           element={<Navigate to="/fil" replace />} />
        <Route path="/wiki/*"         element={<Navigate to="/fil" replace />} />
        <Route path="/theories"       element={<Navigate to="/fil" replace />} />
        <Route path="/theories/*"     element={<Navigate to="/fil" replace />} />

        {/* Constellation Équipages */}
        <Route path="/equipage" element={<PageLayout><ConstellationPage /></PageLayout>} />
        <Route path="/equipage/:crewId" element={<CrewHQPage />} />

        {/* Encyclopédie Fruits du Démon */}
        <Route path="/fruits-du-demon" element={<PageLayout><DevilFruitPage /></PageLayout>} />

        {/* Boutique Berry connectee Discord */}
        <Route path="/boutique" element={<PageLayout><BerryShop /></PageLayout>} />
        <Route path="/shop" element={<PageLayout><BerryShop /></PageLayout>} />

        {/* Systeme social — amis & messagerie */}
        <Route path="/amis" element={<FriendsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:conversationId" element={<MessagesPage />} />

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

        {/* Tournoi */}
        <Route path="/tournoi"       element={<PageLayout><TournamentHubPage /></PageLayout>} />
        <Route path="/tournoi/salon" element={<PageLayout><TournamentRoomPage /></PageLayout>} />
        <Route path="/undercover"    element={<PageLayout><UndercoverPage /></PageLayout>} />
        <Route path="/tournoi/ost" element={<PageLayout><TournamentPage tournamentId="ost" /></PageLayout>} />
        <Route path="/tournoi-ost" element={<PageLayout><TournamentPage tournamentId="ost" /></PageLayout>} />
        <Route path="/tournoi/openings" element={<PageLayout><TournamentPage tournamentId="opening" /></PageLayout>} />
        <Route path="/tournoi/opening" element={<PageLayout><TournamentPage tournamentId="opening" /></PageLayout>} />
        <Route path="/tournoi/endings" element={<PageLayout><TournamentPage tournamentId="ending" /></PageLayout>} />
        <Route path="/tournoi/ending" element={<PageLayout><TournamentPage tournamentId="ending" /></PageLayout>} />
        <Route path="/akinator"    element={<PageLayout><AkinatorPage      /></PageLayout>} />

        {/* Profil Yonkou — Next-Gen 3D */}
        <Route path="/profil-yonkou" element={<ProfilePageYonkou />} />

        {/* Homepage */}
        <Route path="/*" element={mainContent} />
      </Routes>

      {/* ── Overlays globaux — disponibles sur toutes les routes ── */}
      {animeHubOpen && (
        isAuthenticated ? (
          <AnimeHub
            onClose={() => { setAnimeHubOpen(false); navigate('/') }}
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
            onOpenLovePrism={() => { setAnimeHubOpen(false); setLovePrismOpen(true) }}
            onOpenCaroleTuesday={() => { setAnimeHubOpen(false); setCaroleTuesdayOpen(true) }}
            onOpenBunnyGirl={() => { setAnimeHubOpen(false); setBunnyGirlOpen(true) }}
            onOpenRentGirlfriend={() => { setAnimeHubOpen(false); setRentGirlOpen(true) }}
            onOpenBc={() => { setAnimeHubOpen(false); setBcOpen(true) }}
            onOpenMha={() => { setAnimeHubOpen(false); setMhaOpen(true) }}
            onOpenFireforce={() => { setAnimeHubOpen(false); setFireforcOpen(true) }}
            onOpenBluelock={() => { setAnimeHubOpen(false); setBluelockOpen(true) }}
            onOpenMonUnivers={() => { setAnimeHubOpen(false); setMonUniversOpen(true) }}
          />
        ) : (
          <AuthGuard onClose={() => setAnimeHubOpen(false)} feature="les animés & scans" />
        )
      )}
      {onepieceOpen && <OnePiecePage onClose={() => { setOnepieceOpen(false); setAnimeHubOpen(true) }} />}
      {tpnOpen     && <TpnPage     onClose={() => { setTpnOpen(false);     setAnimeHubOpen(true) }} />}
      {drstoneOpen && <DrStonePage onClose={() => { setDrstoneOpen(false); setAnimeHubOpen(true) }} />}
      {jjkOpen     && <JjkPage     onClose={() => { setJjkOpen(false);     setAnimeHubOpen(true) }} />}
      {kingdomOpen && <KingdomPage onClose={() => { setKingdomOpen(false); setAnimeHubOpen(true) }} />}
      {aotOpen     && <AotPage     onClose={() => { setAotOpen(false);     setAnimeHubOpen(true) }} />}
      {knyOpen     && <KnyPage     onClose={() => { setKnyOpen(false);     setAnimeHubOpen(true) }} />}
      {nntOpen     && <NntPage     onClose={() => { setNntOpen(false);     setAnimeHubOpen(true) }} />}
      {slOpen      && <SlPage      onClose={() => { setSlOpen(false);      setAnimeHubOpen(true) }} />}
      {dbsOpen     && <DbsPage     onClose={() => { setDbsOpen(false);     setAnimeHubOpen(true) }} />}
      {violetOpen  && <VioletEvergardenPage onClose={() => { setVioletOpen(false); setAnimeHubOpen(true) }} />}
      {vivyOpen    && <VivyPage             onClose={() => { setVivyOpen(false);   setAnimeHubOpen(true) }} />}
      {lovePrismOpen && <LovePrismPage      onClose={() => { setLovePrismOpen(false); setAnimeHubOpen(true) }} />}
      {caroleTuesdayOpen && <CaroleTuesdayPage onClose={() => { setCaroleTuesdayOpen(false); setAnimeHubOpen(true) }} />}
      {bunnyGirlOpen && <BunnyGirlPage onClose={() => { setBunnyGirlOpen(false); setAnimeHubOpen(true) }} />}
      {rentGirlOpen && <RentAGirlfriendPage onClose={() => { setRentGirlOpen(false); setAnimeHubOpen(true) }} />}
      {bcOpen        && <BcPage        onClose={() => { setBcOpen(false);       setAnimeHubOpen(true) }} />}
      {mhaOpen       && <MhaPage       onClose={() => { setMhaOpen(false);      setAnimeHubOpen(true) }} />}
      {fireforcOpen  && <FireForcePage onClose={() => { setFireforcOpen(false); if (returnToMon) { setReturnToMon(false); setMonUniversOpen(true) } else setAnimeHubOpen(true) }} />}
      {bluelockOpen  && <BlueLockPage  onClose={() => { setBluelockOpen(false); if (returnToMon) { setReturnToMon(false); setMonUniversOpen(true) } else setAnimeHubOpen(true) }} />}
      {monUniversOpen && (
        <MonUniversPage 
          onClose={() => setMonUniversOpen(false)}
          onOpenAot={onOpenAotFromMon} onOpenFireforce={onOpenFireforceFromMon} onOpenBluelock={onOpenBluelockFromMon}
          onOpenBunnyGirl={onOpenBunnyGirlFromMon} onOpenRentGirlfriend={onOpenRentGirlfriendFromMon}
          onOpenTpn={onOpenTpnFromMon} onOpenDrstone={onOpenDrstoneFromMon} onOpenJjk={onOpenJjkFromMon}
          onOpenKingdom={onOpenKingdomFromMon} onOpenKny={onOpenKnyFromMon} onOpenNnt={onOpenNntFromMon}
          onOpenSl={onOpenSlFromMon} onOpenDbs={onOpenDbsFromMon} onOpenViolet={onOpenVioletFromMon}
          onOpenVivy={onOpenVivyFromMon} onOpenLovePrism={onOpenLovePrismFromMon} onOpenCaroleTuesday={onOpenCaroleTuesdayFromMon}
          onOpenBc={onOpenBcFromMon} onOpenMha={onOpenMhaFromMon} onOpenOnepiece={onOpenOnepieceFromMon}
        />
      )}
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
      </CallProvider>
      </SocialProvider>
      </OpeningBgProvider>
    </ThemeProvider>
  )
}
