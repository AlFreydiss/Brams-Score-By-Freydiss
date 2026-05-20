import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { fetchBerryShopState, RARITY_STYLES } from '../lib/berryShop.js'
import { fetchMemberProfile } from '../lib/supabase.js'
import Navbar from './Navbar.jsx'

const RANK_MAP = [
  { min: 150, rang: 'Roi des Pirates', emoji: '👑', color: '#FFD700', next: null },
  { min: 70, rang: 'Yonkou', emoji: '🌊', color: '#A66CFF', next: 150 },
  { min: 40, rang: 'Amiral', emoji: '🪖', color: '#F5C542', next: 70 },
  { min: 25, rang: 'Shichibukai', emoji: '⚔️', color: '#2ECC71', next: 40 },
  { min: 10, rang: 'Pirate', emoji: '🏴‍☠️', color: '#4F8CFF', next: 25 },
  { min: 0, rang: 'Moussaillon', emoji: '⚓', color: '#8A8F9F', next: 10 },
]

const TABS = [
  { key: 'stats', label: 'Statistiques', icon: '▦' },
  { key: 'inventaire', label: 'Inventaire', icon: '◇' },
  { key: 'historique', label: 'Historique', icon: '≡' },
]

function getRank(hours) {
  return RANK_MAP.find((rank) => hours >= rank.min) ?? RANK_MAP[RANK_MAP.length - 1]
}

function getNextRank(rank) {
  return rank.next != null ? RANK_MAP.find((item) => item.min === rank.next) : null
}

function fmtB(value) {
  const n = Number.parseInt(value || 0, 10)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function fmtNum(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0))
}

function timeAgo(iso) {
  if (!iso) return ''
  const minutes = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  return `il y a ${Math.floor(hours / 24)} j`
}

function StatTile({ label, value, detail, color, tone = 'gold' }) {
  return (
    <article className={`profile-stat profile-stat-${tone}`} style={{ '--accent': color }}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  )
}

function Progress({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 100
  return (
    <div className="profile-progress">
      <div style={{ width: `${pct}%`, '--accent': color }} />
    </div>
  )
}

function WantedPoster({ member, rank, hours }) {
  const bounty = Number.parseInt(member.berrys || 0, 10)
  return (
    <aside className="profile-poster" style={{ '--accent': rank.color }}>
      <div className="profile-poster-rank">#{member.rank || '-'}</div>
      <div className="profile-poster-top">Avis de recherche</div>
      <div className="profile-poster-title">Wanted</div>
      <div className="profile-poster-photo">
        {member.avatar_url ? (
          <img src={member.avatar_url} alt="" />
        ) : (
          <span>{rank.emoji}</span>
        )}
      </div>
      <div className="profile-poster-name">{member.username || `Pirate #${String(member.uid).slice(-4)}`}</div>
      <div className="profile-poster-role">{rank.emoji} {rank.rang}</div>
      <div className="profile-poster-line" />
      <div className="profile-poster-meta">
        <div>
          <span>Prime</span>
          <strong>{fmtB(bounty)} ฿</strong>
        </div>
        <div>
          <span>Vocal</span>
          <strong>{hours}h</strong>
        </div>
      </div>
    </aside>
  )
}

function InventoryCard({ item }) {
  const shopItem = item?.shop_items || item || {}
  const rarity = shopItem.rarity || 'Commun'
  const style = RARITY_STYLES[rarity] || RARITY_STYLES.Commun
  const name = shopItem.name || 'Objet inconnu'
  const category = shopItem.category || item?.category || 'Cosmetique'

  return (
    <article className="profile-item" style={{ '--accent': style.color }}>
      <div className="profile-item-top">
        <span>{category.slice(0, 2).toUpperCase()}</span>
        <em>{style.label}</em>
      </div>
      <strong>{name}</strong>
      {item?.acquired_at && <small>Obtenu {timeAgo(item.acquired_at)}</small>}
    </article>
  )
}

function TransactionRow({ tx }) {
  const shopItem = tx?.shop_items || {}
  const style = RARITY_STYLES[shopItem.rarity] || RARITY_STYLES.Commun
  return (
    <div className="profile-transaction" style={{ '--accent': style.color }}>
      <div className="profile-transaction-icon">฿</div>
      <div>
        <strong>{shopItem.name || 'Achat boutique'}</strong>
        <span>{timeAgo(tx?.created_at)}</span>
      </div>
      <em>-{fmtNum(tx?.amount || 0)} ฿</em>
    </div>
  )
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="profile-empty">
      <div>{icon}</div>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  )
}

export default function ProfilePage() {
  const { discordId } = useParams()
  const navigate = useNavigate()
  const { discordId: myId } = useAuth()
  const [member, setMember] = useState(null)
  const [shopData, setShopData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('stats')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    Promise.all([fetchMemberProfile(discordId), fetchBerryShopState(discordId)])
      .then(([profile, shop]) => {
        if (ignore) return
        setMember(profile)
        setShopData(shop)
        setLoading(false)
      })
      .catch(() => {
        if (!ignore) setLoading(false)
      })
    return () => { ignore = true }
  }, [discordId])

  const hours = Number.parseFloat(member?.vocal_h || 0)
  const rank = getRank(hours)
  const nextRank = getNextRank(rank)
  const remaining = nextRank ? Math.max(0, nextRank.min - hours) : 0
  const isOwnProfile = String(myId) === String(discordId)
  const displayName = member?.username || `Pirate #${String(member?.uid || '').slice(-4)}`

  const wallet = useMemo(() => {
    if (shopData && !shopData.preview) return shopData.balance || 0
    return member?.berrys || 0
  }, [member, shopData])

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="profile-shell" style={{ '--rank': rank.color }}>
      <Navbar />
      <style>{`
        .profile-shell {
          min-height: 100vh;
          color: #f3ead7;
          background:
            radial-gradient(circle at 18% 8%, color-mix(in srgb, var(--rank) 24%, transparent), transparent 28rem),
            radial-gradient(circle at 90% 20%, rgba(40, 118, 180, .16), transparent 30rem),
            linear-gradient(135deg, #080605 0%, #100a08 42%, #070809 100%);
          overflow-x: hidden;
        }
        .profile-shell::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: .17;
          background-image:
            linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: linear-gradient(to bottom, black 0%, transparent 78%);
        }
        .profile-wrap {
          position: relative;
          z-index: 1;
          width: min(1180px, calc(100% - 32px));
          margin: 0 auto;
          padding: 84px 0 72px;
        }
        .profile-back {
          height: 36px;
          padding: 0 14px;
          border-radius: 7px;
          border: 1px solid rgba(230, 180, 80, .22);
          background: rgba(9, 8, 8, .58);
          color: rgba(236, 208, 150, .78);
          font-weight: 800;
          font-size: 12px;
          letter-spacing: .05em;
          cursor: pointer;
        }
        .profile-hero {
          display: grid;
          grid-template-columns: 320px minmax(0, 1fr);
          gap: 28px;
          align-items: stretch;
          margin-top: 22px;
        }
        .profile-poster {
          position: relative;
          min-height: 470px;
          padding: 26px 24px 22px;
          border-radius: 8px;
          border: 1px solid color-mix(in srgb, var(--accent) 52%, rgba(255,255,255,.08));
          background:
            linear-gradient(145deg, rgba(255,255,255,.055), transparent 28%),
            linear-gradient(180deg, rgba(36,22,11,.96), rgba(12,9,7,.98));
          box-shadow: 0 26px 70px rgba(0,0,0,.42), 0 0 54px color-mix(in srgb, var(--accent) 24%, transparent);
          overflow: hidden;
        }
        .profile-poster::after {
          content: "";
          position: absolute;
          inset: 10px;
          border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent);
          border-radius: 6px;
          pointer-events: none;
        }
        .profile-poster-rank {
          position: absolute;
          top: 18px;
          right: 18px;
          z-index: 2;
          padding: 5px 8px;
          border-radius: 6px;
          background: rgba(0,0,0,.42);
          color: var(--accent);
          font-size: 12px;
          font-weight: 900;
        }
        .profile-poster-top {
          text-align: center;
          text-transform: uppercase;
          letter-spacing: .32em;
          font-size: 9px;
          font-weight: 900;
          color: rgba(238, 204, 132, .55);
        }
        .profile-poster-title {
          margin-top: 2px;
          text-align: center;
          font-family: Pirata One, serif;
          font-size: 54px;
          line-height: .95;
          color: #f2ca57;
          text-shadow: 0 0 22px rgba(242, 202, 87, .24);
        }
        .profile-poster-photo {
          width: min(210px, 86%);
          aspect-ratio: 1;
          margin: 20px auto 16px;
          border-radius: 7px;
          overflow: hidden;
          border: 1px solid color-mix(in srgb, var(--accent) 52%, rgba(255,255,255,.12));
          background: rgba(255,255,255,.05);
          display: grid;
          place-items: center;
          box-shadow: inset 0 0 24px rgba(0,0,0,.5);
        }
        .profile-poster-photo img { width: 100%; height: 100%; object-fit: cover; }
        .profile-poster-photo span { font-size: 72px; }
        .profile-poster-name {
          text-align: center;
          font-family: Pirata One, serif;
          color: #fff4d8;
          font-size: 30px;
          line-height: 1;
          overflow-wrap: anywhere;
        }
        .profile-poster-role {
          margin-top: 8px;
          text-align: center;
          color: var(--accent);
          font-size: 12px;
          font-weight: 900;
        }
        .profile-poster-line {
          height: 1px;
          margin: 18px 0;
          background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 58%, transparent), transparent);
        }
        .profile-poster-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .profile-poster-meta div {
          padding: 12px 10px;
          border-radius: 7px;
          background: rgba(0,0,0,.28);
          border: 1px solid rgba(255,255,255,.06);
          text-align: center;
        }
        .profile-poster-meta span,
        .profile-stat span,
        .profile-panel-title,
        .profile-item-top em,
        .profile-stat small {
          text-transform: uppercase;
          letter-spacing: .11em;
          font-size: 10px;
          color: rgba(235, 207, 157, .52);
          font-weight: 850;
        }
        .profile-poster-meta strong {
          display: block;
          margin-top: 5px;
          font-size: 18px;
          color: #f2ca57;
          font-weight: 950;
        }
        .profile-main-card {
          position: relative;
          min-height: 470px;
          padding: clamp(22px, 3vw, 34px);
          border-radius: 8px;
          background:
            linear-gradient(135deg, rgba(255,255,255,.075), transparent 28%),
            linear-gradient(180deg, rgba(19,18,22,.86), rgba(10,9,10,.96));
          border: 1px solid rgba(255,255,255,.08);
          box-shadow: 0 20px 70px rgba(0,0,0,.35);
          overflow: hidden;
        }
        .profile-main-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 74% 10%, color-mix(in srgb, var(--rank) 26%, transparent), transparent 18rem);
          pointer-events: none;
        }
        .profile-head,
        .profile-actions,
        .profile-stat-grid,
        .profile-progress-card,
        .profile-tabs,
        .profile-content { position: relative; z-index: 1; }
        .profile-kicker {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 12px;
          color: var(--rank);
          text-transform: uppercase;
          letter-spacing: .16em;
          font-size: 11px;
          font-weight: 950;
        }
        .profile-own {
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(79, 140, 255, .14);
          border: 1px solid rgba(79, 140, 255, .3);
          color: #93b7ff;
          letter-spacing: .08em;
        }
        .profile-head h1 {
          margin: 0;
          color: #fff4d8;
          font-family: Pirata One, serif;
          font-size: clamp(44px, 7vw, 86px);
          line-height: .88;
          letter-spacing: 0;
          max-width: 760px;
          overflow-wrap: anywhere;
        }
        .profile-sub {
          margin: 16px 0 0;
          color: rgba(235, 207, 157, .58);
          font-size: 14px;
        }
        .profile-sub strong { color: #fff0c3; }
        .profile-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 28px;
        }
        .profile-stat {
          min-height: 116px;
          padding: 18px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,.075);
          background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.025));
        }
        .profile-stat strong {
          display: block;
          margin: 12px 0 5px;
          color: var(--accent);
          font-size: clamp(28px, 4vw, 40px);
          line-height: .9;
          font-weight: 950;
          letter-spacing: 0;
        }
        .profile-stat small { display: block; text-transform: none; letter-spacing: 0; }
        .profile-progress-card {
          margin-top: 14px;
          padding: 18px;
          border-radius: 8px;
          background: rgba(0,0,0,.24);
          border: 1px solid rgba(255,255,255,.075);
        }
        .profile-progress-top,
        .profile-progress-bottom {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          color: rgba(235, 207, 157, .62);
          font-size: 12px;
          font-weight: 750;
        }
        .profile-progress-bottom { margin-top: 9px; color: rgba(235, 207, 157, .46); }
        .profile-progress-bottom strong { color: var(--rank); }
        .profile-progress {
          height: 10px;
          margin-top: 12px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.07);
        }
        .profile-progress div {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 62%, #fff), var(--accent));
          box-shadow: 0 0 24px color-mix(in srgb, var(--accent) 45%, transparent);
        }
        .profile-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 16px;
        }
        .profile-actions button,
        .profile-actions a {
          height: 44px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.09);
          background: rgba(255,255,255,.045);
          color: rgba(255,244,216,.78);
          font-weight: 900;
          font-size: 13px;
          text-decoration: none;
          cursor: pointer;
        }
        .profile-actions a {
          color: #9db7ff;
          border-color: rgba(90, 120, 255, .28);
          background: rgba(90, 120, 255, .1);
        }
        .profile-tabs {
          display: flex;
          gap: 8px;
          margin-top: 30px;
          padding: 6px;
          width: fit-content;
          border-radius: 10px;
          background: rgba(0,0,0,.26);
          border: 1px solid rgba(255,255,255,.075);
        }
        .profile-tabs button {
          height: 38px;
          padding: 0 14px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: rgba(235, 207, 157, .5);
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }
        .profile-tabs button.active {
          background: color-mix(in srgb, var(--rank) 19%, rgba(255,255,255,.06));
          color: #fff3d8;
        }
        .profile-content {
          margin-top: 18px;
        }
        .profile-panel-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .profile-panel,
        .profile-item,
        .profile-transaction {
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,.075);
          background: rgba(255,255,255,.04);
        }
        .profile-panel { padding: 18px; }
        .profile-panel-title { margin-bottom: 14px; color: #d8a84b; }
        .profile-list-row {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,.055);
        }
        .profile-list-row span {
          color: rgba(235, 207, 157, .5);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .08em;
          font-weight: 850;
        }
        .profile-list-row strong {
          color: #fff0c3;
          text-align: right;
          overflow-wrap: anywhere;
        }
        .profile-rank-list {
          display: grid;
          gap: 8px;
        }
        .profile-rank-step {
          display: grid;
          grid-template-columns: 34px 1fr auto;
          align-items: center;
          gap: 10px;
          padding: 9px;
          border-radius: 7px;
          background: rgba(0,0,0,.18);
          opacity: var(--active);
        }
        .profile-rank-step i {
          width: 30px;
          height: 30px;
          border-radius: 7px;
          display: grid;
          place-items: center;
          background: color-mix(in srgb, var(--accent) 16%, transparent);
          border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
          font-style: normal;
        }
        .profile-rank-step strong { color: #fff0c3; font-size: 12px; }
        .profile-rank-step span { display: block; color: rgba(235,207,157,.4); font-size: 10px; }
        .profile-item-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 12px;
        }
        .profile-item {
          min-height: 138px;
          padding: 16px;
          background:
            radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--accent) 15%, transparent), transparent 8rem),
            rgba(255,255,255,.04);
        }
        .profile-item-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .profile-item-top span {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          background: color-mix(in srgb, var(--accent) 18%, transparent);
          color: var(--accent);
          font-weight: 950;
        }
        .profile-item strong { display: block; color: #fff2d1; font-size: 15px; }
        .profile-item small { display: block; margin-top: 8px; color: rgba(235,207,157,.45); }
        .profile-transaction {
          display: grid;
          grid-template-columns: 44px 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 12px;
          margin-bottom: 8px;
        }
        .profile-transaction-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          color: var(--accent);
          background: color-mix(in srgb, var(--accent) 15%, transparent);
          font-weight: 950;
        }
        .profile-transaction strong { display: block; color: #fff2d1; }
        .profile-transaction span { color: rgba(235,207,157,.45); font-size: 12px; }
        .profile-transaction em { color: #f06969; font-style: normal; font-weight: 950; }
        .profile-empty {
          display: grid;
          place-items: center;
          min-height: 230px;
          text-align: center;
          color: rgba(235,207,157,.48);
        }
        .profile-empty div { font-size: 42px; color: var(--rank); }
        .profile-empty strong { margin-top: 10px; color: #fff1ce; font-size: 18px; }
        .profile-empty span { margin-top: 6px; }
        @media (max-width: 920px) {
          .profile-hero { grid-template-columns: 1fr; }
          .profile-poster { min-height: auto; }
          .profile-panel-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 620px) {
          .profile-wrap { width: min(100% - 22px, 1180px); padding-top: 76px; }
          .profile-main-card { padding: 18px; }
          .profile-stat-grid,
          .profile-actions { grid-template-columns: 1fr; }
          .profile-tabs { width: 100%; overflow-x: auto; }
          .profile-tabs button { white-space: nowrap; }
          .profile-head h1 { font-size: clamp(38px, 18vw, 60px); }
        }
      `}</style>

      <main className="profile-wrap">
        <button className="profile-back" type="button" onClick={() => navigate(-1)}>← Retour</button>

        {loading && (
          <EmptyState icon="⌛" title="Chargement du profil" text="Les donnees du pirate arrivent." />
        )}

        {!loading && !member && (
          <EmptyState icon="☠" title="Pirate introuvable" text="Ce membre n'est pas dans le classement." />
        )}

        {!loading && member && (
          <>
            <section className="profile-hero">
              <WantedPoster member={member} rank={rank} hours={hours} />

              <div className="profile-main-card">
                <header className="profile-head">
                  <div className="profile-kicker">
                    <span>{rank.emoji} {rank.rang}</span>
                    {isOwnProfile && <span className="profile-own">Mon profil</span>}
                  </div>
                  <h1>{displayName}</h1>
                  <p className="profile-sub">
                    Classement global <strong>#{member.rank}</strong> sur {member.total} nakamas
                  </p>
                </header>

                <div className="profile-stat-grid">
                  <StatTile label="Vocal" value={`${hours}h`} detail="sur 7 jours" color={rank.color} tone="rank" />
                  <StatTile label="Berrys" value={`${fmtB(member.berrys)} ฿`} detail="prime publique" color="#F2C94C" />
                  <StatTile label="Position" value={`#${member.rank}`} detail={`/ ${member.total}`} color="#8AA8FF" tone="blue" />
                </div>

                <section className="profile-progress-card">
                  {nextRank ? (
                    <>
                      <div className="profile-progress-top">
                        <span>Progression vers {nextRank.rang}</span>
                        <strong>{nextRank.min}h</strong>
                      </div>
                      <Progress value={hours - rank.min} max={nextRank.min - rank.min} color={nextRank.color} />
                      <div className="profile-progress-bottom">
                        <span>{rank.rang} depuis {rank.min}h</span>
                        <strong>{remaining.toFixed(1)}h restantes</strong>
                      </div>
                    </>
                  ) : (
                    <div className="profile-progress-top">
                      <span>Rang maximum atteint</span>
                      <strong>Grand Line conquise</strong>
                    </div>
                  )}
                </section>

                <div className="profile-actions">
                  <button type="button" onClick={copyLink}>{copied ? 'Lien copie' : 'Partager le profil'}</button>
                  <a href="https://discord.gg/v3Ddhtbz" target="_blank" rel="noopener noreferrer">Ouvrir Discord</a>
                </div>
              </div>
            </section>

            <nav className="profile-tabs" aria-label="Sections du profil">
              {TABS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={tab === item.key ? 'active' : ''}
                  onClick={() => setTab(item.key)}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </nav>

            <section className="profile-content">
              {tab === 'stats' && (
                <div className="profile-panel-grid">
                  <article className="profile-panel">
                    <div className="profile-panel-title">Identite</div>
                    {[
                      ['Pseudo', displayName],
                      ['Discord ID', member.uid],
                      ['Rang actuel', `${rank.emoji} ${rank.rang}`],
                      ['Position', `#${member.rank} / ${member.total}`],
                    ].map(([label, value]) => (
                      <div className="profile-list-row" key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </article>

                  <article className="profile-panel">
                    <div className="profile-panel-title">Tresor</div>
                    <StatTile label="Solde" value={`${fmtNum(wallet)} ฿`} detail="wallet boutique" color="#F2C94C" />
                    <div className="profile-list-row">
                      <span>Inventaire</span>
                      <strong>{shopData?.inventory?.length || 0} objets</strong>
                    </div>
                    <div className="profile-list-row">
                      <span>Achats recents</span>
                      <strong>{shopData?.transactions?.length || 0}</strong>
                    </div>
                  </article>

                  <article className="profile-panel">
                    <div className="profile-panel-title">Rangs debloques</div>
                    <div className="profile-rank-list">
                      {RANK_MAP.slice().reverse().map((item) => {
                        const active = hours >= item.min
                        return (
                          <div
                            className="profile-rank-step"
                            key={item.rang}
                            style={{ '--accent': item.color, '--active': active ? 1 : .34 }}
                          >
                            <i>{item.emoji}</i>
                            <div>
                              <strong>{item.rang}</strong>
                              <span>{item.min}h requis</span>
                            </div>
                            <b>{active ? '✓' : ''}</b>
                          </div>
                        )
                      })}
                    </div>
                  </article>
                </div>
              )}

              {tab === 'inventaire' && (
                shopData?.inventory?.length ? (
                  <div className="profile-item-grid">
                    {shopData.inventory.map((item, index) => <InventoryCard key={`${item.item_id || 'item'}-${index}`} item={item} />)}
                  </div>
                ) : (
                  <EmptyState icon="◇" title="Inventaire vide" text="Aucun objet boutique pour ce pirate." />
                )
              )}

              {tab === 'historique' && (
                shopData?.transactions?.length ? (
                  <div>
                    {shopData.transactions.map((tx, index) => <TransactionRow key={`${tx.id || 'tx'}-${index}`} tx={tx} />)}
                  </div>
                ) : (
                  <EmptyState icon="≡" title="Aucune transaction" text="L'historique d'achats est vide." />
                )
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
