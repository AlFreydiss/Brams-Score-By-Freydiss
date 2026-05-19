import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext.jsx'
import {
  RARITY_STYLES,
  SHOP_CATEGORIES,
  fetchAdminShopData,
  fetchBerryShopState,
  purchaseShopItem,
  upsertShopItem,
} from '../lib/berryShop.js'

const RARITY_ORDER = ['Commun', 'Rare', 'Epique', 'Legendaire', 'Mythique']

const DISPLAY_CATS = [
  { key: 'Tous',          label: 'Tous',        icon: '⚔️' },
  { key: 'Cosmetique',    label: 'Titres',       icon: '👑' },
  { key: 'Roles Discord', label: 'Rôles',        icon: '🎭' },
  { key: 'Badges',        label: 'Badges',       icon: '🏅' },
  { key: 'Boosts',        label: 'Boosts',       icon: '⚡' },
  { key: 'Coffres',       label: 'Coffres',      icon: '📦' },
  { key: 'Evenements',    label: 'Événements',   icon: '🎪' },
  { key: 'Equipage',      label: 'Équipage',     icon: '⚓' },
  { key: 'Prestige',      label: 'Prestige',     icon: '✦' },
]

const CAT_ICONS = {
  Cosmetique: '👑', 'Roles Discord': '🎭', Badges: '🏅',
  Boosts: '⚡', Coffres: '📦', Evenements: '🎪', Equipage: '⚓', Prestige: '✦',
}

const SORT_OPTIONS = [
  { key: 'rarity',     label: '✦ Par rareté' },
  { key: 'price_desc', label: '↓ Prix décroissant' },
  { key: 'price_asc',  label: '↑ Prix croissant' },
  { key: 'limited',    label: '⏳ Limités d\'abord' },
]

const emptyItem = {
  name: '', description: '', category: 'Cosmetique', price: 400000,
  rarity: 'Commun', stock: '', limited: false, active: true,
  reward_type: 'badge', reward_data: {},
}

function formatBerry(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0))
}

function formatCompact(value) {
  const n = Number(value || 0)
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${Math.floor(n / 1_000)}K`
  return String(n)
}

function openAuth() {
  document.dispatchEvent(new CustomEvent('open-auth-modal'))
}

function RarityBadge({ rarity }) {
  const s = RARITY_STYLES[rarity] || RARITY_STYLES.Commun
  return (
    <span className={`bs-rarity bs-rarity--${rarity.toLowerCase()}`} style={{ '--rc': s.color }}>
      {s.label}
    </span>
  )
}

function RarityStars({ rarity }) {
  const idx = RARITY_ORDER.indexOf(rarity)
  const color = (RARITY_STYLES[rarity] || RARITY_STYLES.Commun).color
  return (
    <div className="bs-stars">
      {RARITY_ORDER.map((_, i) => (
        <span key={i} style={{ color: i <= idx ? color : 'rgba(255,255,255,0.1)' }}>★</span>
      ))}
    </div>
  )
}

/* ─── Item modal ─── */
function ItemModal({ item, balance, busy, message, onClose, onConfirm }) {
  if (!item) return null
  const canBuy = balance >= Number(item.price)
  const deficit = canBuy ? 0 : Number(item.price) - balance
  const s = RARITY_STYLES[item.rarity] || RARITY_STYLES.Commun

  return (
    <AnimatePresence>
      <motion.div className="bs-modal-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}>
        <motion.div className="bs-modal" style={{ '--rc': s.color }}
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.98 }}
          onClick={e => e.stopPropagation()}>
          <div className="bs-modal-top">
            <div className="bs-modal-badges">
              <RarityBadge rarity={item.rarity} />
              {item.limited && <span className="bs-limited">Limité</span>}
            </div>
            <button type="button" className="bs-modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="bs-modal-icon">{CAT_ICONS[item.category] || '🏴‍☠️'}</div>
          <h2 className="bs-modal-title">{item.name}</h2>
          <p className="bs-modal-desc">{item.description}</p>
          <div className="bs-modal-grid">
            <div className="bs-modal-kv">
              <span>Prix</span>
              <strong style={{ color: s.color }}>🪙 {formatBerry(item.price)} berries</strong>
            </div>
            <div className="bs-modal-kv">
              <span>Ton solde</span>
              <strong>{formatBerry(balance)} berries</strong>
            </div>
            <div className="bs-modal-kv">
              <span>Récompense</span>
              <strong>{item.reward_type}</strong>
            </div>
            <div className="bs-modal-kv">
              <span>Stock</span>
              <strong>{item.stock ?? 'Illimité'}</strong>
            </div>
          </div>
          {!canBuy && (
            <div className="bs-modal-deficit">
              <span>⚠️</span>
              <div>
                <strong>Solde insuffisant</strong>
                <p>Il te manque <b>{formatBerry(deficit)} berries</b> — continue de grind sur le Discord.</p>
              </div>
            </div>
          )}
          {message && (
            <div className={message.type === 'error' ? 'bs-msg bs-msg--err' : 'bs-msg bs-msg--ok'}>
              {message.text}
            </div>
          )}
          <button className="bs-modal-confirm" type="button"
            disabled={!canBuy || busy} onClick={() => onConfirm(item)}>
            {busy
              ? '⏳ Vérification en cours...'
              : canBuy
                ? `✦ Confirmer l'achat — ${formatBerry(item.price)} berries`
                : 'Solde insuffisant'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ─── Admin panel ─── */
function AdminShop({ isAdmin }) {
  const [adminData, setAdminData] = useState({ items: [], transactions: [] })
  const [form, setForm] = useState(emptyItem)
  const [status, setStatus] = useState('')

  useEffect(() => { if (isAdmin) fetchAdminShopData().then(setAdminData) }, [isAdmin])

  async function saveItem(e) {
    e.preventDefault()
    const payload = {
      ...form,
      price: Number(form.price),
      stock: form.stock === '' ? null : Number(form.stock),
      reward_data: typeof form.reward_data === 'string' ? JSON.parse(form.reward_data || '{}') : form.reward_data,
    }
    const { error } = await upsertShopItem(payload)
    setStatus(error ? error.message : 'Item sauvegardé.')
    if (!error) { setForm(emptyItem); fetchAdminShopData().then(setAdminData) }
  }

  if (!isAdmin) {
    return (
      <section className="bs-admin bs-admin--locked">
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(212,160,23,.7)' }}>ADMIN SHOP</span>
        <h2 style={{ margin: '8px 0 10px', fontSize: 22 }}>Gestion protégée</h2>
        <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 14, maxWidth: 600 }}>Seuls les profils admin peuvent créer des items, modifier les prix et auditer les transactions.</p>
      </section>
    )
  }

  return (
    <section className="bs-admin">
      <div className="berry-section-head"><span>ADMIN SHOP</span><h2>Pilotage boutique</h2></div>
      <form onSubmit={saveItem} className="berry-admin-form">
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nom item" required />
        <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" required />
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
          {SHOP_CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={form.rarity} onChange={e => setForm({ ...form, rarity: e.target.value })}>
          {Object.keys(RARITY_STYLES).map(r => <option key={r}>{r}</option>)}
        </select>
        <input type="number" min="400000" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="Prix (min 400 000)" required />
        <input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="Stock vide = illimité" />
        <input value={form.reward_type} onChange={e => setForm({ ...form, reward_type: e.target.value })} placeholder="reward_type" />
        <textarea value={JSON.stringify(form.reward_data)} onChange={e => setForm({ ...form, reward_data: e.target.value })} placeholder='{"roleId":"..."}' />
        <label><input type="checkbox" checked={form.limited} onChange={e => setForm({ ...form, limited: e.target.checked })} /> Vente limitée</label>
        <label><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Actif</label>
        <button type="submit">Sauvegarder</button>
      </form>
      {status && <div className="bs-msg bs-msg--ok">{status}</div>}
      <div className="berry-admin-table">
        {adminData.transactions.map(tx => (
          <div key={tx.id}>
            <span>{tx.discord_id}</span>
            <strong>{tx.shop_items?.name || tx.item_id}</strong>
            <em>{formatBerry(tx.price)} / {tx.status}</em>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─── Shop card (main grid) ─── */
function ShopCard({ item, balance, onClick, index }) {
  const s = RARITY_STYLES[item.rarity] || RARITY_STYLES.Commun
  const canAfford = balance >= Number(item.price)
  const stockCritical = item.stock !== null && item.stock <= 3
  const icon = CAT_ICONS[item.category] || '🏴‍☠️'
  const deficit = canAfford ? 0 : Number(item.price) - balance

  return (
    <motion.button
      className={`bs-card bs-card--${item.rarity.toLowerCase()}`}
      style={{ '--rc': s.color }}
      onClick={() => onClick(item)}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.32 }}
      whileHover={{ y: -6, transition: { duration: 0.22 } }}
      layout
    >
      <div className="bs-card-glow" />
      <div className="bs-card-top">
        <RarityBadge rarity={item.rarity} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {item.limited && <span className="bs-limited">Limité</span>}
          {stockCritical && <span className="bs-stock-warn">⚠ {item.stock}</span>}
        </div>
      </div>
      <div className="bs-card-icon">{icon}</div>
      <h3 className="bs-card-name">{item.name}</h3>
      <p className="bs-card-desc">{item.description}</p>
      <RarityStars rarity={item.rarity} />
      <div className="bs-card-foot">
        <div className="bs-card-price">
          <span style={{ fontSize: 16 }}>🪙</span>
          <span className="bs-card-price-val">{formatBerry(item.price)}</span>
          <span className="bs-card-price-unit">berries</span>
        </div>
        <span className={`bs-cta-pill ${canAfford ? 'bs-cta-pill--can' : 'bs-cta-pill--cant'}`}>
          {item.stock === 0 ? 'Épuisé' : canAfford ? 'Acheter' : `−${formatCompact(deficit)}`}
        </span>
      </div>
      {item.stock !== null && !stockCritical && (
        <div className="bs-card-stock">{item.stock} en stock</div>
      )}
    </motion.button>
  )
}

/* ─── Featured card (Mythique zone) ─── */
function FeaturedCard({ item, balance, onClick }) {
  const s = RARITY_STYLES[item.rarity] || RARITY_STYLES.Mythique
  const canAfford = balance >= Number(item.price)
  const deficit = canAfford ? 0 : Number(item.price) - balance
  const icon = CAT_ICONS[item.category] || '🏴‍☠️'

  return (
    <motion.button
      className="bs-feat-card"
      style={{ '--rc': s.color }}
      onClick={() => onClick(item)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -10, transition: { duration: 0.28 } }}
    >
      <div className="bs-feat-glow" />
      <div className="bs-feat-shimmer" />
      <div className="bs-feat-top">
        <span className="bs-feat-badge">⚡ OBJET CONVOITÉ</span>
        <RarityBadge rarity={item.rarity} />
      </div>
      <div className="bs-feat-icon">{icon}</div>
      <h3 className="bs-feat-name">{item.name}</h3>
      <p className="bs-feat-desc">{item.description}</p>
      {item.stock !== null && (
        <div className="bs-feat-stock">
          <span className="bs-feat-dot" />
          {item.stock} exemplaire{item.stock > 1 ? 's' : ''} — objet ultra rare
        </div>
      )}
      <div className="bs-feat-foot">
        <div className="bs-feat-price">
          <span style={{ fontSize: 22 }}>🪙</span>
          <span className="bs-feat-price-val">{formatBerry(item.price)}</span>
          <span className="bs-feat-price-unit">berries</span>
        </div>
        <span className={`bs-feat-cta ${canAfford ? 'bs-feat-cta--can' : 'bs-feat-cta--cant'}`}>
          {canAfford ? '✦ Acquérir' : `−${formatCompact(deficit)}`}
        </span>
      </div>
    </motion.button>
  )
}

/* ─── Main export ─── */
export default function BerryShop() {
  const { isAuthenticated, discordId, displayName, avatarUrl, user } = useAuth()
  const [state, setState] = useState({ balance: 0, items: [], inventory: [], transactions: [], preview: false })
  const [category, setCategory] = useState('Tous')
  const [sort, setSort] = useState('rarity')
  const [showAffordable, setShowAffordable] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const isAdmin = user?.user_metadata?.role === 'admin' || user?.app_metadata?.role === 'admin'

  useEffect(() => {
    if (isAuthenticated) fetchBerryShopState(discordId).then(setState)
  }, [isAuthenticated, discordId])

  const featuredItems = useMemo(() =>
    state.items.filter(i => i.rarity === 'Mythique').slice(0, 3)
  , [state.items])

  const itemCounts = useMemo(() => {
    const counts = { Tous: state.items.length }
    DISPLAY_CATS.forEach(cat => {
      if (cat.key !== 'Tous') counts[cat.key] = state.items.filter(i => i.category === cat.key).length
    })
    return counts
  }, [state.items])

  const sortedFiltered = useMemo(() => {
    let items = category === 'Tous' ? [...state.items] : state.items.filter(i => i.category === category)
    if (showAffordable) items = items.filter(i => state.balance >= Number(i.price))
    switch (sort) {
      case 'price_asc':  items.sort((a, b) => a.price - b.price); break
      case 'price_desc': items.sort((a, b) => b.price - a.price); break
      case 'rarity':     items.sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity)); break
      case 'limited':    items.sort((a, b) => (b.limited ? 1 : 0) - (a.limited ? 1 : 0)); break
    }
    return items
  }, [category, sort, showAffordable, state.items, state.balance])

  const gridItems = useMemo(() =>
    category === 'Tous'
      ? sortedFiltered.filter(i => i.rarity !== 'Mythique')
      : sortedFiltered
  , [sortedFiltered, category])

  const maxPrice = state.items.length ? Math.max(...state.items.map(i => Number(i.price))) : 0
  const limitedCount = state.items.filter(i => i.limited).length

  async function confirmPurchase(item) {
    setBusy(true); setMessage(null)
    const { data, error } = await purchaseShopItem(item.id)
    if (error) { setMessage({ type: 'error', text: error.message }); setBusy(false); return }
    if (data?.ok === false) {
      setMessage({ type: 'error', text: data.error || 'Achat refusé par le serveur.' })
      setState(c => ({ ...c, balance: Number(data.balance ?? c.balance) }))
      setBusy(false); return
    }
    setMessage({ type: 'success', text: '✓ Achat validé. Récompense ajoutée à ton profil.' })
    setState(c => ({ ...c, balance: Number(data?.balance ?? c.balance - item.price) }))
    fetchBerryShopState(discordId).then(setState)
    setBusy(false)
  }

  const DISCORD_SVG = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  )

  if (!isAuthenticated) {
    return (
      <main className="bs-page">
        <div className="bs-bg-deco" aria-hidden="true" />
        <section className="bs-login-hero">
          <div className="bs-login-icon">🔒</div>
          <div className="bs-hero-label">🏴‍☠️ BERRY SHOP — BRAMS COMMUNITY</div>
          <h1 className="bs-hero-title">
            <span className="bs-hero-title-main">Berry</span>
            <span className="bs-hero-title-accent"> Shop</span>
          </h1>
          <p className="bs-login-sub">
            Ta monnaie Discord devient puissante ici.<br />
            Connecte-toi pour accéder à des récompenses exclusives.
          </p>
          <button type="button" className="bs-login-btn" onClick={openAuth}>
            {DISCORD_SVG}
            Connexion Discord
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="bs-page">
      <div className="bs-bg-deco" aria-hidden="true" />

      {/* ── HERO ── */}
      <div className="bs-hero">
        <div className="bs-hero-glow-1" />
        <div className="bs-hero-glow-2" />
        <div className="bs-hero-left">
          <div className="bs-hero-label">🏴‍☠️ BERRY SHOP — BRAMS COMMUNITY</div>
          <h1 className="bs-hero-title">
            <span className="bs-hero-title-main">Berry</span>
            <span className="bs-hero-title-accent"> Shop</span>
          </h1>
          <p className="bs-hero-sub">
            Récompenses exclusives, titres rares, rôles prestigieux,<br />
            boosts d'élite et artefacts convoités.
          </p>
          <p className="bs-hero-tagline">
            Seuls les nakamas les plus investis peuvent prétendre à ces récompenses.
          </p>
          <div className="bs-kpis">
            {[
              { val: state.items.length, label: 'Objets' },
              { val: Object.keys(RARITY_STYLES).length, label: 'Raretés' },
              { val: formatCompact(maxPrice), label: 'Prix max' },
              { val: limitedCount, label: 'Limités' },
            ].map((k, i) => (
              <div key={i} className="bs-kpi">
                <span className="bs-kpi-val">{k.val}</span>
                <span className="bs-kpi-label">{k.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bs-wallet">
          <div className="bs-wallet-glow" />
          <div className="bs-wallet-header">
            <img src={avatarUrl || '/vite.svg'} alt="" className="bs-wallet-avatar" />
            <div>
              <div className="bs-wallet-name">{displayName}</div>
              <div className="bs-wallet-role">ÉQUIPAGE</div>
            </div>
            <div className="bs-wallet-live">
              <span className="bs-wallet-dot" />
              Live
            </div>
          </div>
          <div className="bs-wallet-balance-row">
            <span className="bs-wallet-coin">🪙</span>
            <span className="bs-wallet-amount">{formatBerry(state.balance)}</span>
          </div>
          <div className="bs-wallet-unit">berries disponibles</div>
          {state.balance < 400000 ? (
            <div className="bs-wallet-msg bs-wallet-msg--warn">
              Grind encore — le shop commence à <b>400 000 berries</b>
            </div>
          ) : (
            <div className="bs-wallet-msg bs-wallet-msg--ok">
              ✦ {formatCompact(state.balance)} berries — en chasse
            </div>
          )}
          {state.preview && (
            <div className="bs-preview-badge">MODE PREVIEW</div>
          )}
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div className="bs-controls">
        <div className="bs-cats">
          {DISPLAY_CATS.map(cat => (
            <button
              key={cat.key}
              className={`bs-cat${category === cat.key ? ' active' : ''}`}
              onClick={() => setCategory(cat.key)}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              {itemCounts[cat.key] > 0 && (
                <span className="bs-cat-count">{itemCounts[cat.key]}</span>
              )}
            </button>
          ))}
        </div>
        <div className="bs-sort-row">
          <select className="bs-select" value={sort} onChange={e => setSort(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <button
            className={`bs-toggle${showAffordable ? ' active' : ''}`}
            onClick={() => setShowAffordable(v => !v)}
          >
            {showAffordable ? '✓ ' : ''}Achetables uniquement
          </button>
        </div>
      </div>

      {/* ── FEATURED — Mythique / Prestige ── */}
      {featuredItems.length > 0 && category === 'Tous' && (
        <div className="bs-feat-zone">
          <div className="bs-feat-zone-header">
            <div className="bs-feat-zone-line" />
            <span className="bs-feat-zone-title">✦ Prestige &amp; Objets Convoités</span>
            <div className="bs-feat-zone-line" />
          </div>
          <p className="bs-feat-zone-sub">
            Ces récompenses ne sont accessibles qu'aux nakamas les plus dévoués. Chaque objet est unique.
          </p>
          <div className="bs-feat-grid">
            {featuredItems.map(item => (
              <FeaturedCard key={item.id} item={item} balance={state.balance} onClick={setSelectedItem} />
            ))}
          </div>
        </div>
      )}

      {/* ── GRID HEADER ── */}
      <div className="bs-section-header">
        <span className="bs-section-label">
          {category === 'Tous'
            ? 'Toutes les récompenses'
            : DISPLAY_CATS.find(c => c.key === category)?.label || category}
        </span>
        <span className="bs-section-count">{gridItems.length} objets</span>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="bs-grid">
        <AnimatePresence mode="popLayout">
          {gridItems.map((item, i) => (
            <ShopCard key={item.id} item={item} balance={state.balance} onClick={setSelectedItem} index={i} />
          ))}
        </AnimatePresence>
        {gridItems.length === 0 && (
          <div className="bs-empty">
            <span>🏴</span>
            <p>Aucun item dans cette catégorie.</p>
          </div>
        )}
      </div>

      {/* ── INVENTORY + HISTORY ── */}
      <div className="bs-lower">
        <div>
          <div className="berry-section-head"><span>INVENTAIRE</span><h2>Objets possédés</h2></div>
          <div className="berry-list">
            {state.inventory.length ? state.inventory.map(e => (
              <div key={e.id}>
                <strong>{e.shop_items?.name || e.item_id}</strong>
                <span>x{e.quantity} {e.equipped ? '/ équipé' : ''}</span>
              </div>
            )) : <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 13, margin: 0 }}>Aucun item pour le moment.</p>}
          </div>
        </div>
        <div>
          <div className="berry-section-head"><span>HISTORIQUE</span><h2>Transactions</h2></div>
          <div className="berry-list">
            {state.transactions.length ? state.transactions.map(tx => (
              <div key={tx.id}>
                <strong>{tx.shop_items?.name || tx.item_id}</strong>
                <span>{formatBerry(tx.price)} / {tx.status}</span>
              </div>
            )) : <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 13, margin: 0 }}>Aucun achat enregistré.</p>}
          </div>
        </div>
      </div>

      <AdminShop isAdmin={isAdmin} />

      <ItemModal
        item={selectedItem}
        balance={state.balance}
        busy={busy}
        message={message}
        onClose={() => { setSelectedItem(null); setMessage(null) }}
        onConfirm={confirmPurchase}
      />
    </main>
  )
}
