import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext.jsx'
import { unreadCounts, subscribeToNotifications } from '../lib/social.js'

const Ctx = createContext(null)

const ZERO = { messages: 0, friend_requests: 0, notifications: 0 }

export function SocialProvider({ children }) {
  const { discordId, isAuthenticated } = useAuth()
  const [counts, setCounts] = useState(ZERO)
  const [toast, setToast]   = useState(null)
  const toastTimer = useRef(null)

  const refreshCounts = useCallback(async () => {
    if (!isAuthenticated) { setCounts(ZERO); return }
    const c = await unreadCounts()
    setCounts(c)
  }, [isAuthenticated])

  // Polling de secours (30s) + refresh au focus — Realtime gère l'instantané.
  useEffect(() => {
    if (!isAuthenticated) { setCounts(ZERO); return }
    refreshCounts()
    const interval = setInterval(refreshCounts, 30000)
    const onFocus = () => refreshCounts()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus) }
  }, [isAuthenticated, refreshCounts])

  // Realtime : nouvelle notification → toast discret + maj compteurs
  useEffect(() => {
    if (!discordId) return
    const unsub = subscribeToNotifications(discordId, (notif) => {
      refreshCounts()
      showToast(notif)
    })
    return unsub
  }, [discordId, refreshCounts])

  const showToast = useCallback((notif) => {
    setToast(notif)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }, [])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  return (
    <Ctx.Provider value={{ counts, refreshCounts, toast, dismissToast: () => setToast(null) }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSocial() {
  const ctx = useContext(Ctx)
  if (!ctx) return { counts: ZERO, refreshCounts: () => {}, toast: null, dismissToast: () => {} }
  return ctx
}
