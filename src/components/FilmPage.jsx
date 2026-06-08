// Page de visionnage d'un film standalone (Bubble, Reze…) — overlay plein écran
// léger qui réutilise EpisodeWatch (lecteur + audio VF/VOSTFR + sous-titres).
import { useEffect } from 'react'
import EpisodeWatch from './EpisodeWatch.jsx'
import AnimeBackdrop from './AnimeBackdrop.jsx'
import FILMS from '../data/films-videos.json'

// Accent par film (matche la carte de l'AnimeHub) — fini le doré générique.
const FILM_COLORS = {
  bubble: ['#5ec8e0', '#9be3f0'],
  reze:   ['#e0524a', '#ff8a7a'],
}
// Motifs flottants du fond animé (comme Vivy/Violet) par film
const FILM_MOTIFS = {
  bubble: ['🫧', '💧', '🌊', '✨'],
  reze:   ['🔪', '💥', '🩸', '☔'],
}
const SLUG_TO_KEY = { bubble: 'film-bubble', reze: 'film-reze' }

export default function FilmPage({ slug = 'bubble', onClose }) {
  const film = FILMS.find(f => f.progressKey === SLUG_TO_KEY[slug]) || FILMS.find(f => (f.title || '').toLowerCase().includes(slug)) || FILMS[0]
  const [COLOR, COLOR2] = FILM_COLORS[slug] || ['#bfa46a', '#e8c878']

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  if (!film) return null

  return (
    <div style={{ position:'fixed', left:0, right:0, top:76, bottom:0, zIndex:500, overflow:'hidden',
      background:`radial-gradient(circle at 18% 12%, ${COLOR}29, transparent 34rem), radial-gradient(circle at 84% 84%, ${COLOR2}1e, transparent 30rem), linear-gradient(135deg,#0a0b12 0%,#0a0b10 55%,#070709 100%)`,
      display:'flex', flexDirection:'column' }}>

      {/* Fond animé thématique (auroras + motifs flottants) — comme Vivy/Violet */}
      <AnimeBackdrop motifs={FILM_MOTIFS[slug] || ['✨']} color={COLOR} color2={COLOR2} count={14} />

      {/* Navbar */}
      <div style={{ flexShrink:0, height:62, padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'rgba(8,9,13,.96)', backdropFilter:'blur(24px)', borderBottom:`1px solid ${COLOR}1f`, position:'relative', zIndex:10 }}>
        <button onClick={onClose}
          style={{ display:'flex', alignItems:'center', gap:7, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.09)',
            borderRadius:10, color:'rgba(255,255,255,.72)', cursor:'pointer', padding:'8px 16px', fontSize:12.5, fontWeight:800, fontFamily:'var(--body)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.11)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}>
          ← Retour
        </button>
        <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:16 }}>🎬</span>
          <span style={{ fontSize:16, fontWeight:900, color:'#fff', letterSpacing:'-.01em', whiteSpace:'nowrap' }}>{film.title}</span>
        </div>
        <span style={{ fontSize:10.5, fontWeight:800, color:COLOR2, background:`${COLOR}1a`,
          border:`1px solid ${COLOR}40`, borderRadius:100, padding:'4px 11px', whiteSpace:'nowrap' }}>
          FILM · {film.badge || 'MULTI'}
        </span>
      </div>

      {/* Lecteur */}
      <div style={{ flex:1, overflowY:'auto', padding:'24px 28px 48px' }}>
        <div style={{ maxWidth:1760, margin:'0 auto' }}>
          <EpisodeWatch videos={[film]} startIdx={0} ns={`film-${slug}`} storageKey={`film-${slug}`}
            color={COLOR} color2={COLOR2} animeSynopsis={film.synopsis || ''} onSelect={() => {}} onClose={onClose} />
        </div>
      </div>
    </div>
  )
}
