const DISCORD_INVITE = 'https://discord.gg/ez4dBTPE'
const ONBOARDING_URL = '#'

const STATS = [
  { value: '500+', label: 'Membres' },
  { value: '5', label: 'Rangs' },
  { value: '24/7', label: 'Bot actif' },
]

export default function Hero() {
  return (
    <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden', paddingTop: 80 }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(224,82,74,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '-5%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 680 }}>
          <div className="fade-up" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(224,82,74,0.12)', border: '1px solid rgba(224,82,74,0.25)',
            borderRadius: 100, padding: '6px 14px', marginBottom: 28,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>Serveur Discord One Piece</span>
          </div>

          <h1 className="fade-up-2" style={{
            fontFamily: 'var(--display)', fontSize: 'clamp(44px, 7vw, 76px)',
            fontWeight: 800, lineHeight: 1.05, color: '#fff',
            marginBottom: 24, letterSpacing: '-0.02em',
          }}>
            Rejoins le<br />
            <span style={{ color: 'var(--accent)' }}>Brams Community</span>
          </h1>

          <p className="fade-up-3" style={{ fontSize: 18, color: 'var(--muted)', marginBottom: 40, maxWidth: 520, lineHeight: 1.7 }}>
            Le serveur Discord One Piece animé par le bot <strong style={{ color: '#fff' }}>Buster</strong>.
            Grimpe les rangs en vocal, gagne des Berrys, affronte d'autres membres.
          </p>

          <div className="fade-up-3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 64 }}>
            <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
              Rejoindre le serveur
            </a>
            <a href={ONBOARDING_URL} className="btn btn-secondary">
              🏴‍☠️ Faire l'onboarding
            </a>
          </div>

          {/* Stats */}
          <div className="fade-up-3" style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
            {STATS.map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 800, color: '#fff' }}>{s.value}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating rank cards */}
        <div style={{
          position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 12,
          animation: 'float 4s ease-in-out infinite',
        }} className="hide-mobile">
          {[
            { emoji: '👑', rang: 'Yonkou', heures: '70h / sem', color: '#9B59B6' },
            { emoji: '🪖', rang: 'Amiral', heures: '40h / sem', color: '#F1C40F' },
            { emoji: '⚔️', rang: 'Shichibukai', heures: '25h / sem', color: '#166024' },
          ].map(r => (
            <div key={r.rang} style={{
              background: 'var(--card)', border: `1px solid ${r.color}33`,
              borderRadius: 12, padding: '12px 18px',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: `0 4px 20px ${r.color}22`,
              minWidth: 200,
            }}>
              <span style={{ fontSize: 24 }}>{r.emoji}</span>
              <div>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{r.rang}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.heures}</div>
              </div>
              <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: r.color }} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) { .hide-mobile { display: none !important; } }
      `}</style>
    </section>
  )
}
