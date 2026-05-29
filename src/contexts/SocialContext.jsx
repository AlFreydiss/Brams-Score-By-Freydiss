import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext.jsx'
import { unreadCounts, subscribeToNotifications } from '../lib/social.js'
import { supabase } from '../lib/supabase.js'

const Ctx = createContext(null)

const ZERO = { messages: 0, friend_requests: 0, notifications: 0 }

export function SocialProvider({ children }) {
  const { discordId, isAuthenticated } = useAuth()
  const [counts, setCounts] = useState(ZERO)
  const [toast, setToast]   = useState(null)
  const [onlineIds, setOnlineIds] = useState(() => new Set())
  const toastTimer = useRef(null)

  // Présence en ligne : un seul canal global, chacun "track" sa présence.
  useEffect(() => {
    if (!supabase || !discordId) { setOnlineIds(new Set()); return }
    const channel = supabase.channel('presence:lobby', { config: { presence: { key: String(discordId) } } })
    channel
      .on('presence', { event: 'sync' }, () => setOnlineIds(new Set(Object.keys(channel.presenceState()))))
      .subscribe(async (status) => { if (status === 'SUBSCRIBED') { try { await channel.track({ at: Date.now() }) } catch {} } })
    return () => { try { supabase.removeChannel(channel) } catch {} }
  }, [discordId])
  const isOnline = useCallback((id) => onlineIds.has(String(id)), [onlineIds])

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
    <Ctx.Provider value={{ counts, refreshCounts, toast, dismissToast: () => setToast(null), onlineIds, isOnline }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSocial() {
  const ctx = useContext(Ctx)
  if (!ctx) return { counts: ZERO, refreshCounts: () => {}, toast: null, dismissToast: () => {}, onlineIds: new Set(), isOnline: () => false }
  return ctx
}
