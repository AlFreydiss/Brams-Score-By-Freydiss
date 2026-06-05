import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import EpisodeDetailOverlay from './EpisodeDetailOverlay.jsx'
import { getAnimeMeta } from '../data/anime-meta.js'
import { setBoost } from '../lib/audioBoost.js'

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
  size: 30,
  background: 0,
  color: '#ffffff',
  outline: true,
  weight: 700,
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

// ── Bouton icône ─────────────────────────────────────────────────────────────
function Btn({ onClick, title, children, disabled = false, active = false, color = 'rgba(255,255,255,0.85)' }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: active ? 'rgba(255,255,255,0.12)' : hov ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: 'none', cursor: disabled ? 'default' : 'pointer',
        color: disabled ? 'rgba(255,255,255,0.2)' : color,
        borderRadius: 8, padding: '5px 8px', fontSize: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background .15s, color .15s', flexShrink: 0,
        minWidth: 32, height: 32,
      }}
    >{children}</button>
  )
}

// ── Barre de progression ──────────────────────────────────────────────────────
function ProgressBar({ currentTime, duration, buffered, onSeek, color }) {
  const barRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [hoverPct, setHoverPct] = useState(null)
  const pct = duration ? Math.min(1, currentTime / duration) : 0
  const bufPct = duration ? Math.min(1, buffered / duration) : 0

  const getPos = useCallback((e) => {
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  }, [])

  const handleDown = (e) => {
    setDragging(true)
    onSeek(getPos(e) * duration)
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = e => onSeek(getPos(e) * duration)
    const onUp = e => { onSeek(getPos(e) * duration); setDragging(false) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragging, duration, getPos, onSeek])

  return (
    <div ref={barRef}
      onMouseDown={handleDown}
      onMouseMove={e => setHoverPct(getPos(e))}
      onMouseLeave={() => setHoverPct(null)}
      style={{ width: '100%', height: 20, display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}
    >
      {/* Tooltip temps */}
      {hoverPct !== null && (
        <div style={{ position: 'absolute', bottom: 20, left: `${hoverPct * 100}%`, transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.85)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 5, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          {fmt((hoverPct) * duration)}
        </div>
      )}
      <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 4, position: 'relative', overflow: 'visible' }}>
        {/* Buffer */}
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${bufPct * 100}%`, background: 'rgba(255,255,255,0.25)', borderRadius: 4, pointerEvents: 'none' }} />
        {/* Progress */}
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct * 100}%`, background: color, borderRadius: 4, pointerEvents: 'none', transition: dragging ? 'none' : 'width .1s linear' }} />
        {/* Thumb */}
        <div style={{ position: 'absolute', top: '50%', left: `${pct * 100}%`, transform: 'translate(-50%, -50%)', width: 12, height: 12, borderRadius: '50%', background: '#fff', boxShadow: `0 0 6px ${color}88`, pointerEvents: 'none', opacity: hoverPct !== null || dragging ? 1 : 0, transition: 'opacity .15s' }} />
      </div>
    </div>
  )
}

function EpisodeMiniThumb({ video, color }) {
  const [ready, setReady] = useState(false)
  if (video.thumbnail) {
    return <img src={video.thumbnail} alt={`Ep.${video.episode}`} style={{ width: 96, height: 54, objectFit: 'cover', display: 'block' }} />
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
export default function VideoPlayer({ videos, startIdx, onClose, color = '#6c5ce7', storageKey = null, onProgressUpdate = null }) {
  const { userId } = useAuth()
  const videoRef     = useRef(null)
  const audioRef     = useRef(null)
  const containerRef = useRef(null)
  const hideTimer    = useRef(null)
  const lastSaveRef  = useRef(0)
  const pendingSourceRef = useRef(null)
  const hlsRef = useRef(null)
  const autoplayPendingRef = useRef(false)   // relancer la lecture après avance auto

  const [idx,          setIdx]         = useState(startIdx)
  const [playing,      setPlaying]     = useState(false)
  const [currentTime,  setCurrentTime] = useState(0)
  const [duration,     setDuration]    = useState(0)
  const [volume,       setVolume]      = useState(1)
  const [muted,        setMuted]       = useState(false)
  const [speed,        setSpeed]       = useState(1)
  const [fullscreen,   setFullscreen]  = useState(false)
  const [showCtrl,     setShowCtrl]    = useState(true)
  const [started,      setStarted]     = useState(false)  // false = interface "détail épisode" (pré-lecture)
  const [subIdx,       setSubIdx]      = useState(0)
  const [subsOff,      setSubsOff]     = useState(false)
  const cueRef = useRef(null)          // sous-titres écrits en DOM direct (hors cycle React)
  const [buffered,     setBuffered]    = useState(0)
  const [showSubMenu,  setShowSubMenu] = useState(false)
  const [showAudioMenu, setShowAudioMenu] = useState(false)
  const [showSpdMenu,  setShowSpdMenu] = useState(false)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
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
  }, [idx, onProgressUpdate, storageKey, video])

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

  // ── Sous-titres — écriture DOM DIRECTE via ref (hors cycle de rendu React) ──
  // L'ancien polling rAF faisait 60 setState/s : React 18 (concurrent) reportait
  // sans cesse le commit, et seul un événement discret (souris) le forçait →
  // "les sous-titres n'apparaissent qu'en bougeant la souris". On écrit donc le
  // texte directement dans le DOM (textContent), sans aucun setState : l'affichage
  // ne dépend plus du tout du rendu React. `cuechange` (frontières de cue) + poll
  // léger de secours pour les navigateurs capricieux.
  useEffect(() => {
    const v = videoRef.current
    const paint = (text) => {
      const el = cueRef.current
      if (!el) return
      if (el.getAttribute('data-cue') === text) return
      el.setAttribute('data-cue', text)
      el.textContent = text
      el.style.display = text ? '' : 'none'
    }
    if (!v || !hasSubs) { paint(''); return }

    let boundTrack = null

    const render = () => {
      const cues = boundTrack?.activeCues
      paint(cues && cues.length ? cleanCueText(Array.from(cues).map(c => c.text).join('\n')) : '')
    }

    const setupTrack = () => {
      const tracks = v.textTracks
      // Disable ALL tracks first (embedded MKV tracks included)
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = 'disabled'
      }
      if (boundTrack) { boundTrack.removeEventListener('cuechange', render); boundTrack = null }
      if (subsOff || !hasSubs) { paint(''); return }

      const targetSub = video?.subtitles?.[subIdx]
      if (!targetSub) { paint(''); return }

      // Find the external VTT track — prefer LAST match because
      // embedded MKV tracks appear first, React-injected <track> elements last.
      let bestIdx = -1
      let exactIdx = -1
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i]
        const labelMatch = t.label && targetSub.label && t.label === targetSub.label
        const langMatch  = t.language && targetSub.srclang && (
          t.language === targetSub.srclang ||
          t.language.startsWith(targetSub.srclang + '-')
        )
        if (labelMatch) exactIdx = i
        else if (langMatch) bestIdx = i
      }
      if (exactIdx >= 0) bestIdx = exactIdx

      if (bestIdx >= 0) {
        // 'hidden' charge bien les cues et peuple activeCues, sans rendu natif.
        tracks[bestIdx].mode = 'hidden'
        boundTrack = tracks[bestIdx]
        boundTrack.addEventListener('cuechange', render)
        render()
      } else {
        paint('')
      }
    }

    setupTrack()
    v.textTracks.addEventListener('addtrack', setupTrack)
    // Certains navigateurs peuplent les pistes après coup : on retente le câblage.
    const retry = setTimeout(setupTrack, 400)
    // Filet de secours : poll basse fréquence.
    const poll = setInterval(render, 250)
    // Signal le PLUS fiable pendant la lecture : timeupdate se déclenche en
    // continu tant que la vidéo joue → le sous-titre suit la lecture même si
    // cuechange ou l'intervalle flanchent. + seeking/seeked pour les sauts.
    v.addEventListener('timeupdate', render)
    v.addEventListener('seeking', render)
    v.addEventListener('seeked', render)

    return () => {
      clearTimeout(retry)
      clearInterval(poll)
      v.textTracks.removeEventListener('addtrack', setupTrack)
      v.removeEventListener('timeupdate', render)
      v.removeEventListener('seeking', render)
      v.removeEventListener('seeked', render)
      if (boundTrack) boundTrack.removeEventListener('cuechange', render)
      paint('')
    }
    // mediaSrc : le <video> est keyé par la source (variantes audio VF/JP des
    // films) → il se remonte ; sans cette dépendance, on resterait branché sur
    // l'ancien élément et les sous-titres se figeraient.
  }, [subIdx, subsOff, hasSubs, idx, mediaSrc])

  // ── Réinitialiser état au changement d'épisode ───────────────────────────
  useEffect(() => {
    const prefs = loadVideoPreferences(userId)
    const nextSubIdx = findTrackIndex(video?.subtitles || [], prefs.subtitleLang || 'fr', 0)
    const preferredAudioLang = video?.preferredAudioLang || prefs.audioLang || 'ja'
    const nextAudioIdx = findTrackIndex(audioOptions, preferredAudioLang, 0)

    setCurrentTime(0); setDuration(0); setBuffered(0); setPlaying(false)
    if (cueRef.current) { cueRef.current.textContent = ''; cueRef.current.style.display = 'none'; cueRef.current.removeAttribute('data-cue') }
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
    const saved = loadVideoProgress(storageKey)
    const savedEpisode = saved?.episodes?.[progressKeyFor(video, idx)]
    if (!savedEpisode?.time || savedEpisode.completed) return
    const v = videoRef.current
    const resume = () => {
      if (Number.isFinite(savedEpisode.time) && savedEpisode.time > 3) {
        v.currentTime = Math.max(0, savedEpisode.time - 2)
        if (savedEpisode.time > 60) {                       // toast "Reprise à MM:SS"
          setResumeToast(fmt(savedEpisode.time - 2))
          setTimeout(() => setResumeToast(null), 4500)
        }
      }
    }
    if (v.readyState >= 1) resume()
    else v.addEventListener('loadedmetadata', resume, { once: true })
    return () => v.removeEventListener('loadedmetadata', resume)
  }, [idx, storageKey, video])

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

  // ── Boost de loudness par vidéo (ex. films Violet trop bas) ───────────────
  // Ne route dans Web Audio que les vidéos avec gain>1 → zéro risque ailleurs.
  // Le lecteur a déjà crossOrigin='anonymous' quand il y a des sous-titres, et
  // l'HLS passe par MSE (blob same-origin) → pas de souci de "tainted".
  useEffect(() => {
    if (videoRef.current) setBoost(videoRef.current, video?.gain || 1)
  }, [mediaSrc, video?.gain])

  // ── Lecture HLS via hls.js (Chrome/Edge/Firefox — pas de HLS natif) ───────
  useEffect(() => {
    const v = videoRef.current
    if (!isLocal || !v || !mediaSrc || !isHlsSrc(mediaSrc) || NATIVE_HLS) return
    let hls = null, cancelled = false
    import('hls.js').then(({ default: Hls }) => {
      if (cancelled || !Hls.isSupported()) return
      hls = new Hls({ enableWorker: true, maxBufferLength: 30, backBufferLength: 30, startLevel: -1 })
      hlsRef.current = hls
      hls.attachMedia(v)
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(encSrc(mediaSrc)))
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        applyAudioPreference(audioIdx)
        const p = pendingSourceRef.current
        if (p && Number.isFinite(p.time)) { try { v.currentTime = p.time } catch {} }
        if (p?.play) v.play().catch(() => {})
      })
      // Les pistes audio (VF/JP) peuvent arriver après le manifest → on réapplique
      // dès qu'elles sont connues (sinon l'UI restait sur "non supporté").
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
  }, [mediaSrc, isLocal])

  // ── Fullscreen ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', fn)
    return () => document.removeEventListener('fullscreenchange', fn)
  }, [])

  const toggleFullscreen = () => {
    const el = containerRef.current
    if (!document.fullscreenElement) el?.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  // ── Raccourcis clavier ───────────────────────────────────────────────────
  useEffect(() => {
    const fn = e => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      const v = videoRef.current
      switch (e.key) {
        case 'Escape':      onClose(); break
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
  }, [onClose])

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

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: '#000', display: 'flex', flexDirection: 'column' }}>

      {/* ── Barre haute ── */}
      <div style={{ flexShrink: 0, height: 48, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', background: 'rgba(8,9,11,0.84)', backdropFilter: 'blur(18px)', borderBottom: `1px solid ${color}22`, zIndex: 10 }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, color: '#fff', cursor: 'pointer', padding: '6px 13px', fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'background .15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
        >✕ Fermer</button>

        <div style={{ flex: 1, textAlign: 'center', overflow: 'hidden' }}>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{episodeLabel}</span>
          {video?.title && !/^episode\s/i.test(String(video.title)) && <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginLeft: 8 }}>— {video.title}</span>}
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setIdx(i => i - 1)} disabled={idx === 0} style={{ padding: '5px 13px', borderRadius: 9, border: `1px solid ${idx === 0 ? 'rgba(255,255,255,0.1)' : color + '44'}`, background: idx === 0 ? 'transparent' : `${color}18`, color: idx === 0 ? 'rgba(255,255,255,0.2)' : color, cursor: idx === 0 ? 'default' : 'pointer', fontSize: 12, fontWeight: 700, transition: 'background .15s' }}>← Préc.</button>
          <button onClick={() => setIdx(i => i + 1)} disabled={idx === videos.length - 1} style={{ padding: '5px 13px', borderRadius: 9, border: `1px solid ${idx === videos.length - 1 ? 'rgba(255,255,255,0.1)' : color + '44'}`, background: idx === videos.length - 1 ? 'transparent' : `${color}18`, color: idx === videos.length - 1 ? 'rgba(255,255,255,0.2)' : color, cursor: idx === videos.length - 1 ? 'default' : 'pointer', fontSize: 12, fontWeight: 700, transition: 'background .15s' }}>Suiv. →</button>
        </div>
      </div>

      {/* ── Zone vidéo ── */}
      <div
        ref={containerRef}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onMouseMove={showControls}
        onMouseLeave={() => { if (playing) hideTimer.current = setTimeout(() => setShowCtrl(false), 1500) }}
        style={{ flex: 1, position: 'relative', background: '#000', cursor: showCtrl ? 'default' : 'none', overflow: 'hidden' }}
      >
        {isLocal ? (
          <>
            <video
              ref={videoRef}
              key={mediaSrc}
              crossOrigin={hasSubs ? 'anonymous' : undefined}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
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
              {/* Source native seulement si hls.js ne pilote pas (mp4, ou HLS sur Safari).
                  Sinon hls.js attache la vidéo via MSE et un <source> .m3u8 ferait planter. */}
              {!(isHlsSrc(mediaSrc) && !NATIVE_HLS) && (
                <source
                  src={encSrc(mediaSrc)}
                  type={sourceType(mediaSrc)}
                />
              )}
              {/* Pistes de sous-titres (lues via TextTrack API, mode hidden) */}
              {hasSubs && video.subtitles.map((sub, i) => (
                <track key={i} kind="subtitles" src={sub.src} srcLang={sub.srclang || 'fr'} label={sub.label} />
              ))}
            </video>
            {selectedAudio?.src && !selectedAudio?.mediaSrc && (
              <audio
                ref={audioRef}
                key={selectedAudio.src}
                src={selectedAudio.src}
                preload="auto"
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

            <style>{`@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }`}</style>

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
                  style={{ position:'absolute', right:24, bottom: showCtrl ? 118 : 40, zIndex:20, display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:12, cursor:'pointer', fontFamily:'var(--body)', fontSize:13, fontWeight:800, color:'#fff', background:'rgba(10,8,16,0.82)', backdropFilter:'blur(10px)', border:`1px solid ${color}66`, boxShadow:'0 8px 28px rgba(0,0,0,0.45)', transition:'transform .15s, background .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${color}cc`; e.currentTarget.style.transform = 'scale(1.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,8,16,0.82)'; e.currentTarget.style.transform = 'none' }}>
                  {skip.label} <span style={{ fontSize:15 }}>⏭</span>
                </button>
              )
            })()}

            {/* ── Fin d'épisode : autoplay (compte à rebours) ou carte manuelle ── */}
            {endOverlay && videos[idx + 1] && (
              <div style={{ position:'absolute', right:24, bottom: showCtrl ? 118 : 40, zIndex:25, width:308, padding:18, borderRadius:16, background:'rgba(10,8,16,0.93)', backdropFilter:'blur(16px)', border:`1px solid ${color}55`, boxShadow:'0 18px 50px rgba(0,0,0,0.6)', animation:'fadeIn .3s ease' }}>
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
                    style={{ flex:1, padding:'9px 0', borderRadius:10, cursor:'pointer', fontFamily:'var(--body)', fontSize:12.5, fontWeight:800, color:'#fff', background:color, border:'none' }}>
                    ▶ Lire {countdown != null ? 'maintenant' : ''}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setEndOverlay(false); setCountdown(null) }}
                    style={{ padding:'9px 14px', borderRadius:10, cursor:'pointer', fontFamily:'var(--body)', fontSize:12.5, fontWeight:700, color:'rgba(255,255,255,0.7)', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}>
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

            {/* ── Sous-titres overlay (texte écrit en DOM direct via cueRef) ──
                Toujours monté quand les sous-titres sont actifs ; le texte et la
                visibilité (display) sont gérés hors React. IMPORTANT : ne PAS
                mettre `display` dans ce style, sinon React l'écraserait au re-rendu
                (changement de taille/position) et masquerait les sous-titres. */}
            {!subsOff && hasSubs && (
              <div ref={cueRef} style={{
                position: 'absolute',
                // Position bornée à une bande TOUJOURS visible (40–180px du bas) :
                // une valeur sauvegardée extrême ne peut plus envoyer le sous-titre
                // hors de l'image. Indépendant de showCtrl (aucun lien à la souris).
                bottom: Math.min(180, Math.max(40, Number(subtitleStyle.bottom) || 110)),
                left: '50%', transform: 'translateX(-50%)',
                maxWidth: '82%', textAlign: 'center',
                padding: '5px 16px',
                background: `rgba(0,0,0,${subtitleStyle.background})`,
                borderRadius: 6,
                color: subtitleStyle.color,
                fontSize: subtitleStyle.size,
                fontWeight: subtitleStyle.weight,
                lineHeight: 1.55,
                textShadow: subtitleStyle.outline
                  ? '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 2px 10px rgba(0,0,0,0.95)'
                  : '0 1px 4px rgba(0,0,0,0.85)',
                whiteSpace: 'pre-line',
                transition: 'bottom .2s ease',
                pointerEvents: 'none',
                zIndex: 5,
              }} />
            )}

            {/* Indicateur de qualité — suit les contrôles (plus de superposition permanente) */}
            <div style={{
              position: 'absolute',
              top: 12,
              right: 12,
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
            {!started && video && (() => {
              const meta = getAnimeMeta(storageKey)
              return (
                <EpisodeDetailOverlay
                  animeId={storageKey}
                  animeTitle={meta.title || video.anime || episodeLabel}
                  video={video}
                  note={meta.note}
                  youtube={meta.youtube}
                  color={color}
                />
              )
            })()}

            {/* ── Big play icon au centre ── */}
            {!playing && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 4 }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: `${color}cc`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: `0 4px 24px ${color}66`, backdropFilter: 'blur(4px)' }}>▶</div>
              </div>
            )}

            {/* ── Contrôles ── */}
            <div style={{
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
              />

              {/* Ligne de contrôles */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>

                {/* Play/Pause */}
                <Btn onClick={togglePlay} title={playing ? 'Pause (Espace)' : 'Lecture (Espace)'} color={color}>
                  {playing ? '⏸' : '▶'}
                </Btn>

                {/* Skip ±10s */}
                <Btn onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, v.currentTime - 10) }} title="Reculer de 10s">
                  <span style={{ fontSize: 13 }}>−10</span>
                </Btn>
                <Btn onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.min(v.duration || 0, v.currentTime + 10) }} title="Avancer de 10s">
                  <span style={{ fontSize: 13 }}>+10</span>
                </Btn>

                {/* Volume */}
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
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={muted ? 0 : volume}
                  onChange={handleVolume}
                  onClick={e => e.stopPropagation()}
                  style={{ width: 70, accentColor: color, cursor: 'pointer', height: 3 }}
                />

                {/* Temps */}
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', marginLeft: 4 }}>
                  {fmt(currentTime)} / {fmt(duration)}
                </span>

                <div style={{ flex: 1 }} />

                {/* Sous-titres */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={e => { e.stopPropagation(); setShowSubMenu(s => !s); setShowSpdMenu(false); setShowAudioMenu(false); setShowQualityMenu(false) }}
                    title="Sous-titres"
                    style={{
                      background: subsOff ? 'transparent' : `${color}22`,
                      border: `1px solid ${subsOff ? 'rgba(255,255,255,0.15)' : color + '55'}`,
                      borderRadius: 7, color: subsOff ? 'rgba(255,255,255,0.4)' : color,
                      fontSize: 11, fontWeight: 800, padding: '4px 9px', cursor: hasSubs ? 'pointer' : 'default',
                      letterSpacing: '0.05em', transition: 'all .15s',
                    }}
                  >CC {subLabel}</button>
                  {showSubMenu && hasSubs && (
                    <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, background: 'rgba(14,15,17,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, minWidth: 160, padding: '5px 0', boxShadow: '0 12px 40px rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)', zIndex: 20 }}
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
                        [subtitleStyle.weight >= 800 ? 'Texte normal' : 'Texte gras', () => updateSubtitleStyle({ weight: subtitleStyle.weight >= 800 ? 600 : 800 })],
                      ].map(([label, action]) => (
                        <button key={label} onClick={action}
                          style={{ width: '50%', display: 'inline-block', padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}
                          onMouseEnter={e => e.currentTarget.style.background = `${color}18`}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >{label}</button>
                      ))}
                      <div style={{ display: 'flex', gap: 5, padding: '6px 10px 8px' }}>
                        {['#ffffff', '#ffe66d', '#8be9ff'].map(c => (
                          <button key={c} onClick={() => updateSubtitleStyle({ color: c })}
                            title={c}
                            style={{ flex: 1, height: 22, borderRadius: 5, border: `1px solid ${subtitleStyle.color === c ? color : 'rgba(255,255,255,0.2)'}`, background: c, cursor: 'pointer' }}
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
                    style={{
                      background: hasAudioChoices ? `${color}18` : 'transparent',
                      border: `1px solid ${hasAudioChoices ? color + '44' : 'rgba(255,255,255,0.15)'}`,
                      borderRadius: 7,
                      color: hasAudioChoices ? color : 'rgba(255,255,255,0.4)',
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '4px 9px',
                      cursor: hasAudioChoices ? 'pointer' : 'default',
                      letterSpacing: '0.05em',
                      transition: 'all .15s',
                    }}
                  >AU {audioLabel}</button>
                  {showAudioMenu && hasAudioChoices && (
                    <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, background: 'rgba(14,15,17,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, minWidth: 168, padding: '5px 0', boxShadow: '0 12px 40px rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)', zIndex: 20 }}
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
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 800, padding: '4px 9px', cursor: 'pointer', letterSpacing: '0.05em' }}
                  >{speed}×</button>
                  {showSpdMenu && (
                    <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, background: 'rgba(14,15,17,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, minWidth: 100, padding: '5px 0', boxShadow: '0 12px 40px rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)', zIndex: 20 }}
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

                <div style={{ position: 'relative' }}>
                  <button
                    onClick={e => { e.stopPropagation(); setShowQualityMenu(q => !q); setShowSpdMenu(false); setShowSubMenu(false); setShowAudioMenu(false) }}
                    title="Qualité vidéo"
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

                {/* Plein écran */}
                <Btn onClick={toggleFullscreen} title={fullscreen ? 'Quitter plein écran (F)' : 'Plein écran (F)'}>
                  {fullscreen ? '⊡' : '⛶'}
                </Btn>
              </div>

              {/* Légende raccourcis */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap', opacity: 0.55 }}>
                {[['Espace', 'Play/Pause'], ['←→', '±5s'], ['↑↓', 'Volume'], ['M', 'Muet'], ['F', 'Plein écran']].map(([k, v]) => (
                  <span key={k} style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                    <kbd style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3, padding: '1px 5px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', marginRight: 4 }}>{k}</kbd>
                    {v}
                  </span>
                ))}
              </div>
            </div>
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

      {/* ── Bande épisodes ── */}
      {videos.length > 1 && (() => {
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
