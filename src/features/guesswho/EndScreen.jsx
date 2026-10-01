import { useNavigate } from 'react-router-dom'
import { C, FONT_BODY, FONT_DISPLAY, Btn, PhaseFrame } from './manga.jsx'
import { AvatarName, ClipPlayer, Lives } from './ui.jsx'
import { bestHighlight } from './logic/highlights.js'

// Dernière page du chapitre : le meilleur imitateur en couverture, le reste en liste.
export default function EndScreen({ g }) {
  const navigate = useNavigate()
  const rows = [...g.players].filter((p) => p.seat != null).sort((a, b) => b.total_votes - a.total_votes)
  const [best, ...rest] = rows
  const top = bestHighlight(g.highlights)
  const topPlayer = top && g.players.find((p) => p.user_id === top.user_id)
  const share = async () => {
    const text = `🎤 Meilleure imitation de la partie Guess Who : ${topPlayer?.display_name} sur « ${top.clip} »`
    try {
      if (navigator.share && top.audio_url.startsWith('https://')) await navigator.share({ title: 'Guess Who', text, url: top.audio_url })
      else await navigator.clipboard?.writeText(top.audio_url.startsWith('https://') ? `${text} ${top.audio_url}` : text)
    } catch { /* partage annulé */ }
  }
  return (
    <PhaseFrame eyebrow="Fin du chapitre" prompt="Meilleur imitateur" tilt={0.4}
      footer={
        <>
          <Btn variant="ghost" onClick={() => navigate('/guess-who')}>Quitter</Btn>
          {g.isHost && <Btn onClick={() => g.act.start(g.room?.settings)}>Rejouer</Btn>}
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
      {top && (
        <div style={{ border: `3px solid ${C.ink}`, background: C.ink, color: C.paper, padding: 16, marginBottom: 14, display: 'grid', gap: 12 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(1.3rem,3.5vw,1.8rem)', color: C.yellow }}>🔁 L'imitation de la partie</div>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 700 }}>
            {topPlayer?.display_name || 'Un joueur'} sur « {top.clip} » · tour {top.round} · {top.votes} vote{top.votes > 1 ? 's' : ''}
          </div>
          <div style={{ background: C.paper, padding: 10, border: `3px solid ${C.ink}` }}><ClipPlayer url={top.audio_url} label="l'imitation de la partie" big /></div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={top.audio_url} download={`guesswho-${(topPlayer?.display_name || 'imitation').replace(/[^a-z0-9]+/gi, '-')}.${top.audio_url.includes('mp4') ? 'm4a' : 'webm'}`}
              className="gw-btn" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 46, padding: '0 18px', background: C.yellow, color: C.ink, border: `3px solid ${C.paper}`, fontFamily: FONT_DISPLAY, textDecoration: 'none' }}>Télécharger</a>
            <Btn variant="sea" onClick={share}>Partager</Btn>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gap: 8 }}>
        {rest.map((p) => (
          <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', border: `3px solid ${C.ink}`, background: C.paper }}>
            <div style={{ flex: 1, minWidth: 0 }}><AvatarName player={p} size={36} /></div>
            <span style={{ fontFamily: FONT_BODY, fontWeight: 800, color: C.ink }}>{p.total_votes} vote{p.total_votes > 1 ? 's' : ''}</span>
            <Lives lives={p.lives} max={g.maxLives} />
          </div>
        ))}
      </div>
      {!g.isHost && <p style={{ fontFamily: FONT_BODY, fontWeight: 700, color: C.textMut }}>L'hôte peut relancer une partie.</p>}
    </PhaseFrame>
  )
}
