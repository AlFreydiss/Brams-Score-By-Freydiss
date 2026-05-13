export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      padding: '32px 24px',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🏴‍☠️</span>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 700, color: '#fff' }}>Brams Community</span>
        </div>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          Fait avec ❤️ par <strong style={{ color: '#fff' }}>Freydiss</strong> · Bot Buster
        </span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>© 2025</span>
      </div>
    </footer>
  )
}
