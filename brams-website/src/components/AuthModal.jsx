import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'

const ERR_MAP = {
  'Invalid login credentials':            'Email ou mot de passe incorrect.',
  'User already registered':              'Cet email est déjà utilisé.',
  'Password should be at least 6 characters': 'Mot de passe trop court (min. 6 caractères).',
  'Unable to validate email address':     'Adresse email invalide.',
  'Email not confirmed':                  'Confirme ton email avant de te connecter.',
}

function friendlyError(msg = '') {
  for (const [key, val] of Object.entries(ERR_MAP)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) return val
  }
  return msg || 'Une erreur est survenue.'
}

function Input({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: 'rgba(255,255,255,0.45)', marginBottom: 6, textTransform: 'uppercase' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '11px 14px', borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#fff', fontSize: 14, outline: 'none',
          transition: 'border-color .15s',
          fontFamily: 'inherit',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(212,160,23,0.6)' }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
      />
    </div>
  )
}

export default function AuthModal({ onClose, defaultTab = 'login' }) {
  const { signIn, signUp } = useAuth()
  const [tab,     setTab]     = useState(defaultTab)
  const [pseudo,  setPseudo]  = useState('')
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  const reset = (t) => { setTab(t); setError(''); setSuccess(''); setLoading(false) }

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !pass) { setError('Remplis tous les champs.'); return }
    setLoading(true); setError('')
    const { error } = await signIn(email, pass)
    setLoading(false)
    if (error) { setError(friendlyError(error.message)); return }
    onClose()
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (!pseudo || !email || !pass || !confirm) { setError('Remplis tous les champs.'); return }
    if (pass !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (pass.length < 6) { setError('Mot de passe trop court (min. 6 caractères).'); return }
    setLoading(true); setError('')
    const { data, error } = await signUp(email, pass, pseudo)
    setLoading(false)
    if (error) { setError(friendlyError(error.message)); return }
    if (data?.session) {
      onClose()
    } else {
      setSuccess('Compte créé ! Vérifie ton email pour confirmer ton inscription.')
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'linear-gradient(145deg, #13151a, #1a1c22)',
          border: '1px solid rgba(255,215,0,0.2)',
          borderRadius: 18, padding: '40px 40px 36px',
          width: '100%', maxWidth: 420,
          boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(212,160,23,0.08)',
          animation: 'scaleIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Bande dorée */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #E0524A, #d4a017, #E0524A)', borderRadius: '18px 18px 0 0' }} />

        {/* Fermer */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 7, color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
        >✕</button>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏴‍☠️</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20, color: '#fff' }}>Brams Community</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4, marginBottom: 28 }}>
          {[['login', 'Connexion'], ['register', "S'inscrire"]].map(([t, label]) => (
            <button
              key={t}
              onClick={() => reset(t)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, transition: 'all .15s',
                background: tab === t ? 'rgba(212,160,23,0.18)' : 'transparent',
                color: tab === t ? '#d4a017' : 'rgba(255,255,255,0.4)',
                boxShadow: tab === t ? 'inset 0 0 0 1px rgba(212,160,23,0.35)' : 'none',
              }}
            >{label}</button>
          ))}
        </div>

        {/* Formulaire Connexion */}
        {tab === 'login' && (
          <form onSubmit={handleLogin}>
            <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="ton@email.com" />
            <Input label="Mot de passe" type="password" value={pass} onChange={setPass} placeholder="••••••••" />

            {error && (
              <div style={{ background: 'rgba(224,82,74,0.12)', border: '1px solid rgba(224,82,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff8a7a', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: loading ? 'rgba(212,160,23,0.4)' : '#d4a017',
                color: '#1a1f2e', fontSize: 14, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '.03em', transition: 'all .15s',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#e5b83a' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#d4a017' }}
            >
              {loading ? 'Connexion...' : 'Se connecter →'}
            </button>

            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              Pas encore membre ?{' '}
              <button type="button" onClick={() => reset('register')} style={{ background: 'none', border: 'none', color: '#d4a017', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: 0 }}>
                Créer un compte
              </button>
            </p>
          </form>
        )}

        {/* Formulaire S'inscrire */}
        {tab === 'register' && (
          <form onSubmit={handleRegister}>
            {success ? (
              <div style={{ background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.3)', borderRadius: 10, padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📬</div>
                <div style={{ fontSize: 14, color: '#2ECC71', fontWeight: 700, marginBottom: 6 }}>Vérifie ton email !</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{success}</div>
                <button
                  type="button"
                  onClick={() => reset('login')}
                  style={{ marginTop: 16, background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '8px 20px', fontSize: 13, fontWeight: 600 }}
                >Se connecter</button>
              </div>
            ) : (
              <>
                <Input label="Pseudo" value={pseudo} onChange={setPseudo} placeholder="TonPseudo" />
                <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="ton@email.com" />
                <Input label="Mot de passe" type="password" value={pass} onChange={setPass} placeholder="Min. 6 caractères" />
                <Input label="Confirmer le mot de passe" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />

                {error && (
                  <div style={{ background: 'rgba(224,82,74,0.12)', border: '1px solid rgba(224,82,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff8a7a', marginBottom: 16 }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                    background: loading ? 'rgba(212,160,23,0.4)' : '#d4a017',
                    color: '#1a1f2e', fontSize: 14, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                    letterSpacing: '.03em', transition: 'all .15s',
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#e5b83a' }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#d4a017' }}
                >
                  {loading ? 'Création...' : 'Créer mon compte →'}
                </button>

                <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                  Déjà membre ?{' '}
                  <button type="button" onClick={() => reset('login')} style={{ background: 'none', border: 'none', color: '#d4a017', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: 0 }}>
                    Se connecter
                  </button>
                </p>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
