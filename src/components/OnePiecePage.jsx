import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import VideoPlayer from './VideoPlayer.jsx'
import { ProgressRing } from './ProgressRing.jsx'
import AnimeBackdrop, { ANIME_MOTIFS } from './AnimeBackdrop.jsx'
import VIDEOS_RAW from '../data/onepiece-videos.js'
import SeasonDivider from './SeasonDivider.jsx'

const VIDEOS = VIDEOS_RAW

const COLOR  = '#e0524a'
const COLOR2 = '#ff8a7a'
const NS     = 'one-piece'

const SYNOPSIS = "Monkey D. Luffy, chapeau de paille sur la tête, sillonne les mers du Grand Line avec son équipage à la recherche du légendaire trésor « One Piece » pour devenir Roi des Pirates. Chaque île réserve batailles, révélations et alliés… et des ennemis bien plus puissants."

const TAGS = ['Aventure', 'Action', 'Shōnen', 'Toei Animation', 'VOSTFR']

const AWARDS = [
  { icon: '🏴‍☠️', label: 'Franchise manga la plus vendue au monde' },
  { icon: '🌊', label: 'Plus de 1 100 épisodes' },
  { icon: '👑', label: 'Arc Elbaf en cours — Egghead complet' },
]

const COVER = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/op-egghead-thumbnails/E1086.jpg'

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(`${NS}_vp`) || '{}') } catch { return {} }
}
function saveProgress(p) {
  try { localStorage.setItem(`${NS}_vp`, JSON.stringify(p)) } catch {}
}

const CSS = `
  @keyframes opFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes opPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes opFadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
  .op-ep-card {
    content-visibility: auto;
    contain-intrinsic-size: 0 200px;
    transition: transform .22s ease, box-shadow .22s ease, border-color .18s ease;
    cursor: pointer;
  }
  .op-ep-card:hover {
    transform: translateY(-5px) scale(1.015) !important;
    box-shadow: 0 18px 48px rgba(224,82,74,.2) !important;
    border-color: rgba(224,82,74,.45) !important;
  }
  .op-ep-card:focus-visible { outline: 2px solid #e0524a; outline-offset: 3px; }
  .op-play-btn { transition: transform .16s, opacity .16s; }
  .op-ep-card:hover .op-play-btn { transform: scale(1.15) !important; opacity: 1 !important; }
  .op-cta { transition: background .18s, transform .14s, box-shadow .18s; }
  .op-cta:hover { background: rgba(224,82,74,.22) !important; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(224,82,74,.28); }
  .op-scroll { scrollbar-width: thin; scrollbar-color: rgba(224,82,74,.2) transparent; padding: 24px 28px 48px; }
  .op-scroll::-webkit-scrollbar { width: 4px; }
  .op-scroll::-webkit-scrollbar-thumb { background: rgba(224,82,74,.2); border-radius: 4px; }
  @media (max-width: 600px) { .op-scroll { padding: 12px 10px 30px !important; } }

  /* Mobile / Tablet optimizations */
  @media (max-width: 900px) {
    .op-header { height: auto !important; min-height: 52px; padding: 6px 12px !important; flex-wrap: wrap; gap: 6px; }
    .op-header > button { font-size: 11px !important; padding: 6px 10px !important; }
    .op-header-title { position: static !important; transform: none !important; flex: 1 1 100%; text-align: center; font-size: 15px !important; margin: 2px 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .op-header-right { font-size: 9px !important; }
    .op-header-right > div:last-child { width: 42px !important; height: 4px !important; }
  }
  @media (max-width: 600px) {
    .op-header { padding: 4px 10px !important; }
    .op-header > button { font-size: 10px !important; padding: 5px 8px !important; }
    .op-header-title { font-size: 14px !important; }
    .op-ep-card { border-radius: 10px !important; }
    .op-ep-card > div:first-child { padding-top: 52% !important; }
    .op-ep-card > div:last-child { padding: 6px 9px 9px !important; }
    .op-ep-card > div:last-child > div:first-child { font-size: 7.5px !important; }
    .op-ep-card > div:last-child > div:last-child { font-size: 11px !important; }
  }

  .op-layout { display: grid; grid-template-columns: 310px minmax(0,1fr); gap: 28px; max-width: 1480px; margin: 0 auto; align-items: start; }
  @media (max-width: 900px) { .op-layout { grid-template-columns: 1fr; } }
  @media (max-width: 600px) { .op-layout { gap: 16px; } }

  @media (max-width: 600px) {
    .op-info-hero { height: 160px !important; }
    .op-info-hero > div:last-child { padding: '0 12px 12px' !important; }
  }
`

const EpCard = memo(function EpCard({ video, index, watched, onPlay }) {
  const [imgErr, setImgErr] = useState(false)
  const canPlay = Boolean(video.src)
  return (
    <div className="op-ep-card" role="button" tabIndex={0}
      onClick={canPlay ? onPlay : undefined}
      onKeyDown={e => e.key === 'Enter' && canPlay && onPlay()}
      style={{
        borderRadius: 12, overflow: 'hidden',
        background: 'rgba(14,8,6,.92)',
        border: `1px solid ${watched ? 'rgba(224,82,74,.28)' : 'rgba(255,255,255,.07)'}`,
        animation: `opFadeUp .3s ${Math.min(index, 20) * 0.03}s ease-out both`,
        opacity: canPlay ? 1 : 0.45,
      }}>
      <div style={{ position:'relative', paddingTop:'57%', background:'#0a0814', overflow:'hidden' }}>
        {video.thumbnail && !imgErr
          ? <img src={video.thumbnail} alt={video.title} loading="lazy" onError={() => setImgErr(true)}
              style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:watched?0.5:0.82 }} />
          : <div style={{ position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(224,82,74,.12),rgba(0,0,0,.9))',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontFamily:"'Pirata One',cursive",fontSize:36,fontWeight:900,color:'rgba(224,82,74,.55)' }}>{video.episode}</span>
            </div>
        }
        <div style={{ position:'absolute',inset:'40% 0 0',background:'linear-gradient(180deg,transparent,rgba(0,0,0,.7))',pointerEvents:'none' }} />
        {canPlay && (
          <div className="op-play-btn" style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',opacity:watched?0.5:0.8 }}>
            <div style={{ width:40,height:40,borderRadius:'50%',background:'rgba(200,60,40,.85)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,backdropFilter:'blur(6px)',boxShadow:'0 4px 18px rgba(224,82,74,.5)' }}>▶</div>
          </div>
        )}
        {!canPlay && (
          <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center' }}>
            <span style={{ fontSize:9,fontWeight:800,background:'rgba(0,0,0,.7)',color:'rgba(255,255,255,.35)',borderRadius:6,padding:'3px 8px' }}>Bientôt</span>
          </div>
        )}
        {watched && <div style={{ position:'absolute',top:7,right:7,width:20,height:20,borderRadius:'50%',background:'rgba(52,211,153,.18)',border:'1px solid rgba(52,211,153,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#34d399',fontWeight:900 }}>✓</div>}
        {canPlay && <div style={{ position:'absolute',bottom:6,left:7,fontSize:8.5,fontWeight:800,background:'rgba(224,82,74,.18)',color:COLOR2,border:'1px solid rgba(224,82,74,.28)',borderRadius:100,padding:'1px 6px' }}>VOSTFR</div>}
      </div>
      <div style={{ padding:'8px 11px 11px' }}>
        <div style={{ fontSize:8.5,fontWeight:800,color:COLOR2,letterSpacing:'.1em',marginBottom:2 }}>ÉP. {video.episode}</div>
        <div style={{ fontSize:12,fontWeight:700,color:'#fff',lineHeight:1.28 }}>{video.title}</div>
      </div>
    </div>
  )
})

function InfoPanel({ watchedCount, availableCount, resumeIdx, onResume }) {
  const pct = availableCount > 0 ? Math.round((watchedCount / availableCount) * 100) : 0
  const nextVideo = VIDEOS[resumeIdx] || VIDEOS[0]
  return (
    <aside style={{
      position:'sticky', top:0, alignSelf:'start',
      borderRadius:22, overflow:'hidden',
      background:'linear-gradient(180deg,rgba(20,8,6,.97),rgba(12,4,2,.99))',
      border:'1px solid rgba(224,82,74,.18)',
      boxShadow:'0 24px 70px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.04)',
      backdropFilter:'blur(20px)',
    }}>
      <div className="op-info-hero" style={{ position:'relative',height:268,overflow:'hidden',flexShrink:0 }}>
        <img src={COVER} alt="One Piece" style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 15%',opacity:.72,filter:'saturate(1.1) brightness(.88)' }} />
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(20,8,6,.98) 100%)' }} />
        <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'0 18px 20px' }}>
          <div style={{ fontSize:9,fontWeight:800,letterSpacing:'.18em',color:COLOR2,textTransform:'uppercase',marginBottom:6 }}>🏴‍☠️ AVENTURE · PIRATES · GRAND LINE</div>
          <h2 style={{ margin:0,fontFamily:"'Pirata One',cursive",fontSize:24,fontWeight:900,color:'#fff',lineHeight:1,textShadow:'0 2px 20px rgba(0,0,0,.9)' }}>One Piece</h2>
          <div style={{ fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,marginTop:3 }}>Toei Animation · 1999–</div>
        </div>
      </div>

      <div style={{ padding:'18px 18px 22px',display:'flex',flexDirection:'column',gap:16 }}>
        <div style={{ display:'flex',alignItems:'center',gap:14 }}>
          <ProgressRing pct={pct} posterSrc={COVER} color={COLOR} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12,fontWeight:800,color:'rgba(255,255,255,.65)',marginBottom:4 }}>{watchedCount} / {availableCount} épisodes</div>
            <div style={{ height:5,borderRadius:999,background:'rgba(255,255,255,.07)',overflow:'hidden' }}>
              <div style={{ width:`${pct}%`,height:'100%',borderRadius:999,background:`linear-gradient(90deg,${COLOR},${COLOR2})`,transition:'width .5s ease' }} />
            </div>
            <div style={{ fontSize:10,color:'rgba(255,255,255,.28)',fontWeight:600,marginTop:4 }}>
              {pct===100?'✓ Arc terminé':pct===0?'Pas encore commencé':'En cours de visionnage'}
            </div>
          </div>
        </div>

        <button className="op-cta" onClick={onResume} disabled={!VIDEOS[resumeIdx]?.src}
          style={{ width:'100%',padding:'11px 0',borderRadius:12,background:'rgba(200,60,40,.14)',border:'1px solid rgba(224,82,74,.32)',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontFamily:'var(--body)' }}>
          <span style={{ fontSize:16 }}>▶</span>
          {pct===0?'Commencer':pct===100?'Revoir depuis le début':`Reprendre — Ép. ${nextVideo?.episode}`}
        </button>

        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          {[
            {label:'Disponibles',value:String(availableCount),dot:COLOR2},
            {label:'Arc actuel',value:'Elbaf',dot:'#34d399'},
            {label:'Audio',value:'VOSTFR',dot:'#fbbf24'},
            {label:'Statut',value:'En cours',dot:'#f97316'},
          ].map(s=>(
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
          {TAGS.map(tag=>(
            <span key={tag} style={{ fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:999,background:'rgba(224,82,74,.08)',border:'1px solid rgba(224,82,74,.22)',color:COLOR2 }}>{tag}</span>
          ))}
        </div>

        <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
          {AWARDS.map(a=>(
            <div key={a.label} style={{ display:'flex',alignItems:'center',gap:9,padding:'8px 12px',borderRadius:10,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)' }}>
              <span style={{ fontSize:15 }}>{a.icon}</span>
              <span style={{ fontSize:11.5,fontWeight:700,color:'rgba(255,255,255,.55)' }}>{a.label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

export default function OnePiecePage({ onClose }) {
  const [playerIdx, setPlayerIdx] = useState(null)
  const [progress,  setProgress]  = useState(loadProgress)
  const [arcFilter, setArcFilter] = useState('Tous')
  const scrollRef = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape' && playerIdx === null) onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [playerIdx, onClose])

  const markWatched = useCallback((idx) => {
    setProgress(prev => {
      const ep = VIDEOS[idx]?.episode
      if (!ep) return prev
      const next = { ...prev, [ep]: { completed: true } }
      saveProgress(next)
      return next
    })
  }, [])

  const watchedCount  = useMemo(() => VIDEOS.filter(v => v.src && progress[v.episode]?.completed).length, [progress])
  const availableCount = useMemo(() => VIDEOS.filter(v => v.src).length, [])

  const resumeIdx = useMemo(() => {
    const idx = VIDEOS.findIndex(v => v.src && !progress[v.episode]?.completed)
    return idx >= 0 ? idx : 0
  }, [progress])

  const openPlayer = useCallback((idx) => {
    if (!VIDEOS[idx]?.src) return
    setPlayerIdx(idx)
    markWatched(idx)
  }, [markWatched])

  const playHandlers = useMemo(() => VIDEOS.map((_, i) => () => openPlayer(i)), [openPlayer])

  const arcs = useMemo(() => ['Tous', ...new Set(VIDEOS.map(v => v.arc).filter(Boolean))], [])

  const filteredVideos = useMemo(() =>
    arcFilter === 'Tous' ? VIDEOS : VIDEOS.filter(v => v.arc === arcFilter)
  , [arcFilter])

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position:'fixed',inset:0,zIndex:500,background:'radial-gradient(circle at 18% 12%,rgba(224,82,74,.10),transparent 32rem),radial-gradient(circle at 84% 80%,rgba(180,40,30,.07),transparent 28rem),linear-gradient(135deg,#100604 0%,#0e0a08 55%,#0a0604 100%)',display:'flex',flexDirection:'column' }}>
        <AnimeBackdrop motifs={ANIME_MOTIFS.onepiece} color={COLOR} color2={COLOR2} />
        {/* Navbar */}
        <div className="op-header" style={{ flexShrink:0,height:62,padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(16,6,4,.96)',backdropFilter:'blur(24px)',borderBottom:'1px solid rgba(224,82,74,.10)',zIndex:10,position:'relative' }}>
          <button onClick={playerIdx !== null ? () => setPlayerIdx(null) : onClose}
            style={{ display:'flex',alignItems:'center',gap:7,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.09)',borderRadius:10,color:'rgba(255,255,255,.72)',cursor:'pointer',padding:'8px 16px',fontSize:12.5,fontWeight:800,transition:'background .15s',fontFamily:'var(--body)' }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.11)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.06)'}>
            ← {playerIdx !== null ? 'Épisodes' : 'Retour hub'}
          </button>

          <div className="op-header-title" style={{ position:'absolute',left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:10 }}>
            <span style={{ fontSize:18,animation:'opFloat 6s ease-in-out infinite' }}>🏴‍☠️</span>
            <span style={{ fontFamily:"'Pirata One',cursive",fontSize:18,fontWeight:900,color:'#fff' }}>
              {playerIdx !== null ? (VIDEOS[playerIdx]?.title || `Épisode ${VIDEOS[playerIdx]?.episode}`) : 'One Piece'}
            </span>
          </div>

          <div className="op-header-right" style={{ display:'flex',alignItems:'center',gap:8 }}>
            <div style={{ fontSize:10.5,color:'rgba(255,255,255,.28)',fontWeight:700 }}>{watchedCount}/{availableCount} vus</div>
            <div style={{ width:56,height:5,borderRadius:999,background:'rgba(255,255,255,.07)',overflow:'hidden' }}>
              <div style={{ width:`${availableCount>0?Math.round(watchedCount/availableCount*100):0}%`,height:'100%',background:`linear-gradient(90deg,${COLOR},${COLOR2})`,borderRadius:999,transition:'width .4s' }} />
            </div>
          </div>
        </div>

        {/* Content */}
        {playerIdx !== null ? (
          <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
            <VideoPlayer videos={VIDEOS} startIdx={playerIdx} onClose={() => setPlayerIdx(null)} color={COLOR} storageKey={NS} />
          </div>
        ) : (
          <div ref={scrollRef} className="op-scroll" style={{ flex:1,overflowY:'auto' }}>
            <div className="op-layout">
              <InfoPanel watchedCount={watchedCount} availableCount={availableCount} resumeIdx={resumeIdx} onResume={() => openPlayer(resumeIdx)} />

              <div>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10 }}>
                  <div>
                    <h3 style={{ margin:'0 0 3px',fontSize:18,fontWeight:900,color:'#fff' }}>Épisodes</h3>
                    <div style={{ fontSize:11,color:'rgba(255,255,255,.32)',fontWeight:600 }}>Arc Egghead → Elbaf · {availableCount} dispo · VOSTFR</div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:999,background:'rgba(224,82,74,.08)',border:'1px solid rgba(224,82,74,.18)' }}>
                    <div style={{ width:6,height:6,borderRadius:'50%',background:watchedCount===availableCount?'#34d399':COLOR,animation:watchedCount<availableCount&&watchedCount>0?'opPulse 2s infinite':'none' }} />
                    <span style={{ fontSize:11,fontWeight:800,color:COLOR2 }}>
                      {watchedCount===availableCount?'✓ Terminé':watchedCount===0?'Pas commencé':`${watchedCount}/${availableCount} vus`}
                    </span>
                  </div>
                </div>

                {arcs.length > 2 && (
                  <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:18 }}>
                    {arcs.map(arc=>(
                      <button key={arc} onClick={()=>setArcFilter(arc)} style={{ padding:'4px 12px',borderRadius:999,cursor:'pointer',fontSize:11,fontWeight:700,background:arcFilter===arc?'rgba(224,82,74,.18)':'rgba(255,255,255,.06)',color:arcFilter===arc?COLOR2:'rgba(255,255,255,.4)',border:`1px solid ${arcFilter===arc?'rgba(224,82,74,.35)':'transparent'}`,transition:'all .15s' }}>{arc}</button>
                    ))}
                  </div>
                )}

                <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:12 }}>
                  {filteredVideos.flatMap((v,i)=>{
                    const prev = filteredVideos[i-1]
                    const els = []
                    if (v.arc && v.arc !== prev?.arc) els.push(<SeasonDivider key={`sep-${v.arc}`} label={v.arc} color={COLOR} />)
                    els.push(<EpCard key={v.episode} video={v} index={i} watched={!!progress[v.episode]?.completed} onPlay={playHandlers[VIDEOS.indexOf(v)]} />)
                    return els
                  })}
                </div>

                <div style={{ marginTop:28,padding:'14px 18px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:10 }}>
                  <span style={{ fontSize:16 }}>🌊</span>
                  <span style={{ fontSize:12,color:'rgba(255,255,255,.38)',fontWeight:600,lineHeight:1.5 }}>
                    Épisodes 1086–1155 (Arc Egghead) disponibles en VOSTFR. Arc Elbaf en cours d'ajout.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
