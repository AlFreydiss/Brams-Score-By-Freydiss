import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import VideoPlayer from './VideoPlayer.jsx'
import { Reader } from './MangaReader.jsx'
import VIDEOS_RAW from '../data/dbs-videos.json'
import CHAPTERS_RAW from '../data/dbs-chapters.json'
import { MANGA_ARCS } from '../data/manga-arcs.js'

const VIDEOS = VIDEOS_RAW
const COLOR  = '#f57f17'
const COLOR2 = '#ffb74d'
const NS     = 'dbs'

const COVER = 'https://static.wikia.nocookie.net/dragonball/images/d/d0/Dragon_Ball_Super_key_visual.png/revision/latest?cb=20150615001556'
const COVER_FALLBACK = 'https://www.nautiljon.com/images/anime/00/16/dragon_ball_super_8216.jpg'

const EMOJIS = ['🐉','⚡','🌟','💥','👊','🌀','🔥','🌊','🌙','💀','🗡️','🔮','🏹','🦁','🌑','🧿','⚔️','🦂','💎','🌸','🌪️','🔱','🎭','💧','🌒','⛓️','🩸']

const SYNOPSIS = "Après la défaite de Kid Boo, Son Goku et ses amis vivent en paix. Mais de nouvelles menaces surgissent : Beerus, le Dieu de la Destruction, Freezer ressuscité, et bien d'autres encore. Goku et Vegeta repoussent sans cesse leurs limites pour protéger l'univers lors de tournois cosmiques légendaires."

const TAGS = ['Action', 'Super-héros', 'Shōnen', 'Toei Animation', 'Tournoi du Pouvoir']

const AWARDS = [
  { icon: '🐉', label: 'Dragon Ball depuis 1986' },
  { icon: '🏆', label: 'Tournoi du Pouvoir' },
  { icon: '⚡', label: '131 épisodes · VF + VO' },
]

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(`${NS}_vp`) || '{}') } catch { return {} }
}
function saveProgress(p) {
  try { localStorage.setItem(`${NS}_vp`, JSON.stringify(p)) } catch {}
}
function loadScanProgress() {
  try { return JSON.parse(localStorage.getItem(`${NS}_progress`) || '{}') } catch { return {} }
}
function saveScanProgress(p) {
  try { localStorage.setItem(`${NS}_progress`, JSON.stringify(p)) } catch {}
}

const CSS = `
  @keyframes dbsFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes dbsPulse  { 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes dbsFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }

  .dbs-ep-card {
    content-visibility: auto;
    contain-intrinsic-size: 0 260px;
    transition: transform .22s ease, box-shadow .22s ease, border-color .18s ease;
    cursor: pointer;
  }
  .dbs-ep-card:hover {
    transform: translateY(-5px) scale(1.015) !important;
    box-shadow: 0 18px 48px rgba(245,127,23,.22) !important;
    border-color: rgba(245,127,23,.50) !important;
  }
  .dbs-ep-card:focus-visible { outline: 2px solid ${COLOR}; outline-offset: 3px; }

  .dbs-play-btn { transition: transform .16s, opacity .16s; }
  .dbs-ep-card:hover .dbs-play-btn { transform: scale(1.15) !important; opacity: 1 !important; }

  .dbs-cta { transition: background .18s, transform .14s, box-shadow .18s; }
  .dbs-cta:hover {
    background: rgba(245,127,23,.24) !important;
    transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(245,127,23,.28);
  }

  .dbs-scroll { scrollbar-width: thin; scrollbar-color: rgba(245,127,23,.2) transparent; }
  .dbs-scroll::-webkit-scrollbar { width: 4px; }
  .dbs-scroll::-webkit-scrollbar-thumb { background: rgba(245,127,23,.2); border-radius: 4px; }

  .dbs-ch-card { transition: transform .2s ease, box-shadow .2s ease, border-color .18s ease; cursor: pointer; }
  .dbs-ch-card:hover { transform: translateY(-3px) !important; box-shadow: 0 10px 28px rgba(245,127,23,.18) !important; }
`

function ProgressRing({ pct, size = 72, stroke = 5 }) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={COLOR} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset .6s ease' }}
      />
    </svg>
  )
}

const EpCard = memo(function EpCard({ video, index, watched, onPlay }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <div
      className="dbs-ep-card"
      role="button" tabIndex={0}
      onClick={onPlay}
      onKeyDown={e => e.key === 'Enter' && onPlay()}
      style={{
        borderRadius: 14, overflow: 'hidden',
        background: 'rgba(10,8,4,.94)',
        border: `1px solid ${watched ? 'rgba(245,127,23,.30)' : 'rgba(255,255,255,.07)'}`,
        animation: `dbsFadeUp .3s ${index * 0.03}s ease-out both`,
        position: 'relative',
      }}
    >
      <div style={{ position: 'relative', paddingTop: '57%', background: '#0c0800', overflow: 'hidden' }}>
        {video.thumbnail && !imgErr
          ? <img
              src={video.thumbnail} alt={video.title} loading="lazy" decoding="async"
              onError={() => setImgErr(true)}
              style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity: watched ? 0.5 : 0.85 }}
            />
          : <div style={{ position:'absolute',inset:0, background:`linear-gradient(135deg,rgba(200,100,10,.18),rgba(0,0,0,.92))`, display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontFamily:"'Pirata One',cursive", fontSize:38, fontWeight:900, color:`rgba(245,127,23,.32)`, lineHeight:1 }}>{video.episode}</span>
            </div>
        }
        <div style={{ position:'absolute',inset:'40% 0 0', background:'linear-gradient(180deg,transparent,rgba(0,0,0,.70))', pointerEvents:'none' }} />
        <div className="dbs-play-btn" style={{
          position:'absolute',inset:0, display:'flex',alignItems:'center',justifyContent:'center',
          opacity: watched ? 0.5 : 0.78,
        }}>
          <div style={{ width:40,height:40,borderRadius:'50%',background:`rgba(200,100,10,.88)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,backdropFilter:'blur(6px)',boxShadow:`0 4px 18px rgba(245,127,23,.55)` }}>▶</div>
        </div>
        {watched && (
          <div style={{ position:'absolute',top:8,right:8,width:22,height:22,borderRadius:'50%',background:'rgba(52,211,153,.18)',border:'1px solid rgba(52,211,153,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#34d399',fontWeight:900 }}>✓</div>
        )}
        <div style={{ position:'absolute',bottom:8,left:8,display:'flex',gap:4 }}>
          <span style={{ fontSize:9,fontWeight:800,background:'rgba(200,100,10,.22)',color:COLOR2,border:`1px solid rgba(245,127,23,.28)`,borderRadius:100,padding:'2px 7px' }}>VF</span>
          <span style={{ fontSize:9,fontWeight:800,background:'rgba(0,0,0,.35)',color:'rgba(255,255,255,.55)',border:'1px solid rgba(255,255,255,.12)',borderRadius:100,padding:'2px 7px' }}>VO</span>
        </div>
      </div>
      <div style={{ padding:'10px 13px 13px' }}>
        <div style={{ fontSize:9.5,fontWeight:800,color:COLOR2,letterSpacing:'.1em',marginBottom:4 }}>ÉPISODE {video.episode}</div>
        <div style={{ fontSize:13,fontWeight:700,color:watched?'rgba(255,255,255,.45)':'#EDEBE3',lineHeight:1.28 }}>{video.title}</div>
      </div>
    </div>
  )
})

function InfoPanel({ watchedCount, total, lastWatchedIdx, onResume }) {
  const pct = total > 0 ? Math.round((watchedCount / total) * 100) : 0
  const nextVideo = VIDEOS[lastWatchedIdx] || VIDEOS[0]
  const [coverErr, setCoverErr] = useState(false)

  return (
    <aside style={{
      position: 'sticky', top: 0, alignSelf: 'start',
      display: 'flex', flexDirection: 'column', gap: 0,
      borderRadius: 22, overflow: 'hidden',
      background: 'linear-gradient(180deg,rgba(12,8,2,.96),rgba(8,5,1,.99))',
      border: '1px solid rgba(245,127,23,.18)',
      boxShadow: '0 24px 70px rgba(0,0,0,.44),inset 0 1px 0 rgba(255,255,255,.04)',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{ position:'relative', height:260, overflow:'hidden', flexShrink:0 }}>
        <img
          src={coverErr ? COVER_FALLBACK : COVER}
          onError={() => setCoverErr(true)}
          alt="Dragon Ball Super"
          style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top',opacity:.75,filter:'saturate(1.3) brightness(.82)' }}
        />
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,.08) 0%,rgba(12,8,2,.98) 100%)' }} />
        <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'0 18px 20px' }}>
          <div style={{ fontSize:9.5,fontWeight:800,letterSpacing:'.18em',color:COLOR2,textTransform:'uppercase',marginBottom:6 }}>
            🐉 TOEI ANIMATION · 2015–2018
          </div>
          <h2 style={{ margin:0, fontFamily:"'Pirata One',cursive", fontSize:24,fontWeight:900,color:'#fff',lineHeight:1.0,textShadow:'0 2px 20px rgba(0,0,0,.9)' }}>
            Dragon Ball Super
          </h2>
          <div style={{ fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,marginTop:3 }}>131 épisodes · VF + VO</div>
        </div>
      </div>

      <div style={{ padding:'18px 18px 22px', display:'flex', flexDirection:'column', gap:18 }}>

        <div style={{ display:'flex',alignItems:'center',gap:14 }}>
          <div style={{ position:'relative',flexShrink:0 }}>
            <ProgressRing pct={pct} />
            <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontFamily:"var(--display)",fontWeight:900,fontSize:15,color:'#fff',lineHeight:1 }}>{pct}%</span>
              <span style={{ fontSize:8,color:'rgba(255,255,255,.36)',fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',marginTop:1 }}>vu</span>
            </div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12,fontWeight:800,color:'rgba(255,255,255,.65)',marginBottom:4 }}>
              {watchedCount} / {total} épisodes
            </div>
            <div style={{ height:5,borderRadius:999,background:'rgba(255,255,255,.07)',overflow:'hidden' }}>
              <div style={{ width:`${pct}%`,height:'100%',borderRadius:999,background:`linear-gradient(90deg,${COLOR},${COLOR2})`,boxShadow:`0 0 12px ${COLOR}55`,transition:'width .5s ease' }} />
            </div>
            <div style={{ fontSize:10,color:'rgba(255,255,255,.28)',fontWeight:600,marginTop:4 }}>
              {pct === 100 ? '✓ Série terminée' : pct === 0 ? 'Pas encore commencé' : 'En cours de visionnage'}
            </div>
          </div>
        </div>

        <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
          {AWARDS.map((a, i) => (
            <div key={i} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:10,background:'rgba(245,127,23,.06)',border:'1px solid rgba(245,127,23,.12)' }}>
              <span style={{ fontSize:15 }}>{a.icon}</span>
              <span style={{ fontSize:11,fontWeight:700,color:'rgba(255,255,255,.62)' }}>{a.label}</span>
            </div>
          ))}
        </div>

        <div style={{ borderRadius:14,overflow:'hidden',border:'1px solid rgba(245,127,23,.14)',background:'rgba(245,127,23,.05)' }}>
          <div style={{ padding:'10px 14px',borderBottom:'1px solid rgba(245,127,23,.10)' }}>
            <div style={{ fontSize:9,fontWeight:900,letterSpacing:'.14em',color:COLOR2,textTransform:'uppercase',marginBottom:6 }}>Genres</div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
              {TAGS.map(t => (
                <span key={t} style={{ fontSize:10,fontWeight:700,color:'rgba(255,255,255,.55)',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',borderRadius:100,padding:'2px 8px' }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ padding:'10px 14px' }}>
            <div style={{ fontSize:9,fontWeight:900,letterSpacing:'.14em',color:COLOR2,textTransform:'uppercase',marginBottom:6 }}>Synopsis</div>
            <p style={{ margin:0,fontSize:11.5,lineHeight:1.65,color:'rgba(255,255,255,.48)',fontWeight:500 }}>{SYNOPSIS}</p>
          </div>
        </div>

        <button
          className="dbs-cta"
          onClick={onResume}
          style={{ padding:'13px 18px',borderRadius:12,background:`rgba(245,127,23,.14)`,border:`1px solid rgba(245,127,23,.28)`,color:'#fff',cursor:'pointer',fontSize:13,fontWeight:800,display:'flex',alignItems:'center',gap:8,justifyContent:'center' }}
        >
          <span style={{ fontSize:16 }}>▶</span>
          {watchedCount === 0 ? 'Commencer l\'aventure' : `Reprendre — Ép.${(nextVideo?.episode ?? 1)}`}
        </button>
      </div>
    </aside>
  )
}

function ScanInfoPanel({ readCount, total }) {
  const pct = total > 0 ? Math.round((readCount / total) * 100) : 0
  return (
    <aside style={{
      position: 'sticky', top: 0, alignSelf: 'start',
      borderRadius: 22, overflow: 'hidden',
      background: 'linear-gradient(180deg,rgba(12,8,2,.96),rgba(8,5,1,.99))',
      border: '1px solid rgba(245,127,23,.18)',
      boxShadow: '0 24px 70px rgba(0,0,0,.44),inset 0 1px 0 rgba(255,255,255,.04)',
      backdropFilter: 'blur(20px)',
      padding: '22px 18px',
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div>
        <div style={{ fontSize:9.5,fontWeight:800,letterSpacing:'.18em',color:COLOR2,textTransform:'uppercase',marginBottom:8 }}>🐉 Scans Dragon Ball Super</div>
        <div style={{ fontSize:22,fontWeight:900,color:'#fff',fontFamily:"'Pirata One',cursive",lineHeight:1.1 }}>Archives Manga</div>
        <div style={{ fontSize:11,color:'rgba(255,255,255,.4)',marginTop:4 }}>{total} chapitres disponibles</div>
      </div>
      <div style={{ display:'flex',alignItems:'center',gap:14 }}>
        <div style={{ position:'relative',flexShrink:0 }}>
          <ProgressRing pct={pct} />
          <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
            <span style={{ fontFamily:"var(--display)",fontWeight:900,fontSize:15,color:'#fff',lineHeight:1 }}>{pct}%</span>
            <span style={{ fontSize:8,color:'rgba(255,255,255,.36)',fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',marginTop:1 }}>lu</span>
          </div>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12,fontWeight:800,color:'rgba(255,255,255,.65)',marginBottom:4 }}>{readCount} / {total} chapitres</div>
          <div style={{ height:5,borderRadius:999,background:'rgba(255,255,255,.07)',overflow:'hidden' }}>
            <div style={{ width:`${pct}%`,height:'100%',borderRadius:999,background:`linear-gradient(90deg,${COLOR},${COLOR2})`,transition:'width .5s ease' }} />
          </div>
        </div>
      </div>
    </aside>
  )
}

export default function DbsPage({ onClose }) {
  const [tab,        setTab]        = useState('videos')
  const [playerIdx,  setPlayerIdx]  = useState(null)
  const [progress,   setProgress]   = useState(loadProgress)
  const [scanProg,   setScanProg]   = useState(loadScanProgress)
  const [reading,    setReading]    = useState(null)

  const CHAPTERS = useMemo(() => CHAPTERS_RAW.map((ch, i) => ({
    num:   ch.num,
    title: ch.title || `Chapitre ${ch.num}`,
    emoji: EMOJIS[i % EMOJIS.length],
    pages: ch.pages,
  })), [])

  const arcsData = MANGA_ARCS.dbs || []

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape' && playerIdx === null && reading === null) onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [playerIdx, reading, onClose])

  const markWatched = useCallback((idx) => {
    setProgress(prev => {
      const v = VIDEOS[idx]
      if (!v || prev[v.episode]?.completed) return prev
      const next = { ...prev, [v.episode]: { completed: true } }
      saveProgress(next)
      return next
    })
  }, [])

  const openPlayer = useCallback((idx) => {
    setPlayerIdx(idx)
    markWatched(idx)
  }, [markWatched])

  const playHandlers = useMemo(() => VIDEOS.map((_, i) => () => openPlayer(i)), [openPlayer])

  const watchedCount = useMemo(() =>
    Object.values(progress).filter(v => v?.completed).length, [progress])

  const resumeIdx = useMemo(() => {
    const first = VIDEOS.findIndex(v => !progress[v.episode]?.completed)
    return first >= 0 ? first : 0
  }, [progress])

  const markScan = useCallback((chNum, status) => {
    setScanProg(prev => {
      const next = { ...prev, [chNum]: status }
      saveScanProgress(next)
      return next
    })
  }, [])

  const openChapter = useCallback((idx) => {
    const ch = CHAPTERS[idx]
    if (!ch) return
    setReading(idx)
    if (scanProg[ch.num] !== 'read') markScan(ch.num, 'reading')
  }, [CHAPTERS, scanProg, markScan])

  const finishChapter = useCallback(() => {
    if (reading === null) return
    markScan(CHAPTERS[reading].num, 'read')
  }, [reading, CHAPTERS, markScan])

  const readCount = useMemo(() =>
    CHAPTERS.filter(c => scanProg[c.num] === 'read').length, [CHAPTERS, scanProg])

  const chaptersByArc = useMemo(() => {
    if (!arcsData.length) return null
    return arcsData.map(arc => ({
      ...arc,
      chapters: CHAPTERS.filter(ch => {
        const n = parseFloat(ch.num)
        return n >= arc.start && n <= arc.end
      }),
    })).filter(a => a.chapters.length > 0)
  }, [CHAPTERS, arcsData])

  const chNumToIdx = useMemo(() => {
    const m = {}
    CHAPTERS.forEach((ch, i) => { m[ch.num] = i })
    return m
  }, [CHAPTERS])

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        position:'fixed',inset:0,zIndex:500,
        background:'radial-gradient(circle at 10% 8%,rgba(200,100,10,.12),transparent 28rem),radial-gradient(circle at 88% 85%,rgba(180,80,5,.09),transparent 24rem),linear-gradient(135deg,#0c0700 0%,#10090200 55%,#080500 100%)',
        display:'flex',flexDirection:'column',
      }}>

        {/* ── Navbar ── */}
        <div style={{ flexShrink:0, background:'rgba(14,9,2,.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(245,127,23,.12)', zIndex:10 }}>
          <div style={{ display:'flex',alignItems:'center',gap:12,padding:'0 20px',minHeight:64,flexWrap:'wrap' }}>
            <button
              onClick={playerIdx !== null ? () => setPlayerIdx(null) : onClose}
              style={{ display:'flex',alignItems:'center',gap:7,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.09)',borderRadius:10,color:'rgba(255,255,255,.72)',cursor:'pointer',padding:'8px 16px',fontSize:12.5,fontWeight:800,transition:'background .15s',fontFamily:'var(--body)' }}
            >← Retour</button>
            <div style={{ width:3,height:32,borderRadius:2,background:`linear-gradient(180deg,${COLOR},${COLOR2})`,flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Pirata One',cursive",fontWeight:900,fontSize:17,color:'#fff',lineHeight:1.1 }}>🐉 Dragon Ball Super</div>
              <div style={{ fontSize:11,color:COLOR2,fontWeight:800 }}>{watchedCount}/{VIDEOS.length} épisodes vus · {readCount}/{CHAPTERS.length} chapitres lus</div>
            </div>
            <div style={{ display:'flex',background:'rgba(255,255,255,.05)',borderRadius:10,overflow:'hidden',border:'1px solid rgba(245,127,23,.15)' }}>
              {[['scans','📖 Scans'],['videos','🎬 Épisodes']].map(([t,label]) => (
                <button key={t} onClick={() => setTab(t)} style={{ height:38,padding:'0 18px',border:'none',cursor:'pointer',fontSize:13,fontWeight:700,background:tab===t?`${COLOR}28`:'transparent',color:tab===t?COLOR:'rgba(255,255,255,.45)',borderRight:t==='scans'?'1px solid rgba(245,127,23,.1)':'none',transition:'all .15s' }}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="dbs-scroll" style={{ flex:1,overflowY:'auto',padding:'24px 20px' }}>
          <div style={{ maxWidth:1600,margin:'0 auto' }}>

            {tab === 'videos' ? (
              <div style={{ display:'grid',gridTemplateColumns:'310px minmax(0,1fr)',gap:22,alignItems:'start' }}>
                <InfoPanel
                  watchedCount={watchedCount}
                  total={VIDEOS.length}
                  lastWatchedIdx={resumeIdx}
                  onResume={() => openPlayer(resumeIdx)}
                />
                <div>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18,gap:12 }}>
                    <div>
                      <h3 style={{ margin:0,fontFamily:"'Pirata One',cursive",fontSize:22,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>Épisodes · Dragon Ball Super</h3>
                      <div style={{ fontSize:11,color:'rgba(255,255,255,.35)',fontWeight:600,marginTop:3 }}>131 épisodes · VF + Japonais · Sous-titres FR</div>
                    </div>
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:13 }}>
                    {VIDEOS.map((v, i) => (
                      <EpCard
                        key={v.episode}
                        video={v}
                        index={i}
                        watched={!!progress[v.episode]?.completed}
                        onPlay={playHandlers[i]}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ── Scans tab ── */
              <div style={{ display:'grid',gridTemplateColumns:'310px minmax(0,1fr)',gap:22,alignItems:'start' }}>
                <ScanInfoPanel readCount={readCount} total={CHAPTERS.length} />
                <div>
                  <div style={{ marginBottom:18 }}>
                    <h3 style={{ margin:0,fontFamily:"'Pirata One',cursive",fontSize:22,fontWeight:900,color:'#fff' }}>Chapitres Manga</h3>
                    <div style={{ fontSize:11,color:'rgba(255,255,255,.35)',fontWeight:600,marginTop:3 }}>{CHAPTERS.length} chapitres disponibles</div>
                  </div>
                  {chaptersByArc
                    ? chaptersByArc.map(arc => (
                        <div key={arc.name} style={{ marginBottom:28 }}>
                          <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:12 }}>
                            <div style={{ height:2,flex:1,background:`linear-gradient(90deg,${COLOR}55,transparent)` }} />
                            <span style={{ fontSize:14,fontWeight:800,color:'#fff',whiteSpace:'nowrap' }}>{arc.name}</span>
                            <span style={{ fontSize:11,color:'rgba(255,255,255,.32)',fontWeight:600 }}>ch.{arc.start}–{arc.end === 9999 ? '…' : arc.end}</span>
                            <div style={{ height:2,flex:1,background:`linear-gradient(90deg,transparent,${COLOR}55)` }} />
                          </div>
                          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:10 }}>
                            {arc.chapters.map(ch => {
                              const status = scanProg[ch.num] || null
                              const isRead = status === 'read'
                              const isReading = status === 'reading'
                              return (
                                <button
                                  key={ch.num}
                                  className="dbs-ch-card"
                                  onClick={() => openChapter(chNumToIdx[ch.num])}
                                  style={{ position:'relative',background:isRead?'rgba(20,14,4,.5)':'rgba(20,14,4,.85)',border:`1px solid ${isReading?COLOR+88:isRead?'rgba(245,127,23,.15)':'rgba(255,255,255,.07)'}`,borderRadius:14,padding:'16px',cursor:'pointer',textAlign:'left',fontFamily:'var(--body)',opacity:isRead?.65:1 }}
                                >
                                  {isRead && <div style={{ position:'absolute',top:10,right:10,width:20,height:20,borderRadius:'50%',background:'rgba(52,211,153,.2)',border:'1px solid rgba(52,211,153,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#34d399',fontWeight:700 }}>✓</div>}
                                  {isReading && <div style={{ position:'absolute',top:10,right:10,fontSize:10,fontWeight:700,background:`${COLOR}22`,color:COLOR,border:`1px solid ${COLOR}55`,borderRadius:100,padding:'2px 8px' }}>En cours</div>}
                                  <div style={{ fontSize:20,marginBottom:8 }}>{ch.emoji}</div>
                                  <div style={{ fontSize:10,fontWeight:700,color:COLOR2,letterSpacing:'.08em',marginBottom:4 }}>CHAPITRE {ch.num}</div>
                                  <div style={{ fontSize:12.5,fontWeight:700,color:isRead?'rgba(255,255,255,.5)':'#fff',lineHeight:1.35,marginBottom:8 }}>{ch.title}</div>
                                  <div style={{ fontSize:11,fontWeight:700,color:isRead?'rgba(255,255,255,.3)':COLOR2 }}>📖 {isRead?'Relire':isReading?'Continuer':'Lire'}</div>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))
                    : (
                      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:10 }}>
                        {CHAPTERS.map((ch, i) => {
                          const status = scanProg[ch.num] || null
                          const isRead = status === 'read'
                          return (
                            <button key={ch.num} className="dbs-ch-card" onClick={() => openChapter(i)}
                              style={{ background:isRead?'rgba(20,14,4,.5)':'rgba(20,14,4,.85)',border:`1px solid ${isRead?'rgba(245,127,23,.15)':'rgba(255,255,255,.07)'}`,borderRadius:14,padding:'14px',cursor:'pointer',textAlign:'left',fontFamily:'var(--body)',opacity:isRead?.65:1 }}
                            >
                              <div style={{ fontSize:18,marginBottom:6 }}>{ch.emoji}</div>
                              <div style={{ fontSize:10,fontWeight:700,color:COLOR2,letterSpacing:'.08em',marginBottom:3 }}>CH. {ch.num}</div>
                              <div style={{ fontSize:12,fontWeight:700,color:isRead?'rgba(255,255,255,.5)':'#fff',lineHeight:1.3 }}>{ch.title}</div>
                            </button>
                          )
                        })}
                      </div>
                    )
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {reading !== null && CHAPTERS[reading] && (
        <Reader
          chapter={CHAPTERS[reading]}
          chapterIndex={reading}
          totalChapters={CHAPTERS.length}
          onClose={() => setReading(null)}
          onPrevChapter={() => setReading(i => Math.max(0, i - 1))}
          onNextChapter={() => setReading(i => Math.min(CHAPTERS.length - 1, i + 1))}
          onFinish={finishChapter}
          isRead={scanProg[CHAPTERS[reading]?.num] === 'read'}
          namespace={NS}
          themeColor={COLOR}
        />
      )}

      {playerIdx !== null && VIDEOS[playerIdx] && (
        <VideoPlayer
          videos={VIDEOS}
          startIdx={playerIdx}
          onClose={() => setPlayerIdx(null)}
          color={COLOR}
          storageKey={`${NS}_vp`}
        />
      )}
    </>
  )
}
