// ── Brams Shop — boutique premium de fonds d'opening rares ───────────────────
// DA : noir profond, or discret, verre sombre, bordures fines, raretés élégantes,
// animations subtiles. Vibe « archive anime haut de gamme / coffre rare ».
// Fonds d'opening premium : prix en euros par rareté, équipement via OpeningBgContext,
// possédés depuis l'inventaire Supabase. Catalogue statique.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { createOpeningBgCheckout, completeOpeningBgCheckout, fetchOwnedBackgrounds, fetchOpeningBgEquipCounts, fetchShopBalance, createBerryCheckout, BERRY_PACKS } from '../lib/berryShop.js'
import { useOpeningBg } from '../contexts/OpeningBgContext.jsx'
import { OPENING_BACKGROUNDS } from '../data/opening-backgrounds.js'
import CursorShop from './CursorShop.jsx'
import TrailShop from './TrailShop.jsx'
import { track } from '../lib/analytics.js'
import { CartProvider, useCart } from '../contexts/CartContext.jsx'
import CartDrawer from './CartDrawer.jsx'
import PromoBanner from './PromoBanner.jsx'
import GiftModal from './GiftModal.jsx'
import { vipFree, AMEL_ID, AMEL_MESSAGE } from '../lib/vip.js'
import { formatEuroCents, openingBgPriceCents, openingBgPriceLabel, OPENING_BG_EURO_PRICE_CENTS } from '../lib/openingBgPricing.js'

// Vraie fourchette de prix des fonds (min/max de la table par rareté).
const BG_PRICE_RANGE = (() => {
  const vals = Object.values(OPENING_BG_EURO_PRICE_CENTS)
  return { min: Math.min(...vals), max: Math.max(...vals) }
})()
import OpeningBgMedia from './social/OpeningBgMedia.jsx'
import RarityRow from './boutique/RarityRow.jsx'
import ShopRail from './boutique/ShopRail.jsx'
import FondCard, { CARD_MIN_WIDTH, CARD_GAP } from './boutique/FondCard.jsx'

// Ordre des rangées « Netflix » (les plus rares en premier).
const RARITY_ORDER = ['Secret', 'Interdit', 'Mythique', 'Legendaire', 'Epique', 'Rare', 'Commun']

// ── Tokens ───────────────────────────────────────────────────────────────────
const GOLD = '#bfa46a'        // or discret
const GOLD_HI = '#d8bd7e'     // or accent (prix, CTA)
const BG = '#08090d'
const TXT = '#ece8df'
const DIM = 'rgba(236,232,223,0.52)'
const FAINT = 'rgba(236,232,223,0.34)'
const HAIR = 'rgba(255,255,255,0.08)'
const GLASS = 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))'

// Raretés — sobres, élégantes (accent fin, jamais de glow abusé).
const RARITY = {
  Commun:     { label: 'Commun',     c: '#8a93a6', rank: 1 },
  Rare:       { label: 'Rare',       c: '#5481d6', rank: 2 },
  Epique:     { label: 'Épique',     c: '#9170c8', rank: 3 },
  Legendaire: { label: 'Légendaire', c: '#c9a227', rank: 4 },
  Mythique:   { label: 'Mythique',   c: '#c77dc4', rank: 5 },
  Secret:     { label: 'Secret',     c: '#c8313b', rank: 6 },
  Interdit:   { label: 'Interdit',   c: '#b1413d', rank: 7 },
}
const rar = (r) => RARITY[r] || RARITY.Commun
const priceCentsOf = (bg) => openingBgPriceCents(bg)
const priceLabel = (bg) => openingBgPriceLabel(bg)

const FILTERS = [
  { id: 'all',     label: 'Tous' },
  { id: 'owned',   label: 'Possédés' },
  { id: 'unowned', label: 'Non possédés' },
  { id: 'equipped',label: 'Équipés' },
  { id: 'new',     label: 'Nouveautés' },
  { id: 'rare',    label: 'Rares' },
  { id: 'secret',  label: 'Secrets' },
]
const SORTS = [
  { id: 'rarity',     label: 'Rareté' },
  { id: 'price-asc',  label: 'Prix croissant' },
  { id: 'price-desc', label: 'Prix décroissant' },
  { id: 'new',        label: 'Nouveautés' },
  { id: 'owned',      label: 'Possédés d\'abord' },
]

const CSS = `
  .bsx-card { transition: transform .22s cubic-bezier(.2,.7,.3,1), border-color .22s, box-shadow .22s; }
  .bsx-card:hover { transform: translateY(-4px); }
  .bsx-card:hover .bsx-media { transform: scale(1.06); }
  .bsx-card:hover .bsx-foot { transform: translateY(0); opacity: 1; }
  .bsx-media { transition: transform .5s cubic-bezier(.2,.7,.3,1); }
  .bsx-foot { transition: transform .25s ease, opacity .25s ease; }
  .bsx-btn { transition: background .16s, color .16s, border-color .16s, transform .12s; }
  .bsx-btn:active { transform: scale(.97); }
  .bsx-chip { transition: background .16s, color .16s, border-color .16s; }
  *:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 2px; border-radius: 4px; }
  @keyframes bsx-shimmer { 0%{background-position:-360px 0} 100%{background-position:360px 0} }
  @keyframes bsx-fade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  @keyframes bsx-toast { from{opacity:0;transform:translate(-50%,10px)} to{opacity:1;transform:translate(-50%,0)} }
  @keyframes bsx-breathe { 0%,100%{opacity:.4} 50%{opacity:.72} }
  @keyframes bsx-dust { 0%{transform:translateY(0);opacity:0} 12%{opacity:.55} 88%{opacity:.55} 100%{transform:translateY(-104vh);opacity:0} }
  @media (prefers-reduced-motion: reduce) { .bsx-dust { display:none !important } }
  .bsx-scroll::-webkit-scrollbar{height:6px;width:6px}
  .bsx-scroll::-webkit-scrollbar-thumb{background:rgba(191,164,106,.25);border-radius:6px}
`

// ── Petits composants ────────────────────────────────────────────────────────
function RarityBadge({ rarity, small }) {
  const r = rar(rarity)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
      fontSize: small ? 9 : 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase',
      color: r.c, background: `${r.c}14`, border: `1px solid ${r.c}40`,
      padding: small ? '2px 7px' : '3px 9px', borderRadius: 999,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: r.c }} />
      {r.label}
    </span>
  )
}

function PriceTag({ bg, affordable = true, size = 13 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: size, fontWeight: 800, color: affordable ? GOLD_HI : 'rgba(236,232,223,0.4)' }}>
      {priceLabel(bg)}
    </span>
  )
}

function StatusPill({ kind }) {
  if (kind === 'equipped') return <span style={{ fontSize: 10, fontWeight: 800, color: '#7fd6a0', background: 'rgba(127,214,160,0.12)', border: '1px solid rgba(127,214,160,0.34)', padding: '2px 8px', borderRadius: 999 }}>✓ Équipé</span>
  if (kind === 'owned') return <span style={{ fontSize: 10, fontWeight: 800, color: GOLD, background: `${GOLD}14`, border: `1px solid ${GOLD}3a`, padding: '2px 8px', borderRadius: 999 }}>Possédé</span>
  return null
}

// Média d'une carte : vidéo (frame réelle, lecture au survol) + fallback dégradé.
// PERF : la vidéo n'est montée QUE si la carte est visible (`inView`). Avec 30+
// openings, monter toutes les vidéos d'un coup décodait 30+ flux en parallèle →
// la boutique ramait à mort. L'IntersectionObserver (dans ItemCard) plafonne à
// ~10 vidéos (visibles + marge). Hors écran : dégradé seul, zéro décodage.
function CardMedia({ bg, videoRef, inView }) {
  const [failed, setFailed] = useState(false)
  return (
    <>
      <div className="bsx-media" style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${bg.overlayStart || '#1a1320'}, ${bg.overlayEnd || '#0a0810'})` }} />
      {bg.videoUrl && !failed && inView && (
        // On force un SEEK à 1s au chargement → rend une vraie miniature (le simple
        // #t=1 laissait souvent un cadre noir selon le navigateur).
        <video ref={videoRef} className="bsx-media" src={bg.videoUrl} muted loop playsInline preload="metadata"
          onLoadedMetadata={e => { try { if (e.currentTarget.currentTime < 0.1) e.currentTarget.currentTime = 1 } catch {} }}
          onError={() => setFailed(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(8,9,13,0) 38%, rgba(8,9,13,.55) 72%, rgba(8,9,13,.92) 100%)` }} />
    </>
  )
}

function ItemCard({ bg, owned, equipped, busy, affordable, equipCount = 0, onSelect, onPreview, onBuy, onEquip, onGift, vip }) {
  const r = rar(bg.rarity)
  const videoRef = useRef(null)
  const cardRef = useRef(null)
  // Vidéo montée seulement quand la carte est visible (±400px) → cap les décodages.
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = cardRef.current
    if (!el || typeof IntersectionObserver === 'undefined') { setInView(true); return }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '400px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const cart = useCart()
  const inCart = cart.has(bg.id)
  const cartItem = { id: bg.id, label: bg.opTitle, emoji: '🎞️', priceCents: priceCentsOf(bg), rarity: bg.rarity }
  const enter = () => { try { videoRef.current?.play?.()?.catch?.(() => {}) } catch {} }
  const leave = () => { const v = videoRef.current; if (v) { try { v.pause(); v.currentTime = 1 } catch {} } }
  // Clic sur la carte : possédé → aperçu dans le hero ; sinon → ajout au panier
  // (le tiroir s'ouvre tout seul). Plus besoin du bouton caddie séparé.
  const onCard = () => { if (owned || equipped) onSelect(bg); else if (!inCart) cart.add(cartItem); else cart.setOpen(true) }
  return (
    <div
      ref={cardRef}
      className="bsx-card"
      onClick={onCard}
      onMouseEnter={enter} onMouseLeave={leave}
      style={{
        position: 'relative', aspectRatio: '3 / 4', borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
        border: `1px solid ${equipped ? `${r.c}66` : HAIR}`,
        boxShadow: `0 10px 30px rgba(0,0,0,.45), inset 0 0 0 1px ${equipped ? `${r.c}22` : 'transparent'}`,
        animation: 'bsx-fade .3s ease both',
      }}
    >
      <CardMedia bg={bg} videoRef={videoRef} inView={inView} />

      {/* Badges */}
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }}><RarityBadge rarity={bg.rarity} small /></div>
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>{equipped ? <StatusPill kind="equipped" /> : owned ? <StatusPill kind="owned" /> : null}</div>

      {/* Pied de carte */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2, padding: '13px 13px 14px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.15, textShadow: '0 2px 10px rgba(0,0,0,.7)' }}>{bg.opTitle}</div>
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.62)', marginTop: 1, textShadow: '0 1px 8px rgba(0,0,0,.8)' }}>{bg.anime}</div>
        {equipCount > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginTop: 4, textShadow: '0 1px 6px rgba(0,0,0,.85)' }}>Équipé par {equipCount} membre{equipCount > 1 ? 's' : ''}</div>}

        <div className="bsx-foot" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11, opacity: 0.92, transform: 'translateY(2px)' }}>
          {equipped ? (
            <span style={{ flex: 1, textAlign: 'center', fontSize: 12.5, fontWeight: 800, color: '#7fd6a0', padding: '8px 0' }}>Équipé</span>
          ) : owned ? (
            <button className="bsx-btn" onClick={e => { e.stopPropagation(); onEquip(bg) }}
              style={{ flex: 1, fontSize: 12.5, fontWeight: 800, color: '#0b0c0e', background: GOLD, border: 'none', borderRadius: 9, padding: '8px 0', cursor: 'pointer' }}>Équiper</button>
          ) : vip ? (
            // Compte VIP : achat direct gratuit (bypass serveur), pas de panier.
            <button className="bsx-btn" onClick={e => { e.stopPropagation(); onBuy(bg) }}
              style={{ flex: 1, fontSize: 12, fontWeight: 800, color: '#0b0c0e', background: 'linear-gradient(135deg,#ffd84d,#ffb3c7)', border: 'none', borderRadius: 9, padding: '8px 0', cursor: 'pointer' }}>
              {vip.label}
            </button>
          ) : (
            <button className="bsx-btn" onClick={e => { e.stopPropagation(); inCart ? cart.setOpen(true) : cart.add(cartItem) }}
              style={{ flex: 1, fontSize: 12.5, fontWeight: 800, color: '#0b0c0e', background: inCart ? '#7fd6a0' : GOLD, border: 'none', borderRadius: 9, padding: '8px 0', cursor: 'pointer' }}>
              {inCart ? '✓ Au panier' : `+ Panier · ${priceLabel(bg)}`}
            </button>
          )}
          {onGift && (
            <button className="bsx-btn" aria-label="Offrir à un membre" title="Offrir à un membre" onClick={e => { e.stopPropagation(); onGift(bg) }}
              style={{ flexShrink: 0, width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 9, background: 'rgba(0,0,0,0.4)', border: `1px solid ${HAIR}`, color: GOLD, cursor: 'pointer', fontSize: 15 }}>🎁</button>
          )}
          <button className="bsx-btn" aria-label="Aperçu plein écran" onClick={e => { e.stopPropagation(); onPreview(bg) }}
            style={{ flexShrink: 0, width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 9, background: 'rgba(0,0,0,0.4)', border: `1px solid ${HAIR}`, color: 'rgba(255,255,255,0.78)', cursor: 'pointer', fontSize: 14 }}>⛶</button>
        </div>
      </div>
    </div>
  )
}

function ShopHero({ bg, owned, equipped, busy, affordable, equipCount = 0, onBuy, onEquip, onPreview }) {
  if (!bg) return null
  const r = rar(bg.rarity)
  return (
    <section style={{ position: 'relative', borderRadius: 22, overflow: 'hidden', border: `1px solid ${r.c}33`, marginBottom: 30, minHeight: 360, boxShadow: '0 24px 70px rgba(0,0,0,.5)' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <OpeningBgMedia key={bg.id} bg={bg} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(8,9,13,0.95) 0%, rgba(8,9,13,0.78) 40%, rgba(8,9,13,0.22) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(8,9,13,0.7) 0%, transparent 40%)' }} />

      <div style={{ position: 'relative', minHeight: 360, padding: '34px 38px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', maxWidth: 640 }}>
        <div style={{ marginBottom: 14 }}><RarityBadge rarity={bg.rarity} /></div>
        <h2 style={{ margin: 0, fontFamily: "'Pirata One', serif", fontSize: 'clamp(34px,5vw,52px)', fontWeight: 400, letterSpacing: '.01em', lineHeight: 1.04, color: '#fff' }}>{bg.opTitle}</h2>
        <div style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.6)', marginTop: 7 }}>{bg.anime}{bg.artist ? <span style={{ color: FAINT }}> · {bg.artist}</span> : null}</div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.74)', lineHeight: 1.55, margin: '14px 0 18px', maxWidth: 520 }}>{bg.description}</p>

        {/* Micro-infos */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 20 }}>
          <HeroMeta label="Rareté" value={r.label} color={r.c} />
          <HeroMeta label="Prix" value={priceLabel(bg)} color={GOLD_HI} />
          <HeroMeta label="Exclusivité" value={r.rank >= 6 ? 'Extrême' : r.rank >= 4 ? 'Élevée' : 'Standard'} />
          <HeroMeta label="Statut" value={equipped ? 'Équipé' : owned ? 'Dans ta collection' : 'À débloquer'} color={equipped ? '#7fd6a0' : owned ? GOLD : undefined} />
          {equipCount > 0 && <HeroMeta label="Communauté" value={`${equipCount} ${equipCount > 1 ? 'membres' : 'membre'}`} color={GOLD} />}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {equipped ? (
            <span style={{ padding: '12px 24px', borderRadius: 12, background: 'rgba(127,214,160,0.12)', border: '1px solid rgba(127,214,160,0.38)', color: '#7fd6a0', fontWeight: 800, fontSize: 14 }}>✓ Équipé sur ton profil</span>
          ) : owned ? (
            <button className="bsx-btn" onClick={() => onEquip(bg)} style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: GOLD, color: '#0b0c0e', fontWeight: 900, fontSize: 14.5, cursor: 'pointer' }}>Équiper</button>
          ) : (
            <button className="bsx-btn" onClick={() => onBuy(bg)} disabled={busy}
              style={{ padding: '12px 28px', borderRadius: 12, border: affordable ? 'none' : `1px solid ${HAIR}`, background: affordable ? GOLD : 'rgba(255,255,255,0.06)', color: affordable ? '#0b0c0e' : DIM, fontWeight: 900, fontSize: 14.5, cursor: busy ? 'wait' : 'pointer' }}>
              {busy ? 'Achat…' : `Acheter · ${priceLabel(bg)}`}
            </button>
          )}
          <button className="bsx-btn" onClick={() => onPreview(bg)} style={{ padding: '12px 20px', borderRadius: 12, border: `1px solid ${HAIR}`, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.82)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>⛶ Aperçu plein écran</button>
        </div>
      </div>
    </section>
  )
}
function HeroMeta({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: FAINT, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: color || '#fff' }}>{value}</div>
    </div>
  )
}

function CollectionStats({ catalog, ownedSet, equippedBg }) {
  const total = catalog.length
  const ownedList = catalog.filter(b => ownedSet.has(b.id) || ownedSet.has(b.shopItemId))
  const ownedCount = ownedList.length
  const pct = total ? Math.round((ownedCount / total) * 100) : 0
  const topOwned = ownedList.reduce((m, b) => Math.max(m, rar(b.rarity).rank), 0)
  const topLabel = Object.values(RARITY).find(x => x.rank === topOwned)?.label || '—'
  const secrets = ownedList.filter(b => b.rarity === 'Secret').length
  const rareTotal = catalog.filter(b => rar(b.rarity).rank >= 4).length
  const rareOwned = ownedList.filter(b => rar(b.rarity).rank >= 4).length
  const rareLeft = Math.max(0, rareTotal - rareOwned)

  const cell = (label, value, color) => (
    <div style={{ flex: '1 1 120px', padding: '12px 14px', borderRadius: 13, background: GLASS, border: `1px solid ${HAIR}` }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: FAINT, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 900, color: color || TXT }}>{value}</div>
    </div>
  )

  return (
    <div style={{ marginBottom: 26, padding: '18px 20px', borderRadius: 18, background: GLASS, border: `1px solid ${HAIR}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: GOLD }}>Ta collection</div>
          <div style={{ fontSize: 13, color: DIM, marginTop: 3 }}>{ownedCount} / {total} fonds débloqués{rareLeft > 0 ? ` · plus que ${rareLeft} fond${rareLeft > 1 ? 's' : ''} rare${rareLeft > 1 ? 's' : ''} à débloquer` : ' · collection rare complète 👑'}</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: GOLD_HI }}>{pct}%</div>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: `linear-gradient(90deg, ${GOLD}, ${GOLD_HI})`, transition: 'width .5s ease' }} />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {cell('Équipé', equippedBg ? equippedBg.opTitle : 'Aucun', equippedBg ? '#7fd6a0' : FAINT)}
        {cell('Rareté max', topLabel, topOwned ? rar(Object.keys(RARITY).find(k => RARITY[k].rank === topOwned)).c : FAINT)}
        {cell('Secrets', `${secrets}`, secrets ? RARITY.Secret.c : FAINT)}
        {cell('Débloqués', `${ownedCount}/${total}`)}
      </div>
    </div>
  )
}

// Aperçu IMMERSIF plein écran (mode test) : le fond joue en grand AVEC le son de
// l'opening + un contrôle de volume. Le son démarre au clic sur « Aperçu » (geste
// utilisateur) ; si le navigateur bloque l'autoplay sonore, on retombe en muet et
// l'utilisateur réactive via le bouton 🔊.
function PreviewModal({ list, index, ownedSet, equippedId, busyId, counts = {}, onClose, onNav, onBuy, onEquip }) {
  const bg = list[index]
  const videoRef = useRef(null)
  const [volume, setVolume] = useState(0.5)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') onNav(1)
      else if (e.key === 'ArrowLeft') onNav(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNav])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.volume = volume
    v.muted = muted
    const p = v.play?.()
    if (p?.catch) p.catch(() => { try { v.muted = true; setMuted(true); v.play?.() } catch {} })
  }, [volume, muted, index])

  if (!bg) return null
  const owned = ownedSet.has(bg.id) || ownedSet.has(bg.shopItemId)
  const equipped = equippedId === bg.id && owned
  const affordable = true
  const eqc = Number(counts[bg.id] ?? counts[bg.shopItemId] ?? 0) || 0

  return (
    <div role="dialog" aria-modal="true" aria-label={`Aperçu ${bg.opTitle}`}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', animation: 'bsx-fade .25s ease' }}>
      <video key={bg.id} ref={videoRef} src={bg.videoUrl} autoPlay loop playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(0deg, rgba(4,5,8,0.92) 0%, rgba(4,5,8,0.18) 40%, rgba(4,5,8,0.5) 100%)' }} />

      {/* Top : badge mode test + fermer */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px' }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: GOLD, background: 'rgba(0,0,0,0.45)', border: `1px solid ${GOLD}33`, padding: '6px 13px', borderRadius: 999 }}>● Mode test · aperçu en direct</span>
        <button onClick={onClose} aria-label="Fermer" style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(0,0,0,0.5)', border: `1px solid ${HAIR}`, color: '#fff', fontSize: 18, cursor: 'pointer' }}>✕</button>
      </div>

      <button onClick={() => onNav(-1)} aria-label="Précédent" style={navBtn('left')}>‹</button>
      <button onClick={() => onNav(1)} aria-label="Suivant" style={navBtn('right')}>›</button>

      {/* Bas : infos + actions + son */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 'clamp(20px,4vw,40px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 620 }}>
          <div style={{ marginBottom: 10 }}><RarityBadge rarity={bg.rarity} /></div>
          <h2 style={{ margin: 0, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 900, color: '#fff', lineHeight: 1.02 }}>{bg.opTitle}</h2>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.62)', marginTop: 5 }}>{bg.anime}{bg.artist ? ` · ${bg.artist}` : ''}{eqc > 0 ? <span style={{ color: GOLD }}> · Équipé par {eqc} membre{eqc > 1 ? 's' : ''}</span> : null}</div>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5, margin: '12px 0 16px', maxWidth: 540 }}>{bg.description}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {equipped ? (
              <span style={{ padding: '12px 24px', borderRadius: 12, background: 'rgba(127,214,160,0.14)', border: '1px solid rgba(127,214,160,0.4)', color: '#7fd6a0', fontWeight: 800, fontSize: 14 }}>✓ Équipé</span>
            ) : owned ? (
              <button className="bsx-btn" onClick={() => onEquip(bg)} style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: GOLD, color: '#0b0c0e', fontWeight: 900, fontSize: 14.5, cursor: 'pointer' }}>Équiper</button>
            ) : (
              <button className="bsx-btn" onClick={() => onBuy(bg)} disabled={busyId === bg.id}
                style={{ padding: '12px 28px', borderRadius: 12, border: affordable ? 'none' : `1px solid ${HAIR}`, background: affordable ? GOLD : 'rgba(255,255,255,0.06)', color: affordable ? '#0b0c0e' : DIM, fontWeight: 900, fontSize: 14.5, cursor: busyId === bg.id ? 'wait' : 'pointer' }}>
                {busyId === bg.id ? 'Achat…' : `Acheter · ${priceLabel(bg)}`}
              </button>
            )}
          </div>
        </div>

        {/* Contrôle son / volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.5)', border: `1px solid ${HAIR}`, backdropFilter: 'blur(6px)' }}>
          <button onClick={() => setMuted(m => !m)} aria-label={muted ? 'Activer le son' : 'Couper le son'} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>{muted || volume === 0 ? '🔇' : '🔊'}</button>
          <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
            onChange={e => { const val = Number(e.target.value); setVolume(val); setMuted(val === 0) }}
            aria-label="Volume du fond" style={{ width: 110, accentColor: GOLD }} />
        </div>
      </div>
    </div>
  )
}
const navBtn = (side) => ({ position: 'fixed', top: '50%', [side]: 'clamp(8px,2vw,24px)', transform: 'translateY(-50%)', width: 46, height: 46, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: `1px solid ${HAIR}`, color: '#fff', fontSize: 26, lineHeight: 1, cursor: 'pointer', zIndex: 3 })

function Skeleton() {
  const sh = { background: 'linear-gradient(90deg, rgba(255,255,255,.03) 25%, rgba(255,255,255,.07) 50%, rgba(255,255,255,.03) 75%)', backgroundSize: '720px 100%', animation: 'bsx-shimmer 1.4s linear infinite' }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 }}>
      {Array.from({ length: 10 }).map((_, i) => <div key={i} style={{ ...sh, aspectRatio: '3 / 4', borderRadius: 16, border: `1px solid ${HAIR}` }} />)}
    </div>
  )
}

function EmptyState({ icon = '🗝️', title, sub }) {
  return (
    <div style={{ padding: '64px 20px', textAlign: 'center', borderRadius: 18, background: GLASS, border: `1px solid ${HAIR}` }}>
      <div style={{ fontSize: 38, marginBottom: 12, opacity: 0.65 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: TXT, marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 13, color: DIM }}>{sub}</div>}
    </div>
  )
}

// Fond décoratif de la boutique (style Undercover, teinté or) : couches de
// lumière, grille fine, poussière dorée qui monte. Donne de la profondeur sans glow.
function ShopBackdrop() {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: `
        radial-gradient(840px 500px at 12% -6%, rgba(191,164,106,0.11), transparent 60%),
        radial-gradient(720px 480px at 90% 8%, rgba(191,164,106,0.06), transparent 62%),
        radial-gradient(760px 640px at 50% 118%, rgba(120,90,40,0.06), transparent 64%),
        linear-gradient(180deg, #08090d 0%, #0b0a0e 58%, #08090d 100%)` }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5, animation: 'bsx-breathe 12s ease-in-out infinite',
        backgroundImage: 'linear-gradient(rgba(191,164,106,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(191,164,106,.045) 1px, transparent 1px)',
        backgroundSize: '58px 58px',
        maskImage: 'linear-gradient(180deg, transparent, black 14%, black 78%, transparent)',
        WebkitMaskImage: 'linear-gradient(180deg, transparent, black 14%, black 78%, transparent)' }} />
      {Array.from({ length: 14 }).map((_, i) => (
        <span key={i} className="bsx-dust" style={{ position: 'absolute', left: `${(i * 7 + 5) % 100}%`, bottom: '-12px', width: 3 + (i % 3), height: 3 + (i % 3), borderRadius: '50%', background: 'rgba(191,164,106,.42)', filter: 'blur(.4px)', animation: `bsx-dust ${13 + (i % 5) * 2}s linear ${i * 1.2}s infinite` }} />
      ))}
    </div>
  )
}

// ── Recharge de Berrys (top-up € → monnaie du serveur) ───────────────────────
const fmtBerry = (n) => Number(n || 0).toLocaleString('fr-FR')
function BerryTopupSection({ balance, busyId, onBuy, authed }) {
  return (
    <section id="shop-berrys" style={{ scrollMarginTop: 90, marginBottom: 30, padding: '20px 22px', borderRadius: 18, background: GLASS, border: `1px solid ${GOLD}26` }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: GOLD, marginBottom: 6 }}>Trésorerie</div>
          <h2 style={{ margin: 0, fontFamily: "'Pirata One', serif", fontSize: 'clamp(24px,3.4vw,34px)', fontWeight: 400, color: '#f4ecd8' }}>Recharge de Berrys</h2>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: DIM, maxWidth: 540 }}>Crédite ta cagnotte ฿ pour la boutique, les jeux et les paris du serveur. Crédit instantané sur ton compte Discord.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 14, background: 'rgba(0,0,0,0.28)', border: `1px solid ${HAIR}` }}>
          <span style={{ fontSize: 20, color: GOLD_HI, fontWeight: 900 }}>฿</span>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: FAINT }}>Ton solde</div>
            <strong style={{ fontSize: 19, color: GOLD_HI }}>{authed ? (balance == null ? '…' : `${fmtBerry(balance)} ฿`) : '—'}</strong>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
        {BERRY_PACKS.map(p => {
          const busy = busyId === `berry:${p.id}`
          const best = p.tag === 'Meilleure offre'
          return (
            <div key={p.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 9, padding: '18px 16px 16px', borderRadius: 16, background: 'linear-gradient(180deg, rgba(191,164,106,0.07), rgba(255,255,255,0.012))', border: `1px solid ${best ? `${GOLD}55` : HAIR}` }}>
              {p.tag && <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 9.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: GOLD, background: `${GOLD}16`, border: `1px solid ${GOLD}40`, padding: '3px 8px', borderRadius: 999 }}>{p.tag}</span>}
              <div style={{ fontSize: 11.5, color: FAINT, fontWeight: 700 }}>Pack</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontSize: 25, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{fmtBerry(p.berries)}</span>
                <span style={{ fontSize: 17, fontWeight: 900, color: GOLD_HI }}>฿</span>
              </div>
              <button className="bsx-btn" disabled={busy} onClick={() => onBuy(p)}
                style={{ marginTop: 5, padding: '10px 0', borderRadius: 10, border: 'none', background: GOLD, color: '#0b0c0e', fontWeight: 900, fontSize: 13.5, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
                {busy ? '…' : `Recharger · ${formatEuroCents(p.priceCents)}`}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
function BerryShopInner() {
  const { isAuthenticated, discordId } = useAuth()
  const { equippedId, equip } = useOpeningBg()
  // Compte VIP (Capitaine / Amel) : tout est gratuit, libellé dédié sur les boutons.
  const vip = vipFree(discordId)
  const isAmel = String(discordId || '') === AMEL_ID

  const catalog = useMemo(() => OPENING_BACKGROUNDS, [])
  const [owned, setOwned] = useState(() => new Set())
  const [equipCounts, setEquipCounts] = useState({}) // social proof : { item_id: nb membres }
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(false)
  const [selected, setSelected] = useState(catalog[0] || null)
  const [busyId, setBusyId] = useState(null)
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('rarity')
  const [preview, setPreview] = useState(null) // { list, idx } figé à l'ouverture
  const [giftItem, setGiftItem] = useState(null) // fond à offrir (modale cadeau)
  const [balance, setBalance] = useState(null)   // solde berries (recharge €)
  const checkoutReturnHandledRef = useRef(false)

  const loadBalance = useCallback(() => {
    if (!isAuthenticated) { setBalance(null); return }
    fetchShopBalance().then(setBalance).catch(() => {})
  }, [isAuthenticated])

  const flash = useCallback((msg, kind = 'info') => {
    setToast({ msg, kind, t: Date.now() })
    window.setTimeout(() => setToast(t => (t && Date.now() - t.t >= 2500 ? null : t)), 2600)
  }, [])

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setOwned(new Set()); setLoading(false); return }
    setLoading(true); setErr(false)
    try {
      const bgs = await fetchOwnedBackgrounds()
      setOwned(new Set(bgs.map(b => b.item_id)))
    } catch { setErr(true) }
    finally { setLoading(false) }
  }, [isAuthenticated])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { loadBalance() }, [loadBalance])

  useEffect(() => {
    if (checkoutReturnHandledRef.current) return
    const params = new URLSearchParams(window.location.search)
    const stripeState = params.get('stripe')
    const sessionId = params.get('session_id')
    if (!stripeState) return
    checkoutReturnHandledRef.current = true

    const cleanUrl = () => window.history.replaceState({}, document.title, window.location.pathname)
    if (stripeState === 'cancel') {
      flash('Paiement annulé.', 'info')
      cleanUrl()
      return
    }
    // Retour d'un "achat" VIP : l'article a déjà été accordé côté serveur.
    if (stripeState === 'vip') {
      flash("C'est cadeau, offert par le Capitaine 💛", 'success')
      refresh()
      cleanUrl()
      return
    }
    // Recharge de Berrys VIP : déjà créditée côté serveur.
    if (stripeState === 'berries_vip') {
      flash('Berrys crédités, offert par le Capitaine 💛', 'success')
      loadBalance()
      cleanUrl()
      return
    }
    // Retour d'une recharge de Berrys payée : stripe-complete finalise le crédit.
    if (stripeState === 'berries') {
      if (!sessionId) { cleanUrl(); return }
      setBusyId('stripe-return')
      completeOpeningBgCheckout(sessionId).then(({ data, error }) => {
        if (error) { flash(error.message || 'Paiement validé, crédit en cours…', 'error'); return }
        flash(data?.credited === false ? 'Recharge déjà créditée.' : `+ ${fmtBerry(data?.berries || 0)} ฿ crédités !`, 'success')
        loadBalance()
      }).finally(() => { setBusyId(null); cleanUrl() })
      return
    }
    if (stripeState !== 'success' || !sessionId) {
      cleanUrl()
      return
    }

    setBusyId('stripe-return')
    completeOpeningBgCheckout(sessionId).then(({ data, error }) => {
      if (error) {
        flash(error.message || 'Paiement validé, mais déblocage impossible.', 'error')
        return
      }
      flash(data?.alreadyOwned ? 'Ce fond est déjà dans ta collection.' : `« ${data?.item?.opTitle || 'Fond'} » débloqué.`, 'success')
      refresh()
    }).finally(() => {
      setBusyId(null)
      cleanUrl()
    })
  }, [flash, refresh, loadBalance])

  // Compteurs « équipé par X » : publics → chargés même sans connexion.
  const refreshCounts = useCallback(() => { fetchOpeningBgEquipCounts().then(setEquipCounts).catch(() => {}) }, [])
  useEffect(() => { refreshCounts() }, [refreshCounts])
  const equipCountOf = useCallback((bg) => Number(equipCounts[bg?.id] ?? equipCounts[bg?.shopItemId] ?? 0) || 0, [equipCounts])

  const isOwned = useCallback((bg) => owned.has(bg.id) || owned.has(bg.shopItemId), [owned])
  // « Équipé » seulement si réellement possédé : protège d'un equippedId stale
  // (localStorage d'un autre compte, déconnexion, inventaire pas encore chargé).
  const isEquipped = useCallback((bg) => equippedId === bg.id && isOwned(bg), [equippedId, isOwned])
  const equippedBg = useMemo(() => catalog.find(b => isEquipped(b)) || null, [catalog, isEquipped])

  const counters = useMemo(() => ({
    total: catalog.length,
    owned: catalog.filter(isOwned).length,
    equipped: equippedBg ? 1 : 0,
  }), [catalog, isOwned, equippedBg])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = catalog.filter(b => {
      if (q && !(`${b.opTitle} ${b.anime}`.toLowerCase().includes(q))) return false
      const own = isOwned(b)
      switch (filter) {
        case 'owned':    return own
        case 'unowned':  return !own
        case 'equipped': return isEquipped(b)
        case 'new':      return !!b.isNew
        case 'rare':     return rar(b.rarity).rank >= 4
        case 'secret':   return b.rarity === 'Secret'
        default:         return true
      }
    })
    const byRarity = (a, b) => rar(b.rarity).rank - rar(a.rarity).rank || priceCentsOf(b) - priceCentsOf(a)
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'price-asc':  return priceCentsOf(a) - priceCentsOf(b)
        case 'price-desc': return priceCentsOf(b) - priceCentsOf(a)
        case 'new':        return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || byRarity(a, b)
        case 'owned':      return (isOwned(b) ? 1 : 0) - (isOwned(a) ? 1 : 0) || byRarity(a, b)
        default:           return byRarity(a, b)
      }
    })
    return list
  }, [catalog, search, filter, sort, isOwned, isEquipped])

  const buy = useCallback(async (bg) => {
    if (!isAuthenticated) { flash('Connecte-toi pour acheter.', 'error'); return }
    if (isOwned(bg) || busyId) return
    setBusyId(bg.id)
    const { data, error } = await createOpeningBgCheckout(bg.id)
    if (error || !data?.url) {
      setBusyId(null)
      flash(error?.message || 'Paiement indisponible pour le moment.', 'error')
      return
    }
    window.location.assign(data.url)
  }, [isAuthenticated, isOwned, busyId, flash])

  const buyBerries = useCallback(async (pack) => {
    if (!isAuthenticated) { flash('Connecte-toi pour recharger des Berrys.', 'error'); return }
    if (busyId) return
    setBusyId(`berry:${pack.id}`)
    const { data, error } = await createBerryCheckout(pack.id)
    if (error || !data?.url) {
      setBusyId(null)
      flash(error?.message || 'Recharge indisponible pour le moment.', 'error')
      return
    }
    window.location.assign(data.url)
  }, [isAuthenticated, busyId, flash])

  const doEquip = useCallback(async (bg) => {
    if (!isOwned(bg)) return
    await equip(bg.id)
    flash(`« ${bg.opTitle} » équipé sur ton profil.`, 'success')
    refreshCounts()
  }, [isOwned, equip, flash, refreshCounts])

  const sel = selected && catalog.find(b => b.id === selected.id) ? selected : catalog[0]
  const selOwned = sel && isOwned(sel)
  const selEquipped = sel && isEquipped(sel)

  // Aperçu : on FIGE la liste à l'ouverture (snapshot) → le filtre/recherche/achat
  // ne fait pas sauter l'aperçu, et on peut équiper le fond juste acheté.
  const openPreview = useCallback((bg) => {
    track('boutique_view', { item: bg.name || bg.title || bg.id, rarity: bg.rarity })
    const i = visible.findIndex(b => b.id === bg.id)
    setPreview({ list: visible, idx: i >= 0 ? i : 0 })
  }, [visible])
  const navPreview = useCallback((dir) => {
    setPreview(p => (p && p.list.length ? { ...p, idx: (p.idx + dir + p.list.length) % p.list.length } : p))
  }, [])
  const closePreview = useCallback(() => setPreview(null), [])

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TXT, paddingTop: 88 }}>
      <style>{CSS}</style>
      <ShopBackdrop />
      <ShopRail />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1240, margin: '0 auto', padding: '0 clamp(16px,3vw,28px) 90px' }}>

        {/* Message perso d'Amel — tout est gratuit pour elle 💛 */}
        {isAmel && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, margin: '6px 0 18px',
            padding: '16px 22px', borderRadius: 16,
            background: 'linear-gradient(120deg, rgba(255,179,199,0.12), rgba(255,216,77,0.08))',
            border: '1px solid rgba(255,179,199,0.35)',
            boxShadow: '0 10px 36px -14px rgba(255,179,199,0.35)',
          }}>
            <span style={{ fontSize: 28 }}>💛</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#ffd9e4' }}>{AMEL_MESSAGE}</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                Toute la boutique est gratuite pour toi — sers-toi, c'est cadeau.
              </div>
            </div>
          </div>
        )}

        {/* Bannière promo 1 acheté = 1 offert avec décompte */}
        <PromoBanner />

        {/* En-tête */}
        <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, margin: '6px 0 22px' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: GOLD, marginBottom: 7 }}>Brams Shop · Archive rare</div>
            <h1 style={{ margin: 0, fontFamily: "'Pirata One', serif", fontSize: 'clamp(34px,5vw,52px)', fontWeight: 400, letterSpacing: '.01em', color: '#f4ecd8', textShadow: '0 2px 30px rgba(191,164,106,0.18)' }}>Boutique</h1>
            <p style={{ margin: '7px 0 0', fontSize: 14, color: DIM, maxWidth: 560 }}>Fonds d'opening animés rares pour ton profil. Achat en euros selon la rareté.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderRadius: 14, background: GLASS, border: `1px solid ${GOLD}33` }}>
            <span style={{ fontSize: 20 }}>💳</span>
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: FAINT }}>Prix des fonds</div>
              <strong style={{ fontSize: 19, color: GOLD_HI }}>{formatEuroCents(BG_PRICE_RANGE.min)} à {formatEuroCents(BG_PRICE_RANGE.max)}</strong>
            </div>
          </div>
        </header>

        {/* Recharge de Berrys (top-up € → monnaie du serveur) */}
        <BerryTopupSection balance={balance} busyId={busyId} onBuy={buyBerries} authed={isAuthenticated} />

        {/* Hero */}
        <div id="shop-fonds" style={{ scrollMarginTop: 90 }} />
        <ShopHero bg={sel} owned={selOwned} equipped={selEquipped} busy={busyId === sel?.id} affordable={true} equipCount={equipCountOf(sel)} onBuy={buy} onEquip={doEquip} onPreview={openPreview} />

        {/* Barre : recherche + filtres + tri + compteurs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 220px', minWidth: 200, padding: '10px 14px', borderRadius: 12, background: GLASS, border: `1px solid ${HAIR}` }}>
            <span style={{ color: FAINT, fontSize: 14 }}>⌕</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un fond, un anime…" aria-label="Rechercher"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: TXT, fontSize: 13.5, fontFamily: 'inherit' }} />
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Trier"
            style={{ padding: '10px 14px', borderRadius: 12, background: '#101218', color: TXT, border: `1px solid ${HAIR}`, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
            {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <div style={{ fontSize: 12, color: FAINT, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {counters.total} fonds · <span style={{ color: GOLD }}>{counters.owned} possédés</span> · {counters.equipped} équipé
          </div>
        </div>

        {/* Chips filtres (scrollables mobile) */}
        <div className="bsx-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20 }}>
          {FILTERS.map(f => {
            const active = filter === f.id
            return (
              <button key={f.id} className="bsx-chip" onClick={() => setFilter(f.id)}
                style={{ flexShrink: 0, padding: '8px 15px', borderRadius: 999, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                  color: active ? '#0b0c0e' : 'rgba(236,232,223,0.7)', background: active ? GOLD : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? GOLD : HAIR}` }}>
                {f.label}
              </button>
            )
          })}
        </div>

        {/* Catalogue : rangées Netflix par rareté — grille classique en mode recherche. */}
        {loading ? <Skeleton />
          : err ? <EmptyState icon="⚠️" title="Boutique indisponible" sub="Impossible de charger ta collection. Réessaie dans un instant." />
          : visible.length === 0 ? (
            <EmptyState
              icon={filter === 'owned' ? '📦' : '🔍'}
              title={filter === 'owned' ? "Tu ne possèdes encore aucun fond ici" : 'Aucun fond ne correspond'}
              sub={filter === 'owned' ? 'Débloque ton premier fond rare pour démarrer ta collection.' : 'Change de filtre ou de recherche.'}
            />
          ) : search.trim() ? (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_MIN_WIDTH}px, 1fr))`, gap: CARD_GAP }}>
              {visible.map(bg => (
                <FondCard key={bg.id} bg={bg} fluid vip={vip} onBuy={buy}
                  owned={isOwned(bg)} equipped={isEquipped(bg)} equipCount={equipCountOf(bg)}
                  onSelect={setSelected} onPreview={openPreview} onEquip={doEquip}
                  onGift={b => setGiftItem({ id: b.id, nom: b.opTitle, emoji: '🎞️' })} />
              ))}
            </div>
          ) : (
            RARITY_ORDER.map(rk => {
              const rows = visible.filter(b => (b.rarity || 'Commun') === rk)
              if (!rows.length) return null
              const r = rar(rk)
              return (
                <RarityRow key={rk} label={r.label} color={r.c} count={rows.length} countLabel={`fond${rows.length > 1 ? 's' : ''}`}>
                  {rows.map(bg => (
                    <FondCard key={bg.id} bg={bg} vip={vip} onBuy={buy}
                      owned={isOwned(bg)} equipped={isEquipped(bg)} equipCount={equipCountOf(bg)}
                      onSelect={setSelected} onPreview={openPreview} onEquip={doEquip}
                      onGift={b => setGiftItem({ id: b.id, nom: b.opTitle, emoji: '🎞️' })} />
                  ))}
                </RarityRow>
              )
            })
          )}

        {/* ─── Catalogue de curseurs custom One Piece ─── */}
        <div id="shop-curseurs" style={{ scrollMarginTop: 90 }}>
          <CursorShop />
        </div>

        {/* ─── Traînées de curseur (skins de particules) ─── */}
        <div id="shop-trainees" style={{ scrollMarginTop: 90 }}>
          <TrailShop />
        </div>
      </div>

      {/* Aperçu plein écran */}
      {giftItem && <GiftModal item={giftItem} onClose={() => setGiftItem(null)} />}

      {preview && (
        <PreviewModal list={preview.list} index={preview.idx} ownedSet={owned} equippedId={equippedId} busyId={busyId} counts={equipCounts}
          onClose={closePreview} onNav={navPreview} onBuy={buy} onEquip={doEquip} />
      )}

      {/* Toast */}
      {toast && (
        <div role="status" style={{ position: 'fixed', bottom: 26, left: '50%', zIndex: 1100, transform: 'translateX(-50%)', padding: '13px 22px', borderRadius: 12, fontWeight: 800, fontSize: 14, animation: 'bsx-toast .25s ease',
          color: toast.kind === 'error' ? '#ffd9d6' : toast.kind === 'success' ? '#d6ffe6' : TXT,
          background: toast.kind === 'error' ? 'rgba(120,40,38,0.95)' : toast.kind === 'success' ? 'rgba(28,70,48,0.95)' : 'rgba(20,21,26,0.96)',
          border: `1px solid ${toast.kind === 'error' ? 'rgba(255,120,110,0.4)' : toast.kind === 'success' ? 'rgba(127,214,160,0.4)' : HAIR}`, boxShadow: '0 14px 44px rgba(0,0,0,.55)' }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// Wrapper : fournit le panier (CartProvider) à toute la boutique + monte le tiroir.
export default function BerryShop() {
  return (
    <CartProvider>
      <BerryShopInner />
      <CartDrawer />
    </CartProvider>
  )
}
