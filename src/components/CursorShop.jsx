// ─────────────────────────────────────────────────────────────────────────────
// CursorShop — Catalogue de curseurs custom One Piece (section de la Boutique)
// Inline styles uniquement. Achat/équip branchés sur le système Berry existant
// (purchase_shop_item / equip_shop_item / get_my_inventory — débit serveur).
//
// Les curseurs sont rendus en SVG-emoji (fonctionnent sans asset externe). Pour
// servir de vrais .cur/.png depuis R2, uploade /cursors/<id>.png dans le bucket
// bramscore : l'aperçu basculera dessus automatiquement (onError → SVG).
//
// Exporte :  <CursorShop/>  (la section boutique)
//            <GlobalCursorLayer/>  (applique le curseur équipé sur TOUT le site —
//                                   à monter une fois dans App.jsx)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { fetchMyInventory, equipShopItem, createOpeningBgCheckout, completeOpeningBgCheckout } from '../lib/berryShop.js'
import GiftModal from './GiftModal.jsx'
import { vipFree } from '../lib/vip.js'
import SpotlightCard from './SpotlightCard.jsx'
import { useCart } from '../contexts/CartContext.jsx'
import RarityRow from './boutique/RarityRow.jsx'
import { cursorSvgURI } from '../data/cursor-svgs.js'

const HUE = { COMMUN: 42, RARE: 220, EPIQUE: 280, MYTHIQUE: 42, INTERDIT: 0 }

// ── Constantes configurables ────────────────────────────────────────────────
const R2_BASE = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/cursors'
const BERRY_SYMBOL = '฿'
const CURSOR_KEY = 'brams_cursor'           // localStorage : curseur équipé (apply instantané cross-page)
const CURSOR_EVENT = 'brams-cursor-change'  // event interne pour resync le GlobalCursorLayer

// Prix réels en € (centimes) par rareté — DOIT matcher CURSOR_PRICE_CENTS côté
// api/bot-tools.js (le serveur revalide le montant, c'est lui la source de vérité).
const CURSOR_PRICE_CENTS = { COMMUN: 50, RARE: 79, EPIQUE: 119, MYTHIQUE: 159, INTERDIT: 200 }
const euroFmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
function priceCents(cur) { return CURSOR_PRICE_CENTS[cur.rarete] || 50 }
function formatEuro(cents) { return euroFmt.format((cents || 0) / 100) + ' €' }

const RARITY_CONFIG = {
  COMMUN:   { label: 'Commun',   color: '#8a8a8a', glow: 'rgba(138,138,138,0.45)', borderColor: '#8a8a8a', order: 1, prixMin: 5000 },
  RARE:     { label: 'Rare',     color: '#3b82f6', glow: 'rgba(59,130,246,0.55)',  borderColor: '#3b82f6', order: 2, prixMin: 25000 },
  EPIQUE:   { label: 'Épique',   color: '#a855f7', glow: 'rgba(168,85,247,0.55)',  borderColor: '#a855f7', order: 3, prixMin: 120000 },
  MYTHIQUE: { label: 'Mythique', color: '#f5b50a', glow: 'rgba(245,181,10,0.6)',   borderColor: '#f5b50a', order: 4, prixMin: 800000 },
  INTERDIT: { label: 'Interdit', color: '#c0392b', glow: 'rgba(192,57,43,0.7)',    borderColor: '#c0392b', order: 5, prixMin: 5000000 },
}

// 20 curseurs répartis sur les 5 raretés. emoji = source de rendu ; urlCursor/
// urlPreview = override R2 facultatif (utilisés en priorité si l'image charge).
const CURSEURS = [
  // ── COMMUN ──
  { id: 'cur-berry',       nom: 'Pièce de Berry',     rarete: 'COMMUN',   prix: 5000,     emoji: '🪙', animated: false, stock: null, limite: false },
  { id: 'cur-logpose',     nom: 'Log Pose',           rarete: 'COMMUN',   prix: 8000,     emoji: '🧭', animated: false, stock: null, limite: false },
  { id: 'cur-sake',        nom: 'Coupe de Saké',      rarete: 'COMMUN',   prix: 10000,    emoji: '🍶', animated: false, stock: null, limite: false },
  { id: 'cur-map',         nom: 'Carte au Trésor',    rarete: 'COMMUN',   prix: 12000,    emoji: '🗺️', animated: false, stock: null, limite: false },
  // ── RARE ──
  { id: 'cur-strawhat',    nom: 'Chapeau de Paille',  rarete: 'RARE',     prix: 25000,    emoji: '👒', animated: false, stock: null, limite: false },
  { id: 'cur-dendenmushi', nom: 'Den Den Mushi',      rarete: 'RARE',     prix: 35000,    emoji: '🐌', animated: false, stock: null, limite: false },
  { id: 'cur-marine',      nom: 'Casquette Marine',   rarete: 'RARE',     prix: 45000,    emoji: '🧢', animated: false, stock: null, limite: false },
  { id: 'cur-anchor',      nom: 'Ancre du Navire',    rarete: 'RARE',     prix: 55000,    emoji: '⚓', animated: false, stock: null, limite: false },
  // ── ÉPIQUE ──
  { id: 'cur-devilfruit',  nom: 'Fruit du Démon',     rarete: 'EPIQUE',   prix: 120000,   emoji: '🍈', animated: false, stock: null, limite: false },
  { id: 'cur-sunny',       nom: 'Thousand Sunny',     rarete: 'EPIQUE',   prix: 160000,   emoji: '⛵', animated: false, stock: null, limite: false },
  { id: 'cur-wanted',      nom: 'Avis de Recherche',  rarete: 'EPIQUE',   prix: 200000,   emoji: '📜', animated: false, stock: null, limite: false },
  { id: 'cur-sword',       nom: 'Sandai Kitetsu',     rarete: 'EPIQUE',   prix: 250000,   emoji: '⚔️', animated: false, stock: null, limite: false },
  // ── MYTHIQUE (animés) ──
  { id: 'cur-mera',        nom: 'Mera Mera no Mi',    rarete: 'MYTHIQUE', prix: 800000,   emoji: '🔥', animated: true,  stock: null, limite: false },
  { id: 'cur-gomu',        nom: 'Gomu Gomu no Pistol',rarete: 'MYTHIQUE', prix: 1200000,  emoji: '🥊', animated: true,  stock: null, limite: false },
  { id: 'cur-yonko',       nom: 'Couronne de Yonko',  rarete: 'MYTHIQUE', prix: 1800000,  emoji: '👑', animated: true,  stock: 20,   limite: true  },
  { id: 'cur-onepiece',    nom: 'Pavillon One Piece', rarete: 'MYTHIQUE', prix: 2500000,  emoji: '🏴‍☠️', animated: true, stock: null, limite: false },
  // ── INTERDIT (animés, ultra rares) ──
  { id: 'cur-gear5',       nom: 'Gear 5 — Nika',      rarete: 'INTERDIT', prix: 5000000,  emoji: '☀️', animated: true,  stock: 10,   limite: true  },
  { id: 'cur-haki',        nom: 'Haoshoku Haki',      rarete: 'INTERDIT', prix: 8000000,  emoji: '⚡', animated: true,  stock: 7,    limite: true  },
  { id: 'cur-akuma',       nom: 'Akuma no Mi Interdit',rarete:'INTERDIT', prix: 12000000, emoji: '😈', animated: true,  stock: 5,    limite: true  },
  { id: 'cur-im',          nom: 'Œil d\'Im-sama',     rarete: 'INTERDIT', prix: 25000000, emoji: '👁️', animated: true,  stock: 1,    limite: true  },
  // ── BRAMS · Grand Line (nouveaux) ──
  { id: 'cur-bottle',      nom: 'Bouteille à la Mer', rarete: 'COMMUN',   prix: 9000,     emoji: '🍾', animated: false, stock: null, limite: false },
  { id: 'cur-island',      nom: 'Île au Trésor',      rarete: 'COMMUN',   prix: 11000,    emoji: '🏝️', animated: false, stock: null, limite: false },
  { id: 'cur-spyglass',    nom: 'Longue-vue',         rarete: 'RARE',     prix: 35000,    emoji: '🔭', animated: false, stock: null, limite: false },
  { id: 'cur-northstar',   nom: 'Étoile du Nord',     rarete: 'RARE',     prix: 42000,    emoji: '🌟', animated: true,  stock: null, limite: false },
  { id: 'cur-parrot',      nom: 'Perroquet du Capitaine', rarete: 'RARE', prix: 55000,    emoji: '🦜', animated: false, stock: null, limite: false },
  { id: 'cur-jollyroger',  nom: 'Jolly Roger',        rarete: 'EPIQUE',   prix: 180000,   emoji: '☠️', animated: true,  stock: null, limite: false },
  { id: 'cur-trident',     nom: 'Trident des Mers',   rarete: 'EPIQUE',   prix: 230000,   emoji: '🔱', animated: false, stock: null, limite: false },
  { id: 'cur-mermaid',     nom: 'Sirène des Abysses', rarete: 'MYTHIQUE', prix: 1500000,  emoji: '🧜‍♀️', animated: true, stock: null, limite: false },
]

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatBerry(n) { return (Number(n) || 0).toLocaleString('fr-FR') }

// Curseur natif (PNG-like) à partir d'un emoji → data-URI SVG. Hotspot en haut-gauche.
function emojiCursorURI(emoji, size = 40) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<text x="50%" y="52%" font-size="${Math.round(size * 0.82)}" text-anchor="middle" dominant-baseline="central">${emoji}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
// Curseur natif : SVG vectoriel dessiné main (cursor-svgs.js) en priorité,
// fallback emoji si un id n'a pas encore son design.
function cursorCss(cur) { return `url("${cursorSvgURI(cur.id, 32) || emojiCursorURI(cur.emoji)}") 5 3, auto` }

// Persiste le curseur équipé en localStorage + prévient le GlobalCursorLayer.
// (La persistance serveur passe par equip_shop_item ; ceci = apply instantané.)
function persistEquippedCursor(payload) {
  try {
    if (payload) localStorage.setItem(CURSOR_KEY, JSON.stringify(payload))
    else localStorage.removeItem(CURSOR_KEY)
  } catch {}
  window.dispatchEvent(new Event(CURSOR_EVENT))
}

// ── Petits composants réutilisables ──────────────────────────────────────────
function BerryDisplay({ amount, size = 15, color = '#f5b50a' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 800, color, fontSize: size, fontFamily: "'Cinzel', serif" }}>
      <span style={{ fontSize: size + 1 }}>{BERRY_SYMBOL}</span>{formatBerry(amount)}
    </span>
  )
}

function RarityBadge({ rarete, small = false }) {
  const r = RARITY_CONFIG[rarete]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: small ? '2px 8px' : '3px 10px',
      borderRadius: 999, fontSize: small ? 9.5 : 10.5, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase',
      color: r.color, background: `${r.color}1f`, border: `1px solid ${r.color}66`, boxShadow: `0 0 12px ${r.glow}`,
      fontFamily: "'Cinzel', serif", whiteSpace: 'nowrap',
    }}>{r.label}</span>
  )
}

function CursorPreview({ cur, size = 56 }) {
  const r = RARITY_CONFIG[cur.rarete]
  const [r2Failed, setR2Failed] = useState(false)
  const r2Url = `${R2_BASE}/${cur.id}.png`
  return (
    <div style={{
      width: size, height: size, display: 'grid', placeItems: 'center', borderRadius: 14,
      background: `radial-gradient(circle at 50% 40%, ${r.color}22, rgba(0,0,0,0.18))`,
      border: `1px solid ${r.color}44`, boxShadow: `inset 0 0 18px ${r.glow}`,
    }}>
      {/* Priorité : SVG vectoriel custom (designs maison) → PNG R2 → emoji */}
      {cursorSvgURI(cur.id) ? (
        <img src={cursorSvgURI(cur.id)} alt=""
          style={{ width: Math.round(size * 0.8), height: Math.round(size * 0.8), animation: cur.animated ? 'crc-float 1.6s ease-in-out infinite' : 'none', filter: `drop-shadow(0 2px 6px ${r.glow})` }} />
      ) : r2Failed ? (
        <span style={{ fontSize: Math.round(size * 0.56), lineHeight: 1, animation: cur.animated ? 'crc-float 1.6s ease-in-out infinite' : 'none', filter: `drop-shadow(0 2px 6px ${r.glow})` }}>{cur.emoji}</span>
      ) : (
        <img src={r2Url} alt="" onError={() => setR2Failed(true)}
          style={{ width: Math.round(size * 0.62), height: Math.round(size * 0.62), imageRendering: 'auto' }} />
      )}
    </div>
  )
}

// Dernière position pointeur connue (module-level) : survit aux changements de route /
// remontages de l'overlay. Sinon le curseur animé restait invisible tant que la souris
// n'avait pas bougé après un chargement d'accueil (body cursor:none + overlay hors écran).
let _lastPX = typeof window !== 'undefined' ? window.innerWidth / 2 : 0
let _lastPY = typeof window !== 'undefined' ? window.innerHeight / 2 : 0
if (typeof window !== 'undefined') {
  window.addEventListener('mousemove', (e) => { _lastPX = e.clientX; _lastPY = e.clientY }, { passive: true })
}

// Overlay animé qui suit la souris (curseurs MYTHIQUE/INTERDIT = pas faisable en
// curseur natif animé). Position fixed, pointer-events none, au-dessus de tout.
function CustomCursorOverlay({ id, emoji, glow }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Déplacement via transform (compositor GPU) : zéro layout/paint par frame,
    // contrairement à left/top. translate3d isole la couche composite.
    let raf = 0, x = _lastPX, y = _lastPY
    const apply = () => { raf = 0; if (el) el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%,-50%)` }
    const onMove = (e) => { x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(apply) }
    apply() // peint immédiatement à la dernière position connue → jamais invisible au repos
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => { window.removeEventListener('mousemove', onMove); if (raf) cancelAnimationFrame(raf) }
  }, [])
  return (
    <div ref={ref} aria-hidden style={{
      position: 'fixed', left: 0, top: 0, zIndex: 2147483647, pointerEvents: 'none',
      transform: `translate3d(${_lastPX}px,${_lastPY}px,0) translate(-50%,-50%)`,
      willChange: 'transform', fontSize: 30, lineHeight: 1,
      filter: `drop-shadow(0 0 7px ${glow || 'rgba(245,181,10,0.7)'})`,
    }}>
      {/* Le pulse vit sur l'enfant : il ne se bat plus avec le transform de position. */}
      <span style={{ display: 'block', animation: 'crc-pulse 1.1s ease-in-out infinite' }}>
        {cursorSvgURI(id)
          ? <img src={cursorSvgURI(id)} alt="" style={{ width: 34, height: 34, display: 'block' }} />
          : emoji}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GlobalCursorLayer — applique le curseur équipé sur TOUT le site.
// À monter une seule fois (App.jsx). Lit localStorage + réagit à CURSOR_EVENT.
// ─────────────────────────────────────────────────────────────────────────────
export function GlobalCursorLayer() {
  const [equipped, setEquipped] = useState(null)
  // Phase dessin Brams Phone : on rend le curseur natif au canvas (pas de curseur custom/none).
  const [drawOpen, setDrawOpen] = useState(() => typeof document !== 'undefined' && document.body.dataset.drawOpen === 'true')
  useEffect(() => {
    const upd = () => setDrawOpen(document.body.dataset.drawOpen === 'true')
    window.addEventListener('bp-draw-toggle', upd)
    return () => window.removeEventListener('bp-draw-toggle', upd)
  }, [])
  useEffect(() => {
    const read = () => {
      // En dessin : ne touche pas au curseur (laisse le natif/canvas), pas d'overlay.
      if (document.body.dataset.drawOpen === 'true') { document.body.style.cursor = ''; return }
      let payload = null
      try { const raw = localStorage.getItem(CURSOR_KEY); payload = raw ? JSON.parse(raw) : null } catch {}
      setEquipped(payload)
      // Curseur natif (non animé) appliqué via le body ; animé → body none + overlay.
      if (!payload) document.body.style.cursor = ''
      else if (payload.animated) document.body.style.cursor = 'none'
      else document.body.style.cursor = `url("${cursorSvgURI(payload.id, 32) || emojiCursorURI(payload.emoji)}") 5 3, auto`
    }
    read()
    window.addEventListener(CURSOR_EVENT, read)
    window.addEventListener('bp-draw-toggle', read) // ré-applique en entrant/sortant du dessin
    window.addEventListener('storage', read) // sync entre onglets
    return () => { window.removeEventListener(CURSOR_EVENT, read); window.removeEventListener('bp-draw-toggle', read); window.removeEventListener('storage', read) }
  }, [])
  if (drawOpen || !equipped || !equipped.animated) return null
  return <CustomCursorOverlay id={equipped.id} emoji={equipped.emoji} glow={equipped.glow} />
}

// ── Carte curseur ─────────────────────────────────────────────────────────────
function CursorCard({ cur, owned, equipped, affordable, busy, onBuy, onEquip, onGift, vip }) {
  const r = RARITY_CONFIG[cur.rarete]
  const [hover, setHover] = useState(false)
  const cart = useCart()
  const inCart = cart.has(cur.id)
  const soldOut = cur.limite && cur.stock != null && cur.stock <= 0
  const cardCursor = (!owned && !affordable) || soldOut ? 'not-allowed' : cursorCss(cur)

  let action
  if (equipped) {
    action = <div style={{ ...btnBase, color: r.color, background: `${r.color}1a`, border: `1px solid ${r.color}`, cursor: 'default' }}>✓ Équipé</div>
  } else if (owned) {
    action = <button onClick={() => onEquip(cur)} disabled={busy} style={{ ...btnBase, color: '#0b0c0e', background: r.color, border: `1px solid ${r.color}`, cursor: 'pointer', opacity: busy ? .6 : 1 }}>Équiper</button>
  } else if (soldOut) {
    action = <div style={{ ...btnBase, color: '#caa', background: 'rgba(120,40,38,0.25)', border: '1px solid rgba(192,57,43,0.5)', cursor: 'not-allowed' }}>Épuisé</div>
  } else {
    action = (
      <button onClick={() => onBuy(cur)} disabled={busy} style={{ ...btnBase, color: '#0b0c0e', background: vip ? 'linear-gradient(135deg,#ffd84d,#ffb3c7)' : `linear-gradient(180deg, ${r.color}, ${r.color}cc)`, border: `1px solid ${vip ? '#ffd84d' : r.color}`, cursor: 'pointer', opacity: busy ? .6 : 1 }}>
        {busy ? '…' : vip ? vip.label : <>Acheter · {formatEuro(priceCents(cur))}</>}
      </button>
    )
  }

  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column', gap: 11, padding: 16, borderRadius: 16,
        background: 'linear-gradient(180deg, rgba(28,24,18,0.9), rgba(18,16,12,0.92))',
        border: `1.5px solid ${equipped ? r.color : hover ? `${r.color}aa` : `${r.color}3a`}`,
        boxShadow: equipped
          ? `0 0 0 1px ${r.color}, 0 14px 40px ${r.glow}`
          : hover ? `0 16px 38px ${r.glow}, inset 0 0 22px ${r.color}12` : `0 6px 18px rgba(0,0,0,0.4)`,
        transform: hover ? 'translateY(-5px)' : 'translateY(0)',
        transition: 'transform .22s cubic-bezier(.22,1,.36,1), box-shadow .22s ease, border-color .2s ease',
        cursor: cardCursor,
      }}>
      {cur.limite && (
        <div style={{ position: 'absolute', top: 10, right: 10, padding: '3px 8px', borderRadius: 7, fontSize: 8.5, fontWeight: 900, letterSpacing: '.1em', color: '#ffdf9e', background: 'rgba(120,80,10,0.55)', border: '1px solid rgba(245,181,10,0.6)', fontFamily: "'Cinzel', serif" }}>ÉDITION LIMITÉE</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <CursorPreview cur={cur} />
        <div style={{ minWidth: 0 }}>
          {/* paddingRight quand "ÉDITION LIMITÉE" est affiché → le titre ne passe plus dessous */}
          <div style={{ fontFamily: "'Pirata One', serif", fontSize: 21, color: '#f4ecd8', lineHeight: 1.05, marginBottom: 5, paddingRight: cur.limite ? 86 : 0 }}>{cur.nom}</div>
          <RarityBadge rarete={cur.rarete} small />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        {cur.limite && cur.stock != null
          ? <span style={{ fontSize: 11, fontWeight: 800, color: cur.stock <= 3 ? '#ff9b8a' : '#cdbd97', fontFamily: "'Cinzel', serif" }}>{cur.stock} restant{cur.stock > 1 ? 's' : ''}</span>
          : <span style={{ fontSize: 11, color: 'rgba(205,189,151,0.5)', fontFamily: "'Cinzel', serif" }}>Illimité</span>}
        {cur.animated && <span style={{ fontSize: 10, fontWeight: 800, color: r.color, fontFamily: "'Cinzel', serif" }}>✦ ANIMÉ</span>}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>{action}</div>
        {!owned && (
          <button onClick={() => cart.add({ id: cur.id, label: cur.nom, emoji: cur.emoji, priceCents: priceCents(cur), rarity: cur.rarete })}
            title={inCart ? 'Déjà au panier' : 'Ajouter au panier'} disabled={inCart}
            style={{ flexShrink: 0, width: 44, borderRadius: 10, border: `1px solid ${r.color}55`, background: inCart ? `${r.color}22` : 'rgba(255,255,255,0.04)', color: r.color, cursor: inCart ? 'default' : 'pointer', fontSize: 16 }}>{inCart ? '✓' : '🛒'}</button>
        )}
        <button onClick={() => onGift(cur)} title="Offrir à un membre" style={{ flexShrink: 0, width: 44, borderRadius: 10, border: `1px solid ${r.color}55`, background: 'rgba(255,255,255,0.04)', color: r.color, cursor: 'pointer', fontSize: 17 }}>🎁</button>
      </div>
    </div>
  )
}

const btnBase = {
  width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: 800,
  textAlign: 'center', fontFamily: "'Cinzel', serif", letterSpacing: '.02em',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
}

// ─────────────────────────────────────────────────────────────────────────────
// CursorShop — la section catalogue (à embarquer sous le hero de la Boutique)
// ─────────────────────────────────────────────────────────────────────────────
export default function CursorShop() {
  const { isAuthenticated, discordId, berryCount } = useAuth()
  const [balance, setBalance] = useState(null)
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [filter, setFilter] = useState('TOUS')
  const [toast, setToast] = useState(null)
  const [flashId, setFlashId] = useState(null)
  const [giftItem, setGiftItem] = useState(null)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    const inv = await fetchMyInventory().catch(() => [])
    setInventory(Array.isArray(inv) ? inv : [])
    setLoading(false)
  }, [isAuthenticated])

  useEffect(() => { refresh() }, [refresh, discordId])

  // Retour de Stripe Checkout (?stripe=success&session_id=...) → finalise l'achat
  // côté serveur, flash de succès, nettoie l'URL, refetch l'inventaire.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const mode = p.get('stripe')
    if (mode !== 'success' && mode !== 'gift_sent') return
    const sid = p.get('session_id')
    ;(async () => {
      if (sid) {
        const { data } = await completeOpeningBgCheckout(sid)
        if (mode === 'gift_sent') {
          showToast(data?.refunded ? 'Ce membre possédait déjà l\'article — tu as été remboursé.' : '🎁 Cadeau envoyé ! Ton nakama le verra à sa connexion.', 'success')
        } else {
          if (data?.item?.id) { setFlashId(data.item.id); setTimeout(() => setFlashId(null), 900) }
          showToast('✦ Article débloqué ! Équipe-le.', 'success')
        }
      }
      window.history.replaceState({}, document.title, '/boutique')
      refresh()
    })()
  }, [refresh])

  // Au montage : applique le curseur déjà équipé (si l'inventaire en a un) →
  // synchro la source de vérité serveur vers le localStorage/site.
  useEffect(() => {
    const eq = inventory.find(i => i.reward_type === 'cursor' && i.equipped)
    if (eq) {
      const cur = CURSEURS.find(c => c.id === eq.item_id)
      if (cur) persistEquippedCursor({ id: cur.id, emoji: cur.emoji, animated: cur.animated, glow: RARITY_CONFIG[cur.rarete].glow })
    }
  }, [inventory])

  const ownedSet = useMemo(() => new Set(inventory.filter(i => i.reward_type === 'cursor').map(i => i.item_id)), [inventory])
  const equippedId = useMemo(() => inventory.find(i => i.reward_type === 'cursor' && i.equipped)?.item_id || null, [inventory])

  const showToast = (msg, kind = 'info') => { setToast({ msg, kind }); setTimeout(() => setToast(null), 3200) }

  // Achat en € via Stripe Checkout (redirection). Le serveur revalide le prix.
  const buy = useCallback(async (cur) => {
    if (busyId) return
    if (!isAuthenticated) { showToast('Connecte-toi pour acheter.', 'error'); return }
    setBusyId(cur.id)
    const { data, error } = await createOpeningBgCheckout(cur.id)
    if (error || !data?.url) {
      showToast(error?.message || 'Paiement indisponible.', 'error')
      setBusyId(null)
      return
    }
    window.location.assign(data.url)
  }, [busyId, isAuthenticated])

  const equip = useCallback(async (cur) => {
    if (busyId) return
    setBusyId(cur.id)
    const { data, error } = await equipShopItem(cur.id)
    if (error) { showToast(error.message || 'Équipement impossible.', 'error'); setBusyId(null); return }
    const nowEquipped = data?.equipped !== false
    persistEquippedCursor(nowEquipped ? { id: cur.id, emoji: cur.emoji, animated: cur.animated, glow: RARITY_CONFIG[cur.rarete].glow } : null)
    showToast(nowEquipped ? `${cur.nom} équipé sur tout le site ✦` : `${cur.nom} retiré.`, 'success')
    await refresh()
    setBusyId(null)
  }, [busyId, refresh])

  const filters = useMemo(() => ['TOUS', ...Object.keys(RARITY_CONFIG).sort((a, b) => RARITY_CONFIG[a].order - RARITY_CONFIG[b].order)], [])
  const visible = useMemo(() => {
    const list = filter === 'TOUS' ? CURSEURS : CURSEURS.filter(c => c.rarete === filter)
    return [...list].sort((a, b) => RARITY_CONFIG[a.rarete].order - RARITY_CONFIG[b.rarete].order || a.prix - b.prix)
  }, [filter])

  return (
    <section style={{ marginTop: 64, position: 'relative' }}>
      <style>{KEYFRAMES}</style>

      {/* En-tête section + wallet */}
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: '#BFA46A', marginBottom: 6 }}>Brams Shop · Arsenal</div>
          <h2 style={{
            margin: 0, fontFamily: "'Pirata One', serif", fontSize: 'clamp(32px,5vw,50px)', fontWeight: 400, lineHeight: 1.02, color: '#f4ecd8',
            textShadow: '0 1px 0 #7a5a1e, 0 2px 0 #5e4416, 0 3px 0 #432f0e, 0 4px 14px rgba(0,0,0,0.6), 0 0 34px rgba(245,181,10,0.25)',
          }}>Curseurs Légendaires</h2>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: 'rgba(205,189,151,0.7)', maxWidth: 560, fontFamily: "'Cinzel', serif" }}>
            Personnalise ton curseur sur tout le site. Paye en quelques clics, équipe, et navigue avec classe de pirate.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 20px', borderRadius: 14, background: 'rgba(28,24,18,0.7)', border: '1px solid rgba(245,181,10,0.3)', boxShadow: '0 0 26px rgba(245,181,10,0.12)' }}>
          <span style={{ fontSize: 22 }}>💳</span>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(205,189,151,0.55)', fontFamily: "'Cinzel', serif" }}>Prix des curseurs</div>
            <strong style={{ fontSize: 19, color: '#f5b50a', fontFamily: "'Cinzel', serif" }}>0,50 € à 2,00 €</strong>
          </div>
        </div>
      </header>

      {/* Filtres par rareté */}
      <div className="crc-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 22 }}>
        {filters.map(f => {
          const active = filter === f
          const c = f === 'TOUS' ? '#BFA46A' : RARITY_CONFIG[f].color
          const label = f === 'TOUS' ? 'TOUS' : RARITY_CONFIG[f].label
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              flexShrink: 0, padding: '8px 16px', borderRadius: 999, fontSize: 12, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase',
              cursor: 'pointer', fontFamily: "'Cinzel', serif",
              color: active ? '#0b0c0e' : c, background: active ? c : `${c}14`, border: `1px solid ${active ? c : `${c}55`}`,
              boxShadow: active ? `0 0 16px ${c}66` : 'none', transition: 'all .18s ease',
            }}>{label}</button>
          )
        })}
      </div>

      {/* Grille */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ height: 184, borderRadius: 16, background: 'linear-gradient(110deg, rgba(40,34,24,0.5) 8%, rgba(60,50,34,0.6) 18%, rgba(40,34,24,0.5) 33%)', backgroundSize: '200% 100%', animation: 'crc-shimmer 1.3s linear infinite' }} />
          ))}
        </div>
      ) : (
        // Rangées « Netflix » par rareté (INTERDIT → COMMUN). Une rangée vide disparaît.
        [...Object.keys(RARITY_CONFIG)].sort((a, b) => RARITY_CONFIG[b].order - RARITY_CONFIG[a].order).map(rk => {
          const rows = visible.filter(c => c.rarete === rk)
          if (!rows.length) return null
          const rc = RARITY_CONFIG[rk]
          return (
            <RarityRow key={rk} label={rc.label} color={rc.color} count={rows.length} countLabel={`curseur${rows.length > 1 ? 's' : ''}`}>
              {rows.map(cur => (
                <div key={cur.id} style={{ position: 'relative', flex: '0 0 300px', width: 300 }}>
                  <SpotlightCard hue={HUE[cur.rarete] ?? 42} radius={16}>
                    <CursorCard
                      cur={cur}
                      owned={ownedSet.has(cur.id)}
                      equipped={equippedId === cur.id}
                      affordable={true}
                      busy={busyId === cur.id}
                      vip={vipFree(discordId)}
                      onBuy={buy} onEquip={equip} onGift={setGiftItem}
                    />
                  </SpotlightCard>
                  {flashId === cur.id && (
                    <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 16, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 45%, rgba(245,181,10,0.55), transparent 65%)', animation: 'crc-flash .85s ease-out forwards' }}>
                      <span style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', fontFamily: "'Pirata One', serif", fontSize: 30, color: '#fff6d8', textShadow: '0 0 12px rgba(245,181,10,0.9)', animation: 'crc-plus .85s ease-out forwards' }}>+1</span>
                    </div>
                  )}
                </div>
              ))}
            </RarityRow>
          )
        })
      )}

      {!isAuthenticated && (
        <p style={{ marginTop: 18, fontSize: 13, color: 'rgba(205,189,151,0.6)', fontFamily: "'Cinzel', serif", textAlign: 'center' }}>
          Connecte-toi avec Discord pour acheter et équiper tes curseurs.
        </p>
      )}

      {toast && (
        <div role="status" style={{
          position: 'fixed', bottom: 26, left: '50%', zIndex: 1100, transform: 'translateX(-50%)', padding: '13px 22px', borderRadius: 12, fontWeight: 800, fontSize: 14,
          fontFamily: "'Cinzel', serif", animation: 'crc-toast .25s ease',
          color: toast.kind === 'error' ? '#ffd9d6' : toast.kind === 'success' ? '#d6ffe6' : '#f4ecd8',
          background: toast.kind === 'error' ? 'rgba(120,40,38,0.95)' : toast.kind === 'success' ? 'rgba(28,70,48,0.95)' : 'rgba(20,18,14,0.96)',
          border: `1px solid ${toast.kind === 'error' ? 'rgba(255,120,110,0.4)' : toast.kind === 'success' ? 'rgba(127,214,160,0.4)' : 'rgba(245,181,10,0.3)'}`,
          boxShadow: '0 14px 44px rgba(0,0,0,.55)',
        }}>{toast.msg}</div>
      )}

      {giftItem && <GiftModal item={{ id: giftItem.id, nom: giftItem.nom, emoji: giftItem.emoji }} onClose={() => setGiftItem(null)} />}
    </section>
  )
}

const KEYFRAMES = `
@keyframes crc-float { 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-4px) } }
@keyframes crc-pulse { 0%,100%{ transform:translate(-50%,-50%) scale(1) } 50%{ transform:translate(-50%,-50%) scale(1.18) } }
@keyframes crc-shimmer { 0%{ background-position:200% 0 } 100%{ background-position:-200% 0 } }
@keyframes crc-flash { 0%{ opacity:0 } 25%{ opacity:1 } 100%{ opacity:0 } }
@keyframes crc-plus { 0%{ opacity:0; transform:translateX(-50%) translateY(8px) scale(.6) } 30%{ opacity:1 } 100%{ opacity:0; transform:translateX(-50%) translateY(-26px) scale(1.1) } }
@keyframes crc-toast { from{ opacity:0; transform:translateX(-50%) translateY(10px) } to{ opacity:1; transform:translateX(-50%) translateY(0) } }
.crc-scroll::-webkit-scrollbar { height:6px } .crc-scroll::-webkit-scrollbar-thumb { background:rgba(245,181,10,0.3); border-radius:3px }
`
