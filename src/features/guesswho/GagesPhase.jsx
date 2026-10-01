import { useState } from 'react'
import { type } from '../../styles/typography.js'
import { C } from '../garticphone/theme.js'
import { Btn, PhaseFrame, LiveRoster } from '../garticphone/ui.jsx'

export const roster = (g, ids) => new Set(g.players.filter((p) => (ids || []).includes(p.user_id)).map((p) => p.seat))

export default function GagesPhase({ g }) {
  const [text, setText] = useState('')
  const [sent, setSent] = useState(!!g.me?.has_gage)
  const [err, setErr] = useState(null)
  const send = async () => {
    const r = await g.act.gage(text)
    if (r?.ok) { setSent(true); setErr(null) } else setErr(r?.error === 'empty' ? 'Écris un gage.' : 'Envoi impossible, réessaie.')
  }
  return (
    <PhaseFrame eyebrow="Avant de jouer" prompt="Écris un gage" remaining={g.remaining} total={g.total}
      footer={g.me && <Btn onClick={send} disabled={!text.trim()}>{sent ? 'Modifier mon gage' : 'Envoyer'}</Btn>}>
      <p style={{ ...type.body, color: C.textMut, marginTop: 0 }}>
        Il sera peut-être tiré pour le premier éliminé (jamais pour toi). Personne ne le voit avant.
      </p>
      {g.me ? (
        <>
          <textarea value={text} maxLength={140} onChange={(e) => setText(e.target.value)} rows={3}
            placeholder="Ex. : chanter l'opening de One Piece en vocal"
            style={{ width: '100%', borderRadius: 14, padding: 14, fontSize: 16, background: 'rgba(255,255,255,0.05)',
              color: C.text, border: '1px solid rgba(255,255,255,0.14)', resize: 'vertical', boxSizing: 'border-box' }} />
          <div style={{ ...type.small, color: C.textMut, textAlign: 'right' }}>{text.length}/140 {sent && '· ✓ envoyé'}</div>
        </>
      ) : <p style={{ ...type.body, color: C.textMut }}>Les joueurs écrivent leur gage…</p>}
      {err && <p style={{ ...type.body, color: C.danger }}>{err}</p>}
      <LiveRoster players={g.players} submittedSeats={roster(g, g.prog?.gaged)} meUserId={g.me?.user_id} />
    </PhaseFrame>
  )
}
