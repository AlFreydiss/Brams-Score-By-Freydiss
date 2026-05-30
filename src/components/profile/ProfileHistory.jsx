// ── Onglet « Historique » : transactions boutique ───────────────────────────
import { RARITY_STYLES } from '../../lib/berryShop.js'
import { fmtNum, timeAgo } from '../../lib/profileTokens.js'
import { EmptyState } from './shared.jsx'

export default function ProfileHistory({ data }) {
  const transactions = data.shopData?.transactions || []
  if (!transactions.length) {
    return <div className="pfx-tabpanel"><EmptyState icon="📜" title="Aucune transaction." sub="L'historique d'achats boutique est vide." /></div>
  }
  return (
    <div className="pfx-tabpanel">
      <div className="pfx-tx-list">
        {transactions.map((tx, i) => {
          const shopItem = tx?.shop_items || {}
          const style = RARITY_STYLES[shopItem.rarity] || RARITY_STYLES.Commun
          return (
            <div key={`${tx.id || 'tx'}-${i}`} className="pfx-tx" style={{ '--ac': style.color }}>
              <div className="pfx-tx-ic">฿</div>
              <div className="pfx-tx-info">
                <strong>{shopItem.name || 'Achat boutique'}</strong>
                <span>{timeAgo(tx?.created_at)}</span>
              </div>
              <span className="pfx-tx-amt">-{fmtNum(tx?.amount || 0)} ฿</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
