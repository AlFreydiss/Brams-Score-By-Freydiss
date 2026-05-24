import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import VideoPlayer from './VideoPlayer.jsx'
import VIDEOS_RAW from '../data/violet-evergarden-videos.json'

const VIDEOS = VIDEOS_RAW

const COLOR  = '#8b7cff'
const COLOR2 = '#c4b5fd'
const NS     = 'violet-evergarden'

const SYNOPSIS = "Violet, ancienne soldate ayant perdu ses deux bras dans la Grande Guerre, commence une nouvelle vie comme Auto Memory Doll — une écrivaine publique. En parcourant le monde pour transcrire les émotions des gens, elle cherche à comprendre le sens des derniers mots de son commandant : « Je t'aime »."

const TAGS = ['Drame', 'Émotion', 'Josei', 'Slice of Life', 'Kyoto Animation']

const AWARDS = [
  { icon: '🏆', label: 'KyoAni Masterpiece' },
  { icon: '✨', label: 'Animation d\'exception' },
  { icon: '💜', label: 'Chef-d\'œuvre émotionnel' },
]

const COVER = 'https://www.manga-news.com/public/images/dvd/violet-evergarden-anime-key.webp'

// ─── localStorage helpers
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(`${NS}_vp`) || '{}') } catch { return {} }
}
function saveProgress(p) {
  try { localStorage.setItem(`${NS}_vp`, JSON.stringify(p)) } catch {}
}

// ─── CSS
const CSS = `
  @keyframes veFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes vePulse { 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes veFadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
  @keyframes veSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

  .ve-ep-card {
    transition: transform .22s ease, box-shadow .22s ease, border-color .18s ease;
    cursor: pointer;
  }
  .ve-ep-card:hover {
    transform: translateY(-5px) scale(1.015) !important;
    box-shadow: 0 18px 48px rgba(139,124,255,.22) !important;
    border-color: rgba(139,124,255,.5) !important;
  }
  .ve-ep-card:focus-visible { outline: 2px solid ${COLOR}; outline-offset: 3px; }

  .ve-play-btn {
    transition: transform .16s, opacity .16s, background .16s;
  }
  .ve-ep-card:hover .ve-play-btn {
    transform: scale(1.15) !important;
    opacity: 1 !important;
  }

  .ve-cta {
    transition: background .18s, transform .14s, box-shadow .18s;
  }
  .ve-cta:hover {
    background: rgba(139,124,255,.28) !important;
    transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(139,124,255,.30);
  }

  .ve-scroll { scrollbar-width: thin; scrollbar-color: rgba(139,124,255,.25) transparent; }
  .ve-scroll::-webkit-scrollbar { width: 4px; }
  .ve-scroll::-webkit-scrollbar-thumb { background: rgba(139,124,255,.25); border-radius: 4px; }
`

// ─── Progress ring SVG
function ProgressRing({ pct, size = 72, stroke = 5, color = COLOR }) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset .6s ease' }}
      />
    </svg>
  )
}

// ─── Episode card
function EpCard({ video, index, watched, onPlay }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <div
      className="ve-ep-card"
      role="button" tabIndex={0}
      onClick={onPlay}
      onKeyDown={e => e.key === 'Enter' && onPlay()}
      style={{
        borderRadius: 14, overflow: 'hidden',
        background: 'rgba(14,15,20,.9)',
        border: `1px solid ${watched ? 'rgba(139,124,255,.28)' : 'rgba(255,255,255,.07)'}`,
        animation: `veFadeUp .3s ${index * 0.04}s ease-out both`,
        position: 'relative',
      }}
    >
      {/* thumbnail */}
      <div style={{ position: 'relative', paddingTop: '57%', background: '#0a0b0e', overflow: 'hidden' }}>
        {video.thumbnail && !imgErr
          ? <img
              src={video.thumbnail} alt={video.title} loading="lazy"
              onError={() => setImgErr(true)}
              style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:watched?.0.55:0.8 }}
            />
          : <div style={{ position:'absolute',inset:0, background:`linear-gradient(135deg,rgba(139,124,255,.18),rgba(0,0,0,.9))`, display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontFamily:"'Pirata One',cursive", fontSize:40, fontWeight:900, color:`rgba(139,124,255,.35)`, lineHeight:1 }}>{video.episode}</span>
            </div>
        }
        {/* gradient overlay */}
        <div style={{ position:'absolute',inset:'40% 0 0', background:'linear-gradient(180deg,transparent,rgba(0,0,0,.62))', pointerEvents:'none' }} />
        {/* play button */}
        <div className="ve-play-btn" style={{
          position:'absolute',inset:0, display:'flex',alignItems:'center',justifyContent:'center',
          opacity: watched ? 0.55 : 0.78,
        }}>
          <div style={{ width:40,height:40,borderRadius:'50%',background:`rgba(139,124,255,.82)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,backdropFilter:'blur(6px)',boxShadow:`0 4px 18px rgba(139,124,255,.5)` }}>▶</div>
        </div>
        {/* watched badge */}
        {watched && (
          <div style={{ position:'absolute',top:8,right:8, width:22,height:22,borderRadius:'50%',background:'rgba(52,211,153,.18)',border:'1px solid rgba(52,211,153,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#34d399',fontWeight:900 }}>✓</div>
        )}
        {/* VF badge */}
        <div style={{ position:'absolute',bottom:8,left:8, fontSize:9,fontWeight:800,background:'rgba(139,124,255,.22)',color:'#c4b5fd',border:'1px solid rgba(139,124,255,.3)',borderRadius:100,padding:'2px 7px' }}>VF</div>
      </div>
      {/* info */}
      <div style={{ padding:'10px 13px 13px' }}>
        <div style={{ fontSize:9.5,fontWeight:800,color:COLOR2,letterSpacing:'.1em',marginBottom:4 }}>ÉPISODE {video.episode}</div>
        <div style={{ fontSize:13.5,fontWeight:700,color:watched?'rgba(255,255,255,.5)':'#EDEBE3',lineHeight:1.28 }}>{video.title}</div>
      </div>
    </div>
  )
}

// ─── Left info panel
function InfoPanel({ watchedCount, total, lastWatchedIdx, onResume }) {
  const pct = total > 0 ? Math.round((watchedCount / total) * 100) : 0
  const nextVideo = VIDEOS[lastWatchedIdx] || VIDEOS[0]

  return (
    <aside style={{
      position: 'sticky', top: 0, alignSelf: 'start',
      display: 'flex', flexDirection: 'column', gap: 0,
      borderRadius: 22, overflow: 'hidden',
      background: 'linear-gradient(180deg,rgba(20,18,32,.95),rgba(12,10,18,.98))',
      border: '1px solid rgba(139,124,255,.22)',
      boxShadow: '0 24px 70px rgba(0,0,0,.40),inset 0 1px 0 rgba(255,255,255,.05)',
      backdropFilter: 'blur(20px)',
    }}>
      {/* cover art */}
      <div style={{ position:'relative', height:260, overflow:'hidden', flexShrink:0 }}>
        <img
          src={COVER} alt="Violet Evergarden"
          style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top',opacity:.75,filter:'saturate(1.2) brightness(.85)' }}
        />
        {/* gradient */}
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,.12) 0%,rgba(20,18,32,.98) 100%)' }} />
        {/* floating title on cover */}
        <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'0 18px 20px' }}>
          <div style={{ fontSize:9.5,fontWeight:800,letterSpacing:'.18em',color:COLOR2,textTransform:'uppercase',marginBottom:6 }}>
            ✉ AUTO MEMORY DOLL
          </div>
          <h2 style={{ margin:0, fontFamily:"'Pirata One',cursive", fontSize:26,fontWeight:900,color:'#fff',lineHeight:1.0,letterSpacing:'-.01em',textShadow:'0 2px 20px rgba(0,0,0,.9)' }}>
            Violet Evergarden
          </h2>
          <div style={{ fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,marginTop:3 }}>Kyoto Animation · 2018</div>
        </div>
      </div>

      {/* body */}
      <div style={{ padding:'18px 18px 22px', display:'flex', flexDirection:'column', gap:18 }}>

        {/* progress ring + stats */}
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
              <div style={{ width:`${pct}%`,height:'100%',borderRadius:999,background:`linear-gradient(90deg,${COLOR},${COLOR2})`,boxShadow:`0 0 12px ${COLOR}66`,transition:'width .5s ease' }} />
            </div>
            <div style={{ fontSize:10,color:'rgba(255,255,255,.28)',fontWeight:600,marginTop:4 }}>
              {pct === 100 ? '✓ Série terminée' : pct === 0 ? 'Pas encore commencé' : 'En cours de visionnage'}
            </div>
          </div>
        </div>

        {/* continue button */}
        <button
          className="ve-cta"
          onClick={onResume}
          style={{
            width:'100%',padding:'11px 0',borderRadius:12,
            background:`rgba(139,124,255,.18)`,border:`1px solid rgba(139,124,255,.38)`,
            color:'#fff',cursor:'pointer',fontSize:13,fontWeight:800,
            display:'flex',alignItems:'center',justifyContent:'center',gap:8,
            fontFamily:'var(--body)',
          }}
        >
          <span style={{ fontSize:16 }}>▶</span>
          {pct === 0 ? 'Commencer' : pct === 100 ? 'Revoir depuis le début' : `Reprendre — Ép. ${nextVideo?.episode}`}
        </button>

        {/* stats grid */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          {[
            { label:'Épisodes', value:'13', dot:COLOR2 },
            { label:'Statut', value:'Terminé', dot:'#34d399' },
            { label:'Audio', value:'VF + JAP', dot:'#fbbf24' },
            { label:'Note', value:'★ 8.9', dot:'#f97316' },
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

        {/* synopsis */}
        <div>
          <div style={{ fontSize:10,fontWeight:800,color:COLOR2,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:8 }}>Synopsis</div>
          <p style={{ margin:0,fontSize:12.5,color:'rgba(255,255,255,.54)',lineHeight:1.72,fontStyle:'italic' }}>
            {SYNOPSIS}
          </p>
        </div>

        {/* genres */}
        <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
          {TAGS.map(tag => (
            <span key={tag} style={{ fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:999,background:'rgba(139,124,255,.1)',border:'1px solid rgba(139,124,255,.22)',color:COLOR2 }}>
              {tag}
            </span>
          ))}
        </div>

        {/* awards */}
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

// ─── Main page
export default function VioletEvergardenPage({ onClose }) {
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

  // Next unwatched or last watched
  const resumeIdx = useMemo(() => {
    const firstUnwatched = VIDEOS.findIndex(v => !progress[v.episode]?.completed)
    return firstUnwatched >= 0 ? firstUnwatched : 0
  }, [progress])

  const openPlayer = useCallback((idx) => {
    setPlayerIdx(idx)
    markWatched(idx)
  }, [markWatched])

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        position:'fixed',inset:0,zIndex:500,
        background:'radial-gradient(circle at 20% 10%,rgba(139,92,246,.14),transparent 36rem),radial-gradient(circle at 82% 78%,rgba(109,78,255,.10),transparent 30rem),linear-gradient(135deg,#0e0c17 0%,#111214 55%,#0c0a15 100%)',
        display:'flex',flexDirection:'column',
      }}>
        {/* ── Navbar */}
        <div style={{
          flexShrink:0,height:62,padding:'0 24px',
          display:'flex',alignItems:'center',justifyContent:'space-between',
          background:'rgba(14,12,23,.95)',backdropFilter:'blur(24px)',
          borderBottom:'1px solid rgba(139,124,255,.12)',zIndex:10,
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
            <span style={{ fontSize:17,animation:'veFloat 6s ease-in-out infinite' }}>✉</span>
            <span style={{ fontFamily:"'Pirata One',cursive",fontSize:17,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>
              {playerIdx !== null ? `Épisode ${VIDEOS[playerIdx]?.episode}` : 'Violet Evergarden'}
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

        {/* ── Content */}
        {playerIdx !== null ? (
          /* ── VIDEO PLAYER */
          <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
            <VideoPlayer
              videos={VIDEOS}
              initialIndex={playerIdx}
              onClose={() => setPlayerIdx(null)}
              onVideoChange={idx => markWatched(idx)}
              embedded
            />
          </div>
        ) : (
          /* ── SPLIT LAYOUT */
          <div ref={scrollRef} className="ve-scroll" style={{ flex:1,overflowY:'auto',padding:'24px 28px 48px' }}>
            <style>{`
              .ve-layout {
                display: grid;
                grid-template-columns: 310px minmax(0,1fr);
                gap: 28px;
                max-width: 1480px;
                margin: 0 auto;
                align-items: start;
              }
              @media (max-width: 900px) {
                .ve-layout { grid-template-columns: 1fr; }
              }
            `}</style>

            <div className="ve-layout">
              {/* ── LEFT PANEL */}
              <InfoPanel
                watchedCount={watchedCount}
                total={VIDEOS.length}
                lastWatchedIdx={resumeIdx}
                onResume={() => openPlayer(resumeIdx)}
              />

              {/* ── RIGHT: episode grid */}
              <div>
                {/* section header */}
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
                  <div>
                    <h3 style={{ margin:'0 0 3px',fontSize:18,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>
                      Épisodes
                    </h3>
                    <div style={{ fontSize:11,color:'rgba(255,255,255,.32)',fontWeight:600 }}>
                      Saison 1 · 13 épisodes · VF disponible
                    </div>
                  </div>
                  {/* progress pill */}
                  <div style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:999,background:'rgba(139,124,255,.10)',border:'1px solid rgba(139,124,255,.22)' }}>
                    <div style={{ width:6,height:6,borderRadius:'50%',background:watchedCount===VIDEOS.length?'#34d399':COLOR,animation:watchedCount<VIDEOS.length&&watchedCount>0?'vePulse 2s infinite':'none' }} />
                    <span style={{ fontSize:11,fontWeight:800,color:COLOR2 }}>
                      {watchedCount === VIDEOS.length ? '✓ Terminé' : watchedCount === 0 ? 'Pas commencé' : `${watchedCount}/${VIDEOS.length} vus`}
                    </span>
                  </div>
                </div>

                {/* grid */}
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
                      onPlay={() => openPlayer(i)}
                    />
                  ))}
                </div>

                {/* footer note */}
                <div style={{ marginTop:28,padding:'14px 18px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:10 }}>
                  <span style={{ fontSize:16 }}>💜</span>
                  <span style={{ fontSize:12,color:'rgba(255,255,255,.38)',fontWeight:600,lineHeight:1.5 }}>
                    Violet Evergarden est considérée comme l'une des plus belles productions de Kyoto Animation. Prévoyez des mouchoirs pour les épisodes 10 et 13.
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
