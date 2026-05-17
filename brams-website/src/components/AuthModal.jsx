import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'

const ERR_MAP = {
  'Invalid login credentials':                 'Email ou mot de passe incorrect.',
  'User already registered':                   'Cet email est déjà utilisé.',
  'Password should be at least 6 characters':  'Mot de passe trop court (min. 6 caractères).',
  'Unable to validate email address':          'Adresse email invalide.',
  'Email not confirmed':                       'Confirme ton email avant de te connecter.',
  'email rate limit exceeded':                 'Trop de tentatives. Attends avant de réessayer.',
}

function friendlyError(msg = '') {
  for (const [key, val] of Object.entries(ERR_MAP)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) return val
  }
  return msg || 'Une erreur est survenue.'
}

function Input({ label, type = 'text', value, onChange, placeholder, autoComplete }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: 'rgba(255,255,255,0.45)', marginBottom: 6, textTransform: 'uppercase' }}>
        {label}
      </label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} autoComplete={autoComplete}
        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, outline: 'none', transition: 'border-color .15s', fontFamily: 'inherit' }}
        onFocus={e => e.target.style.borderColor = 'rgba(212,160,23,0.6)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
      />
    </div>
  )
}

export default function AuthModal({ onClose, defaultTab = 'login' }) {
  const { signIn, signUp } = useAuth()
  const [tab,       setTab]       = useState(defaultTab)
  const [pseudo,    setPseudo]    = useState('')
  const [email,     setEmail]     = useState('')
  const [pass,      setPass]      = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [rgpd,      setRgpd]      = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')
  const [failCount, setFailCount] = useState(0)
  const [cooldown,  setCooldown]  = useState(0)

  // Countdown
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const reset = (t) => { setTab(t); setError(''); setSuccess(''); setLoading(false); setRgpd(false) }

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !pass) { setError('Remplis tous les champs.'); return }
    if (cooldown > 0) { setError(`Trop de tentatives. Attends ${cooldown}s.`); return }
    setLoading(true); setError('')
    const { error } = await signIn(email, pass)
    setLoading(false)
    if (error) {
      const next = failCount + 1
      setFailCount(next)
      if (next >= 5) setCooldown(30)
      setError(friendlyError(error.message))
      return
    }
    onClose()
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (!pseudo || !email || !pass || !confirm) { setError('Remplis tous les champs.'); return }
    if (pass !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (pass.length < 6) { setError('Mot de passe trop court (min. 6 caractères).'); return }
    if (!rgpd) { setError("Accepte les conditions d'utilisation pour créer un compte."); return }
    if (cooldown > 0) { setError(`Trop de tentatives. Attends ${cooldown}s.`); return }
    setLoading(true); setError('')
    const { data, error } = await signUp(email, pass, pseudo)
    setLoading(false)
    if (error) {
      const next = failCount + 1
      setFailCount(next)
      if (next >= 5) setCooldown(30)
      setError(friendlyError(error.message))
      return
    }
    if (data?.session) { onClose() }
    else { setSuccess('Compte créé ! Vérifie ton email pour confirmer ton inscription.') }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', animation: 'fadeIn 0.2s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: 'linear-gradient(145deg, #13151a, #1a1c22)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 18, padding: '36px 36px 32px', width: '100%', maxWidth: 420, boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(212,160,23,0.08)', animation: 'scaleIn 0.22s cubic-bezier(0.34,1.56,0.64,1)' }}>

        {/* Bande dorée */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #E0524A, #d4a017, #E0524A)', borderRadius: '18px 18px 0 0' }} />

        {/* Fermer */}
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, transition: 'all .15s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}>✕</button>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 34, marginBottom: 6 }}>🏴‍☠️</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 19, color: '#fff' }}>Brams Community</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {[['login', 'Connexion'], ['register', "S'inscrire"]].map(([t, label]) => (
            <button key={t} onClick={() => reset(t)} style={{ flex: 1, padding: '9px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all .15s', background: tab === t ? 'rgba(212,160,23,0.18)' : 'transparent', color: tab === t ? '#d4a017' : 'rgba(255,255,255,0.4)', boxShadow: tab === t ? 'inset 0 0 0 1px rgba(212,160,23,0.35)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Connexion */}
        {tab === 'login' && (
          <form onSubmit={handleLogin}>
            <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="ton@email.com" autoComplete="email" />
            <Input label="Mot de passe" type="password" value={pass} onChange={setPass} placeholder="••••••••" autoComplete="current-password" />

            {cooldown > 0 && (
              <div style={{ background: 'rgba(224,82,74,0.1)', border: '1px solid rgba(224,82,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff8a7a', marginBottom: 14 }}>
                🛡️ Trop de tentatives. Attends {cooldown} secondes.
              </div>
            )}
            {error && cooldown === 0 && (
              <div style={{ background: 'rgba(224,82,74,0.1)', border: '1px solid rgba(224,82,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff8a7a', marginBottom: 14 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || cooldown > 0} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: (loading || cooldown > 0) ? 'rgba(212,160,23,0.4)' : '#d4a017', color: '#1a1f2e', fontSize: 14, fontWeight: 800, cursor: (loading || cooldown > 0) ? 'not-allowed' : 'pointer', letterSpacing: '.03em', transition: 'all .15s' }} onMouseEnter={e => { if (!loading && cooldown === 0) e.currentTarget.style.background = '#e5b83a' }} onMouseLeave={e => { if (!loading && cooldown === 0) e.currentTarget.style.background = '#d4a017' }}>
              {loading ? 'Connexion...' : cooldown > 0 ? `Attends ${cooldown}s` : 'Se connecter →'}
            </button>

            <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              Pas encore membre ?{' '}
              <button type="button" onClick={() => reset('register')} style={{ background: 'none', border: 'none', color: '#d4a017', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: 0 }}>Créer un compte</button>
            </p>
          </form>
        )}

        {/* Inscription */}
        {tab === 'register' && (
          <form onSubmit={handleRegister}>
            {success ? (
              <div style={{ background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.3)', borderRadius: 10, padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📬</div>
                <div style={{ fontSize: 14, color: '#2ECC71', fontWeight: 700, marginBottom: 6 }}>Vérifie ton email !</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{success}</div>
                <button type="button" onClick={() => reset('login')} style={{ marginTop: 14, background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '8px 20px', fontSize: 13, fontWeight: 600 }}>Se connecter</button>
              </div>
            ) : (
              <>
                <Input label="Pseudo" value={pseudo} onChange={setPseudo} placeholder="TonPseudo" autoComplete="username" />
                <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="ton@email.com" autoComplete="email" />
                <Input label="Mot de passe" type="password" value={pass} onChange={setPass} placeholder="Min. 6 caractères" autoComplete="new-password" />
                <Input label="Confirmer" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" autoComplete="new-password" />

                {/* RGPD */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 14, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: `1px solid ${!rgpd && error.includes('conditions') ? 'rgba(224,82,74,0.4)' : 'rgba(255,255,255,0.07)'}` }}>
                  <input type="checkbox" checked={rgpd} onChange={e => setRgpd(e.target.checked)} style={{ width: 15, height: 15, marginTop: 2, accentColor: '#d4a017', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                    J'accepte les conditions d'utilisation et consens à ce que mes données soient traitées pour la gestion de mon compte.{' '}
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>(RGPD)</span>
                  </span>
                </label>

                {cooldown > 0 && (
                  <div style={{ background: 'rgba(224,82,74,0.1)', border: '1px solid rgba(224,82,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff8a7a', marginBottom: 14 }}>
                    🛡️ Trop de tentatives. Attends {cooldown} secondes.
                  </div>
                )}
                {error && cooldown === 0 && (
                  <div style={{ background: 'rgba(224,82,74,0.1)', border: '1px solid rgba(224,82,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff8a7a', marginBottom: 14 }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading || cooldown > 0} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: (loading || cooldown > 0) ? 'rgba(212,160,23,0.4)' : '#d4a017', color: '#1a1f2e', fontSize: 14, fontWeight: 800, cursor: (loading || cooldown > 0) ? 'not-allowed' : 'pointer', letterSpacing: '.03em', transition: 'all .15s' }} onMouseEnter={e => { if (!loading && cooldown === 0) e.currentTarget.style.background = '#e5b83a' }} onMouseLeave={e => { if (!loading && cooldown === 0) e.currentTarget.style.background = '#d4a017' }}>
                  {loading ? 'Création...' : cooldown > 0 ? `Attends ${cooldown}s` : 'Créer mon compte →'}
                </button>

                <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                  Déjà membre ?{' '}
                  <button type="button" onClick={() => reset('login')} style={{ background: 'none', border: 'none', color: '#d4a017', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: 0 }}>Se connecter</button>
                </p>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
