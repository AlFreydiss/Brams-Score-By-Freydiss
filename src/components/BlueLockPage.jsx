import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import VideoPlayer from './VideoPlayer.jsx'
import { Reader } from './MangaReader.jsx'
import { ProgressRing } from './ProgressRing.jsx'
import AnimeBackdrop, { ANIME_MOTIFS } from './AnimeBackdrop.jsx'
import VIDEOS_RAW from '../data/bluelock-videos.json'
import CHAPTERS_RAW from '../data/bluelock-chapters.json'

const VIDEOS = VIDEOS_RAW

const CHAPTERS = (CHAPTERS_RAW || []).map((ch, i) => ({
  num: String(ch.num || (i+1)),
  title: ch.title || `Chapitre ${ch.num || (i+1)}`,
  emoji: '⚽',
  pages: ch.pages || [],
}))

const COLOR  = '#1565c0'
const COLOR2 = '#60a5fa'
const NS     = 'bluelock'

const SYNOPSIS = "Dans un Japon en crise après une défaite en Coupe du Monde, le projet Blue Lock est lancé : 300 jeunes attaquants sont enfermés dans un centre d'entraînement impitoyable pour créer le 'meilleur buteur egoïste' du monde. Yoichi Isagi y entre pour devenir le n°1."

const TAGS = ['Sport', 'Action', 'Psychologique', 'Shonen', 'Football']

const AWARDS = [
  { icon: '⚽', label: 'Ego vs Talent' },
  { icon: '🔵', label: 'Le projet ultime' },
  { icon: '🏆', label: 'Le buteur n°1' },
]

const COVER = '/bluelock-poster.jpg'

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
  @keyframes blFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes blPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes blFadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

  .bl-ep-card {
    content-visibility: auto;
    contain-intrinsic-size: 0 260px;
    transition: transform .22s ease, box-shadow .22s ease, border-color .18s ease;
    cursor: pointer;
  }
  .bl-ep-card:hover {
    transform: translateY(-5px) scale(1.015) !important;
    box-shadow: 0 18px 48px rgba(21,101,192,.18) !important;
    border-color: rgba(21,101,192,.45) !important;
  }
  .bl-ep-card:focus-visible { outline: 2px solid ${COLOR}; outline-offset: 3px; }

  .bl-play-btn { transition: transform .16s, opacity .16s, background .16s; }
  .bl-ep-card:hover .bl-play-btn { transform: scale(1.15) !important; opacity: 1 !important; }

  .bl-cta { transition: background .18s, transform .14s, box-shadow .18s; }
  .bl-cta:hover {
    background: rgba(21,101,192,.18) !important;
    transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(21,101,192,.22);
  }

  .bl-scroll { scrollbar-width: thin; scrollbar-color: rgba(21,101,192,.2) transparent; }
  .bl-scroll::-webkit-scrollbar { width: 4px; }
  .bl-scroll::-webkit-scrollbar-thumb { background: rgba(21,101,192,.2); border-radius: 4px; }
`



const EpCard = memo(function EpCard({ video, index, watched, onPlay }) {
  const [imgErr, setImgErr] = useState(false)
  const cardLabel = video.kind === 'film' ? 'FILM' : video.kind === 'ova' ? 'OAV' : `EPISODE ${video.episode}`
  const fallbackLabel = video.kind === 'ova' ? 'OAV' : video.kind === 'film' ? 'FILM' : video.episode
  return (
    <div className="bl-ep-card" role="button" tabIndex={0} onClick={onPlay} onKeyDown={e => e.key === 'Enter' && onPlay()}
      style={{ borderRadius: 14, overflow: 'hidden', background: 'rgba(14,12,24,.92)', border: `1px solid ${watched ? 'rgba(96,165,250,.28)' : 'rgba(255,255,255,.07)'}`, animation: `blFadeUp .3s ${index * 0.03}s ease-out both`, position: 'relative' }}>
      <div style={{ position: 'relative', paddingTop: '57%', background: '#0a0814', overflow: 'hidden' }}>
        {video.thumbnail && !imgErr
          ? <img src={video.thumbnail} alt={video.title} loading="lazy" onError={() => setImgErr(true)}
              style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity: watched ? 0.5 : 0.82 }} />
          : <div style={{ position:'absolute',inset:0, background:`linear-gradient(135deg,rgba(21,101,192,.12),rgba(0,0,0,.9))`, display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontFamily:"'Pirata One',cursive", fontSize:40, fontWeight:900, color:`rgba(21,101,192,.28)`, lineHeight:1 }}>{fallbackLabel}</span>
            </div>}
        <div style={{ position:'absolute',inset:'40% 0 0', background:'linear-gradient(180deg,transparent,rgba(0,0,0,.65))', pointerEvents:'none' }} />
        <div className="bl-play-btn" style={{ position:'absolute',inset:0, display:'flex',alignItems:'center',justifyContent:'center', opacity: watched ? 0.5 : 0.78 }}>
          <div style={{ width:40,height:40,borderRadius:'50%',background:`rgba(21,101,192,.82)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,backdropFilter:'blur(6px)',boxShadow:`0 4px 18px rgba(21,101,192,.45)` }}>▶</div>
        </div>
        {watched && <div style={{ position:'absolute',top:8,right:8, width:22,height:22,borderRadius:'50%',background:'rgba(52,211,153,.18)',border:'1px solid rgba(52,211,153,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#34d399',fontWeight:900 }}>✓</div>}
        <div style={{ position:'absolute',bottom:8,left:8, fontSize:9,fontWeight:800,background:'rgba(21,101,192,.16)',color:COLOR2,border:`1px solid rgba(21,101,192,.28)`,borderRadius:100,padding:'2px 7px' }}>{video.badge || 'VOSTFR'}</div>
      </div>
      <div style={{ padding:'10px 13px 13px' }}>
        <div style={{ fontSize:9.5,fontWeight:800,color:COLOR2,letterSpacing:'.1em',marginBottom:4 }}>{cardLabel}</div>
        <div style={{ fontSize:13.5,fontWeight:700,color:'#fff',lineHeight:1.28 }}>{video.title}</div>
      </div>
    </div>
  )
})

function InfoPanel({ watchedCount, total, lastWatchedIdx, onResume, chapterCount, readCount = 0 }) {
  const pct = total > 0 ? Math.round((watchedCount / total) * 100) : 0
  const nextVideo = VIDEOS[lastWatchedIdx] || VIDEOS[0]
  return (
    <aside style={{ position: 'sticky', top: 0, alignSelf: 'start', display: 'flex', flexDirection: 'column', borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(180deg,rgba(16,12,30,.96),rgba(10,8,20,.99))', border: '1px solid rgba(21,101,192,.18)', boxShadow: '0 24px 70px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.04)', backdropFilter: 'blur(20px)' }}>
      <div style={{ position:'relative', height:260, overflow:'hidden', flexShrink:0 }}>
        <img src={COVER} alt="Blue Lock" style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 15%',opacity:.72,filter:'saturate(1.1) brightness(.9)' }} />
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(16,12,30,.98) 100%)' }} />
        <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'0 18px 20px' }}>
          <div style={{ fontSize:9.5,fontWeight:800,letterSpacing:'.18em',color:COLOR2,textTransform:'uppercase',marginBottom:6 }}>⚽ EGO • BUT • RIVALITÉ</div>
          <h2 style={{ margin:0, fontFamily:"'Pirata One',cursive", fontSize:22,fontWeight:900,color:'#fff',lineHeight:1.0,letterSpacing:'-.01em',textShadow:'0 2px 20px rgba(0,0,0,.9)' }}>Blue Lock</h2>
          <div style={{ fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,marginTop:3 }}>2022</div>
        </div>
      </div>

      <div style={{ padding:'18px 18px 22px', display:'flex', flexDirection:'column', gap:18 }}>
        <div style={{ display:'flex',alignItems:'center',gap:14 }}>
          <ProgressRing pct={pct} posterSrc={COVER} color={COLOR} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12,fontWeight:800,color:'rgba(255,255,255,.65)',marginBottom:4 }}>{watchedCount} / {total} vidéos</div>
            <div style={{ height:5,borderRadius:999,background:'rgba(255,255,255,.07)',overflow:'hidden' }}>
              <div style={{ width:`${pct}%`,height:'100%',borderRadius:999,background:`linear-gradient(90deg,${COLOR},${COLOR2})`,boxShadow:`0 0 12px ${COLOR}55`,transition:'width .5s ease' }} />
            </div>
            <div style={{ fontSize:10,color:'rgba(255,255,255,.28)',fontWeight:600,marginTop:4 }}>{pct === 100 ? '✓ Tout vu' : pct === 0 ? 'Pas encore commencé' : 'En cours de visionnage'}</div>
          </div>
        </div>

        <button className="bl-cta" onClick={onResume} style={{ width:'100%',padding:'11px 0',borderRadius:12, background:`rgba(21,101,192,.14)`,border:`1px solid rgba(21,101,192,.32)`, color:'#fff',cursor:'pointer',fontSize:13,fontWeight:800, display:'flex',alignItems:'center',justifyContent:'center',gap:8, fontFamily:'var(--body)' }}>
          <span style={{ fontSize:16 }}>▶</span>
          {chapterCount > 0 ? (readCount === 0 ? `Commencer scans (${chapterCount} ch.)` : readCount === chapterCount ? 'Scans terminés — relire' : `Reprendre lecture scans`) : (pct === 0 ? 'Commencer' : pct === 100 ? 'Revoir depuis le début' : `Reprendre — ${nextVideo?.title || `Ép. ${nextVideo?.episode}`}`)}
        </button>

        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          {[
            { label:'Épisodes', value: String(VIDEOS.length || '—'), dot:COLOR2 },
            { label:'Chapitres', value: String(chapterCount || 0), dot:'#fbbf24' },
            { label:'Lus', value: `${readCount}/${chapterCount||0}`, dot:'#34d399' },
            { label:'Audio', value:'VF + VO', dot:'#f97316' },
            { label:'Note', value:'★ 8.5', dot:'#f97316' },
          ].map(s => (
            <div key={s.label} style={{ padding:'10px 12px',borderRadius:12,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display:'flex',alignItems:'center',gap:5,marginBottom:3 }}>
                <div style={{ width:4,height:4,borderRadius:'50%',background:s.dot }} />
                <span style={{ fontSize:8.5,fontWeight:800,color:'rgba(255,255,255,.28)',letterSpacing:'.08em',textTransform:'uppercase' }}>{s.label}</span>
              </div>
              <div style={{ fontSize:14,fontWeight:900,color:'#fff' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontSize:10,fontWeight:800,color:COLOR2,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:8 }}>Synopsis</div>
          <p style={{ margin:0,fontSize:12.5,color:'rgba(255,255,255,.54)',lineHeight:1.72,fontStyle:'italic' }}>{SYNOPSIS}</p>
        </div>

        <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
          {TAGS.map(tag => (
            <span key={tag} style={{ fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:999,background:'rgba(21,101,192,.08)',border:'1px solid rgba(21,101,192,.2)',color:COLOR2 }}>{tag}</span>
          ))}
        </div>

        <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
          {AWARDS.map(a => (
            <div key={a.label} style={{ display:'flex',alignItems:'center',gap:9,padding:'8px 12px',borderRadius:10,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)' }}>
              <span style={{ fontSize:16 }}>{a.icon}</span>
              <span style={{ fontSize:11.5,fontWeight:700,color:'rgba(255,255,255,.55)' }}>{a.label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

export default function BlueLockPage({ onClose }) {
  const [playerIdx, setPlayerIdx] = useState(null)
  const [progress, setProgress]   = useState(loadProgress)
  const [scanProg, setScanProg]   = useState(loadScanProgress)
  const [reading, setReading]     = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape' && playerIdx === null && reading === null) onClose?.() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [playerIdx, reading, onClose])

  const keyOf = (v) => v.progressKey || v.id || (v.kind === 'film' ? `film-${v.episode}` : v.kind === 'ova' ? `ova-${v.episode}` : v.episode)
  const markWatched = useCallback((idx) => {
    setProgress(prev => {
      const v = VIDEOS[idx]; if (!v) return prev
      const next = { ...prev, [keyOf(v)]: { completed: true } }
      saveProgress(next)
      return next
    })
  }, [])
  const watchedCount = useMemo(() => VIDEOS.filter(v => progress[keyOf(v)]?.completed).length, [progress])
  const resumeIdx = useMemo(() => { const i = VIDEOS.findIndex(v => !progress[keyOf(v)]?.completed); return i >= 0 ? i : 0 }, [progress])
  const openPlayer = useCallback((idx) => { setPlayerIdx(idx); markWatched(idx) }, [markWatched])
  const playHandlers = useMemo(() => VIDEOS.map((_, i) => () => openPlayer(i)), [openPlayer])

  const episodes = VIDEOS.map((v, i) => ({ v, i })).filter(x => !x.v.kind)
  const ovas = VIDEOS.map((v, i) => ({ v, i })).filter(x => x.v.kind === 'ova')
  const films = VIDEOS.map((v, i) => ({ v, i })).filter(x => x.v.kind === 'film')
  const chapterCount = CHAPTERS.length || 0

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

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position:'fixed',inset:0,zIndex:500, background:'radial-gradient(circle at 18% 12%,rgba(21,101,192,.09),transparent 32rem),radial-gradient(circle at 84% 80%,rgba(96,165,250,.07),transparent 28rem),linear-gradient(135deg,#0e0a1a 0%,#100c1c 55%,#0a0814 100%)', display:'flex',flexDirection:'column' }}>
        <AnimeBackdrop motifs={ANIME_MOTIFS.bluelock} color={COLOR} color2={COLOR2} />
        {/* Navbar */}
        <div style={{ flexShrink:0,height:62,padding:'0 24px', display:'flex',alignItems:'center',justifyContent:'space-between', background:'rgba(14,10,26,.96)',backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(21,101,192,.10)',zIndex:10, position:'relative' }}>
          <button onClick={playerIdx !== null ? () => setPlayerIdx(null) : onClose}
            style={{ display:'flex',alignItems:'center',gap:7,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.09)',borderRadius:10,color:'rgba(255,255,255,.72)',cursor:'pointer',padding:'8px 16px',fontSize:12.5,fontWeight:800,transition:'background .15s',fontFamily:'var(--body)' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.11)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,.06)'}>
            ← {playerIdx !== null ? 'Épisodes' : 'Retour'}
          </button>
          <div style={{ position:'absolute',left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:10 }}>
            <span style={{ fontSize:17,animation:'blFloat 6s ease-in-out infinite' }}>⚽</span>
            <span style={{ fontFamily:"'Pirata One',cursive",fontSize:17,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>
              {playerIdx !== null ? (VIDEOS[playerIdx]?.title || `Épisode ${VIDEOS[playerIdx]?.episode}`) : 'Blue Lock'}
            </span>
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <div style={{ fontSize:10.5,color:'rgba(255,255,255,.28)',fontWeight:700 }}>{watchedCount}/{VIDEOS.length} vus · {readCount}/{chapterCount} lus</div>
            <div style={{ width:56,height:5,borderRadius:999,background:'rgba(255,255,255,.07)',overflow:'hidden' }}>
              <div style={{ width:`${Math.round(watchedCount/VIDEOS.length*100)}%`,height:'100%',background:`linear-gradient(90deg,${COLOR},${COLOR2})`,borderRadius:999,transition:'width .4s' }} />
            </div>
          </div>
        </div>

        {/* Content */}
        {playerIdx !== null ? (
          <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
            <VideoPlayer videos={VIDEOS} startIdx={playerIdx} onClose={() => setPlayerIdx(null)} color={COLOR} storageKey={NS} />
          </div>
        ) : (
          <div ref={scrollRef} className="bl-scroll" style={{ flex:1,overflowY:'auto',padding:'24px 28px 48px' }}>
            <style>{`
              .bl-layout { display: grid; grid-template-columns: 310px minmax(0,1fr); gap: 28px; max-width: 1480px; margin: 0 auto; align-items: start; }
              @media (max-width: 900px) { .bl-layout { grid-template-columns: 1fr; } }
            `}</style>
            <div className="bl-layout">
              <InfoPanel watchedCount={watchedCount} total={VIDEOS.length} lastWatchedIdx={resumeIdx} onResume={() => openPlayer(resumeIdx)} chapterCount={chapterCount} readCount={readCount} />
              <div>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
                  <div>
                    <h3 style={{ margin:'0 0 3px',fontSize:18,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>Chapitres Manga</h3>
                    <div style={{ fontSize:11,color:'rgba(255,255,255,.32)',fontWeight:600 }}>{chapterCount} chapitres • Scans disponibles</div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:999,background:'rgba(21,101,192,.08)',border:'1px solid rgba(21,101,192,.18)' }}>
                    <div style={{ width:6,height:6,borderRadius:'50%',background:'#fbbf24' }} />
                    <span style={{ fontSize:11,fontWeight:800,color:COLOR2 }}>Scans actifs</span>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:10 }}>
                  {CHAPTERS.map((ch, i) => {
                    const status = scanProg[ch.num] || null
                    const isRead = status === 'read'
                    const isReading = status === 'reading'
                    return (
                      <button
                        key={ch.num}
                        onClick={() => openChapter(i)}
                        style={{
                          position:'relative',
                          background: isRead ? 'rgba(10,14,24,.5)' : 'rgba(10,14,24,.85)',
                          border: isReading ? `2px solid ${COLOR}` : `1px solid ${isRead ? 'rgba(21,101,192,.15)' : 'rgba(255,255,255,.07)'}`,
                          borderRadius:14, padding:'14px', cursor:'pointer', textAlign:'left', fontFamily:'var(--body)',
                          opacity: isRead ? 0.7 : 1,
                          transition: 'all .15s ease'
                        }}
                        onMouseEnter={e => { if (!isRead) e.currentTarget.style.borderColor = COLOR + '55' }}
                        onMouseLeave={e => { if (!isRead && !isReading) e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)' }}
                      >
                        {isRead && <div style={{ position:'absolute',top:8,right:8,width:18,height:18,borderRadius:'50%',background:'rgba(52,211,153,.2)',border:'1px solid rgba(52,211,153,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#34d399',fontWeight:700 }}>✓</div>}
                        {isReading && <div style={{ position:'absolute',top:8,right:8,fontSize:9,fontWeight:700,background:`${COLOR}22`,color:COLOR,border:`1px solid ${COLOR}55`,borderRadius:100,padding:'1px 6px' }}>En cours</div>}
                        <div style={{ fontSize:18,marginBottom:6 }}>{ch.emoji}</div>
                        <div style={{ fontSize:9,fontWeight:800,color:COLOR2,letterSpacing:'.08em',marginBottom:3 }}>CHAPITRE {ch.num}</div>
                        <div style={{ fontSize:12,fontWeight:700,color: isRead ? 'rgba(255,255,255,.5)' : '#fff', lineHeight:1.3, marginBottom:6 }}>{ch.title}</div>
                        <div style={{ fontSize:10,fontWeight:700,color: isRead ? 'rgba(255,255,255,.3)' : COLOR2 }}>📖 {isRead ? 'Relire' : isReading ? 'Continuer' : 'Lire'}</div>
                      </button>
                    )
                  })}
                </div>

                <div style={{ marginTop:28,padding:'14px 18px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:10 }}>
                  <span style={{ fontSize:16 }}>⚽</span>
                  <span style={{ fontSize:12,color:'rgba(255,255,255,.38)',fontWeight:600,lineHeight:1.5 }}>
                    Blue Lock — l'anime de football le plus intense, où l'ego fait la différence. {chapterCount} chapitres de scans disponibles.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
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
    </>
  )
}
