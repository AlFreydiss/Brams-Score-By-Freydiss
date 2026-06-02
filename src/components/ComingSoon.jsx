// Écran "Bientôt disponible" verrouillé (cadenas). Utilisable :
// - en overlay : passer onClose → rendu plein écran fixe avec bouton Retour
// - en page (route) : sans onClose → bloc centré (la navbar reste visible)
export default function ComingSoon({ title = 'Cette section', onClose }) {
  const inner = (
    <div style={{ textAlign: 'center', maxWidth: 460, padding: 24 }}>
      <div style={{ fontSize: 56, marginBottom: 18, filter: 'drop-shadow(0 6px 20px rgba(139,92,246,0.35))' }}>🔒</div>
      <h1 style={{ fontFamily: "'Pirata One', cursive", fontSize: 32, fontWeight: 900, color: '#f4f4f5', margin: '0 0 12px', letterSpacing: '-.01em' }}>{title}</h1>
      <div style={{
        display: 'inline-block', padding: '5px 15px', borderRadius: 999, marginBottom: 18,
        background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.30)',
        color: '#a78bfa', fontSize: 11.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase',
      }}>
        Bientôt disponible
      </div>
      <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.6, margin: '0 0 26px' }}>
        Cette section est en préparation. Reviens vite — on y travaille pour t'offrir le meilleur. 🏴‍☠️
      </p>
      {onClose ? (
        <button
          onClick={onClose}
          style={{ borderRadius: 11, padding: '11px 26px', fontSize: 14, fontWeight: 800, color: '#f4f4f5', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}
        >
          ← Retour
        </button>
      ) : (
        <a href="/" style={{ display: 'inline-block', borderRadius: 11, padding: '11px 26px', fontSize: 14, fontWeight: 800, color: '#f4f4f5', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', textDecoration: 'none' }}>
          ← Accueil
        </a>
      )}
    </div>
  )

  if (onClose) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: '#0b0c0e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {inner}
      </div>
    )
  }
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {inner}
    </div>
  )
}
