import { useState, useEffect, useCallback, useRef } from 'react'
import { useMobile } from '../hooks/useMediaQuery.js'

const DIRS = [
  { key: 'rtl', icon: '←', label: 'Original' },
  { key: 'ltr', icon: '→', label: 'Occidental' },
  { key: 'webtoon', icon: '↓', label: 'Webtoon' },
]

// Les webtoons coreens se lisent en defilement vertical, les mangas japonais
// page par page de droite a gauche. Un defaut unique se trompait pour les uns
// ou pour les autres. Le choix explicite de l'utilisateur prime toujours.
const WEBTOON_NATIVE = new Set(['solo-leveling', 'sl'])

// Le sens est retenu PAR SÉRIE. Il était global : passer Solo Leveling en
// webtoon faisait ouvrir Jujutsu Kaisen en webtoon, et remettre JJK en page par
// page renvoyait Solo Leveling en page par page. L'ancienne clé globale n'est
// plus lue : elle portait justement ce mélange.
const dirKey = ns => `manga_reading_dir:${ns}`
function loadDir(namespace) {
  try {
    const saved = localStorage.getItem(dirKey(namespace))
    if (saved) return saved
  } catch {}
  return WEBTOON_NATIVE.has(namespace) ? 'webtoon' : 'rtl'
}

function loadSpread() {
  try { return localStorage.getItem('manga_spread') !== '0' } catch { return true }
}

const FITS = [
  { key: 'width',  label: 'Largeur' },
  { key: 'height', label: 'Hauteur' },
  { key: 'raw',    label: 'Taille réelle' },
]

function loadFit() {
  try { return localStorage.getItem('manga_reading_fit') || 'width' } catch { return 'width' }
}

// nextChapter : { num, title, pages } du chapitre suivant (écran de fin +
// préchargement). sharePath : '/manga/<slug>' quand la page a une URL publique.
// chapters + onJumpChapter (optionnels) : liste déroulante pour sauter à
// n'importe quel chapitre sans repasser par la page série.
export function Reader({ chapter, chapterIndex, onClose, onPrevChapter, onNextChapter, totalChapters, onFinish, isRead, namespace = 'manga', themeColor = 'var(--accent)', nextChapter = null, sharePath = null, seriesTitle = null, chapters = null, onJumpChapter = null }) {
  const pages = chapter.pages || []
  const [page,        setPage]        = useState(0)
  const [imgLoaded,   setImgLoaded]   = useState(false)
  const [imgError,    setImgError]    = useState(false)
  const [markedRead,  setMarkedRead]  = useState(isRead)
  const [barsVisible, setBarsVisible] = useState(true)
  const [zoom,        setZoom]        = useState(1)
  const [dir,         setDir]         = useState(() => loadDir(namespace))
  const [fit,         setFit]         = useState(loadFit)
  const [webtoonPct,  setWebtoonPct]  = useState(0)
  // Écran de fin (mode page). Avant, la dernière page enchaînait sans rien dire
  // sur le chapitre suivant : aucun moment pour souffler, ni pour s'arrêter.
  const [endCard,     setEndCard]     = useState(false)
  const [autoNext,    setAutoNext]    = useState(true)
  const [countdown,   setCountdown]   = useState(6)
  const [copied,      setCopied]      = useState(false)
  const [spreadPref,  setSpreadPref]  = useState(loadSpread)
  const [isFs,        setIsFs]        = useState(false)
  const [tapHint,     setTapHint]     = useState(false)
  const touchX    = useRef(null)
  const touchY    = useRef(null)
  const pinchRef  = useRef(null)   // { startDist, startZoom } pendant un pincement
  const hideTimer = useRef(null)
  const scrollRef = useRef(null)
  const zoomRef   = useRef(1)
  const isMobile  = useMobile()
  const total     = pages.length
  const isWebtoon = dir === 'webtoon'
  const isRtl     = dir === 'rtl'
  // Double page (grand écran, mode page) : couverture seule, puis 2-3, 4-5…
  // comme un volume relié. `page` reste l'index retenu ; la paire affichée en
  // découle, ce qui garde la sauvegarde de page et la barre compatibles.
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1100 && window.innerWidth > window.innerHeight)
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 1100 && window.innerWidth > window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const spreadOn  = spreadPref && wide && !isMobile && !isWebtoon && total > 2
  const start     = spreadOn ? (page === 0 ? 0 : page % 2 === 1 ? page : page - 1) : page
  const shown     = spreadOn && start > 0 && start + 1 < total ? [start, start + 1] : [start]
  const lastShown = shown[shown.length - 1]
  const atStart   = start === 0 && chapterIndex === 0
  const atEnd     = lastShown >= total - 1 && chapterIndex === totalChapters - 1

  const clampZoom = z => Math.round(Math.max(0.5, Math.min(3, z)) * 10) / 10

  // Precharge les deux pages suivantes : en page par page, chaque tour de page
  // attendait sinon un aller-retour reseau complet.
  useEffect(() => {
    if (isWebtoon) return
    for (const i of [lastShown + 1, lastShown + 2, lastShown + 3]) {
      if (i < pages.length) { const im = new Image(); im.decoding = 'async'; im.src = pages[i] }
    }
  }, [lastShown, pages, isWebtoon])

  useEffect(() => { try { localStorage.setItem('manga_spread', spreadPref ? '1' : '0') } catch {} }, [spreadPref])

  // Plein écran : l'API du navigateur, pas un simple overlay — les barres du
  // système disparaissent aussi (touche F, bouton dans la barre).
  useEffect(() => {
    const h = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => {
      document.removeEventListener('fullscreenchange', h)
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [])
  const toggleFs = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])

  // Titre d'onglet : « Jujutsu Kaisen · Ch. 12 » plutôt que le titre générique
  // du site (onglets, historique, aperçu quand on colle le lien).
  const prevTitle = useRef(null)
  useEffect(() => {
    if (!seriesTitle) return
    if (prevTitle.current == null) prevTitle.current = document.title
    document.title = `${seriesTitle} · Ch. ${chapter.num} — Brams`
  }, [seriesTitle, chapter.num])
  useEffect(() => () => { if (prevTitle.current != null) document.title = prevTitle.current }, [])

  // Première lecture sur mobile : montrer les zones tactiles une fois.
  useEffect(() => {
    if (!isMobile || isWebtoon) return
    try {
      if (localStorage.getItem('mr_tap_hint')) return
      localStorage.setItem('mr_tap_hint', '1')
    } catch { return }
    setTapHint(true)
    const t = setTimeout(() => setTapHint(false), 5000)
    return () => clearTimeout(t)
  }, [isMobile, isWebtoon])

  useEffect(() => { zoomRef.current = zoom }, [zoom])

  useEffect(() => {
    try { localStorage.setItem(dirKey(namespace), dir) } catch {}
    try { localStorage.setItem('manga_reading_fit', fit) } catch {}
    scrollRef.current?.scrollTo({ top: 0 })
  }, [dir, fit])

  const showBars = useCallback(() => {
    setBarsVisible(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (!isWebtoon) hideTimer.current = setTimeout(() => setBarsVisible(false), 2500)
  }, [isWebtoon])

  useEffect(() => {
    showBars()
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current) }
  }, [])

  // Page mémorisée par chapitre. La sauvegarde vivait dans un effet sur
  // [page] qui tournait dans le même rendu que la restauration, avec l'état
  // encore à 0 : elle écrasait la page retenue, et la remise à zéro du
  // changement de chapitre passait derrière — on repartait toujours page 1.
  // Désormais on restaure ici, et on n'écrit qu'au tour de page (changePage).
  useEffect(() => {
    let start = 0
    if (total > 0 && !isWebtoon) {
      try {
        const saved = parseInt(localStorage.getItem(`${namespace}_page_${chapter.num}`) || '0', 10)
        if (saved > 0 && saved < total) start = saved
      } catch {}
    }
    setPage(start); setImgLoaded(false); setImgError(false); setZoom(1)
    setEndCard(false); setAutoNext(true); setCountdown(6)
    scrollRef.current?.scrollTo({ top: 0 })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.num, isWebtoon])

  // Les deux premières pages du chapitre suivant partent dès l'avant-dernière
  // page : le passage au chapitre suivant n'attend plus le réseau.
  useEffect(() => {
    if (!nextChapter?.pages?.length || isWebtoon || lastShown < total - 2) return
    for (const src of nextChapter.pages.slice(0, 2)) { const im = new Image(); im.decoding = 'async'; im.src = src }
  }, [lastShown, total, nextChapter, isWebtoon])

  const goNextChapter = useCallback(() => { setEndCard(false); onNextChapter() }, [onNextChapter])

  // Compte à rebours de l'écran de fin ; « Rester ici » l'arrête.
  useEffect(() => {
    if (!endCard || !autoNext || !nextChapter) return
    if (countdown <= 0) { goNextChapter(); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [endCard, autoNext, countdown, nextChapter, goNextChapter])

  const share = useCallback(async () => {
    if (!sharePath) return
    const url = `${window.location.origin}${sharePath}?ch=${chapter.num}`
    try {
      if (navigator.share && window.matchMedia?.('(pointer: coarse)').matches) { await navigator.share({ url, title: `Chapitre ${chapter.num}` }); return }
      await navigator.clipboard.writeText(url)
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    } catch {}
  }, [sharePath, chapter.num])

  useEffect(() => { setMarkedRead(isRead) }, [isRead])

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

  // Webtoon : la position était perdue à chaque fermeture (seul le mode page
  // retenait sa page). On retient la page en haut de l'écran, par chapitre.
  // Même clé que le mode page : la reprise du hub (« p. N ») la lit, et
  // passer de webtoon à page par page garde l'endroit où on en est.
  const wtKey = `${namespace}_page_${chapter.num}`
  const wtSaved = useRef(-1)
  const wtWarmed = useRef(null)
  useEffect(() => {
    if (!isWebtoon) return
    const el = scrollRef.current
    if (!el) return
    wtSaved.current = -1
    let saved = 0
    try { saved = parseInt(localStorage.getItem(wtKey) || '0', 10) || 0 } catch {}
    if (saved > 0 && saved < total) {
      // Les images au-dessus n'ont pas encore de hauteur : on recale quand la
      // cible a chargé, puis une seconde fois quand ses voisines ont poussé.
      const img = el.querySelectorAll('img')[saved]
      const jump = () => img?.scrollIntoView({ block: 'start' })
      jump()
      if (img && !img.complete) img.addEventListener('load', jump, { once: true })
      const t = setTimeout(jump, 900)
      return () => { clearTimeout(t); img?.removeEventListener('load', jump) }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWebtoon, chapter.num])

  useEffect(() => {
    if (!isWebtoon) return
    const el = scrollRef.current
    if (!el) return
    const fn = () => {
      const scrollable = el.scrollHeight - el.clientHeight
      setWebtoonPct(scrollable > 0 ? Math.min(1, el.scrollTop / scrollable) : 1)
      const imgs = el.querySelectorAll('img')
      const top = el.getBoundingClientRect().top + 1
      let idx = 0
      for (let i = 0; i < imgs.length; i++) {
        if (imgs[i].getBoundingClientRect().bottom > top) { idx = i; break }
      }
      if (idx !== wtSaved.current) {
        wtSaved.current = idx
        try { idx > 0 ? localStorage.setItem(wtKey, String(idx)) : localStorage.removeItem(wtKey) } catch {}
      }
    }
    el.addEventListener('scroll', fn, { passive: true })
    return () => el.removeEventListener('scroll', fn)
  }, [isWebtoon, wtKey])

  // Webtoon : arrivé en bas, le chapitre compte comme lu sans avoir à cliquer,
  // et les premières pages du suivant partent en avance.
  useEffect(() => {
    if (!isWebtoon) return
    if (webtoonPct > 0.8 && nextChapter?.pages?.length && wtWarmed.current !== chapter.num) {
      wtWarmed.current = chapter.num
      for (const src of nextChapter.pages.slice(0, 3)) { const im = new Image(); im.decoding = 'async'; im.src = src }
    }
    // Mesure en direct, pas l'état : au changement de chapitre l'état garde le
    // % du précédent, et tant que les images n'ont pas chargé la colonne est
    // courte (donc « en bas »). Il faut voir la dernière page, chargée.
    const el = scrollRef.current
    const imgs = el?.querySelectorAll('img')
    const last = imgs?.[imgs.length - 1]
    const atBottom = !!last && last.complete && last.naturalHeight > 0 &&
      last.getBoundingClientRect().top < el.getBoundingClientRect().bottom
    if (atBottom && !markedRead && total > 0) {
      onFinish(); setMarkedRead(true)
      try { localStorage.removeItem(wtKey) } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWebtoon, webtoonPct, chapter.num])

  const changePage = useCallback((newPage) => {
    const p = Math.max(0, Math.min(total - 1, newPage))
    setPage(p)
    setImgLoaded(false); setImgError(false)
    scrollRef.current?.scrollTo({ top: 0 })
    try { localStorage.setItem(`${namespace}_page_${chapter.num}`, String(p)) } catch {}
  }, [total, namespace, chapter.num])

  const next = useCallback(() => {
    if (isWebtoon) return
    if (lastShown < total - 1) { changePage(lastShown + 1); return }
    // Déjà sur l'écran de fin : « suivant » enchaîne (ou ferme au dernier).
    if (endCard) { chapterIndex < totalChapters - 1 ? goNextChapter() : onClose(); return }
    // Chapitre fini : sa page retenue n'a plus lieu d'être (une relecture
    // repartirait sinon de la dernière page).
    try { localStorage.removeItem(`${namespace}_page_${chapter.num}`) } catch {}
    onFinish(); setMarkedRead(true); setEndCard(true)
  }, [lastShown, total, chapterIndex, totalChapters, onFinish, onClose, changePage, isWebtoon, namespace, chapter.num, endCard, goNextChapter])

  const prev = useCallback(() => {
    if (isWebtoon) return
    if (endCard) { setEndCard(false); return }
    if (start > 0) changePage(spreadOn ? (start <= 1 ? 0 : start - 2) : start - 1)
    else if (chapterIndex > 0) onPrevChapter()
  }, [start, spreadOn, chapterIndex, onPrevChapter, changePage, isWebtoon, endCard])

  const handleMarkRead = useCallback(() => {
    onFinish(); setMarkedRead(true)
    try { localStorage.removeItem(`${namespace}_page_${chapter.num}`) } catch {}
  }, [onFinish, chapter.num, namespace])

  useEffect(() => {
    const fn = e => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === '+' || e.key === '=') { setZoom(z => clampZoom(z + 0.1)); return }
      if (e.key === '-') { setZoom(z => clampZoom(z - 0.1)); return }
      if (e.key === '0') { setZoom(1); return }
      if (e.key === 'f' || e.key === 'F') { toggleFs(); return }
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
  }, [next, prev, onClose, showBars, isRtl, isWebtoon, toggleFs])

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
            <div className="mr-title" style={{ fontWeight: 700, color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              {chapters?.length > 1 && onJumpChapter ? (
                <select
                  value={chapterIndex} onChange={e => { onJumpChapter(Number(e.target.value)); e.target.blur() }}
                  aria-label="Aller au chapitre" title="Aller au chapitre"
                  style={{
                    maxWidth: isMobile ? 120 : 260, padding: '3px 6px', borderRadius: 6, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
                    color: '#fff', fontWeight: 700, fontSize: 'inherit', fontFamily: 'inherit', colorScheme: 'dark',
                  }}
                >
                  {chapters.map((c, i) => (
                    <option key={i} value={i}>
                      {`Ch. ${c.num}`}{c.title && !/^(chapitre\s*)?[\d.]+$/i.test(String(c.title).trim()) ? ` · ${c.title}` : ''}
                    </option>
                  ))}
                </select>
              ) : <>{chapter.emoji} Ch.{chapter.num}</>}
              {sharePath && (
                <button onClick={share} title="Copier le lien de ce chapitre" aria-label="Partager ce chapitre" style={{
                  padding: '2px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  background: copied ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.07)',
                  border: `1px solid ${copied ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  color: copied ? '#34d399' : 'rgba(255,255,255,0.7)',
                }}>{copied ? '✓ Lien copié' : '🔗 Partager'}</button>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>
              {isWebtoon
                ? `Webtoon · ${Math.round(webtoonPct * 100)}%`
                : `${shown.length > 1 ? `Pages ${start + 1}-${start + 2}` : `Page ${start + 1}`} / ${total || '?'}${zoom !== 1 ? ` · ${Math.round(zoom * 100)}%` : ''}`}
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

        {/* Ajustement de la page — sans objet en webtoon, ou la page occupe
            toujours la largeur de la colonne. */}
        {!isWebtoon && (
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
            {FITS.map(f => (
              <button
                className="mr-dir-btn"
                key={f.key} onClick={() => setFit(f.key)} title={`Ajuster : ${f.label}`}
                style={{
                  padding: '6px 12px', border: 'none', cursor: 'pointer',
                  background: fit === f.key ? themeColor : 'rgba(255,255,255,0.04)',
                  color: fit === f.key ? '#fff' : 'rgba(255,255,255,0.38)',
                  transition: 'all .15s', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                }}
              >
                <span className="mr-dir-label">{f.label.toUpperCase()}</span>
              </button>
            ))}
            {wide && !isMobile && total > 2 && (
              <button
                className="mr-dir-btn" onClick={() => setSpreadPref(v => !v)} title="Double page (comme un volume relié)"
                aria-pressed={spreadPref}
                style={{
                  padding: '6px 12px', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                  background: spreadPref ? themeColor : 'rgba(255,255,255,0.04)',
                  color: spreadPref ? '#fff' : 'rgba(255,255,255,0.38)',
                  transition: 'all .15s', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                }}
              ><span className="mr-dir-label">2 PAGES</span></button>
            )}
          </div>
        )}

        <div className="mr-chapbtns" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {document.fullscreenEnabled && (
            <button onClick={toggleFs} title={isFs ? 'Quitter le plein écran (F)' : 'Plein écran (F)'} aria-label="Plein écran"
              style={{ padding: '6px 10px', borderRadius: 8, fontSize: 14, lineHeight: 1, cursor: 'pointer', background: isFs ? `${themeColor}33` : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#fff' }}
            >{isFs ? '🗗' : '⛶'}</button>
          )}
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
          <div style={{ position: 'relative', width: '100%', maxWidth: Math.round((shown.length > 1 ? 1700 : 850) * zoom), minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'max-width 0.15s ease' }}>
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
            {shown.length > 1 && !imgError && (
              <div style={{ display: 'flex', flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 2, width: '100%' }}>
                {shown.map(i => (
                  <img key={`${chapter.num}-${i}`} loading="eager" decoding="async" src={pages[i]} alt={`Ch.${chapter.num} p.${i + 1}`}
                    onLoad={() => setImgLoaded(true)}
                    onError={() => { setImgLoaded(true); setImgError(true) }}
                    style={{
                      display: 'block', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.2s',
                      height: `calc((100vh - 120px) * ${zoom})`, width: 'auto', maxWidth: `${50 * zoom}%`, objectFit: 'contain',
                    }} />
                ))}
              </div>
            )}
            {shown.length === 1 && pages[page] && (
              <img loading="eager" decoding="async"
                key={`${chapter.num}-${start}`} src={pages[start]} alt={`Ch.${chapter.num} p.${start + 1}`}
                onLoad={() => setImgLoaded(true)}
                onError={() => { setImgLoaded(true); setImgError(true) }}
                style={{
                  display: imgError ? 'none' : 'block',
                  opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.2s',
                  // Largeur : la page remplit la colonne. Hauteur : elle tient a
                  // l'ecran sans scroll. Taille reelle : aucun redimensionnement.
                  ...(fit === 'height'
                    ? { height: '100vh', width: 'auto', maxWidth: '100%', margin: '0 auto' }
                    : fit === 'raw'
                      ? { width: 'auto', height: 'auto', maxWidth: 'none' }
                      : { width: '100%', height: 'auto' }),
                }}
              />
            )}
          </div>
        </div>
      )}

      {tapHint && (
        <div onClick={() => setTapHint(false)} aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 6, display: 'flex', background: 'rgba(0,0,0,0.55)' }}>
          {[isRtl ? 'Page suivante' : 'Page précédente', 'Afficher / masquer le menu', isRtl ? 'Page précédente' : 'Page suivante'].map((label, i) => (
            <div key={i} style={{ flex: i === 1 ? 4 : 3, display: 'grid', placeItems: 'center', padding: 10, textAlign: 'center', color: '#fff', fontSize: 13, fontWeight: 700, borderLeft: i ? '1px dashed rgba(255,255,255,0.35)' : 'none', background: i === 1 ? 'transparent' : `${themeColor}22` }}>
              <span>{i === 0 ? '◀' : i === 2 ? '▶' : '☰'}<br />{label}</span>
            </div>
          ))}
        </div>
      )}

      {endCard && !isWebtoon && (
        <div role="dialog" aria-label={`Fin du chapitre ${chapter.num}`} style={{
          position: 'absolute', inset: 0, zIndex: 5, display: 'grid', placeItems: 'center', padding: 20,
          background: 'radial-gradient(700px 480px at 50% 45%, rgba(20,20,26,.9), rgba(6,6,8,.97))', backdropFilter: 'blur(6px)',
        }}>
          <div style={{ width: '100%', maxWidth: 440, textAlign: 'center', color: '#fff' }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', margin: '0 auto 14px', display: 'grid', placeItems: 'center', fontSize: 24, color: '#34d399', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.45)' }}>✓</div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.14em', color: 'rgba(255,255,255,.5)' }}>CHAPITRE {chapter.num} TERMINÉ</div>
            {nextChapter ? (
              <>
                <button onClick={goNextChapter} style={{
                  display: 'flex', alignItems: 'center', gap: 14, width: '100%', marginTop: 22, padding: 12, borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                  background: 'rgba(255,255,255,0.05)', border: `1px solid ${themeColor}66`, color: '#fff', position: 'relative', overflow: 'hidden',
                }}>
                  {nextChapter.pages?.[0] && <img src={nextChapter.pages[0]} alt="" style={{ width: 64, height: 88, objectFit: 'cover', objectPosition: 'top', borderRadius: 8, flexShrink: 0 }} />}
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: themeColor }}>SUIVANT</span>
                    <span style={{ display: 'block', fontSize: 17, fontWeight: 800, marginTop: 3 }}>Chapitre {nextChapter.num}</span>
                    {nextChapter.title && !/^chapitre\s*[\d.]+$/i.test(nextChapter.title) && (
                      <span style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,.65)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextChapter.title}</span>
                    )}
                  </span>
                  <span aria-hidden style={{ marginLeft: 'auto', fontSize: 22, color: themeColor, paddingRight: 6 }}>→</span>
                  {autoNext && (
                    <span aria-hidden style={{ position: 'absolute', left: 0, bottom: 0, height: 3, background: themeColor, width: `${((6 - countdown) / 6) * 100}%`, transition: 'width 1s linear' }} />
                  )}
                </button>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                  {autoNext && (
                    <button onClick={() => setAutoNext(false)} style={{ padding: '9px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff' }}>Rester ici ({countdown})</button>
                  )}
                  <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 700, background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,.75)' }}>Liste des chapitres</button>
                  <button onClick={() => setEndCard(false)} style={{ padding: '9px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 700, background: 'transparent', border: 'none', color: 'rgba(255,255,255,.5)' }}>← Revoir la page</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 14 }}>Tu es à jour 🎉</div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', margin: '8px 0 20px' }}>C'était le dernier chapitre disponible.</p>
                <button onClick={onClose} style={{ padding: '11px 22px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 800, background: themeColor, border: 'none', color: '#fff' }}>Retour à la série</button>
              </>
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
              <div style={{ height: '100%', background: themeColor, borderRadius: 3, width: total ? `${((lastShown + 1) / total) * 100}%` : '0%', transition: 'width 0.2s' }} />
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
