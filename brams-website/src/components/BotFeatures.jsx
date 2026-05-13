const FEATURES = [
  {
    emoji: '💰', title: 'Économie Berry',
    desc: 'Gagne des Berrys en étant actif en vocal. Dépose-les en banque, fais des virements, joue en bourse.',
    commands: ['/banque', '/virement', '/retrait'],
    color: '#FFD700',
  },
  {
    emoji: '🃏', title: 'Carte Wanted',
    desc: 'Génère ta fiche d\'avis de recherche personnalisée avec ta prime, ton rang et ton portrait.',
    commands: ['/wanted', '/monprofil'],
    color: '#E0524A',
  },
  {
    emoji: '🎯', title: 'Quiz Animé',
    desc: 'Des questions sur One Piece, Naruto, Dragon Ball et des dizaines d\'autres animes. Teste ta culture.',
    commands: ['/quizz'],
    color: '#34D399',
  },
  {
    emoji: '⚔️', title: 'Duels',
    desc: 'Défie un membre et mise des Berrys. Le vainqueur remporte la mise. Combats en 1v1.',
    commands: ['/duel'],
    color: '#9B59B6',
  },
  {
    emoji: '🏦', title: 'Banque & Coffre',
    desc: 'Gère ton coffre, surveille tes revenus passifs et ta fortune accumulée semaine après semaine.',
    commands: ['/banque', '/coffre'],
    color: '#3B82F6',
  },
  {
    emoji: '📊', title: 'Stats vocales',
    desc: 'Suis tes heures vocales en temps réel. Vois combien il te reste pour atteindre le rang suivant.',
    commands: ['/stats', '/classement'],
    color: '#F97316',
  },
]

export default function BotFeatures() {
  return (
    <section id="bot-buster">
      <div className="container">
        <div style={{ marginBottom: 56 }}>
          <div className="section-label">Bot Buster</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 className="section-title">Tout ce que Buster peut faire</h2>
              <p className="section-sub">Un bot custom développé pour Brams Community. Économie, duels, quiz, profils — tout est là.</p>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)',
              borderRadius: 10, padding: '8px 16px',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px #34d399' }} />
              <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>Buster en ligne</span>
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: 'var(--card)', borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              padding: '24px',
              transition: 'border-color 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${f.color}44`
                e.currentTarget.style.transform = 'translateY(-3px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 12,
                background: `${f.color}15`, border: `1px solid ${f.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, marginBottom: 16,
              }}>{f.emoji}</div>

              <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, color: '#fff', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 16 }}>{f.desc}</p>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {f.commands.map(cmd => (
                  <span key={cmd} style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '3px 9px',
                    fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace',
                  }}>{cmd}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
