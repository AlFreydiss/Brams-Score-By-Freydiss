import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getVotePercents } from '../../lib/tournament.js'
import OSTDuelCard from './OSTDuelCard.jsx'
import VSPanel     from './VSPanel.jsx'

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
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.4 }}
      style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}
    >
      {ytId ? (
        <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt=""
          style={{ position: 'absolute', inset: '-10%', width: '120%', height: '120%', objectFit: 'cover', filter: 'blur(52px) brightness(0.18) saturate(1.8)' }}
        />
      ) : audioUrl ? (
        <video src={audioUrl} autoPlay muted loop playsInline
          style={{ position: 'absolute', inset: '-10%', width: '120%', height: '120%', objectFit: 'cover', filter: 'blur(52px) brightness(0.18) saturate(1.8)' }}
        />
      ) : null}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(2,2,3,.65) 100%)' }} />
    </motion.div>
  )
}

function fmt(s) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ── Compact audio strip ────────────────────────────────────────────────────
function CompactPlayer({ ytId, audioUrl, color, title, anime, onStop }) {
  const iframeRef = useRef(null)
  const videoRef  = useRef(null)
  const timerRef  = useRef(null)
  const startRef  = useRef(Date.now())
  const [volume,  setVolume]  = useState(80)
  const [elapsed, setElapsed] = useState(0)
  const LIMIT = 90

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
    if (videoRef.current) videoRef.current.volume = volume / 100
  }, [volume])

  useEffect(() => {
    if (!audioUrl && iframeRef.current) {
      const t = setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [volume] }), '*')
      }, 600)
      return () => clearTimeout(t)
    }
  }, [volume, audioUrl])

  const pct    = (elapsed / LIMIT) * 100
  const volPct = volume + '%'

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

      {/* Audio element caché — fournit le son */}
      {audioUrl ? (
        <video ref={videoRef} src={audioUrl} autoPlay width={0} height={0}
          onTimeUpdate={e => { setElapsed(e.target.currentTime); if (e.target.currentTime >= LIMIT) onStop() }}
          onEnded={onStop}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        />
      ) : (
        <iframe ref={iframeRef} width={0} height={0}
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&start=15&end=105&enablejsapi=1&controls=0`}
          allow="autoplay; encrypted-media"
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', border: 'none' }}
          title={title}
        />
      )}

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

      {/* Timeline */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <input
          type="range" min="0" max={LIMIT} step="0.5" value={elapsed}
          onChange={e => {
            const t = Number(e.target.value)
            setElapsed(t)
            if (audioUrl && videoRef.current) videoRef.current.currentTime = t
          }}
          style={{
            width: '100%', height: 3, cursor: 'pointer',
            WebkitAppearance: 'none', appearance: 'none',
            outline: 'none', borderRadius: 2, display: 'block',
            background: `linear-gradient(90deg, ${color} ${pct}%, rgba(255,255,255,.1) ${pct}%)`,
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
}) {
  const [playing, setPlaying] = useState(null)
  const [showToast, setToast] = useState(false)

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

  return (
    <div style={{ position: 'relative' }}>
      <style>{ARENA_CSS}</style>

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
        display: isMobile ? 'flex' : 'grid',
        gridTemplateColumns: '1fr 96px 1fr',
        flexDirection: isMobile ? 'column' : undefined,
        gap: isMobile ? 10 : 0,
        alignItems: 'stretch',
        minWidth: 0,
      }}>
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
          isPlaying={playing?.side === 'left'}
          otherIsPlaying={playing !== null && playing.side !== 'left'}
          showResult={showResult}
          isMobile={isMobile}
        />

        <VSPanel
          hasVoted={hasVoted}
          isMobile={isMobile}
          qualifiesFor={qualifiesFor}
          matchNum={matchNum}
          totalMatches={totalMatchesInRound}
          roundLabel={roundLabel}
          playingColor={playing?.color}
          isPlaying={!!playing}
        />

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
          isPlaying={playing?.side === 'right'}
          otherIsPlaying={playing !== null && playing.side !== 'right'}
          showResult={showResult}
          isMobile={isMobile}
        />
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
            {winnerSide && (
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
          </motion.div>
        )}
      </AnimatePresence>

      {!hasVoted && round.size === 2 && (
        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: GOLD, opacity: 0.45, position: 'relative', zIndex: 1 }}>
          C'est la Finale — un seul vainqueur.
        </div>
      )}

      <VoteToast visible={showToast} winnerTitle={winnerSide ? winnerTitle : null} />
    </div>
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
