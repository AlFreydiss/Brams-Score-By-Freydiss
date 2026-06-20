// Page « Soutenir Brams Community » — dédiée, premium (inspiration Ko-fi, mais
// dark/or One Piece). Objectif + feed des soutiens + formulaire de don Stripe
// (paiement réel, montant libre). Le don alimente la cagnotte automatiquement.
import { useState, useEffect } from 'react'
import { fetchCagnotte } from '../lib/supabase.js'
import { createDonateCheckout, completeDonate } from '../lib/berryShop.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import BerriesCanvas from './ui/BerriesCanvas.jsx'
import { useCountUp } from '../hooks/useCountUp.js'

// Couleur du badge montant selon la valeur (feed "Ils ont soutenu").
const AURAS = ['auraOr', 'auraArgent', 'auraBronze']
function amountBadgeStyle(amount) {
  const a = Number(amount) || 0
  if (a > 50) return { background: 'linear-gradient(135deg,#e63946,#ff6b35)', color: '#fff', boxShadow: '0 0 12px rgba(230,57,70,.5)' }
  if (a > 20) return { background: '#f5a623', color: '#1a1206' }
  if (a >= 5) return { background: '#4e7cff', color: '#fff' }
  return { background: '#6c757d', color: '#fff' }
}

const GOLD = '#f5b50a', GOLD_SOFT = '#d8bd7e'
const PRESETS = [5, 10, 30, 50]
const euro = (n) => `${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('fr-FR')} €`
const HUES = ['#e0524a', '#a855f7', '#3b82f6', '#16a34a', '#f59e0b', '#ec4899']
const hueFor = (s) => HUES[[...(s || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length]
const initial = (n) => (n || '?').trim().slice(0, 1).toUpperCase()

// Avatar d'un donateur : photo de profil si le donateur est un membre (avatar_url
// résolu côté fetchCagnotte), sinon initiale colorée. Fallback initiale si l'image casse.
function DonorAvatar({ d, size = 38 }) {
  const [broken, setBroken] = useState(false)
  const base = { flexShrink: 0, width: size, height: size, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 900, color: '#fff', fontSize: Math.round(size * 0.4), overflow: 'hidden', background: `linear-gradient(135deg,${hueFor(d.name)},${hueFor(d.name)}aa)` }
  if (d.avatar_url && !broken) {
    return <span style={base}><img loading="lazy" decoding="async" src={d.avatar_url} alt="" onError={() => setBroken(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></span>
  }
  return <span style={base}>{initial(d.name)}</span>
}
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
  const [ripples, setRipples] = useState([])

  const load = () => fetchCagnotte({ withAvatars: true }).then(setData)
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

  // Effet ripple sur le bouton Donner (au point cliqué) puis lance le don.
  const fireDonate = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const id = Date.now() + Math.random()
    setRipples(rs => [...rs, { id, x: e.clientX - r.left, y: e.clientY - r.top }])
    setTimeout(() => setRipples(rs => rs.filter(rp => rp.id !== id)), 500)
    donate()
  }

  const goal = data?.goal || 200, total = data?.total || 0
  const donors = data?.donors || []
  const topDonors = [...donors].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0)).slice(0, 3)
  const pct = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0
  const animatedTotal = useCountUp(total, 2000)   // 0 → total (ease-out)

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#0a0b0e,#08090c 60%,#070809)', color: '#f4ecd8', paddingTop: 72, position: 'relative' }}>
      <BerriesCanvas />
      <style>{`@keyframes sp-grow{from{width:0}} @keyframes sp-shine{0%{background-position:200% 0}100%{background-position:-200% 0}} .sp-feed::-webkit-scrollbar{width:6px}.sp-feed::-webkit-scrollbar-thumb{background:rgba(212,176,110,.25);border-radius:3px}`}</style>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 1, overflow: 'hidden', padding: 'clamp(40px,6vw,72px) 24px clamp(32px,4vw,48px)', textAlign: 'center' }}>
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
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '0 20px 100px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 24, alignItems: 'start' }} className="sp-grid">
        <style>{`@media(max-width:820px){.sp-grid{grid-template-columns:1fr !important}}`}</style>

        {/* Gauche : objectif + feed */}
        <div style={card()}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 34, fontWeight: 900, color: GOLD, fontFamily: "'Cinzel', serif", fontVariantNumeric: 'tabular-nums', filter: 'drop-shadow(0 0 18px rgba(245,181,10,.35))' }}>
              {animatedTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
            <span style={{ fontSize: 13, color: 'rgba(205,189,151,0.6)' }}>objectif {euro(goal)}</span>
          </div>
          {/* Barre ÉPIQUE : remplissage animé + shimmer doré + reflet blanc qui glisse */}
          <div style={{ position: 'relative', height: 16, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="fou-bar" style={{ width: `${pct}%`, height: '100%', borderRadius: 99, transition: 'width 1.8s cubic-bezier(.22,1,.36,1)',
              background: 'linear-gradient(90deg,#f5a623,#f7c948,#f5a623)', backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite', boxShadow: `0 0 18px ${GOLD}77` }}>
              <div className="fou-reflet" style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.32), transparent)', animation: 'barReflet 2.5s ease-in-out infinite' }} />
            </div>
          </div>
          <div className="fou-badge" style={{ marginTop: 8, fontSize: 13.5, fontWeight: 900, letterSpacing: '.04em',
            color: pct >= 100 ? '#7fe6a8' : '#f7c948', textShadow: pct >= 100 ? 'none' : '0 0 12px rgba(247,201,72,0.7)',
            fontFamily: "'Cinzel', serif", animation: pct >= 100 ? 'none' : 'badgePulse 3s ease-in-out infinite' }}>
            {pct >= 100 ? '🎉 Objectif atteint, merci les nakamas !' : `${pct}% DE L'OBJECTIF`}
          </div>

          {/* Podium — Top 3 soutiens par montant */}
          {topDonors.length >= 2 && (
            <>
              <div style={{ marginTop: 22, fontSize: 10.5, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(205,189,151,0.5)', marginBottom: 11 }}>🏆 Top soutiens</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topDonors.map((d, i) => {
                  const first = i === 0
                  return (
                    <div key={`top-${d.id}`} className={`fou-podium fou-${AURAS[i]}`}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.025) translateY(-2px)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
                      style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 12, transition: 'transform .2s ease',
                        background: first ? 'linear-gradient(135deg, rgba(245,181,10,0.16), rgba(245,181,10,0.03))' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${first ? 'rgba(245,181,10,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        animation: `${AURAS[i]} 2s ease-in-out infinite` }}>
                      <span style={{ fontSize: 18, width: 22, textAlign: 'center', flexShrink: 0 }}>{['🥇', '🥈', '🥉'][i]}</span>
                      <DonorAvatar d={d} size={32} />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, color: '#f4ecd8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                      <span style={{ flexShrink: 0, fontSize: 14.5, fontWeight: 900, color: GOLD, fontFamily: "'Cinzel', serif" }}>{euro(d.amount)}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          <div style={{ marginTop: 22, fontSize: 10.5, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(205,189,151,0.5)', marginBottom: 12 }}>Ils ont soutenu · {donors.length}</div>
          <div className="sp-feed" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 440, overflowY: 'auto', paddingRight: 4 }}>
            {!donors.length && <span style={{ fontSize: 13, color: 'rgba(205,189,151,0.5)' }}>Sois le premier à soutenir 🏴‍☠️</span>}
            {donors.map((d, i) => (
              <div key={d.id} className="fou-feed-item" style={{ display: 'flex', gap: 11, alignItems: 'flex-start', opacity: 0, animation: 'slideInLeft 0.45s ease forwards', animationDelay: `${Math.min(i, 12) * 80}ms` }}>
                <DonorAvatar d={d} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 14 }}>{d.name}</strong>
                    <span style={{ fontSize: 11.5, fontWeight: 800, borderRadius: 999, padding: '1px 8px', ...amountBadgeStyle(d.amount) }}>{euro(d.amount)}</span>
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
              return <button key={v} onClick={() => { setCustom(''); setAmount(v) }} className={active ? 'fou-amount' : undefined}
                onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = GOLD }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'rgba(191,164,106,0.25)' }}
                style={{ padding: '13px 0', borderRadius: 11, cursor: 'pointer', fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 15, transition: 'border-color .18s, transform .12s',
                  color: active ? '#1a1206' : GOLD_SOFT, background: active ? `linear-gradient(180deg,#f6d98a,${GOLD})` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? GOLD : 'rgba(191,164,106,0.25)'}`, animation: active ? 'activeAmount 1.5s ease-in-out infinite' : 'none' }}>{v} €</button>
            })}
          </div>
          <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="ou un autre montant (€)" inputMode="decimal" style={inp} />

          <label style={lbl}>Ton nom (affiché dans le feed)</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Anonyme" style={inp} />
          <label style={lbl}>Petit mot (optionnel)</label>
          <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 200))} rows={3} placeholder="Continuez comme ça les gars 🔥" style={{ ...inp, resize: 'vertical', minHeight: 64 }} />

          {error && <div style={{ marginTop: 8, fontSize: 12.5, color: '#ffb3ab', fontWeight: 700 }}>{error}</div>}

          <button onClick={fireDonate} disabled={busy || !valid}
            onMouseEnter={e => { if (!(busy || !valid)) { e.currentTarget.style.transform = 'scale(1.03) translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(245,166,35,0.55)' } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 14px 38px ${GOLD}40` }}
            style={{
              position: 'relative', overflow: 'hidden', marginTop: 16, width: '100%', padding: 15, borderRadius: 13, border: 'none', cursor: busy || !valid ? 'default' : 'pointer',
              fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 16, color: '#1a1206', opacity: busy || !valid ? 0.6 : 1, transition: 'transform .2s ease, box-shadow .2s ease',
              background: 'linear-gradient(135deg,#f5a623,#f7c948,#f5a623)', backgroundSize: '200% 100%', animation: 'shimmerBtn 2.5s linear infinite', boxShadow: `0 14px 38px ${GOLD}40`,
            }}>
            <span style={{ position: 'relative', zIndex: 1 }}>{busy ? 'Redirection…' : `💛 Donner ${valid ? euro(finalAmount) : ''}`}</span>
            {ripples.map(rp => (
              <span key={rp.id} aria-hidden style={{ position: 'absolute', left: rp.x, top: rp.y, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'rgba(255,255,255,0.5)', pointerEvents: 'none', animation: 'rippleExpand 0.5s ease forwards' }} />
            ))}
          </button>
          <p style={{ margin: '12px 0 0', fontSize: 11, color: 'rgba(205,189,151,0.45)', textAlign: 'center' }}>Tu recevras une facture par mail. Merci 🏴‍☠️</p>
        </div>
      </div>
    </div>
  )
}

const card = () => ({ borderRadius: 18, padding: 'clamp(20px,3vw,28px)', border: '1px solid rgba(212,160,23,0.15)', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' })
const lbl = { display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(205,189,151,0.7)', margin: '14px 0 6px', fontFamily: "'Cinzel', serif" }
const inp = { width: '100%', boxSizing: 'border-box', padding: '12px 13px', borderRadius: 10, border: '1px solid rgba(191,164,106,0.28)', background: 'rgba(255,255,255,0.04)', color: '#f4ecd8', fontSize: 14, fontFamily: 'inherit', outline: 'none' }
