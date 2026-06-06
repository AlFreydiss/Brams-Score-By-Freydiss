// ── Header profil style Instagram premium ───────────────────────────────────
// Avatar (clic = preview) + identité + ligne stats cliquable (publications /
// abonnés / suivis / aura) + bio. Le fond d'opening équipé sert de backdrop
// discret (overlay sombre fort) ; une bannière custom le remplace si définie.
import { fmtB, fmtNum } from '../../lib/profileTokens.js'
import { CountUp } from './shared.jsx'
import ProfileActions from './ProfileActions.jsx'
import FollowersPreview from './FollowersPreview.jsx'

export default function ProfileHero({ data, copied, onShare, onEdit, onAvatar, onShowFollowers, onShowFollowing }) {
  const {
    member, rank, aura, auraTier, postsCount, followStats, settings,
    isOwnProfile, profileIsCreator, profileIsStaff,
  } = data

  const bannerUrl = settings?.banner_url || null
  const displayName = member?.username || `Pirate #${String(member?.uid || '').slice(-4)}`

  const stats = [
    { key: 'posts',     val: postsCount == null ? '—' : fmtNum(postsCount),                 lbl: 'publications' },
    { key: 'followers', val: fmtNum(followStats?.followers_count ?? 0),                     lbl: 'abonnés',  onClick: onShowFollowers },
    { key: 'following', val: fmtNum(followStats?.following_count ?? 0),                      lbl: 'suivis',   onClick: onShowFollowing },
    { key: 'aura',      val: <CountUp value={aura} />,                                       lbl: 'aura' },
  ]

  return (
    <section className="pfx-ig-hero" style={{ '--rank': rank.color }}>
      {/* Le fond d'opening animé est rendu EN PLEIN ÉCRAN derrière la page
          (EquippedOpeningBackground). Le hero est transparent ; un voile doux
          assure juste la lisibilité du texte. */}
      <div className="pfx-ig-scrim" aria-hidden />

      {/* Bannière custom : bandeau image optionnel en haut */}
      {bannerUrl && (
        <div className="pfx-ig-banner" aria-hidden>
          <img src={bannerUrl} alt="" />
        </div>
      )}

      <div className="pfx-ig-inner">
        {/* Avatar */}
        <button type="button" className="pfx-ig-avatar" onClick={onAvatar} aria-label="Voir l'avatar">
          <span className="pfx-ig-avatar-ring">
            <span className="pfx-ig-avatar-inner">
              {member?.avatar_url
                ? <img src={member.avatar_url} alt={displayName} />
                : <em>{rank.emoji}</em>}
            </span>
          </span>
          <span className="pfx-ig-avatar-dot" />
        </button>

        {/* Colonne identité */}
        <div className="pfx-ig-main">
          {/* Ligne 1 : pseudo + badges + actions */}
          <div className="pfx-ig-top">
            <div className="pfx-ig-namewrap">
              <h1 className="pfx-ig-name">{displayName}</h1>
              {(profileIsCreator || profileIsStaff) && <span className="pfx-ig-verified" title="Compte vérifié">✓</span>}
            </div>
            <ProfileActions data={data} onShare={onShare} copied={copied} onEdit={onEdit} />
          </div>

          {/* Badges rang / rôle */}
          <div className="pfx-ig-badges">
            <span className="pfx-badge pfx-badge-rank" style={{ '--rank': rank.color }}>{rank.emoji} {rank.rang}</span>
            {profileIsCreator && <span className="pfx-badge pfx-badge-creator">👑 Créateur</span>}
            {profileIsStaff   && <span className="pfx-badge pfx-badge-staff">🛡 Staff</span>}
            <span className="pfx-badge" style={{ color: auraTier.color }}>✦ {auraTier.label}</span>
          </div>

          {/* Ligne stats */}
          <div className="pfx-ig-stats">
            {stats.map(s => (
              s.onClick
                ? <button key={s.key} type="button" className="pfx-ig-stat pfx-ig-stat-btn" onClick={s.onClick}>
                    <strong>{s.val}</strong><span>{s.lbl}</span>
                  </button>
                : <div key={s.key} className="pfx-ig-stat">
                    <strong>{s.val}</strong><span>{s.lbl}</span>
                  </div>
            ))}
          </div>

          {/* Bio */}
          <div className="pfx-ig-bio">
            <div className="pfx-ig-bio-name">
              {displayName}
              <em> · #{member?.rank ?? '—'} / {member?.total ?? '—'} Nakamas</em>
            </div>
            {settings?.quote && <p className="pfx-ig-quote">« {settings.quote} »</p>}
            {settings?.bio   && <p className="pfx-ig-biotext">{settings.bio}</p>}
            <div className="pfx-ig-meta">
              <span>฿ {fmtB(member?.berrys || 0)} de prime</span>
            </div>
          </div>
        </div>

        {/* Colonne droite : qui suit ce profil (remplit l'espace, voir abonnés) */}
        <aside className="pfx-ig-aside">
          <FollowersPreview targetId={member?.uid} count={followStats?.followers_count} onOpen={onShowFollowers} />
        </aside>
      </div>
    </section>
  )
}
