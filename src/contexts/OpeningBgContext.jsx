import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getEquippedBgId, setEquippedBgId, getBgById } from '../data/opening-backgrounds.js'

const Ctx = createContext(null)

export function OpeningBgProvider({ children }) {
  const [equippedId, setEquippedIdState] = useState(() => getEquippedBgId())
  const [previewId,  setPreviewId]       = useState(null)
  const previewTimer = useRef(null)

  const equip = useCallback((id) => {
    setEquippedBgId(id)
    setEquippedIdState(id)
    cancelPreview()
  }, [])

  const unequip = useCallback(() => {
    setEquippedBgId(null)
    setEquippedIdState(null)
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
