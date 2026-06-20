// Modale « Offrir » — recherche du destinataire avec AUTOCOMPLÉTION (type Discord/
// Insta : on tape, une liste de membres s'affiche, clic ou Tab pour compléter),
// + message, puis paiement Stripe. Le cadeau atterrit dans l'inventaire du membre.
import { useState, useEffect, useRef } from 'react'
import { createGiftCheckout } from '../lib/berryShop.js'
import { searchMembers } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function GiftModal({ item, onClose }) {
  const { displayName } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)   // membre choisi { id, name, username, avatar }
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(null)   // nom du destinataire si cadeau créateur offert
  const boxRef = useRef(null)

  // Recherche débouncée à chaque frappe (sauf si un membre est déjà choisi).
  useEffect(() => {
    if (selected) return
    const q = query.trim()
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    const t = setTimeout(async () => {
      const r = await searchMembers(q)
      setResults(r); setSearching(false)
    }, 250)
    return () => clearTimeout(t)
  }, [query, selected])

  const pick = (m) => { setSelected(m); setQuery(m.name); setResults([]); setError(null) }
  const onKeyDown = (e) => {
    if (e.key === 'Tab' && results.length && !selected) { e.preventDefault(); pick(results[0]) }
    if (e.key === 'Enter' && !results.length) submit()
  }
  const onChange = (e) => { setSelected(null); setQuery(e.target.value) }

  const submit = async () => {
    if (busy) return
    if (!selected) { setError('Choisis un membre dans la liste.'); return }
    setBusy(true); setError(null)
    const { data, error: err } = await createGiftCheckout(item.id, selected.id, message.trim(), displayName)
    if (err) { setError(err.message || 'Indisponible.'); setBusy(false); return }
    if (data?.free) { setSent(selected.name); setBusy(false); return }   // créateur : offert gratuitement
    if (!data?.url) { setError('Paiement indisponible.'); setBusy(false); return }
    window.location.assign(data.url)
  }

  const Avatar = ({ m, size = 30 }) => m.avatar
    ? <img loading="lazy" decoding="async" src={m.avatar} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    : <span style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'rgba(245,181,10,0.18)', display: 'grid', placeItems: 'center', fontSize: size * 0.5 }}>🏴‍☠️</span>

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1400, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(6,7,10,0.78)', backdropFilter: 'blur(10px)' }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(440px, 100%)', borderRadius: 20, padding: 28, position: 'relative',
        background: 'linear-gradient(180deg, rgba(28,24,18,0.98), rgba(16,14,10,0.99))',
        border: '1px solid rgba(245,181,10,0.32)', boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 50px rgba(245,181,10,0.08)',
      }}>
        <button onClick={onClose} aria-label="Fermer" style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#cdbd97', cursor: 'pointer', fontSize: 16 }}>✕</button>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>🎁</div>
            <h3 style={{ margin: '0 0 8px', fontFamily: "'Pirata One', serif", fontSize: 26, color: '#f4ecd8' }}>Cadeau offert ! 💛</h3>
            <p style={{ fontSize: 14, color: 'rgba(205,189,151,0.8)', fontFamily: "'Cinzel', serif", lineHeight: 1.6 }}>
              <strong style={{ color: '#f5b50a' }}>{item.emoji} {item.nom}</strong> envoyé gratuitement à <strong>{sent}</strong>. Il le verra à sa prochaine connexion ✦
            </p>
            <button onClick={onClose} style={{ marginTop: 18, width: '100%', padding: 13, borderRadius: 11, border: 'none', cursor: 'pointer', fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 14.5, color: '#0b0c0e', background: 'linear-gradient(180deg,#f5b50a,#d4920a)' }}>Parfait ✓</button>
          </div>
        ) : (<>
        <div style={{ fontSize: 40, marginBottom: 6 }}>🎁</div>
        <h3 style={{ margin: '0 0 4px', fontFamily: "'Pirata One', serif", fontSize: 28, color: '#f4ecd8' }}>Offrir ce cadeau</h3>
        <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'rgba(205,189,151,0.7)', fontFamily: "'Cinzel', serif" }}>
          <strong style={{ color: '#f5b50a' }}>{item.emoji} {item.nom}</strong> sera ajouté à l'inventaire du membre, avec ton message ✦
        </p>

        <label style={lbl}>Destinataire</label>
        <div ref={boxRef} style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, ...inp, padding: selected ? '7px 12px' : inp.padding }}>
            {selected && <Avatar m={selected} size={26} />}
            <input value={query} onChange={onChange} onKeyDown={onKeyDown} placeholder="Tape un pseudo… (@discord, nom affiché)" autoFocus
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f4ecd8', fontSize: 14, fontFamily: 'inherit' }} />
            {selected && <button onClick={() => { setSelected(null); setQuery('') }} style={{ background: 'none', border: 'none', color: '#caa', cursor: 'pointer', fontSize: 13 }}>✕</button>}
          </div>
          {/* Dropdown d'autocomplétion */}
          {!selected && (query.trim().length >= 2) && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, zIndex: 5, maxHeight: 240, overflowY: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(16,14,10,0.99)', boxShadow: '0 18px 50px rgba(0,0,0,0.6)' }}>
              {searching && <div style={{ padding: '12px 14px', fontSize: 13, color: 'rgba(205,189,151,0.6)' }}>Recherche…</div>}
              {!searching && !results.length && <div style={{ padding: '12px 14px', fontSize: 13, color: 'rgba(205,189,151,0.6)' }}>Aucun membre trouvé.</div>}
              {results.map((m, i) => (
                <button key={m.id} onClick={() => pick(m)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 13px', background: i === 0 ? 'rgba(245,181,10,0.08)' : 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <Avatar m={m} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#f4ecd8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                    {m.username && <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(205,189,151,0.55)' }}>@{m.username}</span>}
                  </span>
                  {i === 0 && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(205,189,151,0.5)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '1px 5px' }}>Tab</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <label style={{ ...lbl, marginTop: 14 }}>Petit mot (optionnel)</label>
        <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 280))} placeholder="Joyeux anniversaire nakama ! 🏴‍☠️" rows={3} style={{ ...inp, resize: 'vertical', minHeight: 64 }} />
        <div style={{ textAlign: 'right', fontSize: 10.5, color: 'rgba(205,189,151,0.45)', marginTop: 2 }}>{message.length}/280</div>

        {error && <div style={{ marginTop: 10, fontSize: 12.5, color: '#ffb3ab', fontWeight: 700 }}>{error}</div>}

        <button onClick={submit} disabled={busy} style={{
          marginTop: 18, width: '100%', padding: '13px', borderRadius: 11, border: 'none', cursor: busy ? 'default' : 'pointer',
          fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 14.5, color: '#0b0c0e', opacity: busy ? 0.6 : 1,
          background: 'linear-gradient(180deg, #f5b50a, #d4920a)', boxShadow: '0 10px 30px rgba(245,181,10,0.3)',
        }}>{busy ? 'Redirection vers le paiement…' : 'Offrir et payer →'}</button>
        </>)}
      </div>
    </div>
  )
}

const lbl = { display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(205,189,151,0.7)', marginBottom: 6, fontFamily: "'Cinzel', serif" }
const inp = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#f4ecd8', fontSize: 14, fontFamily: 'inherit', outline: 'none' }
