import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import VideoPlayer from './VideoPlayer.jsx'
import EpisodeDetailInline from './EpisodeDetailInline.jsx'
import { ProgressRing } from './ProgressRing.jsx'
import AnimeBackdrop, { ANIME_MOTIFS } from './AnimeBackdrop.jsx'
import VIDEOS_RAW from '../data/your-name-videos.json'

const VIDEOS = VIDEOS_RAW

const COLOR  = '#7cc4e0'
const COLOR2 = '#f2b765'
const NS     = 'yourname'

const SYNOPSIS = "Mitsuha, lycéenne dans un village reculé, et Taki, étudiant à Tokyo, se réveillent un matin dans le corps l'un de l'autre. À mesure que ces échanges se répètent, un lien invisible se tisse entre eux — jusqu'à ce qu'une comète révèle un secret qui défie le temps et la distance. Le chef-d'œuvre de Makoto Shinkai."

const TAGS = ['Romance', 'Drame', 'Surnaturel', 'Fantastique', 'CoMix Wave']

const AWARDS = [
  { icon: '☄️', label: 'La comète Tiamat' },
  { icon: '🌆', label: 'Kataware-doki, l\'heure du crépuscule' },
  { icon: '🏆', label: 'Chef-d\'œuvre de Makoto Shinkai' },
]

const COVER = ''

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(`${NS}_vp`) || '{}') } catch { return {} }
}
function saveProgress(p) {
  try { localStorage.setItem(`${NS}_vp`, JSON.stringify(p)) } catch {}
}

const CSS = `
  @keyframes aotFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes aotPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes aotFadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

  .aot-ep-card {
    content-visibility: auto;
    contain-intrinsic-size: 0 260px;
    transition: transform .22s ease, box-shadow .22s ease, border-color .18s ease;
    cursor: pointer;
  }
  .aot-ep-card:hover {
    transform: translateY(-5px) scale(1.015) !important;
    box-shadow: 0 18px 48px rgba(124,196,224,.18) !important;
    border-color: rgba(124,196,224,.45) !important;
  }
  .aot-ep-card:focus-visible { outline: 2px solid ${COLOR}; outline-offset: 3px; }

  .aot-play-btn { transition: transform .16s, opacity .16s, background .16s; }
  .aot-ep-card:hover .aot-play-btn { transform: scale(1.15) !important; opacity: 1 !important; }

  .aot-cta { transition: background .18s, transform .14s, box-shadow .18s; }
  .aot-cta:hover {
    background: rgba(124,196,224,.18) !important;
    transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(124,196,224,.22);
  }

  .aot-scroll { scrollbar-width: thin; scrollbar-color: rgba(124,196,224,.2) transparent; }
  .aot-scroll::-webkit-scrollbar { width: 4px; }
  .aot-scroll::-webkit-scrollbar-thumb { background: rgba(124,196,224,.2); border-radius: 4px; }
`



const EpCard = memo(function EpCard({ video, index, watched, onPlay }) {
  const [imgErr, setImgErr] = useState(false)
  const cardLabel = video.kind === 'film' ? 'FILM' : video.kind === 'ova' ? 'OAV' : `EPISODE ${video.episode}`
  const fallbackLabel = video.kind === 'ova' ? 'OAV' : video.kind === 'film' ? 'FILM' : video.episode
  return (
    <div className="aot-ep-card" role="button" tabIndex={0} onClick={onPlay} onKeyDown={e => e.key === 'Enter' && onPlay()}
      style={{ borderRadius: 14, overflow: 'hidden', background: 'rgba(14,12,24,.92)', border: `1px solid ${watched ? 'rgba(160,210,235,.28)' : 'rgba(255,255,255,.07)'}`, animation: `aotFadeUp .3s ${index * 0.03}s ease-out both`, position: 'relative' }}>
      <div style={{ position: 'relative', paddingTop: '57%', background: '#0a0814', overflow: 'hidden' }}>
        {video.thumbnail && !imgErr
          ? <img src={video.thumbnail} alt={video.title} loading="lazy" onError={() => setImgErr(true)}
              style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity: watched ? 0.5 : 0.82 }} />
          : <div style={{ position:'absolute',inset:0, background:`linear-gradient(135deg,rgba(124,196,224,.12),rgba(0,0,0,.9))`, display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontFamily:"'Pirata One',cursive", fontSize:40, fontWeight:900, color:`rgba(124,196,224,.28)`, lineHeight:1 }}>{fallbackLabel}</span>
            </div>}
        <div style={{ position:'absolute',inset:'40% 0 0', background:'linear-gradient(180deg,transparent,rgba(0,0,0,.65))', pointerEvents:'none' }} />
        <div className="aot-play-btn" style={{ position:'absolute',inset:0, display:'flex',alignItems:'center',justifyContent:'center', opacity: watched ? 0.5 : 0.78 }}>
          <div style={{ width:40,height:40,borderRadius:'50%',background:`rgba(124,196,224,.82)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,backdropFilter:'blur(6px)',boxShadow:`0 4px 18px rgba(124,196,224,.45)` }}>▶</div>
        </div>
        {watched && <div style={{ position:'absolute',top:8,right:8, width:22,height:22,borderRadius:'50%',background:'rgba(120,220,170,.18)',border:'1px solid rgba(120,220,170,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#34d399',fontWeight:900 }}>✓</div>}
        <div style={{ position:'absolute',bottom:8,left:8, fontSize:9,fontWeight:800,background:'rgba(124,196,224,.16)',color:COLOR2,border:`1px solid rgba(124,196,224,.28)`,borderRadius:100,padding:'2px 7px' }}>{video.badge || 'VOSTFR'}</div>
      </div>
      <div style={{ padding:'10px 13px 13px' }}>
        <div style={{ fontSize:9.5,fontWeight:800,color:COLOR2,letterSpacing:'.1em',marginBottom:4 }}>{cardLabel}</div>
        <div style={{ fontSize:13.5,fontWeight:700,color:'#fff',lineHeight:1.28 }}>{video.title}</div>
      </div>
    </div>
  )
})

function InfoPanel({ watchedCount, total, lastWatchedIdx, onResume, episodeCount }) {
  const pct = total > 0 ? Math.round((watchedCount / total) * 100) : 0
  const nextVideo = VIDEOS[lastWatchedIdx] || VIDEOS[0]
  return (
    <aside style={{ position: 'sticky', top: 0, alignSelf: 'start', display: 'flex', flexDirection: 'column', borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(180deg,rgba(20,16,8,.96),rgba(12,10,6,.99))', border: `1px solid ${COLOR}33`, boxShadow: '0 24px 70px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.04)', backdropFilter: 'blur(20px)' }}>
      <div style={{ position:'relative', height:260, overflow:'hidden', flexShrink:0, background:`radial-gradient(ellipse at 50% 30%, ${COLOR}44, #0c0a06 72%)` }}>
        {COVER && <img src={COVER} alt="Your Name" style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 15%',opacity:.72,filter:'saturate(1.1) brightness(.88)' }} />}
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(12,10,6,.98) 100%)' }} />
        <div style={{ position:'absolute',top:'40%',left:0,right:0,textAlign:'center',fontSize:54,opacity:.5 }}>☄️</div>
        <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'0 18px 20px' }}>
          <div style={{ fontSize:9.5,fontWeight:800,letterSpacing:'.18em',color:COLOR2,textTransform:'uppercase',marginBottom:6 }}>☄️ COMÈTE • KATAWARE-DOKI • DESTIN</div>
          <h2 style={{ margin:0, fontFamily:"'Pirata One',cursive", fontSize:22,fontWeight:900,color:'#fff',lineHeight:1.0,letterSpacing:'-.01em',textShadow:'0 2px 20px rgba(0,0,0,.9)' }}>Your Name</h2>
          <div style={{ fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,marginTop:3 }}>CoMix Wave Films · 2016</div>
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

        <button className="aot-cta" onClick={onResume} style={{ width:'100%',padding:'11px 0',borderRadius:12, background:`rgba(124,196,224,.14)`,border:`1px solid rgba(124,196,224,.32)`, color:'#fff',cursor:'pointer',fontSize:13,fontWeight:800, display:'flex',alignItems:'center',justifyContent:'center',gap:8, fontFamily:'var(--body)' }}>
          <span style={{ fontSize:16 }}>▶</span>
          {pct === 0 ? 'Commencer' : pct === 100 ? 'Revoir depuis le début' : `Reprendre — ${nextVideo?.title || `Ép. ${nextVideo?.episode}`}`}
        </button>

        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          {[
            { label:'Durée', value:'1h47', dot:COLOR2 },
            { label:'Année', value:'2016', dot:'#fbbf24' },
            { label:'Studio', value:'CoMix Wave', dot:'#34d399' },
            { label:'Audio', value:'VF/VOSTFR', dot:'#f97316' },
            { label:'Note', value:'★ 8.8', dot:'#f97316' },
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
            <span key={tag} style={{ fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:999,background:'rgba(124,196,224,.08)',border:'1px solid rgba(124,196,224,.2)',color:COLOR2 }}>{tag}</span>
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

export default function YourNamePage({ onClose }) {
  const [playerIdx, setPlayerIdx] = useState(null)
  const [detailIdx, setDetailIdx] = useState(null)
  const [progress, setProgress]   = useState(loadProgress)
  const scrollRef = useRef(null)

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape' && playerIdx === null) onClose?.() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [playerIdx, onClose])

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
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }))
  }, [])
  const playHandlers = useMemo(() => VIDEOS.map((_, i) => () => openDetail(i)), [openDetail])

  const episodes = VIDEOS.map((v, i) => ({ v, i }))
  const ovas = VIDEOS.map((v, i) => ({ v, i })).filter(x => x.v.kind === 'ova')
  const films = VIDEOS.map((v, i) => ({ v, i })).filter(x => x.v.kind === 'film')

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position:'fixed',left:0,right:0,top:76,bottom:0,zIndex:500, background:'radial-gradient(circle at 18% 12%,rgba(124,196,224,.09),transparent 32rem),radial-gradient(circle at 84% 80%,rgba(160,210,235,.07),transparent 28rem),linear-gradient(135deg,#0e0a1a 0%,#100c1c 55%,#0a0814 100%)', display:'flex',flexDirection:'column' }}>
        <AnimeBackdrop motifs={ANIME_MOTIFS.aot} color={COLOR} color2={COLOR2} />
        {/* Navbar */}
        <div style={{ flexShrink:0,height:62,padding:'0 24px', display:'flex',alignItems:'center',justifyContent:'space-between', background:'rgba(14,10,26,.96)',backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(124,196,224,.10)',zIndex:10, position:'relative' }}>
          <button onClick={playerIdx !== null ? () => setPlayerIdx(null) : onClose}
            style={{ display:'flex',alignItems:'center',gap:7,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.09)',borderRadius:10,color:'rgba(255,255,255,.72)',cursor:'pointer',padding:'8px 16px',fontSize:12.5,fontWeight:800,transition:'background .15s',fontFamily:'var(--body)' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.11)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,.06)'}>
            ← {playerIdx !== null ? 'Épisodes' : 'Retour'}
          </button>
          <div style={{ position:'absolute',left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:10 }}>
            <span style={{ fontSize:17,animation:'aotFloat 6s ease-in-out infinite' }}>☄️</span>
            <span style={{ fontFamily:"'Pirata One',cursive",fontSize:17,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>
              {playerIdx !== null ? (VIDEOS[playerIdx]?.title || `Épisode ${VIDEOS[playerIdx]?.episode}`) : "Your Name"}
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
        {playerIdx !== null ? (
          <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
            <VideoPlayer videos={VIDEOS} startIdx={playerIdx} onClose={() => setPlayerIdx(null)} color={COLOR} storageKey={NS} autoStart />
          </div>
        ) : (
          <div ref={scrollRef} className="aot-scroll" style={{ flex:1,overflowY:'auto',padding:'24px 28px 48px' }}>
            <style>{`
              .aot-layout { display: grid; grid-template-columns: 310px minmax(0,1fr); gap: 28px; max-width: 1480px; margin: 0 auto; align-items: start; }
              @media (max-width: 900px) { .aot-layout { grid-template-columns: 1fr; } }
              .aot-ep-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(196px,1fr)); gap: 14px; }
            `}</style>
            <div className="aot-layout">
              <InfoPanel watchedCount={watchedCount} total={VIDEOS.length} lastWatchedIdx={resumeIdx} onResume={() => openPlayer(resumeIdx)} episodeCount={episodes.length} />
              <div>
                {detailIdx !== null && (
                  <EpisodeDetailInline video={VIDEOS[detailIdx]} ns={NS} color={COLOR} color2={COLOR2} onPlay={() => openPlayer(detailIdx)} onClose={() => setDetailIdx(null)} />
                )}
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
                  <div>
                    <h3 style={{ margin:'0 0 3px',fontSize:18,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>Le Film</h3>
                    <div style={{ fontSize:11,color:'rgba(255,255,255,.32)',fontWeight:600 }}>
                      {episodes.length > 0 ? `Film • VF/VOSTFR • 1080p` : 'Bientôt disponible'}
                    </div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:999,background:`${COLOR}1c`,border:`1px solid ${COLOR}33` }}>
                    <div style={{ width:6,height:6,borderRadius:'50%',background:COLOR }} />
                    <span style={{ fontSize:11,fontWeight:800,color:COLOR2 }}>{episodes.length > 0 ? 'En ligne' : 'Bientôt'}</span>
                  </div>
                </div>

                {episodes.length > 0 ? (
                  <>
                    {(() => {
                      const groups = []
                      for (const e of episodes) {
                        const label = e.v.arc || e.v.season || 'Épisodes'
                        const g = groups[groups.length - 1]
                        if (!g || g.label !== label) groups.push({ label, items: [e] })
                        else g.items.push(e)
                      }
                      return groups.map(g => (
                        <div key={g.label} style={{ marginBottom:30 }}>
                          <div style={{ display:'flex',alignItems:'center',gap:12,margin:'4px 0 16px' }}>
                            <span style={{ fontFamily:"'Pirata One',cursive",fontSize:20,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>{g.label}</span>
                            <span style={{ fontSize:11,fontWeight:800,color:COLOR2,background:'rgba(124,196,224,.1)',border:'1px solid rgba(124,196,224,.22)',borderRadius:999,padding:'2px 9px' }}>{g.items.length} ép.</span>
                            <div style={{ flex:1,height:1,background:'linear-gradient(to right,rgba(124,196,224,.25),transparent)' }} />
                          </div>
                          <div className="aot-ep-grid">
                            {g.items.map(({ v, i }) => (
                              <EpCard key={keyOf(v)} video={v} index={i} watched={!!progress[keyOf(v)]?.completed} onPlay={playHandlers[i]} />
                            ))}
                          </div>
                        </div>
                      ))
                    })()}

                    <div style={{ marginTop:6,padding:'14px 18px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:10 }}>
                      <span style={{ fontSize:16 }}>☄️</span>
                      <span style={{ fontSize:12,color:'rgba(255,255,255,.38)',fontWeight:600,lineHeight:1.5 }}>
                        Your Name / Kimi no Na wa (2016) — réalisé par Makoto Shinkai, animé par CoMix Wave Films. Disponible en VF et VOSTFR, 1080p.
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ padding: '24px', borderRadius: 16, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', textAlign: 'center' }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>☄️</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Film en préparation</div>
                      <div style={{ color: 'rgba(255,255,255,.5)', marginBottom: 16 }}>Your Name arrive très bientôt en 1080p VF/VOSTFR sur le site.</div>
                      <div style={{ fontSize: 13, color: COLOR2 }}>Encodage et mise en ligne en cours…</div>
                    </div>

                    <div style={{ marginTop:28,padding:'14px 18px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:10 }}>
                      <span style={{ fontSize:16 }}>☄️</span>
                      <span style={{ fontSize:12,color:'rgba(255,255,255,.38)',fontWeight:600,lineHeight:1.5 }}>
                        Your Name (2016) — chef-d'œuvre de Makoto Shinkai.
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
