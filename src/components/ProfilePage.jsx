// ── Page profil — vitrine sociale premium type Instagram ─────────────────────
// Header IG (ProfileHero) + stories/highlights + tabs (sync URL ?tab=) + grille
// de posts. Les stats Brams (aura/rang/parcours) vivent dans l'onglet "Aperçu".
// Orchestrée par useProfileData. UI découpée dans components/profile/* (.pfx-).
import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Grid3x3, Repeat2, Bookmark, Gauge, Package, Award } from 'lucide-react'
import './profile/profile.css'
import { useProfileData } from '../hooks/useProfileData.js'
import Navbar from './Navbar.jsx'
import { useOpeningBg } from '../contexts/OpeningBgContext.jsx'
import OpeningBgMedia from './social/OpeningBgMedia.jsx'
import { getBgById } from '../data/opening-backgrounds.js'
import ProfileHero from './profile/ProfileHero.jsx'
import ProfileOverview from './profile/ProfileOverview.jsx'
import ProfileInventory from './profile/ProfileInventory.jsx'
import ProfileAchievements from './profile/ProfileAchievements.jsx'
import ProfileEditModal from './profile/ProfileEditModal.jsx'
import ProfilePosts from './feed/ProfilePosts.jsx'
import FollowListModal from './profile/FollowListModal.jsx'
import AvatarPreviewModal from './profile/AvatarPreviewModal.jsx'
import { ErrorState, ProfileSkeleton } from './profile/shared.jsx'

export default function ProfilePage() {
  const { discordId } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const data = useProfileData(discordId)
  const { member, settings, setSettings, loading, error, isOwnProfile, equippedBg } = data
  const { setHideAmbient } = useOpeningBg()

  // Fond d'opening du profil affiché (animé, plein écran). On le rend NOUS-MÊMES
  // (fiable) et on masque le fond global le temps qu'on est sur le profil.
  const heroBg = getBgById(equippedBg)

  // Onglets — Sauvegardés réservé à mon profil (signets privés).
  const tabs = useMemo(() => [
    { key: 'posts',        label: 'Publications', Icon: Grid3x3 },
    { key: 'reposts',      label: 'Reposts',      Icon: Repeat2 },
    ...(isOwnProfile ? [{ key: 'saved', label: 'Sauvegardés', Icon: Bookmark }] : []),
    { key: 'apercu',       label: "Vue d'ensemble", Icon: Gauge },
    { key: 'inventaire',   label: 'Inventaire',   Icon: Package },
    { key: 'achievements', label: 'Succès',       Icon: Award },
  ], [isOwnProfile])

  const urlTab = params.get('tab')
  const tab = tabs.some(t => t.key === urlTab) ? urlTab : 'posts'
  const setTab = (key) => setParams(prev => { const n = new URLSearchParams(prev); n.set('tab', key); return n }, { replace: true })

  const [copied,      setCopied]      = useState(false)
  const [editing,     setEditing]     = useState(false)
  const [avatarOpen,  setAvatarOpen]  = useState(false)
  const [followModal, setFollowModal] = useState(null) // 'followers' | 'following' | null
  const [soundOn,     setSoundOn]     = useState(false) // son du fond d'opening

  // Masque le fond global (le profil rend le sien) tant qu'on est sur la page.
  useEffect(() => {
    setHideAmbient(true)
    return () => setHideAmbient(false)
  }, [setHideAmbient])

  const share = () => {
    navigator.clipboard?.writeText(window.location.href)
    setCopied(true); window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className={`pfx-shell${heroBg ? ' pfx-transparent' : ''}`} style={{ '--rank': data.rank.color }}>
      {/* Fond d'opening du profil : vidéo animée plein écran (poster si autoplay
          bloqué). Rendu par le profil lui-même → fiable, indépendant du global. */}
      {heroBg && (
        <div className="pfx-page-bg" aria-hidden>
          <OpeningBgMedia bg={heroBg} className="pfx-page-bg-media" muted={!soundOn} />
          <div className="pfx-page-bg-veil" />
        </div>
      )}
      {heroBg && (
        <button type="button" className="pfx-sound-toggle" onClick={() => setSoundOn(s => !s)}
          title={soundOn ? 'Couper le son' : 'Activer le son'} aria-label="Son du fond">
          {soundOn ? '🔊' : '🔇'}
        </button>
      )}

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

            <nav className="pfx-igtabs" aria-label="Navigation profil">
              {tabs.map(({ key, label, Icon }) => (
                <button key={key} type="button" className={`pfx-igtab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
                  <Icon size={17} aria-hidden />
                  <span>{label}</span>
                </button>
              ))}
            </nav>

            <div key={tab} className="pfx-tabpanel-anim">
              {tab === 'posts'        && <ProfilePosts userId={member.uid} mode="all" />}
              {tab === 'reposts'      && <ProfilePosts userId={member.uid} mode="reposts" />}
              {tab === 'saved'        && <ProfilePosts userId={member.uid} mode="saved" />}
              {tab === 'apercu'       && <ProfileOverview data={data} onSeeAchievements={() => setTab('achievements')} />}
              {tab === 'inventaire'   && <ProfileInventory data={data} />}
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
