import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getVotePercents } from '../../lib/tournament.js'

const GOLD   = '#d4a017'
const GOLD_L = '#f0c040'
const BG     = '#08090D'

// ── YouTube embed helper ──────────────────────────────────────────────────
function YtPlayer({ ytId, onClose }) {
  if (!ytId || ytId.startsWith('similar')) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.88)',
      }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        <iframe
          width="640" height="360"
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
          allow="autoplay; encrypted-media"
          allowFullScreen
          style={{ border: 'none', borderRadius: 10 }}
        />
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: -14, right: -14,
            width: 32, height: 32, borderRadius: '50%',
            background: '#1a1a1f', border: `1px solid rgba(255,255,255,.2)`,
            color: '#fff', cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >×</button>
      </div>
    </motion.div>
  )
}

// ── Vote bar ───────────────────────────────────────────────────────────────
function VoteBar({ leftPct, rightPct, total, leftN, rightN }) {
  return (
    <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'rgba(255,255,255,.55)' }}>
        <span>{leftPct}% · {leftN} votes</span>
        <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 11 }}>{total} votes au total</span>
        <span>{rightN} votes · {rightPct}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,.07)', overflow: 'hidden', display: 'flex' }}>
        <motion.div
          initial={{ width: '50%' }}
          animate={{ width: `${leftPct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', background: GOLD, borderRadius: '3px 0 0 3px' }}
        />
      </div>
    </div>
  )
}

// ── Participant card ───────────────────────────────────────────────────────
function ParticipantCard({
  participant, side, voted, isWinner, isLoser, votePercent,
  voteCount, totalVotes, hasVoted, onVote, onListen, showResult,
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const ytOk = participant?.ytId && !participant.ytId.startsWith('similar')
  const thumb = ytOk && !imgFailed
    ? `https://img.youtube.com/vi/${participant.ytId}/mqdefault.jpg`
    : null

  const accent = participant?.color || GOLD

  const cardStyle = {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    border: `1px solid`,
    borderColor: isWinner
      ? GOLD
      : isLoser
        ? 'rgba(255,255,255,0.06)'
        : voted === side
          ? `rgba(212,160,23,.45)`
          : 'rgba(255,255,255,0.08)',
    background: isWinner
      ? 'rgba(212,160,23,0.08)'
      : isLoser
        ? 'rgba(0,0,0,0.2)'
        : voted === side
          ? 'rgba(212,160,23,0.06)'
          : 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    opacity: isLoser ? 0.42 : 1,
    display: 'flex',
    flexDirection: 'column',
  }

  if (!participant) {
    return (
      <div style={{ ...cardStyle, minHeight: 340, alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,.2)', fontSize: 13 }}>À déterminer</span>
      </div>
    )
  }

  return (
    <motion.div
      style={cardStyle}
      whileHover={!hasVoted ? { scale: 1.01 } : {}}
      transition={{ duration: 0.2 }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', background: `${accent}22`, flexShrink: 0 }}>
        {thumb ? (
          <img
            src={thumb}
            onError={() => setImgFailed(true)}
            alt={participant.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(135deg, ${accent}33, ${accent}11)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, opacity: 0.6,
          }}>♪</div>
        )}

        {/* Overlay on result */}
        {showResult && (
          <div style={{
            position: 'absolute', inset: 0,
            background: isWinner ? 'rgba(212,160,23,0.15)' : 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isWinner && (
              <div style={{ fontSize: 28, filter: 'drop-shadow(0 0 12px rgba(212,160,23,.8))' }}>✦</div>
            )}
          </div>
        )}

        {/* Écouter button */}
        {ytOk && (
          <button
            onClick={() => onListen(participant.ytId)}
            style={{
              position: 'absolute', bottom: 8, right: 8,
              background: 'rgba(0,0,0,0.72)',
              border: '1px solid rgba(255,255,255,.18)',
              borderRadius: 20, padding: '5px 12px',
              color: 'rgba(255,255,255,.85)', fontSize: 12,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <span style={{ fontSize: 11 }}>▶</span> Écouter
          </button>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '18px 18px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {participant.anime}
          </span>
          {participant.type && (
            <span style={{
              fontSize: 9, padding: '2px 6px', borderRadius: 4,
              background: participant.type === 'insert' ? 'rgba(212,160,23,.12)' : 'rgba(255,255,255,.06)',
              color: participant.type === 'insert' ? GOLD : 'rgba(255,255,255,.3)',
              letterSpacing: '0.06em', fontWeight: 700, textTransform: 'uppercase',
            }}>
              {participant.type === 'insert' ? 'INSERT' : 'BGM'}
            </span>
          )}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: isWinner ? GOLD_L : 'rgba(255,255,255,.92)', lineHeight: 1.2 }}>
          {participant.title}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>
          {participant.artist}
        </div>

        {/* Result bar */}
        {showResult && totalVotes > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
              <span style={{ color: isWinner ? GOLD : 'rgba(255,255,255,.4)', fontWeight: 700 }}>
                {votePercent}%
              </span>
              <span style={{ color: 'rgba(255,255,255,.3)' }}>{voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${votePercent}%` }}
                transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: isWinner ? GOLD : 'rgba(255,255,255,.2)',
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        )}

        {/* Status badge */}
        {showResult && (
          <div style={{
            marginTop: 8,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            color: isWinner ? GOLD : 'rgba(255,255,255,.25)',
          }}>
            {isWinner ? '✦ QUALIFIÉ →' : 'ÉLIMINÉ'}
          </div>
        )}

        {/* Your vote indicator */}
        {voted === side && !showResult && (
          <div style={{ marginTop: 8, fontSize: 11, color: GOLD, letterSpacing: '0.06em' }}>
            ✓ Votre sélection
          </div>
        )}

        {/* Vote button */}
        {!hasVoted && (
          <button
            onClick={() => onVote(side)}
            style={{
              marginTop: 'auto', paddingTop: 8,
              width: '100%', padding: '11px 0',
              borderRadius: 10, border: `1px solid rgba(212,160,23,.3)`,
              background: 'rgba(212,160,23,0.08)',
              color: GOLD, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.04em',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(212,160,23,0.18)'
              e.currentTarget.style.borderColor = GOLD
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(212,160,23,0.08)'
              e.currentTarget.style.borderColor = 'rgba(212,160,23,.3)'
            }}
          >
            Voter pour cette OST
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ── Main TournamentDuel ────────────────────────────────────────────────────
export default function TournamentDuel({
  round, match, totalMatchesInRound, voteCounts,
  personalVotes, onVote, onNext, isLastMatch,
}) {
  const [ytOpen, setYtOpen] = useState(null)

  const voted      = personalVotes?.[match.id] || null
  const hasVoted   = !!voted
  const showResult = match.status === 'closed' || hasVoted

  const percents   = getVotePercents(voteCounts, match.id)
  const winnerSide = showResult
    ? (percents.leftN >= percents.rightN ? 'left' : 'right')
    : null

  const matchNum   = match.position + 1
  const qLabel     = `Qualification pour les ${nextRoundLabel(round.size)}`

  const allDone = match.status === 'closed' || hasVoted

  return (
    <div style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}>

      {/* Round meta */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: 'rgba(212,160,23,0.07)', border: '1px solid rgba(212,160,23,.18)',
          borderRadius: 24, padding: '6px 18px', marginBottom: 12,
        }}>
          <span style={{ fontSize: 12, color: GOLD, fontWeight: 700, letterSpacing: '0.1em' }}>
            {round.label.toUpperCase()}
          </span>
          <span style={{ color: 'rgba(255,255,255,.2)', fontSize: 10 }}>•</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
            DUEL {matchNum} / {totalMatchesInRound}
          </span>
        </div>

        {/* Round progress bar */}
        <div style={{ maxWidth: 320, margin: '0 auto' }}>
          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
            <motion.div
              initial={false}
              animate={{ width: `${((matchNum - (allDone ? 0 : 1)) / totalMatchesInRound) * 100}%` }}
              transition={{ duration: 0.5 }}
              style={{ height: '100%', background: GOLD }}
            />
          </div>
        </div>
      </div>

      {/* Cards row */}
      <div style={{
        display: 'flex',
        gap: 'clamp(12px, 3vw, 32px)',
        alignItems: 'stretch',
      }}>
        <ParticipantCard
          participant={match.left}
          side="left"
          voted={voted}
          isWinner={showResult && winnerSide === 'left'}
          isLoser={showResult && winnerSide === 'right'}
          votePercent={percents.left}
          voteCount={percents.leftN}
          totalVotes={percents.total}
          hasVoted={hasVoted}
          onVote={onVote}
          onListen={setYtOpen}
          showResult={showResult}
        />

        {/* VS center */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 8, flexShrink: 0, padding: '0 4px',
        }}>
          <div style={{
            fontSize: 'clamp(18px, 3vw, 26px)',
            fontWeight: 900,
            color: 'rgba(255,255,255,.15)',
            letterSpacing: '0.05em',
            writingMode: 'horizontal-tb',
          }}>VS</div>
          {!hasVoted && (
            <div style={{
              fontSize: 10, color: 'rgba(255,255,255,.2)',
              textAlign: 'center', maxWidth: 60,
              lineHeight: 1.4,
            }}>
              Vote pour ton OST préférée
            </div>
          )}
        </div>

        <ParticipantCard
          participant={match.right}
          side="right"
          voted={voted}
          isWinner={showResult && winnerSide === 'right'}
          isLoser={showResult && winnerSide === 'left'}
          votePercent={percents.right}
          voteCount={percents.rightN}
          totalVotes={percents.total}
          hasVoted={hasVoted}
          onVote={onVote}
          onListen={setYtOpen}
          showResult={showResult}
        />
      </div>

      {/* Post-vote section */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            key="post-vote"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.3 }}
            style={{ marginTop: 32, textAlign: 'center' }}
          >
            {percents.total > 0 && (
              <VoteBar {...percents} />
            )}

            <div style={{ marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,.35)', marginBottom: 20 }}>
              {winnerSide && (
                <>
                  <span style={{ color: GOLD, fontWeight: 700 }}>
                    {winnerSide === 'left' ? match.left?.title : match.right?.title}
                  </span>{' '}
                  rejoint les {nextRoundLabel(round.size)}.
                </>
              )}
            </div>

            {!isLastMatch ? (
              <button
                onClick={onNext}
                style={{
                  padding: '12px 36px',
                  borderRadius: 10,
                  border: `1px solid ${GOLD}`,
                  background: 'rgba(212,160,23,0.1)',
                  color: GOLD, fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', letterSpacing: '0.04em',
                }}
              >
                Duel suivant →
              </button>
            ) : (
              <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 14 }}>
                Tous les duels de ce round sont terminés.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Qualification context */}
      {!hasVoted && round.size > 2 && (
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,.25)' }}>
          {qLabel}
        </div>
      )}
      {!hasVoted && round.size === 2 && (
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: GOLD, opacity: 0.6 }}>
          C'est la Finale — un seul vainqueur.
        </div>
      )}

      {/* YouTube embed overlay */}
      <AnimatePresence>
        {ytOpen && <YtPlayer ytId={ytOpen} onClose={() => setYtOpen(null)} />}
      </AnimatePresence>
    </div>
  )
}

function nextRoundLabel(currentSize) {
  const next = currentSize / 2
  if (next === 1) return 'la victoire finale'
  if (next === 2) return 'la Finale'
  if (next === 4) return 'les Demi-finales'
  if (next === 8) return 'les Quarts de finale'
  if (next === 16) return 'les 16e de finale'
  return `les ${next}e de finale`
}
