// Page de visionnage d'un film standalone (Bubble, Reze…) — overlay plein écran
// léger qui réutilise EpisodeWatch (lecteur + audio VF/VOSTFR + sous-titres).
import { useEffect } from 'react'
import EpisodeWatch from './EpisodeWatch.jsx'
import FILMS from '../data/films-videos.json'

const COLOR = '#bfa46a', COLOR2 = '#e8c878'
const SLUG_TO_KEY = { bubble: 'film-bubble', reze: 'film-reze' }

export default function FilmPage({ slug = 'bubble', onClose }) {
  const film = FILMS.find(f => f.progressKey === SLUG_TO_KEY[slug]) || FILMS.find(f => (f.title || '').toLowerCase().includes(slug)) || FILMS[0]

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  if (!film) return null

  return (
    <div style={{ position:'fixed', left:0, right:0, top:76, bottom:0, zIndex:500,
      background:'radial-gradient(circle at 20% 12%, rgba(191,164,106,.08), transparent 32rem), linear-gradient(135deg,#0a0b10 0%,#08090d 55%,#070709 100%)',
      display:'flex', flexDirection:'column' }}>

      {/* Navbar */}
      <div style={{ flexShrink:0, height:62, padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'rgba(8,9,13,.96)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(191,164,106,.12)', position:'relative', zIndex:10 }}>
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
        <span style={{ fontSize:10.5, fontWeight:800, color:COLOR2, background:'rgba(191,164,106,.1)',
          border:'1px solid rgba(191,164,106,.25)', borderRadius:100, padding:'4px 11px', whiteSpace:'nowrap' }}>
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
