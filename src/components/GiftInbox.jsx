// Popup « tu as reçu un cadeau ! » — affichée à la connexion quand des cadeaux
// non vus existent. Récupère les cadeaux (RLS), les présente, puis les marque vus.
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { fetchUnseenGifts, markGiftsSeen } from '../lib/berryShop.js'

export default function GiftInbox() {
  const { isAuthenticated } = useAuth()
  const [gifts, setGifts] = useState([])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) { setGifts([]); return }
    let ignore = false
    // petit délai : laisse l'auth/JWT se poser avant le fetch RLS
    const t = setTimeout(() => {
      fetchUnseenGifts().then(g => { if (!ignore && g.length) { setGifts(g); setIdx(0) } })
    }, 1200)
    return () => { ignore = true; clearTimeout(t) }
  }, [isAuthenticated])

  if (!gifts.length || idx >= gifts.length) return null
  const g = gifts[idx]
  const last = idx >= gifts.length - 1

  const next = () => {
    if (last) { markGiftsSeen(gifts.map(x => x.id)); setGifts([]) }
    else setIdx(i => i + 1)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(6,7,10,0.82)', backdropFilter: 'blur(12px)', animation: 'giftFade .3s ease' }}>
      <style>{`
        @keyframes giftFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes giftPop  { 0% { transform: scale(.85) translateY(14px); opacity: 0 } 60% { transform: scale(1.03) } 100% { transform: scale(1) translateY(0); opacity: 1 } }
        @keyframes giftWiggle { 0%,100% { transform: rotate(-7deg) } 50% { transform: rotate(7deg) } }
        @keyframes giftShine { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
      `}</style>
      <div style={{
        width: 'min(460px, 100%)', borderRadius: 24, padding: '36px 30px 28px', textAlign: 'center', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(32,26,16,0.99), rgba(16,13,9,1))',
        border: '1px solid rgba(245,181,10,0.4)', boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 70px rgba(245,181,10,0.14)',
        animation: 'giftPop .5s cubic-bezier(.22,1.2,.36,1) both',
      }}>
        {/* halo */}
        <div aria-hidden style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,181,10,0.22), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ fontSize: 72, lineHeight: 1, display: 'inline-block', animation: 'giftWiggle 1.4s ease-in-out infinite', filter: 'drop-shadow(0 6px 18px rgba(245,181,10,0.5))' }}>🎁</div>

        <div style={{ marginTop: 14, fontSize: 11, fontWeight: 900, letterSpacing: '.22em', textTransform: 'uppercase', color: '#BFA46A', fontFamily: "'Cinzel', serif" }}>Un nakama pense à toi</div>
        <h2 style={{
          margin: '6px 0 4px', fontFamily: "'Pirata One', serif", fontSize: 34, lineHeight: 1.05,
          background: 'linear-gradient(90deg, #f6d98a, #f5b50a, #f6d98a)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'giftShine 3s linear infinite',
        }}>Tu as reçu un cadeau !</h2>

        <p style={{ margin: '14px 0 0', fontSize: 15, color: '#f4ecd8', fontFamily: "'Cinzel', serif" }}>
          <strong style={{ color: '#f5b50a' }}>{g.gifter_name || 'Un membre'}</strong> t'a offert
        </p>
        <div style={{ margin: '8px auto 0', display: 'inline-block', padding: '8px 18px', borderRadius: 999, background: 'rgba(245,181,10,0.12)', border: '1px solid rgba(245,181,10,0.4)', color: '#ffdf9e', fontWeight: 800, fontFamily: "'Cinzel', serif" }}>
          {g.item_label || g.item_id}
        </div>

        {g.message && (
          <div style={{ margin: '18px 0 0', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13.5, color: 'rgba(244,236,216,0.9)', fontStyle: 'italic' }}>
            « {g.message} »
          </div>
        )}

        <p style={{ margin: '18px 0 0', fontSize: 12.5, color: 'rgba(205,189,151,0.65)' }}>C'est déjà dans ton inventaire — équipe-le quand tu veux ✦</p>

        <button onClick={next} style={{
          marginTop: 22, width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer',
          fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 15, color: '#0b0c0e',
          background: 'linear-gradient(180deg, #f5b50a, #d4920a)', boxShadow: '0 12px 34px rgba(245,181,10,0.32)',
        }}>{gifts.length > 1 && !last ? `Suivant (${idx + 1}/${gifts.length})` : 'Merci ! 🏴‍☠️'}</button>
      </div>
    </div>
  )
}
