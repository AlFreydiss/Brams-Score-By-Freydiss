import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase, signUpWithEmail, signInWithEmail, signOutUser, signInWithDiscord as discordOAuth, fetchMemberProfile } from '../lib/supabase.js'

const AuthContext = createContext(null)

function welcomeKey(userId) { return `brams_welcome_seen_${userId}` }

function hasSeenWelcome(user) {
  if (!user) return true
  if (user.user_metadata?.first_login_completed) return true
  if (localStorage.getItem(welcomeKey(user.id))) return true
  return false
}

function getDiscordIdentity(user) {
  return user?.identities?.find(identity => identity.provider === 'discord') || null
}

function resolveDiscordId(user) {
  const discordIdentity = getDiscordIdentity(user)
  return user?.user_metadata?.provider_id
    ?? user?.user_metadata?.custom_claims?.provider_id
    ?? discordIdentity?.identity_data?.provider_id
    ?? discordIdentity?.identity_data?.sub
    ?? discordIdentity?.id
    ?? user?.user_metadata?.sub
    ?? null
}

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null)
  const [session,     setSession]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)
  const [memberProfile, setMemberProfile] = useState(null)

  const userRef = useRef(null)

  useEffect(() => {
    if (!supabase) {
      console.warn('[auth] supabase NULL — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants ?')
      setLoading(false)
      return
    }

    let mounted = true

    const init = async () => {
      const search = window.location.search
      const hash   = window.location.hash
      console.log('[auth] init — search:', search.slice(0, 80) || '(vide)', '| hash:', hash.slice(0, 80) || '(vide)')

      // Code PKCE détecté dans l'URL → échange séquentiel (await obligatoire)
      const params = new URLSearchParams(search)
      const authError = params.get('error_description') || params.get('error')
      if (authError) {
        console.error('[auth] OAuth retour erreur:', authError)
        if (mounted) {
          localStorage.setItem('brams_auth_error', authError)
          window.history.replaceState({}, document.title, window.location.pathname)
        }
      }

      const code = params.get('code')
      if (code) {
        console.log('[auth] code PKCE trouvé, échange en cours...')
        try {
          const { data: exData, error: exErr } = await supabase.auth.exchangeCodeForSession(window.location.href)
          if (exErr) {
            console.error('[auth] échange PKCE erreur:', exErr.message, '| status:', exErr.status, '| full:', JSON.stringify(exErr))
          } else {
            console.log('[auth] échange PKCE OK — user:', exData?.session?.user?.id)
          }
        } catch (e) {
          console.error('[auth] échange PKCE exception:', e)
        }
        if (mounted) window.history.replaceState({}, document.title, window.location.pathname)
      }

      // Lecture session APRÈS échange (ou directement si pas de code)
      const { data, error } = await supabase.auth.getSession()
      if (error) console.error('[auth] getSession erreur:', error.message)
      console.log('[auth] getSession →', data?.session?.user?.id ?? 'null')

      if (!mounted) return
      setSession(data.session ?? null)
      setUser(data.session?.user ?? null)
      userRef.current = data.session?.user ?? null
      setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      console.log('[auth] onAuthStateChange:', event, '| user:', sess?.user?.id ?? 'null')
      if (!mounted) return
      setSession(sess ?? null)
      setUser(sess?.user ?? null)
      userRef.current = sess?.user ?? null

      if (event === 'SIGNED_IN' && !hasSeenWelcome(sess?.user)) {
        setShowWelcome(true)
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
        userRef.current = null
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Helper dev : window.resetWelcome()
  useEffect(() => {
    window.resetWelcome = () => {
      Object.keys(localStorage)
        .filter(k => k.startsWith('brams_welcome_seen_'))
        .forEach(k => localStorage.removeItem(k))
      console.log('[Brams] Flags welcome effacés — recharge la page pour retester.')
    }
    return () => { delete window.resetWelcome }
  }, [])

  const signInWithDiscord = useCallback(async () => {
    const { error } = await discordOAuth()
    return { error }
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

  const discordId = resolveDiscordId(user)

  useEffect(() => {
    let active = true
    if (!discordId) {
      setMemberProfile(null)
      return
    }
    fetchMemberProfile(discordId).then(profile => {
      if (active) setMemberProfile(profile)
    })
    return () => { active = false }
  }, [discordId])

  const dismissWelcome = useCallback(() => {
    const u = userRef.current
    if (u?.id) {
      localStorage.setItem(welcomeKey(u.id), 'true')
      if (supabase) supabase.auth.updateUser({ data: { first_login_completed: true } })
    }
    setShowWelcome(false)
  }, [])

  const value = {
    user,
    session,
    loading,
    showWelcome,
    dismissWelcome,
    signInWithDiscord,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    displayName: memberProfile?.username
      || user?.user_metadata?.full_name
      || user?.user_metadata?.display_name
      || user?.user_metadata?.name
      || user?.user_metadata?.global_name
      || user?.user_metadata?.custom_claims?.global_name
      || user?.email?.split('@')[0]
      || 'Pirate',
    avatarUrl: memberProfile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null,
    discordId,
    memberProfile,
    berryCount: memberProfile?.berrys ?? null,
    userId: user?.id ?? null,
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
