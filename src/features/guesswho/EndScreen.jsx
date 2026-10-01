import { useNavigate } from 'react-router-dom'
import { C, FONT_BODY, FONT_DISPLAY, Btn, PhaseFrame } from './manga.jsx'
import { AvatarName, Lives } from './ui.jsx'

// Dernière page du chapitre : le meilleur imitateur en couverture, le reste en liste.
export default function EndScreen({ g }) {
  const navigate = useNavigate()
  const rows = [...g.players].filter((p) => p.seat != null).sort((a, b) => b.total_votes - a.total_votes)
  const [best, ...rest] = rows
  return (
    <PhaseFrame eyebrow="Fin du chapitre" prompt="Meilleur imitateur" tilt={0.4}
      footer={
        <>
          <Btn variant="ghost" onClick={() => navigate('/guess-who')}>Quitter</Btn>
          {g.isHost && <Btn onClick={() => g.act.start()}>Rejouer</Btn>}
        </>
      }>
      {best && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: 16, marginBottom: 14,
          background: C.yellow, border: `3px solid ${C.ink}`, boxShadow: `6px 6px 0 ${C.ink}`,
        }}>
          <span aria-hidden style={{ fontSize: 44 }}>🏆</span>
          <div style={{ flex: 1, minWidth: 0 }}><AvatarName player={best} size={64} /></div>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: C.ink }}>{best.total_votes} vote{best.total_votes > 1 ? 's' : ''}</span>
        </div>
      )}
      <div style={{ display: 'grid', gap: 8 }}>
        {rest.map((p) => (
          <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', border: `3px solid ${C.ink}`, background: C.paper }}>
            <div style={{ flex: 1, minWidth: 0 }}><AvatarName player={p} size={36} /></div>
            <span style={{ fontFamily: FONT_BODY, fontWeight: 800, color: C.ink }}>{p.total_votes} vote{p.total_votes > 1 ? 's' : ''}</span>
            <Lives lives={p.lives} />
          </div>
        ))}
      </div>
      {!g.isHost && <p style={{ fontFamily: FONT_BODY, fontWeight: 700, color: C.textMut }}>L'hôte peut relancer une partie.</p>}
    </PhaseFrame>
  )
}
