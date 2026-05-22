import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { fetchBerryShopState, RARITY_STYLES } from '../lib/berryShop.js'
import { fetchMemberProfile } from '../lib/supabase.js'
import Navbar from './Navbar.jsx'

// ─── Rang system ─────────────────────────────────────────────────────────────
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

// ─── Background: Star field ──────────────────────────────────────────────────
function Stars() {
  const stars = useMemo(() => Array.from({ length: 72 }, (_, i) => ({
    x: (i * 37.3 + 11) % 98,
    y: (i * 41.7 + 7) % 95,
    size: i % 7 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 1,
    dur: 2.8 + (i * 0.29) % 4.2,
    delay: (i * 0.21) % 6,
    gold: i % 11 === 0,
  })), [])
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${s.x}%`,
          top: `${s.y}%`,
          width: s.size,
          height: s.size,
          borderRadius: '50%',
          background: s.gold ? 'rgba(212,160,23,0.75)' : 'rgba(255,255,255,0.55)',
          animation: `pfTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

// ─── Background: Scan line ───────────────────────────────────────────────────
function ScanLine() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.05) 70%, transparent 100%)',
        animation: 'pfScan 12s linear infinite',
      }} />
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function EmptyState({ icon, title, text }) {
  return (
    <div className="pf-empty">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  )
}

function InventoryCard({ item, index }) {
  const si     = item?.shop_items || item || {}
  const rarity = si.rarity || 'Commun'
  const style  = RARITY_STYLES[rarity] || RARITY_STYLES.Commun
  const stars  = { Commun: 1, Rare: 2, Epique: 3, Legendaire: 4, Mythique: 5 }[rarity] || 1
  return (
    <article className="pf-item" style={{
      '--acc': style.color,
      animationDelay: `${index * 0.06}s`,
    }}>
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
    <div className="pf-tx" style={{
      '--acc': style.color,
      animationDelay: `${index * 0.05}s`,
    }}>
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
    Promise.all([fetchMemberProfile(discordId), fetchBerryShopState(discordId)])
      .then(([profile, shop]) => {
        if (!dead) { setMember(profile); setShopData(shop); setLoading(false) }
      })
      .catch(() => { if (!dead) setLoading(false) })
    return () => { dead = true }
  }, [discordId])

  const hours      = parseFloat(member?.vocal_h || 0)
  const rank       = getRank(hours)
  const nextRank   = getNextRank(rank)
  const remaining  = nextRank ? Math.max(0, nextRank.min - hours) : 0
  const progPct    = nextRank ? Math.min(100, ((hours - rank.min) / (nextRank.min - rank.min)) * 100) : 100
  const isOwn      = String(myId) === String(discordId)
  const displayName = member?.username || `Pirate #${String(member?.uid || '').slice(-4)}`
  const wallet     = useMemo(() => shopData && !shopData.preview ? shopData.balance || 0 : member?.berrys || 0, [member, shopData])

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

      {/* Atmospheric background */}
      <div className="pf-atmo" aria-hidden>
        <div className="pf-atmo-a" />
        <div className="pf-atmo-b" />
        <div className="pf-atmo-c" />
      </div>

      <main className="pf-main">

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
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

          {/* ══ HERO CARD ════════════════════════════════════════════════════ */}
          <section className="pf-hero">

            {/* Decorative top shimmer line */}
            <div className="pf-hero-topline" />

            {/* Atmospheric hero glow */}
            <div className="pf-hero-glow" aria-hidden />

            {/* ── Left: wanted poster column ── */}
            <div className="pf-poster-col">

              {/* WANTED header */}
              <div className="pf-wanted-header">
                <div className="pf-wanted-dashes">
                  <span /><span /><span /><span /><span />
                </div>
                <div className="pf-wanted-text">DEAD OR ALIVE</div>
                <div className="pf-wanted-dashes">
                  <span /><span /><span /><span /><span />
                </div>
              </div>

              {/* Avatar */}
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

              {/* PRIME (bounty) display */}
              <div className="pf-prime-box">
                <div className="pf-prime-label">PRIME</div>
                <div className="pf-prime-amount">
                  <CountUp value={parseInt(member.berrys || 0)} suffix="" decimals={0} />
                  <em>฿</em>
                </div>
                <div className="pf-prime-formatted">{fmtNum(member.berrys)} berries</div>
              </div>

              {/* Rank badge */}
              <div className="pf-rank-pill">
                <span className="pf-rank-emoji">{rank.emoji}</span>
                <span className="pf-rank-name">{rank.rang}</span>
                <span className="pf-rank-num">#{member.rank}</span>
              </div>

            </div>

            {/* ── Right: info column ── */}
            <div className="pf-info-col">

              {/* World position */}
              <div className="pf-world-row">
                <div className="pf-world-pos">
                  <span className="pf-world-num">#{member.rank}</span>
                  <span className="pf-world-label">MONDIAL</span>
                </div>
                <div className="pf-world-sep" />
                <div className="pf-world-total">{member.total} <span>nakamas</span></div>
              </div>

              {/* Name */}
              <h1 className="pf-name">{displayName}</h1>

              {/* Stat cards */}
              <div className="pf-stats">
                {[
                  {
                    icon: '🎤',
                    label: 'VOCAL',
                    val: <><CountUp value={hours} decimals={1} />h</>,
                    sub: 'heures vocal',
                    c: rank.color,
                    stars: 0,
                  },
                  {
                    icon: '🌍',
                    label: 'CLASSEMENT',
                    val: `#${member.rank}`,
                    sub: `/ ${member.total}`,
                    c: '#4F8CFF',
                    stars: 0,
                  },
                  {
                    icon: '📦',
                    label: 'INVENTAIRE',
                    val: shopData?.inventory?.length || 0,
                    sub: 'objets possédés',
                    c: '#2ECC71',
                    stars: 0,
                  },
                ].map(({ icon, label, val, sub, c }) => (
                  <div key={label} className="pf-stat-card" style={{ '--c': c }}>
                    <div className="pf-stat-card-shine" />
                    <div className="pf-stat-card-glow" />
                    <div className="pf-stat-card-top" />
                    <div className="pf-stat-icon">{icon}</div>
                    <div className="pf-stat-label">{label}</div>
                    <div className="pf-stat-val">{val}</div>
                    <div className="pf-stat-sub">{sub}</div>
                  </div>
                ))}
              </div>

              {/* Progress */}
              {nextRank ? (
                <div className="pf-prog-wrap">
                  <div className="pf-prog-top">
                    <div className="pf-prog-route">
                      <span style={{ color: rank.color }}>{rank.emoji} {rank.rang}</span>
                      <span className="pf-prog-arrow">→</span>
                      <span style={{ color: nextRank.color }}>{nextRank.emoji} {nextRank.rang}</span>
                    </div>
                    <span className="pf-prog-pct">{progPct.toFixed(0)}%</span>
                  </div>
                  <div className="pf-prog-track">
                    <div className="pf-prog-fill" style={{ width: `${progPct}%`, '--nc': nextRank.color }} />
                    <div className="pf-prog-ship" style={{ left: `${Math.min(progPct, 96)}%` }}>🏴‍☠️</div>
                  </div>
                  <div className="pf-prog-bot">
                    <span>{hours.toFixed(1)}h / {nextRank.min}h</span>
                    <span className="pf-prog-remain">{remaining.toFixed(1)}h restantes</span>
                  </div>
                </div>
              ) : (
                <div className="pf-prog-max">
                  <span>👑</span>
                  <div>
                    <strong>Grand Line conquise</strong>
                    <p>Rang maximum atteint</p>
                  </div>
                </div>
              )}

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
              <button
                key={t.key}
                className={`pf-tab${tab === t.key ? ' active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                <span className="pf-tab-icon">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>

          {/* ══ CONTENT ═══════════════════════════════════════════════════════ */}
          <div className="pf-content">

            {tab === 'stats' && (
              <div className="pf-panel-grid">

                {/* Identité */}
                <article className="pf-panel">
                  <div className="pf-panel-head">
                    <div className="pf-panel-icon">🪪</div>
                    <span>Identité</span>
                  </div>
                  {[
                    ['Pseudo',      displayName],
                    ['Discord ID',  member.uid],
                    ['Rang actuel', `${rank.emoji} ${rank.rang}`],
                    ['Position',    `#${member.rank} / ${member.total}`],
                    ['Heures vocal', `${hours.toFixed(1)} h`],
                  ].map(([lbl, val]) => (
                    <div className="pf-row" key={lbl}>
                      <span>{lbl}</span>
                      <strong>{val}</strong>
                    </div>
                  ))}
                </article>

                {/* Trésor */}
                <article className="pf-panel pf-panel-gold">
                  <div className="pf-panel-head">
                    <div className="pf-panel-icon">🪙</div>
                    <span>Trésor</span>
                  </div>
                  <div className="pf-treasure-card">
                    <div className="pf-treasure-orb">฿</div>
                    <div className="pf-treasure-info">
                      <div className="pf-treasure-val">{fmtNum(wallet)}</div>
                      <div className="pf-treasure-lbl">berries · wallet boutique</div>
                    </div>
                  </div>
                  {[
                    ['Prime publique',  `${fmtB(member.berrys)} ฿`],
                    ['Inventaire',      `${shopData?.inventory?.length || 0} objets`],
                    ['Transactions',    `${shopData?.transactions?.length || 0}`],
                  ].map(([lbl, val]) => (
                    <div className="pf-row" key={lbl}>
                      <span>{lbl}</span>
                      <strong>{val}</strong>
                    </div>
                  ))}
                </article>

                {/* Rangs */}
                <article className="pf-panel">
                  <div className="pf-panel-head">
                    <div className="pf-panel-icon">⚡</div>
                    <span>Rangs débloqués</span>
                  </div>
                  <div className="pf-rank-list">
                    {RANK_MAP.slice().reverse().map(r => {
                      const done    = hours >= r.min
                      const current = rank.rang === r.rang
                      return (
                        <div
                          key={r.rang}
                          className={`pf-rank-row${done ? ' done' : ''}${current ? ' current' : ''}`}
                          style={{ '--rrc': r.color }}
                        >
                          <div className="pf-rank-left">
                            <span className="pf-rank-em">{r.emoji}</span>
                            <div>
                              <strong>{r.rang}</strong>
                              <span>{r.min}h requis</span>
                            </div>
                          </div>
                          <span className="pf-rank-status">
                            {current ? '● ACTUEL' : done ? '✓' : '○'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </article>

              </div>
            )}

            {tab === 'inventaire' && (
              shopData?.inventory?.length
                ? <div className="pf-item-grid">
                    {shopData.inventory.map((item, i) => <InventoryCard key={i} item={item} index={i} />)}
                  </div>
                : <EmptyState icon="📦" title="Inventaire vide" text="Aucun objet boutique pour ce pirate." />
            )}

            {tab === 'historique' && (
              shopData?.transactions?.length
                ? <div className="pf-tx-list">
                    {shopData.transactions.map((tx, i) => <TransactionRow key={i} tx={tx} index={i} />)}
                  </div>
                : <EmptyState icon="📜" title="Aucune transaction" text="L'historique d'achats est vide." />
            )}

          </div>
        </>}
      </main>

      {/* ── All styles ── */}
      <style>{`
        /* ── Keyframes ──────────────────────────────────────────────────────────── */
        @keyframes pfTwinkle   { 0%,100%{opacity:.08;transform:scale(1)}   50%{opacity:.90;transform:scale(1.8)}  }
        @keyframes pfScan      { 0%{top:-2%}                                100%{top:102%}                         }
        @keyframes pfRise      { from{opacity:0;transform:translateY(28px) scale(.97)} to{opacity:1;transform:none} }
        @keyframes pfBlobA     { 0%,100%{transform:translate(-50%,-50%) scale(1) rotate(0deg)}   50%{transform:translate(-50%,-50%) scale(1.12) rotate(8deg)}  }
        @keyframes pfBlobB     { 0%,100%{transform:translate(-50%,-50%) scale(1) rotate(0deg)}   50%{transform:translate(-50%,-50%) scale(1.08) rotate(-6deg)} }
        @keyframes pfPulse     { 0%,100%{opacity:.65}  50%{opacity:1}     }
        @keyframes pfSpin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)}        }
        @keyframes pfSpinRev   { from{transform:rotate(0deg)} to{transform:rotate(-360deg)}       }
        @keyframes pfFloat     { 0%,100%{transform:translateY(0)}     50%{transform:translateY(-8px)}      }
        @keyframes pfShip      { 0%,100%{transform:translateX(-50%) translateY(0) rotate(-3deg)} 50%{transform:translateX(-50%) translateY(-6px) rotate(3deg)} }
        @keyframes pfShimmer   { 0%{left:-100%} 60%{left:130%} 100%{left:130%} }
        @keyframes pfGlow      { 0%,100%{opacity:.55}  50%{opacity:.95}   }
        @keyframes pfSlide     { from{opacity:0;transform:translateX(12px)} to{opacity:1;transform:none} }
        @keyframes pfBounty    { from{opacity:0;letter-spacing:-.06em} to{opacity:1;letter-spacing:-.04em} }
        @keyframes pfCardIn    { from{opacity:0;transform:translateY(16px) scale(.98)} to{opacity:1;transform:none} }

        /* ── Root ───────────────────────────────────────────────────────────────── */
        .pf {
          min-height: 100vh;
          background: #03040a;
          color: #f0ead6;
          font-family: Inter, system-ui, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        /* ── Atmospheric background ─────────────────────────────────────────────── */
        .pf-atmo { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .pf-atmo-a {
          position: absolute;
          width: 800px; height: 800px;
          top: -15%; right: -10%;
          transform: translate(0, 0);
          border-radius: 50%;
          background: radial-gradient(circle, var(--rc20) 0%, transparent 65%);
          filter: blur(60px);
          animation: pfGlow 8s ease-in-out infinite;
        }
        .pf-atmo-b {
          position: absolute;
          width: 600px; height: 600px;
          top: 35%; left: -12%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(79,140,255,0.07) 0%, transparent 65%);
          filter: blur(60px);
          animation: pfGlow 11s 3s ease-in-out infinite;
        }
        .pf-atmo-c {
          position: absolute;
          width: 400px; height: 400px;
          bottom: 5%; right: 20%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(46,204,113,0.05) 0%, transparent 65%);
          filter: blur(50px);
          animation: pfGlow 9s 6s ease-in-out infinite;
        }

        /* ── Main container ─────────────────────────────────────────────────────── */
        .pf-main {
          position: relative;
          z-index: 2;
          width: min(1280px, calc(100% - 32px));
          margin: 0 auto;
          padding: 76px 0 100px;
          animation: pfRise .7s cubic-bezier(.22,1,.36,1) both;
        }

        /* ── Top bar ────────────────────────────────────────────────────────────── */
        .pf-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }
        .pf-btn-back {
          display: flex; align-items: center; gap: 6px;
          height: 38px; padding: 0 18px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,.09);
          background: rgba(255,255,255,.04);
          color: rgba(240,234,214,.55);
          font-size: 13px; font-weight: 600;
          cursor: pointer; letter-spacing: .02em;
          transition: all .2s;
        }
        .pf-btn-back:hover {
          border-color: rgba(255,255,255,.2);
          color: #f0ead6;
          transform: translateX(-2px);
          background: rgba(255,255,255,.07);
        }
        .pf-3d-wrap {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 5px;
        }
        .pf-soon-badge {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: rgba(212,160,23,.70);
          background: rgba(212,160,23,.08);
          border: 1px solid rgba(212,160,23,.22);
          border-radius: 999px;
          padding: 3px 10px;
        }
        .pf-btn-3d-off {
          height: 38px;
          padding: 0 18px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.02);
          color: rgba(240,234,214,.22);
          font-size: 13px; font-weight: 700;
          cursor: not-allowed;
          letter-spacing: .03em;
          text-decoration: line-through;
          text-decoration-color: rgba(255,255,255,.15);
        }

        /* ── Hero card ──────────────────────────────────────────────────────────── */
        .pf-hero {
          position: relative;
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 32px;
          padding: 32px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,.07);
          background:
            radial-gradient(circle at 0% 0%, var(--rc10) 0%, transparent 55%),
            linear-gradient(160deg, rgba(255,255,255,.035) 0%, rgba(3,4,10,.96) 100%);
          box-shadow:
            0 40px 100px rgba(0,0,0,.6),
            inset 0 1px 0 rgba(255,255,255,.06),
            0 0 0 1px rgba(255,255,255,.04);
          overflow: hidden;
          margin-bottom: 20px;
        }
        .pf-hero-topline {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, var(--rc) 30%, rgba(242,201,76,.5) 50%, var(--rc) 70%, transparent 100%);
          opacity: .55;
        }
        .pf-hero-glow {
          position: absolute;
          top: -80px; left: -80px;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, var(--rc20) 0%, transparent 65%);
          filter: blur(40px);
          pointer-events: none;
          animation: pfGlow 7s ease-in-out infinite;
        }

        /* ── Poster column (left) ───────────────────────────────────────────────── */
        .pf-poster-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 8px 0;
          border-right: 1px solid rgba(255,255,255,.06);
          padding-right: 32px;
        }

        /* WANTED header */
        .pf-wanted-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          width: 100%;
        }
        .pf-wanted-text {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .28em;
          text-transform: uppercase;
          color: rgba(212,160,23,.65);
          text-shadow: 0 0 20px rgba(212,160,23,.3);
          white-space: nowrap;
        }
        .pf-wanted-dashes {
          display: flex;
          gap: 5px;
          align-items: center;
        }
        .pf-wanted-dashes span {
          display: block;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(212,160,23,.35), transparent);
        }
        .pf-wanted-dashes span:nth-child(1),
        .pf-wanted-dashes span:nth-child(5) { width: 14px; }
        .pf-wanted-dashes span:nth-child(2),
        .pf-wanted-dashes span:nth-child(4) { width: 22px; }
        .pf-wanted-dashes span:nth-child(3) { width: 30px; }

        /* Avatar */
        .pf-avatar-wrap {
          position: relative;
          width: 180px; height: 180px;
          flex-shrink: 0;
        }
        .pf-avatar-ring-a {
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 2px solid var(--rc);
          box-shadow: 0 0 20px var(--rc40), inset 0 0 14px var(--rc20);
          animation: pfPulse 3s ease-in-out infinite;
        }
        .pf-avatar-ring-b {
          position: absolute;
          inset: -16px;
          border-radius: 50%;
          border: 1px dashed var(--rc40);
          animation: pfSpinRev 24s linear infinite;
          opacity: .6;
        }
        .pf-avatar-ring-b::before {
          content: '';
          position: absolute;
          inset: 8px;
          border-radius: 50%;
          border: 1px dashed var(--rc20);
          animation: pfSpin 18s linear infinite;
        }
        .pf-avatar-inner {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          overflow: hidden;
          background: #080914;
          box-shadow: inset 0 0 30px rgba(0,0,0,.5);
        }
        .pf-avatar-img {
          width: 100%; height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }
        .pf-avatar-fb {
          width: 100%; height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 60px;
        }
        .pf-avatar-halo {
          position: absolute;
          inset: -30px;
          border-radius: 50%;
          background: radial-gradient(circle, var(--rc20), transparent 60%);
          pointer-events: none;
          animation: pfGlow 5s ease-in-out infinite;
        }
        .pf-own-badge {
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          padding: 3px 12px;
          border-radius: 999px;
          background: rgba(242,201,76,.15);
          border: 1px solid rgba(242,201,76,.35);
          color: #F2C94C;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        /* PRIME box */
        .pf-prime-box {
          width: 100%;
          padding: 14px 16px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(212,160,23,.1) 0%, rgba(212,160,23,.04) 100%);
          border: 1px solid rgba(212,160,23,.22);
          border-top: 2px solid rgba(212,160,23,.45);
          text-align: center;
          position: relative;
          overflow: hidden;
          box-shadow: 0 0 30px rgba(212,160,23,.06);
        }
        .pf-prime-box::before {
          content: '';
          position: absolute;
          top: -30%; right: -10%;
          width: 120px; height: 120px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(212,160,23,.12), transparent 65%);
          pointer-events: none;
        }
        .pf-prime-label {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: rgba(212,160,23,.55);
          margin-bottom: 5px;
        }
        .pf-prime-amount {
          font-size: clamp(22px, 2.8vw, 32px);
          font-weight: 900;
          color: #d4a017;
          letter-spacing: -.04em;
          line-height: 1;
          text-shadow: 0 0 24px rgba(212,160,23,.45);
          animation: pfBounty .8s cubic-bezier(.22,1,.36,1) both;
        }
        .pf-prime-amount em {
          font-size: 60%;
          font-style: normal;
          opacity: .75;
          margin-left: 3px;
        }
        .pf-prime-formatted {
          font-size: 10px;
          color: rgba(212,160,23,.4);
          margin-top: 4px;
          letter-spacing: .04em;
        }

        /* Rank pill */
        .pf-rank-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          border-radius: 999px;
          background: var(--rc20);
          border: 1px solid var(--rc40);
          color: var(--rc);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .04em;
          box-shadow: 0 0 20px var(--rc20);
          white-space: nowrap;
        }
        .pf-rank-emoji { font-size: 16px; }
        .pf-rank-num {
          padding: 2px 8px;
          background: var(--rc40);
          border-radius: 999px;
          font-size: 11px;
        }

        /* ── Info column (right) ────────────────────────────────────────────────── */
        .pf-info-col {
          display: flex;
          flex-direction: column;
          gap: 20px;
          justify-content: center;
        }

        /* World rank row */
        .pf-world-row {
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .pf-world-pos {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .pf-world-num {
          font-size: 36px;
          font-weight: 900;
          color: var(--rc);
          line-height: 1;
          letter-spacing: -.03em;
          text-shadow: 0 0 30px var(--rc40);
        }
        .pf-world-label {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: rgba(240,234,214,.35);
        }
        .pf-world-sep {
          width: 1px;
          height: 40px;
          background: rgba(255,255,255,.1);
        }
        .pf-world-total {
          font-size: 14px;
          font-weight: 600;
          color: rgba(240,234,214,.45);
        }
        .pf-world-total span { color: rgba(240,234,214,.28); font-size: 12px; }

        /* Name */
        .pf-name {
          margin: 0;
          font-size: clamp(30px, 4vw, 52px);
          font-weight: 900;
          line-height: 1.02;
          color: transparent;
          background: linear-gradient(130deg, #ffffff 0%, rgba(255,255,255,.9) 45%, var(--rc) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          letter-spacing: -.02em;
          text-shadow: none;
        }

        /* ── Stat cards ─────────────────────────────────────────────────────────── */
        .pf-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .pf-stat-card {
          position: relative;
          padding: 16px 18px;
          border-radius: 16px;
          border: 1px solid color-mix(in srgb, var(--c) 18%, rgba(255,255,255,.06));
          border-top: 2px solid color-mix(in srgb, var(--c) 45%, transparent);
          background: linear-gradient(160deg, color-mix(in srgb, var(--c) 7%, rgba(3,4,10,.9)) 0%, rgba(3,4,10,.95) 100%);
          overflow: hidden;
          transition: transform .25s, box-shadow .25s, border-color .25s;
          cursor: default;
          animation: pfCardIn .6s ease both;
        }
        .pf-stat-card:hover {
          transform: translateY(-3px);
          border-color: color-mix(in srgb, var(--c) 50%, transparent);
          box-shadow: 0 16px 40px color-mix(in srgb, var(--c) 20%, rgba(0,0,0,.4)), 0 0 0 1px color-mix(in srgb, var(--c) 15%, transparent);
        }
        .pf-stat-card-top {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--c), transparent);
          opacity: .8;
        }
        .pf-stat-card-glow {
          position: absolute;
          top: -30%; right: -10%;
          width: 100px; height: 100px;
          border-radius: 50%;
          background: radial-gradient(circle, color-mix(in srgb, var(--c) 18%, transparent) 0%, transparent 65%);
          pointer-events: none;
          animation: pfGlow 5s ease-in-out infinite;
        }
        .pf-stat-card-shine {
          position: absolute;
          top: 0; left: -100%; width: 55%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.04), transparent);
          animation: pfShimmer 6s 1.5s ease-in-out infinite;
          pointer-events: none;
        }
        .pf-stat-icon { font-size: 20px; margin-bottom: 8px; }
        .pf-stat-label {
          font-size: 8.5px;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: rgba(240,234,214,.32);
          margin-bottom: 5px;
          font-weight: 800;
        }
        .pf-stat-val {
          font-size: 28px;
          font-weight: 900;
          line-height: 1;
          color: var(--c);
          text-shadow: 0 0 24px color-mix(in srgb, var(--c) 45%, transparent);
          letter-spacing: -.02em;
        }
        .pf-stat-sub {
          margin-top: 5px;
          font-size: 10.5px;
          color: rgba(240,234,214,.28);
        }

        /* ── Progress bar ───────────────────────────────────────────────────────── */
        .pf-prog-wrap {
          padding: 18px 20px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.025);
          backdrop-filter: blur(4px);
        }
        .pf-prog-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          font-size: 12px;
        }
        .pf-prog-route {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
        }
        .pf-prog-arrow { color: rgba(240,234,214,.35); font-size: 14px; }
        .pf-prog-pct {
          font-size: 22px;
          font-weight: 900;
          color: rgba(240,234,214,.55);
          letter-spacing: -.02em;
        }
        .pf-prog-track {
          height: 10px;
          background: rgba(255,255,255,.06);
          border-radius: 999px;
          position: relative;
          overflow: visible;
          border: 1px solid rgba(255,255,255,.04);
        }
        .pf-prog-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, color-mix(in srgb, var(--nc) 40%, #0a0b14), var(--nc));
          box-shadow: 0 0 14px var(--nc), 0 0 28px color-mix(in srgb, var(--nc) 25%, transparent);
          transition: width 1.4s cubic-bezier(.22,1,.36,1);
          position: relative;
        }
        .pf-prog-ship {
          position: absolute;
          top: -16px;
          transform: translateX(-50%);
          font-size: 20px;
          user-select: none;
          animation: pfShip 2.8s ease-in-out infinite;
          filter: drop-shadow(0 0 8px var(--rc));
        }
        .pf-prog-bot {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
          font-size: 11px;
          color: rgba(240,234,214,.38);
        }
        .pf-prog-remain { font-weight: 700; color: rgba(240,234,214,.6); }
        .pf-prog-max {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
          border-radius: 14px;
          background: rgba(255,215,0,.06);
          border: 1px solid rgba(255,215,0,.2);
        }
        .pf-prog-max span { font-size: 28px; animation: pfFloat 3s ease-in-out infinite; }
        .pf-prog-max strong { display: block; font-size: 14px; font-weight: 800; color: #F2C94C; }
        .pf-prog-max p { margin: 3px 0 0; font-size: 11px; color: rgba(240,234,214,.38); }

        /* ── Actions ────────────────────────────────────────────────────────────── */
        .pf-actions {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          align-items: center;
        }
        .pf-btn-share {
          height: 42px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          color: rgba(240,234,214,.75);
          font-size: 12px; font-weight: 700;
          cursor: pointer; letter-spacing: .02em;
          transition: all .2s;
        }
        .pf-btn-share:hover { background: rgba(255,255,255,.08); color: #f0ead6; border-color: rgba(255,255,255,.2); }
        .pf-btn-discord {
          height: 42px;
          border-radius: 10px;
          border: 1px solid rgba(88,101,242,.4);
          background: linear-gradient(135deg, rgba(88,101,242,.18), rgba(88,101,242,.08));
          color: #a5adfa;
          font-size: 12px; font-weight: 700;
          cursor: pointer; letter-spacing: .02em;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          text-decoration: none;
          transition: all .2s;
        }
        .pf-btn-discord:hover { background: rgba(88,101,242,.28); color: #c5cbff; box-shadow: 0 0 24px rgba(88,101,242,.28); }
        .pf-wallet-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 0 14px;
          height: 42px;
          border-radius: 10px;
          border: 1px solid rgba(212,160,23,.22);
          background: rgba(212,160,23,.06);
          justify-content: center;
        }
        .pf-wallet-icon { font-size: 14px; }
        .pf-wallet-amt { font-size: 16px; font-weight: 900; color: #d4a017; letter-spacing: -.01em; }
        .pf-wallet-lbl { font-size: 9px; color: rgba(212,160,23,.45); font-weight: 700; letter-spacing: .08em; margin-top: 1px; }

        /* ── Tabs ───────────────────────────────────────────────────────────────── */
        .pf-tabs {
          display: flex;
          gap: 6px;
          padding: 5px;
          background: rgba(0,0,0,.45);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 16px;
          width: max-content;
          max-width: 100%;
          margin: 0 auto 24px;
          overflow-x: auto;
        }
        .pf-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 40px;
          padding: 0 22px;
          border: 1px solid transparent;
          border-radius: 12px;
          background: none;
          color: rgba(240,234,214,.40);
          font-size: 13px; font-weight: 600;
          cursor: pointer;
          transition: all .2s;
          white-space: nowrap;
        }
        .pf-tab:hover { color: rgba(240,234,214,.7); background: rgba(255,255,255,.04); }
        .pf-tab-icon { font-size: 15px; }
        .pf-tab.active {
          background: var(--rc20);
          border-color: var(--rc40);
          color: var(--rc);
          box-shadow: 0 0 16px var(--rc20), inset 0 1px 0 rgba(255,255,255,.05);
          font-weight: 700;
        }

        /* ── Content ────────────────────────────────────────────────────────────── */
        .pf-content { animation: pfRise .45s ease both; }

        /* ── Stats panels grid ──────────────────────────────────────────────────── */
        .pf-panel-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .pf-panel {
          padding: 24px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.07);
          background: linear-gradient(160deg, rgba(255,255,255,.034) 0%, rgba(3,4,10,.92) 100%);
          display: flex;
          flex-direction: column;
          gap: 0;
          position: relative;
          overflow: hidden;
        }
        .pf-panel::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent);
        }
        .pf-panel-gold {
          border-color: rgba(212,160,23,.14);
          background: linear-gradient(160deg, rgba(212,160,23,.05) 0%, rgba(3,4,10,.92) 100%);
        }
        .pf-panel-gold::before {
          background: linear-gradient(90deg, transparent, rgba(212,160,23,.2), transparent);
        }
        .pf-panel-head {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 10px;
          letter-spacing: .14em;
          text-transform: uppercase;
          font-weight: 900;
          color: var(--rc);
          margin-bottom: 18px;
        }
        .pf-panel-icon {
          width: 28px; height: 28px;
          border-radius: 8px;
          background: var(--rc20);
          border: 1px solid var(--rc40);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px;
        }
        .pf-panel-gold .pf-panel-head { color: #d4a017; }
        .pf-panel-gold .pf-panel-icon {
          background: rgba(212,160,23,.15);
          border-color: rgba(212,160,23,.3);
        }
        .pf-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,.05);
          font-size: 13px;
        }
        .pf-row:last-child { border-bottom: none; }
        .pf-row span { color: rgba(240,234,214,.38); }
        .pf-row strong { color: rgba(240,234,214,.88); font-weight: 600; }

        /* Treasure card */
        .pf-treasure-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(212,160,23,.1), rgba(212,160,23,.04));
          border: 1px solid rgba(212,160,23,.18);
          margin-bottom: 14px;
          position: relative;
          overflow: hidden;
        }
        .pf-treasure-card::after {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(212,160,23,.06), transparent);
          animation: pfShimmer 5s 1s ease-in-out infinite;
        }
        .pf-treasure-orb {
          width: 48px; height: 48px;
          border-radius: 50%;
          background: rgba(212,160,23,.14);
          border: 1px solid rgba(212,160,23,.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; font-weight: 900; color: #d4a017;
          box-shadow: 0 0 20px rgba(212,160,23,.25);
          flex-shrink: 0;
          animation: pfGlow 4s ease-in-out infinite;
        }
        .pf-treasure-val {
          font-size: 22px;
          font-weight: 900;
          color: #d4a017;
          letter-spacing: -.02em;
          text-shadow: 0 0 20px rgba(212,160,23,.35);
        }
        .pf-treasure-lbl {
          font-size: 10px;
          color: rgba(212,160,23,.38);
          letter-spacing: .06em;
          margin-top: 2px;
        }

        /* Rank list */
        .pf-rank-list { display: flex; flex-direction: column; gap: 5px; }
        .pf-rank-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 12px;
          border-radius: 10px;
          border-left: 2px solid rgba(255,255,255,.08);
          opacity: .32;
          transition: opacity .2s, background .2s;
        }
        .pf-rank-row.done { opacity: .68; border-left-color: var(--rrc); }
        .pf-rank-row.current {
          opacity: 1;
          border-left-color: var(--rrc);
          background: color-mix(in srgb, var(--rrc) 9%, transparent);
          box-shadow: inset 0 0 16px color-mix(in srgb, var(--rrc) 6%, transparent);
        }
        .pf-rank-left { display: flex; align-items: center; gap: 10px; }
        .pf-rank-em { font-size: 18px; width: 26px; text-align: center; }
        .pf-rank-left strong {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: rgba(240,234,214,.85);
        }
        .pf-rank-left span { font-size: 10px; color: rgba(240,234,214,.32); }
        .pf-rank-status {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .06em;
          color: var(--rrc);
        }
        .pf-rank-row:not(.done) .pf-rank-status { color: rgba(240,234,214,.22); }

        /* ── Inventory grid ─────────────────────────────────────────────────────── */
        .pf-item-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
          gap: 14px;
        }
        .pf-item {
          position: relative;
          padding: 18px;
          border-radius: 16px;
          border: 1px solid color-mix(in srgb, var(--acc) 25%, rgba(255,255,255,.06));
          border-top: 2px solid color-mix(in srgb, var(--acc) 50%, transparent);
          background: linear-gradient(160deg, color-mix(in srgb, var(--acc) 7%, transparent) 0%, rgba(3,4,10,.88) 100%);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 7px;
          transition: transform .25s, box-shadow .25s;
          animation: pfCardIn .5s ease both;
        }
        .pf-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 36px color-mix(in srgb, var(--acc) 18%, rgba(0,0,0,.4));
        }
        .pf-item-glow {
          position: absolute;
          top: -30%; right: -10%;
          width: 90px; height: 90px;
          border-radius: 50%;
          background: radial-gradient(circle, color-mix(in srgb, var(--acc) 18%, transparent), transparent 65%);
          pointer-events: none;
          animation: pfGlow 4s ease-in-out infinite;
        }
        .pf-item-shine {
          position: absolute;
          top: 0; left: -100%; width: 55%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.04), transparent);
          animation: pfShimmer 5.5s 0.5s ease-in-out infinite;
          pointer-events: none;
        }
        .pf-item-rarity {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 8.5px;
          font-weight: 900;
          letter-spacing: .10em;
          text-transform: uppercase;
          color: var(--acc);
        }
        .pf-item-icon { font-size: 28px; }
        .pf-item-name {
          font-size: 13px;
          font-weight: 700;
          color: rgba(240,234,214,.88);
          line-height: 1.3;
        }
        .pf-item-desc {
          margin: 0;
          font-size: 11px;
          color: rgba(240,234,214,.38);
          line-height: 1.5;
        }
        .pf-item-time {
          font-size: 10px;
          color: rgba(240,234,214,.25);
          margin-top: 2px;
        }

        /* ── Transaction list ───────────────────────────────────────────────────── */
        .pf-tx-list { display: flex; flex-direction: column; gap: 8px; }
        .pf-tx {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.06);
          border-left: 3px solid var(--acc);
          background: linear-gradient(90deg, color-mix(in srgb, var(--acc) 4%, rgba(3,4,10,.8)), rgba(3,4,10,.8));
          animation: pfCardIn .5s ease both;
          transition: transform .2s, box-shadow .2s;
        }
        .pf-tx:hover {
          transform: translateX(3px);
          box-shadow: -4px 0 20px color-mix(in srgb, var(--acc) 15%, transparent);
        }
        .pf-tx-icon {
          width: 38px; height: 38px;
          border-radius: 50%;
          background: rgba(212,160,23,.12);
          border: 1px solid rgba(212,160,23,.22);
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; font-weight: 900; color: #d4a017;
          flex-shrink: 0;
          box-shadow: 0 0 14px rgba(212,160,23,.18);
        }
        .pf-tx-info { flex: 1; }
        .pf-tx-info strong {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: rgba(240,234,214,.85);
        }
        .pf-tx-info span { font-size: 11px; color: rgba(240,234,214,.32); }
        .pf-tx-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          flex-shrink: 0;
        }
        .pf-tx-right em {
          font-style: normal;
          font-size: 15px;
          font-weight: 800;
          color: #ff6b6b;
          letter-spacing: -.01em;
        }
        .pf-tx-right span { font-size: 10px; color: rgba(240,234,214,.3); }

        /* ── Empty state ────────────────────────────────────────────────────────── */
        .pf-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 100px 0;
          color: rgba(240,234,214,.38);
          text-align: center;
        }
        .pf-empty span { font-size: 52px; animation: pfFloat 3s ease-in-out infinite; }
        .pf-empty strong { font-size: 18px; font-weight: 700; color: rgba(240,234,214,.58); }
        .pf-empty p { font-size: 13px; max-width: 320px; margin: 0; }

        /* ── Responsive ─────────────────────────────────────────────────────────── */
        @media (max-width: 1000px) {
          .pf-hero { grid-template-columns: 1fr; }
          .pf-poster-col {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
            border-right: none;
            border-bottom: 1px solid rgba(255,255,255,.06);
            padding-right: 0;
            padding-bottom: 24px;
          }
          .pf-avatar-wrap { width: 140px; height: 140px; }
          .pf-panel-grid { grid-template-columns: 1fr; }
          .pf-stats { grid-template-columns: 1fr; }
          .pf-actions { grid-template-columns: 1fr 1fr; }
          .pf-name { font-size: 32px; }
          .pf-world-num { font-size: 28px; }
        }
        @media (max-width: 620px) {
          .pf-hero { padding: 20px; gap: 20px; }
          .pf-main { padding-top: 60px; }
          .pf-actions { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
