import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getVotePercents } from '../../lib/tournament.js'
import OSTCard from './OSTCard.jsx'
import VSPanel from './VSPanel.jsx'

const GOLD   = '#d4a017'
const GOLD_L = '#f0c040'

// ── YouTube overlay ────────────────────────────────────────────────────────
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
        background: 'rgba(0,0,0,.88)',
      }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '90vw', maxWidth: 700 }}>
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
            position: 'absolute', top: -16, right: -16,
            width: 34, height: 34, borderRadius: '50%',
            background: '#1a1a1f', border: `1px solid rgba(255,255,255,.2)`,
            color: '#fff', cursor: 'pointer', fontSize: 17,
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
          initial={{ opacity: 0, y: -16, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          style={{
            position: 'fixed', top: 76, left: '50%', transform: 'translateX(-50%)',
            zIndex: 800,
            background: 'rgba(14,15,20,0.97)',
            border: `1px solid rgba(212,160,23,.42)`,
            borderRadius: 14,
            padding: '11px 22px',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,.55), 0 0 0 1px rgba(212,160,23,.08)',
            backdropFilter: 'blur(14px)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{
            fontSize: 14,
            filter: 'drop-shadow(0 0 6px rgba(212,160,23,.6))',
            color: GOLD,
          }}>✦</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>
              Ton vote a été enregistré
            </div>
            {winnerTitle && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 1 }}>
                {winnerTitle} mène pour l'instant
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function TournamentDuel({
  round, match, totalMatchesInRound, voteCounts,
  personalVotes, onVote, onNext, isLastMatch, isMobile,
}) {
  const [ytOpen, setYtOpen]     = useState(null)
  const [showToast, setToast]   = useState(false)

  const voted      = personalVotes?.[match.id] || null
  const hasVoted   = !!voted
  const showResult = match.status === 'closed' || hasVoted
  const percents   = getVotePercents(voteCounts, match.id)
  const winnerSide = showResult
    ? (percents.leftN >= percents.rightN ? 'left' : 'right')
    : null
  const winnerTitle = winnerSide === 'left' ? match.left?.title : match.right?.title

  const matchNum     = match.position + 1
  const qualifiesFor = round.size > 2 ? nextRoundLabel(round.size) : null

  function handleVote(side) {
    onVote(side)
    setToast(true)
    setTimeout(() => setToast(false), 3000)
  }

  return (
    <div style={{ width: '100%', maxWidth: 960, margin: '0 auto', position: 'relative' }}>

      {/* Ambient color glow from participant colors */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        pointerEvents: 'none', overflow: 'hidden', borderRadius: 24,
      }}>
        {match.left?.color && (
          <div style={{
            position: 'absolute', left: '-8%', top: '15%',
            width: '42%', height: '70%', borderRadius: '50%',
            background: match.left.color, opacity: 0.045,
            filter: 'blur(70px)',
          }} />
        )}
        {match.right?.color && (
          <div style={{
            position: 'absolute', right: '-8%', top: '15%',
            width: '42%', height: '70%', borderRadius: '50%',
            background: match.right.color, opacity: 0.045,
            filter: 'blur(70px)',
          }} />
        )}
      </div>

      {/* Round meta */}
      <div style={{ textAlign: 'center', marginBottom: 22, position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: 'rgba(212,160,23,.07)',
          border: '1px solid rgba(212,160,23,.18)',
          borderRadius: 24, padding: '6px 20px', marginBottom: 14,
        }}>
          <span style={{ fontSize: 12, color: GOLD, fontWeight: 700, letterSpacing: '0.1em' }}>
            {round.label.toUpperCase()}
          </span>
          <span style={{ color: 'rgba(255,255,255,.18)', fontSize: 10 }}>•</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>
            DUEL {matchNum} / {totalMatchesInRound}
          </span>
        </div>

        <div style={{ maxWidth: 320, margin: '0 auto' }}>
          <div style={{ height: 2, borderRadius: 1, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
            <motion.div
              initial={false}
              animate={{ width: `${((matchNum - (hasVoted ? 0 : 1)) / totalMatchesInRound) * 100}%` }}
              transition={{ duration: 0.5 }}
              style={{ height: '100%', background: `linear-gradient(90deg, ${GOLD}, ${GOLD_L})` }}
            />
          </div>
        </div>
      </div>

      {/* Arena */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 0 : 'clamp(8px, 2vw, 18px)',
        alignItems: 'stretch',
      }}>
        <OSTCard
          participant={match.left}
          side="left"
          voted={voted}
          isWinner={showResult && winnerSide === 'left'}
          isLoser={showResult && winnerSide === 'right'}
          votePercent={percents.left}
          voteCount={percents.leftN}
          hasVoted={hasVoted}
          onVote={handleVote}
          onListen={setYtOpen}
          showResult={showResult}
          isMobile={isMobile}
        />

        <VSPanel
          hasVoted={hasVoted}
          isMobile={isMobile}
          qualifiesFor={qualifiesFor}
        />

        <OSTCard
          participant={match.right}
          side="right"
          voted={voted}
          isWinner={showResult && winnerSide === 'right'}
          isLoser={showResult && winnerSide === 'left'}
          votePercent={percents.right}
          voteCount={percents.rightN}
          hasVoted={hasVoted}
          onVote={handleVote}
          onListen={setYtOpen}
          showResult={showResult}
          isMobile={isMobile}
        />
      </div>

      {/* Post-vote area */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            key="post-vote"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.4 }}
            style={{
              position: 'relative', zIndex: 1,
              marginTop: 28, textAlign: 'center',
            }}
          >
            {winnerSide && (
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,.42)', marginBottom: 18 }}>
                <span style={{ color: GOLD, fontWeight: 700 }}>{winnerTitle}</span>
                {' '}rejoint {qualifiesFor || 'la victoire finale'}.
              </div>
            )}

            {!isLastMatch ? (
              <button
                onClick={onNext}
                style={{
                  padding: '13px 44px',
                  borderRadius: 12,
                  border: `1px solid ${GOLD}`,
                  background: 'rgba(212,160,23,.1)',
                  color: GOLD, fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', letterSpacing: '0.04em',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,160,23,.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(212,160,23,.1)'}
              >
                Duel suivant →
              </button>
            ) : (
              <div style={{
                fontSize: 13, color: 'rgba(255,255,255,.38)',
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

      {/* Finale hint */}
      {!hasVoted && round.size === 2 && (
        <div style={{
          textAlign: 'center', marginTop: 20, fontSize: 13,
          color: GOLD, opacity: 0.55, position: 'relative', zIndex: 1,
        }}>
          C'est la Finale — un seul vainqueur.
        </div>
      )}

      {/* Toast */}
      <VoteToast visible={showToast} winnerTitle={winnerSide ? winnerTitle : null} />

      {/* YouTube overlay */}
      <AnimatePresence>
        {ytOpen && <YtPlayer ytId={ytOpen} onClose={() => setYtOpen(null)} />}
      </AnimatePresence>
    </div>
  )
}

function nextRoundLabel(currentSize) {
  const next = currentSize / 2
  if (next === 1)  return 'la victoire finale'
  if (next === 2)  return 'la Finale'
  if (next === 4)  return 'les Demi-finales'
  if (next === 8)  return 'les Quarts de finale'
  if (next === 16) return 'les 16e de finale'
  return `les ${next}e de finale`
}
