import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase, signUpWithEmail, signInWithEmail, signOutUser } from '../lib/supabase.js'

const AuthContext = createContext(null)

function welcomeKey(userId) { return `brams_welcome_seen_${userId}` }

function hasSeenWelcome(user) {
  if (!user) return true
  if (user.user_metadata?.first_login_completed) return true
  if (localStorage.getItem(welcomeKey(user.id))) return true
  return false
}

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null)
  const [session,     setSession]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)

  // Ref pour accéder à user dans dismissWelcome sans recréer le callback
  const userRef = useRef(null)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      userRef.current = data.session?.user ?? null
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      userRef.current = session?.user ?? null

      if (event === 'SIGNED_IN' && !hasSeenWelcome(session?.user)) {
        setShowWelcome(true)
      }
      if (event === 'SIGNED_OUT') { setUser(null); setSession(null); userRef.current = null }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Helper dev : window.resetWelcome() pour retester
  useEffect(() => {
    window.resetWelcome = () => {
      Object.keys(localStorage)
        .filter(k => k.startsWith('brams_welcome_seen_'))
        .forEach(k => localStorage.removeItem(k))
      console.log('[Brams] Flags welcome effacés — recharge la page pour retester.')
    }
    return () => { delete window.resetWelcome }
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { error } = await signInWithEmail(email, password)
    return { error }
  }, [])

  const signUp = useCallback(async (email, password, displayName) => {
    const { data, error } = await signUpWithEmail(email, password, displayName)
    return { data, error }
  }, [])

  const signOut = useCallback(async () => { await signOutUser() }, [])

  const dismissWelcome = useCallback(() => {
    const u = userRef.current
    if (u?.id) {
      localStorage.setItem(welcomeKey(u.id), 'true')
      // Persiste aussi dans user_metadata (survit aux vidages de localStorage)
      if (supabase) {
        supabase.auth.updateUser({ data: { first_login_completed: true } })
      }
    }
    setShowWelcome(false)
  }, [])

  const value = {
    user,
    session,
    loading,
    showWelcome,
    dismissWelcome,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    displayName: user?.user_metadata?.display_name
      || user?.email?.split('@')[0]
      || 'Pirate',
    avatarUrl: user?.user_metadata?.avatar_url ?? null,
    discordId: null,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
