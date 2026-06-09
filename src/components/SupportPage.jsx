// Page « Soutenir Brams Community » — dédiée, premium (inspiration Ko-fi, mais
// dark/or One Piece). Objectif + feed des soutiens + formulaire de don Stripe
// (paiement réel, montant libre). Le don alimente la cagnotte automatiquement.
import { useState, useEffect } from 'react'
import { fetchCagnotte } from '../lib/supabase.js'
import { createDonateCheckout, completeDonate } from '../lib/berryShop.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const GOLD = '#f5b50a', GOLD_SOFT = '#d8bd7e'
const PRESETS = [3, 5, 10, 20]
const euro = (n) => `${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('fr-FR')} €`
const HUES = ['#e0524a', '#a855f7', '#3b82f6', '#16a34a', '#f59e0b', '#ec4899']
const hueFor = (s) => HUES[[...(s || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length]
const initial = (n) => (n || '?').trim().slice(0, 1).toUpperCase()
function timeAgo(iso) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return "à l'instant"; const m = Math.floor(s / 60); if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60); if (h < 24) return `il y a ${h} h`; const j = Math.floor(h / 24)
  if (j < 30) return `il y a ${j} j`; return `il y a ${Math.floor(j / 30)} mois`
}

export default function SupportPage() {
  const { displayName } = useAuth()
  const [data, setData] = useState(null)
  const [amount, setAmount] = useState(5)
  const [custom, setCustom] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [thanks, setThanks] = useState(false)

  const load = () => fetchCagnotte().then(setData)
  // Actualisation EN LIVE : recharge la cagnotte + les soutiens toutes les 12s
  // (tant que l'onglet est visible) et au retour de focus → un nouveau don
  // apparaît tout seul, sans recharger la page.
  useEffect(() => {
    load()
    const tick = () => { if (!document.hidden) load() }
    const id = setInterval(tick, 12000)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(id); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick) }
  }, [])
  useEffect(() => { if (displayName && !name) setName(displayName) }, [displayName]) // pré-rempli

  // Retour de paiement
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const mode = p.get('stripe'); if (!mode) return
    if (mode === 'donated') {
      const sid = p.get('session_id')
      ;(async () => { if (sid) await completeDonate(sid); setThanks(true); await load() })()
    }
    window.history.replaceState({}, '', '/soutenir')
  }, [])

  const finalAmount = custom ? parseFloat(custom.replace(',', '.')) : amount
  const valid = Number.isFinite(finalAmount) && finalAmount >= 0.5

  const donate = async () => {
    if (busy) return
    if (!valid) { setError('Montant minimum 0,50 €.'); return }
    setBusy(true); setError(null)
    const { data: d, error: err } = await createDonateCheckout(finalAmount, name.trim() || 'Anonyme', message.trim())
    if (err || !d?.url) { setError(err?.message || 'Paiement indisponible.'); setBusy(false); return }
    window.location.assign(d.url)
  }

  const goal = data?.goal || 200, total = data?.total || 0
  const donors = data?.donors || []
  const pct = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#0a0b0e,#08090c 60%,#070809)', color: '#f4ecd8', paddingTop: 72 }}>
      <style>{`@keyframes sp-grow{from{width:0}} @keyframes sp-shine{0%{background-position:200% 0}100%{background-position:-200% 0}} .sp-feed::-webkit-scrollbar{width:6px}.sp-feed::-webkit-scrollbar-thumb{background:rgba(212,176,110,.25);border-radius:3px}`}</style>

      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(40px,6vw,72px) 24px clamp(32px,4vw,48px)', textAlign: 'center' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(245,181,10,0.14), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>💛</div>
          <h1 style={{ margin: 0, fontFamily: "'Pirata One', serif", fontSize: 'clamp(2.8rem,6vw,5rem)', lineHeight: 1, background: `linear-gradient(90deg,#f6d98a,${GOLD},#f6d98a)`, backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'sp-shine 4s linear infinite', filter: 'drop-shadow(0 0 40px rgba(212,160,23,0.3))' }}>Soutiens Brams Community</h1>
          <p style={{ margin: '14px auto 0', maxWidth: 600, fontSize: 15.5, color: 'rgba(205,189,151,0.8)', fontFamily: "'Cinzel', serif", lineHeight: 1.6 }}>
            {data?.subtitle || "Le serveur, les événements, l'hébergement du site et les animes — tout ça tourne grâce à toi. Chaque don compte 🏴‍☠️"}
          </p>
        </div>
      </div>

      {/* 2 colonnes */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 100px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 24, alignItems: 'start' }} className="sp-grid">
        <style>{`@media(max-width:820px){.sp-grid{grid-template-columns:1fr !important}}`}</style>

        {/* Gauche : objectif + feed */}
        <div style={card()}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: GOLD, fontFamily: "'Cinzel', serif" }}>{euro(total)}</span>
            <span style={{ fontSize: 13, color: 'rgba(205,189,151,0.6)' }}>objectif {euro(goal)}</span>
          </div>
          <div style={{ height: 14, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, animation: 'sp-grow 1.1s cubic-bezier(.22,1,.36,1)', background: `linear-gradient(90deg,${GOLD_SOFT},${GOLD},#ffe9a8,${GOLD})`, backgroundSize: '200% 100%', boxShadow: `0 0 16px ${GOLD}66` }} />
          </div>
          <div style={{ marginTop: 7, fontSize: 13, fontWeight: 800, color: pct >= 100 ? '#7fe6a8' : GOLD_SOFT, fontFamily: "'Cinzel', serif" }}>
            {pct >= 100 ? '🎉 Objectif atteint, merci les nakamas !' : `${pct}% de l'objectif`}
          </div>

          <div style={{ marginTop: 22, fontSize: 10.5, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(205,189,151,0.5)', marginBottom: 12 }}>Ils ont soutenu · {donors.length}</div>
          <div className="sp-feed" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 440, overflowY: 'auto', paddingRight: 4 }}>
            {!donors.length && <span style={{ fontSize: 13, color: 'rgba(205,189,151,0.5)' }}>Sois le premier à soutenir 🏴‍☠️</span>}
            {donors.map(d => (
              <div key={d.id} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 900, color: '#fff', fontSize: 15, background: `linear-gradient(135deg,${hueFor(d.name)},${hueFor(d.name)}aa)` }}>{initial(d.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 14 }}>{d.name}</strong>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: '#1a1206', background: GOLD, borderRadius: 999, padding: '1px 8px' }}>{euro(d.amount)}</span>
                    <span style={{ fontSize: 11, color: 'rgba(205,189,151,0.45)' }}>{timeAgo(d.created_at)}</span>
                  </div>
                  {d.message && <div style={{ marginTop: 4, fontSize: 12.5, color: 'rgba(244,236,216,0.82)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, padding: '7px 10px' }}>{d.message}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Droite : formulaire de don */}
        <div style={{ ...card(), position: 'sticky', top: 90 }}>
          {thanks && <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 11, background: 'rgba(127,230,168,0.12)', border: '1px solid rgba(127,230,168,0.4)', color: '#bff5d4', fontWeight: 800, fontSize: 13.5, textAlign: 'center' }}>💛 Merci pour ton soutien ! Tu apparais dans le feed.</div>}
          <h2 style={{ margin: '0 0 4px', fontFamily: "'Pirata One', serif", fontSize: 28 }}>Faire un don</h2>
          <p style={{ margin: '0 0 18px', fontSize: 13, color: 'rgba(205,189,151,0.65)', fontFamily: "'Cinzel', serif" }}>Paiement sécurisé par carte (Stripe) · ponctuel</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
            {PRESETS.map(v => {
              const active = !custom && amount === v
              return <button key={v} onClick={() => { setCustom(''); setAmount(v) }} style={{ padding: '13px 0', borderRadius: 11, cursor: 'pointer', fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 15, color: active ? '#1a1206' : GOLD_SOFT, background: active ? `linear-gradient(180deg,#f6d98a,${GOLD})` : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? GOLD : 'rgba(191,164,106,0.25)'}` }}>{v} €</button>
            })}
          </div>
          <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="ou un autre montant (€)" inputMode="decimal" style={inp} />

          <label style={lbl}>Ton nom (affiché dans le feed)</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Anonyme" style={inp} />
          <label style={lbl}>Petit mot (optionnel)</label>
          <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 200))} rows={3} placeholder="Continuez comme ça les gars 🔥" style={{ ...inp, resize: 'vertical', minHeight: 64 }} />

          {error && <div style={{ marginTop: 8, fontSize: 12.5, color: '#ffb3ab', fontWeight: 700 }}>{error}</div>}

          <button onClick={donate} disabled={busy || !valid} style={{
            marginTop: 16, width: '100%', padding: 15, borderRadius: 13, border: 'none', cursor: busy || !valid ? 'default' : 'pointer',
            fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 16, color: '#1a1206', opacity: busy || !valid ? 0.6 : 1,
            background: `linear-gradient(180deg,#f6d98a,${GOLD},#d4920a)`, boxShadow: `0 14px 38px ${GOLD}40`,
          }}>{busy ? 'Redirection…' : `💛 Donner ${valid ? euro(finalAmount) : ''}`}</button>
          <p style={{ margin: '12px 0 0', fontSize: 11, color: 'rgba(205,189,151,0.45)', textAlign: 'center' }}>Tu recevras une facture par mail. Merci 🏴‍☠️</p>
        </div>
      </div>
    </div>
  )
}

const card = () => ({ borderRadius: 18, padding: 'clamp(20px,3vw,28px)', border: '1px solid rgba(212,160,23,0.15)', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' })
const lbl = { display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(205,189,151,0.7)', margin: '14px 0 6px', fontFamily: "'Cinzel', serif" }
const inp = { width: '100%', boxSizing: 'border-box', padding: '12px 13px', borderRadius: 10, border: '1px solid rgba(191,164,106,0.28)', background: 'rgba(255,255,255,0.04)', color: '#f4ecd8', fontSize: 14, fontFamily: 'inherit', outline: 'none' }
