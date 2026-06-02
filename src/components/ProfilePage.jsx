// ── Page profil — vitrine sociale premium type Instagram ─────────────────────
// Header IG (ProfileHero) + stories/highlights + tabs (sync URL ?tab=) + grille
// de posts. Les stats Brams (aura/rang/parcours) vivent dans l'onglet "Aperçu".
// Orchestrée par useProfileData. UI découpée dans components/profile/* (.pfx-).
import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Grid3x3, Repeat2, Bookmark, Gauge, Package, Clock3, Award } from 'lucide-react'
import './profile/profile.css'
import { useProfileData } from '../hooks/useProfileData.js'
import Navbar from './Navbar.jsx'
import { useOpeningBg } from '../contexts/OpeningBgContext.jsx'
import ProfileHero from './profile/ProfileHero.jsx'
import ProfileStories from './profile/ProfileStories.jsx'
import ProfileAura from './profile/ProfileAura.jsx'
import ProfileOverview from './profile/ProfileOverview.jsx'
import ProfileInventory from './profile/ProfileInventory.jsx'
import ProfileHistory from './profile/ProfileHistory.jsx'
import ProfileAchievements from './profile/ProfileAchievements.jsx'
import ProfileEditModal from './profile/ProfileEditModal.jsx'
import PostsGrid from './profile/PostsGrid.jsx'
import FollowListModal from './profile/FollowListModal.jsx'
import AvatarPreviewModal from './profile/AvatarPreviewModal.jsx'
import { ErrorState, ProfileSkeleton } from './profile/shared.jsx'

export default function ProfilePage() {
  const { discordId } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const data = useProfileData(discordId)
  const { member, settings, setSettings, loading, error, isOwnProfile, equippedBg } = data
  const { activeBg, setOverride, clearOverride, setAmbientStill } = useOpeningBg()

  // Onglets — Sauvegardés réservé à mon profil (signets privés).
  const tabs = useMemo(() => [
    { key: 'posts',        label: 'Publications', Icon: Grid3x3 },
    { key: 'reposts',      label: 'Reposts',      Icon: Repeat2 },
    ...(isOwnProfile ? [{ key: 'saved', label: 'Sauvegardés', Icon: Bookmark }] : []),
    { key: 'apercu',       label: "Vue d'ensemble", Icon: Gauge },
    { key: 'inventaire',   label: 'Inventaire',   Icon: Package },
    { key: 'historique',   label: 'Historique',   Icon: Clock3 },
    { key: 'achievements', label: 'Succès',       Icon: Award },
  ], [isOwnProfile])

  const urlTab = params.get('tab')
  const tab = tabs.some(t => t.key === urlTab) ? urlTab : 'posts'
  const setTab = (key) => setParams(prev => { const n = new URLSearchParams(prev); n.set('tab', key); return n }, { replace: true })

  const [copied,      setCopied]      = useState(false)
  const [editing,     setEditing]     = useState(false)
  const [avatarOpen,  setAvatarOpen]  = useState(false)
  const [followModal, setFollowModal] = useState(null) // 'followers' | 'following' | null

  // Fond derrière le profil : sur SON profil on garde le fond du visiteur ; sur
  // celui d'un AUTRE on impose son fond d'opening équipé.
  useEffect(() => {
    if (isOwnProfile) { clearOverride(); return }
    setOverride(null)
    return () => clearOverride()
  }, [isOwnProfile, discordId, setOverride, clearOverride])
  useEffect(() => {
    if (isOwnProfile) return
    setOverride(equippedBg || null)
  }, [isOwnProfile, equippedBg, discordId, setOverride])

  // Sur le profil, le fond d'opening équipé s'anime EN PLEIN ÉCRAN derrière le
  // contenu (le header est transparent). On réactive le mode figé en quittant.
  useEffect(() => {
    setAmbientStill(false)
    return () => setAmbientStill(true)
  }, [setAmbientStill])

  const share = () => {
    navigator.clipboard?.writeText(window.location.href)
    setCopied(true); window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className={`pfx-shell${activeBg ? ' pfx-transparent' : ''}`} style={{ '--rank': data.rank.color }}>
      <Navbar />

      <main className="pfx-wrap pfx-wrap-ig">
        <div className="pfx-topbar">
          <button className="pfx-back" type="button" onClick={() => navigate(-1)}>← Retour</button>
        </div>

        {loading && <ProfileSkeleton />}
        {!loading && (error || !member) && <ErrorState onRetry={data.reload} />}

        {!loading && member && (
          <>
            <ProfileHero
              data={data}
              copied={copied}
              onShare={share}
              onEdit={() => setEditing(true)}
              onAvatar={() => member?.avatar_url && setAvatarOpen(true)}
              onShowFollowers={() => setFollowModal('followers')}
              onShowFollowing={() => setFollowModal('following')}
            />

            <ProfileStories discordId={discordId} isOwnProfile={isOwnProfile} member={member} />

            <nav className="pfx-igtabs" aria-label="Navigation profil">
              {tabs.map(({ key, label, Icon }) => (
                <button key={key} type="button" className={`pfx-igtab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
                  <Icon size={17} aria-hidden />
                  <span>{label}</span>
                </button>
              ))}
            </nav>

            <div key={tab} className="pfx-tabpanel-anim">
              {tab === 'posts'        && <PostsGrid userId={member.uid} isOwnProfile={isOwnProfile} mode="posts" />}
              {tab === 'reposts'      && <PostsGrid userId={member.uid} isOwnProfile={isOwnProfile} mode="reposts" />}
              {tab === 'saved'        && <PostsGrid userId={member.uid} isOwnProfile={isOwnProfile} mode="saved" />}
              {tab === 'apercu'       && (
                <div className="pfx-tabpanel">
                  <ProfileAura data={data} />
                  <ProfileOverview data={data} onSeeAchievements={() => setTab('achievements')} />
                </div>
              )}
              {tab === 'inventaire'   && <ProfileInventory data={data} />}
              {tab === 'historique'   && <ProfileHistory data={data} />}
              {tab === 'achievements' && <ProfileAchievements data={data} />}
            </div>
          </>
        )}
      </main>

      {editing && (
        <ProfileEditModal
          data={data}
          settings={settings}
          onClose={() => setEditing(false)}
          onSaved={next => setSettings(next)}
        />
      )}

      {avatarOpen && (
        <AvatarPreviewModal src={member?.avatar_url} alt={member?.username} ringColor={data.rank.color} onClose={() => setAvatarOpen(false)} />
      )}

      {followModal && (
        <FollowListModal targetId={discordId} initialTab={followModal} onClose={() => setFollowModal(null)} onMutated={data.refreshFollow} />
      )}
    </div>
  )
}
