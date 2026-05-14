const TEAM = [
  { name: 'Brams',    role: 'Fondateur & Monteur', emoji: '👑', color: '#FFD700', desc: 'Créateur du serveur, monteur vidéo. À l\'origine de tout le projet Brams Community.' },
  { name: 'Freydiss', role: 'Admin & Développeur', emoji: '⚙️', color: '#00C2FF', desc: 'Admin du serveur et créateur du bot Brams Score. Développeur du projet.' },
  { name: 'Benactief',role: 'Admin',               emoji: '🛡️', color: '#9B59B6', desc: 'Admin du serveur. Gère la modération et l\'organisation des membres.' },
  { name: 'Berat',    role: 'Admin',               emoji: '⚔️', color: '#E0524A', desc: 'Admin principal. Organise les événements avec Brams et Freydiss.' },
  { name: 'Esco',     role: 'Admin',               emoji: '🌊', color: '#3B82F6', desc: 'Admin du serveur. Support de la communauté et gestion des membres.' },
]

export default function AboutModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'rgba(255,255,255,.07)', border: 'none', color: 'var(--muted)',
          width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏴‍☠️</div>
          <h2 style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 26, color: '#fff', marginBottom: 8 }}>
            Brams Community
          </h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
            Un serveur communautaire One Piece animé par le bot <strong style={{ color: '#fff' }}>Brams Score</strong>.
            Système de rangs vocal, économie Berry, quiz animé et bien plus.
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>
            L'équipe
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {TEAM.map(m => (
              <div key={m.name} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'var(--card2)', borderRadius: 12, padding: '12px 16px',
                border: `1px solid ${m.color}20`,
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                  background: `${m.color}15`, border: `1px solid ${m.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>{m.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: m.color, fontWeight: 600 }}>{m.role}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.5 }}>{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <a href="https://discord.gg/ez4dBTPE" target="_blank" rel="noopener noreferrer"
            className="btn btn-discord" style={{ flex: 1, justifyContent: 'center', padding: '11px 16px', fontSize: 14 }}>
            Rejoindre Discord
          </a>
          <a href="https://www.twitch.tv/bouledog_" target="_blank" rel="noopener noreferrer"
            className="btn" style={{ background: 'var(--twitch)', color: '#fff', padding: '11px 16px', fontSize: 14 }}>
            Twitch
          </a>
          <a href="https://www.youtube.com/@BouleDogg/featured" target="_blank" rel="noopener noreferrer"
            className="btn" style={{ background: '#1a1a1a', color: '#fff', border: '1px solid #333', padding: '11px 16px', fontSize: 14 }}>
            YouTube
          </a>
        </div>
      </div>
    </div>
  )
}
