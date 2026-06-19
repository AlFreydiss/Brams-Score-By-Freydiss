import { useState } from 'react'
import { CINE, GOLD_GRAD, CineStyles, Reveal, CineSection, GhostButton } from './home/cine.jsx'

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
    width: '100%', boxSizing: 'border-box', padding: '13px 16px', borderRadius: 11,
    background: CINE.panel, border: `1px solid ${CINE.hair}`,
    color: CINE.ink, fontSize: 15, fontFamily: CINE.body, outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }
  const focus = e => { e.target.style.borderColor = CINE.gold; e.target.style.boxShadow = `0 0 0 3px rgba(191,164,106,0.14)` }
  const blur  = e => { e.target.style.borderColor = CINE.hair; e.target.style.boxShadow = 'none' }

  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: CINE.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8, fontFamily: CINE.title }

  return (
    <CineSection id="contact">
      <CineStyles />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 'clamp(40px, 6vw, 80px)', alignItems: 'start', width: '100%' }} className="cine-contact-grid">

        {/* Texte gauche */}
        <div>
          <Reveal as="span" style={{
            display: 'inline-block', fontFamily: CINE.title, fontSize: 12, fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase', color: CINE.gold, marginBottom: 16,
          }}>💬 Contact</Reveal>
          <Reveal as="h2" delay={60} style={{
            margin: 0, fontFamily: CINE.title, fontWeight: 700, color: CINE.ink,
            fontSize: 'clamp(30px, 4.6vw, 60px)', lineHeight: 1.02, letterSpacing: '-0.025em',
          }}>
            Nous <span style={{ background: GOLD_GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>contacter</span>
          </Reveal>
          <Reveal as="p" delay={120} style={{ fontSize: 'clamp(15px, 1.5vw, 17px)', color: CINE.inkSoft, lineHeight: 1.8, margin: '18px 0 40px', maxWidth: 480 }}>
            Un problème avec le bot, une question sur le serveur, une suggestion ?
            Envoie-nous un message et l'équipe te répond sur Discord.
          </Reveal>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { icon: '⚡', title: 'Réponse rapide', desc: 'L\'équipe répond généralement en moins de 24h' },
              { icon: '🔒', title: 'Privé', desc: 'Ton message arrive directement aux admins du serveur' },
              { icon: '🏴‍☠️', title: 'Pour tous', desc: 'Membre ou visiteur, tout le monde peut nous écrire' },
            ].map((item, i) => (
              <Reveal key={item.title} delay={140 + i * 70}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                    background: 'rgba(191,164,106,0.10)', border: `1px solid ${CINE.goldDim}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>{item.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: CINE.ink, fontSize: 14.5, marginBottom: 3, fontFamily: CINE.title }}>{item.title}</div>
                    <div style={{ fontSize: 13.5, color: CINE.inkSoft, lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <div style={{ marginTop: 36, paddingTop: 28, borderTop: `1px solid ${CINE.hair}` }}>
            <div style={{ fontSize: 12, color: CINE.gold, marginBottom: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: CINE.title }}>Accès direct</div>
            <GhostButton href="https://discord.gg/4FgezPpnGU" target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
              Discord direct
            </GhostButton>
          </div>
        </div>

        {/* Formulaire droite */}
        <Reveal delay={80}>
          {status === 'success' ? (
            <div style={{
              background: CINE.panel, border: `1px solid ${CINE.hairTop}`,
              borderRadius: 22, padding: '48px 32px', textAlign: 'center',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}>
              <div style={{ fontSize: 60, marginBottom: 20 }}>✅</div>
              <h3 style={{ fontFamily: CINE.title, fontWeight: 700, fontSize: 24, color: CINE.ink, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
                Message envoyé !
              </h3>
              <p style={{ fontSize: 14.5, color: CINE.inkSoft, lineHeight: 1.7, margin: '0 auto 24px', maxWidth: 360 }}>
                L'équipe Brams Community a reçu ton message.<br />
                On te répond sur Discord dès que possible, nakama !
              </p>
              <GhostButton as="button" onClick={() => setStatus('idle')}>
                Envoyer un autre message
              </GhostButton>
            </div>
          ) : (
            <div style={{
              background: CINE.panel, border: `1px solid ${CINE.hairTop}`,
              borderRadius: 22, padding: 'clamp(28px, 4vw, 38px)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Pseudo */}
                <div>
                  <label style={labelStyle}>Pseudo Discord</label>
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
                  <label style={labelStyle}>Sujet</label>
                  <select
                    value={form.category}
                    onChange={e => set('category', e.target.value)}
                    style={{
                      ...inputStyle,
                      appearance: 'none',
                      cursor: 'pointer',
                      color: form.category ? CINE.ink : CINE.faint,
                    }}
                    onFocus={focus} onBlur={blur}
                  >
                    <option value="" disabled style={{ color: '#888' }}>Choisir un sujet…</option>
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value} style={{ background: '#14151a', color: CINE.ink }}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label style={labelStyle}>Message</label>
                  <textarea
                    value={form.message}
                    onChange={e => set('message', e.target.value)}
                    placeholder="Explique ton problème ou ta question en détail…"
                    maxLength={800}
                    rows={5}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }}
                    onFocus={focus} onBlur={blur}
                  />
                  <div style={{ fontSize: 11, color: CINE.muted, textAlign: 'right', marginTop: 6 }}>
                    {form.message.length}/800
                  </div>
                </div>

                {/* Erreur */}
                {status === 'error' && (
                  <div style={{
                    background: 'rgba(191,164,106,0.08)', border: `1px solid ${CINE.goldDim}`,
                    borderRadius: 11, padding: '12px 16px', fontSize: 13, color: CINE.goldHi,
                  }}>
                    {errMsg}
                  </div>
                )}

                {/* Bouton */}
                <button
                  onClick={submit}
                  disabled={!canSend || status === 'loading'}
                  style={{
                    width: '100%', padding: '15px', borderRadius: 12, border: 'none',
                    background: canSend && status !== 'loading' ? GOLD_GRAD : CINE.panel2,
                    color: canSend && status !== 'loading' ? '#0b0a06' : CINE.muted,
                    fontWeight: 700, fontSize: 15, fontFamily: CINE.title, letterSpacing: '0.01em',
                    cursor: canSend && status !== 'loading' ? 'pointer' : 'not-allowed',
                    transition: 'transform .25s, box-shadow .25s',
                    boxShadow: canSend && status !== 'loading' ? '0 8px 22px rgba(191,164,106,0.2)' : 'none',
                  }}
                  onMouseEnter={e => { if (canSend) e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
                >
                  {status === 'loading' ? '⏳ Envoi en cours…' : '📨 Envoyer le message'}
                </button>

              </div>
            </div>
          )}
        </Reveal>

      </div>

      {/* Responsive mobile */}
      <style>{`
        @media (max-width: 768px) {
          .cine-contact-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
        }
      `}</style>
    </CineSection>
  )
}
