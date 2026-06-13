import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { ProgressRing } from './ProgressRing.jsx'
import AnimeBackdrop, { ANIME_MOTIFS } from './AnimeBackdrop.jsx'
import VIDEOS_RAW from '../data/quintuplets-videos.json'
import { getCachedSynopsis, fetchEpisodeSynopsis } from '../lib/episodeSynopsis.js'
import EpisodeWatch from './EpisodeWatch.jsx'

// VOSTFR : le player applique la préférence du membre (défaut ja + sous-titres fr).
const VIDEOS = VIDEOS_RAW

const COLOR  = '#ff6f9c'
const COLOR2 = '#ffaecb'
const NS     = 'quintuplets'
const SEASON_LABELS = { S01: 'Saison 1', S02: 'Saison 2', Film: 'Film' }

const SYNOPSIS = "Fūtarō Uesugi, lycéen brillant mais fauché, décroche un job de tuteur en or : faire réviser cinq sœurs quintuplées… toutes ravissantes, toutes au bord du redoublement, et toutes décidées à lui mener la vie dure. Entre Ichika, Nino, Miku, Yotsuba et Itsuki, une certitude posée dès le départ : l'une d'elles deviendra sa femme. Mais laquelle ?"

const TAGS = ['Romance', 'Comédie', 'Harem', 'Tranche de vie', 'Tezuka Productions']

const AWARDS = [
  { icon: '💍', label: 'Le mariage est annoncé dès l\'épisode 1' },
  { icon: '🖐️', label: 'Cinq héroïnes, cinq fanbases en guerre' },
  { icon: '🎬', label: 'Le film (2022) conclut l\'histoire' },
]

const COVER = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/quintuplets/thumbnails/S01E01.jpg'

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(`${NS}_vp`) || '{}') } catch { return {} }
}
function saveProgress(p) {
  try { localStorage.setItem(`${NS}_vp`, JSON.stringify(p)) } catch {}
}

const CSS = `
  @keyframes ylFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes ylPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes ylFadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

  .yl-ep-card { content-visibility:auto; contain-intrinsic-size:0 260px; transition:transform .22s ease, box-shadow .22s ease, border-color .18s ease; cursor:pointer; }
  .yl-ep-card:hover { transform:translateY(-5px) scale(1.015) !important; box-shadow:0 18px 48px rgba(255,111,156,.20) !important; border-color:rgba(255,111,156,.45) !important; }
  .yl-ep-card:focus-visible { outline:2px solid ${COLOR}; outline-offset:3px; }
  .yl-play-btn { transition:transform .16s, opacity .16s, background .16s; }
  .yl-ep-card:hover .yl-play-btn { transform:scale(1.15) !important; opacity:1 !important; }
  .yl-cta { transition:background .18s, transform .14s, box-shadow .18s; }
  .yl-cta:hover { background:rgba(255,111,156,.22) !important; transform:translateY(-1px); box-shadow:0 8px 28px rgba(255,111,156,.25); }
  .yl-scroll { scrollbar-width:thin; scrollbar-color:rgba(255,111,156,.2) transparent; }
  .yl-scroll::-webkit-scrollbar { width:4px; }
  .yl-scroll::-webkit-scrollbar-thumb { background:rgba(255,111,156,.2); border-radius:4px; }
`

const EpCard = memo(function EpCard({ video, index, watched, onPlay }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <div className="yl-ep-card" role="button" tabIndex={0} onClick={onPlay} onKeyDown={e => e.key === 'Enter' && onPlay()}
      style={{ borderRadius:14, overflow:'hidden', background:'rgba(22,12,18,.92)', border:`1px solid ${watched ? 'rgba(255,111,156,.28)' : 'rgba(255,255,255,.07)'}`, animation:`ylFadeUp .3s ${index * 0.04}s ease-out both`, position:'relative' }}>
      <div style={{ position:'relative', paddingTop:'57%', background:'#140810', overflow:'hidden' }}>
        {video.thumbnail && !imgErr
          ? <img src={video.thumbnail} alt={video.title} loading="lazy" onError={() => setImgErr(true)}
              style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity: watched ? 0.5 : 0.82 }} />
          : <div style={{ position:'absolute',inset:0, background:`linear-gradient(135deg,rgba(255,111,156,.14),rgba(0,0,0,.9))`, display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontFamily:"'Pirata One',cursive", fontSize:40, fontWeight:900, color:`rgba(255,111,156,.30)`, lineHeight:1 }}>{video.episode}</span>
            </div>}
        <div style={{ position:'absolute',inset:'40% 0 0', background:'linear-gradient(180deg,transparent,rgba(0,0,0,.65))', pointerEvents:'none' }} />
        <div className="yl-play-btn" style={{ position:'absolute',inset:0, display:'flex',alignItems:'center',justifyContent:'center', opacity: watched ? 0.5 : 0.78 }}>
          <div style={{ width:40,height:40,borderRadius:'50%',background:`rgba(255,111,156,.82)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,backdropFilter:'blur(6px)',boxShadow:`0 4px 18px rgba(255,111,156,.45)` }}>▶</div>
        </div>
        {watched && <div style={{ position:'absolute',top:8,right:8, width:22,height:22,borderRadius:'50%',background:'rgba(52,211,153,.18)',border:'1px solid rgba(52,211,153,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#34d399',fontWeight:900 }}>✓</div>}
        <div style={{ position:'absolute',bottom:8,left:8, fontSize:9,fontWeight:800,background:'rgba(255,111,156,.18)',color:COLOR2,border:`1px solid rgba(255,111,156,.28)`,borderRadius:100,padding:'2px 7px' }}>{video.badge || 'VOSTFR'}</div>
      </div>
      <div style={{ padding:'10px 13px 13px' }}>
        <div style={{ fontSize:9.5,fontWeight:800,color:COLOR2,letterSpacing:'.1em',marginBottom:4 }}>{video.episodeLabel || `EPISODE ${video.episode}`}</div>
        <div style={{ fontSize:13.5,fontWeight:700,color:'#fff',lineHeight:1.28 }}>{video.title}</div>
      </div>
    </div>
  )
})

function InfoPanel({ watchedCount, total, lastWatchedIdx, onResume }) {
  const pct = total > 0 ? Math.round((watchedCount / total) * 100) : 0
  const nextVideo = VIDEOS[lastWatchedIdx] || VIDEOS[0]
  return (
    <aside style={{ position:'sticky', top:0, alignSelf:'start', display:'flex', flexDirection:'column', borderRadius:22, overflow:'hidden', background:'linear-gradient(180deg,rgba(26,14,22,.96),rgba(16,8,14,.99))', border:'1px solid rgba(255,111,156,.18)', boxShadow:'0 24px 70px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.04)', backdropFilter:'blur(20px)' }}>
      <div style={{ position:'relative', height:260, overflow:'hidden', flexShrink:0 }}>
        <img src={COVER} alt="The Quintessential Quintuplets" style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 20%',opacity:.72,filter:'saturate(1.15) brightness(.88)' }} />
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(26,14,22,.98) 100%)' }} />
        <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'0 18px 20px' }}>
          <div style={{ fontSize:9.5,fontWeight:800,letterSpacing:'.18em',color:COLOR2,textTransform:'uppercase',marginBottom:6 }}>💍 ROMANCE · COMÉDIE · QUINTUPLÉES</div>
          <h2 style={{ margin:0, fontFamily:"'Pirata One',cursive", fontSize:22,fontWeight:900,color:'#fff',lineHeight:1.0,letterSpacing:'-.01em',textShadow:'0 2px 20px rgba(0,0,0,.9)' }}>The Quintessential Quintuplets</h2>
          <div style={{ fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,marginTop:3 }}>Tezuka Productions · 2019</div>
        </div>
      </div>

      <div style={{ padding:'18px 18px 22px', display:'flex', flexDirection:'column', gap:18 }}>
        <div style={{ display:'flex',alignItems:'center',gap:14 }}>
          <ProgressRing pct={pct} posterSrc={COVER} color={COLOR} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12,fontWeight:800,color:'rgba(255,255,255,.65)',marginBottom:4 }}>{watchedCount} / {total} épisodes</div>
            <div style={{ height:5,borderRadius:999,background:'rgba(255,255,255,.07)',overflow:'hidden' }}>
              <div style={{ width:`${pct}%`,height:'100%',borderRadius:999,background:`linear-gradient(90deg,${COLOR},${COLOR2})`,boxShadow:`0 0 12px ${COLOR}55`,transition:'width .5s ease' }} />
            </div>
            <div style={{ fontSize:10,color:'rgba(255,255,255,.28)',fontWeight:600,marginTop:4 }}>{pct === 100 ? '✓ Terminé' : pct === 0 ? 'Pas encore commencé' : 'En cours de visionnage'}</div>
          </div>
        </div>

        <button className="yl-cta" onClick={onResume} style={{ width:'100%',padding:'11px 0',borderRadius:12, background:`rgba(255,111,156,.14)`,border:`1px solid rgba(255,111,156,.32)`, color:'#fff',cursor:'pointer',fontSize:13,fontWeight:800, display:'flex',alignItems:'center',justifyContent:'center',gap:8, fontFamily:'var(--body)' }}>
          <span style={{ fontSize:16 }}>▶</span>
          {pct === 0 ? 'Commencer' : pct === 100 ? 'Revoir depuis le début' : `Reprendre — Ép. ${nextVideo?.episode}`}
        </button>

        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          {[
            { label:'Épisodes', value:String(VIDEOS.length || 25), dot:COLOR2 },
            { label:'Statut', value:'S1 + S2 + Film', dot:'#34d399' },
            { label:'Audio', value:'VOSTFR', dot:'#fbbf24' },
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
          <p style={{ margin:0,fontSize:12.5,color:'rgba(255,255,255,.54)',lineHeight:1.72,fontStyle:'italic' }}>{SYNOPSIS}</p>
        </div>

        <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
          {TAGS.map(tag => (
            <span key={tag} style={{ fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:999,background:'rgba(255,111,156,.08)',border:'1px solid rgba(255,111,156,.2)',color:COLOR2 }}>{tag}</span>
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

export default function QuintupletsPage({ onClose }) {
  const [detailIdx, setDetailIdx] = useState(null)
  const [progress, setProgress]   = useState(loadProgress)
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

  const watchedCount = useMemo(() => VIDEOS.filter(v => progress[keyOf(v)]?.completed).length, [progress])
  const resumeIdx = useMemo(() => { const i = VIDEOS.findIndex(v => !progress[keyOf(v)]?.completed); return i >= 0 ? i : 0 }, [progress])
  const openDetail = useCallback((idx) => {
    setDetailIdx(idx)
    markWatched(idx)
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }))
  }, [markWatched])
  const playHandlers = useMemo(() => VIDEOS.map((_, i) => () => openDetail(i)), [openDetail])

  const total = VIDEOS.length
  // Groupe les épisodes par saison en conservant l'index global (pour playHandlers / EpisodeWatch).
  const seasonGroups = useMemo(() => {
    const order = [], byKey = {}
    VIDEOS.forEach((v, i) => {
      const s = v.season || '—'
      if (!byKey[s]) { byKey[s] = { season: s, items: [] }; order.push(byKey[s]) }
      byKey[s].items.push({ v, i })
    })
    return order
  }, [])

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position:'fixed',left:0,right:0,top:76,bottom:0,zIndex:500, background:'radial-gradient(circle at 18% 12%,rgba(255,111,156,.10),transparent 32rem),radial-gradient(circle at 84% 80%,rgba(120,150,255,.07),transparent 28rem),linear-gradient(135deg,#160a12 0%,#180c16 55%,#100810 100%)', display:'flex',flexDirection:'column' }}>
        <AnimeBackdrop motifs={ANIME_MOTIFS.kaguya} color={COLOR} color2={COLOR2} />
        {/* Navbar */}
        <div style={{ flexShrink:0,height:62,padding:'0 24px', display:'flex',alignItems:'center',justifyContent:'space-between', background:'rgba(22,10,18,.96)',backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,111,156,.10)',zIndex:10, position:'relative' }}>
          <button onClick={detailIdx !== null ? () => setDetailIdx(null) : onClose}
            style={{ display:'flex',alignItems:'center',gap:7,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.09)',borderRadius:10,color:'rgba(255,255,255,.72)',cursor:'pointer',padding:'8px 16px',fontSize:12.5,fontWeight:800,transition:'background .15s',fontFamily:'var(--body)' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.11)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,.06)'}>
            ← {detailIdx !== null ? 'Épisodes' : 'Retour'}
          </button>
          <div style={{ position:'absolute',left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:10 }}>
            <span style={{ fontSize:17,animation:'ylFloat 6s ease-in-out infinite' }}>💍</span>
            <span style={{ fontFamily:"'Pirata One',cursive",fontSize:17,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>
              {detailIdx !== null ? (VIDEOS[detailIdx]?.title || `Épisode ${VIDEOS[detailIdx]?.episode}`) : 'The Quintessential Quintuplets'}
            </span>
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <div style={{ fontSize:10.5,color:'rgba(255,255,255,.28)',fontWeight:700 }}>{watchedCount}/{total} vus</div>
            <div style={{ width:56,height:5,borderRadius:999,background:'rgba(255,255,255,.07)',overflow:'hidden' }}>
              <div style={{ width:`${total ? Math.round(watchedCount/total*100) : 0}%`,height:'100%',background:`linear-gradient(90deg,${COLOR},${COLOR2})`,borderRadius:999,transition:'width .4s' }} />
            </div>
          </div>
        </div>

        {/* Content */}
        {total === 0 ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px', textAlign:'center', color:'rgba(255,255,255,.5)', fontSize:14, lineHeight:1.7 }}>
            <div>
              <div style={{ fontSize:40, marginBottom:14 }}>💍</div>
              Les épisodes de <strong style={{ color:'#fff' }}>The Quintessential Quintuplets</strong> arrivent — mise en ligne en cours.<br />Reviens dans un petit moment 🌸
            </div>
          </div>
        ) : detailIdx !== null ? (
          <div ref={scrollRef} className="yl-scroll" style={{ flex:1,overflowY:'auto',padding:'24px 28px 48px' }}>
            <div style={{ maxWidth: 1760, margin: '0 auto' }}>
              <EpisodeWatch videos={VIDEOS} startIdx={detailIdx} ns={NS} storageKey={NS} color={COLOR} color2={COLOR2} tags={TAGS} animeSynopsis={SYNOPSIS} onSelect={openDetail} onClose={() => setDetailIdx(null)} />
            </div>
          </div>
        ) : (
          <div ref={scrollRef} className="yl-scroll" style={{ flex:1,overflowY:'auto',padding:'24px 28px 48px' }}>
            <style>{`
              .yl-layout { display:grid; grid-template-columns:310px minmax(0,1fr); gap:28px; max-width:1480px; margin:0 auto; align-items:start; }
              @media (max-width:900px) { .yl-layout { grid-template-columns:1fr; } }
            `}</style>
            <div className="yl-layout">
              <InfoPanel watchedCount={watchedCount} total={total} lastWatchedIdx={resumeIdx} onResume={() => openDetail(resumeIdx)} />
              <div>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
                  <div>
                    <h3 style={{ margin:'0 0 3px',fontSize:18,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>Épisodes</h3>
                    <div style={{ fontSize:11,color:'rgba(255,255,255,.32)',fontWeight:600 }}>S1 + S2 + Film · {total} épisodes · VOSTFR</div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:999,background:'rgba(255,111,156,.08)',border:'1px solid rgba(255,111,156,.18)' }}>
                    <div style={{ width:6,height:6,borderRadius:'50%',background:watchedCount===total?'#34d399':COLOR,animation:watchedCount<total&&watchedCount>0?'ylPulse 2s infinite':'none' }} />
                    <span style={{ fontSize:11,fontWeight:800,color:COLOR2 }}>{watchedCount === total ? '✓ Terminé' : watchedCount === 0 ? 'Pas commencé' : `${watchedCount}/${total} vus`}</span>
                  </div>
                </div>
                {seasonGroups.map((g, gi) => (
                  <div key={g.season} style={{ marginBottom: gi < seasonGroups.length - 1 ? 30 : 0 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:10,margin:'4px 0 14px' }}>
                      <h4 style={{ margin:0,fontSize:14,fontWeight:900,color:'#fff',letterSpacing:'.01em' }}>{SEASON_LABELS[g.season] || g.season}</h4>
                      <span style={{ fontSize:10.5,fontWeight:700,color:COLOR2,background:'rgba(255,111,156,.10)',border:'1px solid rgba(255,111,156,.20)',borderRadius:999,padding:'2px 9px' }}>{g.items.length} {g.season === 'Film' ? 'film' : 'épisodes'}</span>
                      <div style={{ flex:1,height:1,background:'linear-gradient(90deg,rgba(255,111,156,.18),transparent)' }} />
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
                      {g.items.map(({ v, i }) => (
                        <EpCard key={keyOf(v)} video={v} index={i} watched={!!progress[keyOf(v)]?.completed} onPlay={playHandlers[i]} />
                      ))}
                    </div>
                  </div>
                ))}

                <div style={{ marginTop:28,padding:'14px 18px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:10 }}>
                  <span style={{ fontSize:16 }}>💐</span>
                  <span style={{ fontSize:12,color:'rgba(255,255,255,.38)',fontWeight:600,lineHeight:1.5 }}>
                    The Quintessential Quintuplets (Gotoubun no Hanayome) — Tezuka Productions, 2019. 24 épisodes + le film (2022) : laquelle des cinq sœurs épousera Fūtarō ?
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
