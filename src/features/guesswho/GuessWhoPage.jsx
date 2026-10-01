// Guess Who — point d'entrée : /guess-who (créer / rejoindre) ou /guess-who/:code (salon).
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { type } from '../../styles/typography.js'
import { C, pageBg, dotGrid, KEYFRAMES } from '../garticphone/theme.js'
import { Btn, PhaseFrame, Waiting } from '../garticphone/ui.jsx'
import BarreJeu from '../../components/BarreJeu.jsx'
import { createRoom, guestId } from '../../lib/guessWhoRooms.js'
import { useGuessWhoRoom } from './useGuessWhoRoom.js'
import Lobby from './Lobby.jsx'

function useIdentity() {
  const auth = useAuth()
  return useMemo(() => ({
    userId: String(auth.discordId || guestId()),
    displayName: auth.displayName || 'Invité',
    avatarUrl: auth.avatarUrl || null,
  }), [auth.discordId, auth.displayName, auth.avatarUrl])
}

function Home({ identity }) {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const create = async () => {
    setBusy(true); setErr(null)
    const r = await createRoom(identity)
    setBusy(false)
    if (r.error) setErr('Création impossible, réessaie.')
    else navigate(`/guess-who/${r.code}`)
  }
  return (
    <PhaseFrame eyebrow="Jeu multijoueur" prompt="Guess Who 🎤">
      <p style={{ ...type.body, color: C.textMut }}>
        Un son culte d'anime passe, tout le monde l'imite au micro, puis on vote pour la meilleure imitation.
        Le moins voté perd une vie. 2 vies : le premier éliminé fait le gage tiré au sort.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
        <Btn onClick={create} disabled={busy}>Créer un salon</Btn>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))} placeholder="CODE"
          aria-label="Code du salon" style={{ width: 120, minHeight: 48, borderRadius: 14, padding: '0 14px', fontSize: 20,
            fontWeight: 900, letterSpacing: '0.2em', textAlign: 'center', background: 'rgba(255,255,255,0.06)', color: C.text,
            border: '1px solid rgba(255,255,255,0.14)' }} />
        <Btn variant="ghost" disabled={code.length !== 4} onClick={() => navigate(`/guess-who/${code}`)}>Rejoindre</Btn>
      </div>
      {err && <p style={{ ...type.body, color: C.danger }}>{err}</p>}
    </PhaseFrame>
  )
}

const REASONS = {
  started: 'La partie a déjà commencé : tu regardes en spectateur.',
  full: 'Salon complet (8 joueurs) : tu regardes en spectateur.',
  seat_taken: 'Ce compte joue déjà depuis un autre appareil : tu regardes en spectateur.',
}

function Room({ code, identity }) {
  const g = useGuessWhoRoom({ code, identity })
  if (g.status === 'joining') return <Waiting label="Connexion au salon…" />
  if (g.status === 'error') return <PhaseFrame prompt="Salon introuvable"><p style={{ ...type.body, color: C.textMut }}>Vérifie le code.</p></PhaseFrame>
  const phase = g.room?.phase
  return (
    <>
      {g.spectator && <p style={{ ...type.small, color: C.warn, textAlign: 'center' }}>{REASONS[g.reason] || 'Mode spectateur.'}</p>}
      {phase === 'lobby' && <Lobby code={code} g={g} />}
      {phase !== 'lobby' && <PhaseFrame prompt="Partie en cours…" />}
    </>
  )
}

export default function GuessWhoPage() {
  const { code } = useParams()
  const identity = useIdentity()
  return (
    <div style={{ ...pageBg, minHeight: '100dvh', padding: 'clamp(12px,3vw,32px)' }}>
      <style>{KEYFRAMES}</style>
      <div aria-hidden style={dotGrid} />
      <BarreJeu titre="Guess Who" />
      <div style={{ position: 'relative', marginTop: 18 }}>
        {code ? <Room code={code.toUpperCase()} identity={identity} /> : <Home identity={identity} />}
      </div>
    </div>
  )
}
