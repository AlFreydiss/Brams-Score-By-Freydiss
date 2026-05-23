import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { fetchBerryShopState, RARITY_STYLES } from '../lib/berryShop.js'
import { fetchMemberProfile } from '../lib/supabase.js'
import Navbar from './Navbar.jsx'

// ─── Rank system ──────────────────────────────────────────────────────────────
const RANK_MAP = [
  { min: 150, rang: 'Roi des Pirates', emoji: '👑', color: '#FFD700', next: null },
  { min: 70,  rang: 'Yonkou',          emoji: '🌊', color: '#A66CFF', next: 150  },
  { min: 40,  rang: 'Amiral',          emoji: '🪖', color: '#F5C542', next: 70   },
  { min: 25,  rang: 'Shichibukai',     emoji: '⚔️', color: '#2ECC71', next: 40   },
  { min: 10,  rang: 'Pirate',          emoji: '🏴‍☠️', color: '#4F8CFF', next: 25  },
  { min: 0,   rang: 'Moussaillon',     emoji: '⚓', color: '#8A8F9F', next: 10   },
]
const TABS = [
  { key: 'stats',      label: 'Statistiques', icon: '⚔️' },
  { key: 'inventaire', label: 'Inventaire',   icon: '📦' },
  { key: 'historique', label: 'Historique',   icon: '📜' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRank(h)     { return RANK_MAP.find(r => h >= r.min) ?? RANK_MAP[RANK_MAP.length - 1] }
function getNextRank(r) { return r.next != null ? RANK_MAP.find(x => x.min === r.next) : null }
function fmtB(v) {
  const n = parseInt(v || 0)
  if (n >= 1e9) return `${(n/1e9).toFixed(2)}Md`
  if (n >= 1e6) return `${(n/1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`
  return String(n)
}
function fmtNum(v) { return new Intl.NumberFormat('fr-FR').format(Number(v || 0)) }
function timeAgo(iso) {
  if (!iso) return ''
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h} h`
  return `il y a ${Math.floor(h / 24)} j`
}

function CountUp({ value, decimals = 0, suffix = '' }) {
  const [cur, setCur] = useState(0)
  useEffect(() => {
    const target = Number(value || 0)
    let f = 0; const total = 60
    const tick = () => {
      f++
      setCur(target * (1 - Math.pow(1 - f / total, 3)))
      if (f < total) requestAnimationFrame(tick)
    }
    setCur(0); requestAnimationFrame(tick)
  }, [value])
  return `${cur.toFixed(decimals)}${suffix}`
}

function computeBadges(member, rank, hours) {
  const badges = []
  const rankNum = parseInt(member?.rank || 999)
  const total   = parseInt(member?.total || 999)
  const pct     = total > 0 ? (rankNum / total) * 100 : 100

  if (rankNum <= 10)            badges.push({ label: 'Top 10',    color: '#FFD700', icon: '👑' })
  else if (rankNum <= 50)       badges.push({ label: 'Top 50',    color: '#A66CFF', icon: '⭐' })
  else if (pct <= 10)           badges.push({ label: 'Top 10%',   color: '#4F8CFF', icon: '🏆' })
  if (hours >= 200)             badges.push({ label: 'Légende',   color: '#FFD700', icon: '🌟' })
  else if (hours >= 100)        badges.push({ label: 'Grinder',   color: '#A66CFF', icon: '🎙️' })
  if (rank.rang === 'Roi des Pirates') badges.push({ label: 'Grand Line', color: '#FFD700', icon: '👑' })
  return badges
}

// ─── Background ───────────────────────────────────────────────────────────────
function Stars() {
  const stars = useMemo(() => Array.from({ length: 80 }, (_, i) => ({
    x: (i * 37.3 + 11) % 98,
    y: (i * 41.7 + 7)  % 95,
    size: i % 7 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 1,
    dur:  2.8 + (i * 0.29) % 4.2,
    delay:(i * 0.21) % 6,
    gold: i % 11 === 0,
    blue: i % 7  === 0,
  })), [])
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: '50%',
          background: s.gold ? 'rgba(212,160,23,.8)' : s.blue ? 'rgba(79,140,255,.7)' : 'rgba(255,255,255,.5)',
          animation: `pfTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

function ScanLine() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,.04) 30%, rgba(255,255,255,.08) 50%, rgba(255,255,255,.04) 70%, transparent 100%)',
        animation: 'pfScan 14s linear infinite',
      }} />
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function EmptyState({ icon, title, text, cta, onCta }) {
  return (
    <div className="pf-empty">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
      {cta && <button className="pf-empty-cta" onClick={onCta}>{cta}</button>}
    </div>
  )
}

function BadgeRow({ badges }) {
  if (!badges?.length) return null
  return (
    <div className="pf-badge-row">
      {badges.map(b => (
        <span key={b.label} className="pf-badge" style={{ '--bc': b.color }}>
          {b.icon} {b.label}
        </span>
      ))}
    </div>
  )
}

// ─── Rank Journey (premium progress bar) ─────────────────────────────────────
function RankJourney({ rank, nextRank, hours, remaining, progPct }) {
  if (!nextRank) {
    return (
      <div className="pf-journey-max">
        <div className="pf-journey-max-glow" />
        <span className="pf-journey-max-icon">👑</span>
        <div>
          <strong>Grand Line conquise</strong>
          <p>Rang maximum — tu es au sommet des Pirates</p>
        </div>
      </div>
    )
  }

  const milestones = RANK_MAP.filter(r => r.min > rank.min && r.min <= nextRank.min)

  return (
    <div className="pf-journey">
      <div className="pf-journey-header">
        <div className="pf-journey-from">
          <span className="pf-journey-rank-icon">{rank.emoji}</span>
          <span className="pf-journey-rank-name" style={{ color: rank.color }}>{rank.rang}</span>
        </div>
        <div className="pf-journey-pct-wrap">
          <span className="pf-journey-pct">{progPct.toFixed(0)}</span>
          <span className="pf-journey-pct-sym">%</span>
        </div>
        <div className="pf-journey-to">
          <span className="pf-journey-rank-icon">{nextRank.emoji}</span>
          <span className="pf-journey-rank-name" style={{ color: nextRank.color }}>{nextRank.rang}</span>
        </div>
      </div>

      <div className="pf-journey-track-wrap">
        <div className="pf-journey-track">
          <div className="pf-journey-fill" style={{ width: `${progPct}%`, '--nc': nextRank.color }} />
          <div className="pf-journey-fill-glow" style={{ width: `${progPct}%`, '--nc': nextRank.color }} />
          <div className="pf-journey-ship" style={{ left: `${Math.min(progPct, 94)}%` }}>🏴‍☠️</div>
          {milestones.map(m => {
            const mPct = ((m.min - rank.min) / (nextRank.min - rank.min)) * 100
            return (
              <div key={m.rang} className="pf-journey-milestone" style={{ left: `${mPct}%` }}>
                <span className="pf-journey-ms-dot" />
              </div>
            )
          })}
        </div>
      </div>

      <div className="pf-journey-footer">
        <div className="pf-journey-foot-left">
          <span className="pf-journey-hrs">{hours.toFixed(1)}h</span>
          <span className="pf-journey-sep">/</span>
          <span className="pf-journey-target">{nextRank.min}h</span>
        </div>
        <div className="pf-journey-foot-right">
          <span className="pf-journey-remain">{remaining.toFixed(1)}h restantes</span>
        </div>
      </div>
    </div>
  )
}

// ─── Rank Timeline ────────────────────────────────────────────────────────────
function RankTimeline({ hours, rank }) {
  const reversed = RANK_MAP.slice().reverse()
  return (
    <div className="pf-timeline">
      {reversed.map((r, i) => {
        const done    = hours >= r.min
        const current = rank.rang === r.rang
        const locked  = !done
        const isLast  = i === reversed.length - 1
        const isLegend = r.rang === 'Roi des Pirates'

        return (
          <div key={r.rang} className={`pf-tl-row${done ? ' done' : ''}${current ? ' current' : ''}${isLegend ? ' legend' : ''}`}
               style={{ '--trc': r.color }}>
            {/* Connector line */}
            {!isLast && <div className={`pf-tl-line${done ? ' done' : ''}`} />}

            {/* Dot */}
            <div className="pf-tl-dot">
              {current ? <span className="pf-tl-dot-pulse" /> : null}
              <span className="pf-tl-dot-inner">
                {current ? r.emoji : done ? '✓' : '🔒'}
              </span>
            </div>

            {/* Content */}
            <div className="pf-tl-content">
              <div className="pf-tl-top">
                <strong className="pf-tl-name">{r.rang}</strong>
                {current && <span className="pf-tl-current-badge">ACTUEL</span>}
                {isLegend && locked && <span className="pf-tl-legend-badge">LÉGENDAIRE</span>}
              </div>
              <div className="pf-tl-req">
                <span>{r.min}h vocal requis</span>
                {done && !current && <span className="pf-tl-done-lbl">✓ Débloqué</span>}
                {current && <span className="pf-tl-curr-lbl" style={{ color: r.color }}>● En cours</span>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Stat Card with secondary info ───────────────────────────────────────────
function StatCard({ icon, label, val, sub, color, secondary, badge, delay = 0 }) {
  return (
    <div className="pf-stat-card" style={{ '--c': color, animationDelay: `${delay}s` }}>
      <div className="pf-stat-card-shine" />
      <div className="pf-stat-card-glow" />
      <div className="pf-stat-card-top" />
      <div className="pf-stat-header">
        <div className="pf-stat-icon">{icon}</div>
        <div className="pf-stat-label">{label}</div>
      </div>
      <div className="pf-stat-val">{val}</div>
      <div className="pf-stat-sub">{sub}</div>
      {secondary && <div className="pf-stat-secondary">{secondary}</div>}
      {badge && <div className="pf-stat-badge" style={{ '--bc': color }}>{badge}</div>}
    </div>
  )
}

function InventoryCard({ item, index }) {
  const si     = item?.shop_items || item || {}
  const rarity = si.rarity || 'Commun'
  const style  = RARITY_STYLES[rarity] || RARITY_STYLES.Commun
  const stars  = { Commun: 1, Rare: 2, Epique: 3, Legendaire: 4, Mythique: 5 }[rarity] || 1
  return (
    <article className="pf-item" style={{ '--acc': style.color, animationDelay: `${index * 0.06}s` }}>
      <div className="pf-item-shine" />
      <div className="pf-item-glow" />
      <div className="pf-item-rarity">
        <span>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</span>
        <span>{style.label}</span>
      </div>
      <div className="pf-item-icon">{(si.category || '📦').slice(0, 2)}</div>
      <strong className="pf-item-name">{si.name || 'Objet inconnu'}</strong>
      {si.description && <p className="pf-item-desc">{si.description}</p>}
      {item?.acquired_at && <small className="pf-item-time">{timeAgo(item.acquired_at)}</small>}
    </article>
  )
}

function TransactionRow({ tx, index }) {
  const si    = tx?.shop_items || {}
  const style = RARITY_STYLES[si.rarity] || RARITY_STYLES.Commun
  return (
    <div className="pf-tx" style={{ '--acc': style.color, animationDelay: `${index * 0.05}s` }}>
      <div className="pf-tx-icon">฿</div>
      <div className="pf-tx-info">
        <strong>{si.name || 'Achat boutique'}</strong>
        <span>{timeAgo(tx?.created_at)}</span>
      </div>
      <div className="pf-tx-right">
        <em>-{fmtNum(tx?.amount || 0)}</em>
        <span>฿</span>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { discordId }       = useParams()
  const navigate            = useNavigate()
  const { discordId: myId } = useAuth()
  const [member,   setMember]   = useState(null)
  const [shopData, setShopData] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('stats')
  const [copied,   setCopied]   = useState(false)

  useEffect(() => {
    let dead = false
    setLoading(true)
    fetchMemberProfile(discordId)
      .then(profile => { if (!dead) { setMember(profile); setLoading(false) } })
      .catch(() => { if (!dead) setLoading(false) })
    fetchBerryShopState(discordId)
      .then(shop => { if (!dead) setShopData(shop) })
      .catch(() => {})
    return () => { dead = true }
  }, [discordId])

  const hours       = parseFloat(member?.vocal_h || 0)
  const rank        = getRank(hours)
  const nextRank    = getNextRank(rank)
  const remaining   = nextRank ? Math.max(0, nextRank.min - hours) : 0
  const progPct     = nextRank ? Math.min(100, ((hours - rank.min) / (nextRank.min - rank.min)) * 100) : 100
  const isOwn       = String(myId) === String(discordId)
  const displayName = member?.username || `Pirate #${String(member?.uid || '').slice(-4)}`
  const wallet      = useMemo(() => shopData && !shopData.preview ? shopData.balance || 0 : member?.berrys || 0, [member, shopData])
  const badges      = useMemo(() => member ? computeBadges(member, rank, hours) : [], [member, rank, hours])

  const rankNum  = parseInt(member?.rank || 0)
  const total    = parseInt(member?.total || 0)
  const topPct   = total > 0 ? ((rankNum / total) * 100).toFixed(1) : '?'

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="pf" style={{
      '--rc':   rank.color,
      '--rc10': `${rank.color}1a`,
      '--rc20': `${rank.color}33`,
      '--rc40': `${rank.color}66`,
      '--rc60': `${rank.color}99`,
    }}>
      <Navbar />
      <Stars />
      <ScanLine />

      {/* Atmospheric layers */}
      <div className="pf-atmo" aria-hidden>
        <div className="pf-atmo-a" />
        <div className="pf-atmo-b" />
        <div className="pf-atmo-c" />
        <div className="pf-atmo-d" />
        <div className="pf-grid" />
      </div>

      <main className="pf-main">

        {/* Top bar */}
        <div className="pf-topbar">
          <button className="pf-btn-back" onClick={() => navigate(-1)}>
            <span>←</span> Retour
          </button>
          <div className="pf-3d-wrap">
            <span className="pf-soon-badge">Bientôt disponible</span>
            <button className="pf-btn-3d-off" disabled>⚡ Expérience 3D</button>
          </div>
        </div>

        {loading && <EmptyState icon="⌛" title="Chargement…" text="Le dossier du pirate est en cours de récupération." />}
        {!loading && !member && <EmptyState icon="☠" title="Pirate introuvable" text="Ce membre n'est pas dans le classement." />}

        {!loading && member && <>

          {/* ══ HERO ══════════════════════════════════════════════════════════ */}
          <section className="pf-hero">
            <div className="pf-hero-topline" />
            <div className="pf-hero-glow" aria-hidden />
            <div className="pf-hero-glow-r" aria-hidden />

            {/* ── Left: Wanted Poster column ── */}
            <div className="pf-poster-col">

              <div className="pf-poster-corner pf-poster-corner-tl" />
              <div className="pf-poster-corner pf-poster-corner-tr" />
              <div className="pf-poster-corner pf-poster-corner-bl" />
              <div className="pf-poster-corner pf-poster-corner-br" />

              <div className="pf-wanted-header">
                <div className="pf-wanted-dashes"><span /><span /><span /><span /><span /></div>
                <div className="pf-wanted-text">DEAD OR ALIVE</div>
                <div className="pf-wanted-dashes"><span /><span /><span /><span /><span /></div>
              </div>

              <div className="pf-avatar-wrap">
                <div className="pf-avatar-ring-a" />
                <div className="pf-avatar-ring-b" />
                <div className="pf-avatar-inner">
                  {member.avatar_url
                    ? <img src={member.avatar_url} alt={displayName} className="pf-avatar-img" />
                    : <span className="pf-avatar-fb">{rank.emoji}</span>
                  }
                </div>
                <div className="pf-avatar-halo" />
                {isOwn && <span className="pf-own-badge">MON PROFIL</span>}
              </div>

              <div className="pf-prime-box">
                <div className="pf-prime-label">PRIME</div>
                <div className="pf-prime-amount">
                  <CountUp value={parseInt(member.berrys || 0)} suffix="" decimals={0} />
                  <em>฿</em>
                </div>
                <div className="pf-prime-formatted">{fmtNum(member.berrys)} berries</div>
              </div>

              <div className="pf-rank-pill">
                <span className="pf-rank-emoji">{rank.emoji}</span>
                <span className="pf-rank-name">{rank.rang}</span>
                <span className="pf-rank-num">#{member.rank}</span>
              </div>

              <BadgeRow badges={badges} />

            </div>

            {/* ── Right: Info column ── */}
            <div className="pf-info-col">

              {/* World position */}
              <div className="pf-world-row">
                <div className="pf-world-pos">
                  <span className="pf-world-num">#{member.rank}</span>
                  <span className="pf-world-label">CLASSEMENT MONDIAL</span>
                </div>
                <div className="pf-world-sep" />
                <div className="pf-world-stats">
                  <div className="pf-world-stat">
                    <span className="pf-world-stat-v">{member.total}</span>
                    <span className="pf-world-stat-l">nakamas</span>
                  </div>
                  <div className="pf-world-stat">
                    <span className="pf-world-stat-v">Top {topPct}%</span>
                    <span className="pf-world-stat-l">élite</span>
                  </div>
                </div>
              </div>

              {/* Name */}
              <h1 className="pf-name">{displayName}</h1>

              {/* Identity strip */}
              <div className="pf-id-strip">
                <span>{rank.emoji} {rank.rang}</span>
                <span className="pf-id-dot">·</span>
                <span>#{member.rank} / {member.total}</span>
                <span className="pf-id-dot">·</span>
                <span>{hours.toFixed(1)}h vocal</span>
                <span className="pf-id-dot">·</span>
                <span>{fmtB(member.berrys)} ฿</span>
              </div>

              {/* Stat cards */}
              <div className="pf-stats">
                <StatCard
                  icon="🎤" label="VOCAL" color={rank.color}
                  val={<><CountUp value={hours} decimals={1} />h</>}
                  sub="heures en vocal"
                  secondary={nextRank ? `Objectif : ${nextRank.min}h — encore ${remaining.toFixed(1)}h` : 'Objectif atteint ✓'}
                  delay={0}
                />
                <StatCard
                  icon="🏆" label="CLASSEMENT" color="#4F8CFF"
                  val={`#${member.rank}`}
                  sub={`/ ${member.total} membres`}
                  badge={`Top ${topPct}%`}
                  delay={0.07}
                />
                <StatCard
                  icon="📦" label="INVENTAIRE" color="#2ECC71"
                  val={shopData?.inventory?.length || 0}
                  sub="objets possédés"
                  secondary={!shopData?.inventory?.length ? 'Explore la boutique →' : undefined}
                  delay={0.14}
                />
              </div>

              {/* Rank Journey */}
              <RankJourney
                rank={rank} nextRank={nextRank}
                hours={hours} remaining={remaining} progPct={progPct}
              />

              {/* Actions */}
              <div className="pf-actions">
                <button className="pf-btn-share" onClick={copyLink}>
                  {copied ? '✓ Lien copié !' : '⎘ Partager'}
                </button>
                <a className="pf-btn-discord" href="https://discord.gg/v3Ddhtbz" target="_blank" rel="noopener noreferrer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057c.01.095.044.186.098.262a19.8 19.8 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/>
                  </svg>
                  Discord
                </a>
                <div className="pf-wallet-pill">
                  <span className="pf-wallet-icon">🪙</span>
                  <span className="pf-wallet-amt">{fmtB(wallet)}</span>
                  <span className="pf-wallet-lbl">wallet</span>
                </div>
              </div>

            </div>
          </section>

          {/* ══ TABS ══════════════════════════════════════════════════════════ */}
          <nav className="pf-tabs">
            {TABS.map(t => (
              <button key={t.key} className={`pf-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
                <span className="pf-tab-icon">{t.icon}</span>
                {t.label}
                {tab === t.key && <span className="pf-tab-indicator" />}
              </button>
            ))}
          </nav>

          {/* ══ CONTENT ═══════════════════════════════════════════════════════ */}
          <div className="pf-content">

            {tab === 'stats' && (
              <div className="pf-panel-grid">

                {/* Passeport Pirate */}
                <article className="pf-panel pf-panel-identity">
                  <div className="pf-panel-head">
                    <div className="pf-panel-icon">🪪</div>
                    <span>Passeport Pirate</span>
                  </div>
                  <div className="pf-passport-avatar">
                    {member.avatar_url
                      ? <img src={member.avatar_url} alt={displayName} className="pf-passport-img" />
                      : <span className="pf-passport-fb">{rank.emoji}</span>
                    }
                    <div className="pf-passport-name">{displayName}</div>
                    <div className="pf-passport-rank" style={{ color: rank.color }}>{rank.emoji} {rank.rang}</div>
                  </div>
                  {[
                    ['Discord ID',   member.uid],
                    ['Position',     `#${member.rank} / ${member.total}`],
                    ['Heures vocal', `${hours.toFixed(1)} h`],
                    ['Statut',       `Top ${topPct}%`],
                  ].map(([lbl, val]) => (
                    <div className="pf-row" key={lbl}>
                      <span>{lbl}</span>
                      <strong>{val}</strong>
                    </div>
                  ))}
                  {badges.length > 0 && (
                    <div className="pf-passport-badges">
                      {badges.map(b => (
                        <span key={b.label} className="pf-passport-badge" style={{ '--bc': b.color }}>
                          {b.icon} {b.label}
                        </span>
                      ))}
                    </div>
                  )}
                </article>

                {/* Coffre au Trésor */}
                <article className="pf-panel pf-panel-gold">
                  <div className="pf-panel-head">
                    <div className="pf-panel-icon">🪙</div>
                    <span>Coffre au Trésor</span>
                  </div>
                  <div className="pf-treasure-hero">
                    <div className="pf-treasure-coins">฿</div>
                    <div className="pf-treasure-main">
                      <div className="pf-treasure-val">{fmtNum(wallet)}</div>
                      <div className="pf-treasure-lbl">berries — wallet boutique</div>
                    </div>
                  </div>
                  <div className="pf-treasure-divider" />
                  {[
                    { lbl: 'Prime publique',   val: `${fmtB(member.berrys)} ฿`,            icon: '⚡' },
                    { lbl: 'Objets possédés',  val: `${shopData?.inventory?.length || 0}`, icon: '📦' },
                    { lbl: 'Transactions',     val: `${shopData?.transactions?.length || 0}`, icon: '📋' },
                  ].map(({ lbl, val, icon }) => (
                    <div className="pf-row pf-row-treasure" key={lbl}>
                      <span><span className="pf-row-icon">{icon}</span>{lbl}</span>
                      <strong>{val}</strong>
                    </div>
                  ))}
                  <a className="pf-shop-cta" href="/boutique" onClick={e => { e.preventDefault(); navigate('/boutique') }}>
                    🏪 Visiter la boutique →
                  </a>
                </article>

                {/* Rangs débloqués — Timeline */}
                <article className="pf-panel pf-panel-ranks">
                  <div className="pf-panel-head">
                    <div className="pf-panel-icon">⚡</div>
                    <span>Progression des rangs</span>
                  </div>
                  <RankTimeline hours={hours} rank={rank} />
                </article>

              </div>
            )}

            {tab === 'inventaire' && (
              shopData?.inventory?.length
                ? <div className="pf-item-grid">
                    {shopData.inventory.map((item, i) => <InventoryCard key={i} item={item} index={i} />)}
                  </div>
                : <EmptyState
                    icon="📦"
                    title="Inventaire vide"
                    text="Ce pirate n'a pas encore d'objets. Passe à la boutique pour commencer ta collection."
                    cta="🏪 Voir la boutique"
                    onCta={() => navigate('/boutique')}
                  />
            )}

            {tab === 'historique' && (
              shopData?.transactions?.length
                ? <div className="pf-tx-list">
                    {shopData.transactions.map((tx, i) => <TransactionRow key={i} tx={tx} index={i} />)}
                  </div>
                : <EmptyState
                    icon="📜"
                    title="Aucune transaction"
                    text="L'historique d'achats de ce pirate est vide pour le moment."
                    cta="🏪 Découvrir la boutique"
                    onCta={() => navigate('/boutique')}
                  />
            )}

          </div>
        </>}
      </main>

      <style>{`
        /* ── Keyframes ─────────────────────────────────────────────────────────── */
        @keyframes pfTwinkle  { 0%,100%{opacity:.06;transform:scale(1)}    50%{opacity:.95;transform:scale(2)}   }
        @keyframes pfScan     { 0%{top:-2%}                                 100%{top:102%}                        }
        @keyframes pfRise     { from{opacity:0;transform:translateY(28px) scale(.97)} to{opacity:1;transform:none}}
        @keyframes pfBlobA    { 0%,100%{transform:translate(-50%,-50%) scale(1) rotate(0)}   50%{transform:translate(-50%,-50%) scale(1.12) rotate(8deg)}  }
        @keyframes pfPulse    { 0%,100%{opacity:.6}   50%{opacity:1}       }
        @keyframes pfSpin     { from{transform:rotate(0)}   to{transform:rotate(360deg)}     }
        @keyframes pfSpinRev  { from{transform:rotate(0)}   to{transform:rotate(-360deg)}    }
        @keyframes pfFloat    { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-8px)} }
        @keyframes pfShip     { 0%,100%{transform:translateX(-50%) translateY(0) rotate(-3deg)} 50%{transform:translateX(-50%) translateY(-7px) rotate(3deg)} }
        @keyframes pfShimmer  { 0%{left:-100%} 60%{left:130%} 100%{left:130%} }
        @keyframes pfGlow     { 0%,100%{opacity:.5}   50%{opacity:1}       }
        @keyframes pfBounty   { from{opacity:0;letter-spacing:-.06em} to{opacity:1;letter-spacing:-.04em} }
        @keyframes pfCardIn   { from{opacity:0;transform:translateY(14px) scale(.98)} to{opacity:1;transform:none} }
        @keyframes pfDotPulse { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.6} 50%{transform:translate(-50%,-50%) scale(1.9);opacity:0} }
        @keyframes pfJourneyFill { from{width:0} to{width:var(--w)} }
        @keyframes pfTabIn    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

        /* ── Root ─────────────────────────────────────────────────────────────── */
        .pf {
          min-height: 100vh;
          background: #02030a;
          color: #f0ead6;
          font-family: Inter, system-ui, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        /* ── Atmospheric layers ───────────────────────────────────────────────── */
        .pf-atmo { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .pf-atmo-a {
          position: absolute; width: 900px; height: 900px;
          top: -20%; right: -8%;
          border-radius: 50%;
          background: radial-gradient(circle, var(--rc20) 0%, transparent 60%);
          filter: blur(70px);
          animation: pfGlow 9s ease-in-out infinite;
        }
        .pf-atmo-b {
          position: absolute; width: 700px; height: 700px;
          top: 30%; left: -14%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(79,140,255,0.06) 0%, transparent 60%);
          filter: blur(70px);
          animation: pfGlow 13s 3s ease-in-out infinite;
        }
        .pf-atmo-c {
          position: absolute; width: 500px; height: 500px;
          bottom: 0%; right: 15%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(46,204,113,0.04) 0%, transparent 60%);
          filter: blur(60px);
          animation: pfGlow 10s 6s ease-in-out infinite;
        }
        .pf-atmo-d {
          position: absolute; width: 600px; height: 600px;
          top: 60%; left: 40%;
          border-radius: 50%;
          background: radial-gradient(circle, var(--rc10) 0%, transparent 60%);
          filter: blur(80px);
          animation: pfGlow 15s 2s ease-in-out infinite;
        }
        .pf-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.015) 1px, transparent 1px);
          background-size: 80px 80px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 100%);
        }

        /* ── Main ─────────────────────────────────────────────────────────────── */
        .pf-main {
          position: relative; z-index: 2;
          width: min(1320px, calc(100% - 32px));
          margin: 0 auto;
          padding: 76px 0 120px;
          animation: pfRise .65s cubic-bezier(.22,1,.36,1) both;
        }

        /* ── Top bar ─────────────────────────────────────────────────────────── */
        .pf-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
        .pf-btn-back {
          display: flex; align-items: center; gap: 6px;
          height: 40px; padding: 0 20px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.09);
          background: rgba(255,255,255,.035);
          color: rgba(240,234,214,.5);
          font-size: 13px; font-weight: 600;
          cursor: pointer; letter-spacing: .02em;
          transition: all .2s;
        }
        .pf-btn-back:hover { border-color: rgba(255,255,255,.2); color: #f0ead6; transform: translateX(-2px); background: rgba(255,255,255,.07); }
        .pf-3d-wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
        .pf-soon-badge {
          font-size: 9px; font-weight: 800; letter-spacing: .14em;
          text-transform: uppercase; color: rgba(212,160,23,.7);
          background: rgba(212,160,23,.08); border: 1px solid rgba(212,160,23,.22);
          border-radius: 999px; padding: 3px 10px;
        }
        .pf-btn-3d-off {
          height: 40px; padding: 0 20px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,.05); background: rgba(255,255,255,.02);
          color: rgba(240,234,214,.2); font-size: 13px; font-weight: 700;
          cursor: not-allowed; letter-spacing: .03em;
          text-decoration: line-through; text-decoration-color: rgba(255,255,255,.12);
        }

        /* ── Hero card ───────────────────────────────────────────────────────── */
        .pf-hero {
          position: relative;
          display: grid;
          grid-template-columns: 290px 1fr;
          gap: 40px;
          padding: 36px;
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,.08);
          background:
            radial-gradient(circle at 0% 0%, var(--rc10) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(79,140,255,.04) 0%, transparent 50%),
            linear-gradient(160deg, rgba(255,255,255,.04) 0%, rgba(2,3,10,.97) 100%);
          box-shadow:
            0 48px 120px rgba(0,0,0,.7),
            inset 0 1px 0 rgba(255,255,255,.07),
            0 0 0 1px rgba(255,255,255,.04);
          overflow: hidden;
          margin-bottom: 24px;
        }
        .pf-hero-topline {
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, var(--rc) 25%, rgba(242,201,76,.55) 50%, var(--rc) 75%, transparent);
          opacity: .6;
        }
        .pf-hero-glow {
          position: absolute; top: -100px; left: -100px; width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, var(--rc20) 0%, transparent 60%);
          filter: blur(50px); pointer-events: none;
          animation: pfGlow 8s ease-in-out infinite;
        }
        .pf-hero-glow-r {
          position: absolute; bottom: -80px; right: -60px; width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(79,140,255,.06) 0%, transparent 60%);
          filter: blur(50px); pointer-events: none;
          animation: pfGlow 11s 4s ease-in-out infinite;
        }

        /* ── Poster column ───────────────────────────────────────────────────── */
        .pf-poster-col {
          display: flex; flex-direction: column; align-items: center; gap: 16px;
          padding: 12px 0; padding-right: 36px;
          border-right: 1px solid rgba(255,255,255,.06);
          position: relative;
        }
        .pf-poster-corner {
          position: absolute; width: 14px; height: 14px;
          border-color: rgba(212,160,23,.3); border-style: solid;
        }
        .pf-poster-corner-tl { top: 4px; left: 4px;  border-width: 1px 0 0 1px; }
        .pf-poster-corner-tr { top: 4px; right: 36px; border-width: 1px 1px 0 0; }
        .pf-poster-corner-bl { bottom: 4px; left: 4px;  border-width: 0 0 1px 1px; }
        .pf-poster-corner-br { bottom: 4px; right: 36px; border-width: 0 1px 1px 0; }

        /* Wanted header */
        .pf-wanted-header { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 100%; }
        .pf-wanted-text {
          font-size: 11px; font-weight: 900; letter-spacing: .3em;
          text-transform: uppercase; color: rgba(212,160,23,.7);
          text-shadow: 0 0 24px rgba(212,160,23,.35); white-space: nowrap;
        }
        .pf-wanted-dashes { display: flex; gap: 5px; align-items: center; }
        .pf-wanted-dashes span { display: block; height: 1px; background: linear-gradient(90deg, transparent, rgba(212,160,23,.4), transparent); }
        .pf-wanted-dashes span:nth-child(1),.pf-wanted-dashes span:nth-child(5) { width: 14px; }
        .pf-wanted-dashes span:nth-child(2),.pf-wanted-dashes span:nth-child(4) { width: 22px; }
        .pf-wanted-dashes span:nth-child(3) { width: 32px; }

        /* Avatar */
        .pf-avatar-wrap { position: relative; width: 190px; height: 190px; flex-shrink: 0; }
        .pf-avatar-ring-a {
          position: absolute; inset: -10px; border-radius: 50%;
          border: 2px solid var(--rc);
          box-shadow: 0 0 24px var(--rc40), inset 0 0 18px var(--rc20);
          animation: pfPulse 3.5s ease-in-out infinite;
        }
        .pf-avatar-ring-b {
          position: absolute; inset: -20px; border-radius: 50%;
          border: 1px dashed var(--rc40);
          animation: pfSpinRev 28s linear infinite; opacity: .55;
        }
        .pf-avatar-ring-b::before {
          content: ''; position: absolute; inset: 10px; border-radius: 50%;
          border: 1px dashed var(--rc20); animation: pfSpin 20s linear infinite;
        }
        .pf-avatar-inner {
          position: absolute; inset: 0; border-radius: 50%; overflow: hidden;
          background: #060811; box-shadow: inset 0 0 40px rgba(0,0,0,.6);
        }
        .pf-avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
        .pf-avatar-fb {
          width: 100%; height: 100%; display: flex; align-items: center;
          justify-content: center; font-size: 64px;
        }
        .pf-avatar-halo {
          position: absolute; inset: -35px; border-radius: 50%;
          background: radial-gradient(circle, var(--rc20), transparent 60%);
          pointer-events: none; animation: pfGlow 5s ease-in-out infinite;
        }
        .pf-own-badge {
          position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%);
          white-space: nowrap; padding: 3px 14px; border-radius: 999px;
          background: rgba(242,201,76,.15); border: 1px solid rgba(242,201,76,.35);
          color: #F2C94C; font-size: 9px; font-weight: 900;
          letter-spacing: .13em; text-transform: uppercase;
        }

        /* Prime box */
        .pf-prime-box {
          width: 100%; padding: 16px 18px; border-radius: 16px;
          background: linear-gradient(135deg, rgba(212,160,23,.12) 0%, rgba(212,160,23,.04) 100%);
          border: 1px solid rgba(212,160,23,.24); border-top: 2px solid rgba(212,160,23,.5);
          text-align: center; position: relative; overflow: hidden;
          box-shadow: 0 0 40px rgba(212,160,23,.07);
        }
        .pf-prime-box::before {
          content: ''; position: absolute; top: -30%; right: -10%;
          width: 130px; height: 130px; border-radius: 50%;
          background: radial-gradient(circle, rgba(212,160,23,.14), transparent 65%);
          pointer-events: none;
        }
        .pf-prime-box::after {
          content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(212,160,23,.07), transparent);
          animation: pfShimmer 7s 2s ease-in-out infinite;
        }
        .pf-prime-label {
          font-size: 9px; font-weight: 900; letter-spacing: .24em;
          text-transform: uppercase; color: rgba(212,160,23,.55); margin-bottom: 6px;
        }
        .pf-prime-amount {
          font-size: clamp(24px, 2.8vw, 34px); font-weight: 900;
          color: #d4a017; letter-spacing: -.04em; line-height: 1;
          text-shadow: 0 0 28px rgba(212,160,23,.5);
          animation: pfBounty .9s cubic-bezier(.22,1,.36,1) both;
        }
        .pf-prime-amount em { font-size: 60%; font-style: normal; opacity: .7; margin-left: 3px; }
        .pf-prime-formatted { font-size: 10px; color: rgba(212,160,23,.38); margin-top: 5px; letter-spacing: .04em; }

        /* Rank pill */
        .pf-rank-pill {
          display: flex; align-items: center; gap: 8px; padding: 10px 20px;
          border-radius: 999px; background: var(--rc20); border: 1px solid var(--rc40);
          color: var(--rc); font-size: 13px; font-weight: 700; letter-spacing: .04em;
          box-shadow: 0 0 24px var(--rc20); white-space: nowrap;
          transition: box-shadow .3s;
        }
        .pf-rank-pill:hover { box-shadow: 0 0 36px var(--rc40); }
        .pf-rank-emoji { font-size: 17px; }
        .pf-rank-num { padding: 2px 9px; background: var(--rc40); border-radius: 999px; font-size: 11px; }

        /* Badge row */
        .pf-badge-row { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
        .pf-badge {
          display: flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: 999px;
          background: color-mix(in srgb, var(--bc) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--bc) 30%, transparent);
          color: var(--bc); font-size: 10px; font-weight: 800; letter-spacing: .06em;
          white-space: nowrap;
        }

        /* ── Info column ─────────────────────────────────────────────────────── */
        .pf-info-col { display: flex; flex-direction: column; gap: 20px; justify-content: center; }

        /* World row */
        .pf-world-row { display: flex; align-items: center; gap: 20px; }
        .pf-world-pos { display: flex; flex-direction: column; gap: 3px; }
        .pf-world-num {
          font-size: 42px; font-weight: 900; color: var(--rc);
          line-height: 1; letter-spacing: -.04em;
          text-shadow: 0 0 36px var(--rc40);
        }
        .pf-world-label {
          font-size: 8.5px; font-weight: 800; letter-spacing: .22em;
          text-transform: uppercase; color: rgba(240,234,214,.3);
        }
        .pf-world-sep { width: 1px; height: 48px; background: rgba(255,255,255,.09); }
        .pf-world-stats { display: flex; flex-direction: column; gap: 8px; }
        .pf-world-stat { display: flex; flex-direction: column; gap: 1px; }
        .pf-world-stat-v { font-size: 15px; font-weight: 800; color: rgba(240,234,214,.75); }
        .pf-world-stat-l { font-size: 10px; color: rgba(240,234,214,.3); letter-spacing: .04em; }

        /* Name */
        .pf-name {
          margin: 0;
          font-size: clamp(32px, 4vw, 56px); font-weight: 900;
          line-height: 1.02; color: transparent;
          background: linear-gradient(130deg, #ffffff 0%, rgba(255,255,255,.85) 40%, var(--rc) 100%);
          -webkit-background-clip: text; background-clip: text;
          letter-spacing: -.025em;
        }

        /* Identity strip */
        .pf-id-strip {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
          font-size: 11px; font-weight: 600; color: rgba(240,234,214,.4);
          padding: 10px 14px; border-radius: 10px;
          background: rgba(255,255,255,.025); border: 1px solid rgba(255,255,255,.05);
          letter-spacing: .02em;
        }
        .pf-id-dot { color: rgba(255,255,255,.2); }

        /* ── Stat cards ──────────────────────────────────────────────────────── */
        .pf-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .pf-stat-card {
          position: relative; padding: 18px 18px 16px;
          border-radius: 18px;
          border: 1px solid color-mix(in srgb, var(--c) 18%, rgba(255,255,255,.06));
          border-top: 2px solid color-mix(in srgb, var(--c) 45%, transparent);
          background: linear-gradient(160deg, color-mix(in srgb, var(--c) 7%, rgba(2,3,10,.92)) 0%, rgba(2,3,10,.97) 100%);
          overflow: hidden; cursor: default;
          transition: transform .25s, box-shadow .25s, border-color .25s;
          animation: pfCardIn .6s ease both;
        }
        .pf-stat-card:hover {
          transform: translateY(-4px);
          border-color: color-mix(in srgb, var(--c) 55%, transparent);
          box-shadow: 0 20px 50px color-mix(in srgb, var(--c) 20%, rgba(0,0,0,.45)), 0 0 0 1px color-mix(in srgb, var(--c) 15%, transparent);
        }
        .pf-stat-card-top {
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, var(--c), transparent); opacity: .8;
        }
        .pf-stat-card-glow {
          position: absolute; top: -30%; right: -10%; width: 110px; height: 110px;
          border-radius: 50%;
          background: radial-gradient(circle, color-mix(in srgb, var(--c) 20%, transparent), transparent 65%);
          pointer-events: none; animation: pfGlow 5s ease-in-out infinite;
        }
        .pf-stat-card-shine {
          position: absolute; top: 0; left: -100%; width: 55%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.045), transparent);
          animation: pfShimmer 7s 1.5s ease-in-out infinite; pointer-events: none;
        }
        .pf-stat-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .pf-stat-icon { font-size: 20px; }
        .pf-stat-label {
          font-size: 8.5px; letter-spacing: .2em; text-transform: uppercase;
          color: rgba(240,234,214,.3); font-weight: 800;
        }
        .pf-stat-val {
          font-size: 30px; font-weight: 900; line-height: 1; color: var(--c);
          text-shadow: 0 0 26px color-mix(in srgb, var(--c) 45%, transparent);
          letter-spacing: -.02em;
        }
        .pf-stat-sub { margin-top: 6px; font-size: 10.5px; color: rgba(240,234,214,.28); }
        .pf-stat-secondary {
          margin-top: 8px; font-size: 10px; font-weight: 600;
          color: color-mix(in srgb, var(--c) 65%, rgba(240,234,214,.3));
          padding-top: 7px; border-top: 1px solid rgba(255,255,255,.05);
        }
        .pf-stat-badge {
          display: inline-flex; margin-top: 8px;
          padding: 3px 10px; border-radius: 999px;
          background: color-mix(in srgb, var(--bc) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--bc) 32%, transparent);
          color: var(--bc); font-size: 9.5px; font-weight: 800; letter-spacing: .08em;
        }

        /* ── Rank Journey ────────────────────────────────────────────────────── */
        .pf-journey {
          padding: 20px 22px; border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background:
            radial-gradient(circle at 50% 0%, var(--rc10) 0%, transparent 60%),
            rgba(255,255,255,.025);
          backdrop-filter: blur(4px);
        }
        .pf-journey-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 14px;
        }
        .pf-journey-from,.pf-journey-to {
          display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700;
        }
        .pf-journey-rank-icon { font-size: 18px; }
        .pf-journey-rank-name { letter-spacing: .02em; }
        .pf-journey-pct-wrap { display: flex; align-items: baseline; gap: 2px; }
        .pf-journey-pct {
          font-size: 32px; font-weight: 900; color: rgba(240,234,214,.65);
          letter-spacing: -.03em; line-height: 1;
        }
        .pf-journey-pct-sym { font-size: 16px; font-weight: 700; color: rgba(240,234,214,.4); }

        .pf-journey-track-wrap { padding: 12px 0; }
        .pf-journey-track {
          height: 16px; background: rgba(255,255,255,.06); border-radius: 999px;
          position: relative; overflow: visible;
          border: 1px solid rgba(255,255,255,.04);
          box-shadow: inset 0 2px 4px rgba(0,0,0,.3);
        }
        .pf-journey-fill {
          height: 100%; border-radius: 999px; position: absolute; top: 0; left: 0;
          background: linear-gradient(90deg,
            color-mix(in srgb, var(--nc) 25%, #02030a),
            var(--nc) 80%,
            color-mix(in srgb, var(--nc) 80%, #fff) 100%);
          box-shadow: 0 0 16px var(--nc), 0 0 40px color-mix(in srgb, var(--nc) 25%, transparent);
          transition: width 1.6s cubic-bezier(.22,1,.36,1);
        }
        .pf-journey-fill::after {
          content: ''; position: absolute; inset: 0; border-radius: 999px;
          background: linear-gradient(90deg, transparent 60%, rgba(255,255,255,.18));
          pointer-events: none;
        }
        .pf-journey-fill-glow {
          height: 100%; position: absolute; top: 0; left: 0;
          border-radius: 999px; pointer-events: none;
          background: linear-gradient(90deg, transparent, var(--nc));
          filter: blur(6px); opacity: .5;
          transition: width 1.6s cubic-bezier(.22,1,.36,1);
        }
        .pf-journey-ship {
          position: absolute; top: -20px; transform: translateX(-50%);
          font-size: 22px; user-select: none;
          animation: pfShip 3s ease-in-out infinite;
          filter: drop-shadow(0 0 10px var(--rc));
        }
        .pf-journey-milestone { position: absolute; top: 50%; transform: translate(-50%, -50%); z-index: 2; }
        .pf-journey-ms-dot {
          display: block; width: 6px; height: 6px; border-radius: 50%;
          background: rgba(255,255,255,.25); border: 1px solid rgba(255,255,255,.4);
        }

        .pf-journey-footer {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 10px;
        }
        .pf-journey-foot-left { display: flex; align-items: baseline; gap: 5px; font-size: 12px; }
        .pf-journey-hrs { font-weight: 800; color: rgba(240,234,214,.75); }
        .pf-journey-sep { color: rgba(240,234,214,.3); }
        .pf-journey-target { color: rgba(240,234,214,.4); }
        .pf-journey-remain {
          font-size: 12px; font-weight: 700;
          color: rgba(240,234,214,.55);
        }
        .pf-journey-max {
          display: flex; align-items: center; gap: 16px; padding: 20px 22px;
          border-radius: 16px; background: rgba(255,215,0,.06);
          border: 1px solid rgba(255,215,0,.2); position: relative; overflow: hidden;
        }
        .pf-journey-max-glow {
          position: absolute; inset: 0;
          background: radial-gradient(circle at 30% 50%, rgba(255,215,0,.08), transparent 60%);
          pointer-events: none;
        }
        .pf-journey-max-icon { font-size: 32px; animation: pfFloat 3s ease-in-out infinite; flex-shrink: 0; }
        .pf-journey-max strong { display: block; font-size: 15px; font-weight: 800; color: #F2C94C; }
        .pf-journey-max p { margin: 4px 0 0; font-size: 11px; color: rgba(240,234,214,.38); }

        /* ── Actions ─────────────────────────────────────────────────────────── */
        .pf-actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; align-items: center; }
        .pf-btn-share {
          height: 44px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04);
          color: rgba(240,234,214,.7); font-size: 12px; font-weight: 700;
          cursor: pointer; letter-spacing: .02em; transition: all .2s;
        }
        .pf-btn-share:hover { background: rgba(255,255,255,.08); color: #f0ead6; border-color: rgba(255,255,255,.22); }
        .pf-btn-discord {
          height: 44px; border-radius: 12px;
          border: 1px solid rgba(88,101,242,.4);
          background: linear-gradient(135deg, rgba(88,101,242,.18), rgba(88,101,242,.08));
          color: #a5adfa; font-size: 12px; font-weight: 700;
          cursor: pointer; letter-spacing: .02em;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          text-decoration: none; transition: all .2s;
        }
        .pf-btn-discord:hover { background: rgba(88,101,242,.28); color: #c5cbff; box-shadow: 0 0 28px rgba(88,101,242,.3); }
        .pf-wallet-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 0 16px; height: 44px; border-radius: 12px;
          border: 1px solid rgba(212,160,23,.24); background: rgba(212,160,23,.07);
          justify-content: center; transition: all .2s;
        }
        .pf-wallet-pill:hover { background: rgba(212,160,23,.12); box-shadow: 0 0 20px rgba(212,160,23,.15); }
        .pf-wallet-icon { font-size: 15px; }
        .pf-wallet-amt { font-size: 17px; font-weight: 900; color: #d4a017; letter-spacing: -.01em; }
        .pf-wallet-lbl { font-size: 9px; color: rgba(212,160,23,.45); font-weight: 700; letter-spacing: .08em; margin-top: 1px; }

        /* ── Tabs ────────────────────────────────────────────────────────────── */
        .pf-tabs {
          display: flex; gap: 6px; padding: 6px;
          background: rgba(0,0,0,.5); border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px; width: max-content; max-width: 100%;
          margin: 0 auto 28px; overflow-x: auto;
        }
        .pf-tab {
          position: relative;
          display: flex; align-items: center; gap: 8px;
          height: 46px; padding: 0 26px;
          border: 1px solid transparent; border-radius: 14px;
          background: none; color: rgba(240,234,214,.38);
          font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all .22s; white-space: nowrap;
        }
        .pf-tab:hover { color: rgba(240,234,214,.7); background: rgba(255,255,255,.04); }
        .pf-tab-icon { font-size: 16px; }
        .pf-tab.active {
          background: var(--rc20); border-color: var(--rc40);
          color: var(--rc); font-weight: 700;
          box-shadow: 0 0 20px var(--rc20), inset 0 1px 0 rgba(255,255,255,.06);
          animation: pfTabIn .25s ease both;
        }
        .pf-tab-indicator {
          position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%);
          width: 24px; height: 2px; border-radius: 999px;
          background: var(--rc); opacity: .7;
        }

        /* ── Content ─────────────────────────────────────────────────────────── */
        .pf-content { animation: pfRise .4s ease both; }

        /* ── Panels grid ─────────────────────────────────────────────────────── */
        .pf-panel-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .pf-panel {
          padding: 26px; border-radius: 22px;
          border: 1px solid rgba(255,255,255,.08);
          background: linear-gradient(160deg, rgba(255,255,255,.04) 0%, rgba(2,3,10,.93) 100%);
          display: flex; flex-direction: column; gap: 0;
          position: relative; overflow: hidden;
          transition: border-color .25s, box-shadow .25s;
        }
        .pf-panel:hover { border-color: rgba(255,255,255,.13); box-shadow: 0 24px 60px rgba(0,0,0,.3); }
        .pf-panel::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.09), transparent);
        }
        .pf-panel-gold {
          border-color: rgba(212,160,23,.16);
          background: linear-gradient(160deg, rgba(212,160,23,.06) 0%, rgba(2,3,10,.93) 100%);
        }
        .pf-panel-gold::before { background: linear-gradient(90deg, transparent, rgba(212,160,23,.22), transparent); }
        .pf-panel-gold:hover { border-color: rgba(212,160,23,.28); box-shadow: 0 24px 60px rgba(212,160,23,.08); }
        .pf-panel-ranks {
          border-color: var(--rc20);
          background: linear-gradient(160deg, var(--rc10) 0%, rgba(2,3,10,.93) 100%);
        }
        .pf-panel-ranks::before { background: linear-gradient(90deg, transparent, var(--rc40), transparent); }

        .pf-panel-head {
          display: flex; align-items: center; gap: 10px;
          font-size: 10px; letter-spacing: .15em; text-transform: uppercase;
          font-weight: 900; color: var(--rc); margin-bottom: 20px;
        }
        .pf-panel-icon {
          width: 30px; height: 30px; border-radius: 9px;
          background: var(--rc20); border: 1px solid var(--rc40);
          display: flex; align-items: center; justify-content: center; font-size: 15px;
        }
        .pf-panel-gold .pf-panel-head { color: #d4a017; }
        .pf-panel-gold .pf-panel-icon { background: rgba(212,160,23,.15); border-color: rgba(212,160,23,.3); }

        /* Passport */
        .pf-panel-identity {}
        .pf-passport-avatar {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 20px 0 18px; margin-bottom: 14px;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }
        .pf-passport-img,.pf-passport-fb {
          width: 72px; height: 72px; border-radius: 50%;
          border: 2px solid var(--rc40); object-fit: cover;
          box-shadow: 0 0 20px var(--rc20);
        }
        .pf-passport-fb {
          display: flex; align-items: center; justify-content: center;
          background: #060811; font-size: 30px;
        }
        .pf-passport-name { font-size: 16px; font-weight: 800; color: rgba(240,234,214,.9); }
        .pf-passport-rank { font-size: 12px; font-weight: 700; }

        .pf-passport-badges {
          display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px;
        }
        .pf-passport-badge {
          padding: 3px 10px; border-radius: 999px;
          background: color-mix(in srgb, var(--bc) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--bc) 25%, transparent);
          color: var(--bc); font-size: 9.5px; font-weight: 800; letter-spacing: .06em;
        }

        .pf-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 11px 0; border-bottom: 1px solid rgba(255,255,255,.05);
          font-size: 13px;
        }
        .pf-row:last-child { border-bottom: none; }
        .pf-row span { color: rgba(240,234,214,.36); display: flex; align-items: center; gap: 6px; }
        .pf-row strong { color: rgba(240,234,214,.88); font-weight: 700; }
        .pf-row-icon { font-size: 13px; }

        /* Treasure */
        .pf-treasure-hero {
          display: flex; align-items: center; gap: 16px; padding: 16px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(212,160,23,.12), rgba(212,160,23,.04));
          border: 1px solid rgba(212,160,23,.2);
          margin-bottom: 16px; position: relative; overflow: hidden;
        }
        .pf-treasure-hero::after {
          content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(212,160,23,.07), transparent);
          animation: pfShimmer 6s 1.5s ease-in-out infinite;
        }
        .pf-treasure-coins {
          width: 52px; height: 52px; border-radius: 50%;
          background: rgba(212,160,23,.16); border: 1.5px solid rgba(212,160,23,.35);
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; font-weight: 900; color: #d4a017;
          box-shadow: 0 0 24px rgba(212,160,23,.3); flex-shrink: 0;
          animation: pfGlow 4s ease-in-out infinite;
        }
        .pf-treasure-main {}
        .pf-treasure-val {
          font-size: 24px; font-weight: 900; color: #d4a017;
          letter-spacing: -.02em; text-shadow: 0 0 22px rgba(212,160,23,.4);
        }
        .pf-treasure-lbl { font-size: 10px; color: rgba(212,160,23,.38); letter-spacing: .06em; margin-top: 2px; }
        .pf-treasure-divider { height: 1px; background: rgba(212,160,23,.1); margin-bottom: 2px; }
        .pf-shop-cta {
          display: flex; align-items: center; justify-content: center;
          margin-top: 14px; padding: 11px 0; border-radius: 12px;
          border: 1px solid rgba(212,160,23,.2);
          background: rgba(212,160,23,.06);
          color: rgba(212,160,23,.8); font-size: 12px; font-weight: 700;
          text-decoration: none; cursor: pointer; letter-spacing: .04em;
          transition: all .2s;
        }
        .pf-shop-cta:hover { background: rgba(212,160,23,.12); border-color: rgba(212,160,23,.35); color: #d4a017; }

        /* ── Rank Timeline ───────────────────────────────────────────────────── */
        .pf-timeline { display: flex; flex-direction: column; gap: 0; }
        .pf-tl-row {
          display: flex; align-items: flex-start; gap: 12px;
          position: relative; padding: 10px 10px 10px 0;
          opacity: .28; transition: opacity .2s;
        }
        .pf-tl-row.done    { opacity: .65; }
        .pf-tl-row.current { opacity: 1; }
        .pf-tl-row.legend.current { opacity: 1; }
        .pf-tl-row.legend:not(.done) {
          opacity: .55;
          background: linear-gradient(90deg, rgba(255,215,0,.04), transparent);
          border-radius: 10px;
          padding-left: 8px;
        }

        .pf-tl-line {
          position: absolute; left: 16px; top: 38px; bottom: -10px;
          width: 1px; background: rgba(255,255,255,.1); z-index: 0;
        }
        .pf-tl-line.done { background: var(--trc); opacity: .4; }

        .pf-tl-dot {
          width: 32px; height: 32px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          font-size: 14px; position: relative; z-index: 1; margin-top: 2px;
          transition: all .25s;
        }
        .pf-tl-row.done .pf-tl-dot    { border-color: var(--trc); background: color-mix(in srgb, var(--trc) 12%, transparent); }
        .pf-tl-row.current .pf-tl-dot { border-color: var(--trc); background: color-mix(in srgb, var(--trc) 18%, transparent); box-shadow: 0 0 16px color-mix(in srgb, var(--trc) 40%, transparent); }
        .pf-tl-dot-pulse {
          position: absolute; inset: -4px; border-radius: 50%;
          background: var(--trc); opacity: 0;
          animation: pfDotPulse 2.5s ease-in-out infinite;
        }
        .pf-tl-dot-inner { position: relative; z-index: 1; font-size: 13px; }

        .pf-tl-content { flex: 1; padding-top: 4px; }
        .pf-tl-top { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; }
        .pf-tl-name {
          font-size: 13px; font-weight: 700;
          color: rgba(240,234,214,.75);
        }
        .pf-tl-row.current .pf-tl-name { color: var(--trc); }
        .pf-tl-current-badge {
          padding: 2px 8px; border-radius: 999px;
          background: color-mix(in srgb, var(--trc) 15%, transparent);
          border: 1px solid color-mix(in srgb, var(--trc) 35%, transparent);
          color: var(--trc); font-size: 8.5px; font-weight: 900; letter-spacing: .1em;
        }
        .pf-tl-legend-badge {
          padding: 2px 8px; border-radius: 999px;
          background: rgba(255,215,0,.1); border: 1px solid rgba(255,215,0,.25);
          color: #FFD700; font-size: 8.5px; font-weight: 900; letter-spacing: .1em;
          animation: pfPulse 3s ease-in-out infinite;
        }
        .pf-tl-req { font-size: 10.5px; color: rgba(240,234,214,.3); display: flex; align-items: center; gap: 8px; }
        .pf-tl-done-lbl { color: rgba(46,204,113,.6); font-weight: 700; }
        .pf-tl-curr-lbl { font-weight: 700; }

        /* ── Inventory ───────────────────────────────────────────────────────── */
        .pf-item-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 14px; }
        .pf-item {
          position: relative; padding: 18px; border-radius: 18px;
          border: 1px solid color-mix(in srgb, var(--acc) 25%, rgba(255,255,255,.06));
          border-top: 2px solid color-mix(in srgb, var(--acc) 50%, transparent);
          background: linear-gradient(160deg, color-mix(in srgb, var(--acc) 7%, transparent) 0%, rgba(2,3,10,.9) 100%);
          overflow: hidden; display: flex; flex-direction: column; gap: 7px;
          transition: transform .25s, box-shadow .25s;
          animation: pfCardIn .5s ease both;
        }
        .pf-item:hover { transform: translateY(-3px); box-shadow: 0 12px 36px color-mix(in srgb, var(--acc) 18%, rgba(0,0,0,.4)); }
        .pf-item-glow {
          position: absolute; top: -30%; right: -10%; width: 90px; height: 90px;
          border-radius: 50%;
          background: radial-gradient(circle, color-mix(in srgb, var(--acc) 18%, transparent), transparent 65%);
          pointer-events: none; animation: pfGlow 4s ease-in-out infinite;
        }
        .pf-item-shine {
          position: absolute; top: 0; left: -100%; width: 55%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.04), transparent);
          animation: pfShimmer 5.5s .5s ease-in-out infinite; pointer-events: none;
        }
        .pf-item-rarity {
          display: flex; align-items: center; gap: 5px; font-size: 8.5px;
          font-weight: 900; letter-spacing: .1em; text-transform: uppercase; color: var(--acc);
        }
        .pf-item-icon { font-size: 28px; }
        .pf-item-name { font-size: 13px; font-weight: 700; color: rgba(240,234,214,.88); line-height: 1.3; }
        .pf-item-desc { margin: 0; font-size: 11px; color: rgba(240,234,214,.38); line-height: 1.5; }
        .pf-item-time { font-size: 10px; color: rgba(240,234,214,.25); margin-top: 2px; }

        /* ── Transactions ────────────────────────────────────────────────────── */
        .pf-tx-list { display: flex; flex-direction: column; gap: 8px; }
        .pf-tx {
          display: flex; align-items: center; gap: 14px; padding: 14px 18px;
          border-radius: 14px; border: 1px solid rgba(255,255,255,.06);
          border-left: 3px solid var(--acc);
          background: linear-gradient(90deg, color-mix(in srgb, var(--acc) 4%, rgba(2,3,10,.8)), rgba(2,3,10,.8));
          animation: pfCardIn .5s ease both; transition: transform .2s, box-shadow .2s;
        }
        .pf-tx:hover { transform: translateX(3px); box-shadow: -4px 0 20px color-mix(in srgb, var(--acc) 15%, transparent); }
        .pf-tx-icon {
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(212,160,23,.12); border: 1px solid rgba(212,160,23,.22);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 900; color: #d4a017; flex-shrink: 0;
          box-shadow: 0 0 14px rgba(212,160,23,.18);
        }
        .pf-tx-info { flex: 1; }
        .pf-tx-info strong { display: block; font-size: 13px; font-weight: 700; color: rgba(240,234,214,.85); }
        .pf-tx-info span { font-size: 11px; color: rgba(240,234,214,.3); }
        .pf-tx-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
        .pf-tx-right em { font-style: normal; font-size: 15px; font-weight: 800; color: #ff6b6b; letter-spacing: -.01em; }
        .pf-tx-right span { font-size: 10px; color: rgba(240,234,214,.3); }

        /* ── Empty state ─────────────────────────────────────────────────────── */
        .pf-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 14px; padding: 100px 0;
          color: rgba(240,234,214,.38); text-align: center;
        }
        .pf-empty span { font-size: 56px; animation: pfFloat 3s ease-in-out infinite; }
        .pf-empty strong { font-size: 19px; font-weight: 700; color: rgba(240,234,214,.58); }
        .pf-empty p { font-size: 13px; max-width: 340px; margin: 0; line-height: 1.6; }
        .pf-empty-cta {
          margin-top: 6px; padding: 12px 28px; border-radius: 12px;
          border: 1px solid rgba(212,160,23,.28); background: rgba(212,160,23,.07);
          color: rgba(212,160,23,.85); font-size: 13px; font-weight: 700;
          cursor: pointer; letter-spacing: .04em; transition: all .2s;
        }
        .pf-empty-cta:hover { background: rgba(212,160,23,.14); border-color: rgba(212,160,23,.45); color: #d4a017; }

        /* ── Responsive ──────────────────────────────────────────────────────── */
        @media (max-width: 1100px) {
          .pf-hero { grid-template-columns: 1fr; gap: 28px; }
          .pf-poster-col {
            flex-direction: row; flex-wrap: wrap; justify-content: center;
            border-right: none; border-bottom: 1px solid rgba(255,255,255,.06);
            padding-right: 0; padding-bottom: 28px;
          }
          .pf-avatar-wrap { width: 150px; height: 150px; }
          .pf-panel-grid { grid-template-columns: 1fr 1fr; }
          .pf-panel-ranks { grid-column: 1 / -1; }
        }
        @media (max-width: 780px) {
          .pf-stats { grid-template-columns: 1fr; }
          .pf-actions { grid-template-columns: 1fr 1fr; }
          .pf-panel-grid { grid-template-columns: 1fr; }
          .pf-name { font-size: 32px; }
          .pf-world-num { font-size: 32px; }
          .pf-id-strip { font-size: 10px; }
        }
        @media (max-width: 600px) {
          .pf-hero { padding: 22px 18px; }
          .pf-main { padding-top: 62px; }
          .pf-actions { grid-template-columns: 1fr; }
          .pf-journey-pct { font-size: 24px; }
          .pf-avatar-wrap { width: 130px; height: 130px; }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
        }
      `}</style>
    </div>
  )
}
