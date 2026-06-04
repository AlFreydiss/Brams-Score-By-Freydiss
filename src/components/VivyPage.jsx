import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import VideoPlayer from './VideoPlayer.jsx'
import { ProgressRing } from './ProgressRing.jsx'
import AnimeBackdrop, { ANIME_MOTIFS } from './AnimeBackdrop.jsx'
import VIDEOS_RAW from '../data/vivy-videos.json'

const VIDEOS = VIDEOS_RAW

const COLOR  = '#00d4ff'
const COLOR2 = '#67e8f9'
const NS     = 'vivy'

const SYNOPSIS = "Dans un futur proche où les IA côtoient les humains, Vivy est une androïde chanteuse dont la mission est de rendre les gens heureux par son chant. Un jour, une IA du futur nommée Matsumoto lui demande de collaborer à une mission de 100 ans pour empêcher une guerre apocalyptique entre humains et machines."

const TAGS = ['Science-fiction', 'Action', 'IA', 'Drame', 'WIT Studio']

const AWARDS = [
  { icon: '🎵', label: 'OST exceptionnelle' },
  { icon: '🤖', label: 'Meilleure IA protagoniste' },
  { icon: '✨', label: 'Anime de l\'année 2021' },
]

const COVER = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/vivy/key-visual.jpg'

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(`${NS}_vp`) || '{}') } catch { return {} }
}
function saveProgress(p) {
  try { localStorage.setItem(`${NS}_vp`, JSON.stringify(p)) } catch {}
}

const CSS = `
  @keyframes vyFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes vyPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes vyFadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

  .vy-ep-card {
    content-visibility: auto;
    contain-intrinsic-size: 0 260px;
    transition: transform .22s ease, box-shadow .22s ease, border-color .18s ease;
    cursor: pointer;
  }
  .vy-ep-card:hover {
    transform: translateY(-5px) scale(1.015) !important;
    box-shadow: 0 18px 48px rgba(0,212,255,.18) !important;
    border-color: rgba(0,212,255,.45) !important;
  }
  .vy-ep-card:focus-visible { outline: 2px solid ${COLOR}; outline-offset: 3px; }

  .vy-play-btn { transition: transform .16s, opacity .16s, background .16s; }
  .vy-ep-card:hover .vy-play-btn { transform: scale(1.15) !important; opacity: 1 !important; }

  .vy-cta { transition: background .18s, transform .14s, box-shadow .18s; }
  .vy-cta:hover {
    background: rgba(0,212,255,.22) !important;
    transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(0,212,255,.25);
  }

  .vy-scroll { scrollbar-width: thin; scrollbar-color: rgba(0,212,255,.2) transparent; }
  .vy-scroll::-webkit-scrollbar { width: 4px; }
  .vy-scroll::-webkit-scrollbar-thumb { background: rgba(0,212,255,.2); border-radius: 4px; }
`

const EpCard = memo(function EpCard({ video, index, watched, onPlay }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <div
      className="vy-ep-card"
      role="button" tabIndex={0}
      onClick={onPlay}
      onKeyDown={e => e.key === 'Enter' && onPlay()}
      style={{
        borderRadius: 14, overflow: 'hidden',
        background: 'rgba(8,14,22,.92)',
        border: `1px solid ${watched ? 'rgba(0,212,255,.28)' : 'rgba(255,255,255,.07)'}`,
        animation: `vyFadeUp .3s ${index * 0.04}s ease-out both`,
        position: 'relative',
      }}
    >
      <div style={{ position: 'relative', paddingTop: '57%', background: '#0a0814', overflow: 'hidden' }}>
        {video.thumbnail && !imgErr
          ? <img
              src={video.thumbnail} alt={video.title} loading="lazy"
              onError={() => setImgErr(true)}
              style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity: watched ? 0.5 : 0.82 }}
            />
          : <div style={{ position:'absolute',inset:0, background:`linear-gradient(135deg,rgba(0,212,255,.12),rgba(0,0,0,.9))`, display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontFamily:"'Pirata One',cursive", fontSize:40, fontWeight:900, color:`rgba(0,212,255,.28)`, lineHeight:1 }}>{video.episode}</span>
            </div>
        }
        <div style={{ position:'absolute',inset:'40% 0 0', background:'linear-gradient(180deg,transparent,rgba(0,0,0,.65))', pointerEvents:'none' }} />
        <div className="vy-play-btn" style={{ position:'absolute',inset:0, display:'flex',alignItems:'center',justifyContent:'center', opacity: watched ? 0.5 : 0.78 }}>
          <div style={{ width:40,height:40,borderRadius:'50%',background:`rgba(0,180,220,.82)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,backdropFilter:'blur(6px)',boxShadow:`0 4px 18px rgba(0,212,255,.45)` }}>▶</div>
        </div>
        {watched && (
          <div style={{ position:'absolute',top:8,right:8, width:22,height:22,borderRadius:'50%',background:'rgba(52,211,153,.18)',border:'1px solid rgba(52,211,153,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#34d399',fontWeight:900 }}>✓</div>
        )}
        <div style={{ position:'absolute',bottom:8,left:8, fontSize:9,fontWeight:800,background:'rgba(0,180,220,.18)',color:COLOR2,border:`1px solid rgba(0,212,255,.28)`,borderRadius:100,padding:'2px 7px' }}>VOSTFR</div>
      </div>
      <div style={{ padding:'10px 13px 13px' }}>
        <div style={{ fontSize:9.5,fontWeight:800,color:COLOR2,letterSpacing:'.1em',marginBottom:4 }}>{video.episodeLabel || `EP ${video.episode}`}</div>
        <div style={{ fontSize:13.5,fontWeight:700,color:'#fff',lineHeight:1.28 }}>{video.title}</div>
      </div>
    </div>
  )
})

function InfoPanel({ watchedCount, total, lastWatchedIdx, onResume }) {
  const pct = total > 0 ? Math.round((watchedCount / total) * 100) : 0
  const nextVideo = VIDEOS[lastWatchedIdx] || VIDEOS[0]

  return (
    <aside style={{
      position: 'sticky', top: 0, alignSelf: 'start',
      display: 'flex', flexDirection: 'column', gap: 0,
      borderRadius: 22, overflow: 'hidden',
      background: 'linear-gradient(180deg,rgba(6,14,26,.96),rgba(4,10,18,.99))',
      border: '1px solid rgba(0,212,255,.18)',
      boxShadow: '0 24px 70px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.04)',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{ position:'relative', height:260, overflow:'hidden', flexShrink:0 }}>
        <img
          src={COVER} alt="Vivy Fluorite Eye's Song"
          style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 15%',opacity:.72,filter:'saturate(1.1) brightness(.88)' }}
        />
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(6,14,26,.98) 100%)' }} />
        <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'0 18px 20px' }}>
          <div style={{ fontSize:9.5,fontWeight:800,letterSpacing:'.18em',color:COLOR2,textTransform:'uppercase',marginBottom:6 }}>
            🎵 IA · CHANTEUSE · 100 ANS
          </div>
          <h2 style={{ margin:0, fontFamily:"'Pirata One',cursive", fontSize:22,fontWeight:900,color:'#fff',lineHeight:1.0,letterSpacing:'-.01em',textShadow:'0 2px 20px rgba(0,0,0,.9)' }}>
            Vivy: Fluorite Eye's Song
          </h2>
          <div style={{ fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,marginTop:3 }}>WIT Studio · 2021</div>
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
              {pct === 100 ? '✓ Série terminée' : pct === 0 ? 'Pas encore commencé' : 'En cours de visionnage'}
            </div>
          </div>
        </div>

        <button
          className="vy-cta"
          onClick={onResume}
          style={{
            width:'100%',padding:'11px 0',borderRadius:12,
            background:`rgba(0,180,220,.14)`,border:`1px solid rgba(0,212,255,.32)`,
            color:'#fff',cursor:'pointer',fontSize:13,fontWeight:800,
            display:'flex',alignItems:'center',justifyContent:'center',gap:8,
            fontFamily:'var(--body)',
          }}
        >
          <span style={{ fontSize:16 }}>▶</span>
          {pct === 0 ? 'Commencer' : pct === 100 ? 'Revoir depuis le début' : `Reprendre — Ép. ${nextVideo?.episode}`}
        </button>

        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          {[
            { label:'Épisodes', value:'13', dot:COLOR2 },
            { label:'Statut', value:'Terminé', dot:'#34d399' },
            { label:'Audio', value:'VOSTFR', dot:'#fbbf24' },
            { label:'Note', value:'★ 8.7', dot:'#f97316' },
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
            <span key={tag} style={{ fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:999,background:'rgba(0,180,220,.08)',border:'1px solid rgba(0,212,255,.2)',color:COLOR2 }}>
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

export default function VivyPage({ onClose }) {
  const [playerIdx,  setPlayerIdx]  = useState(null)
  const [progress,   setProgress]   = useState(loadProgress)
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

  const watchedCount = useMemo(() =>
    VIDEOS.filter(v => progress[v.episode]?.completed).length
  , [progress])

  const resumeIdx = useMemo(() => {
    const firstUnwatched = VIDEOS.findIndex(v => !progress[v.episode]?.completed)
    return firstUnwatched >= 0 ? firstUnwatched : 0
  }, [progress])

  const openPlayer = useCallback((idx) => {
    setPlayerIdx(idx)
    markWatched(idx)
  }, [markWatched])

  const playHandlers = useMemo(() => VIDEOS.map((_, i) => () => openPlayer(i)), [openPlayer])

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        position:'fixed',left:0,right:0,top:76,bottom:0,zIndex:500,
        background:'radial-gradient(circle at 18% 12%,rgba(0,180,220,.10),transparent 32rem),radial-gradient(circle at 84% 80%,rgba(0,120,160,.08),transparent 28rem),linear-gradient(135deg,#060e1a 0%,#0a1118 55%,#060c14 100%)',
        display:'flex',flexDirection:'column',
      }}>
        <AnimeBackdrop motifs={ANIME_MOTIFS.vivy} color={COLOR} color2={COLOR2} />
        {/* Navbar */}
        <div style={{
          flexShrink:0,height:62,padding:'0 24px',
          display:'flex',alignItems:'center',justifyContent:'space-between',
          background:'rgba(6,14,26,.96)',backdropFilter:'blur(24px)',
          borderBottom:'1px solid rgba(0,212,255,.10)',zIndex:10,
          position:'relative',
        }}>
          <button
            onClick={playerIdx !== null ? () => setPlayerIdx(null) : onClose}
            style={{ display:'flex',alignItems:'center',gap:7,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.09)',borderRadius:10,color:'rgba(255,255,255,.72)',cursor:'pointer',padding:'8px 16px',fontSize:12.5,fontWeight:800,transition:'background .15s',fontFamily:'var(--body)' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.11)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,.06)'}
          >
            ← {playerIdx !== null ? 'Épisodes' : 'Retour'}
          </button>

          <div style={{ position:'absolute',left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:10 }}>
            <span style={{ fontSize:17,animation:'vyFloat 6s ease-in-out infinite' }}>🎵</span>
            <span style={{ fontFamily:"'Pirata One',cursive",fontSize:17,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>
              {playerIdx !== null ? (VIDEOS[playerIdx]?.title || `Épisode ${VIDEOS[playerIdx]?.episode}`) : "Vivy: Fluorite Eye's Song"}
            </span>
          </div>

          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <div style={{ fontSize:10.5,color:'rgba(255,255,255,.28)',fontWeight:700 }}>
              {watchedCount}/{VIDEOS.length} vus
            </div>
            <div style={{ width:56,height:5,borderRadius:999,background:'rgba(255,255,255,.07)',overflow:'hidden' }}>
              <div style={{ width:`${Math.round(watchedCount/VIDEOS.length*100)}%`,height:'100%',background:`linear-gradient(90deg,${COLOR},${COLOR2})`,borderRadius:999,transition:'width .4s' }} />
            </div>
          </div>
        </div>

        {/* Content */}
        {playerIdx !== null ? (
          <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
            <VideoPlayer
              videos={VIDEOS}
              startIdx={playerIdx}
              onClose={() => setPlayerIdx(null)}
              color={COLOR}
              storageKey={NS}
            />
          </div>
        ) : (
          <div ref={scrollRef} className="vy-scroll" style={{ flex:1,overflowY:'auto',padding:'24px 28px 48px' }}>
            <style>{`
              .vy-layout {
                display: grid;
                grid-template-columns: 310px minmax(0,1fr);
                gap: 28px;
                max-width: 1480px;
                margin: 0 auto;
                align-items: start;
              }
              @media (max-width: 900px) {
                .vy-layout { grid-template-columns: 1fr; }
              }
            `}</style>

            <div className="vy-layout">
              <InfoPanel
                watchedCount={watchedCount}
                total={VIDEOS.length}
                lastWatchedIdx={resumeIdx}
                onResume={() => openPlayer(resumeIdx)}
              />

              <div>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
                  <div>
                    <h3 style={{ margin:'0 0 3px',fontSize:18,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>
                      Épisodes
                    </h3>
                    <div style={{ fontSize:11,color:'rgba(255,255,255,.32)',fontWeight:600 }}>
                      Saison 1 · 13 épisodes · VOSTFR
                    </div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:999,background:'rgba(0,180,220,.08)',border:'1px solid rgba(0,212,255,.18)' }}>
                    <div style={{ width:6,height:6,borderRadius:'50%',background:watchedCount===VIDEOS.length?'#34d399':COLOR,animation:watchedCount<VIDEOS.length&&watchedCount>0?'vyPulse 2s infinite':'none' }} />
                    <span style={{ fontSize:11,fontWeight:800,color:COLOR2 }}>
                      {watchedCount === VIDEOS.length ? '✓ Terminé' : watchedCount === 0 ? 'Pas commencé' : `${watchedCount}/${VIDEOS.length} vus`}
                    </span>
                  </div>
                </div>

                <div style={{
                  display:'grid',
                  gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',
                  gap:14,
                }}>
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

                <div style={{ marginTop:28,padding:'14px 18px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:10 }}>
                  <span style={{ fontSize:16 }}>🤖</span>
                  <span style={{ fontSize:12,color:'rgba(255,255,255,.38)',fontWeight:600,lineHeight:1.5 }}>
                    Vivy est une œuvre originale de WIT Studio scénarisée par Eiji Umehara et Tappei Nagatsuki (auteur de Re:Zero). Une exploration poétique de l'âme des IA.
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
