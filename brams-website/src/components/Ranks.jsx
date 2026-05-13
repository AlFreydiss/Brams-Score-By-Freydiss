const RANKS = [
  { emoji: '🏴‍☠️', name: 'Pirate',         hours: '10h',  color: '#2ECC71', desc: 'Les débuts de l\'aventure. Tu es là, c\'est déjà quelque chose.' },
  { emoji: '⚔️',   name: 'Shichibukai',    hours: '25h',  color: '#166024', desc: 'Tu t\'imposes. Le serveur commence à te connaître.' },
  { emoji: '🪖',   name: 'Amiral',         hours: '40h',  color: '#F1C40F', desc: 'Présence solide, respect acquis. Les Marines te craignent.' },
  { emoji: '👑',   name: 'Yonkou',         hours: '70h',  color: '#9B59B6', desc: 'Elite du serveur. Une des grandes puissances du Brams.' },
  { emoji: '🤴',   name: 'Roi des Pirates',hours: '150h', color: '#FFD700', desc: 'Le sommet. Celui qui a tout trouvé — le classement et le respect.' },
]

export default function Ranks() {
  return (
    <section id="rangs" style={{ background: 'var(--surface)' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="section-label">Système de progression</div>
          <h2 className="section-title" style={{ margin: '0 auto 16px' }}>Grimpe les rangs</h2>
          <p className="section-sub" style={{ margin: '0 auto' }}>
            Plus tu passes de temps en vocal sur le serveur, plus tu montes. Les rangs se cumulent — une fois Pirate, toujours Pirate.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 700, margin: '0 auto' }}>
          {RANKS.map((r, i) => (
            <div key={r.name} style={{
              display: 'flex', alignItems: 'center', gap: 20,
              background: 'var(--card)', borderRadius: 12,
              padding: '18px 24px',
              border: `1px solid ${r.color}22`,
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'default',
              animationDelay: `${i * 0.08}s`,
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateX(6px)'
                e.currentTarget.style.boxShadow = `0 4px 24px ${r.color}22`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateX(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: `${r.color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0,
              }}>{r.emoji}</div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, color: '#fff' }}>{r.name}</span>
                  <span style={{
                    background: `${r.color}20`, color: r.color,
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                    border: `1px solid ${r.color}40`,
                  }}>{r.hours} / semaine</span>
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>{r.desc}</div>
              </div>

              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: r.color, flexShrink: 0,
                boxShadow: `0 0 8px ${r.color}`,
              }} />
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: 'var(--muted)' }}>
          Les heures vocales sont comptées sur les 7 derniers jours. Le compteur se renouvelle chaque semaine.
        </p>
      </div>
    </section>
  )
}
