import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { fetchBerryShopState, RARITY_STYLES } from '../lib/berryShop.js'
import { fetchMemberProfile } from '../lib/supabase.js'
import Navbar from './Navbar.jsx'

// ── Data ──────────────────────────────────────────────────────
const RANK_MAP = [
  { min: 150, rang: 'Roi des Pirates', emoji: '👑', color: '#FFD700', next: null },
  { min: 70,  rang: 'Yonkou',          emoji: '🌊', color: '#A66CFF', next: 150 },
  { min: 40,  rang: 'Amiral',          emoji: '🪖', color: '#F5C542', next: 70  },
  { min: 25,  rang: 'Shichibukai',     emoji: '⚔️', color: '#2ECC71', next: 40  },
  { min: 10,  rang: 'Pirate',          emoji: '🏴‍☠️', color: '#4F8CFF', next: 25  },
  { min: 0,   rang: 'Moussaillon',     emoji: '⚓',  color: '#8A8F9F', next: 10  },
]

const RANK_QUOTES = {
  'Roi des Pirates': 'Les mers du monde m\'appartiennent.',
  'Yonkou':          'Les mers tremblent là où je marche.',
  'Amiral':          'La justice forgée dans l\'acier ne faiblit jamais.',
  'Shichibukai':     'Entre ombre et lumière, je trace ma propre route.',
  'Pirate':          'La liberté se mérite par le sang et la sueur.',
  'Moussaillon':     'Chaque légende commence par un premier voyage.',
}

const TABS = [
  { key: 'stats',      label: 'Statistiques', icon: '▦' },
  { key: 'inventaire', label: 'Inventaire',   icon: '◇' },
  { key: 'historique', label: 'Historique',   icon: '≡' },
]

// ── Utils ─────────────────────────────────────────────────────
function getRank(hours) {
  return RANK_MAP.find(r => hours >= r.min) ?? RANK_MAP[RANK_MAP.length - 1]
}
function getNextRank(rank) {
  return rank.next != null ? RANK_MAP.find(r => r.min === rank.next) : null
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

// ── CountUp ───────────────────────────────────────────────────
function CountUp({ value, decimals = 0, suffix = '' }) {
  const [current, setCurrent] = useState(0)
  useEffect(() => {
    const target = Number(value || 0)
    let frame = 0
    const total = 60
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

// ── StatTile ──────────────────────────────────────────────────
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

// ── Progress ──────────────────────────────────────────────────
function Progress({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 100
  return (
    <div className="profile-progress">
      <span className="profile-progress-ship" style={{ left: `${pct}%` }} />
      <div style={{ width: `${pct}%`, '--accent': color }} />
    </div>
  )
}

// ── WantedPoster ──────────────────────────────────────────────
function WantedPoster({ member, rank, hours }) {
  const bounty = Number.parseInt(member.berrys || 0, 10)
  return (
    <aside className="profile-poster" style={{ '--accent': rank.color }}>
      <div className="profile-poster-shimmer" />
      <div className="profile-poster-rank">#{member.rank || '—'}</div>
      <div className="profile-poster-top">Profil membre</div>
      <div className="profile-poster-title">Carte joueur</div>
      <div className="profile-poster-photo">
        {member.avatar_url
          ? <img src={member.avatar_url} alt="" />
          : <span>{rank.emoji}</span>
        }
      </div>
      <div className="profile-poster-name">{member.username || `Pirate #${String(member.uid).slice(-4)}`}</div>
      <div className="profile-poster-role">{rank.emoji} {rank.rang}</div>
      <div className="profile-poster-line" />
      <div className="profile-poster-meta">
        <div className="profile-bounty">
          {Array.from({ length: 7 }).map((_, i) => <i key={i} style={{ '--i': i }} />)}
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

// ── InventoryCard ─────────────────────────────────────────────
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

// ── TransactionRow ────────────────────────────────────────────
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

// ── EmptyState ────────────────────────────────────────────────
function EmptyState({ icon, title, text }) {
  return (
    <div className="profile-empty">
      <div>{icon}</div>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
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
      .catch(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [discordId])

  const hours = Number.parseFloat(member?.vocal_h || 0)
  const rank = getRank(hours)
  const nextRank = getNextRank(rank)
  const remaining = nextRank ? Math.max(0, nextRank.min - hours) : 0
  const isOwnProfile = String(myId) === String(discordId)
  const displayName = member?.username || `Pirate #${String(member?.uid || '').slice(-4)}`
  const quote = RANK_QUOTES[rank.rang] || ''

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

      {/* ── Atmospheric background ── */}
      <div className="profile-atmosphere" aria-hidden="true">
        <span className="fog fog-a" />
        <span className="fog fog-b" />
        <span className="fog fog-c" />
        <span className="wave wave-a" />
        <span className="wave wave-b" />
        {Array.from({ length: 30 }).map((_, i) => <i key={i} style={{ '--i': i }} />)}
        {Array.from({ length: 26 }).map((_, i) => <b key={i} style={{ '--i': i }} />)}
        {Array.from({ length: 8 }).map((_, i) => <s key={i} style={{ '--i': i }} />)}
        {Array.from({ length: 5 }).map((_, i) => <em key={i} style={{ '--i': i }} />)}
        {Array.from({ length: 6 }).map((_, i) => <u key={i} style={{ '--i': i }} />)}
      </div>

      <style>{`
        /* ── Keyframes ─────────────────────────────────────────── */
        @keyframes profileRise {
          from { opacity:0; transform:translateY(22px) scale(.984); filter:blur(10px); }
          to   { opacity:1; transform:translateY(0) scale(1); filter:blur(0); }
        }
        @keyframes profileDrift {
          0%,100% { transform:translate3d(-2%,0,0) rotate(-1deg); opacity:.34; }
          50%     { transform:translate3d(3%,-2%,0) rotate(1deg);  opacity:.58; }
        }
        @keyframes profileWave {
          from { transform:translateX(-8%) skewX(-8deg); }
          to   { transform:translateX(8%)  skewX(-8deg); }
        }
        @keyframes profileSpark {
          0%   { transform:translateY(0) scale(.55); opacity:0; }
          16%  { opacity:.9; }
          100% { transform:translateY(-86vh) scale(1.08); opacity:0; }
        }
        @keyframes profileCoin {
          0%   { transform:translateY(-12px) rotate(0deg); opacity:0; }
          18%  { opacity:1; }
          100% { transform:translateY(86px) rotate(460deg); opacity:0; }
        }
        @keyframes profilePulse {
          0%,100% { box-shadow:0 0 0 rgba(242,201,76,0); }
          50%     { box-shadow:0 0 34px rgba(242,201,76,.35); }
        }
        @keyframes profileRankAura {
          0%,100% { box-shadow:0 0 18px color-mix(in srgb,var(--rank) 24%,transparent); }
          50%     { box-shadow:0 0 44px color-mix(in srgb,var(--rank) 56%,transparent); }
        }
        @keyframes profileBoat {
          0%,100% { transform:translate(-50%,-62%) rotate(-4deg); }
          50%     { transform:translate(-50%,-82%) rotate(5deg); }
        }
        @keyframes profileGoldTrail {
          from { transform:translateX(-120%); opacity:0; }
          35%  { opacity:1; }
          to   { transform:translateX(120%);  opacity:0; }
        }
        @keyframes profileShimmer {
          0%   { transform:translateX(-120%) rotate(20deg); opacity:0; }
          40%  { opacity:.7; }
          100% { transform:translateX(120%)  rotate(20deg); opacity:0; }
        }
        @keyframes profileRain {
          0%   { transform:translateY(-8%) rotate(-55deg); opacity:0; }
          7%   { opacity:.75; }
          88%  { opacity:.22; }
          100% { transform:translateY(112vh)  rotate(-55deg); opacity:0; }
        }
        @keyframes profileShoot {
          0%   { transform:translateX(-12vw) scaleX(.2); opacity:0; }
          5%   { opacity:.9; transform:translateX(-12vw) scaleX(1); }
          22%  { opacity:.45; }
          32%  { transform:translateX(118vw)  scaleX(1); opacity:0; }
          100% { transform:translateX(118vw)  scaleX(1); opacity:0; }
        }
        @keyframes profileHalo {
          0%   { transform:translate(0,0) scale(1); opacity:.42; }
          34%  { transform:translate(5%,-9%) scale(1.24); opacity:.76; }
          67%  { transform:translate(-5%,7%) scale(.87);  opacity:.34; }
          100% { transform:translate(3%,-4%) scale(1.07); opacity:.50; }
        }
        @keyframes profileRay {
          0%,100% { opacity:0; height:22%; }
          50%     { opacity:.38; height:52%; }
        }
        @keyframes profileBarFill {
          from { width:0; }
        }
        @keyframes profileFadeUp {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes profileStatPop {
          0%   { transform:scale(.9); opacity:0; }
          70%  { transform:scale(1.03); }
          100% { transform:scale(1); opacity:1; }
        }

        /* ── Shell ────────────────────────────────────────────── */
        .profile-shell {
          min-height:100vh;
          color:#f3ead7;
          font-family:var(--body,Inter,system-ui,sans-serif);
          background:
            radial-gradient(circle at 18% 8%,  color-mix(in srgb,var(--rank) 38%,transparent), transparent 34rem),
            radial-gradient(circle at 84% 14%, rgba(86,26,128,.32), transparent 38rem),
            radial-gradient(circle at 50% 130%,rgba(116,12,22,.24), transparent 46rem),
            radial-gradient(circle at 4%  90%, color-mix(in srgb,var(--rank) 18%,transparent), transparent 26rem),
            radial-gradient(circle at 62% 55%, rgba(60,8,100,.14), transparent 30rem),
            linear-gradient(135deg, #020202 0%, #090407 42%, #030509 100%);
          overflow-x:hidden;
        }
        .profile-shell::before {
          content:"";
          position:fixed; inset:0; pointer-events:none; opacity:.22;
          background-image:repeating-linear-gradient(
            -55deg, transparent, transparent 44px,
            rgba(255,255,255,.048) 44px, rgba(255,255,255,.048) 45px
          );
          mask-image:linear-gradient(to bottom,black 0%,transparent 88%);
        }

        /* ── Atmosphere ───────────────────────────────────────── */
        .profile-atmosphere { position:fixed; inset:0; overflow:hidden; pointer-events:none; z-index:0; }
        .profile-atmosphere .fog {
          position:absolute; width:62vw; height:28vh; border-radius:999px;
          background:radial-gradient(ellipse,rgba(156,120,255,.13),transparent 66%);
          filter:blur(20px); animation:profileDrift 11s ease-in-out infinite;
        }
        .fog-a { left:-12vw; top:20vh; }
        .fog-b { right:-18vw; top:50vh; animation-delay:-4s; }
        .fog-c { left:30vw; top:68vh; animation-delay:-8s; width:50vw; height:22vh; background:radial-gradient(ellipse,color-mix(in srgb,var(--rank) 10%,transparent),transparent 62%); }
        .profile-atmosphere .wave {
          position:absolute; left:-10%; right:-10%; height:120px; opacity:.12;
          background:repeating-linear-gradient(100deg,transparent 0 38px,rgba(128,180,255,.36) 39px 41px,transparent 42px 80px);
          filter:blur(.5px); animation:profileWave 9s ease-in-out infinite alternate;
        }
        .wave-a { bottom:14%; }
        .wave-b { bottom:7%; animation-delay:-2s; opacity:.08; }
        .profile-atmosphere i {
          position:absolute;
          left:calc((var(--i) * 3.5%) + 1%); bottom:-12px;
          width:calc(2px + (var(--i) % 3) * 1px); height:calc(2px + (var(--i) % 3) * 1px);
          border-radius:50%; background:#f2c94c; box-shadow:0 0 12px #f2c94c;
          animation:profileSpark calc(6s + (var(--i) * .3s)) linear infinite;
          animation-delay:calc(var(--i) * -.44s);
        }
        .profile-atmosphere b {
          position:absolute; left:calc((var(--i) * 4.0%) + 1%); top:-10%;
          width:1.5px; height:calc(52px + (var(--i) * 7px));
          background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--rank) 65%,rgba(166,108,255,.5)) 50%,transparent);
          animation:profileRain calc(3.4s + (var(--i) * 0.17s)) linear infinite;
          animation-delay:calc(var(--i) * -0.24s);
          transform:rotate(-55deg); transform-origin:top center;
          border-radius:2px; filter:blur(.4px);
        }
        .profile-atmosphere s {
          display:block; position:absolute;
          top:calc((var(--i) * 11.5%) + 2%); left:-12%;
          height:1.5px; width:calc(80px + (var(--i) * 38px)); border-radius:2px;
          background:linear-gradient(90deg,transparent,#f2c94c 28%,rgba(255,245,200,.7) 55%,transparent);
          animation:profileShoot calc(6s + (var(--i) * 2s)) linear infinite;
          animation-delay:calc(var(--i) * -2.1s);
          opacity:0; filter:blur(.5px); box-shadow:0 0 6px rgba(242,201,76,.35);
        }
        .profile-atmosphere em {
          display:block; position:absolute;
          width:calc(320px + (var(--i) * 85px)); height:calc(320px + (var(--i) * 85px));
          border-radius:50%;
          background:radial-gradient(ellipse,color-mix(in srgb,var(--rank) 22%,transparent),transparent 64%);
          filter:blur(40px);
          animation:profileHalo calc(16s + (var(--i) * 4.5s)) ease-in-out infinite alternate;
          animation-delay:calc(var(--i) * -5.5s);
          left:calc(var(--i) * 25% - 10%); top:calc(4% + (var(--i) * 22%));
          pointer-events:none;
        }
        .profile-atmosphere u {
          display:block; text-decoration:none; position:absolute;
          left:calc((var(--i) * 18%) + 3%); top:-5%;
          width:2px; height:35%;
          background:linear-gradient(180deg,color-mix(in srgb,var(--rank) 30%,transparent),transparent);
          opacity:0;
          animation:profileRay calc(10s + (var(--i) * 2.5s)) ease-in-out infinite;
          animation-delay:calc(var(--i) * -3s);
          transform:rotate(calc(-5deg + (var(--i) * 2deg)));
          filter:blur(4px); border-radius:4px;
        }

        /* ── Wrap ─────────────────────────────────────────────── */
        .profile-wrap {
          position:relative; z-index:1;
          width:min(1240px,calc(100% - 40px));
          margin:0 auto;
          padding:72px 0 80px;
          animation:profileRise .72s cubic-bezier(.22,1,.36,1) both;
        }

        /* ── Topbar ───────────────────────────────────────────── */
        .profile-topbar {
          display:flex; justify-content:space-between; align-items:center;
          gap:12px; margin-bottom:24px;
        }
        .profile-back {
          height:38px; padding:0 18px; border-radius:9px;
          border:1px solid rgba(230,180,80,.2); background:rgba(6,5,8,.72);
          color:rgba(236,208,150,.78); font-weight:800; font-size:12px;
          letter-spacing:.05em; cursor:pointer;
          transition:border-color .2s,color .2s,box-shadow .2s,transform .2s;
        }
        .profile-back:hover {
          border-color:rgba(242,201,76,.55); color:#ffe5a0;
          transform:translateY(-1px); box-shadow:0 0 28px rgba(242,201,76,.14);
        }
        .profile-mode {
          height:38px; padding:0 16px; border-radius:999px;
          border:1px solid rgba(166,108,255,.32); background:rgba(166,108,255,.1);
          color:#d6c2ff; font-size:12px; font-weight:900; cursor:pointer;
          transition:all .2s;
        }
        .profile-mode:hover { background:rgba(166,108,255,.18); border-color:rgba(166,108,255,.5); }

        /* ── Hero shell ───────────────────────────────────────── */
        .profile-hero-shell {
          position:relative; border-radius:20px;
          border:1px solid rgba(255,255,255,.08);
          border-top-color:color-mix(in srgb,var(--rank) 38%,rgba(255,255,255,.09));
          background:
            radial-gradient(circle at 16% 18%, color-mix(in srgb,var(--rank) 14%,transparent), transparent 22rem),
            radial-gradient(circle at 82% 80%, rgba(86,26,128,.18), transparent 20rem),
            linear-gradient(145deg,rgba(255,255,255,.045),rgba(6,7,10,.92));
          box-shadow:0 28px 90px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06);
          overflow:hidden;
        }
        .profile-hero-shell::after {
          content:"";
          position:absolute; left:24px; right:24px; top:0; height:3px;
          background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--rank) 68%,#f2c94c),rgba(242,201,76,.72),transparent);
          opacity:.55;
        }

        /* ── Hero (two-col) ───────────────────────────────────── */
        .profile-hero {
          position:relative; z-index:1;
          display:grid; grid-template-columns:310px minmax(0,1fr);
          gap:20px; align-items:stretch;
          padding:20px;
        }

        /* ── Wanted Poster ────────────────────────────────────── */
        .profile-poster {
          position:relative; min-height:540px; padding:24px;
          border-radius:14px;
          border:1px solid color-mix(in srgb,var(--accent) 36%,rgba(255,255,255,.08));
          background:
            radial-gradient(circle at 80% 0%,color-mix(in srgb,var(--accent) 12%,transparent),transparent 12rem),
            linear-gradient(180deg,rgba(14,13,18,.96),rgba(6,7,10,.98));
          box-shadow:0 20px 60px rgba(0,0,0,.38);
          overflow:hidden;
          transition:transform .24s ease,box-shadow .24s ease,border-color .24s ease;
        }
        .profile-poster::before {
          content:""; position:absolute; inset:0 0 auto; height:3px;
          background:linear-gradient(90deg,var(--accent),transparent);
          opacity:.4; pointer-events:none;
        }
        .profile-poster::after {
          content:""; position:absolute; inset:10px;
          border:1px solid rgba(255,255,255,.05); border-radius:11px; pointer-events:none;
        }
        .profile-poster-shimmer {
          position:absolute; inset:0; pointer-events:none; z-index:0;
          background:linear-gradient(115deg,transparent 0 35%,rgba(242,201,76,.055) 36%,transparent 37%);
          animation:profileShimmer 7s ease-in-out infinite;
        }
        .profile-poster:hover { transform:translateY(-4px); border-color:color-mix(in srgb,var(--accent) 55%,rgba(255,255,255,.1)); box-shadow:0 30px 80px rgba(0,0,0,.48),0 0 40px color-mix(in srgb,var(--accent) 16%,transparent); }
        .profile-poster-rank {
          position:absolute; top:20px; right:20px; z-index:2;
          padding:5px 9px; border-radius:7px;
          background:rgba(0,0,0,.4); color:var(--accent);
          font-size:13px; font-weight:900; letter-spacing:.04em;
        }
        .profile-poster-top {
          position:relative; z-index:1; text-align:center; text-transform:uppercase;
          letter-spacing:.22em; font-size:9px; font-weight:900; color:rgba(255,255,255,.36);
        }
        .profile-poster-title {
          position:relative; z-index:1; margin-top:10px; text-align:center;
          font-family:var(--display,Syne,system-ui,sans-serif);
          font-size:26px; font-weight:900; line-height:.94; letter-spacing:.02em;
          text-transform:uppercase; color:#fff;
        }
        .profile-poster-photo {
          position:relative; z-index:1;
          width:min(210px,84%); aspect-ratio:1;
          margin:20px auto 18px; border-radius:14px; overflow:hidden;
          border:1px solid color-mix(in srgb,var(--accent) 55%,rgba(255,255,255,.12));
          background:rgba(255,255,255,.04);
          display:grid; place-items:center;
          box-shadow:inset 0 0 28px rgba(0,0,0,.5), 0 16px 36px rgba(0,0,0,.28),
                     0 0 60px color-mix(in srgb,var(--accent) 18%,transparent);
          transition:box-shadow .3s;
        }
        .profile-poster:hover .profile-poster-photo { box-shadow:inset 0 0 28px rgba(0,0,0,.5),0 16px 36px rgba(0,0,0,.28),0 0 80px color-mix(in srgb,var(--accent) 30%,transparent); }
        .profile-poster-photo img { width:100%; height:100%; object-fit:cover; transition:transform .35s ease; }
        .profile-poster:hover .profile-poster-photo img { transform:scale(1.04); }
        .profile-poster-photo span { font-size:80px; }
        .profile-poster-name {
          position:relative; z-index:1; text-align:center;
          font-family:var(--display,Syne,system-ui,sans-serif);
          color:#fff4d8; font-size:22px; font-weight:900; line-height:1.1;
          overflow-wrap:anywhere;
        }
        .profile-poster-role {
          position:relative; z-index:1; margin-top:9px; text-align:center;
          color:var(--accent); font-size:13px; font-weight:900; letter-spacing:.04em;
        }
        .profile-poster-line {
          position:relative; z-index:1; height:1px; margin:20px 0;
          background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--accent) 62%,transparent),transparent);
        }
        .profile-poster-meta {
          position:relative; z-index:1;
          display:grid; grid-template-columns:1fr 1fr; gap:10px;
        }
        .profile-poster-meta div {
          position:relative; padding:14px 12px; border-radius:10px;
          background:rgba(0,0,0,.3); border:1px solid rgba(255,255,255,.07);
          text-align:center;
        }
        .profile-bounty { overflow:hidden; cursor:crosshair; }
        .profile-bounty i {
          position:absolute; left:calc(10% + var(--i) * 12%); top:-12px;
          width:8px; height:8px; border-radius:50%;
          background:radial-gradient(circle at 34% 34%,#fff3a9,#f2c94c 48%,#9b6d13); opacity:0;
        }
        .profile-bounty:hover { animation:profilePulse 1.1s ease-in-out infinite; }
        .profile-bounty:hover i { animation:profileCoin .9s ease-in infinite; animation-delay:calc(var(--i) * .08s); }
        .profile-poster-meta span,
        .profile-stat span,
        .profile-panel-title,
        .profile-item-top em,
        .profile-stat small { text-transform:uppercase; letter-spacing:.11em; font-size:10px; color:rgba(235,207,157,.52); font-weight:850; }
        .profile-poster-meta strong {
          display:block; margin-top:6px; font-size:20px;
          color:#f2ca57; font-weight:950;
          font-family:var(--display,Syne,system-ui,sans-serif);
        }

        /* ── Main card (right column) ─────────────────────────── */
        .profile-main-card {
          position:relative; min-height:540px;
          padding:clamp(26px,3vw,38px);
          border-radius:14px;
          background:
            linear-gradient(135deg,rgba(255,255,255,.06),transparent 28%),
            linear-gradient(180deg,rgba(14,13,18,.9),rgba(8,7,12,.97));
          border:1px solid rgba(255,255,255,.07);
          box-shadow:0 18px 60px rgba(0,0,0,.34);
          overflow:hidden;
          transition:transform .24s ease,box-shadow .24s ease,border-color .24s ease;
        }
        .profile-main-card::before {
          content:""; position:absolute; inset:0; pointer-events:none;
          background:
            radial-gradient(circle at 76% 8%,color-mix(in srgb,var(--rank) 28%,transparent),transparent 20rem),
            linear-gradient(115deg,transparent 0 36%,rgba(242,201,76,.09) 37%,transparent 38% 100%);
        }
        .profile-main-card::after {
          content:""; position:absolute; inset:20px; opacity:.1;
          background:
            radial-gradient(circle at 50% 50%,transparent 0 22%,rgba(242,201,76,.3) 23% 24%,transparent 25%),
            conic-gradient(from 32deg at 50% 50%,transparent 0 12deg,rgba(242,201,76,.3) 13deg 15deg,transparent 16deg 58deg,rgba(166,108,255,.2) 59deg 61deg,transparent 62deg),
            repeating-linear-gradient(0deg,rgba(255,255,255,.08) 0 1px,transparent 1px 32px),
            repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 1px,transparent 1px 32px);
          border-radius:10px;
          mask-image:radial-gradient(circle at 72% 22%,black,transparent 65%);
          pointer-events:none;
        }
        .profile-head,
        .profile-actions,
        .profile-stat-grid,
        .profile-progress-card,
        .profile-tabs,
        .profile-content { position:relative; z-index:1; }

        /* ── Kicker / badges ──────────────────────────────────── */
        .profile-kicker {
          display:flex; gap:9px; align-items:center; flex-wrap:wrap;
          margin-bottom:14px; color:var(--rank);
          text-transform:uppercase; letter-spacing:.16em;
          font-size:11px; font-weight:950;
        }
        .profile-rank-badge {
          position:relative;
          display:inline-flex; align-items:center;
          min-height:30px; padding:0 13px; border-radius:999px;
          background:linear-gradient(135deg,color-mix(in srgb,var(--rank) 26%,transparent),rgba(255,255,255,.04)),rgba(0,0,0,.24);
          border:1px solid color-mix(in srgb,var(--rank) 52%,rgba(255,255,255,.09));
          color:#fff2d2; animation:profileRankAura 2.8s ease-in-out infinite;
          font-size:11px; font-weight:900;
        }
        .profile-own {
          padding:5px 10px; border-radius:999px;
          background:rgba(79,140,255,.14); border:1px solid rgba(79,140,255,.32);
          color:#93b7ff; letter-spacing:.08em; font-size:11px;
        }

        /* ── H1 ───────────────────────────────────────────────── */
        .profile-head h1 {
          margin:0; color:transparent;
          font-family:var(--display,Syne,system-ui,sans-serif);
          font-size:clamp(40px,5.8vw,70px);
          font-weight:900; line-height:.92; letter-spacing:-0.02em;
          max-width:780px; overflow-wrap:anywhere;
          background:linear-gradient(135deg,#ffffff 0%,rgba(255,255,255,.86) 42%,color-mix(in srgb,var(--rank) 74%,#d4a017) 100%);
          -webkit-background-clip:text; background-clip:text;
          filter:drop-shadow(0 0 22px color-mix(in srgb,var(--rank) 20%,transparent));
        }
        .profile-quote {
          margin:14px 0 0; padding:0 0 0 12px;
          border-left:2px solid color-mix(in srgb,var(--rank) 50%,transparent);
          color:rgba(235,207,157,.55); font-size:13.5px;
          font-style:italic; line-height:1.5; max-width:480px;
        }
        .profile-sub {
          margin:14px 0 0; color:rgba(235,207,157,.58); font-size:14px;
        }
        .profile-sub strong { color:#fff0c3; }

        /* ── Stat grid ────────────────────────────────────────── */
        .profile-stat-grid {
          display:grid; grid-template-columns:repeat(3,minmax(0,1fr));
          gap:13px; margin-top:28px;
        }
        .profile-stat {
          position:relative; overflow:hidden; min-height:140px; padding:20px;
          border-radius:14px;
          border:1px solid color-mix(in srgb,var(--accent) 24%,rgba(255,255,255,.07));
          border-top:3px solid color-mix(in srgb,var(--accent) 78%,rgba(255,255,255,.12));
          background:
            radial-gradient(circle at 88% 10%,color-mix(in srgb,var(--accent) 16%,transparent),transparent 8rem),
            linear-gradient(145deg,color-mix(in srgb,var(--accent) 9%,transparent),rgba(255,255,255,.028));
          animation:profileStatPop .55s cubic-bezier(.22,1,.36,1) both;
        }
        .profile-stat b {
          position:absolute; right:15px; top:14px;
          width:36px; height:36px; border-radius:10px;
          background:color-mix(in srgb,var(--accent) 16%,transparent);
          border:1px solid color-mix(in srgb,var(--accent) 28%,transparent);
        }
        .profile-stat::after {
          content:""; position:absolute; inset:0;
          transform:translateX(-120%);
          background:linear-gradient(105deg,transparent,color-mix(in srgb,var(--accent) 24%,transparent),transparent);
          transition:transform .55s ease;
        }
        .profile-stat:hover::after { transform:translateX(120%); }
        .profile-stat:hover { transform:translateY(-4px); border-color:color-mix(in srgb,var(--rank) 50%,rgba(255,255,255,.1)); box-shadow:0 18px 54px rgba(0,0,0,.38),0 0 30px color-mix(in srgb,var(--rank) 14%,transparent); }
        .profile-stat strong {
          display:block; margin:14px 0 6px; color:var(--accent);
          font-size:clamp(30px,4.2vw,44px); line-height:.88;
          font-weight:950; font-family:var(--display,Syne,system-ui,sans-serif);
        }
        .profile-stat small { display:block; text-transform:none; letter-spacing:0; font-size:11px; }

        /* ── Progress card ────────────────────────────────────── */
        .profile-progress-card {
          margin-top:16px; padding:22px; border-radius:14px;
          background:
            radial-gradient(circle at 88% 20%,color-mix(in srgb,var(--rank) 14%,transparent),transparent 14rem),
            rgba(0,0,0,.32);
          border:1px solid rgba(255,255,255,.085);
        }
        .profile-progress-top,
        .profile-progress-bottom {
          display:flex; justify-content:space-between; gap:12px; align-items:center;
          color:rgba(235,207,157,.62); font-size:12px; font-weight:750;
        }
        .profile-progress-bottom { margin-top:10px; color:rgba(235,207,157,.46); }
        .profile-progress-bottom strong { color:var(--rank); }
        .profile-progress {
          position:relative; height:16px; margin-top:16px; overflow:visible;
          border-radius:999px; background:rgba(255,255,255,.07);
        }
        .profile-progress div {
          position:relative; height:100%; border-radius:inherit;
          background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 62%,#fff),var(--accent));
          box-shadow:0 0 28px color-mix(in srgb,var(--accent) 50%,transparent);
          transition:width 1.35s cubic-bezier(.22,1,.36,1);
          animation:profileBarFill .8s cubic-bezier(.22,1,.36,1) both;
        }
        .profile-progress div::after {
          content:""; position:absolute; right:-12px; top:50%;
          width:24px; height:24px; border-radius:50%; transform:translateY(-50%);
          background:radial-gradient(circle,#fff8bd 0 20%,#f2c94c 35%,transparent 70%);
          box-shadow:0 0 30px #f2c94c, 0 0 60px rgba(242,201,76,.4);
        }
        .profile-progress div::before {
          content:""; position:absolute; inset:0;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent);
          animation:profileGoldTrail 2.4s ease-in-out infinite;
        }
        .profile-progress-ship {
          position:absolute; z-index:3; top:50%;
          width:17px; height:17px; border-radius:50%;
          background:#f2c94c; border:3px solid rgba(6,7,10,.96);
          filter:drop-shadow(0 0 12px rgba(242,201,76,.6));
          animation:profileBoat 2.2s ease-in-out infinite;
          transition:left 1.35s cubic-bezier(.22,1,.36,1);
        }

        /* ── Actions ──────────────────────────────────────────── */
        .profile-actions {
          display:grid; grid-template-columns:1fr 1fr; gap:13px; margin-top:20px;
        }
        .profile-actions button,
        .profile-actions a {
          height:50px; border-radius:12px; display:grid; place-items:center;
          border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.05);
          color:rgba(255,244,216,.8); font-weight:900; font-size:13px;
          text-decoration:none; cursor:pointer; position:relative; overflow:hidden;
          transition:transform .2s,border-color .2s,box-shadow .2s;
          letter-spacing:.02em;
        }
        .profile-actions button:hover {
          transform:translateY(-2px);
          border-color:rgba(242,201,76,.45);
          box-shadow:0 0 36px rgba(242,201,76,.16);
        }
        .profile-actions a {
          color:#9db7ff;
          border-color:rgba(90,120,255,.3); background:rgba(90,120,255,.1);
        }
        .profile-actions a::before {
          content:""; position:absolute; inset:0; transform:translateX(-110%);
          background:linear-gradient(100deg,transparent,rgba(255,255,255,.24),transparent);
          transition:transform .55s ease;
        }
        .profile-actions a:hover::before { transform:translateX(110%); }
        .profile-actions a:hover {
          transform:translateY(-2px);
          border-color:rgba(90,120,255,.55);
          box-shadow:0 0 36px rgba(90,120,255,.22);
        }

        /* ── Mode button ──────────────────────────────────────── */
        .profile-mode { height:38px; padding:0 16px; border-radius:999px; border:1px solid rgba(166,108,255,.32); background:rgba(166,108,255,.1); color:#d6c2ff; font-size:12px; font-weight:900; cursor:pointer; transition:all .2s; }

        /* ── Tabs ─────────────────────────────────────────────── */
        .profile-tabs {
          display:flex; position:relative; z-index:1;
          gap:7px; margin:20px auto 0; padding:7px;
          width:max-content; max-width:100%; border-radius:999px;
          background:rgba(0,0,0,.38); border:1px solid rgba(255,255,255,.09);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.05);
        }
        .profile-tabs button {
          height:40px; padding:0 22px;
          border:1px solid transparent; border-radius:999px;
          background:transparent; color:rgba(235,207,157,.5);
          font-size:12px; font-weight:900; cursor:pointer;
          transition:color .18s,border-color .18s,background .18s,box-shadow .18s;
          letter-spacing:.04em;
        }
        .profile-tabs button:hover { color:rgba(255,255,255,.78); border-color:rgba(255,255,255,.12); background:rgba(255,255,255,.035); }
        .profile-tabs button.active {
          border-color:color-mix(in srgb,var(--rank) 50%,rgba(255,255,255,.12));
          background:color-mix(in srgb,var(--rank) 18%,rgba(255,255,255,.04));
          color:#fff2d4;
          box-shadow:0 0 28px color-mix(in srgb,var(--rank) 20%,transparent);
        }

        /* ── Content panels ───────────────────────────────────── */
        .profile-content { margin-top:20px; }
        .profile-panel-grid {
          display:grid; grid-template-columns:1.02fr .98fr 1.12fr;
          gap:16px;
        }
        .profile-panel,
        .profile-item,
        .profile-transaction {
          border-radius:16px; border:1px solid rgba(255,255,255,.085);
          background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(6,7,10,.82));
        }
        .profile-panel {
          position:relative; overflow:hidden; padding:22px;
          box-shadow:0 14px 42px rgba(0,0,0,.24);
          transition:transform .24s,box-shadow .24s,border-color .24s;
        }
        .profile-panel::before {
          content:""; position:absolute; left:0; right:0; top:0; height:3px;
          background:linear-gradient(90deg,var(--rank),rgba(242,201,76,.55),transparent);
          opacity:.72;
        }
        .profile-panel:hover { transform:translateY(-3px); border-color:color-mix(in srgb,var(--rank) 38%,rgba(255,255,255,.1)); box-shadow:0 20px 60px rgba(0,0,0,.36),0 0 32px color-mix(in srgb,var(--rank) 10%,transparent); }
        .profile-panel-title {
          display:flex; align-items:center; gap:9px; margin-bottom:16px;
          color:#d8a84b; font-family:var(--display,Syne,system-ui,sans-serif);
          font-weight:900; font-size:15px;
        }
        .profile-panel-title::before {
          content:""; width:8px; height:8px; border-radius:50%;
          background:currentColor; box-shadow:0 0 14px currentColor; flex-shrink:0;
        }
        .profile-list-row {
          display:flex; justify-content:space-between; gap:14px;
          padding:11px 0; border-bottom:1px solid rgba(255,255,255,.055);
        }
        .profile-list-row:last-child { border-bottom:none; padding-bottom:0; }
        .profile-list-row span { color:rgba(235,207,157,.5); font-size:11px; text-transform:uppercase; letter-spacing:.08em; font-weight:850; }
        .profile-list-row strong { color:#fff0c3; text-align:right; overflow-wrap:anywhere; font-size:13px; }

        /* ── Rank steps ───────────────────────────────────────── */
        .profile-rank-list { display:grid; gap:8px; }
        .profile-rank-step {
          display:grid; grid-template-columns:34px 1fr auto;
          align-items:center; gap:10px; padding:11px;
          border-radius:11px;
          background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 10%,transparent),rgba(0,0,0,.22));
          border:1px solid color-mix(in srgb,var(--accent) 17%,transparent);
          opacity:var(--active);
          transition:transform .2s, opacity .2s;
        }
        .profile-rank-step:hover { transform:translateX(3px); }
        .profile-rank-step i {
          width:32px; height:32px; border-radius:8px;
          display:grid; place-items:center;
          background:color-mix(in srgb,var(--accent) 16%,transparent);
          border:1px solid color-mix(in srgb,var(--accent) 30%,transparent);
          font-style:normal; font-size:16px;
        }
        .profile-rank-step strong { color:#fff0c3; font-size:12px; }
        .profile-rank-step span { display:block; color:rgba(235,207,157,.4); font-size:10px; }

        /* ── Inventory ────────────────────────────────────────── */
        .profile-item-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:13px; }
        .profile-item {
          min-height:144px; padding:18px; position:relative; overflow:hidden;
          background:
            radial-gradient(circle at 100% 0%,color-mix(in srgb,var(--accent) 15%,transparent),transparent 8rem),
            rgba(255,255,255,.04);
          transition:transform .2s,border-color .2s;
        }
        .profile-item::before {
          content:""; position:absolute; left:0; right:0; top:0; height:3px;
          background:linear-gradient(90deg,var(--accent),transparent); opacity:.4;
        }
        .profile-item:hover { transform:translateY(-3px); border-color:color-mix(in srgb,var(--rank) 40%,rgba(255,255,255,.1)); }
        .profile-item-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:26px; }
        .profile-item-top span {
          width:38px; height:38px; border-radius:10px; display:grid; place-items:center;
          background:color-mix(in srgb,var(--accent) 18%,transparent);
          color:var(--accent); font-weight:950;
        }
        .profile-item strong { display:block; color:#fff2d1; font-size:15px; }
        .profile-item small { display:block; margin-top:8px; color:rgba(235,207,157,.45); }

        /* ── Transactions ─────────────────────────────────────── */
        .profile-transaction {
          display:grid; grid-template-columns:46px 1fr auto;
          align-items:center; gap:13px; padding:13px;
          margin-bottom:9px;
        }
        .profile-transaction:hover { border-color:color-mix(in srgb,var(--rank) 30%,rgba(255,255,255,.09)); }
        .profile-transaction-icon {
          width:42px; height:42px; border-radius:11px; display:grid; place-items:center;
          color:var(--accent); background:color-mix(in srgb,var(--accent) 15%,transparent);
          font-weight:950;
        }
        .profile-transaction strong { display:block; color:#fff2d1; }
        .profile-transaction span { color:rgba(235,207,157,.45); font-size:12px; }
        .profile-transaction em { color:#f06969; font-style:normal; font-weight:950; }

        /* ── Empty ────────────────────────────────────────────── */
        .profile-empty {
          display:grid; place-items:center; min-height:240px;
          text-align:center; color:rgba(235,207,157,.48);
        }
        .profile-empty div { font-size:46px; color:var(--rank); }
        .profile-empty strong { margin-top:12px; color:#fff1ce; font-size:19px; }
        .profile-empty span { margin-top:7px; }

        /* ── Immersive ────────────────────────────────────────── */
        .profile-immersive .profile-wrap { width:min(1300px,calc(100% - 28px)); padding-top:34px; }
        .profile-immersive .profile-back,
        .profile-immersive .profile-tabs,
        .profile-immersive .profile-content { display:none; }

        /* ── Title block (hidden / for a11y) ─────────────────── */
        .profile-title-block { display:none; }

        /* ── Responsive ───────────────────────────────────────── */
        @media (max-width: 920px) {
          .profile-hero { grid-template-columns:1fr; }
          .profile-hero-shell { padding:0; }
          .profile-poster { min-height:auto; }
          .profile-panel-grid { grid-template-columns:1fr; }
        }
        @media (max-width: 620px) {
          .profile-wrap { width:min(100% - 22px,1180px); padding-top:68px; }
          .profile-topbar { align-items:flex-start; }
          .profile-main-card { padding:18px; }
          .profile-stat-grid,
          .profile-actions { grid-template-columns:1fr; }
          .profile-tabs { width:100%; overflow-x:auto; justify-content:flex-start; border-radius:14px; }
          .profile-tabs button { white-space:nowrap; }
          .profile-head h1 { font-size:clamp(38px,18vw,60px); }
        }
      `}</style>

      <main className="profile-wrap">
        {/* Topbar */}
        <div className="profile-topbar">
          <button className="profile-back" type="button" onClick={() => navigate(-1)}>← Retour</button>
          <button className="profile-mode" type="button" onClick={() => setImmersive(v => !v)}>
            {immersive ? 'Interface' : 'Full immersion'}
          </button>
        </div>

        {/* Loading */}
        {loading && <EmptyState icon="⌛" title="Chargement du profil" text="Les données du pirate arrivent." />}

        {!loading && !member && (
          <EmptyState icon="☠" title="Pirate introuvable" text="Ce membre n'est pas dans le classement." />
        )}

        {!loading && member && (
          <>
            {/* Hidden a11y block */}
            <header className="profile-title-block">
              <span>Brams • Fiche pirate</span>
              <h2>Profil Wanted</h2>
              <p>Carte personnelle, prestige vocal, prime publique et progression vers le prochain rang.</p>
            </header>

            {/* ── Hero shell ── */}
            <div className="profile-hero-shell">
              <section className="profile-hero">
                {/* Left: Wanted poster */}
                <WantedPoster member={member} rank={rank} hours={hours} />

                {/* Right: Main dashboard */}
                <div className="profile-main-card">
                  <header className="profile-head">
                    <div className="profile-kicker">
                      <span className="profile-rank-badge">{rank.emoji} {rank.rang} #{member.rank}</span>
                      {isOwnProfile && <span className="profile-own">Mon profil</span>}
                    </div>
                    <h1>{displayName}</h1>
                    {quote && <p className="profile-quote">{quote}</p>}
                    <p className="profile-sub">
                      {rank.rang} <strong>#{member.rank} mondial</strong> sur {member.total} nakamas
                    </p>
                  </header>

                  {/* Stat cards */}
                  <div className="profile-stat-grid">
                    <StatTile
                      label="Vocal" detail="sur 7 jours"
                      value={<><CountUp value={hours} decimals={1} suffix="h" /></>}
                      color={rank.color} tone="rank"
                    />
                    <StatTile
                      label="Berrys" detail="prime publique"
                      value={<><CountUp value={Number.parseInt(member.berrys || 0, 10) / 1000000} decimals={1} suffix="M" /> B</>}
                      color="#F2C94C"
                    />
                    <StatTile
                      label="Position" detail={`/ ${member.total}`}
                      value={`#${member.rank}`}
                      color="#8AA8FF" tone="blue"
                    />
                  </div>

                  {/* Progression */}
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
                        <strong>Grand Line conquise 👑</strong>
                      </div>
                    )}
                  </section>

                  {/* Actions */}
                  <div className="profile-actions">
                    <button type="button" onClick={copyLink}>
                      {copied ? '✓ Lien copié' : 'Partager le profil'}
                    </button>
                    <a href="https://discord.gg/v3Ddhtbz" target="_blank" rel="noopener noreferrer">
                      Ouvrir Discord
                    </a>
                  </div>
                </div>
              </section>

              {/* Tabs */}
              <nav className="profile-tabs" aria-label="Sections du profil">
                {TABS.map(item => (
                  <button
                    key={item.key} type="button"
                    className={tab === item.key ? 'active' : ''}
                    onClick={() => setTab(item.key)}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* ── Tab content ── */}
            <section className="profile-content">
              {tab === 'stats' && (
                <div className="profile-panel-grid">
                  {/* Identité */}
                  <article className="profile-panel">
                    <div className="profile-panel-title">Identité</div>
                    {[
                      ['Pseudo',      displayName],
                      ['Discord ID',  member.uid],
                      ['Rang actuel', `${rank.emoji} ${rank.rang}`],
                      ['Position',    `#${member.rank} / ${member.total}`],
                    ].map(([label, value]) => (
                      <div className="profile-list-row" key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </article>

                  {/* Trésor */}
                  <article className="profile-panel">
                    <div className="profile-panel-title">Trésor</div>
                    <StatTile label="Solde" value={`${fmtNum(wallet)} ฿`} detail="wallet boutique" color="#F2C94C" />
                    <div className="profile-list-row" style={{ marginTop: 12 }}>
                      <span>Inventaire</span>
                      <strong>{shopData?.inventory?.length || 0} objets</strong>
                    </div>
                    <div className="profile-list-row">
                      <span>Achats récents</span>
                      <strong>{shopData?.transactions?.length || 0}</strong>
                    </div>
                    <div className="profile-list-row">
                      <span>Prime publique</span>
                      <strong>{fmtB(member.berrys || 0)} ฿</strong>
                    </div>
                  </article>

                  {/* Rangs débloqués */}
                  <article className="profile-panel">
                    <div className="profile-panel-title">Rangs débloqués</div>
                    <div className="profile-rank-list">
                      {RANK_MAP.slice().reverse().map(item => {
                        const active = hours >= item.min
                        return (
                          <div className="profile-rank-step" key={item.rang}
                            style={{ '--accent': item.color, '--active': active ? 1 : .3 }}>
                            <i>{item.emoji}</i>
                            <div>
                              <strong>{item.rang}</strong>
                              <span>{item.min}h requis</span>
                            </div>
                            <b style={{ color: active ? item.color : 'transparent', fontWeight: 950 }}>
                              {active ? '✓' : '·'}
                            </b>
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
                    {shopData.inventory.map((item, i) => (
                      <InventoryCard key={`${item.item_id || 'item'}-${i}`} item={item} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon="◇" title="Inventaire vide" text="Aucun objet boutique pour ce pirate." />
                )
              )}

              {tab === 'historique' && (
                shopData?.transactions?.length ? (
                  <div>
                    {shopData.transactions.map((tx, i) => (
                      <TransactionRow key={`${tx.id || 'tx'}-${i}`} tx={tx} />
                    ))}
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
