import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { ProgressRing } from './ProgressRing.jsx'
import AnimeBackdrop, { ANIME_MOTIFS } from './AnimeBackdrop.jsx'
import VIDEOS_RAW from '../data/death-note-videos.json'
import RecommendedBanner from './RecommendedBanner.jsx'
import EpisodeWatch from './EpisodeWatch.jsx'
import SeasonDivider from './SeasonDivider.jsx'

// Même contrat que Violet : le lecteur applique la préférence du membre
// (japonais + sous-titres FR par défaut). On ne force pas la VF ici.
const VIDEOS = VIDEOS_RAW

const COLOR  = '#b91c1c'
const COLOR2 = '#f87171'
const NS     = 'death-note'

const SYNOPSIS = "Light Yagami, lycéen brillant qui s'ennuie, ramasse un cahier noir tombé du ciel : le Death Note. Quiconque y voit son nom écrit meurt. Convaincu de pouvoir purger le monde des criminels, Light devient « Kira », un dieu justicier anonyme. Face à lui se dresse L, détective de génie au visage inconnu. Entre eux s'engage un duel d'esprit où chaque erreur peut être la dernière, sous le regard amusé de Ryuk, le dieu de la mort qui a laissé tomber le cahier."

const TAGS = ['Thriller', 'Psychologique', 'Surnaturel', 'Mystère', 'Shōnen']

const MARKS = [
  { icon: '📓', label: 'Duel Light contre L' },
  { icon: '🍎', label: 'Studio Madhouse' },
  { icon: '👁️', label: '37 épisodes, série terminée' },
]

const COVER = 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1535-kUgkcrfOrkUM.jpg'

const ARCS = [
  { label: 'Affaire Kira', from: 1, to: 17 },
  { label: 'Yotsuba', from: 18, to: 25 },
  { label: 'Near et Mello', from: 26, to: 37 },
]

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(`${NS}_vp`) || '{}') } catch { return {} }
}
function saveProgress(p) {
  try { localStorage.setItem(`${NS}_vp`, JSON.stringify(p)) } catch {}
}

const CSS = `
  @keyframes dnFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes dnPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes dnFadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

  .dn-ep-card {
    content-visibility: auto;
    contain-intrinsic-size: 0 260px;
    transition: transform .22s ease, box-shadow .22s ease, border-color .18s ease;
    cursor: pointer;
  }
  .dn-ep-card:hover {
    transform: translateY(-5px) scale(1.015) !important;
    box-shadow: 0 18px 48px rgba(185,28,28,.22) !important;
    border-color: rgba(185,28,28,.5) !important;
  }
  .dn-ep-card:focus-visible { outline: 2px solid ${COLOR}; outline-offset: 3px; }

  .dn-play-btn { transition: transform .16s, opacity .16s, background .16s; }
  .dn-ep-card:hover .dn-play-btn { transform: scale(1.15) !important; opacity: 1 !important; }

  .dn-cta { transition: background .18s, transform .14s, box-shadow .18s; }
  .dn-cta:hover {
    background: rgba(185,28,28,.24) !important;
    transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(185,28,28,.28);
  }

  .dn-scroll { scrollbar-width: thin; scrollbar-color: rgba(185,28,28,.28) transparent; }
  .dn-scroll::-webkit-scrollbar { width: 4px; }
  .dn-scroll::-webkit-scrollbar-thumb { background: rgba(185,28,28,.28); border-radius: 4px; }
`

const EpCard = memo(function EpCard({ video, index, watched, onPlay }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <div className="dn-ep-card" role="button" tabIndex={0} onClick={onPlay} onKeyDown={e => e.key === 'Enter' && onPlay()}
      style={{ borderRadius: 14, overflow: 'hidden', background: 'rgba(18,8,8,.92)', border: `1px solid ${watched ? 'rgba(185,28,28,.32)' : 'rgba(255,255,255,.07)'}`, animation: `dnFadeUp .3s ${Math.min(index, 12) * 0.04}s ease-out both`, position: 'relative' }}>
      <div style={{ position: 'relative', paddingTop: '57%', background: '#100808', overflow: 'hidden' }}>
        {video.thumbnail && !imgErr
          ? <img src={video.thumbnail} alt={video.title} loading="lazy" onError={() => setImgErr(true)}
              style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity: watched ? 0.5 : 0.82 }} />
          : <div style={{ position:'absolute',inset:0, background:'linear-gradient(135deg,rgba(185,28,28,.16),rgba(0,0,0,.9))', display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontFamily:"'Pirata One',cursive", fontSize:40, fontWeight:900, color:'rgba(248,113,113,.28)', lineHeight:1 }}>{video.episode}</span>
            </div>}
        <div style={{ position:'absolute',inset:'40% 0 0', background:'linear-gradient(180deg,transparent,rgba(0,0,0,.65))', pointerEvents:'none' }} />
        <div className="dn-play-btn" style={{ position:'absolute',inset:0, display:'flex',alignItems:'center',justifyContent:'center', opacity: watched ? 0.5 : 0.78 }}>
          <div style={{ width:40,height:40,borderRadius:'50%',background:'rgba(185,28,28,.88)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,backdropFilter:'blur(6px)',boxShadow:'0 4px 18px rgba(185,28,28,.45)' }}>▶</div>
        </div>
        {watched && <div style={{ position:'absolute',top:8,right:8, width:22,height:22,borderRadius:'50%',background:'rgba(52,211,153,.18)',border:'1px solid rgba(52,211,153,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#34d399',fontWeight:900 }}>✓</div>}
        <div style={{ position:'absolute',bottom:8,left:8, fontSize:9,fontWeight:800,background:'rgba(185,28,28,.2)',color:COLOR2,border:'1px solid rgba(185,28,28,.32)',borderRadius:100,padding:'2px 7px' }}>{video.badge || 'VOSTFR'}</div>
      </div>
      <div style={{ padding:'10px 13px 13px' }}>
        <div style={{ fontSize:9.5,fontWeight:800,color:COLOR2,letterSpacing:'.1em',marginBottom:4 }}>EPISODE {video.episode}</div>
        <div style={{ fontSize:13.5,fontWeight:700,color:'#fff',lineHeight:1.28 }}>{video.title}</div>
      </div>
    </div>
  )
})

function InfoPanel({ watchedCount, total, lastWatchedIdx, onResume }) {
  const pct = total > 0 ? Math.round((watchedCount / total) * 100) : 0
  const nextVideo = VIDEOS[lastWatchedIdx] || VIDEOS[0]
  return (
    <aside className="anime-infopanel" style={{ position: 'sticky', top: 0, alignSelf: 'start', display: 'flex', flexDirection: 'column', borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(180deg,rgba(28,10,10,.96),rgba(12,6,6,.99))', border: '1px solid rgba(185,28,28,.22)', boxShadow: '0 24px 70px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.04)', backdropFilter: 'blur(20px)' }}>
      <div style={{ position:'relative', height:260, overflow:'hidden', flexShrink:0 }}>
        <img loading="lazy" decoding="async" src={COVER} alt="Death Note" style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top',opacity:.78 }} />
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(16,8,8,.98) 100%)' }} />
        <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'0 18px 20px' }}>
          <div style={{ fontSize:9.5,fontWeight:800,letterSpacing:'.18em',color:COLOR2,textTransform:'uppercase',marginBottom:6 }}>📓 CAHIER · KIRA · L</div>
          <h2 style={{ margin:0, fontFamily:"'Pirata One',cursive", fontSize:22,fontWeight:900,color:'#fff',lineHeight:1.0,letterSpacing:'-.01em',textShadow:'0 2px 20px rgba(0,0,0,.9)' }}>Death Note</h2>
          <div style={{ fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,marginTop:3 }}>Madhouse · 2006 – 2007</div>
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

        <button className="dn-cta" onClick={onResume} style={{ width:'100%',padding:'11px 0',borderRadius:12, background:'rgba(185,28,28,.16)',border:'1px solid rgba(185,28,28,.36)', color:'#fff',cursor:'pointer',fontSize:13,fontWeight:800, display:'flex',alignItems:'center',justifyContent:'center',gap:8, fontFamily:'var(--body)' }}>
          <span style={{ fontSize:16 }}>▶</span>
          {pct === 0 ? 'Commencer' : pct === 100 ? 'Revoir depuis le début' : `Reprendre — Ép. ${nextVideo?.episode}${nextVideo?.title ? ` · ${nextVideo.title}` : ''}`}
        </button>

        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          {[
            { label:'Épisodes', value:String(VIDEOS.length), dot:COLOR2 },
            { label:'Arcs', value:String(ARCS.length), dot:'#fbbf24' },
            { label:'Audio', value:'VF + VO', dot:'#f97316' },
            { label:'Note', value:'★ 8.4', dot:'#f97316' },
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
            <span key={tag} style={{ fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:999,background:'rgba(185,28,28,.1)',border:'1px solid rgba(185,28,28,.24)',color:COLOR2 }}>{tag}</span>
          ))}
        </div>

        <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
          {MARKS.map(a => (
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

export default function DeathNotePage({ onClose }) {
  const [detailIdx, setDetailIdx] = useState(null)
  const [progress, setProgress] = useState(loadProgress)
  const scrollRef = useRef(null)

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape' && detailIdx === null) onClose?.() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [detailIdx, onClose])

  const keyOf = (v) => v.progressKey || v.id || v.episode
  const markWatched = useCallback((idx) => {
    setProgress(prev => {
      const v = VIDEOS[idx]; if (!v) return prev
      const next = { ...prev, [keyOf(v)]: { completed: true } }
      saveProgress(next)
      return next
    })
  }, [])

  const watchedCount = useMemo(() => VIDEOS.filter(v => v.src && progress[keyOf(v)]?.completed).length, [progress])
  const playable = useMemo(() => VIDEOS.map((v, i) => ({ v, i })).filter(x => x.v.src), [])
  const resumeIdx = useMemo(() => { const i = playable.find(x => !progress[keyOf(x.v)]?.completed); return i ? i.i : (playable[0]?.i ?? 0) }, [progress, playable])
  const openDetail = useCallback((idx) => {
    setDetailIdx(idx)
    markWatched(idx)
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }))
  }, [markWatched])

  const arcBlocks = ARCS.map(arc => ({
    ...arc,
    items: playable.filter(x => x.v.episode >= arc.from && x.v.episode <= arc.to),
  })).filter(arc => arc.items.length)

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position:'fixed',left:0,right:0,top:76,bottom:0,zIndex:500, background:'radial-gradient(circle at 18% 12%,rgba(185,28,28,.12),transparent 32rem),radial-gradient(circle at 84% 80%,rgba(120,20,20,.08),transparent 28rem),linear-gradient(135deg,#120808 0%,#140c0c 55%,#0a0707 100%)', display:'flex',flexDirection:'column' }}>
        <AnimeBackdrop motifs={ANIME_MOTIFS['death-note']} color={COLOR} color2={COLOR2} />
        <div style={{ flexShrink:0,height:62,padding:'0 24px', display:'flex',alignItems:'center',justifyContent:'space-between', background:'rgba(18,8,8,.96)',backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(185,28,28,.12)',zIndex:10, position:'relative' }}>
          <button onClick={detailIdx !== null ? () => setDetailIdx(null) : onClose}
            style={{ display:'flex',alignItems:'center',gap:7,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.09)',borderRadius:10,color:'rgba(255,255,255,.72)',cursor:'pointer',padding:'8px 16px',fontSize:12.5,fontWeight:800,transition:'background .15s',fontFamily:'var(--body)' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.11)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,.06)'}>
            ← {detailIdx !== null ? 'Épisodes' : 'Retour'}
          </button>
          <div style={{ position:'absolute',left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:10, maxWidth:'46%' }}>
            <span style={{ fontSize:17,animation:'dnFloat 6s ease-in-out infinite' }}>📓</span>
            <span style={{ fontFamily:"'Pirata One',cursive",fontSize:17,fontWeight:900,color:'#fff',letterSpacing:'-.01em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {detailIdx !== null ? (VIDEOS[detailIdx]?.title || `Épisode ${VIDEOS[detailIdx]?.episode}`) : 'Death Note'}
            </span>
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <div className="ap-hdr-count" style={{ fontSize:10.5,color:'rgba(255,255,255,.28)',fontWeight:700 }}>{watchedCount}/{playable.length} vus</div>
            <div style={{ width:56,height:5,borderRadius:999,background:'rgba(255,255,255,.07)',overflow:'hidden' }}>
              <div style={{ width:`${playable.length ? Math.round(watchedCount / playable.length * 100) : 0}%`,height:'100%',background:`linear-gradient(90deg,${COLOR},${COLOR2})`,borderRadius:999,transition:'width .4s' }} />
            </div>
          </div>
        </div>

        {detailIdx !== null ? (
          <div ref={scrollRef} className="dn-scroll" style={{ flex:1,overflowY:'auto',padding:'24px 28px 48px' }}>
            <div style={{ maxWidth: 1760, margin: '0 auto' }}>
              <EpisodeWatch videos={VIDEOS} startIdx={detailIdx} ns={NS} storageKey={NS} color={COLOR} color2={COLOR2} tags={TAGS} animeSynopsis={SYNOPSIS} onSelect={openDetail} onClose={() => setDetailIdx(null)} />
            </div>
          </div>
        ) : (
          <div ref={scrollRef} className="dn-scroll" style={{ flex:1,overflowY:'auto',padding:'24px 28px 48px' }}>
            <style>{`
              .dn-layout { display: grid; grid-template-columns: 310px minmax(0,1fr); gap: 28px; max-width: 1480px; margin: 0 auto; align-items: start; }
              @media (max-width: 900px) { .dn-layout { grid-template-columns: 1fr; } }
              @media (max-width:900px) { .anime-infopanel { position:static !important; } }
            `}</style>
            <div className="dn-layout">
              <InfoPanel watchedCount={watchedCount} total={playable.length} lastWatchedIdx={resumeIdx} onResume={() => openDetail(resumeIdx)} />
              <div>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
                  <div>
                    <h3 style={{ margin:'0 0 3px',fontSize:18,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>Épisodes</h3>
                    <div style={{ fontSize:11,color:'rgba(255,255,255,.32)',fontWeight:600 }}>Saison 1 · {playable.length} épisodes · VF + VO</div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:999,background:'rgba(185,28,28,.1)',border:'1px solid rgba(185,28,28,.22)' }}>
                    <div style={{ width:6,height:6,borderRadius:'50%',background:watchedCount===playable.length?'#34d399':COLOR,animation:watchedCount<playable.length&&watchedCount>0?'dnPulse 2s infinite':'none' }} />
                    <span style={{ fontSize:11,fontWeight:800,color:COLOR2 }}>{watchedCount === playable.length ? '✓ Terminé' : watchedCount === 0 ? 'Pas commencé' : `${watchedCount}/${playable.length} vus`}</span>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
                  {arcBlocks.flatMap(arc => [
                    <SeasonDivider key={arc.label} label={arc.label} color={COLOR} />,
                    ...arc.items.map(({ v, i }) => (
                      <EpCard key={keyOf(v)} video={v} index={i} watched={!!progress[keyOf(v)]?.completed} onPlay={() => openDetail(i)} />
                    )),
                  ])}
                </div>

                <div style={{ marginTop:28,padding:'14px 18px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:10 }}>
                  <span style={{ fontSize:16 }}>📓</span>
                  <span style={{ fontSize:12,color:'rgba(255,255,255,.38)',fontWeight:600,lineHeight:1.5 }}>
                    Death Note est une production Madhouse (2006–2007), adaptée du manga d'Ohba et Obata. Japonais ou VF, sous-titres français au choix.
                  </span>
                </div>

                <RecommendedBanner color2={COLOR2} withHakuji />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
