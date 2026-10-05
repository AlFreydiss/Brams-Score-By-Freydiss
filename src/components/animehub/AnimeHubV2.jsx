// ── Animés & Scans v2 — hub streaming premium (Netflix/Crunchyroll/Prime) ───
// Orchestrateur : HeroCinematic rotatif → toolbar sticky (recherche, filtres,
// tri) → rows embla (Reprendre, Top 10, Nouveautés, genres) → grille « Tous »
// paginée par 21. Catalogue + navigation = l'existant (ANIMES d'AnimeHub,
// progression localStorage, pages animes dédiées). Rollback : re-pointer
// App.jsx sur AnimeHub.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ANIMES, SEARCH_ALIASES } from '../AnimeHub.jsx'
import { SCANS } from '../../data/scans-catalog.js'
import Navbar from '../Navbar.jsx'
import { C, FONT_BODY, FONT_DISPLAY, GUTTER, RADIUS_PANEL, SHADOW_CARD, themeFor, THEME_FONT_HREF } from './tokens.js'
import { DUR, MOTION_CSS } from '../../lib/motion.js'
import HeroCinematic from './HeroCinematic.jsx'
import AnimeRow from './AnimeRow.jsx'
import AnimeCard, { BackdropCard } from './AnimeCard.jsx'
import ScanCard, { ScanResumeCard } from './ScanCard.jsx'
import { hasKeyart, keyartSrc, bannerSrc } from './keyart.js'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import HoverPreview from './HoverPreview.jsx'
import SearchSuggest from './SearchSuggest.jsx'
import { genreRows, films, bingeable, similarTo } from './rows.js'
// Image des cartes 16:9 : keyart, sinon bannière officielle, sinon l'affiche
// portrait (floue une fois étirée — c'était le cas de presque toutes).
const wideArt = a => (hasKeyart(a.id) ? keyartSrc(a.id, 960) : bannerSrc(a.id) || a.coverImage)
import { readScanProgress, scanStatus, SCANS_EVENT } from '../../lib/scanProgress.js'
import { newEpisodes } from '../../lib/animeSeen.js'
import { ANIME_COUNTS, ANIME_FILM_COUNTS } from '../../data/anime-counts.js'
import { logAnimeOpen, fetchTopWatched } from '../../lib/watchStats.js'
import { getContinueWatching } from '../../lib/watchProgress.js'
import { friendsWatching } from '../../lib/social.js'
import { getStatus, setStatus, syncMyList, mediaKey } from '../../lib/myList.js'
import { useAuth } from '../../contexts/AuthContext.jsx'

const HERO_IDS = ['onepiece', 'kaguya', 'kaiju-no-8', 'bleach', 'violet-evergarden', 'aot', 'jjk', 'reze'] // 8 à la une
// Les bannières paysage du hero (et leurs variantes WebP) sont dans keyart.js.
// Vraies nouveautés : dans les données historiques presque TOUT portait le badge
// « NOUVEAU » (27/29) — on le réserve aux derniers ajouts réels du catalogue.
const NEW_IDS = new Set(['koe-no-katachi', 'fgo-babylonia', 'quintuplets', 'kny', 'kaiju-no-8', 'fireforce', 'bleach', 'bluelock', 'domestic-na-kanojo', 'kaguya', 'hxh'])
const displayBadge = (a) => (a.badge === 'NOUVEAU' ? (NEW_IDS.has(a.id) ? 'NOUVEAU' : null) : a.badge)
const FAVS_KEY = 'animehub_favs'

// Styles de la transition hub → page série. Posés dans <head> une fois pour
// toutes : le <style> du hub disparaît avec lui, au milieu de l'animation.
function installViewTransitionCss() {
  if (document.getElementById('ah2-vt-css')) return
  const s = document.createElement('style')
  s.id = 'ah2-vt-css'
  s.textContent = `
    ::view-transition-old(root) { animation: ah2vt-out .32s ease both }
    ::view-transition-new(root) { animation: ah2vt-in .5s cubic-bezier(.22,1,.36,1) both }
    ::view-transition-group(ah2-pick) { animation-duration: .55s; z-index: 2 }
    ::view-transition-old(ah2-pick) { animation: ah2vt-pick .55s cubic-bezier(.4,0,.2,1) both }
    @keyframes ah2vt-out { to { opacity: 0; transform: scale(.985) } }
    @keyframes ah2vt-in { from { opacity: 0; transform: scale(1.02) } }
    @keyframes ah2vt-pick { 40% { opacity: 1 } to { opacity: 0; transform: scale(2.2); filter: blur(8px) } }
  `
  document.head.appendChild(s)
}
const NORM = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const SCAN_BY_ANIME = new Map(SCANS.filter(s => s.animeId).map(s => [s.animeId, s]))
const TOTAL_CHAPTERS = SCANS.reduce((n, s) => n + s.chapters, 0)

// ── Fond d'ambiance de l'ANCIEN hub, réincorporé tel quel : bleu nuit + deux
// halos, étoiles scintillantes (certaines colorées), orbes dérivants, scanline.
const LEGACY_BG = 'radial-gradient(1100px 820px at 72% 82%, rgba(46,96,179,0.22), transparent 60%), radial-gradient(820px 620px at 28% -5%, rgba(34,54,120,0.20), transparent 55%), linear-gradient(180deg, #0a0f1c 0%, #070a13 60%, #05070f 100%)'
const ORB_COLORS = ['rgba(224,82,74,0.85)', 'rgba(108,92,231,0.85)', 'rgba(0,184,148,0.8)', 'rgba(201,162,39,0.85)']

function AmbientLegacy() {
  const stars = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    x: (i * 37.3 + 11) % 99, y: (i * 53.7 + 7) % 97,
    size: i % 9 === 0 ? 2.4 : i % 4 === 0 ? 1.6 : 1,
    dur: 3.2 + (i * 0.27) % 4.8, del: (i * 0.23) % 7,
    col: i % 5 === 0 ? ORB_COLORS[i % ORB_COLORS.length] : null,
  })), [])
  const orbs = useMemo(() => [
    { x: 10, y: 20, size: 320, color: 'rgba(224,82,74,0.04)', dur: 18 },
    { x: 75, y: 60, size: 280, color: 'rgba(108,92,231,0.04)', dur: 22 },
    { x: 45, y: 80, size: 380, color: 'rgba(0,184,148,0.03)', dur: 26 },
    { x: 88, y: 10, size: 240, color: 'rgba(201,162,39,0.04)', dur: 20 },
  ], [])
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <style>{`
        @keyframes ah2Twinkle { 0%,100% { opacity:.12 } 50% { opacity:.65 } }
        @keyframes ah2Scan { 0% { transform: translateY(-2px) } 100% { transform: translateY(100vh) } }
        @keyframes ah2Drift { 0%,100% { transform:translate(-50%,-50%) } 50% { transform:translate(-50%,calc(-50% - 14px)) } }
        @media (prefers-reduced-motion: reduce) { .ah2-amb * { animation: none !important } }
      `}</style>
      <div className="ah2-amb" style={{ position: 'absolute', inset: 0 }}>
        {orbs.map((o, i) => (
          <div key={`o${i}`} style={{
            position: 'absolute', left: `${o.x}%`, top: `${o.y}%`, width: o.size, height: o.size, borderRadius: '50%',
            background: `radial-gradient(circle, ${o.color}, transparent 70%)`,
            transform: 'translate(-50%,-50%)', animation: `ah2Drift ${o.dur}s ease-in-out infinite`,
          }} />
        ))}
        {stars.map((s, i) => (
          <div key={`s${i}`} style={{
            position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, borderRadius: '50%',
            background: s.col ?? 'rgba(255,255,255,0.55)',
            animation: `ah2Twinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
          }} />
        ))}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: 2, willChange: 'transform',
          background: 'linear-gradient(90deg, transparent, rgba(224,82,74,.06), rgba(224,82,74,.14), rgba(224,82,74,.06), transparent)',
          animation: 'ah2Scan 18s linear infinite',
        }} />
      </div>
    </div>
  )
}

// Progression localStorage (mêmes clés que les pages de lecture : <ns>_vp /
// <ns>_video_progress) — réimplémentation compacte de computeVideo.
// Le total est celui du catalogue : il valait le nombre d'épisodes COMMENCÉS,
// si bien qu'un seul épisode vu en entier donnait 1/1 = 100 % et « Terminé ».
// Progression en épisodes : les films rangés dans la liste (HxH) n'en font pas partie.
const episodeCount = (ns) => (ANIME_COUNTS[ns] || 0) - (ANIME_FILM_COUNTS[ns] || 0)
const isFilmKey = (k) => /(^|-)film-/.test(k)

function readProgress(ns) {
  try {
    const structured = JSON.parse(localStorage.getItem(`${ns}_video_progress`) || 'null')
    if (structured?.episodes) {
      const eps = Object.values(structured.episodes)
      const total = Math.max(episodeCount(ns), eps.length) || 12
      const done = eps.filter(e => e?.completed).length
      return {
        pct: Math.round((done / total) * 100), label: `${done}/${total} épisodes`,
        lastEpisode: structured.lastEpisode ?? null, lastTitle: structured.lastTitle || null, updatedAt: structured.updatedAt || 0,
      }
    }
    const flat = JSON.parse(localStorage.getItem(`${ns}_vp`) || '{}')
    const keys = Object.keys(flat).filter(k => !isFilmKey(k))
    if (!keys.length) return { pct: 0, label: '' }
    const done = keys.filter(k => flat[k]?.completed).length
    const total = Math.max(episodeCount(ns), keys.length)
    return { pct: Math.round((done / total) * 100), label: `${done}/${total} épisodes` }
  } catch { return { pct: 0, label: '' } }
}

// L'appui long des cartes (Ma liste, statut) ne se devine pas : on le dit une
// fois, aux écrans tactiles seulement, puis plus jamais.
const LP_HINT_KEY = 'ah2_longpress_hint'
function LongPressHint({ active }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!active) return
    if (!window.matchMedia?.('(hover: none) and (pointer: coarse)').matches) return
    try { if (localStorage.getItem(LP_HINT_KEY)) return } catch { return }
    const t1 = setTimeout(() => {
      setShow(true)
      try { localStorage.setItem(LP_HINT_KEY, '1') } catch {}
    }, 2500)
    return () => clearTimeout(t1)
  }, [active])
  useEffect(() => {
    if (!show) return
    const t = setTimeout(() => setShow(false), 7000)
    return () => clearTimeout(t)
  }, [show])
  if (!show) return null
  return (
    <div role="status" onClick={() => setShow(false)} style={{
      position: 'fixed', left: 16, right: 16, bottom: 'calc(96px + env(safe-area-inset-bottom))', zIndex: 80,
      maxWidth: 420, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 12, background: 'rgba(16,19,27,0.96)', border: `1px solid ${C.brass}66`,
      boxShadow: '0 12px 32px -10px rgba(0,0,0,.8)', backdropFilter: 'blur(10px)',
      fontFamily: FONT_BODY, fontSize: 13.5, color: C.text, lineHeight: 1.35, animation: 'ah2HintIn .35s ease-out',
    }}>
      <style>{'@keyframes ah2HintIn { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }'}</style>
      <span aria-hidden style={{ fontSize: 22 }}>👆</span>
      <span><b style={{ color: C.brass }}>Astuce :</b> appui long sur une affiche pour l'ajouter à ta liste ou la marquer vue.</span>
      <span aria-hidden style={{ marginLeft: 'auto', color: C.dim, fontSize: 16 }}>✕</span>
    </div>
  )
}

export default function AnimeHubV2(props) {
  const { discordId } = useAuth()

  // Polices des thèmes par animé (Bebas Neue / Russo One / Quicksand) — un seul
  // <link>, posé au premier montage du hub, jamais retiré (cache navigateur).
  useEffect(() => {
    if (document.querySelector('link[data-ah2-fonts]')) return
    const l = document.createElement('link')
    l.rel = 'stylesheet'
    l.href = THEME_FONT_HREF
    l.dataset.ah2Fonts = '1'
    document.head.appendChild(l)
  }, [])

  // Animation d'entrée : fondu + très léger zoom-out du hub, contenu en cascade.
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
    return () => cancelAnimationFrame(id)
  }, [])

  // Mapping id → handler de navigation (mêmes props qu'AnimeHub historique).
  const open = (id) => ({
    onepiece: props.onOpenOnepiece, tpn: props.onOpenTpn, drstone: props.onOpenDrstone, jjk: props.onOpenJjk,
    kingdom: props.onOpenKingdom, aot: props.onOpenAot, kny: props.onOpenKny, nnt: props.onOpenNnt, sl: props.onOpenSl,
    dbs: props.onOpenDbs, 'violet-evergarden': props.onOpenViolet, vivy: props.onOpenVivy,
    'love-prism': props.onOpenLovePrism, 'carole-tuesday': props.onOpenCaroleTuesday,
    'bunny-girl': props.onOpenBunnyGirl, 'rent-girlfriend': props.onOpenRentGirlfriend,
    bc: props.onOpenBc, mha: props.onOpenMha, fireforce: props.onOpenFireforce, bleach: props.onOpenBleach,
    'kaiju-no-8': props.onOpenKaiju, bluelock: props.onOpenBluelock, 'fate-zero': props.onOpenFateZero,
    'your-name': props.onOpenYourName, 'your-lie': props.onOpenYourLie, 'fgo-babylonia': props.onOpenFgoBabylonia, 'domestic-na-kanojo': props.onOpenDomestic,
    'koi-ameagari': props.onOpenKoi, bubble: props.onOpenBubble, reze: props.onOpenReze, 'koe-no-katachi': props.onOpenKoe,
    kaguya: props.onOpenKaguya, hxh: props.onOpenHxh, quintuplets: props.onOpenQuintuplets,
    'tokyo-revengers': props.onOpenTokyoRevengers, 'death-note': props.onOpenDeathNote,
  })[id]
  // Les animes s'ouvrent par callbacks passes en props ; les scans ont de
  // vraies routes /manga/<slug>, d'ou le navigate.
  const navigate = useNavigate()
  // Transition vers la page série : l'affiche cliquée grandit et s'efface
  // pendant que la page arrive (View Transitions, Chrome/Edge/Safari 18).
  // La page n'existe qu'après prepareAnime (≤ 1,5 s) : on attend que le hub
  // soit démonté avant la capture « après ».
  const pressedArt = useRef(null)
  const openAnime = (a) => {
    logAnimeOpen(a.id, discordId) // alimente le « Top du moment » serveur (fire-and-forget)
    setPreview(null)
    const go = open(a.id)
    if (!go) return
    const root = rootRef.current
    if (!document.startViewTransition || reduced || !root) { go(); return }
    const el = pressedArt.current?.closest(`[data-preview="${CSS.escape(a.id)}"]`)?.querySelector('.ah2-art') || null
    if (el) el.style.viewTransitionName = 'ah2-pick'
    installViewTransitionCss()
    const vt = document.startViewTransition(() => new Promise(res => {
      go()
      const t0 = performance.now()
      // setTimeout et pas rAF : le rendu est gelé pendant la mise à jour d'une
      // View Transition, les rAF n'y tournent pas (la transition expirait).
      const tick = () => (!root.isConnected || performance.now() - t0 > 1600 ? setTimeout(res, 30) : setTimeout(tick, 25))
      setTimeout(tick, 25)
    }))
    vt.ready.catch(() => {})
    vt.finished.catch(() => {}).finally(() => { if (el) el.style.viewTransitionName = '' })
  }

  // ── Aperçu au survol (souris) : délégation sur data-preview ──
  const finePointer = useMemo(() => !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches, [])
  // Téléphone (même seuil que le CSS du hub) : tiroir des genres, swipe du hero.
  const [narrow, setNarrow] = useState(() => !!window.matchMedia?.('(max-width: 768px)').matches)
  useEffect(() => {
    const mq = window.matchMedia?.('(max-width: 768px)')
    if (!mq) return
    const h = () => setNarrow(mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  // Swipe horizontal sur le hero : slide suivant / précédent.
  const swipe = useRef(null)
  const [preview, setPreview] = useState(null) // { anime, rect }
  const pvTimer = useRef(0)
  const pvCard = useRef(null)
  const hidePreview = (delay = 140) => {
    clearTimeout(pvTimer.current)
    pvTimer.current = setTimeout(() => { pvCard.current = null; setPreview(null) }, delay)
  }
  const onHoverCards = (e) => {
    if (!finePointer) return
    if (e.target.closest?.('.ah2-pv')) { clearTimeout(pvTimer.current); return }
    const card = e.target.closest?.('[data-preview]')
    if (card === pvCard.current) return
    pvCard.current = card
    clearTimeout(pvTimer.current)
    if (!card) { hidePreview(); return }
    const a = ANIMES.find(x => x.id === card.dataset.preview)
    if (!a) return
    pvTimer.current = setTimeout(() => {
      if (pvCard.current !== card || !card.isConnected) return
      setPreview({ anime: a, rect: card.querySelector('.ah2-art')?.getBoundingClientRect() || card.getBoundingClientRect() })
    }, preview ? 160 : 520)
  }
  useEffect(() => () => clearTimeout(pvTimer.current), [])

  // ── Vue Animés / Scans, portée par l'URL (?vue=scans) : le bouton Retour du
  // lecteur y ramène, et le lien se partage. replace : pas une entrée
  // d'historique par clic sur l'onglet.
  const [params, setParams] = useSearchParams()
  const mode = params.get('vue') === 'scans' ? 'scans' : 'animes'
  const setMode = (m) => {
    setParams(prev => { const n = new URLSearchParams(prev); m === 'scans' ? n.set('vue', 'scans') : n.delete('vue'); return n }, { replace: true })
    setSeg('tous'); setGenreSel(new Set()); setSort('populaire'); setShown(21)
    rootRef.current?.scrollTo({ top: 0 })
  }
  const openScan = (scan, ch = null) => navigate(`/manga/${scan.slug}${ch != null ? `?ch=${ch}` : ''}`)

  // Progression des scans (localStorage du lecteur). Relue quand le lecteur
  // signale une lecture, ou au retour sur l'onglet.
  const [scanVer, setScanVer] = useState(0)
  useEffect(() => {
    const h = () => setScanVer(v => v + 1)
    window.addEventListener(SCANS_EVENT, h)
    window.addEventListener('storage', h)
    window.addEventListener('focus', h)
    return () => { window.removeEventListener(SCANS_EVENT, h); window.removeEventListener('storage', h); window.removeEventListener('focus', h) }
  }, [])
  const scanProg = useMemo(() => Object.fromEntries(SCANS.map(s => [s.slug, readScanProgress(s)])), [scanVer])
  const scansResume = useMemo(() => SCANS
    .filter(s => scanProg[s.slug].current != null && scanProg[s.slug].pct < 100)
    .sort((a, b) => scanProg[b.slug].ts - scanProg[a.slug].ts), [scanProg])

  // « / » place le curseur dans la recherche (hors champ de saisie).
  const searchRef = useRef(null)
  const rootRef = useRef(null)
  useEffect(() => {
    const h = (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      e.preventDefault(); searchRef.current?.focus()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // Progression (recalculée à l'affichage — léger, ~30 lectures localStorage)
  const progress = useMemo(() => {
    const out = {}
    for (const a of ANIMES) out[a.id] = readProgress(a.id)
    return out
  }, [])

  // Favoris locaux (cœur / ma liste)
  const [favs, setFavs] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem(FAVS_KEY) || '[]')) } catch { return new Set() } })
  const toggleFav = (a) => setFavs(prev => {
    const next = new Set(prev)
    next.has(a.id) ? next.delete(a.id) : next.add(a.id)
    try { localStorage.setItem(FAVS_KEY, JSON.stringify([...next])) } catch {}
    return next
  })

  // ── Ma Liste : statut explicite par média (à voir / en cours / vu), persisté
  // (localStorage + miroir Supabase). listVer force le re-render à chaque change.
  const [listVer, setListVer] = useState(0)
  useEffect(() => {
    const h = () => setListVer(v => v + 1)
    window.addEventListener('mylist:change', h)
    return () => window.removeEventListener('mylist:change', h)
  }, [])
  useEffect(() => { if (discordId) syncMyList() }, [discordId]) // pull serveur au login
  const setAnimeStatus = (a, st) => setStatus(mediaKey('anime', a.id), st)
  // Statut effectif : choix explicite de l'utilisateur sinon dérivé de la progression.
  const statusOf = (a) => {
    const ex = getStatus(mediaKey('anime', a.id))
    if (ex) return ex
    const p = progress[a.id]?.pct || 0
    return p >= 100 ? 'termine' : p > 0 ? 'encours' : 'avoir'
  }


  // ── Hero rotatif (8 s, pause hover, crossfade, reduced-motion = statique) ──
  const slides = useMemo(() => HERO_IDS
    .map(id => ANIMES.find(a => a.id === id))
    .filter(Boolean)
    .map(a => ({ ...a, keyartPosition: 'center 30%' })), [])
  const [slide, setSlide] = useState(0)
  // Slides déjà atteints : leur visuel reste monté (retour instantané). Le
  // suivant est chargé d'avance pour que le fondu ne tombe pas sur du vide.
  const [visited, setVisited] = useState(() => new Set([0, 1]))
  useEffect(() => {
    setVisited(prev => {
      const next = (slide + 1) % Math.max(1, slides.length)
      if (prev.has(slide) && prev.has(next)) return prev
      return new Set([...prev, slide, next])
    })
  }, [slide, slides.length])
  const [paused, setPaused] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  // Toolbar : transparente posée sur le fondu du hero, fond + blur SEULEMENT
  // une fois collée sous la navbar (sinon bande sombre qui tranche le hero)
  const [toolbarStuck, setToolbarStuck] = useState(false)
  const toolbarRef = useRef(null)
  const scrollRaf = useRef(0)
  const reduced = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, [])
  // Le raccourci « / » n'existe qu'avec un clavier : pas de hint sur écran tactile
  const kbdHint = useMemo(() => (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ? '  ( / )' : ''), [])
  // Rotation : c'est la fin du remplissage du segment actif (.ah2-segfill, 7 s)
  // qui passe au slide suivant — la pause au survol fige donc les deux ensemble.
  const nextSlide = () => setSlide(s => (s + 1) % slides.length)

  // ── Toolbar : recherche / segmented / genres / tri ──
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => { const t = setTimeout(() => setDebounced(query), 250); return () => clearTimeout(t) }, [query])
  const [seg, setSeg] = useState('tous') // tous | encours | avoir | termine | favoris
  const [genreSel, setGenreSel] = useState(new Set())
  const [genresOpen, setGenresOpen] = useState(false)
  const [sort, setSort] = useState('populaire')
  const [shown, setShown] = useState(21)

  const allGenres = useMemo(() => {
    const g = new Set(); ANIMES.forEach(a => (a.genres || []).forEach(x => g.add(x))); return [...g].sort((a, b) => a.localeCompare(b, 'fr'))
  }, [])

  const filtered = useMemo(() => {
    let list = ANIMES.filter(a => {
      if (genreSel.size && !(a.genres || []).some(g => genreSel.has(g))) return false
      // Segments À voir / En cours / Terminé pilotés par le statut Ma Liste
      // (explicite sinon dérivé de la progression) → cohérent avec les pills.
      if ((seg === 'encours' || seg === 'termine' || seg === 'avoir') && statusOf(a) !== seg) return false
      if (seg === 'favoris' && !favs.has(a.id)) return false
      if (debounced && !NORM(`${a.title} ${a.subtitle} ${(a.genres || []).join(' ')} ${(SEARCH_ALIASES[a.id] || []).join(' ')}`).includes(NORM(debounced))) return false
      return true
    })
    if (sort === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'fr'))
    else if (sort === 'recent') list = [...list].sort((a, b) => (b.badge === 'NOUVEAU' ? 1 : 0) - (a.badge === 'NOUVEAU' ? 1 : 0))
    return list
  }, [debounced, seg, genreSel, sort, favs, progress, listVer])

  // Mode "résultats" : recherche OU n'importe quel filtre actif (segment,
  // genres, tri non défaut) — sinon cliquer « Terminé » ne changeait rien de
  // visible (les rows masquaient la grille filtrée).
  const searching = debounced.trim().length > 0 || seg !== 'tous' || genreSel.size > 0 || sort !== 'populaire'
  const stats = useMemo(() => ({
    total: ANIMES.length,
    encours: ANIMES.filter(a => { const p = progress[a.id]?.pct || 0; return p > 0 && p < 100 }).length,
    nouveautes: ANIMES.filter(a => displayBadge(a) === 'NOUVEAU').length,
    favoris: favs.size,
  }), [progress, favs])

  // Scans : même barre d'outils, appliquée au catalogue manga. La recherche
  // couvre aussi l'auteur (« Isayama », « Oda »…).
  const scanMatches = (s, q) => NORM(`${s.title} ${s.author || ''} ${(s.genres || []).join(' ')} ${s.slug} ${(SEARCH_ALIASES[s.animeId] || []).join(' ')}`).includes(NORM(q))
  const filteredScans = useMemo(() => {
    let list = SCANS.filter(s => {
      if ((seg === 'encours' || seg === 'termine' || seg === 'avoir') && scanStatus(scanProg[s.slug]) !== seg) return false
      if (seg === 'parution' && s.status !== 'encours') return false
      if (debounced && !scanMatches(s, debounced)) return false
      return true
    })
    if (sort === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'fr'))
    else if (sort === 'chapitres') list = [...list].sort((a, b) => b.chapters - a.chapters)
    else if (sort === 'note') list = [...list].sort((a, b) => (b.score || 0) - (a.score || 0))
    else list = [...list].sort((a, b) => (scanProg[b.slug].ts - scanProg[a.slug].ts) || ((b.score || 0) - (a.score || 0)))
    return list
  }, [debounced, seg, sort, scanProg])
  // Recherche depuis la vue Animés : les scans correspondants suivent les résultats.
  const scanHits = useMemo(() => (debounced.trim() ? SCANS.filter(s => scanMatches(s, debounced)) : []), [debounced])

  // ── Résultats instantanés (sans attendre le debounce) : animés puis scans de
  // la vue courante d'abord, un titre qui COMMENCE par la saisie passe devant.
  const [sgOpen, setSgOpen] = useState(false)
  const [sgActive, setSgActive] = useState(-1)
  const { suggestions, suggestTotal } = useMemo(() => {
    const q = NORM(query.trim())
    if (!q) return { suggestions: [], suggestTotal: 0 }
    const starts = t => (NORM(t).startsWith(q) ? 0 : 1)
    const animeHits = ANIMES
      .filter(a => NORM(`${a.title} ${a.subtitle} ${(a.genres || []).join(' ')} ${(SEARCH_ALIASES[a.id] || []).join(' ')}`).includes(q))
      .sort((a, b) => starts(a.title) - starts(b.title))
      .map(a => {
        const p = progress[a.id]?.pct || 0
        const n = episodeCount(a.id)
        return {
          key: `a-${a.id}`, kind: 'anime', id: a.id, title: a.title, cover: a.coverImage, pct: p,
          meta: [a.type === 'Film' ? 'Film' : n > 0 ? `${n} épisodes` : 'Série', a.year, p > 0 ? `${p} % vu` : (a.genres || []).slice(0, 2).join(' · ')].filter(Boolean).join(' · '),
        }
      })
    const scanHitsNow = SCANS
      .filter(s => scanMatches(s, query.trim()))
      .sort((a, b) => starts(a.title) - starts(b.title))
      .map(s => {
        const pr = scanProg[s.slug]
        return {
          key: `s-${s.slug}`, kind: 'scan', slug: s.slug, title: s.title, cover: s.cover, pct: pr.pct || 0, resume: pr.current,
          meta: [`Scan · ${s.chapters} chapitres`, s.author, s.status === 'encours' ? 'en parution' : null].filter(Boolean).join(' · '),
        }
      })
    const [first, second] = mode === 'scans' ? [scanHitsNow, animeHits] : [animeHits, scanHitsNow]
    const items = [...first.slice(0, 6), ...second.slice(0, 4)]
    return { suggestions: items, suggestTotal: first.length + second.length }
  }, [query, mode, progress, scanProg])
  const pickSuggestion = (it) => {
    setSgOpen(false); setSgActive(-1)
    if (it.kind === 'scan') { const s = SCANS.find(x => x.slug === it.slug); if (s) openScan(s, scanProg[s.slug].current) }
    else { const a = ANIMES.find(x => x.id === it.id); if (a) openAnime(a) }
  }
  const scanStats = useMemo(() => ({
    encours: SCANS.filter(s => scanStatus(scanProg[s.slug]) === 'encours').length,
    lus: SCANS.reduce((n, s) => n + scanProg[s.slug].read, 0),
  }), [scanProg])
  const resultsLabel = (n) => {
    const q = debounced.trim()
    const noun = mode === 'scans' ? 'scan' : 'résultat'
    return q ? `${n} ${noun}${n !== 1 ? 's' : ''} pour « ${q} »` : `${n} ${noun}${n !== 1 ? 's' : ''}`
  }
  const clearFilters = () => { setQuery(''); setSeg('tous'); setGenreSel(new Set()); setSort('populaire') }

  // Rows
  const resume = ANIMES
    .filter(a => { const p = progress[a.id]?.pct || 0; return p > 0 && p < 100 })
    .sort((a, b) => (progress[b.id]?.updatedAt || 0) - (progress[a.id]?.updatedAt || 0))

  // Top du moment = les plus REGARDÉS sur le serveur (7 jours glissants, table
  // anime_watch_events). Indisponible → ordre statique du catalogue.
  const [topCounts, setTopCounts] = useState(null)
  useEffect(() => { let on = true; fetchTopWatched(7).then(r => { if (on) setTopCounts(r) }); return () => { on = false } }, [])
  const top10 = useMemo(() => {
    if (!topCounts?.length) return ANIMES.slice(0, 10)
    const rank = new Map(topCounts.map((e, i) => [e.id, i]))
    const watched = ANIMES.filter(a => rank.has(a.id)).sort((a, b) => rank.get(a.id) - rank.get(b.id))
    const rest = ANIMES.filter(a => !rank.has(a.id))
    return [...watched, ...rest].slice(0, 10)
  }, [topCounts])

  const news = ANIMES.filter(a => displayBadge(a) === 'NOUVEAU')
  const rowGenres = ['Action', 'Romance', 'Drame', 'Surnaturel', 'Fantasy', 'Science-fiction', 'Musique', 'Comédie']
  // Rangées éditoriales (rows.js) : films, séries courtes, « parce que tu
  // regardes X », puis genres sans doublon (les films ont déjà leur rangée).
  const filmList = useMemo(() => films(ANIMES), [])
  const bingeList = useMemo(() => bingeable(ANIMES, episodeCount), [])
  const genreRowList = useMemo(() => genreRows(ANIMES, rowGenres, { skip: new Set(filmList.map(a => a.id)) }), [filmList])
  const becauseSeed = resume[0] || null
  const becauseList = useMemo(() => similarTo(becauseSeed, ANIMES.filter(a => (progress[a.id]?.pct || 0) === 0)), [becauseSeed?.id])

  // Index catalogue : ns/slug → entrée ANIMES. Le catalogue est keyé par `id`
  // (ex. 'onepiece'). Les RPC renvoient un `ns` que l'on mappe ici.
  const byNs = useMemo(() => {
    const m = new Map()
    for (const a of ANIMES) m.set(a.id, a)
    return m
  }, [])

  // ── « ▶ Reprendre » : reprise de lecture serveur (getContinueWatching).
  // Chargé seulement si connecté ; tolérant aux erreurs (RPC absente → vide →
  // pas de row). Chaque entrée : { ns, episode, position, duration, ... }.
  const [continueWatch, setContinueWatch] = useState([])
  useEffect(() => {
    if (!discordId) { setContinueWatch([]); return }
    let on = true
    ;(async () => {
      try {
        const rows = await getContinueWatching(20)
        if (!on) return
        const mapped = (Array.isArray(rows) ? rows : [])
          .map(r => {
            const a = byNs.get(r?.ns)
            if (!a || r?.completed) return null
            const dur = Number(r.duration) || 0
            const pos = Number(r.position) || 0
            const pct = dur > 0 ? Math.min(100, Math.max(0, Math.round((pos / dur) * 100))) : 0
            return { anime: a, episode: r.episode, pct }
          })
          .filter(Boolean)
        setContinueWatch(mapped)
      } catch { if (on) setContinueWatch([]) }
    })()
    return () => { on = false }
  }, [discordId, byNs])

  // ── « 👥 Tes amis regardent » : RPC friends_watching (48 h). Connecté + ≥1
  // élément requis, sinon row masquée. Tolérant (migration absente → vide).
  const [friendsRows, setFriendsRows] = useState([])
  useEffect(() => {
    if (!discordId) { setFriendsRows([]); return }
    let on = true
    ;(async () => {
      try {
        const rows = await friendsWatching(48)
        if (!on) return
        const mapped = (Array.isArray(rows) ? rows : [])
          .map(r => {
            const a = byNs.get(r?.ns)
            const friends = Array.isArray(r?.friends) ? r.friends : []
            if (!a || !friends.length) return null
            return { anime: a, friends }
          })
          .filter(Boolean)
        setFriendsRows(mapped)
      } catch { if (on) setFriendsRows([]) }
    })()
    return () => { on = false }
  }, [discordId, byNs])

  // « +30 NOUVEAUX » prime sur le badge éditorial tant que la série n'a pas été rouverte.
  const badgeOf = (a) => { const n = newEpisodes(a.id); return n > 0 ? `+${n} NOUVEAU${n > 1 ? 'X' : ''}` : displayBadge(a) }
  const card = (a, w = 180) => (
    <AnimeCard key={a.id} anime={{ ...a, badge: badgeOf(a) }} width={w}
      progressPct={progress[a.id]?.pct || 0}
      onOpen={openAnime} onPlay={openAnime}
      onToggleList={toggleFav} inList={favs.has(a.id)}
      status={getStatus(mediaKey('anime', a.id))} onSetStatus={setAnimeStatus} />
  )

  const segBtn = (id, label) => (
    <button key={id} onClick={() => setSeg(id)} style={{
      padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: FONT_BODY,
      fontSize: 13, fontWeight: 500, border: 'none',
      background: seg === id ? 'rgba(255,255,255,0.1)' : 'transparent',
      color: seg === id ? C.brass : C.dim,
    }}>{label}</button>
  )

  return (
    <div
      ref={rootRef}
      className="ah2-root"
      onMouseOver={onHoverCards}
      onPointerDown={e => { pressedArt.current = e.target }}
      onScroll={e => {
        if (pvCard.current) hidePreview(0)
        // throttle rAF : un seul recalcul par frame, evite le reflow (getBoundingClientRect)
        // a chaque evenement de scroll qui faisait ramer toute la page.
        const el = e.currentTarget
        if (scrollRaf.current) return
        scrollRaf.current = requestAnimationFrame(() => {
          scrollRaf.current = 0
          setScrolled(el.scrollTop > 24)
          const r = toolbarRef.current?.getBoundingClientRect()
          if (r) setToolbarStuck(r.top <= 65)
        })
      }}
      style={{
        position: 'fixed', inset: 0, zIndex: 60, overflowY: 'auto', overflowX: 'hidden',
        // iOS : momentum scrolling + on empêche le scroll de "fuir" vers le body
        // (chaînage) qui rendait le défilement chaotique, surtout en paysage.
        WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
        background: LEGACY_BG, fontFamily: FONT_BODY, color: C.text,
        // Entrée cinématique : fondu + zoom-out très léger (annulé si reduced-motion via CSS)
        opacity: entered ? 1 : 0,
        transform: entered ? 'none' : 'scale(1.018)',
        transition: 'opacity 480ms ease, transform 720ms cubic-bezier(.22,1,.36,1)',
      }}
    >
      <AmbientLegacy />
      {/* Navbar du site PAR-DESSUS le hero : transparente en haut de page,
          reprend son fond solide dès qu'on scrolle (réf. Netflix). */}
      <Navbar forceScrolled={scrolled} />
      <style>{MOTION_CSS}</style>
      <style>{`
        @keyframes ah2-shimmer { to { background-position: -200% 0 } }
        @keyframes ah2-enter { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
        .ah2-enter-1 { animation: ah2-enter .65s .12s cubic-bezier(.22,1,.36,1) both }
        .ah2-enter-2 { animation: ah2-enter .65s .28s cubic-bezier(.22,1,.36,1) both }
        .ah2-seeall:hover { color: ${C.text} !important }
        .ah2-card:focus-visible { outline: 2px solid ${C.brass}; outline-offset: 3px; border-radius: 12px }

        /* ── Survol des cartes, en CSS ─────────────────────────────────────
           Le zoom et l'overlay étaient pilotés par un état React posé sur
           chaque carte : survoler une row la re-rendait entièrement, cartes
           comprises. Ici le navigateur s'en charge seul, sur le compositeur.
           Le focus clavier ouvre le même overlay — ses boutons étaient
           inatteignables autrement. */
        .ah2-art { transition: transform ${DUR.fast}s var(--mo-out), box-shadow ${DUR.base}s var(--mo-out) }
        /* Survol réservé aux souris : au doigt, :hover et le focus posé par
           le tap restaient collés (overlay figé sur la carte au retour). */
        @media (hover: hover) { .ah2-card:hover .ah2-art { transform: scale(1.045); box-shadow: ${SHADOW_CARD} } }
        .ah2-card:focus-visible .ah2-art { transform: scale(1.045); box-shadow: ${SHADOW_CARD} }
        .ah2-ov { opacity: 0; pointer-events: none; transition: opacity ${DUR.fast}s var(--mo-out) }
        @media (hover: hover) { .ah2-card:hover .ah2-ov { opacity: 1; pointer-events: auto } }
        .ah2-card.ah2-open .ah2-ov,
        .ah2-card:focus-visible .ah2-ov,
        .ah2-card:has(.ah2-ov :focus-visible) .ah2-ov { opacity: 1; pointer-events: auto }

        /* Flèches de row : visibles au survol de la row, ou dès qu'on les
           atteint au clavier. */
        .ah2-nav { opacity: 0; transition: opacity ${DUR.fast}s var(--mo-out) }
        .ah2-row:hover .ah2-nav,
        .ah2-nav:focus-visible { opacity: 1 }
        @media (hover: none) { .ah2-nav { display: none } }

        @media (prefers-reduced-motion: reduce) {
          .ah2-art, .ah2-ov, .ah2-nav { transition: none !important }
          .ah2-card:hover .ah2-art { transform: none !important }
        }
        /* Dans la GRILLE (pas les rows), les cartes remplissent leur cellule 1fr
           au lieu de rester à leur largeur fixe — sinon elles débordent les
           cellules plus étroites du mobile et créent un scroll horizontal. */
        .ah2-grid .ah2-card { width: 100% !important; }
        /* Hero plein écran : 100dvh suit le viewport VISIBLE (barre d'URL mobile
           qui apparaît/disparaît) → plus de hero trop haut ni de scroll qui se
           bat avec le toolbar en paysage. Fallback 100vh pour vieux navigateurs. */
        .ah2-hero { height: 100vh; height: 100dvh; }
        /* Mur de couvertures de la vue Scans : dérive lente, comme un présentoir qui défile. */
        @keyframes ah2-wall { from { transform: rotate(-4deg) scale(1.15) translateY(0) } to { transform: rotate(-4deg) scale(1.15) translateY(-70px) } }
        .ah2-scanwall { animation: ah2-wall 26s ease-in-out infinite alternate }

        /* ── Hero vivant ──
           Ken Burns : zoom lent du visuel actif. Parallaxe : --hx/--hy posés
           par le hub au mouvement de la souris (le visuel glisse à l'opposé).
           Cascade : eyebrow, titre, méta, synopsis, boutons entrent l'un après l'autre. */
        @keyframes ah2-kb { from { transform: scale(1.02) } to { transform: scale(1.11) } }
        .ah2-kb { animation: ah2-kb 16s cubic-bezier(.25,.1,.25,1) both; transform-origin: 60% 35% }
        .ah2-plx { transform: translate3d(calc(var(--hx, 0) * -16px), calc(var(--hy, 0) * -10px), 0); transition: transform .9s cubic-bezier(.22,1,.36,1) }
        @keyframes ah2-up { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
        .ah2-cascade > * { animation: ah2-up .7s cubic-bezier(.22,1,.36,1) both }
        .ah2-cascade > :nth-child(1) { animation-delay: .15s }
        .ah2-cascade > :nth-child(2) { animation-delay: .24s }
        .ah2-cascade > :nth-child(3) { animation-delay: .34s }
        .ah2-cascade > :nth-child(4) { animation-delay: .42s }
        .ah2-cascade > :nth-child(5) { animation-delay: .5s }
        .ah2-cascade > :nth-child(n+6) { animation-delay: .58s }
        @keyframes ah2-seg { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        .ah2-segfill { animation: ah2-seg 7s linear both }
        /* Téléphones (html.low-end) : toutes les animations y tombent à 0 ms —
           le segment, lui, doit garder ses 7 s, sinon les slides défilent en boucle. */
        html.low-end .ah2-keep { animation-duration: 7s !important }
        @media (prefers-reduced-motion: reduce) { .ah2-kb, .ah2-cascade > * { animation: none !important } .ah2-plx { transform: none !important } }
        @media (prefers-reduced-motion: reduce) { .ah2-fade { transition: none !important } .ah2-root { transition: none !important; transform: none !important; opacity: 1 !important } .ah2-enter-1, .ah2-enter-2 { animation: none !important } }
        /* Scrollbar sombre (la scrollbar Windows par défaut faisait une barre blanche) */
        .ah2-root { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.22) transparent; }
        .ah2-root::-webkit-scrollbar { width: 10px }
        .ah2-root::-webkit-scrollbar-track { background: transparent }
        .ah2-root::-webkit-scrollbar-thumb { background: rgba(255,255,255,.18); border-radius: 5px; border: 2px solid transparent; background-clip: content-box }
        .ah2-root::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.3); background-clip: content-box }
        /* ── Mobile (≤768px) : navigation confortable au doigt ──
           Toolbar : segmented control déroulant en ligne (scroll horizontal au
           lieu de wrap qui empile sur 3 lignes), stats masquées (place), cibles
           tactiles agrandies. Grille de cartes : pas plus serré → 3 par ligne. */
        /* La barre porte désormais l'onglet Animés / Scans : les stats passaient
           sur une seconde ligne sous 1700px. */
        @media (max-width: 1700px) { .ah2-stats { display: none !important; } }
        .ah2-filters { display: contents }
        @media (max-width: 768px) {
          /* Une seule ligne de filtres qui défile au doigt, bord à bord. */
          .ah2-filters {
            display: flex; flex: 1 1 100%; gap: 8px; align-items: center;
            overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none;
            margin: 0 -14px; padding: 0 14px; scroll-padding: 0 14px;
            -webkit-mask-image: linear-gradient(90deg, transparent, #000 14px, #000 calc(100% - 28px), transparent);
            mask-image: linear-gradient(90deg, transparent, #000 14px, #000 calc(100% - 28px), transparent);
          }
          .ah2-filters::-webkit-scrollbar { display: none }
          .ah2-filters > * { flex-shrink: 0 }
          .ah2-filters .ah2-seg { overflow: visible !important; }
          .ah2-filters button, .ah2-filters select { min-height: 40px; white-space: nowrap; }
          /* Hero raccourci : on voit la suite dès l'arrivée. */
          .ah2-hero { height: 74vh; height: 74svh; min-height: 480px; }
          .ah2-row h2 { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
          /* Toolbar NON-sticky sur mobile : reste à sa place, défile avec la page
             (!important bat le position:sticky inline). Fond opaque pour rester lisible. */
          .ah2-toolbar { position: static !important; top: auto !important; background: ${C.panel} !important; }
          .ah2-toolbar-inner { padding: 8px 14px !important; gap: 8px !important; }
          .ah2-search { flex: 1 1 100% !important; max-width: none !important; }
          .ah2-seg {
            overflow-x: auto; flex-wrap: nowrap;
            -webkit-overflow-scrolling: touch; scrollbar-width: none;
            max-width: 100%;
          }
          .ah2-seg::-webkit-scrollbar { display: none }
          .ah2-seg button { white-space: nowrap; min-height: 40px; }
          .ah2-toolbar-inner > button,
          .ah2-toolbar-inner select { min-height: 40px; }
          .ah2-stats { display: none !important; }
          .ah2-mode { flex: 1 1 100%; }
          .ah2-mode button { flex: 1; justify-content: center; min-height: 40px; }
          .ah2-scanwall { grid-template-columns: repeat(5, 1fr) !important; }
          .ah2-grid { grid-template-columns: repeat(auto-fill, minmax(108px, 1fr)) !important; gap: 12px !important; }
          .ah2-rank { font-size: 120px !important; height: 165px !important; }
          .ah2-top .ah2-card { width: 110px !important; }
        }
        @media (max-width: 380px) {
          .ah2-grid { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)) !important; }
        }
      `}</style>

      {/* ── HERO rotatif (masqué pendant une recherche) ── */}
      {!searching && mode === 'animes' && (
        <div className="ah2-enter-1 ah2-herowrap" onMouseEnter={() => setPaused(true)}
          onMouseLeave={e => { setPaused(false); e.currentTarget.style.setProperty('--hx', 0); e.currentTarget.style.setProperty('--hy', 0) }}
          onMouseMove={e => {
            // Parallaxe : variables CSS seulement, aucun rendu React par mouvement.
            if (!finePointer || reduced) return
            const r = e.currentTarget.getBoundingClientRect()
            e.currentTarget.style.setProperty('--hx', ((e.clientX - r.left) / r.width * 2 - 1).toFixed(3))
            e.currentTarget.style.setProperty('--hy', ((e.clientY - r.top) / r.height * 2 - 1).toFixed(3))
          }}
          onTouchStart={e => { const t = e.touches[0]; swipe.current = { x: t.clientX, y: t.clientY } }}
          onTouchEnd={e => {
            const s = swipe.current; swipe.current = null
            const t = e.changedTouches[0]
            if (!s || !t) return
            const dx = t.clientX - s.x, dy = t.clientY - s.y
            if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.4) return
            setSlide(i => (i + (dx < 0 ? 1 : slides.length - 1)) % slides.length)
          }}
          style={{ position: 'relative' }}>
          {slides.map((a, i) => (
            <div key={a.id} className="ah2-fade" style={{
              transition: 'opacity 700ms ease', opacity: i === slide ? 1 : 0,
              position: i === slide ? 'relative' : 'absolute', inset: 0, pointerEvents: i === slide ? 'auto' : 'none',
            }}>
              <HeroCinematic anime={a} topRank={top10.findIndex(t => t.id === a.id) + 1 || null}
                active={i === slide} load={visited.has(i)}
                // Depuis la fiche d'un anime, « Lire le manga » reprend la lecture en cours,
                // sinon là où l'anime s'arrête (JJK S2 → ch. 137) plutôt qu'au chapitre 1.
                onRead={SCAN_BY_ANIME.has(a.id) ? () => { const sc = SCAN_BY_ANIME.get(a.id); openScan(sc, scanProg[sc.slug].current ?? sc.animeEnd?.next ?? null) } : undefined}
                onWatch={openAnime} onMyList={toggleFav} inList={favs.has(a.id)} onInfo={openAnime} />
            </div>
          ))}
          {/* Indicateurs segments — au-dessus de la zone de chevauchement */}
          <div style={{ position: 'absolute', bottom: 140, left: GUTTER, zIndex: 3, display: 'flex', gap: 6 }}>
            {slides.map((s, i) => (
              // Le segment actif se remplit pendant les 7 s du slide (en pause au survol) ;
              // la zone cliquable déborde du trait fin pour rester facile à viser.
              <button key={s.id} aria-label={`${s.title} (${i + 1}/${slides.length})`} aria-current={i === slide} onClick={() => setSlide(i)} style={{
                width: 34, height: 15, border: 'none', cursor: 'pointer', padding: '6px 0', background: 'none',
              }}>
                <span style={{ display: 'block', position: 'relative', height: 3, borderRadius: 2, overflow: 'hidden', background: i < slide ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)' }}>
                  {i === slide && (
                    <span key={slide} className={reduced ? undefined : 'ah2-segfill ah2-keep'} style={{
                      position: 'absolute', inset: 0, background: themeFor(s).accent, transformOrigin: 'left',
                      animationPlayState: paused ? 'paused' : 'running',
                    }} onAnimationEnd={nextSlide} />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── En-tête de la vue Scans : mur de couvertures flouté ── */}
      {!searching && mode === 'scans' && (
        <header className="ah2-enter-1" style={{ position: 'relative', overflow: 'hidden', padding: `128px ${GUTTER} 70px` }}>
          <div aria-hidden className="ah2-scanwall" style={{
            position: 'absolute', inset: '-40px -40px 0', display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 10,
            transform: 'rotate(-4deg) scale(1.15)', opacity: 0.5, filter: 'saturate(1.1)',
            WebkitMaskImage: 'linear-gradient(180deg, #000 30%, transparent 96%)', maskImage: 'linear-gradient(180deg, #000 30%, transparent 96%)',
          }}>
            {[...SCANS, ...SCANS].slice(0, 22).map((s, i) => (
              <img key={i} src={s.cover} alt="" loading="lazy" decoding="async" style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: 8, transform: `translateY(${(i % 2) * 38}px)` }} />
            ))}
          </div>
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(10,15,28,.94) 0%, rgba(10,15,28,.72) 45%, rgba(10,15,28,.35) 100%)' }} />
          <div style={{ position: 'relative', maxWidth: 760 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span aria-hidden style={{ color: C.brass, fontSize: 16 }}>📖</span>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.22em', color: C.dim }}>SCANS · EN FRANÇAIS</span>
            </div>
            <h1 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(34px, 4.4vw, 60px)', lineHeight: 1.04, letterSpacing: '-0.02em' }}>
              Lis la suite.<br /><span style={{ color: C.brass }}>Sans attendre l'anime.</span>
            </h1>
            <p style={{ margin: '16px 0 0', fontSize: 15.5, lineHeight: 1.55, color: 'rgba(238,240,246,.86)' }}>
              {SCANS.length} séries · {TOTAL_CHAPTERS.toLocaleString('fr-FR')} chapitres, lecture page à page ou en défilement, reprise là où tu t'es arrêté.
            </p>
            {scansResume[0] && (
              <button onClick={() => openScan(scansResume[0], scanProg[scansResume[0].slug].current)} style={{
                marginTop: 22, display: 'inline-flex', alignItems: 'center', gap: 9, padding: '12px 22px', borderRadius: 10, cursor: 'pointer',
                fontFamily: FONT_BODY, fontSize: 14.5, fontWeight: 600, background: C.brass, border: 'none', color: '#14110A',
              }}>▶ Reprendre {scansResume[0].title} · ch. {Math.floor(Number(scanProg[scansResume[0].slug].current))}</button>
            )}
          </div>
        </header>
      )}

      {/* ── BLOC CONTENU : chevauche le bas fondu du hero (réf. Netflix) ── */}
      <div className="ah2-enter-2" style={{ position: 'relative', zIndex: 2, marginTop: searching ? 84 : mode === 'scans' ? 0 : -120 }}>
      {/* ── TOOLBAR (sticky desktop ; statique sur mobile : demande Freydiss, ne suit pas le scroll) ── */}
      <div ref={toolbarRef} className="ah2-toolbar" style={{
        position: 'sticky', top: 64, zIndex: 4,
        // posée sur le hero : voile léger + blur (lisible sur keyart clair)
        // sans la bande sombre pleine ; panel complet une fois sticky.
        background: toolbarStuck ? C.panel : 'rgba(11,14,20,.38)',
        backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${toolbarStuck ? C.hair : 'transparent'}`,
        borderRadius: '12px 12px 0 0',
        transition: 'background 200ms ease, border-color 200ms ease',
      }}>
        <div className="ah2-toolbar-inner" style={{ padding: `10px ${GUTTER}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Vue : Animés / Scans */}
          <div role="tablist" aria-label="Catalogue" className="ah2-mode" style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 11, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.hair}` }}>
            {[['animes', '▶ Animés', ANIMES.length], ['scans', '📖 Scans', SCANS.length]].map(([id, label, n]) => {
              const on = mode === id
              return (
                <button key={id} role="tab" aria-selected={on} onClick={() => { if (!on) setMode(id) }} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                  fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 700, border: 'none', whiteSpace: 'nowrap',
                  background: on ? C.brass : 'transparent', color: on ? '#14110A' : C.dim,
                  transition: 'background 160ms ease, color 160ms ease',
                }}>{label}<span style={{ fontSize: 11, fontWeight: 600, opacity: 0.7 }}>{n}</span></button>
              )
            })}
          </div>
          {/* Recherche */}
          <div className="ah2-search" style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
            <span aria-hidden style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.faint, fontSize: 13 }}>⌕</span>
            <input
              ref={searchRef}
              value={query} onChange={e => { setQuery(e.target.value); setSgOpen(true); setSgActive(-1) }} placeholder={(mode === 'scans' ? 'Titre, auteur…' : 'Rechercher un animé…') + kbdHint}
              aria-label="Rechercher"
              role="combobox" aria-expanded={sgOpen && suggestions.length > 0} aria-controls="ah2-suggest" aria-autocomplete="list"
              aria-activedescendant={sgActive >= 0 ? `ah2-sg-${sgActive}` : undefined}
              onKeyDown={e => {
                if (e.key === 'Escape') { setSgOpen(false); return }
                if (!suggestions.length) return
                if (e.key === 'ArrowDown') { e.preventDefault(); setSgOpen(true); setSgActive(i => Math.min(suggestions.length - 1, i + 1)) }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setSgActive(i => Math.max(-1, i - 1)) }
                else if (e.key === 'Enter') {
                  if (sgActive >= 0 && sgOpen) pickSuggestion(suggestions[sgActive])
                  else { setSgOpen(false); e.currentTarget.blur() } // la grille filtrée prend le relais
                }
              }}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 32px', borderRadius: 9,
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.hair}`, outline: 'none',
                color: C.text, fontSize: 13.5, fontFamily: FONT_BODY,
              }}
              onFocus={e => { e.target.style.borderColor = C.brass; setSgOpen(true) }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; setSgOpen(false); setSgActive(-1) }}
            />
            <AnimatePresence>
              {sgOpen && query.trim().length > 0 && (
                <SearchSuggest key="sg" items={suggestions} active={sgActive} onHover={setSgActive} onPick={pickSuggestion} total={suggestTotal} />
              )}
            </AnimatePresence>
          </div>
          {/* Filtres : display:contents sur grand écran (rien ne change), une
              seule ligne qui défile au doigt sur téléphone (avant : 3 lignes). */}
          <div className="ah2-filters">
          {/* Segmented */}
          <div className="ah2-seg" style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3 }}>
            {mode === 'scans'
              ? <>{segBtn('tous', 'Tous')}{segBtn('encours', 'En cours')}{segBtn('avoir', 'À lire')}{segBtn('termine', 'Lus')}{segBtn('parution', 'En parution')}</>
              : <>{segBtn('tous', 'Tous')}{segBtn('encours', 'En cours')}{segBtn('avoir', 'À voir')}{segBtn('termine', 'Terminé')}{segBtn('favoris', 'Favoris')}</>}
          </div>
          {/* Genres multi-select (animés seulement) */}
          {mode === 'animes' && <div style={{ position: 'relative' }}>
            <button onClick={() => setGenresOpen(v => !v)} style={{
              padding: '8px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 13,
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${genreSel.size ? C.brass : C.hair}`,
              color: genreSel.size ? C.brass : C.dim,
            }}>Genres{genreSel.size ? ` · ${genreSel.size}` : ''}</button>
            {genresOpen && !narrow && (
              <>
                <div onClick={() => setGenresOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 5 }} />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 6, width: 260, maxHeight: 300, overflowY: 'auto',
                  background: '#11151F', border: `1px solid ${C.hair2}`, borderRadius: RADIUS_PANEL, padding: 8,
                  boxShadow: '0 18px 40px -22px rgba(0,0,0,.8)',
                }}>
                  {allGenres.map(g => {
                    const on = genreSel.has(g)
                    return (
                      <button key={g} onClick={() => setGenreSel(prev => { const n = new Set(prev); on ? n.delete(g) : n.add(g); return n })}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: on ? 'rgba(255,255,255,0.06)' : 'transparent', color: on ? C.text : C.dim, fontSize: 13, fontFamily: FONT_BODY }}>
                        <span style={{ width: 14, color: C.brass }}>{on ? '✓' : ''}</span>{g}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
            {/* Téléphone : tiroir du bas, porté sur <body> (la ligne de filtres
                défile, elle couperait un menu déroulant). Genres en pastilles. */}
            {narrow && createPortal(
              <AnimatePresence>
                {genresOpen && (
                  <motion.div key="gs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setGenresOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 10040, background: 'rgba(3,5,10,.62)', display: 'flex', alignItems: 'flex-end' }}>
                    <motion.div role="dialog" aria-label="Genres" onClick={e => e.stopPropagation()}
                      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 420, damping: 40 }}
                      drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
                      onDragEnd={(_, i) => { if (i.offset.y > 90 || i.velocity.y > 500) setGenresOpen(false) }}
                      style={{ width: '100%', background: '#11151F', borderTop: `1px solid ${C.hair2}`, borderRadius: '18px 18px 0 0', padding: '10px 16px calc(18px + env(safe-area-inset-bottom))', fontFamily: FONT_BODY, color: C.text }}>
                      <div aria-hidden style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.22)', margin: '0 auto 14px' }} />
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                        <strong style={{ fontFamily: FONT_DISPLAY, fontSize: 17 }}>Genres</strong>
                        {genreSel.size > 0 && <button onClick={() => setGenreSel(new Set())} style={{ background: 'none', border: 'none', color: C.dim, fontSize: 13, fontFamily: FONT_BODY }}>Effacer</button>}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: '46vh', overflowY: 'auto' }}>
                        {allGenres.map(g => {
                          const on = genreSel.has(g)
                          return (
                            <button key={g} aria-pressed={on} onClick={() => setGenreSel(prev => { const n = new Set(prev); on ? n.delete(g) : n.add(g); return n })}
                              style={{ minHeight: 40, padding: '0 14px', borderRadius: 999, fontSize: 14, fontFamily: FONT_BODY, fontWeight: 600, background: on ? C.brass : 'rgba(255,255,255,0.06)', color: on ? '#14110A' : C.text, border: `1px solid ${on ? C.brass : C.hair2}` }}>{g}</button>
                          )
                        })}
                      </div>
                      <button onClick={() => setGenresOpen(false)} style={{ width: '100%', marginTop: 16, minHeight: 48, borderRadius: 12, border: 'none', background: C.brass, color: '#14110A', fontSize: 15, fontWeight: 800, fontFamily: FONT_BODY }}>
                        {genreSel.size ? `Voir ${filtered.length} animé${filtered.length > 1 ? 's' : ''}` : 'Fermer'}
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>, document.body)}
          </div>}
          {/* Tri */}
          <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Trier" style={{
            padding: '8px 10px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.hair}`,
            color: C.dim, fontSize: 13, fontFamily: FONT_BODY, cursor: 'pointer',
          }}>
            {mode === 'scans' ? <>
              <option value="populaire">Récemment lus</option>
              <option value="note">Mieux notés</option>
              <option value="chapitres">Plus de chapitres</option>
              <option value="az">A–Z</option>
            </> : <>
              <option value="populaire">Populaire</option>
              <option value="recent">Récent</option>
              <option value="az">A–Z</option>
            </>}
          </select>
          {/* Repris de l'ancien hub : anime au hasard + accès Mon Univers */}
          <button onClick={() => {
            if (mode === 'scans') { const s = SCANS[Math.floor(Math.random() * SCANS.length)]; openScan(s, scanProg[s.slug].current); return }
            openAnime(ANIMES[Math.floor(Math.random() * ANIMES.length)])
          }}
            title={mode === 'scans' ? 'Un manga au hasard' : 'Un animé au hasard'} aria-label={mode === 'scans' ? 'Un manga au hasard' : 'Un animé au hasard'} style={{
              padding: '8px 12px', borderRadius: 9, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 13,
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.hair}`, color: C.dim,
            }}>Surprends-moi</button>
          {props.onOpenMonUnivers && (
            <button onClick={props.onOpenMonUnivers} style={{
              padding: '8px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600,
              background: 'rgba(215,164,74,0.12)', border: `1px solid ${C.brass}55`, color: C.brass,
            }}>Mon Univers</button>
          )}
          </div>
          <span style={{ flex: 1 }} />
          {/* Stats inline */}
          <span className="ah2-stats" style={{ fontSize: 12.5, color: 'rgba(238,240,246,.78)', whiteSpace: 'nowrap', textShadow: '0 1px 8px rgba(0,0,0,.6)' }}>
            {mode === 'scans'
              ? `${SCANS.length} séries · ${TOTAL_CHAPTERS.toLocaleString('fr-FR')} chapitres · ${scanStats.encours} en cours · ${scanStats.lus} lus`
              : `${stats.total} séries · ${stats.encours} en cours · ${stats.nouveautes} nouveautés · ${stats.favoris} favoris`}
          </span>
        </div>
      </div>

      {/* ── CONTENU ── */}
      {/* Conteneur COMMUN à toutes les sections : pleine largeur avec la
          gouttière GUTTER — la toolbar et le hero (texte) s'alignent dessus. */}
      <div style={{ padding: `24px ${GUTTER} 90px` }}>
        {mode === 'scans' ? (
          searching ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
                <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 18 }}>{resultsLabel(filteredScans.length)}</h2>
                <button onClick={clearFilters} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, fontSize: 13, fontFamily: FONT_BODY }}>Tout effacer</button>
              </div>
              {filteredScans.length === 0 ? (
                <p style={{ color: C.faint, fontSize: 14 }}>
                  {seg === 'encours' ? "Aucun scan entamé pour l'instant — ouvre un chapitre, il apparaîtra ici."
                    : seg === 'termine' ? 'Aucune série lue en entier. Courage.'
                    : 'Aucun scan ne correspond. Essaie un autre titre ou un auteur.'}
                </p>
              ) : (
                <div className="ah2-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 18 }}>
                  {filteredScans.map(s => <ScanCard key={s.slug} scan={s} progress={scanProg[s.slug]} onOpen={openScan} />)}
                </div>
              )}
            </>
          ) : (
            <>
              {scansResume.length > 0 && (
                <AnimeRow title="▶ Reprendre la lecture" count={scansResume.length}>
                  {scansResume.map(s => <ScanResumeCard key={s.slug} scan={s} progress={scanProg[s.slug]} onOpen={openScan} />)}
                </AnimeRow>
              )}
              {SCANS.filter(s => s.status === 'encours').length >= 3 && (
                <AnimeRow title="🟢 En parution · nouveaux chapitres chaque semaine" count={SCANS.filter(s => s.status === 'encours').length} onSeeAll={() => setSeg('parution')}>
                  {SCANS.filter(s => s.status === 'encours').map(s => <ScanCard key={s.slug} scan={s} progress={scanProg[s.slug]} onOpen={openScan} />)}
                </AnimeRow>
              )}
              <AnimeRow title="★ Les mieux notés" count={Math.min(8, SCANS.length)}>
                {[...SCANS].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 8).map((s, i) => (
                  <div key={s.slug} className="ah2-top" style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
                    <span aria-hidden className="ah2-rank" style={{
                      height: 213, display: 'flex', alignItems: 'flex-end', marginRight: i === 0 ? -4 : -20, paddingLeft: i === 0 ? 10 : 0,
                      fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 176, lineHeight: 0.78, letterSpacing: '-0.09em',
                      color: C.bg0, WebkitTextStroke: `2.5px ${i < 3 ? C.brass : 'rgba(255,255,255,0.38)'}`, userSelect: 'none',
                    }}>{i + 1}</span>
                    <div style={{ position: 'relative', zIndex: 1 }}><ScanCard scan={s} progress={scanProg[s.slug]} onOpen={openScan} width={142} /></div>
                  </div>
                ))}
              </AnimeRow>
              <section style={{ padding: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '6px 0 16px' }}>
                  <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 18, margin: 0 }}>Tous les scans</h2>
                  <span style={{ fontSize: 12.5, color: C.faint, fontWeight: 400 }}>{filteredScans.length}</span>
                  <span aria-hidden style={{ flex: 1, alignSelf: 'center', height: 1, marginLeft: 6, borderRadius: 1, background: `linear-gradient(90deg, ${C.brass}59, ${C.brass}14 45%, transparent)` }} />
                </div>
                <div className="ah2-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 18 }}>
                  {filteredScans.map(s => <ScanCard key={s.slug} scan={s} progress={scanProg[s.slug]} onOpen={openScan} />)}
                </div>
              </section>
            </>
          )
        ) : searching ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 18 }}>{resultsLabel(filtered.length)}</h2>
              <button onClick={clearFilters} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, fontSize: 13, fontFamily: FONT_BODY }}>Tout effacer</button>
            </div>
            {filtered.length === 0 ? (
              <p style={{ color: C.faint, fontSize: 14 }}>{scanHits.length ? 'Aucun animé, mais des scans correspondent :' : 'Aucun résultat. Essaie de retirer des filtres ou de modifier la recherche.'}</p>
            ) : (
              <div className="ah2-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 18 }}>
                {filtered.map(a => card(a, undefined))}
              </div>
            )}
            {scanHits.length > 0 && (
              <section style={{ padding: 0, marginTop: 34 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
                  <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 18, margin: 0 }}>📖 Scans</h2>
                  <span style={{ fontSize: 12.5, color: C.faint }}>{scanHits.length}</span>
                  <span aria-hidden style={{ flex: 1, alignSelf: 'center', height: 1, marginLeft: 6, background: `linear-gradient(90deg, ${C.brass}59, ${C.brass}14 45%, transparent)` }} />
                </div>
                <div className="ah2-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 18 }}>
                  {scanHits.map(s => <ScanCard key={s.slug} scan={s} progress={scanProg[s.slug]} onOpen={openScan} />)}
                </div>
              </section>
            )}
          </>
        ) : (
          <>
            {/* ── ▶ Reprendre (unifié : épisodes anime + chapitres scans) ──
                Anime = reprise serveur (connecté). Scan One Piece = progression
                locale du lecteur (visible même déconnecté). Masquée si tout vide. */}
            {(continueWatch.length > 0 || scansResume.length > 0) && (
              <AnimeRow title="▶ Reprendre" count={continueWatch.length + scansResume.length}>
                {scansResume.slice(0, 4).map(s => <ScanResumeCard key={`cs-${s.slug}`} scan={s} progress={scanProg[s.slug]} onOpen={openScan} />)}
                {continueWatch.map(({ anime: a, episode, pct }) => (
                  <div key={`cw-${a.id}`} style={{ width: 280, flexShrink: 0 }}>
                    <div role="button" tabIndex={0} onClick={() => openAnime(a)} onKeyDown={e => { if (e.key === 'Enter') openAnime(a) }} style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: 'rgba(255,255,255,0.04)' }} className="ah2-card">
                      <img src={wideArt(a)} alt="" loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: hasKeyart(a.id) || bannerSrc(a.id) ? 'center' : (a.coverPosition || 'center') }} />
                      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(11,14,20,0.9))' }} />
                      {episode != null && (
                        <span style={{ position: 'absolute', top: 10, left: 10, padding: '3px 8px', borderRadius: 7, fontSize: 11.5, fontWeight: 700, background: 'rgba(0,0,0,0.62)', color: C.text}}>Ép {episode}</span>
                      )}
                      <div style={{ position: 'absolute', left: 10, bottom: 12, right: 10 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.title}</div>
                      </div>
                      <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,0.15)' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: C.brass }} />
                      </div>
                    </div>
                  </div>
                ))}
              </AnimeRow>
            )}

            {/* ── 👥 Tes amis regardent (connecté · masquée si vide) ── */}
            {discordId && friendsRows.length > 0 && (
              <AnimeRow title="👥 Tes amis regardent" count={friendsRows.length}>
                {friendsRows.map(({ anime: a, friends }) => (
                  <div key={`fw-${a.id}`} style={{ width: 280, flexShrink: 0 }}>
                    <div role="button" tabIndex={0} onClick={() => openAnime(a)} onKeyDown={e => { if (e.key === 'Enter') openAnime(a) }} style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: 'rgba(255,255,255,0.04)' }} className="ah2-card">
                      <img src={wideArt(a)} alt="" loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: hasKeyart(a.id) || bannerSrc(a.id) ? 'center' : (a.coverPosition || 'center') }} />
                      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 45%, rgba(11,14,20,0.92))' }} />
                      <div style={{ position: 'absolute', left: 10, bottom: 10, right: 10, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
                          <div style={{ fontSize: 11.5, color: C.dim, marginTop: 2 }}>{friends.length} ami{friends.length > 1 ? 's' : ''}</div>
                        </div>
                        {/* Pile d'avatars (max 4 + compteur) */}
                        <div style={{ display: 'flex', flexDirection: 'row-reverse', flexShrink: 0 }}>
                          {friends.length > 4 && (
                            <span title={`+${friends.length - 4}`} style={{ width: 26, height: 26, borderRadius: '50%', marginLeft: -8, border: '2px solid #0b0e14', background: 'rgba(255,255,255,0.12)', color: C.text, fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+{friends.length - 4}</span>
                          )}
                          {friends.slice(0, 4).reverse().map((f, i) => (
                            <span key={f.user_id || i} title={f.username || ''} style={{ width: 26, height: 26, borderRadius: '50%', marginLeft: -8, border: '2px solid #0b0e14', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}>
                              {f.avatar_url
                                ? <img src={f.avatar_url} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <span style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.text }}>{(f.username || '?').slice(0, 1).toUpperCase()}</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </AnimeRow>
            )}

            {/* Visionnage en cours (local, visible sans compte). Les séries déjà
                 dans « ▶ Reprendre » (reprise serveur) n'y sont pas répétées. */}
            {resume.filter(a => !continueWatch.some(c => c.anime.id === a.id)).length > 0 && (
              <AnimeRow title="Continuer à regarder" count={resume.filter(a => !continueWatch.some(c => c.anime.id === a.id)).length}>
                {resume.filter(a => !continueWatch.some(c => c.anime.id === a.id)).map(a => (
                  <div key={a.id} style={{ width: 280, flexShrink: 0 }}>
                    <div role="button" tabIndex={0} onClick={() => openAnime(a)} onKeyDown={e => { if (e.key === 'Enter') openAnime(a) }} style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: 'rgba(255,255,255,0.04)' }} className="ah2-card">
                      <img src={wideArt(a)} alt="" loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: hasKeyart(a.id) || bannerSrc(a.id) ? 'center' : (a.coverPosition || 'center') }} />
                      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(11,14,20,0.9))' }} />
                      <div style={{ position: 'absolute', left: 10, bottom: 10, right: 10 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.title}</div>
                        {progress[a.id]?.lastTitle && (
                          <div style={{ fontSize: 12, color: C.text, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            ▶ {progress[a.id].lastTitle}
                          </div>
                        )}
                        <div style={{ fontSize: 11.5, color: C.dim, marginTop: 2 }}>{progress[a.id]?.label}</div>
                      </div>
                      <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,0.15)' }}>
                        <div style={{ width: `${progress[a.id]?.pct || 0}%`, height: '100%', background: C.brass }} />
                      </div>
                    </div>
                  </div>
                ))}
              </AnimeRow>
            )}

            {/* ── Ma liste : les favoris (cœur / « + Ma liste ») n'apparaissaient
                 que via le filtre Favoris, jamais sur l'accueil du hub. */}
            {favs.size > 0 && (
              <AnimeRow title="♥ Ma liste" count={favs.size} onSeeAll={() => setSeg('favoris')}>
                {ANIMES.filter(a => favs.has(a.id)).map(a => card(a, 158))}
              </AnimeRow>
            )}

            <AnimeRow title={topCounts?.length ? 'Top du moment · les + regardés du serveur' : 'Top du moment'} count={10}>
              {/* Rang en chiffre géant détouré derrière l'affiche (réf. Top 10 Netflix) */}
              {top10.map((a, i) => (
                <div key={a.id} className="ah2-top" style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
                  <span aria-hidden className="ah2-rank" style={{
                    // « 1 » est étroit : sans marge il disparaissait sous l'affiche et contre le bord.
                    height: 213, display: 'flex', alignItems: 'flex-end', marginRight: i === 0 ? -4 : i === 9 ? -30 : -20, paddingLeft: i === 0 ? 10 : 0,
                    fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 176, lineHeight: 0.78, letterSpacing: '-0.09em',
                    color: C.bg0, WebkitTextStroke: `2.5px ${i < 3 ? C.brass : 'rgba(255,255,255,0.38)'}`,
                    textShadow: i < 3 ? `0 0 34px ${C.brass}40` : 'none', userSelect: 'none',
                  }}>{i + 1}</span>
                  <div style={{ position: 'relative', zIndex: 1 }}>{card(a, 142)}</div>
                </div>
              ))}
            </AnimeRow>

            {news.length > 0 && (
              <AnimeRow title="Nouveautés" count={news.length}>
                {news.map(a => (
                  <BackdropCard key={a.id} anime={{ ...a, badge: badgeOf(a) }} width={300}
                    progressPct={progress[a.id]?.pct || 0} onOpen={openAnime} />
                ))}
              </AnimeRow>
            )}

            {/* ── Scans : couvertures officielles, progression et reprise.
                 « Tout voir » bascule sur la vue Scans complète. */}
            <AnimeRow title="📖 Scans · lis la suite" count={SCANS.length} onSeeAll={() => setMode('scans')}>
              {SCANS.map(s => <ScanCard key={s.slug} scan={s} progress={scanProg[s.slug]} onOpen={openScan} />)}
            </AnimeRow>

            {becauseSeed && becauseList.length >= 3 && (
              <AnimeRow title={`Parce que tu regardes ${becauseSeed.title}`} count={becauseList.length}>
                {becauseList.map(a => card(a, 158))}
              </AnimeRow>
            )}

            {filmList.length >= 3 && (
              <AnimeRow title="🎬 Films" count={filmList.length}>
                {filmList.map(a => (
                  <BackdropCard key={a.id} anime={{ ...a, badge: badgeOf(a) }} width={300}
                    progressPct={progress[a.id]?.pct || 0} onOpen={openAnime} />
                ))}
              </AnimeRow>
            )}

            {bingeList.length >= 3 && (
              <AnimeRow title="À binge ce week-end" count={bingeList.length}>
                {bingeList.map(a => card(a, 158))}
              </AnimeRow>
            )}

            {genreRowList.map(({ genre: g, list }) => (
              <AnimeRow key={g} title={g} count={list.length} onSeeAll={() => setGenreSel(new Set([g]))}>
                {list.map(a => (
                  <BackdropCard key={a.id} anime={{ ...a, badge: badgeOf(a) }} width={300}
                    progressPct={progress[a.id]?.pct || 0} onOpen={openAnime} />
                ))}
              </AnimeRow>
            ))}

            {/* Tous les animés — grille paginée par 21 (padding:0 vs section global) */}
            <section style={{ padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '6px 0 16px' }}>
                <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 18, margin: 0 }}>Tous les animés</h2>
                <span style={{ fontSize: 12.5, color: C.faint, fontWeight: 400 }}>{filtered.length}</span>
                <span aria-hidden style={{ flex: 1, alignSelf: 'center', height: 1, marginLeft: 6, borderRadius: 1, background: `linear-gradient(90deg, ${C.brass}59, ${C.brass}14 45%, transparent)` }} />
              </div>
              <div className="ah2-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 18 }}>
                {filtered.slice(0, shown).map(a => card(a, undefined))}
              </div>
              {filtered.length > shown && (
                <div style={{ textAlign: 'center', marginTop: 26 }}>
                  <button onClick={() => setShown(s => s + 21)} style={{
                    padding: '11px 28px', borderRadius: 10, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600,
                    background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.hair2}`, color: C.text,
                  }}>Afficher plus</button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
      </div>{/* fin bloc contenu chevauchant */}
      <LongPressHint active={mode === 'animes' && !searching} />
      <AnimatePresence>
        {preview && (() => {
          const a = preview.anime
          const sc = SCAN_BY_ANIME.get(a.id)
          const p = progress[a.id]
          const n = episodeCount(a.id)
          const meta = [
            p?.pct > 0 ? `${p.pct} % vu` : null,
            a.year || null,
            a.type === 'Film' ? 'Film' : n > 0 ? `${n} épisodes` : 'Série',
            sc ? `${sc.chapters} ch. en scan` : null,
          ].filter(Boolean)
          return (
            <HoverPreview key={a.id} anime={a} rect={preview.rect} art={wideArt(a)} meta={meta}
              progressPct={p?.pct || 0} inList={favs.has(a.id)}
              onWatch={openAnime} onToggleList={toggleFav}
              onRead={sc ? () => openScan(sc, scanProg[sc.slug].current ?? sc.animeEnd?.next ?? null) : undefined}
              onEnter={() => clearTimeout(pvTimer.current)} />
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
