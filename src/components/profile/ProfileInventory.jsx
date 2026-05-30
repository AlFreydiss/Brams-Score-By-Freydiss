// ── Onglet « Inventaire » : objets boutique + filtre par rareté ──────────────
import { useMemo, useState } from 'react'
import { RARITY_STYLES } from '../../lib/berryShop.js'
import { timeAgo } from '../../lib/profileTokens.js'
import { EmptyState } from './shared.jsx'

export default function ProfileInventory({ data }) {
  const [filter, setFilter] = useState('Tous')
  const inventory = data.shopData?.inventory || []

  const rarities = useMemo(
    () => [...new Set(inventory.map(i => i?.shop_items?.rarity || 'Commun'))],
    [inventory],
  )
  const filtered = useMemo(
    () => filter === 'Tous' ? inventory : inventory.filter(i => (i?.shop_items?.rarity || 'Commun') === filter),
    [inventory, filter],
  )

  if (!inventory.length) {
    return <div className="pfx-tabpanel"><EmptyState icon="🗃" title="Le coffre est encore vide." sub="Gagne des berries et débloque tes premiers trésors." /></div>
  }

  return (
    <div className="pfx-tabpanel">
      <div className="pfx-inv-filters">
        {['Tous', ...rarities].map(r => (
          <button key={r} type="button" className={`pfx-filter${filter === r ? ' active' : ''}`} onClick={() => setFilter(r)}>{r}</button>
        ))}
      </div>
      <div className="pfx-item-grid">
        {filtered.map((item, i) => {
          const shopItem = item?.shop_items || item || {}
          const style = RARITY_STYLES[shopItem.rarity] || RARITY_STYLES.Commun
          return (
            <article key={`${item.item_id || 'item'}-${i}`} className="pfx-item" style={{ '--ac': style.color }}>
              {item?.equipped && <span className="pfx-item-eq">Équipé</span>}
              <div className="pfx-item-top">
                <span className="pfx-item-cat">{(shopItem.category || 'CO').slice(0, 2).toUpperCase()}</span>
                <em className="pfx-item-rarity">{style.label}</em>
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
