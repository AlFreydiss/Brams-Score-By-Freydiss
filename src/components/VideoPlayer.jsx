import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import EpisodeDetailOverlay from './EpisodeDetailOverlay.jsx'
import { getAnimeMeta } from '../data/anime-meta.js'
import { setBoost, corsUrl } from '../lib/audioBoost.js'
import { saveWatchProgress, getWatchProgress } from '../lib/watchProgress.js'

// Écran tactile (téléphone/tablette) : active la couche de contrôles au doigt.
const IS_COARSE = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

function fmt(sec) {
  const t = Math.max(0, Math.floor(sec || 0))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function encSrc(src) {
  return src.split('/').map((seg, i) => i === 0 ? seg : encodeURIComponent(seg)).join('/')
}

function sourceType(src = '') {
  const clean = src.split('?')[0].toLowerCase()
  if (clean.endsWith('.mp4')) return 'video/mp4'
  if (clean.endsWith('.webm')) return 'video/webm'
  if (clean.endsWith('.mkv')) return 'video/x-matroska'
  if (clean.endsWith('.m3u8')) return 'application/x-mpegURL'
  return 'video/mp4'
}

// HLS (.m3u8) : seul Safari le lit nativement. Sur Chrome/Edge/Firefox il faut
// hls.js (MSE), sinon la vidéo ne charge jamais — d'où les épisodes MHA "infinis".
const isHlsSrc = (s = '') => /\.m3u8(\?|#|$)/i.test(s)
const NATIVE_HLS = typeof document !== 'undefined'
  && !!document.createElement('video').canPlayType('application/vnd.apple.mpegurl')

function loadVideoProgress(storageKey) {
  if (!storageKey) return null
  try { return JSON.parse(localStorage.getItem(storageKey) || 'null') } catch { return null }
}

function saveVideoProgress(storageKey, progress) {
  if (!storageKey) return
  try { localStorage.setItem(storageKey, JSON.stringify(progress)) } catch {}
}

const VIDEO_PREFS_KEY = 'brams_video_preferences'
// Défaut voulu : gros texte, sans fond, contour + ombre (lisible sur l'image).
const DEFAULT_SUBTITLE_STYLE = {
  size: 34,
  background: 0,
  color: '#ffffff',
  outline: true,
  outlineColor: '#000000', // couleur du contour, personnalisable
  shadow: true,            // ombre portée derrière le texte
  weight: 800,
  bottom: 110,
}

// Style des sous-titres = préférence PAR MEMBRE (chacun garde le sien), stockée
// par userId. Migration depuis l'ancienne clé d'appareil si le membre n'a encore
// rien personnalisé. Hors connexion → clé d'appareil de secours.
const SUB_STYLE_KEY = 'brams_subtitle_style_v1'
function subStyleKey(userId) { return userId ? `${SUB_STYLE_KEY}_${userId}` : SUB_STYLE_KEY }
function loadSubStyle(userId) {
  try {
    // pref du membre en priorité, sinon ancienne clé d'appareil (migration), sinon défaut
    const raw = localStorage.getItem(subStyleKey(userId))
      || (userId ? localStorage.getItem(SUB_STYLE_KEY) : null)
    const saved = JSON.parse(raw || 'null') || {}
    return {
      ...DEFAULT_SUBTITLE_STYLE,
      ...saved,
      // 0 = sans fond doit être respecté (plus de plancher forcé)
      background: typeof saved.background === 'number' ? saved.background : DEFAULT_SUBTITLE_STYLE.background,
    }
  } catch { return { ...DEFAULT_SUBTITLE_STYLE } }
}
function saveSubStyle(userId, style) { try { localStorage.setItem(subStyleKey(userId), JSON.stringify(style)) } catch {} }

function videoPrefsKey(userId) {
  return userId ? `${VIDEO_PREFS_KEY}_${userId}` : VIDEO_PREFS_KEY
}

function loadVideoPreferences(userId) {
  try {
    const prefs = JSON.parse(localStorage.getItem(videoPrefsKey(userId)) || 'null') || {
      audioLang: 'ja',
      subtitlesOff: false,
      subtitleLang: 'fr',
    }
    return {
      audioLang: prefs.audioLang || 'ja',
      subtitlesOff: Boolean(prefs.subtitlesOff),
      subtitleLang: prefs.subtitleLang || 'fr',
      autoplayNext: prefs.autoplayNext !== false,   // défaut ON (opt-out)
      subtitleStyle: loadSubStyle(userId), // par membre
    }
  } catch {
    return { audioLang: 'ja', subtitlesOff: false, subtitleLang: 'fr', autoplayNext: true, subtitleStyle: DEFAULT_SUBTITLE_STYLE }
  }
}

function saveVideoPreferences(userId, prefs) {
  try { localStorage.setItem(videoPrefsKey(userId), JSON.stringify(prefs)) } catch {}
}

function langMatches(value = '', target = '') {
  const v = String(value).toLowerCase()
  const t = String(target).toLowerCase()
  if (!v || !t) return false
  if (v === t || v.startsWith(`${t}-`)) return true
  if (t === 'ja') return ['jpn', 'japanese', 'japonais', 'jp'].some(x => v.includes(x))
  if (t === 'fr') return ['fre', 'fra', 'french', 'francais', 'français', 'vf'].some(x => v.includes(x))
  return false
}

function findTrackIndex(tracks, preferredLang, fallbackIndex = 0) {
  if (!tracks?.length) return fallbackIndex
  const found = tracks.findIndex(track => (
    langMatches(track.srclang, preferredLang) ||
    langMatches(track.language, preferredLang) ||
    langMatches(track.label, preferredLang)
  ))
  return found >= 0 ? found : Math.min(fallbackIndex, tracks.length - 1)
}

function progressKeyFor(video, idx) {
  return String(video?.progressKey || video?.id || (video?.episode ?? idx + 1))
}

function videoDisplayLabel(video) {
  if (!video) return ''
  if (video.episodeLabel) return video.episodeLabel
  if (video.kind === 'film') return 'Film'
  if (video.kind === 'ova') return 'OAV'
  return `Episode ${video.episode}`
}

function cleanCueText(text) {
  const seen = new Set()
  return String(text || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\{[^}]*\}/g, '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => {
      if (seen.has(line)) return false
      seen.add(line)
      return true
    })
    .join('\n')
}


const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

// ── Styles bottom-sheet « Réglages » (tactile uniquement) ──
const vpSheetSection = { padding: '12px 4px 5px', color: 'rgba(255,255,255,0.42)', fontSize: 12, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }
const vpSheetRow = (active, color) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  width: '100%', minHeight: 48, padding: '0 12px', marginBottom: 2,
  background: active ? `${color}22` : 'rgba(255,255,255,0.05)',
  border: `1px solid ${active ? color + '55' : 'rgba(255,255,255,0.1)'}`,
  borderRadius: 10, color: active ? color : '#fff',
  fontSize: 15, fontWeight: active ? 800 : 600, textAlign: 'left',
  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
})

// ── Bouton icône ─────────────────────────────────────────────────────────────
// Sur écran tactile (IS_COARSE) les boutons passent à ≥44px (cible WCAG 2.5.8) avec
// icônes plus grandes — au doigt les versions 32px/fontSize:16 étaient imprécises.
function Btn({ onClick, title, children, disabled = false, active = false, color = 'rgba(255,255,255,0.85)' }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: active ? 'rgba(255,255,255,0.12)' : hov ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: 'none', cursor: disabled ? 'default' : 'pointer',
        color: disabled ? 'rgba(255,255,255,0.2)' : color,
        borderRadius: IS_COARSE ? 10 : 8,
        padding: IS_COARSE ? '9px 12px' : '5px 8px',
        fontSize: IS_COARSE ? 21 : 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background .15s, color .15s', flexShrink: 0,
        minWidth: IS_COARSE ? 44 : 32,
        height: IS_COARSE ? 44 : 32,
        WebkitTapHighlightColor: 'transparent',
      }}
    >{children}</button>
  )
}

// ── Barre de progression ──────────────────────────────────────────────────────
function ProgressBar({ currentTime, duration, buffered, onSeek, color, previewSrc, previewTitle, scrubSrc }) {
  const barRef = useRef(null)
  const pvRef = useRef(null)          // <video> d'aperçu : on le cale sur le temps survolé
  const seekingRef = useRef(false)
  const pendingRef = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [hoverPct, setHoverPct] = useState(null)
  const pct = duration ? Math.min(1, currentTime / duration) : 0
  const bufPct = duration ? Math.min(1, buffered / duration) : 0
  const hoverTime = hoverPct !== null && duration ? hoverPct * duration : 0

  const getPos = useCallback((e) => {
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect) return 0
    // clientX direct (souris) ou via le 1er touch (tactile).
    const clientX = e.clientX != null ? e.clientX : (e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX ?? rect.left)
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }, [])

  // Aperçu de frame réelle : on déplace le currentTime de la <video> d'aperçu vers
  // le temps survolé. Throttlé via l'event 'seeked' (on ne relance que la dernière
  // position demandée) → fluide sans saturer le décodeur.
  const requestPreview = useCallback((t) => {
    pendingRef.current = t
    const v = pvRef.current
    if (!v || !scrubSrc || !Number.isFinite(t) || seekingRef.current) return
    seekingRef.current = true
    try { v.currentTime = t } catch {}
  }, [scrubSrc])
  const onPvSeeked = useCallback(() => {
    seekingRef.current = false
    const v = pvRef.current
    if (v && Math.abs((v.currentTime || 0) - pendingRef.current) > 0.4) {
      seekingRef.current = true
      try { v.currentTime = pendingRef.current } catch {}
    }
  }, [])

  const handleDown = (e) => {
    setDragging(true)
    onSeek(getPos(e) * duration)
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = e => onSeek(getPos(e) * duration)
    const onUp = e => { onSeek(getPos(e) * duration); setDragging(false); setHoverPct(null) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    // Scrub tactile : passive:false pour pouvoir bloquer le scroll de page pendant le drag.
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    window.addEventListener('touchcancel', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onUp); window.removeEventListener('touchcancel', onUp)
    }
  }, [dragging, duration, getPos, onSeek])

  const hasThumb = Boolean(scrubSrc || previewSrc)
  // Tactile : zone de scrub plus haute (≥26px) + poignée plus grosse pour viser au doigt.
  const barHeight = IS_COARSE ? 28 : 20
  const railHeight = IS_COARSE ? 6 : 4
  const thumbSize = IS_COARSE ? 20 : 12
  const showThumb = IS_COARSE || hoverPct !== null || dragging

  return (
    <div ref={barRef}
      onMouseDown={handleDown}
      onMouseMove={e => { const p = getPos(e); setHoverPct(p); if (duration) requestPreview(p * duration) }}
      onMouseLeave={() => { if (!dragging) setHoverPct(null) }}
      onTouchStart={e => { const p = getPos(e); setHoverPct(p); setDragging(true); onSeek(p * duration) }}
      onTouchMove={e => { if (dragging) e.preventDefault(); const p = getPos(e); setHoverPct(p); onSeek(p * duration) }}
      style={{ width: '100%', height: barHeight, display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative', touchAction: 'none' }}
    >
      {/* Tooltip : image RÉELLE du moment survolé (video d'aperçu calée sur le temps),
          repli sur la vignette statique si la source n'est pas seekable (HLS).
          Toujours monté quand il y a un aperçu → la video reste chargée (pas de
          rechargement à chaque survol), on ne fait que varier opacité + position. */}
      {hasThumb && (
        <div style={{ position: 'absolute', bottom: 24, left: `${(hoverPct ?? 0) * 100}%`, transform: 'translateX(-50%)', width: 168, overflow: 'hidden', background: 'rgba(8,9,12,0.94)', color: '#fff', fontWeight: 700, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, pointerEvents: 'none', boxShadow: '0 16px 50px rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)', opacity: hoverPct !== null ? 1 : 0, transition: 'opacity .12s', zIndex: 30 }}>
          {scrubSrc ? (
            <video ref={pvRef} src={scrubSrc} muted playsInline preload="metadata" onSeeked={onPvSeeked}
              style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block', background: '#000' }} />
          ) : (
            <img loading="lazy" decoding="async" src={previewSrc} alt="" style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block', filter: 'brightness(1.06) saturate(1.1)' }} />
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 9px', fontSize: 11 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{previewTitle || 'Aperçu'}</span>
            <span style={{ color, fontVariantNumeric: 'tabular-nums' }}>{fmt(hoverTime)}</span>
          </div>
        </div>
      )}
      <div style={{ width: '100%', height: railHeight, background: 'rgba(255,255,255,0.15)', borderRadius: railHeight, position: 'relative', overflow: 'visible' }}>
        {/* Buffer */}
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${bufPct * 100}%`, background: 'rgba(255,255,255,0.25)', borderRadius: railHeight, pointerEvents: 'none' }} />
        {/* Progress */}
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct * 100}%`, background: color, borderRadius: railHeight, pointerEvents: 'none', transition: dragging ? 'none' : 'width .1s linear' }} />
        {/* Thumb — toujours visible au doigt (tactile) pour donner une cible de scrub claire */}
        <div style={{ position: 'absolute', top: '50%', left: `${pct * 100}%`, transform: 'translate(-50%, -50%)', width: thumbSize, height: thumbSize, borderRadius: '50%', background: '#fff', boxShadow: `0 0 6px ${color}88`, pointerEvents: 'none', opacity: showThumb ? 1 : 0, transition: 'opacity .15s' }} />
      </div>
    </div>
  )
}

function EpisodeMiniThumb({ video, color }) {
  const [ready, setReady] = useState(false)
  if (video.thumbnail) {
    return <img loading="lazy" decoding="async" src={video.thumbnail} alt={`Ep.${video.episode}`} style={{ width: 96, height: 54, objectFit: 'cover', display: 'block' }} />
  }
  if (!video.src) {
    return <div style={{ width: 96, height: 54, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>▶</div>
  }
  return (
    <div style={{ position: 'relative', width: 96, height: 54, background: `${color}18`, overflow: 'hidden' }}>
      <video
        src={encSrc(video.src)}
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={e => {
          const duration = Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0
          try { e.currentTarget.currentTime = duration > 0 ? Math.max(2, duration * 0.5) : 2 } catch {}
        }}
        onSeeked={() => setReady(true)}
        onLoadedData={() => setReady(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: ready ? 0.86 : 0, filter: 'brightness(1.16) saturate(1.12) contrast(1.08)' }}
      />
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: ready ? 'rgba(0,0,0,0.08)' : `linear-gradient(135deg, ${color}30, rgba(0,0,0,0.75))`, color: '#fff', fontSize: 18, fontWeight: 900 }}>
        {!ready && '▶'}
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function VideoPlayer({ videos, startIdx, onClose, color = '#6c5ce7', storageKey = null, onProgressUpdate = null, autoStart = false, embedded = false, hideDetail = false }) {
  const { userId } = useAuth()
  const videoRef     = useRef(null)
  const audioRef     = useRef(null)
  const canvasRef    = useRef(null)   // sous-titres dessinés (immunisé au throttle)
  const containerRef = useRef(null)
  const hideTimer    = useRef(null)
  const lastSaveRef  = useRef(0)
  const pendingSourceRef = useRef(null)
  const hlsRef = useRef(null)
  const autoplayPendingRef = useRef(autoStart)   // relancer la lecture après avance auto (ou démarrage direct via autoStart)

  const [idx,          setIdx]         = useState(startIdx)
  const [playing,      setPlaying]     = useState(false)
  // Tactile : double-tap ±10s + flash visuel (couche coarse dans la zone vidéo)
  const touchTapRef = useRef(null)
  const [skipFlash, setSkipFlash] = useState(null)
  const [currentTime,  setCurrentTime] = useState(0)
  const [duration,     setDuration]    = useState(0)
  const [volume,       setVolume]      = useState(1)
  const [muted,        setMuted]       = useState(false)
  const [speed,        setSpeed]       = useState(1)
  const [fullscreen,   setFullscreen]  = useState(false)
  const [cssFs,        setCssFs]       = useState(false)  // pseudo-plein-écran iOS (garde le canvas ST)
  const [showCtrl,     setShowCtrl]    = useState(true)
  const [started,      setStarted]     = useState(autoStart)  // false = interface "détail épisode" (pré-lecture) ; autoStart saute directement en lecture
  const [subIdx,       setSubIdx]      = useState(0)
  const [subsOff,      setSubsOff]     = useState(false)
  const [buffered,     setBuffered]    = useState(0)
  const [showSubMenu,  setShowSubMenu] = useState(false)
  const [showAudioMenu, setShowAudioMenu] = useState(false)
  const [showSpdMenu,  setShowSpdMenu] = useState(false)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [showSettingsSheet, setShowSettingsSheet] = useState(false)  // tactile : panneau réglages unifié (bottom-sheet)
  const [qualityLabel, setQualityLabel] = useState('AUTO')
  const [audioIdx,     setAudioIdx]    = useState(0)
  const [audioTrackState, setAudioTrackState] = useState('pending')
  const [subtitleStyle, setSubtitleStyle] = useState(() => loadVideoPreferences(userId).subtitleStyle)
  const [mediaSrc, setMediaSrc] = useState(videos[startIdx]?.src || '')
  // Trio lecteur : autoplay (compte à rebours), skip intro, toast de reprise.
  const [autoplayNext, setAutoplayNext] = useState(() => loadVideoPreferences(userId).autoplayNext)
  const [endOverlay,   setEndOverlay]   = useState(false)
  const [endReason,    setEndReason]    = useState('ended') // 'ended' (fin réelle) | 'ed' (générique détecté)
  const [countdown,    setCountdown]    = useState(null)   // secondes restantes, ou null
  const [cdMax,        setCdMax]        = useState(8)       // valeur initiale du décompte (pour la barre)
  const [resumeToast,  setResumeToast]  = useState(null)   // "MM:SS" affiché brièvement
  const edPromptedRef = useRef(false)                      // le prompt « générique » ne se déclenche qu'une fois

  const video   = videos[idx]
  const isLocal = Boolean(video?.src)
  // Source réellement engagée seulement quand l'utilisateur a lancé la lecture
  // (évite de buffer HLS/gros mp4 pendant la fiche détail). DÉCLARÉE ICI, avant
  // l'effet HLS plus bas : ce const est lu dans le tableau de deps de cet effet,
  // évalué pendant le render → s'il était déclaré après, c'était un TDZ
  // ("Cannot access … before initialization") qui crashait TOUT le lecteur.
  const effectiveMediaSrc = started ? mediaSrc : null
  // Source pour l'aperçu de frame au survol de la barre : seekable seulement si MP4
  // (le HLS ne se cale pas dans une <video> simple) → sinon repli vignette statique.
  const scrubSrc = (effectiveMediaSrc && !isHlsSrc(effectiveMediaSrc)) ? effectiveMediaSrc : null
  const hasSubs = Array.isArray(video?.subtitles) && video.subtitles.length > 0
  // Marqueurs opening/ending par épisode : [début, fin] en secondes (extraits des chapitres).
  const opMark  = Array.isArray(video?.op) && video.op.length === 2 ? video.op : null
  const edMark  = Array.isArray(video?.ed) && video.ed.length === 2 ? video.ed : null
  const audioOptions = useMemo(() => (
    Array.isArray(video?.audio) && video.audio.length > 0 ? video.audio : []
  ), [video])
  const hasAudioChoices = audioOptions.length > 1
  const selectedAudio = hasAudioChoices ? audioOptions[audioIdx] : null
  const usesVariantSource = Boolean(selectedAudio?.mediaSrc)
  const usesExternalAudio = Boolean(selectedAudio?.src && !selectedAudio?.mediaSrc)

  const persistProgress = useCallback((patch = {}) => {
    if (!storageKey || !video) return
    const previous = loadVideoProgress(storageKey) || { episodes: {} }
    const episodeKey = progressKeyFor(video, idx)
    const nextEpisode = {
      ...(previous.episodes?.[episodeKey] || {}),
      idx,
      episode: video.episode,
      title: video.title,
      ...patch,
      updatedAt: Date.now(),
    }
    const next = {
      ...previous,
      lastIdx: idx,
      lastEpisode: video.episode,
      lastTitle: video.title,
      episodes: {
        ...(previous.episodes || {}),
        [episodeKey]: nextEpisode,
      },
      updatedAt: Date.now(),
    }
    saveVideoProgress(storageKey, next)
    onProgressUpdate?.(next)
    // Mirroir serveur (cross-device) — local reste le cache instantané.
    if (userId) {
      saveWatchProgress({
        ns: storageKey,
        epKey: progressKeyFor(video, idx),
        position: patch.time,
        duration: patch.duration,
        completed: patch.completed,
        episode: video?.episode,
      })
    }
  }, [idx, onProgressUpdate, storageKey, video, userId])

  // ── Masquage auto des contrôles ──────────────────────────────────────────
  const showControls = useCallback(() => {
    setShowCtrl(true)
    clearTimeout(hideTimer.current)
    if (playing) hideTimer.current = setTimeout(() => setShowCtrl(false), 3000)
  }, [playing])

  useEffect(() => { showControls() }, [playing])

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') {
        setShowQualityMenu(false)
        setShowAudioMenu(false)
        setShowSubMenu(false)
        setShowSpdMenu(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const updatePreferences = useCallback((patch) => {
    const next = { ...loadVideoPreferences(userId), ...patch }
    saveVideoPreferences(userId, next)
    return next
  }, [userId])

  const chooseSubtitle = useCallback((nextSubIdx, off) => {
    setSubIdx(nextSubIdx)
    setSubsOff(off)
    const selected = video?.subtitles?.[nextSubIdx]
    updatePreferences({
      subtitlesOff: off,
      subtitleLang: selected?.srclang || selected?.label || 'fr',
    })
  }, [updatePreferences, video?.subtitles])

  const updateSubtitleStyle = useCallback((patch) => {
    setSubtitleStyle(prev => {
      const nextStyle = { ...prev, ...patch }
      saveSubStyle(userId, nextStyle)                  // par membre → chacun garde le sien
      updatePreferences({ subtitleStyle: nextStyle })  // copie dans les prefs du membre
      return nextStyle
    })
  }, [updatePreferences, userId])

  const applyAudioPreference = useCallback((nextAudioIdx) => {
    const v = videoRef.current
    const external = audioOptions[nextAudioIdx]?.src
    const variantSrc = audioOptions[nextAudioIdx]?.mediaSrc
    if (variantSrc) {
      setAudioTrackState('ready')
      return true
    }
    if (external) {
      if (v) v.muted = true
      setAudioTrackState('external')
      return true
    }

    if (v) v.muted = muted

    // hls.js actif : on bascule la piste audio du master (VF/JP) via son API,
    // car v.audioTracks natif n'est pas alimenté hors Safari.
    const hls = hlsRef.current
    if (hls && Array.isArray(hls.audioTracks) && hls.audioTracks.length) {
      const target = audioOptions[nextAudioIdx]
      const lang = String(target?.srclang || target?.language || '').toLowerCase()
      let ti = hls.audioTracks.findIndex(t => String(t.lang || '').toLowerCase() === lang)
      if (ti < 0 && lang) ti = hls.audioTracks.findIndex(t => String(t.name || '').toLowerCase().includes(lang))
      if (ti < 0) ti = Math.min(nextAudioIdx, hls.audioTracks.length - 1)
      if (hls.audioTrack !== ti) hls.audioTrack = ti
      setAudioTrackState('ready')
      return true
    }

    const nativeTracks = v?.audioTracks
    if (!nativeTracks || !nativeTracks.length) {
      setAudioTrackState(hasAudioChoices ? 'unsupported' : 'none')
      return false
    }

    for (let i = 0; i < nativeTracks.length; i++) {
      nativeTracks[i].enabled = i === nextAudioIdx
    }
    setAudioTrackState('ready')
    return true
  }, [audioOptions, hasAudioChoices, muted])

  const chooseAudio = useCallback((nextAudioIdx) => {
    setAudioIdx(nextAudioIdx)
    const selected = audioOptions[nextAudioIdx]
    const nextSource = selected?.mediaSrc || video?.src || ''
    if (selected?.mediaSrc) {
      const v = videoRef.current
      const currentTime = v?.currentTime || 0
      const wasPlaying = Boolean(v && !v.paused)
      pendingSourceRef.current = { time: currentTime, play: wasPlaying, src: nextSource }
      setMediaSrc(nextSource)
      setAudioTrackState('ready')
    } else {
      applyAudioPreference(nextAudioIdx)
      setMediaSrc(nextSource)
    }
    updatePreferences({
      audioLang: selected?.srclang || selected?.language || selected?.label || 'ja',
    })
  }, [applyAudioPreference, audioOptions, updatePreferences, video?.src])

  useEffect(() => {
    setSubtitleStyle(loadVideoPreferences(userId).subtitleStyle)
  }, [userId])

  // ── Sous-titres — DESSINÉS SUR CANVAS (immunisé au throttle de repeinture) ──
  // Diagnostic prouvé : cues chargées + activeCues=1, mais ni l'overlay DOM ni le
  // rendu natif ne s'affichent (le navigateur "endort" la peinture des couches
  // quand la souris est immobile, sur plusieurs PC). On dessine donc nous-mêmes les
  // cues sur un <canvas> via requestAnimationFrame : le canvas est recomposité à
  // chaque frame par le GPU → toujours visible. Contrôle total taille/couleur/pos.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    let boundTrack = null
    let rafId = null
    let cancelled = false

    const setupTrack = () => {
      const tracks = v.textTracks
      for (let i = 0; i < tracks.length; i++) tracks[i].mode = 'disabled'
      boundTrack = null
      if (subsOff || !hasSubs) return
      // Les <track> sont rendus DANS L'ORDRE de video.subtitles → textTracks[subIdx]
      // EST exactement la piste choisie. On la relie par index (l'ancien matching
      // par label/langue se trompait de piste → sous-titres "farfelu" tant qu'on
      // n'avait pas coupé/remis). On garde un repli par label/langue si l'index
      // n'existe pas encore (pistes chargées dans le désordre).
      let target = (subIdx >= 0 && subIdx < tracks.length) ? tracks[subIdx] : null
      const wanted = video?.subtitles?.[subIdx]
      if (!target && wanted) {
        for (let i = 0; i < tracks.length; i++) {
          const t = tracks[i]
          const labelMatch = t.label && wanted.label && t.label === wanted.label
          const langMatch  = t.language && wanted.srclang && (t.language === wanted.srclang || t.language.startsWith(wanted.srclang + '-'))
          if (labelMatch) { target = t; break }
          if (langMatch && !target) target = t
        }
      }
      // 'hidden' : cues parsées + activeCues alimentées, sans rendu natif (on dessine).
      if (target) { target.mode = 'hidden'; boundTrack = target }
    }

    const draw = () => {
      const cv = canvasRef.current
      if (cv) {
        const dpr = window.devicePixelRatio || 1
        const cw = cv.clientWidth, ch = cv.clientHeight
        if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) {
          cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr)
        }
        const ctx = cv.getContext('2d')
        ctx.clearRect(0, 0, cv.width, cv.height)
        // Anti « sous-titres farfelu » : aucune piste ne doit passer en 'showing'
        // (sinon le navigateur rend les cues brutes, parfois la mauvaise piste →
        // d'où le besoin de couper/remettre). On ré-affirme les modes en continu et
        // on relie la bonne piste si elle s'est chargée tardivement → auto-réparé.
        if (!subsOff && hasSubs) {
          if (!boundTrack) setupTrack()
          const tt = v.textTracks
          for (let i = 0; i < tt.length; i++) {
            if (tt[i] === boundTrack) { if (tt[i].mode !== 'hidden') tt[i].mode = 'hidden' }
            else if (tt[i].mode !== 'disabled') tt[i].mode = 'disabled'
          }
        }
        const cues = (!subsOff && boundTrack) ? boundTrack.activeCues : null
        const text = cues && cues.length ? cleanCueText(Array.from(cues).map(c => c.text).join('\n')) : ''
        if (text) {
          const st = subtitleStyle
          // Taille RELATIVE à la hauteur d'affichage de la vidéo. Sinon une taille
          // absolue (30px) est énorme dans le lecteur embarqué mobile ET minuscule
          // en plein écran (« on voit rien »). st.size reste la préférence du membre
          // (référence ~30 pour une zone vidéo de ~420px de haut).
          const baseH = ch || (cv.height / dpr) || 420
          const sizeScale = Math.min(2.5, Math.max(0.72, baseH / 420))
          const size = Math.min(70, Math.max(15, (st.size || 30) * sizeScale)) * dpr
          ctx.font = `${st.weight || 700} ${size}px Inter, system-ui, sans-serif`
          ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
          const maxW = cv.width * 0.84
          const lines = []
          text.split('\n').forEach(para => {
            const words = para.split(' '); let line = ''
            for (const w0 of words) {
              const test = line ? line + ' ' + w0 : w0
              if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w0 }
              else line = test
            }
            if (line) lines.push(line)
          })
          const lineH = size * 1.35
          // Offset bas relatif à la hauteur (reste au-dessus des contrôles, scale en plein écran).
          const bottomPref = Math.min(180, Math.max(36, Number(st.bottom) || 110)) / 110 // ~1 par défaut
          const bottom = Math.max(22, Math.min(baseH * 0.4, baseH * 0.085 * bottomPref)) * dpr
          const baseY = cv.height - bottom
          const startY = baseY - (lines.length - 1) * lineH
          const cx = cv.width / 2
          lines.forEach((ln, i) => {
            const ly = startY + i * lineH
            const tw = ctx.measureText(ln).width
            if (st.background > 0) {
              ctx.fillStyle = `rgba(0,0,0,${st.background})`
              ctx.fillRect(cx - tw / 2 - 12 * dpr, ly - size, tw + 24 * dpr, lineH)
            }
            if (st.outline) {
              // Contour plus épais + arrondi + ombre portée légère sous le tracé →
              // lisibilité maximale sur n'importe quelle image. Couleur au choix.
              ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 3 * dpr; ctx.shadowOffsetY = dpr
              ctx.lineWidth = Math.max(3, size * 0.18); ctx.lineJoin = 'round'; ctx.miterLimit = 2
              ctx.strokeStyle = st.outlineColor || '#000'; ctx.strokeText(ln, cx, ly)
              ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
            } else {
              ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 4 * dpr; ctx.shadowOffsetY = dpr
            }
            ctx.fillStyle = st.color || '#fff'
            // Ombre portée derrière le texte (option) → relief net sur fond clair.
            if (st.shadow) {
              ctx.shadowColor = 'rgba(0,0,0,0.92)'; ctx.shadowBlur = 5 * dpr
              ctx.shadowOffsetX = 2 * dpr; ctx.shadowOffsetY = 2 * dpr
            }
            ctx.fillText(ln, cx, ly)
            ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0
          })
        }
      }
      if (!cancelled) rafId = requestAnimationFrame(draw)
    }

    setupTrack()
    v.textTracks.addEventListener('addtrack', setupTrack)
    const retry = setTimeout(setupTrack, 400)
    const retry2 = setTimeout(setupTrack, 1200)
    rafId = requestAnimationFrame(draw)

    return () => {
      cancelled = true
      clearTimeout(retry); clearTimeout(retry2)
      if (rafId != null) cancelAnimationFrame(rafId)
      v.textTracks.removeEventListener('addtrack', setupTrack)
    }
    // mediaSrc : le <video> est keyé par la source (variantes audio VF/JP) → il se
    // remonte ; sans cette dépendance on resterait branché sur l'ancien élément.
  }, [subIdx, subsOff, hasSubs, idx, mediaSrc, subtitleStyle])

  // ── Réinitialiser état au changement d'épisode ───────────────────────────
  useEffect(() => {
    const prefs = loadVideoPreferences(userId)
    const nextSubIdx = findTrackIndex(video?.subtitles || [], prefs.subtitleLang || 'fr', 0)
    const preferredAudioLang = video?.preferredAudioLang || prefs.audioLang || 'ja'
    const nextAudioIdx = findTrackIndex(audioOptions, preferredAudioLang, 0)

    setCurrentTime(0); setDuration(0); setBuffered(0); setPlaying(false)
    // Interface "détail épisode" au changement d'épisode — sauf si on enchaîne en
    // autoplay (épisode suivant) : là on va direct en lecture.
    setStarted(Boolean(autoplayPendingRef.current))
    setEndOverlay(false); setCountdown(null); setEndReason('ended'); edPromptedRef.current = false
    setSubIdx(nextSubIdx)
    setSubsOff(hasSubs ? Boolean(prefs.subtitlesOff) : true)
    setAudioIdx(nextAudioIdx)
    setSubtitleStyle(prefs.subtitleStyle)
    setAudioTrackState(hasAudioChoices ? 'pending' : 'none')
    setMediaSrc(audioOptions[nextAudioIdx]?.mediaSrc || video?.src || '')
    pendingSourceRef.current = null
  }, [idx, hasAudioChoices, hasSubs, audioOptions, video?.subtitles, userId, video?.src])

  useEffect(() => {
    if (!storageKey || !videoRef.current || !video) return
    const v = videoRef.current
    const epKey = progressKeyFor(video, idx)
    let cancelled = false
    let metaHandler = null

    // Reprend la lecture à `time` (en secondes), avec toast si assez avancé.
    const resumeAt = (time) => {
      if (cancelled || !videoRef.current) return
      if (Number.isFinite(time) && time > 3) {
        videoRef.current.currentTime = Math.max(0, time - 2)
        if (time > 60) {                                    // toast "Reprise à MM:SS"
          setResumeToast(fmt(time - 2))
          setTimeout(() => setResumeToast(null), 4500)
        }
      }
    }

    // Démarre la reprise dès que la <video> a ses métadonnées (sans bloquer la lecture).
    const arm = (time) => {
      if (cancelled) return
      if (v.readyState >= 1) resumeAt(time)
      else { metaHandler = () => resumeAt(time); v.addEventListener('loadedmetadata', metaHandler, { once: true }) }
    }

    // Progression locale (cache instantané) en repli.
    const local = loadVideoProgress(storageKey)?.episodes?.[epKey]
    const localTime = (local && !local.completed && Number.isFinite(local.time)) ? local.time : null

    // Serveur d'abord (cross-device) ; si une position non-complétée plus récente
    // existe, on la prend, sinon repli sur le local.
    if (userId) {
      getWatchProgress(storageKey).then((server) => {
        if (cancelled) return
        const s = server?.[epKey]
        const serverTime = (s && !s.completed && Number.isFinite(Number(s.position))) ? Number(s.position) : null
        const chosen = serverTime != null && serverTime > (localTime || 0) ? serverTime : localTime
        if (chosen != null && chosen > 3) arm(chosen)
      })
    } else if (localTime != null && localTime > 3) {
      arm(localTime)
    }

    return () => {
      cancelled = true
      if (metaHandler) v.removeEventListener('loadedmetadata', metaHandler)
    }
  }, [idx, storageKey, video, userId])

  // ── Trio lecteur : avance épisode + compte à rebours autoplay ────────────
  const goNext = useCallback(() => {
    autoplayPendingRef.current = true          // jouer dès que le prochain épisode est prêt
    setEndOverlay(false); setCountdown(null)
    setIdx(i => Math.min(videos.length - 1, i + 1))
  }, [videos.length])

  // Smart skip : on saute à une position précise (fin d'OP/ED), jamais un offset fixe.
  const skipTo = useCallback((t) => {
    const v = videoRef.current
    if (!v || !Number.isFinite(t)) return
    v.currentTime = Math.min(v.duration || t, t)
  }, [])

  useEffect(() => {
    if (countdown == null) return
    if (countdown <= 0) { goNext(); return }
    const t = setTimeout(() => setCountdown(c => (c == null ? null : c - 1)), 1000)
    return () => clearTimeout(t)
  }, [countdown, goNext])

  // ── Appliquer la vitesse ─────────────────────────────────────────────────
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed
  }, [speed])

  // ── Sync piste audio externe (VF/JP séparée) sur l'état de la vidéo ───────
  // Sans ça, l'<audio> ne suivait JAMAIS pause/seek/avance/vitesse de la vidéo
  // → voix désynchronisée dès qu'on met en pause ou qu'on scrubbe (Violet VF,
  // Kaiju, Vivy). On miroite via les events natifs de la <video> : ils couvrent
  // d'un coup tous les chemins (barre, ±10s, flèches, double-tap, vitesse).
  useEffect(() => {
    if (!usesExternalAudio) return
    const v = videoRef.current
    if (!v) return
    const au = () => audioRef.current
    const onPlay = () => { const a = au(); if (a) { a.currentTime = v.currentTime; a.playbackRate = v.playbackRate; a.play().catch(() => {}) } }
    const onPause = () => { const a = au(); if (a) a.pause() }
    const onSeek = () => { const a = au(); if (a) a.currentTime = v.currentTime }
    const onRate = () => { const a = au(); if (a) a.playbackRate = v.playbackRate }
    const onTime = () => { const a = au(); if (a && !v.paused && Math.abs(a.currentTime - v.currentTime) > 0.35) a.currentTime = v.currentTime }
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('seeking', onSeek)
    v.addEventListener('seeked', onSeek)
    v.addEventListener('ratechange', onRate)
    v.addEventListener('timeupdate', onTime)
    return () => {
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('seeking', onSeek)
      v.removeEventListener('seeked', onSeek)
      v.removeEventListener('ratechange', onRate)
      v.removeEventListener('timeupdate', onTime)
    }
  }, [usesExternalAudio, effectiveMediaSrc])

  // ── Boost de loudness par vidéo (ex. films Violet trop bas) ───────────────
  // Ne route dans Web Audio que les vidéos avec gain>1 → zéro risque ailleurs.
  // Le lecteur a déjà crossOrigin='anonymous' quand il y a des sous-titres, et
  // l'HLS passe par MSE (blob same-origin) → pas de souci de "tainted".
  useEffect(() => {
    if (videoRef.current) setBoost(videoRef.current, video?.gain || 1)
  }, [mediaSrc, video?.gain])

  // ── Lecture HLS via hls.js (Chrome/Edge/Firefox — pas de HLS natif) ───────
  // We only initialize HLS once the user has started playback (effectiveMediaSrc).
  // This avoids downloading the manifest + first segments while the user is still in the
  // rich episode info panel.
  useEffect(() => {
    const v = videoRef.current
    if (!isLocal || !v || !effectiveMediaSrc || !isHlsSrc(effectiveMediaSrc) || NATIVE_HLS) return
    let hls = null, cancelled = false
    import('hls.js').then(({ default: Hls }) => {
      if (cancelled || !Hls.isSupported()) return
      hls = new Hls({ enableWorker: true, maxBufferLength: 30, backBufferLength: 30, startLevel: -1 })
      hlsRef.current = hls
      hls.attachMedia(v)
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(encSrc(effectiveMediaSrc)))
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        applyAudioPreference(audioIdx)
        const p = pendingSourceRef.current
        if (p && Number.isFinite(p.time)) { try { v.currentTime = p.time } catch {} }
        if (p?.play) v.play().catch(() => {})
      })
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => applyAudioPreference(audioIdx))
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data?.fatal) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad()
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError()
        else { try { hls.destroy() } catch {} if (hlsRef.current === hls) hlsRef.current = null }
      })
    }).catch(() => {})
    return () => {
      cancelled = true
      if (hls) { try { hls.destroy() } catch {} }
      if (hlsRef.current === hls) hlsRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMediaSrc, isLocal])

  // ── Fullscreen ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', fn)
    return () => document.removeEventListener('fullscreenchange', fn)
  }, [])

  const toggleFullscreen = () => {
    const el = containerRef.current
    // Sortie
    if (document.fullscreenElement) { document.exitFullscreen?.(); return }
    if (cssFs) {
      setCssFs(false)
      try { screen.orientation?.unlock?.() } catch {}
      return
    }
    // Entrée : fullscreen natif d'élément si dispo (desktop/Android), SINON
    // pseudo-plein-écran CSS — indispensable sur iOS où requestFullscreen
    // d'un <div> n'existe pas : le fullscreen natif <video> masquerait le
    // canvas des sous-titres (« on voit rien »).
    if (el && el.requestFullscreen) {
      el.requestFullscreen()
        .then(() => { try { screen.orientation?.lock?.('landscape') } catch {} })
        .catch(() => setCssFs(true))
    } else {
      setCssFs(true)
      try { screen.orientation?.lock?.('landscape') } catch {}
    }
  }

  // ── Raccourcis clavier ───────────────────────────────────────────────────
  useEffect(() => {
    const fn = e => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      const v = videoRef.current
      switch (e.key) {
        case 'Escape':      if (cssFs) { setCssFs(false); try { screen.orientation?.unlock?.() } catch {} } else onClose(); break
        case ' ':           e.preventDefault(); v && (v.paused ? v.play() : v.pause()); break
        case 'ArrowLeft':   e.preventDefault(); v && (v.currentTime = Math.max(0, v.currentTime - 5)); break
        case 'ArrowRight':  e.preventDefault(); v && (v.currentTime = Math.min(v.duration, v.currentTime + 5)); break
        case 'ArrowUp':     e.preventDefault(); v && (v.volume = Math.min(1, v.volume + 0.1)); break
        case 'ArrowDown':   e.preventDefault(); v && (v.volume = Math.max(0, v.volume - 0.1)); break
        case 'f': case 'F': toggleFullscreen(); break
        case 'm': case 'M':
          if (v) v.muted = !v.muted
          break
        default: break
      }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, cssFs])

  // ── Handlers vidéo ───────────────────────────────────────────────────────
  const onPlay     = () => {
    setPlaying(true)
    setStarted(true)   // dès qu'on lance → on quitte l'interface détail
  }
  const onPause    = () => {
    setPlaying(false); setShowCtrl(true); clearTimeout(hideTimer.current)
  }
  const onTimeUpd  = () => {
    const v = videoRef.current; if (!v) return
    setCurrentTime(v.currentTime)
    if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1))
    // Générique détecté (marqueur ed) → prompt « Netflix » : décompte 5s qui passe à
    // l'épisode suivant, sauf si l'utilisateur clique « Laisser le générique ».
    if (edMark && autoplayNext && !edPromptedRef.current && !endOverlay
        && idx < videos.length - 1
        && v.currentTime >= edMark[0] && v.currentTime < edMark[1]) {
      edPromptedRef.current = true
      setEndReason('ed'); setCdMax(5); setCountdown(5); setEndOverlay(true)
    }
    if (storageKey && performance.now() - lastSaveRef.current > 1200) {
      lastSaveRef.current = performance.now()
      persistProgress({
        time: v.currentTime,
        duration: v.duration || 0,
        completed: Boolean(v.duration && v.currentTime / v.duration > 0.92),
      })
    }
  }
  const onDurChg   = () => { if (videoRef.current) setDuration(videoRef.current.duration || 0) }
  const onVolChg   = () => {
    const v = videoRef.current; if (!v) return
    setVolume(v.volume); setMuted(v.muted)
  }
  const onMetaChg = () => {
    const v = videoRef.current; if (!v) return
    // Qualité = hauteur "16:9 équivalente" : pour un film large (ex. 1920x804,
    // ratio cinéma), juger sur la seule hauteur sous-estime (804→720p alors que
    // c'est du 1080p). On déduit la hauteur 16:9 à partir de la largeur.
    const h = Number(v.videoHeight || 0)
    const w = Number(v.videoWidth || 0)
    const q = Math.max(h, Math.round(w * 9 / 16))
    if (q >= 2160) setQualityLabel('4K')
    else if (q >= 1440) setQualityLabel('1440p')
    else if (q >= 1080) setQualityLabel('1080p')
    else if (q >= 720) setQualityLabel('720p')
    else if (q > 0) setQualityLabel(`${q}p`)
    else setQualityLabel('SD')
    const pending = pendingSourceRef.current
    if (pending && pending.src && v.currentSrc !== encSrc(pending.src)) return
    if (pending && Number.isFinite(pending.time)) {
      try { v.currentTime = pending.time } catch {}
      if (pending.play) v.play().catch(() => {})
      pendingSourceRef.current = null
    }
    if (!usesVariantSource) applyAudioPreference(audioIdx)
  }

  const togglePlay = () => {
    if (!started) {
      // First click from the detail overlay → commit the media and start loading + playing
      setStarted(true)
      // The video element will mount on next render with effectiveMediaSrc.
      // We schedule a play once the element exists and can play.
      // The onCanPlay handler already handles autoplayPendingRef for other cases.
      setTimeout(() => {
        const v = videoRef.current
        if (v) v.play().catch(() => {})
      }, 50)
      return
    }
    const v = videoRef.current; if (!v) return
    v.paused ? v.play() : v.pause()
  }

  const handleVolume = e => {
    const v = videoRef.current; if (!v) return
    const val = parseFloat(e.target.value)
    v.volume = val
    if (usesExternalAudio && audioRef.current) {
      audioRef.current.volume = val
      audioRef.current.muted = val === 0
      v.muted = true
      setVolume(val)
      setMuted(val === 0)
    } else {
      v.muted = val === 0
    }
  }

  const seek = useCallback((t) => {
    const nextTime = Math.max(0, Math.min(t, duration))
    if (videoRef.current) videoRef.current.currentTime = nextTime
  }, [duration])

  const volIcon = muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'
  const audioLabel = hasAudioChoices ? (audioOptions[audioIdx]?.label ?? 'Audio') : 'AUTO'
  const subLabel = subsOff ? 'OFF' : hasSubs ? (video.subtitles[subIdx]?.label ?? 'CC') : 'N/A'
  const qualityHint = isLocal ? qualityLabel : 'AUTO'
  const episodeLabel = videoDisplayLabel(video)

  // effectiveMediaSrc est déclaré plus haut (avant l'effet HLS) pour éviter un TDZ
  // sur son tableau de deps — ne pas le redéclarer ici.

  return (
    <div style={embedded
      ? { position: 'relative', width: '100%', height: '100%', background: '#000', display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'hidden' }
      : { position: 'fixed', inset: 0, zIndex: 1200, background: '#000', display: 'flex', flexDirection: 'column' }}>

      {/* ── Barre haute (masquée en mode embarqué : la page fournit la navigation) ── */}
      {!embedded && <div className="vp-topbar" style={{ flexShrink: 0, minHeight: 48, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', background: 'rgba(8,9,11,0.84)', backdropFilter: 'blur(18px)', borderBottom: `1px solid ${color}22`, zIndex: 10 }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, color: '#fff', cursor: 'pointer', padding: IS_COARSE ? '10px 14px' : '6px 13px', minHeight: IS_COARSE ? 44 : undefined, fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'background .15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
        >✕ Fermer</button>

        <div className="vp-title" style={{ flex: 1, textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{episodeLabel}</span>
          {video?.title && !/^episode\s/i.test(String(video.title)) && <span className="vp-title-sub" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginLeft: 8 }}>— {video.title}</span>}
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setIdx(i => i - 1)} disabled={idx === 0} style={{ padding: IS_COARSE ? '9px 13px' : '5px 13px', minHeight: IS_COARSE ? 44 : undefined, borderRadius: 9, border: `1px solid ${idx === 0 ? 'rgba(255,255,255,0.1)' : color + '44'}`, background: idx === 0 ? 'transparent' : `${color}18`, color: idx === 0 ? 'rgba(255,255,255,0.2)' : color, cursor: idx === 0 ? 'default' : 'pointer', fontSize: 12, fontWeight: 700, transition: 'background .15s' }}>← Préc.</button>
          <button onClick={() => setIdx(i => i + 1)} disabled={idx === videos.length - 1} style={{ padding: IS_COARSE ? '9px 13px' : '5px 13px', minHeight: IS_COARSE ? 44 : undefined, borderRadius: 9, border: `1px solid ${idx === videos.length - 1 ? 'rgba(255,255,255,0.1)' : color + '44'}`, background: idx === videos.length - 1 ? 'transparent' : `${color}18`, color: idx === videos.length - 1 ? 'rgba(255,255,255,0.2)' : color, cursor: idx === videos.length - 1 ? 'default' : 'pointer', fontSize: 12, fontWeight: 700, transition: 'background .15s' }}>Suiv. →</button>
        </div>
      </div>}

      {/* ── Zone vidéo ── */}
      <div
        ref={containerRef}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onMouseMove={showControls}
        onMouseLeave={() => { if (playing) hideTimer.current = setTimeout(() => setShowCtrl(false), 1500) }}
        style={{
          flex: 1, position: 'relative', background: '#000', cursor: 'default', overflow: 'hidden',
          ...(cssFs ? { position: 'fixed', inset: 0, zIndex: 2147483647, width: '100vw', height: '100dvh', flex: 'none' } : null),
        }}
      >
        {isLocal ? (
          <>
            <video
              ref={videoRef}
              key={effectiveMediaSrc || 'no-src'}
              crossOrigin={hasSubs ? 'anonymous' : undefined}
              // CRUCIAL iOS : sans playsInline, l'iPhone force la lecture en plein
              // écran NATIF → nos contrôles custom + le canvas des sous-titres sont
              // bypassés ("pas de sous-titres + galère"). playsInline = lecture inline
              // → notre UI + canvas ST fonctionnent. webkit-playsinline pour vieux iOS.
              playsInline
              {...{ 'webkit-playsinline': 'true', 'x5-playsinline': 'true' }}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              preload={started ? 'metadata' : 'none'}
              onPlay={onPlay}
              onPause={onPause}
              onTimeUpdate={onTimeUpd}
              onDurationChange={onDurChg}
              onVolumeChange={onVolChg}
              onLoadedMetadata={onMetaChg}
              onCanPlay={() => {
                if (autoplayPendingRef.current) {
                  autoplayPendingRef.current = false
                  videoRef.current?.play().catch(() => {})
                }
              }}
              onEnded={() => {
                if (audioRef.current) audioRef.current.pause()
                persistProgress({ time: videoRef.current?.duration || duration || 0, duration: videoRef.current?.duration || duration || 0, completed: true })
                if (idx < videos.length - 1) {
                  setEndReason('ended'); setCdMax(8)
                  setEndOverlay(true)
                  setCountdown(autoplayNext ? 8 : null)   // null = pas d'avance auto, carte manuelle
                }
              }}
            >
              {/* Only attach the actual source once the user has started playback.
                  This stops the video (especially HLS) from downloading while the user
                  is still in the rich episode info panel. */}
              {effectiveMediaSrc && !(isHlsSrc(effectiveMediaSrc) && !NATIVE_HLS) && (
                <source
                  src={encSrc(effectiveMediaSrc)}
                  type={sourceType(effectiveMediaSrc)}
                />
              )}
              {/* Pistes de sous-titres. corsUrl(?cors=1) : entrée de cache dédiée
                  toujours récupérée AVEC Origin → évite la pollution de cache CORS
                  qui empêchait la piste de charger (sous-titres intermittents). */}
              {hasSubs && video.subtitles.map((sub, i) => (
                <track key={i} kind="subtitles" src={corsUrl(sub.src)} srcLang={sub.srclang || 'fr'} label={sub.label} default={i === subIdx} />
              ))}
            </video>

            {/* ── Couche TACTILE (pointer: coarse) ──
                tap = play/pause (différé 280ms) · double-tap tiers gauche/droit
                = ±10s avec flash visuel · gros ▶ central quand en pause. */}
            {IS_COARSE && started && (
              <div
                onClick={e => {
                  e.stopPropagation()
                  const r = e.currentTarget.getBoundingClientRect()
                  const x = (e.clientX - r.left) / r.width
                  const zone = x < 0.33 ? 'L' : x > 0.67 ? 'R' : 'C'
                  const now = Date.now()
                  const last = touchTapRef.current
                  // Double-tap tiers gauche/droit = ±10s (geste mobile attendu)
                  if (last && now - last.t < 300 && last.zone === zone && zone !== 'C') {
                    clearTimeout(touchTapRef.current?.timer)
                    touchTapRef.current = null
                    const v = videoRef.current
                    if (v) v.currentTime = Math.max(0, Math.min((v.duration || 1e9), v.currentTime + (zone === 'L' ? -10 : 10)))
                    setSkipFlash({ side: zone, t: now })
                    setTimeout(() => setSkipFlash(s => (s && s.t === now ? null : s)), 650)
                    showControls()
                    return
                  }
                  // Contrôles masqués pendant la lecture : 1er tap = les révéler
                  // (comportement YouTube/Netflix mobile), sans couper la lecture.
                  // On garde quand même une fenêtre pour détecter un double-tap ±10s.
                  if (!showCtrl && playing) {
                    showControls()
                    const timer = setTimeout(() => { touchTapRef.current = null }, 300)
                    touchTapRef.current = { t: now, zone, timer }
                    return
                  }
                  clearTimeout(last?.timer)
                  // Tap simple (centre, ou contrôles déjà visibles) = play/pause, différé
                  // 280ms pour laisser une chance au 2e tap (double-tap ±10s).
                  const timer = setTimeout(() => { togglePlay(); touchTapRef.current = null }, 280)
                  touchTapRef.current = { t: now, zone, timer }
                }}
                style={{ position: 'absolute', inset: 0, zIndex: 1 }}
              >
                {!playing && (
                  <span aria-hidden style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                    width: 78, height: 78, borderRadius: '50%', display: 'grid', placeItems: 'center',
                    background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.25)',
                    color: '#fff', fontSize: 30, paddingLeft: 6, pointerEvents: 'none',
                  }}>▶</span>
                )}
                {skipFlash && (
                  <span aria-hidden style={{
                    position: 'absolute', top: '50%', [skipFlash.side === 'L' ? 'left' : 'right']: '12%',
                    transform: 'translateY(-50%)', padding: '10px 16px', borderRadius: 999,
                    background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 15, fontWeight: 800, pointerEvents: 'none',
                  }}>{skipFlash.side === 'L' ? '« −10s' : '+10s »'}</span>
                )}
              </div>
            )}
            {/* External audio (e.g. separate VF track) — also only loaded when playback has started. */}
            {effectiveMediaSrc && selectedAudio?.src && !selectedAudio?.mediaSrc && (
              <audio
                ref={audioRef}
                key={selectedAudio.src}
                src={selectedAudio.src}
                preload={started ? 'auto' : 'none'}
                crossOrigin="anonymous"
                onCanPlay={() => {
                  const v = videoRef.current
                  const a = audioRef.current
                  if (!v || !a || v.paused) return
                  a.currentTime = v.currentTime || 0
                  a.volume = volume
                  a.muted = muted
                  a.play().catch(() => {})
                }}
                onLoadedData={() => {
                  const v = videoRef.current
                  const a = audioRef.current
                  if (!v || !a) return
                  a.currentTime = v.currentTime || 0
                  a.volume = volume
                  a.muted = muted
                }}
              />
            )}

            <style>{`@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
              @keyframes vpKenBurns { from { transform: scale(1.04) } to { transform: scale(1.12) } }
              @keyframes vpPlayPulse { 0%,100% { box-shadow: 0 0 0 0 ${color}55, 0 10px 40px rgba(0,0,0,.5) } 50% { box-shadow: 0 0 0 16px ${color}00, 0 10px 40px rgba(0,0,0,.5) } }

              /* ── Adaptations mobile / tablette (≤768px ou pointeur grossier) ──
                 Additif : ne change rien sur desktop souris. iOS safe-area pour que
                 la barre de contrôles ne passe pas sous le notch / l'indicateur home
                 en plein écran paysage, et que rien ne soit rogné. */
              .vp-controls {
                padding-left: calc(16px + env(safe-area-inset-left, 0px)) !important;
                padding-right: calc(16px + env(safe-area-inset-right, 0px)) !important;
                padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px)) !important;
              }
              /* Barre haute : respecte le notch iOS (0px ailleurs) */
              .vp-topbar {
                padding-top: env(safe-area-inset-top, 0px);
                padding-left: calc(14px + env(safe-area-inset-left, 0px));
                padding-right: calc(14px + env(safe-area-inset-right, 0px));
              }
              @media (max-width: 768px), (pointer: coarse) {
                /* Barre de contrôles : laisse respirer + colle aux bords sûrs */
                .vp-controls { padding-top: 56px !important; }
                /* Titre central rétractable : ne doit jamais évincer les boutons préc/suiv */
                .vp-topbar .vp-title { min-width: 0; }
                .vp-topbar .vp-title-sub { display: none; }
                /* Barre épurée tactile : une seule ligne, jamais de wrap (les menus partent
                   dans la bottom-sheet Réglages → plus assez de boutons pour déborder) */
                .vp-control-row { flex-wrap: nowrap !important; row-gap: 0 !important; }
                /* Menus déroulants (CC / audio / vitesse) : jamais hors écran à droite,
                   largeur contrainte à la fenêtre, scroll interne si trop long */
                .vp-menu {
                  right: 0 !important;
                  max-width: min(86vw, 320px) !important;
                  max-height: 52vh !important;
                  overflow-y: auto !important;
                  -webkit-overflow-scrolling: touch;
                }
              }
              /* Très petit téléphone en portrait : on évite tout débordement horizontal */
              @media (max-width: 420px) {
                .vp-control-row { gap: 8px !important; }
                .vp-time { margin-left: 2px !important; }
              }
              /* ── Bottom-sheet Réglages (tactile) ── */
              @keyframes vpSheetIn { from { transform: translateY(100%) } to { transform: translateY(0) } }
              @keyframes vpSheetFade { from { opacity: 0 } to { opacity: 1 } }
              .vp-sheet-backdrop { animation: vpSheetFade .2s ease; }
              .vp-sheet { animation: vpSheetIn .26s cubic-bezier(.22,.61,.36,1); }
              .vp-sheet button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
              .vp-control-row button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
              @media (prefers-reduced-motion: reduce) {
                .vp-sheet, .vp-sheet-backdrop { animation: none !important; }
              }`}</style>

            {/* ── Fond cinématique en pré-lecture (au lieu d'un grand vide noir) ── */}
            {!started && (
              <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden', background: '#06070b' }}>
                {video?.thumbnail && (
                  <img loading="lazy" decoding="async"
                    src={video.thumbnail}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(3px) brightness(0.46) saturate(1.12)', transform: 'scale(1.06)', animation: 'vpKenBurns 18s ease-in-out infinite alternate' }}
                  />
                )}
                {/* Voile dégradé : assombrit vers le panneau droit + vignette douce */}
                <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 80% at 40% 45%, rgba(6,7,11,0) 0%, rgba(6,7,11,0.55) 70%, rgba(6,7,11,0.9) 100%), linear-gradient(90deg, rgba(6,7,11,0.35) 0%, rgba(6,7,11,0) 30%)` }} />
                {/* Liseré couleur de l'anime, fin, en haut */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: 0.5 }} />
              </div>
            )}

            {/* ── Toast « Reprise à MM:SS » ── */}
            {resumeToast && !endOverlay && (
              <div style={{ position:'absolute', top:18, left:'50%', transform:'translateX(-50%)', zIndex:20, display:'flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:999, background:'rgba(10,8,16,0.86)', backdropFilter:'blur(10px)', border:`1px solid ${color}55`, color:'#fff', fontSize:12.5, fontWeight:700, boxShadow:'0 8px 28px rgba(0,0,0,0.4)', animation:'fadeIn .25s ease' }}>
                <span style={{ color }}>⏮</span> Reprise à <span style={{ color, fontWeight:800 }}>{resumeToast}</span>
              </div>
            )}

            {/* ── Smart Skip : opening (bouton). L'ending passe par le décompte Netflix. ── */}
            {!endOverlay && (() => {
              const inOp = opMark && currentTime >= opMark[0] - 1 && currentTime < opMark[1] - 0.5
              if (!inOp) return null
              const skip = { label: "Passer l'intro", to: opMark[1] }
              return (
                <button onClick={(e) => { e.stopPropagation(); skipTo(skip.to) }}
                  style={{ position:'absolute', right:'calc(24px + env(safe-area-inset-right, 0px))', bottom: showCtrl ? 118 : 40, zIndex:20, display:'flex', alignItems:'center', gap:8, padding: IS_COARSE ? '13px 20px' : '10px 18px', minHeight: IS_COARSE ? 44 : undefined, borderRadius:12, cursor:'pointer', fontFamily:'var(--body)', fontSize: IS_COARSE ? 14 : 13, fontWeight:800, color:'#fff', background:'rgba(10,8,16,0.82)', backdropFilter:'blur(10px)', border:`1px solid ${color}66`, boxShadow:'0 8px 28px rgba(0,0,0,0.45)', transition:'transform .15s, background .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${color}cc`; e.currentTarget.style.transform = 'scale(1.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,8,16,0.82)'; e.currentTarget.style.transform = 'none' }}>
                  {skip.label} <span style={{ fontSize:15 }}>⏭</span>
                </button>
              )
            })()}

            {/* ── Fin d'épisode : autoplay (compte à rebours) ou carte manuelle ── */}
            {endOverlay && videos[idx + 1] && (
              <div style={{ position:'absolute', right:'calc(24px + env(safe-area-inset-right, 0px))', bottom: showCtrl ? 118 : 40, zIndex:25, width:308, maxWidth:'calc(100vw - 48px - env(safe-area-inset-right, 0px) - env(safe-area-inset-left, 0px))', padding:18, borderRadius:16, background:'rgba(10,8,16,0.93)', backdropFilter:'blur(16px)', border:`1px solid ${color}55`, boxShadow:'0 18px 50px rgba(0,0,0,0.6)', animation:'fadeIn .3s ease' }}>
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:'.1em', textTransform:'uppercase', color, marginBottom:6 }}>
                  {countdown != null ? `Épisode suivant dans ${countdown}s` : 'Épisode suivant'}
                </div>
                <div style={{ fontSize:15, fontWeight:800, color:'#fff', lineHeight:1.3, marginBottom:13 }}>
                  {videos[idx + 1].title || `Épisode ${videos[idx + 1].episode}`}
                </div>
                {countdown != null && (
                  <div style={{ height:4, borderRadius:999, background:'rgba(255,255,255,0.12)', overflow:'hidden', marginBottom:13 }}>
                    <div style={{ height:'100%', borderRadius:999, background:color, width:`${(1 - countdown / cdMax) * 100}%`, transition:'width 1s linear' }} />
                  </div>
                )}
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={(e) => { e.stopPropagation(); goNext() }}
                    style={{ flex:1, padding: IS_COARSE ? '12px 0' : '9px 0', minHeight: IS_COARSE ? 44 : undefined, borderRadius:10, cursor:'pointer', fontFamily:'var(--body)', fontSize:12.5, fontWeight:800, color:'#fff', background:color, border:'none' }}>
                    ▶ Lire {countdown != null ? 'maintenant' : ''}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setEndOverlay(false); setCountdown(null) }}
                    style={{ padding: IS_COARSE ? '12px 16px' : '9px 14px', minHeight: IS_COARSE ? 44 : undefined, borderRadius:10, cursor:'pointer', fontFamily:'var(--body)', fontSize:12.5, fontWeight:700, color:'rgba(255,255,255,0.7)', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}>
                    {endReason === 'ed' ? 'Laisser le générique' : 'Annuler'}
                  </button>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); const n = !autoplayNext; setAutoplayNext(n); updatePreferences({ autoplayNext: n }); if (!n) setCountdown(null) }}
                  style={{ marginTop:11, display:'flex', alignItems:'center', gap:7, width:'100%', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.55)', fontSize:11, fontWeight:600, fontFamily:'var(--body)' }}>
                  <span style={{ width:30, height:17, borderRadius:999, background: autoplayNext ? color : 'rgba(255,255,255,0.15)', position:'relative', transition:'background .2s', flexShrink:0 }}>
                    <span style={{ position:'absolute', top:2, left: autoplayNext ? 15 : 2, width:13, height:13, borderRadius:'50%', background:'#fff', transition:'left .2s' }} />
                  </span>
                  Lecture automatique
                </button>
              </div>
            )}

            {/* ── Sous-titres dessinés sur canvas (rAF → immunisé au throttle) ── */}
            {!subsOff && hasSubs && (
              <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }} />
            )}

            {/* Indicateur de qualité — suit les contrôles (plus de superposition permanente) */}
            <div style={{
              position: 'absolute',
              top: 'calc(12px + env(safe-area-inset-top, 0px))',
              right: 'calc(12px + env(safe-area-inset-right, 0px))',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 11px',
              borderRadius: 999,
              background: 'rgba(12,13,16,0.68)',
              border: `1px solid ${color}33`,
              boxShadow: '0 12px 30px rgba(0,0,0,0.38)',
              backdropFilter: 'blur(14px)',
              zIndex: 5,
              pointerEvents: 'none',
              opacity: showCtrl ? 1 : 0,
              transition: 'opacity .25s ease',
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isLocal ? color : '#6fdc91',
                boxShadow: isLocal ? `0 0 10px ${color}` : '0 0 10px rgba(111,220,145,0.75)',
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <span style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.48)', fontWeight: 900 }}>Qualité</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>{qualityHint}</span>
              </div>
            </div>

            {/* ── Interface "détail épisode" (pré-lecture) : titre + note + synopsis IA + trailer ── */}
            {!started && !hideDetail && video && (() => {
              const meta = getAnimeMeta(storageKey)
              return (
                <EpisodeDetailOverlay
                  animeId={storageKey}
                  animeTitle={meta.title || video.anime || episodeLabel}
                  video={video}
                  note={meta.note}
                  youtube={meta.youtube}
                  color={color}
                  onPlay={togglePlay}
                />
              )
            })()}

            {/* ── Icône play centrale : seulement en pause PENDANT la lecture ──
                 (en pré-lecture, c'est la carte centrale qui porte le bouton Lecture) */}
            {started && !playing && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 4 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${color}e6`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: '#fff', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.22)', boxShadow: `0 10px 40px rgba(0,0,0,.5)` }}>▶</div>
              </div>
            )}

            {/* ── Contrôles ── */}
            <div className="vp-controls" style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent 0%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.92) 100%)',
              padding: '40px 16px 14px',
              opacity: showCtrl ? 1 : 0,
              transition: 'opacity .25s ease',
              pointerEvents: showCtrl ? 'all' : 'none',
              zIndex: 6,
            }}
              onClick={e => e.stopPropagation()}
            >
              {/* Barre de progression */}
              <ProgressBar
                currentTime={currentTime}
                duration={duration}
                buffered={buffered}
                onSeek={seek}
                color={color}
                previewSrc={video?.thumbnail}
                previewTitle={video?.title || episodeLabel}
                scrubSrc={scrubSrc}
              />

              {/* Ligne de contrôles — espacement plus large au doigt (tactile) ; wrap
                  autorisé sur tactile pour qu'aucun bouton agrandi ne soit rogné. */}
              <div className="vp-control-row" style={{ display: 'flex', alignItems: 'center', gap: IS_COARSE ? 10 : 6, marginTop: IS_COARSE ? 8 : 4, flexWrap: 'nowrap', rowGap: 0 }}>

                {/* Préc / Suiv (tactile uniquement : sur mobile la barre haute est souvent
                    masquée en plein écran → on remet la navigation d'épisode à portée de pouce) */}
                {IS_COARSE && (
                  <>
                    <Btn onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} title="Épisode précédent" color={color}>⏮</Btn>
                    <Btn onClick={() => setIdx(i => Math.min(videos.length - 1, i + 1))} disabled={idx === videos.length - 1} title="Épisode suivant" color={color}>⏭</Btn>
                  </>
                )}

                {/* Play/Pause */}
                <Btn onClick={togglePlay} title={playing ? 'Pause (Espace)' : 'Lecture (Espace)'} color={color}>
                  {playing ? '⏸' : '▶'}
                </Btn>

                {/* Skip ±10s */}
                <Btn onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, v.currentTime - 10) }} title="Reculer de 10s">
                  <span style={{ fontSize: IS_COARSE ? 15 : 13, fontWeight: 700 }}>−10</span>
                </Btn>
                <Btn onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.min(v.duration || 0, v.currentTime + 10) }} title="Avancer de 10s">
                  <span style={{ fontSize: IS_COARSE ? 15 : 13, fontWeight: 700 }}>+10</span>
                </Btn>

                {/* Volume — bouton muet : sur tactile il part dans la bottom-sheet Réglages
                    (l'utilisateur a déjà ses boutons physiques) → barre épurée une seule ligne. */}
                {!IS_COARSE && (
                <Btn onClick={() => {
                  const v = videoRef.current
                  const a = audioRef.current
                  const nextMuted = !muted
                  if (usesExternalAudio) {
                    if (a) a.muted = nextMuted
                    if (v) v.muted = true
                    setMuted(nextMuted)
                  } else if (v) {
                    v.muted = nextMuted
                  }
                }} title="Muet (M)">
                  {volIcon}
                </Btn>
                )}
                {/* Slider volume : caché au doigt (un slider de 70px est inutilisable au
                    pouce) → le bouton muet suffit ; sur le volume mobile, l'utilisateur
                    a déjà les boutons physiques de l'appareil. */}
                {!IS_COARSE && (
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={muted ? 0 : volume}
                    onChange={handleVolume}
                    onClick={e => e.stopPropagation()}
                    aria-label="Volume"
                    style={{ width: 70, accentColor: color, cursor: 'pointer', height: 3 }}
                  />
                )}

                {/* Temps */}
                <span className="vp-time" style={{ fontSize: IS_COARSE ? 13 : 12, color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', marginLeft: 4 }}>
                  {fmt(currentTime)} / {fmt(duration)}
                </span>

                <div style={{ flex: 1 }} />

                {/* DESKTOP : les 4 menus déroulants séparés (inchangés). Sur tactile ils
                    sont remplacés par la bottom-sheet « Réglages » plus bas. */}
                {!IS_COARSE && (<>
                {/* Sous-titres */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={e => { e.stopPropagation(); setShowSubMenu(s => !s); setShowSpdMenu(false); setShowAudioMenu(false); setShowQualityMenu(false) }}
                    title="Sous-titres"
                    aria-label="Sous-titres"
                    style={{
                      background: subsOff ? 'transparent' : `${color}22`,
                      border: `1px solid ${subsOff ? 'rgba(255,255,255,0.15)' : color + '55'}`,
                      borderRadius: 7, color: subsOff ? 'rgba(255,255,255,0.4)' : color,
                      // tactile : hit-zone élargie (≥44px), le bouton CC était introuvable au doigt
                      fontSize: IS_COARSE ? 14 : 11, fontWeight: 800,
                      padding: IS_COARSE ? '11px 15px' : '4px 9px', minHeight: IS_COARSE ? 44 : undefined,
                      cursor: hasSubs ? 'pointer' : 'default',
                      letterSpacing: '0.05em', transition: 'all .15s',
                    }}
                  >CC {subLabel}</button>
                  {showSubMenu && hasSubs && (
                    <div className="vp-menu" style={{ position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, background: 'rgba(14,15,17,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, minWidth: 160, padding: '5px 0', boxShadow: '0 12px 40px rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)', zIndex: 20 }}
                      onClick={e => e.stopPropagation()}
                    >
                      {[{ label: '🚫 Désactivés', action: () => chooseSubtitle(subIdx, true) },
                        ...video.subtitles.map((sub, i) => ({ label: sub.label, action: () => chooseSubtitle(i, false) }))
                      ].map((item, i) => (
                        <button key={i} onClick={() => { item.action(); setShowSubMenu(false) }}
                          style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#fff', fontSize: 13, fontWeight: 600, transition: 'background .12s' }}
                          onMouseEnter={e => e.currentTarget.style.background = `${color}18`}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >{item.label}</button>
                      ))}
                      <div style={{ height: 1, margin: '5px 0', background: 'rgba(255,255,255,0.08)' }} />
                      <div style={{ padding: '7px 14px 5px', color: 'rgba(255,255,255,0.42)', fontSize: 10, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>
                        Apparence
                      </div>
                      {[
                        ['A−', () => updateSubtitleStyle({ size: Math.max(14, subtitleStyle.size - 4) })],
                        ['A+', () => updateSubtitleStyle({ size: Math.min(64, subtitleStyle.size + 4) })],
                        ['↑ Monter', () => updateSubtitleStyle({ bottom: Math.min(180, (Number(subtitleStyle.bottom) || 110) + 24) })],
                        ['↓ Baisser', () => updateSubtitleStyle({ bottom: Math.max(40, (Number(subtitleStyle.bottom) || 110) - 24) })],
                        ['Fond −', () => updateSubtitleStyle({ background: Math.max(0, Number((subtitleStyle.background - 0.15).toFixed(2))) })],
                        ['Fond +', () => updateSubtitleStyle({ background: Math.min(0.95, Number((subtitleStyle.background + 0.15).toFixed(2))) })],
                        [subtitleStyle.outline ? 'Contour ON' : 'Contour OFF', () => updateSubtitleStyle({ outline: !subtitleStyle.outline })],
                        [subtitleStyle.shadow ? 'Ombre ON' : 'Ombre OFF', () => updateSubtitleStyle({ shadow: !subtitleStyle.shadow })],
                        [subtitleStyle.weight >= 800 ? 'Texte normal' : 'Texte gras', () => updateSubtitleStyle({ weight: subtitleStyle.weight >= 800 ? 600 : 800 })],
                      ].map(([label, action]) => (
                        <button key={label} onClick={action}
                          style={{ width: '50%', display: 'inline-block', padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}
                          onMouseEnter={e => e.currentTarget.style.background = `${color}18`}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >{label}</button>
                      ))}
                      <div style={{ padding: '2px 14px 3px', color: 'rgba(255,255,255,0.42)', fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase' }}>Couleur du texte</div>
                      <div style={{ display: 'flex', gap: 5, padding: '4px 10px 6px' }}>
                        {['#ffffff', '#ffe66d', '#8be9ff', '#ff8fab', '#9dff8f'].map(c => (
                          <button key={c} onClick={() => updateSubtitleStyle({ color: c })}
                            title={c}
                            style={{ flex: 1, height: 22, borderRadius: 5, border: `1px solid ${subtitleStyle.color === c ? color : 'rgba(255,255,255,0.2)'}`, background: c, cursor: 'pointer' }}
                          />
                        ))}
                      </div>
                      <div style={{ padding: '2px 14px 3px', color: 'rgba(255,255,255,0.42)', fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase' }}>Couleur du contour</div>
                      <div style={{ display: 'flex', gap: 5, padding: '4px 10px 8px' }}>
                        {['#000000', '#3a2d6d', '#7a1020', '#0a3a2a', '#ffffff'].map(c => (
                          <button key={c} onClick={() => updateSubtitleStyle({ outline: true, outlineColor: c })}
                            title={c}
                            style={{ flex: 1, height: 22, borderRadius: 5, border: `1px solid ${(subtitleStyle.outlineColor || '#000000') === c ? color : 'rgba(255,255,255,0.2)'}`, background: c, cursor: 'pointer' }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Audio */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={e => { e.stopPropagation(); setShowAudioMenu(s => !s); setShowSubMenu(false); setShowSpdMenu(false); setShowQualityMenu(false) }}
                    title="Audio"
                    aria-label="Piste audio"
                    style={{
                      background: hasAudioChoices ? `${color}18` : 'transparent',
                      border: `1px solid ${hasAudioChoices ? color + '44' : 'rgba(255,255,255,0.15)'}`,
                      borderRadius: 7,
                      color: hasAudioChoices ? color : 'rgba(255,255,255,0.4)',
                      fontSize: IS_COARSE ? 14 : 11,
                      fontWeight: 800,
                      padding: IS_COARSE ? '11px 15px' : '4px 9px',
                      minHeight: IS_COARSE ? 44 : undefined,
                      cursor: hasAudioChoices ? 'pointer' : 'default',
                      letterSpacing: '0.05em',
                      transition: 'all .15s',
                    }}
                  >AU {audioLabel}</button>
                  {showAudioMenu && hasAudioChoices && (
                    <div className="vp-menu" style={{ position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, background: 'rgba(14,15,17,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, minWidth: 168, padding: '5px 0', boxShadow: '0 12px 40px rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)', zIndex: 20 }}
                      onClick={e => e.stopPropagation()}
                    >
                      {audioTrackState === 'unsupported' && !selectedAudio?.mediaSrc && (
                        <div style={{ padding: '8px 14px', color: 'rgba(255,255,255,0.45)', fontSize: 11, lineHeight: 1.4 }}>
                          Changement audio non supporté par ce navigateur.
                        </div>
                      )}
                      {audioOptions.map((track, i) => (
                        <button key={`${track.label || 'audio'}-${i}`} onClick={() => { chooseAudio(i); setShowAudioMenu(false) }}
                          style={{ width: '100%', padding: '8px 14px', background: i === audioIdx ? `${color}22` : 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: i === audioIdx ? color : '#fff', fontSize: 13, fontWeight: i === audioIdx ? 800 : 600, transition: 'background .12s' }}
                          onMouseEnter={e => { if (i !== audioIdx) e.currentTarget.style.background = `${color}18` }}
                          onMouseLeave={e => { if (i !== audioIdx) e.currentTarget.style.background = 'none' }}
                        >{track.label || `Audio ${i + 1}`}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vitesse */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={e => { e.stopPropagation(); setShowSpdMenu(s => !s); setShowSubMenu(false); setShowAudioMenu(false); setShowQualityMenu(false) }}
                    title="Vitesse de lecture"
                    aria-label="Vitesse de lecture"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, color: 'rgba(255,255,255,0.85)', fontSize: IS_COARSE ? 14 : 11, fontWeight: 800, padding: IS_COARSE ? '11px 15px' : '4px 9px', minHeight: IS_COARSE ? 44 : undefined, cursor: 'pointer', letterSpacing: '0.05em' }}
                  >{speed}×</button>
                  {showSpdMenu && (
                    <div className="vp-menu" style={{ position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, background: 'rgba(14,15,17,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, minWidth: 100, padding: '5px 0', boxShadow: '0 12px 40px rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)', zIndex: 20 }}
                      onClick={e => e.stopPropagation()}
                    >
                      {SPEEDS.map(s => (
                        <button key={s} onClick={() => { setSpeed(s); if (videoRef.current) videoRef.current.playbackRate = s; setShowSpdMenu(false) }}
                          style={{ width: '100%', padding: '7px 14px', background: s === speed ? `${color}22` : 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: s === speed ? color : '#fff', fontSize: 13, fontWeight: s === speed ? 800 : 600, transition: 'background .12s' }}
                          onMouseEnter={e => { if (s !== speed) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                          onMouseLeave={e => { if (s !== speed) e.currentTarget.style.background = 'none' }}
                        >{s}×</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Qualité : indicateur détecté. Caché au doigt (redondant avec le badge
                    en haut à droite) pour dégager de la place aux contrôles essentiels. */}
                <div style={{ position: 'relative', display: IS_COARSE ? 'none' : 'block' }}>
                  <button
                    onClick={e => { e.stopPropagation(); setShowQualityMenu(q => !q); setShowSpdMenu(false); setShowSubMenu(false); setShowAudioMenu(false) }}
                    title="Qualité vidéo"
                    aria-label="Qualité vidéo"
                    style={{ background: 'rgba(100,217,139,0.10)', border: '1px solid rgba(100,217,139,0.28)', borderRadius: 7, color: '#64d98b', fontSize: 11, fontWeight: 900, padding: '4px 9px', cursor: 'pointer', letterSpacing: '0.05em' }}
                  >{qualityHint}</button>
                  {showQualityMenu && (
                    <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, background: 'rgba(14,15,17,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, minWidth: 168, padding: '8px 0', boxShadow: '0 12px 40px rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)', zIndex: 20 }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div style={{ padding: '0 14px 8px', color: 'rgba(255,255,255,0.38)', fontSize: 10, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>
                        Qualité détectée
                      </div>
                      {[
                        { label: qualityHint, active: true },
                        { label: isLocal ? 'Source locale' : 'Lecture externe', active: false },
                      ].map((item, i) => (
                        <button key={i} onClick={() => setShowQualityMenu(false)}
                          style={{ width: '100%', padding: '8px 14px', background: item.active ? `${color}18` : 'none', border: 'none', cursor: 'default', textAlign: 'left', color: item.active ? '#64d98b' : '#fff', fontSize: 13, fontWeight: item.active ? 800 : 600, transition: 'background .12s' }}
                        >{item.label}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Picture-in-Picture */}
                {'pictureInPictureEnabled' in document && (
                  <Btn onClick={() => videoRef.current?.requestPictureInPicture?.()} title="Picture in Picture">⧉</Btn>
                )}
                </>)}

                {/* TACTILE : un seul bouton « Réglages » ouvre la bottom-sheet unifiée
                    (sous-titres + apparence, audio, vitesse). Grosse cible ≥48px. */}
                {IS_COARSE && (
                  <button
                    onClick={e => { e.stopPropagation(); setShowSettingsSheet(true) }}
                    title="Réglages"
                    aria-label="Réglages : sous-titres, audio, vitesse"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      height: 48, minWidth: 48, padding: '0 16px', borderRadius: 12, flexShrink: 0,
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
                      color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent', transition: 'background .15s',
                    }}
                  ><span style={{ fontSize: 20, lineHeight: 1 }}>⚙</span><span>Réglages</span></button>
                )}

                {/* Plein écran — c'est LE mode de visionnage principal au téléphone, donc
                    sur tactile on le rend gros et bien visible (pastille accent ≥44px). */}
                {IS_COARSE ? (
                  <button
                    onClick={toggleFullscreen}
                    title={(fullscreen || cssFs) ? 'Quitter plein écran' : 'Plein écran'}
                    aria-label={(fullscreen || cssFs) ? 'Quitter le plein écran' : 'Plein écran'}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 48, height: 48, borderRadius: 12, flexShrink: 0, marginLeft: 2,
                      background: (fullscreen || cssFs) ? 'rgba(255,255,255,0.14)' : `${color}33`,
                      border: `1px solid ${color}77`, color: '#fff', fontSize: 24, cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent', transition: 'background .15s',
                    }}
                  >{(fullscreen || cssFs) ? '⊡' : '⛶'}</button>
                ) : (
                  <Btn onClick={toggleFullscreen} title={(fullscreen || cssFs) ? 'Quitter plein écran (F)' : 'Plein écran (F)'}>
                    {(fullscreen || cssFs) ? '⊡' : '⛶'}
                  </Btn>
                )}
              </div>

              {/* Légende raccourcis — CLAVIER uniquement : masquée sur tactile
                  (sur téléphone elle encombrait l'overlay et gênait le play). */}
              {!(typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) && (
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap', opacity: 0.55 }}>
                  {[['Espace', 'Play/Pause'], ['←→', '±5s'], ['↑↓', 'Volume'], ['M', 'Muet'], ['F', 'Plein écran']].map(([k, v]) => (
                    <span key={k} style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                      <kbd style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3, padding: '1px 5px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', marginRight: 4 }}>{k}</kbd>
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── TACTILE : bottom-sheet « Réglages » unifiée ──
                 Regroupe sous-titres (on/off + langue + apparence), audio, vitesse, qualité.
                 Réutilise EXACTEMENT les handlers existants (chooseSubtitle / chooseAudio /
                 setSpeed / updateSubtitleStyle). z-index > contrôles → marche aussi en plein
                 écran paysage. Ferme au tap hors panneau ou via ✕. */}
            {IS_COARSE && showSettingsSheet && (
              <div
                className="vp-sheet-backdrop"
                onClick={() => setShowSettingsSheet(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 2147483000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', WebkitTapHighlightColor: 'transparent' }}
              >
                <div
                  className="vp-sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Réglages du lecteur"
                  onClick={e => e.stopPropagation()}
                  style={{
                    width: '100%', maxHeight: '78vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
                    background: 'rgba(12,13,16,0.96)', backdropFilter: 'blur(20px)',
                    borderTopLeftRadius: 18, borderTopRightRadius: 18,
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 -16px 50px rgba(0,0,0,0.6)',
                    paddingBottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
                  }}
                >
                  {/* En-tête : poignée + titre + fermer */}
                  <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(12,13,16,0.96)', backdropFilter: 'blur(20px)', padding: '10px 16px 8px' }}>
                    <div style={{ width: 38, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)', margin: '0 auto 10px' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Réglages</span>
                      <button onClick={() => setShowSettingsSheet(false)} aria-label="Fermer les réglages"
                        style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', fontSize: 18, cursor: 'pointer' }}>✕</button>
                    </div>
                  </div>

                  <div style={{ padding: '4px 12px 8px' }}>
                    {/* Son */}
                    <div style={vpSheetSection}>Son</div>
                    <button
                      onClick={() => {
                        const v = videoRef.current
                        const a = audioRef.current
                        const nextMuted = !muted
                        if (usesExternalAudio) { if (a) a.muted = nextMuted; if (v) v.muted = true; setMuted(nextMuted) }
                        else if (v) { v.muted = nextMuted }
                      }}
                      style={vpSheetRow(false, color)}
                    ><span>{volIcon} {muted ? 'Activer le son' : 'Couper le son'}</span></button>

                    {/* Sous-titres */}
                    <div style={vpSheetSection}>Sous-titres</div>
                    {hasSubs ? (
                      <>
                        <button onClick={() => chooseSubtitle(subIdx, true)} style={vpSheetRow(subsOff, color)}>
                          <span>🚫 Désactivés</span>{subsOff && <span>✓</span>}
                        </button>
                        {video.subtitles.map((sub, i) => (
                          <button key={i} onClick={() => chooseSubtitle(i, false)} style={vpSheetRow(!subsOff && i === subIdx, color)}>
                            <span>{sub.label}</span>{!subsOff && i === subIdx && <span>✓</span>}
                          </button>
                        ))}
                        {/* Apparence des sous-titres */}
                        <div style={{ ...vpSheetSection, fontSize: 11 }}>Apparence</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 4px 8px' }}>
                          {[
                            ['A−', () => updateSubtitleStyle({ size: Math.max(14, subtitleStyle.size - 4) })],
                            ['A+', () => updateSubtitleStyle({ size: Math.min(64, subtitleStyle.size + 4) })],
                            ['↑ Monter', () => updateSubtitleStyle({ bottom: Math.min(180, (Number(subtitleStyle.bottom) || 110) + 24) })],
                            ['↓ Baisser', () => updateSubtitleStyle({ bottom: Math.max(40, (Number(subtitleStyle.bottom) || 110) - 24) })],
                            ['Fond −', () => updateSubtitleStyle({ background: Math.max(0, Number((subtitleStyle.background - 0.15).toFixed(2))) })],
                            ['Fond +', () => updateSubtitleStyle({ background: Math.min(0.95, Number((subtitleStyle.background + 0.15).toFixed(2))) })],
                            [subtitleStyle.outline ? 'Contour ON' : 'Contour OFF', () => updateSubtitleStyle({ outline: !subtitleStyle.outline })],
                            [subtitleStyle.shadow ? 'Ombre ON' : 'Ombre OFF', () => updateSubtitleStyle({ shadow: !subtitleStyle.shadow })],
                            [subtitleStyle.weight >= 800 ? 'Texte normal' : 'Texte gras', () => updateSubtitleStyle({ weight: subtitleStyle.weight >= 800 ? 600 : 800 })],
                          ].map(([label, action]) => (
                            <button key={label} onClick={action}
                              style={{ flex: '1 1 30%', minHeight: 48, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{label}</button>
                          ))}
                        </div>
                        <div style={{ ...vpSheetSection, fontSize: 11 }}>Couleur du texte</div>
                        <div style={{ display: 'flex', gap: 8, padding: '4px 4px 8px' }}>
                          {['#ffffff', '#ffe66d', '#8be9ff', '#ff8fab', '#9dff8f'].map(c => (
                            <button key={c} onClick={() => updateSubtitleStyle({ color: c })} title={c} aria-label={`Couleur texte ${c}`}
                              style={{ flex: 1, height: 40, borderRadius: 8, border: `2px solid ${subtitleStyle.color === c ? color : 'rgba(255,255,255,0.2)'}`, background: c, cursor: 'pointer' }} />
                          ))}
                        </div>
                        <div style={{ ...vpSheetSection, fontSize: 11 }}>Couleur du contour</div>
                        <div style={{ display: 'flex', gap: 8, padding: '4px 4px 8px' }}>
                          {['#000000', '#3a2d6d', '#7a1020', '#0a3a2a', '#ffffff'].map(c => (
                            <button key={c} onClick={() => updateSubtitleStyle({ outline: true, outlineColor: c })} title={c} aria-label={`Couleur contour ${c}`}
                              style={{ flex: 1, height: 40, borderRadius: 8, border: `2px solid ${(subtitleStyle.outlineColor || '#000000') === c ? color : 'rgba(255,255,255,0.2)'}`, background: c, cursor: 'pointer' }} />
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: '10px 8px', color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>Aucun sous-titre disponible.</div>
                    )}

                    {/* Audio */}
                    {hasAudioChoices && (
                      <>
                        <div style={vpSheetSection}>Audio</div>
                        {audioTrackState === 'unsupported' && !selectedAudio?.mediaSrc && (
                          <div style={{ padding: '8px', color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 1.4 }}>
                            Changement audio non supporté par ce navigateur.
                          </div>
                        )}
                        {audioOptions.map((track, i) => (
                          <button key={`${track.label || 'audio'}-${i}`} onClick={() => chooseAudio(i)} style={vpSheetRow(i === audioIdx, color)}>
                            <span>{track.label || `Audio ${i + 1}`}</span>{i === audioIdx && <span>✓</span>}
                          </button>
                        ))}
                      </>
                    )}

                    {/* Vitesse */}
                    <div style={vpSheetSection}>Vitesse de lecture</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 4px 8px' }}>
                      {SPEEDS.map(s => (
                        <button key={s} onClick={() => { setSpeed(s); if (videoRef.current) videoRef.current.playbackRate = s }}
                          style={{ flex: '1 1 28%', minHeight: 48, borderRadius: 10, background: s === speed ? `${color}22` : 'rgba(255,255,255,0.07)', border: `1px solid ${s === speed ? color + '66' : 'rgba(255,255,255,0.14)'}`, color: s === speed ? color : '#fff', fontSize: 14, fontWeight: s === speed ? 800 : 700, cursor: 'pointer' }}>{s}×</button>
                      ))}
                    </div>

                    {/* Qualité (info) */}
                    <div style={vpSheetSection}>Qualité</div>
                    <div style={{ ...vpSheetRow(false, color), cursor: 'default' }}>
                      <span>{isLocal ? 'Source locale' : 'Lecture externe'}</span>
                      <span style={{ color: '#64d98b', fontWeight: 800 }}>{qualityHint}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* YouTube embed */
          <iframe
            key={video.id}
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            title={video.title}
          />
        )}
      </div>

      {/* ── Bande épisodes ── (masquée en mode intégré : la page d'EpisodeWatch
           affiche déjà "Épisodes suivants" → évite le doublon) */}
      {!embedded && videos.length > 1 && (() => {
        const hasThumbs = videos.some(v => v.thumbnail || v.src)
        return (
          <div style={{ flexShrink: 0, display: 'flex', gap: 6, padding: hasThumbs ? '8px 14px' : '7px 14px', background: 'rgba(8,9,11,0.84)', backdropFilter: 'blur(18px)', borderTop: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto', scrollbarWidth: 'thin', alignItems: 'flex-start' }}>
            {videos.map((v, i) => (
              <button key={i} onClick={() => setIdx(i)}
                style={{ flexShrink: 0, borderRadius: 8, border: `1px solid ${i === idx ? color + '70' : 'rgba(255,255,255,0.09)'}`, background: i === idx ? `${color}22` : 'transparent', color: i === idx ? color : 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all .15s', overflow: 'hidden', padding: hasThumbs ? '0' : '5px 13px' }}
                onMouseEnter={e => { if (i !== idx) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { if (i !== idx) e.currentTarget.style.background = 'transparent' }}
              >
                {hasThumbs ? (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <EpisodeMiniThumb video={v} color={color} />
                    <div style={{ padding: '4px 6px', fontSize: 11, fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {v.season && <span style={{ opacity: 0.55, marginRight: 3 }}>S{v.season} ·</span>}Ép.{v.episode}
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {v.season && <span style={{ opacity: 0.55, marginRight: 3 }}>S{v.season}·</span>}Ép.{v.episode}
                  </span>
                )}
              </button>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
