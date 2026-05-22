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
  { key: 'stats',      label: 'Statistiques', icon: '▦' },
  { key: 'inventaire', label: 'Inventaire',   icon: '◇' },
  { key: 'historique', label: 'Historique',   icon: '≡' },
]

function getRank(h)    { return RANK_MAP.find(r => h >= r.min) ?? RANK_MAP[RANK_MAP.length - 1] }
function getNextRank(r){ return r.next != null ? RANK_MAP.find(x => x.min === r.next) : null }
function fmtB(v)  { const n = parseInt(v || 0); return n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : String(n) }
function fmtNum(v){ return new Intl.NumberFormat('fr-FR').format(Number(v || 0)) }
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
    let f = 0; const total = 54
    const tick = () => { f++; setCur(target * (1 - Math.pow(1 - f/total, 3))); if (f < total) requestAnimationFrame(tick) }
    setCur(0); requestAnimationFrame(tick)
  }, [value])
  return `${cur.toFixed(decimals)}${suffix}`
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

function InventoryCard({ item }) {
  const si = item?.shop_items || item || {}
  const rarity = si.rarity || 'Commun'
  const style = RARITY_STYLES[rarity] || RARITY_STYLES.Commun
  return (
    <article className="pf-item" style={{ '--acc': style.color }}>
      <div className="pf-item-rarity">{style.label}</div>
      <div className="pf-item-cat">{(si.category || 'Item').slice(0,2).toUpperCase()}</div>
      <strong className="pf-item-name">{si.name || 'Objet inconnu'}</strong>
      {item?.acquired_at && <small>{timeAgo(item.acquired_at)}</small>}
    </article>
  )
}

function TransactionRow({ tx }) {
  const si = tx?.shop_items || {}
  const style = RARITY_STYLES[si.rarity] || RARITY_STYLES.Commun
  return (
    <div className="pf-tx" style={{ '--acc': style.color }}>
      <div className="pf-tx-icon">฿</div>
      <div className="pf-tx-info">
        <strong>{si.name || 'Achat boutique'}</strong>
        <span>{timeAgo(tx?.created_at)}</span>
      </div>
      <em>-{fmtNum(tx?.amount || 0)} ฿</em>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { discordId }           = useParams()
  const navigate                = useNavigate()
  const { discordId: myId }     = useAuth()
  const [member,   setMember]   = useState(null)
  const [shopData, setShopData] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('stats')
  const [copied,   setCopied]   = useState(false)

  useEffect(() => {
    let dead = false
    setLoading(true)
    Promise.all([fetchMemberProfile(discordId), fetchBerryShopState(discordId)])
      .then(([profile, shop]) => { if (!dead) { setMember(profile); setShopData(shop); setLoading(false) } })
      .catch(() => { if (!dead) setLoading(false) })
    return () => { dead = true }
  }, [discordId])

  const hours       = parseFloat(member?.vocal_h || 0)
  const rank        = getRank(hours)
  const nextRank    = getNextRank(rank)
  const remaining   = nextRank ? Math.max(0, nextRank.min - hours) : 0
  const progPct     = nextRank ? Math.min(100, ((hours - rank.min) / (nextRank.min - rank.min)) * 100) : 100
  const isOwnProfile = String(myId) === String(discordId)
  const displayName  = member?.username || `Pirate #${String(member?.uid || '').slice(-4)}`
  const wallet = useMemo(() => shopData && !shopData.preview ? shopData.balance || 0 : member?.berrys || 0, [member, shopData])

  const copyLink = () => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800) }

  return (
    <div className="pf" style={{ '--rc': rank.color, '--rc20': `${rank.color}20`, '--rc40': `${rank.color}40`, '--rc60': `${rank.color}60` }}>
      <Navbar />

      {/* ── Ambient background ── */}
      <div className="pf-bg" aria-hidden>
        <div className="pf-bg-blob pf-bg-blob-a" />
        <div className="pf-bg-blob pf-bg-blob-b" />
        <div className="pf-bg-grid" />
      </div>

      <main className="pf-main">

        {/* Top bar */}
        <div className="pf-topbar">
          <button className="pf-btn-back" onClick={() => navigate(-1)}>← Retour</button>
          <button className="pf-btn-3d" onClick={() => navigate('/profil-yonkou')}>⚡ Expérience 3D</button>
        </div>

        {loading && <EmptyState icon="⌛" title="Chargement…" text="Le dossier du pirate arrive." />}
        {!loading && !member && <EmptyState icon="☠" title="Pirate introuvable" text="Ce membre n'est pas dans le classement." />}

        {!loading && member && <>

          {/* ══ HERO ══════════════════════════════════════════════════════════ */}
          <section className="pf-hero">

            {/* Left — avatar column */}
            <div className="pf-avatar-col">
              <div className="pf-avatar-wrap">
                <div className="pf-avatar-ring" />
                <div className="pf-avatar-inner">
                  {member.avatar_url
                    ? <img src={member.avatar_url} alt={displayName} className="pf-avatar-img" />
                    : <span className="pf-avatar-fallback">{rank.emoji}</span>
                  }
                </div>
                <div className="pf-avatar-glow" />
              </div>

              <div className="pf-rank-badge-big">
                <span>{rank.emoji}</span>
                <span>{rank.rang}</span>
                <span className="pf-rank-num">#{member.rank}</span>
              </div>

              <div className="pf-avatar-mini-stats">
                <div className="pf-mini-stat">
                  <span>Prime</span>
                  <strong style={{ color: '#F2C94C' }}>{fmtB(member.berrys)} ฿</strong>
                </div>
                <div className="pf-mini-sep" />
                <div className="pf-mini-stat">
                  <span>Vocal</span>
                  <strong style={{ color: rank.color }}><CountUp value={hours} decimals={1} suffix="h" /></strong>
                </div>
              </div>
            </div>

            {/* Right — info column */}
            <div className="pf-info-col">
              <header className="pf-head">
                <div className="pf-kicker">
                  {isOwnProfile && <span className="pf-own">Mon profil</span>}
                  <span className="pf-world">
                    {rank.emoji}&ensp;{rank.rang}&ensp;·&ensp;
                    <strong>#{member.rank}</strong>&ensp;mondial&ensp;·&ensp;{member.total} nakamas
                  </span>
                </div>
                <h1 className="pf-name">{displayName}</h1>
              </header>

              {/* Stat cards */}
              <div className="pf-stats">
                {[
                  { icon:'🎤', label:'VOCAL',    val:<CountUp value={hours} decimals={1} suffix="h"/>, sub:'sur 7 jours',   c: rank.color },
                  { icon:'🪙', label:'BERRYS',   val:<>{fmtB(member.berrys)}<em>฿</em></>,            sub:'prime publique', c: '#F2C94C'  },
                  { icon:'🌍', label:'POSITION', val:`#${member.rank}`,                                sub:`/ ${member.total}`, c: '#4F8CFF' },
                ].map(({ icon, label, val, sub, c }) => (
                  <div key={label} className="pf-stat-card" style={{ '--c': c }}>
                    <div className="pf-stat-top-line" />
                    <div className="pf-stat-icon">{icon}</div>
                    <div className="pf-stat-label">{label}</div>
                    <div className="pf-stat-val">{val}</div>
                    <div className="pf-stat-sub">{sub}</div>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="pf-prog-wrap">
                {nextRank ? (<>
                  <div className="pf-prog-header">
                    <span>Progression vers <strong style={{ color: nextRank.color }}>{nextRank.rang}</strong></span>
                    <span className="pf-prog-target">{nextRank.min}h</span>
                  </div>
                  <div className="pf-prog-track">
                    <div className="pf-prog-fill" style={{ width: `${progPct}%`, '--nc': nextRank.color }} />
                    <div className="pf-prog-ship" style={{ left: `${progPct}%` }}>🏴‍☠️</div>
                  </div>
                  <div className="pf-prog-footer">
                    <span>{rank.rang} depuis {rank.min}h</span>
                    <span className="pf-remaining">{remaining.toFixed(1)}h restantes</span>
                  </div>
                </>) : (
                  <div className="pf-prog-max">
                    <span>👑</span>
                    <strong>Rang maximum atteint — Grand Line conquise</strong>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pf-actions">
                <button className="pf-btn-share" onClick={copyLink}>
                  {copied ? '✓ Lien copié !' : 'Partager le profil'}
                </button>
                <a className="pf-btn-discord" href="https://discord.gg/v3Ddhtbz" target="_blank" rel="noopener noreferrer">
                  Ouvrir Discord
                </a>
              </div>
            </div>
          </section>

          {/* ══ TABS ══════════════════════════════════════════════════════════ */}
          <nav className="pf-tabs">
            {TABS.map(t => (
              <button key={t.key} className={tab === t.key ? 'pf-tab active' : 'pf-tab'} onClick={() => setTab(t.key)}>
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </nav>

          {/* ══ CONTENT ═══════════════════════════════════════════════════════ */}
          <div className="pf-content">

            {tab === 'stats' && (
              <div className="pf-panel-grid">

                {/* Identité */}
                <article className="pf-panel">
                  <div className="pf-panel-title">🪪 Identité</div>
                  {[
                    ['Pseudo',     displayName],
                    ['Discord ID', member.uid],
                    ['Rang actuel',`${rank.emoji} ${rank.rang}`],
                    ['Position',   `#${member.rank} / ${member.total}`],
                  ].map(([lbl, val]) => (
                    <div className="pf-row" key={lbl}>
                      <span>{lbl}</span>
                      <strong>{val}</strong>
                    </div>
                  ))}
                </article>

                {/* Trésor */}
                <article className="pf-panel">
                  <div className="pf-panel-title">🪙 Trésor</div>
                  <div className="pf-wallet">
                    <div className="pf-wallet-icon">฿</div>
                    <div>
                      <div className="pf-wallet-val">{fmtNum(wallet)}</div>
                      <div className="pf-wallet-lbl">berrys · wallet boutique</div>
                    </div>
                  </div>
                  {[
                    ['Inventaire',    `${shopData?.inventory?.length || 0} objets`],
                    ['Achats récents',`${shopData?.transactions?.length || 0}`],
                  ].map(([lbl, val]) => (
                    <div className="pf-row" key={lbl}><span>{lbl}</span><strong>{val}</strong></div>
                  ))}
                </article>

                {/* Rangs */}
                <article className="pf-panel">
                  <div className="pf-panel-title">⚡ Rangs débloqués</div>
                  <div className="pf-rank-list">
                    {RANK_MAP.slice().reverse().map(r => {
                      const done    = hours >= r.min
                      const current = rank.rang === r.rang
                      return (
                        <div key={r.rang} className={`pf-rank-row ${done ? 'done' : ''} ${current ? 'current' : ''}`}
                          style={{ '--rc': r.color }}>
                          <span className="pf-rank-emoji">{r.emoji}</span>
                          <div className="pf-rank-info">
                            <strong>{r.rang}</strong>
                            <span>{r.min}h requis</span>
                          </div>
                          <span className="pf-rank-check">{done ? '✓' : ''}</span>
                        </div>
                      )
                    })}
                  </div>
                </article>

              </div>
            )}

            {tab === 'inventaire' && (
              shopData?.inventory?.length
                ? <div className="pf-item-grid">{shopData.inventory.map((item, i) => <InventoryCard key={i} item={item} />)}</div>
                : <EmptyState icon="◇" title="Inventaire vide" text="Aucun objet boutique pour ce pirate." />
            )}

            {tab === 'historique' && (
              shopData?.transactions?.length
                ? <div className="pf-tx-list">{shopData.transactions.map((tx, i) => <TransactionRow key={i} tx={tx} />)}</div>
                : <EmptyState icon="≡" title="Aucune transaction" text="L'historique d'achats est vide." />
            )}

          </div>
        </>}
      </main>

      {/* ── All styles ── */}
      <style>{`
        /* ── Keyframes ─────────────────────────────────────────────────── */
        @keyframes pf-rise   { from { opacity:0; transform:translateY(24px) scale(.97); } to { opacity:1; transform:none; } }
        @keyframes pf-blob   { 0%,100%{transform:translate(-50%,-50%) scale(1);} 50%{transform:translate(-50%,-50%) scale(1.08) rotate(6deg);} }
        @keyframes pf-pulse  { 0%,100%{opacity:.7;} 50%{opacity:1;} }
        @keyframes pf-spin   { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
        @keyframes pf-boat   { 0%,100%{transform:translateX(-50%) translateY(0) rotate(-3deg);} 50%{transform:translateX(-50%) translateY(-6px) rotate(3deg);} }
        @keyframes pf-trail  { from{transform:translateX(-100%);opacity:0;} 40%{opacity:1;} to{transform:translateX(100%);opacity:0;} }
        @keyframes pf-shimmer{ from{background-position:200% center;} to{background-position:-200% center;} }

        /* ── Root ──────────────────────────────────────────────────────── */
        .pf {
          min-height: 100vh;
          background: #04050a;
          color: #f0ead6;
          font-family: Inter, system-ui, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        /* ── Background ────────────────────────────────────────────────── */
        .pf-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .pf-bg-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          animation: pf-blob 14s ease-in-out infinite;
        }
        .pf-bg-blob-a {
          width: 600px; height: 600px;
          top: -10%; left: 60%;
          background: radial-gradient(circle, color-mix(in srgb, var(--rc) 18%, transparent), transparent 70%);
          animation-duration: 16s;
        }
        .pf-bg-blob-b {
          width: 500px; height: 500px;
          top: 40%; left: -10%;
          background: radial-gradient(circle, rgba(79,140,255,.1), transparent 70%);
          animation-duration: 11s; animation-delay: -5s;
        }
        .pf-bg-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px);
          background-size: 52px 52px;
          mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
        }

        /* ── Main ──────────────────────────────────────────────────────── */
        .pf-main {
          position: relative; z-index: 1;
          width: min(1240px, calc(100% - 32px));
          margin: 0 auto;
          padding: 72px 0 80px;
          animation: pf-rise .6s cubic-bezier(.22,1,.36,1) both;
        }

        /* ── Top bar ───────────────────────────────────────────────────── */
        .pf-topbar {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 28px;
        }
        .pf-btn-back {
          height: 36px; padding: 0 16px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,.1);
          background: rgba(255,255,255,.04);
          color: rgba(240,234,214,.65); font-size: 13px; font-weight: 600;
          cursor: pointer; letter-spacing: .02em;
          transition: border-color .2s, color .2s, transform .2s;
        }
        .pf-btn-back:hover { border-color: rgba(255,255,255,.22); color: #f0ead6; transform: translateX(-2px); }
        .pf-btn-3d {
          height: 36px; padding: 0 18px; border-radius: 8px;
          border: 1px solid var(--rc60);
          background: linear-gradient(135deg, var(--rc20), transparent);
          color: var(--rc); font-size: 13px; font-weight: 700;
          cursor: pointer; letter-spacing: .03em;
          box-shadow: 0 0 16px var(--rc20);
          transition: box-shadow .25s, border-color .25s, transform .2s;
        }
        .pf-btn-3d:hover { box-shadow: 0 0 30px var(--rc40); border-color: var(--rc); transform: translateY(-1px); }

        /* ── Hero ──────────────────────────────────────────────────────── */
        .pf-hero {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 28px;
          padding: 28px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,.07);
          border-top-color: var(--rc40);
          background:
            radial-gradient(circle at 0% 0%, var(--rc20), transparent 50%),
            linear-gradient(145deg, rgba(255,255,255,.03), rgba(4,5,10,.95));
          box-shadow: 0 30px 80px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.05);
          overflow: hidden;
          position: relative;
          margin-bottom: 16px;
        }
        /* Gold shimmer line at top */
        .pf-hero::after {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, var(--rc), rgba(242,201,76,.6), var(--rc), transparent);
          opacity: .6;
        }

        /* ── Avatar column ─────────────────────────────────────────────── */
        .pf-avatar-col {
          display: flex; flex-direction: column; align-items: center;
          gap: 18px; padding-top: 8px;
        }
        .pf-avatar-wrap { position: relative; width: 200px; height: 200px; flex-shrink: 0; }
        .pf-avatar-ring {
          position: absolute; inset: -6px;
          border-radius: 50%;
          border: 2px solid var(--rc);
          box-shadow: 0 0 24px var(--rc40), inset 0 0 12px var(--rc20);
          animation: pf-pulse 3s ease-in-out infinite;
        }
        /* Spinning dashed outer ring */
        .pf-avatar-ring::before {
          content: '';
          position: absolute; inset: -8px;
          border-radius: 50%;
          border: 1px dashed var(--rc40);
          animation: pf-spin 18s linear infinite;
        }
        .pf-avatar-inner {
          position: absolute; inset: 0;
          border-radius: 50%; overflow: hidden;
          background: #0c0c18;
        }
        .pf-avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
        .pf-avatar-fallback {
          width: 100%; height: 100%; display: flex; align-items: center;
          justify-content: center; font-size: 64px;
        }
        .pf-avatar-glow {
          position: absolute; inset: -24px;
          border-radius: 50%;
          background: radial-gradient(circle, var(--rc20), transparent 60%);
          pointer-events: none;
        }

        .pf-rank-badge-big {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 18px; border-radius: 999px;
          background: var(--rc20);
          border: 1px solid var(--rc40);
          font-size: 13px; font-weight: 700; color: var(--rc);
          letter-spacing: .04em;
          box-shadow: 0 0 18px var(--rc20);
        }
        .pf-rank-num {
          padding: 2px 8px; background: var(--rc40);
          border-radius: 999px; font-size: 11px;
        }

        .pf-avatar-mini-stats {
          display: flex; align-items: center; gap: 0;
          width: 100%;
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 12px; overflow: hidden;
        }
        .pf-mini-stat {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; gap: 3px; padding: 12px 0;
        }
        .pf-mini-stat span { font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: rgba(240,234,214,.38); }
        .pf-mini-stat strong { font-size: 16px; font-weight: 800; }
        .pf-mini-sep { width: 1px; height: 36px; background: rgba(255,255,255,.08); }

        /* ── Info column ───────────────────────────────────────────────── */
        .pf-info-col { display: flex; flex-direction: column; gap: 22px; justify-content: center; }

        .pf-head { display: flex; flex-direction: column; gap: 6px; }
        .pf-kicker { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .pf-own {
          padding: 4px 12px; border-radius: 999px;
          background: rgba(242,201,76,.12); border: 1px solid rgba(242,201,76,.3);
          color: #F2C94C; font-size: 10px; font-weight: 800; letter-spacing: .1em;
        }
        .pf-world { font-size: 13px; color: rgba(240,234,214,.45); }
        .pf-world strong { color: rgba(240,234,214,.8); font-weight: 700; }

        .pf-name {
          margin: 0;
          font-size: clamp(32px, 4.5vw, 56px);
          font-weight: 900; line-height: 1;
          color: transparent;
          background: linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,.85) 50%, var(--rc) 100%);
          -webkit-background-clip: text; background-clip: text;
          letter-spacing: -.01em;
        }

        /* ── Stat cards ────────────────────────────────────────────────── */
        .pf-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .pf-stat-card {
          padding: 16px 18px; border-radius: 14px;
          border: 1px solid color-mix(in srgb, var(--c) 22%, rgba(255,255,255,.07));
          background: linear-gradient(145deg, color-mix(in srgb, var(--c) 6%, rgba(4,5,10,.8)), rgba(4,5,10,.9));
          position: relative; overflow: hidden;
          transition: border-color .25s, box-shadow .25s, transform .2s;
          cursor: default;
        }
        .pf-stat-card:hover {
          border-color: color-mix(in srgb, var(--c) 55%, transparent);
          box-shadow: 0 0 28px color-mix(in srgb, var(--c) 25%, transparent);
          transform: translateY(-2px);
        }
        .pf-stat-top-line {
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, var(--c), transparent);
        }
        /* Trail shimmer on hover */
        .pf-stat-card::after {
          content: '';
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--c) 8%, transparent) 50%, transparent 100%);
          background-size: 200% auto;
          opacity: 0; transition: opacity .3s;
        }
        .pf-stat-card:hover::after { opacity: 1; animation: pf-trail 1.4s linear infinite; }
        .pf-stat-icon { font-size: 22px; margin-bottom: 8px; }
        .pf-stat-label {
          font-size: 9px; letter-spacing: .15em; text-transform: uppercase;
          color: rgba(240,234,214,.35); margin-bottom: 5px;
        }
        .pf-stat-val {
          font-size: 30px; font-weight: 900; line-height: 1;
          color: var(--c);
          text-shadow: 0 0 20px color-mix(in srgb, var(--c) 40%, transparent);
          letter-spacing: -.01em;
        }
        .pf-stat-val em { font-size: 18px; font-style: normal; opacity: .8; margin-left: 2px; }
        .pf-stat-sub { margin-top: 4px; font-size: 11px; color: rgba(240,234,214,.32); }

        /* ── Progress ──────────────────────────────────────────────────── */
        .pf-prog-wrap {
          padding: 18px 20px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.025);
        }
        .pf-prog-header, .pf-prog-footer {
          display: flex; justify-content: space-between;
          font-size: 12px; color: rgba(240,234,214,.45);
        }
        .pf-prog-header { margin-bottom: 12px; }
        .pf-prog-header strong { font-weight: 700; }
        .pf-prog-target { font-weight: 700; color: rgba(240,234,214,.7); }
        .pf-prog-footer { margin-top: 10px; }
        .pf-remaining { font-weight: 700; color: rgba(240,234,214,.65); }
        .pf-prog-track {
          height: 8px; background: rgba(255,255,255,.06);
          border-radius: 999px; position: relative; overflow: visible;
        }
        .pf-prog-fill {
          height: 100%; border-radius: 999px;
          background: linear-gradient(90deg, color-mix(in srgb, var(--nc) 50%, #111), var(--nc));
          box-shadow: 0 0 12px var(--nc), 0 0 24px color-mix(in srgb, var(--nc) 30%, transparent);
          position: relative; transition: width 1.2s cubic-bezier(.22,1,.36,1);
        }
        .pf-prog-ship {
          position: absolute; top: -14px;
          transform: translateX(-50%);
          font-size: 18px; user-select: none;
          animation: pf-boat 2.5s ease-in-out infinite;
          filter: drop-shadow(0 0 6px var(--rc));
        }
        .pf-prog-max {
          display: flex; align-items: center; gap: 12px;
          font-size: 14px; font-weight: 600; color: #F2C94C;
        }
        .pf-prog-max span { font-size: 24px; }

        /* ── Actions ───────────────────────────────────────────────────── */
        .pf-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .pf-btn-share {
          height: 44px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,.14);
          background: rgba(255,255,255,.05);
          color: rgba(240,234,214,.8); font-size: 13px; font-weight: 700;
          cursor: pointer; letter-spacing: .02em;
          transition: all .2s;
        }
        .pf-btn-share:hover { background: rgba(255,255,255,.09); color: #f0ead6; border-color: rgba(255,255,255,.22); }
        .pf-btn-discord {
          height: 44px; border-radius: 10px;
          border: 1px solid rgba(88,101,242,.5);
          background: linear-gradient(135deg, rgba(88,101,242,.2), rgba(88,101,242,.1));
          color: #a5adfa; font-size: 13px; font-weight: 700;
          cursor: pointer; letter-spacing: .02em;
          display: flex; align-items: center; justify-content: center;
          text-decoration: none;
          transition: all .2s;
        }
        .pf-btn-discord:hover { background: rgba(88,101,242,.3); color: #c5cbff; box-shadow: 0 0 20px rgba(88,101,242,.3); }

        /* ── Tabs ──────────────────────────────────────────────────────── */
        .pf-tabs {
          display: flex; gap: 6px; padding: 5px;
          background: rgba(0,0,0,.35);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 14px; width: max-content;
          margin: 0 auto 20px; overflow-x: auto; max-width: 100%;
        }
        .pf-tab {
          height: 38px; padding: 0 20px;
          border: 1px solid transparent; border-radius: 10px;
          background: none; color: rgba(240,234,214,.42);
          font-size: 13px; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; gap: 7px;
          transition: all .2s; white-space: nowrap;
        }
        .pf-tab:hover { color: rgba(240,234,214,.7); background: rgba(255,255,255,.04); }
        .pf-tab.active {
          background: var(--rc20);
          border-color: var(--rc40);
          color: var(--rc);
          box-shadow: 0 0 12px var(--rc20);
        }

        /* ── Content panels ────────────────────────────────────────────── */
        .pf-content { animation: pf-rise .4s ease both; }
        .pf-panel-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .pf-panel {
          padding: 22px; border-radius: 16px;
          border: 1px solid rgba(255,255,255,.07);
          background: linear-gradient(145deg, rgba(255,255,255,.03), rgba(4,5,10,.9));
          display: flex; flex-direction: column; gap: 0;
        }
        .pf-panel-title {
          font-size: 10px; letter-spacing: .12em; text-transform: uppercase;
          color: var(--rc); margin-bottom: 16px; font-weight: 800;
          display: flex; align-items: center; gap: 6px;
        }

        .pf-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,.05);
          font-size: 13px;
        }
        .pf-row:last-child { border-bottom: none; }
        .pf-row span { color: rgba(240,234,214,.42); }
        .pf-row strong { color: rgba(240,234,214,.88); font-weight: 600; }

        /* Wallet in Trésor */
        .pf-wallet {
          display: flex; align-items: center; gap: 14px;
          padding: 14px; border-radius: 10px; margin-bottom: 12px;
          background: linear-gradient(135deg, rgba(242,201,76,.1), rgba(242,201,76,.04));
          border: 1px solid rgba(242,201,76,.2);
        }
        .pf-wallet-icon {
          width: 42px; height: 42px; border-radius: 50%;
          background: rgba(242,201,76,.15); border: 1px solid rgba(242,201,76,.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; color: #F2C94C; font-weight: 900;
          box-shadow: 0 0 16px rgba(242,201,76,.25);
        }
        .pf-wallet-val { font-size: 22px; font-weight: 900; color: #F2C94C; }
        .pf-wallet-lbl { font-size: 10px; color: rgba(240,234,214,.35); letter-spacing: .06em; margin-top: 2px; }

        /* Rank list */
        .pf-rank-list { display: flex; flex-direction: column; gap: 4px; }
        .pf-rank-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 8px;
          border-left: 2px solid rgba(255,255,255,.08);
          opacity: .38; transition: opacity .2s;
        }
        .pf-rank-row.done   { opacity: .72; border-left-color: var(--rc); }
        .pf-rank-row.current{
          opacity: 1; border-left-color: var(--rc);
          background: color-mix(in srgb, var(--rc) 10%, transparent);
          box-shadow: inset 0 0 12px color-mix(in srgb, var(--rc) 6%, transparent);
        }
        .pf-rank-emoji { font-size: 18px; width: 24px; text-align: center; }
        .pf-rank-info { flex: 1; }
        .pf-rank-info strong { display: block; font-size: 12px; font-weight: 700; color: rgba(240,234,214,.85); }
        .pf-rank-info span   { font-size: 10px; color: rgba(240,234,214,.35); }
        .pf-rank-check { font-size: 13px; color: var(--rc); font-weight: 900; }

        /* ── Inventory grid ─────────────────────────────────────────────── */
        .pf-item-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
        .pf-item {
          padding: 16px; border-radius: 12px;
          border: 1px solid color-mix(in srgb, var(--acc) 30%, rgba(255,255,255,.07));
          background: linear-gradient(145deg, color-mix(in srgb, var(--acc) 6%, transparent), rgba(4,5,10,.8));
          display: flex; flex-direction: column; gap: 6px;
        }
        .pf-item-rarity { font-size: 9px; letter-spacing: .12em; color: var(--acc); font-weight: 800; text-transform: uppercase; }
        .pf-item-cat { font-size: 24px; }
        .pf-item-name { font-size: 13px; font-weight: 700; color: rgba(240,234,214,.88); }
        .pf-item small { font-size: 10px; color: rgba(240,234,214,.3); }

        /* ── Transaction list ───────────────────────────────────────────── */
        .pf-tx-list { display: flex; flex-direction: column; gap: 8px; }
        .pf-tx {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.025);
          border-left: 3px solid var(--acc);
        }
        .pf-tx-icon {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(242,201,76,.12); border: 1px solid rgba(242,201,76,.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 900; color: #F2C94C; flex-shrink: 0;
        }
        .pf-tx-info { flex: 1; }
        .pf-tx-info strong { display: block; font-size: 13px; font-weight: 700; color: rgba(240,234,214,.85); }
        .pf-tx-info span   { font-size: 11px; color: rgba(240,234,214,.35); }
        .pf-tx em { color: #ff6b6b; font-style: normal; font-size: 13px; font-weight: 700; flex-shrink: 0; }

        /* ── Empty state ────────────────────────────────────────────────── */
        .pf-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 10px; padding: 80px 0;
          color: rgba(240,234,214,.38); text-align: center;
        }
        .pf-empty span { font-size: 48px; }
        .pf-empty strong { font-size: 18px; font-weight: 700; color: rgba(240,234,214,.6); }
        .pf-empty p { font-size: 13px; max-width: 300px; }

        /* ── Responsive ─────────────────────────────────────────────────── */
        @media (max-width: 900px) {
          .pf-hero { grid-template-columns: 1fr; }
          .pf-avatar-col { flex-direction: row; flex-wrap: wrap; justify-content: center; }
          .pf-avatar-wrap { width: 140px; height: 140px; }
          .pf-panel-grid { grid-template-columns: 1fr; }
          .pf-stats { grid-template-columns: 1fr; }
          .pf-actions { grid-template-columns: 1fr; }
          .pf-name { font-size: 36px; }
        }
      `}</style>
    </div>
  )
}
