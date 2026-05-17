
const CSS = `
@keyframes waveScroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes lockBounce {
  0%,100% { transform: translateY(0) rotate(-3deg); }
  50%     { transform: translateY(-10px) rotate(3deg); }
}
@keyframes guardIn {
  from { opacity: 0; transform: scale(1.04); }
  to   { opacity: 1; transform: scale(1); }
}
`

function WavesBg() {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 180, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <div style={{
        display: 'flex', width: '200%',
        animation: 'waveScroll 12s linear infinite',
      }}>
        {[0, 1].map(k => (
          <svg key={k} viewBox="0 0 1200 120" style={{ width: '50%', height: 180, flexShrink: 0 }} preserveAspectRatio="none">
            <path d="M0,60 C150,100 350,20 600,60 C850,100 1050,20 1200,60 L1200,120 L0,120 Z" fill="rgba(0,80,160,0.12)" />
            <path d="M0,80 C200,40 400,100 600,80 C800,60 1000,100 1200,80 L1200,120 L0,120 Z" fill="rgba(0,60,120,0.08)" />
          </svg>
        ))}
      </div>
    </div>
  )
}

function openAuthModal() {
  document.dispatchEvent(new CustomEvent('open-auth-modal'))
}

export default function AuthGuard({ onClose, feature = 'ce contenu' }) {

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'linear-gradient(180deg, #0a0b0e 0%, #111520 50%, #0d1520 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        animation: 'guardIn 0.3s ease-out both',
        overflow: 'hidden',
      }}>
        {/* Bouton fermer */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 20, right: 20,
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 9, color: '#fff', cursor: 'pointer', padding: '8px 16px',
          fontSize: 13, fontWeight: 700, zIndex: 10, transition: 'background .15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
        >← Retour</button>

        {/* Orbes déco */}
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,82,74,0.06), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(88,101,242,0.06), transparent 70%)', pointerEvents: 'none' }} />

        {/* Étoiles */}
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: `${Math.random() * 80}%`,
            left: `${Math.random() * 100}%`,
            width: 1 + Math.random() * 2,
            height: 1 + Math.random() * 2,
            borderRadius: '50%',
            background: '#fff',
            opacity: 0.1 + Math.random() * 0.3,
            animation: `pulse ${2 + Math.random() * 3}s ${Math.random() * 2}s ease-in-out infinite`,
            pointerEvents: 'none',
          }} />
        ))}

        <WavesBg />

        {/* Contenu principal */}
        <div style={{
          position: 'relative', zIndex: 2,
          maxWidth: 560, width: '90%', textAlign: 'center',
          padding: '0 24px',
        }}>
          {/* Icône cadenas/crâne */}
          <div style={{ fontSize: 80, marginBottom: 16, animation: 'lockBounce 3s ease-in-out infinite', display: 'inline-block' }}>
            ☠️
          </div>

          {/* Wanted poster style card */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(244,228,188,0.06), rgba(200,160,60,0.04))',
            border: '1px solid rgba(255,215,0,0.2)',
            borderRadius: 4,
            padding: '6px 20px',
            display: 'inline-block', marginBottom: 32,
          }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.2em', color: 'rgba(255,215,0,0.7)' }}>
              ZONE RÉSERVÉE
            </div>
          </div>

          <h1 style={{
            fontFamily: "'Pirata One', cursive",
            fontSize: 'clamp(28px, 5vw, 52px)',
            color: '#fff', lineHeight: 1.1,
            marginBottom: 20,
          }}>
            Accès<br />
            <span style={{
              fontFamily: "'Pirata One', cursive",
              background: 'linear-gradient(135deg, #E0524A, #ff8a50)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Équipage uniquement
            </span>
          </h1>

          <p style={{
            fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, marginBottom: 12,
            maxWidth: 420, margin: '0 auto 12px',
          }}>
            Pour accéder à <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{feature}</strong>, tu dois faire partie de l'équipage.
          </p>
          <p style={{
            fontSize: 14, color: 'rgba(255,215,0,0.6)', lineHeight: 1.6, marginBottom: 40,
            fontStyle: 'italic',
          }}>
            « Seuls les nakamas de Brams Community ont accès au Grand Line. »
          </p>

          {/* Bouton connexion */}
          <button
            onClick={() => { onClose(); openAuthModal() }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '14px 36px', fontSize: 15, fontWeight: 800,
              background: '#d4a017',
              border: 'none',
              borderRadius: 12, color: '#1a1f2e', cursor: 'pointer',
              letterSpacing: '.03em', fontFamily: 'var(--body)',
              boxShadow: '0 4px 24px rgba(212,160,23,0.35)',
              transition: 'all .2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#e5b83a'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(212,160,23,0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#d4a017'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(212,160,23,0.35)'
            }}
          >
            <span>Se connecter</span>
            <span style={{ fontSize: 16 }}>→</span>
          </button>

          {/* Security note */}
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 20, letterSpacing: '.04em' }}>
            🔒 Connexion sécurisée via Discord OAuth · Aucun mot de passe requis
          </p>
        </div>
      </div>
    </>
  )
}
