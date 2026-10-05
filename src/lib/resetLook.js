import { equipShopItem, fetchMyInventory } from './berryShop.js'

// Remet le curseur et la traînée du site par défaut.
// equip_shop_item est un interrupteur : on le rappelle sur chaque article
// cosmétique encore équipé pour le retirer côté serveur, puis on vide le
// localStorage et on prévient les calques globaux (GlobalCursorLayer / GlobalTrailLayer).

const LOOK_TYPES = new Set(['cursor', 'cursor_trail'])
export const SHOP_REFRESH_EVENT = 'brams-shop-refresh'

export function clearLocalLook() {
  try {
    localStorage.removeItem('brams_cursor')
    localStorage.removeItem('brams_trail')
  } catch {}
  window.dispatchEvent(new Event('brams-cursor-change'))
  window.dispatchEvent(new Event('brams-trail-change'))
}

export async function resetLook({ signedIn }) {
  let failed = 0
  if (signedIn) {
    const inv = await fetchMyInventory().catch(() => [])
    const equipped = (Array.isArray(inv) ? inv : []).filter(i => LOOK_TYPES.has(i.reward_type) && i.equipped)
    for (const item of equipped) {
      const { data, error } = await equipShopItem(item.item_id)
      if (error || data?.equipped !== false) failed++
    }
  }
  clearLocalLook()
  window.dispatchEvent(new Event(SHOP_REFRESH_EVENT))
  return { failed }
}

export function hasLocalLook() {
  try { return !!(localStorage.getItem('brams_cursor') || localStorage.getItem('brams_trail')) } catch { return false }
}
