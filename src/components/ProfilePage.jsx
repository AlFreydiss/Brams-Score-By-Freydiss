import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { fetchBerryShopState, RARITY_STYLES } from '../lib/berryShop.js'
import { fetchMemberProfile } from '../lib/supabase.js'
import Navbar from './Navbar.jsx'
import RelationshipActions from './social/RelationshipActions.jsx'
import ProfilePosts from './feed/ProfilePosts.jsx'
import { useOpeningBg } from '../contexts/OpeningBgContext.jsx'

// ── Constants ──────────────────────────────────────────────────────────────
const RANK_MAP = [
  { min: 150, rang: 'Roi des Pirates', emoji: '👑', color: '#FFD700', next: null },
  { min: 70,  rang: 'Yonkou',          emoji: '🌊', color: '#A66CFF', next: 150 },
  { min: 40,  rang: 'Amiral',          emoji: '🪖', color: '#F5C542', next: 70  },
  { min: 25,  rang: 'Shichibukai',     emoji: '⚔️', color: '#2ECC71', next: 40  },
  { min: 10,  rang: 'Pirate',          emoji: '🏴‍☠️', color: '#4F8CFF', next: 25  },
  { min: 0,   rang: 'Moussaillon',     emoji: '⚓',  color: '#8A8F9F', next: 10  },
]
const RANK_QUOTES = {
  'Roi des Pirates': "Les mers du monde m'appartiennent.",
  'Yonkou':          'Les mers tremblent là où je marche.',
  'Amiral':          "La justice forgée dans l'acier ne faiblit jamais.",
  'Shichibukai':     'Entre ombre et lumière, je trace ma propre route.',
  'Pirate':          'La liberté se mérite par le sang et la sueur.',
  'Moussaillon':     'Chaque légende commence par un premier voyage.',
}
const TABS = [
  { key: 'stats',        label: "Vue d'ensemble" },
  { key: 'posts',        label: 'Posts' },
  { key: 'inventaire',   label: 'Inventaire' },
  { key: 'historique',   label: 'Historique' },
  { key: 'achievements', label: 'Succès' },
]
const ACHIEVEMENTS = [
  { id: 'premier_million', label: 'Premier Million',  desc: 'Atteindre 1 000 000 ฿',     icon: '💎', check: (m)      => parseInt(m?.berrys || 0) >= 1_000_000 },
  { id: 'vocal_10',        label: 'Voix du Peuple',   desc: '10 heures en vocal',         icon: '🎙', check: (m,s,h) => h >= 10 },
  { id: 'vocal_100',       label: 'Légende Vocale',   desc: '100 heures en vocal',        icon: '🎤', check: (m,s,h) => h >= 100 },
  { id: 'top_100',         label: 'Top 100',           desc: 'Entrer dans le classement', icon: '🏆', check: (m)      => m?.rank <= 100 },
  { id: 'top_10',          label: 'Élite Nakama',      desc: 'Top 10 du serveur',         icon: '⭐', check: (m)      => m?.rank <= 10 },
  { id: 'collector',       label: 'Collectionneur',   desc: '5 objets en inventaire',     icon: '🗃', check: (m,s)   => (s?.inventory?.length || 0) >= 5 },
  { id: 'shopper',         label: 'Grand Marchand',   desc: '3 achats effectués',         icon: '🛒', check: (m,s)   => (s?.transactions?.length || 0) >= 3 },
  { id: 'yonkou',          label: 'Yonkou',            desc: 'Rang Yonkou atteint',       icon: '🌊', check: (m,s,h) => h >= 70 },
  { id: 'roi',             label: 'Roi des Pirates',  desc: 'Rang maximum atteint',       icon: '👑', check: (m,s,h) => h >= 150 },
]

// ── Utils ──────────────────────────────────────────────────────────────────
function getRank(hours)    { return RANK_MAP.find(r => hours >= r.min) ?? RANK_MAP[RANK_MAP.length - 1] }
function getNextRank(rank) { return rank.next != null ? RANK_MAP.find(r => r.min === rank.next) : null }
function fmtB(value) {
  const n = Number.parseInt(value || 0, 10)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}
function fmtNum(value) { return new Intl.NumberFormat('fr-FR').format(Number(value || 0)) }
function timeAgo(iso) {
  if (!iso) return ''
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 1)  return "à l'instant"
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h} h`
  return `il y a ${Math.floor(h / 24)} j`
}
function getAuraTier(score) {
  if (score >= 85) return { label: 'Légende du serveur', color: '#FFD700' }
  if (score >= 70) return { label: 'Profil très actif',  color: '#d4a017' }
  if (score >= 50) return { label: 'Profil actif',       color: '#a88a30' }
  if (score >= 30) return { label: 'Présence modérée',   color: '#7c7f8a' }
  return             { label: 'Début du voyage',          color: '#5a5d6a' }
}

// ── CountUp ────────────────────────────────────────────────────────────────
function CountUp({ value, decimals = 0, suffix = '' }) {
  const [current, setCurrent] = useState(0)
  useEffect(() => {
    const target = Number(value || 0)
    let frame = 0; const total = 55
    const tick = () => {
      frame++
      setCurrent(target * (1 - Math.pow(1 - frame / total, 3)))
      if (frame < total) requestAnimationFrame(tick)
    }
    setCurrent(0); requestAnimationFrame(tick)
  }, [value])
  return `${current.toFixed(decimals)}${suffix}`
}

// ── AuraFactor ─────────────────────────────────────────────────────────────
function AuraFactor({ label, value, max, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="pf-factor" style={{ '--fc': color }}>
      <div className="pf-factor-hd">
        <span>{label}</span>
        <span className="pf-factor-val">{Math.round(value)}<em>/{max}</em></span>
      </div>
      <div className="pf-factor-track">
        <div className="pf-factor-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── AchievementCard ────────────────────────────────────────────────────────
function AchievementCard({ ach, unlocked, delay = 0 }) {
  return (
    <div className={`pf-ach${unlocked ? ' pf-ach-on' : ''}`} style={{ animationDelay: `${delay}ms` }}>
      <span className="pf-ach-icon">{ach.icon}</span>
      <div className="pf-ach-body">
        <strong>{ach.label}</strong>
        <span>{ach.desc}</span>
      </div>
      <span className="pf-ach-check">{unlocked ? '✓' : '·'}</span>
    </div>
  )
}

// ── InventoryCard ──────────────────────────────────────────────────────────
function InventoryCard({ item, delay = 0 }) {
  const shopItem = item?.shop_items || item || {}
  const rarity   = shopItem.rarity || 'Commun'
  const style    = RARITY_STYLES[rarity] || RARITY_STYLES.Commun
  return (
    <article className="pf-item" style={{ '--ac': style.color, animationDelay: `${delay}ms` }}>
      <div className="pf-item-header">
        <span className="pf-item-cat">{(shopItem.category || 'CO').slice(0, 2).toUpperCase()}</span>
        <em className="pf-item-rarity">{style.label}</em>
      </div>
      <strong className="pf-item-name">{shopItem.name || 'Objet inconnu'}</strong>
      {item?.acquired_at && <small className="pf-item-date">Obtenu {timeAgo(item.acquired_at)}</small>}
    </article>
  )
}

// ── TransactionRow ─────────────────────────────────────────────────────────
function TransactionRow({ tx, delay = 0 }) {
  const shopItem = tx?.shop_items || {}
  const style    = RARITY_STYLES[shopItem.rarity] || RARITY_STYLES.Commun
  return (
    <div className="pf-tx" style={{ '--ac': style.color, animationDelay: `${delay}ms` }}>
      <div className="pf-tx-icon">฿</div>
      <div className="pf-tx-info">
        <strong>{shopItem.name || 'Achat boutique'}</strong>
        <span>{timeAgo(tx?.created_at)}</span>
      </div>
      <em className="pf-tx-amount">-{fmtNum(tx?.amount || 0)} ฿</em>
    </div>
  )
}

// ── EmptyState ─────────────────────────────────────────────────────────────
function EmptyState({ icon, title, sub }) {
  return (
    <div className="pf-empty">
      <span className="pf-empty-icon">{icon}</span>
      <strong>{title}</strong>
      {sub && <p>{sub}</p>}
    </div>
  )
}

// ── CSS ────────────────────────────────────────────────────────────────────
const CSS = `
@keyframes pfRise    { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:none; } }
@keyframes pfFadeUp  { from { opacity:0; transform:translateY(8px); }  to { opacity:1; transform:none; } }
@keyframes pfBarFill { from { width:0 !important; } }
@keyframes pfShimmer { from { transform:translateX(-130%); } to { transform:translateX(230%); } }
@keyframes pfDotPulse {
  0%,100% { box-shadow:0 0 0 0 rgba(35,209,139,.55); }
  60%     { box-shadow:0 0 0 5px rgba(35,209,139,0); }
}

/* ── Shell ── */
.pf-shell {
  min-height:100vh;
  background:#0b0c0e;
  color:#e0e1e3;
  font-family:var(--body,'Inter',system-ui,sans-serif);
  overflow-x:hidden;
}

/* ── Wrap ── */
.pf-wrap {
  position:relative; z-index:1;
  width:min(1100px,calc(100% - 40px));
  margin:0 auto;
  padding:80px 0 120px;
  animation:pfRise .55s cubic-bezier(.22,1,.36,1) both;
}

/* ── Topbar ── */
.pf-topbar {
  display:flex; justify-content:space-between; align-items:center;
  margin-bottom:28px;
}
.pf-back {
  height:34px; padding:0 14px; border-radius:8px;
  border:1px solid rgba(255,255,255,.07);
  background:rgba(255,255,255,.03);
  color:#5d616f; font-size:12.5px; font-weight:700; cursor:pointer; transition:.15s;
}
.pf-back:hover { color:#e0e1e3; border-color:rgba(255,255,255,.12); }
.pf-btn-immersive {
  height:34px; padding:0 14px; border-radius:8px;
  border:1px solid rgba(212,160,23,.18);
  background:rgba(212,160,23,.06);
  color:rgba(212,160,23,.7); font-size:12px; font-weight:800; cursor:pointer; transition:.15s;
}
.pf-btn-immersive:hover { background:rgba(212,160,23,.12); color:#d4a017; }

/* ════════════════════════════ HERO ════════════════════════════════════════ */
.pf-hero {
  position:relative; overflow:hidden;
  display:flex; align-items:flex-start; gap:36px;
  padding:40px 48px 36px;
  border-radius:18px;
  background:#0f1013;
  border:1px solid rgba(255,255,255,.05);
  border-top-color:rgba(212,160,23,.25);
  margin-bottom:10px;
}
.pf-hero-line {
  position:absolute; left:0; right:0; top:0; height:1px;
  background:linear-gradient(90deg,transparent 0%,#d4a017 35%,rgba(212,160,23,.35) 70%,transparent 100%);
}
.pf-hero-grid {
  position:absolute; right:0; top:0; bottom:0; width:38%;
  pointer-events:none; z-index:0;
  background:
    repeating-linear-gradient(0deg,transparent,transparent 28px,rgba(255,255,255,.018) 28px,rgba(255,255,255,.018) 29px),
    repeating-linear-gradient(90deg,transparent,transparent 28px,rgba(255,255,255,.014) 28px,rgba(255,255,255,.014) 29px);
  mask-image:linear-gradient(to left,rgba(0,0,0,.4),transparent 80%);
}

/* Avatar column */
.pf-avatar-col {
  position:relative; z-index:1; flex-shrink:0;
  display:flex; flex-direction:column; align-items:center; gap:14px;
  min-width:148px;
}
.pf-avatar-ring {
  position:relative;
  width:136px; height:136px; border-radius:50%;
}
.pf-avatar-inner {
  width:100%; height:100%; border-radius:50%; overflow:hidden;
  border:2px solid rgba(212,160,23,.22);
  background:#141518;
  display:grid; place-items:center;
  box-shadow:0 8px 32px rgba(0,0,0,.45);
  transition:border-color .25s;
}
.pf-avatar-ring:hover .pf-avatar-inner {
  border-color:rgba(212,160,23,.45);
  box-shadow:0 8px 32px rgba(0,0,0,.45), 0 0 28px rgba(212,160,23,.12);
}
.pf-avatar-img   { width:100%; height:100%; object-fit:cover; transition:transform .4s ease; }
.pf-avatar-ring:hover .pf-avatar-img { transform:scale(1.04); }
.pf-avatar-emoji { font-size:64px; }
.pf-avatar-dot {
  position:absolute; bottom:8px; right:8px; z-index:2;
  width:14px; height:14px; border-radius:50%;
  background:#23d18b;
  border:2.5px solid #0b0c0e;
  animation:pfDotPulse 2.6s ease-in-out infinite;
}
.pf-rank-chip {
  display:flex; align-items:center; gap:8px;
  width:100%; padding:9px 12px; border-radius:10px;
  background:color-mix(in srgb,var(--rank) 9%,rgba(0,0,0,.3));
  border:1px solid color-mix(in srgb,var(--rank) 25%,rgba(255,255,255,.04));
  transition:.18s;
}
.pf-rank-chip:hover { border-color:color-mix(in srgb,var(--rank) 42%,rgba(255,255,255,.05)); }
.pf-rank-chip-text strong { display:block; font-size:12.5px; font-weight:900; color:var(--rank); line-height:1.1; }
.pf-rank-chip-text small  { font-size:10px; color:#5d616f; }
.pf-own-badge {
  padding:3px 10px; border-radius:999px;
  background:rgba(35,209,139,.08); border:1px solid rgba(35,209,139,.2);
  color:#6ee7b7; font-size:10.5px; font-weight:800; letter-spacing:.04em;
}

/* Hero info column */
.pf-hero-info { position:relative; z-index:1; flex:1; min-width:0; }

.pf-eyebrow {
  font-size:10px; font-weight:800; letter-spacing:.28em;
  text-transform:uppercase; color:rgba(212,160,23,.65);
  margin-bottom:11px;
}

.pf-name {
  margin:0 0 10px;
  font-family:var(--display,'Syne',system-ui,sans-serif);
  font-size:clamp(34px,4.5vw,60px);
  font-weight:900; line-height:.92; letter-spacing:-.026em;
  color:#ffffff; overflow-wrap:anywhere;
}

.pf-quote {
  margin:0 0 20px; padding-left:12px;
  border-left:2px solid rgba(212,160,23,.22);
  color:#5d616f; font-size:13px; font-style:italic;
  line-height:1.6; max-width:500px;
}

/* Stats pills */
.pf-stats { display:flex; gap:7px; flex-wrap:wrap; margin-bottom:20px; }
.pf-stat {
  display:flex; flex-direction:column; gap:3px;
  padding:10px 15px; border-radius:10px; min-width:86px;
  background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06);
  cursor:default; transition:.15s;
}
.pf-stat:hover { border-color:rgba(255,255,255,.1); }
.pf-stat span   { font-size:9.5px; text-transform:uppercase; letter-spacing:.12em; color:#5d616f; font-weight:800; }
.pf-stat strong { font-size:19px; font-weight:900; color:#e0e1e3; font-family:var(--display,'Syne',system-ui); line-height:1; }
.pf-stat-gold strong { color:#d4a017; }

/* Progress */
.pf-prog { margin-bottom:20px; }
.pf-prog-header { display:flex; justify-content:space-between; align-items:flex-end; gap:8px; margin-bottom:8px; }
.pf-prog-from, .pf-prog-to { display:flex; flex-direction:column; gap:2px; font-size:10.5px; color:#5d616f; font-weight:700; }
.pf-prog-to { text-align:right; align-items:flex-end; }
.pf-prog-from em, .pf-prog-to em { font-style:normal; font-size:13.5px; }
.pf-prog-from small, .pf-prog-to small { font-size:9.5px; color:rgba(93,97,111,.5); letter-spacing:.04em; }
.pf-prog-center { text-align:center; font-size:11.5px; color:#5d616f; font-weight:700; flex:1; }
.pf-prog-center strong { color:var(--rank); font-size:14px; font-weight:950; display:block; }
.pf-prog-maxed { font-size:13px; font-weight:900; color:#d4a017; text-align:center; flex:1; }
.pf-prog-track {
  position:relative; height:7px; border-radius:999px;
  background:rgba(255,255,255,.05); overflow:hidden;
}
.pf-prog-fill {
  position:relative; height:100%; border-radius:inherit; overflow:hidden;
  background:linear-gradient(90deg,color-mix(in srgb,var(--ac) 55%,rgba(255,255,255,.1)),var(--ac));
  animation:pfBarFill .9s cubic-bezier(.22,1,.36,1) both;
}
.pf-prog-fill::after {
  content:""; position:absolute; inset:0;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);
  animation:pfShimmer 3s ease-in-out infinite;
}

/* Actions */
.pf-actions { display:flex; gap:8px; flex-wrap:wrap; }
.pf-btn {
  height:38px; padding:0 16px; border-radius:9px;
  font-size:12.5px; font-weight:800; cursor:pointer;
  display:inline-flex; align-items:center; justify-content:center;
  text-decoration:none; border:1px solid transparent;
  transition:transform .15s, background .15s, border-color .15s;
}
.pf-btn:hover { transform:translateY(-1px); }
.pf-btn-gold {
  background:rgba(212,160,23,.1); border-color:rgba(212,160,23,.25); color:#d4a017;
}
.pf-btn-gold:hover { background:rgba(212,160,23,.18); border-color:rgba(212,160,23,.42); }
.pf-btn-discord {
  background:rgba(88,101,242,.1); border-color:rgba(88,101,242,.25); color:#93b7ff;
}
.pf-btn-discord:hover { background:rgba(88,101,242,.18); }
.pf-btn-ghost {
  background:transparent; border-color:rgba(255,255,255,.07); color:#5d616f;
}
.pf-btn-ghost:hover { color:#e0e1e3; border-color:rgba(255,255,255,.13); }

/* ══════════════════════════ AURA BRAMS ════════════════════════════════════ */
.pf-aura {
  display:flex; border-radius:16px; margin-bottom:10px; overflow:hidden;
  background:#0f1013;
  border:1px solid rgba(212,160,23,.1);
  transition:border-color .2s;
}
.pf-aura:hover { border-color:rgba(212,160,23,.2); }

.pf-aura-score-col {
  display:flex; flex-direction:column; justify-content:center; gap:8px;
  padding:24px 28px; min-width:158px; flex-shrink:0;
  border-right:1px solid rgba(255,255,255,.05);
  background:rgba(212,160,23,.04);
}
.pf-aura-eyebrow {
  font-size:9.5px; text-transform:uppercase; letter-spacing:.2em;
  color:rgba(212,160,23,.5); font-weight:800;
}
.pf-aura-num {
  font-family:var(--display,'Syne',system-ui);
  font-size:58px; font-weight:950; line-height:1;
  color:#d4a017; display:flex; align-items:baseline; gap:4px;
}
.pf-aura-num small { font-size:16px; color:#5d616f; font-weight:700; }
.pf-aura-tier {
  font-size:10.5px; font-weight:800;
  letter-spacing:.04em;
}

.pf-aura-main {
  flex:1; display:flex; flex-direction:column; justify-content:center; gap:16px;
  padding:24px 28px;
}
.pf-aura-bar-section { display:flex; flex-direction:column; gap:6px; }
.pf-aura-bar-top {
  display:flex; justify-content:space-between; align-items:center;
  font-size:10px; color:#5d616f; font-weight:700;
}
.pf-aura-track {
  height:6px; border-radius:999px; background:rgba(255,255,255,.05); overflow:hidden;
}
.pf-aura-fill {
  height:100%; border-radius:inherit;
  background:linear-gradient(90deg,rgba(212,160,23,.55),#d4a017,rgba(212,160,23,.9));
  animation:pfBarFill .95s cubic-bezier(.22,1,.36,1) .15s both;
  transition:width 1.2s cubic-bezier(.22,1,.36,1);
}
.pf-aura-factors { display:flex; gap:14px; }
.pf-factor { flex:1; display:flex; flex-direction:column; gap:5px; }
.pf-factor-hd { display:flex; justify-content:space-between; align-items:center; gap:4px; }
.pf-factor-hd > span:first-child { font-size:9.5px; text-transform:uppercase; letter-spacing:.11em; color:#5d616f; font-weight:800; }
.pf-factor-val { font-size:11px; font-weight:800; color:var(--fc,#5d616f); }
.pf-factor-val em { font-style:normal; color:#5d616f; font-weight:700; font-size:9px; }
.pf-factor-track { height:3px; border-radius:999px; background:rgba(255,255,255,.05); overflow:hidden; }
.pf-factor-fill  { height:100%; border-radius:inherit; background:var(--fc,rgba(212,160,23,.6)); opacity:.8; animation:pfBarFill .85s cubic-bezier(.22,1,.36,1) .3s both; }

/* ══════════════════════════════ TABS ══════════════════════════════════════ */
.pf-tabs {
  display:flex; gap:2px; padding:4px; border-radius:11px; margin-bottom:18px;
  background:#0f1013;
  border:1px solid rgba(255,255,255,.05);
  width:max-content; max-width:100%;
  overflow-x:auto; scrollbar-width:none;
}
.pf-tabs::-webkit-scrollbar { display:none; }
.pf-tabs button {
  height:36px; padding:0 20px; border-radius:8px;
  border:1px solid transparent; background:transparent;
  color:#5d616f; font-size:12.5px; font-weight:700;
  cursor:pointer; white-space:nowrap; letter-spacing:.02em; flex-shrink:0;
  transition:.15s;
}
.pf-tabs button:hover { color:#e0e1e3; background:rgba(255,255,255,.03); }
.pf-tabs button.active {
  color:#d4a017;
  background:rgba(212,160,23,.08);
  border-color:rgba(212,160,23,.22);
}

/* ── Content ── */
.pf-tab-content { animation:pfFadeUp .25s cubic-bezier(.22,1,.36,1) both; }

/* ── Grid 3 cols ── */
.pf-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:14px; }

/* ══════════════════════════════ PANELS ════════════════════════════════════ */
.pf-panel {
  position:relative; overflow:hidden;
  padding:20px 22px; border-radius:14px;
  background:#0f1013;
  border:1px solid rgba(255,255,255,.05);
  animation:pfFadeUp .45s cubic-bezier(.22,1,.36,1) both;
  transition:border-color .18s, transform .18s, box-shadow .18s;
}
.pf-panel::before {
  content:""; position:absolute; left:0; right:0; top:0; height:1.5px;
  background:var(--panel-line,linear-gradient(90deg,rgba(212,160,23,.5),transparent));
}
.pf-panel:hover { border-color:rgba(255,255,255,.09); transform:translateY(-1px); box-shadow:0 12px 36px rgba(0,0,0,.22); }

.pf-panel-gold {
  border-color:rgba(212,160,23,.1);
  background:linear-gradient(145deg,rgba(212,160,23,.04),#0f1013);
}
.pf-panel-gold::before { background:linear-gradient(90deg,rgba(212,160,23,.65),rgba(212,160,23,.2),transparent); }
.pf-panel-gold:hover { border-color:rgba(212,160,23,.2); }

.pf-panel-rank::before { background:linear-gradient(90deg,var(--rank),color-mix(in srgb,var(--rank) 30%,transparent),transparent); }

.pf-panel-h {
  font-size:10px; font-weight:900; letter-spacing:.12em; text-transform:uppercase;
  color:#5d616f; margin:0 0 16px;
  display:flex; align-items:center; gap:7px;
}
.pf-panel-h::before {
  content:""; width:5px; height:5px; border-radius:50%;
  background:var(--dot-c,#d4a017);
  box-shadow:0 0 6px var(--dot-c,#d4a017);
  flex-shrink:0;
}

/* Rows */
.pf-rows { display:flex; flex-direction:column; }
.pf-row {
  display:flex; justify-content:space-between; align-items:center; gap:8px;
  padding:8px 0; border-bottom:1px solid rgba(255,255,255,.04);
}
.pf-row:last-child { border-bottom:none; }
.pf-row span   { font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:#5d616f; font-weight:800; }
.pf-row strong { font-size:12.5px; color:#e0e1e3; text-align:right; overflow-wrap:anywhere; }

.pf-divider { height:1px; background:rgba(255,255,255,.04); margin:12px 0; }

/* Badges */
.pf-badge-row { display:flex; gap:5px; flex-wrap:wrap; }
.pf-badge {
  display:inline-flex; align-items:center; gap:4px;
  padding:3px 10px; border-radius:999px; font-size:11px; font-weight:800;
  background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
  color:#e0e1e3;
}
.pf-badge-rank {
  background:color-mix(in srgb,var(--rank) 10%,rgba(0,0,0,.2));
  border-color:color-mix(in srgb,var(--rank) 24%,rgba(255,255,255,.04));
}
.pf-badge-discord { background:rgba(88,101,242,.09); border-color:rgba(88,101,242,.2); color:#93b7ff; }
.pf-badge-own { background:rgba(35,209,139,.08); border-color:rgba(35,209,139,.18); color:#6ee7b7; }

/* Berry hero */
.pf-berry-hero {
  padding:13px 15px; border-radius:10px; margin-bottom:14px;
  background:rgba(212,160,23,.07); border:1px solid rgba(212,160,23,.14);
}
.pf-berry-hero span   { font-size:9.5px; text-transform:uppercase; letter-spacing:.12em; color:rgba(212,160,23,.5); font-weight:800; display:block; margin-bottom:4px; }
.pf-berry-hero strong { font-size:26px; font-weight:950; color:#d4a017; font-family:var(--display,'Syne',system-ui); line-height:1; }
.pf-berry-hero em     { font-size:16px; font-style:normal; }

/* ══════════════════════════ RANK JOURNEY ══════════════════════════════════ */
.pf-journey { display:flex; flex-direction:column; }
.pf-jstep {
  display:flex; align-items:center; position:relative;
  padding:3px 0;
  animation:pfFadeUp .35s cubic-bezier(.22,1,.36,1) both;
}
.pf-jconnector {
  position:absolute; left:10px; top:0; bottom:0; width:1px;
  background:rgba(255,255,255,.05);
}
.pf-jstep:last-child .pf-jconnector { display:none; }
.pf-jdot {
  position:relative; z-index:1; flex-shrink:0; margin-right:10px;
  width:22px; height:22px; border-radius:50%;
  background:rgba(255,255,255,.03); border:2px solid rgba(255,255,255,.06);
  display:grid; place-items:center; transition:.18s;
}
.pf-jstep.j-on .pf-jdot {
  background:color-mix(in srgb,var(--ac) 18%,rgba(0,0,0,.25));
  border-color:color-mix(in srgb,var(--ac) 48%,transparent);
}
.pf-jstep.j-current .pf-jdot {
  border-color:var(--ac);
  box-shadow:0 0 12px color-mix(in srgb,var(--ac) 32%,transparent);
}
.pf-jbody {
  display:flex; align-items:center; gap:9px; flex:1;
  padding:5px 9px; border-radius:9px; opacity:.2; transition:.18s;
}
.pf-jstep.j-on      .pf-jbody { opacity:1; }
.pf-jstep.j-current .pf-jbody {
  opacity:1; padding:8px 11px;
  background:color-mix(in srgb,var(--ac) 8%,rgba(255,255,255,.01));
  border:1px solid color-mix(in srgb,var(--ac) 22%,transparent);
}
.pf-jemoji { font-size:15px; flex-shrink:0; }
.pf-jtext strong { display:block; font-size:12px; color:#e0e1e3; }
.pf-jstep.j-current .pf-jtext strong { color:color-mix(in srgb,var(--ac) 75%,#f0e6d3); font-size:12.5px; }
.pf-jtext small { font-size:9.5px; color:#5d616f; }
.pf-jcheck { font-size:12px; font-weight:950; color:rgba(255,255,255,.1); flex-shrink:0; }
.pf-jstep.j-on .pf-jcheck { color:var(--ac); }
.pf-j-current-tag {
  flex-shrink:0; font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:.1em;
  padding:2px 6px; border-radius:999px;
  background:color-mix(in srgb,var(--ac) 12%,rgba(0,0,0,.2));
  border:1px solid color-mix(in srgb,var(--ac) 28%,transparent);
  color:var(--ac);
}

/* ═══════════════════════════ ACHIEVEMENTS ═════════════════════════════════ */
.pf-ach-section { margin-top:4px; }
.pf-section-hd  { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.pf-section-hd h3 {
  margin:0; font-size:10px; font-weight:900; letter-spacing:.12em;
  text-transform:uppercase; color:#5d616f;
  display:flex; align-items:center; gap:7px;
}
.pf-section-hd h3::before { content:""; width:5px; height:5px; border-radius:50%; background:#d4a017; box-shadow:0 0 6px #d4a017; }
.pf-see-all { background:none; border:none; cursor:pointer; color:#5d616f; font-size:12px; font-weight:700; transition:.15s; }
.pf-see-all:hover { color:#e0e1e3; }

.pf-ach-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(255px,1fr)); gap:9px; }
.pf-ach-row  { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:9px; }

.pf-ach {
  display:flex; align-items:center; gap:12px;
  padding:12px 14px; border-radius:10px;
  background:#0f1013; border:1px solid rgba(255,255,255,.05);
  opacity:.28; filter:grayscale(.55);
  animation:pfFadeUp .4s cubic-bezier(.22,1,.36,1) both;
  transition:.18s;
}
.pf-ach-on { opacity:1; filter:none; border-color:rgba(212,160,23,.12); }
.pf-ach-on:hover { border-color:rgba(212,160,23,.26); transform:translateY(-1px); }
.pf-ach-icon  { font-size:22px; flex-shrink:0; }
.pf-ach-body  { flex:1; min-width:0; }
.pf-ach-body strong { display:block; font-size:13px; color:#e0e1e3; }
.pf-ach-body span   { font-size:11px; color:#5d616f; }
.pf-ach-check { font-size:13px; font-weight:950; color:rgba(255,255,255,.1); flex-shrink:0; }
.pf-ach-on .pf-ach-check { color:#d4a017; }

/* ═══════════════════════════ CREW CARD ════════════════════════════════════ */
.pf-crew {
  display:flex; align-items:center; gap:14px;
  padding:16px 20px; border-radius:12px; margin-top:14px;
  background:#0f1013; border:1px solid rgba(255,255,255,.05);
  transition:.15s;
}
.pf-crew:hover { border-color:rgba(255,255,255,.09); }
.pf-crew-icon { font-size:24px; flex-shrink:0; }
.pf-crew-body { flex:1; min-width:0; }
.pf-crew-body strong { display:block; font-size:14px; color:#e0e1e3; margin-bottom:2px; }
.pf-crew-body span   { font-size:12px; color:#5d616f; }
.pf-crew-cta { white-space:nowrap; margin-left:auto; }

/* ══════════════════════ INVENTORY + FILTERS ═══════════════════════════════ */
.pf-inv-filters { display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap; }
.pf-filter-btn {
  height:30px; padding:0 12px; border-radius:7px; font-size:12px; font-weight:700;
  border:1px solid rgba(255,255,255,.06);
  background:rgba(255,255,255,.03); color:#5d616f; cursor:pointer; transition:.15s;
}
.pf-filter-btn:hover { color:#e0e1e3; }
.pf-filter-btn.active {
  background:rgba(212,160,23,.09); border-color:rgba(212,160,23,.22); color:#d4a017;
}

.pf-item-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:10px; }
.pf-item {
  position:relative; overflow:hidden; min-height:130px; padding:14px;
  border-radius:11px; background:#0f1013;
  border:1px solid color-mix(in srgb,var(--ac) 16%,rgba(255,255,255,.04));
  animation:pfFadeUp .4s cubic-bezier(.22,1,.36,1) both;
  transition:.18s;
}
.pf-item::before { content:""; position:absolute; left:0; right:0; top:0; height:1.5px; background:linear-gradient(90deg,var(--ac),transparent); opacity:.5; }
.pf-item:hover { transform:translateY(-2px); border-color:color-mix(in srgb,var(--ac) 30%,rgba(255,255,255,.06)); }
.pf-item-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }
.pf-item-cat    { width:34px; height:34px; border-radius:8px; display:grid; place-items:center; background:color-mix(in srgb,var(--ac) 13%,transparent); color:var(--ac); font-weight:950; font-size:11px; }
.pf-item-rarity { text-transform:uppercase; letter-spacing:.09em; font-size:9.5px; color:#5d616f; font-weight:850; font-style:normal; }
.pf-item-name   { display:block; color:#e0e1e3; font-size:13.5px; font-weight:800; }
.pf-item-date   { display:block; margin-top:6px; color:#5d616f; font-size:11px; }

/* ════════════════════════ TRANSACTIONS ═══════════════════════════════════ */
.pf-tx-list { display:flex; flex-direction:column; gap:8px; }
.pf-tx {
  display:grid; grid-template-columns:40px 1fr auto; align-items:center;
  gap:12px; padding:12px; border-radius:10px;
  background:#0f1013; border:1px solid rgba(255,255,255,.05);
  animation:pfFadeUp .35s cubic-bezier(.22,1,.36,1) both; transition:.15s;
}
.pf-tx:hover { border-color:rgba(255,255,255,.09); }
.pf-tx-icon   { width:40px; height:40px; border-radius:9px; display:grid; place-items:center; color:var(--ac); background:color-mix(in srgb,var(--ac) 11%,transparent); font-weight:950; font-size:16px; }
.pf-tx-info strong { display:block; color:#e0e1e3; font-size:13px; }
.pf-tx-info span   { color:#5d616f; font-size:11.5px; }
.pf-tx-amount      { color:#e06969; font-style:normal; font-weight:950; font-size:14px; white-space:nowrap; }

/* ════════════════════════ EMPTY ══════════════════════════════════════════ */
.pf-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:260px; gap:9px; text-align:center; color:#5d616f; }
.pf-empty-icon   { font-size:40px; }
.pf-empty strong { color:#e0e1e3; font-size:17px; font-weight:800; }
.pf-empty p      { font-size:13px; max-width:320px; line-height:1.55; margin:0; }

/* ════════════════════════ IMMERSIVE ══════════════════════════════════════ */
.pf-immersive .pf-topbar,
.pf-immersive .pf-tabs,
.pf-immersive .pf-tab-content,
.pf-immersive .pf-aura,
.pf-immersive .pf-ach-section,
.pf-immersive .pf-crew { display:none; }
.pf-immersive .pf-wrap { padding-top:24px; }

/* ════════════════════════ RESPONSIVE ════════════════════════════════════ */
@media (max-width:960px) {
  .pf-wrap { width:min(1100px,calc(100% - 32px)); }
  .pf-hero { padding:32px 36px; gap:28px; }
  .pf-grid-3 { grid-template-columns:1fr 1fr; }
  .pf-grid-3 > :last-child { grid-column:1/-1; }
  .pf-aura { flex-direction:column; }
  .pf-aura-score-col { border-right:none; border-bottom:1px solid rgba(255,255,255,.05); flex-direction:row; align-items:center; gap:22px; min-width:unset; padding:18px 22px; }
  .pf-aura-num { font-size:48px; }
  .pf-aura-factors { flex-wrap:wrap; }
  .pf-factor { min-width:calc(50% - 7px); }
}
@media (max-width:640px) {
  .pf-wrap { width:calc(100% - 24px); padding-top:70px; }
  .pf-hero { flex-direction:column; padding:22px; border-radius:14px; gap:20px; }
  .pf-avatar-col { flex-direction:row; align-items:center; gap:18px; min-width:unset; }
  .pf-avatar-ring { width:100px; height:100px; }
  .pf-avatar-emoji { font-size:50px; }
  .pf-name { font-size:clamp(28px,10vw,46px); }
  .pf-stats { gap:6px; }
  .pf-stat { min-width:78px; padding:9px 11px; }
  .pf-stat strong { font-size:17px; }
  .pf-prog-header { flex-direction:column; align-items:center; gap:6px; }
  .pf-prog-from, .pf-prog-to { align-items:center; text-align:center; }
  .pf-grid-3 { grid-template-columns:1fr; }
  .pf-grid-3 > :last-child { grid-column:auto; }
  .pf-tabs { width:100%; }
  .pf-aura-score-col { flex-direction:row; gap:18px; }
  .pf-aura-num { font-size:42px; }
  .pf-aura-factors { flex-direction:column; gap:10px; }
  .pf-factor { min-width:unset; }
  .pf-ach-row { grid-template-columns:1fr; }
}
`

// ── Main ────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { discordId } = useParams()
  const navigate      = useNavigate()
  const { discordId: myId } = useAuth()
  const { activeBg, setOverride, clearOverride } = useOpeningBg()   // fond d'opening équipé → s'affiche derrière le profil
  const [member,   setMember]   = useState(null)
  const [shopData, setShopData] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('stats')
  const [copied,   setCopied]   = useState(false)
  const [immersive,setImmersive]= useState(false)
  const [invFilter,setInvFilter]= useState('Tous')

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setShopData(null)
    // Profil affiché dès que les infos de base arrivent (ne bloque plus sur la boutique).
    fetchMemberProfile(discordId)
      .then(profile => { if (!ignore) { setMember(profile); setLoading(false) } })
      .catch(() => { if (!ignore) setLoading(false) })
    // Données boutique (solde + inventaire) chargées en parallèle, sans bloquer l'affichage.
    fetchBerryShopState(discordId)
      .then(shop => { if (!ignore) setShopData(shop) })
      .catch(() => {})
    return () => { ignore = true }
  }, [discordId])

  const hours    = Number.parseFloat(member?.vocal_h || 0)
  const rank     = getRank(hours)
  const nextRank = getNextRank(rank)
  const remaining = nextRank ? Math.max(0, nextRank.min - hours) : 0
  const pct = useMemo(() => {
    if (!nextRank) return 100
    return Math.min(100, Math.max(0, ((hours - rank.min) / (nextRank.min - rank.min)) * 100))
  }, [hours, rank, nextRank])

  const isOwnProfile = String(myId) === String(discordId)
  const displayName  = member?.username || `Pirate #${String(member?.uid || '').slice(-4)}`
  const quote        = RANK_QUOTES[rank.rang] || ''

  // Fond derrière le profil : sur SON profil on garde le fond du visiteur (activeBg
  // suit equip/preview en direct) ; sur le profil d'un AUTRE on impose SON fond équipé.
  // On coupe le fond du visiteur dès l'arrivée (null) pour éviter qu'il flashe, puis on
  // applique le fond de la cible une fois l'inventaire chargé.
  useEffect(() => {
    if (isOwnProfile) { clearOverride(); return }
    setOverride(null)
    return () => clearOverride()
  }, [isOwnProfile, discordId, setOverride, clearOverride])

  useEffect(() => {
    if (isOwnProfile || !shopData?.inventory) return
    const eq = shopData.inventory.find(
      i => i?.equipped && i?.shop_items?.reward_type === 'opening_background'
    )
    setOverride(eq ? eq.item_id : null)
  }, [isOwnProfile, shopData, discordId, setOverride])

  const wallet = useMemo(() => {
    const memberB = parseInt(member?.berrys ?? 0, 10) || 0
    if (shopData && !shopData.preview) {
      const bal = parseInt(shopData.balance ?? 0, 10) || 0
      // get_berry_balance() renvoie 0 si la résolution du discord_id échoue.
      // Dans ce cas (bal 0 mais classement positif) on garde la valeur du
      // classement, résolue par uid → évite d'afficher 0 à tort.
      return bal > 0 ? bal : memberB
    }
    return memberB
  }, [member, shopData])

  const auraFactors = useMemo(() => {
    if (!member) return { vocal: 0, berries: 0, rankF: 0, total: 0 }
    const vocal   = Math.min(hours / 2, 30)
    const berries = Math.min(parseInt(member?.berrys || 0) / 3_000_000, 25)
    const rankF   = Math.max(0, (RANK_MAP.length - 1 - RANK_MAP.indexOf(rank))) * 6
    const inv     = Math.min((shopData?.inventory?.length || 0) * 0.5, 5)
    const total   = Math.min(Math.round(vocal + berries + rankF + inv), 100)
    return { vocal, berries, rankF, total }
  }, [hours, member, rank, shopData])
  const aura     = auraFactors.total
  const auraTier = getAuraTier(aura)

  const achievements = useMemo(() => {
    if (!member) return []
    return ACHIEVEMENTS.map(a => ({ ...a, unlocked: a.check(member, shopData, hours) }))
  }, [member, shopData, hours])

  const rarities = useMemo(() => {
    if (!shopData?.inventory?.length) return []
    return [...new Set(shopData.inventory.map(i => i?.shop_items?.rarity || 'Commun'))]
  }, [shopData])

  const filteredInv = useMemo(() => {
    if (!shopData?.inventory?.length) return []
    if (invFilter === 'Tous') return shopData.inventory
    return shopData.inventory.filter(i => (i?.shop_items?.rarity || 'Commun') === invFilter)
  }, [shopData, invFilter])

  const copyLink = () => { navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1800) }
  const copyId   = () => { navigator.clipboard.writeText(String(member?.uid || discordId)); setCopied(true); window.setTimeout(() => setCopied(false), 1800) }

  return (
    <div className={`pf-shell${immersive ? ' pf-immersive' : ''}`} style={{ '--rank': rank.color, ...(activeBg ? { background: 'transparent' } : {}) }}>
      {!immersive && <Navbar />}
      <style>{CSS}</style>

      <main className="pf-wrap">
        {/* ── Topbar ── */}
        <div className="pf-topbar">
          <button className="pf-back" type="button" onClick={() => navigate(-1)}>← Retour</button>
          <button className="pf-btn-immersive" type="button" onClick={() => setImmersive(v => !v)}>
            {immersive ? '⊠ Interface' : '⊡ Plein écran'}
          </button>
        </div>

        {loading && <EmptyState icon="⌛" title="Chargement du profil…" sub="Les données arrivent." />}
        {!loading && !member && <EmptyState icon="☠" title="Pirate introuvable" sub="Ce membre n'est pas dans le classement." />}

        {!loading && member && (<>

          {/* ════════ HERO ════════ */}
          <section className="pf-hero">
            <div className="pf-hero-line"  aria-hidden />
            <div className="pf-hero-grid"  aria-hidden />

            {/* Avatar */}
            <div className="pf-avatar-col">
              <div className="pf-avatar-ring">
                <div className="pf-avatar-inner">
                  {member.avatar_url
                    ? <img src={member.avatar_url} alt={displayName} className="pf-avatar-img" />
                    : <span className="pf-avatar-emoji">{rank.emoji}</span>
                  }
                </div>
                <div className="pf-avatar-dot" aria-hidden />
              </div>
              <div className="pf-rank-chip">
                <span style={{ fontSize: 18 }}>{rank.emoji}</span>
                <div className="pf-rank-chip-text">
                  <strong>{rank.rang}</strong>
                  <small>{hours.toFixed(0)}h · #{member.rank} / {member.total}</small>
                </div>
              </div>
              {isOwnProfile && <div className="pf-own-badge">Mon profil</div>}
            </div>

            {/* Info */}
            <div className="pf-hero-info">
              <div className="pf-eyebrow">
                Brams Community · #{member.rank} sur {member.total} Nakamas
              </div>

              <h1 className="pf-name">{displayName}</h1>
              {quote && <p className="pf-quote">"{quote}"</p>}

              {!isOwnProfile && (
                <div style={{ margin: '14px 0 4px' }}>
                  <RelationshipActions targetId={discordId} />
                </div>
              )}

              <div className="pf-stats">
                <div className="pf-stat">
                  <span>Vocal</span>
                  <strong><CountUp value={hours} decimals={1} suffix="h" /></strong>
                </div>
                <div className="pf-stat pf-stat-gold">
                  <span>Berries</span>
                  <strong><CountUp value={parseInt(wallet) / 1e6} decimals={1} suffix="M ฿" /></strong>
                </div>
                <div className="pf-stat">
                  <span>Classement</span>
                  <strong>#{member.rank}</strong>
                </div>
                <div className="pf-stat">
                  <span>Objets</span>
                  <strong>{shopData?.inventory?.length || 0}</strong>
                </div>
              </div>

              <div className="pf-prog">
                <div className="pf-prog-header">
                  <div className="pf-prog-from">
                    <em>{rank.emoji}</em>
                    <span>{rank.rang}</span>
                    <small>{rank.min}h requis</small>
                  </div>
                  {nextRank ? (
                    <div className="pf-prog-center">
                      <strong>{remaining.toFixed(1)}h</strong>
                      avant {nextRank.rang}
                    </div>
                  ) : (
                    <div className="pf-prog-maxed">👑 Rang maximum</div>
                  )}
                  {nextRank && (
                    <div className="pf-prog-to">
                      <em>{nextRank.emoji}</em>
                      <span>{nextRank.rang}</span>
                      <small>{nextRank.min}h requis</small>
                    </div>
                  )}
                </div>
                <div className="pf-prog-track">
                  <div className="pf-prog-fill"
                    style={{ width: `${pct}%`, '--ac': nextRank?.color || rank.color }}
                  />
                </div>
              </div>

              <div className="pf-actions">
                <button className="pf-btn pf-btn-gold" type="button" onClick={copyLink}>
                  {copied ? '✓ Copié' : '⎘ Partager'}
                </button>
                <a className="pf-btn pf-btn-discord" href="https://discord.gg/v3Ddhtbz" target="_blank" rel="noopener noreferrer">
                  Discord
                </a>
              </div>
            </div>
          </section>

          {/* ════════ AURA BRAMS ════════ */}
          <div className="pf-aura">
            <div className="pf-aura-score-col">
              <span className="pf-aura-eyebrow">Aura Brams</span>
              <div className="pf-aura-num">
                <CountUp value={aura} decimals={0} />
                <small>/100</small>
              </div>
              <span className="pf-aura-tier" style={{ color: auraTier.color }}>
                {auraTier.label}
              </span>
            </div>
            <div className="pf-aura-main">
              <div className="pf-aura-bar-section">
                <div className="pf-aura-bar-top">
                  <span>Score de prestige global</span>
                  <span>{aura}/100</span>
                </div>
                <div className="pf-aura-track">
                  <div className="pf-aura-fill" style={{ width: `${aura}%` }} />
                </div>
              </div>
              <div className="pf-aura-factors">
                <AuraFactor label="Vocal"      value={auraFactors.vocal}   max={30} color="#d4a017" />
                <AuraFactor label="Berries"    value={auraFactors.berries} max={25} color="#b8912a" />
                <AuraFactor label="Classement" value={auraFactors.rankF}   max={30} color={rank.color} />
              </div>
            </div>
          </div>

          {/* ════════ TABS ════════ */}
          <nav className="pf-tabs" aria-label="Navigation profil">
            {TABS.map(t => (
              <button key={t.key} type="button" className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </nav>

          {/* ════════ TAB CONTENT ════════ */}
          <div className="pf-tab-content" key={tab}>

            {/* Vue d'ensemble */}
            {tab === 'stats' && (<>
              <div className="pf-grid-3">

                {/* Identité */}
                <article className="pf-panel" style={{ '--dot-c': '#6b7280' }}>
                  <h3 className="pf-panel-h" style={{ '--dot-c': '#6b7280' }}>Identité</h3>
                  <div className="pf-rows">
                    {[
                      ['Pseudo',     displayName],
                      ['Discord ID', member.uid],
                      ['Rang',       `${rank.emoji} ${rank.rang}`],
                      ['Position',   `#${member.rank} / ${member.total}`],
                    ].map(([k, v]) => (
                      <div className="pf-row" key={k}><span>{k}</span><strong>{v}</strong></div>
                    ))}
                  </div>
                  <div className="pf-divider" />
                  <div className="pf-badge-row">
                    <span className="pf-badge pf-badge-rank" style={{ '--rank': rank.color }}>{rank.emoji} {rank.rang}</span>
                    <span className="pf-badge pf-badge-discord">Discord</span>
                    {isOwnProfile && <span className="pf-badge pf-badge-own">Mon profil</span>}
                  </div>
                </article>

                {/* Trésor */}
                <article className="pf-panel pf-panel-gold">
                  <h3 className="pf-panel-h">Trésor</h3>
                  <div className="pf-berry-hero">
                    <span>Solde wallet</span>
                    <strong>{fmtNum(wallet)} <em>฿</em></strong>
                  </div>
                  <div className="pf-rows">
                    {[
                      ['Prime publique', `${fmtB(member.berrys || 0)} ฿`],
                      ['Inventaire',     `${shopData?.inventory?.length || 0} objet${(shopData?.inventory?.length || 0) > 1 ? 's' : ''}`],
                      ['Transactions',   `${shopData?.transactions?.length || 0} achat${(shopData?.transactions?.length || 0) > 1 ? 's' : ''}`],
                    ].map(([k, v]) => (
                      <div className="pf-row" key={k}><span>{k}</span><strong>{v}</strong></div>
                    ))}
                  </div>
                </article>

                {/* Parcours */}
                <article className="pf-panel pf-panel-rank">
                  <h3 className="pf-panel-h" style={{ '--dot-c': rank.color }}>Parcours des rangs</h3>
                  <div className="pf-journey">
                    {RANK_MAP.slice().reverse().map((item, idx) => {
                      const unlocked  = hours >= item.min
                      const isCurrent = rank.rang === item.rang
                      return (
                        <div
                          key={item.rang}
                          className={`pf-jstep${unlocked ? ' j-on' : ''}${isCurrent ? ' j-current' : ''}`}
                          style={{ '--ac': item.color, animationDelay: `${idx * 38}ms` }}
                        >
                          <div className="pf-jconnector" />
                          <div className="pf-jdot" />
                          <div className="pf-jbody">
                            <span className="pf-jemoji">{item.emoji}</span>
                            <div className="pf-jtext">
                              <strong>{item.rang}</strong>
                              <small>{item.min}h requis</small>
                            </div>
                            {isCurrent
                              ? <span className="pf-j-current-tag">Actuel</span>
                              : <span className="pf-jcheck">{unlocked ? '✓' : '—'}</span>
                            }
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </article>
              </div>

              {/* Succès preview */}
              <div className="pf-ach-section">
                <div className="pf-section-hd">
                  <h3>Succès débloqués</h3>
                  <button type="button" className="pf-see-all" onClick={() => setTab('achievements')}>Voir tous →</button>
                </div>
                {achievements.filter(a => a.unlocked).length > 0 ? (
                  <div className="pf-ach-row">
                    {achievements.filter(a => a.unlocked).slice(0, 5).map((a, i) => (
                      <AchievementCard key={a.id} ach={a} unlocked={true} delay={i * 55} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon="🎯" title="Aucun succès débloqué." sub="Continue à être actif sur le serveur." />
                )}
              </div>

              {/* Équipage */}
              <div className="pf-crew">
                <span className="pf-crew-icon">⚓</span>
                <div className="pf-crew-body">
                  <strong>Aucun équipage</strong>
                  <span>Ce pirate navigue en solitaire pour l'instant.</span>
                </div>
                <a className="pf-btn pf-btn-ghost pf-crew-cta" href="/equipage">Explorer →</a>
              </div>
            </>)}

            {/* Posts du membre dans le Fil */}
            {tab === 'posts' && <ProfilePosts userId={discordId} />}

            {/* Inventaire */}
            {tab === 'inventaire' && (
              shopData?.inventory?.length ? (<>
                <div className="pf-inv-filters">
                  {['Tous', ...rarities].map(r => (
                    <button key={r} type="button"
                      className={`pf-filter-btn${invFilter === r ? ' active' : ''}`}
                      onClick={() => setInvFilter(r)}>
                      {r}
                    </button>
                  ))}
                </div>
                <div className="pf-item-grid">
                  {filteredInv.map((item, i) => (
                    <InventoryCard key={`${item.item_id || 'item'}-${i}`} item={item} delay={i * 40} />
                  ))}
                </div>
              </>) : (
                <EmptyState icon="🗃" title="Le coffre est encore vide." sub="Gagne des berries et débloque tes premiers trésors." />
              )
            )}

            {/* Historique */}
            {tab === 'historique' && (
              shopData?.transactions?.length ? (
                <div className="pf-tx-list">
                  {shopData.transactions.map((tx, i) => (
                    <TransactionRow key={`${tx.id || 'tx'}-${i}`} tx={tx} delay={i * 38} />
                  ))}
                </div>
              ) : (
                <EmptyState icon="📜" title="Aucune transaction." sub="L'historique d'achats boutique est vide." />
              )
            )}

            {/* Succès */}
            {tab === 'achievements' && (
              <div className="pf-ach-grid">
                {achievements.map((a, i) => (
                  <AchievementCard key={a.id} ach={a} unlocked={a.unlocked} delay={i * 48} />
                ))}
              </div>
            )}
          </div>

        </>)}
      </main>
    </div>
  )
}
