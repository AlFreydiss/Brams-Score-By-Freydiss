import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getVotePercents } from '../../lib/tournament.js'
import OSTDuelCard from './OSTDuelCard.jsx'
import VSPanel     from './VSPanel.jsx'

const PINK   = '#9d174d'
const PURPLE = '#4c1d95'
const PINK_L = '#f9a8d4'
const GOLD   = PINK
const GOLD_L = PINK_L
const GRAD   = `linear-gradient(135deg, ${PINK}, ${PURPLE})`

const ARENA_CSS = `
  @keyframes arWave { 0%,100%{height:6px} 50%{height:28px} }
`

function ArenaWaveform({ color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 36, justifyContent: 'center' }}>
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 2,
          background: color || GOLD,
          opacity: 0.55,
          animation: `arWave ${0.5 + (i % 5) * 0.12}s ${i * 0.04}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

// ── YouTube modal ──────────────────────────────────────────────────────────
function YtPlayer({ ytId, onClose }) {
  if (!ytId || ytId.startsWith('similar')) return null
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,.9)',
      }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '90vw', maxWidth: 800 }}>
        <div style={{ aspectRatio: '16/9', width: '100%' }}>
          <iframe
            width="100%" height="100%"
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
            allow="autoplay; encrypted-media"
            allowFullScreen
            style={{ border: 'none', borderRadius: 12, display: 'block' }}
          />
        </div>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: -18, right: -18,
            width: 36, height: 36, borderRadius: '50%',
            background: '#1a1a22', border: `1px solid rgba(255,255,255,.22)`,
            color: '#fff', cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >×</button>
      </div>
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
            borderRadius: 14,
            padding: '12px 24px',
            display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,.65), 0 0 0 1px rgba(157,23,77,.07)',
            backdropFilter: 'blur(16px)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: GOLD, fontSize: 15 }}>✦</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>
              Ton vote a été enregistré
            </div>
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
  const [ytOpen, setYtOpen] = useState(null)
  const [listeningSide, setListeningSide] = useState(null)
  const [showToast, setToast] = useState(false)

  const voted      = personalVotes?.[match.id] || null
  const hasVoted   = !!voted
  const showResult = match.status === 'closed' || hasVoted
  const percents   = getVotePercents(voteCounts, match.id)
  const winnerSide = showResult
    ? (percents.leftN >= percents.rightN ? 'left' : 'right')
    : null
  const winnerTitle  = winnerSide === 'left' ? match.left?.title : match.right?.title
  const qualifiesFor = round.size > 2 ? nextRoundLabel(round.size) : null
  const matchNum     = match.position + 1

  function handleVote(side) {
    setListeningSide(null)
    onVote(side)
    setToast(true)
    setTimeout(() => setToast(false), 3000)
  }

  function handleListen(side, participant) {
    if (participant?.mediaUrl) {
      setYtOpen(null)
      setListeningSide(current => current === side ? null : side)
      return
    }
    setListeningSide(null)
    setYtOpen(participant?.ytId || null)
  }

  return (
    <div style={{ position: 'relative' }}>
      <style>{ARENA_CSS}</style>

      {/* Ambient glow from participant colors */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        pointerEvents: 'none', overflow: 'hidden',
      }}>
        {match.left?.color && (
          <div style={{
            position: 'absolute', left: '-2%', top: '5%',
            width: '40%', height: '90%', borderRadius: '50%',
            background: match.left.color, opacity: 0.042,
            filter: 'blur(90px)',
          }} />
        )}
        {match.right?.color && (
          <div style={{
            position: 'absolute', right: '-2%', top: '5%',
            width: '40%', height: '90%', borderRadius: '50%',
            background: match.right.color, opacity: 0.042,
            filter: 'blur(90px)',
          }} />
        )}
      </div>

      {/* Round progress bar (thin, top) */}
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

      {/* Waveform — music is playing indicator */}
      {!hasVoted && (
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 18, textAlign: 'center' }}>
          <ArenaWaveform color={match.left?.color ?? GOLD} />
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
          onListen={handleListen}
          isListening={listeningSide === 'left'}
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
          onListen={handleListen}
          isListening={listeningSide === 'right'}
          showResult={showResult}
          isMobile={isMobile}
        />
      </div>

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
                  padding: '14px 52px',
                  borderRadius: 100, border: 'none',
                  background: GRAD,
                  color: '#fff', fontWeight: 800, fontSize: 15,
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

      <AnimatePresence>
        {ytOpen && <YtPlayer ytId={ytOpen} onClose={() => setYtOpen(null)} />}
      </AnimatePresence>
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
