// Guess Who — salle d'attente : code à partager, joueurs, lancement (hôte, 3 min.).
import { useState } from 'react'
import { type } from './manga.jsx'
import { C } from './manga.jsx'
import { Btn, PhaseFrame, PlayerChip } from './manga.jsx'

export default function Lobby({ code, g }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const link = `${location.origin}/guess-who/${code}`
  const enough = g.players.length >= 3
  const start = async () => {
    setBusy(true); setMsg(null)
    const r = await g.act.start()
    if (r?.error) setMsg(r.error === 'not_enough_players' ? 'Il faut au moins 3 joueurs.' : 'Lancement impossible, réessaie.')
    setBusy(false)
  }
  return (
    <PhaseFrame eyebrow="Guess Who" prompt={`Salon ${code}`}
      footer={g.isHost
        ? <Btn onClick={start} disabled={!enough || busy}>{enough ? 'Lancer la partie' : `En attente (${g.players.length}/3)`}</Btn>
        : <span style={{ ...type.body, color: C.textMut }}>L'hôte lance la partie…</span>}>
      <p style={{ ...type.body, color: C.textMut, margin: '0 0 14px' }}>
        Chacun écrit un gage, puis on imite des sons d'anime. Le moins voté perd une vie. 2 vies : le premier éliminé fait un gage.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <code style={{ fontSize: 28, fontWeight: 900, letterSpacing: '0.2em', color: C.gold }}>{code}</code>
        <Btn variant="ghost" onClick={() => navigator.clipboard?.writeText(link)}>Copier le lien</Btn>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {g.players.map((p) => <PlayerChip key={p.user_id} player={p} host={p.is_host} me={p.user_id === g.me?.user_id} />)}
      </div>
      {msg && <p style={{ ...type.body, color: C.danger }}>{msg}</p>}
    </PhaseFrame>
  )
}
