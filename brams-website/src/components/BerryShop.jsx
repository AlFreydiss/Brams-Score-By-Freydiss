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

const emptyItem = {
  name: '',
  description: '',
  category: 'Cosmetique',
  price: 100,
  rarity: 'Commun',
  stock: '',
  limited: false,
  active: true,
  reward_type: 'badge',
  reward_data: {},
}

function formatBerry(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0))
}

function openAuth() {
  document.dispatchEvent(new CustomEvent('open-auth-modal'))
}

function RarityBadge({ rarity }) {
  const style = RARITY_STYLES[rarity] || RARITY_STYLES.Commun
  return <span className="berry-rarity" style={{ '--rarity': style.color }}>{style.label}</span>
}

function ItemModal({ item, balance, busy, message, onClose, onConfirm }) {
  if (!item) return null
  const canBuy = balance >= Number(item.price)

  return (
    <AnimatePresence>
      <motion.div className="berry-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="berry-modal" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.98 }} onClick={(event) => event.stopPropagation()}>
          <div className="berry-modal-top">
            <RarityBadge rarity={item.rarity} />
            <button type="button" onClick={onClose}>Fermer</button>
          </div>
          <h2>{item.name}</h2>
          <p>{item.description}</p>
          <div className="berry-modal-grid">
            <div><span>Prix serveur</span><strong>{formatBerry(item.price)} berries</strong></div>
            <div><span>Solde actuel</span><strong>{formatBerry(balance)} berries</strong></div>
            <div><span>Type recompense</span><strong>{item.reward_type}</strong></div>
            <div><span>Stock</span><strong>{item.stock ?? 'Illimite'}</strong></div>
          </div>
          {message && <div className={message.type === 'error' ? 'berry-message error' : 'berry-message'}>{message.text}</div>}
          {!canBuy && (
            <div className="berry-message error">
              Solde insuffisant. Gagne des berries en etant actif sur le Discord Brams Community.
            </div>
          )}
          <button className="berry-confirm" type="button" disabled={!canBuy || busy} onClick={() => onConfirm(item)}>
            {busy ? 'Verification serveur...' : 'Confirmer achat securise'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function AdminShop({ isAdmin }) {
  const [adminData, setAdminData] = useState({ items: [], transactions: [] })
  const [form, setForm] = useState(emptyItem)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (isAdmin) fetchAdminShopData().then(setAdminData)
  }, [isAdmin])

  async function saveItem(event) {
    event.preventDefault()
    const payload = {
      ...form,
      price: Number(form.price),
      stock: form.stock === '' ? null : Number(form.stock),
      reward_data: typeof form.reward_data === 'string' ? JSON.parse(form.reward_data || '{}') : form.reward_data,
    }
    const { error } = await upsertShopItem(payload)
    setStatus(error ? error.message : 'Item sauvegarde.')
    if (!error) {
      setForm(emptyItem)
      fetchAdminShopData().then(setAdminData)
    }
  }

  if (!isAdmin) {
    return (
      <section className="berry-admin locked">
        <span>ADMIN SHOP</span>
        <h2>Gestion protegee</h2>
        <p>Seuls les profils admin peuvent creer des items, modifier les prix, gerer les stocks et auditer les transactions.</p>
      </section>
    )
  }

  return (
    <section className="berry-admin">
      <div className="berry-section-head">
        <span>ADMIN SHOP</span>
        <h2>Pilotage boutique</h2>
      </div>
      <form onSubmit={saveItem} className="berry-admin-form">
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nom item" required />
        <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" required />
        <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
          {SHOP_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
        </select>
        <select value={form.rarity} onChange={(event) => setForm({ ...form, rarity: event.target.value })}>
          {Object.keys(RARITY_STYLES).map((rarity) => <option key={rarity}>{rarity}</option>)}
        </select>
        <input type="number" min="1" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="Prix" required />
        <input type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} placeholder="Stock vide = illimite" />
        <input value={form.reward_type} onChange={(event) => setForm({ ...form, reward_type: event.target.value })} placeholder="reward_type" />
        <textarea value={JSON.stringify(form.reward_data)} onChange={(event) => setForm({ ...form, reward_data: event.target.value })} placeholder='{"roleId":"..."}' />
        <label><input type="checkbox" checked={form.limited} onChange={(event) => setForm({ ...form, limited: event.target.checked })} /> Vente limitee</label>
        <label><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Actif</label>
        <button type="submit">Sauvegarder item</button>
      </form>
      {status && <div className="berry-message">{status}</div>}
      <div className="berry-admin-table">
        {adminData.transactions.map((tx) => (
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

export default function BerryShop() {
  const { isAuthenticated, discordId, displayName, avatarUrl, user } = useAuth()
  const [state, setState] = useState({ balance: 0, items: [], inventory: [], transactions: [], preview: false })
  const [category, setCategory] = useState('Tous')
  const [selectedItem, setSelectedItem] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const isAdmin = user?.user_metadata?.role === 'admin' || user?.app_metadata?.role === 'admin'

  useEffect(() => {
    if (isAuthenticated) fetchBerryShopState(discordId).then(setState)
  }, [isAuthenticated, discordId])

  const filteredItems = useMemo(() => {
    if (category === 'Tous') return state.items
    return state.items.filter((item) => item.category === category)
  }, [category, state.items])

  async function confirmPurchase(item) {
    setBusy(true)
    setMessage(null)
    const { data, error } = await purchaseShopItem(item.id)
    if (error) {
      setMessage({ type: 'error', text: error.message })
      setBusy(false)
      return
    }
    if (data?.ok === false) {
      setMessage({ type: 'error', text: data.error || 'Achat refuse par le serveur.' })
      setState((current) => ({ ...current, balance: Number(data.balance ?? current.balance) }))
      setBusy(false)
      return
    }
    setMessage({ type: 'success', text: 'Achat valide. Recompense ajoutee.' })
    setState((current) => ({ ...current, balance: Number(data?.balance ?? current.balance - item.price) }))
    fetchBerryShopState(discordId).then(setState)
    setBusy(false)
  }

  if (!isAuthenticated) {
    return (
      <main className="berry-shop-page">
        <section className="berry-hero">
          <span>BERRY SHOP / DISCORD LINK</span>
          <h1>Ta monnaie Discord devient utile sur le site.</h1>
          <p>Connecte-toi avec Discord pour utiliser ton vrai solde Berry du serveur Brams Community.</p>
          <button type="button" onClick={openAuth}>Connexion Discord</button>
        </section>
      </main>
    )
  }

  return (
    <main className="berry-shop-page">
      <section className="berry-hero">
        <div>
          <span>BERRY SHOP / LIVE BALANCE</span>
          <h1>Berry Shop</h1>
          <p>Achats atomiques, prix verrouilles serveur, inventaire profil et recompenses Discord.</p>
        </div>
        <div className="berry-wallet">
          <img src={avatarUrl || '/vite.svg'} alt="" />
          <div>
            <span>{displayName}</span>
            <strong>{formatBerry(state.balance)} berries</strong>
            {state.preview && <em>Mode preview: schema Supabase non applique</em>}
          </div>
        </div>
      </section>

      <nav className="berry-categories">
        {['Tous', ...SHOP_CATEGORIES].map((item) => (
          <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>
        ))}
      </nav>

      <section className="berry-grid">
        {filteredItems.map((item) => (
          <button key={item.id} className="berry-card" style={{ '--rarity': (RARITY_STYLES[item.rarity] || RARITY_STYLES.Commun).color }} onClick={() => setSelectedItem(item)}>
            <div className="berry-card-glow" />
            <div className="berry-card-top">
              <RarityBadge rarity={item.rarity} />
              {item.limited && <span className="berry-limited">Limite</span>}
            </div>
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <div className="berry-card-foot">
              <strong>{formatBerry(item.price)} berries</strong>
              <span>{item.stock ?? '∞'} stock</span>
            </div>
          </button>
        ))}
      </section>

      <section className="berry-lower">
        <div>
          <div className="berry-section-head"><span>INVENTAIRE</span><h2>Objets possedes</h2></div>
          <div className="berry-list">
            {state.inventory.length ? state.inventory.map((entry) => (
              <div key={entry.id}><strong>{entry.shop_items?.name || entry.item_id}</strong><span>x{entry.quantity} {entry.equipped ? '/ equipe' : ''}</span></div>
            )) : <p>Aucun item pour le moment.</p>}
          </div>
        </div>
        <div>
          <div className="berry-section-head"><span>HISTORIQUE</span><h2>Transactions</h2></div>
          <div className="berry-list">
            {state.transactions.length ? state.transactions.map((tx) => (
              <div key={tx.id}><strong>{tx.shop_items?.name || tx.item_id}</strong><span>{formatBerry(tx.price)} / {tx.status}</span></div>
            )) : <p>Aucun achat enregistre.</p>}
          </div>
        </div>
      </section>

      <AdminShop isAdmin={isAdmin} />
      <ItemModal item={selectedItem} balance={state.balance} busy={busy} message={message} onClose={() => { setSelectedItem(null); setMessage(null) }} onConfirm={confirmPurchase} />
    </main>
  )
}
