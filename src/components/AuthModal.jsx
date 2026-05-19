import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'

const DISCORD_BLUE = '#5865F2'
const DISCORD_DARK = '#4752C4'
const GOLD         = '#d4a017'

const DiscordIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
)

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontSize: 14, fontFamily: 'var(--body)', outline: 'none',
  boxSizing: 'border-box', transition: 'border .15s',
}

export default function AuthModal({ onClose }) {
  const { signInWithDiscord, signIn, signUp } = useAuth()

  const [tab,     setTab]     = useState('discord') // 'discord' | 'email'
  const [mode,    setMode]    = useState('login')   // 'login' | 'signup'
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')

  useEffect(() => {
    const storedError = localStorage.getItem('brams_auth_error')
    if (!storedError) return
    setError(storedError)
    localStorage.removeItem('brams_auth_error')
  }, [])

  async function handleDiscord() {
    setLoading(true); setError('')
    const { error } = await signInWithDiscord()
    if (error) { setError(error.message || 'Erreur Discord.'); setLoading(false) }
  }

  async function handleEmail(e) {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) { setError(error.message || 'Identifiants incorrects.'); setLoading(false) }
      else { onClose() }
    } else {
      const { error } = await signUp(email, password, name)
      if (error) { setError(error.message || 'Erreur lors de l\'inscription.'); setLoading(false) }
      else {
        setSuccess('Inscription réussie ! Vérifie ton email pour confirmer ton compte.')
        setLoading(false)
      }
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, animation: 'authFadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'linear-gradient(145deg, #13151A, #1A1D26)',
          border: '1px solid rgba(255,215,0,0.18)',
          borderRadius: 20, padding: '40px 36px 36px',
          width: '100%', maxWidth: 420,
          boxShadow: '0 28px 80px rgba(0,0,0,0.75)',
          animation: 'authScaleIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
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
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 8, color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, transition: 'all .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
        >✕</button>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🏴‍☠️</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20, color: '#fff', marginBottom: 3 }}>
            Brams Community
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>
            Connecte-toi pour accéder au Grand Line
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.04)',
          borderRadius: 10, padding: 4, marginBottom: 24, gap: 4,
        }}>
          {[['discord', 'Discord'], ['email', 'Email / Mot de passe']].map(([t, label]) => (
            <button key={t} onClick={() => { setTab(t); setError(''); setSuccess('') }}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--body)',
                transition: 'all .18s',
                background: tab === t ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: tab === t ? '#fff' : 'rgba(255,255,255,0.4)',
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
              }}
            >{label}</button>
          ))}
        </div>

        {/* ── TAB DISCORD ── */}
        {tab === 'discord' && (
          <>
            <button onClick={handleDiscord} disabled={loading} style={{
              width: '100%', padding: '15px 20px', borderRadius: 12, border: 'none',
              background: loading ? `${DISCORD_DARK}99` : DISCORD_BLUE,
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              transition: 'all .2s', letterSpacing: '.02em', fontFamily: 'var(--body)',
              boxShadow: loading ? 'none' : `0 4px 24px ${DISCORD_BLUE}55`,
            }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = DISCORD_DARK; e.currentTarget.style.transform = 'translateY(-2px)' } }}
              onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = DISCORD_BLUE; e.currentTarget.style.transform = 'translateY(0)' } }}
            >
              {loading
                ? <><Spinner /> Connexion en cours…</>
                : <><DiscordIcon /> Se connecter avec Discord</>
              }
            </button>
            <p style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '.03em', lineHeight: 1.6 }}>
              Tu seras redirigé vers Discord pour autoriser l'accès.
            </p>
          </>
        )}

        {/* ── TAB EMAIL ── */}
        {tab === 'email' && (
          <>
            {/* Toggle login/signup */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
              {[['login', 'Connexion'], ['signup', 'Inscription']].map(([m, label]) => (
                <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }} style={{
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--body)',
                  fontSize: 13, fontWeight: 700, letterSpacing: '.04em', padding: '4px 0',
                  color: mode === m ? GOLD : 'rgba(255,255,255,0.3)',
                  borderBottom: mode === m ? `2px solid ${GOLD}` : '2px solid transparent',
                  transition: 'all .15s',
                }}>{label}</button>
              ))}
            </div>

            <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
              {mode === 'signup' && (
                <input
                  type="text" placeholder="Nom d'affichage" value={name}
                  onChange={e => setName(e.target.value)} required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = `${GOLD}66`}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              )}
              <input
                type="email" placeholder="Adresse email" value={email}
                onChange={e => setEmail(e.target.value)} required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = `${GOLD}66`}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <input
                type="password" placeholder="Mot de passe" value={password}
                onChange={e => setPassword(e.target.value)} required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = `${GOLD}66`}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />

              <button type="submit" disabled={loading} style={{
                marginTop: 4, width: '100%', padding: '13px 20px', borderRadius: 12, border: 'none',
                background: loading ? 'rgba(212,160,23,0.3)' : `linear-gradient(135deg, ${GOLD}, #b8860b)`,
                color: '#0b0c0e', fontSize: 14, fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'all .2s', letterSpacing: '.04em', fontFamily: 'var(--body)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(212,160,23,0.3)',
              }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.transform = 'translateY(0)' }}
              >
                {loading ? <><Spinner dark /> {mode === 'login' ? 'Connexion…' : 'Inscription…'}</>
                  : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
              </button>
            </form>

            {success && (
              <div style={{
                marginTop: 14, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#4ade80',
              }}>{success}</div>
            )}
          </>
        )}

        {/* Erreur partagée */}
        {error && (
          <div style={{
            marginTop: 14, background: 'rgba(224,82,74,0.1)', border: '1px solid rgba(224,82,74,0.3)',
            borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff8a7a',
          }}>{error}</div>
        )}

        <style>{`
          @keyframes authSpin { to { transform: rotate(360deg); } }
          @keyframes authFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes authScaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        `}</style>
      </div>
    </div>
  )
}

function Spinner({ dark }) {
  return (
    <span style={{
      width: 16, height: 16, border: `2px solid ${dark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)'}`,
      borderTopColor: dark ? '#0b0c0e' : '#fff',
      borderRadius: '50%', display: 'inline-block', animation: 'authSpin 0.7s linear infinite',
    }} />
  )
}
