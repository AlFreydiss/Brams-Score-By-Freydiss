// ── Header profil style Instagram premium ───────────────────────────────────
// Avatar (clic = preview) + identité + ligne stats cliquable (publications /
// abonnés / suivis / aura) + bio. Le fond d'opening équipé sert de backdrop
// discret (overlay sombre fort) ; une bannière custom le remplace si définie.
import { fmtB, fmtNum } from '../../lib/profileTokens.js'
import ProfileActions from './ProfileActions.jsx'
import FollowersPreview from './FollowersPreview.jsx'
import { certif } from '../../lib/roles.js'

export default function ProfileHero({ data, copied, onShare, onEdit, onAvatar, onShowFollowers, onShowFollowing }) {
  const {
    member, rank, postsCount, followStats, settings,
    isOwnProfile, profileIsCreator, profileIsStaff,
  } = data

  const bannerUrl = settings?.banner_url || null
  const displayName = member?.username || `Pirate #${String(member?.uid || '').slice(-4)}`
  const certifData = certif(member?.uid)

  const stats = [
    { key: 'posts',     val: postsCount == null ? '—' : fmtNum(postsCount),                 lbl: 'publications' },
    { key: 'followers', val: fmtNum(followStats?.followers_count ?? 0),                     lbl: 'abonnés',  onClick: onShowFollowers },
    { key: 'following', val: fmtNum(followStats?.following_count ?? 0),                      lbl: 'suivis',   onClick: onShowFollowing },
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
              {certifData ? (
                <span className="pfx-ig-verified pfx-ig-certif" data-title={certifData.title}
                  style={{ background: certifData.color, boxShadow: `0 0 0 1px ${certifData.color}66, 0 0 14px ${certifData.glow}`, '--cc': certifData.color }}>✓</span>
              ) : (profileIsCreator || profileIsStaff) ? (
                <span className="pfx-ig-verified" title="Compte vérifié">✓</span>
              ) : null}
              {/* Tag "IA" à côté de la certif du bot BramsScore */}
              {String(member?.uid) === '1000000000000000001' && (
                <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, color: '#E60012', background: 'rgba(230,0,18,.12)', border: '1px solid rgba(230,0,18,.4)', letterSpacing: '.06em' }}>IA</span>
              )}
            </div>
            <ProfileActions data={data} onShare={onShare} copied={copied} onEdit={onEdit} />
          </div>

          {/* Badges rang / rôle */}
          <div className="pfx-ig-badges">
            <span className="pfx-badge pfx-badge-rank" style={{ '--rank': rank.color }}>{rank.emoji} {rank.rang}</span>
            {!certifData && profileIsCreator && <span className="pfx-badge pfx-badge-creator">👑 Créateur</span>}
            {!certifData && profileIsStaff   && <span className="pfx-badge pfx-badge-staff">🛡 Staff</span>}
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
            <div className="pfx-ig-bio-name">{displayName}</div>
            {settings?.quote && <p className="pfx-ig-quote">« {settings.quote} »</p>}
            {settings?.bio   && <p className="pfx-ig-biotext">{settings.bio}</p>}
            {/* Prime + classement : chips hairline sobres (or de la DA, zéro glow) */}
            <div className="pfx-ig-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999,
                background: 'rgba(191,164,106,0.08)', border: '1px solid rgba(191,164,106,0.35)',
                color: '#d9bd80', fontWeight: 700, fontSize: 12.5, letterSpacing: '.01em',
              }}>
                ฿ {fmtB(member?.berrys || 0)} <span style={{ color: 'rgba(217,189,128,0.6)', fontWeight: 600 }}>de prime</span>
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 999,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 12.5,
              }}>
                #{member?.rank ?? '—'} <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginLeft: 4 }}>/ {member?.total ?? '—'} Nakamas</span>
              </span>
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
