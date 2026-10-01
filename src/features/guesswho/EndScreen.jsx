import { useNavigate } from 'react-router-dom'
import { type } from '../../styles/typography.js'
import { C } from '../garticphone/theme.js'
import { Btn, PhaseFrame } from '../garticphone/ui.jsx'
import { AvatarName, Lives } from './ui.jsx'

export default function EndScreen({ g }) {
  const navigate = useNavigate()
  const rows = [...g.players].filter((p) => p.seat != null).sort((a, b) => b.total_votes - a.total_votes)
  const best = rows[0]
  return (
    <PhaseFrame eyebrow="Fin de partie" prompt={best ? `🏆 ${best.display_name}, meilleur imitateur` : 'Fin de partie'}
      footer={
        <>
          <Btn variant="ghost" onClick={() => navigate('/guess-who')}>Quitter</Btn>
          {g.isHost && <Btn onClick={() => g.act.start()}>Rejouer</Btn>}
        </>
      }>
      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map((p) => (
          <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.04)' }}>
            <div style={{ flex: 1, minWidth: 0 }}><AvatarName player={p} /></div>
            <span style={{ ...type.body, color: C.textMut }}>{p.total_votes} vote{p.total_votes > 1 ? 's' : ''}</span>
            <Lives lives={p.lives} />
          </div>
        ))}
      </div>
      {!g.isHost && <p style={{ ...type.small, color: C.textMut }}>L'hôte peut relancer une partie.</p>}
    </PhaseFrame>
  )
}
