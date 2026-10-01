// Guess Who — point d'entrée : /guess-who (créer / rejoindre) ou /guess-who/:code (salon).
// Identité « planche de manga » : voir manga.jsx.
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { C, FONT_BODY, FONT_DISPLAY, GLOBAL_CSS, Btn, PhaseFrame, Waiting, MangaBackdrop, SfxBurst } from './manga.jsx'
import BarreJeu from '../../components/BarreJeu.jsx'
import { createRoom, guestId } from '../../lib/guessWhoRooms.js'
import { useGuessWhoRoom } from './useGuessWhoRoom.js'
import Lobby from './Lobby.jsx'
import GagesPhase from './GagesPhase.jsx'
import ListenPhase from './ListenPhase.jsx'
import RecordPhase from './RecordPhase.jsx'
import VotePhase from './VotePhase.jsx'
import ResultPhase from './ResultPhase.jsx'
import GageWheel from './GageWheel.jsx'
import EndScreen from './EndScreen.jsx'
import { useReactions, ReactionBar, FloatingReactions } from './Reactions.jsx'

function useIdentity() {
  const auth = useAuth()
  return useMemo(() => ({
    userId: String(auth.discordId || guestId()),
    displayName: auth.displayName || 'Invité',
    avatarUrl: auth.avatarUrl || null,
  }), [auth.discordId, auth.displayName, auth.avatarUrl])
}

const RULES = [
  ['Imite', "Un cri de technique ou un bout d'opening passe : reproduis-le au micro."],
  ['Vote', 'On réécoute tout le monde et on vote pour la meilleure imitation.'],
  ['Survis', 'Le moins voté perd une vie. À 0, tu fais le gage tiré au sort.'],
]

function Home({ identity }) {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const create = async () => {
    setBusy(true); setErr(null)
    const r = await createRoom(identity)
    setBusy(false)
    if (r.error) setErr("Le salon n'a pas pu être créé. Vérifie ta connexion et réessaie.")
    else navigate(`/guess-who/${r.code}`)
  }
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gap: 26 }}>
      {/* Couverture : le titre EST l'image. */}
      <motion.h1
        initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
        animate={{ scale: 1, rotate: -3, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 14 }}
        style={{
          margin: '10px 0 0', textAlign: 'center', fontFamily: FONT_DISPLAY, fontWeight: 400, lineHeight: 0.92,
          fontSize: 'clamp(3.6rem, 13vw, 8.5rem)', color: C.yellow, WebkitTextStroke: `4px ${C.ink}`,
          paintOrder: 'stroke fill', textShadow: `7px 7px 0 ${C.ink}`, letterSpacing: '-0.01em',
        }}>
        Guess<br />Who<span style={{ color: C.red }}>!</span>
      </motion.h1>

      <PhaseFrame tilt={0.5}>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {RULES.map(([title, text], i) => (
            <li key={title} style={{ border: `3px solid ${C.ink}`, padding: '12px 14px', background: i === 2 ? C.yellow : C.paper }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: C.ink }}>{i + 1}. {title}</div>
              <p style={{ margin: '6px 0 0', fontFamily: FONT_BODY, fontWeight: 500, fontSize: 15, lineHeight: 1.45, color: C.ink }}>{text}</p>
            </li>
          ))}
        </ol>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 22 }}>
          <Btn onClick={create} disabled={busy}>{busy ? 'Création…' : 'Créer un salon'}</Btn>
          <span style={{ fontFamily: FONT_BODY, fontWeight: 800, color: C.textMut }}>ou</span>
          <input className="gw-focus" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="CODE" aria-label="Code du salon"
            style={{
              width: 130, minHeight: 50, border: `3px solid ${C.ink}`, borderRadius: 6, padding: '0 12px',
              fontFamily: FONT_DISPLAY, fontSize: 22, letterSpacing: '0.18em', textAlign: 'center',
              background: C.paper, color: C.ink, boxSizing: 'border-box',
            }} />
          <Btn variant="ghost" disabled={code.length !== 4} onClick={() => navigate(`/guess-who/${code}`)}>Rejoindre</Btn>
        </div>
        {err && <p style={{ fontFamily: FONT_BODY, fontWeight: 700, color: C.red }}>{err}</p>}
      </PhaseFrame>
    </div>
  )
}

const REASONS = {
  started: 'La partie a déjà commencé : tu regardes en spectateur.',
  full: 'Salon complet (8 joueurs) : tu regardes en spectateur.',
  seat_taken: 'Ce compte joue déjà depuis un autre appareil : tu regardes en spectateur.',
}

const banner = { fontFamily: FONT_BODY, fontWeight: 800, textAlign: 'center', margin: '0 auto 14px', maxWidth: 820,
  background: C.yellow, border: `3px solid ${C.ink}`, padding: '8px 14px', color: C.ink }

function Room({ code, identity }) {
  const g = useGuessWhoRoom({ code, identity })
  const reactions = useReactions(code, g.status === 'ready')
  if (g.status === 'joining') return <Waiting label="Connexion au salon…" />
  if (g.status === 'error') {
    return (
      <PhaseFrame prompt="Salon introuvable">
        <p style={{ fontFamily: FONT_BODY, color: C.textMut }}>Aucun salon avec le code {code}. Vérifie le code ou crée un nouveau salon.</p>
      </PhaseFrame>
    )
  }
  const phase = g.room?.phase
  return (
    <>
      <SfxBurst phase={phase} round={g.room?.round} />
      {g.spectator && <p style={banner}>{REASONS[g.reason] || 'Mode spectateur.'}</p>}
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

export default function GuessWhoPage() {
  const { code } = useParams()
  const identity = useIdentity()
  return (
    <div style={{ position: 'relative', minHeight: '100dvh', padding: 'clamp(12px,3vw,32px)', fontFamily: FONT_BODY }}>
      <style>{GLOBAL_CSS}</style>
      <MangaBackdrop />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <BarreJeu titre="Guess Who" skin="manga" />
      </div>
      <div style={{ position: 'relative', zIndex: 1, marginTop: 22, paddingBottom: 120 }}>
        {code ? <Room code={code.toUpperCase()} identity={identity} /> : <Home identity={identity} />}
      </div>
    </div>
  )
}
