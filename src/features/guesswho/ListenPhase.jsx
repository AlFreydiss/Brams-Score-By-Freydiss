import { useState } from 'react'
import { type } from './manga.jsx'
import { C } from './manga.jsx'
import { Btn, PhaseFrame } from './manga.jsx'
import { ClipPlayer } from './ui.jsx'

export default function ListenPhase({ g }) {
  const clip = g.room?.clip
  const [broken, setBroken] = useState(false)
  if (!clip) {
    return (
      <PhaseFrame prompt="Aucun son disponible">
        <p style={{ ...type.body, color: C.textMut }}>La bibliothèque de sons est vide pour l'instant.</p>
      </PhaseFrame>
    )
  }
  return (
    <PhaseFrame eyebrow={`Tour ${g.room.round} · Écoute bien`} prompt={clip.title} remaining={g.remaining} total={g.total}
      footer={g.isHost && broken && <Btn variant="ghost" onClick={() => { setBroken(false); g.act.skip() }}>Changer de son</Btn>}>
      <p style={{ ...type.body, color: C.textMut, marginTop: 0 }}>
        {clip.anime} · {clip.lang === 'fr' ? 'VF' : 'VO'} — tu devras le reproduire juste après.
      </p>
      <ClipPlayer key={clip.id} url={clip.url} label={clip.title} big autoPlay onError={() => setBroken(true)} />
      {broken && <p style={{ ...type.body, color: C.warn }}>Le son ne charge pas. {g.isHost ? 'Tu peux en changer.' : "L'hôte peut en changer."}</p>}
    </PhaseFrame>
  )
}
