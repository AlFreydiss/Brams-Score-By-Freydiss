import { motion } from 'framer-motion'
import { getVotePercents } from '../../lib/tournament.js'

const GOLD   = '#e91e8c'
const GOLD_L = '#f9a8d4'

function ResultMatch({ match, voteCounts, index }) {
  const p        = getVotePercents(voteCounts, match.id)
  const leftWon  = match.winnerId === match.left?.id
  const rightWon = match.winnerId === match.right?.id

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      style={{
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,.07)',
        overflow: 'hidden',
        background: 'rgba(255,255,255,.02)',
      }}
    >
      <ResultRow participant={match.left}  won={leftWon}  lost={!leftWon && !!match.winnerId}  pct={p.left}  count={p.leftN}  total={p.total} />
      <div style={{ height: 1, background: 'rgba(255,255,255,.05)' }} />
      <ResultRow participant={match.right} won={rightWon} lost={!rightWon && !!match.winnerId} pct={p.right} count={p.rightN} total={p.total} />
    </motion.div>
  )
}

function ResultRow({ participant, won, lost, pct, count, total }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px',
      background: won ? 'rgba(233,30,140,.05)' : 'transparent',
      opacity: lost ? 0.42 : 1,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: won ? 700 : 400,
          color: won ? GOLD : 'rgba(255,255,255,.78)',
          display: 'flex', alignItems: 'center', gap: 6,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {won && <span style={{ fontSize: 10, color: GOLD, flexShrink: 0 }}>✦</span>}
          {participant?.title}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginTop: 1 }}>
          {participant?.anime}
        </div>
      </div>

      {total > 0 && (
        <div style={{ minWidth: 100, display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ fontWeight: 700, color: won ? GOLD : 'rgba(255,255,255,.38)' }}>
              {pct}%
            </span>
            <span style={{ color: 'rgba(255,255,255,.2)' }}>{count}v</span>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: 0.2, duration: 0.7, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: won
                  ? `linear-gradient(90deg, ${GOLD}, ${GOLD_L})`
                  : 'rgba(255,255,255,.18)',
                borderRadius: 2,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function TournamentResults({ rounds, voteCounts, winner }) {
  const completedRounds = rounds
    .map(round => ({
      ...round,
      closed: round.matches.filter(m => m.status === 'closed'),
    }))
    .filter(r => r.closed.length > 0)
    .reverse()

  if (completedRounds.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>⚔</div>
        <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 14 }}>
          Aucun duel terminé pour l'instant.
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.18)', marginTop: 6 }}>
          Vote dans l'onglet Duel pour commencer.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {winner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            borderRadius: 16,
            border: `1px solid ${GOLD}`,
            background: 'rgba(233,30,140,.06)',
            padding: 'clamp(20px,4vw,32px)',
            textAlign: 'center',
            boxShadow: `0 0 48px rgba(233,30,140,.07)`,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 10 }}>🏆</div>
          <div style={{ fontSize: 11, color: GOLD, letterSpacing: '0.15em', marginBottom: 10 }}>
            VAINQUEUR DU TOURNOI
          </div>
          <div style={{
            fontSize: 'clamp(22px,4vw,32px)', fontWeight: 800,
            background: `linear-gradient(135deg, ${GOLD_L}, ${GOLD})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 6,
          }}>
            {winner.title}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>
            {winner.anime} · {winner.artist}
          </div>
        </motion.div>
      )}

      {completedRounds.map((round, ri) => (
        <div key={round.id}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 12,
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: 'rgba(255,255,255,.35)',
              letterSpacing: '0.1em',
            }}>
              {round.label.toUpperCase()}
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {round.closed.map((match, mi) => (
              <ResultMatch
                key={match.id}
                match={match}
                voteCounts={voteCounts}
                index={ri * 10 + mi}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
