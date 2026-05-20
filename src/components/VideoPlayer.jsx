import { useState, useEffect, useRef, useCallback } from 'react'

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
          setReady(true)
          try { e.currentTarget.currentTime = Math.min(1.5, e.currentTarget.duration || 1.5) } catch {}
        }}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: ready ? 0.72 : 0 }}
      />
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: ready ? 'rgba(0,0,0,0.18)' : `linear-gradient(135deg, ${color}30, rgba(0,0,0,0.75))`, color: '#fff', fontSize: 18, fontWeight: 900 }}>
        {!ready && '▶'}
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function VideoPlayer({ videos, startIdx, onClose, color = '#6c5ce7' }) {
  const videoRef     = useRef(null)
  const containerRef = useRef(null)
  const hideTimer    = useRef(null)

  const [idx,          setIdx]         = useState(startIdx)
  const [playing,      setPlaying]     = useState(false)
  const [currentTime,  setCurrentTime] = useState(0)
  const [duration,     setDuration]    = useState(0)
  const [volume,       setVolume]      = useState(1)
  const [muted,        setMuted]       = useState(false)
  const [speed,        setSpeed]       = useState(1)
  const [fullscreen,   setFullscreen]  = useState(false)
  const [showCtrl,     setShowCtrl]    = useState(true)
  const [subIdx,       setSubIdx]      = useState(0)
  const [subsOff,      setSubsOff]     = useState(false)
  const [cueText,      setCueText]     = useState('')
  const [buffered,     setBuffered]    = useState(0)
  const [showSubMenu,  setShowSubMenu] = useState(false)
  const [showSpdMenu,  setShowSpdMenu] = useState(false)

  const video   = videos[idx]
  const isLocal = Boolean(video?.src)
  const hasSubs = Array.isArray(video?.subtitles) && video.subtitles.length > 0

  // ── Masquage auto des contrôles ──────────────────────────────────────────
  const showControls = useCallback(() => {
    setShowCtrl(true)
    clearTimeout(hideTimer.current)
    if (playing) hideTimer.current = setTimeout(() => setShowCtrl(false), 3000)
  }, [playing])

  useEffect(() => { showControls() }, [playing])

  // ── Sous-titres — polling RAF sur activeCues ────────────────────────────
  useEffect(() => {
    const v = videoRef.current
    if (!v || !hasSubs) { setCueText(''); return }

    let rafId = null
    let activeTrack = null

    const setupTrack = () => {
      const tracks = v.textTracks
      const want = !subsOff && subIdx < tracks.length
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = want && i === subIdx ? 'hidden' : 'disabled'
      }
      activeTrack = want ? tracks[subIdx] : null
      if (!want) setCueText('')
    }

    const tick = () => {
      if (activeTrack) {
        const cues = activeTrack.activeCues
        const text = cues && cues.length ? Array.from(cues).map(c => c.text).join('\n') : ''
        setCueText(prev => prev === text ? prev : text)
      }
      rafId = requestAnimationFrame(tick)
    }

    setupTrack()
    v.textTracks.addEventListener('addtrack', setupTrack)
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      v.textTracks.removeEventListener('addtrack', setupTrack)
      setCueText('')
    }
  }, [subIdx, subsOff, hasSubs, idx])

  // ── Réinitialiser état au changement d'épisode ───────────────────────────
  useEffect(() => {
    setCurrentTime(0); setDuration(0); setBuffered(0); setPlaying(false); setCueText('')
  }, [idx])

  // ── Appliquer la vitesse ─────────────────────────────────────────────────
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed
  }, [speed])

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
        case 'm': case 'M': v && (v.muted = !v.muted); break
        default: break
      }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  // ── Handlers vidéo ───────────────────────────────────────────────────────
  const onPlay     = () => setPlaying(true)
  const onPause    = () => { setPlaying(false); setShowCtrl(true); clearTimeout(hideTimer.current) }
  const onTimeUpd  = () => {
    const v = videoRef.current; if (!v) return
    setCurrentTime(v.currentTime)
    if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1))
  }
  const onDurChg   = () => { if (videoRef.current) setDuration(videoRef.current.duration || 0) }
  const onVolChg   = () => {
    const v = videoRef.current; if (!v) return
    setVolume(v.volume); setMuted(v.muted)
  }

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return
    v.paused ? v.play() : v.pause()
  }

  const handleVolume = e => {
    const v = videoRef.current; if (!v) return
    const val = parseFloat(e.target.value)
    v.volume = val; v.muted = val === 0
  }

  const seek = useCallback((t) => {
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, Math.min(t, duration))
  }, [duration])

  const volIcon = muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'
  const subLabel = subsOff ? 'OFF' : hasSubs ? (video.subtitles[subIdx]?.label ?? 'CC') : 'N/A'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: '#000', display: 'flex', flexDirection: 'column' }}>

      {/* ── Barre haute ── */}
      <div style={{ flexShrink: 0, height: 48, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', background: 'rgba(8,9,11,0.84)', backdropFilter: 'blur(18px)', borderBottom: `1px solid ${color}22`, zIndex: 10 }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, color: '#fff', cursor: 'pointer', padding: '6px 13px', fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'background .15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
        >✕ Fermer</button>

        <div style={{ flex: 1, textAlign: 'center', overflow: 'hidden' }}>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>Épisode {video?.episode}</span>
          {video?.title && <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginLeft: 8 }}>— {video.title}</span>}
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
              key={video.src}
              crossOrigin={hasSubs ? 'anonymous' : undefined}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              onPlay={onPlay}
              onPause={onPause}
              onTimeUpdate={onTimeUpd}
              onDurationChange={onDurChg}
              onVolumeChange={onVolChg}
              onEnded={() => { if (idx < videos.length - 1) setIdx(i => i + 1) }}
            >
              <source
                src={encSrc(video.src)}
                type={sourceType(video.src)}
              />
              {/* Pistes de sous-titres (lues via TextTrack API, mode hidden) */}
              {hasSubs && video.subtitles.map((sub, i) => (
                <track key={i} kind="subtitles" src={sub.src} srcLang={sub.srclang || 'fr'} label={sub.label} />
              ))}
            </video>

            {/* ── Sous-titres overlay ── */}
            {cueText && !subsOff && (
              <div style={{
                position: 'absolute',
                bottom: showCtrl ? 110 : 40,
                left: '50%', transform: 'translateX(-50%)',
                maxWidth: '82%', textAlign: 'center',
                padding: '5px 16px',
                background: 'rgba(0,0,0,0.72)',
                borderRadius: 6,
                color: '#fff', fontSize: 19, fontWeight: 600,
                lineHeight: 1.55,
                textShadow: '0 1px 6px rgba(0,0,0,0.9), 0 2px 12px rgba(0,0,0,0.7)',
                whiteSpace: 'pre-line',
                transition: 'bottom .2s ease',
                pointerEvents: 'none',
                zIndex: 5,
              }}>
                {cueText.replace(/<[^>]*>/g, '')}
              </div>
            )}

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
                <Btn onClick={() => { const v = videoRef.current; if (v) v.muted = !v.muted }} title="Muet (M)">
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
                    onClick={e => { e.stopPropagation(); setShowSubMenu(s => !s); setShowSpdMenu(false) }}
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
                      {[{ label: '🚫 Désactivés', action: () => setSubsOff(true) },
                        ...video.subtitles.map((sub, i) => ({ label: sub.label, action: () => { setSubIdx(i); setSubsOff(false) } }))
                      ].map((item, i) => (
                        <button key={i} onClick={() => { item.action(); setShowSubMenu(false) }}
                          style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#fff', fontSize: 13, fontWeight: 600, transition: 'background .12s' }}
                          onMouseEnter={e => e.currentTarget.style.background = `${color}18`}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >{item.label}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vitesse */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={e => { e.stopPropagation(); setShowSpdMenu(s => !s); setShowSubMenu(false) }}
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
