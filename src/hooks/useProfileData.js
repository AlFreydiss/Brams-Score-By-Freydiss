// ── Orchestrateur de données de la page profil ──────────────────────────────
// Charge member + boutique + perso en parallèle, dérive rang/aura/succès/perms.
// Réutilise les fetchers existants — ne touche pas à la logique berries/Discord.
import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { fetchMemberProfile } from '../lib/supabase.js'
import { fetchBerryShopState } from '../lib/berryShop.js'
import { getProfileSettings } from '../lib/profile.js'
import { getUserPosts } from '../lib/feed.js'
import { getFollowState } from '../lib/social.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { isCreator, isStaff } from '../lib/roles.js'
import {
  getRank, getNextRank, computeAura, getAuraTier, ACHIEVEMENTS,
} from '../lib/profileTokens.js'

export function useProfileData(discordId) {
  const { discordId: myId, userId: myUserId, isAuthenticated } = useAuth()

  const [member,     setMember]     = useState(null)
  const [shopData,   setShopData]   = useState(null)
  const [settings,   setSettings]   = useState(null)
  const [postsCount, setPostsCount] = useState(null)
  const [followStats,setFollowStats]= useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const refreshTimer = useRef(null)

  const load = useCallback(() => {
    let ignore = false
    setLoading(true); setError(null)
    setMember(null); setShopData(null); setSettings(null); setPostsCount(null); setFollowStats(null)

    // member = source de vérité affichage (bloque le rendu principal)
    fetchMemberProfile(discordId)
      .then(p => { if (ignore) return; if (!p) setError('not_found'); setMember(p); setLoading(false) })
      .catch(() => { if (!ignore) { setError('error'); setLoading(false) } })

    // boutique + perso + posts en parallèle, sans bloquer l'affichage
    fetchBerryShopState(discordId).then(s => { if (!ignore) setShopData(s) }).catch(() => {})
    getProfileSettings(discordId).then(s => { if (!ignore) setSettings(s) }).catch(() => {})
    getUserPosts(discordId).then(p => { if (!ignore) setPostsCount(Array.isArray(p) ? p.length : 0) }).catch(() => {})
    getFollowState(discordId).then(f => { if (!ignore && f?.ok !== false) setFollowStats(f) }).catch(() => {})

    return () => { ignore = true }
  }, [discordId])

  useEffect(() => load(), [load])

  // Rafraîchit UNIQUEMENT l'état de suivi (sans recharger tout le profil) — pour
  // l'optimistic follow/unfollow depuis le header ou la modale.
  const refreshFollow = useCallback(() => {
    getFollowState(discordId).then(f => { if (f?.ok !== false) setFollowStats(f) }).catch(() => {})
  }, [discordId])

  useEffect(() => {
    const onFocus = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(load, 100)
    }
    const onVisible = () => {
      if (!document.hidden) onFocus()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    const t = setInterval(() => {
      if (!document.hidden) onFocus()
    }, 60000)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(t)
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [load])

  const hours    = Number.parseFloat(member?.vocal_h || 0)
  const rank     = getRank(hours)
  const nextRank = getNextRank(rank)
  const remaining = nextRank ? Math.max(0, nextRank.min - hours) : 0
  const pct = useMemo(() => {
    if (!nextRank) return 100
    return Math.min(100, Math.max(0, ((hours - rank.min) / (nextRank.min - rank.min)) * 100))
  }, [hours, rank, nextRank])

  // Solde : get_berry_balance peut renvoyer 0 si la résolution discord échoue →
  // on retombe sur la valeur du classement (résolue par uid). Logique conservée.
  const wallet = useMemo(() => {
    const memberB = parseInt(member?.berrys ?? 0, 10) || 0
    if (shopData && !shopData.preview) {
      const bal = parseInt(shopData.balance ?? 0, 10) || 0
      return bal > 0 ? bal : memberB
    }
    return memberB
  }, [member, shopData])

  const auraFactors = useMemo(() => computeAura(member, shopData, hours, rank), [member, shopData, hours, rank])
  const aura     = auraFactors.total
  const auraTier = getAuraTier(aura)

  const achievements = useMemo(() => {
    if (!member) return []
    return ACHIEVEMENTS.map(a => ({ ...a, unlocked: a.check(member, shopData, hours) }))
  }, [member, shopData, hours])

  const equippedBg = useMemo(() => {
    const eq = shopData?.inventory?.find(i => i?.equipped && i?.shop_items?.reward_type === 'opening_background')
    return eq?.item_id || null
  }, [shopData])

  const isOwnProfile    = String(myId) === String(discordId)
  const profileIsCreator = isCreator(discordId)
  const profileIsStaff   = isStaff(discordId)

  return {
    // état
    member, shopData, settings, setSettings, postsCount, followStats, setFollowStats, refreshFollow, loading, error, reload: load,
    // dérivés
    hours, rank, nextRank, remaining, pct, wallet,
    aura, auraTier, auraFactors, achievements, equippedBg,
    // identité / permissions
    isOwnProfile, isAuthenticated, myId, myUserId, profileIsCreator, profileIsStaff,
  }
}
