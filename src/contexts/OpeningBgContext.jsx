import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getEquippedBgId, setEquippedBgId, getBgById } from '../data/opening-backgrounds.js'
import { equipShopItem } from '../lib/berryShop.js'
import { supabase } from '../lib/supabase.js'

const Ctx = createContext(null)

export function OpeningBgProvider({ children }) {
  const [equippedId, setEquippedIdState] = useState(() => getEquippedBgId())
  const [previewId,  setPreviewId]       = useState(null)
  // override : fond imposé par la vue courante (ex. profil d'un autre membre).
  // undefined = pas d'override (on retombe sur le fond équipé du visiteur),
  // null = forcer AUCUN fond, string = forcer ce fond précis.
  const [overrideId, setOverrideIdState] = useState(undefined)
  // ambientStill : quand true, le fond GLOBAL n'anime plus la vidéo et affiche une
  // image figée (la page profil l'active car son hero joue déjà la vidéo → évite
  // un double décodage du même mp4).
  // Par défaut le fond global est figé (perf : pas de décodage vidéo plein écran
  // sur chaque page). Le profil l'active en mode animé (setAmbientStill(false)).
  const [ambientStill, setAmbientStill] = useState(true)
  // hideAmbient : le profil masque le fond global et rend le sien (fiable).
  const [hideAmbient, setHideAmbient] = useState(false)
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

  // setOverride(id) : id string = imposer ce fond, null = forcer aucun fond.
  // clearOverride() : revenir au fond équipé du visiteur.
  const setOverride   = useCallback((id) => setOverrideIdState(id), [])
  const clearOverride = useCallback(() => setOverrideIdState(undefined), [])

  useEffect(() => () => clearTimeout(previewTimer.current), [])

  // Précédence : preview (survol boutique) > override (vue courante) > fond équipé.
  const effectiveId = previewId || (overrideId !== undefined ? overrideId : equippedId)
  const activeBg = getBgById(effectiveId)

  return (
    <Ctx.Provider value={{ equippedId, previewId, activeBg, equip, unequip, preview, cancelPreview, setOverride, clearOverride, ambientStill, setAmbientStill, hideAmbient, setHideAmbient }}>
      {children}
    </Ctx.Provider>
  )
}

export function useOpeningBg() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useOpeningBg must be inside OpeningBgProvider')
  return ctx
}
