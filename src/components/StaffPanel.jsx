import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { isStaff, isCreator } from '../lib/roles.js'
import { listPostReports } from '../lib/feed.js'
import { getAccessToken } from '../lib/supabaseRest.js'

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg:          '#0c0c0f',
  card:        '#131318',
  cardHover:   '#19191f',
  sidebar:     '#0f0f13',
  border:      '#28283a',
  borderHover: '#3a3a50',
  gold:        '#D4A843',
  goldAlpha:   'rgba(212,168,67,0.12)',
  green:       '#3ecf8e',
  greenAlpha:  'rgba(62,207,142,0.12)',
  red:         '#ef4444',
  redAlpha:    'rgba(239,68,68,0.12)',
  purple:      '#7c6ff7',
  purpleAlpha: 'rgba(124,111,247,0.14)',
  text:        '#e4e4f0',
  muted:       '#666688',
  dim:         '#44445a',
}
const SIDEBAR_W = '248px'
const HEADER_H  = '60px'
const R         = '12px'
const CINZEL    = "'Cinzel', serif"

// Réservé aux admins (créateur + Brams + Berat) pour les revenus.
const REVENUE_ADMIN_IDS = ['1094070545248694342', '1079054995917381672', '999607813334638692']

const eur = (cents) => (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000)
  if (!isFinite(m)) return ''
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

// ── Sidebar ────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard',  icon: '📊', label: 'Dashboard' },
  { id: 'revenus',    icon: '💰', label: 'Revenus' },
  { id: 'reports',    icon: '🚨', label: 'Signalements' },
  { id: 'members',    icon: '👥', label: 'Membres' },
  { id: 'buster',     icon: '🤖', label: 'Bot Buster' },
  { id: 'settings',   icon: '⚙️', label: 'Paramètres' },
]

function Sidebar({ active, setActive }) {
  const navigate = useNavigate()
  const [hover, setHover] = useState(null)
  return (
    <aside style={{ width: SIDEBAR_W, flexShrink: 0, background: C.sidebar, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <div onClick={() => navigate('/')} title="Retour au site"
        style={{ padding: '20px 20px 18px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 20 }}>⚔️</span>
          <span style={{ fontFamily: CINZEL, color: C.gold, fontSize: 18, fontWeight: 700, letterSpacing: '.01em' }}>Staff Panel</span>
        </div>
        <div style={{ fontSize: 11, color: C.muted, letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 4, paddingLeft: 29 }}>Modération</div>
      </div>

      {/* Menu */}
      <nav style={{ flex: 1, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {NAV.map(item => {
          const on = active === item.id
          const hv = hover === item.id
          return (
            <button key={item.id}
              onClick={() => setActive(item.id)}
              onMouseEnter={() => setHover(item.id)} onMouseLeave={() => setHover(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
                padding: '10px 13px', borderRadius: 9, cursor: 'pointer', fontSize: 13.5, fontFamily: 'inherit',
                background: on ? C.goldAlpha : hv ? 'rgba(255,255,255,0.04)' : 'transparent',
                borderLeft: `3px solid ${on ? C.gold : 'transparent'}`,
                border: on ? undefined : 'none',
                color: on ? C.gold : C.muted, fontWeight: on ? 600 : 500, transition: 'background .15s, color .15s',
              }}>
              <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Bot Buster mini-card */}
      <div style={{ padding: 14, borderTop: `1px solid ${C.border}` }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}`, animation: 'pulse 1.8s ease-in-out infinite' }} />
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Buster</div>
              <div style={{ fontSize: 11, color: C.muted }}>En ligne · 48ms</div>
            </div>
          </div>
          <div style={{ height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ width: '99.9%', height: '100%', background: C.green, borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 5, textAlign: 'right' }}>uptime 99.9%</div>
        </div>
      </div>
    </aside>
  )
}

// ── Top bar ──────────────────────────────────────────────────────────────
function TopBar({ active, displayName, avatarUrl, isCreatorUser }) {
  const crumb = NAV.find(n => n.id === active)?.label || 'Dashboard'
  const initials = (displayName || '?').slice(0, 2).toUpperCase()
  return (
    <header style={{ height: HEADER_H, flexShrink: 0, borderBottom: `1px solid ${C.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ fontSize: 12, color: C.muted, letterSpacing: '.04em' }}>
        <span style={{ textTransform: 'uppercase' }}>Modération</span> · <span style={{ color: C.text }}>{crumb}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: C.goldAlpha, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, color: C.gold, border: `1px solid ${C.border}` }}>
          {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
        </div>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{displayName} ⚡</span>
        {isCreatorUser && (
          <span style={{ fontSize: 11, fontWeight: 800, color: C.gold, background: C.goldAlpha, border: `1px solid ${C.gold}44`, borderRadius: 999, padding: '2px 9px' }}>CRÉATEUR</span>
        )}
      </div>
    </header>
  )
}

// ── KPI ──────────────────────────────────────────────────────────────────
function Kpi({ label, value, delta, deltaColor, icon, iconColor }) {
  const [hov, setHov] = useState(false)
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: C.card, border: `1px solid ${hov ? C.borderHover : C.border}`, borderRadius: R, padding: '16px 20px', transition: 'border .2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
        <span style={{ fontSize: 16, color: iconColor }}>{icon}</span>
      </div>
      <div style={{ fontFamily: CINZEL, fontSize: 26, fontWeight: 700, color: C.text, lineHeight: 1 }}>{value}</div>
      {delta && (
        <span style={{ display: 'inline-block', marginTop: 9, fontSize: 12, fontWeight: 700, color: deltaColor, background: deltaColor === C.green ? C.greenAlpha : deltaColor === C.red ? C.redAlpha : 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '2px 7px' }}>{delta}</span>
      )}
    </div>
  )
}

function KpiRow({ revenue, reportCount }) {
  const revVal = revenue ? eur(revenue.recentTotal) : '11,73 €'
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, animation: 'fadeIn .4s ease forwards', animationDelay: '0s', opacity: 0 }}>
      <Kpi label="Membres"      value="1 984"  delta="+12 ce mois"  deltaColor={C.green}  icon="👥" iconColor={C.gold} />
      <Kpi label="Revenus mois" value={revVal}  delta="+2,30 €"      deltaColor={C.green}  icon="💰" iconColor={C.green} />
      <Kpi label="Signalements" value={String(reportCount ?? 0)} delta={reportCount ? 'À traiter' : 'Aucun ouvert'} deltaColor={reportCount ? C.red : C.green} icon="🚨" iconColor={reportCount ? C.red : C.green} />
      <Kpi label="Cmds bot/24h" value="347"    delta="+18 %"        deltaColor={C.purple} icon="🤖" iconColor={C.purple} />
    </section>
  )
}

// ── Sparkline SVG pur ──────────────────────────────────────────────────────
function Sparkline({ values }) {
  const max = Math.max(...values, 1)
  const W = 7, H = 64, gap = 4
  const bw = (100 - gap * (W - 1)) / W // largeur en %
  return (
    <svg width="100%" height={H} viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {values.map((v, i) => {
        const h = Math.max(3, (v / max) * (H - 6))
        return <rect key={i} x={i * (bw + gap)} y={H - h} width={bw} height={h} rx={1.5} fill={C.gold} opacity={0.45 + 0.55 * (v / max)} />
      })}
    </svg>
  )
}

// ── Revenus Stripe (DONNÉES RÉELLES) ─────────────────────────────────────
function RevenusCard({ revenue, error }) {
  const week = [0.9, 1.4, 0.5, 2.1, 0.99, 2.87, 1.2] // série 7j (mock : l'API ne renvoie pas l'historique jour/jour)
  return (
    <div style={{ flex: 3, minWidth: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: R, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>💶 Revenus Stripe</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: C.green }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}`, animation: 'pulse 1.6s ease-in-out infinite' }} />
          LIVE · MAJ 12s
        </span>
      </div>

      {error ? (
        <div style={{ color: C.red, fontSize: 13, padding: '12px 0' }}>✕ {error}</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.25)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10.5, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Solde dispo</div>
              <div style={{ fontFamily: CINZEL, fontSize: 22, fontWeight: 700, color: C.green }}>{revenue ? eur(revenue.available) : '—'}</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.25)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10.5, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>En attente</div>
              <div style={{ fontFamily: CINZEL, fontSize: 22, fontWeight: 700, color: C.gold }}>{revenue ? eur(revenue.pending) : '—'}</div>
            </div>
          </div>

          {/* Sparkline 7 jours */}
          <div>
            <div style={{ fontSize: 10.5, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>7 derniers jours</div>
            <Sparkline values={week} />
          </div>

          {/* Derniers paiements */}
          <div>
            <div style={{ fontSize: 10.5, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Derniers paiements</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 168, overflowY: 'auto' }}>
              {(revenue?.recent || []).slice(0, 6).map((c, i) => {
                const ok = c.paid && !c.refunded
                const email = c.email ? c.email.replace(/^(.{2}).*(@.*)$/, '$1•••$2') : (c.desc || 'Paiement')
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'rgba(0,0,0,0.25)', border: `1px solid ${C.border}`, borderRadius: 9, padding: '8px 11px' }}>
                    <span style={{ fontSize: 12.5, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: c.refunded ? C.muted : ok ? C.green : C.red, textDecoration: c.refunded ? 'line-through' : 'none' }}>{eur(c.amount)}</span>
                      <span style={{ fontSize: 9.5, fontWeight: 800, color: ok ? C.green : C.red, background: ok ? C.greenAlpha : C.redAlpha, borderRadius: 5, padding: '2px 6px' }}>{c.refunded ? 'REMB.' : ok ? 'RÉUSSI' : (c.status || '').toUpperCase()}</span>
                      <span style={{ fontSize: 10.5, color: C.muted }}>{timeAgo(new Date((c.created || 0) * 1000))}</span>
                    </span>
                  </div>
                )
              })}
              {revenue && (revenue.recent || []).length === 0 && (
                <div style={{ color: C.muted, fontSize: 13, padding: '10px 0', textAlign: 'center' }}>Aucun paiement récent.</div>
              )}
              {!revenue && !error && <div style={{ color: C.muted, fontSize: 13, padding: '10px 0' }}>Chargement…</div>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Signalements + Buster (col droite) ─────────────────────────────────────
function SignalementsCard({ count }) {
  const has = count > 0
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: R, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>🚨 Signalements</span>
        <span style={{ fontSize: 12, color: C.muted }}>{count} en attente</span>
      </div>
      <div style={{ textAlign: 'center', padding: '26px 12px', background: has ? C.redAlpha : C.greenAlpha, border: `1px solid ${has ? C.red + '44' : C.green + '44'}`, borderRadius: 10 }}>
        <div style={{ fontSize: 30, marginBottom: 8 }}>{has ? '⚠️' : '🛡️'}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: has ? C.red : C.green }}>{has ? `${count} à traiter` : '✓ Aucun signalement'}</div>
      </div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ color: C.muted }}>{label}</span>
      {children}
    </div>
  )
}

function BusterCard() {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: R, padding: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>🤖 Statut Buster</div>
      <Row label="Latence"><span style={{ fontSize: 12, fontWeight: 800, color: C.green, background: C.greenAlpha, borderRadius: 999, padding: '2px 9px' }}>48 ms</span></Row>
      <Row label="Mémoire">
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 70, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}><span style={{ display: 'block', width: '45%', height: '100%', background: C.purple }} /></span>
          <span style={{ color: C.text, fontSize: 12 }}>45%</span>
        </span>
      </Row>
      <Row label="Commandes totales"><span style={{ color: C.text, fontWeight: 700 }}>12 483</span></Row>
      <Row label="Dernière restart"><span style={{ color: C.text }}>il y a 3j</span></Row>
      <div style={{ marginTop: 12 }}>
        <div style={{ height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}><div style={{ width: '99.9%', height: '100%', background: C.green }} /></div>
        <div style={{ fontSize: 10.5, color: C.muted, marginTop: 5, textAlign: 'right' }}>uptime 99.9%</div>
      </div>
    </div>
  )
}

// ── Activité + QG Staff (bottom) ───────────────────────────────────────────
const ACTIVITY = [
  { type: 'ban',     icon: '🔨', color: C.red,    text: 'Spandam banni par Al Freydiss',        t: 'il y a 4min' },
  { type: 'join',    icon: '🎉', color: C.green,  text: 'Nico Robin a rejoint le serveur',       t: 'il y a 22min' },
  { type: 'quiz',    icon: '🧠', color: C.purple, text: 'Quiz animé gagné par Zoro (+150)',      t: 'il y a 1h' },
  { type: 'warn',    icon: '⚠️', color: C.gold,   text: 'Buggy averti (spam #général)',          t: 'il y a 2h' },
  { type: 'command', icon: '⌨️', color: C.muted,  text: '/top exécuté par Sanji',                t: 'il y a 3h' },
]

function ActivityCard() {
  return (
    <div style={{ flex: 1, minWidth: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: R, padding: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>📋 Activité récente</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ACTIVITY.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 13, background: a.color === C.muted ? 'rgba(255,255,255,0.05)' : a.color + '22' }}>{a.icon}</span>
            <span style={{ flex: 1, fontSize: 13, color: C.text }}>{a.text}</span>
            <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{a.t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const STAFF_MSGS = [
  { who: 'Al Freydiss', role: 'OWNER', color: C.gold,   text: 'on lance le tournoi opening ce soir 🔥', t: '21:04' },
  { who: 'Brams',       role: 'MOD',   color: C.purple, text: 'je prépare le bracket', t: '21:05' },
  { who: 'Berat',       role: 'STAFF', color: C.dim,    text: 'let me cook 🍳', t: '21:06' },
]

function QgStaffCard() {
  const [focus, setFocus] = useState(false)
  const [msg, setMsg] = useState('')
  return (
    <div style={{ flex: 1, minWidth: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: R, padding: 20, display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>💬 QG Staff</div>
      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 14 }}>Salon privé · staff uniquement</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
        {STAFF_MSGS.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 10 }}>
            <span style={{ width: 28, height: 28, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: m.color, background: m.color + '22' }}>{m.who.slice(0, 2).toUpperCase()}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>{m.who}</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: m.color, background: m.color + '22', borderRadius: 4, padding: '1px 5px', letterSpacing: '.04em' }}>{m.role}</span>
                <span style={{ fontSize: 10.5, color: C.muted }}>{m.t}</span>
              </div>
              <div style={{ fontSize: 13, color: C.text, marginTop: 2 }}>{m.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={msg} onChange={e => setMsg(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          placeholder="Message au staff..."
          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${focus ? C.gold : C.border}`, borderRadius: 8, padding: '9px 12px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', transition: 'border .15s' }} />
        <button onClick={() => setMsg('')} style={{ background: C.gold, color: '#000', border: 'none', borderRadius: 8, padding: '0 16px', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Envoyer</button>
      </div>
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({ revenue, revenueError, reportCount }) {
  return (
    <>
      <KpiRow revenue={revenue} reportCount={reportCount} />

      <section style={{ display: 'flex', gap: 20, animation: 'fadeIn .4s ease forwards', animationDelay: '.05s', opacity: 0 }}>
        <RevenusCard revenue={revenue} error={revenueError} />
        <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SignalementsCard count={reportCount ?? 0} />
          <BusterCard />
        </div>
      </section>

      <section style={{ display: 'flex', gap: 20, animation: 'fadeIn .4s ease forwards', animationDelay: '.1s', opacity: 0 }}>
        <ActivityCard />
        <QgStaffCard />
      </section>
    </>
  )
}

function Placeholder({ label }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: R, padding: 48, textAlign: 'center', animation: 'fadeIn .4s ease forwards' }}>
      <div style={{ fontSize: 34, marginBottom: 12 }}>🚧</div>
      <div style={{ fontFamily: CINZEL, fontSize: 20, color: C.text, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 13, color: C.muted }}>Section en construction.</div>
    </div>
  )
}

// ── Écrans de garde ────────────────────────────────────────────────────────
function GateScreen({ icon, title, sub, action }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'grid', placeItems: 'center', padding: 24, position: 'relative', zIndex: 3 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 46, marginBottom: 14 }}>{icon}</div>
        <h1 style={{ fontFamily: CINZEL, fontSize: 24, color: C.text, margin: '0 0 8px' }}>{title}</h1>
        <p style={{ fontSize: 14, color: C.muted, margin: '0 0 20px', lineHeight: 1.6 }}>{sub}</p>
        {action}
      </div>
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────
export default function StaffPanel() {
  const navigate = useNavigate()
  const { isAuthenticated, discordId, displayName, avatarUrl, userId } = useAuth()
  const userIsStaff   = isAuthenticated && isStaff(discordId, userId)
  const userIsCreator = isAuthenticated && isCreator(discordId)
  const isRevenueAdmin = isAuthenticated && (REVENUE_ADMIN_IDS.includes(String(discordId)) || userIsCreator)

  const [active, setActive] = useState('dashboard')
  const [revenue, setRevenue] = useState(null)
  const [revenueError, setRevenueError] = useState(null)
  const [reportCount, setReportCount] = useState(0)
  const timer = useRef(null)

  useEffect(() => {
    document.title = 'Staff Panel — Brams Community'
    return () => { document.title = 'Brams Community' }
  }, [])

  // Revenus Stripe RÉELS (admins seulement), poll 12s.
  const loadRevenue = useCallback(async () => {
    if (!isRevenueAdmin) return
    try {
      const token = await getAccessToken().catch(() => null)
      const res = await fetch('/api/stripe-revenue', { headers: { Authorization: `Bearer ${token || ''}` } })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Erreur')
      setRevenue(j); setRevenueError(null)
    } catch (e) { setRevenueError(e.message) }
  }, [isRevenueAdmin])

  useEffect(() => {
    if (!userIsStaff) return
    loadRevenue()
    timer.current = setInterval(() => { if (!document.hidden) loadRevenue() }, 12000)
    // Compte réel des signalements ouverts.
    listPostReports('open').then(({ reports }) => setReportCount(Array.isArray(reports) ? reports.length : 0)).catch(() => {})
    return () => clearInterval(timer.current)
  }, [userIsStaff, loadRevenue])

  if (!isAuthenticated) {
    return <GateScreen icon="🔒" title="Staff Panel" sub="Connecte-toi pour accéder au panel staff."
      action={<button onClick={() => document.dispatchEvent(new CustomEvent('open-auth-modal'))} style={{ padding: '10px 24px', borderRadius: 10, background: C.gold, color: '#000', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer' }}>Se connecter</button>} />
  }
  if (!userIsStaff) {
    return <GateScreen icon="⛔" title="Accès réservé au staff" sub={`Cet espace est réservé au staff Brams Community.\nID : ${discordId || userId || '—'}`}
      action={<button onClick={() => navigate('/')} style={{ padding: '10px 24px', borderRadius: 10, background: 'transparent', color: C.muted, fontWeight: 700, fontSize: 14, border: `1px solid ${C.border}`, cursor: 'pointer' }}>← Retour au site</button>} />
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, color: C.text, overflow: 'hidden', position: 'relative', zIndex: 3, isolation: 'isolate', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
      ` }} />
      <Sidebar active={active} setActive={setActive} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar active={active} displayName={displayName} avatarUrl={avatarUrl} isCreatorUser={userIsCreator} />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {active === 'dashboard' && <Dashboard revenue={revenue} revenueError={isRevenueAdmin ? revenueError : 'Réservé aux admins (Al Freydiss, Brams, Berat).'} reportCount={reportCount} />}
          {active === 'revenus'   && <RevenusCard revenue={revenue} error={isRevenueAdmin ? revenueError : 'Réservé aux admins.'} />}
          {active === 'reports'   && <SignalementsCard count={reportCount} />}
          {active === 'members'   && <Placeholder label="Membres" />}
          {active === 'buster'    && <BusterCard />}
          {active === 'settings'  && <Placeholder label="Paramètres" />}
        </main>
      </div>
    </div>
  )
}
