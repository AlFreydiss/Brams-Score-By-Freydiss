import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Reader } from './MangaReader.jsx'
import VideoPlayer from './VideoPlayer.jsx'

function loadProgress(ns) {
  try { return JSON.parse(localStorage.getItem(`${ns}_progress`) || '{}') } catch { return {} }
}
function saveProgress(ns, p) {
  try { localStorage.setItem(`${ns}_progress`, JSON.stringify(p)) } catch {}
}

function EmptyState({ icon, title, desc }) {
  return (
    <div style={{ textAlign: 'center', padding: '90px 20px' }}>
      <div style={{ fontSize: 72, marginBottom: 20, opacity: 0.25 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, color: '#fff', marginBottom: 12 }}>{title}</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 380, margin: '0 auto', lineHeight: 1.7 }}>{desc}</div>
    </div>
  )
}

function ChapterCard({ ch, status, onClick, color }) {
  const [hovered, setHovered] = useState(false)
  const isRead    = status === 'read'
  const isReading = status === 'reading'
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      position: 'relative',
      background: hovered ? `${color}18` : isRead ? 'rgba(20,21,24,0.5)' : 'rgba(20,21,24,0.85)',
      border: isReading ? `2px solid ${color}` : `1px solid ${hovered ? color + '55' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 14, padding: '16px', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--body)',
      transition: 'all 0.18s ease',
      transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      boxShadow: hovered ? `0 10px 28px ${color}18` : 'none',
      opacity: isRead ? 0.65 : 1,
    }}>
      {isRead && <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%', background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#34d399', fontWeight: 700 }}>✓</div>}
      {isReading && <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 700, background: `${color}22`, color, border: `1px solid ${color}55`, borderRadius: 100, padding: '2px 8px' }}>En cours</div>}
      <div style={{ fontSize: 22, marginBottom: 10 }}>{ch.emoji}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.08em', marginBottom: 4 }}>CHAPITRE {ch.num}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: isRead ? 'rgba(255,255,255,0.5)' : '#fff', lineHeight: 1.35, marginBottom: 10 }}>{ch.title}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: hovered ? color : 'rgba(255,255,255,0.3)', transition: 'color 0.18s' }}>
        📖 {isRead ? 'Relire' : isReading ? 'Continuer' : 'Lire'}
      </div>
    </button>
  )
}

function ArcHeader({ arc, color, readCount, total }) {
  const pct = total > 0 ? Math.round((readCount / total) * 100) : 0
  return (
    <div style={{ marginBottom: 14, marginTop: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{ height: 2, flex: 1, background: `linear-gradient(90deg, ${color}60, transparent)` }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 15, color: '#fff', letterSpacing: '0.01em' }}>
            {arc.name}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
            ch.{arc.start}–{arc.end === 9999 ? '…' : arc.end}
          </span>
          {total > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, background: pct === 100 ? 'rgba(52,211,153,0.15)' : `${color}18`, color: pct === 100 ? '#34d399' : color, border: `1px solid ${pct === 100 ? 'rgba(52,211,153,0.4)' : color + '44'}`, borderRadius: 100, padding: '2px 10px' }}>
              {pct === 100 ? '✓ Terminé' : `${readCount}/${total}`}
            </span>
          )}
        </div>
        <div style={{ height: 2, flex: 1, background: `linear-gradient(90deg, transparent, ${color}60)` }} />
      </div>
      {total > 0 && pct > 0 && (
        <div style={{ height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', margin: '0 0 4px 0' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#34d399' : color, borderRadius: 2, transition: 'width 0.6s ease' }} />
        </div>
      )}
    </div>
  )
}

function ArcNav({ arcs, color, onJump }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setOpen(o => !o)} style={{ height: 36, padding: '0 14px', border: `1px solid ${color}44`, borderRadius: 9, background: `${color}14`, color, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = `${color}28`}
        onMouseLeave={e => e.currentTarget.style.background = `${color}14`}
      >
        📑 Arcs {open ? '▲' : '▼'}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 42, right: 0, zIndex: 50, background: 'rgba(17,18,20,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, minWidth: 240, padding: '6px 0', boxShadow: '0 16px 48px rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)' }}>
          {arcs.map(arc => (
            <button key={arc.name} onClick={() => { onJump(arc.name); setOpen(false) }} style={{ width: '100%', padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#fff', fontSize: 13, fontWeight: 600, transition: 'background 0.12s', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = `${color}18`}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
              {arc.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function VideoThumbnail({ src, episode, color }) {
  const [thumb, setThumb] = useState(null)
  const [videoReady, setVideoReady] = useState(false)
  const tried = useRef(false)

  useEffect(() => {
    if (!src || tried.current) return
    tried.current = true
    const v = document.createElement('video')
    v.crossOrigin = 'anonymous'
    v.preload = 'metadata'
    v.src = encodeURI(src)
    const extract = () => {
      const c = document.createElement('canvas')
      c.width = 320; c.height = 180
      try { c.getContext('2d').drawImage(v, 0, 0, 320, 180); setThumb(c.toDataURL('image/jpeg', 0.8)) } catch {}
      v.src = ''
    }
    v.addEventListener('loadedmetadata', () => {
      const duration = Number.isFinite(v.duration) ? v.duration : 0
      v.currentTime = duration > 0 ? Math.max(2, duration * 0.5) : 2
    }, { once: true })
    v.addEventListener('seeked', extract, { once: true })
    v.load()
  }, [src])

  if (thumb) return <img src={thumb} alt={`Ép.${episode}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
  return (
    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${color}28 0%, rgba(0,0,0,0.88) 100%)`, overflow: 'hidden' }}>
      {src && (
        <video
          src={encodeURI(src)}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={e => {
            const duration = Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0
            try { e.currentTarget.currentTime = duration > 0 ? Math.max(2, duration * 0.5) : 2 } catch {}
          }}
          onSeeked={() => setVideoReady(true)}
          onLoadedData={() => setVideoReady(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: videoReady ? 0.82 : 0,
            filter: 'brightness(1.18) saturate(1.12) contrast(1.1)',
          }}
        />
      )}
      <div style={{ position: 'absolute', inset: 0, background: videoReady ? 'linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.24))' : 'none' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        {!videoReady && (
          <>
            <span style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 13, letterSpacing: '0.15em', color: `${color}77`, textTransform: 'uppercase', textShadow: '0 2px 10px rgba(0,0,0,0.75)' }}>Épisode</span>
            <span style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 48, color: `${color}99`, lineHeight: 1, textShadow: '0 2px 18px rgba(0,0,0,0.8)' }}>{episode}</span>
          </>
        )}
      </div>
    </div>
  )
}

function tpnArcLabel(arc = '') {
  const normalized = arc.toLowerCase()
  if (normalized.includes('grace')) return 'Grace Field'
  if (normalized.includes('evasion') || normalized.includes('évasion')) return 'Évasion'
  return arc || 'Arc inconnu'
}

function TpnHero({ title, readCount, chapterCount, episodeCount, arcCount, color }) {
  const pct = chapterCount > 0 ? Math.round((readCount / chapterCount) * 100) : 0
  return (
    <section style={{
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 22,
      padding: '22px 24px',
      marginBottom: 22,
      background: 'linear-gradient(135deg, rgba(108,92,231,0.16), rgba(20,83,45,0.12) 48%, rgba(12,13,16,0.86))',
      border: '1px solid rgba(139,124,255,0.22)',
      boxShadow: '0 24px 70px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)',
      backdropFilter: 'blur(14px)',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 15% 25%, rgba(40,150,95,0.18), transparent 20rem), radial-gradient(circle at 86% 18%, rgba(108,92,231,0.18), transparent 18rem)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 22, alignItems: 'end' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 999, background: 'rgba(108,92,231,0.14)', border: '1px solid rgba(139,124,255,0.28)', color: '#a9a0ff', fontSize: 10, fontWeight: 900, letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 12 }}>
            🌿 Grace Field Archive
          </div>
          <h1 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: 'clamp(34px,5vw,58px)', lineHeight: .95, color: '#fff', letterSpacing: '-.025em' }}>{title}</h1>
          <p style={{ margin: '12px 0 0', color: 'rgba(255,255,255,0.54)', fontSize: 14, lineHeight: 1.7 }}>
            Grace Field, évasion, secrets et survie.
          </p>
        </div>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
            {[
              [`${episodeCount}`, 'Épisodes'],
              [`${arcCount}`, 'Arcs'],
              [`${pct}%`, 'Progression'],
            ].map(([value, label]) => (
              <div key={label} style={{ padding: '12px 10px', borderRadius: 14, background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 900, color: label === 'Arcs' ? '#64d98b' : color, lineHeight: 1 }}>{value}</div>
                <div style={{ marginTop: 5, fontSize: 9, fontWeight: 850, letterSpacing: '.11em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.36)' }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: 'rgba(255,255,255,0.58)', fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
            <span>{readCount} / {chapterCount} chapitres lus</span>
            <span>{pct}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, #64d98b, ${color})`, boxShadow: `0 0 18px ${color}66`, transition: 'width .5s ease' }} />
          </div>
        </div>
      </div>
    </section>
  )
}

function ArcFilter({ arcs, active, onChange, color }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 18px' }}>
      {arcs.map(item => {
        const selected = active === item.key
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            style={{
              height: 36,
              padding: '0 15px',
              borderRadius: 999,
              border: `1px solid ${selected ? color + '66' : 'rgba(255,255,255,0.10)'}`,
              background: selected ? `linear-gradient(135deg, ${color}24, rgba(100,217,139,0.12))` : 'rgba(255,255,255,0.035)',
              color: selected ? '#fff' : 'rgba(255,255,255,0.52)',
              fontSize: 12,
              fontWeight: 850,
              cursor: 'pointer',
              boxShadow: selected ? `0 0 22px ${color}18` : 'none',
              transition: 'all .18s ease',
            }}
          >
            {item.label} <span style={{ color: selected ? '#64d98b' : 'rgba(255,255,255,0.32)' }}>({item.count})</span>
          </button>
        )
      })}
    </div>
  )
}

function VideoCard({ video, onPlay, color, premium = false }) {
  const [hovered, setHovered] = useState(false)
  const thumb = video.thumbnail || (video.id ? `https://img.youtube.com/vi/${video.id}/mqdefault.jpg` : null)
  return (
    <div onClick={onPlay} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: premium ? 18 : 16,
        overflow: 'hidden',
        background: premium ? 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(15,16,19,0.96))' : 'rgba(18,19,22,0.9)',
        border: `1px solid ${hovered ? (premium ? 'rgba(139,124,255,0.55)' : color + '55') : premium ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.07)'}`,
        transition: premium ? 'all 0.22s ease' : 'all 0.2s',
        transform: hovered ? `translateY(-4px) scale(${premium ? 1.012 : 1})` : 'translateY(0) scale(1)',
        cursor: 'pointer',
        boxShadow: hovered ? (premium ? `0 16px 42px ${color}20` : `0 12px 36px ${color}18`) : premium ? '0 8px 24px rgba(0,0,0,0.18)' : 'none',
      }}>
      <div style={{ position: 'relative', paddingTop: premium ? '58%' : '56.25%', background: '#0a0b0d', overflow: 'hidden' }}>
        {thumb
          ? <img src={thumb} alt={video.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: hovered ? (premium ? 0.9 : 0.85) : premium ? 0.82 : 0.65, transition: premium ? 'opacity 0.2s, transform .3s ease' : 'opacity 0.2s', transform: premium && hovered ? 'scale(1.035)' : 'scale(1)' }} />
          : <VideoThumbnail src={video.src} episode={video.episode} color={color} />
        }
        {premium && <div style={{ position: 'absolute', inset: '45% 0 0', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.48))', pointerEvents: 'none' }} />}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: hovered ? 'rgba(0,0,0,0.20)' : 'rgba(0,0,0,0.02)', transition: 'background 0.2s' }}>
          <div style={{ width: premium ? 42 : 46, height: premium ? 42 : 46, borderRadius: '50%', background: `${color}${premium ? 'a8' : 'b5'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: premium ? 15 : 17, backdropFilter: 'blur(6px)', transform: hovered ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s, opacity 0.2s', boxShadow: `0 4px 18px ${color}44`, opacity: hovered ? 1 : 0.78 }}>▶</div>
        </div>
        {video.duration && <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 11, fontWeight: 700, background: 'rgba(0,0,0,0.8)', borderRadius: 4, padding: '2px 7px', color: '#fff' }}>{video.duration}</div>}
      </div>
      <div style={{ padding: premium ? '14px 16px 16px' : '12px 16px' }}>
        {video.arc && <div style={{ fontSize: premium ? 10 : 9, fontWeight: 850, color: premium ? '#8f86ff' : `${color}bb`, letterSpacing: '0.11em', textTransform: 'uppercase', marginBottom: 6 }}>⬥ {premium ? tpnArcLabel(video.arc) : video.arc}</div>}
        <div style={{ fontSize: premium ? 11 : 10, fontWeight: 850, color, letterSpacing: '0.08em', marginBottom: 5 }}>ÉPISODE {video.episode}</div>
        <div style={{ fontSize: premium ? 15 : 14, fontWeight: 800, color: '#fff', lineHeight: 1.28 }}>{video.title}</div>
      </div>
    </div>
  )
}


export default function GenericMangaPage({ chaptersData, videosData, color, namespace, title, headerEmoji, emojiList, arcsData, onClose }) {
  const CHAPTERS = useMemo(() => chaptersData.map((ch, i) => ({
    num:   ch.num,
    title: ch.title || `Chapitre ${ch.num}`,
    emoji: emojiList[i % emojiList.length],
    pages: ch.pages,
  })), [chaptersData, emojiList])

  const VIDEOS = videosData
  const isTpn = namespace === 'tpn'

  const [tab,          setTab]          = useState(() => videosData.length > 0 ? 'videos' : 'scans')
  const [reading,      setReading]      = useState(null)
  const [progress,     setProgress]     = useState(() => loadProgress(namespace))
  const [playerIdx,    setPlayerIdx]    = useState(null)
  const [videoArc,     setVideoArc]     = useState('all')
  const arcRefs = useRef({})
  const scrollRef = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape' && reading === null) onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [reading, onClose])

  const markProgress = useCallback((chNum, status) => {
    setProgress(prev => {
      const next = { ...prev, [chNum]: status }
      saveProgress(namespace, next)
      return next
    })
  }, [namespace])

  const openChapter = useCallback((idx) => {
    const ch = CHAPTERS[idx]
    if (!ch) return
    setReading(idx)
    if (progress[ch.num] !== 'read') markProgress(ch.num, 'reading')
  }, [CHAPTERS, progress, markProgress])

  const finishChapter = useCallback(() => {
    if (reading === null) return
    markProgress(CHAPTERS[reading].num, 'read')
  }, [reading, CHAPTERS, markProgress])

  const readCount = useMemo(() =>
    CHAPTERS.filter(c => progress[c.num] === 'read').length, [CHAPTERS, progress])

  const videoArcFilters = useMemo(() => {
    const counts = new Map()
    VIDEOS.forEach(video => {
      const key = tpnArcLabel(video.arc)
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    return [
      { key: 'all', label: 'Tous', count: VIDEOS.length },
      ...Array.from(counts.entries()).map(([key, count]) => ({ key, label: key, count })),
    ]
  }, [VIDEOS])

  const filteredVideos = useMemo(() => {
    if (!isTpn || videoArc === 'all') return VIDEOS
    return VIDEOS.filter(video => tpnArcLabel(video.arc) === videoArc)
  }, [VIDEOS, isTpn, videoArc])

  // Group chapters by arc
  const chaptersByArc = useMemo(() => {
    if (!arcsData || arcsData.length === 0) return null
    return arcsData.map(arc => ({
      ...arc,
      chapters: CHAPTERS.filter(ch => {
        const n = parseFloat(ch.num)
        return n >= arc.start && n <= arc.end
      }),
    })).filter(a => a.chapters.length > 0)
  }, [CHAPTERS, arcsData])

  const readCountForArc = useCallback((arc) =>
    arc.chapters.filter(ch => progress[ch.num] === 'read').length
  , [progress])

  const jumpToArc = useCallback((arcName) => {
    const el = arcRefs.current[arcName]
    if (el && scrollRef.current) scrollRef.current.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' })
  }, [])

  // Map chapter num → global index for reader navigation
  const chNumToIdx = useMemo(() => {
    const m = {}
    CHAPTERS.forEach((ch, i) => { m[ch.num] = i })
    return m
  }, [CHAPTERS])

  const renderChapterGrid = (chapters) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
      {chapters.map(ch => (
        <ChapterCard key={ch.num} ch={ch} color={color} status={progress[ch.num] || null} onClick={() => openChapter(chNumToIdx[ch.num])} />
      ))}
    </div>
  )

  return (
    <>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: isTpn
          ? 'radial-gradient(circle at 18% 8%, rgba(108,92,231,0.18), transparent 34rem), radial-gradient(circle at 86% 22%, rgba(20,83,45,0.16), transparent 30rem), linear-gradient(135deg, #111315 0%, #17191d 48%, #111214 100%)'
          : 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.18s ease-out',
      }}>
        {isTpn && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.22) 72%, rgba(0,0,0,0.42) 100%)' }} />}
        <div style={{ flexShrink: 0, background: isTpn ? 'rgba(18,19,22,0.88)' : 'rgba(17,18,20,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', minHeight: 64, flexWrap: 'wrap' }}>
            <button onClick={onClose}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: isTpn ? 'rgba(255,255,255,0.075)' : 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 10, color: '#fff', cursor: 'pointer', padding: '8px 14px', fontSize: 13, fontWeight: 800, flexShrink: 0, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = isTpn ? 'rgba(255,255,255,0.075)' : 'rgba(255,255,255,0.06)'}
            >← Retour</button>
            <div style={{ width: 3, height: 32, borderRadius: 2, background: color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: isTpn ? 19 : 16, color: '#fff', letterSpacing: isTpn ? '-.01em' : 0 }}>{headerEmoji} {title}</div>
              {CHAPTERS.length > 0 && <div style={{ fontSize: isTpn ? 12 : 11, color: '#34d399', fontWeight: 800 }}>{readCount}/{CHAPTERS.length} chapitres lus</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {tab === 'scans' && chaptersByArc && chaptersByArc.length > 1 && (
                <ArcNav arcs={chaptersByArc} color={color} onJump={jumpToArc} />
              )}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {[['scans', '📖 Scans'], ['videos', '🎬 Épisodes']].map(([t, label]) => (
                  <button key={t} onClick={() => setTab(t)} style={{ height: 38, padding: '0 18px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: tab === t ? `${color}28` : 'transparent', color: tab === t ? color : 'var(--muted)', borderRight: t === 'scans' ? '1px solid var(--border)' : 'none', transition: 'all 0.15s' }}>{label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div ref={scrollRef} style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', padding: isTpn ? '24px 24px 30px' : '28px 20px' }}>
          <div style={{ maxWidth: isTpn && tab === 'videos' ? 1360 : tab === 'videos' ? 1280 : 1120, margin: '0 auto' }}>
            {isTpn && (
              <TpnHero
                title={title}
                readCount={readCount}
                chapterCount={CHAPTERS.length}
                episodeCount={VIDEOS.length}
                arcCount={Math.max(0, videoArcFilters.length - 1)}
                color={color}
              />
            )}
            {tab === 'scans' ? (
              CHAPTERS.length === 0
                ? <EmptyState icon={headerEmoji} title="Scans bientôt disponibles" desc={`Les chapitres de ${title} seront ajoutés prochainement.`} />
                : chaptersByArc
                  ? chaptersByArc.map(arc => (
                      <div key={arc.name} ref={el => { if (el) arcRefs.current[arc.name] = el }}>
                        <ArcHeader arc={arc} color={color} readCount={readCountForArc(arc)} total={arc.chapters.length} />
                        {renderChapterGrid(arc.chapters)}
                      </div>
                    ))
                  : renderChapterGrid(CHAPTERS)
            ) : (
              VIDEOS.length === 0
                ? <EmptyState icon="🎬" title="Épisodes bientôt disponibles" desc="Les épisodes seront ajoutés prochainement." />
                : <>
                    {isTpn && <ArcFilter arcs={videoArcFilters} active={videoArc} onChange={setVideoArc} color={color} />}
                    <div style={{ display: 'grid', gridTemplateColumns: isTpn ? 'repeat(auto-fit, minmax(min(100%, 285px), 1fr))' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: isTpn ? 20 : 18 }}>
                      {filteredVideos.map((v, i) => (
                        <VideoCard
                          key={`${v.episode}-${i}`}
                          video={v}
                          color={color}
                          premium={isTpn}
                          onPlay={() => setPlayerIdx(VIDEOS.indexOf(v))}
                        />
                      ))}
                    </div>
                  </>
            )}
          </div>
        </div>

        <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '8px 20px', background: 'rgba(17,18,20,0.9)', display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[['←→', 'Naviguer'], ['Échap', 'Retour hub']].map(([k, label]) => (
            <span key={k} style={{ fontSize: 11, color: 'var(--muted)' }}>
              <kbd style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)', marginRight: 5 }}>{k}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>

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
          namespace={namespace}
          themeColor={color}
        />
      )}

      {playerIdx !== null && VIDEOS[playerIdx] && (
        <VideoPlayer
          videos={VIDEOS}
          startIdx={playerIdx}
          onClose={() => setPlayerIdx(null)}
          color={color}
        />
      )}
    </>
  )
}
