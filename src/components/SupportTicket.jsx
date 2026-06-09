import { useState } from 'react'

const CATEGORIES = [
  { id: 'bug', label: '🐛 Bug / Problème', desc: 'Le bot ne fonctionne pas correctement', color: '#e0524a' },
  { id: 'rang', label: '⚔️ Rang manquant', desc: 'Mon rang n\'a pas été attribué', color: '#fdcb6e' },
  { id: 'berry', label: '💰 Berrys / Économie', desc: 'Problème avec mes Berrys ou la banque', color: '#00cec9' },
  { id: 'question', label: '❓ Question', desc: 'Comment fonctionne...', color: '#74b9ff' },
  { id: 'suggestion', label: '💡 Suggestion', desc: 'Une idée pour améliorer le serveur', color: '#9b59b6' },
  { id: 'autre', label: '📩 Autre', desc: 'Autre demande', color: '#7c7f8a' },
]

export default function SupportTicket() {
  const [step, setStep] = useState(0) // 0=catégorie, 1=formulaire, 2=envoyé
  const [category, setCategory] = useState(null)
  const [pseudo, setPseudo] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const cat = CATEGORIES.find(c => c.id === category)

  const submit = async () => {
    if (!pseudo.trim() || !message.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo: pseudo.trim(), category, message: message.trim() }),
      })
      if (res.ok) {
        setStep(2)
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Erreur lors de l\'envoi. Réessaie.')
      }
    } catch {
      setError('Impossible de contacter le serveur.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep(0); setCategory(null); setPseudo(''); setMessage(''); setError(null)
  }

  return (
    <section id="support" style={{ padding: '110px 0', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%, rgba(88,101,242,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="label">📩 Support</div>
          <h2 className="h2" style={{ textAlign: 'center' }}>Ouvre un Ticket</h2>
          <p className="sub" style={{ textAlign: 'center', margin: '0 auto' }}>
            Un problème avec le bot ou le serveur ? L'équipe répond sur Discord.
          </p>
        </div>

        <div style={{ maxWidth: 640, margin: '0 auto' }}>

          {/* Étape 0 — Catégorie */}
          {step === 0 && (
            <div style={{ animation: 'scaleIn 0.25s ease-out' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                Choisis une catégorie
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => { setCategory(c.id); setStep(1) }} style={{
                    background: 'var(--card)', border: `1px solid ${c.color}20`,
                    borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.2s', fontFamily: 'var(--body)',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${c.color}10`; e.currentTarget.style.borderColor = `${c.color}50`; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.borderColor = `${c.color}20`; e.currentTarget.style.transform = 'none' }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 4 }}>{c.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Étape 1 — Formulaire */}
          {step === 1 && (
            <div style={{ animation: 'scaleIn 0.25s ease-out' }}>
              {/* Header catégorie */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28,
                background: `${cat.color}10`, border: `1px solid ${cat.color}30`,
                borderRadius: 12, padding: '14px 18px',
              }}>
                <button onClick={() => setStep(0)} style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, color: 'var(--muted)', cursor: 'pointer', fontSize: 16,
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--body)',
                }}>←</button>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{cat.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Ticket de support · Brams Community</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                    Ton pseudo Discord
                  </label>
                  <input
                    value={pseudo}
                    onChange={e => setPseudo(e.target.value)}
                    placeholder="ex: Luffy#0001"
                    maxLength={40}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10,
                      background: 'var(--card)', border: '1px solid var(--border)',
                      color: '#fff', fontSize: 15, fontFamily: 'var(--body)', outline: 'none',
                    }}
                    onFocus={e => e.target.style.borderColor = cat.color}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                    Décris ton problème
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Explique en détail ton problème ou ta question..."
                    maxLength={800}
                    rows={5}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10,
                      background: 'var(--card)', border: '1px solid var(--border)',
                      color: '#fff', fontSize: 14, fontFamily: 'var(--body)', outline: 'none',
                      resize: 'vertical', lineHeight: 1.6,
                    }}
                    onFocus={e => e.target.style.borderColor = cat.color}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                  <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right', marginTop: 4 }}>
                    {message.length}/800
                  </div>
                </div>

                {error && (
                  <div style={{ background: 'rgba(224,82,74,0.1)', border: '1px solid rgba(224,82,74,0.3)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#e0524a' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={submit} disabled={!pseudo.trim() || !message.trim() || loading} style={{
                    flex: 1, padding: '13px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: pseudo.trim() && message.trim() && !loading ? cat.color : 'rgba(255,255,255,0.08)',
                    color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: 'var(--body)',
                    transition: 'all 0.2s', opacity: loading ? 0.7 : 1,
                  }}>
                    {loading ? '⏳ Envoi...' : '📨 Envoyer le ticket'}
                  </button>
                  <a href="https://discord.gg/4FgezPpnGU" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: 13, padding: '13px 18px' }}>
                    Discord direct
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Étape 2 — Succès */}
          {step === 2 && (
            <div style={{
              textAlign: 'center', padding: '48px 32px',
              background: 'var(--card)', border: '1px solid rgba(52,211,153,0.2)',
              borderRadius: 20, animation: 'scaleIn 0.3s ease-out',
            }}>
              <div style={{ fontSize: 72, marginBottom: 20 }}>✅</div>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, color: '#fff', fontWeight: 700, marginBottom: 10 }}>
                Ticket envoyé !
              </h3>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 28, maxWidth: 380, margin: '0 auto 28px' }}>
                L'équipe Brams Community a reçu ton ticket. On te répond sur Discord dès que possible, nakama !
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="https://discord.gg/4FgezPpnGU" target="_blank" rel="noopener noreferrer" className="btn btn-discord" style={{ fontSize: 14 }}>
                  Rejoindre Discord
                </a>
                <button onClick={reset} className="btn btn-ghost" style={{ fontSize: 14 }}>
                  Nouveau ticket
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
