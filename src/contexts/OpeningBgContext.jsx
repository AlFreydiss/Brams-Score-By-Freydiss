import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getEquippedBgId, setEquippedBgId, getBgById } from '../data/opening-backgrounds.js'
import { equipShopItem } from '../lib/berryShop.js'
import { supabase } from '../lib/supabase.js'

const Ctx = createContext(null)

export function OpeningBgProvider({ children }) {
  const [equippedId, setEquippedIdState] = useState(() => getEquippedBgId())
  const [previewId,  setPreviewId]       = useState(null)
  const previewTimer = useRef(null)

  // Charger le fond équipé depuis Supabase au login
  useEffect(() => {
    if (!supabase) return
    let subscription
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!session) return
        try {
          const { data: inv } = await supabase.rpc('get_my_inventory')
          if (!Array.isArray(inv)) return
          const equipped = inv.find(item => item.reward_type === 'opening_background' && item.equipped)
          if (equipped) {
            setEquippedBgId(equipped.item_id)
            setEquippedIdState(equipped.item_id)
          }
        } catch { /* fallback localStorage */ }
      })
      subscription = data?.subscription
    } catch { /* supabase non initialisé */ }
    return () => { try { subscription?.unsubscribe() } catch {} }
  }, [])

  const equip = useCallback(async (id) => {
    // Mise à jour locale immédiate (UX instantanée)
    setEquippedBgId(id)
    setEquippedIdState(id)
    cancelPreview()
    // Persiste dans Supabase
    try { await equipShopItem(id) } catch { /* localStorage suffit en fallback */ }
  }, [])

  const unequip = useCallback(async () => {
    setEquippedBgId(null)
    setEquippedIdState(null)
    // Pas de RPC "unequip" séparé : on re-appelle equip sur le même item (toggle)
  }, [])

  const preview = useCallback((id, durationMs = 8000) => {
    clearTimeout(previewTimer.current)
    setPreviewId(id)
    previewTimer.current = setTimeout(() => setPreviewId(null), durationMs)
  }, [])

  const cancelPreview = useCallback(() => {
    clearTimeout(previewTimer.current)
    setPreviewId(null)
  }, [])

  useEffect(() => () => clearTimeout(previewTimer.current), [])

  const activeBg = getBgById(previewId || equippedId)

  return (
    <Ctx.Provider value={{ equippedId, previewId, activeBg, equip, unequip, preview, cancelPreview }}>
      {children}
    </Ctx.Provider>
  )
}

export function useOpeningBg() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useOpeningBg must be inside OpeningBgProvider')
  return ctx
}
