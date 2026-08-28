import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { getVotePercents } from '../../lib/tournament.js'
import OSTDuelCard from './OSTDuelCard.jsx'
import VSPanel     from './VSPanel.jsx'
import { boostElement, corsUrl } from '../../lib/audioBoost.js'
import { setNowPlaying, clearNowPlaying } from '../../lib/nowPlaying.js'
const VideoPlayer = lazy(() => import('../VideoPlayer.jsx'))

const PINK   = '#9d174d'
const PURPLE = '#4c1d95'
const PINK_L = '#f9a8d4'
const GOLD   = PINK
const GRAD   = `linear-gradient(135deg, ${PINK}, ${PURPLE})`

const ARENA_CSS = `
  @keyframes arWave { 0%,100%{height:5px} 50%{height:28px} }
  @keyframes arSlowZoom { 0%,100%{transform:scale(1.02)} 50%{transform:scale(1.1)} }
  @keyframes arWaveIdle { 0%,100%{height:3px} 50%{height:7px} }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:12px; border-radius:50%; cursor:pointer; }
  input[type=range]::-webkit-slider-runnable-track { height:3px; border-radius:2px; }
`

function seekMedia(el, t) {
  if (!el || !Number.isFinite(t)) return
  const dur = el.duration
  const max = Number.isFinite(dur) && dur > 0 ? Math.max(0, dur - 0.05) : t
  const clamped = Math.min(Math.max(0, t), max)
  try { el.currentTime = clamped } catch { /* seek ignore si pas prêt */ }
}

// ── Page background overlay ────────────────────────────────────────────────
function PlayingBgOverlay({ ytId, audioUrl, color, syncRef }) {
  const c = color || GOLD
  const bgVideoRef = useRef(null)

  // Le fond est une 2e copie de la même source. Sans ça, `loop` + autoPlay
  // partent tout seuls : dès qu'on seek la barre, carte et fond ne sont plus
  // à la même frame. On copie temps + pause/play, et on rattrape la dérive.
  useEffect(() => {
    if (!audioUrl || !syncRef) return
    let cancelled = false
    let tries = 0
    let retryTimer = 0
    let drift = 0
    let off = () => {}
    const attach = () => {
      if (cancelled) return
      const main = syncRef.current
      const bg = bgVideoRef.current
      if (!main || !bg) {
        if (tries++ < 40) retryTimer = window.setTimeout(attach, 50)
        return
      }
      bg.muted = true
      bg.loop = false
      const copyTime = (force = false) => {
        if (cancelled || !Number.isFinite(main.currentTime)) return
        if (force || Math.abs((bg.currentTime || 0) - main.currentTime) > 0.12) {
          seekMedia(bg, main.currentTime)
        }
      }
      const onSeeking = () => copyTime(true)
      const onSeeked = () => copyTime(true)
      const onPlay = () => { copyTime(true); bg.play().catch(() => {}) }
      const onPause = () => { bg.pause(); copyTime(true) }
      main.addEventListener('seeking', onSeeking)
      main.addEventListener('seeked', onSeeked)
      main.addEventListener('play', onPlay)
      main.addEventListener('pause', onPause)
      copyTime(true)
      bg.playbackRate = main.playbackRate || 1
      if (main.paused) bg.pause()
      else bg.play().catch(() => {})
      drift = window.setInterval(() => copyTime(false), 120)
      off = () => {
        window.clearInterval(drift)
        main.removeEventListener('seeking', onSeeking)
        main.removeEventListener('seeked', onSeeked)
        main.removeEventListener('play', onPlay)
        main.removeEventListener('pause', onPause)
      }
    }
    attach()
    return () => {
      cancelled = true
      window.clearTimeout(retryTimer)
      window.clearInterval(drift)
      off()
    }
  }, [audioUrl, syncRef])
  const media = {
    position: 'absolute', inset: 0,
    width: '100%', height: '100%',
    maxWidth: 'none', maxHeight: 'none',
    objectFit: 'cover',
  }
  // Reste rendu EN PLACE, dans l'arbre du contenu. Le porter au niveau du body
  // le faisait passer devant toute la page : le conteneur applicatif forme son
  // propre contexte d'empilement, donc les zIndex du contenu ne pèsent plus
  // rien face à un calque sorti à côté de lui. La lisibilité de l'égaliseur est
  // réglée par la découpe du bas ci-dessous, qui ne dépend d'aucun empilement.
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.4 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden',
        background: `radial-gradient(90% 100% at 50% 45%, ${c}30, rgba(8,9,14,.72) 56%, rgba(8,9,14,.92) 100%)`,
        // Le voile s'arrête juste au-dessus de l'égaliseur du décor. Sans cette
        // découpe il le recouvrait pendant toute la lecture — c'est-à-dire au
        // seul moment où l'égaliseur suit vraiment la musique.
        maskImage: 'linear-gradient(to top, transparent 0, transparent 34px, #000 96px)',
        WebkitMaskImage: 'linear-gradient(to top, transparent 0, transparent 34px, #000 96px)',
      }}
    >
      {audioUrl ? (
        <video ref={bgVideoRef} src={corsUrl(audioUrl)} muted playsInline preload="auto"
          style={{
            ...media,
            objectPosition: 'center center',
            transform: 'scale(1.18)',
            filter: 'blur(24px) brightness(0.62) saturate(1.45)',
            opacity: 0.72,
          }}
        />
      ) : null}
      <div style={{ position: 'absolute', inset: 0, background:
        `radial-gradient(64% 100% at 100% 50%, ${c}4a, transparent 74%),`
        + `radial-gradient(64% 100% at 0% 50%, ${c}32, transparent 74%),`
        + `linear-gradient(90deg, rgba(8,9,14,.18), transparent 38%, ${c}18 100%)` }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.24) 0%, rgba(2,2,3,.26) 50%, rgba(2,2,3,.44) 100%), radial-gradient(62% 52% at 50% 46%, rgba(2,2,3,.22), transparent 82%)' }} />
    </motion.div>
  )
}

function fmt(s) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ── Compact audio strip ────────────────────────────────────────────────────
// startAt : début de l'extrait (tournoi Sakuga — un clip découpé dans un
// épisode). 0 pour un opening, qui se joue depuis le début du fichier.
function CompactPlayer({ ytId, audioUrl, color, title, anime, onStop, onSeek, mediaRef, boost = 1, endAt = null, startAt = 0 }) {
  const iframeRef = useRef(null)
  const videoRef  = useRef(null)
  const timerRef  = useRef(null)
  const startRef  = useRef(Date.now())
  const stopRef   = useRef(onStop)
  const [volume,  setVolume]  = useState(100)
  const [elapsed, setElapsed] = useState(0)
  const [duration, setDuration] = useState(0)
  const draggingRef = useRef(false)
  const seekedRef   = useRef(false)   // le saut initial vers startAt n'a lieu qu'une fois
  const getMedia = () => (audioUrl && mediaRef?.current) ? mediaRef.current : videoRef.current

  useEffect(() => { stopRef.current = onStop }, [onStop])

  // Le composant peut disparaître sans qu'un 'pause' soit émis (changement de
  // duel, navigation) : sans ce nettoyage, l'égaliseur resterait branché sur un
  // élément mort.
  useEffect(() => () => clearNowPlaying(videoRef.current), [])

  // Lecture intégrale : plus de plafond. L'arrêt vient de 'ended' (vidéo R2)
  // ou de playerState 0 (YouTube). Garde-fou 8 min côté YouTube au cas où les
  // messages de l'iframe seraient bloqués.
  useEffect(() => {
    if (audioUrl) return
    timerRef.current = setTimeout(() => stopRef.current?.(), 8 * 60 * 1000)
    return () => clearTimeout(timerRef.current)
  }, [audioUrl])

  // YouTube : durée / position / fin réelles via l'API postMessage de l'iframe
  // (enablejsapi=1). Fallback horloge tant qu'aucun infoDelivery n'est reçu.
  useEffect(() => {
    if (audioUrl) return
    let gotInfo = false
    const handshake = setInterval(() => {
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'arena' }), '*')
    }, 500)
    const onMsg = e => {
      if (typeof e.data !== 'string' || !String(e.origin).includes('youtube')) return
      let data
      try { data = JSON.parse(e.data) } catch { return }
      if (data.event !== 'infoDelivery' || !data.info) return
      if (!gotInfo) { gotInfo = true; clearInterval(handshake) }
      if (data.info.duration > 0) setDuration(data.info.duration)
      if (typeof data.info.currentTime === 'number' && !draggingRef.current) setElapsed(data.info.currentTime)
      if (data.info.playerState === 0) stopRef.current?.()   // 0 = ended
    }
    window.addEventListener('message', onMsg)
    const iv = setInterval(() => {
      if (!gotInfo) setElapsed((Date.now() - startRef.current) / 1000)
    }, 250)
    return () => { window.removeEventListener('message', onMsg); clearInterval(handshake); clearInterval(iv) }
  }, [audioUrl])

  useEffect(() => {
    const media = getMedia()
    if (!media) return
    media.volume = volume / 100
    if (audioUrl && mediaRef?.current) media.muted = false
    // Boost de loudness (openings only) : 100% natif trop faible. Nécessite
    // crossOrigin sur la vidéo de la carte (déjà posé) + CORS R2 (OK).
    if (audioUrl && boost > 1) boostElement(media, boost)
  }, [volume, audioUrl, mediaRef, boost])

  // Signale au décor quelle piste joue, pour que l'égaliseur du fond suive le
  // vrai spectre. L'élément à écouter n'est pas toujours celui rendu ici :
  // quand un audioUrl est présent, c'est la vidéo de la carte (mediaRef) qui
  // porte le son. On passe donc par getMedia(), et on s'accroche via des
  // écouteurs plutôt que des props React, puisque l'élément peut appartenir à
  // un autre composant.
  useEffect(() => {
    if (!audioUrl) return   // YouTube : pas d'élément média lisible, spectre impossible
    let media = null
    let raf = 0

    const onPlay = () => setNowPlaying(media)
    const onStopped = () => clearNowPlaying(media)

    // La ref de la carte n'est pas encore posée au premier rendu.
    function attach() {
      media = getMedia()
      if (!media) { raf = requestAnimationFrame(attach); return }
      media.addEventListener('play', onPlay)
      media.addEventListener('playing', onPlay)
      media.addEventListener('pause', onStopped)
      media.addEventListener('ended', onStopped)
      if (!media.paused) onPlay()
    }
    attach()

    return () => {
      if (raf) cancelAnimationFrame(raf)
      if (!media) return
      media.removeEventListener('play', onPlay)
      media.removeEventListener('playing', onPlay)
      media.removeEventListener('pause', onStopped)
      media.removeEventListener('ended', onStopped)
      clearNowPlaying(media)
    }
  }, [audioUrl, mediaRef])

  useEffect(() => {
    if (!audioUrl || !mediaRef) return
    let disposed = false
    let cleanup = () => {}
    const raf = requestAnimationFrame(() => {
      const media = mediaRef.current
      if (!media || disposed) return
      const loaded = () => {
        const d = media.duration
        if (Number.isFinite(d) && d > 0) setDuration(d)
        // Extrait découpé dans un épisode : on se cale sur le début du clip
        // dès que la durée est connue, une seule fois.
        if (startAt > 0 && !seekedRef.current && Number.isFinite(d) && d > startAt) {
          seekedRef.current = true
          seekMedia(media, startAt)
          setElapsed(startAt)
        }
      }
      const time = () => {
        if (draggingRef.current) return
        const t = media.currentTime || 0
        setElapsed(t)
        // endAt = fin reelle de l'opening (le fichier se termine par une pub muette)
        if (endAt && t >= endAt) stopRef.current?.()
      }
      const ended = () => stopRef.current?.()
      media.addEventListener('loadedmetadata', loaded)
      media.addEventListener('durationchange', loaded)
      media.addEventListener('timeupdate', time)
      media.addEventListener('ended', ended)
      media.muted = false
      media.volume = volume / 100
      media.play().catch(() => {})
      loaded()
      time()
      cleanup = () => {
        media.removeEventListener('loadedmetadata', loaded)
        media.removeEventListener('durationchange', loaded)
        media.removeEventListener('timeupdate', time)
        media.removeEventListener('ended', ended)
      }
    })
    return () => { disposed = true; cancelAnimationFrame(raf); cleanup() }
  }, [audioUrl, mediaRef, ytId, endAt, startAt])

  useEffect(() => {
    if (!audioUrl && iframeRef.current) {
      const t = setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [volume] }), '*')
      }, 600)
      return () => clearTimeout(t)
    }
  }, [volume, audioUrl])

  // La barre mesure la portion jouable [startAt, endAt] : endAt (fin réelle de
  // la musique, avant la pub muette du fichier) prime sur la durée du fichier,
  // et pour un extrait Sakuga la position absolue dans l'épisode n'a aucun sens.
  const fileDur  = duration > 0 && Number.isFinite(duration) ? duration : 0
  const endBound = endAt ? Math.min(endAt, fileDur || endAt) : fileDur
  const total    = Math.max(0, endBound - startAt)
  const played   = Math.max(0, elapsed - startAt)
  const pct      = total ? Math.min(100, (played / total) * 100) : 0
  const volPct   = volume + '%'

  // rawValue est relatif au début de l'extrait (0 = startAt).
  function handleSeek(rawValue) {
    const media = getMedia()
    const fileDur = media && Number.isFinite(media.duration) && media.duration > 0 ? media.duration : 0
    const cap = endAt ? Math.min(endAt, fileDur || endAt) : (fileDur || startAt + total)
    if (!cap) return
    const t = Math.max(startAt, Math.min(startAt + Number(rawValue), cap))
    setElapsed(t)
    if (audioUrl && media) seekMedia(media, t)
    if (!audioUrl) {
      startRef.current = Date.now() - t * 1000
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [t, true] }), '*')
    }
    onSeek?.(t)
  }

  function onSeekPointerDown() {
    draggingRef.current = true
    const media = getMedia()
    if (audioUrl && media && !media.paused) media.pause()
  }
  function onSeekPointerUp() {
    draggingRef.current = false
    const media = getMedia()
    if (audioUrl && media) media.play().catch(() => {})
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{
        position: 'relative', zIndex: 2, marginTop: 14,
        background: 'rgba(8,9,14,0.96)',
        border: `1px solid rgba(255,255,255,.07)`,
        borderTop: `1px solid ${color}25`,
        borderRadius: 14,
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 14,
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Accent line top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${color}45, ${color}45, transparent)`,
      }} />

      {/* Audio element caché — source de vérité pour l'audio.
          crossOrigin + corsUrl sont NÉCESSAIRES pour que l'égaliseur du décor
          puisse lire le spectre : un média « tainted » routé dans Web Audio
          devient muet. R2 renvoie bien ACAO sur l'URL ?cors=1. */}
      {audioUrl && !mediaRef ? (
        <video ref={videoRef} src={corsUrl(audioUrl)} crossOrigin="anonymous" autoPlay width={0} height={0}
          onLoadedMetadata={e => {
            setDuration(e.target.duration || 0)
            if (startAt > 0) seekMedia(e.target, startAt)
          }}
          onTimeUpdate={e => { setElapsed(e.target.currentTime); if (endAt && e.target.currentTime >= endAt) onStop() }}
          onEnded={onStop}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        />
      ) : !audioUrl ? (
        <iframe ref={iframeRef} width={0} height={0}
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&start=${Math.floor(startAt)}${endAt ? `&end=${Math.ceil(endAt)}` : ''}&enablejsapi=1&controls=0`}
          allow="autoplay; encrypted-media"
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', border: 'none' }}
          title={title}
        />
      ) : null}

      {/* Dot coloré */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: color, flexShrink: 0,
        boxShadow: `0 0 8px ${color}`,
        animation: 'arWaveIdle 1.4s ease-in-out infinite',
      }} />

      {/* Title compact */}
      <div style={{ flexShrink: 0, minWidth: 0, maxWidth: 180 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', marginTop: 1 }}>{anime}</div>
      </div>

      {/* Timeline — barre épaisse cliquable partout (clic = saut à la position) */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
        <input
          type="range" min="0" max={total || 0.001} step="0.1" value={total ? Math.min(played, total) : 0}
          disabled={!total}
          onChange={e => handleSeek(e.target.value)}
          onPointerDown={onSeekPointerDown}
          onPointerUp={onSeekPointerUp}
          onPointerCancel={onSeekPointerUp}
          aria-label="Position dans l'opening"
          style={{
            width: '100%', height: 14, cursor: 'pointer',
            WebkitAppearance: 'none', appearance: 'none',
            outline: 'none', borderRadius: 8, display: 'block',
            background: `linear-gradient(90deg, ${color} ${pct}%, rgba(255,255,255,.12) ${pct}%)`,
            accentColor: color,
          }}
        />
      </div>

      {/* Time */}
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,.22)', flexShrink: 0, minWidth: 32 }}>
        {fmt(played)}{total ? ` / ${fmt(total)}` : ''}
      </div>

      {/* Volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 11, opacity: 0.35 }}>{volume === 0 ? '🔇' : '🔊'}</span>
        <input
          type="range" min="0" max="100" value={volume}
          onChange={e => setVolume(Number(e.target.value))}
          style={{
            width: 64, height: 3, cursor: 'pointer',
            WebkitAppearance: 'none', appearance: 'none',
            outline: 'none', borderRadius: 2,
            background: `linear-gradient(90deg, ${color} ${volPct}, rgba(255,255,255,.1) ${volPct})`,
            accentColor: color,
          }}
        />
      </div>

      {/* Stop */}
      <button
        onClick={onStop}
        style={{
          flexShrink: 0, padding: '5px 14px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,.1)',
          background: 'rgba(255,255,255,.04)',
          color: 'rgba(255,255,255,.55)', fontSize: 11, fontWeight: 700,
          cursor: 'pointer', transition: 'all 0.18s', letterSpacing: '0.04em',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.09)'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.color = 'rgba(255,255,255,.55)' }}
      >
        ■ Stop
      </button>
    </motion.div>
  )
}

// ── Flash d'entrée nouveau duel ────────────────────────────────────────────
function MatchFlash() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      style={{
        position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 75% 55% at 50% 38%, rgba(255,255,255,.11) 0%, transparent 62%)',
        borderRadius: 4,
      }}
    />
  )
}

// ── Vote toast ─────────────────────────────────────────────────────────────
function VoteToast({ visible, winnerTitle }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          style={{
            position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)',
            zIndex: 800,
            background: 'rgba(10,11,16,0.98)',
            border: `1px solid rgba(157,23,77,.4)`,
            borderRadius: 12, padding: '10px 22px',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,.65)',
            backdropFilter: 'blur(16px)', whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: GOLD, fontSize: 13 }}>✦</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>Vote enregistré</div>
            {winnerTitle && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.38)', marginTop: 1 }}>
                {winnerTitle} mène
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Main arena ─────────────────────────────────────────────────────────────
export default function DuelArena({
  round, match, totalMatchesInRound, voteCounts,
  personalVotes, onVote, onNext, isLastMatch, isMobile,
  multiplayer = false, multiplayerStatus = null, vertical = false,
}) {
  const stacked = isMobile || vertical // dispo verticale (openings empilés haut/bas)
  const [playing,   setPlaying]  = useState(null)
  const [watching,  setWatching] = useState(null)
  const [showToast, setToast]    = useState(false)
  const cardBgVideoRef = useRef(null)

  function handleCardBgSeek(t) {
    if (cardBgVideoRef.current) cardBgVideoRef.current.currentTime = t
  }

  const voted      = personalVotes?.[match.id] || null
  const hasVoted   = !!voted
  const showResult = match.status === 'closed' || hasVoted
  const percents   = getVotePercents(voteCounts, match.id)
  const winnerSide = showResult ? (percents.leftN >= percents.rightN ? 'left' : 'right') : null
  const winnerTitle  = winnerSide === 'left' ? match.left?.title : match.right?.title
  const qualifiesFor = round.size > 2 ? nextRoundLabel(round.size) : null
  const matchNum     = match.position + 1
  const roundLabel   = getRoundLabel(round.size)

  useEffect(() => { setPlaying(null) }, [match.id])

  // Finale gagnée → champion + confettis
  // En multi, le champion/confettis ne se déclenchent pas localement après TON vote :
  // c'est l'hôte qui résout, et l'écran vainqueur du salon gère la célébration.
  const isChampion = showResult && !!winnerSide && round.size === 2 && !multiplayer
  useEffect(() => {
    if (!isChampion) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return
    const colors = ['#f9a8d4', '#9d174d', '#ffd36a', '#ffffff']
    confetti({ particleCount: 170, spread: 105, startVelocity: 52, origin: { y: 0.4 }, colors, scalar: 1.1 })
    const end = Date.now() + 1600
    ;(function frame() {
      confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors })
      confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    })()
  }, [isChampion])

  function handleVote(side) {
    onVote(side)
    setToast(true)
    setTimeout(() => setToast(false), 3000)
  }

  function handleListen(side) {
    if (playing?.side === side) { setPlaying(null); return }
    const p = side === 'left' ? match.left : match.right
    const ytOk = p?.ytId && !p.ytId.startsWith('similar')
    if (!p || (!ytOk && !p.audioUrl)) return
    setPlaying({
      side,
      ytId:     ytOk ? p.ytId : null,
      audioUrl: p.audioUrl || null,
      color:    p.color || GOLD,
      title:    p.title,
      anime:    p.anime,
      type:     p.type || null,   // 'OP' → boost de loudness dans le player compact
      gain:     p.gain || null,   // boost spécifique à la piste (prioritaire)
      endAt:    p.endAt || null,  // fin reelle de l'opening (coupe la pub muette)
      startAt:  p.startAt || 0,   // début de l'extrait (clips du tournoi Sakuga)
    })
  }

  function handleWatch(side) {
    const p = side === 'left' ? match.left : match.right
    const ytOk = p?.ytId && !p.ytId.startsWith('similar')
    if (!p || !ytOk) return
    setPlaying(null)
    setWatching({ ytId: p.ytId, title: p.title, anime: p.anime, color: p.color || GOLD })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -14, transition: { duration: 0.17, ease: 'easeIn' } }}
      transition={{ duration: 0.22 }}
      style={{ position: 'relative' }}
    >
      <style>{ARENA_CSS}</style>
      <MatchFlash />

      {/* Fond plein écran de l'opening en lecture — rendu INLINE (et NON portalé sur
          document.body). Portalé en z-index 1 dans le body, il passait au-dessus de
          la PageLayout (isolation:isolate → stacking context en z-auto) et recouvrait
          toute la page, navbar comprise (gros flou/assombrissement). Inline, il vit
          dans le contexte de la page comme DuelAmbient : son z-index 0 le garde
          derrière les cartes (grid z1) et la navbar reste au-dessus. */}
      <AnimatePresence>
        {playing && <PlayingBgOverlay key={playing.ytId || playing.audioUrl} ytId={playing.ytId} audioUrl={playing.audioUrl} color={playing.color} syncRef={playing.audioUrl ? cardBgVideoRef : null} />}
      </AnimatePresence>

      {/* Ambient glow subtil */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {match.left?.color && (
          <div style={{
            position: 'absolute', left: '-5%', top: '-5%',
            width: '48%', height: '110%', borderRadius: '50%',
            background: match.left.color,
            opacity: playing?.side === 'left' ? 0.1 : 0.055,
            filter: 'blur(90px)',
            transition: 'opacity 1s ease',
          }} />
        )}
        {match.right?.color && (
          <div style={{
            position: 'absolute', right: '-5%', top: '-5%',
            width: '48%', height: '110%', borderRadius: '50%',
            background: match.right.color,
            opacity: playing?.side === 'right' ? 0.1 : 0.055,
            filter: 'blur(90px)',
            transition: 'opacity 1s ease',
          }} />
        )}
      </div>

      {/* Grille duel : 46% / 96px / 46% */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: stacked ? 'flex' : 'grid',
        gridTemplateColumns: '1fr 96px 1fr',
        flexDirection: stacked ? 'column' : undefined,
        gap: stacked ? 10 : 0,
        alignItems: 'stretch',
        minWidth: 0,
      }}>
        {/* Card gauche — entre depuis la gauche */}
        <motion.div
          initial={{ x: stacked ? 0 : -90, y: stacked ? -36 : 0, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.06 }}
          style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}
        >
          <OSTDuelCard
            key={match.left?.id}
            participant={match.left}
            side="left"
            voted={voted}
            isWinner={showResult && winnerSide === 'left'}
            isLoser={showResult && winnerSide === 'right'}
            votePercent={percents.left}
            voteCount={percents.leftN}
            hasVoted={hasVoted}
            onVote={handleVote}
            onListen={() => handleListen('left')}
            onWatch={() => handleWatch('left')}
            isPlaying={playing?.side === 'left'}
            otherIsPlaying={playing !== null && playing.side !== 'left'}
            showResult={showResult}
            isMobile={isMobile}
            vivid={multiplayer}
            videoSyncRef={playing?.side === 'left' ? cardBgVideoRef : null}
          />
        </motion.div>

        {/* VS panel — pop depuis le centre */}
        <motion.div
          initial={{ opacity: 0, scale: 0.55 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 360, damping: 22, delay: 0.13 }}
          style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}
        >
          <VSPanel
            hasVoted={hasVoted}
            isMobile={stacked}
            qualifiesFor={qualifiesFor}
            matchNum={matchNum}
            totalMatches={totalMatchesInRound}
            roundLabel={roundLabel}
            playingColor={playing?.color}
            isPlaying={!!playing}
          />
        </motion.div>

        {/* Card droite — entre depuis la droite */}
        <motion.div
          initial={{ x: stacked ? 0 : 90, y: stacked ? 36 : 0, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.09 }}
          style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}
        >
          <OSTDuelCard
            key={match.right?.id}
            participant={match.right}
            side="right"
            voted={voted}
            isWinner={showResult && winnerSide === 'right'}
            isLoser={showResult && winnerSide === 'left'}
            votePercent={percents.right}
            voteCount={percents.rightN}
            hasVoted={hasVoted}
            onVote={handleVote}
            onListen={() => handleListen('right')}
            onWatch={() => handleWatch('right')}
            isPlaying={playing?.side === 'right'}
            otherIsPlaying={playing !== null && playing.side !== 'right'}
            showResult={showResult}
            isMobile={isMobile}
            vivid={multiplayer}
            videoSyncRef={playing?.side === 'right' ? cardBgVideoRef : null}
          />
        </motion.div>
      </div>

      {/* Compact audio strip */}
      <AnimatePresence>
        {playing && (
          <CompactPlayer
            key={playing.ytId || playing.audioUrl}
            ytId={playing.ytId}
            audioUrl={playing.audioUrl}
            color={playing.color}
            title={playing.title}
            anime={playing.anime}
            onStop={() => setPlaying(null)}
            onSeek={handleCardBgSeek}
            mediaRef={playing.audioUrl ? cardBgVideoRef : null}
            boost={playing.gain || (playing.audioUrl ? 2.2 : 1)}
            endAt={playing.endAt}
            startAt={playing.startAt}
          />
        )}
      </AnimatePresence>

      {/* Post-vote */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            key="post-vote"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.4 }}
            style={{ position: 'relative', zIndex: 1, marginTop: 28, textAlign: 'center' }}
          >
            {multiplayer ? (
              // Multi : l'hôte avance automatiquement à la majorité → statut d'attente.
              <div style={{
                fontSize: 13, color: 'rgba(255,255,255,.5)', fontWeight: 600,
                padding: '12px 24px',
                background: 'rgba(255,255,255,.03)',
                border: '1px solid rgba(255,255,255,.07)',
                borderRadius: 10, display: 'inline-block',
              }}>
                {multiplayerStatus}
              </div>
            ) : (<>
            {isChampion ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                style={{ marginBottom: 22, padding: '26px 28px', borderRadius: 20, background: 'linear-gradient(160deg, rgba(249,168,212,.12), rgba(8,9,13,.96))', border: `1px solid ${PINK_L}55`, borderTop: `3px solid ${PINK_L}` }}
              >
                <div style={{ fontSize: 44, marginBottom: 6, filter: 'drop-shadow(0 0 22px rgba(249,168,212,.7))' }}>👑</div>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.26em', textTransform: 'uppercase', color: PINK_L, marginBottom: 8 }}>Champion du tournoi</div>
                <div style={{ fontSize: 'clamp(24px,5vw,34px)', fontWeight: 900, color: '#fff', fontFamily: "'Pirata One',cursive", lineHeight: 1.1 }}>{winnerTitle}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginTop: 6 }}>remporte le Blind Test 🏆</div>
              </motion.div>
            ) : winnerSide && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', marginBottom: 18 }}>
                <span style={{ color: GOLD, fontWeight: 700 }}>{winnerTitle}</span>
                {' '}rejoint {qualifiesFor || 'la victoire finale'}.
              </div>
            )}

            {!isLastMatch ? (
              <motion.button
                onClick={onNext}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: '13px 48px', borderRadius: 100, border: 'none',
                  background: GRAD, color: '#fff', fontWeight: 800, fontSize: 14,
                  cursor: 'pointer', letterSpacing: '0.04em',
                  fontFamily: "'Pirata One',cursive",
                  boxShadow: `0 6px 24px rgba(157,23,77,.22)`,
                }}
              >
                Duel suivant →
              </motion.button>
            ) : (
              <div style={{
                fontSize: 13, color: 'rgba(255,255,255,.32)',
                padding: '12px 24px',
                background: 'rgba(255,255,255,.03)',
                border: '1px solid rgba(255,255,255,.07)',
                borderRadius: 10, display: 'inline-block',
              }}>
                Tous les duels de ce round sont terminés.
              </div>
            )}
            </>)}
          </motion.div>
        )}
      </AnimatePresence>

      {!hasVoted && round.size === 2 && (
        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: GOLD, opacity: 0.45, position: 'relative', zIndex: 1 }}>
          C'est la Finale — un seul vainqueur.
        </div>
      )}

      <VoteToast visible={showToast} winnerTitle={winnerSide ? winnerTitle : null} />

      {/* VideoPlayer portal — ouvert quand l'utilisateur clique "Voir l'opening" */}
      {watching && typeof document !== 'undefined' && createPortal(
        <Suspense fallback={null}>
          <VideoPlayer
            videos={[{ id: watching.ytId, title: `${watching.title} — ${watching.anime}`, episode: 1 }]}
            startIdx={0}
            onClose={() => setWatching(null)}
            color={watching.color}
          />
        </Suspense>,
        document.body
      )}
    </motion.div>
  )
}

function nextRoundLabel(sz) {
  const n = sz / 2
  if (n === 1)  return 'la victoire finale'
  if (n === 2)  return 'la Finale'
  if (n === 4)  return 'les Demi-finales'
  if (n === 8)  return 'les Quarts de finale'
  if (n === 16) return 'les 16e de finale'
  return `les ${n}e de finale`
}

function getRoundLabel(size) {
  if (size === 2)   return 'Finale'
  if (size === 4)   return 'Demi-finales'
  if (size === 8)   return 'Quarts de finale'
  if (size === 16)  return '16e de finale'
  if (size === 32)  return '32e de finale'
  if (size === 64)  return '64e de finale'
  if (size === 128) return '128e de finale'
  if (size === 256) return '256e de finale'
  if (size === 512) return '512e de finale'
  if (size === 1024) return '1024e de finale'
  return `Tour de ${size}`
}
