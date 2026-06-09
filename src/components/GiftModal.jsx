// Modale « Offrir » — choisir un destinataire (pseudo) + message, puis payer le
// cadeau via Stripe (l'article atterrit dans l'inventaire du membre + popup chez lui).
import { useState } from 'react'
import { createGiftCheckout } from '../lib/berryShop.js'
import { resolveProfileId } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function GiftModal({ item, onClose }) {
  const { displayName } = useAuth()
  const [pseudo, setPseudo] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async () => {
    if (busy) return
    const p = pseudo.trim()
    if (!p) { setError('Indique le pseudo du destinataire.'); return }
    setBusy(true); setError(null)
    const recipientId = await resolveProfileId(p)
    if (!recipientId) { setError(`Membre « ${p} » introuvable.`); setBusy(false); return }
    const { data, error: err } = await createGiftCheckout(item.id, recipientId, message.trim(), displayName)
    if (err || !data?.url) { setError(err?.message || 'Paiement indisponible.'); setBusy(false); return }
    window.location.assign(data.url)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1400, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(6,7,10,0.78)', backdropFilter: 'blur(10px)' }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(440px, 100%)', borderRadius: 20, padding: 28, position: 'relative',
        background: 'linear-gradient(180deg, rgba(28,24,18,0.98), rgba(16,14,10,0.99))',
        border: '1px solid rgba(245,181,10,0.32)', boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 50px rgba(245,181,10,0.08)',
      }}>
        <button onClick={onClose} aria-label="Fermer" style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#cdbd97', cursor: 'pointer', fontSize: 16 }}>✕</button>

        <div style={{ fontSize: 40, marginBottom: 6 }}>🎁</div>
        <h3 style={{ margin: '0 0 4px', fontFamily: "'Pirata One', serif", fontSize: 28, color: '#f4ecd8' }}>Offrir ce cadeau</h3>
        <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'rgba(205,189,151,0.7)', fontFamily: "'Cinzel', serif" }}>
          <strong style={{ color: '#f5b50a' }}>{item.emoji} {item.nom}</strong> sera ajouté à l'inventaire du membre, avec ton message. Il recevra une surprise à sa prochaine connexion ✦
        </p>

        <label style={lbl}>Pseudo du destinataire</label>
        <input value={pseudo} onChange={e => setPseudo(e.target.value)} placeholder="ex : freydiss" autoFocus style={inp} onKeyDown={e => e.key === 'Enter' && submit()} />

        <label style={{ ...lbl, marginTop: 14 }}>Petit mot (optionnel)</label>
        <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 280))} placeholder="Joyeux anniversaire nakama ! 🏴‍☠️" rows={3} style={{ ...inp, resize: 'vertical', minHeight: 64 }} />
        <div style={{ textAlign: 'right', fontSize: 10.5, color: 'rgba(205,189,151,0.45)', marginTop: 2 }}>{message.length}/280</div>

        {error && <div style={{ marginTop: 10, fontSize: 12.5, color: '#ffb3ab', fontWeight: 700 }}>{error}</div>}

        <button onClick={submit} disabled={busy} style={{
          marginTop: 18, width: '100%', padding: '13px', borderRadius: 11, border: 'none', cursor: busy ? 'default' : 'pointer',
          fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 14.5, color: '#0b0c0e', opacity: busy ? 0.6 : 1,
          background: 'linear-gradient(180deg, #f5b50a, #d4920a)', boxShadow: '0 10px 30px rgba(245,181,10,0.3)',
        }}>{busy ? 'Redirection vers le paiement…' : 'Offrir et payer →'}</button>
      </div>
    </div>
  )
}

const lbl = { display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(205,189,151,0.7)', marginBottom: 6, fontFamily: "'Cinzel', serif" }
const inp = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#f4ecd8', fontSize: 14, fontFamily: 'inherit', outline: 'none' }
