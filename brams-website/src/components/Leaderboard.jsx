const MOCK = [
  { pos: 1, name: 'Freydiss',   rang: 'Roi des pirates', emoji: '🤴', hours: '187h', berrys: '4 200 000', color: '#FFD700' },
  { pos: 2, name: 'ZoroLover',  rang: 'Yonkou',          emoji: '👑', hours: '98h',  berrys: '1 850 000', color: '#9B59B6' },
  { pos: 3, name: 'Nakama99',   rang: 'Yonkou',          emoji: '👑', hours: '76h',  berrys: '1 230 000', color: '#9B59B6' },
  { pos: 4, name: 'LuffyFan',   rang: 'Amiral',          emoji: '🪖', hours: '54h',  berrys: '780 000',   color: '#F1C40F' },
  { pos: 5, name: 'SankuPrime', rang: 'Amiral',          emoji: '🪖', hours: '47h',  berrys: '620 000',   color: '#F1C40F' },
  { pos: 6, name: 'TobiRoronoa',rang: 'Shichibukai',     emoji: '⚔️', hours: '31h',  berrys: '340 000',   color: '#166024' },
  { pos: 7, name: 'AcePower',   rang: 'Shichibukai',     emoji: '⚔️', hours: '27h',  berrys: '210 000',   color: '#166024' },
  { pos: 8, name: 'Nami_Berry', rang: 'Pirate',          emoji: '🏴‍☠️', hours: '14h',  berrys: '95 000',    color: '#2ECC71' },
]

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function Leaderboard() {
  return (
    <section id="classement" style={{ background: 'var(--surface)' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="section-label">Top membres</div>
          <h2 className="section-title" style={{ margin: '0 auto 16px' }}>Classement</h2>
          <p className="section-sub" style={{ margin: '0 auto' }}>
            Les membres les plus actifs en vocal cette semaine. Mis à jour en temps réel par Buster.
          </p>
        </div>

        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '48px 1fr 120px 140px',
            padding: '8px 20px', marginBottom: 6,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--muted)',
          }}>
            <span>#</span><span>Membre</span><span style={{ textAlign: 'right' }}>Heures</span><span style={{ textAlign: 'right' }}>Berrys</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {MOCK.map((m, i) => (
              <div key={m.name} style={{
                display: 'grid', gridTemplateColumns: '48px 1fr 120px 140px',
                alignItems: 'center',
                background: m.pos <= 3 ? `${m.color}08` : 'var(--card)',
                border: m.pos <= 3 ? `1px solid ${m.color}22` : '1px solid var(--border)',
                borderRadius: 10, padding: '14px 20px',
                transition: 'transform 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
              >
                <span style={{ fontSize: m.pos <= 3 ? 20 : 14, fontWeight: 700, color: m.pos <= 3 ? m.color : 'var(--muted)' }}>
                  {MEDALS[m.pos] ?? m.pos}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: `${m.color}22`, border: `1px solid ${m.color}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, flexShrink: 0,
                  }}>{m.emoji}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.rang}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontWeight: 600, fontSize: 14, color: '#fff' }}>{m.hours}</div>
                <div style={{ textAlign: 'right', fontWeight: 600, fontSize: 14, color: 'var(--gold)' }}>{m.berrys} ฿</div>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--muted)' }}>
            Données mises à jour toutes les heures via le bot Buster · Rejoins le serveur pour apparaître ici
          </p>
        </div>
      </div>
    </section>
  )
}
