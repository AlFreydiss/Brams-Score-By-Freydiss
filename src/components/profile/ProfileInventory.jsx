// ── Onglet « Inventaire » : objets boutique classés par catégorie ─────────────
// Fonds / Curseurs / Traînées + filtre rareté. La data vient de la RPC publique
// get_member_inventory (visible sur le profil de n'importe qui).
import { useMemo, useState } from 'react'
import { RARITY_STYLES } from '../../lib/berryShop.js'
import { timeAgo } from '../../lib/profileTokens.js'
import { EmptyState } from './shared.jsx'

// La base mélange les casses (EPIQUE / Epique) → on normalise pour RARITY_STYLES
const normRarity = (r) => {
  const s = String(r || 'Commun').toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const CAT_ICONS = { Fonds: '🎬', Curseurs: '🖱️', 'Traînées': '✨' }

export default function ProfileInventory({ data }) {
  const [filter, setFilter] = useState('Tous')
  const [cat, setCat] = useState('Tous')
  const inventory = data.shopData?.inventory || []

  const rarOf = (i) => normRarity(i?.shop_items?.rarity || i?.rarity)
  const catOf = (i) => i?.shop_items?.category || i?.category || 'Autres'

  const cats = useMemo(() => [...new Set(inventory.map(catOf))], [inventory])
  const rarities = useMemo(() => [...new Set(inventory.map(rarOf))], [inventory])
  const filtered = useMemo(
    () => inventory
      .filter(i => cat === 'Tous' || catOf(i) === cat)
      .filter(i => filter === 'Tous' || rarOf(i) === filter),
    [inventory, filter, cat],
  )

  if (!inventory.length) {
    return <div className="pfx-tabpanel"><EmptyState icon="🗃" title="Le coffre est encore vide." sub="Gagne des berries et débloque tes premiers trésors." /></div>
  }

  return (
    <div className="pfx-tabpanel">
      {/* Catégories */}
      <div className="pfx-inv-filters">
        {['Tous', ...cats].map(c => (
          <button key={c} type="button" className={`pfx-filter${cat === c ? ' active' : ''}`} onClick={() => setCat(c)}>
            {c === 'Tous' ? `Tous (${inventory.length})` : `${CAT_ICONS[c] || '🗃'} ${c} (${inventory.filter(i => catOf(i) === c).length})`}
          </button>
        ))}
      </div>
      {/* Raretés */}
      <div className="pfx-inv-filters" style={{ marginTop: 6 }}>
        {['Tous', ...rarities].map(r => (
          <button key={r} type="button" className={`pfx-filter${filter === r ? ' active' : ''}`} onClick={() => setFilter(r)}>{r}</button>
        ))}
      </div>
      <div className="pfx-item-grid">
        {filtered.map((item, i) => {
          const shopItem = item?.shop_items || item || {}
          const style = RARITY_STYLES[normRarity(shopItem.rarity)] || RARITY_STYLES[shopItem.rarity] || RARITY_STYLES.Commun
          const emoji = shopItem?.reward_data?.emoji || item?.reward_data?.emoji
          return (
            <article key={`${item.item_id || 'item'}-${i}`} className="pfx-item" style={{ '--ac': style.color }}>
              {item?.equipped && <span className="pfx-item-eq">Équipé</span>}
              <div className="pfx-item-top">
                <span className="pfx-item-cat">{emoji || (CAT_ICONS[catOf(item)] || (shopItem.category || 'CO').slice(0, 2).toUpperCase())}</span>
                <em className="pfx-item-rarity">{style.label || normRarity(shopItem.rarity)}</em>
              </div>
              <span className="pfx-item-name">{shopItem.name || 'Objet inconnu'}</span>
              {item?.acquired_at && <small className="pfx-item-date">Obtenu {timeAgo(item.acquired_at)}</small>}
            </article>
          )
        })}
      </div>
    </div>
  )
}
