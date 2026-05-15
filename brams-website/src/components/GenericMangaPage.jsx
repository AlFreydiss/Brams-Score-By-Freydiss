import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Reader } from './MangaReader.jsx'

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

function VideoCard({ video, isPlaying, onPlay, color }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(18,19,22,0.9)', border: `1px solid ${hovered ? color + '40' : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.2s', transform: hovered ? 'translateY(-4px)' : 'translateY(0)' }}>
      {isPlaying ? (
        <div style={{ position: 'relative', paddingTop: '56.25%' }}>
          <iframe src={`https://www.youtube.com/embed/${video.id}?autoplay=1`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allow="autoplay; encrypted-media" allowFullScreen title={video.title} />
        </div>
      ) : (
        <div onClick={onPlay} style={{ position: 'relative', paddingTop: '56.25%', background: '#0a0b0d', cursor: 'pointer', overflow: 'hidden' }}>
          {video.thumbnail && <img src={video.thumbnail} alt={video.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65 }} />}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 58, height: 58, borderRadius: '50%', background: `${color}cc`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, backdropFilter: 'blur(4px)' }}>▶</div>
          </div>
        </div>
      )}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.07em', marginBottom: 5 }}>ÉPISODE {video.episode}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{video.title}</div>
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

  const [tab,          setTab]          = useState('scans')
  const [reading,      setReading]      = useState(null)
  const [progress,     setProgress]     = useState(() => loadProgress(namespace))
  const [videoPlaying, setVideoPlaying] = useState(null)
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
      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--bg)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.18s ease-out' }}>
        <div style={{ flexShrink: 0, background: 'rgba(17,18,20,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', height: 64 }}>
            <button onClick={onClose}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 9, color: '#fff', cursor: 'pointer', padding: '7px 14px', fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >← Retour</button>
            <div style={{ width: 3, height: 32, borderRadius: 2, background: color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 16, color: '#fff' }}>{headerEmoji} {title}</div>
              {CHAPTERS.length > 0 && <div style={{ fontSize: 11, color: '#34d399', fontWeight: 700 }}>{readCount}/{CHAPTERS.length} chapitres lus</div>}
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

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '28px 20px' }}>
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>
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
                : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
                    {VIDEOS.map(v => <VideoCard key={v.id} video={v} color={color} isPlaying={videoPlaying === v.id} onPlay={() => setVideoPlaying(videoPlaying === v.id ? null : v.id)} />)}
                  </div>
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
    </>
  )
}
