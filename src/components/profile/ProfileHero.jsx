// ── Hero du profil : avatar, identité, badges, stats, progression de rang ────
import { RANK_QUOTES, fmtB } from '../../lib/profileTokens.js'
import { CountUp } from './shared.jsx'
import RelationshipActions from '../social/RelationshipActions.jsx'
import OpeningBgMedia from '../social/OpeningBgMedia.jsx'
import { getBgById } from '../../data/opening-backgrounds.js'

export default function ProfileHero({ data, copied, onShare, onEdit }) {
  const {
    member, rank, nextRank, remaining, pct, hours, wallet, aura,
    achievements, postsCount, shopData, settings, equippedBg,
    isOwnProfile, profileIsCreator, profileIsStaff, myId,
  } = data

  const heroBg = getBgById(equippedBg)

  const displayName = member?.username || `Pirate #${String(member?.uid || '').slice(-4)}`
  const quote = settings?.quote || RANK_QUOTES[rank.rang] || ''
  const unlocked = achievements.filter(a => a.unlocked).length
  const invCount = shopData?.inventory?.length || 0
  const txCount  = shopData?.transactions?.length || 0

  const stats = [
    { ic: '🎙', val: hours.toFixed(1) + 'h',              lbl: 'Vocal' },
    { ic: '฿',  val: fmtB(wallet),                        lbl: 'Berries', cls: 'pfx-stat-gold' },
    { ic: '✦',  val: <CountUp value={aura} />,            lbl: 'Aura',    cls: 'pfx-stat-violet' },
    { ic: '🏆', val: '#' + (member?.rank ?? '—'),         lbl: 'Classement' },
    { ic: '🗃', val: invCount,                            lbl: 'Objets' },
    { ic: '🎯', val: unlocked,                            lbl: 'Succès' },
    { ic: '📝', val: postsCount == null ? '…' : postsCount, lbl: 'Posts' },
    { ic: '🛒', val: txCount,                             lbl: 'Achats' },
  ]

  return (
    <>
      {/* ═══ HERO ═══ */}
      <section className="pfx-hero">
        <div className="pfx-hero-bg" aria-hidden>
          {/* Fallback (dégradé teinté rang) toujours dessous, visible si pas de média ou échec. */}
          <div className="pfx-hero-bg-fallback" />
          {heroBg && <OpeningBgMedia bg={heroBg} className="pfx-hero-bg-media" />}
        </div>
        <div className="pfx-hero-overlay" aria-hidden />
        <div className="pfx-hero-grain" aria-hidden />

        <div className="pfx-hero-inner">
          {/* Avatar */}
          <div className="pfx-avatar-ring">
            <div className="pfx-avatar-inner">
              {member?.avatar_url
                ? <img src={member.avatar_url} alt={displayName} className="pfx-avatar-img" />
                : <span className="pfx-avatar-emoji">{rank.emoji}</span>}
            </div>
            <div className="pfx-avatar-dot" />
          </div>

          {/* Identité */}
          <div className="pfx-hero-main">
            <div className="pfx-eyebrow">
              Brams Community · #{member?.rank} / {member?.total} Nakamas
            </div>
            <h1 className="pfx-name">{displayName}</h1>

            <div className="pfx-badges">
              <span className="pfx-badge pfx-badge-rank" style={{ '--rank': rank.color }}>{rank.emoji} {rank.rang}</span>
              {profileIsCreator && <span className="pfx-badge pfx-badge-creator">👑 Créateur</span>}
              {profileIsStaff   && <span className="pfx-badge pfx-badge-staff">🛡 Staff</span>}
              {isOwnProfile     && <span className="pfx-badge">Mon profil</span>}
            </div>

            {quote && <p className="pfx-quote">« {quote} »</p>}
            {settings?.bio && (
              <p className="pfx-quote" style={{ fontStyle: 'normal', opacity: 0.85 }}>{settings.bio}</p>
            )}

            <div className="pfx-actions">
              <button className="pfx-btn pfx-btn-gold" type="button" onClick={onShare}>
                {copied ? '✓ Copié' : '⎘ Partager'}
              </button>
              {isOwnProfile && (
                <button className="pfx-btn pfx-btn-ghost" type="button" onClick={onEdit}>✎ Modifier</button>
              )}
              <a className="pfx-btn pfx-btn-discord" href="https://discord.gg/v3Ddhtbz" target="_blank" rel="noopener noreferrer">Discord</a>
              {!isOwnProfile && myId && (
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <RelationshipActions targetId={member?.uid} />
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <div className="pfx-stats">
        {stats.map(s => (
          <div key={s.lbl} className={`pfx-stat ${s.cls || ''}`}>
            <div className="pfx-stat-ic">{s.ic}</div>
            <div className="pfx-stat-val">{s.val}</div>
            <div className="pfx-stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ═══ PROGRESSION DE RANG ═══ */}
      <div className="pfx-prog">
        <div className="pfx-prog-hd">
          <div className="pfx-prog-side">
            <em>{rank.emoji}</em>
            <strong>{rank.rang}</strong>
            <small>{rank.min}h requis</small>
          </div>
          {nextRank ? (
            <div className="pfx-prog-center">
              <strong>{remaining.toFixed(1)}h</strong>
              avant {nextRank.rang}
            </div>
          ) : (
            <div className="pfx-prog-maxed">👑 Rang maximum atteint</div>
          )}
          {nextRank && (
            <div className="pfx-prog-side r">
              <em>{nextRank.emoji}</em>
              <strong>{nextRank.rang}</strong>
              <small>{nextRank.min}h requis</small>
            </div>
          )}
        </div>
        <div className="pfx-prog-track">
          <div className="pfx-prog-fill" style={{ width: `${pct}%`, '--ac': nextRank?.color || rank.color }} />
        </div>
      </div>
    </>
  )
}
