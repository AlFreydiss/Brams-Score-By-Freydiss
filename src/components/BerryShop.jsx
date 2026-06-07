// ── Brams Shop — boutique premium de fonds d'opening rares ───────────────────
// DA : noir profond, or discret, verre sombre, bordures fines, raretés élégantes,
// animations subtiles. Vibe « archive anime haut de gamme / coffre rare ».
// Logique préservée : achat (purchaseShopItem), équipement (OpeningBgContext.equip),
// solde (fetchShopBalance), possédés (fetchOwnedBackgrounds). Catalogue statique.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import confetti from 'canvas-confetti'
import { useAuth } from '../contexts/AuthContext.jsx'
import { fetchShopBalance, fetchOwnedBackgrounds, purchaseShopItem, fetchOpeningBgEquipCounts } from '../lib/berryShop.js'
import { useOpeningBg } from '../contexts/OpeningBgContext.jsx'
import { OPENING_BACKGROUNDS } from '../data/opening-backgrounds.js'
import OpeningBgMedia from './social/OpeningBgMedia.jsx'

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
  Secret:     { label: 'Secret',     c: '#e6d6a8', rank: 6 },
  Interdit:   { label: 'Interdit',   c: '#b1413d', rank: 7 },
}
const rar = (r) => RARITY[r] || RARITY.Commun
const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Number(n || 0))

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

function PriceTag({ price, affordable = true, size = 13 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: size, fontWeight: 800, color: affordable ? GOLD_HI : 'rgba(236,232,223,0.4)' }}>
      <span style={{ fontSize: size - 1 }}>฿</span>{fmt(price)}
    </span>
  )
}

function StatusPill({ kind }) {
  if (kind === 'equipped') return <span style={{ fontSize: 10, fontWeight: 800, color: '#7fd6a0', background: 'rgba(127,214,160,0.12)', border: '1px solid rgba(127,214,160,0.34)', padding: '2px 8px', borderRadius: 999 }}>✓ Équipé</span>
  if (kind === 'owned') return <span style={{ fontSize: 10, fontWeight: 800, color: GOLD, background: `${GOLD}14`, border: `1px solid ${GOLD}3a`, padding: '2px 8px', borderRadius: 999 }}>Possédé</span>
  return null
}

// Média d'une carte : vidéo (frame réelle, lecture au survol) + fallback dégradé.
function CardMedia({ bg, videoRef }) {
  const [failed, setFailed] = useState(false)
  return (
    <>
      <div className="bsx-media" style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${bg.overlayStart || '#1a1320'}, ${bg.overlayEnd || '#0a0810'})` }} />
      {bg.videoUrl && !failed && (
        <video ref={videoRef} className="bsx-media" src={bg.videoUrl} muted loop playsInline preload="metadata"
          onError={() => setFailed(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(8,9,13,0) 38%, rgba(8,9,13,.55) 72%, rgba(8,9,13,.92) 100%)` }} />
    </>
  )
}

function ItemCard({ bg, owned, equipped, busy, affordable, equipCount = 0, onSelect, onPreview, onBuy, onEquip }) {
  const r = rar(bg.rarity)
  const videoRef = useRef(null)
  const enter = () => { try { videoRef.current?.play?.()?.catch?.(() => {}) } catch {} }
  const leave = () => { const v = videoRef.current; if (v) { try { v.pause(); v.currentTime = 0 } catch {} } }
  return (
    <div
      className="bsx-card"
      onClick={() => onSelect(bg)}
      onMouseEnter={enter} onMouseLeave={leave}
      style={{
        position: 'relative', aspectRatio: '3 / 4', borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
        border: `1px solid ${equipped ? `${r.c}66` : HAIR}`,
        boxShadow: `0 10px 30px rgba(0,0,0,.45), inset 0 0 0 1px ${equipped ? `${r.c}22` : 'transparent'}`,
        animation: 'bsx-fade .3s ease both',
      }}
    >
      <CardMedia bg={bg} videoRef={videoRef} />

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
          ) : (
            <button className="bsx-btn" onClick={e => { e.stopPropagation(); onBuy(bg) }} disabled={busy}
              style={{ flex: 1, fontSize: 12.5, fontWeight: 800, color: affordable ? '#0b0c0e' : 'rgba(236,232,223,0.5)', background: affordable ? GOLD : 'rgba(255,255,255,0.06)', border: affordable ? 'none' : `1px solid ${HAIR}`, borderRadius: 9, padding: '8px 0', cursor: busy ? 'wait' : 'pointer' }}>
              {busy ? 'Achat…' : <PriceTag price={bg.price} affordable={affordable} size={12.5} />}
            </button>
          )}
          <button className="bsx-btn" aria-label="Aperçu plein écran" onClick={e => { e.stopPropagation(); onPreview(bg) }}
            style={{ flexShrink: 0, width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 9, background: 'rgba(0,0,0,0.4)', border: `1px solid ${HAIR}`, color: 'rgba(255,255,255,0.78)', cursor: 'pointer', fontSize: 14 }}>⛶</button>
        </div>
      </div>
    </div>
  )
}

function ShopHero({ bg, owned, equipped, busy, affordable, balance, equipCount = 0, onBuy, onEquip, onPreview }) {
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
        <h2 style={{ margin: 0, fontSize: 'clamp(30px,4vw,44px)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.02, color: '#fff' }}>{bg.opTitle}</h2>
        <div style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.6)', marginTop: 7 }}>{bg.anime}{bg.artist ? <span style={{ color: FAINT }}> · {bg.artist}</span> : null}</div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.74)', lineHeight: 1.55, margin: '14px 0 18px', maxWidth: 520 }}>{bg.description}</p>

        {/* Micro-infos */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 20 }}>
          <HeroMeta label="Rareté" value={r.label} color={r.c} />
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
              {busy ? 'Achat…' : `Acheter · ${fmt(bg.price)} ฿`}
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

function PreviewModal({ list, index, ownedSet, equippedId, busyId, balance, counts = {}, onClose, onNav, onBuy, onEquip }) {
  const bg = list[index]
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') onNav(1)
      else if (e.key === 'ArrowLeft') onNav(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNav])
  if (!bg) return null
  const r = rar(bg.rarity)
  const owned = ownedSet.has(bg.id) || ownedSet.has(bg.shopItemId)
  const equipped = equippedId === bg.id && owned
  const affordable = balance >= bg.price
  return (
    <div role="dialog" aria-modal="true" aria-label={`Aperçu ${bg.opTitle}`} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(4,5,8,0.86)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(12px,4vw,40px)', animation: 'bsx-fade .2s ease' }}>
      <button onClick={onClose} aria-label="Fermer" style={{ position: 'fixed', top: 18, right: 20, width: 40, height: 40, borderRadius: 12, background: 'rgba(0,0,0,0.5)', border: `1px solid ${HAIR}`, color: '#fff', fontSize: 18, cursor: 'pointer', zIndex: 2 }}>✕</button>
      <button onClick={e => { e.stopPropagation(); onNav(-1) }} aria-label="Précédent" style={navBtn('left')}>‹</button>
      <button onClick={e => { e.stopPropagation(); onNav(1) }} aria-label="Suivant" style={navBtn('right')}>›</button>

      <div onClick={e => e.stopPropagation()} style={{ width: 'min(1000px, 100%)', maxHeight: '90vh', overflowY: 'auto', borderRadius: 20, border: `1px solid ${r.c}40`, background: BG, boxShadow: '0 30px 90px rgba(0,0,0,.6)' }}>
        <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#000' }}>
          <OpeningBgMedia key={bg.id} bg={bg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(8,9,13,0.85), transparent 45%)' }} />
          <div style={{ position: 'absolute', left: 22, right: 22, bottom: 18 }}>
            <div style={{ marginBottom: 9 }}><RarityBadge rarity={bg.rarity} /></div>
            <div style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 900, color: '#fff', lineHeight: 1.05 }}>{bg.opTitle}</div>
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>{bg.anime}{bg.artist ? ` · ${bg.artist}` : ''}</div>
            {(() => { const eqc = Number(counts[bg.id] ?? counts[bg.shopItemId] ?? 0) || 0; return eqc > 0 ? <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, marginTop: 5 }}>Équipé par {eqc} membre{eqc > 1 ? 's' : ''}</div> : null })()}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '16px 22px', flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: 13.5, color: DIM, lineHeight: 1.55, flex: '1 1 280px' }}>{bg.description}</p>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            {equipped ? (
              <span style={{ padding: '11px 22px', borderRadius: 12, background: 'rgba(127,214,160,0.12)', border: '1px solid rgba(127,214,160,0.38)', color: '#7fd6a0', fontWeight: 800, fontSize: 14 }}>✓ Équipé</span>
            ) : owned ? (
              <button className="bsx-btn" onClick={() => onEquip(bg)} style={{ padding: '11px 26px', borderRadius: 12, border: 'none', background: GOLD, color: '#0b0c0e', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>Équiper</button>
            ) : (
              <button className="bsx-btn" onClick={() => onBuy(bg)} disabled={busyId === bg.id}
                style={{ padding: '11px 26px', borderRadius: 12, border: affordable ? 'none' : `1px solid ${HAIR}`, background: affordable ? GOLD : 'rgba(255,255,255,0.06)', color: affordable ? '#0b0c0e' : DIM, fontWeight: 900, fontSize: 14, cursor: busyId === bg.id ? 'wait' : 'pointer' }}>
                {busyId === bg.id ? 'Achat…' : `Acheter · ${fmt(bg.price)} ฿`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
const navBtn = (side) => ({ position: 'fixed', top: '50%', [side]: 'clamp(8px,2vw,24px)', transform: 'translateY(-50%)', width: 46, height: 46, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: `1px solid ${HAIR}`, color: '#fff', fontSize: 26, lineHeight: 1, cursor: 'pointer', zIndex: 2 })

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

// ── Page ─────────────────────────────────────────────────────────────────────
export default function BerryShop() {
  const { isAuthenticated } = useAuth()
  const { equippedId, equip } = useOpeningBg()

  const catalog = useMemo(() => OPENING_BACKGROUNDS, [])
  const [balance, setBalance] = useState(0)
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

  const flash = useCallback((msg, kind = 'info') => {
    setToast({ msg, kind, t: Date.now() })
    window.setTimeout(() => setToast(t => (t && Date.now() - t.t >= 2500 ? null : t)), 2600)
  }, [])

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setBalance(0); setOwned(new Set()); setLoading(false); return }
    setLoading(true); setErr(false)
    try {
      const [bal, bgs] = await Promise.all([fetchShopBalance(), fetchOwnedBackgrounds()])
      setBalance(bal)
      setOwned(new Set(bgs.map(b => b.item_id)))
    } catch { setErr(true) }
    finally { setLoading(false) }
  }, [isAuthenticated])

  useEffect(() => { refresh() }, [refresh])

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
    const byRarity = (a, b) => rar(b.rarity).rank - rar(a.rarity).rank || b.price - a.price
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'price-asc':  return a.price - b.price
        case 'price-desc': return b.price - a.price
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
    if (balance < bg.price) { flash(`Il te manque ${fmt(bg.price - balance)} ฿`, 'error'); return }
    setBusyId(bg.id)
    const { error } = await purchaseShopItem(bg.shopItemId)
    if (error) { setBusyId(null); flash(error.message || 'Achat impossible', 'error'); return }
    // Optimiste : solde + possédé instantanés, puis resync serveur.
    setBalance(b => Math.max(0, b - bg.price))
    setOwned(s => new Set(s).add(bg.id))
    setBusyId(null)
    confetti({ particleCount: 110, spread: 72, origin: { y: 0.7 }, colors: [rar(bg.rarity).c, GOLD_HI, '#fff'] })
    flash(`« ${bg.opTitle} » débloqué — équipe-le quand tu veux.`, 'success')
    await refresh()   // resync solde/possédés depuis le serveur (vérité finale)
  }, [isAuthenticated, isOwned, busyId, balance, flash, refresh])

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
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 clamp(16px,3vw,28px) 90px' }}>

        {/* En-tête + solde */}
        <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, margin: '6px 0 22px' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: GOLD, marginBottom: 7 }}>Brams Shop · Archive rare</div>
            <h1 style={{ margin: 0, fontSize: 'clamp(28px,4vw,38px)', fontWeight: 900, letterSpacing: '-0.02em' }}>Boutique</h1>
            <p style={{ margin: '7px 0 0', fontSize: 14, color: DIM, maxWidth: 560 }}>Fonds d'opening animés rares pour ton profil. Collectionne, équipe, brille.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderRadius: 14, background: GLASS, border: `1px solid ${GOLD}33` }}>
            <span style={{ fontSize: 20 }}>💰</span>
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: FAINT }}>Ton solde</div>
              <strong style={{ fontSize: 19, color: GOLD_HI }}>{fmt(balance)} ฿</strong>
            </div>
          </div>
        </header>

        {/* Hero */}
        <ShopHero bg={sel} owned={selOwned} equipped={selEquipped} busy={busyId === sel?.id} affordable={balance >= (sel?.price || 0)} balance={balance} equipCount={equipCountOf(sel)} onBuy={buy} onEquip={doEquip} onPreview={openPreview} />

        {/* Collection */}
        {isAuthenticated && <CollectionStats catalog={catalog} ownedSet={owned} equippedBg={equippedBg} />}

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

        {/* Grille */}
        {loading ? <Skeleton />
          : err ? <EmptyState icon="⚠️" title="Boutique indisponible" sub="Impossible de charger ton solde. Réessaie dans un instant." />
          : visible.length === 0 ? (
            <EmptyState
              icon={filter === 'owned' ? '📦' : '🔍'}
              title={filter === 'owned' ? "Tu ne possèdes encore aucun fond ici" : 'Aucun fond ne correspond'}
              sub={filter === 'owned' ? 'Débloque ton premier fond rare pour démarrer ta collection.' : 'Change de filtre ou de recherche.'}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 }}>
              {visible.map(bg => (
                <ItemCard key={bg.id} bg={bg}
                  owned={isOwned(bg)} equipped={isEquipped(bg)}
                  busy={busyId === bg.id} affordable={balance >= bg.price} equipCount={equipCountOf(bg)}
                  onSelect={setSelected} onPreview={openPreview} onBuy={buy} onEquip={doEquip} />
              ))}
            </div>
          )}
      </div>

      {/* Aperçu plein écran */}
      {preview && (
        <PreviewModal list={preview.list} index={preview.idx} ownedSet={owned} equippedId={equippedId} busyId={busyId} balance={balance} counts={equipCounts}
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
