// ── Page profil premium — vitrine sociale Brams ──────────────────────────────
// Orchestrée par useProfileData (member + boutique + perso + posts). UI découpée
// dans components/profile/* (préfixe CSS .pfx-, isolé de l'ancien .pf-).
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './profile/profile.css'
import { useProfileData } from '../hooks/useProfileData.js'
import Navbar from './Navbar.jsx'
import ProfilePosts from './feed/ProfilePosts.jsx'
import { useOpeningBg } from '../contexts/OpeningBgContext.jsx'
import ProfileHero from './profile/ProfileHero.jsx'
import ProfileAura from './profile/ProfileAura.jsx'
import ProfileOverview from './profile/ProfileOverview.jsx'
import ProfileInventory from './profile/ProfileInventory.jsx'
import ProfileHistory from './profile/ProfileHistory.jsx'
import ProfileAchievements from './profile/ProfileAchievements.jsx'
import ProfileEditModal from './profile/ProfileEditModal.jsx'
import { ErrorState, ProfileSkeleton } from './profile/shared.jsx'

const TABS = [
  { key: 'stats',        label: "Vue d'ensemble" },
  { key: 'posts',        label: 'Posts' },
  { key: 'inventaire',   label: 'Inventaire' },
  { key: 'historique',   label: 'Historique' },
  { key: 'achievements', label: 'Succès' },
]

export default function ProfilePage() {
  const { discordId } = useParams()
  const navigate = useNavigate()
  const data = useProfileData(discordId)
  const { member, settings, setSettings, loading, error, isOwnProfile, equippedBg } = data
  const { activeBg, setOverride, clearOverride, setAmbientStill } = useOpeningBg()

  const [tab,       setTab]       = useState('stats')
  const [copied,    setCopied]    = useState(false)
  const [immersive, setImmersive] = useState(false)
  const [editing,   setEditing]   = useState(false)

  // Fond derrière le profil : sur SON profil on garde le fond du visiteur ;
  // sur le profil d'un AUTRE on impose le fond d'opening équipé de la cible.
  useEffect(() => {
    if (isOwnProfile) { clearOverride(); return }
    setOverride(null)
    return () => clearOverride()
  }, [isOwnProfile, discordId, setOverride, clearOverride])
  useEffect(() => {
    if (isOwnProfile) return
    setOverride(equippedBg || null)
  }, [isOwnProfile, equippedBg, discordId, setOverride])

  // Le hero joue déjà la vidéo du fond équipé → on fige le fond global plein
  // écran (image floutée) tant qu'on est sur le profil, pour ne décoder qu'une
  // seule vidéo. Réactivé en quittant la page.
  useEffect(() => {
    setAmbientStill(true)
    return () => setAmbientStill(false)
  }, [setAmbientStill])

  const share = () => {
    navigator.clipboard?.writeText(window.location.href)
    setCopied(true); window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className={`pfx-shell${activeBg ? ' pfx-transparent' : ''}`} style={{ '--rank': data.rank.color }}>
      {!immersive && <Navbar />}

      <main className="pfx-wrap">
        {!immersive && (
          <div className="pfx-topbar">
            <button className="pfx-back" type="button" onClick={() => navigate(-1)}>← Retour</button>
            <button className="pfx-fs" type="button" onClick={() => setImmersive(true)}>⊡ Plein écran</button>
          </div>
        )}
        {immersive && (
          <div className="pfx-topbar">
            <span />
            <button className="pfx-fs" type="button" onClick={() => setImmersive(false)}>⊠ Quitter le plein écran</button>
          </div>
        )}

        {loading && <ProfileSkeleton />}
        {!loading && (error || !member) && <ErrorState onRetry={data.reload} />}

        {!loading && member && (
          <>
            <ProfileHero data={data} copied={copied} onShare={share} onEdit={() => setEditing(true)} />
            {!immersive && <ProfileAura data={data} />}

            {!immersive && (
              <nav className="pfx-tabs" aria-label="Navigation profil">
                {TABS.map(t => (
                  <button key={t.key} type="button" className={`pfx-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
                    {t.label}
                  </button>
                ))}
              </nav>
            )}

            {!immersive && (
              <div key={tab}>
                {tab === 'stats'        && <ProfileOverview data={data} onSeeAchievements={() => setTab('achievements')} />}
                {tab === 'posts'        && <div className="pfx-tabpanel"><ProfilePosts userId={member.uid} /></div>}
                {tab === 'inventaire'   && <ProfileInventory data={data} />}
                {tab === 'historique'   && <ProfileHistory data={data} />}
                {tab === 'achievements' && <ProfileAchievements data={data} />}
              </div>
            )}
          </>
        )}
      </main>

      {editing && (
        <ProfileEditModal
          settings={settings}
          onClose={() => setEditing(false)}
          onSaved={next => setSettings(next)}
        />
      )}
    </div>
  )
}
