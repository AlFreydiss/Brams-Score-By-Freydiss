import { useState, useEffect, useCallback, useRef } from 'react'

function mkPages(num, count = 18) {
  return Array.from({ length: count }, (_, i) => `/scans/ch${num}/${String(i + 1).padStart(3, '0')}.jpg`)
}

const EMOJIS = ['🏴‍☠️','⚔️','📜','💥','🌊','🔥','👑','🌀','🛡️','⚡','🌋','🗡️','☀️','🔴','🏔️','🤝','💰','⛈️','🎯','🌸','💎','🌑','⚕️','💫','🌺','🦁','⚓']
const LAST_AVAILABLE = 1182

const CHAPTERS = Array.from({ length: LAST_AVAILABLE - 1126 + 1 }, (_, i) => {
  const num = 1126 + i
  return { num, title: `Chapitre ${num}`, emoji: EMOJIS[i % EMOJIS.length], pages: mkPages(num) }
})

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

  useEffect(() => { setPage(0); setImgLoaded(false); setImgError(false) }, [chapter.num])

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
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(14,14,16,0.95)', flexShrink: 0, backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '6px 10px', fontSize: 18, lineHeight: 1,
          }}>✕</button>
          <div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{chapter.emoji} Ch.{chapter.num}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Page {page + 1} / {total}</div>
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

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
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
              <div style={{ fontWeight: 700, marginBottom: 8, color: '#fff' }}>Image non disponible</div>
              <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                Place les fichiers dans :<br />
                <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                  /public/scans/ch{chapter.num}/{String(page + 1).padStart(3, '0')}.jpg
                </code>
              </div>
            </div>
          )}
          <img
            key={`${chapter.num}-${page}`}
            src={chapter.pages[page]}
            alt={`Ch.${chapter.num} p.${page + 1}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => { setImgLoaded(true); setImgError(true) }}
            style={{ display: imgError ? 'none' : 'block', width: '100%', height: 'auto', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.2s' }}
          />
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', background: 'rgba(14,14,16,0.95)',
        borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0,
        backdropFilter: 'blur(12px)', gap: 12,
      }}>
        <button onClick={prev} disabled={page === 0 && chapterIndex === 0} style={{
          padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
          background: (page === 0 && chapterIndex === 0) ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)',
          color: (page === 0 && chapterIndex === 0) ? 'rgba(255,255,255,0.2)' : '#fff',
        }}>← Préc.</button>
        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', cursor: 'pointer' }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const ratio = (e.clientX - rect.left) / rect.width
            const newPage = Math.floor(ratio * total)
            setPage(Math.max(0, Math.min(total - 1, newPage)))
            setImgLoaded(false); setImgError(false)
          }}>
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

export default function ScansPage({ onClose }) {
  const [reading, setReading] = useState(null)
  const [search, setSearch] = useState('')
  const [hovered, setHovered] = useState(null)

  const filtered = search.trim()
    ? CHAPTERS.filter(c => String(c.num).includes(search.trim()))
    : CHAPTERS

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape' && reading === null) onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [reading, onClose])

  const openChapter = (idx) => setReading(idx)
  const prevChapter = () => setReading(i => Math.max(0, i - 1))
  const nextChapter = () => setReading(i => Math.min(CHAPTERS.length - 1, i + 1))

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      animation: 'fadeIn 0.18s ease-out',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
        padding: '0 28px', height: 68,
        background: 'rgba(17,18,20,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <button onClick={onClose} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border)',
          borderRadius: 10, color: '#fff', cursor: 'pointer',
          padding: '8px 16px', fontSize: 14, fontWeight: 700,
          transition: 'background 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
        >
          ← Retour
        </button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18, color: '#fff' }}>
            📖 Scans — Arc Elbaf
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
            borderRadius: 100, padding: '3px 11px', fontSize: 11, fontWeight: 700, color: '#34d399',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Arc en cours
          </span>
        </div>

        <input
          type="text"
          placeholder="N° chapitre…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
            borderRadius: 10, color: '#fff', padding: '8px 14px', fontSize: 13,
            outline: 'none', width: 140, fontFamily: 'var(--body)',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'rgba(224,82,74,0.5)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
        />
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '36px 28px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
              {filtered.length} chapitre{filtered.length > 1 ? 's' : ''} · Ch.1126 → Ch.{LAST_AVAILABLE}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <div style={{ fontWeight: 700, color: '#fff', marginBottom: 8 }}>Aucun résultat</div>
              <div style={{ fontSize: 14 }}>Aucun chapitre pour "{search}"</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
              {filtered.map((ch, i) => {
                const idx = CHAPTERS.indexOf(ch)
                return (
                  <button
                    key={ch.num}
                    onClick={() => openChapter(idx)}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      background: hovered === i ? 'rgba(224,82,74,0.12)' : 'rgba(20,21,24,0.8)',
                      border: `1px solid ${hovered === i ? 'rgba(224,82,74,0.45)' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: 14, padding: '18px',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--body)',
                      transition: 'all 0.18s ease',
                      transform: hovered === i ? 'translateY(-3px)' : 'translateY(0)',
                      boxShadow: hovered === i ? '0 10px 30px rgba(224,82,74,0.15)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 24 }}>{ch.emoji}</span>
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
                      color: hovered === i ? 'var(--accent)' : 'rgba(255,255,255,0.3)',
                      transition: 'color 0.18s',
                    }}>
                      📖 Lire
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {reading !== null && (
        <Reader
          chapter={CHAPTERS[reading]}
          chapterIndex={reading}
          totalChapters={CHAPTERS.length}
          onClose={() => setReading(null)}
          onPrevChapter={prevChapter}
          onNextChapter={nextChapter}
        />
      )}
    </div>
  )
}
