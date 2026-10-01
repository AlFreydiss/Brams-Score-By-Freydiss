import { useState } from 'react'
import { type } from '../../styles/typography.js'
import { C } from '../garticphone/theme.js'
import { PhaseFrame, LiveRoster } from '../garticphone/ui.jsx'
import { ClipPlayer, TakeCard } from './ui.jsx'
import { roster } from './GagesPhase.jsx'
import { votableTakes } from './logic/clock.js'

export default function VotePhase({ g }) {
  const revote = g.room.phase === 'revote'
  const [mine, setMine] = useState(null)
  const byId = Object.fromEntries(g.players.map((p) => [p.user_id, p]))
  const shown = revote ? g.takes.filter((t) => g.room.tied.includes(t.user_id)) : g.takes
  const allowed = new Set(votableTakes(g.takes, { me: g.me?.user_id, phase: g.room.phase, tied: g.room.tied }).map((t) => t.user_id))
  const vote = async (uid) => { const r = await g.act.vote(uid); if (r?.ok) setMine(uid) }
  return (
    <PhaseFrame wide eyebrow={revote ? 'Égalité !' : `Tour ${g.room.round} · Vote`}
      prompt={revote ? 'Départage les ex aequo' : 'Vote pour la meilleure imitation'} remaining={g.remaining} total={g.total}>
      <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
        <div style={{ ...type.small, color: C.textMut }}>Original — {g.room.clip?.title}</div>
        {g.room.clip && <ClipPlayer url={g.room.clip.url} label={g.room.clip.title} />}
      </div>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {shown.map((t) => (
          <TakeCard key={t.user_id} player={byId[t.user_id]} url={t.audio_url}
            selected={mine === t.user_id}
            onVote={g.me && allowed.has(t.user_id) ? () => vote(t.user_id) : undefined}
            voteLabel={t.user_id === g.me?.user_id ? 'Toi' : 'Voter'} />
        ))}
      </div>
      {!g.me && <p style={{ ...type.body, color: C.textMut }}>Les joueurs votent…</p>}
      <LiveRoster players={g.players} submittedSeats={roster(g, g.prog?.voted)} meUserId={g.me?.user_id} />
    </PhaseFrame>
  )
}
