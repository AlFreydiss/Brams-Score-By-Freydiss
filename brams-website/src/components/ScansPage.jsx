import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import CHAPTERS_DATA from '../data/chapters-data.json'
import { Reader } from './MangaReader.jsx'

// ── Données ───────────────────────────────────────────────────────────────────

const EMOJIS = ['🏴‍☠️','⚔️','📜','💥','🌊','🔥','👑','🌀','🛡️','⚡','🌋','🗡️','☀️','🔴','🏔️','🤝','💰','⛈️','🎯','🌸','💎','🌑','⚕️','💫','🌺','🦁','⚓']

const CHAPTERS = CHAPTERS_DATA.map((ch, i) => ({
  num:   ch.num,
  title: ch.title || `Chapitre ${ch.num}`,
  emoji: EMOJIS[i % EMOJIS.length],
  pages: ch.pages,
}))

const ARCS = [
  { name: 'Wano',    range: [909,  1057], emoji: '⛩️', color: '#e17055' },
  { name: 'Egghead', range: [1058, 1125], emoji: '🤖', color: '#74b9ff' },
  { name: 'Elbaf',   range: [1127, 1182], emoji: '⚔️', color: '#e0524a', current: true },
]

const PER_PAGE = 40

// ── Helpers localStorage ──────────────────────────────────────────────────────

function loadProgress() {
  try { return JSON.parse(localStorage.getItem('manga_progress') || '{}') } catch { return {} }
}
function saveProgressLS(p) {
  try { localStorage.setItem('manga_progress', JSON.stringify(p)) } catch {}
}
function loadLastRead() {
  try { return parseInt(localStorage.getItem('manga_last_read') || '0') || null } catch { return null }
}

// ── Pagination helper ─────────────────────────────────────────────────────────

function PaginationBar({ page, total, onChange }) {
  if (total <= 1) return null
  const pages = []
  const delta = 2
  const left  = page - delta
  const right = page + delta

  pages.push(1)
  if (left > 2) pages.push('…')
  for (let i = Math.max(2, left); i <= Math.min(total - 1, right); i++) pages.push(i)
  if (right < total - 1) pages.push('…')
  if (total > 1) pages.push(total)

  const btn = (label, target, active = false, disabled = false) => (
    <button
      key={`${label}-${target}`}
      disabled={disabled || label === '…'}
      onClick={() => typeof target === 'number' && onChange(target)}
      style={{
        minWidth: 36, height: 36, borderRadius: 8, border: 'none',
        background: active ? 'var(--accent)' : label === '…' ? 'transparent' : 'rgba(255,255,255,0.06)',
        color: active ? '#fff' : disabled ? 'rgba(255,255,255,0.2)' : label === '…' ? 'var(--muted)' : '#fff',
        cursor: label === '…' || disabled ? 'default' : 'pointer',
        fontFamily: 'var(--body)', fontSize: 13, fontWeight: active ? 700 : 500,
        transition: 'background 0.15s',
        padding: '0 6px',
      }}
      onMouseEnter={e => { if (!active && label !== '…' && !disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
      onMouseLeave={e => { if (!active && label !== '…' && !disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
    >{label}</button>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
      {btn('←', page - 1, false, page === 1)}
      {pages.map((p, i) => btn(p, p, p === page))}
      {btn('→', page + 1, false, page === total)}
    </div>
  )
}

// ── Sidebar arcs ──────────────────────────────────────────────────────────────

function Sidebar({ open, onClose, progress, onJumpArc, chapters }) {
  const readCount = ch => chapters.filter(c => c.num >= ch.range[0] && c.num <= ch.range[1] && progress[c.num] === 'read').length
  const total     = ch => Math.min(chapters.filter(c => c.num >= ch.range[0] && c.num <= ch.range[1]).length, ch.range[1] - ch.range[0] + 1)

  return (
    <>
      {open && <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:510, background:'rgba(0,0,0,0.5)' }} />}
      <div style={{
        position:'fixed', left:0, top:0, bottom:0, width:260, zIndex:520,
        background:'rgba(14,14,16,0.98)', backdropFilter:'blur(20px)',
        borderRight:'1px solid var(--border)',
        display:'flex', flexDirection:'column',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition:'transform 0.28s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{ padding:'18px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <span style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:15, color:'#fff' }}>📚 Sommaire</span>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.06)', border:'none', borderRadius:7, color:'var(--muted)', cursor:'pointer', padding:'4px 8px', fontSize:16 }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'12px 12px' }}>
          {ARCS.map(arc => {
            const rc = readCount(arc)
            const tc = total(arc)
            const pct = tc ? Math.round((rc / tc) * 100) : 0
            const hasChapters = chapters.some(c => c.num >= arc.range[0] && c.num <= arc.range[1])
            return (
              <button key={arc.name} onClick={() => { hasChapters && onJumpArc(arc); onClose() }}
                style={{
                  width:'100%', textAlign:'left', padding:'14px 16px', borderRadius:12,
                  background: arc.current ? `${arc.color}14` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${arc.current ? arc.color + '40' : 'rgba(255,255,255,0.06)'}`,
                  cursor: hasChapters ? 'pointer' : 'default',
                  marginBottom:8, transition:'background 0.15s',
                  opacity: hasChapters ? 1 : 0.45,
                }}
                onMouseEnter={e => { if (hasChapters) e.currentTarget.style.background = arc.current ? `${arc.color}22` : 'rgba(255,255,255,0.07)' }}
                onMouseLeave={e => { e.currentTarget.style.background = arc.current ? `${arc.color}14` : 'rgba(255,255,255,0.03)' }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:18 }}>{arc.emoji}</span>
                  <span style={{ fontWeight:700, fontSize:14, color: arc.current ? arc.color : '#fff' }}>Arc {arc.name}</span>
                  {arc.current && <span style={{ fontSize:9, fontWeight:700, background:'rgba(52,211,153,0.15)', color:'#34d399', border:'1px solid rgba(52,211,153,0.3)', borderRadius:100, padding:'1px 7px', letterSpacing:'0.08em' }}>EN COURS</span>}
                  {pct === 100 && <span style={{ fontSize:12, color:'#34d399', marginLeft:'auto' }}>✓</span>}
                </div>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom: hasChapters ? 8 : 0 }}>Ch.{arc.range[0]}→{arc.range[1]}</div>
                {hasChapters && tc > 0 && (
                  <>
                    <div style={{ height:3, background:'rgba(255,255,255,0.08)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', background: arc.color, borderRadius:2, width:`${pct}%`, transition:'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize:10, color:'var(--muted)', marginTop:4 }}>{rc}/{tc} lus</div>
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── Card de chapitre ──────────────────────────────────────────────────────────

function ChapterCard({ ch, hovered, onHover, onOpen, status, highlight, cardRef }) {
  const isRead    = status === 'read'
  const isReading = status === 'reading'

  return (
    <button
      ref={cardRef}
      onClick={onOpen}
      onMouseEnter={onHover}
      onMouseLeave={() => onHover(false)}
      style={{
        position:'relative',
        background: highlight ? 'rgba(224,82,74,0.22)' : hovered ? 'rgba(224,82,74,0.12)' : isRead ? 'rgba(20,21,24,0.5)' : 'rgba(20,21,24,0.8)',
        border: highlight ? '2px solid rgba(224,82,74,0.9)' : isReading ? '2px solid var(--accent)' : `1px solid ${hovered ? 'rgba(224,82,74,0.45)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius:14, padding:'16px',
        cursor:'pointer', textAlign:'left', fontFamily:'var(--body)',
        transition:'all 0.18s ease',
        transform: hovered && !highlight ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: highlight ? '0 0 0 3px rgba(224,82,74,0.4)' : hovered ? '0 10px 30px rgba(224,82,74,0.15)' : 'none',
        opacity: isRead ? 0.65 : 1,
        animation: isReading ? 'readingPulse 2s ease-in-out infinite' : 'none',
      }}
    >
      {/* Status badge */}
      {isRead && (
        <div style={{ position:'absolute', top:10, right:10, width:20, height:20, borderRadius:'50%', background:'rgba(52,211,153,0.2)', border:'1px solid rgba(52,211,153,0.5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#34d399', fontWeight:700 }}>✓</div>
      )}
      {isReading && (
        <div style={{ position:'absolute', top:10, right:10, fontSize:10, fontWeight:700, background:'rgba(224,82,74,0.15)', color:'var(--accent)', border:'1px solid rgba(224,82,74,0.4)', borderRadius:100, padding:'2px 8px' }}>En cours</div>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <span style={{ fontSize:22 }}>{ch.emoji}</span>
      </div>
      <div style={{ fontSize:10, fontWeight:700, color:'var(--accent)', letterSpacing:'0.08em', marginBottom:4 }}>CHAPITRE {ch.num}</div>
      <div style={{ fontSize:13, fontWeight:700, color: isRead ? 'rgba(255,255,255,0.5)' : '#fff', lineHeight:1.35, marginBottom:10 }}>{ch.title}</div>
      <div style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color: hovered ? 'var(--accent)' : 'rgba(255,255,255,0.3)', transition:'color 0.18s' }}>
        📖 {isRead ? 'Relire' : isReading ? 'Continuer' : 'Lire'}
      </div>
    </button>
  )
}

// ── Vue liste compacte ────────────────────────────────────────────────────────

function ListRow({ ch, onOpen, status, highlight, cardRef }) {
  const [hovered, setHovered] = useState(false)
  const isRead    = status === 'read'
  const isReading = status === 'reading'

  return (
    <div
      ref={cardRef}
      style={{
        display:'flex', alignItems:'center', gap:14,
        padding:'10px 16px', borderRadius:10,
        background: highlight ? 'rgba(224,82,74,0.18)' : hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
        border: highlight ? '1px solid rgba(224,82,74,0.7)' : '1px solid transparent',
        transition:'all 0.15s', cursor:'pointer',
        opacity: isRead ? 0.6 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
    >
      <span style={{ fontSize:18, flexShrink:0 }}>{ch.emoji}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <span style={{ fontSize:13, fontWeight:700, color: isRead ? 'rgba(255,255,255,0.55)' : '#fff' }}>
          Ch.{ch.num}
        </span>
        <span style={{ fontSize:12, color:'var(--muted)', marginLeft:10 }}>{ch.title}</span>
      </div>
      {isRead    && <span style={{ fontSize:11, color:'#34d399', fontWeight:700, flexShrink:0 }}>✓ Lu</span>}
      {isReading && <span style={{ fontSize:11, color:'var(--accent)', fontWeight:700, flexShrink:0 }}>En cours</span>}
      <button
        onClick={e => { e.stopPropagation(); onOpen() }}
        style={{ flexShrink:0, padding:'5px 14px', borderRadius:8, border:'1px solid rgba(224,82,74,0.3)', background: hovered ? 'rgba(224,82,74,0.15)' : 'transparent', color:'var(--accent)', fontSize:12, fontWeight:700, cursor:'pointer', transition:'background 0.15s' }}
      >
        {isRead ? 'Relire' : isReading ? 'Continuer' : 'Lire'}
      </button>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function ScansPage({ onClose }) {
  const [search,    setSearch]    = useState('')
  const [sort,      setSort]      = useState('asc')
  const [view,      setView]      = useState('grid')
  const [page,      setPage]      = useState(1)
  const [perPage,   setPerPage]   = useState(PER_PAGE)
  const [goInput,   setGoInput]   = useState('')
  const [highlight, setHighlight] = useState(null)
  const [hovered,   setHovered]   = useState(null)
  const [reading,   setReading]   = useState(null)
  const [sidebar,   setSidebar]   = useState(false)
  const [progress,  setProgress]  = useState(loadProgress)


  const searchRef  = useRef(null)
  const cardRefs   = useRef({})
  const lastRead   = useMemo(loadLastRead, [])

  // Sauvegarde progression
  const markProgress = useCallback((chNum, status) => {
    setProgress(prev => {
      const next = { ...prev, [chNum]: status }
      saveProgressLS(next)
      return next
    })
  }, [])

  // Ouvrir un chapitre
  const openChapter = useCallback((idx) => {
    const ch = CHAPTERS[idx]
    if (!ch) return
    setReading(idx)
    if (progress[ch.num] !== 'read') markProgress(ch.num, 'reading')
    try { localStorage.setItem('manga_last_read', String(ch.num)) } catch {}
  }, [progress, markProgress])

  // Terminer un chapitre (dernière page)
  const finishChapter = useCallback(() => {
    if (reading === null) return
    markProgress(CHAPTERS[reading].num, 'read')
  }, [reading, markProgress])

  // Chapitres filtrés + triés
  const filtered = useMemo(() => {
    let result = CHAPTERS
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(c => String(c.num).includes(q) || (c.title || '').toLowerCase().includes(q))
    }
    return sort === 'desc' ? [...result].reverse() : result
  }, [search, sort])

  // Pagination
  const totalPages = perPage === Infinity ? 1 : Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage   = Math.min(page, totalPages)
  const paginated  = perPage === Infinity
    ? filtered
    : filtered.slice((safePage - 1) * perPage, safePage * perPage)

  useEffect(() => { setPage(1) }, [search, sort, perPage])

  // Groupes de range
  const rangeGroups = useMemo(() => {
    const groups = [], size = 20
    for (let i = 0; i < CHAPTERS.length; i += size) {
      const sl = CHAPTERS.slice(i, i + size)
      groups.push({ start: sl[0].num, end: sl[sl.length-1].num, idx: Math.floor(i/size) })
    }
    return groups
  }, [])

  // Scroll vers un chapitre + highlight
  const scrollToChapter = useCallback((num) => {
    const posInFiltered = filtered.findIndex(c => c.num === num)
    if (posInFiltered === -1) return
    if (perPage !== Infinity) setPage(Math.floor(posInFiltered / perPage) + 1)
    setHighlight(num)
    setTimeout(() => {
      cardRefs.current[num]?.scrollIntoView({ behavior:'smooth', block:'center' })
    }, 100)
    setTimeout(() => setHighlight(null), 2200)
  }, [filtered, perPage])

  // "Aller au chapitre"
  const handleGo = useCallback(() => {
    const num = parseInt(goInput)
    if (!num) return
    scrollToChapter(num)
    setGoInput('')
  }, [goInput, scrollToChapter])

  // Jump arc
  const handleJumpArc = useCallback((arc) => {
    const first = CHAPTERS.find(c => c.num >= arc.range[0])
    if (first) { setSearch(''); setSort('asc'); scrollToChapter(first.num) }
  }, [scrollToChapter])

  // Reprendre lecture
  const handleResume = useCallback(() => {
    if (!lastRead) return
    const idx = CHAPTERS.findIndex(c => c.num === lastRead)
    if (idx !== -1) openChapter(idx)
  }, [lastRead, openChapter])

  // Raccourcis clavier
  useEffect(() => {
    const fn = e => {
      const tag = e.target.tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA'

      if (e.key === 'Escape') {
        if (inInput) { e.target.blur(); return }
        if (sidebar) { setSidebar(false); return }
        if (reading === null) onClose()
        return
      }
      if (inInput) return

      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); return }
      if (e.key === 'ArrowLeft'  && reading === null) { setPage(p => Math.max(1, p - 1)); return }
      if (e.key === 'ArrowRight' && reading === null) { setPage(p => Math.min(totalPages, p + 1)); return }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [reading, sidebar, totalPages, onClose])

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const readCount = useMemo(() =>
    CHAPTERS.filter(c => progress[c.num] === 'read').length, [progress])

  return (
    <>
      <style>{`
        @keyframes readingPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(224,82,74,0.0); }
          50%      { box-shadow: 0 0 0 6px rgba(224,82,74,0.25); }
        }
      `}</style>

      <div style={{ position:'fixed', inset:0, zIndex:500, background:'var(--bg)', display:'flex', flexDirection:'column', animation:'fadeIn 0.18s ease-out' }}>

        {/* ── Sidebar ── */}
        <Sidebar open={sidebar} onClose={() => setSidebar(false)} progress={progress} onJumpArc={handleJumpArc} chapters={CHAPTERS} />

        {/* ── Header principal ── */}
        <div style={{ flexShrink:0, background:'rgba(17,18,20,0.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid var(--border)', zIndex:10 }}>

          {/* Ligne 1 : titre + back */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'0 20px', height:60 }}>
            <button onClick={() => setSidebar(true)} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.06)', border:'1px solid var(--border)', borderRadius:9, color:'#fff', cursor:'pointer', padding:'7px 12px', fontSize:13, fontWeight:600, flexShrink:0, transition:'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.06)'}
            >☰ Arcs</button>

            <button onClick={onClose} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.06)', border:'1px solid var(--border)', borderRadius:9, color:'#fff', cursor:'pointer', padding:'7px 14px', fontSize:13, fontWeight:700, flexShrink:0, transition:'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.06)'}
            >← Retour</button>

            <div style={{ flex:1, textAlign:'center' }}>
              <span style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:16, color:'#fff' }}>📖 Arc Elbaf</span>
              <span style={{ fontSize:12, color:'var(--muted)', marginLeft:10 }}>Ch.1127–1182</span>
              <span style={{ fontSize:12, color:'#34d399', marginLeft:10, fontWeight:700 }}>{readCount}/{CHAPTERS.length} lus</span>
            </div>

            <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.3)', borderRadius:100, padding:'4px 12px', fontSize:11, fontWeight:700, color:'#34d399', flexShrink:0 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#34d399', display:'inline-block', animation:'pulse 2s infinite' }} />
              Arc en cours
            </span>
          </div>

          {/* Ligne 2 : barre sticky de contrôles */}
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0 20px 12px', flexWrap:'wrap' }}>

            {/* Recherche */}
            <div style={{ position:'relative', flex:1, minWidth:160 }}>
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, color:'var(--muted)', pointerEvents:'none' }}>🔍</span>
              <input
                ref={searchRef}
                type="text"
                placeholder='Chapitre ou titre… ("/" pour focus)'
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width:'100%', paddingLeft:36, paddingRight:12, height:36, background:'rgba(255,255,255,0.06)', border:'1px solid var(--border)', borderRadius:9, color:'#fff', fontSize:13, outline:'none', fontFamily:'var(--body)', boxSizing:'border-box' }}
                onFocus={e => e.currentTarget.style.borderColor='rgba(224,82,74,0.5)'}
                onBlur={e  => e.currentTarget.style.borderColor='var(--border)'}
              />
            </div>

            {/* Go to chapter */}
            <div style={{ display:'flex', gap:4, flexShrink:0 }}>
              <input
                type="number"
                placeholder="N° ch."
                value={goInput}
                onChange={e => setGoInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGo()}
                style={{ width:80, height:36, background:'rgba(255,255,255,0.06)', border:'1px solid var(--border)', borderRadius:9, color:'#fff', fontSize:13, outline:'none', padding:'0 10px', fontFamily:'var(--body)' }}
                onFocus={e => e.currentTarget.style.borderColor='rgba(224,82,74,0.5)'}
                onBlur={e  => e.currentTarget.style.borderColor='var(--border)'}
              />
              <button onClick={handleGo} style={{ height:36, padding:'0 12px', borderRadius:9, border:'1px solid rgba(224,82,74,0.4)', background:'rgba(224,82,74,0.12)', color:'var(--accent)', fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0, transition:'background 0.15s', whiteSpace:'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(224,82,74,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(224,82,74,0.12)'}
              >Aller →</button>
            </div>

            {/* Reprendre */}
            {lastRead && (
              <button onClick={handleResume} style={{ height:36, padding:'0 12px', borderRadius:9, border:'1px solid rgba(52,211,153,0.3)', background:'rgba(52,211,153,0.08)', color:'#34d399', fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0, transition:'background 0.15s', whiteSpace:'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(52,211,153,0.18)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(52,211,153,0.08)'}
                title={`Reprendre au chapitre ${lastRead}`}
              >▶ Reprendre Ch.{lastRead}</button>
            )}

            {/* Vue grille/liste */}
            <div style={{ display:'flex', background:'rgba(255,255,255,0.06)', borderRadius:9, overflow:'hidden', border:'1px solid var(--border)', flexShrink:0 }}>
              {[['grid','⊞'],['list','≡']].map(([v,icon]) => (
                <button key={v} onClick={() => setView(v)} style={{ height:36, width:38, border:'none', cursor:'pointer', fontSize:16, background:view===v?'rgba(224,82,74,0.2)':'transparent', color:view===v?'var(--accent)':'var(--muted)', transition:'all 0.15s' }}>{icon}</button>
              ))}
            </div>

            {/* Tri */}
            <select value={sort} onChange={e => setSort(e.target.value)} style={{ height:36, background:'rgba(255,255,255,0.06)', border:'1px solid var(--border)', borderRadius:9, color:'#fff', fontSize:12, padding:'0 10px', outline:'none', cursor:'pointer', fontFamily:'var(--body)' }}>
              <option value="asc"  style={{ background:'#111214' }}>Plus anciens d'abord</option>
              <option value="desc" style={{ background:'#111214' }}>Plus récents d'abord</option>
            </select>

            {/* Par page */}
            <select value={perPage} onChange={e => setPerPage(e.target.value === 'all' ? Infinity : parseInt(e.target.value))} style={{ height:36, background:'rgba(255,255,255,0.06)', border:'1px solid var(--border)', borderRadius:9, color:'#fff', fontSize:12, padding:'0 10px', outline:'none', cursor:'pointer', fontFamily:'var(--body)' }}>
              <option value={20}    style={{ background:'#111214' }}>20 / page</option>
              <option value={40}    style={{ background:'#111214' }}>40 / page</option>
              <option value={80}    style={{ background:'#111214' }}>80 / page</option>
              <option value="all"   style={{ background:'#111214' }}>Tout afficher</option>
            </select>
          </div>

          {/* Rangée de plages */}
          {rangeGroups.length > 1 && (
            <div style={{ display:'flex', gap:6, padding:'0 20px 10px', overflowX:'auto' }}>
              {rangeGroups.map(g => {
                const active = perPage !== Infinity && paginated.some(c => c.num >= g.start && c.num <= g.end)
                return (
                  <button key={g.start} onClick={() => {
                    setSearch(''); setSort('asc'); setPerPage(PER_PAGE)
                    const pos = CHAPTERS.findIndex(c => c.num === g.start)
                    setPage(Math.floor(pos / PER_PAGE) + 1)
                  }} style={{ flexShrink:0, height:28, padding:'0 12px', borderRadius:7, border:`1px solid ${active?'rgba(224,82,74,0.5)':'rgba(255,255,255,0.1)'}`, background:active?'rgba(224,82,74,0.12)':'transparent', color:active?'var(--accent)':'var(--muted)', fontSize:11, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}>
                    {g.start}–{g.end}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Contenu ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'24px 20px' }}>
          <div style={{ maxWidth:1120, margin:'0 auto' }}>

            {filtered.length === 0 ? (
              <div style={{ textAlign:'center', padding:'80px 0', color:'var(--muted)' }}>
                <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
                <div style={{ fontWeight:700, color:'#fff', marginBottom:8 }}>Aucun résultat</div>
                <div style={{ fontSize:14 }}>Aucun chapitre pour "{search}"</div>
              </div>
            ) : view === 'grid' ? (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(170px, 1fr))', gap:10 }}>
                {paginated.map(ch => (
                  <ChapterCard
                    key={ch.num}
                    ch={ch}
                    hovered={hovered === ch.num}
                    onHover={v => setHovered(v ? ch.num : null)}
                    onOpen={() => { const idx = CHAPTERS.indexOf(ch); openChapter(idx) }}
                    status={progress[ch.num] || null}
                    highlight={highlight === ch.num}
                    cardRef={el => { cardRefs.current[ch.num] = el }}
                  />
                ))}
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                {paginated.map(ch => (
                  <ListRow
                    key={ch.num}
                    ch={ch}
                    onOpen={() => { const idx = CHAPTERS.indexOf(ch); openChapter(idx) }}
                    status={progress[ch.num] || null}
                    highlight={highlight === ch.num}
                    cardRef={el => { cardRefs.current[ch.num] = el }}
                  />
                ))}
              </div>
            )}

            {/* Pagination bas */}
            {totalPages > 1 && (
              <div style={{ marginTop:32, paddingTop:24, borderTop:'1px solid var(--border)' }}>
                <PaginationBar page={safePage} total={totalPages} onChange={p => { setPage(p); window.scrollTo({ top:0 }) }} />
                <div style={{ textAlign:'center', marginTop:12, fontSize:12, color:'var(--muted)' }}>
                  {paginated.length} chapitres · page {safePage}/{totalPages} · {filtered.length} au total
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Raccourcis clavier hint ── */}
        <div style={{ flexShrink:0, borderTop:'1px solid var(--border)', padding:'8px 20px', background:'rgba(17,18,20,0.9)', display:'flex', gap:20, justifyContent:'center', flexWrap:'wrap' }}>
          {[['/', 'Rechercher'], ['←→', 'Pages'], ['+/-', 'Zoom'], ['0', 'Reset zoom'], ['Échap', 'Retour']].map(([k, label]) => (
            <span key={k} style={{ fontSize:11, color:'var(--muted)' }}>
              <kbd style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:4, padding:'1px 6px', fontSize:10, fontFamily:'monospace', color:'rgba(255,255,255,0.6)', marginRight:5 }}>{k}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Reader ── */}
      {reading !== null && CHAPTERS[reading] && (
        <Reader
          chapter={CHAPTERS[reading]}
          chapterIndex={reading}
          totalChapters={CHAPTERS.length}
          onClose={() => setReading(null)}
          onPrevChapter={() => setReading(i => Math.max(0, i - 1))}
          onNextChapter={() => setReading(i => Math.min(CHAPTERS.length - 1, i + 1))}
          onFinish={finishChapter}
          isRead={progress[CHAPTERS[reading]?.num] === 'read'}
        />
      )}
    </>
  )
}
