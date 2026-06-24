import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { ProgressRing } from './ProgressRing.jsx'
import AnimeBackdrop, { ANIME_MOTIFS } from './AnimeBackdrop.jsx'
import VIDEOS_RAW from '../data/kaguya-videos.json'
import EpisodeWatch from './EpisodeWatch.jsx'

// VOSTFR : le player applique la préférence du membre (défaut ja + sous-titres fr).
const VIDEOS = VIDEOS_RAW

const COLOR  = '#ef4565'
const COLOR2 = '#ffb3c1'
const NS     = 'kaguya'

const SYNOPSIS = "À l'académie Shuchiin, Kaguya Shinomiya et Miyuki Shirogane, les deux têtes du conseil des élèves, sont fous amoureux l'un de l'autre… mais leur fierté leur interdit de se déclarer en premier. Commence alors une guerre psychologique hilarante où chaque conversation devient une bataille : celui qui avoue a perdu. L'amour est une guerre — et le génie ne protège de rien."

const TAGS = ['Comédie', 'Romance', 'Psychologique', 'École', 'A-1 Pictures']

const AWARDS = [
  { icon: '🏹', label: "L'une des meilleures comédies romantiques" },
  { icon: '🧠', label: 'Guerre psychologique de génies' },
  { icon: '🎀', label: 'Chika Fujiwara, agent du chaos' },
]

const COVER = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/kaguya/thumbnails/S01E01.jpg'

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(`${NS}_vp`) || '{}') } catch { return {} }
}
function saveProgress(p) {
  try { localStorage.setItem(`${NS}_vp`, JSON.stringify(p)) } catch {}
}

const CSS = `
  @keyframes kgFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes kgPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes kgFadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

  .kg-ep-card { content-visibility:auto; contain-intrinsic-size:0 260px; transition:transform .22s ease, box-shadow .22s ease, border-color .18s ease; cursor:pointer; }
  .kg-ep-card:hover { transform:translateY(-5px) scale(1.015) !important; box-shadow:0 18px 48px rgba(239,69,101,.20) !important; border-color:rgba(239,69,101,.45) !important; }
  .kg-ep-card:focus-visible { outline:2px solid ${COLOR}; outline-offset:3px; }
  .kg-play-btn { transition:transform .16s, opacity .16s, background .16s; }
  .kg-ep-card:hover .kg-play-btn { transform:scale(1.15) !important; opacity:1 !important; }
  .kg-cta { transition:background .18s, transform .14s, box-shadow .18s; }
  .kg-cta:hover { background:rgba(239,69,101,.22) !important; transform:translateY(-1px); box-shadow:0 8px 28px rgba(239,69,101,.25); }
  .kg-scroll { scrollbar-width:thin; scrollbar-color:rgba(239,69,101,.2) transparent; }
  .kg-scroll::-webkit-scrollbar { width:4px; }
  .kg-scroll::-webkit-scrollbar-thumb { background:rgba(239,69,101,.2); border-radius:4px; }
`

const EpCard = memo(function EpCard({ video, index, watched, onPlay }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <div className="kg-ep-card" role="button" tabIndex={0} onClick={onPlay} onKeyDown={e => e.key === 'Enter' && onPlay()}
      style={{ borderRadius:14, overflow:'hidden', background:'rgba(24,10,14,.92)', border:`1px solid ${watched ? 'rgba(239,69,101,.28)' : 'rgba(255,255,255,.07)'}`, animation:`kgFadeUp .3s ${Math.min(index, 12) * 0.04}s ease-out both`, position:'relative' }}>
      <div style={{ position:'relative', paddingTop:'57%', background:'#160810', overflow:'hidden' }}>
        {video.thumbnail && !imgErr
          ? <img src={video.thumbnail} alt={video.title} loading="lazy" onError={() => setImgErr(true)}
              style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity: watched ? 0.5 : 0.82 }} />
          : <div style={{ position:'absolute',inset:0, background:`linear-gradient(135deg,rgba(239,69,101,.14),rgba(0,0,0,.9))`, display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontFamily:"'Pirata One',cursive", fontSize:40, fontWeight:900, color:`rgba(239,69,101,.30)`, lineHeight:1 }}>{video.episode}</span>
            </div>}
        <div style={{ position:'absolute',inset:'40% 0 0', background:'linear-gradient(180deg,transparent,rgba(0,0,0,.65))', pointerEvents:'none' }} />
        <div className="kg-play-btn" style={{ position:'absolute',inset:0, display:'flex',alignItems:'center',justifyContent:'center', opacity: watched ? 0.5 : 0.78 }}>
          <div style={{ width:40,height:40,borderRadius:'50%',background:`rgba(239,69,101,.82)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,backdropFilter:'blur(6px)',boxShadow:`0 4px 18px rgba(239,69,101,.45)` }}>▶</div>
        </div>
        {watched && <div style={{ position:'absolute',top:8,right:8, width:22,height:22,borderRadius:'50%',background:'rgba(52,211,153,.18)',border:'1px solid rgba(52,211,153,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#34d399',fontWeight:900 }}>✓</div>}
        <div style={{ position:'absolute',bottom:8,left:8, fontSize:9,fontWeight:800,background:'rgba(239,69,101,.18)',color:COLOR2,border:`1px solid rgba(239,69,101,.28)`,borderRadius:100,padding:'2px 7px' }}>{video.badge || 'VOSTFR'}</div>
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
    <aside className="anime-infopanel" style={{ position:'sticky', top:0, alignSelf:'start', display:'flex', flexDirection:'column', borderRadius:22, overflow:'hidden', background:'linear-gradient(180deg,rgba(28,12,18,.96),rgba(18,8,12,.99))', border:'1px solid rgba(239,69,101,.18)', boxShadow:'0 24px 70px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.04)', backdropFilter:'blur(20px)' }}>
      <div style={{ position:'relative', height:260, overflow:'hidden', flexShrink:0 }}>
        <img loading="lazy" decoding="async" src={COVER} alt="Kaguya-sama: Love is War" style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 20%',opacity:.72,filter:'saturate(1.15) brightness(.88)' }} />
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(28,12,18,.98) 100%)' }} />
        <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'0 18px 20px' }}>
          <div style={{ fontSize:9.5,fontWeight:800,letterSpacing:'.18em',color:COLOR2,textTransform:'uppercase',marginBottom:6 }}>🏹 L'AMOUR EST UNE GUERRE</div>
          <h2 style={{ margin:0, fontFamily:"'Pirata One',cursive", fontSize:22,fontWeight:900,color:'#fff',lineHeight:1.0,letterSpacing:'-.01em',textShadow:'0 2px 20px rgba(0,0,0,.9)' }}>Kaguya-sama: Love is War</h2>
          <div style={{ fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,marginTop:3 }}>A-1 Pictures · 2019-2022</div>
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

        <button className="kg-cta" onClick={onResume} style={{ width:'100%',padding:'11px 0',borderRadius:12, background:`rgba(239,69,101,.14)`,border:`1px solid rgba(239,69,101,.32)`, color:'#fff',cursor:'pointer',fontSize:13,fontWeight:800, display:'flex',alignItems:'center',justifyContent:'center',gap:8, fontFamily:'var(--body)' }}>
          <span style={{ fontSize:16 }}>▶</span>
          {pct === 0 ? 'Commencer' : pct === 100 ? 'Revoir depuis le début' : `Reprendre — ${nextVideo?.episodeLabel || ''}`}
        </button>

        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          {[
            { label:'Épisodes', value:'37 + Film + OVA', dot:COLOR2 },
            { label:'Statut', value:'3 saisons', dot:'#34d399' },
            { label:'Audio', value:'VOSTFR', dot:'#fbbf24' },
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
            <span key={tag} style={{ fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:999,background:'rgba(239,69,101,.08)',border:'1px solid rgba(239,69,101,.2)',color:COLOR2 }}>{tag}</span>
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

export default function KaguyaPage({ onClose }) {
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

  // Groupes par arc (Saison 1/2/3, Film, OVA) dans l'ordre des épisodes
  const groups = useMemo(() => {
    const out = []
    for (let i = 0; i < VIDEOS.length; i++) {
      const arc = VIDEOS[i].arc || 'Épisodes'
      if (!out.length || out[out.length - 1].arc !== arc) out.push({ arc, items: [] })
      out[out.length - 1].items.push(i)
    }
    return out
  }, [])

  const total = VIDEOS.length

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position:'fixed',left:0,right:0,top:76,bottom:0,zIndex:500, background:'radial-gradient(circle at 18% 12%,rgba(239,69,101,.10),transparent 32rem),radial-gradient(circle at 84% 80%,rgba(255,179,193,.06),transparent 28rem),linear-gradient(135deg,#180a10 0%,#1a0c12 55%,#12080c 100%)', display:'flex',flexDirection:'column' }}>
        <AnimeBackdrop motifs={ANIME_MOTIFS.kaguya} color={COLOR} color2={COLOR2} />
        {/* Navbar */}
        <div style={{ flexShrink:0,height:62,padding:'0 24px', display:'flex',alignItems:'center',justifyContent:'space-between', background:'rgba(24,10,16,.96)',backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(239,69,101,.10)',zIndex:10, position:'relative' }}>
          <button onClick={detailIdx !== null ? () => setDetailIdx(null) : onClose}
            style={{ display:'flex',alignItems:'center',gap:7,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.09)',borderRadius:10,color:'rgba(255,255,255,.72)',cursor:'pointer',padding:'8px 16px',fontSize:12.5,fontWeight:800,transition:'background .15s',fontFamily:'var(--body)' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.11)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,.06)'}>
            ← {detailIdx !== null ? 'Épisodes' : 'Retour'}
          </button>
          <div style={{ position:'absolute',left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:10 }}>
            <span style={{ fontSize:17,animation:'kgFloat 6s ease-in-out infinite' }}>🏹</span>
            <span style={{ fontFamily:"'Pirata One',cursive",fontSize:17,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>
              {detailIdx !== null ? (VIDEOS[detailIdx]?.title || `Épisode ${VIDEOS[detailIdx]?.episode}`) : 'Kaguya-sama: Love is War'}
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
              <div style={{ fontSize:40, marginBottom:14 }}>🏹</div>
              Les épisodes de <strong style={{ color:'#fff' }}>Kaguya-sama</strong> arrivent — mise en ligne en cours.<br />Reviens dans un petit moment 🎀
            </div>
          </div>
        ) : detailIdx !== null ? (
          <div ref={scrollRef} className="kg-scroll" style={{ flex:1,overflowY:'auto',padding:'24px 28px 48px' }}>
            <div style={{ maxWidth: 1760, margin: '0 auto' }}>
              <EpisodeWatch videos={VIDEOS} startIdx={detailIdx} ns={NS} storageKey={NS} color={COLOR} color2={COLOR2} tags={TAGS} animeSynopsis={SYNOPSIS} onSelect={openDetail} onClose={() => setDetailIdx(null)} />
            </div>
          </div>
        ) : (
          <div ref={scrollRef} className="kg-scroll" style={{ flex:1,overflowY:'auto',padding:'24px 28px 48px' }}>
            <style>{`
              .kg-layout { display:grid; grid-template-columns:310px minmax(0,1fr); gap:28px; max-width:1480px; margin:0 auto; align-items:start; }
              @media (max-width:900px) { .kg-layout { grid-template-columns:1fr; } }
              @media (max-width:900px) { .anime-infopanel { position:static !important; } }
            `}</style>
            <div className="kg-layout">
              <InfoPanel watchedCount={watchedCount} total={total} lastWatchedIdx={resumeIdx} onResume={() => openDetail(resumeIdx)} />
              <div>
                {groups.map((g, gi) => (
                  <div key={g.arc} style={{ marginBottom: 30 }}>
                    {/* Liseré de séparation entre les saisons */}
                    {gi > 0 && (
                      <div aria-hidden style={{ height:1, margin:'0 0 26px', background:`linear-gradient(90deg, ${COLOR}66, rgba(255,255,255,.08) 45%, transparent 90%)` }} />
                    )}
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div aria-hidden style={{ width:4, height:34, borderRadius:2, background:`linear-gradient(180deg, ${COLOR}, ${COLOR2})`, boxShadow:`0 0 12px ${COLOR}55` }} />
                        <div>
                          <h3 style={{ margin:'0 0 3px',fontSize:18,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>{g.arc}</h3>
                          <div style={{ fontSize:11,color:'rgba(255,255,255,.32)',fontWeight:600 }}>{g.items.length} épisode{g.items.length > 1 ? 's' : ''} · VOSTFR</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
                      {g.items.map(i => (
                        <EpCard key={keyOf(VIDEOS[i])} video={VIDEOS[i]} index={i} watched={!!progress[keyOf(VIDEOS[i])]?.completed} onPlay={() => openDetail(i)} />
                      ))}
                    </div>
                  </div>
                ))}

                <div style={{ marginTop:6,padding:'14px 18px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:10 }}>
                  <span style={{ fontSize:16 }}>🎀</span>
                  <span style={{ fontSize:12,color:'rgba(255,255,255,.38)',fontWeight:600,lineHeight:1.5 }}>
                    Kaguya-sama: Love is War — A-1 Pictures. 3 saisons, le film First Kiss et l'OVA : la guerre des aveux dans son intégralité.
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
