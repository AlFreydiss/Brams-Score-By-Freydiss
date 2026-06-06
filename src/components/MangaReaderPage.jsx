// Lecteur de scans générique multi-manga (les scans hors One Piece).
// Charge src/data/manga/<slug>.json à la demande. Liste des chapitres + lecture
// verticale (webtoon) + progression par chapitre (localStorage).
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Navbar from './Navbar.jsx'

const MANGA_JSON = import.meta.glob('../data/manga/*.json')

function loadProgress(slug) {
  try { return JSON.parse(localStorage.getItem(`manga_progress_${slug}`) || '{}') } catch { return {} }
}
function saveProgress(slug, p) {
  try { localStorage.setItem(`manga_progress_${slug}`, JSON.stringify(p)) } catch {}
}

export default function MangaReaderPage({ slug, title, color = '#8b5cf6', onClose }) {
  const [chapters, setChapters] = useState(null)
  const [error, setError] = useState(false)
  const [reading, setReading] = useState(null)   // chapitre en lecture (objet) ou null
  const [progress, setProgress] = useState(() => loadProgress(slug))
  const [query, setQuery] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    const key = `../data/manga/${slug}.json`
    const loader = MANGA_JSON[key]
    if (!loader) { setError(true); return }
    let alive = true
    loader().then(m => { if (alive) setChapters(Array.isArray(m.default) ? m.default : []) }).catch(() => alive && setError(true))
    return () => { alive = false }
  }, [slug])

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') { reading ? setReading(null) : onClose?.() } }
    window.addEventListener('keydown', fn)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', fn); document.body.style.overflow = '' }
  }, [reading, onClose])

  const markRead = useCallback((num) => {
    setProgress(prev => { const next = { ...prev, [num]: 'read' }; saveProgress(slug, next); return next })
  }, [slug])

  const openChapter = useCallback((ch) => {
    setReading(ch); markRead(ch.num)
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0 }))
  }, [markRead])

  const readCount = useMemo(() => chapters ? chapters.filter(c => progress[c.num] === 'read').length : 0, [chapters, progress])
  const filtered = useMemo(() => {
    if (!chapters) return []
    const q = query.trim().toLowerCase()
    if (!q) return chapters
    return chapters.filter(c => String(c.num).includes(q) || (c.title || '').toLowerCase().includes(q))
  }, [chapters, query])

  const idxOf = (num) => chapters.findIndex(c => c.num === num)
  const goRel = (delta) => {
    if (!reading) return
    const i = idxOf(reading.num) + delta
    if (i >= 0 && i < chapters.length) openChapter(chapters[i])
  }

  const C2 = color + 'cc'

  return (
    <div style={{ position:'fixed', inset:0, top:0, zIndex:100, background:'#08070c', display:'flex', flexDirection:'column' }}>
      <Navbar forceScrolled />
      <style>{`.mr-scroll::-webkit-scrollbar{width:7px}.mr-scroll::-webkit-scrollbar-thumb{background:${color}66;border-radius:6px}`}</style>

      {/* Barre */}
      <div style={{ flexShrink:0, height:56, padding:'0 18px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, background:'rgba(12,10,18,.95)', borderBottom:`1px solid ${color}22`, position:'relative', zIndex:10 }}>
        <button onClick={reading ? () => setReading(null) : onClose}
          style={{ display:'flex', alignItems:'center', gap:7, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, color:'rgba(255,255,255,.75)', cursor:'pointer', padding:'7px 14px', fontSize:12.5, fontWeight:800 }}>
          ← {reading ? 'Chapitres' : 'Retour'}
        </button>
        <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', fontFamily:"'Pirata One',cursive", fontSize:18, fontWeight:900, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'50%' }}>
          {reading ? `Ch. ${reading.num}${reading.title ? ' — ' + reading.title : ''}` : (title || 'Scans')}
        </div>
        {!reading && chapters && <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', fontWeight:700 }}>{readCount}/{chapters.length} lus</div>}
        {reading && <div style={{ display:'flex', gap:6 }}>
          <button onClick={() => goRel(-1)} disabled={idxOf(reading.num)===0} style={{ padding:'5px 12px', borderRadius:9, border:`1px solid ${color}44`, background:`${color}18`, color, cursor:'pointer', fontSize:12, fontWeight:700, opacity:idxOf(reading.num)===0?.4:1 }}>← Préc.</button>
          <button onClick={() => goRel(1)} disabled={idxOf(reading.num)===chapters.length-1} style={{ padding:'5px 12px', borderRadius:9, border:`1px solid ${color}44`, background:`${color}18`, color, cursor:'pointer', fontSize:12, fontWeight:700, opacity:idxOf(reading.num)===chapters.length-1?.4:1 }}>Suiv. →</button>
        </div>}
      </div>

      {/* Contenu */}
      {error ? (
        <div style={{ flex:1, display:'grid', placeItems:'center', color:'rgba(255,255,255,.5)', fontSize:14, padding:24, textAlign:'center' }}>Scans indisponibles pour le moment.</div>
      ) : !chapters ? (
        <div style={{ flex:1, display:'grid', placeItems:'center', color:'rgba(255,255,255,.5)', fontSize:14 }}>Chargement des chapitres…</div>
      ) : reading ? (
        <div ref={scrollRef} className="mr-scroll" style={{ flex:1, overflowY:'auto', background:'#000' }}>
          <div style={{ maxWidth:900, margin:'0 auto', display:'flex', flexDirection:'column' }}>
            {reading.pages.map((src, i) => (
              <img key={i} src={src} alt={`Page ${i+1}`} loading="lazy" style={{ width:'100%', display:'block' }} />
            ))}
          </div>
          <div style={{ padding:'30px 20px 60px', textAlign:'center' }}>
            <button onClick={() => goRel(1)} disabled={idxOf(reading.num)===chapters.length-1}
              style={{ padding:'12px 28px', borderRadius:12, border:'none', cursor:'pointer', background:`linear-gradient(135deg, ${color}, ${C2})`, color:'#fff', fontSize:14, fontWeight:900, opacity:idxOf(reading.num)===chapters.length-1?.4:1 }}>
              Chapitre suivant →
            </button>
          </div>
        </div>
      ) : (
        <div className="mr-scroll" style={{ flex:1, overflowY:'auto', padding:'20px 24px 48px' }}>
          <div style={{ maxWidth:1100, margin:'0 auto' }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un chapitre…"
              style={{ width:'100%', maxWidth:340, padding:'10px 14px', borderRadius:11, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.12)', color:'#fff', fontSize:13, outline:'none', marginBottom:18 }} />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10 }}>
              {filtered.map(ch => {
                const isRead = progress[ch.num] === 'read'
                return (
                  <button key={ch.num} onClick={() => openChapter(ch)}
                    style={{ textAlign:'left', padding:'12px 13px', borderRadius:12, cursor:'pointer',
                      background: isRead ? 'rgba(255,255,255,.02)' : `${color}12`,
                      border: `1px solid ${isRead ? 'rgba(255,255,255,.06)' : color+'33'}`,
                      transition:'transform .14s, border-color .14s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor=color+'66' }}
                    onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.borderColor=isRead?'rgba(255,255,255,.06)':color+'33' }}>
                    <div style={{ fontSize:9, fontWeight:800, letterSpacing:'.08em', textTransform:'uppercase', color: isRead ? 'rgba(255,255,255,.35)' : color, marginBottom:3 }}>Chapitre {ch.num}{isRead ? ' · lu' : ''}</div>
                    <div style={{ fontSize:12.5, fontWeight:700, color: isRead ? 'rgba(255,255,255,.5)' : '#fff', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ch.title || `Chapitre ${ch.num}`}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
