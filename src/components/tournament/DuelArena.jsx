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
  @keyframes arWave { 0%,100%{height:5px} 50%{height:30px} }
  @keyframes arWaveIdle { 0%,100%{height:4px} 50%{height:8px} }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; cursor:pointer; }
  input[type=range]::-webkit-slider-runnable-track { height:4px; border-radius:2px; }
`

function ArenaWaveform({ color, active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 36, justifyContent: 'center' }}>
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 2,
          background: color || GOLD,
          opacity: active ? 0.75 : 0.22,
          animation: active
            ? `arWave ${0.45 + (i % 5) * 0.12}s ${i * 0.04}s ease-in-out infinite`
            : `arWaveIdle ${1.8 + (i % 3) * 0.4}s ${i * 0.08}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

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
        <img
          src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
          alt=""
          style={{
            position: 'absolute', inset: '-10%',
            width: '120%', height: '120%',
            objectFit: 'cover',
            filter: 'blur(40px) brightness(0.22) saturate(2)',
          }}
        />
      ) : audioUrl ? (
        <video
          src={audioUrl}
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: 'absolute', inset: '-10%',
            width: '120%', height: '120%',
            objectFit: 'cover',
            filter: 'blur(40px) brightness(0.22) saturate(2)',
          }}
        />
      ) : null}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,.45) 0%, rgba(2,2,3,.6) 100%)',
      }} />
    </motion.div>
  )
}

function fmt(s) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ── Mini player — mp4 (audioUrl) ou YouTube (ytId) ────────────────────────
function MiniPlayer({ ytId, audioUrl, color, title, anime, onStop }) {
  const iframeRef  = useRef(null)
  const videoRef   = useRef(null)
  const timerRef   = useRef(null)
  const startRef   = useRef(Date.now())
  const [volume,  setVolume]  = useState(80)
  const [elapsed, setElapsed] = useState(0)
  const LIMIT = 90

  // Auto-stop après 90s
  useEffect(() => {
    timerRef.current = setTimeout(onStop, LIMIT * 1000)
    return () => clearTimeout(timerRef.current)
  }, [onStop])

  // Tick progress bar — seulement pour YouTube (le mp4 utilise onTimeUpdate)
  useEffect(() => {
    if (audioUrl) return
    const iv = setInterval(() => setElapsed(Math.min(LIMIT, (Date.now() - startRef.current) / 1000)), 250)
    return () => clearInterval(iv)
  }, [audioUrl])

  // Volume HTML5 video
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume / 100
  }, [volume])

  // Volume YouTube iframe
  useEffect(() => {
    if (!audioUrl && iframeRef.current) {
      const t = setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
          event: 'command', func: 'setVolume', args: [volume],
        }), '*')
      }, 600)
      return () => clearTimeout(t)
    }
  }, [volume, audioUrl])

  const pct    = (elapsed / LIMIT) * 100
  const volPct = volume + '%'

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      style={{
        position: 'relative', zIndex: 2,
        marginTop: 18,
        background: 'rgba(6,7,11,0.97)',
        border: `1px solid ${color}30`,
        borderRadius: 16,
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 18,
        backdropFilter: 'blur(24px)',
        boxShadow: `0 0 60px ${color}10, 0 8px 40px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.03)`,
        overflow: 'hidden',
      }}
    >
      {/* bottom accent line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent 0%, ${color}55 40%, ${color}55 60%, transparent 100%)`,
      }} />

      {/* Lecteur vidéo / iframe */}
      <div style={{ borderRadius: 10, overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 20px rgba(0,0,0,.6)' }}>
        {audioUrl ? (
          <video
            ref={videoRef}
            src={audioUrl}
            autoPlay
            width={192} height={108}
            onTimeUpdate={e => {
              setElapsed(e.target.currentTime)
              if (e.target.currentTime >= LIMIT) onStop()
            }}
            onEnded={onStop}
            style={{ display: 'block', objectFit: 'cover' }}
          />
        ) : (
          <iframe
            ref={iframeRef}
            width="192" height="108"
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&start=15&end=105&enablejsapi=1&controls=1&fs=0&modestbranding=1&rel=0`}
            allow="autoplay; encrypted-media"
            style={{ border: 'none', display: 'block' }}
            title={title}
          />
        )}
      </div>

      {/* Info + progress + volume */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          {anime}
        </div>
        <div style={{
          fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,.92)',
          marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </div>

        {/* Barre de progression / seek */}
        <div style={{ marginBottom: 10 }}>
          <input
            type="range" min="0" max={LIMIT} step="0.5" value={elapsed}
            onChange={e => {
              const t = Number(e.target.value)
              setElapsed(t)
              if (audioUrl && videoRef.current) videoRef.current.currentTime = t
            }}
            style={{
              width: '100%', height: 4, cursor: 'pointer',
              WebkitAppearance: 'none', appearance: 'none',
              outline: 'none', borderRadius: 2, marginBottom: 3, display: 'block',
              background: `linear-gradient(90deg, ${color} ${pct}%, rgba(255,255,255,.12) ${pct}%)`,
              accentColor: color,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,.22)' }}>
            <span>{fmt(elapsed)}</span>
            <span>1:30</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, opacity: 0.42, flexShrink: 0 }}>
            {volume === 0 ? '🔇' : volume < 40 ? '🔉' : '🔊'}
          </span>
          <input
            type="range" min="0" max="100" value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            style={{
              flex: 1, height: 4, cursor: 'pointer',
              WebkitAppearance: 'none', appearance: 'none',
              outline: 'none', borderRadius: 2,
              background: `linear-gradient(90deg, ${color} ${volPct}, rgba(255,255,255,.12) ${volPct})`,
              accentColor: color,
            }}
          />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', minWidth: 26, textAlign: 'right' }}>
            {volume}
          </span>
        </div>
      </div>

      {/* Stop */}
      <button
        onClick={onStop}
        style={{
          flexShrink: 0, padding: '11px 20px', borderRadius: 10,
          border: '1px solid rgba(255,255,255,.12)',
          background: 'rgba(255,255,255,.04)',
          color: 'rgba(255,255,255,.6)', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.04em',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'}
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
          initial={{ opacity: 0, y: -18, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          style={{
            position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)',
            zIndex: 800,
            background: 'rgba(10,11,16,0.98)',
            border: `1px solid rgba(157,23,77,.48)`,
            borderRadius: 14, padding: '12px 24px',
            display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,.65), 0 0 0 1px rgba(157,23,77,.07)',
            backdropFilter: 'blur(16px)', whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: GOLD, fontSize: 15 }}>✦</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>Ton vote a été enregistré</div>
            {winnerTitle && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.42)', marginTop: 1 }}>
                {winnerTitle} mène pour l'instant
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
  const [playing, setPlaying] = useState(null) // { side, ytId, color, title, anime }
  const [showToast, setToast] = useState(false)

  const voted      = personalVotes?.[match.id] || null
  const hasVoted   = !!voted
  const showResult = match.status === 'closed' || hasVoted
  const percents   = getVotePercents(voteCounts, match.id)
  const winnerSide = showResult
    ? (percents.leftN >= percents.rightN ? 'left' : 'right') : null
  const winnerTitle  = winnerSide === 'left' ? match.left?.title : match.right?.title
  const qualifiesFor = round.size > 2 ? nextRoundLabel(round.size) : null
  const matchNum     = match.position + 1

  // Stop player on match change
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

      {/* Page background overlay — portal vers document.body pour éviter le stacking context du motion.div */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {playing && <PlayingBgOverlay key={playing.ytId || playing.audioUrl} ytId={playing.ytId} audioUrl={playing.audioUrl} color={playing.color} />}
        </AnimatePresence>,
        document.body
      )}

      {/* Ambient glow — more visible */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {match.left?.color && (
          <div style={{
            position: 'absolute', left: '-8%', top: '-10%',
            width: '55%', height: '120%', borderRadius: '50%',
            background: match.left.color,
            opacity: playing?.side === 'left' ? 0.13 : 0.08,
            filter: 'blur(80px)',
            transition: 'opacity 0.9s ease',
          }} />
        )}
        {match.right?.color && (
          <div style={{
            position: 'absolute', right: '-8%', top: '-10%',
            width: '55%', height: '120%', borderRadius: '50%',
            background: match.right.color,
            opacity: playing?.side === 'right' ? 0.13 : 0.08,
            filter: 'blur(80px)',
            transition: 'opacity 0.9s ease',
          }} />
        )}
      </div>

      {/* Round progress bar */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: 18 }}>
        <div style={{ height: 2, borderRadius: 1, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
          <motion.div
            initial={false}
            animate={{ width: `${((matchNum - (hasVoted ? 0 : 1)) / totalMatchesInRound) * 100}%` }}
            transition={{ duration: 0.5 }}
            style={{ height: '100%', background: GRAD }}
          />
        </div>
      </div>

      {/* Waveform */}
      {!hasVoted && (
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 18, textAlign: 'center' }}>
          <ArenaWaveform color={playing?.color ?? match.left?.color ?? GOLD} active={!!playing} />
        </div>
      )}

      {/* Cards row */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 0 : 14,
        alignItems: 'stretch',
      }}>
        <OSTDuelCard
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
        />

        <OSTDuelCard
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

      {/* Mini player */}
      <AnimatePresence>
        {playing && (
          <MiniPlayer
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
            style={{ position: 'relative', zIndex: 1, marginTop: 30, textAlign: 'center' }}
          >
            {winnerSide && (
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,.38)', marginBottom: 20 }}>
                <span style={{ color: GOLD, fontWeight: 700 }}>{winnerTitle}</span>
                {' '}rejoint {qualifiesFor || 'la victoire finale'}.
              </div>
            )}

            {!isLastMatch ? (
              <motion.button
                onClick={onNext}
                whileHover={{ scale: 1.04, boxShadow: `0 10px 32px rgba(157,23,77,.38)` }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: '14px 52px', borderRadius: 100, border: 'none',
                  background: GRAD, color: '#fff', fontWeight: 800, fontSize: 15,
                  cursor: 'pointer', letterSpacing: '0.04em',
                  fontFamily: "'Pirata One',cursive",
                  boxShadow: `0 6px 24px rgba(157,23,77,.24)`,
                }}
              >
                Duel suivant →
              </motion.button>
            ) : (
              <div style={{
                fontSize: 13, color: 'rgba(255,255,255,.35)',
                padding: '13px 26px',
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
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: GOLD, opacity: 0.5, position: 'relative', zIndex: 1 }}>
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
