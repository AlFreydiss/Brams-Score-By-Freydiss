// ── Animés & Scans v2 — hub streaming premium (Netflix/Crunchyroll/Prime) ───
// Orchestrateur : HeroCinematic rotatif → toolbar sticky (recherche, filtres,
// tri) → rows embla (Reprendre, Top 10, Nouveautés, genres) → grille « Tous »
// paginée par 21. Catalogue + navigation = l'existant (ANIMES d'AnimeHub,
// progression localStorage, pages animes dédiées). Rollback : re-pointer
// App.jsx sur AnimeHub.
import { useEffect, useMemo, useRef, useState } from 'react'
import { ANIMES, SEARCH_ALIASES } from '../AnimeHub.jsx'
import Navbar from '../Navbar.jsx'
import { C, FONT_BODY, FONT_DISPLAY, RADIUS_PANEL } from './tokens.js'
import HeroCinematic from './HeroCinematic.jsx'
import AnimeRow from './AnimeRow.jsx'
import AnimeCard, { BackdropCard } from './AnimeCard.jsx'

const HERO_IDS = ['onepiece', 'kaiju-no-8', 'bleach', 'aot', 'jjk'] // 5 à la une
// Bannières PAYSAGE officielles (AniList, hébergées R2) pour le hero — les
// posters portrait étirés en pleine largeur rendaient l'image méconnaissable.
const KEYART_R2 = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/keyart'
const HERO_KEYART = {
  onepiece: `${KEYART_R2}/onepiece.jpg`,
  'kaiju-no-8': `${KEYART_R2}/kaiju-no-8.jpg`,
  bleach: `${KEYART_R2}/bleach.jpg`,
  aot: `${KEYART_R2}/aot.jpg`,
  jjk: `${KEYART_R2}/jjk.jpg`,
}
// Vraies nouveautés : dans les données historiques presque TOUT portait le badge
// « NOUVEAU » (27/29) — on le réserve aux derniers ajouts réels du catalogue.
const NEW_IDS = new Set(['kaiju-no-8', 'bleach', 'fireforce', 'bluelock', 'domestic-na-kanojo', 'kaguya'])
const displayBadge = (a) => (a.badge === 'NOUVEAU' ? (NEW_IDS.has(a.id) ? 'NOUVEAU' : null) : a.badge)
const FAVS_KEY = 'animehub_favs'
const NORM = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// ── Fond d'ambiance de l'ANCIEN hub, réincorporé tel quel : bleu nuit + deux
// halos, étoiles scintillantes (certaines colorées), orbes dérivants, scanline.
const LEGACY_BG = 'radial-gradient(1100px 820px at 72% 82%, rgba(46,96,179,0.22), transparent 60%), radial-gradient(820px 620px at 28% -5%, rgba(34,54,120,0.20), transparent 55%), linear-gradient(180deg, #0a0f1c 0%, #070a13 60%, #05070f 100%)'
const ORB_COLORS = ['rgba(224,82,74,0.85)', 'rgba(108,92,231,0.85)', 'rgba(0,184,148,0.8)', 'rgba(201,162,39,0.85)']

function AmbientLegacy() {
  const stars = useMemo(() => Array.from({ length: 70 }, (_, i) => ({
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
        @keyframes ah2Scan { 0% { top:-2px } 100% { top:100% } }
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
          position: 'absolute', left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(224,82,74,.06), rgba(224,82,74,.14), rgba(224,82,74,.06), transparent)',
          animation: 'ah2Scan 18s linear infinite',
        }} />
      </div>
    </div>
  )
}

// Progression localStorage (mêmes clés que les pages de lecture : <ns>_vp /
// <ns>_video_progress) — réimplémentation compacte de computeVideo.
function readProgress(ns) {
  try {
    const structured = JSON.parse(localStorage.getItem(`${ns}_video_progress`) || 'null')
    if (structured?.episodes) {
      const eps = Object.values(structured.episodes)
      const total = eps.length || 12
      const done = eps.filter(e => e?.completed).length
      return { pct: Math.round((done / total) * 100), label: `${done}/${total} épisodes` }
    }
    const flat = JSON.parse(localStorage.getItem(`${ns}_vp`) || '{}')
    const keys = Object.keys(flat)
    if (!keys.length) return { pct: 0, label: '' }
    const done = keys.filter(k => flat[k]?.completed).length
    return { pct: Math.round((done / keys.length) * 100), label: `${done}/${keys.length} épisodes` }
  } catch { return { pct: 0, label: '' } }
}

export default function AnimeHubV2(props) {
  // Mapping id → handler de navigation (mêmes props qu'AnimeHub historique).
  const open = (id) => ({
    onepiece: props.onOpenOnepiece, tpn: props.onOpenTpn, drstone: props.onOpenDrstone, jjk: props.onOpenJjk,
    kingdom: props.onOpenKingdom, aot: props.onOpenAot, kny: props.onOpenKny, nnt: props.onOpenNnt, sl: props.onOpenSl,
    dbs: props.onOpenDbs, 'violet-evergarden': props.onOpenViolet, vivy: props.onOpenVivy,
    'love-prism': props.onOpenLovePrism, 'carole-tuesday': props.onOpenCaroleTuesday,
    'bunny-girl': props.onOpenBunnyGirl, 'rent-girlfriend': props.onOpenRentGirlfriend,
    bc: props.onOpenBc, mha: props.onOpenMha, fireforce: props.onOpenFireforce, bleach: props.onOpenBleach,
    'kaiju-no-8': props.onOpenKaiju, bluelock: props.onOpenBluelock, 'fate-zero': props.onOpenFateZero,
    'your-name': props.onOpenYourName, 'your-lie': props.onOpenYourLie, 'domestic-na-kanojo': props.onOpenDomestic,
    'koi-ameagari': props.onOpenKoi, bubble: props.onOpenBubble, reze: props.onOpenReze,
    kaguya: props.onOpenKaguya,
  })[id]
  const openAnime = (a) => open(a.id)?.()

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

  // ── Hero rotatif (8 s, pause hover, crossfade, reduced-motion = statique) ──
  const slides = useMemo(() => HERO_IDS
    .map(id => ANIMES.find(a => a.id === id))
    .filter(Boolean)
    .map(a => ({ ...a, keyart: HERO_KEYART[a.id] || a.coverImage, keyartPosition: 'center 30%' })), [])
  const [slide, setSlide] = useState(0)
  const [paused, setPaused] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  // Toolbar : transparente posée sur le fondu du hero, fond + blur SEULEMENT
  // une fois collée sous la navbar (sinon bande sombre qui tranche le hero)
  const [toolbarStuck, setToolbarStuck] = useState(false)
  const toolbarRef = useRef(null)
  const reduced = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, [])
  useEffect(() => {
    if (reduced || paused || slides.length < 2) return
    const t = setInterval(() => setSlide(s => (s + 1) % slides.length), 5000)
    return () => clearInterval(t)
  }, [reduced, paused, slides.length])

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
      const p = progress[a.id]?.pct || 0
      if (seg === 'encours' && !(p > 0 && p < 100)) return false
      if (seg === 'termine' && p < 100) return false
      if (seg === 'avoir' && p !== 0) return false
      if (seg === 'favoris' && !favs.has(a.id)) return false
      if (debounced && !NORM(`${a.title} ${a.subtitle} ${(a.genres || []).join(' ')} ${(SEARCH_ALIASES[a.id] || []).join(' ')}`).includes(NORM(debounced))) return false
      return true
    })
    if (sort === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'fr'))
    else if (sort === 'recent') list = [...list].sort((a, b) => (b.badge === 'NOUVEAU' ? 1 : 0) - (a.badge === 'NOUVEAU' ? 1 : 0))
    return list
  }, [debounced, seg, genreSel, sort, favs, progress])

  const searching = debounced.trim().length > 0
  const stats = useMemo(() => ({
    total: ANIMES.length,
    encours: ANIMES.filter(a => { const p = progress[a.id]?.pct || 0; return p > 0 && p < 100 }).length,
    nouveautes: ANIMES.filter(a => displayBadge(a) === 'NOUVEAU').length,
    favoris: favs.size,
  }), [progress, favs])

  // Rows
  const resume = ANIMES.filter(a => { const p = progress[a.id]?.pct || 0; return p > 0 && p < 100 })
  const top10 = ANIMES.slice(0, 10)
  const news = ANIMES.filter(a => displayBadge(a) === 'NOUVEAU')
  const rowGenres = ['Action', 'Romance', 'Drame', 'Science-fiction']

  const card = (a, w = 180) => (
    <AnimeCard key={a.id} anime={{ ...a, badge: displayBadge(a) }} width={w}
      progressPct={progress[a.id]?.pct || 0}
      onOpen={openAnime} onPlay={openAnime}
      onToggleList={toggleFav} inList={favs.has(a.id)} />
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
      className="ah2-root"
      onScroll={e => {
        setScrolled(e.currentTarget.scrollTop > 24)
        const r = toolbarRef.current?.getBoundingClientRect()
        if (r) setToolbarStuck(r.top <= 65)
      }}
      style={{
        position: 'fixed', inset: 0, zIndex: 60, overflowY: 'auto', overflowX: 'hidden',
        background: LEGACY_BG, fontFamily: FONT_BODY, color: C.text,
      }}
    >
      <AmbientLegacy />
      {/* Navbar du site PAR-DESSUS le hero : transparente en haut de page,
          reprend son fond solide dès qu'on scrolle (réf. Netflix). */}
      <Navbar forceScrolled={scrolled} />
      <style>{`
        @keyframes ah2-shimmer { to { background-position: -200% 0 } }
        .ah2-seeall:hover { color: ${C.text} !important }
        .ah2-card:focus-visible { outline: 2px solid ${C.brass}; outline-offset: 3px; border-radius: 12px }
        @media (prefers-reduced-motion: reduce) { .ah2-fade { transition: none !important } }
        /* Scrollbar sombre (la scrollbar Windows par défaut faisait une barre blanche) */
        .ah2-root { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.22) transparent; }
        .ah2-root::-webkit-scrollbar { width: 10px }
        .ah2-root::-webkit-scrollbar-track { background: transparent }
        .ah2-root::-webkit-scrollbar-thumb { background: rgba(255,255,255,.18); border-radius: 5px; border: 2px solid transparent; background-clip: content-box }
        .ah2-root::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.3); background-clip: content-box }
      `}</style>

      {/* ── HERO rotatif (masqué pendant une recherche) ── */}
      {!searching && (
        <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} style={{ position: 'relative' }}>
          {slides.map((a, i) => (
            <div key={a.id} className="ah2-fade" style={{
              transition: 'opacity 600ms ease', opacity: i === slide ? 1 : 0,
              position: i === slide ? 'relative' : 'absolute', inset: 0, pointerEvents: i === slide ? 'auto' : 'none',
            }}>
              <HeroCinematic anime={a} topRank={top10.findIndex(t => t.id === a.id) + 1 || null}
                onWatch={openAnime} onMyList={toggleFav} inList={favs.has(a.id)} onInfo={openAnime} />
            </div>
          ))}
          {/* Indicateurs segments — au-dessus de la zone de chevauchement */}
          <div style={{ position: 'absolute', bottom: 140, left: 'max(24px, calc((100vw - 1320px) / 2 + 24px))', zIndex: 3, display: 'flex', gap: 6 }}>
            {slides.map((s, i) => (
              <button key={s.id} aria-label={`Slide ${i + 1}`} onClick={() => setSlide(i)} style={{
                width: 34, height: 3, borderRadius: 2, border: 'none', cursor: 'pointer', padding: 0,
                background: i === slide ? C.brass : 'rgba(255,255,255,0.2)',
              }} />
            ))}
          </div>
        </div>
      )}

      {/* ── BLOC CONTENU : chevauche le bas fondu du hero (réf. Netflix) ── */}
      <div style={{ position: 'relative', zIndex: 2, marginTop: searching ? 84 : -120 }}>
      {/* ── TOOLBAR sticky (sous la navbar) ── */}
      <div ref={toolbarRef} style={{
        position: 'sticky', top: 64, zIndex: 4,
        // posée sur le hero : voile léger + blur (lisible sur keyart clair)
        // sans la bande sombre pleine ; panel complet une fois sticky.
        background: toolbarStuck ? C.panel : 'rgba(11,14,20,.38)',
        backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${toolbarStuck ? C.hair : 'transparent'}`,
        borderRadius: '12px 12px 0 0',
        transition: 'background 200ms ease, border-color 200ms ease',
      }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Recherche */}
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
            <span aria-hidden style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.faint, fontSize: 13 }}>⌕</span>
            <input
              value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un animé…"
              aria-label="Rechercher"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 32px', borderRadius: 9,
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.hair}`, outline: 'none',
                color: C.text, fontSize: 13.5, fontFamily: FONT_BODY,
              }}
              onFocus={e => { e.target.style.borderColor = C.brass }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)' }}
            />
          </div>
          {/* Segmented */}
          <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3 }}>
            {segBtn('tous', 'Tous')}{segBtn('encours', 'En cours')}{segBtn('avoir', 'À voir')}{segBtn('termine', 'Terminé')}{segBtn('favoris', 'Favoris')}
          </div>
          {/* Genres multi-select */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setGenresOpen(v => !v)} style={{
              padding: '8px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 13,
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${genreSel.size ? C.brass : C.hair}`,
              color: genreSel.size ? C.brass : C.dim,
            }}>Genres{genreSel.size ? ` · ${genreSel.size}` : ''}</button>
            {genresOpen && (
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
          </div>
          {/* Tri */}
          <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Trier" style={{
            padding: '8px 10px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.hair}`,
            color: C.dim, fontSize: 13, fontFamily: FONT_BODY, cursor: 'pointer',
          }}>
            <option value="populaire">Populaire</option>
            <option value="recent">Récent</option>
            <option value="az">A–Z</option>
          </select>
          {/* Repris de l'ancien hub : anime au hasard + accès Mon Univers */}
          <button onClick={() => { const a = ANIMES[Math.floor(Math.random() * ANIMES.length)]; openAnime(a) }}
            title="Un animé au hasard" aria-label="Un animé au hasard" style={{
              padding: '8px 12px', borderRadius: 9, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 13,
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.hair}`, color: C.dim,
            }}>Surprends-moi</button>
          {props.onOpenMonUnivers && (
            <button onClick={props.onOpenMonUnivers} style={{
              padding: '8px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600,
              background: 'rgba(215,164,74,0.12)', border: `1px solid ${C.brass}55`, color: C.brass,
            }}>Mon Univers</button>
          )}
          <span style={{ flex: 1 }} />
          {/* Stats inline */}
          <span style={{ fontSize: 12.5, color: 'rgba(238,240,246,.78)', whiteSpace: 'nowrap', textShadow: '0 1px 8px rgba(0,0,0,.6)' }}>
            {stats.total} séries · {stats.encours} en cours · {stats.nouveautes} nouveautés · {stats.favoris} favoris
          </span>
        </div>
      </div>

      {/* ── CONTENU ── */}
      {/* Conteneur COMMUN à toutes les sections : 1320px / 24px / auto — la
          toolbar et le hero (texte) s'alignent sur la même grille. */}
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '24px 24px 90px' }}>
        {searching ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 18 }}>
                {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} pour « {debounced.trim()} »
              </h2>
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, fontSize: 13, fontFamily: FONT_BODY }}>Effacer</button>
            </div>
            {filtered.length === 0 ? (
              <p style={{ color: C.faint, fontSize: 14 }}>Aucun résultat. Essaie de retirer des filtres ou de modifier la recherche.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 18 }}>
                {filtered.map(a => card(a, undefined))}
              </div>
            )}
          </>
        ) : (
          <>
            {resume.length > 0 && (
              <AnimeRow title="Reprendre la lecture" count={resume.length}>
                {resume.map(a => (
                  <div key={a.id} style={{ width: 280, flexShrink: 0 }}>
                    <div role="button" tabIndex={0} onClick={() => openAnime(a)} onKeyDown={e => { if (e.key === 'Enter') openAnime(a) }} style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: 'rgba(255,255,255,0.04)' }} className="ah2-card">
                      <img src={a.coverImage} alt="" loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: a.coverPosition || 'center' }} />
                      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(11,14,20,0.9))' }} />
                      <div style={{ position: 'absolute', left: 10, bottom: 10, right: 10 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.title}</div>
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

            <AnimeRow title="Top du moment" count={10}>
              {top10.map(a => card(a, 158))}
            </AnimeRow>

            {news.length > 0 && (
              <AnimeRow title="Nouveautés" count={news.length}>
                {news.map(a => (
                  <BackdropCard key={a.id} anime={{ ...a, badge: displayBadge(a) }} width={300}
                    progressPct={progress[a.id]?.pct || 0} onOpen={openAnime} />
                ))}
              </AnimeRow>
            )}

            {rowGenres.map(g => {
              const list = ANIMES.filter(a => (a.genres || []).includes(g))
              if (list.length < 3) return null
              return (
                <AnimeRow key={g} title={g} count={list.length} onSeeAll={() => setGenreSel(new Set([g]))}>
                  {list.map(a => (
                    <BackdropCard key={a.id} anime={{ ...a, badge: displayBadge(a) }} width={300}
                      progressPct={progress[a.id]?.pct || 0} onOpen={openAnime} />
                  ))}
                </AnimeRow>
              )
            })}

            {/* Tous les animés — grille paginée par 21 (padding:0 vs section global) */}
            <section style={{ padding: 0 }}>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 18, margin: '6px 0 16px' }}>
                Tous les animés <span style={{ fontSize: 12.5, color: C.faint, fontWeight: 400 }}>{filtered.length}</span>
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 18 }}>
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
    </div>
  )
}
