// Guess Who — rendu d'un salon à partir de l'état `g` (useGuessWhoRoom) :
// bannières, écran de la phase en cours, réactions. Utilisé par la vraie page
// et par la page de démo (DEV) avec un état factice.
import { SfxBurst } from './manga.jsx'
import PhaseFlash from './PhaseFlash.jsx'
import { T, F, LINE, RADIUS } from './theme.js'
import Lobby from './Lobby.jsx'
import GagesPhase from './GagesPhase.jsx'
import ListenPhase from './ListenPhase.jsx'
import RecordPhase from './RecordPhase.jsx'
import VotePhase from './VotePhase.jsx'
import ResultPhase from './ResultPhase.jsx'
import GageWheel from './GageWheel.jsx'
import EndScreen from './EndScreen.jsx'
import { ReactionBar, FloatingReactions } from './Reactions.jsx'
import { connectionNotice } from './logic/notices.js'

const REASONS = {
  started: 'La partie a déjà commencé : tu regardes en spectateur, tu auras une place au prochain tour.',
  full: 'Salon complet (8 joueurs) : tu regardes en spectateur.',
  seat_taken: 'Ce compte joue déjà depuis un autre appareil : tu regardes en spectateur.',
}

// Phases d'un tour où l'on affiche « Dernier tour ! ».
const LAST_ROUND_PHASES = ['listen', 'record', 'vote', 'revote', 'result']

// Bannière : pilule sombre à filet fin, centrée au-dessus de la carte de phase.
const banner = { fontFamily: F.ui, fontWeight: 600, fontSize: 14.5, textAlign: 'center', margin: '0 auto 14px', maxWidth: 820,
  background: T.raised, border: LINE, borderRadius: RADIUS.md, padding: '10px 16px', color: T.text, boxSizing: 'border-box' }

export default function RoomView({ g, code, reactions }) {
  const phase = g.room?.phase
  return (
    <>
      <SfxBurst phase={phase} round={g.room?.round} />
      <PhaseFlash phase={phase} round={g.room?.round} />
      {connectionNotice(g.connection) && <p role="status" style={banner}>{connectionNotice(g.connection)}</p>}
      {g.spectator && <p style={banner}>{REASONS[g.reason] || 'Mode spectateur.'}</p>}
      {g.isLastRound && LAST_ROUND_PHASES.includes(phase) && (
        <p role="status" style={{ ...banner, width: 'fit-content', border: `1px solid ${T.accent}`, color: T.accentLit,
          fontFamily: F.display, fontWeight: 500, fontSize: 17 }}>
          Dernier tour ({g.roundsMax}/{g.roundsMax})
        </p>
      )}
      {g.notice && (
        <p role="alert" onClick={g.clearNotice} style={{ ...banner, cursor: 'pointer' }}>
          {g.notice} <span aria-hidden>✕</span>
        </p>
      )}
      {phase === 'lobby' && <Lobby code={code} g={g} />}
      {phase === 'gages' && <GagesPhase g={g} />}
      {phase === 'listen' && <ListenPhase g={g} />}
      {phase === 'record' && <RecordPhase g={g} />}
      {(phase === 'vote' || phase === 'revote') && <VotePhase key={`${g.room.round}-${phase}`} g={g} />}
      {phase === 'result' && <ResultPhase g={g} />}
      {phase === 'gage' && <GageWheel g={g} />}
      {phase === 'end' && <EndScreen g={g} />}
      {['vote', 'revote', 'result', 'gage', 'end'].includes(phase) && (
        <>
          <FloatingReactions items={reactions.items} />
          <ReactionBar onSend={reactions.send} />
        </>
      )}
    </>
  )
}
