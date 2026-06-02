import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { getVotePercents } from '../../lib/tournament.js'
import OSTDuelCard from './OSTDuelCard.jsx'
import VSPanel     from './VSPanel.jsx'
const VideoPlayer = lazy(() => import('../VideoPlayer.jsx'))

const PINK   = '#9d174d'
const PURPLE = '#4c1d95'
const PINK_L = '#f9a8d4'
const GOLD   = PINK
const GRAD   = `linear-gradient(135deg, ${PINK}, ${PURPLE})`

const ARENA_CSS = `
  @keyframes arWave { 0%,100%{height:5px} 50%{height:28px} }
  @keyframes arWaveIdle { 0%,100%{height:3px} 50%{height:7px} }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:12px; border-radius:50%; cursor:pointer; }
  input[type=range]::-webkit-slider-runnable-track { height:3px; border-radius:2px; }
`

// ── Page background overlay ────────────────────────────────────────────────
function PlayingBgOverlay({ ytId, audioUrl, color }) {
  const c = color || GOLD
  const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null
  const fallbackThumb = ytId ? `https://img.youtube.com/vi/${ytId}/sddefault.jpg` : null
  const media = {
    position: 'absolute', inset: 0,
    width: '100%', height: '100%',
    maxWidth: 'none', maxHeight: 'none',
    objectFit: 'cover',
  }
  const onThumbError = e => {
    if (fallbackThumb && e.currentTarget.src !== fallbackThumb) e.currentTarget.src = fallbackThumb
  }
  const imageLayer = (style) => thumb ? (
    <img src={thumb} alt="" onError={onThumbError} style={{ ...media, ...style }} />
  ) : null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.4 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden',
        background: `radial-gradient(90% 100% at 50% 45%, ${c}30, rgba(8,9,14,.72) 56%, rgba(8,9,14,.92) 100%)`,
      }}
    >
      {ytId ? (
        <>
          {imageLayer({
            objectPosition: 'left 35%',
            transform: 'scale(1.9) translateX(-19%)',
            filter: 'blur(54px) brightness(0.74) saturate(1.55)',
            opacity: 0.42,
          })}
          {imageLayer({
            objectPosition: 'right 35%',
            transform: 'scale(1.9) translateX(19%)',
            filter: 'blur(54px) brightness(0.78) saturate(1.65)',
            opacity: 0.5,
          })}
          {imageLayer({
            objectPosition: 'center 35%',
            transform: 'scale(1.16)',
            filter: 'blur(20px) brightness(0.62) saturate(1.45)',
            opacity: 0.72,
          })}
        </>
      ) : audioUrl ? (
        <video src={audioUrl} autoPlay muted loop playsInline
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
function CompactPlayer({ ytId, audioUrl, color, title, anime, onStop, onSeek, mediaRef }) {
  const iframeRef = useRef(null)
  const videoRef  = useRef(null)
  const timerRef  = useRef(null)
  const startRef  = useRef(Date.now())
  const stopRef   = useRef(onStop)
  const [volume,  setVolume]  = useState(100)
  const [elapsed, setElapsed] = useState(0)
  const [duration, setDuration] = useState(0)
  const getMedia = () => (audioUrl && mediaRef?.current) ? mediaRef.current : videoRef.current

  useEffect(() => { stopRef.current = onStop }, [onStop])
  const LIMIT = 600   // openings jouables en entier (plus de coupure à 1m30)

  useEffect(() => {
    timerRef.current = setTimeout(onStop, LIMIT * 1000)
    return () => clearTimeout(timerRef.current)
  }, [onStop])

  useEffect(() => {
    if (audioUrl) return
    const iv = setInterval(() => setElapsed(Math.min(LIMIT, (Date.now() - startRef.current) / 1000)), 250)
    return () => clearInterval(iv)
  }, [audioUrl])

  useEffect(() => {
    const media = getMedia()
    if (!media) return
    media.volume = volume / 100
    if (audioUrl && mediaRef?.current) media.muted = false
  }, [volume, audioUrl, mediaRef])

  useEffect(() => {
    if (!audioUrl || !mediaRef) return
    let disposed = false
    let cleanup = () => {}
    const raf = requestAnimationFrame(() => {
      const media = mediaRef.current
      if (!media || disposed) return
      const loaded = () => setDuration(media.duration || 0)
      const time = () => {
        const t = media.currentTime || 0
        setElapsed(t)
        if (t >= LIMIT) stopRef.current?.()
      }
      const ended = () => stopRef.current?.()
      media.addEventListener('loadedmetadata', loaded)
      media.addEventListener('timeupdate', time)
      media.addEventListener('ended', ended)
      media.muted = false
      media.volume = volume / 100
      media.play().catch(() => {})
      loaded()
      time()
      cleanup = () => {
        media.removeEventListener('loadedmetadata', loaded)
        media.removeEventListener('timeupdate', time)
        media.removeEventListener('ended', ended)
      }
    })
    return () => { disposed = true; cancelAnimationFrame(raf); cleanup() }
  }, [audioUrl, mediaRef, ytId])

  useEffect(() => {
    if (!audioUrl && iframeRef.current) {
      const t = setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [volume] }), '*')
      }, 600)
      return () => clearTimeout(t)
    }
  }, [volume, audioUrl])

  const pct    = (elapsed / (duration || LIMIT)) * 100
  const volPct = volume + '%'

  function handleSeek(rawValue) {
    const t = Number(rawValue)
    setElapsed(t)
    const media = getMedia()
    if (audioUrl && media) media.currentTime = t
    onSeek?.(t)
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

      {/* Audio element caché — source de vérité pour l'audio */}
      {audioUrl && !mediaRef ? (
        <video ref={videoRef} src={audioUrl} autoPlay width={0} height={0}
          onLoadedMetadata={e => setDuration(e.target.duration || 0)}
          onTimeUpdate={e => { setElapsed(e.target.currentTime); if (e.target.currentTime >= LIMIT) onStop() }}
          onEnded={onStop}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        />
      ) : !audioUrl ? (
        <iframe ref={iframeRef} width={0} height={0}
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&start=0&enablejsapi=1&controls=0`}
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
          type="range" min="0" max={duration || LIMIT} step="0.1" value={elapsed}
          onChange={e => handleSeek(e.target.value)}
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
        {fmt(elapsed)}
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

      {/* Background overlay page */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {playing && <PlayingBgOverlay key={playing.ytId || playing.audioUrl} ytId={playing.ytId} audioUrl={playing.audioUrl} color={playing.color} />}
        </AnimatePresence>,
        document.body
      )}

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
  return `Tour de ${size}`
}
