import { useState, useEffect, useCallback, useMemo } from 'react'
import DRSTONE_CHAPTERS_DATA from '../data/drstone-chapters.json'
import DRSTONE_VIDEOS_DATA from '../data/drstone-videos.json'
import { Reader } from './MangaReader.jsx'

const DS_COLOR = '#00b894'

const EMOJIS = ['⚗️','🔬','💎','🧪','🔭','⚡','🌍','🦴','🧬','🔩','💡','🌋','🏹','🛠️','🧲','🚀','🌊','🔥','🌿','⚙️','🎯','💣','🔐','🌟','🧨','🏗️','🎆']

const CHAPTERS = DRSTONE_CHAPTERS_DATA.map((ch, i) => ({
  num:   ch.num,
  title: ch.title || `Chapitre ${ch.num}`,
  emoji: EMOJIS[i % EMOJIS.length],
  pages: ch.pages,
}))

const VIDEOS = DRSTONE_VIDEOS_DATA

function loadProgress() {
  try { return JSON.parse(localStorage.getItem('drstone_progress') || '{}') } catch { return {} }
}
function saveProgress(p) {
  try { localStorage.setItem('drstone_progress', JSON.stringify(p)) } catch {}
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

function ChapterCard({ ch, status, onClick }) {
  const [hovered, setHovered] = useState(false)
  const isRead    = status === 'read'
  const isReading = status === 'reading'

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: hovered ? `${DS_COLOR}18` : isRead ? 'rgba(20,21,24,0.5)' : 'rgba(20,21,24,0.85)',
        border: isReading ? `2px solid ${DS_COLOR}` : `1px solid ${hovered ? DS_COLOR + '55' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 14, padding: '16px',
        cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--body)',
        transition: 'all 0.18s ease',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? `0 10px 28px ${DS_COLOR}18` : 'none',
        opacity: isRead ? 0.65 : 1,
      }}
    >
      {isRead && (
        <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%', background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#34d399', fontWeight: 700 }}>✓</div>
      )}
      {isReading && (
        <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 700, background: `${DS_COLOR}22`, color: DS_COLOR, border: `1px solid ${DS_COLOR}55`, borderRadius: 100, padding: '2px 8px' }}>En cours</div>
      )}
      <div style={{ fontSize: 22, marginBottom: 10 }}>{ch.emoji}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: DS_COLOR, letterSpacing: '0.08em', marginBottom: 4 }}>CHAPITRE {ch.num}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: isRead ? 'rgba(255,255,255,0.5)' : '#fff', lineHeight: 1.35, marginBottom: 10 }}>{ch.title}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: hovered ? DS_COLOR : 'rgba(255,255,255,0.3)', transition: 'color 0.18s' }}>
        📖 {isRead ? 'Relire' : isReading ? 'Continuer' : 'Lire'}
      </div>
    </button>
  )
}

function VideoCard({ video, isPlaying, onPlay }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(18,19,22,0.9)', border: `1px solid ${hovered ? DS_COLOR + '40' : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.2s', transform: hovered ? 'translateY(-4px)' : 'translateY(0)', boxShadow: hovered ? `0 12px 36px ${DS_COLOR}18` : 'none' }}
    >
      {isPlaying ? (
        <div style={{ position: 'relative', paddingTop: '56.25%' }}>
          <iframe src={`https://www.youtube.com/embed/${video.id}?autoplay=1`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allow="autoplay; encrypted-media" allowFullScreen title={video.title} />
        </div>
      ) : (
        <div onClick={onPlay} style={{ position: 'relative', paddingTop: '56.25%', background: '#0a0b0d', cursor: 'pointer', overflow: 'hidden' }}>
          {video.thumbnail && <img src={video.thumbnail} alt={video.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65 }} />}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 58, height: 58, borderRadius: '50%', background: `${DS_COLOR}cc`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, backdropFilter: 'blur(4px)', transition: 'transform 0.2s', transform: hovered ? 'scale(1.1)' : 'scale(1)' }}>▶</div>
          </div>
          <div style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 10, fontWeight: 700, background: 'rgba(0,0,0,0.7)', color: '#fff', borderRadius: 5, padding: '2px 8px' }}>ÉP. {video.episode}</div>
        </div>
      )}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: DS_COLOR, letterSpacing: '0.07em', marginBottom: 5 }}>ÉPISODE {video.episode}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{video.title}</div>
      </div>
    </div>
  )
}

export default function DrStonePage({ onClose }) {
  const [tab,          setTab]          = useState('scans')
  const [reading,      setReading]      = useState(null)
  const [progress,     setProgress]     = useState(loadProgress)
  const [videoPlaying, setVideoPlaying] = useState(null)

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
      saveProgress(next)
      return next
    })
  }, [])

  const openChapter = useCallback((idx) => {
    const ch = CHAPTERS[idx]
    if (!ch) return
    setReading(idx)
    if (progress[ch.num] !== 'read') markProgress(ch.num, 'reading')
  }, [progress, markProgress])

  const finishChapter = useCallback(() => {
    if (reading === null) return
    markProgress(CHAPTERS[reading].num, 'read')
  }, [reading, markProgress])

  const readCount = useMemo(() =>
    CHAPTERS.filter(c => progress[c.num] === 'read').length, [progress])

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--bg)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.18s ease-out' }}>

        {/* Header */}
        <div style={{ flexShrink: 0, background: 'rgba(17,18,20,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', height: 64 }}>
            <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 9, color: '#fff', cursor: 'pointer', padding: '7px 14px', fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >← Retour</button>

            <div style={{ width: 3, height: 32, borderRadius: 2, background: DS_COLOR, flexShrink: 0 }} />

            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 16, color: '#fff' }}>⚗️ Dr. Stone</div>
              {CHAPTERS.length > 0 && (
                <div style={{ fontSize: 11, color: '#34d399', fontWeight: 700 }}>{readCount}/{CHAPTERS.length} chapitres lus</div>
              )}
            </div>

            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
              {[['scans', '📖 Scans'], ['videos', '🎬 Épisodes']].map(([t, label]) => (
                <button key={t} onClick={() => setTab(t)} style={{
                  height: 38, padding: '0 18px', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700,
                  background: tab === t ? `${DS_COLOR}28` : 'transparent',
                  color: tab === t ? DS_COLOR : 'var(--muted)',
                  borderRight: t === 'scans' ? '1px solid var(--border)' : 'none',
                  transition: 'all 0.15s',
                }}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px' }}>
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            {tab === 'scans' ? (
              CHAPTERS.length === 0 ? (
                <EmptyState icon="⚗️" title="Scans bientôt disponibles" desc="Les chapitres de Dr. Stone seront ajoutés prochainement." />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
                  {CHAPTERS.map((ch, idx) => (
                    <ChapterCard key={ch.num} ch={ch} status={progress[ch.num] || null} onClick={() => openChapter(idx)} />
                  ))}
                </div>
              )
            ) : (
              VIDEOS.length === 0 ? (
                <EmptyState icon="🎬" title="Épisodes bientôt disponibles" desc="Les épisodes seront ajoutés prochainement." />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
                  {VIDEOS.map(v => (
                    <VideoCard key={v.id} video={v} isPlaying={videoPlaying === v.id} onPlay={() => setVideoPlaying(videoPlaying === v.id ? null : v.id)} />
                  ))}
                </div>
              )
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
          namespace="drstone"
          themeColor={DS_COLOR}
        />
      )}
    </>
  )
}
