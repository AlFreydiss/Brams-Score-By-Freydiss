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

function CountUp({ value, decimals = 0, suffix = '' }) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const target = Number(value || 0)
    let frame = 0
    const total = 54
    const tick = () => {
      frame += 1
      const eased = 1 - Math.pow(1 - frame / total, 3)
      setCurrent(target * eased)
      if (frame < total) requestAnimationFrame(tick)
    }
    setCurrent(0)
    requestAnimationFrame(tick)
  }, [value])

  return `${current.toFixed(decimals)}${suffix}`
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
      <b aria-hidden="true" />
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
      <span className="profile-progress-ship" style={{ left: `${pct}%` }} />
      <div style={{ width: `${pct}%`, '--accent': color }} />
    </div>
  )
}

function WantedPoster({ member, rank, hours }) {
  const bounty = Number.parseInt(member.berrys || 0, 10)
  return (
    <aside className="profile-poster" style={{ '--accent': rank.color }}>
      <div className="profile-burn burn-a" />
      <div className="profile-burn burn-b" />
      <div className="profile-wax">B</div>
      <div className="profile-poster-rank">#{member.rank || '-'}</div>
      <div className="profile-poster-top">Profil membre</div>
      <div className="profile-poster-title">Carte joueur</div>
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
        <div className="profile-bounty">
          {Array.from({ length: 7 }).map((_, index) => <i key={index} style={{ '--i': index }} />)}
          <span>Prime</span>
          <strong>{fmtB(bounty)} ฿</strong>
        </div>
        <div>
          <span>Vocal</span>
          <strong><CountUp value={hours} decimals={1} suffix="h" /></strong>
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
  const [immersive, setImmersive] = useState(false)

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
    <div className={`profile-shell ${immersive ? 'profile-immersive' : ''}`} style={{ '--rank': rank.color }}>
      {!immersive && <Navbar />}
      <div className="profile-atmosphere" aria-hidden="true">
        <span className="fog fog-a" />
        <span className="fog fog-b" />
        <span className="wave wave-a" />
        <span className="wave wave-b" />
        {Array.from({ length: 18 }).map((_, index) => <i key={index} style={{ '--i': index }} />)}
      </div>
      <style>{`
        @keyframes profileRise {
          from { opacity: 0; transform: translateY(18px) scale(.985); filter: blur(8px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes profileDrift {
          0%, 100% { transform: translate3d(-2%, 0, 0) rotate(-1deg); opacity: .34; }
          50% { transform: translate3d(3%, -2%, 0) rotate(1deg); opacity: .58; }
        }
        @keyframes profileWave {
          from { transform: translateX(-8%) skewX(-8deg); }
          to { transform: translateX(8%) skewX(-8deg); }
        }
        @keyframes profileSpark {
          0% { transform: translateY(0) scale(.55); opacity: 0; }
          16% { opacity: .9; }
          100% { transform: translateY(-86vh) scale(1.08); opacity: 0; }
        }
        @keyframes profileCoin {
          0% { transform: translateY(-12px) rotate(0deg); opacity: 0; }
          18% { opacity: 1; }
          100% { transform: translateY(86px) rotate(460deg); opacity: 0; }
        }
        @keyframes profilePulse {
          0%, 100% { box-shadow: 0 0 0 rgba(242, 201, 76, 0); }
          50% { box-shadow: 0 0 34px rgba(242, 201, 76, .35); }
        }
        @keyframes profileRankAura {
          0%, 100% { box-shadow: 0 0 18px color-mix(in srgb, var(--rank) 24%, transparent); }
          50% { box-shadow: 0 0 38px color-mix(in srgb, var(--rank) 52%, transparent); }
        }
        @keyframes profileBoat {
          0%, 100% { transform: translate(-50%, -62%) rotate(-4deg); }
          50% { transform: translate(-50%, -82%) rotate(5deg); }
        }
        @keyframes profileGoldTrail {
          from { transform: translateX(-120%); opacity: 0; }
          35% { opacity: 1; }
          to { transform: translateX(120%); opacity: 0; }
        }
        @keyframes profileSeal {
          0%, 100% { transform: rotate(-10deg) scale(1); filter: brightness(1); }
          50% { transform: rotate(-7deg) scale(1.04); filter: brightness(1.18); }
        }
        @keyframes profileSoftScan {
          from { transform: translateX(-45%); opacity: 0; }
          35% { opacity: .8; }
          to { transform: translateX(45%); opacity: 0; }
        }
        .profile-shell {
          min-height: 100vh;
          color: #f3ead7;
          font-family: var(--body), Inter, system-ui, sans-serif;
          background:
            radial-gradient(circle at 18% 8%, color-mix(in srgb, var(--rank) 28%, transparent), transparent 28rem),
            radial-gradient(circle at 90% 20%, rgba(86, 26, 128, .22), transparent 32rem),
            radial-gradient(circle at 50% 130%, rgba(116, 12, 22, .18), transparent 38rem),
            linear-gradient(135deg, #030303 0%, #100709 42%, #05070b 100%);
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
        .profile-atmosphere {
          position: fixed;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }
        .profile-atmosphere .fog {
          position: absolute;
          width: 62vw;
          height: 28vh;
          border-radius: 999px;
          background: radial-gradient(ellipse, rgba(156, 120, 255, .13), transparent 66%);
          filter: blur(20px);
          animation: profileDrift 11s ease-in-out infinite;
        }
        .fog-a { left: -12vw; top: 20vh; }
        .fog-b { right: -18vw; top: 50vh; animation-delay: -4s; }
        .profile-atmosphere .wave {
          position: absolute;
          left: -10%;
          right: -10%;
          height: 120px;
          opacity: .12;
          background: repeating-linear-gradient(100deg, transparent 0 38px, rgba(128, 180, 255, .36) 39px 41px, transparent 42px 80px);
          filter: blur(.5px);
          animation: profileWave 9s ease-in-out infinite alternate;
        }
        .wave-a { bottom: 14%; }
        .wave-b { bottom: 7%; animation-delay: -2s; opacity: .08; }
        .profile-atmosphere i {
          position: absolute;
          left: calc((var(--i) * 5.7%) + 2%);
          bottom: -12px;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #f2c94c;
          box-shadow: 0 0 12px #f2c94c;
          animation: profileSpark calc(7s + (var(--i) * .35s)) linear infinite;
          animation-delay: calc(var(--i) * -.52s);
        }
        .profile-wrap {
          position: relative;
          z-index: 1;
          width: min(1200px, calc(100% - 32px));
          margin: 0 auto;
          padding: 64px 0 64px;
          animation: profileRise .72s cubic-bezier(.22,1,.36,1) both;
        }
        .profile-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }
        .profile-title-block { display: none; }
        .profile-title-block span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 16px;
          border-radius: 999px;
          background: rgba(212,160,23,.1);
          border: 1px solid rgba(212,160,23,.26);
          color: #d4a017;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .28em;
          text-transform: uppercase;
        }
        .profile-title-block h2 {
          margin: 13px 0 8px;
          font-family: var(--display), Syne, system-ui, sans-serif;
          font-weight: 900;
          font-size: clamp(34px, 5.8vw, 66px);
          line-height: .92;
          color: transparent;
          background: linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,.82) 46%, #d4a017 100%);
          -webkit-background-clip: text;
          background-clip: text;
        }
        .profile-title-block p {
          max-width: 560px;
          margin: 0 auto;
          color: rgba(255,255,255,.42);
          font-size: 14px;
          line-height: 1.65;
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
          transition: border-color .2s, color .2s, box-shadow .2s, transform .2s;
        }
        .profile-back:hover {
          border-color: rgba(242, 201, 76, .55);
          color: #ffe5a0;
          transform: translateY(-1px);
          box-shadow: 0 0 28px rgba(242, 201, 76, .14);
        }
        .profile-hero-shell {
          position: relative;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.09);
          border-top-color: color-mix(in srgb, var(--rank) 34%, rgba(255,255,255,.08));
          background:
            radial-gradient(circle at 18% 20%, color-mix(in srgb, var(--rank) 12%, transparent), transparent 20rem),
            linear-gradient(145deg, rgba(255,255,255,.04), rgba(7,8,11,.86));
          box-shadow: 0 22px 70px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.055);
          overflow: hidden;
        }
        .profile-hero-shell::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          display: none;
        }
        .profile-hero-shell::after {
          content: "";
          position: absolute;
          left: 18px;
          right: 18px;
          top: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--rank) 64%, #f2c94c), rgba(242,201,76,.72), transparent);
          opacity: .45;
        }
        .profile-hero {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 300px minmax(0, 1fr);
          gap: 14px;
          align-items: stretch;
        }
        .profile-poster {
          position: relative;
          min-height: 442px;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid color-mix(in srgb, var(--accent) 34%, rgba(255,255,255,.08));
          background:
            radial-gradient(circle at 80% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 10rem),
            linear-gradient(180deg, rgba(18,18,21,.94), rgba(8,9,12,.98));
          box-shadow: 0 18px 50px rgba(0,0,0,.34);
          overflow: hidden;
          transition: transform .24s ease, box-shadow .24s ease, border-color .24s ease;
          transform-style: preserve-3d;
        }
        .profile-poster::before {
          content: "";
          position: absolute;
          inset: 0;
          opacity: .35;
          background: linear-gradient(90deg, var(--accent), transparent);
          height: 3px;
          inset: 0 0 auto;
          pointer-events: none;
        }
        .profile-poster:hover,
        .profile-main-card:hover,
        .profile-panel:hover,
        .profile-item:hover,
        .profile-stat:hover {
          transform: translateY(-3px);
          border-color: color-mix(in srgb, var(--rank) 46%, rgba(255,255,255,.1));
          box-shadow: 0 18px 54px rgba(0,0,0,.38), 0 0 28px color-mix(in srgb, var(--rank) 12%, transparent);
        }
        .profile-burn {
          display: none;
        }
        .burn-a { left: -34px; top: -26px; }
        .burn-b { right: -38px; bottom: -28px; }
        .profile-wax {
          display: none;
        }
        .profile-poster::after {
          content: "";
          position: absolute;
          inset: 8px;
          border: 1px solid rgba(255,255,255,.055);
          border-radius: 10px;
          pointer-events: none;
        }
        .profile-poster-rank {
          position: absolute;
          top: 18px;
          right: 18px;
          z-index: 2;
          padding: 5px 8px;
          border-radius: 6px;
          background: rgba(0,0,0,.35);
          color: var(--accent);
          font-size: 12px;
          font-weight: 900;
        }
        .profile-poster-top {
          text-align: center;
          text-transform: uppercase;
          letter-spacing: .22em;
          font-size: 9px;
          font-weight: 900;
          color: rgba(255,255,255,.42);
        }
        .profile-poster-title {
          margin-top: 8px;
          text-align: center;
          font-family: var(--display), Syne, system-ui, sans-serif;
          font-size: 24px;
          font-weight: 900;
          line-height: .95;
          letter-spacing: .02em;
          text-transform: uppercase;
          color: #fff;
          text-shadow: none;
        }
        .profile-poster-photo {
          width: min(190px, 84%);
          aspect-ratio: 1;
          margin: 18px auto 16px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid color-mix(in srgb, var(--accent) 52%, rgba(255,255,255,.12));
          background: rgba(255,255,255,.05);
          display: grid;
          place-items: center;
          box-shadow: inset 0 0 22px rgba(0,0,0,.45), 0 14px 28px rgba(0,0,0,.24);
        }
        .profile-poster-photo img { width: 100%; height: 100%; object-fit: cover; }
        .profile-poster:hover .profile-poster-photo img { transform: scale(1.045); }
        .profile-poster-photo img { transition: transform .35s ease; }
        .profile-poster-photo span { font-size: 72px; }
        .profile-poster-name {
          text-align: center;
          font-family: var(--display), Syne, system-ui, sans-serif;
          color: #fff4d8;
          font-size: 22px;
          font-weight: 900;
          line-height: 1.08;
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
          position: relative;
          padding: 12px 10px;
          border-radius: 7px;
          background: rgba(0,0,0,.28);
          border: 1px solid rgba(255,255,255,.06);
          text-align: center;
        }
        .profile-bounty {
          overflow: hidden;
          cursor: crosshair;
        }
        .profile-bounty i {
          position: absolute;
          left: calc(10% + var(--i) * 12%);
          top: -12px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: radial-gradient(circle at 34% 34%, #fff3a9, #f2c94c 48%, #9b6d13);
          opacity: 0;
        }
        .profile-bounty:hover {
          animation: profilePulse 1.1s ease-in-out infinite;
        }
        .profile-bounty:hover i {
          animation: profileCoin .9s ease-in infinite;
          animation-delay: calc(var(--i) * .08s);
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
          font-family: var(--display), Syne, system-ui, sans-serif;
        }
        .profile-main-card {
          position: relative;
          min-height: 442px;
          padding: clamp(22px, 2.8vw, 32px);
          border-radius: 12px;
          background:
            linear-gradient(135deg, rgba(255,255,255,.075), transparent 28%),
            linear-gradient(180deg, rgba(19,18,22,.86), rgba(10,9,10,.96));
          border: 1px solid rgba(255,255,255,.08);
          box-shadow: 0 18px 58px rgba(0,0,0,.32);
          overflow: hidden;
          backdrop-filter: blur(16px);
          transition: transform .24s ease, box-shadow .24s ease, border-color .24s ease;
        }
        .profile-main-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 74% 10%, color-mix(in srgb, var(--rank) 26%, transparent), transparent 18rem),
            linear-gradient(115deg, transparent 0 38%, rgba(242, 201, 76, .1) 39%, transparent 40% 100%);
          pointer-events: none;
        }
        .profile-main-card::after {
          content: "";
          position: absolute;
          inset: 18px;
          opacity: .13;
          background:
            radial-gradient(circle at 50% 50%, transparent 0 22%, rgba(242,201,76,.34) 23% 24%, transparent 25%),
            conic-gradient(from 32deg at 50% 50%, transparent 0 12deg, rgba(242,201,76,.34) 13deg 15deg, transparent 16deg 58deg, rgba(166,108,255,.24) 59deg 61deg, transparent 62deg),
            repeating-linear-gradient(0deg, rgba(255,255,255,.1) 0 1px, transparent 1px 32px),
            repeating-linear-gradient(90deg, rgba(255,255,255,.08) 0 1px, transparent 1px 32px);
          border-radius: 8px;
          mask-image: radial-gradient(circle at 70% 24%, black, transparent 68%);
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
        .profile-rank-badge {
          position: relative;
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0 11px;
          border-radius: 999px;
          background:
            linear-gradient(135deg, color-mix(in srgb, var(--rank) 24%, transparent), rgba(255,255,255,.04)),
            rgba(0,0,0,.22);
          border: 1px solid color-mix(in srgb, var(--rank) 48%, rgba(255,255,255,.08));
          color: #fff2d2;
          animation: profileRankAura 2.8s ease-in-out infinite;
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
          color: transparent;
          font-family: var(--display), Syne, system-ui, sans-serif;
          font-size: clamp(38px, 5.5vw, 64px);
          font-weight: 900;
          line-height: .94;
          letter-spacing: -0.02em;
          max-width: 760px;
          overflow-wrap: anywhere;
          background: linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,.86) 42%, color-mix(in srgb, var(--rank) 74%, #d4a017) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          filter: drop-shadow(0 0 18px color-mix(in srgb, var(--rank) 18%, transparent));
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
          margin-top: 24px;
        }
        .profile-stat {
          position: relative;
          overflow: hidden;
          min-height: 122px;
          padding: 18px;
          border-radius: 12px;
          border: 1px solid color-mix(in srgb, var(--accent) 22%, rgba(255,255,255,.075));
          border-top: 3px solid color-mix(in srgb, var(--accent) 74%, rgba(255,255,255,.12));
          background:
            radial-gradient(circle at 90% 10%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 7rem),
            linear-gradient(145deg, color-mix(in srgb, var(--accent) 8%, transparent), rgba(255,255,255,.026));
        }
        .profile-stat b {
          position: absolute;
          right: 14px;
          top: 12px;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: color-mix(in srgb, var(--accent) 14%, transparent);
          border: 1px solid color-mix(in srgb, var(--accent) 26%, transparent);
        }
        .profile-stat::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-120%);
          background: linear-gradient(105deg, transparent, color-mix(in srgb, var(--accent) 22%, transparent), transparent);
          transition: transform .55s ease;
        }
        .profile-stat:hover::after {
          transform: translateX(120%);
        }
        .profile-stat strong {
          display: block;
          margin: 12px 0 5px;
          color: var(--accent);
          font-size: clamp(28px, 4vw, 40px);
          line-height: .9;
          font-weight: 950;
          letter-spacing: 0;
          font-family: var(--display), Syne, system-ui, sans-serif;
        }
        .profile-stat small { display: block; text-transform: none; letter-spacing: 0; }
        .profile-progress-card {
          margin-top: 14px;
          padding: 20px;
          border-radius: 12px;
          background:
            radial-gradient(circle at 88% 20%, color-mix(in srgb, var(--rank) 12%, transparent), transparent 12rem),
            rgba(0,0,0,.28);
          border: 1px solid rgba(255,255,255,.085);
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
          position: relative;
          height: 13px;
          margin-top: 15px;
          overflow: visible;
          border-radius: 999px;
          background: rgba(255,255,255,.07);
        }
        .profile-progress div {
          position: relative;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 62%, #fff), var(--accent));
          box-shadow: 0 0 24px color-mix(in srgb, var(--accent) 45%, transparent);
          transition: width 1.25s cubic-bezier(.22,1,.36,1);
          overflow: hidden;
        }
        .profile-progress div::after {
          content: "";
          position: absolute;
          right: -10px;
          top: 50%;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          transform: translateY(-50%);
          background: radial-gradient(circle, #fff8bd 0 20%, #f2c94c 35%, transparent 70%);
          box-shadow: 0 0 26px #f2c94c;
        }
        .profile-progress div::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.75), transparent);
          animation: profileGoldTrail 2.4s ease-in-out infinite;
        }
        .profile-progress-ship {
          position: absolute;
          z-index: 3;
          top: 50%;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: #f2c94c;
          border: 3px solid rgba(8,9,12,.95);
          filter: drop-shadow(0 0 10px rgba(242,201,76,.55));
          animation: profileBoat 2.2s ease-in-out infinite;
          transition: left 1.25s cubic-bezier(.22,1,.36,1);
        }
        .profile-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 18px;
        }
        .profile-actions button,
        .profile-actions a {
          height: 46px;
          border-radius: 11px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.09);
          background: rgba(255,255,255,.045);
          color: rgba(255,244,216,.78);
          font-weight: 900;
          font-size: 13px;
          text-decoration: none;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform .2s, border-color .2s, box-shadow .2s;
        }
        .profile-actions button:hover,
        .profile-actions a:hover {
          transform: translateY(-2px);
          border-color: rgba(242, 201, 76, .42);
          box-shadow: 0 0 32px rgba(242, 201, 76, .14);
        }
        .profile-actions a {
          color: #9db7ff;
          border-color: rgba(90, 120, 255, .28);
          background: rgba(90, 120, 255, .1);
        }
        .profile-actions a::before {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-110%);
          background: linear-gradient(100deg, transparent, rgba(255,255,255,.24), transparent);
          transition: transform .55s ease;
        }
        .profile-actions a::after {
          content: "";
          position: absolute;
          left: -12%;
          right: -12%;
          bottom: -22px;
          height: 38px;
          opacity: .42;
          background: radial-gradient(ellipse at center, rgba(138,168,255,.72), transparent 68%);
          transform: translateX(-18%);
          transition: transform .55s ease, opacity .2s ease;
        }
        .profile-actions a:hover::before {
          transform: translateX(110%);
        }
        .profile-actions a:hover::after {
          transform: translateX(18%);
          opacity: .78;
        }
        .profile-mode {
          height: 36px;
          padding: 0 18px;
          border-radius: 999px;
          border: 1px solid rgba(123,0,255,.55);
          background: linear-gradient(135deg, rgba(123,0,255,.25), rgba(75,0,204,.18));
          color: #d6c2ff;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          letter-spacing: .04em;
          box-shadow: 0 0 14px rgba(123,0,255,.3);
          transition: box-shadow .25s, border-color .25s, transform .2s;
        }
        .profile-mode:hover {
          border-color: rgba(155,48,255,.9);
          box-shadow: 0 0 28px rgba(123,0,255,.65);
          transform: translateY(-1px);
          color: #fff;
        }
        .profile-tabs {
          display: flex;
          position: relative;
          z-index: 1;
          gap: 7px;
          margin: 14px auto 0;
          padding: 7px;
          width: max-content;
          max-width: 100%;
          border-radius: 999px;
          background: rgba(0,0,0,.34);
          border: 1px solid rgba(255,255,255,.09);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.055);
        }
        .profile-tabs button {
          height: 38px;
          padding: 0 18px;
          border: 1px solid transparent;
          border-radius: 999px;
          background: transparent;
          color: rgba(235, 207, 157, .5);
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          transition: color .18s, border-color .18s, background .18s, box-shadow .18s;
        }
        .profile-tabs button:hover {
          color: rgba(255,255,255,.78);
          border-color: rgba(255,255,255,.12);
          background: rgba(255,255,255,.035);
        }
        .profile-tabs button.active {
          border-color: color-mix(in srgb, var(--rank) 46%, rgba(255,255,255,.1));
          background: color-mix(in srgb, var(--rank) 16%, rgba(255,255,255,.045));
          color: #fff2d4;
          box-shadow: 0 0 22px color-mix(in srgb, var(--rank) 16%, transparent);
        }
        .profile-content {
          margin-top: 18px;
        }
        .profile-panel-grid {
          display: grid;
          grid-template-columns: 1.02fr .98fr 1.12fr;
          gap: 14px;
        }
        .profile-panel,
        .profile-item,
        .profile-transaction {
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.085);
          background:
            linear-gradient(145deg, rgba(255,255,255,.045), rgba(7,8,11,.78));
        }
        .profile-panel {
          position: relative;
          overflow: hidden;
          padding: 18px;
          box-shadow: 0 12px 38px rgba(0,0,0,.22);
        }
        .profile-panel::before,
        .profile-item::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--rank), rgba(242,201,76,.55), transparent);
          opacity: .72;
        }
        .profile-panel-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          color: #d8a84b;
          font-family: var(--display), Syne, system-ui, sans-serif;
          font-weight: 900;
        }
        .profile-panel-title::before {
          content: "";
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 14px currentColor;
        }
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
          padding: 10px;
          border-radius: 10px;
          background:
            linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), rgba(0,0,0,.2));
          border: 1px solid color-mix(in srgb, var(--accent) 16%, transparent);
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
          position: relative;
          overflow: hidden;
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
        .profile-immersive .profile-wrap {
          width: min(1280px, calc(100% - 28px));
          padding-top: 34px;
        }
        .profile-immersive .profile-back,
        .profile-immersive .profile-tabs,
        .profile-immersive .profile-content {
          display: none;
        }
        @media (max-width: 920px) {
          .profile-hero { grid-template-columns: 1fr; }
          .profile-hero-shell { padding: 12px; }
          .profile-poster { min-height: auto; }
          .profile-panel-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 620px) {
          .profile-wrap { width: min(100% - 22px, 1180px); padding-top: 68px; }
          .profile-topbar { align-items: flex-start; }
          .profile-title-block { text-align: left; }
          .profile-title-block span { letter-spacing: .18em; }
          .profile-main-card { padding: 18px; }
          .profile-stat-grid,
          .profile-actions { grid-template-columns: 1fr; }
          .profile-tabs { width: 100%; overflow-x: auto; justify-content: flex-start; border-radius: 14px; }
          .profile-tabs button { white-space: nowrap; }
          .profile-head h1 { font-size: clamp(38px, 18vw, 60px); }
        }
      `}</style>

      <main className="profile-wrap">
        <div className="profile-topbar">
          <button className="profile-back" type="button" onClick={() => navigate(-1)}>← Retour</button>
          <button className="profile-mode" type="button" onClick={() => navigate('/profil-yonkou')}>
            ⚡ Expérience 3D
          </button>
        </div>

        {loading && (
          <EmptyState icon="⌛" title="Chargement du profil" text="Les donnees du pirate arrivent." />
        )}

        {!loading && !member && (
          <EmptyState icon="☠" title="Pirate introuvable" text="Ce membre n'est pas dans le classement." />
        )}

        {!loading && member && (
          <>
            <header className="profile-title-block">
              <span>Brams • Fiche pirate</span>
              <h2>Profil Wanted</h2>
              <p>Carte personnelle, prestige vocal, prime publique et progression vers le prochain rang.</p>
            </header>

            <div className="profile-hero-shell">
              <section className="profile-hero">
                <WantedPoster member={member} rank={rank} hours={hours} />

                <div className="profile-main-card">
                  <header className="profile-head">
                    <div className="profile-kicker">
                      <span className="profile-rank-badge">{rank.emoji} {rank.rang} #{member.rank}</span>
                      {isOwnProfile && <span className="profile-own">Mon profil</span>}
                    </div>
                    <h1>{displayName}</h1>
                    <p className="profile-sub">
                      {rank.rang} <strong>#{member.rank} mondial</strong> sur {member.total} nakamas
                    </p>
                  </header>

                  <div className="profile-stat-grid">
                    <StatTile label="Vocal" value={<CountUp value={hours} decimals={1} suffix="h" />} detail="sur 7 jours" color={rank.color} tone="rank" />
                    <StatTile label="Berrys" value={<><CountUp value={Number.parseInt(member.berrys || 0, 10) / 1000000} decimals={1} suffix="M" /> B</>} detail="prime publique" color="#F2C94C" />
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
              </div>

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
