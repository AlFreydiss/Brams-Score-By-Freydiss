// Panier boutique : bouton flottant + tiroir coulissant (promo 1 offert sur 2,
// total, paiement Stripe groupé) + carte de confirmation au retour de paiement.
// Tout en inline styles (Tailwind non global ici). À monter dans la page Boutique
// sous <CartProvider>.
import { useState, useEffect, useRef } from 'react'
import { useCart } from '../contexts/CartContext.jsx'
import { createCartCheckout } from '../lib/berryShop.js'

const GOLD = '#f5b50a'
const euro = (c) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((c || 0) / 100) + ' €'

export default function CartDrawer() {
  const { items, remove, clear, open, setOpen, pricing } = useCart()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [receipt, setReceipt] = useState(null) // { count, total, id } après paiement
  const snapshot = useRef(null)

  // Snapshot du panier juste avant la redirection Stripe (pour le reçu au retour).
  const pay = async () => {
    if (busy || !items.length) return
    setBusy(true); setError(null)
    snapshot.current = { count: items.length, total: pricing.total, freeCount: pricing.freeIds.size }
    try { localStorage.setItem('brams_cart_pending', JSON.stringify(snapshot.current)) } catch {}
    const { data, error: err } = await createCartCheckout(items.map(i => i.id))
    if (err || !data?.url) { setError(err?.message || 'Paiement indisponible.'); setBusy(false); return }
    window.location.assign(data.url)
  }

  // Retour de paiement : ?stripe=success + un panier en attente → reçu + vide le panier.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('stripe') !== 'success') return
    let pend = null
    try { pend = JSON.parse(localStorage.getItem('brams_cart_pending') || 'null') } catch {}
    if (pend && pend.count) {
      setReceipt({ ...pend, id: (p.get('session_id') || '').slice(-8).toUpperCase() || '——' })
      clear()
      try { localStorage.removeItem('brams_cart_pending') } catch {}
    }
  }, [clear])

  return (
    <>
      {/* Bouton flottant */}
      {items.length > 0 && !open && (
        <button onClick={() => setOpen(true)} aria-label="Ouvrir le panier" style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1180, width: 60, height: 60, borderRadius: 18, cursor: 'pointer',
          border: `1px solid ${GOLD}66`, background: 'linear-gradient(180deg, rgba(40,32,16,0.96), rgba(20,16,9,0.98))',
          boxShadow: `0 14px 40px rgba(0,0,0,0.5), 0 0 28px ${GOLD}33`, fontSize: 24, color: GOLD,
        }}>🛒
          <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 22, height: 22, padding: '0 6px', borderRadius: 11, background: GOLD, color: '#0b0c0e', fontSize: 12, fontWeight: 900, display: 'grid', placeItems: 'center', fontFamily: "'Cinzel', serif" }}>{items.length}</span>
        </button>
      )}

      {/* Tiroir */}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1190, background: 'rgba(6,7,10,0.6)', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(400px, 100%)', display: 'flex', flexDirection: 'column',
            background: 'linear-gradient(180deg, rgba(24,20,14,0.99), rgba(14,12,8,1))', borderLeft: `1px solid ${GOLD}33`,
            boxShadow: '-20px 0 60px rgba(0,0,0,0.6)', animation: 'cartSlide .28s cubic-bezier(.22,1,.36,1)',
          }}>
            <style>{`@keyframes cartSlide { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 style={{ margin: 0, fontFamily: "'Pirata One', serif", fontSize: 26, color: '#f4ecd8' }}>Ton panier</h3>
              <button onClick={() => setOpen(false)} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#cdbd97', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>
              {!items.length && <p style={{ color: 'rgba(205,189,151,0.6)', fontFamily: "'Cinzel', serif", textAlign: 'center', marginTop: 40 }}>Panier vide. Ajoute des curseurs, traînées ou fonds ✦</p>}
              {items.map(i => {
                const free = pricing.freeIds.has(i.id)
                return (
                  <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: 26 }}>{i.emoji || '✦'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#f4ecd8', fontFamily: "'Cinzel', serif" }}>{i.label}</div>
                      {free
                        ? <span style={{ fontSize: 11, fontWeight: 900, color: '#7fe6a8' }}>🎁 OFFERT</span>
                        : <span style={{ fontSize: 12, color: GOLD, fontWeight: 800 }}>{euro(i.priceCents)}</span>}
                    </div>
                    <button onClick={() => remove(i.id)} aria-label="Retirer" style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#caa', cursor: 'pointer', fontSize: 13 }}>✕</button>
                  </div>
                )
              })}
            </div>

            {items.length > 0 && (
              <div style={{ padding: '18px 22px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(205,189,151,0.7)', marginBottom: 4 }}><span>Sous-total</span><span>{euro(pricing.subtotal)}</span></div>
                {pricing.saved > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#7fe6a8', fontWeight: 800, marginBottom: 4 }}><span>🎁 1 offert sur 2</span><span>−{euro(pricing.saved)}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, color: '#f4ecd8', fontWeight: 900, fontFamily: "'Cinzel', serif", margin: '8px 0 14px' }}><span>Total</span><span style={{ color: GOLD }}>{euro(pricing.total)}</span></div>
                {error && <div style={{ fontSize: 12.5, color: '#ffb3ab', fontWeight: 700, marginBottom: 10 }}>{error}</div>}
                <button onClick={pay} disabled={busy} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: busy ? 'default' : 'pointer', fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 15, color: '#0b0c0e', opacity: busy ? 0.6 : 1, background: `linear-gradient(180deg, ${GOLD}, #d4920a)`, boxShadow: `0 12px 32px ${GOLD}44` }}>
                  {busy ? 'Redirection…' : `Payer ${euro(pricing.total)} →`}
                </button>
                <button onClick={clear} style={{ width: '100%', marginTop: 8, padding: 8, background: 'none', border: 'none', color: 'rgba(205,189,151,0.5)', cursor: 'pointer', fontSize: 12, fontFamily: "'Cinzel', serif" }}>Vider le panier</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Carte de confirmation (OrderConfirmationCard 21st.dev adaptée inline) */}
      {receipt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1500, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(6,7,10,0.82)', backdropFilter: 'blur(12px)', animation: 'cartFade .3s ease' }}>
          <style>{`@keyframes cartFade { from {opacity:0} to {opacity:1} } @keyframes cartPop { 0%{transform:scale(.9);opacity:0} 60%{transform:scale(1.02)} 100%{transform:scale(1);opacity:1} }`}</style>
          <div style={{ width: 'min(400px,100%)', borderRadius: 22, padding: '34px 28px', textAlign: 'center', background: 'linear-gradient(180deg, rgba(28,24,16,0.99), rgba(14,12,8,1))', border: `1px solid ${GOLD}40`, boxShadow: `0 40px 100px rgba(0,0,0,0.7), 0 0 60px ${GOLD}14`, animation: 'cartPop .5s cubic-bezier(.22,1.2,.36,1) both' }}>
            <div style={{ width: 64, height: 64, margin: '0 auto', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(127,230,168,0.12)', border: '1px solid rgba(127,230,168,0.4)', fontSize: 34 }}>✓</div>
            <h2 style={{ margin: '18px 0 6px', fontFamily: "'Pirata One', serif", fontSize: 30, color: '#f4ecd8' }}>Commande validée !</h2>
            <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(205,189,151,0.7)', fontFamily: "'Cinzel', serif" }}>Tes articles sont dans ton inventaire ✦</p>
            <div style={{ margin: '20px 0 8px', textAlign: 'left' }}>
              {[['Commande', `#${receipt.id}`], ['Articles', `${receipt.count}${receipt.freeCount ? ` (${receipt.freeCount} offert${receipt.freeCount > 1 ? 's' : ''})` : ''}`], ['Total payé', euro(receipt.total)]].map(([k, v], idx, arr) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none', fontSize: 14, color: k === 'Total payé' ? '#f4ecd8' : 'rgba(205,189,151,0.75)', fontWeight: k === 'Total payé' ? 900 : 600, fontFamily: "'Cinzel', serif" }}>
                  <span>{k}</span><span style={{ color: k === 'Total payé' ? GOLD : undefined }}>{v}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setReceipt(null)} style={{ width: '100%', marginTop: 16, padding: 13, borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 14.5, color: '#0b0c0e', background: `linear-gradient(180deg, ${GOLD}, #d4920a)`, boxShadow: `0 12px 34px ${GOLD}33` }}>Voir mon butin 🏴‍☠️</button>
          </div>
        </div>
      )}
    </>
  )
}
