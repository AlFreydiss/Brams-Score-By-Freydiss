// ── TON UNIVERS — codex anime noir/rouge (réf. menus Persona 5) ──────────────
// Refonte visuelle complète validée par Freydiss (option « noir et rouge »).
// LA LOGIQUE ET LE SCHÉMA LOCALSTORAGE SONT INTACTS (voir MIGRATION.md) :
// loadAllProgress / computeVideo / computeChapter / markNext / markMax /
// power = vidéo×0.62 + chapitres×0.38 / live-sync / onOpenMap.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { ProgressRing } from './ProgressRing.jsx'
import { onLiveProgress } from '../lib/liveSync.js'

// Comprehensive list matching the hub + data we have (NS, keys for LS, covers, colors from pages/hub)
const HUB_ANIMES = [
  { id: 'aot', title: "L'Attaque des Titans", emoji: '🗡️', color: '#546e7a', colorDark: '#1c313a', cover: '/aot-poster.jpg', ns: 'aot', hasChapters: true, videoTarget: 38 },
  { id: 'fireforce', title: 'Fire Force', emoji: '🔥', color: '#f4511e', colorDark: '#4a1a0a', cover: '/fireforce-poster.jpg', ns: 'fireforce', hasChapters: true, videoTarget: 48 },
  { id: 'bleach', title: 'Bleach', emoji: '⚔️', color: '#f4511e', colorDark: '#3a0f06', cover: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/keyart/bleach.jpg', ns: 'bleach', hasChapters: true, videoTarget: 366 },
  { id: 'bluelock', title: 'Blue Lock', emoji: '⚽', color: '#1565c0', colorDark: '#0a2e5c', cover: '/bluelock-poster.jpg', ns: 'bluelock', hasChapters: true, videoTarget: 24 },
  { id: 'bunny-girl', title: 'Bunny Girl Senpai', emoji: '🐰', color: '#8b5cf6', colorDark: '#3b2a6e', cover: '/bunny-girl-poster.jpg', ns: 'bunny-girl', hasChapters: false, videoTarget: 26 },
  { id: 'rent-girlfriend', title: 'Rent-a-Girlfriend', emoji: '💖', color: '#14b8a6', colorDark: '#0f3d3a', cover: '/rent-girlfriend-poster.jpg', ns: 'rent-girlfriend', hasChapters: false, videoTarget: 48 },
  { id: 'tpn', title: 'The Promised Neverland', emoji: '🌿', color: '#6c5ce7', colorDark: '#2d1b8e', cover: 'https://a.storyblok.com/f/178900/678x960/b998a75a12/30b71f52a3fcad111ddf2f84aab4dad91631262181_main.jpg/m/filters:quality(95)format(webp)', ns: 'tpn', hasChapters: true, videoTarget: 12 },
  { id: 'drstone', title: 'Dr. Stone', emoji: '⚗️', color: '#00b894', colorDark: '#005c45', cover: '/drstone-poster.jpg', ns: 'drstone', hasChapters: true, videoTarget: 35 },
  { id: 'jjk', title: 'Jujutsu Kaisen', emoji: '⚡', color: '#c62828', colorDark: '#5a0a0a', cover: '/jjk-poster.jpg', ns: 'jjk', hasChapters: true, videoTarget: 48 },
  { id: 'kingdom', title: 'Kingdom', emoji: '⚔️', color: '#c9a227', colorDark: '#4a3205', cover: '/kingdom-poster.jpg', ns: 'kingdom', hasChapters: true, videoTarget: 0 },
  { id: 'kny', title: 'Kimetsu no Yaiba', emoji: '🔥', color: '#e85d27', colorDark: '#6b1f05', cover: '/kny-poster.jpg', ns: 'kny', hasChapters: true, videoTarget: 44 },
  { id: 'nnt', title: 'Nanatsu no Taizai', emoji: '🐗', color: '#8e44ad', colorDark: '#3d0f5a', cover: '/nnt-poster.jpg', ns: 'nnt', hasChapters: true, videoTarget: 100 },
  { id: 'sl', title: 'Solo Leveling', emoji: '💎', color: '#1976d2', colorDark: '#0a2e5c', cover: '/sl-poster.jpg', ns: 'sl', hasChapters: true, videoTarget: 12 },
  { id: 'dbs', title: 'Dragon Ball Super', emoji: '🐉', color: '#f57f17', colorDark: '#5c2e00', cover: 'https://resizing.flixster.com/rkYW70Qo4tqbX8akxnoNX0Yf5z0=/ems.cHJkLWVtcy1hc3NldHMvbW92aWVzLzllY2IwZjMyLWVjYjMtNDAzMC1hYWViLTBjZjcxMmFmNDU1MC5wbmc=', ns: 'dbs', hasChapters: true, videoTarget: 131 },
  { id: 'violet-evergarden', title: 'Violet Evergarden', emoji: '✉', color: '#8b7cff', colorDark: '#30255f', cover: '/anime-covers/violet.jpg', ns: 'violet-evergarden', hasChapters: false, videoTarget: 13 },
  { id: 'your-lie', title: 'Your Lie in April', emoji: '🎹', color: '#ff6f9c', colorDark: '#5f2540', cover: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/your-lie/thumbnails/S01E01.jpg', ns: 'your-lie', hasChapters: false, videoTarget: 22 },
  { id: 'kaguya', title: 'Kaguya-sama: Love is War', emoji: '🏹', color: '#ef4565', colorDark: '#5c1a28', cover: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/kaguya/cover.jpg', ns: 'kaguya', hasChapters: false, videoTarget: 42 },
  { id: 'hxh', title: 'Hunter x Hunter', emoji: '🎣', color: '#2dd181', colorDark: '#0c3b24', cover: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/hxh/thumbnails/E001.jpg', ns: 'hxh', hasChapters: false, videoTarget: 148 },
  { id: 'vivy', title: "Vivy: Fluorite Eye's Song", emoji: '🎵', color: '#00d4ff', colorDark: '#003d52', cover: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/vivy/key-visual.jpg', ns: 'vivy', hasChapters: false, videoTarget: 13 },
  { id: 'love-prism', title: 'Love Through A Prism', emoji: '🌈', color: '#e91e63', colorDark: '#4a0e2e', cover: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/love-prism-hls/S01E001/thumb.jpg', ns: 'love-prism', hasChapters: false, videoTarget: 20 },
  { id: 'carole-tuesday', title: 'Carole & Tuesday', emoji: '🎸', color: '#ff9800', colorDark: '#4a2a00', cover: '/carole-tuesday-poster.jpg', ns: 'carole-tuesday', hasChapters: false, videoTarget: 24 },
  { id: 'bc', title: 'Black Clover', emoji: '🍀', color: '#2e7d32', colorDark: '#0f3d12', cover: '/bc-poster.jpg', ns: 'bc', hasChapters: true, videoTarget: 170 },
  { id: 'mha', title: 'My Hero Academia', emoji: '🦸', color: '#1e88e5', colorDark: '#0d3d5c', cover: '/anime-covers/mha-dark-deku.webp', ns: 'mha', hasChapters: true, videoTarget: 138 },
  { id: 'onepiece', title: 'One Piece', emoji: '🏴‍☠️', color: '#e0524a', colorDark: '#7a1f1a', cover: '/anime-covers/one-piece.jpg', ns: 'onepiece', hasChapters: true, videoTarget: 70 },
]

function loadAllProgress() {
  const out = {}
  try {
    // video _vp flat
    HUB_ANIMES.forEach(a => {
      const vp = JSON.parse(localStorage.getItem(`${a.ns}_vp`) || '{}')
      out[`${a.ns}_vp`] = vp
    })
    // structured video progress
    HUB_ANIMES.forEach(a => {
      const vprog = JSON.parse(localStorage.getItem(`${a.ns}_video_progress`) || 'null')
      if (vprog) out[`${a.ns}_video_progress`] = vprog
    })
    // chapter _progress
    HUB_ANIMES.forEach(a => {
      const cprog = JSON.parse(localStorage.getItem(`${a.ns}_progress`) || '{}')
      out[`${a.ns}_progress`] = cprog
    })
    // generic fallbacks
    const generic = JSON.parse(localStorage.getItem('manga_progress') || '{}')
    if (Object.keys(generic).length) out.manga_progress = generic
  } catch {}
  return out
}

function computeVideo(ns, all) {
  const flat = all[`${ns}_vp`] || {}
  const structured = all[`${ns}_video_progress`]
  let watched = 0
  let total = 0
  if (structured && structured.episodes) {
    const eps = structured.episodes
    total = Object.keys(eps).length || 12
    watched = Object.values(eps).filter(e => e?.completed).length
  } else {
    const keys = Object.keys(flat)
    total = keys.length || 12
    watched = keys.filter(k => flat[k]?.completed).length
  }
  const pct = total > 0 ? Math.round((watched / total) * 100) : 0
  return { watched, total, pct }
}

function computeChapter(ns, all) {
  // One Piece : scans stockés sous la clé générique `manga_progress` (ScansPage).
  const prog = (ns === 'onepiece' && all.manga_progress && Object.keys(all.manga_progress).length)
    ? all.manga_progress
    : (all[`${ns}_progress`] || {})
  const keys = Object.keys(prog)
  const read = keys.filter(k => prog[k] === 'read').length
  // fallback count from known or default
  const known = { aot: 81, fireforce: 235, bleach: 686, bluelock: 341, kingdom: 874, kny: 206, nnt: 342, sl: 202, bc: 280, tpn: 184, dbs: 101, jjk: 263, mha: 0, onepiece: 56 }
  const total = known[ns] || Math.max(50, keys.length)
  const pct = total > 0 ? Math.round((read / total) * 100) : 0
  return { read, total, pct }
}

function markNext(ns, type, all) {
  // type 'video' or 'chapter'
  try {
    if (type === 'video') {
      const key = `${ns}_vp`
      const cur = JSON.parse(localStorage.getItem(key) || '{}')
      // find next plausible numeric or string key
      let next = 1
      const nums = Object.keys(cur).map(k => parseInt(k)).filter(n => !isNaN(n))
      if (nums.length) next = Math.max(...nums) + 1
      cur[next] = { completed: true }
      localStorage.setItem(key, JSON.stringify(cur))
      // also structured if exists
      const skey = `${ns}_video_progress`
      const s = JSON.parse(localStorage.getItem(skey) || '{}')
      if (s.episodes) {
        s.episodes[next] = { completed: true }
        localStorage.setItem(skey, JSON.stringify(s))
      }
    } else {
      const key = `${ns}_progress`
      const cur = JSON.parse(localStorage.getItem(key) || '{}')
      let next = 1
      const nums = Object.keys(cur).map(k => parseInt(k)).filter(n => !isNaN(n))
      if (nums.length) next = Math.max(...nums) + 1
      cur[next] = 'read'
      localStorage.setItem(key, JSON.stringify(cur))
    }
    return true
  } catch { return false }
}

function markMax(ns, type) {
  try {
    if (type === 'video') {
      const key = `${ns}_vp`
      const cur = {}
      for (let i=1; i<=30; i++) cur[i] = { completed: true }
      localStorage.setItem(key, JSON.stringify(cur))
    } else {
      const key = `${ns}_progress`
      const cur = {}
      for (let i=1; i<=200; i++) cur[i] = 'read'
      localStorage.setItem(key, JSON.stringify(cur))
    }
    return true
  } catch { return false }
}

// ── Tokens « codex P5 » ───────────────────────────────────────────────────────
const RED = '#E60012'
const RED_HI = '#FF2A3C'
const INK = '#0A0A0C'
const PAPER = '#F4F4F0'
const DISPLAY = "'Bricolage Grotesque', 'Space Grotesk', 'Inter', sans-serif"

// Jauge de Légende gamifiée : paliers nommés sur les rangs du serveur.
const PALIERS = [
  { at: 0,  name: 'MOUSSAILLON' },
  { at: 15, name: 'PIRATE' },
  { at: 35, name: 'SHICHIBUKAI' },
  { at: 55, name: 'AMIRAL' },
  { at: 75, name: 'YONKOU' },
  { at: 95, name: 'ROI DES PIRATES' },
]
function palierFor(avg) {
  let cur = PALIERS[0], next = null
  for (const p of PALIERS) { if (avg >= p.at) cur = p; else { next = p; break } }
  return { cur, next }
}

const P5_CSS = `
  @keyframes p5In { from { opacity: 0; transform: translateY(14px) skewX(-6deg) } to { opacity: 1; transform: skewX(-6deg) } }
  @keyframes p5CardIn { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
  @keyframes p5Pop { 0% { transform: scale(1) } 40% { transform: scale(1.35) } 100% { transform: scale(1) } }
  .p5-card { transition: transform .18s cubic-bezier(.23,1,.32,1), box-shadow .18s; }
  .p5-card:hover { transform: translateY(-5px); box-shadow: 0 18px 48px rgba(0,0,0,.65), 0 0 0 1.5px ${RED}; }
  .p5-actions { opacity: 0; pointer-events: none; transition: opacity .16s ease; }
  .p5-card:hover .p5-actions, .p5-card.is-open .p5-actions { opacity: 1; pointer-events: auto; }
  .p5-btn { transition: transform .12s, background .12s, color .12s; cursor: pointer; font-family: ${DISPLAY}; }
  .p5-btn:hover { transform: skewX(-6deg) scale(1.06); }
  .p5-pop { display: inline-block; animation: p5Pop .35s ease; }
  @media (prefers-reduced-motion: reduce) {
    .p5-card, .p5-btn { transition: none !important }
    * { animation-duration: 0.001s !important }
  }
`

export default function MonUniversPage({
  onClose,
  onOpenAot, onOpenFireforce, onOpenBleach, onOpenBluelock, onOpenBunnyGirl, onOpenRentGirlfriend,
  onOpenTpn, onOpenDrstone, onOpenJjk, onOpenKingdom, onOpenKny, onOpenNnt, onOpenSl,
  onOpenDbs, onOpenViolet, onOpenVivy, onOpenLovePrism, onOpenCaroleTuesday,
  onOpenBc, onOpenMha, onOpenOnepiece, onOpenYourLie, onOpenKaguya, onOpenHxh
}) {
  const [rawProgress, setRawProgress] = useState(() => loadAllProgress())
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('power') // power | video | chapter | name
  const [filter, setFilter] = useState('all') // all | done | low
  const [openId, setOpenId] = useState(null)  // overlay d'actions au tap (mobile)
  const [popKey, setPopKey] = useState(0)     // re-déclenche l'anim du +1
  const searchRef = useRef(null)

  const refresh = useCallback(() => {
    setRawProgress(loadAllProgress())
  }, [])

  useEffect(() => {
    // Live : reflète instantanément tout épisode/chapitre marqué ailleurs.
    const off = onLiveProgress(refresh)
    const id = setInterval(refresh, 15000)
    document.body.style.overflow = 'hidden'
    return () => { off(); clearInterval(id); document.body.style.overflow = '' }
  }, [refresh])

  // Raccourci « / » : focus recherche
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault(); searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onOpenMap = {
    aot: onOpenAot, fireforce: onOpenFireforce, bleach: onOpenBleach, bluelock: onOpenBluelock,
    'bunny-girl': onOpenBunnyGirl, 'rent-girlfriend': onOpenRentGirlfriend,
    tpn: onOpenTpn, drstone: onOpenDrstone, jjk: onOpenJjk, kingdom: onOpenKingdom,
    kny: onOpenKny, nnt: onOpenNnt, sl: onOpenSl, dbs: onOpenDbs,
    'violet-evergarden': onOpenViolet, 'your-lie': onOpenYourLie, kaguya: onOpenKaguya, hxh: onOpenHxh, vivy: onOpenVivy,
    'love-prism': onOpenLovePrism, 'carole-tuesday': onOpenCaroleTuesday,
    bc: onOpenBc, mha: onOpenMha, onepiece: onOpenOnepiece,
  }

  const processed = useMemo(() => {
    return HUB_ANIMES.map(a => {
      const video = computeVideo(a.ns, rawProgress)
      const chapter = a.hasChapters ? computeChapter(a.ns, rawProgress) : { read: 0, total: 0, pct: 0 }
      const power = Math.round(video.pct * 0.62 + chapter.pct * 0.38)
      const done = video.pct >= 100 && (chapter.pct >= 100 || !a.hasChapters)
      const low = video.pct < 20 && chapter.pct < 20
      return { ...a, video, chapter, power, done, low }
    })
  }, [rawProgress])

  const counts = useMemo(() => ({
    all: processed.length,
    done: processed.filter(a => a.done).length,
    low: processed.filter(a => a.low).length,
  }), [processed])

  const filtered = useMemo(() => {
    let list = processed
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.id.includes(q))
    }
    if (filter === 'done') list = list.filter(a => a.done)
    if (filter === 'low') list = list.filter(a => a.low)
    if (sort === 'power') list = [...list].sort((a,b) => b.power - a.power)
    else if (sort === 'video') list = [...list].sort((a,b) => b.video.pct - a.video.pct)
    else if (sort === 'chapter') list = [...list].sort((a,b) => b.chapter.pct - a.chapter.pct)
    else list = [...list].sort((a,b) => a.title.localeCompare(b.title))
    return list
  }, [processed, query, filter, sort])

  const totals = useMemo(() => {
    const animes = processed.length
    const vWatched = processed.reduce((s,a) => s + a.video.watched, 0)
    const vTotal = processed.reduce((s,a) => s + a.video.total, 0)
    const cRead = processed.reduce((s,a) => s + a.chapter.read, 0)
    const cTotal = processed.reduce((s,a) => s + a.chapter.total, 0)
    const avg = Math.round( processed.reduce((s,a) => s + (a.video.pct + a.chapter.pct)/2 , 0) / Math.max(1, animes) )
    return { animes, vWatched, vTotal, cRead, cTotal, avg }
  }, [processed])

  const { cur: palier, next: nextPalier } = palierFor(totals.avg)

  const openAnime = (id) => {
    const fn = onOpenMap[id]
    if (fn) fn()
  }

  const bump = (id, type) => {
    const a = HUB_ANIMES.find(x => x.id === id)
    if (!a) return
    if (markNext(a.ns, type, rawProgress)) {
      setPopKey(k => k + 1)
      setTimeout(refresh, 30)
    }
  }

  const maxOut = (id, type) => {
    const a = HUB_ANIMES.find(x => x.id === id)
    if (!a) return
    if (markMax(a.ns, type)) {
      setTimeout(refresh, 30)
    }
  }

  // Bouton d'action overlay (style P5 : bloc skewé, rouge au hover)
  const actBtn = (label, onClick, primary = false) => (
    <button key={label} className="p5-btn" onClick={e => { e.stopPropagation(); onClick() }} style={{
      padding: '8px 12px', border: 'none', transform: 'skewX(-6deg)',
      background: primary ? RED : PAPER, color: primary ? '#fff' : INK,
      fontWeight: 800, fontSize: 12, letterSpacing: '.03em', minHeight: 34,
    }}>{label}</button>
  )

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:600, display:'flex', flexDirection:'column', overflow:'hidden',
      fontFamily: DISPLAY, color: PAPER,
      background: `radial-gradient(1100px 700px at 85% -10%, rgba(230,0,18,0.13), transparent 55%), linear-gradient(168deg, #101013 0%, ${INK} 45%, #060607 100%)`,
    }}>
      <style>{P5_CSS}</style>

      {/* HEADER — bandeau skewé rouge */}
      <div style={{ flexShrink:0, height:66, padding:'0 22px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(8,8,10,0.92)', backdropFilter:'blur(18px)', borderBottom:`2px solid ${RED}`, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, minWidth:0 }}>
          <div style={{ background:RED, padding:'7px 18px', transform:'skewX(-8deg)', boxShadow:`4px 4px 0 ${PAPER}22` }}>
            <span style={{ display:'inline-block', transform:'skewX(8deg)', fontWeight:900, fontSize:20, letterSpacing:'.02em', color:'#fff', textTransform:'uppercase', fontStyle:'italic' }}>Ton Univers</span>
          </div>
          <span style={{ fontSize:10.5, color:'rgba(244,244,240,.45)', fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', whiteSpace:'nowrap' }}>Codex anime · {totals.animes} titres</span>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ transform:'skewX(-8deg)', border:`1.5px solid ${RED}`, padding:'6px 14px', background:'rgba(230,0,18,0.08)' }}>
            <span style={{ display:'inline-block', transform:'skewX(8deg)', fontSize:10, fontWeight:800, letterSpacing:'.1em', color:RED_HI }}>POWER MOYEN </span>
            <span style={{ display:'inline-block', transform:'skewX(8deg)', fontSize:18, fontWeight:900, color:'#fff', marginLeft:6 }}>{totals.avg}<span style={{ fontSize:11, opacity:.5 }}>%</span></span>
          </div>
          <button className="p5-btn" onClick={onClose} style={{ padding:'8px 16px', transform:'skewX(-8deg)', background:'transparent', border:'1.5px solid rgba(244,244,240,.25)', color:'rgba(244,244,240,.8)', fontWeight:800, fontSize:12.5 }}>
            <span style={{ display:'inline-block', transform:'skewX(8deg)' }}>← RETOUR</span>
          </button>
        </div>
      </div>

      {/* HERO — stats + jauge de Légende à paliers */}
      <div style={{ flexShrink:0, padding:'18px 24px 14px', borderBottom:'1px solid rgba(244,244,240,0.07)' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <div style={{ display:'flex', gap:0, alignItems:'stretch', flexWrap:'wrap' }}>
            {[
              { label:'ANIMES',        value: totals.animes,   sub: null },
              { label:'ÉPISODES VUS',  value: totals.vWatched, sub: `/ ${totals.vTotal}` },
              { label:'CHAPITRES LUS', value: totals.cRead,    sub: `/ ${totals.cTotal}` },
              { label:'COMPLÉTION',    value: `${totals.avg}%`, sub: null },
            ].map((s, i) => (
              <div key={s.label} style={{ flex:'1 1 140px', padding:'10px 18px', borderLeft: i > 0 ? '1px solid rgba(244,244,240,.1)' : 'none', animation:`p5CardIn .4s ${i*0.06}s both` }}>
                <div style={{ fontSize:9.5, fontWeight:800, letterSpacing:'.18em', color:RED_HI }}>{s.label}</div>
                <div style={{ fontSize:30, fontWeight:900, fontStyle:'italic', lineHeight:1.1, color:PAPER }}>
                  {s.value}{s.sub && <span style={{ fontSize:13, opacity:.4, fontStyle:'normal', fontWeight:700 }}> {s.sub}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Jauge Légende : palier actuel + prochain palier */}
          <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
            <div style={{ background:PAPER, color:INK, padding:'4px 13px', transform:'skewX(-8deg)', fontWeight:900, fontSize:12, fontStyle:'italic', whiteSpace:'nowrap' }}>
              <span style={{ display:'inline-block', transform:'skewX(8deg)' }}>⚓ {palier.name}</span>
            </div>
            <div style={{ flex:1, minWidth:200, height:10, background:'rgba(244,244,240,.08)', transform:'skewX(-8deg)', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:'0 auto 0 0', width:`${totals.avg}%`, background:`linear-gradient(90deg, ${RED}, ${RED_HI})`, transition:'width .6s cubic-bezier(.23,1,.32,1)' }} />
              {PALIERS.slice(1).map(p => (
                <div key={p.at} style={{ position:'absolute', left:`${p.at}%`, top:0, bottom:0, width:2, background:'rgba(10,10,12,.7)' }} />
              ))}
            </div>
            <span style={{ fontSize:11.5, fontWeight:800, color:'rgba(244,244,240,.6)', whiteSpace:'nowrap' }}>
              {nextPalier ? <>Encore <span style={{ color:RED_HI }}>{nextPalier.at - totals.avg}%</span> avant {nextPalier.name}</> : 'LÉGENDE ACCOMPLIE 👑'}
            </span>
          </div>
        </div>
      </div>

      {/* TOOLBAR — recherche (/) + tri + filtres avec compteurs */}
      <div style={{ flexShrink:0, padding:'12px 24px 10px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:210 }}>
            <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:14, color:RED_HI, pointerEvents:'none' }}>⌕</span>
            <input ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher…  ( / )"
              style={{ width:'100%', boxSizing:'border-box', background:'#101014', border:'1.5px solid rgba(244,244,240,.12)', color:PAPER, padding:'9px 13px 9px 36px', fontSize:13.5, outline:'none', fontFamily:DISPLAY, fontWeight:600 }}
              onFocus={e=>e.currentTarget.style.borderColor=RED} onBlur={e=>e.currentTarget.style.borderColor='rgba(244,244,240,.12)'} />
          </div>
          <select value={sort} onChange={e=>setSort(e.target.value)} style={{ background:'#101014', border:'1.5px solid rgba(244,244,240,.12)', color:PAPER, padding:'9px 11px', fontSize:12.5, cursor:'pointer', outline:'none', fontFamily:DISPLAY, fontWeight:700 }}>
            <option value="power">Tri : Power Level</option>
            <option value="video">Tri : % Vidéos</option>
            <option value="chapter">Tri : % Chapitres</option>
            <option value="name">Tri : Nom</option>
          </select>
          <div style={{ display:'flex', gap:6 }}>
            {[['all',`TOUS (${counts.all})`],['done',`TERMINÉS (${counts.done})`],['low',`EN RETARD (${counts.low})`]].map(([f, label]) => {
              const on = filter===f
              return (
                <button key={f} className="p5-btn" onClick={()=>setFilter(f)} style={{
                  padding:'8px 13px', transform:'skewX(-8deg)', border:'1.5px solid', minHeight:36,
                  borderColor: on ? RED : 'rgba(244,244,240,.18)',
                  background: on ? RED : 'transparent',
                  color: on ? '#fff' : 'rgba(244,244,240,.7)', fontWeight:800, fontSize:11.5,
                }}>
                  <span style={{ display:'inline-block', transform:'skewX(8deg)' }}>{label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* GRILLE — cover dominante, actions au hover/tap */}
      <div style={{ flex:1, overflow:'auto', padding:'18px 24px 24px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:16 }}>
          {filtered.length === 0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', padding:60, color:'rgba(244,244,240,.35)', fontWeight:700 }}>Aucun résultat. Essaie un autre filtre.</div>
          )}
          {filtered.map((a, idx) => {
            const started = a.video.pct > 0 || a.chapter.pct > 0
            const isMax = a.done
            const isOpen = openId === a.id
            return (
              <div key={a.id} className={`p5-card${isOpen ? ' is-open' : ''}`}
                onClick={() => setOpenId(isOpen ? null : a.id)}
                style={{
                  position:'relative', aspectRatio:'3 / 4.2', overflow:'hidden', cursor:'pointer',
                  background:'#101014', border:'1px solid rgba(244,244,240,.09)',
                  animation:`p5CardIn .35s ${Math.min(idx, 14)*0.025}s both`, contain:'content',
                }}>
                {/* Cover pleine carte */}
                <img src={a.cover} alt={a.title} loading="lazy" decoding="async"
                  style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', filter: started ? 'saturate(1.05)' : 'saturate(.35) brightness(.7)' }}
                  onError={e => { e.target.style.display='none' }} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(10,10,12,.1) 30%, rgba(10,10,12,.92) 88%)' }} />

                {/* Badge état (UN seul) */}
                <div style={{ position:'absolute', top:10, left:-4, transform:'skewX(-8deg)', padding:'3px 12px 3px 14px', fontSize:9.5, fontWeight:900, letterSpacing:'.12em',
                  background: isMax ? PAPER : started ? RED : 'rgba(16,16,20,.85)',
                  color: isMax ? INK : started ? '#fff' : 'rgba(244,244,240,.65)',
                  border: started ? 'none' : '1px solid rgba(244,244,240,.2)' }}>
                  <span style={{ display:'inline-block', transform:'skewX(8deg)' }}>{isMax ? '★ MAX' : started ? `PWR ${a.power}` : 'À COMMENCER'}</span>
                </div>

                {/* Bas : titre + anneau + compteurs (si commencé) */}
                <div style={{ position:'absolute', left:12, right:12, bottom:12 }}>
                  <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:8 }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:900, fontStyle:'italic', fontSize:16, lineHeight:1.12, color:PAPER, textTransform:'uppercase', letterSpacing:'.01em', textShadow:'0 2px 8px rgba(0,0,0,.8)' }}>{a.title}</div>
                      {started ? (
                        <div style={{ marginTop:5, fontSize:10.5, fontWeight:700, color:'rgba(244,244,240,.72)' }}>
                          📺 <span className={popKey ? 'p5-pop' : ''} key={`${a.id}-${a.video.watched}`}>{a.video.watched}</span>/{a.video.total}
                          {a.hasChapters && <> · 📖 {a.chapter.read}/{a.chapter.total}</>}
                        </div>
                      ) : (
                        <div style={{ marginTop:5, fontSize:10.5, fontWeight:700, color:'rgba(244,244,240,.5)' }}>Pas encore commencé</div>
                      )}
                    </div>
                    {started && <div style={{ flexShrink:0 }}><ProgressRing videoPct={a.video.pct} chapterPct={a.chapter.pct} size={46} color={RED_HI} /></div>}
                  </div>
                </div>

                {/* Overlay actions (hover desktop / tap mobile) */}
                <div className="p5-actions" style={{ position:'absolute', inset:0, background:'rgba(8,8,10,.82)', backdropFilter:'blur(3px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, padding:16 }}>
                  {started ? (
                    <>
                      {actBtn('▶ OUVRIR', () => openAnime(a.id), true)}
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
                        {actBtn('+1 ÉP', () => bump(a.id, 'video'))}
                        {a.hasChapters && actBtn('+1 CH', () => bump(a.id, 'chapter'))}
                      </div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
                        {actBtn('MAX VIDÉO', () => maxOut(a.id, 'video'))}
                        {a.hasChapters && actBtn('MAX CH', () => maxOut(a.id, 'chapter'))}
                      </div>
                    </>
                  ) : (
                    actBtn('▶ COMMENCER', () => openAnime(a.id), true)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ flexShrink:0, padding:'10px 12px', textAlign:'center', fontSize:10.5, fontWeight:700, letterSpacing:'.08em', color:'rgba(244,244,240,.3)', borderTop:'1px solid rgba(244,244,240,.06)' }}>
        PROGRESSION EN DIRECT · LOCALSTORAGE · COMPATIBLE AVEC TOUTES TES PAGES
      </div>
    </div>
  )
}
