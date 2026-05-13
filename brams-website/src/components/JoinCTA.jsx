const DISCORD_INVITE = 'https://discord.gg/ez4dBTPE'

export default function JoinCTA() {
  return (
    <section style={{ padding: '80px 0' }}>
      <div className="container">
        <div style={{
          background: 'linear-gradient(135deg, rgba(224,82,74,0.15) 0%, rgba(155,89,182,0.1) 100%)',
          border: '1px solid rgba(224,82,74,0.2)',
          borderRadius: 20, padding: 'clamp(40px, 6vw, 72px)',
          textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)',
            width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(224,82,74,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🏴‍☠️</div>
            <h2 style={{
              fontFamily: 'var(--display)', fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 800, color: '#fff', marginBottom: 16, lineHeight: 1.15,
            }}>
              Prêt à embarquer ?
            </h2>
            <p style={{ fontSize: 16, color: 'var(--muted)', marginBottom: 36, maxWidth: 460, margin: '0 auto 36px' }}>
              Rejoins Brams Community, fais ton onboarding et commence à grimper les rangs dès aujourd'hui.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ fontSize: 16, padding: '14px 32px' }}>
                Rejoindre Discord ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
