import { useState } from 'react'

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

import { useAuth } from '../contexts/AuthContext.jsx'

const DISCORD_BLUE = '#5865F2'
const DISCORD_DARK = '#4752C4'

export default function AuthGuard({ onClose, feature = 'ce contenu' }) {
  const { signInWithDiscord } = useAuth()
  const [loading, setLoading] = useState(false)

  async function handleDiscord() {
    setLoading(true)
    await signInWithDiscord()
    // redirect happens; no need to setLoading(false)
  }

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

          {/* Bouton Discord */}
          <button
            onClick={handleDiscord}
            disabled={loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 12,
              padding: '14px 36px', fontSize: 15, fontWeight: 700,
              background: loading ? `${DISCORD_DARK}99` : DISCORD_BLUE,
              border: 'none',
              borderRadius: 12, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '.02em', fontFamily: 'var(--body)',
              boxShadow: loading ? 'none' : `0 4px 24px ${DISCORD_BLUE}55`,
              transition: 'all .2s',
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = DISCORD_DARK; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${DISCORD_BLUE}77` } }}
            onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = DISCORD_BLUE; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 24px ${DISCORD_BLUE}55` } }}
          >
            {loading ? (
              <><span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} /> Connexion…</>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                Se connecter avec Discord
              </>
            )}
          </button>

          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 20, letterSpacing: '.04em' }}>
            Connexion sécurisée via Discord OAuth · Aucun mot de passe requis
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    </>
  )
}
