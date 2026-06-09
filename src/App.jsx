import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { Routes, Route, useNavigate, Navigate, useLocation, useParams } from 'react-router-dom'
import { lazyWithReload } from './lib/lazyWithReload.js'
import GlobalStyles from './components/GlobalStyles.jsx'
import { GlobalCursorLayer } from './components/CursorShop.jsx'
import { GlobalTrailLayer } from './components/TrailShop.jsx'
import GiftInbox from './components/GiftInbox.jsx'
import ParchmentMode from './components/ParchmentMode.jsx'
import RouteSEO from './components/RouteSEO.jsx'
import FunFX from './components/FunFX.jsx'
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
import ComingSoon from './components/ComingSoon.jsx'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import Ranks from './components/Ranks.jsx'
import AIChatWidget from './components/AIChatWidget.jsx'
import Footer from './components/Footer.jsx'
import QuoteSection from './components/QuoteSection.jsx'
import { useInView } from './hooks/useInView.js'

// Lazy — chargés uniquement quand ouverts
const ProfilePage     = lazyWithReload(() => import('./components/ProfilePage.jsx'))
const EncyclopediePage= lazyWithReload(() => import('./components/EncyclopediePage.jsx'))
const ScansPage       = lazyWithReload(() => import('./components/ScansPage.jsx'))
const AnimeHub        = lazyWithReload(() => import('./components/AnimeHub.jsx'))
const TpnPage         = lazyWithReload(() => import('./components/TpnPage.jsx'))
const DrStonePage     = lazyWithReload(() => import('./components/DrStonePage.jsx'))
const JjkPage         = lazyWithReload(() => import('./components/JjkPage.jsx'))
const KingdomPage     = lazyWithReload(() => import('./components/KingdomPage.jsx'))
const AotPage         = lazyWithReload(() => import('./components/AotPage.jsx'))
const KnyPage         = lazyWithReload(() => import('./components/KnyPage.jsx'))
const NntPage         = lazyWithReload(() => import('./components/NntPage.jsx'))
const SlPage          = lazyWithReload(() => import('./components/SlPage.jsx'))
const DbsPage         = lazyWithReload(() => import('./components/DbsPage.jsx'))
const VioletEvergardenPage = lazyWithReload(() => import('./components/VioletEvergardenPage.jsx'))
const YourLiePage     = lazyWithReload(() => import('./components/YourLiePage.jsx'))
const VivyPage             = lazyWithReload(() => import('./components/VivyPage.jsx'))
const DomesticNaKanojoPage = lazyWithReload(() => import('./components/DomesticNaKanojoPage.jsx'))
const KoiAmeagariPage      = lazyWithReload(() => import('./components/KoiAmeagariPage.jsx'))
const LovePrismPage        = lazyWithReload(() => import('./components/LovePrismPage.jsx'))
const CaroleTuesdayPage    = lazyWithReload(() => import('./components/CaroleTuesdayPage.jsx'))
const BunnyGirlPage        = lazyWithReload(() => import('./components/BunnyGirlPage.jsx'))
const RentAGirlfriendPage  = lazyWithReload(() => import('./components/RentAGirlfriendPage.jsx'))
const BcPage          = lazyWithReload(() => import('./components/BcPage.jsx'))
const MhaPage         = lazyWithReload(() => import('./components/MhaPage.jsx'))
const FireForcePage   = lazyWithReload(() => import('./components/FireForcePage.jsx'))
const BlueLockPage    = lazyWithReload(() => import('./components/BlueLockPage.jsx'))
const FateZeroPage    = lazyWithReload(() => import('./components/FateZeroPage.jsx'))
const YourNamePage    = lazyWithReload(() => import('./components/YourNamePage.jsx'))
const FilmPage        = lazyWithReload(() => import('./components/FilmPage.jsx'))
const MonUniversPage  = lazyWithReload(() => import('./components/MonUniversPage.jsx'))
const OnePiecePage    = lazyWithReload(() => import('./components/OnePiecePage.jsx'))
const FamilyTree3D    = lazyWithReload(() => import('./components/FamilyTree3D.jsx'))
const BlobUploadPage  = lazyWithReload(() => import('./components/BlobUploadPage.jsx'))
const FeedPage        = lazyWithReload(() => import('./components/FeedPage.jsx'))
const PostThreadPage  = lazyWithReload(() => import('./components/PostThreadPage.jsx'))
const FeedSearchPage  = lazyWithReload(() => import('./components/FeedSearchPage.jsx'))
const BookmarksPage   = lazyWithReload(() => import('./components/BookmarksPage.jsx'))
const ConstellationPage  = lazyWithReload(() => import('./components/ConstellationPage.jsx'))
const CrewHQPage         = lazyWithReload(() => import('./components/crew-hq/CrewHQPage.jsx'))
const DevilFruitPage     = lazyWithReload(() => import('./components/devil-fruit/DevilFruitPage.jsx'))
const BerryShop          = lazyWithReload(() => import('./components/BerryShop.jsx'))
const BramsTraitorPage   = lazyWithReload(() => import('./components/BramsTraitorPage.jsx'))
const StaffPanel         = lazyWithReload(() => import('./components/StaffPanel.jsx'))
const BlindTestPage      = lazyWithReload(() => import('./components/BlindTestPage.jsx'))
const BlindTestLeaderboard = lazyWithReload(() => import('./components/BlindTestLeaderboard.jsx'))
const TierListPage       = lazyWithReload(() => import('./components/TierListPage.jsx'))
const TournamentHubPage  = lazyWithReload(() => import('./components/TournamentHubPage.jsx'))
const TournamentPage     = lazyWithReload(() => import('./components/TournamentPage.jsx'))
const TournamentRoomPage = lazyWithReload(() => import('./components/TournamentRoomPage.jsx'))
const UndercoverPage     = lazyWithReload(() => import('./components/UndercoverPage.jsx'))
const AkinatorPage       = lazyWithReload(() => import('./components/AkinatorPage.jsx'))
const MangaReaderPage    = lazyWithReload(() => import('./components/MangaReaderPage.jsx'))

// Registre des scans manga (hors One Piece qui a sa propre page ScansPage).
const MANGA_REGISTRY = {
  aot:             { title: "L'Attaque des Titans",     color: '#7f1d1d' },
  'solo-leveling': { title: 'Solo Leveling',            color: '#1976d2' },
  jjk:             { title: 'Jujutsu Kaisen',           color: '#9b59b6' },
  kny:             { title: 'Demon Slayer',             color: '#16a34a' },
  'blue-lock':     { title: 'Blue Lock',                color: '#1565c0' },
  'black-clover':  { title: 'Black Clover',             color: '#d97706' },
  'fire-force':    { title: 'Fire Force',               color: '#ea580c' },
  'dr-stone':      { title: 'Dr. Stone',                color: '#16a34a' },
  kingdom:         { title: 'Kingdom',                  color: '#b45309' },
  mha:             { title: 'My Hero Academia',         color: '#1e88e5' },
  nnt:             { title: 'Nanatsu no Taizai',        color: '#dc2626' },
  dbs:             { title: 'Dragon Ball Super',        color: '#f97316' },
  tpn:             { title: 'The Promised Neverland',   color: '#6c5ce7' },
}

function AuthLoadingScreen({ zIndex = 500 }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex,
      background: '#0b0c0e',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 36, height: 36,
        border: '3px solid rgba(212,160,23,0.2)',
        borderTopColor: '#d4a017',
        borderRadius: '50%',
        animation: 'authSpin 0.75s linear infinite',
      }} />
      <style>{`@keyframes authSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function MangaRoute() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, loading } = useAuth()
  const m = MANGA_REGISTRY[slug] || { title: slug, color: '#8b5cf6' }

  if (loading) return <AuthLoadingScreen />
  if (!isAuthenticated) return <AuthGuard onClose={() => navigate('/')} feature="les scans manga" />

  return <MangaReaderPage slug={slug} title={m.title} color={m.color} onClose={() => navigate('/')} />
}
const ProfilePageYonkou  = lazyWithReload(() => import('./components/ProfilePageYonkou.jsx'))
const FriendsPage        = lazyWithReload(() => import('./components/FriendsPage.jsx'))
const MessagesPage       = lazyWithReload(() => import('./components/MessagesPage.jsx'))
const BotFeatures        = lazyWithReload(() => import('./components/BotFeatures.jsx'))
const Quiz               = lazyWithReload(() => import('./components/Quiz.jsx'))
const HallOfFame         = lazyWithReload(() => import('./components/HallOfFame.jsx'))
const EquipageSection    = lazyWithReload(() => import('./components/EquipageSection.jsx'))
const NousSoutenir       = lazyWithReload(() => import('./components/NousSoutenir.jsx'))
const Leaderboard        = lazyWithReload(() => import('./components/Leaderboard.jsx'))
const Contact            = lazyWithReload(() => import('./components/Contact.jsx'))
const JoinCTA            = lazyWithReload(() => import('./components/JoinCTA.jsx'))
const AkainuGame         = lazyWithReload(() => import('./components/AkainuGame.jsx'))

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
function AMVBackground({ hidden = false }) {
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

  const bgLayerStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
    background: '#05070a',
    contain: 'layout paint size',
    isolation: 'isolate',
  }

  // Si un fond d'opening est équipé, on laisse la place au fond global équipé
  // (EquippedOpeningBackground) au lieu de la vidéo AMV.
  if (activeBg) return null

  // Overlay anime/média ouvert → on démonte la vidéo AMV (sinon elle continue de
  // jouer EN DESSOUS et le navigateur affiche ses contrôles média par-dessus le
  // lecteur d'anime : -10s, pochette… = la superposition signalée).
  if (hidden) return <div aria-hidden style={bgLayerStyle} />

  if (!enabled) {
    return <div aria-hidden style={bgLayerStyle} />
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
      <div aria-hidden style={bgLayerStyle}>
        <video
          ref={videoRef}
          autoPlay muted loop playsInline
          preload="metadata"
          onLoadedMetadata={e => { e.target.currentTime = 25 }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', maxWidth: 'none', objectFit: 'cover', pointerEvents: 'none', opacity: 0.35 }}
        >
          <source src="/bg-video.mp4" type="video/mp4" />
        </video>
      </div>

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
    <div style={{ minHeight: '100vh', background: '#0b0c0e', position: 'relative', isolation: 'isolate', overflowX: 'hidden' }}>
      <WelcomeAnimation />
      <Navbar />
      {children}
    </div>
  )
}

export default function App() {
  const { isAuthenticated, loading } = useAuth()
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
  const [yourLieOpen,      setYourLieOpen]       = useState(false)
  const [vivyOpen,         setVivyOpen]          = useState(false)
  const [domesticOpen,     setDomesticOpen]      = useState(false)
  const [koiOpen,          setKoiOpen]           = useState(false)
  const [lovePrismOpen,    setLovePrismOpen]     = useState(false)
  const [caroleTuesdayOpen,setCaroleTuesdayOpen] = useState(false)
  const [bunnyGirlOpen,    setBunnyGirlOpen]     = useState(false)
  const [rentGirlOpen,     setRentGirlOpen]      = useState(false)
  const [bcOpen,           setBcOpen]            = useState(false)
  const [mhaOpen,          setMhaOpen]           = useState(false)
  const [fireforcOpen,     setFireforcOpen]      = useState(false)
  const [bluelockOpen,     setBluelockOpen]      = useState(false)
  const [fateZeroOpen,     setFateZeroOpen]      = useState(false)
  const [yourNameOpen,     setYourNameOpen]      = useState(false)
  const [bubbleOpen,       setBubbleOpen]        = useState(false)
  const [rezeOpen,         setRezeOpen]          = useState(false)
  const [monUniversOpen,   setMonUniversOpen]    = useState(false)
  const [returnToMon,      setReturnToMon]       = useState(false)
  const [treeOpen,         setTreeOpen]          = useState(false)
  const [uploadOpen,       setUploadOpen]        = useState(false)

  // Ouverture d'une page depuis Mon Univers : on mémorise le retour vers le dashboard
  // puis on navigue vers l'URL de l'anime (l'effet URL→overlay ouvre la page).
  const openFromMon = (slug) => () => { setReturnToMon(true); navigate(`/animes-scan/${slug}`) }
  const onOpenAotFromMon = openFromMon('aot')
  const onOpenFireforceFromMon = openFromMon('fireforce')
  const onOpenBluelockFromMon = openFromMon('bluelock')
  const onOpenFateZeroFromMon = openFromMon('fate-zero')
  const onOpenBunnyGirlFromMon = openFromMon('bunny-girl')
  const onOpenRentGirlfriendFromMon = openFromMon('rent-girlfriend')
  const onOpenTpnFromMon = openFromMon('tpn')
  const onOpenDrstoneFromMon = openFromMon('drstone')
  const onOpenJjkFromMon = openFromMon('jjk')
  const onOpenKingdomFromMon = openFromMon('kingdom')
  const onOpenKnyFromMon = openFromMon('kny')
  const onOpenNntFromMon = openFromMon('nnt')
  const onOpenSlFromMon = openFromMon('sl')
  const onOpenDbsFromMon = openFromMon('dbs')
  const onOpenVioletFromMon = openFromMon('violet-evergarden')
  const onOpenYourLieFromMon = openFromMon('your-lie')
  const onOpenVivyFromMon = openFromMon('vivy')
  const onOpenDomesticFromMon = openFromMon('domestic-na-kanojo')
  const onOpenKoiFromMon = openFromMon('koi-ameagari')
  const onOpenLovePrismFromMon = openFromMon('love-prism')
  const onOpenCaroleTuesdayFromMon = openFromMon('carole-tuesday')
  const onOpenBcFromMon = openFromMon('bc')
  const onOpenMhaFromMon = openFromMon('mha')
  const onOpenOnepieceFromMon = openFromMon('onepiece')

  // Fermeture d'une page média : si on y est arrivé depuis Mon Univers, on y retourne ;
  // sinon on retombe sur le Hub Animé (jamais sur le hero/home). Tout passe par l'URL.
  const closeMedia = () => {
    if (returnToMon) { setReturnToMon(false); navigate('/animes-scan/mon-univers') }
    else navigate('/animes-scan')
  }

  // Ferme tous les overlays anime/média quand on change de page (sinon un overlay
  // ouvert reste affiché par-dessus la nouvelle route — ex. DBS par-dessus Messages —
  // et donne l'impression qu'il faut actualiser).
  const location = useLocation()
  const closeAllOverlays = useCallback(() => {
    setScansOpen(false); setOnepieceOpen(false); setEncyclopedieOpen(false); setAnimeHubOpen(false)
    setTpnOpen(false); setDrstoneOpen(false); setJjkOpen(false); setKingdomOpen(false)
    setAotOpen(false); setKnyOpen(false); setNntOpen(false); setSlOpen(false); setDbsOpen(false)
    setVioletOpen(false); setVivyOpen(false); setDomesticOpen(false); setKoiOpen(false); setLovePrismOpen(false); setCaroleTuesdayOpen(false); setBunnyGirlOpen(false); setRentGirlOpen(false); setBcOpen(false); setMhaOpen(false)
    setFireforcOpen(false); setBluelockOpen(false); setFateZeroOpen(false); setYourNameOpen(false); setBubbleOpen(false); setRezeOpen(false); setYourLieOpen(false); setMonUniversOpen(false); setTreeOpen(false); setUploadOpen(false)
  }, [])

  // Slug d'URL d'un anime → setter d'overlay correspondant
  const ANIME_SETTERS = {
    onepiece: setOnepieceOpen, tpn: setTpnOpen, drstone: setDrstoneOpen, jjk: setJjkOpen,
    kingdom: setKingdomOpen, aot: setAotOpen, kny: setKnyOpen, nnt: setNntOpen, sl: setSlOpen,
    dbs: setDbsOpen, 'violet-evergarden': setVioletOpen, vivy: setVivyOpen, 'domestic-na-kanojo': setDomesticOpen, 'koi-ameagari': setKoiOpen, 'love-prism': setLovePrismOpen,
    'carole-tuesday': setCaroleTuesdayOpen, 'bunny-girl': setBunnyGirlOpen, 'rent-girlfriend': setRentGirlOpen,
    bc: setBcOpen, mha: setMhaOpen, fireforce: setFireforcOpen, bluelock: setBluelockOpen,
    'fate-zero': setFateZeroOpen, 'your-name': setYourNameOpen, 'your-lie': setYourLieOpen,
    bubble: setBubbleOpen, reze: setRezeOpen,
  }

  // ── URL = source de vérité des overlays anime/scan ──
  // /animes-scan → Hub · /animes-scan/<id> → page anime · /animes-scan/mon-univers
  // · /scans → lecteur de scans. Reload, partage de lien et bouton retour marchent.
  useEffect(() => {
    const path = location.pathname
    if (path === '/scans') { closeAllOverlays(); setScansOpen(true); return }
    if (path === '/animes-scan' || path.startsWith('/animes-scan/')) {
      const sub = decodeURIComponent(path.replace(/^\/animes-scan\/?/, '')).replace(/\/+$/, '')
      closeAllOverlays()
      if (!sub) { setAnimeHubOpen(true); setReturnToMon(false) }
      else if (sub === 'mon-univers') setMonUniversOpen(true)
      else if (ANIME_SETTERS[sub]) ANIME_SETTERS[sub](true)
      else { setAnimeHubOpen(true); setReturnToMon(false) }
      return
    }
    closeAllOverlays()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Les événements "open-*" (Navbar, cartes…) naviguent désormais vers l'URL dédiée
  // (sauf encyclopédie/arbre/upload qui restent de simples overlays sans URL).
  useEffect(() => {
    const go = (to) => () => navigate(to)
    const handlers = {
      'open-scans':            go('/scans'),
      'open-anime-hub':        go('/animes-scan'),
      'open-mon-univers':      go('/animes-scan/mon-univers'),
      'open-tpn':              go('/animes-scan/tpn'),
      'open-drstone':          go('/animes-scan/drstone'),
      'open-jjk':              go('/animes-scan/jjk'),
      'open-kingdom':          go('/animes-scan/kingdom'),
      'open-aot':              go('/animes-scan/aot'),
      'open-kny':              go('/animes-scan/kny'),
      'open-nnt':              go('/animes-scan/nnt'),
      'open-sl':               go('/animes-scan/sl'),
      'open-dbs':              go('/animes-scan/dbs'),
      'open-violet-evergarden':go('/animes-scan/violet-evergarden'),
      'open-vivy':             go('/animes-scan/vivy'),
      'open-domestic-na-kanojo': go('/animes-scan/domestic-na-kanojo'),
      'open-koi-ameagari':     go('/animes-scan/koi-ameagari'),
      'open-love-prism':       go('/animes-scan/love-prism'),
      'open-carole-tuesday':   go('/animes-scan/carole-tuesday'),
      'open-bunny-girl':       go('/animes-scan/bunny-girl'),
      'open-rent-girlfriend':  go('/animes-scan/rent-girlfriend'),
      'open-bc':               go('/animes-scan/bc'),
      'open-mha':              go('/animes-scan/mha'),
      'open-fireforce':        go('/animes-scan/fireforce'),
      'open-bluelock':         go('/animes-scan/bluelock'),
      'open-your-lie':         go('/animes-scan/your-lie'),
      'open-encyclopedie':     () => setEncyclopedieOpen(true),
      'open-tree':             () => setTreeOpen(true),
      'open-upload':           () => setUploadOpen(true),
    }
    const entries = Object.entries(handlers)
    entries.forEach(([ev, fn]) => document.addEventListener(ev, fn))
    return () => entries.forEach(([ev, fn]) => document.removeEventListener(ev, fn))
  }, [navigate])

  const mediaOverlayOpen = scansOpen || onepieceOpen || animeHubOpen || tpnOpen || drstoneOpen || jjkOpen || kingdomOpen || aotOpen || knyOpen || nntOpen || slOpen || dbsOpen || violetOpen || vivyOpen || domesticOpen || koiOpen || lovePrismOpen || caroleTuesdayOpen || bunnyGirlOpen || rentGirlOpen || bcOpen || mhaOpen || fireforcOpen || bluelockOpen || fateZeroOpen || yourNameOpen || bubbleOpen || rezeOpen || yourLieOpen || monUniversOpen

  // Pages animé/film individuelles ouvertes par URL directe (/animes-scan/<slug>).
  // Le Hub et les Scans sont déjà derrière AuthGuard, mais ces overlays-là étaient
  // rendus sans contrôle → un visiteur non connecté accédait au catalogue via le
  // lien direct. On les passe donc aussi derrière AuthGuard (gating Discord).
  const animeIndividualOpen = onepieceOpen || tpnOpen || drstoneOpen || jjkOpen || kingdomOpen || aotOpen || knyOpen || nntOpen || slOpen || dbsOpen || violetOpen || vivyOpen || domesticOpen || koiOpen || lovePrismOpen || caroleTuesdayOpen || bunnyGirlOpen || rentGirlOpen || bcOpen || mhaOpen || fireforcOpen || bluelockOpen || fateZeroOpen || yourNameOpen || bubbleOpen || rezeOpen || yourLieOpen || monUniversOpen

  const mainContent = (
    <>
      <WelcomeAnimation />
      <AMVBackground hidden={mediaOverlayOpen || encyclopedieOpen || treeOpen || uploadOpen} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, background: 'rgba(4,7,10,0.5)', pointerEvents: 'none' }} />

      {/* Hero transparent → l'AMV en fond reste visible. Le reste des sections
          a un fond opaque #08090D (corrige le débordement footer sans masquer l'AMV). */}
      <div style={{ position: 'relative', zIndex: 2, isolation: 'isolate' }}>
        <Navbar />
        {/* Home masquée quand un overlay média (animé/scan/…) est ouvert : sinon le
            Hero translucide transparaissait derrière la barre du haut ("hero derrière"). */}
        <div style={{ display: mediaOverlayOpen ? 'none' : 'block' }}>
          <Hero />
          {/* Voile UNIQUE et uniforme (0.5) sur toute la page (overlay fixe plus haut)
              → l'AMV reste visible de façon homogène partout, AUCUNE coupure entre le
              hero et les sections. Le bloc sections est donc transparent. */}
          <div style={{ background: 'transparent' }}>
            <QuoteSection />
            <Ranks />
            {/* Classement vocal remonté juste sous 'Grimpe les rangs' (était trop bas, après Equipage/Soutenir) */}
            <DeferredSection id="classement" minHeight={540}><Leaderboard /></DeferredSection>
            <DeferredSection minHeight={760}><BotFeatures /></DeferredSection>
            <DeferredSection minHeight={520}><HallOfFame /></DeferredSection>
            <DeferredSection minHeight={520}><EquipageSection /></DeferredSection>
            <DeferredSection minHeight={480}><NousSoutenir /></DeferredSection>
            <DeferredSection minHeight={460}><Contact /></DeferredSection>
            <DeferredSection minHeight={420}><JoinCTA /></DeferredSection>
            <Footer />
            <DeferredSection minHeight={0}><AkainuGame /></DeferredSection>
          </div>
        </div>
      </div>

      <AIChatWidget hidden={mediaOverlayOpen || encyclopedieOpen} />

    </>
  )

  return (
    <ThemeProvider>
      <OpeningBgProvider>
      <SocialProvider>
      <CallProvider>
      <GlobalStyles />
      <GlobalCursorLayer />
      <GlobalTrailLayer />
      <GiftInbox />
      <ParchmentMode />
      <RouteSEO />
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
        <Route path="/manga/:slug" element={<MangaRoute />} />
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

        {/* Équipages — verrouillé "Bientôt" pour tout le monde */}
        <Route path="/equipage" element={<PageLayout><ComingSoon title="Équipages" /></PageLayout>} />
        <Route path="/equipage/:crewId" element={<PageLayout><ComingSoon title="Équipages" /></PageLayout>} />

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
        <Route path="/akinator"    element={<AkinatorPage      />} />

        {/* Profil Yonkou — Next-Gen 3D */}
        <Route path="/profil-yonkou" element={<ProfilePageYonkou />} />

        {/* Homepage */}
        <Route path="/*" element={mainContent} />
      </Routes>

      {/* ── Overlays globaux — disponibles sur toutes les routes ── */}
      {animeHubOpen && (
        loading ? (
          <AuthLoadingScreen />
        ) : isAuthenticated ? (
          <AnimeHub
            onClose={() => navigate('/')}
            onOpenOnepiece={() => navigate('/animes-scan/onepiece')}
            onOpenTpn={() => navigate('/animes-scan/tpn')}
            onOpenDrstone={() => navigate('/animes-scan/drstone')}
            onOpenJjk={() => navigate('/animes-scan/jjk')}
            onOpenKingdom={() => navigate('/animes-scan/kingdom')}
            onOpenAot={() => navigate('/animes-scan/aot')}
            onOpenKny={() => navigate('/animes-scan/kny')}
            onOpenNnt={() => navigate('/animes-scan/nnt')}
            onOpenSl={() => navigate('/animes-scan/sl')}
            onOpenDbs={() => navigate('/animes-scan/dbs')}
            onOpenViolet={() => navigate('/animes-scan/violet-evergarden')}
            onOpenVivy={() => navigate('/animes-scan/vivy')}
            onOpenDomestic={() => navigate('/animes-scan/domestic-na-kanojo')}
            onOpenKoi={() => navigate('/animes-scan/koi-ameagari')}
            onOpenLovePrism={() => navigate('/animes-scan/love-prism')}
            onOpenCaroleTuesday={() => navigate('/animes-scan/carole-tuesday')}
            onOpenBunnyGirl={() => navigate('/animes-scan/bunny-girl')}
            onOpenRentGirlfriend={() => navigate('/animes-scan/rent-girlfriend')}
            onOpenBc={() => navigate('/animes-scan/bc')}
            onOpenMha={() => navigate('/animes-scan/mha')}
            onOpenFireforce={() => navigate('/animes-scan/fireforce')}
            onOpenBluelock={() => navigate('/animes-scan/bluelock')}
            onOpenFateZero={() => navigate('/animes-scan/fate-zero')}
            onOpenYourName={() => navigate('/animes-scan/your-name')}
            onOpenYourLie={() => navigate('/animes-scan/your-lie')}
            onOpenBubble={() => navigate('/animes-scan/bubble')}
            onOpenReze={() => navigate('/animes-scan/reze')}
            onOpenMonUnivers={() => navigate('/animes-scan/mon-univers')}
          />
        ) : (
          <AuthGuard onClose={() => navigate('/')} feature="les animés & scans" />
        )
      )}
      {animeIndividualOpen && (
        loading ? (
          <AuthLoadingScreen />
        ) : isAuthenticated ? (
          <>
            {onepieceOpen && <OnePiecePage onClose={closeMedia} />}
            {tpnOpen     && <TpnPage     onClose={closeMedia} />}
            {drstoneOpen && <DrStonePage onClose={closeMedia} />}
            {jjkOpen     && <JjkPage     onClose={closeMedia} />}
            {kingdomOpen && <KingdomPage onClose={closeMedia} />}
            {aotOpen     && <AotPage     onClose={closeMedia} />}
            {knyOpen     && <KnyPage     onClose={closeMedia} />}
            {nntOpen     && <NntPage     onClose={closeMedia} />}
            {slOpen      && <SlPage      onClose={closeMedia} />}
            {dbsOpen     && <DbsPage     onClose={closeMedia} />}
            {violetOpen  && <VioletEvergardenPage onClose={closeMedia} />}
            {yourLieOpen && <YourLiePage onClose={closeMedia} />}
            {vivyOpen    && <VivyPage             onClose={closeMedia} />}
            {domesticOpen && <DomesticNaKanojoPage onClose={closeMedia} />}
            {koiOpen     && <KoiAmeagariPage      onClose={closeMedia} />}
            {lovePrismOpen && <LovePrismPage      onClose={closeMedia} />}
            {caroleTuesdayOpen && <CaroleTuesdayPage onClose={closeMedia} />}
            {bunnyGirlOpen && <BunnyGirlPage onClose={closeMedia} />}
            {rentGirlOpen && <RentAGirlfriendPage onClose={closeMedia} />}
            {bcOpen        && <BcPage        onClose={closeMedia} />}
            {mhaOpen       && <MhaPage       onClose={closeMedia} />}
            {fireforcOpen  && <FireForcePage onClose={closeMedia} />}
            {bluelockOpen  && <BlueLockPage  onClose={closeMedia} />}
            {fateZeroOpen  && <FateZeroPage  onClose={closeMedia} />}
            {yourNameOpen  && <YourNamePage  onClose={closeMedia} />}
            {bubbleOpen    && <FilmPage slug="bubble" onClose={closeMedia} />}
            {rezeOpen      && <FilmPage slug="reze"   onClose={closeMedia} />}
            {monUniversOpen && (
              <MonUniversPage
                onClose={() => navigate('/animes-scan')}
                onOpenAot={onOpenAotFromMon} onOpenFireforce={onOpenFireforceFromMon} onOpenBluelock={onOpenBluelockFromMon} onOpenFateZero={onOpenFateZeroFromMon}
                onOpenBunnyGirl={onOpenBunnyGirlFromMon} onOpenRentGirlfriend={onOpenRentGirlfriendFromMon}
                onOpenTpn={onOpenTpnFromMon} onOpenDrstone={onOpenDrstoneFromMon} onOpenJjk={onOpenJjkFromMon}
                onOpenKingdom={onOpenKingdomFromMon} onOpenKny={onOpenKnyFromMon} onOpenNnt={onOpenNntFromMon}
                onOpenSl={onOpenSlFromMon} onOpenDbs={onOpenDbsFromMon} onOpenViolet={onOpenVioletFromMon}
                onOpenYourLie={onOpenYourLieFromMon}
                onOpenVivy={onOpenVivyFromMon} onOpenLovePrism={onOpenLovePrismFromMon} onOpenCaroleTuesday={onOpenCaroleTuesdayFromMon}
                onOpenBc={onOpenBcFromMon} onOpenMha={onOpenMhaFromMon} onOpenOnepiece={onOpenOnepieceFromMon}
              />
            )}
          </>
        ) : (
          <AuthGuard onClose={() => navigate('/')} feature="les animés & scans" />
        )
      )}
      {treeOpen      && <FamilyTree3D  onClose={() => setTreeOpen(false)} />}
      {scansOpen && (
        loading ? (
          <AuthLoadingScreen />
        ) : isAuthenticated ? (
          <ScansPage onClose={() => navigate('/')} />
        ) : (
          <AuthGuard onClose={() => navigate('/')} feature="les scans One Piece" />
        )
      )}
      {encyclopedieOpen && <ComingSoon title="Encyclopédie" onClose={() => setEncyclopedieOpen(false)} />}
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
