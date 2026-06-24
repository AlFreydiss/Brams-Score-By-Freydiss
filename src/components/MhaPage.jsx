import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import VideoPlayer from './VideoPlayer.jsx'
import EpisodeDetailInline from './EpisodeDetailInline.jsx'
import EpisodeWatch from './EpisodeWatch.jsx'
import { ProgressRing } from './ProgressRing.jsx'
import AnimeBackdrop, { ANIME_MOTIFS } from './AnimeBackdrop.jsx'
import VIDEOS_RAW from '../data/mha-videos.json'

const VIDEOS = VIDEOS_RAW

const COLOR  = '#1e88e5'
const COLOR2 = '#64b5f6'
const NS     = 'mha'

const SEASONS = [
  { key: 'S01', label: 'S1', title: 'Entrée à U.A.',           eps: 13 },
  { key: 'S02', label: 'S2', title: 'Festival Sportif',         eps: 25 },
  { key: 'S03', label: 'S3', title: 'Licence Hero',             eps: 25 },
  { key: 'S04', label: 'S4', title: 'Overhaul',                 eps: 25 },
  { key: 'S05', label: 'S5', title: 'Libération Paranormale',   eps: 25 },
  { key: 'S06', label: 'S6', title: 'War Arc',                  eps: 25 },
]

const SYNOPSIS = "Dans un monde où 80% de la population possède un Super Pouvoir (Alter), Izuku Midoriya naît sans capacité. Pourtant, son idole All Might lui transmet son Alter légendaire. Izuku intègre U.A., la meilleure école de héros, et commence son chemin vers le titre de Plus Grand Héros."

const TAGS = ['Action', 'Super-héros', 'Shōnen', 'Bones Inc.', 'Fantaisie']

const AWARDS = [
  { icon: '💪', label: 'Plus Ultra !' },
  { icon: '🏆', label: 'Anime de l\'année 2017–2019' },
  { icon: '⚡', label: '138 épisodes · 6 saisons' },
]

const COVER = 'https://static.wikia.nocookie.net/bokunoheroacademia/images/a/a5/My_Hero_Academia_Movie_Poster_3.png/revision/latest?cb=20210808041156'

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(`${NS}_vp`) || '{}') } catch { return {} }
}
function saveProgress(p) {
  try { localStorage.setItem(`${NS}_vp`, JSON.stringify(p)) } catch {}
}

const CSS = `
  @keyframes mhFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes mhPulse  { 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes mhFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }

  .mh-ep-card {
    content-visibility: auto;
    contain-intrinsic-size: 0 260px;
    transition: transform .22s ease, box-shadow .22s ease, border-color .18s ease;
    cursor: pointer;
  }
  .mh-ep-card:hover {
    transform: translateY(-5px) scale(1.015) !important;
    box-shadow: 0 18px 48px rgba(30,136,229,.20) !important;
    border-color: rgba(30,136,229,.48) !important;
  }
  .mh-ep-card:focus-visible { outline: 2px solid ${COLOR}; outline-offset: 3px; }

  .mh-play-btn { transition: transform .16s, opacity .16s; }
  .mh-ep-card:hover .mh-play-btn { transform: scale(1.15) !important; opacity: 1 !important; }

  .mh-cta { transition: background .18s, transform .14s, box-shadow .18s; }
  .mh-cta:hover {
    background: rgba(30,136,229,.24) !important;
    transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(30,136,229,.28);
  }

  .mh-season-tab { transition: background .16s, border-color .16s, color .16s; }
  .mh-season-tab:hover { border-color: rgba(30,136,229,.4) !important; color: #fff !important; }

  .mh-scroll { scrollbar-width: thin; scrollbar-color: rgba(30,136,229,.2) transparent; }
  .mh-scroll::-webkit-scrollbar { width: 4px; }
  .mh-scroll::-webkit-scrollbar-thumb { background: rgba(30,136,229,.2); border-radius: 4px; }
`



const EpCard = memo(function EpCard({ video, index, watched, onPlay }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <div
      className="mh-ep-card"
      role="button" tabIndex={0}
      onClick={onPlay}
      onKeyDown={e => e.key === 'Enter' && onPlay()}
      style={{
        borderRadius: 14, overflow: 'hidden',
        background: 'rgba(6,10,18,.92)',
        border: `1px solid ${watched ? 'rgba(30,136,229,.30)' : 'rgba(255,255,255,.07)'}`,
        animation: `mhFadeUp .3s ${index * 0.03}s ease-out both`,
        position: 'relative',
      }}
    >
      <div style={{ position: 'relative', paddingTop: '57%', background: '#050810', overflow: 'hidden' }}>
        {video.thumbnail && !imgErr
          ? <img
              src={video.thumbnail} alt={video.title} loading="lazy" decoding="async"
              onError={() => setImgErr(true)}
              style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity: watched ? 0.5 : 0.85 }}
            />
          : <div style={{ position:'absolute',inset:0, background:`linear-gradient(135deg,rgba(20,80,180,.16),rgba(0,0,0,.92))`, display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontSize:32, fontWeight:900, color:`rgba(30,136,229,.28)`, lineHeight:1, fontFamily:"'Pirata One',cursive" }}>{video.episode}</span>
            </div>
        }
        <div style={{ position:'absolute',inset:'40% 0 0', background:'linear-gradient(180deg,transparent,rgba(0,0,0,.70))', pointerEvents:'none' }} />
        <div className="mh-play-btn" style={{
          position:'absolute',inset:0, display:'flex',alignItems:'center',justifyContent:'center',
          opacity: watched ? 0.5 : 0.78,
        }}>
          <div style={{ width:40,height:40,borderRadius:'50%',background:`rgba(20,120,210,.88)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,backdropFilter:'blur(6px)',boxShadow:`0 4px 18px rgba(30,136,229,.50)` }}>▶</div>
        </div>
        {watched && (
          <div style={{ position:'absolute',top:8,right:8,width:22,height:22,borderRadius:'50%',background:'rgba(52,211,153,.18)',border:'1px solid rgba(52,211,153,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#34d399',fontWeight:900 }}>✓</div>
        )}
        <div style={{ position:'absolute',bottom:8,left:8,display:'flex',gap:4 }}>
          <span style={{ fontSize:9,fontWeight:800,background:'rgba(20,120,210,.22)',color:COLOR2,border:`1px solid rgba(30,136,229,.28)`,borderRadius:100,padding:'2px 7px' }}>VF</span>
          <span style={{ fontSize:9,fontWeight:800,background:'rgba(0,0,0,.35)',color:'rgba(255,255,255,.55)',border:'1px solid rgba(255,255,255,.12)',borderRadius:100,padding:'2px 7px' }}>VO</span>
        </div>
      </div>
      <div style={{ padding:'10px 13px 13px' }}>
        <div style={{ fontSize:9.5,fontWeight:800,color:COLOR2,letterSpacing:'.1em',marginBottom:4 }}>{video.episodeLabel || `EP ${video.episode}`}</div>
        <div style={{ fontSize:13,fontWeight:700,color:'#fff',lineHeight:1.28 }}>{video.title}</div>
      </div>
    </div>
  )
})

function InfoPanel({ watchedCount, total, seasonKey, onResume, resumeEp }) {
  const pct = total > 0 ? Math.round((watchedCount / total) * 100) : 0

  return (
    <aside className="anime-infopanel" style={{
      position: 'sticky', top: 0, alignSelf: 'start',
      display: 'flex', flexDirection: 'column', gap: 0,
      borderRadius: 22, overflow: 'hidden',
      background: 'linear-gradient(180deg,rgba(6,10,20,.96),rgba(3,6,14,.99))',
      border: '1px solid rgba(30,136,229,.18)',
      boxShadow: '0 24px 70px rgba(0,0,0,.44),inset 0 1px 0 rgba(255,255,255,.04)',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{ position:'relative', height:260, overflow:'hidden', flexShrink:0 }}>
        <img loading="lazy" decoding="async"
          src={COVER} alt="My Hero Academia"
          style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top',opacity:.7,filter:'saturate(1.2) brightness(.82)' }}
        />
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,.08) 0%,rgba(6,10,20,.98) 100%)' }} />
        <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'0 18px 20px' }}>
          <div style={{ fontSize:9.5,fontWeight:800,letterSpacing:'.18em',color:COLOR2,textTransform:'uppercase',marginBottom:6 }}>
            💪 PLUS ULTRA !
          </div>
          <h2 style={{ margin:0, fontFamily:"'Pirata One',cursive", fontSize:22,fontWeight:900,color:'#fff',lineHeight:1.0,textShadow:'0 2px 20px rgba(0,0,0,.9)' }}>
            My Hero Academia
          </h2>
          <div style={{ fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,marginTop:3 }}>Bones Inc. · 2016–2023</div>
        </div>
      </div>

      <div style={{ padding:'18px 18px 22px', display:'flex', flexDirection:'column', gap:18 }}>

        <div style={{ display:'flex',alignItems:'center',gap:14 }}>
          <ProgressRing pct={pct} posterSrc={COVER} color={COLOR} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12,fontWeight:800,color:'rgba(255,255,255,.65)',marginBottom:4 }}>
              {watchedCount} / {total} épisodes
            </div>
            <div style={{ height:5,borderRadius:999,background:'rgba(255,255,255,.07)',overflow:'hidden' }}>
              <div style={{ width:`${pct}%`,height:'100%',borderRadius:999,background:`linear-gradient(90deg,${COLOR},${COLOR2})`,boxShadow:`0 0 12px ${COLOR}55`,transition:'width .5s ease' }} />
            </div>
            <div style={{ fontSize:10,color:'rgba(255,255,255,.28)',fontWeight:600,marginTop:4 }}>
              {pct === 100 ? '✓ Saison terminée' : pct === 0 ? 'Pas encore commencé' : 'En cours de visionnage'}
            </div>
          </div>
        </div>

        <button
          className="mh-cta"
          onClick={onResume}
          style={{
            width:'100%',padding:'11px 0',borderRadius:12,
            background:`rgba(20,120,210,.14)`,border:`1px solid rgba(30,136,229,.32)`,
            color:'#fff',cursor:'pointer',fontSize:13,fontWeight:800,
            display:'flex',alignItems:'center',justifyContent:'center',gap:8,
            fontFamily:'var(--body)',
          }}
        >
          <span style={{ fontSize:16 }}>▶</span>
          {pct === 0 ? 'Commencer' : pct === 100 ? 'Revoir depuis le début' : `Reprendre — Ép. ${resumeEp}`}
        </button>

        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          {[
            { label:'Total éps', value:'138', dot:COLOR2 },
            { label:'Saisons', value:'6', dot:'#34d399' },
            { label:'Audio', value:'VF + VO', dot:'#fbbf24' },
            { label:'Note', value:'★ 8.0', dot:'#f97316' },
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
          <p style={{ margin:0,fontSize:12.5,color:'rgba(255,255,255,.54)',lineHeight:1.72,fontStyle:'italic' }}>
            {SYNOPSIS}
          </p>
        </div>

        <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
          {TAGS.map(tag => (
            <span key={tag} style={{ fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:999,background:'rgba(20,100,200,.08)',border:'1px solid rgba(30,136,229,.20)',color:COLOR2 }}>
              {tag}
            </span>
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

export default function MhaPage({ onClose }) {
  const [playerIdx,  setPlayerIdx]  = useState(null)
  const [detailIdx, setDetailIdx] = useState(null)
  const [progress,   setProgress]   = useState(loadProgress)
  const [activeSeason, setActiveSeason] = useState('S01')
  const scrollRef = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape' && detailIdx === null) onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [detailIdx, onClose])

  const markWatched = useCallback((idx) => {
    setProgress(prev => {
      const ep = VIDEOS[idx]?.episode
      if (!ep) return prev
      const next = { ...prev, [ep]: { completed: true } }
      saveProgress(next)
      return next
    })
  }, [])

  // Episodes for selected season
  const seasonVideos = useMemo(() =>
    VIDEOS.filter(v => v.season === activeSeason)
  , [activeSeason])

  // Global indexes in VIDEOS array
  const seasonIndexes = useMemo(() =>
    seasonVideos.map(v => VIDEOS.indexOf(v))
  , [seasonVideos])

  const watchedCount = useMemo(() =>
    seasonVideos.filter(v => progress[v.episode]?.completed).length
  , [seasonVideos, progress])

  const totalWatched = useMemo(() =>
    VIDEOS.filter(v => progress[v.episode]?.completed).length
  , [progress])

  const resumeIdx = useMemo(() => {
    const firstUnwatched = seasonIndexes.find(i => !progress[VIDEOS[i]?.episode]?.completed)
    return firstUnwatched ?? seasonIndexes[0] ?? 0
  }, [seasonIndexes, progress])

  const openPlayer = useCallback((globalIdx) => {
    setPlayerIdx(globalIdx)
    markWatched(globalIdx)
  }, [markWatched])

  const openDetail = useCallback((idx) => {
    setDetailIdx(idx)
    markWatched(idx)
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }))
  }, [markWatched])
  const playHandlers = useMemo(() => VIDEOS.map((_, i) => () => openDetail(i)), [openDetail])

  const seasonInfo = SEASONS.find(s => s.key === activeSeason)

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        position:'fixed',left:0,right:0,top:76,bottom:0,zIndex:500,
        background:'radial-gradient(circle at 16% 12%,rgba(20,80,180,.10),transparent 30rem),radial-gradient(circle at 84% 82%,rgba(10,50,140,.08),transparent 26rem),linear-gradient(135deg,#06080e 0%,#080b12 55%,#040610 100%)',
        display:'flex',flexDirection:'column',
      }}>
        <AnimeBackdrop motifs={ANIME_MOTIFS.mha} color={COLOR} color2={COLOR2} />
        {/* Navbar */}
        <div style={{
          flexShrink:0,height:62,padding:'0 24px',
          display:'flex',alignItems:'center',justifyContent:'space-between',
          background:'rgba(6,8,16,.96)',backdropFilter:'blur(24px)',
          borderBottom:'1px solid rgba(30,136,229,.10)',zIndex:10,
          position:'relative',
        }}>
          <button
            onClick={detailIdx !== null ? () => setDetailIdx(null) : onClose}
            style={{ display:'flex',alignItems:'center',gap:7,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.09)',borderRadius:10,color:'rgba(255,255,255,.72)',cursor:'pointer',padding:'8px 16px',fontSize:12.5,fontWeight:800,transition:'background .15s',fontFamily:'var(--body)' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.11)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,.06)'}
          >
            ← {detailIdx !== null ? 'Épisodes' : 'Retour'}
          </button>

          <div style={{ position:'absolute',left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:10 }}>
            <span style={{ fontSize:17,animation:'mhFloat 6s ease-in-out infinite' }}>💪</span>
            <span style={{ fontFamily:"'Pirata One',cursive",fontSize:17,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>
              {detailIdx !== null ? (VIDEOS[detailIdx]?.title || `Épisode ${VIDEOS[detailIdx]?.episode}`) : 'My Hero Academia'}
            </span>
          </div>

          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <div style={{ fontSize:10.5,color:'rgba(255,255,255,.28)',fontWeight:700 }}>
              {totalWatched}/{VIDEOS.length} vus
            </div>
            <div style={{ width:56,height:5,borderRadius:999,background:'rgba(255,255,255,.07)',overflow:'hidden' }}>
              <div style={{ width:`${Math.round(totalWatched/VIDEOS.length*100)}%`,height:'100%',background:`linear-gradient(90deg,${COLOR},${COLOR2})`,borderRadius:999,transition:'width .4s' }} />
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
          <div ref={scrollRef} className="mh-scroll" style={{ flex:1,overflowY:'auto',padding:'24px 28px 48px' }}>
            <style>{`
              .mh-layout {
                display: grid;
                grid-template-columns: 310px minmax(0,1fr);
                gap: 28px;
                max-width: 1480px;
                margin: 0 auto;
                align-items: start;
              }
              @media (max-width: 900px) { .mh-layout { grid-template-columns: 1fr; } }
              @media (max-width: 900px) { .anime-infopanel { position: static !important; } }
            `}</style>

            <div className="mh-layout">
              <InfoPanel
                watchedCount={watchedCount}
                total={seasonVideos.length}
                seasonKey={activeSeason}
                onResume={() => openDetail(resumeIdx)}
                resumeEp={VIDEOS[resumeIdx]?.episode}
              />

              <div>
                {/* Season tabs */}
                <div style={{ display:'flex',gap:8,marginBottom:20,flexWrap:'wrap' }}>
                  {SEASONS.map(s => {
                    const active = s.key === activeSeason
                    const sWatched = VIDEOS.filter(v => v.season === s.key && progress[v.episode]?.completed).length
                    const sDone = sWatched === s.eps
                    return (
                      <button
                        key={s.key}
                        className="mh-season-tab"
                        onClick={() => { setActiveSeason(s.key); scrollRef.current?.scrollTo({top:0}) }}
                        style={{
                          padding:'8px 16px',borderRadius:12,border:`1px solid ${active ? COLOR : 'rgba(255,255,255,.10)'}`,
                          background: active ? `rgba(20,120,210,.20)` : 'rgba(255,255,255,.04)',
                          color: active ? '#fff' : 'rgba(255,255,255,.45)',
                          cursor:'pointer',fontSize:12.5,fontWeight:800,
                          fontFamily:'var(--body)',display:'flex',alignItems:'center',gap:7,
                          boxShadow: active ? `0 0 18px rgba(30,136,229,.18)` : 'none',
                        }}
                      >
                        <span>{s.label}</span>
                        {sDone && <span style={{ fontSize:10,color:'#34d399' }}>✓</span>}
                        {!sDone && sWatched > 0 && (
                          <span style={{ fontSize:9,color:COLOR2,background:'rgba(30,136,229,.15)',borderRadius:100,padding:'1px 6px' }}>{sWatched}/{s.eps}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
                {/* Season header */}
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
                  <div>
                    <h3 style={{ margin:'0 0 3px',fontSize:18,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>
                      Saison {activeSeason.slice(1)} — {seasonInfo?.title}
                    </h3>
                    <div style={{ fontSize:11,color:'rgba(255,255,255,.32)',fontWeight:600 }}>
                      {seasonVideos.length} épisodes · VF + VO
                    </div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:999,background:'rgba(20,100,200,.08)',border:'1px solid rgba(30,136,229,.18)' }}>
                    <div style={{ width:6,height:6,borderRadius:'50%',background:watchedCount===seasonVideos.length?'#34d399':COLOR,animation:watchedCount<seasonVideos.length&&watchedCount>0?'mhPulse 2s infinite':'none' }} />
                    <span style={{ fontSize:11,fontWeight:800,color:COLOR2 }}>
                      {watchedCount === seasonVideos.length ? '✓ Terminé' : watchedCount === 0 ? 'Pas commencé' : `${watchedCount}/${seasonVideos.length} vus`}
                    </span>
                  </div>
                </div>

                {/* Grid */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
                  {seasonVideos.map((v, i) => (
                    <EpCard
                      key={v.episode}
                      video={v}
                      index={i}
                      watched={!!progress[v.episode]?.completed}
                      onPlay={playHandlers[VIDEOS.indexOf(v)]}
                    />
                  ))}
                </div>

                <div style={{ marginTop:28,padding:'14px 18px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:10 }}>
                  <span style={{ fontSize:16 }}>💪</span>
                  <span style={{ fontSize:12,color:'rgba(255,255,255,.38)',fontWeight:600,lineHeight:1.5 }}>
                    My Hero Academia est une œuvre de Kōhei Horikoshi adaptée par Bones Inc. La série compte 138 épisodes répartis sur 6 saisons, de 2016 à 2023.
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
