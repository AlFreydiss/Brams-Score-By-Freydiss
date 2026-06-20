import { useState, useEffect, useCallback, useRef } from 'react'
import { useMobile } from '../hooks/useMediaQuery.js'

const DIRS = [
  { key: 'rtl', icon: '←', label: 'Original' },
  { key: 'ltr', icon: '→', label: 'Occidental' },
  { key: 'webtoon', icon: '↓', label: 'Webtoon' },
]

function loadDir() {
  try { return localStorage.getItem('manga_reading_dir') || 'rtl' } catch { return 'rtl' }
}

export function Reader({ chapter, chapterIndex, onClose, onPrevChapter, onNextChapter, totalChapters, onFinish, isRead, namespace = 'manga', themeColor = 'var(--accent)' }) {
  const pages = chapter.pages || []
  const [page,        setPage]        = useState(0)
  const [imgLoaded,   setImgLoaded]   = useState(false)
  const [imgError,    setImgError]    = useState(false)
  const [markedRead,  setMarkedRead]  = useState(isRead)
  const [barsVisible, setBarsVisible] = useState(true)
  const [zoom,        setZoom]        = useState(1)
  const [dir,         setDir]         = useState(loadDir)
  const [webtoonPct,  setWebtoonPct]  = useState(0)
  const touchX    = useRef(null)
  const touchY    = useRef(null)
  const pinchRef  = useRef(null)   // { startDist, startZoom } pendant un pincement
  const hideTimer = useRef(null)
  const scrollRef = useRef(null)
  const zoomRef   = useRef(1)
  const isMobile  = useMobile()
  const total     = pages.length
  const atStart   = page === 0 && chapterIndex === 0
  const atEnd     = page === total - 1 && chapterIndex === totalChapters - 1
  const isWebtoon = dir === 'webtoon'
  const isRtl     = dir === 'rtl'

  const clampZoom = z => Math.round(Math.max(0.5, Math.min(3, z)) * 10) / 10

  useEffect(() => { zoomRef.current = zoom }, [zoom])

  useEffect(() => {
    try { localStorage.setItem('manga_reading_dir', dir) } catch {}
    scrollRef.current?.scrollTo({ top: 0 })
  }, [dir])

  const showBars = useCallback(() => {
    setBarsVisible(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (!isWebtoon) hideTimer.current = setTimeout(() => setBarsVisible(false), 2500)
  }, [isWebtoon])

  useEffect(() => {
    showBars()
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current) }
  }, [])

  useEffect(() => {
    if (total === 0 || isWebtoon) return
    try {
      const saved = parseInt(localStorage.getItem(`${namespace}_page_${chapter.num}`) || '0')
      if (saved > 0 && saved < total) { setPage(saved); setImgLoaded(false); setImgError(false) }
    } catch {}
  }, [chapter.num, total, namespace, isWebtoon])

  useEffect(() => {
    if (total === 0 || isWebtoon) return
    try { localStorage.setItem(`${namespace}_page_${chapter.num}`, String(page)) } catch {}
  }, [page, chapter.num, total, namespace, isWebtoon])

  useEffect(() => {
    setPage(0); setImgLoaded(false); setImgError(false); setMarkedRead(isRead); setZoom(1)
    scrollRef.current?.scrollTo({ top: 0 })
  }, [chapter.num, isRead])

  useEffect(() => {
    if (isWebtoon) return
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
      const cW = rect.width
      const oldOff = Math.max(0, (cW - 850 * oldZoom) / 2)
      const newOff = Math.max(0, (cW - 850 * newZoom) / 2)
      const xIn = el.scrollLeft + mouseX - oldOff
      const newSL = xIn * (newZoom / oldZoom) + newOff - mouseX
      const newST = (el.scrollTop + mouseY) * (newZoom / oldZoom) - mouseY
      zoomRef.current = newZoom
      setZoom(newZoom)
      requestAnimationFrame(() => {
        if (!scrollRef.current) return
        scrollRef.current.scrollLeft = Math.max(0, newSL)
        scrollRef.current.scrollTop  = Math.max(0, newST)
      })
    }
    el.addEventListener('wheel', fn, { passive: false })
    return () => el.removeEventListener('wheel', fn)
  }, [isWebtoon])

  useEffect(() => {
    if (!isWebtoon) return
    const el = scrollRef.current
    if (!el) return
    const fn = () => {
      const scrollable = el.scrollHeight - el.clientHeight
      setWebtoonPct(scrollable > 0 ? Math.min(1, el.scrollTop / scrollable) : 1)
    }
    el.addEventListener('scroll', fn, { passive: true })
    return () => el.removeEventListener('scroll', fn)
  }, [isWebtoon])

  const changePage = useCallback((newPage) => {
    setPage(Math.max(0, Math.min(total - 1, newPage)))
    setImgLoaded(false); setImgError(false)
    scrollRef.current?.scrollTo({ top: 0 })
  }, [total])

  const next = useCallback(() => {
    if (isWebtoon) return
    if (page < total - 1) changePage(page + 1)
    else if (chapterIndex < totalChapters - 1) { onFinish(); onNextChapter() }
    else { onFinish(); onClose() }
  }, [page, total, chapterIndex, totalChapters, onNextChapter, onFinish, onClose, changePage, isWebtoon])

  const prev = useCallback(() => {
    if (isWebtoon) return
    if (page > 0) changePage(page - 1)
    else if (chapterIndex > 0) onPrevChapter()
  }, [page, chapterIndex, onPrevChapter, changePage, isWebtoon])

  const handleMarkRead = useCallback(() => {
    onFinish(); setMarkedRead(true)
    try { localStorage.removeItem(`${namespace}_page_${chapter.num}`) } catch {}
  }, [onFinish, chapter.num, namespace])

  useEffect(() => {
    const fn = e => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === '+' || e.key === '=') { setZoom(z => clampZoom(z + 0.1)); return }
      if (e.key === '-') { setZoom(z => clampZoom(z - 0.1)); return }
      if (e.key === '0') { setZoom(1); return }
      if (isWebtoon) return
      if (isRtl) {
        if (e.key === 'ArrowLeft'  || e.key === 'ArrowDown')  { e.preventDefault(); next(); showBars() }
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp')    { e.preventDefault(); prev(); showBars() }
      } else {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  { e.preventDefault(); next(); showBars() }
        if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')    { e.preventDefault(); prev(); showBars() }
      }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [next, prev, onClose, showBars, isRtl, isWebtoon])

  const touchDist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)

  const onTouchStart = e => {
    if (e.touches.length === 2 && !isWebtoon) {
      // début d'un pincement pour zoomer
      pinchRef.current = { startDist: touchDist(e.touches), startZoom: zoomRef.current }
      touchX.current = null
      return
    }
    touchX.current = e.touches[0].clientX
    touchY.current = e.touches[0].clientY
    showBars()
  }

  const onTouchMove = e => {
    if (pinchRef.current && e.touches.length === 2) {
      e.preventDefault()
      const ratio = touchDist(e.touches) / pinchRef.current.startDist
      setZoom(clampZoom(pinchRef.current.startZoom * ratio))
    }
  }

  const onTouchEnd = e => {
    if (pinchRef.current) { pinchRef.current = null; return }
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    const dy = e.changedTouches[0].clientY - touchY.current
    const sx = touchX.current
    touchX.current = null
    if (isWebtoon || zoom !== 1) return  // en webtoon ou image zoomée : laisser le scroll/pan natif

    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      // swipe horizontal — RTL: gauche=suiv / LTR: droite=suiv
      isRtl ? (dx < 0 ? next() : prev()) : (dx > 0 ? next() : prev())
      return
    }
    // tap simple (pas de glissé) : zones tactiles gauche/droite, centre = barres
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      const w = window.innerWidth || 1
      if (sx < w * 0.30)      { isRtl ? next() : prev(); showBars() }
      else if (sx > w * 0.70) { isRtl ? prev() : next(); showBars() }
      else                    { setBarsVisible(v => !v) }
    }
  }

  const barStyle = { transition: 'opacity 0.35s ease', opacity: barsVisible ? 1 : 0, pointerEvents: barsVisible ? 'auto' : 'none' }

  return (
    <div
      className="mr-root"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}
      onMouseMove={showBars}
    >
      <style>{`
        .mr-root { padding-top: env(safe-area-inset-top); }
        .mr-scroll { overscroll-behavior: contain; }
        @media (max-width: 768px) {
          .mr-topbar { padding: 7px 10px !important; gap: 6px !important; row-gap: 6px !important; }
          .mr-title { font-size: 13px !important; }
          /* sélecteur de direction : icône seule pour gagner de la place */
          .mr-dir-label { display: none !important; }
          .mr-dir-btn { padding: 8px 12px !important; }
          .mr-chapbtns { gap: 6px !important; }
          .mr-chapbtns button { padding: 8px 11px !important; min-height: 40px; }
          /* boutons de bas de barre : cibles tactiles >=44px */
          .mr-navbtn { padding: 12px 18px !important; min-height: 44px; }
          /* barre de progression : zone de tap plus large */
          .mr-progress-hit { padding: 14px 0 !important; }
          .mr-bottombar { padding: 8px 12px env(safe-area-inset-bottom) !important; }
        }
        /* la barre de progression a une grande zone de tap mais reste visuellement fine */
        .mr-progress-hit { display: flex; align-items: center; }
      `}</style>
      {/* ── Top bar ── */}
      <div className="mr-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(12,12,14,0.97)', flexShrink: 0, backdropFilter: 'blur(14px)', gap: 8, flexWrap: 'wrap', ...barStyle }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '6px 10px', fontSize: 18, lineHeight: 1, transition: 'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          >✕</button>
          <div>
            <div className="mr-title" style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{chapter.emoji} Ch.{chapter.num}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>
              {isWebtoon
                ? `Webtoon · ${Math.round(webtoonPct * 100)}%`
                : `Page ${page + 1} / ${total || '?'}${zoom !== 1 ? ` · ${Math.round(zoom * 100)}%` : ''}`}
            </div>
          </div>
        </div>

        {/* Direction selector */}
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
          {DIRS.map(d => (
            <button
              className="mr-dir-btn"
              key={d.key} onClick={() => setDir(d.key)} title={d.label}
              style={{
                padding: '6px 14px', border: 'none', cursor: 'pointer',
                background: dir === d.key ? themeColor : 'rgba(255,255,255,0.04)',
                color: dir === d.key ? '#fff' : 'rgba(255,255,255,0.38)',
                transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
              }}
            >
              <span style={{ fontSize: 14 }}>{d.icon}</span>
              <span className="mr-dir-label">{d.label.toUpperCase()}</span>
            </button>
          ))}
        </div>

        <div className="mr-chapbtns" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={handleMarkRead} disabled={markedRead}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: markedRead ? 'default' : 'pointer', border: `1px solid ${markedRead ? 'rgba(52,211,153,0.4)' : 'rgba(52,211,153,0.22)'}`, background: markedRead ? 'rgba(52,211,153,0.18)' : 'rgba(52,211,153,0.07)', color: markedRead ? '#34d399' : 'rgba(52,211,153,0.65)', transition: 'all 0.15s' }}
          >{markedRead ? '✓ Lu' : '✓ Marquer comme lu'}</button>
          <button onClick={onPrevChapter} disabled={chapterIndex === 0} style={{ padding: '6px 11px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: chapterIndex === 0 ? 'default' : 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: chapterIndex === 0 ? 'rgba(255,255,255,0.18)' : '#fff' }}>← Ch.</button>
          <button onClick={onNextChapter} disabled={chapterIndex === totalChapters - 1} style={{ padding: '6px 11px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: chapterIndex === totalChapters - 1 ? 'default' : 'pointer', background: chapterIndex === totalChapters - 1 ? 'rgba(255,255,255,0.03)' : themeColor, border: 'none', color: chapterIndex === totalChapters - 1 ? 'rgba(255,255,255,0.18)' : '#fff' }}>Ch. →</button>
        </div>
      </div>

      {/* ── Contenu ── */}
      {isWebtoon ? (
        <div ref={scrollRef} className="mr-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: '#111', WebkitOverflowScrolling: 'touch' }}
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        >
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            {pages.map((src, i) => (
              <img
                key={`${chapter.num}-wt-${i}`}
                src={src}
                alt={`Ch.${chapter.num} p.${i + 1}`}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                loading={i < 3 ? 'eager' : 'lazy'}
              />
            ))}
            <div style={{ padding: '52px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>✓</div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: 17, marginBottom: 22 }}>Fin du chapitre {chapter.num}</div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {!markedRead && (
                  <button onClick={handleMarkRead} style={{ padding: '11px 24px', borderRadius: 10, border: '1px solid rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.13)', color: '#34d399', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>✓ Marquer comme lu</button>
                )}
                {chapterIndex < totalChapters - 1 && (
                  <button onClick={() => { onFinish(); onNextChapter() }} style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: themeColor, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Chapitre suivant →</button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div ref={scrollRef} className="mr-scroll" style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', touchAction: zoom !== 1 ? 'pan-x pan-y' : 'pan-y', WebkitOverflowScrolling: 'touch' }}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        >
          <div style={{ position: 'relative', width: '100%', maxWidth: Math.round(850 * zoom), minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'max-width 0.15s ease' }}>
            {!imgLoaded && !imgError && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
                  <div style={{ fontSize: 13 }}>Chargement page…</div>
                </div>
              </div>
            )}
            {imgError && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
                <div style={{ fontWeight: 700, marginBottom: 8, color: '#fff' }}>Image introuvable</div>
                <button onClick={() => { setImgLoaded(false); setImgError(false) }}
                  style={{ padding: '8px 18px', borderRadius: 9, background: 'rgba(255,255,255,0.09)', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Réessayer</button>
              </div>
            )}
            {pages[page] && (
              <img loading="lazy" decoding="async"
                key={`${chapter.num}-${page}`} src={pages[page]} alt={`Ch.${chapter.num} p.${page + 1}`}
                onLoad={() => setImgLoaded(true)}
                onError={() => { setImgLoaded(true); setImgError(true) }}
                style={{ display: imgError ? 'none' : 'block', width: '100%', height: 'auto', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.2s' }}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Bottom bar ── */}
      {isWebtoon ? (
        <div className="mr-bottombar" style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', background: 'rgba(12,12,14,0.97)', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, backdropFilter: 'blur(14px)', gap: 12, ...barStyle }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>Scroll</span>
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: themeColor, borderRadius: 2, width: `${webtoonPct * 100}%`, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', flexShrink: 0, minWidth: 36, textAlign: 'right' }}>{Math.round(webtoonPct * 100)}%</span>
        </div>
      ) : (
        <div className="mr-bottombar" style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', background: 'rgba(12,12,14,0.97)', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, backdropFilter: 'blur(14px)', gap: 12, ...barStyle }}>
          <button
            className="mr-navbtn"
            onClick={isRtl ? next : prev} disabled={isRtl ? atEnd : atStart}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: (isRtl ? atEnd : atStart) ? 'default' : 'pointer', fontWeight: 700, fontSize: 14, background: (isRtl ? atEnd : atStart) ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.09)', color: (isRtl ? atEnd : atStart) ? 'rgba(255,255,255,0.18)' : '#fff', flexShrink: 0 }}
          >{isRtl ? '← Suiv.' : '← Préc.'}</button>

          <div
            className="mr-progress-hit"
            style={{ flex: 1, cursor: 'pointer' }}
            onClick={e => {
              if (!total) return
              const r = e.currentTarget.getBoundingClientRect()
              let frac = (e.clientX - r.left) / r.width
              if (isRtl) frac = 1 - frac
              changePage(Math.floor(frac * total))
            }}
          >
            <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', direction: isRtl ? 'rtl' : 'ltr', width: '100%' }}>
              <div style={{ height: '100%', background: themeColor, borderRadius: 3, width: total ? `${((page + 1) / total) * 100}%` : '0%', transition: 'width 0.2s' }} />
            </div>
          </div>

          <button
            className="mr-navbtn"
            onClick={isRtl ? prev : next} disabled={isRtl ? atStart : atEnd}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: (isRtl ? atStart : atEnd) ? 'default' : 'pointer', fontWeight: 700, fontSize: 14, background: (isRtl ? atStart : atEnd) ? 'rgba(255,255,255,0.05)' : themeColor, color: '#fff', flexShrink: 0 }}
          >{isRtl ? 'Préc. →' : 'Suiv. →'}</button>
        </div>
      )}

      {/* Hint clavier (visible 3s au lancement) — masqué sur mobile (pas de clavier) */}
      {!isWebtoon && barsVisible && !isMobile && (
        <div style={{ position: 'absolute', bottom: 70, right: 16, display: 'flex', gap: 8, opacity: 0.45, pointerEvents: 'none' }}>
          {(isRtl
            ? [['←', 'Page suiv.'], ['→', 'Page préc.']]
            : [['←', 'Page préc.'], ['→', 'Page suiv.']]
          ).map(([k, v]) => (
            <span key={k} style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
              <kbd style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3, padding: '1px 5px', fontFamily: 'monospace', marginRight: 3 }}>{k}</kbd>{v}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
