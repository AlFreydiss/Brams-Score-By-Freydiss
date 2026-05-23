import { getVotePercents } from '../../lib/tournament.js'

const GOLD = '#d4a017'

function ResultMatch({ match, voteCounts }) {
  const p = getVotePercents(voteCounts, match.id)
  const leftWon  = match.winnerId === match.left?.id
  const rightWon = match.winnerId === match.right?.id

  function ParticipantRow({ participant, won, lost, pct, count }) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
        background: won ? 'rgba(212,160,23,.06)' : 'transparent',
        opacity: lost ? 0.45 : 1,
        borderRadius: 6,
        minWidth: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: won ? 700 : 400,
            color: won ? GOLD : 'rgba(255,255,255,.78)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {won && <span style={{ marginRight: 6 }}>✦</span>}
            {participant?.title}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>
            {participant?.anime}
          </div>
        </div>
        {p.total > 0 && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: won ? GOLD : 'rgba(255,255,255,.4)' }}>
              {pct}%
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.2)' }}>
              {count} votes
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,.07)',
      overflow: 'hidden',
      background: 'rgba(255,255,255,.02)',
    }}>
      <ParticipantRow participant={match.left}  won={leftWon}  lost={!leftWon}  pct={p.left}  count={p.leftN}  />
      <div style={{ height: 1, background: 'rgba(255,255,255,.05)' }} />
      <ParticipantRow participant={match.right} won={rightWon} lost={!rightWon} pct={p.right} count={p.rightN} />
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
    .reverse() // most recent first

  if (completedRounds.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,.3)', fontSize: 14 }}>
        Aucun duel terminé pour l'instant.
        <br />
        <span style={{ fontSize: 12, opacity: 0.6 }}>Vote dans l'onglet Duel pour commencer.</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Final winner callout */}
      {winner && (
        <div style={{
          borderRadius: 14,
          border: `1px solid ${GOLD}`,
          background: 'rgba(212,160,23,0.07)',
          padding: '24px 28px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, color: GOLD, letterSpacing: '0.12em', marginBottom: 8 }}>
            VAINQUEUR DU TOURNOI
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: GOLD, marginBottom: 4 }}>
            {winner.title}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.5)' }}>
            {winner.anime} · {winner.artist}
          </div>
        </div>
      )}

      {completedRounds.map(round => (
        <div key={round.id}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.4)',
            letterSpacing: '0.1em', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
            {round.label.toUpperCase()}
            <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {round.closed.map(match => (
              <ResultMatch key={match.id} match={match} voteCounts={voteCounts} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
