// ── Barre d'actions du header profil (mode "mon profil" vs "autre profil") ───
// Réutilise la logique social existante (follow/unfollow/getOrCreateDm/relation).
// Follow en optimistic : on met à jour followStats via setFollowStats puis on
// confirme avec refreshFollow ; rollback si le RPC échoue.
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useSocial } from '../../contexts/SocialContext.jsx'
import { followUser, unfollowUser, getOrCreateDm, getRelationship } from '../../lib/social.js'

export default function ProfileActions({ data, onShare, copied, onEdit }) {
  const { member, isOwnProfile, isAuthenticated, followStats, setFollowStats, refreshFollow } = data
  const targetId = member?.uid
  const navigate = useNavigate()
  const { signInWithDiscord } = useAuth()
  const { refreshCounts } = useSocial()

  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState(null)
  const [menu, setMenu]   = useState(false)
  const [rel, setRel]     = useState(null)
  const menuRef = useRef(null)
  const lockRef = useRef(false) // verrou synchrone anti double-clic (busy state insuffisant)

  // Relation (pour le label "Ami"). Léger : 1 appel, seulement sur un autre profil.
  useEffect(() => {
    if (isOwnProfile || !isAuthenticated || !targetId) { setRel(null); return }
    let alive = true
    getRelationship(targetId).then(r => { if (alive) setRel(r) })
    return () => { alive = false }
  }, [isOwnProfile, isAuthenticated, targetId])

  // Fermer le menu au clic extérieur.
  useEffect(() => {
    if (!menu) return
    const onDoc = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menu])

  const following = !!followStats?.following

  const toggleFollow = useCallback(async () => {
    if (!isAuthenticated) { signInWithDiscord?.(); return }
    if (lockRef.current || !targetId) return
    lockRef.current = true
    setBusy(true); setError(null)
    const wasFollowing = following
    // Optimistic : bascule + ajuste le compteur d'abonnés affiché.
    setFollowStats(prev => ({
      ...(prev || {}),
      following: !wasFollowing,
      followers_count: Math.max(0, (prev?.followers_count ?? 0) + (wasFollowing ? -1 : 1)),
    }))
    const res = await (wasFollowing ? unfollowUser(targetId) : followUser(targetId))
    setBusy(false); lockRef.current = false
    if (res?.ok === false) {
      setError(res.error || 'Erreur')
      // Rollback
      setFollowStats(prev => ({
        ...(prev || {}),
        following: wasFollowing,
        followers_count: Math.max(0, (prev?.followers_count ?? 0) + (wasFollowing ? 1 : -1)),
      }))
      return
    }
    refreshFollow()
    refreshCounts?.()
  }, [isAuthenticated, targetId, following, setFollowStats, refreshFollow, refreshCounts, signInWithDiscord])

  const openDm = useCallback(async () => {
    if (!isAuthenticated) { signInWithDiscord?.(); return }
    if (lockRef.current || !targetId || isOwnProfile) return
    lockRef.current = true
    setBusy(true); setError(null)
    const res = await getOrCreateDm(targetId)
    setBusy(false); lockRef.current = false
    if (res?.ok && res.conversation_id) navigate(`/messages/${res.conversation_id}`)
    else setError(res?.error || 'Impossible d\'ouvrir la conversation')
  }, [isAuthenticated, targetId, isOwnProfile, navigate, signInWithDiscord])

  const relLabel = rel?.state === 'friends' ? 'Ami'
    : followStats?.follows_me ? 'Vous suit'
    : null

  // ── Mon profil ──────────────────────────────────────────────────────────────
  if (isOwnProfile) {
    return (
      <div className="pfx-actions">
        <button className="pfx-btn pfx-btn-gold" type="button" onClick={onEdit}>✎ Modifier le profil</button>
        <button className="pfx-btn pfx-btn-ghost" type="button" onClick={() => navigate('/fil')}>＋ Nouveau post</button>
        <button className="pfx-btn pfx-btn-ghost" type="button" onClick={onShare}>{copied ? '✓ Copié' : '⎘ Partager'}</button>
        <div className="pfx-menu-wrap" ref={menuRef}>
          <button className="pfx-btn pfx-btn-ghost pfx-btn-icon" type="button" aria-label="Plus" onClick={() => setMenu(m => !m)}>⋯</button>
          {menu && (
            <div className="pfx-menu">
              <button type="button" onClick={() => { setMenu(false); navigate(`/u/${targetId}?tab=inventaire`) }}>🗃 Inventaire</button>
              <button type="button" onClick={() => { setMenu(false); navigate('/boutique') }}>🛒 Boutique</button>
              <button type="button" onClick={() => { setMenu(false); navigate(`/u/${targetId}?tab=historique`) }}>🕓 Historique</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Profil d'un autre membre ──────────────────────────────────────────────────
  return (
    <div className="pfx-actions">
      {relLabel && <span className={`pfx-rel-tag${relLabel === 'Ami' ? ' friend' : ''}`}>{relLabel}</span>}
      <button className={`pfx-btn ${following ? 'pfx-btn-ghost' : 'pfx-btn-gold'}`} type="button" onClick={toggleFollow} disabled={busy}>
        {following ? '✓ Suivi' : '＋ Suivre'}
      </button>
      <button className="pfx-btn pfx-btn-ghost" type="button" onClick={openDm} disabled={busy}>💬 Message</button>
      <button className="pfx-btn pfx-btn-ghost" type="button" onClick={onShare}>{copied ? '✓ Copié' : '⎘ Partager'}</button>
      <div className="pfx-menu-wrap" ref={menuRef}>
        <button className="pfx-btn pfx-btn-ghost pfx-btn-icon" type="button" aria-label="Plus" onClick={() => setMenu(m => !m)}>⋯</button>
        {menu && (
          <div className="pfx-menu">
            <button type="button" onClick={() => { setMenu(false); onShare() }}>⎘ Copier le lien</button>
            <button type="button" onClick={() => { setMenu(false); window.open('https://discord.gg/8uzU3eatMr', '_blank', 'noopener') }}>🚩 Signaler (Discord)</button>
          </div>
        )}
      </div>
      {error && <span className="pfx-act-err">{error}</span>}
    </div>
  )
}
