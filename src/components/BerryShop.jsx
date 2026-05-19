import { useEffect, useMemo, useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import {
  RARITY_STYLES,
  fetchBerryShopState,
  purchaseShopItem,
  upsertShopItem,
  fetchAdminShopData,
  SHOP_CATEGORIES,
} from '../lib/berryShop.js'

// ─── Design tokens ────────────────────────────────────────────────────────────

const GOLD   = '#d4a017'
const AMBER  = '#f59e0b'

const RARITY = {
  Commun:     { color: '#6b7280', glow: 'rgba(107,114,128,0.22)', label: 'Commun',     stars: 1 },
  Rare:       { color: '#3b82f6', glow: 'rgba(59,130,246,0.28)',  label: 'Rare',       stars: 2 },
  Epique:     { color: '#8b5cf6', glow: 'rgba(139,92,246,0.30)',  label: 'Épique',     stars: 3 },
  Legendaire: { color: '#d4a017', glow: 'rgba(212,160,23,0.35)',  label: 'Légendaire', stars: 4 },
  Mythique:   { color: '#ec4899', glow: 'rgba(236,72,153,0.40)',  label: 'Mythique',   stars: 5 },
}

const RARITY_ORDER = ['Commun', 'Rare', 'Epique', 'Legendaire', 'Mythique']

const CAT_ICONS = {
  Cosmetique: '👑', 'Roles Discord': '🎭', Badges: '🏅',
  Boosts: '⚡', Coffres: '📦', Evenements: '🎪', Equipage: '⚓', Prestige: '✦',
}

const DISPLAY_CATS = [
  { key: 'Tous',          label: 'Tous',      icon: '⚔️' },
  { key: 'Cosmetique',    label: 'Titres',    icon: '👑' },
  { key: 'Roles Discord', label: 'Rôles',     icon: '🎭' },
  { key: 'Badges',        label: 'Badges',    icon: '🏅' },
  { key: 'Boosts',        label: 'Boosts',    icon: '⚡' },
  { key: 'Coffres',       label: 'Coffres',   icon: '📦' },
  { key: 'Evenements',    label: 'Événements',icon: '🎪' },
  { key: 'Equipage',      label: 'Équipage',  icon: '⚓' },
  { key: 'Prestige',      label: 'Prestige',  icon: '✦' },
]

const SORT_OPTIONS = [
  { key: 'rarity',     label: '✦ Par rareté' },
  { key: 'price_desc', label: '↓ Prix décroissant' },
  { key: 'price_asc',  label: '↑ Prix croissant' },
  { key: 'limited',    label: '⏳ Limités d\'abord' },
]

const BERRY_SOURCES = [
  { icon: '🎙️', title: 'Vocal',      desc: 'Chaque minute en vocal Discord',   color: '#5865f2' },
  { icon: '🧩', title: 'Quiz',       desc: 'Événements quiz hebdomadaires',    color: GOLD      },
  { icon: '🏆', title: 'Classement', desc: 'Récompense mensuelle Top 10',      color: AMBER     },
  { icon: '⚓', title: 'Équipage',   desc: 'Missions et objectifs d\'équipage',color: '#34d399' },
  { icon: '🎪', title: 'Événements', desc: 'Tournois et événements spéciaux',  color: '#ec4899' },
  { icon: '💬', title: 'Activité',   desc: 'Messages et présence serveur',     color: '#a29bfe' },
]

const MILESTONES = [
  { amount: 400000,    label: '400K',  desc: 'Premiers items',    color: '#6b7280', rarity: 'Commun'     },
  { amount: 1500000,   label: '1.5M',  desc: 'Objets Rares',      color: '#3b82f6', rarity: 'Rare'       },
  { amount: 3500000,   label: '3.5M',  desc: 'Objets Épiques',    color: '#8b5cf6', rarity: 'Epique'     },
  { amount: 10000000,  label: '10M',   desc: 'Légendaires',       color: '#d4a017', rarity: 'Legendaire' },
  { amount: 25000000,  label: '25M',   desc: 'Mythiques',         color: '#ec4899', rarity: 'Mythique'   },
]

const ADMIN_IDS = ['1094070545248694342', '873117504367648798']

const BS_CSS = `
  @keyframes bsFadeUp   { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:none } }
  @keyframes bsGlow     { 0%,100% { opacity:.55 } 50% { opacity:.90 } }
  @keyframes bsShimmer  { 0% { left:-100% } 60% { left:130% } 100% { left:130% } }
  @keyframes bsPulse    { 0%,100% { transform:scale(1); opacity:.7 } 50% { transform:scale(1.65); opacity:1 } }
  @keyframes bsFloat    { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-6px) } }
  @keyframes bsRarePulse { 0%,100% { box-shadow:none } 50% { box-shadow:0 0 28px var(--rc,transparent) } }
`

// ─── Utils ────────────────────────────────────────────────────────────────────

function fmt(n)   { return new Intl.NumberFormat('fr-FR').format(Number(n || 0)) }
function fmtK(n) {
  const v = Number(n || 0)
  if (v >= 1e6) return `${+(v/1e6).toFixed(1).replace(/\.0$/,'')}M`
  if (v >= 1e3) return `${Math.floor(v/1e3)}K`
  return String(v)
}
function openAuth() { document.dispatchEvent(new CustomEvent('open-auth-modal')) }

// ─── RarityBadge ─────────────────────────────────────────────────────────────

function RarityBadge({ rarity, size = 'sm' }) {
  const r = RARITY[rarity] || RARITY.Commun
  const pad = size === 'lg' ? '4px 12px' : '2px 8px'
  const fs  = size === 'lg' ? 10 : 8.5
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      fontSize:fs, fontWeight:800, letterSpacing:'.08em', textTransform:'uppercase',
      color:r.color, background:`${r.color}18`,
      border:`1px solid ${r.color}40`, borderRadius:100, padding:pad,
      whiteSpace:'nowrap', flexShrink:0,
    }}>
      {'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)} {r.label}
    </span>
  )
}

// ─── StatPill ─────────────────────────────────────────────────────────────────

function StatPill({ value, label, color }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <div style={{ fontSize:26, fontWeight:900, color, lineHeight:1, letterSpacing:'-0.02em' }}>{value}</div>
      <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.40)', letterSpacing:'.12em', textTransform:'uppercase' }}>{label}</div>
    </div>
  )
}

// ─── WalletCard ───────────────────────────────────────────────────────────────

function WalletCard({ balance, displayName, avatarUrl, preview, onEarn }) {
  const milestone = MILESTONES.find(m => m.amount > balance) || MILESTONES[MILESTONES.length - 1]
  const prevMilestone = MILESTONES[MILESTONES.indexOf(milestone) - 1]
  const progressPct = prevMilestone
    ? Math.min(100, ((balance - prevMilestone.amount) / (milestone.amount - prevMilestone.amount)) * 100)
    : Math.min(100, (balance / milestone.amount) * 100)
  const deficit = milestone.amount - balance
  const canAfford = balance >= milestone.amount

  return (
    <div style={{
      flexShrink:0, width:290,
      background:'linear-gradient(160deg, rgba(14,16,22,0.98) 0%, rgba(8,9,13,0.99) 100%)',
      border:'1px solid rgba(212,160,23,0.16)',
      borderTop:'2px solid rgba(212,160,23,0.45)',
      borderLeft:'1px solid rgba(212,160,23,0.12)',
      borderRadius:16, padding:22,
      boxShadow:'0 28px 72px rgba(0,0,0,0.65), 0 0 0 1px rgba(212,160,23,0.05) inset, 0 0 40px rgba(212,160,23,0.06)',
      position:'relative', overflow:'hidden',
      animation:'bsFadeUp .6s .2s ease both',
    }}>
      <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle, rgba(212,160,23,0.08) 0%, transparent 65%)', pointerEvents:'none' }} />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        {avatarUrl
          ? <img src={avatarUrl} alt="" style={{ width:40, height:40, borderRadius:10, objectFit:'cover', border:'1px solid rgba(212,160,23,0.30)' }} />
          : <div style={{ width:40, height:40, borderRadius:10, background:'rgba(212,160,23,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🏴‍☠️</div>
        }
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName}</div>
          <div style={{ fontSize:8.5, fontWeight:800, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(212,160,23,0.55)', marginTop:2 }}>Portefeuille</div>
        </div>
      </div>

      {/* Balance */}
      <div style={{ marginBottom:4 }}>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.28)', marginBottom:6 }}>Solde disponible</div>
        <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
          <span style={{ fontSize:13 }}>🪙</span>
          <span style={{ fontSize:28, fontWeight:900, color:GOLD, letterSpacing:'-0.02em', lineHeight:1, textShadow:`0 0 20px rgba(212,160,23,0.35)` }}>{fmt(balance)}</span>
        </div>
        <div style={{ fontSize:9.5, fontWeight:600, color:'rgba(255,255,255,0.28)', letterSpacing:'.05em', marginTop:2 }}>berries</div>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop:14, marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:9, color:'rgba(255,255,255,0.35)', fontWeight:600 }}>
            Prochain palier
          </span>
          <span style={{ fontSize:9, color:milestone.color, fontWeight:700 }}>{milestone.label}</span>
        </div>
        <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:100, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${progressPct}%`, background:`linear-gradient(90deg, ${milestone.color}88, ${milestone.color})`, borderRadius:100, transition:'width 0.5s ease', boxShadow:`0 0 8px ${milestone.color}55` }} />
        </div>
        <div style={{ fontSize:9, color:'rgba(255,255,255,0.28)', marginTop:5, fontWeight:600 }}>
          {canAfford
            ? <span style={{ color:'#22c55e' }}>✓ Palier atteint — {milestone.desc}</span>
            : `Encore ${fmtK(deficit)} berries pour ${milestone.desc}`
          }
        </div>
      </div>

      {/* CTA */}
      <button onClick={onEarn} style={{
        width:'100%', padding:'10px', borderRadius:10,
        background:'rgba(212,160,23,0.10)', border:'1px solid rgba(212,160,23,0.28)',
        color:GOLD, fontSize:12, fontWeight:700, cursor:'pointer',
        transition:'all .15s', letterSpacing:'.02em',
        display:'flex', alignItems:'center', justifyContent:'center', gap:6,
      }}
        onMouseEnter={e => { e.currentTarget.style.background='rgba(212,160,23,0.20)'; e.currentTarget.style.borderColor='rgba(212,160,23,0.55)' }}
        onMouseLeave={e => { e.currentTarget.style.background='rgba(212,160,23,0.10)'; e.currentTarget.style.borderColor='rgba(212,160,23,0.28)' }}
      >
        🪙 Gagner des berries
      </button>
      {preview && <div style={{ marginTop:8, fontSize:9, color:'rgba(255,255,255,0.18)', textAlign:'center', letterSpacing:'.1em', fontWeight:700, textTransform:'uppercase' }}>Mode preview</div>}
    </div>
  )
}

// ─── FeaturedCard ─────────────────────────────────────────────────────────────

function FeaturedCard({ item, balance, onClick, index }) {
  const r = RARITY[item.rarity] || RARITY.Mythique
  const canAfford = balance >= Number(item.price)
  const deficit = canAfford ? 0 : Number(item.price) - balance
  const icon = CAT_ICONS[item.category] || '🏴‍☠️'
  const [hov, setHov] = useState(false)

  return (
    <div
      onClick={() => onClick(item)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:'relative', cursor:'pointer', borderRadius:18,
        padding:24, overflow:'hidden',
        background:`linear-gradient(145deg, ${r.color}12 0%, ${r.color}06 45%, rgba(8,9,13,0.96) 100%)`,
        border:`1px solid ${hov ? r.color+'55' : r.color+'22'}`,
        boxShadow: hov ? `0 20px 60px ${r.color}25, 0 0 0 1px ${r.color}22` : `0 8px 32px rgba(0,0,0,0.5)`,
        transition:'all 0.28s ease',
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        animation:`bsFadeUp .5s ${0.1 + index * 0.12}s ease both`,
        display:'flex', flexDirection:'column',
      }}
    >
      {/* Shimmer */}
      <div style={{ position:'absolute', top:0, left:'-100%', width:'50%', height:'100%', background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)', animation:'bsShimmer 5s 2s ease-in-out infinite', pointerEvents:'none' }} />
      {/* Top glow */}
      <div style={{ position:'absolute', top:'-30%', right:'-10%', width:180, height:180, borderRadius:'50%', background:`radial-gradient(circle, ${r.color}18 0%, transparent 65%)`, pointerEvents:'none', animation:'bsGlow 3s ease-in-out infinite' }} />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <span style={{ fontSize:8.5, fontWeight:900, letterSpacing:'.18em', textTransform:'uppercase', color:r.color, background:`${r.color}18`, border:`1px solid ${r.color}55`, borderRadius:100, padding:'4px 13px', boxShadow:`0 0 14px ${r.color}25` }}>◆ ULTRA RARE</span>
        <RarityBadge rarity={item.rarity} />
      </div>

      <div style={{ fontSize:44, lineHeight:1, marginBottom:16, filter:`drop-shadow(0 0 14px ${r.color}60)`, animation:'bsFloat 4s ease-in-out infinite' }}>{icon}</div>

      <div style={{ fontWeight:800, fontSize:'clamp(17px,2vw,22px)', color:'#fff', marginBottom:8, lineHeight:1.2 }}>{item.name}</div>
      <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.48)', lineHeight:1.65, marginBottom:'auto', paddingBottom:16 }}>{item.description}</div>

      {item.stock !== null && (
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14, fontSize:10.5, color:'rgba(255,255,255,0.35)', fontWeight:600 }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:r.color, boxShadow:`0 0 6px ${r.color}`, display:'inline-block' }} />
          {item.stock} exemplaire{item.stock > 1 ? 's' : ''} — ultra rare
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
          <span style={{ fontSize:15 }}>🪙</span>
          <span style={{ fontSize:24, fontWeight:900, color:r.color, letterSpacing:'-0.02em', textShadow:`0 0 16px ${r.color}55` }}>{fmt(item.price)}</span>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.30)', fontWeight:600 }}>berries</span>
        </div>
        <span style={{
          fontSize:11, fontWeight:700, padding:'7px 16px', borderRadius:9,
          background: canAfford ? `${r.color}20` : 'rgba(255,255,255,0.06)',
          border: `1px solid ${canAfford ? r.color+'45' : 'rgba(255,255,255,0.10)'}`,
          color: canAfford ? r.color : 'rgba(255,255,255,0.35)',
          transition:'all .15s',
        }}>
          {canAfford ? '✦ Acquérir' : `−${fmtK(deficit)}`}
        </span>
      </div>
    </div>
  )
}

// ─── ShopCard ─────────────────────────────────────────────────────────────────

function ShopCard({ item, balance, onClick, index }) {
  const r = RARITY[item.rarity] || RARITY.Commun
  const canAfford = balance >= Number(item.price)
  const stockCritical = item.stock !== null && item.stock <= 3
  const icon = CAT_ICONS[item.category] || '🏴‍☠️'
  const [hov, setHov] = useState(false)
  const isLegendaryPlus = ['Legendaire', 'Mythique'].includes(item.rarity)

  return (
    <div
      onClick={() => onClick(item)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:'relative', cursor:'pointer', borderRadius:16, padding:18,
        background: isLegendaryPlus
          ? `linear-gradient(145deg, ${r.color}14 0%, ${r.color}07 50%, rgba(8,9,13,0.95) 100%)`
          : 'rgba(255,255,255,0.035)',
        border:`1px solid ${hov ? r.color+'55' : r.color+'22'}`,
        borderLeft:`2.5px solid ${hov ? r.color+'90' : r.color+'58'}`,
        boxShadow: hov ? `0 18px 44px ${r.color}30, 0 0 0 1px ${r.color}18` : isLegendaryPlus ? `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px ${r.color}10` : 'none',
        transition:'all 0.22s ease',
        transform: hov ? 'translateY(-3px)' : 'translateY(0)',
        animation:`bsFadeUp .45s ${Math.min(index * 0.05, 0.4)}s ease both`,
        display:'flex', flexDirection:'column', overflow:'hidden',
        ...(isLegendaryPlus && { animation: `bsFadeUp .45s ${Math.min(index * 0.05, 0.4)}s ease both, bsRarePulse 4s ease-in-out infinite`, '--rc': r.color+'25' }),
      }}
    >
      {/* Top stripe for legendaire+ */}
      {isLegendaryPlus && (
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, transparent, ${r.color}80, transparent)`, borderRadius:'16px 16px 0 0' }} />
      )}

      {/* Top row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <RarityBadge rarity={item.rarity} />
        <div style={{ display:'flex', gap:5 }}>
          {item.limited && <span style={{ fontSize:8, fontWeight:800, letterSpacing:'.06em', color:'#f59e0b', background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.30)', borderRadius:6, padding:'2px 7px' }}>LIMITÉ</span>}
          {stockCritical && <span style={{ fontSize:8, fontWeight:800, color:'#ef4444', background:'rgba(239,68,68,0.10)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:6, padding:'2px 7px' }}>⚠ {item.stock}</span>}
          {item.stock === 0 && <span style={{ fontSize:8, fontWeight:800, color:'rgba(255,255,255,0.35)', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:6, padding:'2px 7px' }}>ÉPUISÉ</span>}
        </div>
      </div>

      {/* Icon */}
      <div style={{ fontSize:34, lineHeight:1, marginBottom:12, filter: isLegendaryPlus ? `drop-shadow(0 0 10px ${r.color}55)` : 'none' }}>{icon}</div>

      {/* Name */}
      <div style={{ fontSize:13.5, fontWeight:700, color:'#fff', marginBottom:6, lineHeight:1.3 }}>{item.name}</div>
      <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.42)', lineHeight:1.6, marginBottom:'auto', paddingBottom:14, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' }}>{item.description}</div>

      {/* Footer */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginTop:'auto' }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
          <span style={{ fontSize:11 }}>🪙</span>
          <span style={{ fontSize:15, fontWeight:900, color: canAfford ? r.color : 'rgba(255,255,255,0.45)', letterSpacing:'-0.01em' }}>{fmt(item.price)}</span>
        </div>
        <span style={{
          fontSize:10, fontWeight:700, padding:'5px 12px', borderRadius:7,
          background: item.stock === 0 ? 'rgba(255,255,255,0.05)'
            : canAfford ? `${r.color}18`
            : 'rgba(255,255,255,0.05)',
          border:`1px solid ${item.stock === 0 ? 'rgba(255,255,255,0.08)' : canAfford ? r.color+'35' : 'rgba(255,255,255,0.08)'}`,
          color: item.stock === 0 ? 'rgba(255,255,255,0.25)' : canAfford ? r.color : 'rgba(255,255,255,0.35)',
        }}>
          {item.stock === 0 ? 'Épuisé' : canAfford ? 'Acquérir' : `−${fmtK(Number(item.price) - balance)}`}
        </span>
      </div>
    </div>
  )
}

// ─── RewardModal ──────────────────────────────────────────────────────────────

function RewardModal({ item, balance, busy, message, onClose, onConfirm }) {
  if (!item) return null
  const r = RARITY[item.rarity] || RARITY.Commun
  const canAfford = balance >= Number(item.price)
  const deficit = canAfford ? 0 : Number(item.price) - balance
  const icon = CAT_ICONS[item.category] || '🏴‍☠️'

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, zIndex:9000,
        background:'rgba(0,0,0,0.78)', backdropFilter:'blur(12px)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:20,
        animation:'bsFadeUp .15s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:'100%', maxWidth:460,
          background:'linear-gradient(145deg, rgba(10,12,18,0.99) 0%, rgba(6,8,12,1) 100%)',
          border:`1px solid ${r.color}30`,
          borderTop:`1px solid ${r.color}55`,
          borderRadius:20, padding:28, position:'relative', overflow:'hidden',
          boxShadow:`0 40px 100px rgba(0,0,0,0.80), 0 0 40px ${r.color}15`,
          animation:'bsFadeUp .2s ease',
        }}
      >
        {/* Top glow */}
        <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:280, height:160, background:`radial-gradient(ellipse, ${r.color}14 0%, transparent 65%)`, pointerEvents:'none' }} />

        {/* Close */}
        <button onClick={onClose} style={{ position:'absolute', top:16, right:16, width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)', color:'rgba(255,255,255,0.60)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', zIndex:1 }}>✕</button>

        {/* Rarity + limited */}
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:20 }}>
          <RarityBadge rarity={item.rarity} size="lg" />
          {item.limited && <span style={{ fontSize:10, fontWeight:800, color:AMBER, background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.30)', borderRadius:100, padding:'3px 10px' }}>LIMITÉ</span>}
        </div>

        {/* Icon */}
        <div style={{ fontSize:52, lineHeight:1, marginBottom:16, filter:`drop-shadow(0 0 18px ${r.color}50)`, animation:'bsFloat 4s ease-in-out infinite', textAlign:'center' }}>{icon}</div>

        {/* Name */}
        <div style={{ fontSize:'clamp(20px,4vw,26px)', fontWeight:800, color:'#fff', marginBottom:10, textAlign:'center', lineHeight:1.2 }}>{item.name}</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', lineHeight:1.65, marginBottom:20, textAlign:'center' }}>{item.description}</div>

        {/* Grid details */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
          {[
            { label:'Prix', value:`${fmt(item.price)} 🪙` },
            { label:'Ton solde', value:`${fmt(balance)} 🪙` },
            { label:'Stock', value: item.stock === null ? 'Illimité' : item.stock === 0 ? 'Épuisé' : `${item.stock} restant${item.stock > 1 ? 's':''}`  },
            { label:'Type', value: item.reward_type },
          ].map(kv => (
            <div key={kv.label} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'10px 12px' }}>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:4 }}>{kv.label}</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{kv.value}</div>
            </div>
          ))}
        </div>

        {/* Deficit warning */}
        {!canAfford && (
          <div style={{ marginBottom:16, padding:'12px 14px', borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.22)', display:'flex', gap:10, alignItems:'flex-start' }}>
            <span style={{ fontSize:16, flexShrink:0 }}>⚠️</span>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#f87171', marginBottom:3 }}>Solde insuffisant</div>
              <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.50)', lineHeight:1.55 }}>Il te manque <strong style={{ color:'#f87171' }}>{fmt(deficit)} berries</strong> — grind encore sur le Discord.</div>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:10, background: message.type === 'error' ? 'rgba(239,68,68,0.10)' : 'rgba(34,197,94,0.10)', border:`1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`, color: message.type === 'error' ? '#f87171' : '#4ade80', fontSize:12.5, fontWeight:600 }}>{message.text}</div>
        )}

        {/* CTA */}
        <button
          disabled={!canAfford || busy || item.stock === 0}
          onClick={() => onConfirm(item)}
          style={{
            width:'100%', padding:'14px', borderRadius:12,
            background: canAfford && item.stock !== 0 ? `linear-gradient(135deg, ${r.color}30, ${r.color}18)` : 'rgba(255,255,255,0.04)',
            border:`1px solid ${canAfford && item.stock !== 0 ? r.color+'55' : 'rgba(255,255,255,0.08)'}`,
            color: canAfford && item.stock !== 0 ? r.color : 'rgba(255,255,255,0.25)',
            fontSize:13, fontWeight:700, cursor: canAfford && item.stock !== 0 ? 'pointer' : 'not-allowed',
            transition:'all .15s', letterSpacing:'.02em',
            opacity: busy ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (canAfford && !busy && item.stock !== 0) e.currentTarget.style.background=`linear-gradient(135deg, ${r.color}45, ${r.color}28)` }}
          onMouseLeave={e => { if (canAfford && !busy && item.stock !== 0) e.currentTarget.style.background=`linear-gradient(135deg, ${r.color}30, ${r.color}18)` }}
        >
          {busy ? '⏳ Traitement en cours…'
            : item.stock === 0 ? '⛔ Épuisé'
            : canAfford ? `✦ Confirmer — ${fmt(item.price)} berries`
            : 'Solde insuffisant'}
        </button>
      </div>
    </div>
  )
}

// ─── BerryEarningGuide ────────────────────────────────────────────────────────

function BerryEarningGuide() {
  return (
    <div style={{ maxWidth:1120, margin:'0 auto 60px', padding:'0 20px' }}>
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.18em', color:GOLD, textTransform:'uppercase', marginBottom:10 }}>Sources</div>
        <h2 style={{ fontSize:'clamp(24px,4vw,36px)', fontWeight:900, color:'#fff', margin:0 }}>Comment gagner des Berries ?</h2>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(170px, 1fr))', gap:12 }}>
        {BERRY_SOURCES.map((s, i) => (
          <div key={i} style={{
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:14, padding:'18px 16px', textAlign:'center',
            transition:'all .2s', cursor:'default',
          }}
            onMouseEnter={e => { e.currentTarget.style.background=`${s.color}0d`; e.currentTarget.style.borderColor=`${s.color}35` }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)' }}
          >
            <div style={{ fontSize:28, marginBottom:10 }}>{s.icon}</div>
            <div style={{ fontSize:12.5, fontWeight:700, color:'#fff', marginBottom:4 }}>{s.title}</div>
            <div style={{ fontSize:10.5, color:'rgba(255,255,255,0.40)', lineHeight:1.5 }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── PrestigeMilestones ───────────────────────────────────────────────────────

function PrestigeMilestones({ balance }) {
  return (
    <div style={{ maxWidth:1120, margin:'0 auto 60px', padding:'0 20px' }}>
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.18em', color:GOLD, textTransform:'uppercase', marginBottom:10 }}>Progression</div>
        <h2 style={{ fontSize:'clamp(24px,4vw,36px)', fontWeight:900, color:'#fff', margin:0 }}>Paliers de Prestige</h2>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.42)', marginTop:8 }}>Accumule des berries pour débloquer des récompenses de plus en plus rares.</div>
      </div>
      <div style={{ display:'flex', gap:0, position:'relative' }}>
        {/* Connector line */}
        <div style={{ position:'absolute', top:24, left:'5%', right:'5%', height:2, background:'rgba(255,255,255,0.06)', zIndex:0 }} />
        {MILESTONES.map((m, i) => {
          const reached = balance >= m.amount
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:10, position:'relative', zIndex:1 }}>
              {/* Circle */}
              <div style={{
                width:48, height:48, borderRadius:'50%',
                background: reached ? `linear-gradient(135deg, ${m.color}30, ${m.color}15)` : 'rgba(255,255,255,0.04)',
                border:`2px solid ${reached ? m.color : 'rgba(255,255,255,0.10)'}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow: reached ? `0 0 20px ${m.color}30` : 'none',
                transition:'all 0.3s',
              }}>
                <span style={{ fontSize:18, filter: reached ? 'none' : 'grayscale(1) opacity(0.4)' }}>
                  {i === 0 ? '🏴' : i === 1 ? '⚔️' : i === 2 ? '💠' : i === 3 ? '✦' : '👑'}
                </span>
              </div>
              <div style={{ fontSize:12.5, fontWeight:800, color: reached ? m.color : 'rgba(255,255,255,0.35)', textAlign:'center' }}>{m.label}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', textAlign:'center', lineHeight:1.4 }}>{m.desc}</div>
              {reached && <div style={{ fontSize:8, fontWeight:800, color:'#22c55e', letterSpacing:'.08em', textTransform:'uppercase' }}>✓ Atteint</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── SectionHeading ───────────────────────────────────────────────────────────

function SectionHeading({ eyebrow, title, subtitle, color = GOLD }) {
  return (
    <div style={{ marginBottom:32, animation:'bsFadeUp .5s ease' }}>
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.2em', color, textTransform:'uppercase', marginBottom:12 }}>{eyebrow}</div>
      <h2 style={{ fontSize:'clamp(28px,5vw,48px)', fontWeight:900, color:'#fff', margin:'0 0 10px', lineHeight:1.1 }}>{title}</h2>
      {subtitle && <div style={{ fontSize:13.5, color:'rgba(255,255,255,0.45)', maxWidth:560 }}>{subtitle}</div>}
    </div>
  )
}

// ─── AdminShop ────────────────────────────────────────────────────────────────

const emptyItem = { name:'', description:'', category:'Cosmetique', price:400000, rarity:'Commun', stock:'', limited:false, active:true, reward_type:'badge', reward_data:{} }

function AdminShop({ isAdmin }) {
  const [adminData, setAdminData] = useState({ items:[], transactions:[] })
  const [form, setForm] = useState(emptyItem)
  const [status, setStatus] = useState('')

  useEffect(() => { if (isAdmin) fetchAdminShopData().then(setAdminData) }, [isAdmin])

  async function saveItem(e) {
    e.preventDefault()
    const payload = { ...form, price:Number(form.price), stock:form.stock===''?null:Number(form.stock), reward_data:typeof form.reward_data==='string'?JSON.parse(form.reward_data||'{}'):form.reward_data }
    const { error } = await upsertShopItem(payload)
    setStatus(error ? error.message : 'Item sauvegardé.')
    if (!error) { setForm(emptyItem); fetchAdminShopData().then(setAdminData) }
  }

  if (!isAdmin) return null

  return (
    <div style={{ maxWidth:1120, margin:'60px auto 0', padding:'0 20px 60px' }}>
      <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:24 }}>
        <div style={{ fontSize:9, fontWeight:800, letterSpacing:'.14em', color:GOLD, textTransform:'uppercase', marginBottom:8 }}>Admin Shop</div>
        <div style={{ fontSize:20, fontWeight:800, color:'#fff', marginBottom:20 }}>Pilotage boutique</div>
        <form onSubmit={saveItem} style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:10, marginBottom:16 }}>
          {[
            { ph:'Nom item', val:form.name, key:'name' },
            { ph:'Description', val:form.description, key:'description' },
            { ph:'Prix (min 400 000)', val:form.price, key:'price', type:'number' },
            { ph:'Stock vide = illimité', val:form.stock, key:'stock', type:'number' },
            { ph:'reward_type', val:form.reward_type, key:'reward_type' },
          ].map(f => (
            <input key={f.key} type={f.type||'text'} value={f.val} onChange={e => setForm({...form,[f.key]:e.target.value})} placeholder={f.ph} required={['name','description','price'].includes(f.key)}
              style={{ padding:'9px 12px', borderRadius:9, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)', color:'#fff', fontSize:12, outline:'none' }} />
          ))}
          <select value={form.category} onChange={e => setForm({...form,category:e.target.value})} style={{ padding:'9px 12px', borderRadius:9, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)', color:'#fff', fontSize:12, outline:'none' }}>
            {SHOP_CATEGORIES.map(c => <option key={c} style={{ background:'#0d0f14' }}>{c}</option>)}
          </select>
          <select value={form.rarity} onChange={e => setForm({...form,rarity:e.target.value})} style={{ padding:'9px 12px', borderRadius:9, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)', color:'#fff', fontSize:12, outline:'none' }}>
            {RARITY_ORDER.map(r => <option key={r} style={{ background:'#0d0f14' }}>{r}</option>)}
          </select>
          <textarea value={JSON.stringify(form.reward_data)} onChange={e => setForm({...form,reward_data:e.target.value})} placeholder='{"roleId":"..."}' style={{ padding:'9px 12px', borderRadius:9, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)', color:'#fff', fontSize:12, outline:'none', gridColumn:'span 2', resize:'vertical', minHeight:60 }} />
          <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'rgba(255,255,255,0.65)', cursor:'pointer' }}>
            <input type="checkbox" checked={form.limited} onChange={e => setForm({...form,limited:e.target.checked})} /> Limité
          </label>
          <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'rgba(255,255,255,0.65)', cursor:'pointer' }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm({...form,active:e.target.checked})} /> Actif
          </label>
          <button type="submit" style={{ padding:'10px', borderRadius:9, background:'rgba(212,160,23,0.15)', border:'1px solid rgba(212,160,23,0.35)', color:GOLD, fontWeight:700, fontSize:12, cursor:'pointer' }}>Sauvegarder</button>
        </form>
        {status && <div style={{ padding:'8px 12px', borderRadius:8, background:'rgba(34,197,94,0.10)', border:'1px solid rgba(34,197,94,0.25)', color:'#4ade80', fontSize:12, marginBottom:10 }}>{status}</div>}
        <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:200, overflowY:'auto' }}>
          {adminData.transactions.map(tx => (
            <div key={tx.id} style={{ display:'flex', gap:10, padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:11, color:'rgba(255,255,255,0.55)' }}>
              <span style={{ flex:1 }}>{tx.shop_items?.name || tx.item_id}</span>
              <span>{fmt(tx.price)}</span>
              <span style={{ color:tx.status==='completed'?'#4ade80':'#f87171' }}>{tx.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BerryShop() {
  const { isAuthenticated, discordId, displayName, avatarUrl, user } = useAuth()
  const [state, setState]   = useState({ balance:0, items:[], inventory:[], transactions:[], preview:false })
  const [category, setCategory] = useState('Tous')
  const [sort, setSort]     = useState('rarity')
  const [search, setSearch] = useState('')
  const [showAffordable, setShowAffordable] = useState(false)
  const [showLimited, setShowLimited] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [busy, setBusy]     = useState(false)
  const [message, setMessage] = useState(null)
  const earnRef = useRef(null)

  const isAdmin = ADMIN_IDS.includes(String(discordId)) || user?.user_metadata?.role === 'admin' || user?.app_metadata?.role === 'admin'

  useEffect(() => {
    document.title = 'Berry Shop — Brams Community'
    return () => { document.title = 'Brams Community' }
  }, [])

  useEffect(() => {
    const id = 'bs-css-v2'
    if (document.getElementById(id)) return
    const el = document.createElement('style'); el.id = id; el.textContent = BS_CSS
    document.head.appendChild(el)
    return () => document.getElementById(id)?.remove()
  }, [])

  useEffect(() => {
    if (isAuthenticated) fetchBerryShopState(discordId).then(setState)
  }, [isAuthenticated, discordId])

  const featuredItems = useMemo(() =>
    state.items.filter(i => i.rarity === 'Mythique' || i.rarity === 'Legendaire').slice(0, 3)
  , [state.items])

  const sortedFiltered = useMemo(() => {
    let items = category === 'Tous' ? [...state.items] : state.items.filter(i => i.category === category)
    if (search) items = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.description?.toLowerCase().includes(search.toLowerCase()))
    if (showAffordable) items = items.filter(i => state.balance >= Number(i.price))
    if (showLimited)    items = items.filter(i => i.limited)
    switch (sort) {
      case 'price_asc':  items.sort((a,b) => a.price-b.price); break
      case 'price_desc': items.sort((a,b) => b.price-a.price); break
      case 'rarity':     items.sort((a,b) => RARITY_ORDER.indexOf(b.rarity)-RARITY_ORDER.indexOf(a.rarity)); break
      case 'limited':    items.sort((a,b) => (b.limited?1:0)-(a.limited?1:0)); break
    }
    return items
  }, [category, sort, search, showAffordable, showLimited, state.items, state.balance])

  const gridItems = useMemo(() =>
    category === 'Tous' ? sortedFiltered.filter(i => !['Mythique','Legendaire'].includes(i.rarity)) : sortedFiltered
  , [sortedFiltered, category])

  const maxPrice     = state.items.length ? Math.max(...state.items.map(i => Number(i.price))) : 0
  const limitedCount = state.items.filter(i => i.limited).length

  async function confirmPurchase(item) {
    setBusy(true); setMessage(null)
    const { data, error } = await purchaseShopItem(item.id)
    if (error) { setMessage({ type:'error', text:error.message }); setBusy(false); return }
    if (data?.ok === false) {
      setMessage({ type:'error', text:data.error || 'Achat refusé.' })
      setState(c => ({ ...c, balance:Number(data.balance ?? c.balance) }))
      setBusy(false); return
    }
    setMessage({ type:'success', text:'✓ Achat validé. Récompense ajoutée à ton profil.' })
    setState(c => ({ ...c, balance:Number(data?.balance ?? c.balance - item.price) }))
    fetchBerryShopState(discordId).then(setState)
    setBusy(false)
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse 80% 55% at 50% 0%, rgba(212,160,23,0.08) 0%, #171b23 50%), #171b23',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '60px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <style>{`
          @keyframes bsPageFloat { 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-10px) } }
          @keyframes bsPagePulse { 0%,100%{ opacity:.28; transform:scale(1) } 50%{ opacity:.6; transform:scale(1.14) } }
          @keyframes bsPageStar  { 0%,100%{ opacity:.06 } 50%{ opacity:.40 } }
          @keyframes bsPageIn    { from{ opacity:0; transform:translateY(20px) } to{ opacity:1; transform:none } }
          @keyframes bsPageScan  { 0%{ transform:translateY(-200%) } 100%{ transform:translateY(120vh) } }
          @media (prefers-reduced-motion: reduce) {
            [style*="bsPage"] { animation: none !important; }
          }
        `}</style>

        {/* Ambient radial glows */}
        <div style={{ position:'absolute', top:'-5%', left:'50%', transform:'translateX(-50%)', width:'90%', height:'60%', background:'radial-gradient(circle at center, rgba(245,158,11,0.08), transparent 55%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'0%', left:'-5%', width:'55%', height:'45%', background:'radial-gradient(ellipse, rgba(88,101,242,0.05) 0%, transparent 65%)', pointerEvents:'none' }} />

        {/* Scan line */}
        <div style={{ position:'absolute', left:0, right:0, height:1, background:'linear-gradient(90deg, transparent, rgba(212,160,23,0.07), transparent)', animation:'bsPageScan 12s linear infinite', pointerEvents:'none' }} />

        {/* Stars / particles */}
        {Array.from({ length: 48 }).map((_, i) => (
          <div key={i} style={{
            position:'absolute',
            top:`${(i * 37.3) % 90}%`, left:`${(i * 41.7) % 98}%`,
            width: i % 6 === 0 ? 2 : 1, height: i % 6 === 0 ? 2 : 1,
            borderRadius:'50%',
            background: i % 9 === 0 ? 'rgba(212,160,23,0.65)' : 'rgba(255,255,255,0.55)',
            opacity: 0.1 + (i * 0.03) % 0.35,
            animation:`bsPageStar ${2.5 + (i * 0.31) % 3}s ${(i * 0.19) % 2.2}s ease-in-out infinite`,
            pointerEvents:'none',
          }} />
        ))}

        {/* Content — no box, full page breathing */}
        <div style={{ position:'relative', zIndex:2, maxWidth:580, width:'100%', animation:'bsPageIn .55s ease' }}>

          {/* Icon */}
          <div style={{ position:'relative', display:'inline-block', marginBottom:24 }}>
            <div style={{ position:'absolute', inset:-22, borderRadius:'50%', background:'radial-gradient(circle, rgba(212,160,23,0.20) 0%, transparent 65%)', animation:'bsPagePulse 3s ease-in-out infinite' }} />
            <div style={{
              width:80, height:80, borderRadius:'50%',
              background:'rgba(251,191,36,0.10)',
              border:'1px solid rgba(251,191,36,0.35)',
              boxShadow:'0 0 40px rgba(251,191,36,0.22)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:38, lineHeight:1,
              animation:'bsPageFloat 4s ease-in-out infinite',
              position:'relative', zIndex:1,
            }}>🪙</div>
          </div>

          {/* Badge */}
          <div style={{ marginBottom:30 }}>
            <span style={{
              display:'inline-block',
              background:'rgba(212,160,23,0.07)',
              border:'1px solid rgba(212,160,23,0.32)',
              borderRadius:5, padding:'6px 22px',
              fontSize:11, fontWeight:800, letterSpacing:'.18em',
              color:'rgba(212,160,23,0.82)', textTransform:'uppercase',
            }}>Berry Shop — Zone Réservée</span>
          </div>

          {/* Title hierarchy */}
          <div style={{ marginBottom:28 }}>
            <div style={{
              fontSize:'clamp(17px,3vw,24px)', fontWeight:600,
              color:'rgba(255,255,255,0.70)', letterSpacing:'.04em', marginBottom:6,
            }}>Boutique</div>
            <div style={{
              fontSize:'clamp(52px,10vw,82px)', fontWeight:900, lineHeight:1,
              letterSpacing:'-0.02em',
              fontFamily:"'Pirata One', 'Cinzel', Georgia, serif",
              background:'linear-gradient(135deg, #d4a017 0%, #f59e0b 28%, #E0524A 65%, #ff7055 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            }}>Prestige</div>
          </div>

          {/* Description */}
          <p style={{ fontSize:16, color:'rgba(255,255,255,0.52)', maxWidth:460, margin:'0 auto 18px', lineHeight:1.75 }}>
            Ta monnaie <strong style={{ color:'rgba(255,255,255,0.88)' }}>Discord</strong> devient puissante ici.
            Des <strong style={{ color:'rgba(255,255,255,0.88)' }}>récompenses rares, mythiques</strong> et légendaires
            réservées aux vrais <strong style={{ color:'rgba(255,255,255,0.88)' }}>nakamas</strong>.
          </p>

          {/* Quote */}
          <p style={{
            fontSize:14, color:'rgba(212,160,23,0.88)', fontStyle:'italic',
            maxWidth:460, margin:'0 auto 34px', lineHeight:1.65,
          }}>
            « Les trésors les plus rares n'apparaissent qu'aux nakamas dignes du Grand Line. »
          </p>

          {/* Rarity tiers — subtle */}
          <div style={{ display:'flex', gap:7, justifyContent:'center', flexWrap:'wrap', marginBottom:40 }}>
            {[
              { l:'Commun', c:'#6b7280' }, { l:'Rare', c:'#3b82f6' }, { l:'Épique', c:'#8b5cf6' },
              { l:'Légendaire', c:'#d4a017' }, { l:'Mythique', c:'#ec4899' },
            ].map(r => (
              <span key={r.l} style={{
                fontSize:9, fontWeight:800, letterSpacing:'.10em', textTransform:'uppercase',
                color:r.c, background:`${r.c}12`, border:`1px solid ${r.c}28`,
                borderRadius:100, padding:'4px 13px', transition:'all .2s', cursor:'default',
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow=`0 0 12px ${r.c}38`; e.currentTarget.style.borderColor=`${r.c}55` }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=`${r.c}28` }}
              >{r.l}</span>
            ))}
          </div>

          {/* Discord button — narrow, centered */}
          <div style={{ marginBottom:16 }}>
            <button onClick={openAuth} style={{
              display:'inline-flex', alignItems:'center', justifyContent:'center', gap:10,
              padding:'14px 32px', width:'auto', minWidth:260, maxWidth:340,
              background:'linear-gradient(135deg, #5865f2 0%, #4752c4 100%)',
              border:'1px solid rgba(255,255,255,0.12)',
              borderTop:'1px solid rgba(255,255,255,0.20)',
              borderRadius:12, color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer',
              boxShadow:'0 6px 28px rgba(88,101,242,0.45)',
              transition:'all .2s', letterSpacing:'.02em',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 12px 40px rgba(88,101,242,0.62)'; e.currentTarget.style.filter='brightness(1.06)' }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 6px 28px rgba(88,101,242,0.45)'; e.currentTarget.style.filter='none' }}
              onMouseDown={e => { e.currentTarget.style.transform='scale(0.98)' }}
              onMouseUp={e => { e.currentTarget.style.transform='translateY(-2px)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
              Se connecter avec Discord
            </button>
          </div>

          {/* Email link */}
          <div style={{ marginBottom:40 }}>
            <button onClick={openAuth} style={{
              background:'none', border:'none', cursor:'pointer',
              color:'rgba(255,255,255,0.28)', fontSize:13, fontFamily:'var(--body)',
              textDecoration:'underline', transition:'color .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.color='rgba(255,255,255,0.70)'}
              onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.28)'}
            >Ou se connecter par email →</button>
          </div>

          {/* Footer note */}
          <div style={{
            fontSize:11, color:'rgba(255,255,255,0.22)',
            letterSpacing:'.18em', textTransform:'uppercase',
          }}>
            Les berries sont gagnées sur le serveur Discord
          </div>

        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:'#08090d', overflowX:'hidden' }}>

      {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
      <div style={{ position:'relative', padding:'72px 20px 44px', overflow:'hidden' }}>
        {/* Subtle grid texture */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(212,160,23,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(212,160,23,0.022) 1px, transparent 1px)', backgroundSize:'52px 52px', pointerEvents:'none', opacity:.7 }} />
        {/* Ambient glows */}
        <div style={{ position:'absolute', top:'-10%', left:'8%', width:'45%', height:'90%', background:'radial-gradient(ellipse, rgba(212,160,23,0.07) 0%, transparent 62%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:'5%', right:'2%', width:'38%', height:'75%', background:'radial-gradient(ellipse, rgba(139,92,246,0.09) 0%, transparent 60%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-5%', left:'35%', width:'45%', height:'55%', background:'radial-gradient(ellipse, rgba(236,72,153,0.05) 0%, transparent 65%)', pointerEvents:'none' }} />

        <div style={{ maxWidth:1120, margin:'0 auto', display:'flex', alignItems:'center', gap:48, flexWrap:'wrap' }}>

          {/* Left: copy */}
          <div style={{ flex:1, minWidth:280, animation:'bsFadeUp .5s ease' }}>
            {/* Badge header */}
            <div style={{ display:'inline-flex', alignItems:'center', gap:7, marginBottom:22, background:'rgba(212,160,23,0.07)', border:'1px solid rgba(212,160,23,0.22)', borderRadius:6, padding:'5px 14px' }}>
              <span style={{ fontSize:11 }}>⚓</span>
              <span style={{ fontSize:9, fontWeight:800, letterSpacing:'.22em', color:GOLD, textTransform:'uppercase' }}>Berry Shop — Brams Community</span>
            </div>
            {/* Title */}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:'clamp(13px,1.8vw,17px)', fontWeight:400, color:'rgba(255,255,255,0.38)', letterSpacing:'.08em', marginBottom:4 }}>Boutique</div>
              <h1 style={{
                fontSize:'clamp(40px,6vw,72px)', fontWeight:900, margin:0, lineHeight:.9, letterSpacing:'-0.02em',
                background:'linear-gradient(140deg, #ffffff 0%, rgba(255,255,255,0.88) 38%, #d4a017 72%, #f59e0b 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
              }}>
                Prestige
              </h1>
            </div>
            <p style={{ fontSize:'clamp(12px,1.3vw,14px)', color:'rgba(255,255,255,0.45)', lineHeight:1.78, marginBottom:6, maxWidth:500 }}>
              Récompenses exclusives, titres rares, rôles prestigieux, boosts d'élite et artefacts convoités.
            </p>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.22)', fontStyle:'italic', marginBottom:26 }}>
              Seuls les nakamas les plus investis peuvent prétendre à ces récompenses.
            </p>

            {/* Stat pills */}
            <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap', animation:'bsFadeUp .5s .12s ease both' }}>
              <StatPill value={state.items.length || '—'} label="Objets"   color="#fff"   />
              <div style={{ width:1, height:30, background:'rgba(255,255,255,0.08)' }} />
              <StatPill value={Object.keys(RARITY).length}  label="Raretés"  color={GOLD}   />
              <div style={{ width:1, height:30, background:'rgba(255,255,255,0.08)' }} />
              <StatPill value={fmtK(maxPrice)}               label="Prix max"  color="#8b5cf6" />
              <div style={{ width:1, height:30, background:'rgba(255,255,255,0.08)' }} />
              <StatPill value={limitedCount}                 label="Limités"  color="#ec4899" />
            </div>
          </div>

          {/* Right: wallet */}
          <WalletCard
            balance={state.balance}
            displayName={displayName}
            avatarUrl={avatarUrl}
            preview={state.preview}
            onEarn={() => earnRef.current?.scrollIntoView({ behavior:'smooth' })}
          />
        </div>
      </div>

      {/* ═══ CONTROLS ════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth:1120, margin:'0 auto 36px', padding:'0 20px' }}>
        {/* Search */}
        <div style={{ position:'relative', marginBottom:14 }}>
          <span style={{ position:'absolute', left:18, top:'50%', transform:'translateY(-50%)', fontSize:16, color:'rgba(255,255,255,0.28)', pointerEvents:'none' }}>🔍</span>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Chercher un objet, un titre, un rôle, un badge…"
            style={{ width:'100%', paddingLeft:48, paddingRight:20, height:52, background:'rgba(255,255,255,0.04)', backdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.13)', borderRadius:12, color:'#fff', fontSize:14, outline:'none', boxSizing:'border-box', transition:'border-color .2s, box-shadow .2s', fontFamily:'var(--body)' }}
            onFocus={e => { e.currentTarget.style.borderColor='rgba(212,160,23,0.50)'; e.currentTarget.style.boxShadow='0 0 0 3px rgba(212,160,23,0.10), 0 2px 16px rgba(212,160,23,0.08)' }}
            onBlur={e  => { e.currentTarget.style.borderColor='rgba(255,255,255,0.13)'; e.currentTarget.style.boxShadow='none' }}
          />
        </div>

        {/* Category pills */}
        <div style={{ display:'flex', gap:6, overflowX:'auto', scrollbarWidth:'none', paddingBottom:6, marginBottom:10 }}>
          {DISPLAY_CATS.map(cat => {
            const active = category === cat.key
            return (
              <button key={cat.key} onClick={() => setCategory(cat.key)} style={{
                display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px',
                borderRadius:100, border:`1px solid ${active ? 'rgba(212,160,23,0.55)' : 'rgba(255,255,255,0.09)'}`,
                background: active ? 'rgba(212,160,23,0.15)' : 'rgba(255,255,255,0.03)',
                color: active ? GOLD : 'rgba(255,255,255,0.45)',
                fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap',
                transition:'all .18s', flexShrink:0,
                boxShadow: active ? `0 0 20px rgba(212,160,23,0.18), inset 0 0 8px rgba(212,160,23,0.05)` : 'none',
              }}>
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>

        {/* Secondary filters */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {[
            { label:'Achetables uniquement', active:showAffordable, fn:() => setShowAffordable(v=>!v) },
            { label:'Limités uniquement',    active:showLimited,    fn:() => setShowLimited(v=>!v)    },
          ].map(f => (
            <button key={f.label} onClick={f.fn} style={{
              padding:'6px 14px', borderRadius:8, border:`1px solid ${f.active ? 'rgba(34,197,94,0.40)' : 'rgba(255,255,255,0.08)'}`,
              background: f.active ? 'rgba(34,197,94,0.10)' : 'transparent',
              color: f.active ? '#4ade80' : 'rgba(255,255,255,0.40)',
              fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s',
            }}>{f.active ? '✓ ' : ''}{f.label}</button>
          ))}

          <select value={sort} onChange={e => setSort(e.target.value)} style={{ marginLeft:'auto', padding:'6px 12px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)', color:'rgba(255,255,255,0.65)', fontSize:11, fontWeight:700, cursor:'pointer', outline:'none' }}>
            {SORT_OPTIONS.map(o => <option key={o.key} value={o.key} style={{ background:'#0d0f14' }}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* ═══ FEATURED — Légendaire + Mythique ══════════════════════════════ */}
      {featuredItems.length > 0 && category === 'Tous' && !search && (
        <div style={{ maxWidth:1120, margin:'0 auto 56px', padding:'0 20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:12 }}>
            <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(212,160,23,0.40), transparent)' }} />
            <span style={{ fontSize:11, fontWeight:900, letterSpacing:'.2em', color:GOLD, textTransform:'uppercase', whiteSpace:'nowrap' }}>✦ Prestige &amp; Objets Convoités</span>
            <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(212,160,23,0.40), transparent)' }} />
          </div>
          <p style={{ textAlign:'center', fontSize:12.5, color:'rgba(255,255,255,0.35)', marginBottom:24, fontStyle:'italic' }}>
            Ces récompenses ne sont accessibles qu'aux nakamas les plus dévoués. Chaque objet est rare.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:18 }}>
            {featuredItems.map((item, i) => (
              <FeaturedCard key={item.id} item={item} balance={state.balance} onClick={setSelectedItem} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* ═══ MAIN GRID ═══════════════════════════════════════════════════════ */}
      <div style={{ maxWidth:1120, margin:'0 auto 60px', padding:'0 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ fontSize:9, fontWeight:800, letterSpacing:'.18em', color:'rgba(255,255,255,0.35)', textTransform:'uppercase' }}>
            {category === 'Tous' ? 'Toutes les récompenses' : DISPLAY_CATS.find(c=>c.key===category)?.label}
          </div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.28)', fontWeight:700 }}>{gridItems.length} objet{gridItems.length > 1 ? 's':''}</div>
        </div>

        {gridItems.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16 }}>
            <div style={{ fontSize:48, marginBottom:14, opacity:.3 }}>🏴</div>
            <div style={{ fontSize:15, fontWeight:700, color:'rgba(255,255,255,0.45)', marginBottom:6 }}>Aucun objet trouvé</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.25)' }}>Essaie une autre catégorie ou supprime les filtres.</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:14 }}>
            {gridItems.map((item, i) => (
              <ShopCard key={item.id} item={item} balance={state.balance} onClick={setSelectedItem} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* ═══ PRESTIGE MILESTONES ═════════════════════════════════════════════ */}
      <PrestigeMilestones balance={state.balance} />

      {/* ═══ BERRY EARNING GUIDE ════════════════════════════════════════════ */}
      <div ref={earnRef}>
        <BerryEarningGuide />
      </div>

      {/* ═══ INVENTORY + HISTORY ════════════════════════════════════════════ */}
      {(state.inventory.length > 0 || state.transactions.length > 0) && (
        <div style={{ maxWidth:1120, margin:'0 auto 60px', padding:'0 20px', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:16 }}>
          {[
            { label:'INVENTAIRE', title:'Objets possédés', items:state.inventory, renderItem: e => ({ name:e.shop_items?.name||e.item_id, sub:`×${e.quantity}${e.equipped?' · équipé':''}` }) },
            { label:'HISTORIQUE', title:'Derniers achats',  items:state.transactions.slice(0,10), renderItem: tx => ({ name:tx.shop_items?.name||tx.item_id, sub:`${fmt(tx.price)} berries · ${tx.status}` }) },
          ].map(section => (
            <div key={section.label} style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:18 }}>
              <div style={{ fontSize:8.5, fontWeight:800, letterSpacing:'.14em', color:'rgba(255,255,255,0.30)', textTransform:'uppercase', marginBottom:6 }}>{section.label}</div>
              <div style={{ fontSize:18, fontWeight:800, color:'#fff', marginBottom:14 }}>{section.title}</div>
              {section.items.length === 0
                ? <div style={{ fontSize:12, color:'rgba(255,255,255,0.25)' }}>Aucun élément pour le moment.</div>
                : section.items.map((item, i) => {
                    const { name, sub } = section.renderItem(item)
                    return (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.05)', gap:8 }}>
                        <span style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.75)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
                        <span style={{ fontSize:11, color:'rgba(255,255,255,0.30)', whiteSpace:'nowrap', flexShrink:0 }}>{sub}</span>
                      </div>
                    )
                  })
              }
            </div>
          ))}
        </div>
      )}

      <AdminShop isAdmin={isAdmin} />

      {/* ═══ MODAL ══════════════════════════════════════════════════════════ */}
      {selectedItem && (
        <RewardModal
          item={selectedItem}
          balance={state.balance}
          busy={busy}
          message={message}
          onClose={() => { setSelectedItem(null); setMessage(null) }}
          onConfirm={confirmPurchase}
        />
      )}
    </div>
  )
}
