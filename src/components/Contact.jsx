import { useState } from 'react'

const CATEGORIES = [
  { value: 'bug',        label: '🐛 Bug / Problème bot' },
  { value: 'rang',       label: '⚔️ Rang manquant' },
  { value: 'berry',      label: '💰 Berrys / Économie' },
  { value: 'question',   label: '❓ Question générale' },
  { value: 'suggestion', label: '💡 Suggestion' },
  { value: 'autre',      label: '📩 Autre' },
]

export default function Contact() {
  const [form, setForm] = useState({ pseudo: '', category: '', message: '' })
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errMsg, setErrMsg] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const canSend = form.pseudo.trim() && form.category && form.message.trim().length >= 10

  const submit = async () => {
    if (!canSend) return
    setStatus('loading')
    setErrMsg('')
    try {
      const res = await fetch('/api/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setStatus('success')
        setForm({ pseudo: '', category: '', message: '' })
      } else {
        const d = await res.json().catch(() => ({}))
        setErrMsg(d.error || 'Erreur lors de l\'envoi.')
        setStatus('error')
      }
    } catch {
      setErrMsg('Impossible de contacter le serveur. Réessaie.')
      setStatus('error')
    }
  }

  const inputStyle = {
    width: '100%', padding: '13px 16px', borderRadius: 10,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    color: '#fff', fontSize: 15, fontFamily: 'var(--body)', outline: 'none',
    transition: 'border-color 0.2s',
  }
  const focus = e => { e.target.style.borderColor = 'var(--accent)' }
  const blur  = e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)' }

  return (
    <section id="contact" style={{ padding: '110px 0', position: 'relative' }}>
      <div style={{
        position: 'absolute', left: '50%', top: '20%', transform: 'translateX(-50%)',
        width: 600, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(88,101,242,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start', maxWidth: 960, margin: '0 auto' }}>

          {/* Texte gauche */}
          <div>
            <div className="label">💬 Contact</div>
            <h2 className="h2">Nous contacter</h2>
            <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 40 }}>
              Un problème avec le bot, une question sur le serveur, une suggestion ?
              Envoie-nous un message et l'équipe te répond sur Discord.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { icon: '⚡', title: 'Réponse rapide', desc: 'L\'équipe répond généralement en moins de 24h' },
                { icon: '🔒', title: 'Privé', desc: 'Ton message arrive directement aux admins du serveur' },
                { icon: '🏴‍☠️', title: 'Pour tous', desc: 'Membre ou visiteur, tout le monde peut nous écrire' },
              ].map(item => (
                <div key={item.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(224,82,74,0.1)', border: '1px solid rgba(224,82,74,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>{item.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 36, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Accès direct</div>
              <a href="https://discord.gg/8uzU3eatMr" target="_blank" rel="noopener noreferrer"
                className="btn btn-discord" style={{ fontSize: 14 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                Discord direct
              </a>
            </div>
          </div>

          {/* Formulaire droite */}
          <div>
            {status === 'success' ? (
              <div style={{
                background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)',
                borderRadius: 20, padding: '48px 32px', textAlign: 'center',
                animation: 'scaleIn 0.3s ease-out',
              }}>
                <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
                <h3 style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, color: '#fff', marginBottom: 10 }}>
                  Message envoyé !
                </h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 24 }}>
                  L'équipe Brams Community a reçu ton message.<br />
                  On te répond sur Discord dès que possible, nakama !
                </p>
                <button onClick={() => setStatus('idle')} className="btn btn-ghost" style={{ fontSize: 14 }}>
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 20, padding: '36px 32px',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                  {/* Pseudo */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                      Pseudo Discord
                    </label>
                    <input
                      value={form.pseudo}
                      onChange={e => set('pseudo', e.target.value)}
                      placeholder="ex: Luffy"
                      maxLength={40}
                      style={inputStyle}
                      onFocus={focus} onBlur={blur}
                    />
                  </div>

                  {/* Catégorie */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                      Sujet
                    </label>
                    <select
                      value={form.category}
                      onChange={e => set('category', e.target.value)}
                      style={{
                        ...inputStyle,
                        appearance: 'none',
                        cursor: 'pointer',
                        color: form.category ? '#fff' : 'rgba(255,255,255,0.35)',
                      }}
                      onFocus={focus} onBlur={blur}
                    >
                      <option value="" disabled style={{ color: '#888' }}>Choisir un sujet…</option>
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value} style={{ background: '#1e2024', color: '#fff' }}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                      Message
                    </label>
                    <textarea
                      value={form.message}
                      onChange={e => set('message', e.target.value)}
                      placeholder="Explique ton problème ou ta question en détail…"
                      maxLength={800}
                      rows={5}
                      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }}
                      onFocus={focus} onBlur={blur}
                    />
                    <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right', marginTop: 4 }}>
                      {form.message.length}/800
                    </div>
                  </div>

                  {/* Erreur */}
                  {status === 'error' && (
                    <div style={{
                      background: 'rgba(224,82,74,0.08)', border: '1px solid rgba(224,82,74,0.25)',
                      borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#e0524a',
                    }}>
                      {errMsg}
                    </div>
                  )}

                  {/* Bouton */}
                  <button
                    onClick={submit}
                    disabled={!canSend || status === 'loading'}
                    style={{
                      width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                      background: canSend && status !== 'loading' ? 'var(--accent)' : 'rgba(255,255,255,0.07)',
                      color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: 'var(--body)',
                      cursor: canSend && status !== 'loading' ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      boxShadow: canSend && status !== 'loading' ? '0 4px 20px rgba(224,82,74,0.3)' : 'none',
                    }}
                    onMouseEnter={e => { if (canSend) e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
                  >
                    {status === 'loading' ? '⏳ Envoi en cours…' : '📨 Envoyer le message'}
                  </button>

                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Responsive mobile */}
      <style>{`
        @media (max-width: 768px) {
          #contact .container > div {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
        }
      `}</style>
    </section>
  )
}
