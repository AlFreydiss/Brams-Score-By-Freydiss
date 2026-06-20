import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import VideoPlayer from './VideoPlayer.jsx'
import EpisodeDetailInline from './EpisodeDetailInline.jsx'
import EpisodeWatch from './EpisodeWatch.jsx'
import { ProgressRing } from './ProgressRing.jsx'
import AnimeBackdrop, { ANIME_MOTIFS } from './AnimeBackdrop.jsx'
import VIDEOS_RAW from '../data/kaiju-videos.json'

const VIDEOS = VIDEOS_RAW

const COLOR  = '#00bcd4'
const COLOR2 = '#4dd0e1'
// NS aligné sur l'id de carte AnimeHub ('kaiju-no-8') pour que le ring de
// progression du hub lise les mêmes clés localStorage que la page.
const NS     = 'kaiju-no-8'

const SYNOPSIS = "Dans un monde ravagé par des créatures géantes appelées Kaiju, Kafka Hibino travaille dans le nettoyage post-combat tout en rêvant d'intégrer les Forces de Défense pour protéger Mina Ashiro. Un jour, il avale accidentellement un petit Kaiju et se transforme en monstre de classe dix — le redoutable Kaiju n°8."

const TAGS = ['Action', 'Monstres', 'Shōnen', 'WIT Studio', 'Fantasy']

const AWARDS = [
  { icon: '👾', label: 'Anime de l\'année 2024' },
  { icon: '💥', label: 'Meilleure animation de combat' },
  { icon: '🏆', label: 'Manga en pleine explosion' },
]

const COVER = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/kaiju/cover.jpg'

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(`${NS}_vp`) || '{}') } catch { return {} }
}
function saveProgress(p) {
  try { localStorage.setItem(`${NS}_vp`, JSON.stringify(p)) } catch {}
}

const CSS = `
  @keyframes k8Float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes k8Pulse  { 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes k8FadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

  .k8-ep-card {
    content-visibility: auto;
    contain-intrinsic-size: 0 260px;
    transition: transform .22s ease, box-shadow .22s ease, border-color .18s ease;
    cursor: pointer;
  }
  .k8-ep-card:hover {
    transform: translateY(-5px) scale(1.015) !important;
    box-shadow: 0 18px 48px rgba(0,188,212,.20) !important;
    border-color: rgba(0,188,212,.48) !important;
  }
  .k8-ep-card:focus-visible { outline: 2px solid ${COLOR}; outline-offset: 3px; }

  .k8-play-btn { transition: transform .16s, opacity .16s; }
  .k8-ep-card:hover .k8-play-btn { transform: scale(1.15) !important; opacity: 1 !important; }

  .k8-cta { transition: background .18s, transform .14s, box-shadow .18s; }
  .k8-cta:hover {
    background: rgba(0,188,212,.24) !important;
    transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(0,188,212,.28);
  }

  .k8-scroll { scrollbar-width: thin; scrollbar-color: rgba(0,188,212,.2) transparent; }
  .k8-scroll::-webkit-scrollbar { width: 4px; }
  .k8-scroll::-webkit-scrollbar-thumb { background: rgba(0,188,212,.2); border-radius: 4px; }
`

const EpCard = memo(function EpCard({ video, index, watched, onPlay }) {
  const [imgErr, setImgErr] = useState(false)
  const hasVF = video.audio?.some(a => a.label === 'VF' && !a.src === false || a.label === 'VF')
  return (
    <div
      className="k8-ep-card"
      role="button" tabIndex={0}
      onClick={onPlay}
      onKeyDown={e => e.key === 'Enter' && onPlay()}
      style={{
        borderRadius: 14, overflow: 'hidden',
        background: 'rgba(5,12,18,.92)',
        border: `1px solid ${watched ? 'rgba(0,188,212,.30)' : 'rgba(255,255,255,.07)'}`,
        animation: `k8FadeUp .3s ${index * 0.04}s ease-out both`,
        position: 'relative',
      }}
    >
      <div style={{ position: 'relative', paddingTop: '57%', background: '#0a0814', overflow: 'hidden' }}>
        {video.thumbnail && !imgErr
          ? <img
              src={video.thumbnail} alt={video.title} loading="lazy" decoding="async"
              onError={() => setImgErr(true)}
              style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity: watched ? 0.5 : 0.82 }}
            />
          : <div style={{ position:'absolute',inset:0, background:`linear-gradient(135deg,rgba(0,188,212,.12),rgba(0,0,0,.9))`, display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontSize:38, fontWeight:900, color:`rgba(0,188,212,.28)`, lineHeight:1 }}>{'#' + video.episode}</span>
            </div>
        }
        <div style={{ position:'absolute',inset:'40% 0 0', background:'linear-gradient(180deg,transparent,rgba(0,0,0,.68))', pointerEvents:'none' }} />
        <div className="k8-play-btn" style={{
          position:'absolute',inset:0, display:'flex',alignItems:'center',justifyContent:'center',
          opacity: watched ? 0.5 : 0.78,
        }}>
          <div style={{ width:40,height:40,borderRadius:'50%',background:`rgba(0,160,190,.85)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,backdropFilter:'blur(6px)',boxShadow:`0 4px 18px rgba(0,188,212,.50)` }}>▶</div>
        </div>
        {watched && (
          <div style={{ position:'absolute',top:8,right:8,width:22,height:22,borderRadius:'50%',background:'rgba(52,211,153,.18)',border:'1px solid rgba(52,211,153,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#34d399',fontWeight:900 }}>✓</div>
        )}
        <div style={{ position:'absolute',bottom:8,left:8,display:'flex',gap:4 }}>
          <span style={{ fontSize:9,fontWeight:800,background:'rgba(0,160,190,.20)',color:COLOR2,border:`1px solid rgba(0,188,212,.28)`,borderRadius:100,padding:'2px 7px' }}>VF</span>
          <span style={{ fontSize:9,fontWeight:800,background:'rgba(0,0,0,.35)',color:'rgba(255,255,255,.55)',border:'1px solid rgba(255,255,255,.12)',borderRadius:100,padding:'2px 7px' }}>VOSTFR</span>
        </div>
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
      background: 'linear-gradient(180deg,rgba(5,14,20,.96),rgba(3,9,14,.99))',
      border: '1px solid rgba(0,188,212,.18)',
      boxShadow: '0 24px 70px rgba(0,0,0,.44),inset 0 1px 0 rgba(255,255,255,.04)',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{ position:'relative', height:260, overflow:'hidden', flexShrink:0 }}>
        <img loading="lazy" decoding="async"
          src={COVER} alt="Kaiju No. 8"
          style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 15%',opacity:.72,filter:'saturate(1.1) brightness(.88)' }}
        />
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,.08) 0%,rgba(5,14,20,.98) 100%)' }} />
        <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'0 18px 20px' }}>
          <div style={{ fontSize:9.5,fontWeight:800,letterSpacing:'.18em',color:COLOR2,textTransform:'uppercase',marginBottom:6 }}>
            👾 FORCES DE DÉFENSE · CLASSE 10
          </div>
          <h2 style={{ margin:0, fontFamily:"'Pirata One',cursive", fontSize:26,fontWeight:900,color:'#fff',lineHeight:1.0,textShadow:'0 2px 20px rgba(0,0,0,.9)' }}>
            Kaiju No. 8
          </h2>
          <div style={{ fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,marginTop:3 }}>WIT Studio · 2024</div>
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
          className="k8-cta"
          onClick={onResume}
          style={{
            width:'100%',padding:'11px 0',borderRadius:12,
            background:`rgba(0,160,190,.14)`,border:`1px solid rgba(0,188,212,.32)`,
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
            { label:'Épisodes', value:'12', dot:COLOR2 },
            { label:'Statut', value:'Saison 1', dot:'#34d399' },
            { label:'Audio', value:'VF + VO', dot:'#fbbf24' },
            { label:'Note', value:'★ 7.8', dot:'#f97316' },
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
            <span key={tag} style={{ fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:999,background:'rgba(0,160,190,.08)',border:'1px solid rgba(0,188,212,.20)',color:COLOR2 }}>
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

export default function KaijuNo8Page({ onClose }) {
  const [playerIdx,  setPlayerIdx]  = useState(null)
  const [detailIdx, setDetailIdx] = useState(null)
  const [progress,   setProgress]   = useState(loadProgress)
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

  const openDetail = useCallback((idx) => {
    setDetailIdx(idx)
    markWatched(idx)
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }))
  }, [markWatched])
  const playHandlers = useMemo(() => VIDEOS.map((_, i) => () => openDetail(i)), [openDetail])

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        position:'fixed',left:0,right:0,top:76,bottom:0,zIndex:500,
        background:'radial-gradient(circle at 15% 10%,rgba(0,150,180,.10),transparent 30rem),radial-gradient(circle at 85% 82%,rgba(0,100,130,.08),transparent 26rem),linear-gradient(135deg,#050e14 0%,#080f14 55%,#040b10 100%)',
        display:'flex',flexDirection:'column',
      }}>
        <AnimeBackdrop motifs={ANIME_MOTIFS.kaiju} color={COLOR} color2={COLOR2} />
        {/* Navbar */}
        <div style={{
          flexShrink:0,height:62,padding:'0 24px',
          display:'flex',alignItems:'center',justifyContent:'space-between',
          background:'rgba(5,14,20,.96)',backdropFilter:'blur(24px)',
          borderBottom:'1px solid rgba(0,188,212,.10)',zIndex:10,
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
            <span style={{ fontSize:17,animation:'k8Float 6s ease-in-out infinite' }}>👾</span>
            <span style={{ fontFamily:"'Pirata One',cursive",fontSize:17,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>
              {detailIdx !== null ? (VIDEOS[detailIdx]?.title || `Épisode ${VIDEOS[detailIdx]?.episode}`) : 'Kaiju No. 8'}
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
        {detailIdx !== null ? (
          <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'24px 28px 48px' }}>
            <div style={{ maxWidth: 1760, margin: '0 auto' }}>
              <EpisodeWatch videos={VIDEOS} startIdx={detailIdx} ns={NS} storageKey={NS} color={COLOR} color2={COLOR2} onSelect={openDetail} onClose={() => setDetailIdx(null)} />
            </div>
          </div>
        ) : (
          <div ref={scrollRef} className="k8-scroll" style={{ flex:1,overflowY:'auto',padding:'24px 28px 48px' }}>
            <style>{`
              .k8-layout {
                display: grid;
                grid-template-columns: 310px minmax(0,1fr);
                gap: 28px;
                max-width: 1480px;
                margin: 0 auto;
                align-items: start;
              }
              @media (max-width: 900px) {
                .k8-layout { grid-template-columns: 1fr; }
              }
            `}</style>

            <div className="k8-layout">
              <InfoPanel
                watchedCount={watchedCount}
                total={VIDEOS.length}
                lastWatchedIdx={resumeIdx}
                onResume={() => openDetail(resumeIdx)}
              />

              <div>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
                  <div>
                    <h3 style={{ margin:'0 0 3px',fontSize:18,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>
                      Épisodes
                    </h3>
                    <div style={{ fontSize:11,color:'rgba(255,255,255,.32)',fontWeight:600 }}>
                      Saison 1 · 12 épisodes · VF + VOSTFR
                    </div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:999,background:'rgba(0,160,190,.08)',border:'1px solid rgba(0,188,212,.18)' }}>
                    <div style={{ width:6,height:6,borderRadius:'50%',background:watchedCount===VIDEOS.length?'#34d399':COLOR,animation:watchedCount<VIDEOS.length&&watchedCount>0?'k8Pulse 2s infinite':'none' }} />
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
                  <span style={{ fontSize:16 }}>⚡</span>
                  <span style={{ fontSize:12,color:'rgba(255,255,255,.38)',fontWeight:600,lineHeight:1.5 }}>
                    Kaiju No. 8 est un manga de Naoya Matsumoto. La saison 1 couvre les arcs "Recrutement" et "Exercice de déploiement". Une saison 2 est en préparation.
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
