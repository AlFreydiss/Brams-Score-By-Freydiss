import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'

const CSS = `
@keyframes waveScroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes lockBounce {
  0%,20%  { transform: translateY(0) scale(1) rotate(-4deg); }
  50%     { transform: translateY(-14px) scale(1.06) rotate(4deg); }
  80%,100%{ transform: translateY(0) scale(1) rotate(-4deg); }
}
@keyframes guardIn {
  from { opacity: 0; transform: scale(1.06) translateY(10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes guardSpin { to { transform: rotate(360deg); } }
@keyframes guardGlow { 0%,100%{ opacity:.4 } 50%{ opacity:.8 } }
@keyframes guardShimmer { 0%{ left:-100% } 55%{ left:130% } 100%{ left:130% } }
@keyframes guardStar { 0%,100%{ opacity:.06; transform:scale(1) } 50%{ opacity:.45; transform:scale(1.5) } }
@keyframes guardScan { 0%{ transform:translateY(-100%) } 100%{ transform:translateY(100vh) } }
`

const DISCORD_BLUE = '#5865F2'
const DISCORD_DARK = '#4752C4'
const GOLD         = '#d4a017'

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff', fontSize: 14, fontFamily: 'var(--body)', outline: 'none',
  boxSizing: 'border-box', transition: 'border .15s',
}

function WavesBg() {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 180, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <div style={{ display: 'flex', width: '200%', animation: 'waveScroll 12s linear infinite' }}>
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

export default function AuthGuard({ onClose, feature = 'ce contenu' }) {
  const { signInWithDiscord, signIn, signUp } = useAuth()

  const [showEmail, setShowEmail] = useState(false)
  const [mode,      setMode]      = useState('login')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')

  async function handleDiscord() {
    setLoading(true)
    await signInWithDiscord()
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
      if (error) { setError(error.message || 'Erreur d\'inscription.'); setLoading(false) }
      else { setSuccess('Vérifie ton email pour confirmer ton compte.'); setLoading(false) }
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(224,82,74,0.07) 0%, #09090e 55%), linear-gradient(180deg, #09090e 0%, #0d1018 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        animation: 'guardIn 0.35s cubic-bezier(0.16,1,0.3,1) both', overflow: 'hidden',
      }}>
        {/* Retour */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 20, right: 20,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 9, color: 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: '8px 16px',
          fontSize: 12, fontWeight: 700, zIndex: 10, transition: 'all .15s', letterSpacing: '.04em',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
        >← Retour</button>

        {/* Ambient glows */}
        <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '90%', height: '60%', background: 'radial-gradient(ellipse, rgba(224,82,74,0.09) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: '50%', height: '50%', background: 'radial-gradient(ellipse, rgba(88,101,242,0.06) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '30%', right: '-5%', width: '40%', height: '45%', background: 'radial-gradient(ellipse, rgba(212,160,23,0.04) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* Scan line */}
        <div style={{ position: 'absolute', left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(224,82,74,0.08), transparent)', animation: 'guardScan 10s linear infinite', pointerEvents: 'none' }} />

        {/* Stars */}
        {Array.from({ length: 48 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: `${(i * 37.3) % 90}%`, left: `${(i * 41.7) % 98}%`,
            width: i % 5 === 0 ? 2 : 1, height: i % 5 === 0 ? 2 : 1,
            borderRadius: '50%', background: i % 8 === 0 ? 'rgba(224,82,74,0.6)' : '#fff',
            animation: `guardStar ${2.5 + (i * 0.31) % 3}s ${(i * 0.17) % 2}s ease-in-out infinite`,
            pointerEvents: 'none',
          }} />
        ))}

        <WavesBg />

        {/* Card */}
        <div style={{
          position: 'relative', zIndex: 2,
          maxWidth: 520, width: '92%', textAlign: 'center',
          background: 'linear-gradient(155deg, rgba(16,17,25,0.97) 0%, rgba(9,10,16,0.99) 100%)',
          border: '1px solid rgba(224,82,74,0.18)',
          borderTop: '2px solid rgba(224,82,74,0.45)',
          borderRadius: 22, padding: '40px 36px 32px',
          overflow: 'hidden',
          boxShadow: '0 48px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(224,82,74,0.04) inset',
        }}>
          {/* Card shimmer */}
          <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(224,82,74,0.04), transparent)', animation: 'guardShimmer 6s 2s ease-in-out infinite', pointerEvents: 'none' }} />
          {/* Top glow */}
          <div style={{ position: 'absolute', top: -70, left: '50%', transform: 'translateX(-50%)', width: 360, height: 200, background: 'radial-gradient(ellipse, rgba(224,82,74,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />

          {/* Skull */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 10 }}>
            <div style={{ position: 'absolute', inset: -28, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,82,74,0.20) 0%, transparent 65%)', animation: 'guardGlow 3s ease-in-out infinite' }} />
            <div style={{ fontSize: 76, lineHeight: 1, animation: 'lockBounce 3.5s ease-in-out infinite', display: 'inline-block', filter: 'drop-shadow(0 0 24px rgba(224,82,74,0.55)) drop-shadow(0 0 6px rgba(224,82,74,0.8))', position: 'relative', zIndex: 1 }}>
              ☠️
            </div>
          </div>

          {/* Zone réservée badge */}
          <div style={{ marginBottom: 22 }}>
            <span style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, rgba(224,82,74,0.14), rgba(200,60,60,0.08))',
              border: '1px solid rgba(224,82,74,0.35)',
              borderRadius: 6, padding: '5px 18px',
              fontSize: 9, fontWeight: 900, letterSpacing: '.22em', color: 'rgba(224,82,74,0.85)',
              textTransform: 'uppercase',
            }}>⚠ Zone Réservée</span>
          </div>

          <h1 style={{
            fontFamily: "'Pirata One', cursive",
            fontSize: 'clamp(26px, 5vw, 50px)',
            color: '#fff', lineHeight: 1.1, marginBottom: 18,
          }}>
            Accès<br />
            <span style={{
              fontFamily: "'Pirata One', cursive",
              background: 'linear-gradient(135deg, #E0524A 0%, #ff7055 50%, #ffb347 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Équipage uniquement</span>
          </h1>

          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.50)', lineHeight: 1.75, maxWidth: 400, margin: '0 auto 10px' }}>
            Pour accéder à <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{feature}</strong>, tu dois faire partie de l'équipage.
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,200,80,0.55)', lineHeight: 1.6, marginBottom: 28, fontStyle: 'italic' }}>
            « Seuls les nakamas de Brams Community ont accès au Grand Line. »
          </p>

          {/* Divider */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(224,82,74,0.25), transparent)', marginBottom: 24 }} />

          {!showEmail ? (
            <>
              <button onClick={handleDiscord} disabled={loading} style={{
                width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                padding: '15px 36px', fontSize: 15, fontWeight: 700,
                background: loading ? `${DISCORD_DARK}99` : `linear-gradient(135deg, ${DISCORD_BLUE} 0%, ${DISCORD_DARK} 100%)`,
                border: '1px solid rgba(255,255,255,0.12)',
                borderTop: '1px solid rgba(255,255,255,0.22)',
                borderRadius: 14, color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '.02em', fontFamily: 'var(--body)',
                boxShadow: loading ? 'none' : `0 8px 32px ${DISCORD_BLUE}45, 0 1px 0 rgba(255,255,255,0.10) inset`,
                transition: 'all .2s', marginBottom: 14,
              }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 16px 44px ${DISCORD_BLUE}60, 0 1px 0 rgba(255,255,255,0.10) inset` } }}
                onMouseLeave={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 8px 32px ${DISCORD_BLUE}45, 0 1px 0 rgba(255,255,255,0.10) inset` } }}
              >
                {loading ? (
                  <><span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'guardSpin .7s linear infinite' }} /> Connexion…</>
                ) : (
                  <><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                  Se connecter avec Discord</>
                )}
              </button>

              <div>
                <button onClick={() => setShowEmail(true)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.28)', fontSize: 12, fontFamily: 'var(--body)',
                  textDecoration: 'underline', transition: 'color .15s', letterSpacing: '.02em',
                }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.28)'}
                >Ou se connecter par email →</button>
              </div>
            </>
          ) : (
            <div style={{ maxWidth: 360, margin: '0 auto', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 18 }}>
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

              <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mode === 'signup' && (
                  <input type="text" placeholder="Nom d'affichage" value={name}
                    onChange={e => setName(e.target.value)} required style={inputStyle}
                    onFocus={e => e.target.style.borderColor = `${GOLD}66`}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                  />
                )}
                <input type="email" placeholder="Adresse email" value={email}
                  onChange={e => setEmail(e.target.value)} required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = `${GOLD}66`}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                />
                <input type="password" placeholder="Mot de passe" value={password}
                  onChange={e => setPassword(e.target.value)} required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = `${GOLD}66`}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                />
                <button type="submit" disabled={loading} style={{
                  marginTop: 4, width: '100%', padding: '13px 20px', borderRadius: 12, border: 'none',
                  background: loading ? 'rgba(212,160,23,0.3)' : `linear-gradient(135deg, ${GOLD}, #b8860b)`,
                  color: '#0b0c0e', fontSize: 14, fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'all .2s', letterSpacing: '.04em', fontFamily: 'var(--body)',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(212,160,23,0.3)',
                }}>
                  {loading
                    ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0b0c0e', borderRadius: '50%', display: 'inline-block', animation: 'guardSpin .7s linear infinite' }} /> {mode === 'login' ? 'Connexion…' : 'Inscription…'}</>
                    : mode === 'login' ? 'Se connecter' : 'Créer mon compte'
                  }
                </button>
              </form>

              {success && (
                <div style={{ marginTop: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#4ade80', textAlign: 'center' }}>
                  {success}
                </div>
              )}

              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <button onClick={() => { setShowEmail(false); setError(''); setSuccess('') }} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'var(--body)',
                  textDecoration: 'underline',
                }}>← Retour à Discord</button>
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 14, background: 'rgba(224,82,74,0.1)', border: '1px solid rgba(224,82,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff8a7a', maxWidth: 360, margin: '14px auto 0' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
