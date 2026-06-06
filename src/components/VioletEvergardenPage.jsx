import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import VideoPlayer from './VideoPlayer.jsx'
import { ProgressRing } from './ProgressRing.jsx'
import AnimeBackdrop, { ANIME_MOTIFS } from './AnimeBackdrop.jsx'
import VIDEOS_RAW from '../data/violet-evergarden-videos.json'
import { getCachedSynopsis, fetchEpisodeSynopsis } from '../lib/episodeSynopsis.js'

// VOSTFR par défaut : on ne force RIEN ici. Le player applique la préférence
// sauvegardée du membre (par compte), et à défaut son défaut 'ja' (audio) +
// 'fr' (sous-titres) → japonais + sous-titres FR. Forcer 'fr' ici écrasait à la
// fois le défaut JA et le choix de chaque membre. Voir loadVideoPreferences().
const VIDEOS = VIDEOS_RAW

const COLOR  = '#8b7cff'
const COLOR2 = '#b8a8ff'
const NS     = 'violet-evergarden'

const SYNOPSIS = "Après une guerre qui lui a tout pris, Violet Evergarden — ancienne enfant-soldat — devient « poupée de souvenirs automatiques » et écrit des lettres pour ceux qui ne savent pas dire ce qu'ils ressentent. Au fil de ces rencontres, elle cherche à comprendre le sens des derniers mots que lui a confiés le major Gilbert : « Je t'aime »."

const TAGS = ['Drame', 'Tranche de vie', 'Romance', 'Guerre', 'Kyoto Animation']

const AWARDS = [
  { icon: '✉', label: 'Chef-d\'œuvre épistolaire' },
  { icon: '🎨', label: 'Animation Kyoto Animation' },
  { icon: '😢', label: 'Parmi les animes les plus émouvants' },
]

const COVER = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/violet-evergarden-thumbnails/Ep005.jpg'

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(`${NS}_vp`) || '{}') } catch { return {} }
}
function saveProgress(p) {
  try { localStorage.setItem(`${NS}_vp`, JSON.stringify(p)) } catch {}
}

const CSS = `
  @keyframes veFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes vePulse { 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes veFadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

  .ve-ep-card {
    content-visibility: auto;
    contain-intrinsic-size: 0 260px;
    transition: transform .22s ease, box-shadow .22s ease, border-color .18s ease;
    cursor: pointer;
  }
  .ve-ep-card:hover {
    transform: translateY(-5px) scale(1.015) !important;
    box-shadow: 0 18px 48px rgba(139,124,255,.20) !important;
    border-color: rgba(139,124,255,.45) !important;
  }
  .ve-ep-card:focus-visible { outline: 2px solid ${COLOR}; outline-offset: 3px; }

  .ve-play-btn { transition: transform .16s, opacity .16s, background .16s; }
  .ve-ep-card:hover .ve-play-btn { transform: scale(1.15) !important; opacity: 1 !important; }

  .ve-cta { transition: background .18s, transform .14s, box-shadow .18s; }
  .ve-cta:hover {
    background: rgba(139,124,255,.22) !important;
    transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(139,124,255,.25);
  }

  .ve-scroll { scrollbar-width: thin; scrollbar-color: rgba(139,124,255,.2) transparent; }
  .ve-scroll::-webkit-scrollbar { width: 4px; }
  .ve-scroll::-webkit-scrollbar-thumb { background: rgba(139,124,255,.2); border-radius: 4px; }
`



const EpCard = memo(function EpCard({ video, index, watched, onPlay }) {
  const [imgErr, setImgErr] = useState(false)
  const cardLabel = video.kind === 'film' ? 'FILM' : video.kind === 'ova' ? 'OAV' : `EPISODE ${video.episode}`
  const fallbackLabel = video.kind === 'ova' ? 'OAV' : video.kind === 'film' ? 'FILM' : video.episode
  return (
    <div className="ve-ep-card" role="button" tabIndex={0} onClick={onPlay} onKeyDown={e => e.key === 'Enter' && onPlay()}
      style={{ borderRadius: 14, overflow: 'hidden', background: 'rgba(14,12,24,.92)', border: `1px solid ${watched ? 'rgba(139,124,255,.28)' : 'rgba(255,255,255,.07)'}`, animation: `veFadeUp .3s ${index * 0.04}s ease-out both`, position: 'relative' }}>
      <div style={{ position: 'relative', paddingTop: '57%', background: '#0a0814', overflow: 'hidden' }}>
        {video.thumbnail && !imgErr
          ? <img src={video.thumbnail} alt={video.title} loading="lazy" onError={() => setImgErr(true)}
              style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity: watched ? 0.5 : 0.82 }} />
          : <div style={{ position:'absolute',inset:0, background:`linear-gradient(135deg,rgba(139,124,255,.14),rgba(0,0,0,.9))`, display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontFamily:"'Pirata One',cursive", fontSize:40, fontWeight:900, color:`rgba(139,124,255,.28)`, lineHeight:1 }}>{fallbackLabel}</span>
            </div>}
        <div style={{ position:'absolute',inset:'40% 0 0', background:'linear-gradient(180deg,transparent,rgba(0,0,0,.65))', pointerEvents:'none' }} />
        <div className="ve-play-btn" style={{ position:'absolute',inset:0, display:'flex',alignItems:'center',justifyContent:'center', opacity: watched ? 0.5 : 0.78 }}>
          <div style={{ width:40,height:40,borderRadius:'50%',background:`rgba(139,124,255,.82)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,backdropFilter:'blur(6px)',boxShadow:`0 4px 18px rgba(139,124,255,.45)` }}>▶</div>
        </div>
        {watched && <div style={{ position:'absolute',top:8,right:8, width:22,height:22,borderRadius:'50%',background:'rgba(52,211,153,.18)',border:'1px solid rgba(52,211,153,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#34d399',fontWeight:900 }}>✓</div>}
        <div style={{ position:'absolute',bottom:8,left:8, fontSize:9,fontWeight:800,background:'rgba(139,124,255,.18)',color:COLOR2,border:`1px solid rgba(139,124,255,.28)`,borderRadius:100,padding:'2px 7px' }}>{video.badge || 'VOSTFR'}</div>
      </div>
      <div style={{ padding:'10px 13px 13px' }}>
        <div style={{ fontSize:9.5,fontWeight:800,color:COLOR2,letterSpacing:'.1em',marginBottom:4 }}>{cardLabel}</div>
        <div style={{ fontSize:13.5,fontWeight:700,color:'#fff',lineHeight:1.28 }}>{video.title}</div>
      </div>
    </div>
  )
})

function InfoPanel({ watchedCount, total, lastWatchedIdx, onResume }) {
  const pct = total > 0 ? Math.round((watchedCount / total) * 100) : 0
  const nextVideo = VIDEOS[lastWatchedIdx] || VIDEOS[0]
  return (
    <aside style={{ position: 'sticky', top: 0, alignSelf: 'start', display: 'flex', flexDirection: 'column', borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(180deg,rgba(16,12,30,.96),rgba(10,8,20,.99))', border: '1px solid rgba(139,124,255,.18)', boxShadow: '0 24px 70px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.04)', backdropFilter: 'blur(20px)' }}>
      <div style={{ position:'relative', height:260, overflow:'hidden', flexShrink:0 }}>
        <img src={COVER} alt="Violet Evergarden" style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top',opacity:.72,filter:'saturate(1.15) brightness(.88)' }} />
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(16,12,30,.98) 100%)' }} />
        <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'0 18px 20px' }}>
          <div style={{ fontSize:9.5,fontWeight:800,letterSpacing:'.18em',color:COLOR2,textTransform:'uppercase',marginBottom:6 }}>✉ LETTRES · SOUVENIRS · ÉMOTION</div>
          <h2 style={{ margin:0, fontFamily:"'Pirata One',cursive", fontSize:22,fontWeight:900,color:'#fff',lineHeight:1.0,letterSpacing:'-.01em',textShadow:'0 2px 20px rgba(0,0,0,.9)' }}>Violet Evergarden</h2>
          <div style={{ fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600,marginTop:3 }}>Kyoto Animation · 2018</div>
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

        <button className="ve-cta" onClick={onResume} style={{ width:'100%',padding:'11px 0',borderRadius:12, background:`rgba(139,124,255,.14)`,border:`1px solid rgba(139,124,255,.32)`, color:'#fff',cursor:'pointer',fontSize:13,fontWeight:800, display:'flex',alignItems:'center',justifyContent:'center',gap:8, fontFamily:'var(--body)' }}>
          <span style={{ fontSize:16 }}>▶</span>
          {pct === 0 ? 'Commencer' : pct === 100 ? 'Revoir depuis le début' : `Reprendre — ${nextVideo?.title || `Ép. ${nextVideo?.episode}`}`}
        </button>

        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
          {[
            { label:'Épisodes', value:String(VIDEOS.filter(v=>!v.kind).length), dot:COLOR2 },
            { label:'OAV', value:String(VIDEOS.filter(v=>v.kind==='ova').length), dot:'#fbbf24' },
            { label:'Films', value:String(VIDEOS.filter(v=>v.kind==='film').length), dot:'#34d399' },
            { label:'Audio', value:'VF + VO', dot:'#f97316' },
            { label:'Note', value:'★ 8.6', dot:'#f97316' },
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
            <span key={tag} style={{ fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:999,background:'rgba(139,124,255,.08)',border:'1px solid rgba(139,124,255,.2)',color:COLOR2 }}>{tag}</span>
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

// Détail d'un épisode AFFICHÉ DANS LA PAGE (pas en plein écran) : visuel + infos +
// bouton Lecture. Le plein écran n'arrive qu'au clic sur Lecture.
const EP_NOTE = 8.7
function EpisodeDetailInline({ idx, onPlay, onClose }) {
  const video = VIDEOS[idx]
  const isFilm = video?.kind === 'film'
  const ep = video?.episode
  const label = isFilm ? (video?.episodeLabel || 'Film') : `Saison 1 · Épisode ${ep}`
  const title = video?.title && !/^episode\s/i.test(String(video.title)) ? video.title : (isFilm ? 'Violet Evergarden' : `Épisode ${ep}`)
  const [synopsis, setSynopsis] = useState(() => getCachedSynopsis(NS, ep) || video?.synopsis || '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (video?.synopsis) { setSynopsis(video.synopsis); setLoading(false); return }
    const cached = getCachedSynopsis(NS, ep)
    if (cached) { setSynopsis(cached); setLoading(false); return }
    let alive = true; setSynopsis(''); setLoading(true)
    fetchEpisodeSynopsis(NS, 'Violet Evergarden', ep).then(txt => { if (alive) { setSynopsis(txt || video?.synopsis || ''); setLoading(false) } })
    return () => { alive = false }
  }, [idx])

  return (
    <div className="ve-detail-inline" style={{
      display: 'grid', gridTemplateColumns: 'minmax(0,300px) minmax(0,1fr)', gap: 22, marginBottom: 26,
      borderRadius: 20, overflow: 'hidden', padding: 18,
      background: 'linear-gradient(135deg, rgba(139,124,255,.12), rgba(14,12,24,.82))',
      border: `1px solid rgba(139,124,255,.30)`,
      boxShadow: '0 20px 60px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06)',
      animation: 'veFadeUp .3s ease-out both', position: 'relative',
    }}>
      <style>{`@media (max-width:720px){ .ve-detail-inline { grid-template-columns: 1fr !important } }`}</style>
      {/* Visuel */}
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#0a0814', aspectRatio: '16/9' }}>
        {video?.thumbnail
          ? <img src={video.thumbnail} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,rgba(139,124,255,.18),rgba(0,0,0,.9))' }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 55%,rgba(0,0,0,.55))' }} />
        <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 9, fontWeight: 800, background: 'rgba(139,124,255,.22)', color: COLOR2, border: `1px solid rgba(139,124,255,.3)`, borderRadius: 100, padding: '2px 8px' }}>{video?.badge || 'VOSTFR'}</div>
      </div>

      {/* Infos */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '1.6px', textTransform: 'uppercase', color: COLOR2 }}>{isFilm ? 'Film' : 'Épisode'}</div>
          <button onClick={onClose} aria-label="Fermer le détail"
            style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}>✕</button>
        </div>
        <h3 style={{ margin: '6px 0 2px', fontFamily: "'Pirata One',cursive", fontSize: 'clamp(22px,2.6vw,32px)', fontWeight: 900, color: '#fff', lineHeight: 1.05 }}>{title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'rgba(255,255,255,.55)', fontWeight: 700, marginBottom: 10 }}>
          <span>{label}</span>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,.3)' }} />
          <span style={{ color: '#fbbf24' }}>★ <span style={{ color: '#fff' }}>{EP_NOTE}</span><span style={{ color: 'rgba(255,255,255,.4)' }}>/10</span></span>
        </div>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'rgba(255,255,255,.8)', flex: 1 }}>
          {synopsis || (loading ? 'Génération du synopsis…' : 'Synopsis indisponible pour le moment.')}
        </p>
        {synopsis && !video?.synopsis && <div style={{ marginTop: 5, fontSize: 9.5, color: 'rgba(255,255,255,.3)', fontWeight: 600 }}>✦ résumé généré par IA</div>}
        <button onClick={onPlay} className="ve-cta" style={{
          marginTop: 14, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 9,
          padding: '11px 24px', borderRadius: 13, cursor: 'pointer',
          background: `linear-gradient(135deg, ${COLOR}, ${COLOR2})`, border: `1px solid ${COLOR}`,
          color: '#fff', fontSize: 14, fontWeight: 900, letterSpacing: '.3px', boxShadow: `0 12px 34px rgba(139,124,255,.4)`,
        }}><span style={{ fontSize: 16 }}>▶</span> Lecture</button>
      </div>
    </div>
  )
}

// Bandeau d'endossement compact en bas de page.
function RecommendedBanner() {
  const Av = ({ icon, c }) => (
    <div style={{ width: 30, height: 30, borderRadius: '50%', background: `radial-gradient(circle at 30% 30%, ${c}, rgba(0,0,0,.4))`, border: `1.5px solid ${c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, boxShadow: `0 3px 10px ${c}55`, flexShrink: 0 }}>{icon}</div>
  )
  return (
    <div style={{
      marginTop: 22, borderRadius: 14, padding: '12px 18px', position: 'relative', overflow: 'hidden',
      display: 'inline-flex', alignItems: 'center', gap: 14, maxWidth: '100%',
      background: 'linear-gradient(120deg, rgba(229,86,74,.12), rgba(139,124,255,.14) 70%, rgba(14,12,24,.6))',
      border: '1px solid rgba(139,124,255,.28)',
    }}>
      <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '1.4px', textTransform: 'uppercase', color: COLOR2, flexShrink: 0 }}>★ Coup de cœur</span>
      <span style={{ fontSize: 13.5, fontWeight: 800, color: 'rgba(255,255,255,.9)' }}>
        Recommandé par <span style={{ color: COLOR2 }}>Freydiss</span> &amp; <span style={{ color: '#ff7a6b' }}>Hakuji</span>
      </span>
      <div style={{ display: 'flex', alignItems: 'center', marginLeft: 2 }}>
        <Av icon="👑" c={COLOR2} />
        <div style={{ marginLeft: -8 }}><Av icon="🔥" c="#ff7a6b" /></div>
      </div>
    </div>
  )
}

export default function VioletEvergardenPage({ onClose }) {
  const [playerIdx, setPlayerIdx] = useState(null)
  const [detailIdx, setDetailIdx] = useState(null)   // épisode dont la fiche est affichée DANS la page
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
  // Clic sur un épisode → on affiche sa fiche DANS la page (pas en plein écran),
  // et on remonte en haut pour la voir. La lecture plein écran n'arrive qu'au
  // bouton « Lecture » de la fiche.
  const openDetail = useCallback((idx) => {
    setDetailIdx(idx)
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }))
  }, [])
  const playHandlers = useMemo(() => VIDEOS.map((_, i) => () => openDetail(i)), [openDetail])

  const episodes = VIDEOS.map((v, i) => ({ v, i })).filter(x => !x.v.kind)
  const ovas = VIDEOS.map((v, i) => ({ v, i })).filter(x => x.v.kind === 'ova')
  const films = VIDEOS.map((v, i) => ({ v, i })).filter(x => x.v.kind === 'film')

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position:'fixed',left:0,right:0,top:76,bottom:0,zIndex:500, background:'radial-gradient(circle at 18% 12%,rgba(139,124,255,.10),transparent 32rem),radial-gradient(circle at 84% 80%,rgba(110,90,200,.08),transparent 28rem),linear-gradient(135deg,#0e0a1a 0%,#100c1c 55%,#0a0814 100%)', display:'flex',flexDirection:'column' }}>
        <AnimeBackdrop motifs={ANIME_MOTIFS.violet} color={COLOR} color2={COLOR2} />
        {/* Navbar */}
        <div style={{ flexShrink:0,height:62,padding:'0 24px', display:'flex',alignItems:'center',justifyContent:'space-between', background:'rgba(14,10,26,.96)',backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(139,124,255,.10)',zIndex:10, position:'relative' }}>
          <button onClick={playerIdx !== null ? () => setPlayerIdx(null) : onClose}
            style={{ display:'flex',alignItems:'center',gap:7,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.09)',borderRadius:10,color:'rgba(255,255,255,.72)',cursor:'pointer',padding:'8px 16px',fontSize:12.5,fontWeight:800,transition:'background .15s',fontFamily:'var(--body)' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.11)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,.06)'}>
            ← {playerIdx !== null ? 'Épisodes' : 'Retour'}
          </button>
          <div style={{ position:'absolute',left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:10 }}>
            <span style={{ fontSize:17,animation:'veFloat 6s ease-in-out infinite' }}>✉</span>
            <span style={{ fontFamily:"'Pirata One',cursive",fontSize:17,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>
              {playerIdx !== null ? (VIDEOS[playerIdx]?.title || (VIDEOS[playerIdx]?.kind === 'film' || VIDEOS[playerIdx]?.kind === 'ova' ? VIDEOS[playerIdx]?.episodeLabel || 'Special' : `Épisode ${VIDEOS[playerIdx]?.episode}`)) : 'Violet Evergarden'}
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
          <div ref={scrollRef} className="ve-scroll" style={{ flex:1,overflowY:'auto',padding:'24px 28px 48px' }}>
            <style>{`
              .ve-layout { display: grid; grid-template-columns: 310px minmax(0,1fr); gap: 28px; max-width: 1480px; margin: 0 auto; align-items: start; }
              @media (max-width: 900px) { .ve-layout { grid-template-columns: 1fr; } }
            `}</style>
            <div className="ve-layout">
              <InfoPanel watchedCount={watchedCount} total={VIDEOS.length} lastWatchedIdx={resumeIdx} onResume={() => openPlayer(resumeIdx)} />
              <div>
                {detailIdx !== null && (
                  <EpisodeDetailInline idx={detailIdx} onPlay={() => openPlayer(detailIdx)} onClose={() => setDetailIdx(null)} />
                )}
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
                  <div>
                    <h3 style={{ margin:'0 0 3px',fontSize:18,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>Épisodes</h3>
                    <div style={{ fontSize:11,color:'rgba(255,255,255,.32)',fontWeight:600 }}>Saison 1 · {episodes.length} épisodes · VF + VO</div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:999,background:'rgba(139,124,255,.08)',border:'1px solid rgba(139,124,255,.18)' }}>
                    <div style={{ width:6,height:6,borderRadius:'50%',background:watchedCount===VIDEOS.length?'#34d399':COLOR,animation:watchedCount<VIDEOS.length&&watchedCount>0?'vePulse 2s infinite':'none' }} />
                    <span style={{ fontSize:11,fontWeight:800,color:COLOR2 }}>{watchedCount === VIDEOS.length ? '✓ Terminé' : watchedCount === 0 ? 'Pas commencé' : `${watchedCount}/${VIDEOS.length} vus`}</span>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
                  {episodes.map(({ v, i }) => (
                    <EpCard key={keyOf(v)} video={v} index={i} watched={!!progress[keyOf(v)]?.completed} onPlay={playHandlers[i]} />
                  ))}
                </div>

                {ovas.length > 0 && (
                  <>
                    <h3 style={{ margin:'34px 0 16px',fontSize:18,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>OAV</h3>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
                      {ovas.map(({ v, i }) => (
                        <EpCard key={keyOf(v)} video={v} index={i} watched={!!progress[keyOf(v)]?.completed} onPlay={playHandlers[i]} />
                      ))}
                    </div>
                  </>
                )}

                {films.length > 0 && (
                  <>
                    <h3 style={{ margin:'34px 0 16px',fontSize:18,fontWeight:900,color:'#fff',letterSpacing:'-.01em' }}>Films 🎬</h3>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
                      {films.map(({ v, i }) => (
                        <EpCard key={keyOf(v)} video={v} index={i} watched={!!progress[keyOf(v)]?.completed} onPlay={playHandlers[i]} />
                      ))}
                    </div>
                  </>
                )}

                <div style={{ marginTop:28,padding:'14px 18px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:10 }}>
                  <span style={{ fontSize:16 }}>✉</span>
                  <span style={{ fontSize:12,color:'rgba(255,255,255,.38)',fontWeight:600,lineHeight:1.5 }}>
                    Violet Evergarden est une production Kyoto Animation (2018), réputée pour son animation d'une beauté rare et son émotion bouleversante.
                  </span>
                </div>

                <RecommendedBanner />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
