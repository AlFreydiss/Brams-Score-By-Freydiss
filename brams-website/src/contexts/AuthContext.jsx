import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, signInWithDiscord, signOutUser } from '../lib/supabase.js'

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
      if (event === 'SIGNED_IN') {
        setShowWelcome(true)
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn  = useCallback(() => signInWithDiscord(), [])
  const signOut = useCallback(async () => { await signOutUser() }, [])
  const dismissWelcome = useCallback(() => setShowWelcome(false), [])

  const value = {
    user,
    session,
    loading,
    showWelcome,
    dismissWelcome,
    signIn,
    signOut,
    isAuthenticated: !!user,
    displayName: user?.user_metadata?.full_name
      || user?.user_metadata?.name
      || user?.user_metadata?.global_name
      || user?.email?.split('@')[0]
      || 'Pirate',
    avatarUrl: user?.user_metadata?.avatar_url ?? null,
    discordId: user?.user_metadata?.provider_id ?? null,
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
