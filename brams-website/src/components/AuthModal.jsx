import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'

const DISCORD_BLUE = '#5865F2'
const DISCORD_DARK = '#4752C4'

export default function AuthModal({ onClose }) {
  const { signInWithDiscord } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleDiscord() {
    setLoading(true)
    setError('')
    const { error } = await signInWithDiscord()
    if (error) {
      setError(error.message || 'Erreur lors de la connexion Discord.')
      setLoading(false)
    }
    // Pas de setLoading(false) si succès — l'utilisateur est redirigé vers Discord
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.78)',
        backdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'linear-gradient(145deg, #13151A, #1A1D26)',
          border: '1px solid rgba(255,215,0,0.18)',
          borderRadius: 20,
          padding: '40px 36px 36px',
          width: '100%', maxWidth: 420,
          boxShadow: '0 28px 80px rgba(0,0,0,0.75), 0 0 50px rgba(88,101,242,0.08)',
          animation: 'scaleIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
          textAlign: 'center',
        }}
      >
        {/* Bande top */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, #E0524A, ${DISCORD_BLUE}, #E0524A)`,
          borderRadius: '20px 20px 0 0',
        }} />

        {/* Fermer */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 8, color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
        >
          ✕
        </button>

        {/* Logo + titre */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🏴‍☠️</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20, color: '#fff', marginBottom: 4 }}>
            Brams Community
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>
            Connecte-toi pour accéder au Grand Line
          </div>
        </div>

        {/* Séparateur décoratif */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28,
          color: 'rgba(255,215,0,0.2)',
        }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,215,0,0.12)' }} />
          <span style={{ fontFamily: 'var(--display)', fontSize: 10, letterSpacing: '0.14em', color: 'rgba(255,215,0,0.35)' }}>
            CONNEXION VIA
          </span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,215,0,0.12)' }} />
        </div>

        {/* Bouton Discord */}
        <button
          onClick={handleDiscord}
          disabled={loading}
          style={{
            width: '100%',
            padding: '15px 20px',
            borderRadius: 12,
            border: 'none',
            background: loading ? `${DISCORD_DARK}99` : DISCORD_BLUE,
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            transition: 'all .2s',
            boxShadow: loading ? 'none' : `0 4px 24px ${DISCORD_BLUE}55`,
            letterSpacing: '0.02em',
            fontFamily: 'var(--body)',
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = DISCORD_DARK; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${DISCORD_BLUE}77` } }}
          onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = DISCORD_BLUE; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 24px ${DISCORD_BLUE}55` } }}
        >
          {/* Icône Discord SVG */}
          {!loading && (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          )}
          {loading
            ? <><span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Connexion en cours…</>
            : 'Se connecter avec Discord'
          }
        </button>

        {/* Message d'erreur */}
        {error && (
          <div style={{
            marginTop: 14,
            background: 'rgba(224,82,74,0.1)',
            border: '1px solid rgba(224,82,74,0.3)',
            borderRadius: 8, padding: '10px 14px',
            fontSize: 13, color: '#ff8a7a',
          }}>
            {error}
          </div>
        )}

        {/* Note légale */}
        <p style={{
          marginTop: 20, fontSize: 11,
          color: 'rgba(255,255,255,0.2)',
          letterSpacing: '0.03em', lineHeight: 1.6,
        }}>
          Tu seras redirigé vers Discord pour autoriser l'accès.
          <br />Aucun mot de passe n'est stocké sur nos serveurs.
        </p>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        `}</style>
      </div>
    </div>
  )
}
