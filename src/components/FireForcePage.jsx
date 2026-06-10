import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import VideoPlayer from './VideoPlayer.jsx'
import EpisodeDetailInline from './EpisodeDetailInline.jsx'
import EpisodeWatch from './EpisodeWatch.jsx'
import { Reader } from './MangaReader.jsx'
import { ProgressRing } from './ProgressRing.jsx'
import AnimeBackdrop, { ANIME_MOTIFS } from './AnimeBackdrop.jsx'
import VIDEOS_RAW from '../data/fireforce-videos.json'
import CHAPTERS_RAW from '../data/fireforce-chapters.json'

const VIDEOS = VIDEOS_RAW

const CHAPTERS = (CHAPTERS_RAW || []).map((ch, i) => ({
  num: String(ch.num || (i+1)),
  title: ch.title || `Chapitre ${ch.num || (i+1)}`,
  emoji: '🔥',
  pages: ch.pages || [],
}))

const COLOR  = '#f4511e'
const COLOR2 = '#fb923c'
const NS     = 'fireforce'

const SYNOPSIS = "Dans un monde où des humains s'enflamment spontanément et se transforment en 'Infernaux', Shinra Kusakabe intègre la 8ème Brigade des Pompiers Spéciaux pour comprendre les mystères de la combustion et sauver sa mère disparue dans un incendie."

const TAGS = ['Action', 'Surnaturel', 'Shonen', 'Feu', 'Mystère']

const AWARDS = [
  { icon: '🔥', label: 'Les 8 Brigades' },
  { icon: '🚒', label: 'Héros du feu' },
  { icon: '👹', label: 'Le Chevalier du Diable' },
]

const COVER = '/fireforce-poster.jpg'

const SEASONS = [
  { key:'S02', label:'Saison 2', title:'Asakusa & Holy Sol' },
  { key:'S03', label:'Saison 3', title:'La Grande Catastrophe' },
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
  @keyframes ffFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes ffPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes ffFadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

  .ff-ep-card {
    content-visibility: auto;
    contain-intrinsic-size: 0 260px;
    transition: transform .22s ease, box-shadow .22s ease, border-color .18s ease;
    cursor: pointer;
  }
  .ff-ep-card:hover {
    transform: translateY(-5px) scale(1.015) !important;
    box-shadow: 0 18px 48px rgba(244,81,30,.18) !important;
    border-color: rgba(244,81,30,.45) !important;
  }
  .ff-ep-card:focus-visible { outline: 2px solid ${COLOR}; outline-offset: 3px; }

  .ff-play-btn { transition: transform .16s, opacity .16s, background .16s; }
  .ff-ep-card:hover .ff-play-btn { transform: scale(1.15) !important; opacity: 1 !important; }

  .ff-cta { transition: background .18s, transform .14s, box-shadow .18s; }
  .ff-cta:hover {
    background: rgba(244,81,30,.18) !important;
    transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(244,81,30,.22);
  }

  .ff-scroll { scrollbar-width: thin; scrollbar-color: rgba(244,81,30,.2) transparent; }
  .ff-scroll::-webkit-scrollbar { width: 4px; }
  .ff-scroll::-webkit-scrollbar-thumb { background: rgba(244,81,30,.2); border-radius: 4px; }
`



const EpCard = memo(function EpCard({ video, index, watched, onPlay }) {
  const [imgErr, setImgErr] = useState(false)
  const cardLabel = video.kind === 'film' ? 'FILM' : video.kind === 'ova' ? 'OAV' : `EPISODE ${video.episode}`
  const fallbackLabel = video.kind === 'ova' ? 'OAV' : video.kind === 'film' ? 'FILM' : video.episode
  return (
    <div className="ff-ep-card" role="button" tabIndex={0} onClick={onPlay} onKeyDown={e => e.key === 'Enter' && onPlay()}
      style={{ borderRadius: 14, overflow: 'hidden', background: 'rgba(14,12,24,.92)', border: `1px solid ${watched ? 'rgba(251,146,60,.28)' : 'rgba(255,255,255,.07)'}`, animation: `ffFadeUp .3s ${index * 0.03}s ease-out both`, position: 'relative' }}>
      <div style={{ position: 'relative', paddingTop: '57%', background: '#0a0814', overflow: 'hidden' }}>
        {video.thumbnail && !imgErr
          ? <img src={video.thumbnail} alt={video.title} loading="lazy" onError={() => setImgErr(true)}
              style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity: watched ? 0.5 : 0.82 }} />
          : <div style={{ position:'absolute',inset:0, background:`linear-gradient(135deg,rgba(244,81,30,.12),rgba(0,0,0,.9))`, display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontFamily:"'Pirata One',cursive", fontSize:40, fontWeight:900, color:`rgba(244,81,30,.28)`, lineHeight:1 }}>{fallbackLabel}</span>
            </div>}
        <div style={{ position:'absolute',inset:'40% 0 0', background:'linear-gradient(180deg,transparent,rgba(0,0,0,.65))', pointerEvents:'none' }} />
        <div className="ff-play-btn" style={{ position:'absolute',inset:0, display:'flex',alignItems:'center',justifyContent:'center', opacity: watched ? 0.5 : 0.78 }}>
          <div style={{ width:40,height:40,borderRadius:'50%',background:`rgba(244,81,30,.82)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,backdropFilter:'blur(6px)',boxShadow:`0 4px 18px rgba(244,81,30,.45)` }}>▶</div>
        </div>
        {watched && <div style={{ position:'absolute',top:8,right:8, width:22,height:22,borderRadius:'50%',background:'rgba(52,211,153,.18)',border:'1px solid rgba(52,211,153,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#34d399',fontWeight:900 }}>✓</div>}
        <div style={{ position:'absolute',bottom:8,left:8, fontSize:9,fontWeight:800,background:'rgba(244,81,30,.16)',color:COLOR2,border:`1px solid rgba(244,81,30,.28)`,borderRadius:100,padding:'2px 7px' }}>{video.badge || 'VOSTFR'}</div>
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
    <aside style={{ position: 'sticky', top: 0, alignSelf: 'start', display: 'flex', flexDirection: 'column', borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(180deg,rgba(16,12,30,.96),rgba(10,8,20,.99))', border: '1px solid rgba(244,81,30,.18)', boxShadow: '0 24px 70px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.04)', backdropFilter: 'blur(20px)' }}>
      <div style={{ position:'relative', height:260, overflow:'hidden', flexShrink:0 }}>
        <img src={COVER} alt="Fire Force" style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 15%',opacity:.72,filter:'saturate(1.1) brightness(.9)' }} />
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(16,12,30,.98) 100%)' }} />
        <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'0 18px 20px' }}>
          <div style={{ fontSize:9.5,fontWeight:800,letterSpacing:'.18em',color:COLOR2,textTransform:'uppercase',marginBottom:6 }}>🔥 BRIGADES • INFERNAUX • HÉROS</div>
          <h2 style={{ margin:0, fontFamily:"'Pirata One',cursive", fontSize:22,fontWeight:900,color:'#fff',lineHeight:1.0,letterSpacing:'-.01em',textShadow:'0 2px 20px rgba(0,0,0,.9)' }}>Fire Force</h2>
          <div style={{ fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,marginTop:3 }}>David Production · 2019</div>
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

        <button className="ff-cta" onClick={onResume} style={{ width:'100%',padding:'11px 0',borderRadius:12, background:`rgba(244,81,30,.14)`,border:`1px solid rgba(244,81,30,.32)`, color:'#fff',cursor:'pointer',fontSize:13,fontWeight:800, display:'flex',alignItems:'center',justifyContent:'center',gap:8, fontFamily:'var(--body)' }}>
          <span style={{ fontSize:16 }}>▶</span>
          {pct === 0 ? 'Commencer' : pct === 100 ? 'Revoir depuis le début' : `Reprendre — ${nextVideo?.title || `Ép. ${nextVideo?.episode}`}`}
        </button>

        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          {[
            { label:'Épisodes', value: String(VIDEOS.length || '—'), dot:COLOR2 },
            { label:'Saisons', value:'S2 + S3', dot:'#fbbf24' },
            { label:'Audio', value:'VOSTFR', dot:'#f97316' },
            { label:'Note', value:'★ 8.1', dot:'#f97316' },
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
            <span key={tag} style={{ fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:999,background:'rgba(244,81,30,.08)',border:'1px solid rgba(244,81,30,.2)',color:COLOR2 }}>{tag}</span>
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

export default function FireForcePage({ onClose }) {
  const [playerIdx, setPlayerIdx] = useState(null)
  const [detailIdx, setDetailIdx] = useState(null)
  const [progress, setProgress]   = useState(loadProgress)
  const [scanProg, setScanProg]   = useState(loadScanProgress)
  const [reading, setReading]     = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape' && detailIdx === null && reading === null) onClose?.() }
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
  const openDetail = useCallback((idx) => {
    setDetailIdx(idx)
    markWatched(idx)
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }))
  }, [markWatched])
  const playHandlers = useMemo(() => VIDEOS.map((_, i) => () => openDetail(i)), [openDetail])

  const availableSeasons = useMemo(() => SEASONS.filter(s => VIDEOS.some(v => v.season === s.key)), [])
  const [activeSeason, setActiveSeason] = useState(() => availableSeasons[0]?.key || 'S02')
  const seasonInfo = SEASONS.find(s => s.key === activeSeason) || SEASONS[0]
  const seasonVideos = useMemo(() => VIDEOS.map((v, gi) => ({ v, gi })).filter(({ v }) => v.season === seasonInfo.key), [seasonInfo])
  const seasonWatched = useMemo(() => seasonVideos.filter(({ v }) => progress[keyOf(v)]?.completed).length, [seasonVideos, progress])

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
      <div style={{ position:'fixed',left:0,right:0,top:76,bottom:0,zIndex:500, background:'radial-gradient(circle at 18% 12%,rgba(244,81,30,.09),transparent 32rem),radial-gradient(circle at 84% 80%,rgba(251,146,60,.07),transparent 28rem),linear-gradient(135deg,#0e0a1a 0%,#100c1c 55%,#0a0814 100%)', display:'flex',flexDirection:'column' }}>
        <AnimeBackdrop motifs={ANIME_MOTIFS.fireforce} color={COLOR} color2={COLOR2} />
        {/* Navbar */}
        <div style={{ flexShrink:0,height:62,padding:'0 24px', display:'flex',alignItems:'center',justifyContent:'space-between', background:'rgba(14,10,26,.96)',backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(244,81,30,.10)',zIndex:10, position:'relative' }}>
          <button onClick={detailIdx !== null ? () => setDetailIdx(null) : onClose}
            style={{ display:'flex',alignItems:'center',gap:7,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.09)',borderRadius:10,color:'rgba(255,255,255,.72)',cursor:'pointer',padding:'8px 16px',fontSize:12.5,fontWeight:800,transition:'background .15s',fontFamily:'var(--body)' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.11)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,.06)'}>
            ← {detailIdx !== null ? 'Épisodes' : 'Retour'}
          </button>
          <div style={{ position:'absolute',left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:10 }}>
            <span style={{ fontSize:17,animation:'ffFloat 6s ease-in-out infinite' }}>🔥</span>
            <span style={{ fontFamily:"'Pirata One',cursive",fontSize:17,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>
              {detailIdx !== null ? (VIDEOS[detailIdx]?.title || `Épisode ${VIDEOS[detailIdx]?.episode}`) : 'Fire Force'}
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
        {detailIdx !== null ? (
          <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'24px 28px 48px' }}>
            <div style={{ maxWidth: 1760, margin: '0 auto' }}>
              <EpisodeWatch videos={VIDEOS} startIdx={detailIdx} ns={NS} storageKey={NS} color={COLOR} color2={COLOR2} onSelect={openDetail} onClose={() => setDetailIdx(null)} />
            </div>
          </div>
        ) : (
          <div ref={scrollRef} className="ff-scroll" style={{ flex:1,overflowY:'auto',padding:'24px 28px 48px' }}>
            <style>{`
              .ff-layout { display: grid; grid-template-columns: 310px minmax(0,1fr); gap: 28px; max-width: 1480px; margin: 0 auto; align-items: start; }
              @media (max-width: 900px) { .ff-layout { grid-template-columns: 1fr; } }
            `}</style>
            <div className="ff-layout">
              <InfoPanel watchedCount={watchedCount} total={VIDEOS.length} lastWatchedIdx={resumeIdx} onResume={() => openDetail(resumeIdx)} chapterCount={chapterCount} readCount={readCount} />
              <div>
                {/* Onglets saison */}
                <div style={{ display:'flex',gap:8,marginBottom:18,flexWrap:'wrap' }}>
                  {availableSeasons.map(s => {
                    const active = s.key === activeSeason
                    const inSeason = VIDEOS.filter(v => v.season === s.key)
                    const sWatched = inSeason.filter(v => progress[keyOf(v)]?.completed).length
                    const sDone = sWatched === inSeason.length && inSeason.length > 0
                    return (
                      <button
                        key={s.key}
                        className="ff-cta"
                        onClick={() => { setActiveSeason(s.key); scrollRef.current?.scrollTo({ top:0, behavior:'smooth' }) }}
                        style={{
                          padding:'8px 16px',borderRadius:12,border:`1px solid ${active ? COLOR : 'rgba(255,255,255,.10)'}`,
                          background: active ? `rgba(244,81,30,.18)` : 'rgba(255,255,255,.04)',
                          color: active ? '#fff' : 'rgba(255,255,255,.45)',
                          cursor:'pointer',fontSize:12.5,fontWeight:800,fontFamily:'var(--body)',
                          display:'flex',alignItems:'center',gap:7,whiteSpace:'nowrap',
                          boxShadow: active ? `0 0 18px ${COLOR}33` : 'none',
                        }}
                      >
                        <span>{s.label}</span>
                        {sDone && <span style={{ fontSize:10,color:'#34d399' }}>✓</span>}
                        {!sDone && sWatched > 0 && <span style={{ fontSize:9,color:COLOR2,background:`${COLOR}22`,borderRadius:100,padding:'1px 6px' }}>{sWatched}/{inSeason.length}</span>}
                      </button>
                    )
                  })}
                </div>

                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
                  <div>
                    <h3 style={{ margin:'0 0 3px',fontSize:18,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>{seasonInfo.label} — {seasonInfo.title}</h3>
                    <div style={{ fontSize:11,color:'rgba(255,255,255,.32)',fontWeight:600 }}>{seasonVideos.length} épisodes • VOSTFR</div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:999,background:'rgba(244,81,30,.08)',border:'1px solid rgba(244,81,30,.18)' }}>
                    <div style={{ width:6,height:6,borderRadius:'50%',background: seasonWatched===seasonVideos.length && seasonVideos.length>0 ?'#34d399':'#fbbf24' }} />
                    <span style={{ fontSize:11,fontWeight:800,color:COLOR2 }}>{seasonWatched}/{seasonVideos.length} vus</span>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(212px,1fr))', gap:14 }}>
                  {seasonVideos.map(({ v, gi }) => {
                    const i = gi
                    const watched = progress[keyOf(v)]?.completed
                    const isNext = i === resumeIdx
                    const kindLabel = v.kind === 'film' ? 'FILM' : v.kind === 'ova' ? 'OVA' : `ÉP ${v.episode}`
                    return (
                      <button
                        key={v.progressKey || v.id || i}
                        className="ff-ep-card"
                        onClick={() => openDetail(i)}
                        style={{
                          position:'relative', padding:0, textAlign:'left', fontFamily:'var(--body)',
                          background:'rgba(20,12,8,.7)',
                          border: isNext ? `2px solid ${COLOR}` : `1px solid rgba(255,255,255,.07)`,
                          borderRadius:14, overflow:'hidden', cursor:'pointer',
                        }}
                      >
                        <div style={{ position:'relative', aspectRatio:'16/9', background:`linear-gradient(135deg,${COLOR}22,#0a0608)`, overflow:'hidden' }}>
                          {v.thumbnail && (
                            <img src={v.thumbnail} alt="" loading="lazy"
                              onError={e => { e.currentTarget.style.display='none' }}
                              style={{ width:'100%',height:'100%',objectFit:'cover', opacity: watched ? .55 : .92, transition:'opacity .2s, transform .3s' }} />
                          )}
                          <div style={{ position:'absolute',inset:0,background:'linear-gradient(180deg,transparent 45%,rgba(8,5,4,.85) 100%)' }} />
                          <div className="ff-play-btn" style={{ position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)', width:40,height:40,borderRadius:'50%', background:`${COLOR}e0`, display:'flex',alignItems:'center',justifyContent:'center', opacity:.85, boxShadow:`0 4px 18px ${COLOR}66`, fontSize:15,color:'#fff' }}>▶</div>
                          {watched && <div style={{ position:'absolute',top:8,right:8,width:20,height:20,borderRadius:'50%',background:'rgba(52,211,153,.25)',border:'1px solid rgba(52,211,153,.6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#34d399',fontWeight:800 }}>✓</div>}
                          {isNext && !watched && <div style={{ position:'absolute',top:8,right:8,fontSize:9,fontWeight:800,background:`${COLOR}`,color:'#fff',borderRadius:100,padding:'2px 8px' }}>REPRENDRE</div>}
                          <div style={{ position:'absolute',bottom:8,left:8,fontSize:9.5,fontWeight:900,color:'#fff',letterSpacing:'.06em',padding:'3px 8px',borderRadius:7,background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)' }}>{kindLabel}</div>
                          {v.badge && <div style={{ position:'absolute',bottom:8,right:8,fontSize:8.5,fontWeight:900,color:COLOR2,letterSpacing:'.06em',padding:'3px 7px',borderRadius:7,background:'rgba(0,0,0,.55)' }}>{v.badge}</div>}
                        </div>
                        <div style={{ padding:'9px 11px 11px' }}>
                          <div style={{ fontSize:12.5,fontWeight:800,color: watched ? 'rgba(255,255,255,.55)' : '#fff', lineHeight:1.25, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.title || `Épisode ${v.episode}`}</div>
                          {v.arc && <div style={{ fontSize:9.5,fontWeight:700,color:'rgba(255,255,255,.3)',marginTop:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{v.arc}</div>}
                        </div>
                      </button>
                    )
                  })}
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
