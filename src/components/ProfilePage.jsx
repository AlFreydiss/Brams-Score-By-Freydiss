import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchMemberProfile } from '../lib/supabase.js'
import { fetchBerryShopState, RARITY_STYLES } from '../lib/berryShop.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import Navbar from './Navbar.jsx'

const RANK_MAP = [
  { min: 150, rang: 'Roi des Pirates',  emoji: '🤴', color: '#FFD700', next: null },
  { min: 70,  rang: 'Yonkou',           emoji: '👑', color: '#9B59B6', next: 150 },
  { min: 40,  rang: 'Amiral',           emoji: '🪖', color: '#F1C40F', next: 70  },
  { min: 25,  rang: 'Shichibukai',      emoji: '⚔️', color: '#2ECC71', next: 40  },
  { min: 10,  rang: 'Pirate',           emoji: '🏴‍☠️', color: '#3B82F6', next: 25  },
  { min: 0,   rang: 'Moussaillon',      emoji: '⚓', color: '#7c7f8a', next: 10  },
]
const RANK_ICONS = {
  'Roi des Pirates': '👑', Yonkou: '🌊', Amiral: '⚔️', Shichibukai: '🗡️', Pirate: '🏴‍☠️', Moussaillon: '⚓',
}
function getRank(h)   { return RANK_MAP.find(r => h >= r.min) ?? RANK_MAP[RANK_MAP.length - 1] }
function getNextRank(rk) { return rk.next != null ? RANK_MAP.find(r => r.min === rk.next) : null }
function fmtB(n) {
  if (!n) return '0'
  n = parseInt(n)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}
function fmtNum(n) { return new Intl.NumberFormat('fr-FR').format(n || 0) }
function timeAgo(iso) {
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

/* ── Stat card ── */
function StatCard({ icon, label, value, color, sub }) {
  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(20,12,4,.97) 0%, rgba(14,8,2,.99) 100%)',
      border: `1px solid ${color}22`,
      borderTop: `1px solid ${color}33`,
      borderRadius: 6, padding: '18px 20px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${color}14, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: 'Pirata One, cursive', lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(180,150,100,.45)', textTransform: 'uppercase', letterSpacing: '.1em' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(180,150,100,.38)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

/* ── Progress bar ── */
function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ height: 8, background: 'rgba(255,255,255,.06)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`, borderRadius: 4,
        background: `linear-gradient(90deg, ${color}88, ${color})`,
        transition: 'width 1.2s cubic-bezier(.22,1,.36,1)',
        boxShadow: `0 0 10px ${color}55`,
      }} />
    </div>
  )
}

/* ── Rarity badge ── */
function RarityBadge({ rarity }) {
  const s = RARITY_STYLES[rarity] || RARITY_STYLES.Commun
  return (
    <span style={{
      fontSize: 8.5, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase',
      color: s.color, background: `${s.color}18`, border: `1px solid ${s.color}44`,
      borderRadius: 3, padding: '2px 6px',
    }}>{s.label}</span>
  )
}

/* ── Inventory item card ── */
function InventoryCard({ item }) {
  const s = RARITY_STYLES[item?.shop_items?.rarity || item?.rarity] || RARITY_STYLES.Commun
  const name = item?.shop_items?.name || item?.name || 'Objet inconnu'
  const rarity = item?.shop_items?.rarity || item?.rarity || 'Commun'
  const acquired = item?.acquired_at
  const ICONS = { Cosmetique:'👑', 'Roles Discord':'🎭', Badges:'🏅', Boosts:'⚡', Coffres:'📦', Evenements:'🎪', Equipage:'⚓', Prestige:'✦' }
  const cat = item?.shop_items?.category || item?.category || 'Cosmetique'
  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(20,12,4,.97) 0%, rgba(14,8,2,.99) 100%)',
      border: `1px solid ${s.color}20`, borderTop: `1px solid ${s.color}35`,
      borderRadius: 6, padding: '16px', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ position: 'absolute', top: -15, right: -15, width: 60, height: 60, borderRadius: '50%', background: `radial-gradient(circle, ${s.color}12, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 26 }}>{ICONS[cat] || '🎁'}</span>
        <RarityBadge rarity={rarity} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(232,215,175,.9)', lineHeight: 1.3, fontFamily: 'Pirata One, cursive' }}>{name}</div>
      {acquired && <div style={{ fontSize: 10, color: 'rgba(180,150,100,.38)' }}>Obtenu {timeAgo(acquired)}</div>}
    </div>
  )
}

/* ── Transaction row ── */
function TxRow({ tx }) {
  const s = RARITY_STYLES[tx?.shop_items?.rarity] || RARITY_STYLES.Commun
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 4,
      background: 'rgba(0,0,0,.3)', border: '1px solid rgba(140,90,20,.12)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 4, flexShrink: 0,
        background: `${s.color}18`, border: `1px solid ${s.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>💰</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(232,215,175,.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tx?.shop_items?.name || 'Achat boutique'}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(180,150,100,.42)', marginTop: 2 }}>{timeAgo(tx?.created_at)}</div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 900, color: '#c0503a', fontFamily: 'Pirata One, cursive', flexShrink: 0 }}>
        −{fmtNum(tx?.amount || 0)} ฿
      </div>
    </div>
  )
}

/* ── Wanted poster ── */
function WantedPoster({ member, rank, rk }) {
  const prime = parseInt(member.berrys || 0)
  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(160deg, #1e1408 0%, #130d05 100%)',
      border: '2px solid #7a5a14',
      borderRadius: 6, padding: '24px 20px 20px',
      width: 260, flexShrink: 0,
      boxShadow: '0 0 50px rgba(120,85,10,.35), 0 20px 60px rgba(0,0,0,.65)',
    }}>
      {['top','bottom'].map(pos => (
        <div key={pos} style={{ position: 'absolute', [pos]: 6, left: 6, right: 6, height: 1, background: 'linear-gradient(90deg, transparent, #7a5a14, #c4941c, #7a5a14, transparent)' }} />
      ))}
      {['left','right'].map(pos => (
        <div key={pos} style={{ position: 'absolute', [pos]: 6, top: 6, bottom: 6, width: 1, background: 'linear-gradient(180deg, transparent, #7a5a14, #c4941c, #7a5a14, transparent)' }} />
      ))}
      <div style={{ textAlign: 'center', fontFamily: 'Pirata One, cursive', fontSize: 9, letterSpacing: '.35em', color: '#7a5a14', marginBottom: 3 }}>— AVIS DE RECHERCHE —</div>
      <div style={{ textAlign: 'center', fontFamily: 'Pirata One, cursive', fontSize: 44, lineHeight: 1, color: '#c4941c', textShadow: '0 0 16px rgba(180,120,10,.5)', marginBottom: 12 }}>WANTED</div>
      <div style={{ width: 160, height: 160, margin: '0 auto 12px', border: '2px solid #7a5a14', borderRadius: 4, overflow: 'hidden', background: `${rk.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 18px rgba(0,0,0,.5)' }}>
        {member.avatar_url
          ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 70 }}>{rk.emoji}</span>}
      </div>
      <div style={{ textAlign: 'center', fontFamily: 'Pirata One, cursive', fontSize: 22, color: 'rgba(232,215,175,.95)', marginBottom: 3, textShadow: '0 2px 6px rgba(0,0,0,.8)' }}>
        {member.username || `Pirate #${String(member.uid).slice(-4)}`}
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: rk.color, letterSpacing: '.08em', marginBottom: 10 }}>{rk.emoji} {rk.rang}</div>
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #7a5a14, transparent)', margin: '0 0 10px' }} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 9, letterSpacing: '.2em', color: '#7a5a14', marginBottom: 3 }}>PRIME</div>
        <div style={{ fontFamily: 'Pirata One, cursive', fontSize: 26, color: '#c4941c', textShadow: '0 0 10px rgba(180,130,10,.5)' }}>{fmtB(prime)} ฿</div>
      </div>
      {rank && (
        <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,.65)', border: '1px solid #7a5a14', borderRadius: 3, padding: '3px 7px', fontSize: 10, fontWeight: 800, color: rk.color }}>#{rank}</div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function ProfilePage() {
  const { discordId } = useParams()
  const navigate      = useNavigate()
  const { discordId: myId } = useAuth()
  const [member,   setMember]   = useState(null)
  const [shopData, setShopData] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('stats')
  const [copied,   setCopied]   = useState(false)

  const isOwnProfile = String(myId) === String(discordId)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchMemberProfile(discordId),
      fetchBerryShopState(discordId),
    ]).then(([m, s]) => {
      setMember(m)
      setShopData(s)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [discordId])

  const h      = parseFloat(member?.vocal_h || 0)
  const rk     = getRank(h)
  const nextRk = getNextRank(rk)
  const pctRk  = nextRk ? Math.min(100, ((h - rk.min) / (nextRk.min - rk.min)) * 100) : 100

  const share = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  const TABS = [
    { key: 'stats',      label: '📊 Statistiques' },
    { key: 'inventaire', label: '🎁 Inventaire' },
    { key: 'historique', label: '📜 Historique' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#080503', color: '#e8dfc8' }}>
      <Navbar />

      {/* Hero banner gradient */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 340, pointerEvents: 'none', zIndex: 0,
        background: member
          ? `radial-gradient(ellipse 80% 60% at 50% -10%, ${rk.color}14 0%, transparent 65%)`
          : 'none',
        transition: 'background .6s ease',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '100px clamp(16px,4vw,48px) 80px' }}>

        {/* Back */}
        <button onClick={() => navigate(-1)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: 'rgba(0,0,0,.4)', border: '1px solid rgba(140,90,20,.22)', borderRadius: 4,
          padding: '8px 16px', color: 'rgba(200,170,110,.6)', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', marginBottom: 32, letterSpacing: '.04em', textTransform: 'uppercase',
          transition: 'all .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(140,90,10,.15)'; e.currentTarget.style.color = 'rgba(220,185,120,.9)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,.4)'; e.currentTarget.style.color = 'rgba(200,170,110,.6)' }}
        >← Retour</button>

        {loading && (
          <div style={{ textAlign: 'center', paddingTop: 100 }}>
            <div style={{ fontSize: 52, marginBottom: 16, animation: 'float 2s ease-in-out infinite' }}>🏴‍☠️</div>
            <p style={{ color: 'rgba(200,170,110,.55)' }}>Chargement du profil…</p>
          </div>
        )}

        {!loading && !member && (
          <div style={{ textAlign: 'center', paddingTop: 100 }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>☠️</div>
            <h2 style={{ fontFamily: 'Pirata One, cursive', fontWeight: 800, fontSize: 32, color: 'rgba(232,215,175,.9)', marginBottom: 12 }}>Pirate introuvable</h2>
            <p style={{ color: 'rgba(200,170,110,.5)', marginBottom: 28 }}>Ce membre n'est pas dans le classement.</p>
            <button onClick={() => navigate('/')} style={{ padding: '11px 24px', background: 'rgba(120,80,10,.25)', border: '1px solid rgba(180,120,30,.4)', borderRadius: 4, color: '#c4941c', fontWeight: 800, fontSize: 13, cursor: 'pointer', letterSpacing: '.06em', textTransform: 'uppercase' }}>Retour à l'accueil</button>
          </div>
        )}

        {!loading && member && (
          <>
            {/* ── Top section ── */}
            <div style={{ display: 'flex', gap: 36, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 40 }}>

              {/* Wanted poster */}
              <WantedPoster member={member} rank={member.rank} rk={rk} />

              {/* Identity + quick info */}
              <div style={{ flex: 1, minWidth: 280 }}>

                {/* Name + rank */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.18em', color: rk.color, textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {rk.emoji} {rk.rang}
                    {isOwnProfile && (
                      <span style={{ background: 'rgba(88,101,242,.12)', border: '1px solid rgba(88,101,242,.3)', color: '#7c8aff', borderRadius: 3, padding: '1px 8px', fontSize: 9, fontWeight: 900, letterSpacing: '.1em' }}>MON PROFIL</span>
                    )}
                  </div>
                  <h1 style={{ fontFamily: 'Pirata One, cursive', fontSize: 'clamp(28px,4.5vw,52px)', color: 'rgba(232,215,175,.95)', lineHeight: 1, marginBottom: 10, textShadow: '0 2px 20px rgba(0,0,0,.8)' }}>
                    {member.username || `Pirate #${String(member.uid).slice(-4)}`}
                  </h1>
                  <p style={{ fontSize: 13, color: 'rgba(180,150,100,.55)' }}>
                    Classement global : <strong style={{ color: 'rgba(220,190,130,.85)' }}>#{member.rank}</strong>
                    <span style={{ color: 'rgba(140,110,60,.5)', marginLeft: 4 }}>sur {member.total} nakamas</span>
                  </p>
                </div>

                {/* Stats rapides */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                  <StatCard icon="🎙️" label="Vocal" value={`${h}h`} color={rk.color} />
                  <StatCard icon="💰" label="Berrys" value={`${fmtB(member.berrys)} ฿`} color="#c4941c" />
                  <StatCard icon="📊" label="Rang" value={`#${member.rank}`} color="#5865f2" sub={`/ ${member.total}`} />
                </div>

                {/* Progression rang */}
                <div style={{
                  background: 'linear-gradient(145deg, rgba(20,12,4,.97) 0%, rgba(14,8,2,.99) 100%)',
                  border: '1px solid rgba(140,90,20,.22)', borderRadius: 6, padding: '18px 20px', marginBottom: 16,
                }}>
                  {nextRk ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(220,190,130,.8)' }}>Progression</span>
                        <span style={{ fontSize: 11, color: 'rgba(180,150,100,.45)' }}>{nextRk.emoji} {nextRk.rang} à {nextRk.min}h</span>
                      </div>
                      <ProgressBar value={h - rk.min} max={nextRk.min - rk.min} color={nextRk.color} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                        <span style={{ fontSize: 10, color: 'rgba(180,150,100,.4)' }}>{rk.rang} ({rk.min}h)</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: nextRk.color }}>
                          encore {Math.max(0, (nextRk.min - h)).toFixed(1)}h
                        </span>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>👑</div>
                      <div style={{ fontFamily: 'Pirata One, cursive', fontSize: 17, color: '#c4941c', marginBottom: 3 }}>Rang Maximum</div>
                      <div style={{ fontSize: 11, color: 'rgba(180,150,100,.45)' }}>Ce pirate a conquis le Grand Line.</div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={share} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    background: copied ? 'rgba(60,160,80,.1)' : 'rgba(0,0,0,.4)',
                    border: `1px solid ${copied ? 'rgba(60,160,80,.35)' : 'rgba(140,90,20,.22)'}`,
                    borderRadius: 4, padding: '10px 0',
                    color: copied ? '#5ad67a' : 'rgba(200,170,110,.6)',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '.04em',
                    transition: 'all .2s',
                  }}>
                    {copied ? '✓ Lien copié' : '🔗 Partager'}
                  </button>
                  <a href="https://discord.gg/v3Ddhtbz" target="_blank" rel="noopener noreferrer" style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    background: 'rgba(88,101,242,.12)', border: '1px solid rgba(88,101,242,.28)',
                    borderRadius: 4, padding: '10px 0',
                    color: '#7c8aff', fontSize: 12, fontWeight: 700,
                    textDecoration: 'none', letterSpacing: '.04em',
                  }}>Discord →</a>
                </div>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(140,90,20,.22)', paddingBottom: 0 }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  padding: '10px 20px', fontSize: 12, fontWeight: 800,
                  letterSpacing: '.06em', textTransform: 'uppercase',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: tab === t.key ? '#c4941c' : 'rgba(180,150,100,.42)',
                  borderBottom: `2px solid ${tab === t.key ? '#c4941c' : 'transparent'}`,
                  marginBottom: -1, transition: 'all .18s',
                }}>{t.label}</button>
              ))}
            </div>

            {/* ── Tab: Statistiques ── */}
            {tab === 'stats' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>

                <div style={{ background: 'linear-gradient(145deg, rgba(20,12,4,.97) 0%, rgba(14,8,2,.99) 100%)', border: '1px solid rgba(140,90,20,.2)', borderRadius: 6, padding: '20px' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', color: 'rgba(180,130,40,.6)', textTransform: 'uppercase', marginBottom: 16 }}>Identité</div>
                  {[
                    { label: 'Pseudo', value: member.username || '—' },
                    { label: 'Discord ID', value: member.uid, mono: true },
                    { label: 'Rang actuel', value: `${rk.emoji} ${rk.rang}` },
                    { label: 'Position', value: `#${member.rank} / ${member.total}` },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(140,90,20,.1)' }}>
                      <span style={{ fontSize: 11, color: 'rgba(180,150,100,.45)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{row.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(220,195,145,.85)', fontFamily: row.mono ? 'monospace' : undefined }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'linear-gradient(145deg, rgba(20,12,4,.97) 0%, rgba(14,8,2,.99) 100%)', border: '1px solid rgba(140,90,20,.2)', borderRadius: 6, padding: '20px' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', color: 'rgba(180,130,40,.6)', textTransform: 'uppercase', marginBottom: 16 }}>Activité vocale</div>
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontFamily: 'Pirata One, cursive', fontSize: 40, color: rk.color, lineHeight: 1, marginBottom: 4 }}>{h}h</div>
                    <div style={{ fontSize: 11, color: 'rgba(180,150,100,.45)', textTransform: 'uppercase', letterSpacing: '.1em' }}>temps vocal total</div>
                  </div>
                  {nextRk && (
                    <>
                      <ProgressBar value={h - rk.min} max={nextRk.min - rk.min} color={rk.color} />
                      <div style={{ fontSize: 11, color: 'rgba(180,150,100,.4)', marginTop: 8 }}>
                        {Math.max(0, (nextRk.min - h)).toFixed(1)}h restantes pour {nextRk.rang}
                      </div>
                    </>
                  )}
                </div>

                <div style={{ background: 'linear-gradient(145deg, rgba(20,12,4,.97) 0%, rgba(14,8,2,.99) 100%)', border: '1px solid rgba(180,130,10,.22)', borderRadius: 6, padding: '20px' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', color: 'rgba(180,130,40,.6)', textTransform: 'uppercase', marginBottom: 16 }}>Trésor</div>
                  <div style={{ fontFamily: 'Pirata One, cursive', fontSize: 40, color: '#c4941c', lineHeight: 1, marginBottom: 4 }}>
                    {shopData && !shopData.preview ? fmtNum(shopData.balance) : fmtB(member.berrys)} ฿
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(180,150,100,.45)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 16 }}>Berrys</div>
                  {shopData && (
                    <div style={{ fontSize: 12, color: 'rgba(180,150,100,.5)' }}>
                      {shopData.inventory?.length || 0} objets en inventaire ·{' '}
                      {shopData.transactions?.length || 0} achats récents
                    </div>
                  )}
                </div>

                {/* Rang history timeline */}
                <div style={{ background: 'linear-gradient(145deg, rgba(20,12,4,.97) 0%, rgba(14,8,2,.99) 100%)', border: '1px solid rgba(140,90,20,.2)', borderRadius: 6, padding: '20px', gridColumn: 'span 1' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', color: 'rgba(180,130,40,.6)', textTransform: 'uppercase', marginBottom: 16 }}>Rangs débloqués</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {RANK_MAP.slice().reverse().map(r => {
                      const unlocked = h >= r.min
                      return (
                        <div key={r.rang} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: unlocked ? 1 : 0.3 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 3, background: unlocked ? `${r.color}20` : 'rgba(255,255,255,.04)', border: `1px solid ${unlocked ? r.color + '44' : 'rgba(255,255,255,.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{r.emoji}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: unlocked ? 'rgba(220,195,145,.85)' : 'rgba(180,150,100,.3)' }}>{r.rang}</div>
                            <div style={{ fontSize: 10, color: 'rgba(180,150,100,.38)' }}>{r.min}h requis</div>
                          </div>
                          {unlocked && <span style={{ fontSize: 12, color: r.color }}>✓</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* ── Tab: Inventaire ── */}
            {tab === 'inventaire' && (
              <div>
                {(!shopData?.inventory || shopData.inventory.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: 44, marginBottom: 14 }}>📦</div>
                    <div style={{ fontSize: 15, fontFamily: 'Pirata One, cursive', color: 'rgba(232,215,175,.6)', marginBottom: 8 }}>Inventaire vide</div>
                    <div style={{ fontSize: 13, color: 'rgba(180,150,100,.38)' }}>Ce pirate n'a encore rien acheté à la boutique.</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                    {shopData.inventory.map((item, i) => <InventoryCard key={i} item={item} />)}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Historique ── */}
            {tab === 'historique' && (
              <div>
                {(!shopData?.transactions || shopData.transactions.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: 44, marginBottom: 14 }}>📜</div>
                    <div style={{ fontSize: 15, fontFamily: 'Pirata One, cursive', color: 'rgba(232,215,175,.6)', marginBottom: 8 }}>Aucune transaction</div>
                    <div style={{ fontSize: 13, color: 'rgba(180,150,100,.38)' }}>L'historique d'achats est vide.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 680 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', color: 'rgba(180,130,40,.55)', textTransform: 'uppercase', marginBottom: 8 }}>
                      {shopData.transactions.length} achats récents
                    </div>
                    {shopData.transactions.map((tx, i) => <TxRow key={i} tx={tx} />)}
                  </div>
                )}
              </div>
            )}

          </>
        )}
      </div>
    </div>
  )
}
