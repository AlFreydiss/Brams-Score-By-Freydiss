// Panier boutique — multi-articles, promo "1 offert sur 2" (BOGO) en aperçu côté
// client (le total réel est revalidé serveur au checkout). Persistant en localStorage.
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

const CartContext = createContext(null)
const KEY = 'brams_cart'

// Item : { id, label, emoji, priceCents, rarity }
export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
  })
  const [open, setOpen] = useState(false)

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(items)) } catch {} }, [items])

  const add = useCallback((item) => {
    setItems(prev => prev.some(i => i.id === item.id) ? prev : [...prev, item])
    setOpen(true)
  }, [])
  const remove = useCallback((id) => setItems(prev => prev.filter(i => i.id !== id)), [])
  const clear = useCallback(() => setItems([]), [])
  const has = useCallback((id) => items.some(i => i.id === id), [items])

  // Aperçu promo : trié par prix décroissant, 1 article sur 2 (le moins cher de
  // chaque paire) est offert. Identique au calcul serveur (cartPricing).
  const pricing = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.priceCents - a.priceCents)
    const freeIds = new Set()
    for (let i = 1; i < sorted.length; i += 2) freeIds.add(sorted[i].id)
    const subtotal = items.reduce((s, i) => s + i.priceCents, 0)
    const total = sorted.reduce((s, i) => s + (freeIds.has(i.id) ? 0 : i.priceCents), 0)
    return { freeIds, subtotal, total, saved: subtotal - total }
  }, [items])

  const value = useMemo(() => ({ items, add, remove, clear, has, open, setOpen, pricing }), [items, add, remove, clear, has, open, pricing])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) return { items: [], add: () => {}, remove: () => {}, clear: () => {}, has: () => false, open: false, setOpen: () => {}, pricing: { freeIds: new Set(), subtotal: 0, total: 0, saved: 0 } }
  return ctx
}
