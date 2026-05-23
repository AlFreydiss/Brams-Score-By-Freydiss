import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { fetchBerryShopState, RARITY_STYLES } from '../lib/berryShop.js'
import { fetchMemberProfile } from '../lib/supabase.js'
import Navbar from './Navbar.jsx'

const RANK_MAP = [
  { min: 150, rang: 'Roi des Pirates', emoji: '👑', color: '#FFD700', next: null },
  { min: 70,  rang: 'Yonkou',          emoji: '🌊', color: '#A78BFA', next: 150  },
  { min: 40,  rang: 'Amiral',          emoji: '🪖', color: '#F59E0B', next: 70   },
  { min: 25,  rang: 'Shichibukai',     emoji: '⚔️', color: '#38BDF8', next: 40   },
  { min: 10,  rang: 'Pirate',          emoji: '🏴‍☠️', color: '#4ADE80', next: 25 },
  { min: 0,   rang: 'Moussaillon',     emoji: '⚓',  color: '#94A3B8', next: 10  },
]
const TABS = [
  { key: 'stats',      label: 'Statistiques', icon: '⚔️' },
  { key: 'inventaire', label: 'Inventaire',   icon: '📦' },
  { key: 'historique', label: 'Historique',   icon: '📜' },
]

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

function CountUp({ value, decimals = 0 }) {
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
  return `${cur.toFixed(decimals)}`
}

function computeBadges(member, rank, hours) {
  const badges = []
  const rankNum = parseInt(member?.rank || 999)
  const total   = parseInt(member?.total || 999)
  const pct     = total > 0 ? (rankNum / total) * 100 : 100
  if (rankNum <= 10)       badges.push({ label: 'Top 10',    color: '#FFD700', icon: '👑' })
  else if (rankNum <= 50)  badges.push({ label: 'Top 50',    color: '#A78BFA', icon: '⭐' })
  else if (pct <= 10)      badges.push({ label: 'Top 10%',   color: '#94A3B8', icon: '🏆' })
  if (hours >= 200)        badges.push({ label: 'Légende',   color: '#FFD700', icon: '🌟' })
  else if (hours >= 100)   badges.push({ label: 'Grinder',   color: '#94A3B8', icon: '🎙️' })
  if (rank.rang === 'Roi des Pirates') badges.push({ label: 'Grand Line', color: '#FFD700', icon: '👑' })
  return badges
}

function Stars() {
  const stars = useMemo(() => Array.from({ length: 55 }, (_, i) => ({
    x: (i * 37.3 + 11) % 98, y: (i * 41.7 + 7) % 95,
    size: i % 7 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 1,
    dur: 3.5 + (i * 0.29) % 4, delay: (i * 0.21) % 6,
    opacity: 0.05 + (i * 0.022) % 0.16,
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

function EmptyState({ icon, title, text, cta, onCta }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 16, padding: '100px 0',
      color: 'rgba(242,240,234,0.28)', textAlign: 'center',
    }}>
      <span style={{ fontSize: 52, animation: 'pfFloat 3.5s ease-in-out infinite' }}>{icon}</span>
      <strong style={{ fontSize: 20, fontWeight: 700, color: 'rgba(242,240,234,0.55)' }}>{title}</strong>
      <p style={{ fontSize: 13, maxWidth: 340, margin: 0, lineHeight: 1.6 }}>{text}</p>
      {cta && (
        <button onClick={onCta} style={{
          marginTop: 4, padding: '12px 28px', borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.03)',
          color: 'rgba(242,240,234,0.5)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          letterSpacing: '.04em', transition: 'all .2s',
        }}>{cta}</button>
      )}
    </div>
  )
}

function StatCard({ icon, label, val, sub, secondary, badge, delay = 0, accent }) {
  const [hov, setHov] = useState(false)
  const ac = accent || 'rgba(255,255,255,0.5)'
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', padding: '22px 20px', borderRadius: 20,
        border: `1px solid ${ac}${hov ? '55' : '28'}`,
        borderTop: `3px solid ${ac}`,
        background: hov
          ? `linear-gradient(145deg, ${ac}32 0%, ${ac}08 55%, rgba(8,9,13,0.99) 100%)`
          : `linear-gradient(145deg, ${ac}20 0%, ${ac}05 55%, rgba(8,9,13,0.99) 100%)`,
        overflow: 'hidden',
        transform: hov ? 'translateY(-8px)' : 'translateY(0)',
        boxShadow: hov ? `0 28px 64px rgba(0,0,0,0.55), 0 0 40px ${ac}22` : `0 6px 24px rgba(0,0,0,0.4)`,
        transition: 'all .28s cubic-bezier(.22,1,.36,1)',
        animation: `pfCardIn .6s ${delay}s ease both`,
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: '-100%', width: '55%', height: '100%',
        background: `linear-gradient(90deg, transparent, ${ac}08, transparent)`,
        animation: 'pfShimmer 8s 1s ease-in-out infinite', pointerEvents: 'none',
      }} />
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: `linear-gradient(135deg, ${ac}40 0%, ${ac}18 100%)`,
        border: `1px solid ${ac}50`,
        boxShadow: `0 4px 22px ${ac}25, inset 0 1px 0 ${ac}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, marginBottom: 18,
      }}>{icon}</div>
      <div style={{
        fontSize: 8.5, letterSpacing: '.20em', textTransform: 'uppercase',
        color: `${ac}cc`, fontWeight: 900, marginBottom: 8,
      }}>{label}</div>
      <div style={{
        fontSize: 40, fontWeight: 900, lineHeight: 1, letterSpacing: '-.03em',
        color: ac, textShadow: `0 0 30px ${ac}40`, marginBottom: 6,
      }}>{val}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{sub}</div>
      {secondary && (
        <div style={{
          marginTop: 10, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)',
          paddingTop: 9, borderTop: `1px solid ${ac}15`,
        }}>{secondary}</div>
      )}
      {badge && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10,
          padding: '3px 11px', borderRadius: 999,
          background: `${ac}18`, border: `1px solid ${ac}32`,
          color: ac, fontSize: 9.5, fontWeight: 800, letterSpacing: '.07em',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: ac, display: 'inline-block', boxShadow: `0 0 6px ${ac}` }} />
          {badge}
        </div>
      )}
    </div>
  )
}

function RankJourney({ rank, nextRank, hours, remaining, progPct }) {
  const rc = rank.color
  if (!nextRank) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 18, padding: '22px 26px',
        borderRadius: 18, background: 'rgba(255,215,0,0.07)',
        border: '1px solid rgba(255,215,0,0.22)',
        boxShadow: '0 0 40px rgba(255,215,0,0.06)',
      }}>
        <span style={{ fontSize: 36, animation: 'pfFloat 3.5s ease-in-out infinite' }}>👑</span>
        <div>
          <strong style={{ display: 'block', fontSize: 16, fontWeight: 900, color: '#FFD700' }}>Grand Line conquise</strong>
          <p style={{ margin: '5px 0 0', fontSize: 12, color: 'rgba(242,240,234,0.3)' }}>Rang maximum — tu es au sommet des Pirates</p>
        </div>
      </div>
    )
  }
  return (
    <div style={{
      padding: '22px 24px', borderRadius: 18,
      border: `1px solid ${rc}28`,
      background: `linear-gradient(135deg, ${rc}12 0%, rgba(8,9,13,0.97) 100%)`,
      boxShadow: `inset 0 1px 0 ${rc}15`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>{rank.emoji}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: `${rc}cc` }}>{rank.rang}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: rc, textShadow: `0 0 24px ${rc}55`, letterSpacing: '-.04em' }}>{progPct.toFixed(0)}</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: `${rc}60` }}>%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(242,240,234,0.4)' }}>{nextRank.rang}</span>
          <span style={{ fontSize: 22 }}>{nextRank.emoji}</span>
        </div>
      </div>
      <div style={{ position: 'relative', padding: '20px 0 16px' }}>
        <div style={{
          height: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden', position: 'relative',
        }}>
          <div style={{
            height: '100%', borderRadius: 999, width: `${progPct}%`,
            background: `linear-gradient(90deg, ${rc}70 0%, ${rc} 60%, ${rc}ff 100%)`,
            boxShadow: `0 0 20px ${rc}60, 0 0 8px ${rc}`,
            transition: 'width 1.8s cubic-bezier(.22,1,.36,1)',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', right: -1, top: '50%', transform: 'translateY(-50%)',
              width: 16, height: 16, borderRadius: '50%',
              background: '#fff', boxShadow: `0 0 12px ${rc}, 0 0 4px #fff`,
            }} />
          </div>
        </div>
        <div style={{
          position: 'absolute', top: 0, left: `${Math.min(progPct, 93)}%`,
          transform: 'translateX(-50%)', fontSize: 18,
          animation: 'pfShip 3.5s ease-in-out infinite',
        }}>🏴‍☠️</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ fontWeight: 800, color: `${rc}dd` }}>
          {hours.toFixed(1)}h <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400 }}>/ {nextRank.min}h</span>
        </span>
        <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>{remaining.toFixed(1)}h restantes</span>
      </div>
    </div>
  )
}

function RankTimeline({ hours, rank }) {
  const reversed = RANK_MAP.slice().reverse()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {reversed.map((r, i) => {
        const done    = hours >= r.min
        const current = rank.rang === r.rang
        const isLast  = i === reversed.length - 1
        return (
          <div key={r.rang} style={{
            position: 'relative',
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '10px 14px', borderRadius: 14,
            background: current ? `${r.color}12` : 'transparent',
            border: current ? `1px solid ${r.color}30` : '1px solid transparent',
            opacity: done ? 1 : 0.2,
            transition: 'all .2s',
          }}>
            {!isLast && (
              <div style={{
                position: 'absolute', left: 27, top: 46, bottom: -10,
                width: 1, background: done ? `${r.color}30` : 'rgba(255,255,255,0.06)', zIndex: 0,
              }} />
            )}
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: current ? `${r.color}25` : done ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
              border: `1.5px solid ${current ? r.color + '60' : done ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              boxShadow: current ? `0 0 22px ${r.color}40, 0 0 8px ${r.color}20` : 'none',
              position: 'relative', zIndex: 1, marginTop: 1,
            }}>
              {current && (
                <span style={{
                  position: 'absolute', inset: -5, borderRadius: '50%',
                  background: `${r.color}20`, animation: 'pfDotPulse 2.5s ease-in-out infinite',
                }} />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>
                {current ? r.emoji : done ? '✓' : '🔒'}
              </span>
            </div>
            <div style={{ flex: 1, paddingTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                <strong style={{
                  fontSize: 12.5, fontWeight: 700,
                  color: current ? r.color : done ? 'rgba(242,240,234,0.65)' : 'rgba(242,240,234,0.3)',
                }}>{r.rang}</strong>
                {current && (
                  <span style={{
                    padding: '1px 7px', borderRadius: 999,
                    background: `${r.color}20`, border: `1px solid ${r.color}35`,
                    color: r.color, fontSize: 7.5, fontWeight: 900, letterSpacing: '.1em',
                  }}>ACTUEL</span>
                )}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(242,240,234,0.22)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{r.min}h vocal requis</span>
                {done && !current && <span style={{ color: 'rgba(242,240,234,0.42)', fontWeight: 700 }}>✓ Débloqué</span>}
                {current && <span style={{ color: `${r.color}80`, fontWeight: 700 }}>● En cours</span>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function InventoryCard({ item, index }) {
  const si     = item?.shop_items || item || {}
  const rarity = si.rarity || 'Commun'
  const style  = RARITY_STYLES[rarity] || RARITY_STYLES.Commun
  const stars  = { Commun: 1, Rare: 2, Epique: 3, Legendaire: 4, Mythique: 5 }[rarity] || 1
  return (
    <article style={{
      position: 'relative', padding: 18, borderRadius: 18,
      border: '1px solid rgba(255,255,255,0.07)', borderTop: '1px solid rgba(255,255,255,0.12)',
      background: '#11131A', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 8,
      animation: `pfCardIn .5s ${index * 0.06}s ease both`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 8, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(242,240,234,0.28)' }}>
        <span>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</span>
        <span>{style.label}</span>
      </div>
      <div style={{ fontSize: 30 }}>{(si.category || '📦').slice(0, 2)}</div>
      <strong style={{ fontSize: 13, fontWeight: 700, color: 'rgba(242,240,234,0.84)', lineHeight: 1.3 }}>{si.name || 'Objet inconnu'}</strong>
      {si.description && <p style={{ margin: 0, fontSize: 11, color: 'rgba(242,240,234,0.3)', lineHeight: 1.5 }}>{si.description}</p>}
      {item?.acquired_at && <small style={{ fontSize: 10, color: 'rgba(242,240,234,0.2)' }}>{timeAgo(item.acquired_at)}</small>}
    </article>
  )
}

function TransactionRow({ tx, index }) {
  const si = tx?.shop_items || {}
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
      borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', background: '#11131A',
      animation: `pfCardIn .5s ${index * 0.05}s ease both`,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%',
        background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 900, color: '#C9A84C', flexShrink: 0,
      }}>฿</div>
      <div style={{ flex: 1 }}>
        <strong style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'rgba(242,240,234,0.8)' }}>{si.name || 'Achat boutique'}</strong>
        <span style={{ fontSize: 11, color: 'rgba(242,240,234,0.26)' }}>{timeAgo(tx?.created_at)}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
        <em style={{ fontStyle: 'normal', fontSize: 14, fontWeight: 800, color: 'rgba(242,240,234,0.5)' }}>-{fmtNum(tx?.amount || 0)}</em>
        <span style={{ fontSize: 10, color: 'rgba(242,240,234,0.24)' }}>฿</span>
      </div>
    </div>
  )
}

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
      .then(p => { if (!dead) { setMember(p); setLoading(false) } })
      .catch(() => { if (!dead) setLoading(false) })
    fetchBerryShopState(discordId)
      .then(s => { if (!dead) setShopData(s) })
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
  const rc        = rank.color

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#08090D', color: '#F2F0EA', fontFamily: 'Inter, system-ui, sans-serif', position: 'relative', overflowX: 'hidden' }}>
      <Navbar />
      <Stars />

      {/* Atmosphere */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', width: 900, height: 900, top: '-20%', right: '-12%', borderRadius: '50%',
          background: `radial-gradient(circle, ${rc}20 0%, transparent 60%)`,
          filter: 'blur(90px)', animation: 'pfPulse 14s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 1000, height: 1000, bottom: '-25%', left: '-18%', borderRadius: '50%',
          background: `radial-gradient(circle, ${rc}14 0%, transparent 60%)`,
          filter: 'blur(120px)', animation: 'pfPulse 20s 3s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,.004) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.004) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, black 0%, transparent 100%)',
        }} />
      </div>

      <main className="pf-main">

        {/* Topbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <button onClick={() => navigate(-1)} style={{
            display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 18px',
            borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.025)',
            color: 'rgba(242,240,234,0.4)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
          }}>← Retour</button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(191,164,106,0.45)', background: 'rgba(191,164,106,0.06)', border: '1px solid rgba(191,164,106,0.14)', borderRadius: 999, padding: '3px 10px' }}>Bientôt disponible</span>
            <button disabled style={{ height: 38, padding: '0 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.015)', color: 'rgba(242,240,234,0.15)', fontSize: 13, fontWeight: 700, cursor: 'not-allowed', textDecoration: 'line-through' }}>⚡ Expérience 3D</button>
          </div>
        </div>

        {loading && <EmptyState icon="⌛" title="Chargement…" text="Le dossier du pirate est en cours de récupération." />}
        {!loading && !member && <EmptyState icon="☠" title="Pirate introuvable" text="Ce membre n'est pas dans le classement." />}

        {!loading && member && <>

          {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
          <section className="pf-hero-grid" style={{
            position: 'relative',
            borderRadius: 28,
            border: `1px solid ${rc}30`,
            background: `linear-gradient(140deg, ${rc}25 0%, rgba(10,12,20,0.98) 55%)`,
            boxShadow: `0 0 0 1px ${rc}10, 0 52px 110px rgba(0,0,0,0.8), 0 0 140px ${rc}12`,
            overflow: 'hidden', marginBottom: 24,
          }}>
            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, transparent, ${rc}70 30%, ${rc} 50%, ${rc}70 70%, transparent)`,
            }} />

            {/* ── POSTER COLUMN ── */}
            <div className="pf-poster-col" style={{
              background: `linear-gradient(180deg, ${rc}20 0%, rgba(8,9,13,0.94) 100%)`,
              borderRight: `1px solid ${rc}18`,
            }}>
              {/* DEAD OR ALIVE */}
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                  <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${rc}45)` }} />
                  <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.28em', textTransform: 'uppercase', color: `${rc}90`, whiteSpace: 'nowrap' }}>DEAD OR ALIVE</span>
                  <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${rc}45, transparent)` }} />
                </div>
              </div>

              {/* Avatar */}
              <div style={{ position: 'relative', width: 190, height: 190, flexShrink: 0 }}>
                <div style={{
                  position: 'absolute', inset: -7, borderRadius: '50%',
                  border: `2px solid ${rc}65`,
                  boxShadow: `0 0 35px ${rc}40, 0 0 70px ${rc}20, inset 0 0 24px ${rc}12`,
                  animation: 'pfPulse 4s ease-in-out infinite',
                }} />
                <div style={{
                  position: 'absolute', inset: -18, borderRadius: '50%',
                  border: `1px dashed ${rc}22`, animation: 'pfSpinRev 35s linear infinite',
                }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', background: '#0D0F16', boxShadow: `inset 0 0 32px rgba(0,0,0,0.65)` }}>
                  {member.avatar_url
                    ? <img src={member.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : <span style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 70 }}>{rank.emoji}</span>
                  }
                </div>
                {isOwn && (
                  <span style={{
                    position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap', padding: '3px 13px', borderRadius: 999,
                    background: `${rc}20`, border: `1px solid ${rc}40`,
                    color: rc, fontSize: 8.5, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase',
                  }}>MON PROFIL</span>
                )}
              </div>

              {/* Prime box */}
              <div style={{
                width: '100%', padding: '20px 16px', borderRadius: 18,
                background: `linear-gradient(135deg, rgba(201,168,76,0.14) 0%, rgba(201,168,76,0.03) 100%)`,
                border: '1px solid rgba(201,168,76,0.25)', textAlign: 'center',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.06), transparent)', animation: 'pfShimmer 10s 2s ease-in-out infinite' }} />
                <div style={{ fontSize: 8.5, fontWeight: 900, letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)', marginBottom: 6 }}>PRIME</div>
                <div style={{ fontSize: 'clamp(26px,3vw,36px)', fontWeight: 900, color: '#C9A84C', letterSpacing: '-.04em', lineHeight: 1, textShadow: '0 0 30px rgba(201,168,76,0.4)' }}>
                  <CountUp value={parseInt(member.berrys || 0)} decimals={0} />
                  <em style={{ fontSize: '52%', fontStyle: 'normal', opacity: .45, marginLeft: 4 }}>฿</em>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(201,168,76,0.28)', marginTop: 5, letterSpacing: '.04em' }}>{fmtNum(member.berrys)} berries</div>
              </div>

              {/* Rank pill */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                borderRadius: 999,
                background: `${rc}20`, border: `1.5px solid ${rc}50`,
                boxShadow: `0 0 24px ${rc}28`,
                fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
              }}>
                <span style={{ fontSize: 18 }}>{rank.emoji}</span>
                <span style={{ color: rc, textShadow: `0 0 12px ${rc}60` }}>{rank.rang}</span>
                <span style={{ padding: '1px 9px', background: `${rc}18`, borderRadius: 999, fontSize: 10.5, color: `${rc}80` }}>#{member.rank}</span>
              </div>

              {/* Badges */}
              {badges.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                  {badges.map(b => (
                    <span key={b.label} style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                      borderRadius: 999, background: `${b.color}16`, border: `1px solid ${b.color}38`,
                      color: b.color, fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em',
                      boxShadow: `0 0 12px ${b.color}12`,
                    }}>{b.icon} {b.label}</span>
                  ))}
                </div>
              )}
            </div>

            {/* ── INFO COLUMN ── */}
            <div className="pf-info-col">

              {/* World rank */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                <div>
                  <div style={{
                    fontSize: 'clamp(64px,7.5vw,100px)', fontWeight: 900, color: rc,
                    lineHeight: 1, letterSpacing: '-.04em',
                    textShadow: `0 0 60px ${rc}60, 0 0 120px ${rc}25`,
                  }}>#{member.rank}</div>
                  <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(242,240,234,0.2)', marginTop: 5 }}>CLASSEMENT MONDIAL</div>
                </div>
                <div style={{ width: 1, height: 60, background: `${rc}28`, flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(242,240,234,0.65)' }}>{member.total}</div>
                    <div style={{ fontSize: 10, color: 'rgba(242,240,234,0.28)', letterSpacing: '.04em' }}>nakamas</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: `${rc}cc`, textShadow: `0 0 12px ${rc}40` }}>Top {topPct}%</div>
                    <div style={{ fontSize: 10, color: 'rgba(242,240,234,0.28)', letterSpacing: '.04em' }}>élite</div>
                  </div>
                </div>
              </div>

              <h1 style={{ margin: 0, fontSize: 'clamp(32px,4.2vw,58px)', fontWeight: 900, color: '#F2F0EA', letterSpacing: '-.028em', lineHeight: 1.02 }}>{displayName}</h1>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap',
                fontSize: 11, fontWeight: 600, color: 'rgba(242,240,234,0.32)',
                padding: '9px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <span style={{ color: `${rc}90` }}>{rank.emoji} {rank.rang}</span>
                <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
                <span>#{member.rank} / {member.total}</span>
                <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
                <span>{hours.toFixed(1)}h vocal</span>
                <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
                <span>{fmtB(member.berrys)} ฿</span>
              </div>

              {/* Stat cards */}
              <div className="pf-stats-grid">
                <StatCard
                  icon="🎤" label="VOCAL"
                  val={<><CountUp value={hours} decimals={1} />h</>}
                  sub="heures en vocal"
                  secondary={nextRank ? `Objectif : ${nextRank.min}h — encore ${remaining.toFixed(1)}h` : 'Objectif atteint ✓'}
                  delay={0} accent='#5865F2'
                />
                <StatCard
                  icon="🏆" label="CLASSEMENT"
                  val={`#${member.rank}`}
                  sub={`/ ${member.total} membres`}
                  badge={`Top ${topPct}%`}
                  delay={0.08} accent='#C9A84C'
                />
                <StatCard
                  icon="📦" label="INVENTAIRE"
                  val={shopData?.inventory?.length || 0}
                  sub="objets possédés"
                  secondary={!shopData?.inventory?.length ? 'Explore la boutique →' : undefined}
                  delay={0.16} accent='#34D399'
                />
              </div>

              <RankJourney rank={rank} nextRank={nextRank} hours={hours} remaining={remaining} progPct={progPct} />

              {/* Actions */}
              <div className="pf-actions-grid">
                <button onClick={copyLink} style={{
                  height: 46, borderRadius: 12, border: '1px solid rgba(255,255,255,0.09)',
                  background: 'rgba(255,255,255,0.04)', color: 'rgba(242,240,234,0.55)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'all .2s',
                }}>{copied ? '✓ Lien copié !' : '⎘ Partager'}</button>
                <a href="https://discord.gg/v3Ddhtbz" target="_blank" rel="noopener noreferrer" style={{
                  height: 46, borderRadius: 12, border: '1px solid rgba(88,101,242,0.22)',
                  background: 'rgba(88,101,242,0.07)', color: 'rgba(88,101,242,0.75)',
                  fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  textDecoration: 'none', transition: 'all .2s',
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057c.01.095.044.186.098.262a19.8 19.8 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/>
                  </svg>
                  Discord
                </a>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  height: 46, padding: '0 16px', borderRadius: 12,
                  border: '1px solid rgba(201,168,76,0.22)', background: 'rgba(201,168,76,0.07)',
                  boxShadow: '0 0 20px rgba(201,168,76,0.06)',
                }}>
                  <span>🪙</span>
                  <span style={{ fontSize: 17, fontWeight: 900, color: '#C9A84C', letterSpacing: '-.01em', textShadow: '0 0 20px rgba(201,168,76,0.5)' }}>{fmtB(wallet)}</span>
                  <span style={{ fontSize: 8.5, color: 'rgba(201,168,76,0.38)', fontWeight: 700, letterSpacing: '.08em' }}>wallet</span>
                </div>
              </div>

            </div>
          </section>

          {/* ══ TABS ══════════════════════════════════════════════════════════════ */}
          <nav style={{
            display: 'flex', gap: 4, padding: 5,
            background: '#11131A', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, width: 'max-content', maxWidth: '100%',
            margin: '0 auto 28px', overflowX: 'auto',
          }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: 7,
                height: 44, padding: '0 24px',
                border: tab === t.key ? '1px solid rgba(255,255,255,0.09)' : '1px solid transparent',
                borderRadius: 12,
                background: tab === t.key ? 'rgba(255,255,255,0.05)' : 'none',
                color: tab === t.key ? '#F2F0EA' : 'rgba(242,240,234,0.28)',
                fontSize: 13, fontWeight: tab === t.key ? 700 : 600,
                cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap',
              }}>
                <span>{t.icon}</span>
                {t.label}
                {tab === t.key && (
                  <span style={{
                    position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)',
                    width: 20, height: 2.5, borderRadius: 999, background: rc,
                    boxShadow: `0 0 8px ${rc}`, opacity: .9,
                  }} />
                )}
              </button>
            ))}
          </nav>

          {/* ══ CONTENT ═══════════════════════════════════════════════════════════ */}
          <div style={{ animation: 'pfRise .4s ease both' }}>

            {tab === 'stats' && (
              <div className="pf-panel-grid">

                {/* Passeport */}
                <article className="pf-panel">
                  <div className="pf-panel-head">
                    <div className="pf-panel-icon">🪪</div>
                    <span>Passeport Pirate</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 0 14px', marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {member.avatar_url
                      ? <img src={member.avatar_url} alt={displayName} style={{ width: 70, height: 70, borderRadius: '50%', border: `2px solid ${rc}35`, objectFit: 'cover', boxShadow: `0 0 20px ${rc}20` }} />
                      : <span style={{ width: 70, height: 70, borderRadius: '50%', border: `2px solid ${rc}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D0F16', fontSize: 30 }}>{rank.emoji}</span>
                    }
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'rgba(242,240,234,0.88)' }}>{displayName}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: rc, textShadow: `0 0 12px ${rc}50` }}>{rank.emoji} {rank.rang}</div>
                  </div>
                  {[
                    ['Discord ID',   member.uid],
                    ['Position',     `#${member.rank} / ${member.total}`],
                    ['Heures vocal', `${hours.toFixed(1)} h`],
                    ['Statut',       `Top ${topPct}%`],
                  ].map(([lbl, val]) => (
                    <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12.5 }}>
                      <span style={{ color: 'rgba(242,240,234,0.28)' }}>{lbl}</span>
                      <strong style={{ color: 'rgba(242,240,234,0.82)', fontWeight: 700 }}>{val}</strong>
                    </div>
                  ))}
                  {badges.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 12 }}>
                      {badges.map(b => (
                        <span key={b.label} style={{
                          padding: '3px 9px', borderRadius: 999,
                          background: `${b.color}14`, border: `1px solid ${b.color}30`,
                          color: b.color, fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em',
                        }}>{b.icon} {b.label}</span>
                      ))}
                    </div>
                  )}
                </article>

                {/* Coffre */}
                <article className="pf-panel pf-panel-gold">
                  <div className="pf-panel-head pf-panel-head-gold">
                    <div className="pf-panel-icon pf-panel-icon-gold">🪙</div>
                    <span>Coffre au Trésor</span>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: 18, borderRadius: 16,
                    background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.03))',
                    border: '1px solid rgba(201,168,76,0.18)', marginBottom: 16,
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.05), transparent)', animation: 'pfShimmer 9s 1.5s ease-in-out infinite' }} />
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(201,168,76,0.14)', border: '1px solid rgba(201,168,76,0.26)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#C9A84C', flexShrink: 0, boxShadow: '0 0 20px rgba(201,168,76,0.2)' }}>฿</div>
                    <div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: '#C9A84C', letterSpacing: '-.02em', textShadow: '0 0 24px rgba(201,168,76,0.5)' }}>{fmtNum(wallet)}</div>
                      <div style={{ fontSize: 10, color: 'rgba(201,168,76,0.3)', letterSpacing: '.06em', marginTop: 2 }}>berries — wallet boutique</div>
                    </div>
                  </div>
                  <div style={{ height: 1, background: 'rgba(201,168,76,0.08)', marginBottom: 4 }} />
                  {[
                    { lbl: 'Prime publique',  val: `${fmtB(member.berrys)} ฿`, icon: '⚡' },
                    { lbl: 'Objets possédés', val: `${shopData?.inventory?.length || 0}`, icon: '📦' },
                    { lbl: 'Transactions',    val: `${shopData?.transactions?.length || 0}`, icon: '📋' },
                  ].map(({ lbl, val, icon }) => (
                    <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12.5 }}>
                      <span style={{ color: 'rgba(242,240,234,0.28)', display: 'flex', alignItems: 'center' }}><span style={{ marginRight: 6 }}>{icon}</span>{lbl}</span>
                      <strong style={{ color: 'rgba(242,240,234,0.82)', fontWeight: 700 }}>{val}</strong>
                    </div>
                  ))}
                  <a href="/boutique" onClick={e => { e.preventDefault(); navigate('/boutique') }} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 14,
                    padding: '12px 0', borderRadius: 12,
                    border: '1px solid rgba(201,168,76,0.18)', background: 'rgba(201,168,76,0.05)',
                    color: 'rgba(201,168,76,0.6)', fontSize: 12, fontWeight: 700,
                    textDecoration: 'none', cursor: 'pointer', letterSpacing: '.04em', transition: 'all .2s',
                  }}>🏪 Visiter la boutique →</a>
                </article>

                {/* Rang */}
                <article className="pf-panel">
                  <div className="pf-panel-head">
                    <div className="pf-panel-icon" style={{ background: `${rc}14`, border: `1px solid ${rc}28` }}>⚡</div>
                    <span>Progression des rangs</span>
                  </div>
                  <RankTimeline hours={hours} rank={rank} />
                </article>

              </div>
            )}

            {tab === 'inventaire' && (
              shopData?.inventory?.length
                ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 12 }}>
                    {shopData.inventory.map((item, i) => <InventoryCard key={i} item={item} index={i} />)}
                  </div>
                : <EmptyState icon="📦" title="Inventaire vide" text="Ce pirate n'a pas encore d'objets. Passe à la boutique pour commencer ta collection." cta="🏪 Voir la boutique" onCta={() => navigate('/boutique')} />
            )}

            {tab === 'historique' && (
              shopData?.transactions?.length
                ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {shopData.transactions.map((tx, i) => <TransactionRow key={i} tx={tx} index={i} />)}
                  </div>
                : <EmptyState icon="📜" title="Aucune transaction" text="L'historique d'achats de ce pirate est vide pour le moment." cta="🏪 Découvrir la boutique" onCta={() => navigate('/boutique')} />
            )}

          </div>
        </>}
      </main>

      <style>{`
        @keyframes pfTwinkle  { 0%,100%{opacity:.04;transform:scale(1)} 50%{opacity:.55;transform:scale(1.5)} }
        @keyframes pfRise     { from{opacity:0;transform:translateY(24px) scale(.98)} to{opacity:1;transform:none} }
        @keyframes pfPulse    { 0%,100%{opacity:.4} 50%{opacity:.85} }
        @keyframes pfSpinRev  { from{transform:rotate(0)} to{transform:rotate(-360deg)} }
        @keyframes pfFloat    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes pfShip     { 0%,100%{transform:translateX(-50%) translateY(0) rotate(-2deg)} 50%{transform:translateX(-50%) translateY(-6px) rotate(2deg)} }
        @keyframes pfShimmer  { 0%{left:-100%} 60%{left:130%} 100%{left:130%} }
        @keyframes pfCardIn   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes pfDotPulse { 0%,100%{transform:scale(1);opacity:.3} 50%{transform:scale(2.4);opacity:0} }

        .pf-main {
          position: relative; z-index: 2;
          width: min(1320px, calc(100% - 32px));
          margin: 0 auto;
          padding: 76px 0 120px;
          animation: pfRise .6s cubic-bezier(.22,1,.36,1) both;
        }

        /* Hero 2-col grid */
        .pf-hero-grid {
          display: grid;
          grid-template-columns: 300px 1fr;
        }
        .pf-poster-col {
          display: flex; flex-direction: column; align-items: center; gap: 18px;
          padding: 40px 28px;
        }
        .pf-info-col {
          display: flex; flex-direction: column; gap: 20px;
          justify-content: center; padding: 40px 38px;
        }

        /* Stat cards 3-col */
        .pf-stats-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
        }

        /* Actions 3-col */
        .pf-actions-grid {
          display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; align-items: center;
        }

        /* Panel grid 3-col */
        .pf-panel-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .pf-panel {
          padding: 26px; border-radius: 22px;
          border: 1px solid rgba(255,255,255,.07);
          border-top: 1px solid rgba(255,255,255,.12);
          background: #11131A;
          display: flex; flex-direction: column;
          position: relative; overflow: hidden;
          transition: border-color .22s, box-shadow .22s;
        }
        .pf-panel::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent);
        }
        .pf-panel:hover { border-color: rgba(255,255,255,.14); box-shadow: 0 22px 55px rgba(0,0,0,.32); }
        .pf-panel-gold { border-color: rgba(201,168,76,.15); }
        .pf-panel-gold::before { background: linear-gradient(90deg, transparent, rgba(201,168,76,.16), transparent); }
        .pf-panel-gold:hover { border-color: rgba(201,168,76,.24); }

        .pf-panel-head {
          display: flex; align-items: center; gap: 9px; margin-bottom: 20px;
          font-size: 9px; letter-spacing: .18em; text-transform: uppercase;
          font-weight: 900; color: rgba(242,240,234,.3);
        }
        .pf-panel-head-gold { color: rgba(201,168,76,.6); }
        .pf-panel-icon {
          width: 28px; height: 28px; border-radius: 8px;
          background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07);
          display: flex; align-items: center; justify-content: center; font-size: 13px;
        }
        .pf-panel-icon-gold { background: rgba(201,168,76,.09); border-color: rgba(201,168,76,.18); }

        /* Responsive */
        @media (max-width: 1100px) {
          .pf-hero-grid { grid-template-columns: 1fr; }
          .pf-poster-col { flex-direction: row; flex-wrap: wrap; justify-content: center; border-right: none; border-bottom: 1px solid rgba(255,255,255,.06); padding-bottom: 30px; }
          .pf-panel-grid { grid-template-columns: 1fr 1fr; }
          .pf-panel-grid > .pf-panel:last-child { grid-column: 1 / -1; }
        }
        @media (max-width: 860px) {
          .pf-stats-grid { grid-template-columns: 1fr; }
          .pf-actions-grid { grid-template-columns: 1fr 1fr; }
          .pf-panel-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .pf-info-col { padding: 24px 20px; }
          .pf-poster-col { padding: 24px 20px; }
          .pf-actions-grid { grid-template-columns: 1fr; }
          .pf-main { padding-top: 62px; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
        }
      `}</style>
    </div>
  )
}
