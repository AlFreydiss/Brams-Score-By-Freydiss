import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, signUpWithEmail, signInWithEmail, signOutUser } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null)
  const [session,     setSession]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (event === 'SIGNED_IN') setShowWelcome(true)
      if (event === 'SIGNED_OUT') { setUser(null); setSession(null) }
    })

    return () => subscription.unsubscribe()
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
  const dismissWelcome = useCallback(() => setShowWelcome(false), [])

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
