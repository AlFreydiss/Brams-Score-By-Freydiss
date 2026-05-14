import { useState, useEffect, useCallback, useRef } from 'react'
import { useInView } from '../hooks/useInView.js'

// ─── Données chapitres ──────────────────────────────────────────────────────
// pages: tableau d'URLs des images. Mets tes scans dans /public/scans/ch[num]/
// ex: '/scans/ch1127/001.jpg', '/scans/ch1127/002.jpg', ...
const CHAPTERS = [
  { num: 1127, title: 'L\'île des Géants', date: 'Jan 2025', emoji: '🏔️',
    pages: Array.from({length: 18}, (_, i) => `/scans/ch1127/${String(i+1).padStart(3,'0')}.jpg`) },
  { num: 1128, title: 'Elbaf', date: 'Jan 2025', emoji: '⚔️',
    pages: Array.from({length: 17}, (_, i) => `/scans/ch1128/${String(i+1).padStart(3,'0')}.jpg`) },
  { num: 1129, title: 'Les Guerriers d\'Elbaf', date: 'Fév 2025', emoji: '🗡️',
    pages: Array.from({length: 18}, (_, i) => `/scans/ch1129/${String(i+1).padStart(3,'0')}.jpg`) },
  { num: 1130, title: 'L\'Armée des Géants', date: 'Fév 2025', emoji: '🛡️',
    pages: Array.from({length: 17}, (_, i) => `/scans/ch1130/${String(i+1).padStart(3,'0')}.jpg`) },
  { num: 1131, title: 'Le Roi des Géants', date: 'Fév 2025', emoji: '👑',
    pages: Array.from({length: 18}, (_, i) => `/scans/ch1131/${String(i+1).padStart(3,'0')}.jpg`) },
  { num: 1132, title: 'Shanks', date: 'Mar 2025', emoji: '🔴',
    pages: Array.from({length: 17}, (_, i) => `/scans/ch1132/${String(i+1).padStart(3,'0')}.jpg`) },
  { num: 1133, title: 'La Mémoire du Monde', date: 'Mar 2025', emoji: '📜',
    pages: Array.from({length: 18}, (_, i) => `/scans/ch1133/${String(i+1).padStart(3,'0')}.jpg`) },
  { num: 1134, title: 'Confrontation', date: 'Mar 2025', emoji: '💥',
    pages: Array.from({length: 17}, (_, i) => `/scans/ch1134/${String(i+1).padStart(3,'0')}.jpg`) },
  { num: 1135, title: 'Le Pouvoir des Anciens', date: 'Avr 2025', emoji: '🌊',
    pages: Array.from({length: 18}, (_, i) => `/scans/ch1135/${String(i+1).padStart(3,'0')}.jpg`) },
  { num: 1136, title: 'Alliances', date: 'Avr 2025', emoji: '🤝',
    pages: Array.from({length: 17}, (_, i) => `/scans/ch1136/${String(i+1).padStart(3,'0')}.jpg`) },
  { num: 1137, title: 'La Tempête', date: 'Avr 2025', emoji: '⛈️',
    pages: Array.from({length: 18}, (_, i) => `/scans/ch1137/${String(i+1).padStart(3,'0')}.jpg`) },
  { num: 1138, title: 'Gear 5', date: 'Mai 2025', emoji: '☀️',
    pages: Array.from({length: 17}, (_, i) => `/scans/ch1138/${String(i+1).padStart(3,'0')}.jpg`) },
  { num: 1139, title: 'Le Dernier Poneglyph', date: 'Mai 2025', emoji: '🗺️',
    pages: Array.from({length: 18}, (_, i) => `/scans/ch1139/${String(i+1).padStart(3,'0')}.jpg`) },
  { num: 1140, title: 'Vers le bout du monde', date: 'Mai 2025', emoji: '🏴‍☠️',
    pages: Array.from({length: 17}, (_, i) => `/scans/ch1140/${String(i+1).padStart(3,'0')}.jpg`) },
]

// ─── Lecteur de manga ───────────────────────────────────────────────────────
function Reader({ chapter, chapterIndex, onClose, onPrevChapter, onNextChapter, totalChapters }) {
  const [page, setPage] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const touchStartX = useRef(null)
  const total = chapter.pages.length

  const prev = useCallback(() => {
    if (page > 0) { setPage(p => p - 1); setImgLoaded(false); setImgError(false) }
    else if (chapterIndex > 0) onPrevChapter()
  }, [page, chapterIndex, onPrevChapter])

  const next = useCallback(() => {
    if (page < total - 1) { setPage(p => p + 1); setImgLoaded(false); setImgError(false) }
    else if (chapterIndex < totalChapters - 1) onNextChapter()
  }, [page, total, chapterIndex, totalChapters, onNextChapter])

  useEffect(() => {
    setPage(0); setImgLoaded(false); setImgError(false)
  }, [chapter.num])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, onClose])

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev() }
    touchStartX.current = null
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.97)',
      display: 'flex', flexDirection: 'column',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      {/* Barre top */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(14,14,16,0.9)', flexShrink: 0,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '6px 10px', fontSize: 18, lineHeight: 1,
          }}>✕</button>
          <div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>
              {chapter.emoji} Ch.{chapter.num} — {chapter.title}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              Page {page + 1} / {total}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onPrevChapter} disabled={chapterIndex === 0} style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: chapterIndex === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)', color: chapterIndex === 0 ? 'rgba(255,255,255,0.2)' : '#fff',
          }}>← Ch. préc.</button>
          <button onClick={onNextChapter} disabled={chapterIndex === totalChapters - 1} style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: chapterIndex === totalChapters - 1 ? 'rgba(255,255,255,0.04)' : 'rgba(224,82,74,0.8)',
            border: 'none', color: chapterIndex === totalChapters - 1 ? 'rgba(255,255,255,0.2)' : '#fff',
          }}>Ch. suiv. →</button>
        </div>
      </div>

      {/* Zone image */}
      <div
        style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '0' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div style={{ position: 'relative', width: '100%', maxWidth: 800, minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!imgLoaded && !imgError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: 40, marginBottom: 12, animation: 'pulse 1.5s infinite' }}>📖</div>
                <div style={{ fontSize: 13 }}>Chargement…</div>
              </div>
            </div>
          )}
          {imgError && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
              <div style={{ fontWeight: 700, marginBottom: 8, color: '#fff' }}>Image introuvable</div>
              <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                Ajoute les fichiers dans :<br/>
                <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 4 }}>
                  /public/scans/ch{chapter.num}/{String(page+1).padStart(3,'0')}.jpg
                </code>
              </div>
            </div>
          )}
          <img
            key={`${chapter.num}-${page}`}
            src={chapter.pages[page]}
            alt={`Ch.${chapter.num} p.${page+1}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => { setImgLoaded(true); setImgError(true) }}
            style={{
              display: imgError ? 'none' : 'block',
              width: '100%', height: 'auto',
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 0.2s',
            }}
          />
        </div>
      </div>

      {/* Barre bas navigation */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', background: 'rgba(14,14,16,0.9)',
        borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0,
        backdropFilter: 'blur(12px)', gap: 12,
      }}>
        <button onClick={prev} disabled={page === 0 && chapterIndex === 0} style={{
          padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
          background: (page === 0 && chapterIndex === 0) ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)',
          color: (page === 0 && chapterIndex === 0) ? 'rgba(255,255,255,0.2)' : '#fff',
        }}>← Préc.</button>

        {/* Barre de progression */}
        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', cursor: 'pointer' }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const ratio = (e.clientX - rect.left) / rect.width
            const newPage = Math.floor(ratio * total)
            setPage(Math.max(0, Math.min(total - 1, newPage)))
            setImgLoaded(false); setImgError(false)
          }}
        >
          <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 2, width: `${((page + 1) / total) * 100}%`, transition: 'width 0.2s' }} />
        </div>

        <button onClick={next} disabled={page === total - 1 && chapterIndex === totalChapters - 1} style={{
          padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
          background: (page === total - 1 && chapterIndex === totalChapters - 1) ? 'rgba(255,255,255,0.06)' : 'var(--accent)',
          color: '#fff',
        }}>Suiv. →</button>
      </div>
    </div>
  )
}

// ─── Section principale ─────────────────────────────────────────────────────
export default function Scans() {
  const [ref, inView] = useInView()
  const [hovered, setHovered] = useState(null)
  const [reading, setReading] = useState(null) // index du chapitre ouvert

  const openChapter = (i) => setReading(i)
  const closeReader = () => setReading(null)
  const prevChapter = () => setReading(i => Math.max(0, i - 1))
  const nextChapter = () => setReading(i => Math.min(CHAPTERS.length - 1, i + 1))

  return (
    <>
      <section id="scans" style={{ padding: '110px 0', position: 'relative', overflow: 'hidden' }} ref={ref}>
        <div style={{ position: 'absolute', top: '30%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,82,74,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div className={`reveal ${inView ? 'visible' : ''}`}>
              <div className="label">📖 Manga</div>
              <h2 className="h2" style={{ textAlign: 'center' }}>Arc Elbaf</h2>
              <p style={{ textAlign: 'center', margin: '0 auto 20px', fontSize: 15, color: 'rgba(255,255,255,0.65)', maxWidth: 500 }}>
                Tous les chapitres de l'arc Elbaf. Clique sur un chapitre pour lire directement ici.
              </p>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
                borderRadius: 100, padding: '5px 14px', fontSize: 12, fontWeight: 700, color: '#34d399',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                Arc en cours
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {CHAPTERS.map((ch, i) => (
              <button
                key={ch.num}
                onClick={() => openChapter(i)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: hovered === i ? 'rgba(224,82,74,0.12)' : 'rgba(20,21,24,0.75)',
                  border: `1px solid ${hovered === i ? 'rgba(224,82,74,0.45)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 14, padding: '18px 18px',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--body)',
                  transition: 'all 0.2s ease',
                  transform: hovered === i ? 'translateY(-3px)' : 'none',
                  boxShadow: hovered === i ? '0 10px 30px rgba(224,82,74,0.15)' : 'none',
                  animation: `fadeUp 0.5s ${Math.min(i, 8) * 0.04}s ease-out both`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 26 }}>{ch.emoji}</span>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>{ch.date}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 4 }}>
                  CHAPITRE {ch.num}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.35, marginBottom: 10 }}>
                  {ch.title}
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 12, fontWeight: 700,
                  color: hovered === i ? 'var(--accent)' : 'rgba(255,255,255,0.35)',
                  transition: 'color 0.2s',
                }}>
                  📖 Lire maintenant
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {reading !== null && (
        <Reader
          chapter={CHAPTERS[reading]}
          chapterIndex={reading}
          totalChapters={CHAPTERS.length}
          onClose={closeReader}
          onPrevChapter={prevChapter}
          onNextChapter={nextChapter}
        />
      )}
    </>
  )
}
