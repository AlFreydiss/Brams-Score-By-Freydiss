import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext.jsx'
import Navbar from '../Navbar.jsx'
import { ROLE_COLORS, ROLE_LABELS, ROLE_LEVEL } from '../../lib/crew/constants.js'
import {
  getLevelHQ, canAct,
  fetchCrewDashboard, fetchCrewApplications, fetchCrewInvites,
  fetchCrewLogs, fetchCrewAnnouncements, fetchCrewMissions, fetchCrewTreasury,
  applyToCrew, acceptApplication, rejectApplication,
  inviteMember, respondToInvite,
  promoteMember, demoteMember, removeMember,
  transferCaptain, updateCrewSettings, deleteCrew,
  createAnnouncement, contributeToTreasury, writeCrewLog,
} from '../../lib/crew/crewHQQueries.js'

// ──────────────────────────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'overview',    label: 'Vue d\'ensemble', icon: '🧭' },
  { key: 'members',     label: 'Membres',          icon: '⚔️' },
  { key: 'hierarchy',   label: 'Hiérarchie',        icon: '🏛️' },
  { key: 'recruitment', label: 'Recrutement',       icon: '📋' },
  { key: 'missions',    label: 'Missions',          icon: '🗺️' },
  { key: 'treasury',    label: 'Coffre',            icon: '💰' },
  { key: 'journal',     label: 'Journal',           icon: '📜' },
  { key: 'ranking',     label: 'Classement',        icon: '🏆' },
  { key: 'settings',    label: 'Paramètres',        icon: '⚙️' },
]

const LOG_ICONS = {
  member_joined:       { icon: '⚓', color: '#34d399' },
  member_removed:      { icon: '⛔', color: '#e0524a' },
  application:         { icon: '📋', color: '#60a5fa' },
  application_rejected:{ icon: '✕',  color: '#e0524a' },
  invite_sent:         { icon: '✉️',  color: '#a78bfa' },
  promotion:           { icon: '⬆️',  color: '#fbbf24' },
  demotion:            { icon: '⬇️',  color: '#f87171' },
  captain_transfer:    { icon: '👑',  color: '#ffd700' },
  treasury_deposit:    { icon: '💰',  color: '#34d399' },
  treasury_withdraw:   { icon: '💸',  color: '#f87171' },
  announcement:        { icon: '📢',  color: '#fbbf24' },
  settings_updated:    { icon: '⚙️',  color: '#94a3b8' },
  mission_complete:    { icon: '✅',  color: '#34d399' },
}

const ANNOUNCE_COLORS = {
  info:      { bg: 'rgba(59,130,246,.08)', border: 'rgba(59,130,246,.25)', text: '#60a5fa', label: 'Info' },
  important: { bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.28)', text: '#fbbf24', label: 'Important' },
  urgent:    { bg: 'rgba(239,68,68,.08)',  border: 'rgba(239,68,68,.28)',  text: '#f87171', label: '🚨 Urgent' },
  event:     { bg: 'rgba(168,85,247,.08)', border: 'rgba(168,85,247,.28)', text: '#c084fc', label: '🎪 Événement' },
}

const MISSION_ICONS = {
  daily:'☀️', weekly:'📅', event:'🎪', contribution:'💎',
  recruitment:'🧲', ranking:'🏆', bounty:'💰',
}

const BANNER_STYLES = {
  ocean:   'linear-gradient(135deg, #020c18 0%, #041428 40%, #061e38 100%)',
  forest:  'linear-gradient(135deg, #030e06 0%, #061a0a 40%, #0a2810 100%)',
  volcano: 'linear-gradient(135deg, #180302 0%, #2a0505 40%, #3c0808 100%)',
  desert:  'linear-gradient(135deg, #18100a 0%, #2a1a08 40%, #3c2510 100%)',
  night:   'linear-gradient(135deg, #08050f 0%, #120a1e 40%, #1a0f2a 100%)',
}

// ──────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────
function fmtB(n) {
  if (!n) return '0'
  n = parseInt(n)
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}Md`
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}
function fmtNum(n) { return new Intl.NumberFormat('fr-FR').format(n || 0) }
function timeAgo(iso) {
  if (!iso) return '—'
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}
function crewLevel(xp = 0) {
  if (xp >= 100000) return 10
  return Math.floor(xp / 10000) + 1
}

// ──────────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ──────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 40, radius = 6, color = '#d4a017' }) {
  const initials = (name || '?').slice(0, 2).toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', border: `1px solid ${color}44`, flexShrink: 0, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 800, color }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </div>
  )
}

function RoleBadge({ role, small }) {
  const color = ROLE_COLORS[role] || '#6b7280'
  const label = ROLE_LABELS[role] || role
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: small ? '2px 6px' : '3px 8px', background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 3, fontSize: small ? 9 : 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color, whiteSpace: 'nowrap' }}>
      {role === 'capitaine' && '👑 '}{label}
    </span>
  )
}

function ProgressBar({ value, max, color = '#d4a017', height = 6 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ height, background: 'rgba(255,255,255,.06)', borderRadius: height, overflow: 'hidden' }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: [.22,1,.36,1] }}
        style={{ height: '100%', background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: height, boxShadow: `0 0 8px ${color}55` }} />
    </div>
  )
}

function Pill({ children, color = 'rgba(255,255,255,.12)', textColor = 'rgba(255,255,255,.6)', border = 'rgba(255,255,255,.1)' }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: color, border: `1px solid ${border}`, borderRadius: 100, fontSize: 11, fontWeight: 700, color: textColor, whiteSpace: 'nowrap' }}>{children}</span>
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(180,130,30,.4), transparent)' }} />
        <h3 style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(180,130,40,.7)', whiteSpace: 'nowrap', margin: 0 }}>{children}</h3>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(180,130,30,.4))' }} />
      </div>
      {sub && <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(180,150,100,.4)', marginTop: 6 }}>{sub}</p>}
    </div>
  )
}

function EmptyState({ icon, title, sub, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontFamily: 'Pirata One, cursive', fontSize: 20, color: 'rgba(232,215,175,.6)', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'rgba(180,150,100,.38)', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>{sub}</div>
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  )
}

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t) }, [onDone])
  const bg = type === 'ok' ? 'rgba(52,211,153,.12)' : 'rgba(224,82,74,.1)'
  const border = type === 'ok' ? 'rgba(52,211,153,.3)' : 'rgba(224,82,74,.3)'
  const color = type === 'ok' ? '#34d399' : '#f87171'
  return (
    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 9999, padding: '12px 20px', borderRadius: 6, background: bg, border: `1px solid ${border}`, color, fontSize: 14, fontWeight: 700, maxWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
      {msg}
    </motion.div>
  )
}

// ──────────────────────────────────────────────────────────────────
// FLAG ANIMATION
// ──────────────────────────────────────────────────────────────────
function PavilionFlag({ emoji = '🏴‍☠️', color = '#d4a017', small }) {
  const size = small ? 40 : 72
  return (
    <div style={{ position: 'relative', width: small ? 48 : 80, height: small ? 44 : 64, flexShrink: 0 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, ${color}88, ${color}44)`, borderRadius: 2 }} />
      <motion.div
        animate={{ rotateY: [0, 8, -4, 8, 0], skewY: [0, 1, -0.5, 1, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', left: 6, top: 4, right: 0, bottom: 4, background: `linear-gradient(135deg, ${color}20, ${color}0a)`, border: `1px solid ${color}30`, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.55, transformOrigin: 'left center', boxShadow: `2px 0 12px ${color}14` }}
      >
        {emoji}
      </motion.div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// MEMBER CARD (compact wanted style)
// ──────────────────────────────────────────────────────────────────
function MemberCard({ member, isCaptain: isCrewCaptain, myLevel, onAction, cc }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const role = member.position || 'mousse'
  const rc = ROLE_COLORS[role] || '#6b7280'
  const targetLevel = getLevelHQ(role)
  const canManage = myLevel <= 1 && targetLevel > myLevel

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ position: 'relative', background: 'linear-gradient(145deg, rgba(18,10,3,.98) 0%, rgba(12,7,2,1) 100%)', border: `1px solid ${rc}22`, borderTop: `1px solid ${rc}33`, borderRadius: 6, padding: '16px', overflow: 'hidden', cursor: 'pointer' }}
      whileHover={{ y: -2, transition: { duration: .15 } }}
    >
      {/* Role stripe top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${rc}cc, ${rc}44, transparent)` }} />
      {member.is_elite && <div style={{ position: 'absolute', top: 6, right: 6, fontSize: 12 }} title="Membre d'élite">⭐</div>}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <Avatar src={member.avatar_url} name={member.username} size={44} color={rc} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(232,215,175,.93)', fontFamily: 'Pirata One, cursive', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {member.username || `Pirate #${String(member.user_id).slice(-4)}`}
          </div>
          <div style={{ marginTop: 3 }}><RoleBadge role={role} small /></div>
        </div>
        {canManage && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
              style={{ width: 28, height: 28, background: 'rgba(0,0,0,.4)', border: '1px solid rgba(180,130,30,.2)', borderRadius: 4, color: 'rgba(180,150,100,.5)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ···
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div initial={{ opacity: 0, scale: .9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ position: 'absolute', right: 0, top: 34, zIndex: 100, background: 'linear-gradient(145deg, #1a1008, #120a04)', border: '1px solid rgba(180,130,30,.3)', borderRadius: 6, minWidth: 170, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,.7)' }}>
                  {[
                    myLevel === 0 && targetLevel > 1 && { label: '⬆ Promouvoir Officier', action: 'promote_officer', color: '#fbbf24' },
                    myLevel <= 1 && targetLevel >= 2 && { label: '⬆ Promouvoir Membre', action: 'promote_member', color: '#34d399' },
                    myLevel <= 1 && targetLevel === 1 && { label: '⬇ Rétrograder', action: 'demote', color: '#f87171' },
                    myLevel === 0 && targetLevel > 0 && { label: '👑 Transférer Capitaine', action: 'transfer', color: '#ffd700' },
                    { label: '⛔ Exclure', action: 'remove', color: '#e0524a' },
                  ].filter(Boolean).map(item => (
                    <button key={item.action}
                      onClick={() => { setMenuOpen(false); onAction(item.action, member) }}
                      style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: item.color, fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left', letterSpacing: '.02em' }}
                      onMouseEnter={e => e.currentTarget.style.background = `${item.color}12`}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >{item.label}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ background: 'rgba(0,0,0,.3)', borderRadius: 4, padding: '8px 10px' }}>
          <div style={{ fontSize: 8.5, color: 'rgba(180,150,100,.4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 3 }}>Prime</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: cc, fontFamily: 'Pirata One, cursive' }}>{fmtB(member.berrys)} ฿</div>
        </div>
        <div style={{ background: 'rgba(0,0,0,.3)', borderRadius: 4, padding: '8px 10px' }}>
          <div style={{ fontSize: 8.5, color: 'rgba(180,150,100,.4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 3 }}>Contribution</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: 'rgba(52,211,153,.8)', fontFamily: 'Pirata One, cursive' }}>{fmtB(member.contribution || 0)} ฿</div>
        </div>
      </div>

      {member.joined_at && (
        <div style={{ fontSize: 10, color: 'rgba(180,150,100,.3)', marginTop: 10, textAlign: 'right' }}>
          Depuis {new Date(member.joined_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      )}
    </motion.div>
  )
}

// ──────────────────────────────────────────────────────────────────
// TABS
// ──────────────────────────────────────────────────────────────────

/* ── OVERVIEW ── */
function OverviewTab({ crew, members, logs, announcements, missions, cc }) {
  const totalBounty = members.reduce((s, m) => s + parseInt(m.berrys || 0), 0)
  const activeMembers = members.filter(m => m.status !== 'inactive').length
  const topContrib = [...members].sort((a, b) => (b.contribution || 0) - (a.contribution || 0)).slice(0, 5)
  const pinnedAnn = announcements.find(a => a.pinned) || announcements[0]
  const activeMissions = missions.filter(m => m.status === 'active')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {[
          { icon: '💰', label: 'Prime totale', value: fmtB(totalBounty) + ' ฿', color: cc },
          { icon: '⚔️', label: 'Membres', value: activeMembers, color: '#60a5fa' },
          { icon: '⭐', label: 'Niveau', value: `Niv. ${crew.level || 1}`, color: '#fbbf24' },
          { icon: '🏆', label: 'Victoires', value: crew.wins || 0, color: '#34d399' },
          { icon: '💎', label: 'Réputation', value: `${crew.reputation || 0} pts`, color: '#c084fc' },
          { icon: '💰', label: 'Coffre', value: fmtB(crew.treasury_balance || 0) + ' ฿', color: '#f97316' },
        ].map(s => (
          <div key={s.label} style={{ background: 'linear-gradient(145deg, rgba(18,10,3,.98) 0%, rgba(12,7,2,1) 100%)', border: `1px solid ${s.color}1a`, borderTop: `1px solid ${s.color}28`, borderRadius: 6, padding: '16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 70, height: 70, borderRadius: '50%', background: `radial-gradient(circle, ${s.color}12, transparent)`, pointerEvents: 'none' }} />
            <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.color, fontFamily: 'Pirata One, cursive', lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 9.5, color: 'rgba(180,150,100,.45)', textTransform: 'uppercase', letterSpacing: '.1em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* XP progress */}
      <div style={{ background: 'linear-gradient(145deg, rgba(18,10,3,.98) 0%, rgba(12,7,2,1) 100%)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 6, padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(220,190,130,.8)', letterSpacing: '.06em' }}>PROGRESSION — NIVEAU {crew.level || 1}</span>
          <span style={{ fontSize: 11, color: 'rgba(180,150,100,.45)' }}>{fmtNum(crew.xp || 0)} / {fmtNum((crew.level || 1) * 10000)} XP</span>
        </div>
        <ProgressBar value={crew.xp || 0} max={(crew.level || 1) * 10000} color={cc} height={8} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Pinned announcement */}
        <div style={{ background: 'linear-gradient(145deg, rgba(18,10,3,.98) 0%, rgba(12,7,2,1) 100%)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 6, padding: '18px', minHeight: 160 }}>
          <SectionTitle>Conseil du Capitaine</SectionTitle>
          {pinnedAnn ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ ...ANNOUNCE_COLORS[pinnedAnn.priority], fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 3, background: ANNOUNCE_COLORS[pinnedAnn.priority]?.bg, border: `1px solid ${ANNOUNCE_COLORS[pinnedAnn.priority]?.border}`, color: ANNOUNCE_COLORS[pinnedAnn.priority]?.text }}>{ANNOUNCE_COLORS[pinnedAnn.priority]?.label}</span>
                {pinnedAnn.pinned && <span style={{ fontSize: 11 }}>📌</span>}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'rgba(232,215,175,.9)', fontFamily: 'Pirata One, cursive', marginBottom: 8 }}>{pinnedAnn.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(200,175,130,.55)', lineHeight: 1.6 }}>{pinnedAnn.content}</div>
              <div style={{ fontSize: 10, color: 'rgba(180,150,100,.35)', marginTop: 12 }}>— {pinnedAnn.author_name} · {timeAgo(pinnedAnn.created_at)}</div>
            </div>
          ) : (
            <EmptyState icon="📜" title="Aucune annonce" sub="Le capitaine n'a pas encore posté de message." />
          )}
        </div>

        {/* Top contributors */}
        <div style={{ background: 'linear-gradient(145deg, rgba(18,10,3,.98) 0%, rgba(12,7,2,1) 100%)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 6, padding: '18px' }}>
          <SectionTitle>Top Contributeurs</SectionTitle>
          {topContrib.length === 0 ? (
            <EmptyState icon="💎" title="Aucun contributeur" sub="Aucune contribution enregistrée." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topContrib.map((m, i) => (
                <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? '#ffd70020' : i === 1 ? '#c0c0c020' : i === 2 ? '#cd7f3220' : 'rgba(255,255,255,.04)', border: `1px solid ${i === 0 ? '#ffd70040' : i === 1 ? '#c0c0c040' : i === 2 ? '#cd7f3240' : 'rgba(255,255,255,.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,.4)', flexShrink: 0 }}>
                    {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}
                  </div>
                  <Avatar src={m.avatar_url} name={m.username} size={30} color={ROLE_COLORS[m.position] || '#6b7280'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(220,195,145,.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.username || `Pirate #${String(m.user_id).slice(-4)}`}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: cc, fontFamily: 'Pirata One, cursive', flexShrink: 0 }}>{fmtB(m.contribution || 0)} ฿</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active missions */}
      {activeMissions.length > 0 && (
        <div style={{ background: 'linear-gradient(145deg, rgba(18,10,3,.98) 0%, rgba(12,7,2,1) 100%)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 6, padding: '18px' }}>
          <SectionTitle>Missions Actives</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {activeMissions.slice(0, 4).map(m => (
              <div key={m.id} style={{ background: 'rgba(0,0,0,.3)', border: '1px solid rgba(180,130,30,.14)', borderRadius: 4, padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{MISSION_ICONS[m.type] || '🗺️'}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'rgba(232,215,175,.85)', fontFamily: 'Pirata One, cursive', flex: 1, lineHeight: 1.2 }}>{m.title}</span>
                </div>
                <ProgressBar value={m.progress} max={m.target} color={cc} height={5} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: 'rgba(180,150,100,.4)' }}>{m.progress}/{m.target}</span>
                  {m.reward_description && <span style={{ fontSize: 10, color: cc }}>🎁 {m.reward_description}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent journal */}
      {logs.length > 0 && (
        <div style={{ background: 'linear-gradient(145deg, rgba(18,10,3,.98) 0%, rgba(12,7,2,1) 100%)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 6, padding: '18px' }}>
          <SectionTitle>Activité Récente</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {logs.slice(0, 5).map(log => {
              const li = LOG_ICONS[log.type] || { icon: '•', color: 'rgba(180,150,100,.5)' }
              return (
                <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', background: 'rgba(0,0,0,.25)', borderRadius: 4, border: '1px solid rgba(180,130,30,.08)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${li.color}14`, border: `1px solid ${li.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{li.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'rgba(220,195,145,.78)', lineHeight: 1.4 }}>{log.description}</div>
                    <div style={{ fontSize: 10, color: 'rgba(180,150,100,.38)', marginTop: 2 }}>{timeAgo(log.created_at)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── MEMBERS ── */
function MembersTab({ crew, members, myLevel, isCaptain, onAction, cc }) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [sort, setSort] = useState('bounty')

  const filtered = useMemo(() => {
    let list = [...members]
    if (search) list = list.filter(m => (m.username || '').toLowerCase().includes(search.toLowerCase()))
    if (roleFilter !== 'all') list = list.filter(m => m.position === roleFilter)
    if (sort === 'bounty') list.sort((a, b) => (b.berrys || 0) - (a.berrys || 0))
    if (sort === 'contribution') list.sort((a, b) => (b.contribution || 0) - (a.contribution || 0))
    if (sort === 'role') list.sort((a, b) => getLevelHQ(a.position) - getLevelHQ(b.position))
    if (sort === 'joined') list.sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at))
    return list
  }, [members, search, roleFilter, sort])

  const uniqueRoles = [...new Set(members.map(m => m.position).filter(Boolean))]

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher un pirate..."
          style={{ flex: 1, minWidth: 180, padding: '9px 14px', background: 'rgba(0,0,0,.45)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 4, color: 'rgba(220,195,145,.85)', fontSize: 12, outline: 'none' }} />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          style={{ padding: '9px 14px', background: 'rgba(0,0,0,.45)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 4, color: 'rgba(220,195,145,.7)', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
          <option value="all">Tous les rôles</option>
          {uniqueRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)}
          style={{ padding: '9px 14px', background: 'rgba(0,0,0,.45)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 4, color: 'rgba(220,195,145,.7)', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
          <option value="bounty">Trier par prime</option>
          <option value="contribution">Trier par contribution</option>
          <option value="role">Trier par rôle</option>
          <option value="joined">Trier par ancienneté</option>
        </select>
        <div style={{ fontSize: 11, color: 'rgba(180,150,100,.45)', whiteSpace: 'nowrap' }}>{filtered.length} pirate{filtered.length !== 1 ? 's' : ''}</div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🏴‍☠️" title="Aucun membre trouvé" sub="Modifiez vos filtres ou recrutez de nouveaux nakamas." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14 }}>
          {filtered.map(m => (
            <MemberCard key={m.user_id} member={m} myLevel={myLevel} isCaptain={isCaptain} onAction={onAction} cc={cc} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── HIERARCHY ── */
function HierarchyTab({ crew, members, cc }) {
  const byLevel = useMemo(() => {
    const groups = { 0: [], 1: [], 2: [], 3: [] }
    for (const m of members) {
      const lvl = getLevelHQ(m.position)
      if (groups[lvl]) groups[lvl].push(m)
      else groups[3].push(m)
    }
    return groups
  }, [members])

  const LEVEL_LABELS = ['Capitaine', 'Officiers', 'Membres', 'Mousses']
  const LEVEL_COLORS = [cc, '#fbbf24', '#60a5fa', '#94a3b8']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '20px 0' }}>
      {[0, 1, 2, 3].map(level => {
        const group = byLevel[level] || []
        if (group.length === 0) return null
        const lc = LEVEL_COLORS[level]
        return (
          <div key={level} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Connector line */}
            {level > 0 && <div style={{ width: 2, height: 28, background: `linear-gradient(180deg, ${LEVEL_COLORS[level-1]}60, ${lc}60)` }} />}

            {/* Level group */}
            <div style={{ width: '100%', maxWidth: level === 0 ? 260 : level === 1 ? 700 : '100%', background: 'linear-gradient(145deg, rgba(18,10,3,.98) 0%, rgba(12,7,2,1) 100%)', border: `1px solid ${lc}22`, borderTop: `2px solid ${lc}55`, borderRadius: 8, padding: '16px 20px' }}>
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: '.16em', textTransform: 'uppercase', color: lc, background: `${lc}14`, border: `1px solid ${lc}30`, borderRadius: 3, padding: '3px 10px' }}>
                  {LEVEL_LABELS[level]} · {group.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                {group.map(m => (
                  <div key={m.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'rgba(0,0,0,.3)', border: `1px solid ${lc}18`, borderRadius: 6, minWidth: level === 0 ? 160 : 120 }}>
                    <Avatar src={m.avatar_url} name={m.username} size={level === 0 ? 52 : 38} color={lc} />
                    <div style={{ fontSize: level === 0 ? 14 : 12, fontWeight: 800, color: 'rgba(232,215,175,.9)', fontFamily: 'Pirata One, cursive', textAlign: 'center', lineHeight: 1.2 }}>
                      {m.username || `Pirate #${String(m.user_id).slice(-4)}`}
                    </div>
                    <RoleBadge role={m.position} small />
                    <div style={{ fontSize: 11, color: lc, fontFamily: 'Pirata One, cursive' }}>{fmtB(m.berrys || 0)} ฿</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}

      {members.length === 0 && <EmptyState icon="🏛️" title="Hiérarchie vide" sub="Aucun membre dans cet équipage pour l'instant." />}
    </div>
  )
}

/* ── RECRUITMENT ── */
function RecruitmentTab({ crew, applications, invites, myLevel, isAuthenticated, discordId, displayName, avatarUrl, crewId, onRefresh, cc }) {
  const canManage = myLevel <= 1
  const [tab, setTab] = useState(canManage ? 'applications' : 'apply')
  const [form, setForm] = useState({ message: '', availability: '', specialty: '', previousCrew: '', acceptsRules: false })
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null)
  const [inviteId, setInviteId] = useState('')
  const [inviteName, setInviteName] = useState('')

  const pending = applications.filter(a => a.status === 'pending')
  const reviewed = applications.filter(a => a.status !== 'pending')

  async function handleApply() {
    if (!isAuthenticated) return setNotice({ msg: 'Connecte-toi pour candidater.', type: 'err' })
    if (!form.message.trim()) return setNotice({ msg: 'Écris un message de motivation.', type: 'err' })
    if (!form.acceptsRules) return setNotice({ msg: 'Tu dois accepter le règlement.', type: 'err' })
    setBusy('apply')
    const { error } = await applyToCrew({ crewId, userId: discordId, username: displayName, avatarUrl, ...form })
    setBusy(null)
    if (error) setNotice({ msg: error.message, type: 'err' })
    else { setNotice({ msg: '✓ Candidature envoyée !', type: 'ok' }); setForm({ message: '', availability: '', specialty: '', previousCrew: '', acceptsRules: false }); onRefresh() }
  }

  async function handleAccept(app) {
    setBusy(app.id)
    const { error } = await acceptApplication({ applicationId: app.id, crewId, applicantId: app.user_id, applicantName: app.username, reviewerId: discordId, reviewerName: displayName })
    setBusy(null)
    if (error) setNotice({ msg: error.message, type: 'err' })
    else { setNotice({ msg: `✓ ${app.username} a rejoint l'équipage !`, type: 'ok' }); onRefresh() }
  }

  async function handleReject(app) {
    setBusy(app.id + 'r')
    const { error } = await rejectApplication({ applicationId: app.id, crewId, applicantName: app.username, reviewerId: discordId, reviewerName: displayName, note: '' })
    setBusy(null)
    if (error) setNotice({ msg: error.message, type: 'err' })
    else { setNotice({ msg: `Candidature de ${app.username} refusée.`, type: 'ok' }); onRefresh() }
  }

  async function handleInvite() {
    if (!inviteId.trim()) return setNotice({ msg: 'Saisis un Discord ID.', type: 'err' })
    setBusy('invite')
    const { error } = await inviteMember({ crewId, invitedUserId: inviteId.trim(), invitedName: inviteName || inviteId, invitedById: discordId, invitedByName: displayName })
    setBusy(null)
    if (error) setNotice({ msg: error.message, type: 'err' })
    else { setNotice({ msg: '✓ Invitation envoyée !', type: 'ok' }); setInviteId(''); setInviteName(''); onRefresh() }
  }

  const subTabs = [
    canManage && { key: 'applications', label: `Candidatures (${pending.length})` },
    canManage && { key: 'invitations', label: `Invitations (${invites.length})` },
    isAuthenticated && !canManage && { key: 'apply', label: 'Candidater' },
  ].filter(Boolean)

  return (
    <div>
      {notice && <div style={{ marginBottom: 14, padding: '10px 14px', background: notice.type === 'ok' ? 'rgba(52,211,153,.1)' : 'rgba(224,82,74,.1)', border: `1px solid ${notice.type === 'ok' ? 'rgba(52,211,153,.3)' : 'rgba(224,82,74,.3)'}`, borderRadius: 4, fontSize: 13, fontWeight: 600, color: notice.type === 'ok' ? '#34d399' : '#f87171' }}>{notice.msg}</div>}

      {/* Recrutement status banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: crew.is_recruiting ? 'rgba(52,211,153,.06)' : 'rgba(224,82,74,.06)', border: `1px solid ${crew.is_recruiting ? 'rgba(52,211,153,.22)' : 'rgba(224,82,74,.22)'}`, borderRadius: 6, marginBottom: 20 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: crew.is_recruiting ? '#34d399' : '#e0524a', boxShadow: `0 0 8px ${crew.is_recruiting ? '#34d399' : '#e0524a'}` }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: crew.is_recruiting ? '#34d399' : '#f87171' }}>Recrutement {crew.is_recruiting ? 'ouvert' : 'fermé'}</div>
          {crew.recruitment_message && <div style={{ fontSize: 12, color: 'rgba(200,175,130,.55)', marginTop: 2 }}>{crew.recruitment_message}</div>}
        </div>
      </div>

      {subTabs.length > 1 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(180,130,30,.18)', paddingBottom: 0 }}>
          {subTabs.map(st => (
            <button key={st.key} onClick={() => setTab(st.key)} style={{ padding: '9px 16px', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', color: tab === st.key ? cc : 'rgba(180,150,100,.42)', borderBottom: `2px solid ${tab === st.key ? cc : 'transparent'}`, marginBottom: -1, transition: 'color .18s' }}>{st.label}</button>
          ))}
        </div>
      )}

      {/* Applications list */}
      {tab === 'applications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pending.length === 0 ? (
            <EmptyState icon="📋" title="Aucune candidature en attente" sub="Aucun pirate n'a encore demandé à monter à bord." />
          ) : pending.map(app => (
            <div key={app.id} style={{ background: 'linear-gradient(145deg, rgba(18,10,3,.98) 0%, rgba(12,7,2,1) 100%)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 6, padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <Avatar src={app.avatar_url} name={app.username} size={42} color={cc} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'rgba(232,215,175,.9)', fontFamily: 'Pirata One, cursive' }}>{app.username || app.user_id}</div>
                  {app.specialty && <div style={{ fontSize: 11, color: 'rgba(180,150,100,.5)', marginTop: 2 }}>Spécialité : {app.specialty}</div>}
                  {app.availability && <div style={{ fontSize: 11, color: 'rgba(180,150,100,.5)' }}>Disponibilité : {app.availability}</div>}
                  <div style={{ fontSize: 10, color: 'rgba(180,150,100,.35)', marginTop: 4 }}>{timeAgo(app.created_at)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button disabled={busy === app.id} onClick={() => handleAccept(app)} style={{ padding: '7px 14px', background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.3)', borderRadius: 4, color: '#34d399', fontSize: 11, fontWeight: 800, cursor: 'pointer', opacity: busy === app.id ? .4 : 1 }}>✓ Accepter</button>
                  <button disabled={busy === app.id + 'r'} onClick={() => handleReject(app)} style={{ padding: '7px 14px', background: 'rgba(224,82,74,.08)', border: '1px solid rgba(224,82,74,.25)', borderRadius: 4, color: '#f87171', fontSize: 11, fontWeight: 800, cursor: 'pointer', opacity: busy === app.id + 'r' ? .4 : 1 }}>✕ Refuser</button>
                </div>
              </div>
              {app.message && <div style={{ fontSize: 13, color: 'rgba(200,175,130,.6)', background: 'rgba(0,0,0,.25)', border: '1px solid rgba(180,130,30,.12)', borderRadius: 4, padding: '10px 12px', lineHeight: 1.6, fontStyle: 'italic' }}>"{app.message}"</div>}
            </div>
          ))}
          {reviewed.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(180,150,100,.38)', textAlign: 'center' }}>{reviewed.length} candidature{reviewed.length > 1 ? 's' : ''} traitée{reviewed.length > 1 ? 's' : ''}</div>
          )}
        </div>
      )}

      {/* Invitations */}
      {tab === 'invitations' && (
        <div>
          <div style={{ background: 'linear-gradient(145deg, rgba(18,10,3,.98) 0%, rgba(12,7,2,1) 100%)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 6, padding: '18px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(200,180,120,.7)', marginBottom: 14, letterSpacing: '.06em' }}>ENVOYER UNE INVITATION</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input value={inviteId} onChange={e => setInviteId(e.target.value)} placeholder="Discord ID (ex: 1094070545248694342)"
                style={{ flex: 1, minWidth: 200, padding: '9px 12px', background: 'rgba(0,0,0,.4)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 4, color: 'rgba(220,195,145,.85)', fontSize: 12, outline: 'none' }} />
              <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Pseudo (optionnel)"
                style={{ width: 160, padding: '9px 12px', background: 'rgba(0,0,0,.4)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 4, color: 'rgba(220,195,145,.85)', fontSize: 12, outline: 'none' }} />
              <button disabled={busy === 'invite'} onClick={handleInvite} style={{ padding: '9px 18px', background: `rgba(180,130,20,.18)`, border: `1px solid ${cc}44`, borderRadius: 4, color: cc, fontSize: 12, fontWeight: 800, cursor: 'pointer', letterSpacing: '.04em', opacity: busy === 'invite' ? .5 : 1 }}>✉ Inviter</button>
            </div>
          </div>
          {invites.length === 0 ? (
            <EmptyState icon="✉️" title="Aucune invitation en attente" sub="Les invitations envoyées apparaîtront ici." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {invites.map(inv => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(180,130,30,.12)', borderRadius: 4 }}>
                  <span style={{ fontSize: 18 }}>✉️</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(220,195,145,.8)' }}>{inv.invited_name || inv.invited_user_id}</div>
                    <div style={{ fontSize: 10, color: 'rgba(180,150,100,.38)' }}>Expire {timeAgo(inv.expires_at)}</div>
                  </div>
                  <Pill color="rgba(245,158,11,.1)" textColor="#fbbf24" border="rgba(245,158,11,.25)">En attente</Pill>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Apply form */}
      {tab === 'apply' && isAuthenticated && (
        <div style={{ background: 'linear-gradient(145deg, rgba(18,10,3,.98) 0%, rgba(12,7,2,1) 100%)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 6, padding: '24px', maxWidth: 580 }}>
          <div style={{ fontFamily: 'Pirata One, cursive', fontSize: 20, color: 'rgba(232,215,175,.9)', marginBottom: 6 }}>Rejoindre l'Équipage</div>
          <div style={{ fontSize: 13, color: 'rgba(180,150,100,.5)', marginBottom: 20, lineHeight: 1.6 }}>Remplis ce formulaire. Le capitaine examinera ta candidature.</div>
          {[
            { label: 'Pourquoi tu veux rejoindre cet équipage ?', key: 'message', rows: 4, required: true },
            { label: 'Ta disponibilité (heures / jours)', key: 'availability', rows: 2 },
            { label: 'Ta spécialité / rôle souhaité', key: 'specialty', rows: 1 },
            { label: 'Ancien équipage (si applicable)', key: 'previousCrew', rows: 1 },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(200,175,130,.6)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>{f.label}{f.required && ' *'}</label>
              <textarea rows={f.rows} value={form[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,.45)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 4, color: 'rgba(220,195,145,.9)', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 20 }}>
            <input type="checkbox" checked={form.acceptsRules} onChange={e => setForm(v => ({ ...v, acceptsRules: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
            <span style={{ fontSize: 12, color: 'rgba(200,175,130,.7)' }}>J'accepte le règlement de l'équipage</span>
          </label>
          <button disabled={busy === 'apply'} onClick={handleApply}
            style={{ width: '100%', padding: '13px', background: `linear-gradient(135deg, rgba(180,130,20,.25), rgba(140,90,10,.18))`, border: `1px solid ${cc}44`, borderRadius: 4, color: cc, fontSize: 13, fontWeight: 800, cursor: 'pointer', letterSpacing: '.06em', textTransform: 'uppercase', opacity: busy === 'apply' ? .5 : 1 }}>
            {busy === 'apply' ? '...' : '🏴‍☠️ Envoyer ma candidature'}
          </button>
        </div>
      )}

      {!isAuthenticated && tab !== 'applications' && tab !== 'invitations' && (
        <EmptyState icon="🔒" title="Connexion requise" sub="Connecte-toi avec Discord pour candidater." />
      )}
    </div>
  )
}

/* ── MISSIONS ── */
function MissionsTab({ missions, cc }) {
  const active = missions.filter(m => m.status === 'active')
  const completed = missions.filter(m => m.status === 'completed')

  return (
    <div>
      <SectionTitle sub={`${active.length} mission${active.length !== 1 ? 's' : ''} en cours`}>Missions Actives</SectionTitle>
      {active.length === 0 ? (
        <EmptyState icon="🗺️" title="Aucune mission active" sub="Les missions d'équipage apparaîtront ici." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
          {active.map(m => {
            const pct = m.target > 0 ? Math.min(100, (m.progress / m.target) * 100) : 0
            return (
              <div key={m.id} style={{ background: 'linear-gradient(145deg, rgba(18,10,3,.98) 0%, rgba(12,7,2,1) 100%)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 6, padding: '20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${cc}cc, ${cc}44, transparent)` }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: 28, lineHeight: 1 }}>{MISSION_ICONS[m.type] || '🗺️'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'rgba(232,215,175,.9)', fontFamily: 'Pirata One, cursive', lineHeight: 1.2, marginBottom: 4 }}>{m.title}</div>
                    <div style={{ fontSize: 11, color: 'rgba(180,150,100,.5)' }}>{m.description}</div>
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: 'rgba(180,150,100,.5)' }}>Progression</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: cc }}>{m.progress} / {m.target}</span>
                  </div>
                  <ProgressBar value={m.progress} max={m.target} color={cc} height={7} />
                </div>
                {m.reward_description && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: `${cc}0a`, border: `1px solid ${cc}20`, borderRadius: 4 }}>
                    <span style={{ fontSize: 14 }}>🎁</span>
                    <span style={{ fontSize: 12, color: cc }}>{m.reward_description}</span>
                  </div>
                )}
                {m.deadline && (
                  <div style={{ fontSize: 10, color: 'rgba(180,150,100,.35)', marginTop: 10, textAlign: 'right' }}>Expire {timeAgo(m.deadline)}</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {completed.length > 0 && (
        <>
          <SectionTitle sub={`${completed.length} mission${completed.length !== 1 ? 's' : ''} terminée${completed.length !== 1 ? 's' : ''}`}>Missions Terminées</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {completed.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(52,211,153,.04)', border: '1px solid rgba(52,211,153,.18)', borderRadius: 4 }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(220,195,145,.7)', flex: 1 }}>{m.title}</span>
                {m.reward_description && <span style={{ fontSize: 11, color: '#34d399' }}>🎁 {m.reward_description}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ── TREASURY ── */
function TreasuryTab({ crew, txHistory, members, myLevel, discordId, displayName, crewId, onRefresh, cc }) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const topContrib = [...members].sort((a, b) => (b.contribution || 0) - (a.contribution || 0)).slice(0, 5)

  async function handleContrib() {
    const n = parseInt(amount)
    if (!n || n <= 0) return setNotice({ msg: 'Montant invalide.', type: 'err' })
    setBusy(true)
    const { error } = await contributeToTreasury({ crewId, userId: discordId, username: displayName, amount: n, reason })
    setBusy(false)
    if (error) setNotice({ msg: error.message, type: 'err' })
    else { setNotice({ msg: `✓ ${fmtNum(n)} ฿ ajoutés au coffre !`, type: 'ok' }); setAmount(''); setReason(''); onRefresh() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {notice && <div style={{ padding: '10px 14px', background: notice.type === 'ok' ? 'rgba(52,211,153,.1)' : 'rgba(224,82,74,.1)', border: `1px solid ${notice.type === 'ok' ? 'rgba(52,211,153,.3)' : 'rgba(224,82,74,.3)'}`, borderRadius: 4, fontSize: 13, fontWeight: 600, color: notice.type === 'ok' ? '#34d399' : '#f87171' }}>{notice.msg}</div>}

      {/* Balance */}
      <div style={{ background: 'linear-gradient(145deg, rgba(18,10,3,.98) 0%, rgba(12,7,2,1) 100%)', border: `1px solid ${cc}22`, borderTop: `2px solid ${cc}44`, borderRadius: 6, padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(180,130,40,.6)', marginBottom: 12 }}>Solde du Coffre</div>
        <div style={{ fontFamily: 'Pirata One, cursive', fontSize: 48, color: cc, lineHeight: 1, textShadow: `0 0 24px ${cc}40` }}>{fmtNum(crew.treasury_balance || 0)} ฿</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Contribute */}
        <div style={{ background: 'linear-gradient(145deg, rgba(18,10,3,.98) 0%, rgba(12,7,2,1) 100%)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 6, padding: '20px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(200,180,120,.7)', marginBottom: 14, letterSpacing: '.06em' }}>CONTRIBUER</div>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Montant en Berrys"
            style={{ width: '100%', padding: '9px 12px', background: 'rgba(0,0,0,.45)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 4, color: 'rgba(220,195,145,.9)', fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Motif (optionnel)"
            style={{ width: '100%', padding: '9px 12px', background: 'rgba(0,0,0,.45)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 4, color: 'rgba(220,195,145,.9)', fontSize: 13, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }} />
          <button disabled={busy} onClick={handleContrib}
            style={{ width: '100%', padding: '11px', background: `rgba(180,130,20,.18)`, border: `1px solid ${cc}44`, borderRadius: 4, color: cc, fontSize: 12, fontWeight: 800, cursor: 'pointer', letterSpacing: '.05em', textTransform: 'uppercase', opacity: busy ? .5 : 1 }}>
            💰 Déposer
          </button>
        </div>

        {/* Top contributors */}
        <div style={{ background: 'linear-gradient(145deg, rgba(18,10,3,.98) 0%, rgba(12,7,2,1) 100%)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 6, padding: '20px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(200,180,120,.7)', marginBottom: 14, letterSpacing: '.06em' }}>TOP CONTRIBUTEURS</div>
          {topContrib.map((m, i) => (
            <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(180,130,30,.08)' }}>
              <span style={{ fontSize: 13, width: 22 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
              <Avatar src={m.avatar_url} name={m.username} size={26} color={ROLE_COLORS[m.position] || '#6b7280'} />
              <span style={{ flex: 1, fontSize: 12, color: 'rgba(220,195,145,.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.username || `Pirate #${String(m.user_id).slice(-4)}`}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: cc, fontFamily: 'Pirata One, cursive' }}>{fmtB(m.contribution || 0)} ฿</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div style={{ background: 'linear-gradient(145deg, rgba(18,10,3,.98) 0%, rgba(12,7,2,1) 100%)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 6, padding: '20px' }}>
        <SectionTitle>Historique des Transactions</SectionTitle>
        {txHistory.length === 0 ? (
          <EmptyState icon="💸" title="Aucune transaction" sub="L'historique des dépôts et retraits apparaîtra ici." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {txHistory.map(tx => (
              <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(0,0,0,.25)', border: '1px solid rgba(180,130,30,.08)', borderRadius: 4 }}>
                <span style={{ fontSize: 16 }}>{tx.type === 'deposit' ? '💰' : '💸'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(220,195,145,.78)' }}>{tx.username}</div>
                  {tx.reason && <div style={{ fontSize: 10, color: 'rgba(180,150,100,.38)' }}>{tx.reason}</div>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 900, color: tx.type === 'deposit' ? '#34d399' : '#f87171', fontFamily: 'Pirata One, cursive' }}>
                  {tx.type === 'deposit' ? '+' : '−'}{fmtNum(tx.amount)} ฿
                </div>
                <div style={{ fontSize: 10, color: 'rgba(180,150,100,.35)', marginLeft: 8 }}>{timeAgo(tx.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── JOURNAL ── */
function JournalTab({ logs }) {
  const [filter, setFilter] = useState('all')
  const FILTERS = [
    { key: 'all', label: 'Tout' },
    { key: 'member', label: 'Membres' },
    { key: 'treasury', label: 'Coffre' },
    { key: 'recruitment', label: 'Recrutement' },
  ]
  const filterMap = {
    member: ['member_joined','member_removed','promotion','demotion','captain_transfer'],
    treasury: ['treasury_deposit','treasury_withdraw'],
    recruitment: ['application','application_rejected','invite_sent'],
  }
  const filtered = filter === 'all' ? logs : logs.filter(l => (filterMap[filter] || []).includes(l.type))

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: '7px 16px', background: filter === f.key ? 'rgba(180,130,20,.2)' : 'rgba(0,0,0,.35)', border: `1px solid ${filter === f.key ? 'rgba(180,130,30,.5)' : 'rgba(180,130,30,.15)'}`, borderRadius: 4, color: filter === f.key ? '#c4941c' : 'rgba(180,150,100,.5)', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '.06em', textTransform: 'uppercase' }}>{f.label}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon="📜" title="Le livre de bord est vide" sub="Les événements de l'équipage apparaîtront ici au fil du temps." />
      ) : (
        <div style={{ position: 'relative', paddingLeft: 32 }}>
          <div style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 2, background: 'linear-gradient(180deg, rgba(180,130,30,.4) 0%, transparent 100%)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(log => {
              const li = LOG_ICONS[log.type] || { icon: '•', color: 'rgba(180,150,100,.5)' }
              return (
                <div key={log.id} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -32, top: 10, width: 22, height: 22, borderRadius: '50%', background: `${li.color}18`, border: `1px solid ${li.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{li.icon}</div>
                  <div style={{ background: 'rgba(0,0,0,.3)', border: '1px solid rgba(180,130,30,.1)', borderRadius: 4, padding: '12px 14px' }}>
                    <div style={{ fontSize: 13, color: 'rgba(220,195,145,.8)', lineHeight: 1.4 }}>{log.description}</div>
                    <div style={{ fontSize: 10, color: 'rgba(180,150,100,.35)', marginTop: 4 }}>{timeAgo(log.created_at)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── RANKING ── */
function RankingTab({ members, cc }) {
  const [mode, setMode] = useState('bounty')
  const sorted = useMemo(() => {
    const list = [...members]
    if (mode === 'bounty') list.sort((a, b) => (b.berrys || 0) - (a.berrys || 0))
    if (mode === 'contribution') list.sort((a, b) => (b.contribution || 0) - (a.contribution || 0))
    if (mode === 'vocal') list.sort((a, b) => (b.vocal_h || 0) - (a.vocal_h || 0))
    return list
  }, [members, mode])
  const top3 = sorted.slice(0, 3)
  const rest = sorted.slice(3)
  const getValue = m => mode === 'bounty' ? fmtB(m.berrys || 0) + ' ฿' : mode === 'contribution' ? fmtB(m.contribution || 0) + ' ฿' : `${m.vocal_h || 0}h`

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
        {[{ key: 'bounty', label: '💰 Prime' }, { key: 'contribution', label: '💎 Contribution' }, { key: 'vocal', label: '🎙️ Vocal' }].map(m => (
          <button key={m.key} onClick={() => setMode(m.key)} style={{ padding: '8px 20px', background: mode === m.key ? `rgba(180,130,20,.2)` : 'rgba(0,0,0,.35)', border: `1px solid ${mode === m.key ? cc + '50' : 'rgba(180,130,30,.15)'}`, borderRadius: 4, color: mode === m.key ? cc : 'rgba(180,150,100,.5)', fontSize: 12, fontWeight: 800, cursor: 'pointer', letterSpacing: '.04em' }}>{m.label}</button>
        ))}
      </div>

      {members.length === 0 ? (
        <EmptyState icon="🏆" title="Classement vide" sub="Aucun membre à afficher." />
      ) : (
        <>
          {/* Podium */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 16, marginBottom: 32, padding: '0 20px' }}>
            {[top3[1], top3[0], top3[2]].filter(Boolean).map((m, podIdx) => {
              const rank = podIdx === 0 ? 2 : podIdx === 1 ? 1 : 3
              const heights = [150, 190, 130]
              const podColors = ['#c0c0c0', cc, '#cd7f32']
              const podEmojis = ['🥈', '🥇', '🥉']
              return (
                <div key={m.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 28 }}>{podEmojis[podIdx]}</div>
                  <Avatar src={m.avatar_url} name={m.username} size={rank === 1 ? 56 : 44} color={podColors[podIdx]} radius={50} />
                  <div style={{ fontSize: rank === 1 ? 14 : 12, fontWeight: 800, color: 'rgba(232,215,175,.88)', fontFamily: 'Pirata One, cursive', textAlign: 'center' }}>{m.username || `Pirate #${String(m.user_id).slice(-4)}`}</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: podColors[podIdx], fontFamily: 'Pirata One, cursive' }}>{getValue(m)}</div>
                  <div style={{ width: '100%', height: heights[podIdx], background: `linear-gradient(180deg, ${podColors[podIdx]}18, rgba(0,0,0,.2))`, border: `1px solid ${podColors[podIdx]}28`, borderRadius: '4px 4px 0 0', minWidth: 100 }} />
                </div>
              )
            })}
          </div>

          {/* Rest */}
          {rest.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rest.map((m, i) => (
                <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(0,0,0,.25)', border: '1px solid rgba(180,130,30,.08)', borderRadius: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'rgba(180,150,100,.4)', width: 28 }}>#{i + 4}</span>
                  <Avatar src={m.avatar_url} name={m.username} size={32} color={ROLE_COLORS[m.position] || '#6b7280'} />
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'rgba(220,195,145,.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.username || `Pirate #${String(m.user_id).slice(-4)}`}</div>
                  <RoleBadge role={m.position} small />
                  <div style={{ fontSize: 14, fontWeight: 900, color: cc, fontFamily: 'Pirata One, cursive', marginLeft: 12 }}>{getValue(m)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── SETTINGS ── */
function SettingsTab({ crew, myLevel, discordId, displayName, crewId, onUpdate }) {
  const [form, setForm] = useState({ name: crew.name || '', motto: crew.motto || '', description: crew.description || '', emblem_emoji: crew.emblem_emoji || '🏴‍☠️', primary_color: crew.primary_color || '#d4a017', is_recruiting: crew.is_recruiting ?? true, recruitment_message: crew.recruitment_message || '', banner_style: crew.banner_style || 'ocean' })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const canEdit = myLevel === 0

  if (!canEdit) return <EmptyState icon="⛔" title="Accès refusé" sub="Seul le capitaine peut modifier les paramètres." />

  async function handleSave() {
    setBusy(true)
    const { error } = await updateCrewSettings({ crewId, settings: form, actorId: discordId, actorName: displayName })
    setBusy(false)
    if (error) setNotice({ msg: error.message, type: 'err' })
    else { setNotice({ msg: '✓ Paramètres sauvegardés !', type: 'ok' }); onUpdate(form) }
  }

  const FIELD = ({ label, field, type = 'text', rows }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(200,175,130,.6)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</label>
      {rows ? (
        <textarea rows={rows} value={form[field]} onChange={e => setForm(v => ({ ...v, [field]: e.target.value }))}
          style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,.45)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 4, color: 'rgba(220,195,145,.9)', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
      ) : (
        <input type={type} value={form[field]} onChange={e => setForm(v => ({ ...v, [field]: e.target.value }))}
          style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,.45)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 4, color: 'rgba(220,195,145,.9)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      )}
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {notice && <div style={{ gridColumn: '1/-1', padding: '10px 14px', background: notice.type === 'ok' ? 'rgba(52,211,153,.1)' : 'rgba(224,82,74,.1)', border: `1px solid ${notice.type === 'ok' ? 'rgba(52,211,153,.3)' : 'rgba(224,82,74,.3)'}`, borderRadius: 4, fontSize: 13, fontWeight: 600, color: notice.type === 'ok' ? '#34d399' : '#f87171' }}>{notice.msg}</div>}

      <div style={{ background: 'linear-gradient(145deg, rgba(18,10,3,.98) 0%, rgba(12,7,2,1) 100%)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 6, padding: '22px' }}>
        <SectionTitle>Identité</SectionTitle>
        <FIELD label="Nom de l'équipage" field="name" />
        <FIELD label="Devise" field="motto" />
        <FIELD label="Description" field="description" rows={3} />
        <FIELD label="Emblème (emoji)" field="emblem_emoji" />
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(200,175,130,.6)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Couleur principale</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="color" value={form.primary_color} onChange={e => setForm(v => ({ ...v, primary_color: e.target.value }))}
              style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
            <span style={{ fontSize: 13, color: form.primary_color, fontFamily: 'monospace', fontWeight: 700 }}>{form.primary_color}</span>
          </div>
        </div>
      </div>

      <div style={{ background: 'linear-gradient(145deg, rgba(18,10,3,.98) 0%, rgba(12,7,2,1) 100%)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 6, padding: '22px' }}>
        <SectionTitle>Recrutement</SectionTitle>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
          <input type="checkbox" checked={form.is_recruiting} onChange={e => setForm(v => ({ ...v, is_recruiting: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: form.is_recruiting ? '#34d399' : 'rgba(180,150,100,.6)' }}>Recrutement {form.is_recruiting ? 'ouvert' : 'fermé'}</span>
        </label>
        <FIELD label="Message de recrutement" field="recruitment_message" rows={3} />
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(200,175,130,.6)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Style de bannière</label>
          <select value={form.banner_style} onChange={e => setForm(v => ({ ...v, banner_style: e.target.value }))}
            style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,.45)', border: '1px solid rgba(180,130,30,.22)', borderRadius: 4, color: 'rgba(220,195,145,.85)', fontSize: 13, outline: 'none' }}>
            <option value="ocean">🌊 Mer profonde</option>
            <option value="forest">🌿 Forêt</option>
            <option value="volcano">🌋 Volcan</option>
            <option value="desert">🏜️ Désert</option>
            <option value="night">🌙 Nuit</option>
          </select>
        </div>
      </div>

      <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}>
        <button disabled={busy} onClick={handleSave}
          style={{ padding: '12px 32px', background: 'linear-gradient(135deg, rgba(180,130,20,.25), rgba(140,90,10,.18))', border: `1px solid ${crew.primary_color || '#d4a017'}55`, borderRadius: 4, color: crew.primary_color || '#d4a017', fontSize: 13, fontWeight: 800, cursor: 'pointer', letterSpacing: '.06em', textTransform: 'uppercase', opacity: busy ? .5 : 1 }}>
          {busy ? 'Sauvegarde...' : '💾 Sauvegarder'}
        </button>
      </div>

      {/* Danger zone */}
      <div style={{ gridColumn: '1/-1', background: 'rgba(139,0,0,.06)', border: '1px solid rgba(180,50,40,.22)', borderRadius: 6, padding: '22px' }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.16em', textTransform: 'uppercase', color: '#e0524a', marginBottom: 16 }}>⚠ Zone Dangereuse</div>
        <p style={{ fontSize: 13, color: 'rgba(200,150,140,.6)', marginBottom: 14, lineHeight: 1.6 }}>La suppression de l'équipage est irréversible. Tous les membres, candidatures et données associées seront perdus définitivement.</p>
        <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder={`Tape "${crew.name}" pour confirmer`}
          style={{ width: '100%', maxWidth: 340, padding: '9px 12px', background: 'rgba(0,0,0,.4)', border: '1px solid rgba(180,50,40,.22)', borderRadius: 4, color: 'rgba(220,195,145,.8)', fontSize: 13, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }} />
        <button disabled={deleteConfirm !== crew.name}
          style={{ padding: '10px 20px', background: deleteConfirm === crew.name ? 'rgba(180,50,40,.2)' : 'rgba(0,0,0,.2)', border: `1px solid ${deleteConfirm === crew.name ? 'rgba(224,82,74,.4)' : 'rgba(180,50,40,.15)'}`, borderRadius: 4, color: deleteConfirm === crew.name ? '#e0524a' : 'rgba(180,100,90,.3)', fontSize: 12, fontWeight: 800, cursor: deleteConfirm === crew.name ? 'pointer' : 'not-allowed', letterSpacing: '.04em' }}>
          Supprimer l'équipage
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────
export default function CrewHQPage() {
  const { crewId } = useParams()
  const navigate = useNavigate()
  const { discordId, isAuthenticated, displayName, avatarUrl } = useAuth()

  const [crew, setCrew] = useState(null)
  const [members, setMembers] = useState([])
  const [logs, setLogs] = useState([])
  const [applications, setApplications] = useState([])
  const [invites, setInvites] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [missions, setMissions] = useState([])
  const [treasury, setTreasury] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [toast, setToast] = useState(null)
  const [memberAction, setMemberAction] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)

  const myMember = useMemo(() => members.find(m => String(m.user_id) === String(discordId)), [members, discordId])
  const myLevel = useMemo(() => myMember ? getLevelHQ(myMember.position) : 99, [myMember])
  const isCaptain = myLevel === 0 || String(crew?.captain_id) === String(discordId)
  const isMember = !!myMember
  const cc = crew?.primary_color || '#d4a017'

  const loadAll = useCallback(async () => {
    if (!crewId) return
    const [dashboard, apps, invs, logData, anns, mis, treas] = await Promise.all([
      fetchCrewDashboard(crewId),
      fetchCrewApplications(crewId),
      fetchCrewInvites(crewId),
      fetchCrewLogs(crewId),
      fetchCrewAnnouncements(crewId),
      fetchCrewMissions(crewId),
      fetchCrewTreasury(crewId),
    ])
    if (dashboard) { setCrew(dashboard.crew); setMembers(dashboard.members) }
    setApplications(apps)
    setInvites(invs)
    setLogs(logData)
    setAnnouncements(anns)
    setMissions(mis)
    setTreasury(treas)
    setLoading(false)
  }, [crewId])

  useEffect(() => { loadAll() }, [loadAll])

  async function handleMemberAction(action, member) {
    const targetLevel = getLevelHQ(member.position)
    const ROLES_BY_LEVEL = {
      officer: Object.entries(ROLE_LEVEL).filter(([,v]) => v === 1).map(([k]) => k),
      member:  Object.entries(ROLE_LEVEL).filter(([,v]) => v === 2).map(([k]) => k),
    }

    if (action === 'promote_officer') {
      const newPos = ROLES_BY_LEVEL.officer[0] || 'second'
      const { error } = await promoteMember({ crewId, targetId: member.user_id, targetName: member.username, newPosition: newPos, actorId: discordId, actorName: displayName, actorLevel: myLevel })
      if (error) setToast({ msg: error.message, type: 'err' })
      else { setToast({ msg: `✓ ${member.username} promu ${ROLE_LABELS[newPos]} !`, type: 'ok' }); loadAll() }
    }
    if (action === 'promote_member') {
      const newPos = 'musicien'
      const { error } = await promoteMember({ crewId, targetId: member.user_id, targetName: member.username, newPosition: newPos, actorId: discordId, actorName: displayName, actorLevel: myLevel })
      if (error) setToast({ msg: error.message, type: 'err' })
      else { setToast({ msg: `✓ ${member.username} promu membre !`, type: 'ok' }); loadAll() }
    }
    if (action === 'demote') {
      const newPos = 'mousse'
      const { error } = await demoteMember({ crewId, targetId: member.user_id, targetName: member.username, newPosition: newPos, actorId: discordId, actorName: displayName, actorLevel: myLevel })
      if (error) setToast({ msg: error.message, type: 'err' })
      else { setToast({ msg: `${member.username} rétrogradé.`, type: 'ok' }); loadAll() }
    }
    if (action === 'remove') {
      setConfirmModal({
        title: `Exclure ${member.username} ?`,
        message: 'Cette action est irréversible. Ce membre sera retiré de l\'équipage.',
        onConfirm: async () => {
          const { error } = await removeMember({ crewId, targetId: member.user_id, targetName: member.username, targetRole: member.position, actorId: discordId, actorName: displayName, actorLevel: myLevel })
          if (error) setToast({ msg: error.message, type: 'err' })
          else { setToast({ msg: `${member.username} a été exclu.`, type: 'ok' }); loadAll() }
          setConfirmModal(null)
        },
      })
    }
    if (action === 'transfer') {
      setConfirmModal({
        title: `Transférer le capitanat à ${member.username} ?`,
        message: 'Tu deviendras Second et ce membre prendra la tête de l\'équipage. Action irréversible sans confirmation de l\'autre côté.',
        onConfirm: async () => {
          const { error } = await transferCaptain({ crewId, newCaptainId: member.user_id, newCaptainName: member.username, actorId: discordId, actorName: displayName })
          if (error) setToast({ msg: error.message, type: 'err' })
          else { setToast({ msg: `👑 Capitanat transféré à ${member.username} !`, type: 'ok' }); loadAll() }
          setConfirmModal(null)
        },
      })
    }
  }

  const bg = BANNER_STYLES[crew?.banner_style || 'ocean']

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#03070f' }}>
        <Navbar />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 80px)', gap: 20 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            style={{ width: 44, height: 44, border: '3px solid rgba(180,130,30,.2)', borderTopColor: '#c4941c', borderRadius: '50%' }} />
          <div style={{ fontFamily: 'Pirata One, cursive', fontSize: 16, color: 'rgba(180,130,40,.6)', letterSpacing: '.08em' }}>Chargement du QG…</div>
        </div>
      </div>
    )
  }

  if (!crew) {
    return (
      <div style={{ minHeight: '100vh', background: '#03070f' }}>
        <Navbar />
        <div style={{ maxWidth: 600, margin: '120px auto', textAlign: 'center', padding: '0 24px' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>☠️</div>
          <h2 style={{ fontFamily: 'Pirata One, cursive', fontSize: 32, color: 'rgba(232,215,175,.9)', marginBottom: 12 }}>Équipage introuvable</h2>
          <p style={{ color: 'rgba(200,170,110,.5)', marginBottom: 28 }}>Cet équipage n'existe pas ou a été dissous.</p>
          <button onClick={() => navigate('/equipage')} style={{ padding: '11px 24px', background: 'rgba(120,80,10,.25)', border: '1px solid rgba(180,120,30,.4)', borderRadius: 4, color: '#c4941c', fontWeight: 800, fontSize: 13, cursor: 'pointer', letterSpacing: '.06em', textTransform: 'uppercase' }}>← Retour aux équipages</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#03070f', color: '#e8dfc8' }}>
      <Navbar />

      {/* Ambient background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: bg, opacity: .4 }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${cc}0e 0%, transparent 60%)` }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── HERO ── */}
        <div style={{ background: `linear-gradient(180deg, ${bg.replace('linear-gradient(135deg,','').replace(')','')} , transparent)`, borderBottom: `1px solid ${cc}18`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${cc}40, transparent)` }} />

          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '100px clamp(16px,4vw,48px) 40px', position: 'relative' }}>
            <button onClick={() => navigate('/equipage')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,.35)', border: '1px solid rgba(180,130,30,.2)', borderRadius: 4, padding: '7px 14px', color: 'rgba(200,170,110,.55)', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 28, transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(220,190,130,.9)'; e.currentTarget.style.background = 'rgba(140,90,10,.15)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(200,170,110,.55)'; e.currentTarget.style.background = 'rgba(0,0,0,.35)' }}>
              ← Tous les équipages
            </button>

            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <PavilionFlag emoji={crew.emblem_emoji || '🏴‍☠️'} color={cc} />

              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: `${cc}90`, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>QG d'Équipage</span>
                  <span style={{ color: 'rgba(180,150,100,.4)' }}>·</span>
                  <span style={{ fontFamily: 'monospace', color: 'rgba(180,150,100,.45)' }}>[{crew.tag || '???'}]</span>
                </div>
                <h1 style={{ fontFamily: 'Pirata One, cursive', fontSize: 'clamp(32px,5vw,62px)', color: 'rgba(232,215,175,.96)', lineHeight: 1, margin: '0 0 10px', textShadow: '0 4px 30px rgba(0,0,0,.8)' }}>{crew.name}</h1>
                {crew.motto && <div style={{ fontSize: 14, color: `${cc}80`, fontStyle: 'italic', marginBottom: 16, letterSpacing: '.04em' }}>« {crew.motto} »</div>}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                  <Pill color={`${cc}12`} textColor={cc} border={`${cc}35`}>💰 {fmtB(crew.total_bounty)} ฿ de prime</Pill>
                  <Pill color="rgba(96,165,250,.1)" textColor="#60a5fa" border="rgba(96,165,250,.25)">⚔️ {members.length} membres</Pill>
                  <Pill color="rgba(251,191,36,.1)" textColor="#fbbf24" border="rgba(251,191,36,.25)">⭐ Niveau {crew.level || 1}</Pill>
                  {crew.wins > 0 && <Pill color="rgba(52,211,153,.1)" textColor="#34d399" border="rgba(52,211,153,.25)">🏆 {crew.wins} victoire{crew.wins > 1 ? 's' : ''}</Pill>}
                  <Pill color={crew.is_recruiting ? 'rgba(52,211,153,.1)' : 'rgba(224,82,74,.06)'} textColor={crew.is_recruiting ? '#34d399' : '#f87171'} border={crew.is_recruiting ? 'rgba(52,211,153,.28)' : 'rgba(224,82,74,.2)'}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: crew.is_recruiting ? '#34d399' : '#e0524a', display: 'inline-block', boxShadow: `0 0 6px ${crew.is_recruiting ? '#34d399' : '#e0524a'}` }} />
                    {crew.is_recruiting ? 'Recrutement ouvert' : 'Recrutement fermé'}
                  </Pill>
                </div>

                {/* Captain info */}
                {(() => {
                  const captain = members.find(m => m.position === 'capitaine' || String(m.user_id) === String(crew.captain_id))
                  return captain ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar src={captain.avatar_url} name={captain.username} size={34} color="#ffd700" />
                      <div>
                        <div style={{ fontSize: 9.5, color: 'rgba(180,150,100,.45)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Capitaine</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(232,215,175,.88)', fontFamily: 'Pirata One, cursive' }}>{captain.username}</div>
                      </div>
                    </div>
                  ) : null
                })()}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
                {isMember && isCaptain && (
                  <button onClick={() => setTab('settings')} style={{ padding: '10px 20px', background: `rgba(180,130,20,.18)`, border: `1px solid ${cc}40`, borderRadius: 4, color: cc, fontSize: 12, fontWeight: 800, cursor: 'pointer', letterSpacing: '.06em', textTransform: 'uppercase' }}>⚙ Gérer l'équipage</button>
                )}
                {!isMember && crew.is_recruiting && isAuthenticated && (
                  <button onClick={() => setTab('recruitment')} style={{ padding: '10px 20px', background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.3)', borderRadius: 4, color: '#34d399', fontSize: 12, fontWeight: 800, cursor: 'pointer', letterSpacing: '.06em', textTransform: 'uppercase' }}>📋 Candidater</button>
                )}
                {isMember && !isCaptain && (
                  <Pill color="rgba(52,211,153,.08)" textColor="#34d399" border="rgba(52,211,153,.2)">✓ Membre</Pill>
                )}
                <Link to={`/u/${crew.captain_id}`} style={{ padding: '10px 20px', background: 'rgba(0,0,0,.35)', border: '1px solid rgba(180,130,30,.2)', borderRadius: 4, color: 'rgba(200,170,110,.65)', fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textDecoration: 'none', textAlign: 'center', textTransform: 'uppercase' }}>Voir le capitaine</Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── TAB NAV ── */}
        <div style={{ background: 'rgba(0,0,0,.4)', borderBottom: `1px solid ${cc}15`, backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 clamp(16px,4vw,48px)', display: 'flex', gap: 2, overflowX: 'auto' }}>
            {TABS.filter(t => {
              if (t.key === 'settings') return isCaptain
              if (['treasury','journal'].includes(t.key)) return isMember || myLevel <= 1
              return true
            }).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t.key ? cc : 'rgba(180,150,100,.45)',
                borderBottom: `2px solid ${tab === t.key ? cc : 'transparent'}`,
                fontSize: 12, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase',
                whiteSpace: 'nowrap', transition: 'color .18s',
              }}>
                <span style={{ fontSize: 14 }}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── TAB CONTENT ── */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px clamp(16px,4vw,48px) 80px' }}>
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .2 }}>
              {tab === 'overview'    && <OverviewTab crew={crew} members={members} logs={logs} announcements={announcements} missions={missions} cc={cc} />}
              {tab === 'members'     && <MembersTab crew={crew} members={members} myLevel={myLevel} isCaptain={isCaptain} onAction={handleMemberAction} cc={cc} />}
              {tab === 'hierarchy'   && <HierarchyTab crew={crew} members={members} cc={cc} />}
              {tab === 'recruitment' && <RecruitmentTab crew={crew} applications={applications} invites={invites} myLevel={myLevel} isAuthenticated={isAuthenticated} discordId={discordId} displayName={displayName} avatarUrl={avatarUrl} crewId={crewId} onRefresh={loadAll} cc={cc} />}
              {tab === 'missions'    && <MissionsTab missions={missions} cc={cc} />}
              {tab === 'treasury'    && <TreasuryTab crew={crew} txHistory={treasury} members={members} myLevel={myLevel} discordId={discordId} displayName={displayName} crewId={crewId} onRefresh={loadAll} cc={cc} />}
              {tab === 'journal'     && <JournalTab logs={logs} />}
              {tab === 'ranking'     && <RankingTab members={members} cc={cc} />}
              {tab === 'settings'    && <SettingsTab crew={crew} myLevel={myLevel} discordId={discordId} displayName={displayName} crewId={crewId} onUpdate={updated => setCrew(v => ({ ...v, ...updated }))} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Confirm Modal ── */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: .9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .9 }}
              style={{ width: 'min(440px, 100%)', background: 'linear-gradient(145deg, #1a0e04, #100804)', border: '1px solid rgba(224,82,74,.3)', borderRadius: 8, padding: '28px', boxShadow: '0 32px 80px rgba(0,0,0,.7)' }}>
              <div style={{ fontFamily: 'Pirata One, cursive', fontSize: 20, color: '#f87171', marginBottom: 12 }}>{confirmModal.title}</div>
              <p style={{ fontSize: 13, color: 'rgba(200,175,130,.6)', lineHeight: 1.6, marginBottom: 24 }}>{confirmModal.message}</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={confirmModal.onConfirm} style={{ flex: 1, padding: '11px', background: 'rgba(224,82,74,.12)', border: '1px solid rgba(224,82,74,.35)', borderRadius: 4, color: '#f87171', fontSize: 13, fontWeight: 800, cursor: 'pointer', letterSpacing: '.04em' }}>Confirmer</button>
                <button onClick={() => setConfirmModal(null)} style={{ flex: 1, padding: '11px', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(180,130,30,.2)', borderRadius: 4, color: 'rgba(200,170,110,.6)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
