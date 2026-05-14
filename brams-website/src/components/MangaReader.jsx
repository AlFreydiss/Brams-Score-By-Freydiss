import { useState, useEffect, useCallback, useRef } from 'react'

export function Reader({ chapter, chapterIndex, onClose, onPrevChapter, onNextChapter, totalChapters, onFinish, isRead, namespace = 'manga', themeColor = 'var(--accent)' }) {
  const pages = chapter.pages || []
  const [page,        setPage]        = useState(0)
  const [imgLoaded,   setImgLoaded]   = useState(false)
  const [imgError,    setImgError]    = useState(false)
  const [markedRead,  setMarkedRead]  = useState(isRead)
  const [barsVisible, setBarsVisible] = useState(true)
  const [zoom,        setZoom]        = useState(1)
  const touchX    = useRef(null)
  const hideTimer = useRef(null)
  const scrollRef = useRef(null)
  const zoomRef   = useRef(1)
  const total   = pages.length
  const atStart = page === 0 && chapterIndex === 0
  const atEnd   = page === total - 1 && chapterIndex === totalChapters - 1

  const clampZoom = z => Math.round(Math.max(0.5, Math.min(3, z)) * 10) / 10

  useEffect(() => { zoomRef.current = zoom }, [zoom])

  const showBars = useCallback(() => {
    setBarsVisible(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setBarsVisible(false), 2500)
  }, [])

  useEffect(() => {
    showBars()
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current) }
  }, [])

  useEffect(() => {
    if (total === 0) return
    try {
      const saved = parseInt(localStorage.getItem(`${namespace}_page_${chapter.num}`) || '0')
      if (saved > 0 && saved < total) { setPage(saved); setImgLoaded(false); setImgError(false) }
    } catch {}
  }, [chapter.num, total, namespace])

  useEffect(() => {
    if (total === 0) return
    try { localStorage.setItem(`${namespace}_page_${chapter.num}`, String(page)) } catch {}
  }, [page, chapter.num, total, namespace])

  useEffect(() => {
    setPage(0); setImgLoaded(false); setImgError(false); setMarkedRead(isRead); setZoom(1)
  }, [chapter.num, isRead])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const fn = e => {
      e.preventDefault()
      const rect    = el.getBoundingClientRect()
      const mouseX  = e.clientX - rect.left
      const mouseY  = e.clientY - rect.top
      const oldZoom = zoomRef.current
      const newZoom = clampZoom(oldZoom + (e.deltaY < 0 ? 0.1 : -0.1))
      if (newZoom === oldZoom) return

      const containerW = rect.width
      const oldOffset  = Math.max(0, (containerW - 850 * oldZoom) / 2)
      const newOffset  = Math.max(0, (containerW - 850 * newZoom) / 2)
      const xInContent = el.scrollLeft + mouseX - oldOffset
      const newScrollL = xInContent * (newZoom / oldZoom) + newOffset - mouseX
      const newScrollT = (el.scrollTop + mouseY) * (newZoom / oldZoom) - mouseY

      zoomRef.current = newZoom
      setZoom(newZoom)
      requestAnimationFrame(() => {
        if (!scrollRef.current) return
        scrollRef.current.scrollLeft = Math.max(0, newScrollL)
        scrollRef.current.scrollTop  = Math.max(0, newScrollT)
      })
    }
    el.addEventListener('wheel', fn, { passive: false })
    return () => el.removeEventListener('wheel', fn)
  }, [])

  const changePage = useCallback((newPage) => {
    setPage(Math.max(0, Math.min(total - 1, newPage)))
    setImgLoaded(false); setImgError(false)
  }, [total])

  const prev = useCallback(() => {
    if (page > 0) changePage(page - 1)
    else if (chapterIndex > 0) onPrevChapter()
  }, [page, chapterIndex, onPrevChapter, changePage])

  const next = useCallback(() => {
    if (page < total - 1) changePage(page + 1)
    else if (chapterIndex < totalChapters - 1) { onFinish(); onNextChapter() }
    else { onFinish(); onClose() }
  }, [page, total, chapterIndex, totalChapters, onNextChapter, onFinish, onClose, changePage])

  const handleMarkRead = useCallback(() => {
    onFinish()
    setMarkedRead(true)
    try { localStorage.removeItem(`${namespace}_page_${chapter.num}`) } catch {}
  }, [onFinish, chapter.num, namespace])

  useEffect(() => {
    const fn = e => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { next(); showBars() }
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { prev(); showBars() }
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') setZoom(z => clampZoom(z + 0.1))
      if (e.key === '-') setZoom(z => clampZoom(z - 0.1))
      if (e.key === '0') setZoom(1)
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [next, prev, onClose, showBars])

  const onTouchStart = e => { touchX.current = e.touches[0].clientX; showBars() }
  const onTouchEnd   = e => {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev()
    touchX.current = null
  }

  const barStyle = { transition: 'opacity 0.35s ease', opacity: barsVisible ? 1 : 0, pointerEvents: barsVisible ? 'auto' : 'none' }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.97)', display: 'flex', flexDirection: 'column' }}
      onMouseMove={showBars}
    >
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(14,14,16,0.95)', flexShrink: 0, backdropFilter: 'blur(12px)', gap: 8, flexWrap: 'wrap', ...barStyle }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '6px 10px', fontSize: 18, lineHeight: 1 }}>✕</button>
          <div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{chapter.emoji} Ch.{chapter.num}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Page {page + 1} / {total || '?'}{zoom !== 1 ? ` · ${Math.round(zoom * 100)}%` : ''}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={handleMarkRead}
            disabled={markedRead}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: markedRead ? 'default' : 'pointer', border: `1px solid ${markedRead ? 'rgba(52,211,153,0.4)' : 'rgba(52,211,153,0.25)'}`, background: markedRead ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.08)', color: markedRead ? '#34d399' : 'rgba(52,211,153,0.7)', transition: 'all 0.15s' }}
          >
            {markedRead ? '✓ Lu' : '✓ Marquer comme lu'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onPrevChapter} disabled={chapterIndex === 0} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: chapterIndex === 0 ? 'default' : 'pointer', background: chapterIndex === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: chapterIndex === 0 ? 'rgba(255,255,255,0.2)' : '#fff' }}>← Préc.</button>
          <button onClick={onNextChapter} disabled={chapterIndex === totalChapters - 1} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: chapterIndex === totalChapters - 1 ? 'default' : 'pointer', background: chapterIndex === totalChapters - 1 ? 'rgba(255,255,255,0.04)' : themeColor, border: 'none', color: chapterIndex === totalChapters - 1 ? 'rgba(255,255,255,0.2)' : '#fff' }}>Suiv. →</button>
        </div>
      </div>

      {/* Image zone */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div style={{ position: 'relative', width: '100%', maxWidth: Math.round(850 * zoom), minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'max-width 0.15s ease' }}>
          {!imgLoaded && !imgError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: 40, marginBottom: 12, animation: 'pulse 1.5s infinite' }}>📖</div>
                <div style={{ fontSize: 13 }}>Chargement page…</div>
              </div>
            </div>
          )}
          {imgError && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
              <div style={{ fontWeight: 700, marginBottom: 8, color: '#fff' }}>Image introuvable</div>
              <button onClick={() => { setImgLoaded(false); setImgError(false) }}
                style={{ padding: '8px 18px', borderRadius: 9, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                Réessayer
              </button>
            </div>
          )}
          {pages[page] && (
            <img key={`${chapter.num}-${page}`} src={pages[page]} alt={`Ch.${chapter.num} p.${page + 1}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => { setImgLoaded(true); setImgError(true) }}
              style={{ display: imgError ? 'none' : 'block', width: '100%', height: 'auto', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.2s' }}
            />
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(14,14,16,0.95)', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, backdropFilter: 'blur(12px)', gap: 12, ...barStyle }}>
        <button onClick={prev} disabled={atStart} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: atStart ? 'default' : 'pointer', fontWeight: 700, fontSize: 14, background: atStart ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)', color: atStart ? 'rgba(255,255,255,0.2)' : '#fff' }}>← Préc.</button>

        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', cursor: 'pointer' }}
          onClick={e => {
            if (!total) return
            const r = e.currentTarget.getBoundingClientRect()
            changePage(Math.floor(((e.clientX - r.left) / r.width) * total))
          }}>
          <div style={{ height: '100%', background: themeColor, borderRadius: 2, width: total ? `${((page + 1) / total) * 100}%` : '0%', transition: 'width 0.2s' }} />
        </div>

        <button onClick={next} disabled={atEnd} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: atEnd ? 'default' : 'pointer', fontWeight: 700, fontSize: 14, background: atEnd ? 'rgba(255,255,255,0.06)' : themeColor, color: '#fff' }}>Suiv. →</button>
      </div>
    </div>
  )
}
