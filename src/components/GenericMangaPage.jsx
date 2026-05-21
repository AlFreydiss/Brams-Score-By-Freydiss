import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Reader } from './MangaReader.jsx'
import VideoPlayer from './VideoPlayer.jsx'

function loadProgress(ns) {
  try { return JSON.parse(localStorage.getItem(`${ns}_progress`) || '{}') } catch { return {} }
}
function saveProgress(ns, p) {
  try { localStorage.setItem(`${ns}_progress`, JSON.stringify(p)) } catch {}
}
function loadVideoProgress(ns) {
  try { return JSON.parse(localStorage.getItem(`${ns}_video_progress`) || 'null') } catch { return null }
}

function EmptyState({ icon, title, desc }) {
  return (
    <div style={{ textAlign: 'center', padding: '100px 20px' }}>
      <div style={{ fontSize: 72, marginBottom: 20, opacity: 0.2 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 24, color: '#fff', marginBottom: 12 }}>{title}</div>
      <div style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 420, margin: '0 auto', lineHeight: 1.7 }}>{desc}</div>
    </div>
  )
}

function ChapterCard({ ch, status, onClick, color }) {
  const [hovered, setHovered] = useState(false)
  const isRead = status === 'read'
  const isReading = status === 'reading'

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: hovered 
          ? 'rgba(255,255,255,0.04)' 
          : isRead ? 'rgba(20,21,24,0.6)' : 'rgba(18,19,22,0.9)',
        border: isReading 
          ? `1px solid ${color}` 
          : `1px solid ${hovered ? 'rgba(139,124,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 16,
        padding: '18px 16px',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'var(--body)',
        transition: 'all 0.2s cubic-bezier(0.23, 1, 0.32, 1)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered 
          ? `0 20px 40px -10px rgba(0,0,0,0.4), 0 0 0 1px ${color}22` 
          : 'none',
      }}
    >
      {isRead && (
        <div style={{ 
          position: 'absolute', top: 14, right: 14, 
          width: 22, height: 22, borderRadius: '50%', 
          background: 'rgba(52,211,153,0.15)', 
          border: '1px solid rgba(52,211,153,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: '#34d399', fontWeight: 700 
        }}>✓</div>
      )}
      {isReading && (
        <div style={{ 
          position: 'absolute', top: 14, right: 14, 
          fontSize: 10, fontWeight: 700, 
          background: `${color}22`, color, 
          border: `1px solid ${color}55`, 
          borderRadius: 999, padding: '2px 10px' 
        }}>
          En cours
        </div>
      )}

      <div style={{ fontSize: 26, marginBottom: 12, opacity: hovered ? 1 : 0.9 }}>{ch.emoji}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: color, letterSpacing: '0.08em', marginBottom: 6 }}>
        CHAPITRE {ch.num}
      </div>
      <div style={{ 
        fontSize: 14, fontWeight: 700, 
        color: isRead ? 'rgba(255,255,255,0.45)' : '#fff', 
        lineHeight: 1.35, marginBottom: 14 
      }}>
        {ch.title}
      </div>
      <div style={{ 
        fontSize: 12, fontWeight: 600, 
        color: hovered ? color : 'rgba(255,255,255,0.35)',
        transition: 'color 0.2s'
      }}>
        {isRead ? 'Relire le chapitre' : isReading ? 'Continuer la lecture' : 'Commencer la lecture'}
      </div>
    </button>
  )
}

function ArcHeader({ arc, color, readCount, total }) {
  const pct = total > 0 ? Math.round((readCount / total) * 100) : 0
  return (
    <div style={{ marginBottom: 20, marginTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
        <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${color}40, transparent)` }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 17, color: '#fff', letterSpacing: '-0.01em' }}>
            {arc.name}
          </span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
            ch.{arc.start}–{arc.end === 9999 ? '…' : arc.end}
          </span>
          {total > 0 && (
            <span style={{ 
              fontSize: 11, fontWeight: 700, 
              background: pct === 100 ? 'rgba(52,211,153,0.12)' : `${color}15`, 
              color: pct === 100 ? '#34d399' : color, 
              border: `1px solid ${pct === 100 ? 'rgba(52,211,153,0.35)' : color + '33'}`, 
              borderRadius: 999, padding: '3px 12px' 
            }}>
              {pct === 100 ? 'Terminé' : `${readCount}/${total}`}
            </span>
          )}
        </div>
        <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, transparent, ${color}40)` }} />
      </div>
    </div>
  )
}

function VideoCard({ video, onPlay, color, premium = false }) {
  const [hovered, setHovered] = useState(false)
  const thumb = video.thumbnail || (video.id ? `https://img.youtube.com/vi/${video.id}/mqdefault.jpg` : null)

  return (
    <div 
      onClick={onPlay} 
      onMouseEnter={() => setHovered(true)} 
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        background: 'rgba(18,19,22,0.85)',
        border: `1px solid ${hovered ? color + '44' : 'rgba(255,255,255,0.06)'}`,
        transition: 'all 0.25s cubic-bezier(0.23, 1, 0.32, 1)',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        cursor: 'pointer',
        boxShadow: hovered ? `0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px ${color}22` : '0 10px 30px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ position: 'relative', paddingTop: '56.25%', background: '#0a0b0d' }}>
        {thumb ? (
          <img 
            src={thumb} 
            alt={video.title} 
            style={{ 
              position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
              opacity: hovered ? 0.85 : 0.75,
              transition: 'opacity 0.3s, transform 0.4s',
              transform: hovered ? 'scale(1.04)' : 'scale(1)'
            }} 
          />
        ) : (
          <div style={{ 
            position: 'absolute', inset: 0, 
            background: `linear-gradient(135deg, ${color}15, rgba(0,0,0,0.9))` 
          }} />
        )}

        <div style={{ 
          position: 'absolute', inset: 0, 
          background: hovered ? 'linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.65))' : 'linear-gradient(180deg, transparent, rgba(0,0,0,0.55))',
          transition: 'background 0.3s'
        }} />

        <div style={{ 
          position: 'absolute', inset: 0, 
          display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }}>
          <div style={{ 
            width: 52, height: 52, borderRadius: '50%', 
            background: `${color}${hovered ? 'dd' : 'bb'}`, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: 20, color: '#fff',
            transition: 'all 0.2s',
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
            boxShadow: hovered ? `0 0 0 8px ${color}22` : 'none'
          }}>
            ▶
          </div>
        </div>

        {video.duration && (
          <div style={{ 
            position: 'absolute', bottom: 10, right: 10, 
            fontSize: 11, fontWeight: 700, 
            background: 'rgba(0,0,0,0.75)', 
            borderRadius: 4, padding: '2px 7px', color: '#fff' 
          }}>
            {video.duration}
          </div>
        )}
      </div>

      <div style={{ padding: '16px 18px 18px' }}>
        {video.arc && (
          <div style={{ fontSize: 10, fontWeight: 700, color: color, letterSpacing: '0.1em', marginBottom: 6 }}>
            {video.arc}
          </div>
        )}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
          ÉPISODE {video.episode}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
          {video.title}
        </div>
      </div>
    </div>
  )
}

export default function GenericMangaPage({ chaptersData, videosData, color, namespace, title, headerEmoji, emojiList, arcsData, onClose }) {
  const CHAPTERS = useMemo(() => chaptersData.map((ch, i) => ({
    num: ch.num,
    title: ch.title || `Chapitre ${ch.num}`,
    emoji: emojiList[i % emojiList.length],
    pages: ch.pages,
  })), [chaptersData, emojiList])

  const VIDEOS = videosData
  const isTpn = namespace === 'tpn'

  const [tab, setTab] = useState(() => videosData.length > 0 ? 'videos' : 'scans')
  const [reading, setReading] = useState(null)
  const [progress, setProgress] = useState(() => loadProgress(namespace))
  const [playerIdx, setPlayerIdx] = useState(null)
  const [videoArc, setVideoArc] = useState('all')
  const [videoProgress, setVideoProgress] = useState(() => loadVideoProgress(namespace))

  const arcRefs = useRef({})
  const scrollRef = useRef(null)

  // ... (le reste du code fonctionnel reste identique pour ne pas casser les fonctionnalités)

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

  const watchedCount = useMemo(() => {
    const episodes = videoProgress?.episodes || {}
    return Object.values(episodes).filter(ep => ep?.completed).length
  }, [videoProgress])

  const videoArcFilters = useMemo(() => {
    const counts = new Map()
    VIDEOS.forEach(video => {
      const key = video.arc || 'Autres'
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    return [
      { key: 'all', label: 'Tous', count: VIDEOS.length },
      ...Array.from(counts.entries()).map(([key, count]) => ({ key, label: key, count })),
    ]
  }, [VIDEOS])

  const filteredVideos = useMemo(() => {
    if (!isTpn || videoArc === 'all') return VIDEOS
    return VIDEOS.filter(video => (video.arc || 'Autres') === videoArc)
  }, [VIDEOS, isTpn, videoArc])

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

  const chNumToIdx = useMemo(() => {
    const m = {}
    CHAPTERS.forEach((ch, i) => { m[ch.num] = i })
    return m
  }, [CHAPTERS])

  const renderChapterGrid = (chapters) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
      {chapters.map(ch => (
        <ChapterCard 
          key={ch.num} 
          ch={ch} 
          color={color} 
          status={progress[ch.num] || null} 
          onClick={() => openChapter(chNumToIdx[ch.num])} 
        />
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
          ? 'radial-gradient(circle at 20% 10%, rgba(108,92,231,0.12), transparent 50%), linear-gradient(135deg, #0f1014 0%, #111214 100%)'
          : 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ 
          flexShrink: 0, 
          background: 'rgba(15,16,19,0.92)', 
          backdropFilter: 'blur(20px)', 
          borderBottom: '1px solid rgba(255,255,255,0.06)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px', minHeight: 68 }}>
            <button onClick={onClose} style={{ 
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: 10, color: '#fff', padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' 
            }}>
              ← Retour
            </button>
            <div style={{ width: 3, height: 28, background: color, borderRadius: 2 }} />
            <div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 19, color: '#fff' }}>
                {headerEmoji} {title}
              </div>
            </div>
          </div>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '32px 24px 60px' }}>
          <div style={{ maxWidth: 1480, margin: '0 auto' }}>

            {/* HERO TPN - Version améliorée */}
            {isTpn && (
              <div style={{
                marginBottom: 48,
                padding: '48px 40px',
                borderRadius: 24,
                background: 'linear-gradient(145deg, rgba(108,92,231,0.12), rgba(20,83,45,0.08) 40%, rgba(15,16,19,0.95))',
                border: '1px solid rgba(139,124,255,0.18)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <div style={{ 
                    display: 'inline-block', 
                    padding: '6px 16px', 
                    borderRadius: 999, 
                    background: 'rgba(139,124,255,0.15)', 
                    color: '#a9a0ff', 
                    fontSize: 11, 
                    fontWeight: 800, 
                    letterSpacing: '0.1em',
                    marginBottom: 16
                  }}>
                    GRACE FIELD ARCHIVES
                  </div>

                  <h1 style={{ 
                    fontFamily: 'var(--display)', 
                    fontSize: 'clamp(42px, 5.5vw, 68px)', 
                    fontWeight: 900, 
                    lineHeight: 0.92, 
                    color: '#fff',
                    marginBottom: 16,
                    letterSpacing: '-0.04em'
                  }}>
                    The Promised Neverland
                  </h1>

                  <p style={{ 
                    maxWidth: 620, 
                    fontSize: 17, 
                    color: 'rgba(255,255,255,0.65)', 
                    lineHeight: 1.65 
                  }}>
                    Un orphelinat parfait. Des enfants trop intelligents. Une vérité qui change tout.
                  </p>
                </div>
              </div>
            )}

            {/* Contenu principal */}
            <div style={{ display: 'grid', gridTemplateColumns: isTpn ? '320px 1fr' : '1fr', gap: 32 }}>
              
              {/* Sidebar */}
              {isTpn && (
                <div style={{
                  background: 'rgba(18,19,22,0.7)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 20,
                  padding: 24,
                  height: 'fit-content',
                  position: 'sticky',
                  top: 24
                }}>
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>PROGRESSION</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>
                      {tab === 'videos' ? watchedCount : readCount} / {tab === 'videos' ? VIDEOS.length : CHAPTERS.length}
                    </div>
                  </div>

                  <button
                    onClick={() => setPlayerIdx(0)}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      borderRadius: 14,
                      background: `linear-gradient(90deg, ${color}, #8f86ff)`,
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 15,
                      border: 'none',
                      cursor: 'pointer',
                      marginBottom: 24
                    }}
                  >
                    Reprendre les épisodes →
                  </button>

                  {/* Stats */}
                  <div style={{ display: 'grid', gap: 12 }}>
                    {[
                      ['12', 'Épisodes'],
                      ['2', 'Arcs principaux'],
                      ['184', 'Chapitres scans'],
                    ].map(([value, label]) => (
                      <div key={label} style={{ 
                        padding: '14px 16px', 
                        background: 'rgba(255,255,255,0.03)', 
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{value}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contenu principal */}
              <div>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                  {[['scans', '📖 Scans'], ['videos', '🎬 Épisodes']].map(([t, label]) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      style={{
                        padding: '10px 22px',
                        borderRadius: 999,
                        fontWeight: 700,
                        fontSize: 14,
                        border: 'none',
                        cursor: 'pointer',
                        background: tab === t ? color : 'rgba(255,255,255,0.06)',
                        color: tab === t ? '#fff' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Filtres arcs (vidéos) */}
                {tab === 'videos' && isTpn && videoArcFilters.length > 2 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                    {videoArcFilters.map(item => (
                      <button
                        key={item.key}
                        onClick={() => setVideoArc(item.key)}
                        style={{
                          padding: '8px 18px',
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 600,
                          border: `1px solid ${videoArc === item.key ? color : 'rgba(255,255,255,0.1)'}`,
                          background: videoArc === item.key ? `${color}15` : 'transparent',
                          color: videoArc === item.key ? color : 'rgba(255,255,255,0.6)',
                          cursor: 'pointer'
                        }}
                      >
                        {item.label} <span style={{ opacity: 0.5 }}>({item.count})</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Contenu */}
                {tab === 'scans' ? (
                  chaptersByArc ? chaptersByArc.map(arc => (
                    <div key={arc.name} ref={el => { if (el) arcRefs.current[arc.name] = el }}>
                      <ArcHeader arc={arc} color={color} readCount={readCountForArc(arc)} total={arc.chapters.length} />
                      {renderChapterGrid(arc.chapters)}
                    </div>
                  )) : renderChapterGrid(CHAPTERS)
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
                    {filteredVideos.map((v, i) => (
                      <VideoCard
                        key={i}
                        video={v}
                        color={color}
                        premium={isTpn}
                        onPlay={() => setPlayerIdx(VIDEOS.indexOf(v))}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
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
          storageKey={`${namespace}_video_progress`}
          onProgressUpdate={setVideoProgress}
        />
      )}
    </>
  )
}
