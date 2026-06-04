import { useState, useEffect, useMemo, useCallback } from 'react'
import { ProgressRing } from './ProgressRing.jsx'
import { onLiveProgress } from '../lib/liveSync.js'

// Comprehensive list matching the hub + data we have (NS, keys for LS, covers, colors from pages/hub)
const HUB_ANIMES = [
  { id: 'aot', title: "L'Attaque des Titans", emoji: '🗡️', color: '#546e7a', colorDark: '#1c313a', cover: '/aot-poster.jpg', ns: 'aot', hasChapters: true, videoTarget: 38 },
  { id: 'fireforce', title: 'Fire Force', emoji: '🔥', color: '#f4511e', colorDark: '#4a1a0a', cover: '/fireforce-poster.jpg', ns: 'fireforce', hasChapters: true, videoTarget: 48 },
  { id: 'bluelock', title: 'Blue Lock', emoji: '⚽', color: '#1565c0', colorDark: '#0a2e5c', cover: '/bluelock-poster.jpg', ns: 'bluelock', hasChapters: true, videoTarget: 24 },
  { id: 'bunny-girl', title: 'Bunny Girl Senpai', emoji: '🐰', color: '#8b5cf6', colorDark: '#3b2a6e', cover: '/bunny-girl-poster.jpg', ns: 'bunny-girl', hasChapters: false, videoTarget: 26 },
  { id: 'rent-girlfriend', title: 'Rent-a-Girlfriend', emoji: '💖', color: '#14b8a6', colorDark: '#0f3d3a', cover: '/rent-girlfriend-poster.jpg', ns: 'rent-girlfriend', hasChapters: false, videoTarget: 48 },
  { id: 'tpn', title: 'The Promised Neverland', emoji: '🌿', color: '#6c5ce7', colorDark: '#2d1b8e', cover: 'https://a.storyblok.com/f/178900/678x960/b998a75a12/30b71f52a3fcad111ddf2f84aab4dad91631262181_main.jpg/m/filters:quality(95)format(webp)', ns: 'tpn', hasChapters: true, videoTarget: 12 },
  { id: 'drstone', title: 'Dr. Stone', emoji: '⚗️', color: '#00b894', colorDark: '#005c45', cover: 'https://images.squarespace-cdn.com/content/v1/5e90e8679180dd053f86571c/1607648759877-XA0OOQUYTHR5DPVRJY0K/keyvisual_notext.jpg', ns: 'drstone', hasChapters: true, videoTarget: 35 },
  { id: 'jjk', title: 'Jujutsu Kaisen', emoji: '⚡', color: '#c62828', colorDark: '#5a0a0a', cover: 'https://d28hgpri8am2if.cloudfront.net/book_images/onix/cvr9781974740819/jujutsu-kaisen-the-official-anime-guide-season-1-9781974740819_lg.jpg', ns: 'jjk', hasChapters: true, videoTarget: 48 },
  { id: 'kingdom', title: 'Kingdom', emoji: '⚔️', color: '#c9a227', colorDark: '#4a3205', cover: 'https://www.manga-news.com/public/images/dvd/Kingdom-anime-saison-3-visual-1.webp', ns: 'kingdom', hasChapters: true, videoTarget: 0 },
  { id: 'kny', title: 'Kimetsu no Yaiba', emoji: '🔥', color: '#e85d27', colorDark: '#6b1f05', cover: 'https://storage.ghost.io/c/2b/7f/2b7f69fc-a243-4d2f-ae8e-db8312c6653a/content/images/size/w1200/2025/10/Demon-Slayer-en-421-c-1.png', ns: 'kny', hasChapters: true, videoTarget: 44 },
  { id: 'nnt', title: 'Nanatsu no Taizai', emoji: '🐗', color: '#8e44ad', colorDark: '#3d0f5a', cover: 'https://static.wikia.nocookie.net/nanatsu-no-taizai/images/2/25/Nanatsu_no_Taizai_Anime_Fourth_Season_Poster.png/revision/latest?cb=20200805045531', ns: 'nnt', hasChapters: true, videoTarget: 100 },
  { id: 'sl', title: 'Solo Leveling', emoji: '💎', color: '#1976d2', colorDark: '#0a2e5c', cover: 'https://i.pinimg.com/736x/e3/9c/56/e39c564360a91e48edcd430355ee68ce.jpg', ns: 'sl', hasChapters: true, videoTarget: 12 },
  { id: 'dbs', title: 'Dragon Ball Super', emoji: '🐉', color: '#f57f17', colorDark: '#5c2e00', cover: 'https://resizing.flixster.com/rkYW70Qo4tqbX8akxnoNX0Yf5z0=/ems.cHJkLWVtcy1hc3NldHMvbW92aWVzLzllY2IwZjMyLWVjYjMtNDAzMC1hYWViLTBjZjcxMmFmNDU1MC5wbmc=', ns: 'dbs', hasChapters: true, videoTarget: 131 },
  { id: 'violet-evergarden', title: 'Violet Evergarden', emoji: '✉', color: '#8b7cff', colorDark: '#30255f', cover: '/anime-covers/violet.jpg', ns: 'violet-evergarden', hasChapters: false, videoTarget: 13 },
  { id: 'vivy', title: "Vivy: Fluorite Eye's Song", emoji: '🎵', color: '#00d4ff', colorDark: '#003d52', cover: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/vivy/key-visual.jpg', ns: 'vivy', hasChapters: false, videoTarget: 13 },
  { id: 'love-prism', title: 'Love Through A Prism', emoji: '🌈', color: '#e91e63', colorDark: '#4a0e2e', cover: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/love-prism-hls/S01E001/thumb.jpg', ns: 'love-prism', hasChapters: false, videoTarget: 20 },
  { id: 'carole-tuesday', title: 'Carole & Tuesday', emoji: '🎸', color: '#ff9800', colorDark: '#4a2a00', cover: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/carole-tuesday/key-visual.jpg', ns: 'carole-tuesday', hasChapters: false, videoTarget: 24 },
  { id: 'bc', title: 'Black Clover', emoji: '🍀', color: '#2e7d32', colorDark: '#0f3d12', cover: '/bc-poster.jpg', ns: 'bc', hasChapters: true, videoTarget: 170 },
  { id: 'mha', title: 'My Hero Academia', emoji: '🦸', color: '#1e88e5', colorDark: '#0d3d5c', cover: '/anime-covers/mha-dark-deku.webp', ns: 'mha', hasChapters: true, videoTarget: 138 },
  { id: 'onepiece', title: 'One Piece', emoji: '🏴‍☠️', color: '#e0524a', colorDark: '#7a1f1a', cover: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/op-egghead-thumbnails/E1086.jpg', ns: 'onepiece', hasChapters: true, videoTarget: 70 },
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
  const prog = all[`${ns}_progress`] || {}
  const keys = Object.keys(prog)
  const read = keys.filter(k => prog[k] === 'read').length
  // fallback count from known or default
  const known = { aot: 81, fireforce: 235, bluelock: 341, kingdom: 874, kny: 206, nnt: 342, sl: 202, bc: 280, tpn: 184, dbs: 101, jjk: 263, mha: 0, onepiece: 56 }
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

export default function MonUniversPage({ 
  onClose,
  onOpenAot, onOpenFireforce, onOpenBluelock, onOpenBunnyGirl, onOpenRentGirlfriend,
  onOpenTpn, onOpenDrstone, onOpenJjk, onOpenKingdom, onOpenKny, onOpenNnt, onOpenSl,
  onOpenDbs, onOpenViolet, onOpenVivy, onOpenLovePrism, onOpenCaroleTuesday,
  onOpenBc, onOpenMha, onOpenOnepiece
}) {
  const [rawProgress, setRawProgress] = useState(() => loadAllProgress())
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('power') // power | video | chapter | name
  const [filter, setFilter] = useState('all') // all | done | low

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

  const onOpenMap = {
    aot: onOpenAot, fireforce: onOpenFireforce, bluelock: onOpenBluelock,
    'bunny-girl': onOpenBunnyGirl, 'rent-girlfriend': onOpenRentGirlfriend,
    tpn: onOpenTpn, drstone: onOpenDrstone, jjk: onOpenJjk, kingdom: onOpenKingdom,
    kny: onOpenKny, nnt: onOpenNnt, sl: onOpenSl, dbs: onOpenDbs,
    'violet-evergarden': onOpenViolet, vivy: onOpenVivy,
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

  const openAnime = (id) => {
    const fn = onOpenMap[id]
    if (fn) fn()
  }

  const bump = (id, type) => {
    const a = HUB_ANIMES.find(x => x.id === id)
    if (!a) return
    if (markNext(a.ns, type, rawProgress)) {
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

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:600, display:'flex', flexDirection:'column', overflow:'hidden',
      background:'radial-gradient(900px 600px at 78% -8%, rgba(167,139,250,0.10), transparent 60%), radial-gradient(800px 560px at 12% 108%, rgba(191,164,106,0.09), transparent 60%), linear-gradient(180deg, #0a0b10 0%, #07080d 60%, #050609 100%)',
    }}>
      <style>{`
        @keyframes muFadeUp { from {opacity:0; transform:translateY(18px)} to {opacity:1; transform:none} }
        @keyframes muGlow { 0%,100%{text-shadow:0 0 12px rgba(191,164,106,.30)} 50%{text-shadow:0 0 26px rgba(167,139,250,.55)} }
        @keyframes muDrift { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-6px) rotate(2deg)} }
        @keyframes muShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .mu-card { transition: transform .2s cubic-bezier(.23,1,.32,1), box-shadow .2s, border-color .2s; }
        .mu-card:hover { transform: translateY(-5px) scale(1.012); box-shadow: 0 22px 56px rgba(0,0,0,.55); }
        .mu-stat { transition: transform .2s, border-color .2s; }
        .mu-stat:hover { transform: translateY(-2px); border-color: rgba(191,164,106,0.35) !important; }
      `}</style>

      {/* Header premium (gold/violet) */}
      <div style={{ flexShrink:0, height:70, padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'linear-gradient(180deg, rgba(10,12,18,0.92), rgba(7,8,13,0.80))', backdropFilter:'blur(22px)', borderBottom:'1px solid rgba(191,164,106,0.16)', zIndex:10, position:'relative' }}>
        <div style={{ position:'absolute', left:0, right:0, bottom:0, height:1, background:'linear-gradient(90deg, transparent, rgba(191,164,106,0.5), rgba(167,139,250,0.4), transparent)', pointerEvents:'none' }} />
        <div style={{ display:'flex', alignItems:'center', gap:13 }}>
          <div style={{ width:3, height:34, borderRadius:2, background:'linear-gradient(to bottom, #BFA46A, #a78bfa)', boxShadow:'0 0 12px rgba(191,164,106,0.35)' }} />
          <div style={{ fontSize:26, animation:'muDrift 5.5s ease-in-out infinite' }}>🌌</div>
          <div>
            <div style={{ fontFamily:"'Pirata One', cursive", fontWeight:900, fontSize:23, color:'#f4f1ea', letterSpacing:'-.01em', lineHeight:1, animation:'muGlow 6s ease-in-out infinite' }}>TON UNIVERS</div>
            <div style={{ fontSize:10.5, color:'#9ca3af', fontWeight:700, letterSpacing:'.06em', marginTop:3, textTransform:'uppercase' }}>Suivi global · Power · Légende vivante</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {/* Power moyen — badge premium */}
          <div style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 15px', borderRadius:12, background:'linear-gradient(135deg, rgba(191,164,106,0.12), rgba(167,139,250,0.10))', border:'1px solid rgba(191,164,106,0.28)' }}>
            <span style={{ fontSize:9.5, fontWeight:800, letterSpacing:'.12em', color:'#BFA46A', textTransform:'uppercase' }}>Power moyen</span>
            <span style={{ fontFamily:"'Pirata One', cursive", fontSize:20, fontWeight:900, color:'#fff', lineHeight:1 }}>{totals.avg}<span style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>%</span></span>
          </div>
          <button onClick={onClose}
            style={{ padding:'8px 18px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#9ca3af', fontWeight:700, fontSize:13, cursor:'pointer', transition:'all .18s' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.color='#f4f4f5' }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#9ca3af' }}
          >← Retour</button>
        </div>
      </div>

      {/* Stats bar premium + barre de complétion globale */}
      <div style={{ flexShrink:0, padding:'16px 24px 14px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'flex', gap:14, alignItems:'stretch', justifyContent:'center', flexWrap:'wrap' }}>
          {[
            { label:'Animes',        icon:'🎬', value:totals.animes,    sub:null,                       accent:'#BFA46A' },
            { label:'Épisodes vus',  icon:'📺', value:totals.vWatched,  sub:`/ ${totals.vTotal}`,        accent:'#a78bfa' },
            { label:'Chapitres lus', icon:'📖', value:totals.cRead,     sub:`/ ${totals.cTotal}`,        accent:'#7cc4e0' },
            { label:'Complétion',    icon:'⚡', value:`${totals.avg}%`, sub:null,                        accent:'#34d399' },
          ].map((s, i) => (
            <div key={i} className="mu-stat" style={{ flex:'1 1 150px', maxWidth:220, background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.07)', padding:'12px 16px', borderRadius:14, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:38, height:38, borderRadius:11, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, background:`${s.accent}1a`, border:`1px solid ${s.accent}33` }}>{s.icon}</div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.42)', fontWeight:800, letterSpacing:'.08em', textTransform:'uppercase' }}>{s.label}</div>
                <div style={{ fontSize:22, fontWeight:900, color:'#fff', lineHeight:1.1 }}>{s.value} {s.sub && <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)', fontWeight:700 }}>{s.sub}</span>}</div>
              </div>
            </div>
          ))}
        </div>
        {/* Barre de complétion globale */}
        <div style={{ maxWidth:1280, margin:'14px auto 0', display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:10, fontWeight:800, letterSpacing:'.08em', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', flexShrink:0 }}>Légende</span>
          <div style={{ flex:1, height:7, borderRadius:99, background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${totals.avg}%`, borderRadius:99, background:'linear-gradient(90deg, #BFA46A, #a78bfa)', boxShadow:'0 0 12px rgba(167,139,250,0.4)', transition:'width .5s cubic-bezier(.23,1,.32,1)' }} />
          </div>
          <span style={{ fontSize:11, fontWeight:800, color:'#BFA46A', flexShrink:0, minWidth:38, textAlign:'right' }}>{totals.avg}%</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ flexShrink:0, padding:'14px 24px 10px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:220 }}>
            <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:15, color:'rgba(167,139,250,0.55)', pointerEvents:'none' }}>⌕</span>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un anime…" style={{ width:'100%', boxSizing:'border-box', background:'#10121a', border:'1px solid rgba(255,255,255,0.08)', color:'#fff', padding:'10px 14px 10px 38px', borderRadius:11, fontSize:14, outline:'none' }}
              onFocus={e=>e.currentTarget.style.borderColor='rgba(167,139,250,0.45)'} onBlur={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'} />
          </div>
          <select value={sort} onChange={e=>setSort(e.target.value)} style={{ background:'#10121a', border:'1px solid rgba(255,255,255,0.10)', color:'#fff', padding:'10px 12px', borderRadius:11, fontSize:13, cursor:'pointer', outline:'none' }}>
            <option value="power">Trier par Power Level</option>
            <option value="video">Trier par % Vidéos</option>
            <option value="chapter">Trier par % Chapitres</option>
            <option value="name">Trier par Nom</option>
          </select>
          <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:11, padding:3 }}>
            {['all','done','low'].map(f => {
              const on = filter===f
              return (
                <button key={f} onClick={()=>setFilter(f)} style={{ padding:'7px 15px', borderRadius:8, fontSize:12, fontWeight:800, background: on ? 'rgba(167,139,250,0.2)' : 'transparent', color: on ? '#c4b5fd' : 'rgba(255,255,255,0.6)', border: on ? '1px solid rgba(167,139,250,0.45)' : '1px solid transparent', cursor:'pointer', transition:'all .15s' }}>
                  {f==='all'?'Tous':f==='done'?'✓ Terminés':'⏳ En retard'}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex:1, overflow:'auto', padding:'24px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(178px, 1fr))', gap:16 }}>
          {filtered.length === 0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', padding:60, color:'rgba(255,255,255,0.3)' }}>Aucun résultat. Essaie un autre filtre ou recherche.</div>
          )}
          {filtered.map((a, idx) => {
            const c = a.color
            const cd = a.colorDark
            const isMax = a.video.pct >= 100 && (a.chapter.pct >= 100 || !a.hasChapters)
            return (
              <div key={a.id} className="mu-card" style={{
                background: `linear-gradient(168deg, ${cd} 0%, #0b0c0e 55%, #07090e 100%)`,
                borderRadius:18, overflow:'hidden', border:`1px solid ${c}22`, borderTop:`3px solid ${c}`,
                boxShadow:'0 10px 30px rgba(0,0,0,.4)', position:'relative', animation:`muFadeUp .4s ${idx*0.018}s both`
              }}>
                {/* cover */}
                <div style={{ position:'relative', height:168, background:'#111' }}>
                  <img src={a.cover} alt={a.title} style={{ width:'100%', height:'100%', objectFit:'cover', filter:'saturate(1.1) brightness(.86)' }} onError={e => { e.target.style.display='none' }} />
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, transparent, rgba(0,0,0,.65))' }} />
                  {/* badge */}
                  <div style={{ position:'absolute', top:10, right:10, fontSize:9, fontWeight:800, letterSpacing:'.1em', padding:'1px 7px', borderRadius:999, background: isMax ? '#34d39922' : `${c}22`, color: isMax ? '#34d399' : c, border:`1px solid ${isMax ? '#34d39944' : c+'44'}` }}>
                    {isMax ? 'MAX' : a.video.pct > 70 ? 'PWR' : 'NOUVEAU'}
                  </div>
                  <div style={{ position:'absolute', top:10, left:10, fontSize:18, filter:'drop-shadow(0 2px 6px rgba(0,0,0,.6))' }}>{a.emoji}</div>
                </div>

                {/* body */}
                <div style={{ padding:12 }}>
                  <div style={{ fontWeight:800, fontSize:14, color:'#fff', marginBottom:2, letterSpacing:'-.01em' }}>{a.title}</div>
                  <div style={{ fontSize:10, color:c, fontWeight:700, marginBottom:8 }}>{a.id.toUpperCase().replace(/-/g,' ')}</div>

                  {/* dual ring + power */}
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                    <ProgressRing videoPct={a.video.pct} chapterPct={a.chapter.pct} size={58} color={c} />
                    <div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', fontWeight:700 }}>POWER LEVEL</div>
                      <div style={{ fontSize:26, fontWeight:900, color:'#fff', lineHeight:1 }}>{a.power}</div>
                    </div>
                  </div>

                  {/* numbers */}
                  <div style={{ display:'flex', gap:8, fontSize:11, marginBottom:10 }}>
                    <div style={{ flex:1, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', padding:'5px 8px', borderRadius:8 }}>
                      📺 {a.video.watched}/{a.video.total} <span style={{opacity:.5}}>({a.video.pct}%)</span>
                    </div>
                    {a.hasChapters && (
                      <div style={{ flex:1, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', padding:'5px 8px', borderRadius:8 }}>
                        📖 {a.chapter.read}/{a.chapter.total} <span style={{opacity:.5}}>({a.chapter.pct}%)</span>
                      </div>
                    )}
                  </div>

                  {/* actions */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    <button onClick={() => openAnime(a.id)} style={{ padding:'7px 0', borderRadius:9, background:`${c}18`, color:c, fontWeight:800, fontSize:12, border:`1px solid ${c}33` }}>OUVRIR</button>
                    <button onClick={() => bump(a.id, 'video')} style={{ padding:'7px 0', borderRadius:9, background:'rgba(255,255,255,0.04)', color:'#fff', fontWeight:700, fontSize:11, border:'1px solid rgba(255,255,255,0.08)' }}>+1 ÉP</button>
                    {a.hasChapters && <button onClick={() => bump(a.id, 'chapter')} style={{ padding:'7px 0', borderRadius:9, background:'rgba(255,255,255,0.04)', color:'#fff', fontWeight:700, fontSize:11, border:'1px solid rgba(255,255,255,0.08)' }}>+1 CH</button>}
                    <button onClick={() => maxOut(a.id, 'video')} style={{ padding:'7px 0', borderRadius:9, background:'#34d39911', color:'#34d399', fontWeight:700, fontSize:10, border:'1px solid #34d39933' }}>MAX VIDÉO</button>
                    {a.hasChapters && <button onClick={() => maxOut(a.id, 'chapter')} style={{ padding:'7px 0', borderRadius:9, background:'#34d39911', color:'#34d399', fontWeight:700, fontSize:10, border:'1px solid #34d39933' }}>MAX CH</button>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ flexShrink:0, padding:12, textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.25)' }}>
        Progression en direct • LocalStorage • Compatible avec toutes tes pages
      </div>
    </div>
  )
}
