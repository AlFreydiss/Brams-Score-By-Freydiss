import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import VideoPlayer from './VideoPlayer.jsx'
import EpisodeDetailInline from './EpisodeDetailInline.jsx'
import EpisodeWatch from './EpisodeWatch.jsx'
import { ProgressRing } from './ProgressRing.jsx'
import AnimeBackdrop, { ANIME_MOTIFS } from './AnimeBackdrop.jsx'
import { Reader } from './MangaReader.jsx'
import VIDEOS_RAW from '../data/sl-videos.json'
import CHAPTERS from '../data/sl-chapters.json'

const VIDEOS = VIDEOS_RAW

const COLOR  = '#1976d2'
const COLOR2 = '#60a5fa'
const NS     = 'sl'

const SYNOPSIS = "Sung Jin-Woo, le chasseur le plus faible de l'humanité, se retrouve piégé dans un donjon mortel. Après avoir frôlé la mort, il obtient un pouvoir unique : le Système de Leveling. Il devient le seul à pouvoir monter de niveau et se transforme en ombre souveraine pour protéger le monde des monstres."

const TAGS = ['Action', 'Fantastique', 'Aventure', 'Système', 'Dark']

const AWARDS = [
  { icon: '💎', label: 'Le plus faible devient le plus fort' },
  { icon: '👤', label: 'Armée d\'ombres' },
  { icon: '⚔️', label: 'Chasseur S-Rank ultime' },
]

const COVER = '/sl-poster.jpg'

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
  @keyframes slFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes slPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes slFadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

  .sl-ep-card {
    content-visibility: auto;
    contain-intrinsic-size: 0 260px;
    transition: transform .22s ease, box-shadow .22s ease, border-color .18s ease;
    cursor: pointer;
  }
  .sl-ep-card:hover {
    transform: translateY(-5px) scale(1.015) !important;
    box-shadow: 0 18px 48px rgba(25,118,210,.18) !important;
    border-color: rgba(25,118,210,.45) !important;
  }
  .sl-ep-card:focus-visible { outline: 2px solid ${COLOR}; outline-offset: 3px; }

  .sl-play-btn { transition: transform .16s, opacity .16s, background .16s; }
  .sl-ep-card:hover .sl-play-btn { transform: scale(1.15) !important; opacity: 1 !important; }

  .sl-cta { transition: background .18s, transform .14s, box-shadow .18s; }
  .sl-cta:hover {
    background: rgba(25,118,210,.18) !important;
    transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(25,118,210,.22);
  }

  .sl-scroll { scrollbar-width: thin; scrollbar-color: rgba(25,118,210,.2) transparent; }
  .sl-scroll::-webkit-scrollbar { width: 4px; }
  .sl-scroll::-webkit-scrollbar-thumb { background: rgba(25,118,210,.2); border-radius: 4px; }
`



const EpCard = memo(function EpCard({ video, index, watched, onPlay }) {
  const [imgErr, setImgErr] = useState(false)
  const cardLabel = video.kind === 'film' ? 'FILM' : video.kind === 'ova' ? 'OAV' : `EPISODE ${video.episode}`
  const fallbackLabel = video.kind === 'ova' ? 'OAV' : video.kind === 'film' ? 'FILM' : video.episode
  return (
    <div className="sl-ep-card" role="button" tabIndex={0} onClick={onPlay} onKeyDown={e => e.key === 'Enter' && onPlay()}
      style={{ borderRadius: 14, overflow: 'hidden', background: 'rgba(14,12,24,.92)', border: `1px solid ${watched ? 'rgba(96,165,250,.28)' : 'rgba(255,255,255,.07)'}`, animation: `slFadeUp .3s ${index * 0.03}s ease-out both`, position: 'relative' }}>
      <div style={{ position: 'relative', paddingTop: '57%', background: '#0a0814', overflow: 'hidden' }}>
        {video.thumbnail && !imgErr
          ? <img src={video.thumbnail} alt={video.title} loading="lazy" onError={() => setImgErr(true)}
              style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity: watched ? 0.5 : 0.82 }} />
          : <div style={{ position:'absolute',inset:0, background:`linear-gradient(135deg,rgba(25,118,210,.12),rgba(0,0,0,.9))`, display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontFamily:"'Pirata One',cursive", fontSize:40, fontWeight:900, color:`rgba(25,118,210,.28)`, lineHeight:1 }}>{fallbackLabel}</span>
            </div>}
        <div style={{ position:'absolute',inset:'40% 0 0', background:'linear-gradient(180deg,transparent,rgba(0,0,0,.65))', pointerEvents:'none' }} />
        <div className="sl-play-btn" style={{ position:'absolute',inset:0, display:'flex',alignItems:'center',justifyContent:'center', opacity: watched ? 0.5 : 0.78 }}>
          <div style={{ width:40,height:40,borderRadius:'50%',background:`rgba(25,118,210,.82)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,backdropFilter:'blur(6px)',boxShadow:`0 4px 18px rgba(25,118,210,.45)` }}>▶</div>
        </div>
        {watched && <div style={{ position:'absolute',top:8,right:8, width:22,height:22,borderRadius:'50%',background:'rgba(52,211,153,.18)',border:'1px solid rgba(52,211,153,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#34d399',fontWeight:900 }}>✓</div>}
        <div style={{ position:'absolute',bottom:8,left:8, fontSize:9,fontWeight:800,background:'rgba(25,118,210,.16)',color:COLOR2,border:`1px solid rgba(25,118,210,.28)`,borderRadius:100,padding:'2px 7px' }}>{video.badge || 'VOSTFR'}</div>
      </div>
      <div style={{ padding:'10px 13px 13px' }}>
        <div style={{ fontSize:9.5,fontWeight:800,color:COLOR2,letterSpacing:'.1em',marginBottom:4 }}>{cardLabel}</div>
        <div style={{ fontSize:13.5,fontWeight:700,color:'#fff',lineHeight:1.28 }}>{video.title}</div>
      </div>
    </div>
  )
})

function InfoPanel({ watchedCount, total, lastWatchedIdx, onResume, chapterCount }) {
  const pct = total > 0 ? Math.round((watchedCount / total) * 100) : 0
  const nextVideo = VIDEOS[lastWatchedIdx] || VIDEOS[0]
  return (
    <aside className="anime-infopanel" style={{ position: 'sticky', top: 0, alignSelf: 'start', display: 'flex', flexDirection: 'column', borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(180deg,rgba(16,12,30,.96),rgba(10,8,20,.99))', border: '1px solid rgba(25,118,210,.18)', boxShadow: '0 24px 70px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.04)', backdropFilter: 'blur(20px)' }}>
      <div style={{ position:'relative', height:260, overflow:'hidden', flexShrink:0 }}>
        <img loading="lazy" decoding="async" src={COVER} alt="Solo Leveling" style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 15%',opacity:.72,filter:'saturate(1.1) brightness(.9)' }} />
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(16,12,30,.98) 100%)' }} />
        <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'0 18px 20px' }}>
          <div style={{ fontSize:9.5,fontWeight:800,letterSpacing:'.18em',color:COLOR2,textTransform:'uppercase',marginBottom:6 }}>💎 FAIBLE • SYSTÈME • ROI DES OMBRES</div>
          <h2 style={{ margin:0, fontFamily:"'Pirata One',cursive", fontSize:22,fontWeight:900,color:'#fff',lineHeight:1.0,letterSpacing:'-.01em',textShadow:'0 2px 20px rgba(0,0,0,.9)' }}>Solo Leveling</h2>
          <div style={{ fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,marginTop:3 }}>2024</div>
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

        <button className="sl-cta" onClick={onResume} style={{ width:'100%',padding:'11px 0',borderRadius:12, background:`rgba(25,118,210,.14)`,border:`1px solid rgba(25,118,210,.32)`, color:'#fff',cursor:'pointer',fontSize:13,fontWeight:800, display:'flex',alignItems:'center',justifyContent:'center',gap:8, fontFamily:'var(--body)' }}>
          <span style={{ fontSize:16 }}>▶</span>
          {pct === 0 ? 'Commencer' : pct === 100 ? 'Revoir depuis le début' : `Reprendre — ${nextVideo?.title || `Ép. ${nextVideo?.episode}`}`}
        </button>

        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          {[
            { label:'Épisodes', value:'0', dot:COLOR2 },
            { label:'OAV', value:'0', dot:'#34d399' },
            { label:'Audio', value:'VF + VO', dot:'#f97316' },
            { label:'Note', value:'★ 9.1', dot:'#f97316' },
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
            <span key={tag} style={{ fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:999,background:'rgba(25,118,210,.08)',border:'1px solid rgba(25,118,210,.2)',color:COLOR2 }}>{tag}</span>
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

export default function SlPage({ onClose }) {
  const [playerIdx, setPlayerIdx] = useState(null)
  const [detailIdx, setDetailIdx] = useState(null)
  const [progress, setProgress]   = useState(loadProgress)
  const [scanProg, setScanProg]   = useState(loadScanProgress)
  const [reading, setReading]     = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape' && detailIdx === null) onClose?.() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [detailIdx, onClose])

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

  const episodes = VIDEOS.map((v, i) => ({ v, i })).filter(x => !x.v.kind)
  const ovas = VIDEOS.map((v, i) => ({ v, i })).filter(x => x.v.kind === 'ova')
  const films = VIDEOS.map((v, i) => ({ v, i })).filter(x => x.v.kind === 'film')
  const chapterCount = CHAPTERS.length || 202

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position:'fixed',left:0,right:0,top:76,bottom:0,zIndex:500, background:'radial-gradient(circle at 18% 12%,rgba(25,118,210,.09),transparent 32rem),radial-gradient(circle at 84% 80%,rgba(96,165,250,.07),transparent 28rem),linear-gradient(135deg,#0e0a1a 0%,#100c1c 55%,#0a0814 100%)', display:'flex',flexDirection:'column' }}>
        <AnimeBackdrop motifs={ANIME_MOTIFS.sl} color={COLOR} color2={COLOR2} />
        {/* Navbar */}
        <div style={{ flexShrink:0,height:62,padding:'0 24px', display:'flex',alignItems:'center',justifyContent:'space-between', background:'rgba(14,10,26,.96)',backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(25,118,210,.10)',zIndex:10, position:'relative' }}>
          <button onClick={detailIdx !== null ? () => setDetailIdx(null) : onClose}
            style={{ display:'flex',alignItems:'center',gap:7,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.09)',borderRadius:10,color:'rgba(255,255,255,.72)',cursor:'pointer',padding:'8px 16px',fontSize:12.5,fontWeight:800,transition:'background .15s',fontFamily:'var(--body)' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.11)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,.06)'}>
            ← {detailIdx !== null ? 'Épisodes' : 'Retour'}
          </button>
          <div style={{ position:'absolute',left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:10 }}>
            <span style={{ fontSize:17,animation:'slFloat 6s ease-in-out infinite' }}>💎</span>
            <span style={{ fontFamily:"'Pirata One',cursive",fontSize:17,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>
              {detailIdx !== null ? (VIDEOS[detailIdx]?.title || `Épisode ${VIDEOS[detailIdx]?.episode}`) : 'Solo Leveling'}
            </span>
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <div style={{ fontSize:10.5,color:'rgba(255,255,255,.28)',fontWeight:700 }}>{watchedCount}/{VIDEOS.length} vus</div>
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
          <div ref={scrollRef} className="sl-scroll" style={{ flex:1,overflowY:'auto',padding:'24px 28px 48px' }}>
            <style>{`
              .sl-layout { display: grid; grid-template-columns: 310px minmax(0,1fr); gap: 28px; max-width: 1480px; margin: 0 auto; align-items: start; }
              @media (max-width: 900px) { .sl-layout { grid-template-columns: 1fr; } }
              @media (max-width:900px) { .anime-infopanel { position:static !important; } }
            `}</style>
            <div className="sl-layout">
              <InfoPanel watchedCount={watchedCount} total={VIDEOS.length} lastWatchedIdx={resumeIdx} onResume={() => openDetail(resumeIdx)} chapterCount={chapterCount} />
              <div>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
                  <div>
                    <h3 style={{ margin:'0 0 3px',fontSize:18,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>Épisodes</h3>
                    <div style={{ fontSize:11,color:'rgba(255,255,255,.32)',fontWeight:600 }}>Bientôt disponible en streaming</div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:999,background:'rgba(25,118,210,.08)',border:'1px solid rgba(25,118,210,.18)' }}>
                    <div style={{ width:6,height:6,borderRadius:'50%',background:COLOR }} />
                    <span style={{ fontSize:11,fontWeight:800,color:COLOR2 }}>À venir</span>
                  </div>
                </div>

                <div style={{ padding:'42px 20px', borderRadius:14, background:'rgba(255,255,255,.03)', border:'1px dashed rgba(255,255,255,.1)', textAlign:'center', color:'rgba(255,255,255,.45)', fontSize:13, lineHeight:1.7 }}>
                  <div style={{ fontSize:34, marginBottom:10 }}>📺</div>
                  Les épisodes arrivent bientôt — encodage et mise en ligne à venir.
                </div>
                {reading !== null && CHAPTERS[reading] && (
                  <div style={{ position:'fixed', inset:0, zIndex:9999, background:'#0a0814' }}>
                    <Reader
                      chapter={CHAPTERS[reading]}
                      chapterIndex={reading}
                      onClose={() => setReading(null)}
                      onPrevChapter={() => setReading(Math.max(0, reading-1))}
                      onNextChapter={() => setReading(Math.min(CHAPTERS.length-1, reading+1))}
                      totalChapters={CHAPTERS.length}
                      onFinish={() => { const p = {...scanProg, [CHAPTERS[reading].num]: 'read'}; setScanProg(p); try{localStorage.setItem(`${NS}_progress`, JSON.stringify(p))}catch{} }}
                      isRead={scanProg[CHAPTERS[reading]?.num] === 'read'}
                      namespace={NS}
                      themeColor={COLOR}
                    />
                  </div>
                )}

                <div style={{ marginTop:28,padding:'14px 18px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:10 }}>
                  <span style={{ fontSize:16 }}>💎</span>
                  <span style={{ fontSize:12,color:'rgba(255,255,255,.38)',fontWeight:600,lineHeight:1.5 }}>
                    Solo Leveling — l'adaptation du webtoon coréen culte de Chugong, phénomène mondial.
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
