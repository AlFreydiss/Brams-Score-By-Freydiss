import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { fetchBerryShopState, RARITY_STYLES } from '../lib/berryShop.js'
import { fetchMemberProfile } from '../lib/supabase.js'
import Navbar from './Navbar.jsx'

// ─── Rank system ──────────────────────────────────────────────────────────────
const RANK_MAP = [
  { min: 150, rang: 'Roi des Pirates', emoji: '👑', color: '#BFA46A', next: null },
  { min: 70,  rang: 'Yonkou',          emoji: '🌊', color: '#8B6FD6', next: 150  },
  { min: 40,  rang: 'Amiral',          emoji: '🪖', color: '#9A8656', next: 70   },
  { min: 25,  rang: 'Shichibukai',     emoji: '⚔️', color: '#8B8E98', next: 40   },
  { min: 10,  rang: 'Pirate',          emoji: '🏴‍☠️', color: '#6E7280', next: 25  },
  { min: 0,   rang: 'Moussaillon',     emoji: '⚓', color: '#4A4E5A', next: 10   },
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
  if (rankNum <= 10)       badges.push({ label: 'Top 10',    color: '#BFA46A', icon: '👑' })
  else if (rankNum <= 50)  badges.push({ label: 'Top 50',    color: '#8B6FD6', icon: '⭐' })
  else if (pct <= 10)      badges.push({ label: 'Top 10%',   color: '#8B8E98', icon: '🏆' })
  if (hours >= 200)        badges.push({ label: 'Légende',   color: '#BFA46A', icon: '🌟' })
  else if (hours >= 100)   badges.push({ label: 'Grinder',   color: '#8B8E98', icon: '🎙️' })
  if (rank.rang === 'Roi des Pirates') badges.push({ label: 'Grand Line', color: '#BFA46A', icon: '👑' })
  return badges
}

// ─── Background ───────────────────────────────────────────────────────────────
function Stars() {
  const stars = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    x: (i * 37.3 + 11) % 98,
    y: (i * 41.7 + 7)  % 95,
    size: i % 9 === 0 ? 2 : 1,
    dur:  3.5 + (i * 0.29) % 4,
    delay:(i * 0.21) % 6,
    opacity: 0.06 + (i * 0.025) % 0.14,
  })), [])
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: '50%',
          background: `rgba(255,255,255,${s.opacity})`,
          animation: `pfTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite`,
        }} />
      ))}
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

// ─── Rank Journey ─────────────────────────────────────────────────────────────
function RankJourney({ rank, nextRank, hours, remaining, progPct }) {
  if (!nextRank) {
    return (
      <div className="pf-journey-max">
        <span className="pf-journey-max-icon">👑</span>
        <div>
          <strong>Grand Line conquise</strong>
          <p>Rang maximum — tu es au sommet des Pirates</p>
        </div>
      </div>
    )
  }
  return (
    <div className="pf-journey">
      <div className="pf-journey-header">
        <div className="pf-journey-from">
          <span className="pf-journey-rank-icon">{rank.emoji}</span>
          <span className="pf-journey-rank-name">{rank.rang}</span>
        </div>
        <div className="pf-journey-pct-wrap">
          <span className="pf-journey-pct">{progPct.toFixed(0)}</span>
          <span className="pf-journey-pct-sym">%</span>
        </div>
        <div className="pf-journey-to">
          <span className="pf-journey-rank-icon">{nextRank.emoji}</span>
          <span className="pf-journey-rank-name">{nextRank.rang}</span>
        </div>
      </div>
      <div className="pf-journey-track-wrap">
        <div className="pf-journey-track">
          <div className="pf-journey-fill" style={{ width: `${progPct}%` }} />
          <div className="pf-journey-ship" style={{ left: `${Math.min(progPct, 94)}%` }}>🏴‍☠️</div>
        </div>
      </div>
      <div className="pf-journey-footer">
        <div className="pf-journey-foot-left">
          <span className="pf-journey-hrs">{hours.toFixed(1)}h</span>
          <span className="pf-journey-sep">/</span>
          <span className="pf-journey-target">{nextRank.min}h</span>
        </div>
        <span className="pf-journey-remain">{remaining.toFixed(1)}h restantes</span>
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
        const isLast  = i === reversed.length - 1
        const isLegend = r.rang === 'Roi des Pirates'
        return (
          <div key={r.rang}
            className={`pf-tl-row${done ? ' done' : ''}${current ? ' current' : ''}${isLegend ? ' legend' : ''}`}>
            {!isLast && <div className={`pf-tl-line${done ? ' done' : ''}`} />}
            <div className="pf-tl-dot">
              {current && <span className="pf-tl-dot-pulse" />}
              <span className="pf-tl-dot-inner">{current ? r.emoji : done ? '✓' : '🔒'}</span>
            </div>
            <div className="pf-tl-content">
              <div className="pf-tl-top">
                <strong className="pf-tl-name">{r.rang}</strong>
                {current && <span className="pf-tl-current-badge">ACTUEL</span>}
                {isLegend && !done && <span className="pf-tl-legend-badge">LÉGENDAIRE</span>}
              </div>
              <div className="pf-tl-req">
                <span>{r.min}h vocal requis</span>
                {done && !current && <span className="pf-tl-done-lbl">✓ Débloqué</span>}
                {current && <span className="pf-tl-curr-lbl">● En cours</span>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, val, sub, secondary, badge, delay = 0 }) {
  return (
    <div className="pf-stat-card" style={{ animationDelay: `${delay}s` }}>
      <div className="pf-stat-card-shine" />
      <div className="pf-stat-header">
        <div className="pf-stat-icon">{icon}</div>
        <div className="pf-stat-label">{label}</div>
      </div>
      <div className="pf-stat-val">{val}</div>
      <div className="pf-stat-sub">{sub}</div>
      {secondary && <div className="pf-stat-secondary">{secondary}</div>}
      {badge && <div className="pf-stat-badge">{badge}</div>}
    </div>
  )
}

function InventoryCard({ item, index }) {
  const si     = item?.shop_items || item || {}
  const rarity = si.rarity || 'Commun'
  const style  = RARITY_STYLES[rarity] || RARITY_STYLES.Commun
  const stars  = { Commun: 1, Rare: 2, Epique: 3, Legendaire: 4, Mythique: 5 }[rarity] || 1
  return (
    <article className="pf-item" style={{ animationDelay: `${index * 0.06}s` }}>
      <div className="pf-item-shine" />
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
  const si = tx?.shop_items || {}
  return (
    <div className="pf-tx" style={{ animationDelay: `${index * 0.05}s` }}>
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

  const hours     = parseFloat(member?.vocal_h || 0)
  const rank      = getRank(hours)
  const nextRank  = getNextRank(rank)
  const remaining = nextRank ? Math.max(0, nextRank.min - hours) : 0
  const progPct   = nextRank ? Math.min(100, ((hours - rank.min) / (nextRank.min - rank.min)) * 100) : 100
  const isOwn     = String(myId) === String(discordId)
  const displayName = member?.username || `Pirate #${String(member?.uid || '').slice(-4)}`
  const wallet    = useMemo(() => shopData && !shopData.preview ? shopData.balance || 0 : member?.berrys || 0, [member, shopData])
  const badges    = useMemo(() => member ? computeBadges(member, rank, hours) : [], [member, rank, hours])
  const rankNum   = parseInt(member?.rank || 0)
  const total     = parseInt(member?.total || 0)
  const topPct    = total > 0 ? ((rankNum / total) * 100).toFixed(1) : '?'

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="pf">
      <Navbar />
      <Stars />

      <div className="pf-atmo" aria-hidden>
        <div className="pf-atmo-warm" />
        <div className="pf-grid" />
      </div>

      <main className="pf-main">

        <div className="pf-topbar">
          <button className="pf-btn-back" onClick={() => navigate(-1)}>← Retour</button>
          <div className="pf-3d-wrap">
            <span className="pf-soon-badge">Bientôt disponible</span>
            <button className="pf-btn-3d-off" disabled>⚡ Expérience 3D</button>
          </div>
        </div>

        {loading  && <EmptyState icon="⌛" title="Chargement…"        text="Le dossier du pirate est en cours de récupération." />}
        {!loading && !member && <EmptyState icon="☠" title="Pirate introuvable" text="Ce membre n'est pas dans le classement." />}

        {!loading && member && <>

          {/* ══ HERO ═══════════════════════════════════════════════════════════ */}
          <section className="pf-hero">
            <div className="pf-hero-topline" />

            {/* Wanted Poster column */}
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
                {isOwn && <span className="pf-own-badge">MON PROFIL</span>}
              </div>

              <div className="pf-prime-box">
                <div className="pf-prime-label">PRIME</div>
                <div className="pf-prime-amount">
                  <CountUp value={parseInt(member.berrys || 0)} decimals={0} />
                  <em>฿</em>
                </div>
                <div className="pf-prime-formatted">{fmtNum(member.berrys)} berries</div>
              </div>

              <div className="pf-rank-pill">
                <span>{rank.emoji}</span>
                <span className="pf-rank-pill-name">{rank.rang}</span>
                <span className="pf-rank-pill-num">#{member.rank}</span>
              </div>

              <BadgeRow badges={badges} />
            </div>

            {/* Info column */}
            <div className="pf-info-col">

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

              <h1 className="pf-name">{displayName}</h1>

              <div className="pf-id-strip">
                <span>{rank.emoji} {rank.rang}</span>
                <span className="pf-id-dot">·</span>
                <span>#{member.rank} / {member.total}</span>
                <span className="pf-id-dot">·</span>
                <span>{hours.toFixed(1)}h vocal</span>
                <span className="pf-id-dot">·</span>
                <span>{fmtB(member.berrys)} ฿</span>
              </div>

              <div className="pf-stats">
                <StatCard
                  icon="🎤" label="VOCAL"
                  val={<><CountUp value={hours} decimals={1} />h</>}
                  sub="heures en vocal"
                  secondary={nextRank ? `Objectif : ${nextRank.min}h — encore ${remaining.toFixed(1)}h` : 'Objectif atteint ✓'}
                  delay={0}
                />
                <StatCard
                  icon="🏆" label="CLASSEMENT"
                  val={`#${member.rank}`}
                  sub={`/ ${member.total} membres`}
                  badge={`Top ${topPct}%`}
                  delay={0.07}
                />
                <StatCard
                  icon="📦" label="INVENTAIRE"
                  val={shopData?.inventory?.length || 0}
                  sub="objets possédés"
                  secondary={!shopData?.inventory?.length ? 'Explore la boutique →' : undefined}
                  delay={0.14}
                />
              </div>

              <RankJourney rank={rank} nextRank={nextRank} hours={hours} remaining={remaining} progPct={progPct} />

              <div className="pf-actions">
                <button className="pf-btn-action" onClick={copyLink}>
                  {copied ? '✓ Lien copié !' : '⎘ Partager'}
                </button>
                <a className="pf-btn-action" href="https://discord.gg/v3Ddhtbz" target="_blank" rel="noopener noreferrer">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057c.01.095.044.186.098.262a19.8 19.8 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/>
                  </svg>
                  Discord
                </a>
                <div className="pf-wallet-pill">
                  <span>🪙</span>
                  <span className="pf-wallet-amt">{fmtB(wallet)}</span>
                  <span className="pf-wallet-lbl">wallet</span>
                </div>
              </div>

            </div>
          </section>

          {/* ══ TABS ═══════════════════════════════════════════════════════════ */}
          <nav className="pf-tabs">
            {TABS.map(t => (
              <button key={t.key} className={`pf-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
                <span>{t.icon}</span>
                {t.label}
                {tab === t.key && <span className="pf-tab-indicator" />}
              </button>
            ))}
          </nav>

          {/* ══ CONTENT ════════════════════════════════════════════════════════ */}
          <div className="pf-content">

            {tab === 'stats' && (
              <div className="pf-panel-grid">

                <article className="pf-panel">
                  <div className="pf-panel-head"><div className="pf-panel-icon">🪪</div><span>Passeport Pirate</span></div>
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
                      <span>{lbl}</span><strong>{val}</strong>
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

                <article className="pf-panel pf-panel-gold">
                  <div className="pf-panel-head pf-panel-head-gold"><div className="pf-panel-icon pf-panel-icon-gold">🪙</div><span>Coffre au Trésor</span></div>
                  <div className="pf-treasure-hero">
                    <div className="pf-treasure-coins">฿</div>
                    <div>
                      <div className="pf-treasure-val">{fmtNum(wallet)}</div>
                      <div className="pf-treasure-lbl">berries — wallet boutique</div>
                    </div>
                  </div>
                  <div className="pf-treasure-divider" />
                  {[
                    { lbl: 'Prime publique',  val: `${fmtB(member.berrys)} ฿`,              icon: '⚡' },
                    { lbl: 'Objets possédés', val: `${shopData?.inventory?.length || 0}`,   icon: '📦' },
                    { lbl: 'Transactions',    val: `${shopData?.transactions?.length || 0}`, icon: '📋' },
                  ].map(({ lbl, val, icon }) => (
                    <div className="pf-row" key={lbl}>
                      <span><span style={{ marginRight: 6 }}>{icon}</span>{lbl}</span><strong>{val}</strong>
                    </div>
                  ))}
                  <a className="pf-shop-cta" href="/boutique" onClick={e => { e.preventDefault(); navigate('/boutique') }}>
                    🏪 Visiter la boutique →
                  </a>
                </article>

                <article className="pf-panel">
                  <div className="pf-panel-head"><div className="pf-panel-icon">⚡</div><span>Progression des rangs</span></div>
                  <RankTimeline hours={hours} rank={rank} />
                </article>

              </div>
            )}

            {tab === 'inventaire' && (
              shopData?.inventory?.length
                ? <div className="pf-item-grid">
                    {shopData.inventory.map((item, i) => <InventoryCard key={i} item={item} index={i} />)}
                  </div>
                : <EmptyState icon="📦" title="Inventaire vide"
                    text="Ce pirate n'a pas encore d'objets. Passe à la boutique pour commencer ta collection."
                    cta="🏪 Voir la boutique" onCta={() => navigate('/boutique')} />
            )}

            {tab === 'historique' && (
              shopData?.transactions?.length
                ? <div className="pf-tx-list">
                    {shopData.transactions.map((tx, i) => <TransactionRow key={i} tx={tx} index={i} />)}
                  </div>
                : <EmptyState icon="📜" title="Aucune transaction"
                    text="L'historique d'achats de ce pirate est vide pour le moment."
                    cta="🏪 Découvrir la boutique" onCta={() => navigate('/boutique')} />
            )}

          </div>
        </>}
      </main>

      <style>{`
        @keyframes pfTwinkle  { 0%,100%{opacity:.04;transform:scale(1)} 50%{opacity:.55;transform:scale(1.4)} }
        @keyframes pfRise     { from{opacity:0;transform:translateY(22px) scale(.98)} to{opacity:1;transform:none} }
        @keyframes pfPulse    { 0%,100%{opacity:.45} 50%{opacity:.85} }
        @keyframes pfSpin     { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes pfSpinRev  { from{transform:rotate(0)} to{transform:rotate(-360deg)} }
        @keyframes pfFloat    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes pfShip     { 0%,100%{transform:translateX(-50%) translateY(0) rotate(-2deg)} 50%{transform:translateX(-50%) translateY(-5px) rotate(2deg)} }
        @keyframes pfShimmer  { 0%{left:-100%} 60%{left:130%} 100%{left:130%} }
        @keyframes pfBounty   { from{opacity:0;letter-spacing:-.06em} to{opacity:1;letter-spacing:-.04em} }
        @keyframes pfCardIn   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes pfDotPulse { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.35} 50%{transform:translate(-50%,-50%) scale(2);opacity:0} }
        @keyframes pfTabIn    { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }

        /* Root */
        .pf {
          min-height: 100vh;
          background: #08090D;
          color: #F2F0EA;
          font-family: Inter, system-ui, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        /* Atmosphere */
        .pf-atmo { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .pf-atmo-warm {
          position: absolute; width: 600px; height: 600px;
          top: -10%; right: -5%; border-radius: 50%;
          background: radial-gradient(circle, rgba(191,164,106,.03) 0%, transparent 65%);
          filter: blur(90px);
          animation: pfPulse 14s ease-in-out infinite;
        }
        .pf-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,.006) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.006) 1px, transparent 1px);
          background-size: 80px 80px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 40%, black 0%, transparent 100%);
        }

        /* Main */
        .pf-main {
          position: relative; z-index: 2;
          width: min(1320px, calc(100% - 32px));
          margin: 0 auto;
          padding: 76px 0 120px;
          animation: pfRise .6s cubic-bezier(.22,1,.36,1) both;
        }

        /* Top bar */
        .pf-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
        .pf-btn-back {
          display: flex; align-items: center; gap: 7px;
          height: 38px; padding: 0 18px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.025);
          color: rgba(242,240,234,.4);
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all .2s;
        }
        .pf-btn-back:hover { border-color: rgba(255,255,255,.13); color: #F2F0EA; transform: translateX(-2px); background: rgba(255,255,255,.05); }
        .pf-3d-wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
        .pf-soon-badge {
          font-size: 9px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase;
          color: rgba(191,164,106,.5); background: rgba(191,164,106,.06);
          border: 1px solid rgba(191,164,106,.14); border-radius: 999px; padding: 3px 10px;
        }
        .pf-btn-3d-off {
          height: 38px; padding: 0 18px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,.04); background: rgba(255,255,255,.015);
          color: rgba(242,240,234,.16); font-size: 13px; font-weight: 700;
          cursor: not-allowed; text-decoration: line-through; text-decoration-color: rgba(255,255,255,.08);
        }

        /* Hero card */
        .pf-hero {
          position: relative;
          display: grid; grid-template-columns: 280px 1fr;
          gap: 40px; padding: 36px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,.08);
          background: #11131A;
          box-shadow: 0 40px 90px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.05);
          overflow: hidden; margin-bottom: 24px;
        }
        .pf-hero-topline {
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(191,164,106,.22) 30%, rgba(242,240,234,.08) 50%, rgba(191,164,106,.22) 70%, transparent);
        }

        /* Poster column */
        .pf-poster-col {
          display: flex; flex-direction: column; align-items: center; gap: 14px;
          padding: 12px 0; padding-right: 36px;
          border-right: 1px solid rgba(255,255,255,.06);
          position: relative;
        }
        .pf-poster-corner {
          position: absolute; width: 12px; height: 12px;
          border-color: rgba(191,164,106,.2); border-style: solid;
        }
        .pf-poster-corner-tl { top: 4px; left: 4px;   border-width: 1px 0 0 1px; }
        .pf-poster-corner-tr { top: 4px; right: 36px;  border-width: 1px 1px 0 0; }
        .pf-poster-corner-bl { bottom: 4px; left: 4px;  border-width: 0 0 1px 1px; }
        .pf-poster-corner-br { bottom: 4px; right: 36px; border-width: 0 1px 1px 0; }

        .pf-wanted-header { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 100%; }
        .pf-wanted-text {
          font-size: 10px; font-weight: 900; letter-spacing: .3em; text-transform: uppercase;
          color: rgba(191,164,106,.5); white-space: nowrap;
        }
        .pf-wanted-dashes { display: flex; gap: 5px; align-items: center; }
        .pf-wanted-dashes span { display: block; height: 1px; background: linear-gradient(90deg, transparent, rgba(191,164,106,.2), transparent); }
        .pf-wanted-dashes span:nth-child(1),.pf-wanted-dashes span:nth-child(5) { width: 14px; }
        .pf-wanted-dashes span:nth-child(2),.pf-wanted-dashes span:nth-child(4) { width: 22px; }
        .pf-wanted-dashes span:nth-child(3) { width: 32px; }

        /* Avatar */
        .pf-avatar-wrap { position: relative; width: 180px; height: 180px; flex-shrink: 0; }
        .pf-avatar-ring-a {
          position: absolute; inset: -8px; border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,.11);
          animation: pfPulse 4.5s ease-in-out infinite;
        }
        .pf-avatar-ring-b {
          position: absolute; inset: -18px; border-radius: 50%;
          border: 1px dashed rgba(255,255,255,.05);
          animation: pfSpinRev 35s linear infinite;
        }
        .pf-avatar-ring-b::before {
          content: ''; position: absolute; inset: 10px; border-radius: 50%;
          border: 1px dashed rgba(255,255,255,.035);
          animation: pfSpin 24s linear infinite;
        }
        .pf-avatar-inner {
          position: absolute; inset: 0; border-radius: 50%; overflow: hidden;
          background: #0D0F16; box-shadow: inset 0 0 30px rgba(0,0,0,.5);
        }
        .pf-avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
        .pf-avatar-fb {
          width: 100%; height: 100%; display: flex; align-items: center;
          justify-content: center; font-size: 64px;
        }
        .pf-own-badge {
          position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%);
          white-space: nowrap; padding: 3px 12px; border-radius: 999px;
          background: rgba(191,164,106,.09); border: 1px solid rgba(191,164,106,.2);
          color: #BFA46A; font-size: 8.5px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase;
        }

        /* Prime box */
        .pf-prime-box {
          width: 100%; padding: 14px 16px; border-radius: 14px;
          background: linear-gradient(135deg, rgba(191,164,106,.07) 0%, rgba(191,164,106,.02) 100%);
          border: 1px solid rgba(191,164,106,.15);
          text-align: center; position: relative; overflow: hidden;
        }
        .pf-prime-box::after {
          content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(191,164,106,.04), transparent);
          animation: pfShimmer 10s 2s ease-in-out infinite;
        }
        .pf-prime-label {
          font-size: 8.5px; font-weight: 900; letter-spacing: .24em; text-transform: uppercase;
          color: rgba(191,164,106,.4); margin-bottom: 6px;
        }
        .pf-prime-amount {
          font-size: clamp(22px, 2.6vw, 32px); font-weight: 900;
          color: #BFA46A; letter-spacing: -.04em; line-height: 1;
          animation: pfBounty .9s cubic-bezier(.22,1,.36,1) both;
        }
        .pf-prime-amount em { font-size: 58%; font-style: normal; opacity: .55; margin-left: 3px; }
        .pf-prime-formatted { font-size: 10px; color: rgba(191,164,106,.28); margin-top: 4px; letter-spacing: .04em; }

        /* Rank pill */
        .pf-rank-pill {
          display: flex; align-items: center; gap: 7px; padding: 8px 16px;
          border-radius: 999px;
          background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
          font-size: 12px; font-weight: 700; white-space: nowrap;
          transition: border-color .2s;
        }
        .pf-rank-pill:hover { border-color: rgba(255,255,255,.13); }
        .pf-rank-pill-name { color: rgba(242,240,234,.72); }
        .pf-rank-pill-num {
          padding: 1px 8px; background: rgba(255,255,255,.05);
          border-radius: 999px; font-size: 10.5px; color: rgba(242,240,234,.42);
        }

        /* Badge row */
        .pf-badge-row { display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; }
        .pf-badge {
          display: flex; align-items: center; gap: 4px;
          padding: 3px 9px; border-radius: 999px;
          background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07);
          color: rgba(242,240,234,.5); font-size: 9.5px; font-weight: 700; letter-spacing: .06em;
          white-space: nowrap;
        }

        /* Info column */
        .pf-info-col { display: flex; flex-direction: column; gap: 18px; justify-content: center; }

        .pf-world-row { display: flex; align-items: center; gap: 20px; }
        .pf-world-pos { display: flex; flex-direction: column; gap: 3px; }
        .pf-world-num {
          font-size: 42px; font-weight: 900; color: #F2F0EA;
          line-height: 1; letter-spacing: -.04em;
        }
        .pf-world-label {
          font-size: 8px; font-weight: 800; letter-spacing: .22em; text-transform: uppercase;
          color: rgba(242,240,234,.22);
        }
        .pf-world-sep { width: 1px; height: 42px; background: rgba(255,255,255,.07); flex-shrink: 0; }
        .pf-world-stats { display: flex; flex-direction: column; gap: 8px; }
        .pf-world-stat { display: flex; flex-direction: column; gap: 1px; }
        .pf-world-stat-v { font-size: 14px; font-weight: 800; color: rgba(242,240,234,.65); }
        .pf-world-stat-l { font-size: 10px; color: rgba(242,240,234,.28); letter-spacing: .04em; }

        .pf-name {
          margin: 0;
          font-size: clamp(30px, 3.8vw, 52px); font-weight: 900;
          color: #F2F0EA; letter-spacing: -.025em; line-height: 1.02;
        }

        .pf-id-strip {
          display: flex; align-items: center; gap: 9px; flex-wrap: wrap;
          font-size: 11px; font-weight: 600; color: rgba(242,240,234,.32);
          padding: 9px 13px; border-radius: 10px;
          background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.05);
        }
        .pf-id-dot { color: rgba(255,255,255,.14); }

        /* Stat cards — uniform dark glass */
        .pf-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .pf-stat-card {
          position: relative; padding: 16px 18px 14px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.07);
          border-top: 1px solid rgba(255,255,255,.10);
          background: #171A22;
          overflow: hidden; cursor: default;
          transition: transform .22s, box-shadow .22s, border-color .22s;
          animation: pfCardIn .6s ease both;
        }
        .pf-stat-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255,255,255,.12);
          box-shadow: 0 14px 36px rgba(0,0,0,.32);
        }
        .pf-stat-card-shine {
          position: absolute; top: 0; left: -100%; width: 55%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.02), transparent);
          animation: pfShimmer 10s 1.5s ease-in-out infinite; pointer-events: none;
        }
        .pf-stat-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .pf-stat-icon { font-size: 18px; }
        .pf-stat-label {
          font-size: 8px; letter-spacing: .2em; text-transform: uppercase;
          color: rgba(139,142,152,.65); font-weight: 800;
        }
        .pf-stat-val {
          font-size: 28px; font-weight: 900; line-height: 1; color: #F2F0EA;
          letter-spacing: -.02em;
        }
        .pf-stat-sub { margin-top: 5px; font-size: 10px; color: rgba(139,142,152,.65); }
        .pf-stat-secondary {
          margin-top: 8px; font-size: 9.5px; font-weight: 600;
          color: rgba(139,142,152,.5);
          padding-top: 7px; border-top: 1px solid rgba(255,255,255,.05);
        }
        .pf-stat-badge {
          display: inline-flex; margin-top: 8px;
          padding: 2px 9px; border-radius: 999px;
          background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08);
          color: rgba(242,240,234,.5); font-size: 9.5px; font-weight: 700; letter-spacing: .06em;
        }

        /* Rank Journey */
        .pf-journey {
          padding: 18px 20px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,.07);
          background: #171A22;
        }
        .pf-journey-header {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;
        }
        .pf-journey-from,.pf-journey-to {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 700; color: rgba(242,240,234,.45);
        }
        .pf-journey-rank-icon { font-size: 15px; }
        .pf-journey-pct-wrap { display: flex; align-items: baseline; gap: 2px; }
        .pf-journey-pct { font-size: 28px; font-weight: 900; color: rgba(242,240,234,.5); letter-spacing: -.03em; }
        .pf-journey-pct-sym { font-size: 13px; font-weight: 700; color: rgba(242,240,234,.28); }

        .pf-journey-track-wrap { padding: 8px 0 6px; }
        .pf-journey-track {
          height: 8px; background: rgba(255,255,255,.06); border-radius: 999px;
          position: relative; overflow: visible;
          border: 1px solid rgba(255,255,255,.04);
        }
        .pf-journey-fill {
          height: 100%; border-radius: 999px; position: absolute; top: 0; left: 0;
          background: linear-gradient(90deg, rgba(191,164,106,.55) 0%, #BFA46A 85%, #D4BC8A 100%);
          box-shadow: 0 0 6px rgba(191,164,106,.18);
          transition: width 1.6s cubic-bezier(.22,1,.36,1);
        }
        .pf-journey-ship {
          position: absolute; top: -17px; transform: translateX(-50%);
          font-size: 17px; user-select: none;
          animation: pfShip 3.5s ease-in-out infinite;
        }
        .pf-journey-footer {
          display: flex; justify-content: space-between; align-items: center; margin-top: 10px;
        }
        .pf-journey-foot-left { display: flex; align-items: baseline; gap: 5px; font-size: 12px; }
        .pf-journey-hrs { font-weight: 800; color: rgba(242,240,234,.65); }
        .pf-journey-sep { color: rgba(242,240,234,.2); }
        .pf-journey-target { color: rgba(242,240,234,.32); }
        .pf-journey-remain { font-size: 12px; font-weight: 700; color: rgba(242,240,234,.38); }

        .pf-journey-max {
          display: flex; align-items: center; gap: 16px; padding: 18px 20px;
          border-radius: 14px;
          background: rgba(191,164,106,.05); border: 1px solid rgba(191,164,106,.14);
        }
        .pf-journey-max-icon { font-size: 26px; animation: pfFloat 3.5s ease-in-out infinite; flex-shrink: 0; }
        .pf-journey-max strong { display: block; font-size: 14px; font-weight: 800; color: #BFA46A; }
        .pf-journey-max p { margin: 3px 0 0; font-size: 11px; color: rgba(242,240,234,.28); }

        /* Actions */
        .pf-actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; align-items: center; }
        .pf-btn-action {
          height: 42px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03);
          color: rgba(242,240,234,.5); font-size: 12px; font-weight: 700;
          cursor: pointer; letter-spacing: .02em;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          text-decoration: none; transition: all .2s;
        }
        .pf-btn-action:hover { background: rgba(255,255,255,.07); color: #F2F0EA; border-color: rgba(255,255,255,.15); }
        .pf-wallet-pill {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          height: 42px; padding: 0 16px; border-radius: 10px;
          border: 1px solid rgba(191,164,106,.16); background: rgba(191,164,106,.04);
          transition: all .2s;
        }
        .pf-wallet-pill:hover { background: rgba(191,164,106,.08); border-color: rgba(191,164,106,.25); }
        .pf-wallet-amt { font-size: 16px; font-weight: 900; color: #BFA46A; letter-spacing: -.01em; }
        .pf-wallet-lbl { font-size: 8.5px; color: rgba(191,164,106,.38); font-weight: 700; letter-spacing: .08em; }

        /* Tabs */
        .pf-tabs {
          display: flex; gap: 4px; padding: 5px;
          background: #11131A; border: 1px solid rgba(255,255,255,.07);
          border-radius: 16px; width: max-content; max-width: 100%;
          margin: 0 auto 28px; overflow-x: auto;
        }
        .pf-tab {
          position: relative;
          display: flex; align-items: center; gap: 7px;
          height: 44px; padding: 0 24px;
          border: 1px solid transparent; border-radius: 12px;
          background: none; color: rgba(242,240,234,.28);
          font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all .2s; white-space: nowrap;
        }
        .pf-tab:hover { color: rgba(242,240,234,.62); background: rgba(255,255,255,.03); }
        .pf-tab.active {
          background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.09);
          color: #F2F0EA; font-weight: 700;
          animation: pfTabIn .2s ease both;
        }
        .pf-tab-indicator {
          position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%);
          width: 18px; height: 2px; border-radius: 999px; background: #BFA46A; opacity: .65;
        }

        /* Content */
        .pf-content { animation: pfRise .4s ease both; }

        /* Panels grid — uniform */
        .pf-panel-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .pf-panel {
          padding: 24px; border-radius: 20px;
          border: 1px solid rgba(255,255,255,.07);
          border-top: 1px solid rgba(255,255,255,.10);
          background: #11131A;
          display: flex; flex-direction: column;
          position: relative; overflow: hidden;
          transition: border-color .22s, box-shadow .22s;
        }
        .pf-panel:hover { border-color: rgba(255,255,255,.12); box-shadow: 0 18px 48px rgba(0,0,0,.28); }
        .pf-panel::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.07), transparent);
        }
        .pf-panel-gold { border-color: rgba(191,164,106,.13); }
        .pf-panel-gold::before { background: linear-gradient(90deg, transparent, rgba(191,164,106,.14), transparent); }
        .pf-panel-gold:hover { border-color: rgba(191,164,106,.2); }

        .pf-panel-head {
          display: flex; align-items: center; gap: 9px; margin-bottom: 18px;
          font-size: 9px; letter-spacing: .18em; text-transform: uppercase;
          font-weight: 900; color: rgba(242,240,234,.3);
        }
        .pf-panel-head-gold { color: rgba(191,164,106,.55); }
        .pf-panel-icon {
          width: 27px; height: 27px; border-radius: 8px;
          background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07);
          display: flex; align-items: center; justify-content: center; font-size: 13px;
        }
        .pf-panel-icon-gold { background: rgba(191,164,106,.07); border-color: rgba(191,164,106,.15); }

        /* Passport */
        .pf-passport-avatar {
          display: flex; flex-direction: column; align-items: center; gap: 7px;
          padding: 16px 0 14px; margin-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,.05);
        }
        .pf-passport-img,.pf-passport-fb {
          width: 66px; height: 66px; border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,.1); object-fit: cover;
        }
        .pf-passport-fb {
          display: flex; align-items: center; justify-content: center;
          background: #0D0F16; font-size: 28px;
        }
        .pf-passport-name { font-size: 15px; font-weight: 800; color: rgba(242,240,234,.88); }
        .pf-passport-rank { font-size: 11.5px; font-weight: 700; }
        .pf-passport-badges { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
        .pf-passport-badge {
          padding: 2px 8px; border-radius: 999px;
          background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07);
          color: rgba(242,240,234,.42); font-size: 9px; font-weight: 700; letter-spacing: .06em;
        }

        .pf-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,.04); font-size: 12.5px;
        }
        .pf-row:last-child { border-bottom: none; }
        .pf-row span { color: rgba(242,240,234,.28); display: flex; align-items: center; }
        .pf-row strong { color: rgba(242,240,234,.82); font-weight: 700; }

        /* Treasure */
        .pf-treasure-hero {
          display: flex; align-items: center; gap: 14px; padding: 14px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(191,164,106,.07), rgba(191,164,106,.02));
          border: 1px solid rgba(191,164,106,.13);
          margin-bottom: 14px; position: relative; overflow: hidden;
        }
        .pf-treasure-hero::after {
          content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(191,164,106,.04), transparent);
          animation: pfShimmer 9s 1.5s ease-in-out infinite;
        }
        .pf-treasure-coins {
          width: 44px; height: 44px; border-radius: 50%;
          background: rgba(191,164,106,.1); border: 1px solid rgba(191,164,106,.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; font-weight: 900; color: #BFA46A; flex-shrink: 0;
        }
        .pf-treasure-val { font-size: 22px; font-weight: 900; color: #BFA46A; letter-spacing: -.02em; }
        .pf-treasure-lbl { font-size: 10px; color: rgba(191,164,106,.28); letter-spacing: .06em; margin-top: 2px; }
        .pf-treasure-divider { height: 1px; background: rgba(191,164,106,.07); margin-bottom: 2px; }
        .pf-shop-cta {
          display: flex; align-items: center; justify-content: center;
          margin-top: 12px; padding: 10px 0; border-radius: 10px;
          border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.025);
          color: rgba(242,240,234,.45); font-size: 12px; font-weight: 700;
          text-decoration: none; cursor: pointer; letter-spacing: .04em; transition: all .2s;
        }
        .pf-shop-cta:hover { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.14); color: #F2F0EA; }

        /* Rank Timeline */
        .pf-timeline { display: flex; flex-direction: column; }
        .pf-tl-row {
          display: flex; align-items: flex-start; gap: 12px;
          position: relative; padding: 8px 10px 8px 0;
          opacity: .2; transition: opacity .2s;
        }
        .pf-tl-row.done    { opacity: .52; }
        .pf-tl-row.current { opacity: 1; }
        .pf-tl-row.legend:not(.done) { opacity: .3; }

        .pf-tl-line {
          position: absolute; left: 14px; top: 32px; bottom: -8px;
          width: 1px; background: rgba(255,255,255,.07); z-index: 0;
        }
        .pf-tl-line.done { background: rgba(255,255,255,.12); }

        .pf-tl-dot {
          width: 28px; height: 28px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%; border: 1px solid rgba(255,255,255,.09);
          background: rgba(255,255,255,.03);
          font-size: 11px; position: relative; z-index: 1; margin-top: 2px;
          transition: all .25s;
        }
        .pf-tl-row.done .pf-tl-dot    { border-color: rgba(255,255,255,.15); background: rgba(255,255,255,.05); }
        .pf-tl-row.current .pf-tl-dot {
          border-color: rgba(191,164,106,.4); background: rgba(191,164,106,.09);
          box-shadow: 0 0 10px rgba(191,164,106,.12);
        }
        .pf-tl-dot-pulse {
          position: absolute; inset: -4px; border-radius: 50%;
          background: rgba(191,164,106,.25); opacity: 0;
          animation: pfDotPulse 2.5s ease-in-out infinite;
        }
        .pf-tl-dot-inner { position: relative; z-index: 1; font-size: 11px; }

        .pf-tl-content { flex: 1; padding-top: 3px; }
        .pf-tl-top { display: flex; align-items: center; gap: 7px; margin-bottom: 3px; }
        .pf-tl-name { font-size: 12.5px; font-weight: 700; color: rgba(242,240,234,.55); }
        .pf-tl-row.current .pf-tl-name { color: #F2F0EA; }
        .pf-tl-current-badge {
          padding: 1px 7px; border-radius: 999px;
          background: rgba(191,164,106,.09); border: 1px solid rgba(191,164,106,.2);
          color: #BFA46A; font-size: 7.5px; font-weight: 900; letter-spacing: .1em;
        }
        .pf-tl-legend-badge {
          padding: 1px 7px; border-radius: 999px;
          background: rgba(191,164,106,.06); border: 1px solid rgba(191,164,106,.15);
          color: rgba(191,164,106,.6); font-size: 7.5px; font-weight: 900; letter-spacing: .1em;
        }
        .pf-tl-req { font-size: 10px; color: rgba(242,240,234,.24); display: flex; align-items: center; gap: 8px; }
        .pf-tl-done-lbl { color: rgba(242,240,234,.38); font-weight: 700; }
        .pf-tl-curr-lbl { color: rgba(191,164,106,.65); font-weight: 700; }

        /* Inventory */
        .pf-item-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 12px; }
        .pf-item {
          position: relative; padding: 16px; border-radius: 16px;
          border: 1px solid rgba(255,255,255,.07); border-top: 1px solid rgba(255,255,255,.10);
          background: #11131A;
          overflow: hidden; display: flex; flex-direction: column; gap: 7px;
          transition: transform .22s, box-shadow .22s, border-color .22s;
          animation: pfCardIn .5s ease both;
        }
        .pf-item:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,0,0,.3); border-color: rgba(255,255,255,.12); }
        .pf-item-shine {
          position: absolute; top: 0; left: -100%; width: 55%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.02), transparent);
          animation: pfShimmer 8s .5s ease-in-out infinite; pointer-events: none;
        }
        .pf-item-rarity {
          display: flex; align-items: center; gap: 5px; font-size: 8px;
          font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
          color: rgba(242,240,234,.28);
        }
        .pf-item-icon { font-size: 26px; }
        .pf-item-name { font-size: 13px; font-weight: 700; color: rgba(242,240,234,.84); line-height: 1.3; }
        .pf-item-desc { margin: 0; font-size: 11px; color: rgba(242,240,234,.3); line-height: 1.5; }
        .pf-item-time { font-size: 10px; color: rgba(242,240,234,.2); margin-top: 2px; }

        /* Transactions */
        .pf-tx-list { display: flex; flex-direction: column; gap: 6px; }
        .pf-tx {
          display: flex; align-items: center; gap: 14px; padding: 12px 16px;
          border-radius: 12px; border: 1px solid rgba(255,255,255,.06);
          background: #11131A;
          animation: pfCardIn .5s ease both; transition: transform .2s, border-color .2s;
        }
        .pf-tx:hover { transform: translateX(2px); border-color: rgba(255,255,255,.1); }
        .pf-tx-icon {
          width: 34px; height: 34px; border-radius: 50%;
          background: rgba(191,164,106,.07); border: 1px solid rgba(191,164,106,.15);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 900; color: #BFA46A; flex-shrink: 0;
        }
        .pf-tx-info { flex: 1; }
        .pf-tx-info strong { display: block; font-size: 13px; font-weight: 700; color: rgba(242,240,234,.8); }
        .pf-tx-info span { font-size: 11px; color: rgba(242,240,234,.26); }
        .pf-tx-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
        .pf-tx-right em { font-style: normal; font-size: 14px; font-weight: 800; color: rgba(242,240,234,.5); }
        .pf-tx-right span { font-size: 10px; color: rgba(242,240,234,.24); }

        /* Empty state */
        .pf-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 14px; padding: 100px 0;
          color: rgba(242,240,234,.28); text-align: center;
        }
        .pf-empty span { font-size: 46px; animation: pfFloat 3.5s ease-in-out infinite; }
        .pf-empty strong { font-size: 18px; font-weight: 700; color: rgba(242,240,234,.48); }
        .pf-empty p { font-size: 13px; max-width: 340px; margin: 0; line-height: 1.6; }
        .pf-empty-cta {
          margin-top: 4px; padding: 11px 26px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,.09); background: rgba(255,255,255,.03);
          color: rgba(242,240,234,.5); font-size: 13px; font-weight: 700;
          cursor: pointer; letter-spacing: .04em; transition: all .2s;
        }
        .pf-empty-cta:hover { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.16); color: #F2F0EA; }

        /* Responsive */
        @media (max-width: 1100px) {
          .pf-hero { grid-template-columns: 1fr; gap: 28px; }
          .pf-poster-col {
            flex-direction: row; flex-wrap: wrap; justify-content: center;
            border-right: none; border-bottom: 1px solid rgba(255,255,255,.05);
            padding-right: 0; padding-bottom: 28px;
          }
          .pf-avatar-wrap { width: 150px; height: 150px; }
          .pf-panel-grid { grid-template-columns: 1fr 1fr; }
          .pf-panel-grid > .pf-panel:last-child { grid-column: 1 / -1; }
        }
        @media (max-width: 780px) {
          .pf-stats { grid-template-columns: 1fr; }
          .pf-actions { grid-template-columns: 1fr 1fr; }
          .pf-panel-grid { grid-template-columns: 1fr; }
          .pf-name { font-size: 30px; }
          .pf-world-num { font-size: 32px; }
        }
        @media (max-width: 600px) {
          .pf-hero { padding: 20px 16px; }
          .pf-main { padding-top: 62px; }
          .pf-actions { grid-template-columns: 1fr; }
          .pf-avatar-wrap { width: 130px; height: 130px; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
        }
      `}</style>
    </div>
  )
}
