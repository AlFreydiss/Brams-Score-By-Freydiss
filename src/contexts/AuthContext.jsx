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

    const applySession = (nextSession, { clear = false } = {}) => {
      if (!mounted) return
      if (nextSession?.user) {
        setSession(nextSession)
        setUser(nextSession.user)
        userRef.current = nextSession.user
        return
      }
      if (clear) {
        setSession(null)
        setUser(null)
        userRef.current = null
      }
    }

    const authTimeout = (message, ms = 5000) =>
      new Promise(resolve => setTimeout(() => resolve({ data: { session: null }, error: { message } }), ms))

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

      // PKCE : on echange le code Discord avant de nettoyer l'URL.
      const code = params.get('code')
      let exchangedSession = null
      if (code) {
        try {
          const { data, error } = await Promise.race([
            supabase.auth.exchangeCodeForSession(code),
            authTimeout('exchangeCodeForSession timeout (7s)', 7000),
          ])
          if (error) console.warn('[auth] exchangeCodeForSession:', error.message)
          exchangedSession = data?.session ?? null
          if (exchangedSession) applySession(exchangedSession)
        } catch (e) {
          console.error('[auth] exchangeCodeForSession throw:', e?.message || e)
        } finally {
          if (mounted) {
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        }
      }

      // Lecture session APRÈS échange (ou directement si pas de code).
      // ⚠️ getSession() peut non seulement throw mais surtout HANGER (refresh de
      // token réseau coincé, client Supabase bloqué) : le `await` ne finit jamais →
      // `finally` jamais atteint → `loading` reste true POUR TOUJOURS → rien ne
      // charge nulle part (profil, Fil, boutique…) → "faut actualiser sur tout le
      // site". On le borne donc à 5s. Si la vraie session arrive plus tard,
      // onAuthStateChange (ci-dessous) la propage → l'UI se répare seule, sans F5.
      try {
        const { data, error } = exchangedSession
          ? { data: { session: exchangedSession }, error: null }
          : await Promise.race([
              supabase.auth.getSession(),
              authTimeout('getSession timeout (5s)'),
            ])
        if (error) console.warn('[auth] getSession:', error.message)
        console.log('[auth] getSession →', data?.session?.user?.id ?? 'null')
        const timedOut = error?.message?.includes('timeout')
        applySession(data?.session ?? null, { clear: !timedOut })
      } catch (e) {
        console.error('[auth] getSession throw:', e?.message || e)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      console.log('[auth] onAuthStateChange:', event, '| user:', sess?.user?.id ?? 'null')
      if (!mounted) return

      if (event === 'SIGNED_IN' && !hasSeenWelcome(sess?.user)) {
        setShowWelcome(true)
      }
      if (event === 'SIGNED_OUT') {
        applySession(null, { clear: true })
        return
      }
      applySession(sess)
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

  const signOut = useCallback(async () => {
    await signOutUser()
    setUser(null); setSession(null); userRef.current = null
    // Rechargement propre vers l'accueil : garantit un état déconnecté net,
    // peu importe les éventuels soucis de propagation d'état React.
    window.location.assign('/')
  }, [])

  const discordId = resolveDiscordId(user)
  const discordIdentity = getDiscordIdentity(user)
  const identityData = discordIdentity?.identity_data || {}

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
    displayName: memberProfile?.display_name
      || memberProfile?.global_name
      || user?.user_metadata?.global_name
      || user?.user_metadata?.custom_claims?.global_name
      || identityData?.global_name
      || user?.user_metadata?.full_name
      || identityData?.full_name
      || user?.user_metadata?.display_name
      || identityData?.display_name
      || user?.user_metadata?.name
      || identityData?.name
      || memberProfile?.username
      || user?.email?.split('@')[0]
      || 'Pirate',
    avatarUrl: memberProfile?.avatar_url || user?.user_metadata?.avatar_url || identityData?.avatar_url || user?.user_metadata?.picture || identityData?.picture || null,
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
