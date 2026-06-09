// ─────────────────────────────────────────────────────────────────────────────
// TrailShop — section boutique des TRAÎNÉES de curseur (skins de particules).
// Achat € via Stripe (resolvePaidItem côté serveur), équip via equip_shop_item.
// Exporte : <TrailShop/> (section boutique) et <GlobalTrailLayer/> (rend la
// traînée équipée sur tout le site — à monter une fois dans App.jsx).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { fetchMyInventory, equipShopItem, createOpeningBgCheckout, completeOpeningBgCheckout } from '../lib/berryShop.js'
import { TRAILS, TRAIL_PRICE_CENTS, trailSkin } from '../data/cursor-trails.js'
import CursorTrail from './CursorTrail.jsx'
import GiftModal from './GiftModal.jsx'
import SpotlightCard from './SpotlightCard.jsx'

// Teinte de la lueur spotlight par rareté.
const HUE = { COMMUN: 42, RARE: 220, EPIQUE: 280, MYTHIQUE: 42, INTERDIT: 0 }

const TRAIL_KEY = 'brams_trail'
const TRAIL_EVENT = 'brams-trail-change'
const REWARD = 'cursor_trail'

const RARITY = {
  COMMUN:   { label: 'Commun',   color: '#8a8a8a', glow: 'rgba(138,138,138,0.45)', order: 1 },
  RARE:     { label: 'Rare',     color: '#3b82f6', glow: 'rgba(59,130,246,0.55)',  order: 2 },
  EPIQUE:   { label: 'Épique',   color: '#a855f7', glow: 'rgba(168,85,247,0.55)',  order: 3 },
  MYTHIQUE: { label: 'Mythique', color: '#f5b50a', glow: 'rgba(245,181,10,0.6)',   order: 4 },
  INTERDIT: { label: 'Interdit', color: '#c0392b', glow: 'rgba(192,57,43,0.7)',    order: 5 },
}
const euroFmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const priceCents = (t) => TRAIL_PRICE_CENTS[t.rarete] || 50
const formatEuro = (c) => euroFmt.format((c || 0) / 100) + ' €'

function persistTrail(id) {
  try { if (id) localStorage.setItem(TRAIL_KEY, id); else localStorage.removeItem(TRAIL_KEY) } catch {}
  window.dispatchEvent(new Event(TRAIL_EVENT))
}

// ── Rend la traînée équipée partout (App.jsx). Lit localStorage + event. ───────
export function GlobalTrailLayer() {
  const [id, setId] = useState(null)
  useEffect(() => {
    const read = () => { try { setId(localStorage.getItem(TRAIL_KEY) || null) } catch { setId(null) } }
    read()
    window.addEventListener(TRAIL_EVENT, read)
    window.addEventListener('storage', read)
    return () => { window.removeEventListener(TRAIL_EVENT, read); window.removeEventListener('storage', read) }
  }, [])
  const skin = id ? trailSkin(id) : null
  if (!skin) return null
  return <CursorTrail skin={skin} />
}

// Aperçu : un dégradé des couleurs de la traînée + emoji (pas de canvas par carte).
function TrailSwatch({ trail, size = 56 }) {
  const r = RARITY[trail.rarete]
  const cols = (trail.config.colors && trail.config.colors.length) ? trail.config.colors : ['#e8c878', '#d4a017']
  return (
    <div style={{
      width: size, height: size, display: 'grid', placeItems: 'center', borderRadius: 14, position: 'relative', overflow: 'hidden',
      background: `radial-gradient(circle at 30% 30%, ${cols[0]}, ${cols[cols.length - 1]} 70%, rgba(0,0,0,0.4))`,
      border: `1px solid ${r.color}55`, boxShadow: `inset 0 0 18px ${r.glow}`,
    }}>
      <span style={{ fontSize: Math.round(size * 0.5), filter: `drop-shadow(0 2px 6px ${r.glow})` }}>{trail.emoji}</span>
    </div>
  )
}

function TrailCard({ trail, owned, equipped, busy, onBuy, onEquip, onGift }) {
  const r = RARITY[trail.rarete]
  const [hover, setHover] = useState(false)
  let action
  if (equipped) action = <div style={{ ...btn, color: r.color, background: `${r.color}1a`, border: `1px solid ${r.color}`, cursor: 'default' }}>✓ Équipée</div>
  else if (owned) action = <button onClick={() => onEquip(trail)} disabled={busy} style={{ ...btn, color: '#0b0c0e', background: r.color, border: `1px solid ${r.color}`, cursor: 'pointer', opacity: busy ? .6 : 1 }}>Équiper</button>
  else action = <button onClick={() => onBuy(trail)} disabled={busy} style={{ ...btn, color: '#0b0c0e', background: `linear-gradient(180deg, ${r.color}, ${r.color}cc)`, border: `1px solid ${r.color}`, cursor: 'pointer', opacity: busy ? .6 : 1 }}>{busy ? '…' : `Acheter · ${formatEuro(priceCents(trail))}`}</button>

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      position: 'relative', display: 'flex', flexDirection: 'column', gap: 11, padding: 16, borderRadius: 16,
      background: 'linear-gradient(180deg, rgba(28,24,18,0.9), rgba(18,16,12,0.92))',
      border: `1.5px solid ${equipped ? r.color : hover ? `${r.color}aa` : `${r.color}3a`}`,
      boxShadow: equipped ? `0 0 0 1px ${r.color}, 0 14px 40px ${r.glow}` : hover ? `0 16px 38px ${r.glow}` : '0 6px 18px rgba(0,0,0,0.4)',
      transform: hover ? 'translateY(-5px)' : 'translateY(0)', transition: 'transform .22s cubic-bezier(.22,1,.36,1), box-shadow .22s, border-color .2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <TrailSwatch trail={trail} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Pirata One', serif", fontSize: 21, color: '#f4ecd8', lineHeight: 1.05, marginBottom: 5 }}>{trail.nom}</div>
          <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 999, fontSize: 10.5, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', color: r.color, background: `${r.color}1f`, border: `1px solid ${r.color}66`, fontFamily: "'Cinzel', serif" }}>{r.label}</span>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: 'rgba(205,189,151,0.6)', fontFamily: "'Cinzel', serif" }}>Bouge la souris pour la voir danser ✦</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>{action}</div>
        <button onClick={() => onGift(trail)} title="Offrir à un membre" style={{ flexShrink: 0, width: 44, borderRadius: 10, border: `1px solid ${r.color}55`, background: 'rgba(255,255,255,0.04)', color: r.color, cursor: 'pointer', fontSize: 17 }}>🎁</button>
      </div>
    </div>
  )
}

const btn = { width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: 800, textAlign: 'center', fontFamily: "'Cinzel', serif", letterSpacing: '.02em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }

export default function TrailShop() {
  const { isAuthenticated, discordId } = useAuth()
  const [inventory, setInventory] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [toast, setToast] = useState(null)
  const [previewId, setPreviewId] = useState(null) // aperçu live de la traînée survolée
  const [giftItem, setGiftItem] = useState(null)    // traînée à offrir (modale cadeau)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return
    const inv = await fetchMyInventory().catch(() => [])
    setInventory(Array.isArray(inv) ? inv : [])
  }, [isAuthenticated])
  useEffect(() => { refresh() }, [refresh, discordId])

  // Synchro serveur → site au montage : applique la traînée déjà équipée.
  useEffect(() => {
    const eq = inventory.find(i => i.reward_type === REWARD && i.equipped)
    persistTrail(eq ? eq.item_id : (localStorage.getItem(TRAIL_KEY) || null))
  }, [inventory])

  const owned = useMemo(() => new Set(inventory.filter(i => i.reward_type === REWARD).map(i => i.item_id)), [inventory])
  const equippedId = useMemo(() => inventory.find(i => i.reward_type === REWARD && i.equipped)?.item_id || null, [inventory])

  const showToast = (msg, kind = 'info') => { setToast({ msg, kind }); setTimeout(() => setToast(null), 3000) }

  const buy = useCallback(async (trail) => {
    if (busyId) return
    if (!isAuthenticated) { showToast('Connecte-toi pour acheter.', 'error'); return }
    setBusyId(trail.id)
    const { data, error } = await createOpeningBgCheckout(trail.id)
    if (error || !data?.url) { showToast(error?.message || 'Paiement indisponible.', 'error'); setBusyId(null); return }
    window.location.assign(data.url)
  }, [busyId, isAuthenticated])

  const equip = useCallback(async (trail) => {
    if (busyId) return
    setBusyId(trail.id)
    const { data, error } = await equipShopItem(trail.id)
    if (error) { showToast(error.message || 'Équipement impossible.', 'error'); setBusyId(null); return }
    const on = data?.equipped !== false
    persistTrail(on ? trail.id : null)
    showToast(on ? `${trail.nom} équipée ✦` : `${trail.nom} retirée.`, 'success')
    await refresh()
    setBusyId(null)
  }, [busyId, refresh])

  // Finalisation Stripe (?stripe=success) — partagée avec CursorShop, sans danger.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('stripe') !== 'success') return
    const sid = p.get('session_id')
    if (sid) { completeOpeningBgCheckout(sid).then(() => refresh()).catch(() => {}) }
  }, [refresh])

  const visible = useMemo(() => [...TRAILS].sort((a, b) => RARITY[a.rarete].order - RARITY[b.rarete].order), [])
  const livePreview = previewId ? trailSkin(previewId) : (equippedId ? trailSkin(equippedId) : null)

  return (
    <section style={{ marginTop: 64, position: 'relative' }}>
      {/* Aperçu live : la traînée survolée (ou équipée) suit la souris pendant qu'on est sur la section */}
      {livePreview && <CursorTrail skin={livePreview} />}

      <header style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: '#BFA46A', marginBottom: 6 }}>Brams Shop · Sillage</div>
        <h2 style={{ margin: 0, fontFamily: "'Pirata One', serif", fontSize: 'clamp(32px,5vw,50px)', fontWeight: 400, lineHeight: 1.02, color: '#f4ecd8', textShadow: '0 1px 0 #7a5a1e, 0 3px 0 #432f0e, 0 4px 14px rgba(0,0,0,0.6), 0 0 34px rgba(245,181,10,0.25)' }}>Traînées de Curseur</h2>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: 'rgba(205,189,151,0.7)', maxWidth: 560, fontFamily: "'Cinzel', serif" }}>
          Laisse un sillage de particules derrière ton curseur. Survole une carte pour l'essayer en direct, puis équipe-la sur tout le site.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {visible.map(trail => (
          <div key={trail.id} onMouseEnter={() => setPreviewId(trail.id)} onMouseLeave={() => setPreviewId(null)}>
            <SpotlightCard hue={HUE[trail.rarete] ?? 42} radius={16}>
              <TrailCard trail={trail} owned={owned.has(trail.id)} equipped={equippedId === trail.id} busy={busyId === trail.id} onBuy={buy} onEquip={equip} onGift={setGiftItem} />
            </SpotlightCard>
          </div>
        ))}
      </div>

      {!isAuthenticated && (
        <p style={{ marginTop: 18, fontSize: 13, color: 'rgba(205,189,151,0.6)', fontFamily: "'Cinzel', serif", textAlign: 'center' }}>
          Connecte-toi avec Discord pour acheter et équiper tes traînées.
        </p>
      )}

      {toast && (
        <div role="status" style={{
          position: 'fixed', bottom: 26, left: '50%', zIndex: 1100, transform: 'translateX(-50%)', padding: '13px 22px', borderRadius: 12, fontWeight: 800, fontSize: 14, fontFamily: "'Cinzel', serif",
          color: toast.kind === 'error' ? '#ffd9d6' : toast.kind === 'success' ? '#d6ffe6' : '#f4ecd8',
          background: toast.kind === 'error' ? 'rgba(120,40,38,0.95)' : toast.kind === 'success' ? 'rgba(28,70,48,0.95)' : 'rgba(20,18,14,0.96)',
          border: `1px solid ${toast.kind === 'error' ? 'rgba(255,120,110,0.4)' : 'rgba(245,181,10,0.3)'}`, boxShadow: '0 14px 44px rgba(0,0,0,.55)',
        }}>{toast.msg}</div>
      )}

      {giftItem && <GiftModal item={{ id: giftItem.id, nom: giftItem.nom, emoji: giftItem.emoji }} onClose={() => setGiftItem(null)} />}
    </section>
  )
}
